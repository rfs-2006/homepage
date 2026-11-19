#!/usr/bin/env python3
"""리포트 용어 풀이 만들기 → assets/reports/glossary.json 의 <id> 칸.

리포트 화면은 이 파일의 용어를 본문에서 찾아(글자 그대로 일치) 밑줄을 긋고, 누르면 풀이 팝업을 띄운다 (assets/app.js glSplit·glOpen).
한 항목: {"t": 용어(본문에 쓰인 그대로), "k": 산업|재무|밸류에이션|정책, "d": 뜻 풀이(토스 말투), "c": 이 리포트에서는(리포트 숫자만, 없으면 "")}

사용법: 사이트 루트에서
  RAG_ANTHROPIC_API_KEY=... python3 tools/build-glossary.py gigavis [다른 id ...]      # 새로 만들기 (이미 있으면 건너뜀)
  RAG_ANTHROPIC_API_KEY=... python3 tools/build-glossary.py --force sanil              # 다시 만들기
  RAG_ANTHROPIC_API_KEY=... python3 tools/build-glossary.py --missing --bump           # 전문은 있는데 용어 풀이가 없는 리포트 전부 + DATA_VER 올리기
GitHub Actions(.github/workflows/glossary.yml)가 main에 리포트가 올라오면 --missing --bump로 돌린다 (저장소 Secret RAG_ANTHROPIC_API_KEY 필요).
먼저 tools/extract-page1.py, tools/extract-full.py <id> 로 1쪽·전문을 뽑아 두어야 한다 (글을 거기서 읽는다).
다 만들면 assets/app.js 의 DATA_VER 를 올린다 (브라우저가 예전 glossary.json 을 하루 동안 다시 받지 않으므로).
"""
import json
import os
import re
import sys

import anthropic

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GL = os.path.join(ROOT, 'assets', 'reports', 'glossary.json')
MODEL = 'claude-sonnet-5-5'
KINDS = ('산업', '재무', '밸류에이션', '정책')

SYSTEM = """너는 대학 투자학회 리포트의 용어 풀이를 쓰는 편집자다. 독자는 리포트를 처음 읽는 1학년 학회원이다.

리포트 글을 읽고 독자가 모를 만한 용어 90~110개를 골라 풀이한다.
- 고를 것: 산업·기술 용어, 제품·공정, 고객사·경쟁사, 재무·밸류에이션 용어, 정책·제도. 흔한 말과 "YoY", "상승여력"은 빼고 같은 용어를 두 번 넣지 않는다.
- t: 리포트 글에 쓰인 글자 그대로 (사이트가 글자 그대로 찾아 밑줄을 긋는다. 띄어쓰기·대소문자·괄호까지 같게).
- k: 산업 | 재무 | 밸류에이션 | 정책 중 하나.
- d: 일반적인 뜻 풀이. 토스처럼 "~예요/~해요"로 끝나는 짧은 문장, 120~160자. 어려운 말은 쉬운 말로 풀고 계산은 (A ÷ B − 1)처럼 괄호 식으로. 사실만 쓰고 숫자를 지어내지 않는다.
- c: "이 리포트에서는" 칸. 이 리포트가 그 용어를 어떻게 쓰는지 1~2문장, 40~70자. 숫자는 리포트에 있는 것만. 쓸 게 없으면 "".

예시
{"t": "수주잔고", "k": "재무", "d": "계약은 맺었지만 아직 납품하지 않은 물량의 금액이에요. 앞으로 매출로 잡힐 일감이에요. 수주잔고 ÷ 최근 분기 매출로 몇 분기 치 일감이 남았는지 볼 수 있어요. 잔고가 늘면 앞으로 매출이 보이는 셈이지만, 납기가 길면 매출로 잡히는 시점은 그만큼 늦어져요.", "c": "5,567억 원이면 2Q26 분기 매출(1,642억 원)의 약 3.4배예요. 1년 가까운 매출이 이미 확보된 셈이에요."}

출력은 JSON 배열 하나만. 다른 글자 없이."""


def report_text(rid):
    """1쪽 + 전문(제목·소제목·문단·표 캡션)을 글자로."""
    out = []
    p1 = json.load(open(os.path.join(ROOT, 'assets', 'reports', 'page1.json'), encoding='utf-8')).get(rid) or []

    def walk(x):
        if isinstance(x, str):
            out.append(x)
        elif isinstance(x, dict):
            for k, v in x.items():
                if k not in ('img', 'src', 'href', 'url', 'w', 'ht', 'k'):   # 그림 경로 같은 것만 빼고 글은 다 (표 칸·Stock Data·목차까지)
                    walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
    walk(p1)
    fp = os.path.join(ROOT, 'assets', 'reports', 'full', rid + '.json')
    if os.path.exists(fp):
        walk(json.load(open(fp, encoding='utf-8')))
    return '\n'.join(s for s in out if s.strip())


def build(rid, client):
    text = report_text(rid)
    if len(text) < 2000:
        raise SystemExit(f'{rid}: 글이 너무 짧다 ({len(text)}자). extract-page1.py·extract-full.py를 먼저 돌렸는지 확인')
    flat = re.sub(r'\s+', '', text)
    with client.messages.stream(model=MODEL, max_tokens=64000, system=SYSTEM,
                                messages=[{'role': 'user', 'content': f'리포트 id: {rid}\n\n{text[:120000]}'}]) as st:
        msg = st.get_final_message()
    raw = ''.join(b.text for b in msg.content if b.type == 'text')
    m = re.search(r'\[.*\]', raw, re.S)
    items = json.loads(m.group(0) if m else raw)
    keep, seen = [], set()
    for e in items:
        t = str(e.get('t', '')).strip()
        # 본문에 없는 용어는 밑줄이 안 그어지므로 뺀다 (띄어쓰기 차이는 봐준다)
        if not t or t in seen or t in ('YoY', '상승여력') or re.sub(r'\s+', '', t) not in flat:
            continue
        seen.add(t)
        keep.append({'t': t, 'k': e.get('k') if e.get('k') in KINDS else '산업', 'd': str(e.get('d', '')).strip(), 'c': str(e.get('c', '')).strip()})
    return keep


def full_ids():
    src = open(os.path.join(ROOT, 'assets', 'app.js'), encoding='utf-8').read()
    m = re.search(r"const FULL_REPORTS = \[([^\]]*)\]", src)
    return re.findall(r"'([^']+)'", m.group(1)) if m else []


def bump_data_ver():
    """assets/app.js의 DATA_VER를 오늘 날짜로 올린다 (같은 날 여러 번이면 끝 글자를 다음 알파벳으로)."""
    import datetime
    p = os.path.join(ROOT, 'assets', 'app.js')
    src = open(p, encoding='utf-8').read()
    cur = re.search(r"const DATA_VER = '([^']*)';", src).group(1)
    day = (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime('%Y%m%d')
    nxt = day + (chr(ord(cur[-1]) + 1) if cur.startswith(day) and cur[-1].isalpha() and cur[-1] < 'z' else 'a')
    open(p, 'w', encoding='utf-8').write(src.replace(f"const DATA_VER = '{cur}';", f"const DATA_VER = '{nxt}';", 1))
    print('DATA_VER', cur, '→', nxt)


def main():
    args = sys.argv[1:]
    force = '--force' in args
    gl = json.load(open(GL, encoding='utf-8'))
    ids = [a for a in args if not a.startswith('--')]
    if '--missing' in args:
        ids += [i for i in full_ids() if not gl.get(i) and i not in ids]
    if not ids:
        if '--missing' in args:
            print('용어 풀이가 빠진 리포트 없음')
            return
        raise SystemExit(__doc__)
    client = anthropic.Anthropic(api_key=os.environ['RAG_ANTHROPIC_API_KEY'], base_url='https://api.anthropic.com')
    for rid in ids:
        if gl.get(rid) and not force:
            print(rid, '이미 있음', len(gl[rid]), '(다시 만들려면 --force)')
            continue
        gl[rid] = build(rid, client)
        print(rid, len(gl[rid]), '개')
        with open(GL, 'w', encoding='utf-8') as f:   # 하나 끝날 때마다 저장 (중간에 멈춰도 앞의 것은 남게)
            json.dump(gl, f, ensure_ascii=False, separators=(',', ':'))
        made = True
    if '--bump' in args and locals().get('made'):
        bump_data_ver()


if __name__ == '__main__':
    main()
