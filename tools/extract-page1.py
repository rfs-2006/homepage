#!/usr/bin/env python3
# 리포트 PDF 1페이지 본문(헤드라인 아래 ~ Investment Fundamentals 위)을 그대로 뽑아
# assets/reports/page1.json 으로 저장한다. 리포트 화면이 요약 대신 이 원문을 보여 준다.
# 굵은 글씨, 소제목([Investment Point 1] 등), 문단 구분을 PDF 그대로 따른다.
#
# 사용법: 사이트 루트에서  python3 tools/extract-page1.py   (pymupdf 필요: pip install pymupdf)
import json, os, re, sys
import pymupdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_reports():
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    i = html.index('const REPORTS = [')
    body = html[i:html.index('\n];', i)]
    return re.findall(r"\{ id:'([^']+)'.*?pdf:'([^']+)'", body, re.S)

def is_bold(span):
    f = span['font'].lower()
    return 'bold' in f or 'heavy' in f or 'black' in f

def extract(path):
    page = pymupdf.open(path)[0]
    W = page.rect.width
    lines = []
    for b in page.get_text('dict')['blocks']:
        if b.get('type') != 0:
            continue
        for l in b['lines']:
            spans = [s for s in l['spans'] if s['text'].strip()]
            if not spans or l['bbox'][0] > 0.55 * W:
                continue
            lines.append({'y': l['bbox'][1], 'y1': l['bbox'][3], 'spans': l['spans'],
                          'size': max(s['size'] for s in spans),
                          'text': ''.join(s['text'] for s in l['spans'])})
    lines.sort(key=lambda l: l['y'])
    # 헤드라인(이름 다음으로 큰 굵은 글씨) 아래부터
    big = [l for l in lines if l['size'] >= 16 and l['size'] < 30]
    if not big:
        return None
    start = max(big, key=lambda l: l['size'])['y1']
    # 회사명 띠의 이름 줄 ('RFHIC (218410.KQ)')
    top = [l for l in lines if l['size'] >= 26]
    extract.name = re.sub(r'\s+', ' ', max(top, key=lambda l: l['size'])['text']).strip() if top else None
    end = next((l['y'] for l in lines if l['y'] > start and ('Investment Fundamentals' in l['text'] or 'Research Team' in l['text'] and l['size'] < 10)), 1e9)
    body = [l for l in lines if start <= l['y'] < end and 8.4 <= l['size'] < 15]
    if not body:
        return None
    sections, cur, para, prev = [], {'h': None, 'ps': []}, [], None
    def flush_para():
        nonlocal para
        if para:
            merged = []
            for seg in para:
                if merged and merged[-1]['b'] == seg['b']:
                    merged[-1]['t'] += seg['t']
                else:
                    merged.append(dict(seg))
            for m in merged:
                m['t'] = m['t'].replace('`', '’')
            if ''.join(m['t'] for m in merged).strip():
                merged[0]['t'] = merged[0]['t'].lstrip(); merged[-1]['t'] = merged[-1]['t'].rstrip()
                cur['ps'].append(merged)
        para = []
    for l in body:
        spans = [s for s in l['spans'] if s['text'].strip()]
        # 소제목: 줄 전체가 굵고 큰 글씨. '4Q25 Review: 동사는…'처럼 큰 머리말 뒤에 본문 크기 글씨가 이어지면 문단으로 본다
        heading = all(is_bold(s) and s['size'] >= 10.5 for s in spans)
        gap = (l['y'] - prev['y1']) if prev else 0
        if heading:
            flush_para()
            if cur['h'] or cur['ps']:
                sections.append(cur)
            cur = {'h': l['text'].strip().replace('`', '’'), 'ps': []}
            prev = l
            continue
        if prev is not None and gap > 6:
            flush_para()
        # 줄바꿈 이어 붙이기: 영문/숫자끼리 끊긴 경우만 띄어 쓴다
        if para:
            last = para[-1]['t']
            first = l['text'].lstrip()
            if last and not last.endswith(' ') and re.match(r'[A-Za-z0-9)]', last[-1]) and re.match(r'[A-Za-z(]', first[:1]):
                para[-1]['t'] += ' '
        for s in l['spans']:
            t = s['text']
            if not para:
                t = t.lstrip()
            if t:
                para.append({'t': t, 'b': is_bold(s)})
        prev = l
    flush_para()
    if cur['h'] or cur['ps']:
        sections.append(cur)
    return sections

def fundamentals(path):
    """1페이지 아래 Investment Fundamentals 표: {unit, cols:[연도], rows:[[항목, 값...]]}"""
    page = pymupdf.open(path)[0]
    W = page.rect.width
    ws = page.get_text('words')
    st = [w for w in ws if w[4].startswith('Fundamentals')]
    if not st:
        return None
    # 옛 양식은 표가 오른쪽 단에 있다
    ws = [w for w in ws if w[0] >= st[0][0] - 60] if st[0][0] > W / 2 else [w for w in ws if w[0] < 0.66 * W]
    lines = []   # y가 4pt 안쪽이면 같은 줄
    for w in sorted((w for w in ws if w[1] >= st[0][1] - 2), key=lambda w: (w[1], w[0])):
        if lines and abs(w[1] - lines[-1]['y']) < 4:
            lines[-1]['w'].append(w)
        else:
            lines.append({'y': w[1], 'w': [w]})
    yr = re.compile(r"(19|20)\d\d\d?(\(?[AEFP]\)?)?|\dQ\d\d[AEF]?|\d\d[AEF]|[AEF]")
    hi = next((i for i, l in enumerate(lines) if sum(bool(yr.fullmatch(w[4])) and len(w[4]) > 1 for w in l['w']) >= 2), None)
    if hi is None:
        return None
    hw = sorted([w for w in lines[hi]['w'] if yr.fullmatch(w[4])], key=lambda w: w[0])
    left = hw[0][0] - 12
    # 본문 줄: 표가 끝나는 곳(빈 줄, 이메일, 팀 명단)까지
    body = []
    for l in lines[hi + 1:]:
        lab = ' '.join(w[4] for w in sorted(l['w']) if w[2] <= left + 6)
        if not [w for w in l['w'] if w[2] > left + 6] or '@' in ' '.join(w[4] for w in l['w']) or re.match(r'(Research|RFS|R\.F\.S|팀장|팀원)', lab):
            break
        body.append((lab, [w for w in l['w'] if w[2] > left + 6]))
    # 열 위치: 값 칸의 가운데 x를 모아 묶는다 (머리줄이 빠진 열도 잡힌다)
    xs = sorted([(w[0] + w[2]) / 2 for _, vs in body for w in vs] + [(w[0] + w[2]) / 2 for w in hw])
    cl = []
    for x in xs:
        if cl and x - sum(cl[-1]) / len(cl[-1]) < 16: cl[-1].append(x)
        else: cl.append([x])
    cx = [sum(c) / len(c) for c in cl if len(c) >= 3]
    near = lambda x: min(range(len(cx)), key=lambda i: abs(x - cx[i]))
    cols = [''] * len(cx)
    for w in hw:
        i = near((w[0] + w[2]) / 2); cols[i] = (cols[i] + w[4]) if re.fullmatch('[AEF]', w[4]) else (cols[i] + ' ' + w[4]).strip()
    cols = [re.sub(r'^((?:19|20)\d\d)\d', r'\1', c) for c in cols]   # '20190' 같은 오타는 앞 네 자리만
    rows = []
    for lab, vs in body:
        vals = [''] * len(cx)
        for w in vs:
            i = near((w[0] + w[2]) / 2); vals[i] = (vals[i] + ' ' + w[4]).strip()
        if not lab and rows:          # 따로 잡힌 값은 윗줄 빈칸에 채운다
            for i, v in enumerate(vals):
                if v and not rows[-1][i + 1]: rows[-1][i + 1] = v
            continue
        rows.append([lab] + vals)
    if len(rows) < 3 or not all(cols):
        return None
    unit = ' '.join(w[4] for l in lines[:hi] for w in sorted(l['w']) if w[0] > left)
    m = re.search(r'\(.*\)', unit)
    return {'unit': m.group(0) if m else '', 'cols': cols, 'rows': rows}

def main():
    out, miss, names, fund = {}, [], {}, {}
    for rid, pdf in load_reports():
        p = os.path.join(ROOT, pdf)
        extract.name = None
        sec = extract(p) if os.path.exists(p) else None
        if extract.name:
            names[rid] = extract.name
        f = fundamentals(p) if os.path.exists(p) else None
        if f:
            fund[rid] = f
        if sec and sum(len(x['t']) for s in sec for ps in s['ps'] for x in ps) > 150:
            out[rid] = sec
        else:
            miss.append(rid)
    out['_names'] = names   # 리포트 화면 회사명 띠에 PDF 표기 그대로 쓴다
    out['_fund'] = fund     # Investment Fundamentals 표
    with open(os.path.join(ROOT, 'assets', 'reports', 'page1.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(f'표 {len(fund)}건, {len(out) - 2}건 추출, 실패 {len(miss)}건: {", ".join(miss)}')

if __name__ == '__main__':
    main()
