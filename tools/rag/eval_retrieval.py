"""검색 평가: 평가셋 질문마다 정답 청크가 상위 k개 안에 나오는지 잰다.

  python3 -I tools/rag/eval_retrieval.py /home/user/rfs-cafe-data <방법> [v0|v1]
방법: bm25 | vector | hybrid | hybrid+rerank | multiquery | agent
지표
- hit@k: 정답 청크(또는 같은 문서의 다른 청크)가 상위 k개 안에 있는 질문 비율
- MRR: 정답이 처음 나온 순위의 역수 평균 (1위면 1, 2위면 0.5)
문서 단위로도 같이 잰다. 청크는 못 맞혀도 같은 리포트를 찾았으면 답변 단계에서 쓸 수 있기 때문이다.
- docs@10 (v1, 코칭·글쓰기·종합만): 상위 10개 안에 서로 다른 정답 문서가 몇 개 있는지.
  "사례 몇 개 알려줘"류는 하나 맞히는 것보다 여러 사례를 모아오는 게 중요해서 따로 본다.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from retriever import Retriever, load_chunks, rrf  # noqa: E402

CAFE = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/rfs-cafe-data')
METHOD = sys.argv[2] if len(sys.argv) > 2 else 'bm25'
EVAL = sys.argv[3] if len(sys.argv) > 3 else 'v0'
KS = (1, 5, 10, 20)


def main():
    chunks = load_chunks(CAFE)
    qs = [json.loads(l) for l in open(CAFE / 'eval' / f'eval_{EVAL}.jsonl')]
    doc_of = {c['chunk_id']: c['doc_id'] for c in chunks}
    # 방법: bm25 | vector | hybrid | hybrid+rerank | multiquery | agent
    # vector 계열은 Voyage 임베딩, multiquery·agent는 Claude(RAG_ANTHROPIC_API_KEY)도 필요
    ret = Retriever(CAFE, chunks, bm=METHOD != 'vector', vec=METHOD != 'bm25')
    if METHOD in ('multiquery', 'agent'):
        from agent_search import AgentSearch
        ag = AgentSearch(CAFE, ret)
    elif METHOD != 'bm25':
        ret.embed_queries([q['question'] for q in qs])

    def search(q):
        if METHOD == 'bm25':
            return ret.bm25(q)
        if METHOD == 'vector':
            return ret.vector(q)
        if METHOD == 'multiquery':
            return ag.multiquery(q)
        if METHOD == 'agent':
            return ag.agent(q)
        fused = rrf(ret.bm25(q), ret.vector(q))
        return ret.rerank(q, fused) if METHOD == 'hybrid+rerank' else fused
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
        if EVAL != 'v0' and q['type'] in ('coach', 'writing', 'cross'):
            res[f"type:{q['type']}:docs@10"].append(len({doc_of[c] for c in top[:10]} & gold_d))
        rows.append((q['id'], q['type'], rd, q['question'][:40]))
    out = {k: round(sum(v) / len(v), 3) for k, v in res.items()}  # docs@10은 비율이 아니라 평균 개수
    out['n'] = len(rows)
    if METHOD in ('multiquery', 'agent'):
        out['claude_tokens'] = ag.usage
        (CAFE / 'eval' / f'log_{EVAL}_{METHOD}.json').write_text(json.dumps(ag.log, ensure_ascii=False, indent=1))
    print(json.dumps(out, ensure_ascii=False, indent=1))
    print('놓친 질문 (문서 기준 top5 밖):')
    for r in rows:
        if not r[2] or r[2] > 5:
            print(' ', r)
    (CAFE / 'eval' / (f'result_{METHOD}.json' if EVAL == 'v0' else f'result_{EVAL}_{METHOD}.json')).write_text(json.dumps({'metrics': out, 'rows': rows}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
