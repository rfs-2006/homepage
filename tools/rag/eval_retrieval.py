"""검색 평가: 평가셋 질문마다 정답 청크가 상위 k개 안에 나오는지 잰다.

  python3 -I tools/rag/eval_retrieval.py /home/user/rfs-cafe-data bm25
지표
- hit@k: 정답 청크(또는 같은 문서의 다른 청크)가 상위 k개 안에 있는 질문 비율
- MRR: 정답이 처음 나온 순위의 역수 평균 (1위면 1, 2위면 0.5)
문서 단위로도 같이 잰다. 청크는 못 맞혀도 같은 리포트를 찾았으면 답변 단계에서 쓸 수 있기 때문이다.
"""
import json
import math
import re
import sys
from collections import defaultdict
from pathlib import Path

from rank_bm25 import BM25Okapi

CAFE = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/rfs-cafe-data')
METHOD = sys.argv[2] if len(sys.argv) > 2 else 'bm25'
KS = (1, 5, 10, 20)


def tokens(s):
    """한국어는 띄어쓰기 단위가 '리포트에서', '리포트의'처럼 조사로 갈려서 단어로는 잘 안 맞는다.
    형태소 분석기 없이 쓰는 방법으로 2글자 묶음(bigram)과 영문·숫자 단어를 함께 쓴다."""
    s = s.lower()
    out = re.findall(r'[a-z0-9]+(?:[./][a-z0-9]+)*', s)
    for w in re.findall(r'[가-힣]+', s):
        out += [w[i:i + 2] for i in range(len(w) - 1)] or [w]
    return out


def main():
    chunks = [json.loads(l) for l in open(CAFE / 'parsed' / 'chunks.jsonl')]
    qs = [json.loads(l) for l in open(CAFE / 'eval' / 'eval_v0.jsonl')]
    doc_of = {c['chunk_id']: c['doc_id'] for c in chunks}
    if METHOD == 'bm25':
        bm = BM25Okapi([tokens(c['header'] + '\n' + c['text']) for c in chunks])
        search = lambda q: sorted(range(len(chunks)), key=lambda i: -s[i]) if (s := bm.get_scores(tokens(q))) is not None else []
    else:
        raise SystemExit('unknown method ' + METHOD)
    res = defaultdict(list)
    rows = []
    for q in qs:
        if not q['gold_chunks']:
            continue
        top = [chunks[i]['chunk_id'] for i in search(q['question'])[:max(KS)]]
        gold_c, gold_d = set(q['gold_chunks']), {doc_of[g] for g in q['gold_chunks']}
        rc = next((r for r, c in enumerate(top, 1) if c in gold_c), None)
        rd = next((r for r, c in enumerate(top, 1) if doc_of[c] in gold_d), None)
        for k in KS:
            res[f'chunk_hit@{k}'].append(rc is not None and rc <= k)
            res[f'doc_hit@{k}'].append(rd is not None and rd <= k)
        res['chunk_mrr'].append(1 / rc if rc else 0)
        res['doc_mrr'].append(1 / rd if rd else 0)
        res[f"type:{q['type']}:doc_hit@5"].append(rd is not None and rd <= 5)
        rows.append((q['id'], q['type'], rd, q['question'][:40]))
    out = {k: round(sum(v) / len(v), 3) for k, v in res.items()}
    out['n'] = len(rows)
    print(json.dumps(out, ensure_ascii=False, indent=1))
    print('놓친 질문 (문서 기준 top5 밖):')
    for r in rows:
        if not r[2] or r[2] > 5:
            print(' ', r)
    (CAFE / 'eval' / f'result_{METHOD}.json').write_text(json.dumps({'metrics': out, 'rows': rows}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
