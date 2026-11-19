#!/usr/bin/env python3
"""기업 리포트 PDF를 사이트에 올린다 (CLAUDE.md '기업 리포트 올리기' 순서를 한 번에).

  python3 tools/add-report.py inbox/기가비스.pdf [다른.pdf ...]          # 올리기
  python3 tools/add-report.py --dry inbox/기가비스.pdf                   # 1쪽에서 읽은 내용만 보여 주기

파일 이름이 영문 id면(예: gigavis.pdf) 그걸 주소(/research/gigavis/)로 쓰고, 아니면 회사 이름을 로마자로 바꿔 만든다
(해외 종목은 티커 소문자). 같은 id가 이미 있으면 뒤에 학기를 붙인다(예: sanil26).

하는 일
 1. 1쪽에서 발간일·회사명·티커·섹터·헤드라인·투자의견·목표주가·현재주가·상승여력·팀, 본문(요약·투자포인트·밸류에이션)을 읽는다
 2. PDF → assets/reports/<학기>_<id>.pdf, 표지 assets/covers/<학기>_<id>-top169.webp·-p1.webp
 3. assets/app.js REPORTS 맨 앞에 항목, FULL_REPORTS에 id
 4. tools/extract-page1.py <id>, tools/extract-full.py <id>
 5. 용어 풀이 tools/build-glossary.py <id> (환경변수 RAG_ANTHROPIC_API_KEY가 있을 때만)
 6. DATA_VER 올리기 → 주가(build-prices.js) → 빌드 두 개(build-site.js, build-pages.js)
홈 '리포트 발간' 슬라이드와 리서치 LATEST는 REPORTS의 가장 최근 발간일로 저절로 바뀐다.
GitHub에서는 .github/workflows/add-report.yml이 inbox/에 올라온 PDF로 이 스크립트를 돌리고 PR을 연다.
"""
import io
import json
import os
import re
import shutil
import subprocess
import sys

import pymupdf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, 'assets', 'app.js')

# ---------- 한글 → 로마자 (국립국어원 표기를 단순하게. id 만들기용) ----------
CHO = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
JUNG = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']
JONG = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't']


def romanize(s):
    out = ''
    for ch in s:
        c = ord(ch) - 0xAC00
        if 0 <= c < 11172:
            out += CHO[c // 588] + JUNG[(c % 588) // 28] + JONG[c % 28]
        elif ch.isascii() and ch.isalnum():
            out += ch.lower()
    return out


def term_of(date):   # 3~8월 → YY-1, 9~12월 → YY-2, 1~2월 → 작년 -2 (assets/app.js termOf와 같게)
    y, m = int(date[:4]), int(date[5:7])
    return f'{y % 100}-1' if 3 <= m <= 8 else (f'{y % 100}-2' if m >= 9 else f'{(y - 1) % 100}-2')


# ---------- 1쪽 읽기 ----------
def read_meta(path):
    doc = pymupdf.open(path)
    pg = doc[0]
    txt = pg.get_text()
    spans = [s for b in pg.get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans'] if s['text'].strip()]
    sizes = sorted({round(s['size'], 1) for s in spans}, reverse=True)
    big = lambda i: ''.join(s['text'] for s in spans if round(s['size'], 1) == sizes[i]).strip() if len(sizes) > i else ''
    name_line, tick_line = big(0), big(1)
    m = re.search(r'\(?\s*([0-9A-Z.\-]+?)\.(KQ|KS|NQ|NY|US|N|O|L|T|HK)\s*\)?', tick_line + ' ' + name_line)
    if not m:
        raise SystemExit(f'{path}: 1쪽에서 티커(예: 420770.KQ)를 못 찾았다')
    ticker, mkt = m.group(1), m.group(2)
    name = re.sub(r'\(.*$', '', name_line).strip() or re.sub(r'\(.*$', '', tick_line).strip()
    headline = next((''.join(s['text'] for s in spans if round(s['size'], 1) == z).strip() for z in sizes[2:4] if 15 < z < 30), '')
    d = re.search(r'(\d{4})\.(\d{2})\.(\d{2})\s*[|│]', txt)
    sector = re.search(r'[|│]([^|│\n]{1,20})[|│]', txt)

    def after(label):
        i = txt.find(label)
        if i < 0:
            return ''
        rest = [x.strip() for x in txt[i + len(label):].split('\n') if x.strip()]
        return rest[0] if rest else ''
    cur_lab = re.search(r'현재주가\([^)]*\)', txt)
    op, tp, cur, up = after('투자의견'), after('목표주가'), after(cur_lab.group(0)) if cur_lab else '', after('상승여력')
    team = re.search(r'Research Team\s*(\d)', txt)
    return {
        'name': name, 'ticker': ticker, 'region': 'Korea' if mkt in ('KQ', 'KS') else 'Global',
        'date': f'{d.group(1)}.{d.group(2)}.{d.group(3)}' if d else '', 'sector': sector.group(1).strip() if sector else '',
        'headline': headline, 'op': op.upper(), 'tp': tp.replace(' ', ''), 'cur': cur.replace(' ', ''),
        'upside': ('+' if up and not up.startswith(('+', '-', '−')) else '') + up.replace(' ', ''),
        'team': f'Research Team {team.group(1)}' if team else '', 'pages': doc.page_count,
    }


def num(s):
    m = re.search(r'-?[\d,]+(\.\d+)?', s or '')
    return float(m.group(0).replace(',', '')) if m else 0


def body_text(page1, pick):
    """extract-page1 결과(섹션 목록)에서 제목에 pick이 들어간 섹션의 글"""
    for sec in page1:
        if pick(sec.get('h') or ''):
            return re.sub(r'\s+', ' ', ''.join(x['t'] for ps in sec['ps'] for x in ps)).strip()
    return ''


def js(s):
    return "'" + str(s).replace('\\', '\\\\').replace("'", "\\'") + "'"


def entry(rid, meta, term, page1):
    summ = body_text(page1, lambda h: h == '')
    summ = re.sub(r'^\S*\s*(\d{4}|FY\d+\S*|`\d+E|’\d+E)?\s*\S*\s*Preview\s*[:：]?\s*', '', summ).strip() or summ
    pts = []
    for n in (1, 2, 3):
        h = next((sec.get('h') for sec in page1 if re.search(rf'Investment Point\s*{n}', sec.get('h') or '')), None)
        if not h:
            continue
        title = re.sub(rf'^\[?\s*Investment Point\s*{n}\s*\]?\s*', '', h).strip(' ]')
        pts.append((f'투자포인트 {n}. {title}', body_text(page1, lambda x, h=h: x == h)))
    val = body_text(page1, lambda h: 'Valuation' in h)
    hero = (re.split(r'(?<=다\.)\s', summ)[0] if summ else meta['headline'])[:90]
    up = num(meta['upside'])
    lines = [
        f"  {{ id:{js(rid)}, name:{js(meta['name'])}, ticker:{js(meta['ticker'])}, sector:{js(meta['sector'])}, type:'Company Analysis', op:{js(meta['op'] or 'BUY')}, tp:{js(meta['tp'])}, buy:'', cur:{js(meta['cur'])}, upside:{js(meta['upside'])}, upNum:{up:g}, tpNum:{num(meta['tp']):g}, date:{js(meta['date'])}, team:{js(meta['team'])}, region:{js(meta['region'])},",
        f"    headline:{js(meta['headline'])},",
        f"    summary:{js(summ)},",
        f"    heroSummary:{js(hero)},",
        '    points:[',
        ',\n'.join(f"      {{ title:{js(t)}, body:{js(b)} }}" for t, b in pts),
        '    ],',
        f"    valuation:{js(val)},",
        f"    members:{js(meta['team'])},",
        f"    pdf:'assets/reports/{term}_{rid}.pdf', pdfMeta:'PDF · {meta['pages']} pages', cover:'assets/covers/{term}_{rid}-top169.webp', heroCover:'assets/covers/{term}_{rid}-top169.webp', credit:'', creditHref:'' }},",
    ]
    return '\n'.join(lines) + '\n'


def covers(pdf, term, rid):
    pg = pymupdf.open(pdf)[0]
    im = Image.open(io.BytesIO(pg.get_pixmap(dpi=200).tobytes('png'))).convert('RGB')
    w, h = im.size
    out = os.path.join(ROOT, 'assets', 'covers', f'{term}_{rid}')
    im.resize((1000, round(1000 * h / w)), Image.LANCZOS).save(out + '-p1.webp', 'WEBP', quality=82, method=6)
    im.crop((0, 0, w, round(w * 669 / 1190))).resize((1190, 669), Image.LANCZOS).save(out + '-top169.webp', 'WEBP', quality=82, method=6)


def run(*cmd):
    print('$', ' '.join(cmd), flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True)


def main():
    args = sys.argv[1:]
    dry = '--dry' in args
    pdfs = [a for a in args if not a.startswith('--')]
    if not pdfs:
        raise SystemExit(__doc__)
    src = open(APP, encoding='utf-8').read()
    have = set(re.findall(r"\{ id:'([^']+)'", src))
    added = []
    for pdf in pdfs:
        meta = read_meta(pdf)
        if not meta['date']:
            raise SystemExit(f'{pdf}: 1쪽에서 발간일(2026.11.10 | Company Analysis)을 못 찾았다')
        term = term_of(meta['date'])
        base = os.path.splitext(os.path.basename(pdf))[0]
        rid = base.lower() if re.fullmatch(r'[a-z][a-z0-9]{1,30}', base.lower()) else (meta['ticker'].lower().replace('.', '') if meta['region'] != 'Korea' else romanize(meta['name']))
        if rid in have or rid in added:
            rid += term.split('-')[0]
        print(json.dumps({'id': rid, 'term': term, **meta}, ensure_ascii=False))
        if dry:
            continue
        shutil.copy(pdf, os.path.join(ROOT, 'assets', 'reports', f'{term}_{rid}.pdf'))
        covers(pdf, term, rid)
        # 1쪽 본문은 extract-page1의 extract로 읽는다 (사이트 1쪽 화면과 같은 글)
        sys.path.insert(0, os.path.join(ROOT, 'tools'))
        import importlib.util
        spec = importlib.util.spec_from_file_location('p1', os.path.join(ROOT, 'tools', 'extract-page1.py'))
        p1 = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(p1)
        sec = p1.extract(os.path.join(ROOT, 'assets', 'reports', f'{term}_{rid}.pdf')) or []
        src = open(APP, encoding='utf-8').read()
        src = src.replace('const REPORTS = [\n', 'const REPORTS = [\n' + entry(rid, meta, term, sec), 1)
        src = src.replace("const FULL_REPORTS = [", f"const FULL_REPORTS = ['{rid}', ", 1)
        open(APP, 'w', encoding='utf-8').write(src)
        added.append(rid)
        if os.path.dirname(os.path.abspath(pdf)) == os.path.join(ROOT, 'inbox'):
            os.remove(pdf)   # 다 옮겼으면 inbox에서 지운다
    if dry or not added:
        return
    run(sys.executable, 'tools/extract-page1.py', *added)
    run(sys.executable, 'tools/extract-full.py', *added)
    if os.environ.get('RAG_ANTHROPIC_API_KEY'):
        try:
            run(sys.executable, 'tools/build-glossary.py', *added)
        except subprocess.CalledProcessError:
            print('용어 풀이 실패 (main에 올라가면 glossary.yml이 다시 만든다)')
    else:
        print('RAG_ANTHROPIC_API_KEY가 없어 용어 풀이는 건너뜀 (나중에 tools/build-glossary.py ' + ' '.join(added) + ')')
    import importlib.util
    spec = importlib.util.spec_from_file_location('bg', os.path.join(ROOT, 'tools', 'build-glossary.py'))
    try:
        bg = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(bg)
        bg.bump_data_ver()
    except ImportError:   # anthropic 패키지가 없는 컴퓨터
        print('DATA_VER는 손으로 올리기 (assets/app.js)')
    for c in (['node', 'tools/build-prices.js'], ['node', 'tools/build-site.js'], ['node', 'tools/build-pages.js']):
        try:
            run(*c)
        except subprocess.CalledProcessError:
            print('실패:', ' '.join(c), '(나중에 다시)')
    print('추가:', ', '.join(added))


if __name__ == '__main__':
    main()
