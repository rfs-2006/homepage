"""LLM 채점: 여러 검색 방법의 상위 결과를 한데 모아(pooling) Claude가 같은 기준으로 채점하고, 그 점수로 방법들을 다시 잰다.

  python3 -I tools/rag/judge.py /home/user/rfs-cafe-data v2
입력  eval/eval_<v>.jsonl, eval/result_<v>_<방법>.json (문항별 상위 청크가 저장된 결과)
출력  eval/judge_<v>.jsonl (문항·청크별 점수, 이어하기용), eval/judged_<v>.json (방법별 지표)

왜
- 정답을 사람이 검색 결과에서 고르면, 그 결과를 낸 검색기에 유리해진다 (v1은 BM25·벡터·리랭크, v2는 multiquery·agent 쪽).
- 모든 방법의 상위 10개를 합친 풀을 같은 기준으로 채점하면 상위 10개 안에서는 빠짐없이 판정된다 (TREC 풀링과 같은 방식).
- 채점기는 어느 방법이 찾았는지, 몇 위였는지 모르게 청크 ID 순서로 보여준다.
점수  2 = 질문에 대한 답(사실·방법·근거·사례)이 청크 안에 직접 있다, 1 = 관련은 있지만 일부만 있거나 간접적, 0 = 무관
지표  rel@10: 상위 10개 중 2점 청크 비율, hit@5: 상위 5개 안에 2점 청크가 있는 문항 비율, nDCG@10 (점수 그대로), docs@10: 2점 청크가 나온 서로 다른 문서 수
"""
import json
import math
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from agent_search import JUDGE_LLM, ask, client  # noqa: E402
from retriever import load_chunks  # noqa: E402

CAFE = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/rfs-cafe-data')
EVAL = sys.argv[2] if len(sys.argv) > 2 else 'v2'
METHODS = ['bm25', 'vector', 'hybrid', 'hybrid+rerank', 'multiquery', 'agent']
POOL_K = 10

SYSTEM = """너는 검색 결과 채점자다. 중앙대 투자학회 RFS 자료(기업·산업 리포트, 세미나, 엑셀 모델, 가이드)에서 찾은 청크가
사용자 질문에 답하는 데 쓸모 있는지 청크마다 따로 판정한다. 청크끼리 비교하지 말고, 청크 순서는 의미 없다.

점수
- 2: 질문에 대한 답이 청크 안에 직접 있다. 사실 질문이면 그 문서의 해당 사실, 방법 질문이면 실제로 쓴 방법·근거,
     코칭 질문("~는 어떻게 해?")이면 그 방법을 실제로 적용한 사례나 설명.
- 1: 관련은 있지만 답의 일부만 있거나 간접적이다 (같은 회사·업종이지만 질문한 내용은 없음, 결론만 있고 근거는 없음 등).
- 0: 무관하다.
특정 문서를 묻는 질문(예: "OO 리포트에서 ~")은 그 문서(같은 리포트의 사본·엑셀 모델 포함)가 아니면 2점을 주지 않는다.
reason은 한 문장으로 짧게."""

SCHEMA = {'type': 'object', 'properties': {'judgments': {'type': 'array', 'items': {
    'type': 'object', 'properties': {'chunk_id': {'type': 'string'}, 'score': {'type': 'integer', 'enum': [0, 1, 2]},
                                     'reason': {'type': 'string'}},
    'required': ['chunk_id', 'score', 'reason'], 'additionalProperties': False}}},
    'required': ['judgments'], 'additionalProperties': False}


def judge_question(cl, q, chunks, tries=3):
    """한 문항의 청크를 한 번에 채점한다. 채점기가 몇 개를 빠뜨리면 빠진 것만 다시 묻는다."""
    got, todo, usage = {}, list(chunks), [0, 0]
    for _ in range(tries):
        body = '\n\n'.join(f"[{c['chunk_id']}] {c['header']}\n{c['text']}" for c in todo)
        resp = ask(cl, model=JUDGE_LLM, system=SYSTEM, output_config={'effort': 'low', 'format': {'type': 'json_schema', 'schema': SCHEMA}},
                   messages=[{'role': 'user', 'content': f"질문: {q['question']}\n\n청크 {len(todo)}개:\n\n{body}"}])
        usage[0] += resp.usage.input_tokens
        usage[1] += resp.usage.output_tokens
        want = {c['chunk_id'] for c in todo}
        for j in json.loads(next(b.text for b in resp.content if b.type == 'text'))['judgments']:
            if j['chunk_id'] in want:
                got[j['chunk_id']] = j
        todo = [c for c in todo if c['chunk_id'] not in got]
        if not todo:
            break
    if todo:
        raise RuntimeError(f"{q['id']}: 채점 누락 {len(todo)}개")
    return list(got.values()), usage


def main():
    chunks = {c['chunk_id']: c for c in load_chunks(CAFE)}
    qs = {json.loads(l)['id']: json.loads(l) for l in open(CAFE / 'eval' / f'eval_{EVAL}.jsonl')}
    tops = {m: {r[0]: r[4] for r in json.load(open(CAFE / 'eval' / f'result_{EVAL}_{m}.json'))['rows']} for m in METHODS}
    pool = defaultdict(set)
    for m in METHODS:
        for qid, top in tops[m].items():
            pool[qid] |= set(top[:POOL_K])

    path = CAFE / 'eval' / f'judge_{EVAL}.jsonl'
    done = defaultdict(dict)
    if path.exists():
        for l in open(path):
            j = json.loads(l)
            done[j['qid']][j['chunk_id']] = j
    todo = [qid for qid in pool if set(pool[qid]) - set(done[qid])]
    print(f'문항 {len(pool)}, 풀 청크 {sum(map(len, pool.values()))}, 채점할 문항 {len(todo)}', flush=True)

    cl = client()
    usage = {'input': 0, 'output': 0}

    def run(qid):
        need = sorted(set(pool[qid]) - set(done[qid]))
        try:
            js, u = judge_question(cl, qs[qid], [chunks[c] for c in need])
        except Exception as e:  # 한 문항이 실패해도 나머지는 계속, 다시 실행하면 빠진 것만 채점
            print('실패', qid, e, flush=True)
            return qid, [], [0, 0]
        return qid, js, u

    with ThreadPoolExecutor(4) as ex, open(path, 'a') as f:
        for qid, js, u in ex.map(run, todo):
            usage['input'] += u[0]
            usage['output'] += u[1]
            for j in js:
                rec = {'qid': qid, 'chunk_id': j['chunk_id'], 'score': j['score'], 'reason': j['reason']}
                done[qid][j['chunk_id']] = rec
                f.write(json.dumps(rec, ensure_ascii=False) + '\n')
            print(qid, sum(j['score'] == 2 for j in js), '/', len(js), flush=True)

    left = sum(len(set(pool[q]) - set(done[q])) for q in pool)
    if left:
        sys.exit(f'아직 채점 안 된 청크 {left}개. 다시 실행하면 이어서 채점한다.')

    # 사람 판정과 일치율: 사람이 고른 정답(양성)이 풀에 들어온 경우, 채점기가 2점(또는 1점 이상)을 줬는가
    agree = defaultdict(list)
    for qid, q in qs.items():
        for c in set(q['gold_chunks']) & pool[qid]:
            s = done[qid][c]['score']
            agree[q['type']].append(s)
            agree['all'].append(s)
    agreement = {t: {'n': len(v), 'score2': round(sum(s == 2 for s in v) / len(v), 3),
                     'score>=1': round(sum(s >= 1 for s in v) / len(v), 3)} for t, v in agree.items()}

    res = {}
    for m in METHODS:
        acc = defaultdict(list)
        for qid, top in tops[m].items():
            sc = [done[qid][c]['score'] for c in top[:POOL_K]]
            sc += [0] * (POOL_K - len(sc))  # 10개보다 적게 낸 경우(agent) 빈자리는 0점
            ideal = sorted((j['score'] for j in done[qid].values()), reverse=True)[:POOL_K]
            dcg = sum(s / math.log2(r + 1) for r, s in enumerate(sc, 1))
            idcg = sum(s / math.log2(r + 1) for r, s in enumerate(ideal, 1))
            t = qs[qid]['type']
            row = {'rel@10': sum(s == 2 for s in sc) / POOL_K, 'hit@1': sc[0] == 2, 'hit@5': 2 in sc[:5],
                   'ndcg@10': dcg / idcg if idcg else 0,
                   'docs@10': len({chunks[c]['doc_id'] for c in top[:POOL_K] if done[qid][c]['score'] == 2})}
            for k, v in row.items():
                acc[k].append(v)
                acc[f'{t}:{k}'].append(v)
        res[m] = {k: round(sum(v) / len(v), 3) for k, v in acc.items()}
    out = {'usage': usage, 'agreement_with_human_gold': agreement, 'methods': res}
    (CAFE / 'eval' / f'judged_{EVAL}.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(json.dumps(agreement, ensure_ascii=False))
    keys = ['hit@1', 'hit@5', 'rel@10', 'ndcg@10', 'docs@10']
    print('방법 |', ' | '.join(keys))
    for m in METHODS:
        print(m, '|', ' | '.join(str(res[m][k]) for k in keys))
    print('토큰', usage)


if __name__ == '__main__':
    main()
