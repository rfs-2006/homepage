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

def main():
    out, miss = {}, []
    for rid, pdf in load_reports():
        p = os.path.join(ROOT, pdf)
        sec = extract(p) if os.path.exists(p) else None
        if sec and sum(len(x['t']) for s in sec for ps in s['ps'] for x in ps) > 150:
            out[rid] = sec
        else:
            miss.append(rid)
    with open(os.path.join(ROOT, 'assets', 'reports', 'page1.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(out)}건 추출, 실패 {len(miss)}건: {", ".join(miss)}')

if __name__ == '__main__':
    main()
