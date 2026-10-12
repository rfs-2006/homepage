"""RFS 챗봇 2단계: 문서 → 검색 단위(청크)

  python3 -I tools/rag/chunk.py /home/user/rfs-cafe-data
입력  parsed/docs.jsonl (parse.py 결과, 중복 표시된 문서는 건너뜀)
출력  parsed/chunks.jsonl, parsed/chunk_stats.json

원칙
- 리포트는 "투자포인트 1", "Valuation", "산업 분석" 같은 섹션 제목에서 먼저 자르고, 섹션이 길면 문단 경계에서 ~1,200자로 나눈다.
  섹션을 가로질러 자르면 "투자포인트 1의 결론 + 투자포인트 2의 도입"처럼 뜻이 섞인 청크가 생긴다.
- 청크마다 페이지 범위를 남긴다. 답변에 "OO 리포트 p.7" 출처를 달기 위해서다.
- 청크 앞에 짧은 머리글(종목·학기·문서 종류·섹션)을 붙여서 임베딩한다.
  "매출이 30% 늘었다" 같은 문단은 혼자서는 어느 회사 얘기인지 모른다 (Anthropic의 Contextual Retrieval과 같은 생각).
- 엑셀 모델은 시트 단위로 자른다.
"""
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

CAFE = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/rfs-cafe-data')
SRC = CAFE / 'parsed' / 'docs.jsonl'
OUT = CAFE / 'parsed'

TARGET, MAX, OVERLAP, MIN = 1200, 1800, 200, 120

# 매 페이지 머리에 붙는 학회 머리말 (페이지 번호가 붙어 있어서 parse 단계의 반복 줄 제거에 안 걸린 것)
NOISE = re.compile(r'^(R\.?\s?F\.?\s?S\.?\s*(Securities Research|Research Team|리서치).*|Equity Research|\d{1,3}|-\s*\d{1,3}\s*-|Page \d+)$', re.I)
HEAD = re.compile(
    r'^(?:[ⅠⅡⅢⅣⅤⅥⅦⅧ]\s*\.?|[IVX]{1,4}\.\s|\d{1,2}(?:-\d{1,2})?\.\s?|\d{1,2}\)\s?)?\s*'
    r'(투자\s?포인트|Investment\s+Point|Valuation|밸류에이션|산업\s?(분석|개요|현황)|Industry|기업\s?(분석|개요|소개)|Corporate|Company|'
    r'재무\s?분석|Financial|리스크|Risk|결론|Conclusion|Summary|요약|실적\s?(전망|추정)|매출\s?(추정|전망)|Appendix|부록)'
    r'.{0,40}$', re.I)

LABEL = {'company': '기업 리포트', 'industry': '산업 리포트', 'guide': '가이드', 'model': '엑셀 모델', 'study': '스터디',
         'macro': '매크로', 'fund_report': '운용 보고', 'post': '게시글', 'proposal': '투자제안서'}


def semester(d):
    s = f"{d.get('semester') or ''} {d.get('file') or ''} {d.get('subject') or ''}"
    m = re.search(r'(?<!\d)(\d{2})-([12])(?!\d)', s)
    if m:
        return f'{m.group(1)}-{m.group(2)}'
    if d.get('date'):
        t = datetime.fromtimestamp(int(d['date']) / 1000, tz=timezone.utc)
        return f'{t.year % 100:02d}-{1 if t.month <= 7 else 2}'
    return ''


def title_of(d):
    t = d.get('subject') or d.get('file') or ''
    t = re.sub(r'\.(pdf|docx|pptx|xlsx|hwp)$', '', t, flags=re.I)
    t = re.sub(r'\[\d{2}-\d\]|\(\d{2}-\d\)|_\d{6}$|입니다\.?$|발표\s?자료|최종|올립니다', ' ', t)
    return re.sub(r'[_\s]+', ' ', t).strip()[:60]


def unwrap(text):
    """PDF는 줄이 폭에 맞춰 끊겨서 '부\n문'처럼 단어가 갈린다. 문장이 안 끝난 줄은 다음 줄과 잇는다.
    한글끼리 이어지고 앞 줄이 폭을 꽉 채웠으면 단어 중간에서 끊긴 것으로 보고 띄어쓰기 없이 붙인다."""
    lines = [l.rstrip() for l in text.split('\n')]
    full = sorted(len(l) for l in lines if l)[int(len([l for l in lines if l]) * .8)] if any(lines) else 0
    out = ''
    for l in lines:
        if not out:
            out = l
            continue
        prev = out[-1:]
        if not l or re.search(r'[.!?:다요)]$', out) or len(out.split('\n')[-1]) < full * .6:
            out += '\n' + l
        elif re.match(r'[가-힣]', prev) and re.match(r'[가-힣]', l) and len(out.split('\n')[-1]) >= full * .85:
            out += l
        else:
            out += ' ' + l
    return out


def split_long(text, page):
    text = unwrap(text)
    """문단 경계에서 TARGET 근처로 자르고 OVERLAP만큼 겹친다"""
    paras = [p for p in re.split(r'\n(?=\S)', text) if p.strip()]
    out, cur = [], ''
    for p in paras:
        if len(p) > MAX:  # 문단 하나가 너무 길면 문장 단위로
            for s in re.split(r'(?<=[.다요])\s', p):
                if len(cur) + len(s) > TARGET and cur:
                    out.append(cur)
                    cur = cur[-OVERLAP:]
                cur += s + ' '
            continue
        if len(cur) + len(p) > TARGET and cur:
            out.append(cur)
            cur = cur[-OVERLAP:]
        cur += p + '\n'
    if cur.strip():
        out.append(cur)
    return [(c.strip(), page) for c in out]


def sections_from_pages(pages):
    """[(섹션 제목, 시작 페이지, 끝 페이지, 텍스트)]"""
    secs, title, buf, p0 = [], '', [], 1
    for i, pg in enumerate(pages, 1):
        for line in pg.splitlines():
            l = line.strip()
            if not l or NOISE.match(l):
                continue
            if HEAD.match(l) and len(l) <= 50:
                if sum(len(x) for x in buf) > MIN:
                    secs.append((title, p0, i, '\n'.join(buf)))
                    buf = []
                    p0 = i
                title = l
                continue
            buf.append(l)
    if buf:
        secs.append((title, p0, len(pages), '\n'.join(buf)))
    return secs


def chunks_of(d):
    if d['doc_type'] == 'model':
        parts = re.split(r'\n(?=## 시트: )', d['text'])
        for part in parts:
            m = re.match(r'## 시트: (.+)', part)
            sec = m.group(1).strip() if m else ''
            for c, _ in split_long(part, None):
                yield sec, None, None, c
        return
    if d.get('pages'):
        for sec, a, b, txt in sections_from_pages(d['pages']):
            # 페이지 범위가 넓은 섹션은 페이지마다 다시 나눠서 정확한 페이지를 남긴다
            if b - a >= 2 and len(txt) > MAX:
                for pi in range(a, b + 1):
                    ptxt = '\n'.join(l for l in d['pages'][pi - 1].splitlines() if l.strip() and not NOISE.match(l.strip()))
                    for c, _ in split_long(ptxt, pi):
                        yield sec, pi, pi, c
            else:
                for c, _ in split_long(txt, a):
                    yield sec, a, b, c
        return
    sec = ''
    buf = []
    for line in d['text'].splitlines():
        l = line.strip()
        if HEAD.match(l) and len(l) <= 50:
            if sum(len(x) for x in buf) > MIN:
                for c, _ in split_long('\n'.join(buf), None):
                    yield sec, None, None, c
                buf = []
            sec = l
            continue
        if l:
            buf.append(l)
    if buf:
        for c, _ in split_long('\n'.join(buf), None):
            yield sec, None, None, c


def main():
    docs = [json.loads(l) for l in open(SRC)]
    live = [d for d in docs if 'duplicate_of' not in d and d['chars'] >= 200]
    n = 0
    lens = []
    by_type = Counter()
    with open(OUT / 'chunks.jsonl', 'w') as f:
        for d in live:
            sem = semester(d)
            title = title_of(d)
            for k, (sec, p0, p1, text) in enumerate(chunks_of(d)):
                if len(text) < MIN:
                    continue
                pages = (f'p.{p0}' if p0 == p1 else f'p.{p0}-{p1}') if p0 else ''
                head = ' | '.join(x for x in [title, sem and f'{sem}학기', LABEL[d['doc_type']], sec, pages] if x)
                f.write(json.dumps({
                    'chunk_id': f"{d['doc_id']}-{k:03d}", 'doc_id': d['doc_id'], 'title': title, 'semester': sem,
                    'doc_type': d['doc_type'], 'grade': d['grade'], 'source': d['source'], 'board': d['board'],
                    'file': d['file'], 'article_id': d.get('article_id'), 'section': sec, 'page_start': p0, 'page_end': p1,
                    'header': head, 'text': text,
                }, ensure_ascii=False) + '\n')
                n += 1
                lens.append(len(text))
                by_type[d['doc_type']] += 1
    lens.sort()
    q = lambda p: lens[int(len(lens) * p)]
    stats = {'docs': len(live), 'chunks': n, 'len_p10': q(.1), 'len_median': q(.5), 'len_p90': q(.9), 'len_max': lens[-1],
             'by_type': by_type}
    (OUT / 'chunk_stats.json').write_text(json.dumps(stats, ensure_ascii=False, indent=1))
    print(json.dumps(stats, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
