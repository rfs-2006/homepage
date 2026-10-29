#!/usr/bin/env python3
# 리포트 PDF 2쪽(목차) 이후 본문을 웹에서 읽을 수 있게 뽑는다.
#   글(절 제목, 요약 박스, 소제목, 문단, 왼쪽 요약 메모) → assets/reports/full/<id>.json
#   [자료 x-x] 차트·표 → 같은 자리를 잘라 assets/reports/full/<id>/<n>.webp (숫자를 옮겨 적지 않아 틀릴 일이 없다)
#   캡션이 없는 표만 있는 쪽(재무제표 등)은 쪽 전체를 이미지로 넣는다.
#   1쪽 오른쪽 Stock Data 표(글)와 Stock Price 차트(그림)도 함께 → {stock, blocks}
#
# 사용법: 사이트 루트에서  python3 tools/extract-full.py sanil [다른 id ...]   (pymupdf, pillow 필요)
# 다시 뽑았으면 index.html의 DATA_VER를 올리고 FULL_REPORTS에 id를 넣는다 (/assets/는 브라우저가 하루 동안 다시 받지 않는다)
import io, json, os, re, sys
import pymupdf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'reports', 'full')
ZOOM = 3          # 차트 이미지 해상도 (PDF 1pt = 3px)
BODY_X = 165      # 본문 왼쪽 끝 기본값. 리포트마다 실제 본문 줄의 x를 재서 바꾼다(body_x). 그보다 왼쪽이 요약 메모


def load_reports():
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    i = html.index('const REPORTS = [')
    return dict(re.findall(r"\{ id:'([^']+)'.*?pdf:'([^']+)'", html[i:html.index('\n];', i)], re.S))


def is_bold(s):
    f = s['font'].lower()
    return 'bold' in f or 'heavy' in f or 'black' in f


def lines_of(page):
    out = []
    for b in page.get_text('dict')['blocks']:
        if b.get('type') != 0:
            continue
        for l in b['lines']:
            spans = [s for s in l['spans'] if s['text'].strip()]
            if not spans:
                continue
            out.append({'x0': l['bbox'][0], 'y0': l['bbox'][1], 'x1': l['bbox'][2], 'y1': l['bbox'][3],
                        'size': max(s['size'] for s in spans), 'font': spans[0]['font'],
                        'spans': [(s['text'], is_bold(s)) for s in l['spans'] if s['text']],
                        'text': ''.join(s['text'] for s in l['spans']), 'raw': l['spans']})
    return out


CAP_RE = re.compile(r'^\s*[\[<(]?\s*(?:자료|그림|표|도표|차트|Figure|Table)\s*[\d][\d\-.]*\s*[\]>)]?')
SRC_RE = re.compile(r'^\s*(?:출처|자료)\s*[:：]')


def is_cap(l):
    """차트·표 제목 줄: '[자료 1-1]' '그림2)' '[표 3]' 같은 번호로 시작하거나, 리포트 양식의 캡션 글꼴(YGO)로 쓴 짧은 줄"""
    t = l['text'].strip()
    if not t or SRC_RE.match(t):
        return False
    # YGO 글꼴은 캡션뿐 아니라 차트 축 숫자에도 쓰여서, 글자(한글·영문)가 4자 이상인 8.5pt 이상 줄만 캡션으로 본다
    return bool(CAP_RE.match(t)) or (l['font'].startswith('YGO') and 8.5 <= l['size'] < 10.5 and len(t) < 90
                                    and len(re.findall(r'[가-힣A-Za-z]', t)) >= 4)


def is_cap_pair(a, b):
    """좌우 두 캡션이 같은 줄에 나란히 있는 경우(둘 다 번호로 시작하거나 둘 다 긴 제목)"""
    return all(len(re.findall(r'[가-힣A-Za-z]', x['text'])) >= 6 for x in (a, b)) and abs(a['x0'] - b['x0']) > 200


def graphic_regions(page, lines, H):
    """그림(이미지)·도형 묶음(get_drawings: 표 선·막대·축)으로 그림이 있는 사각형들을 찾는다. 머리글·바닥글 띠와 쪽 전체 배경은 뺀다"""
    W = page.rect.width
    rects = []
    for b in page.get_text('dict')['blocks']:
        if b.get('type') == 1:
            r = pymupdf.Rect(b['bbox'])
            if r.get_area() > 2500:
                rects.append(r)
    for d in page.get_drawings():
        r = pymupdf.Rect(d['rect'])
        if r.width < 1 and r.height < 1:
            continue
        rects.append(r)
    rects = [r for r in rects if r.y1 > 48 and r.y0 < H - 48 and not (r.width > W * 0.92 and r.height > H * 0.5)]
    # 가까운 것끼리(6pt 안) 합친다
    out = []
    for r in sorted(rects, key=lambda r: (r.y0, r.x0)):
        rr = pymupdf.Rect(r)
        merged = True
        while merged:
            merged = False
            for o in out:
                if (o.x0 - 6 <= rr.x1 and rr.x0 <= o.x1 + 6 and o.y0 - 6 <= rr.y1 and rr.y0 <= o.y1 + 6):
                    rr |= o; out.remove(o); merged = True; break
        out.append(rr)
    res = []
    for r in out:
        if r.height < 30 or r.width < 60 or (r.height < 4) or (r.width > W * 0.95 and r.height < 6):
            continue
        res.append((max(r.x0, 8), r.y0, min(r.x1, W - 8), r.y1))
    return res


def exhibits(lines, H, page):
    """[자료 x-x] 캡션마다 차트 영역(캡션 아래 ~ 출처 줄 위)을 찾는다"""
    caps = []
    for l in lines:
        if not is_cap(l):
            continue
        # 좌우 두 캡션이 PDF에서 한 줄로 붙어 나오는 경우가 있어, 두 번째 '[자료'가 시작되는 조각에서 나눈다
        parts = re.split(r'(?=\[자료)', l['text'].strip())
        parts = [x for x in parts if x.strip()]
        if len(parts) > 1:                   # 한 조각 안에 캡션 두 개: 두 번째 캡션 위치를 페이지에서 찾아 나눈다
            r = [q for q in page.search_for(re.match(r'\[자료[^\]]*\]', parts[1]).group(0)) if abs(q.y0 - l['y0']) < 4]
            if r:
                caps.append(dict(l, x1=r[0].x0 - 4, text=parts[0])); caps.append(dict(l, x0=r[0].x0, text=parts[1])); continue
        cut = [i for i, sp in enumerate(l['raw']) if i and sp['text'].lstrip().startswith('[자료')]
        if not cut:
            caps.append(l); continue
        for a, b in zip([0] + cut, cut + [len(l['raw'])]):
            sp = l['raw'][a:b]
            caps.append(dict(l, x0=sp[0]['bbox'][0], x1=sp[-1]['bbox'][2], text=''.join(x['text'] for x in sp)))
    # 표 칸·범례도 YGO 글꼴이라, 같은 줄에 다른 YGO 조각이 있거나 그림 영역 안에 있으면 번호 없는 캡션은 버린다
    ygo = [l for l in lines if l['font'].startswith('YGO')]
    graphics = graphic_regions(page, lines, H)
    def bogus(c):
        if CAP_RE.match(c['text'].strip()):
            return False
        if any(o is not c and abs(o['y0'] - c['y0']) < 3 and abs(o['x0'] - c['x0']) > 20 and not is_cap_pair(o, c) for o in ygo):
            return True
        cx, cy = (c['x0'] + c['x1']) / 2, (c['y0'] + c['y1']) / 2
        return any(g[0] + 2 < cx < g[2] - 2 and g[1] + 4 < cy < g[3] - 4 for g in graphics)
    caps = [c for c in caps if not bogus(c)]
    srcs = [l for l in lines if SRC_RE.match(l['text'])]
    wide = [l for l in lines if l['size'] >= 9.3 and len(l['text'].strip()) >= 30 and not SRC_RE.match(l['text'])]
    res = []
    for c in caps:
        right = [o['x0'] for o in caps if o is not c and abs(o['y0'] - c['y0']) < 6 and o['x0'] > c['x0'] + 50]
        x1 = min(right) - 6 if right else 580
        left = [o for o in caps if o is not c and abs(o['y0'] - c['y0']) < 6 and o['x0'] < c['x0']]
        x0 = c['x0'] - 3 if not left else c['x0'] - 3
        nxt = [o['y0'] for o in caps if o['y0'] > c['y1'] + 5 and o['x0'] < x1 and o['x1'] > x0]
        stop = min(nxt) if nxt else H - 50
        # 출처 줄은 캡션보다 왼쪽에서 시작하기도 해서(축 눈금이 왼쪽에 있을 때) 캡션 칸 전체에서 찾는다
        below = [s for s in srcs if c['y1'] < s['y0'] < stop and x0 - 60 <= s['x0'] <= x1 - 20]
        if below:
            s = min(below, key=lambda s: s['y0'])
            y1, src = s['y0'] - 1, s['text'].strip()
            x0 = min(x0, s['x0'] - 3)
        else:
            # 출처가 없으면 쪽 끝까지 가지 않고, 아래 그림 영역 끝이나 첫 본문 줄에서 멈춘다
            g = [gg for gg in graphics if gg[1] < c['y1'] + 40 and gg[3] > c['y1'] and gg[0] < x1 and gg[2] > x0]
            w = [l['y0'] for l in wide if l['y0'] > c['y1'] + 8 and l['x0'] < x1 and l['x1'] > x0 and not any(gg[1] <= l['y0'] <= gg[3] for gg in g)]
            y1 = min([max(gg[3] for gg in g) + 2] if g else [] + [stop - 4] + ([min(w) - 4] if w else []))
            if g:
                y1 = min(y1, stop - 4)
            src = ''
        # 그림 영역이 캡션 칸보다 넓으면(왼쪽 축 등) 그만큼 넓힌다
        for gg in graphics:
            if gg[1] < y1 and gg[3] > c['y1'] and gg[0] < x1 and gg[2] > x0 and (min(gg[2], x1) - max(gg[0], x0)) > 0.5 * (gg[2] - gg[0]):
                x0 = min(x0, gg[0] - 2); x1 = max(x1, min(gg[2] + 2, 585))
        m = re.match(r'\s*([\[<(]?\s*(?:자료|그림|표|도표|차트|Figure|Table)\s*\d[\d\-.]*\s*[\]>)]?)?\s*(.*?)\s*(\((?:단위|단 위)[^)]*\))?\s*$', c['text'])
        res.append({'rect': (x0, c['y1'] + 3.5, x1, y1), 'box': (x0, c['y0'] - 2, x1, (s['y1'] + 2) if below else y1),
                    'no': (m.group(1) or '').strip() if m else '', 'cap': (m.group(2) if m else c['text']).strip(),
                    'unit': (m.group(3) or '').strip() if m else '', 'src': src, 'y': c['y0']})
    # 캡션 없이 '출처:' 줄만 있는 차트·표(예전 양식): 출처 줄에서 위로, 바로 위 본문 줄까지를 그림으로 본다
    used = [r['box'] for r in res]
    body = [l for l in lines if l['size'] >= 9.3 and not SRC_RE.match(l['text']) and not is_cap(l)]
    for sl in srcs:
        if inside(sl, used):
            continue
        row = sorted([o for o in srcs if abs(o['y0'] - sl['y0']) < 8], key=lambda o: o['x0'])
        k = row.index(sl)
        x0 = sl['x0'] - 4
        x1 = row[k + 1]['x0'] - 8 if k + 1 < len(row) else 580
        if k > 0:
            x0 = max(x0, (row[k - 1]['x0'] + sl['x0']) / 2 - 1) if False else x0
        above = [l for l in wide if l['y1'] < sl['y0'] - 2 and l['x1'] > x0 + 4 and l['x0'] < x1 - 4 and not inside(l, used)
                 and (l['x1'] - l['x0']) > 0.55 * (x1 - x0)]
        # 위쪽 경계는 칸 폭의 절반 넘게 이어진 본문 줄(문단)만. 표의 행이나 차트 안 글자를 경계로 오해하지 않게
        top = max([l['y1'] + 6 for l in above], default=50)
        g = [gg for gg in graphics if gg[3] <= sl['y0'] + 2 and gg[3] > top and gg[0] < x1 and gg[2] > x0]
        if g:
            x0 = min(x0, min(gg[0] for gg in g) - 2)
        # 출처 바로 위의 짧은 굵은 줄(번호 없는 캡션)이 있으면 캡션으로 따로 뺀다
        cap_l = next((l for l in sorted(lines, key=lambda l: l['y0']) if top - 2 <= l['y0'] <= top + 24 and l['x0'] < x1 and l['x1'] > x0
                      and len(l['text'].strip()) < 60 and (l['size'] >= 9 or any(b for _, b in l['spans']))), None)
        if sl['y0'] - top < 40:
            continue
        ctop = cap_l['y1'] + 2 if cap_l else top
        res.append({'rect': (x0, ctop, x1, sl['y0'] - 1), 'box': (x0, top, x1, sl['y1'] + 2), 'no': '', 'cap': cap_l['text'].strip() if cap_l else '',
                    'unit': '', 'src': sl['text'].strip(), 'y': top})
        used.append(res[-1]['box'])
    # 캡션도 출처도 없는 표·차트: 그림 영역만으로 잡는다
    for gg in graphics:
        if any((min(gg[2], b[2]) - max(gg[0], b[0])) > 0 and (min(gg[3], b[3]) - max(gg[1], b[1])) > 0.3 * (gg[3] - gg[1]) for b in used):
            continue
        if (gg[3] - gg[1]) < 45 or (gg[2] - gg[0]) < 200:
            continue          # 왼쪽 메모 칸의 화살표·상자처럼 좁은 도형은 그림이 아니다
        inner = [l for l in lines if gg[0] - 2 <= (l['x0'] + l['x1']) / 2 <= gg[2] + 2 and gg[1] - 2 <= (l['y0'] + l['y1']) / 2 <= gg[3] + 2]
        if inner and sum(len(l['text']) for l in inner if l['size'] >= 9.3 and len(l['text'].strip()) >= 30) > 0.6 * sum(len(l['text']) for l in inner):
            continue          # 회색 요약 박스처럼 본문이 든 상자는 그림이 아니다
        cap_l = next((l for l in sorted(lines, key=lambda l: -l['y1']) if gg[1] - 26 <= l['y1'] <= gg[1] + 1 and l['x0'] < gg[2] and l['x1'] > gg[0]
                      and len(l['text'].strip()) < 60 and not inside(l, used)), None)
        top = (cap_l['y0'] - 2) if cap_l else gg[1] - 2
        res.append({'rect': (gg[0] - 2, gg[1] - 2, gg[2] + 2, gg[3] + 2), 'box': (gg[0] - 2, top, gg[2] + 2, gg[3] + 2),
                    'no': '', 'cap': cap_l['text'].strip() if cap_l else '', 'unit': '', 'src': '', 'y': top})
        used.append(res[-1]['box'])
    return res


def inside(l, boxes):
    cx, cy = (l['x0'] + l['x1']) / 2, (l['y0'] + l['y1']) / 2
    return any(b[0] - 2 <= cx <= b[2] + 2 and b[1] - 2 <= cy <= b[3] + 2 for b in boxes)


def segs_of(ls):
    """줄들을 이어 {t,b} 조각으로. 한국어 PDF는 낱말 중간에서도 줄을 바꾸므로 줄 끝 공백이 있을 때만 띄운다"""
    out = []
    for i, l in enumerate(ls):
        for t, b in l['spans']:
            if out and out[-1]['b'] == b:
                out[-1]['t'] += t
            else:
                out.append({'t': t, 'b': b})
    for s in out:
        s['t'] = re.sub(r'\s+', ' ', s['t'])
    if out:
        out[0]['t'] = out[0]['t'].lstrip(); out[-1]['t'] = out[-1]['t'].rstrip()
    return [s for s in out if s['t']]


def extract(rid, pdf):
    doc = pymupdf.open(os.path.join(ROOT, pdf))
    import shutil
    shutil.rmtree(os.path.join(OUT, rid), ignore_errors=True)   # 다시 뽑을 때 예전 그림이 남지 않게
    os.makedirs(os.path.join(OUT, rid), exist_ok=True)
    blocks, fig_n = [], 0

    def save(page, rect):
        nonlocal fig_n
        rect = pymupdf.Rect(*rect) & page.rect
        if rect.width < 20 or rect.height < 15:
            return None
        fig_n += 1
        pix = page.get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM), clip=rect, alpha=False)
        im = Image.open(io.BytesIO(pix.tobytes('png')))
        name = f'{fig_n}.webp'
        im.save(os.path.join(OUT, rid, name), 'WEBP', quality=82, method=6)
        return {'src': f'{rid}/{name}', 'w': im.width, 'h': im.height}

    # 1쪽 오른쪽 'Stock Data' 표와 'Stock Price' 차트 (리포트 화면 오른쪽 따라오는 박스에 쓴다)
    stock = {'rows': [], 'chart': None}
    p0 = doc[0]
    ls0 = [l for l in lines_of(p0) if l['x0'] > p0.rect.width * 0.66]
    sd = next((l for l in ls0 if l['text'].strip() == 'Stock Data'), None)
    sp = next((l for l in ls0 if l['text'].strip() == 'Stock Price'), None)
    if sd:
        end = sp['y0'] if sp else sd['y0'] + 160
        rows = []
        for l in sorted([l for l in ls0 if sd['y1'] < l['y0'] < end], key=lambda l: (l['y0'], l['x0'])):
            if rows and abs(rows[-1][0]['y0'] - l['y0']) < 3:
                rows[-1].append(l)
            else:
                rows.append([l])
        x_lab = min(l['x0'] for l in ls0 if sd['y1'] < l['y0'] < end)
        for r in rows:
            r.sort(key=lambda l: l['x0'])
            cells = [x['text'].strip() for x in r]
            if r[0]['x0'] > x_lab + 10:       # 이름표 없이 이어지는 줄(주요주주 둘째 줄 등)
                cells = [''] + cells
            stock['rows'].append(cells)
    if sp:
        lab = [l for l in ls0 if l['y0'] > sp['y1'] and l['size'] < 6]
        y1 = max(l['y1'] for l in lab) + 3 if lab else sp['y1'] + 130
        stock['chart'] = save(p0, (sp['x0'] - 4, sp['y1'] + 2, p0.rect.width - 10, y1))

    # 본문 왼쪽 끝: 9~10.5pt 긴 줄(30자 이상)이 가장 많이 시작하는 x. 양식마다 다르다(145, 136, 170 등)
    import collections
    xs = collections.Counter(round(l['x0'] / 4) * 4 for p in range(1, len(doc)) for l in lines_of(doc[p])
                             if 9.3 <= l['size'] <= 10.6 and len(l['text'].strip()) >= 30)
    bx = (xs.most_common(1)[0][0] if xs else BODY_X) - 2
    # 2쪽이 목차(CONTENTS)면 본문은 3쪽부터, 아니면(예전 양식) 2쪽부터
    has_toc = len(doc) > 1 and bool(re.search(r'CONTENTS|목\s*차', doc[1].get_text()[:400]))
    for pno in range(2 if has_toc else 1, len(doc)):
        page = doc[pno]
        H = page.rect.height
        lines = [l for l in lines_of(page) if 45 < l['y0'] < H - 50 and 'Securities Research' not in l['text'] and not re.search(r'R\.F\.S\.?\s*Research Team\s*\d+\s*[|│]', l['text'])]
        ex = exhibits(lines, H, page)
        boxes = [e['box'] for e in ex]
        text = [l for l in lines if not inside(l, boxes) and l['size'] >= 9.3]
        if not ex and len(text) < 3:          # 캡션 없는 표 쪽(재무제표 등): 쪽 전체를 그림으로
            f = save(page, (12, 40, page.rect.width - 12, H - 40))
            if f:
                blocks.append({'fig': [dict(f, no='', cap='', unit='', src_t='')]})
            continue
        body = sorted([l for l in text if l['x0'] >= bx - 5], key=lambda l: (round(l['y0']), l['x0']))
        notes = sorted([l for l in text if l['x1'] < bx], key=lambda l: l['y0'])
        # 요약 메모: 가까운 줄끼리 묶는다
        ng = []
        for l in notes:
            if ng and l['y0'] - ng[-1][-1]['y1'] < 12:
                ng[-1].append(l)
            else:
                ng.append([l])
        ng = [{'y': g[0]['y0'], 't': '\n'.join(x['text'].strip() for x in g)} for g in ng]
        # 문단 나누기
        paras = []
        for l in body:
            p = paras[-1] if paras else None
            if p and l['y0'] - p[-1]['y1'] < 7 and abs(l['size'] - p[-1]['size']) < 1 and (l['x0'] < bx + 30) == (p[-1]['x0'] < bx + 30 or p[-1]['x0'] >= bx + 5):
                p.append(l)
            else:
                paras.append([l])
        items = []
        for p in paras:
            f = p[0]
            txt = ' '.join(x['text'].strip() for x in p)
            if f['size'] >= 17.5:
                items.append({'y': f['y0'], 'b': {'h': txt}})
            elif f['size'] > 11.4:
                items.append({'y': f['y0'], 'b': {'sub': txt}})
            elif f['size'] > 10.4:                # 2-(1) 같은 한 단계 아래 소제목 (PDF 10.9pt)
                items.append({'y': f['y0'], 'b': {'subm': txt}})
            elif f['x0'] >= bx + 5 and f['x0'] < bx + 30 and items and ('h' in items[-1]['b'] or 'sub' in items[-1]['b'] and len(items) > 1 and 'h' in items[-2]['b']):
                items.append({'y': f['y0'], 'b': {'lead': segs_of(p)}})
            elif len(p) == 1 and all(b for _, b in f['spans'] if _.strip()) and len(txt) < 45 and f['x0'] < bx + 30:
                items.append({'y': f['y0'], 'b': {'sub2': txt}})
            elif f['x0'] > bx + 30:
                items.append({'y': f['y0'], 'b': {'li': segs_of(p)}})
            else:
                items.append({'y': f['y0'], 'b': {'p': segs_of(p)}, 'y1': p[-1]['y1']})
        # 메모는 같은 높이에서 시작하는 문단에 붙인다
        for n in ng:
            cand = [it for it in items if 'p' in it['b'] and it['y'] - 14 <= n['y'] <= it.get('y1', it['y']) + 4]
            if cand:
                cand[0]['b'].setdefault('note', []).append(n['t'])
            else:
                nxt = [it for it in items if it['y'] >= n['y'] - 14 and 'p' in it['b']]
                if nxt:
                    nxt[0]['b'].setdefault('note', []).append(n['t'])
        # 차트: 같은 줄(좌우)에 놓인 것끼리 한 묶음
        rows = []
        for e in sorted(ex, key=lambda e: (round(e['y']), e['rect'][0])):
            if rows and abs(rows[-1][0]['y'] - e['y']) < 6:
                rows[-1].append(e)
            else:
                rows.append([e])
        for r in rows:
            figs = []
            for e in r:
                f = save(page, e['rect'])
                if f:
                    figs.append(dict(f, no=e['no'], cap=e['cap'], unit=e['unit'], src_t=e['src']))
            if figs:
                items.append({'y': r[0]['y'], 'b': {'fig': figs}})
        for it in sorted(items, key=lambda it: it['y']):
            blocks.append(it['b'])
    # 쪽을 넘어 이어지는 문단 붙이기: 앞 문단이 마침표 없이 끝나고 다음 블록이 문단이면 합친다
    merged = []
    for b in blocks:
        prev = next((m for m in reversed(merged) if 'p' in m or 'h' in m or 'sub' in m or 'sub2' in m), None)
        if 'p' in b and prev is not None and 'p' in prev and not re.search(r'[.다]\s*$', prev['p'][-1]['t']) and 'note' not in b:
            prev['p'].extend(b['p'])
            continue
        merged.append(b)
    # 2쪽 목차: 항목마다 본문의 어느 제목으로 가는지(to = blocks 번호)
    toc = []
    norm = lambda t: re.sub(r'\s+', '', t)
    heads = [(i, b.get('h') or b.get('sub') or b.get('subm') or b.get('sub2')) for i, b in enumerate(merged) if any(k in b for k in ('h', 'sub', 'subm', 'sub2'))]
    if has_toc:
        ls1 = [l for l in lines_of(doc[1]) if 45 < l['y0'] < doc[1].rect.height - 50 and l['size'] >= 10.4 and 'CONTENTS' not in l['text']]
        x0s = sorted({round(l['x0']) for l in ls1})
        for l in ls1:
            m = re.search(r'(\d+)\s*$', l['text'])
            t = re.sub(r'[·.…\s]*\d*\s*$', '', l['text']).strip()
            if not t:
                continue
            lvl = min(2, sum(1 for x in x0s if x < round(l['x0']) - 5))
            to = next((i for i, h in heads if norm(t) in norm(h) or norm(h) in norm(t)), None)
            toc.append({'t': t, 'lvl': lvl, 'to': to, 'pg': int(m.group(1)) if m else None})
    if len(toc) < 3 or sum(1 for t in toc if t['to'] is not None) < len(toc) / 2:   # 2쪽이 목차가 아닌 예전 양식
        toc = []
    return {'stock': stock, 'toc': toc, 'blocks': merged}


if __name__ == '__main__':
    reps = load_reports()
    for rid in sys.argv[1:]:
        out = extract(rid, reps[rid])
        with open(os.path.join(OUT, rid + '.json'), 'w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
        bl = out['blocks']
        print(rid, len(bl), 'blocks', sum(len(b['fig']) for b in bl if 'fig' in b), 'figs', len(out['stock']['rows']), 'stock rows')
