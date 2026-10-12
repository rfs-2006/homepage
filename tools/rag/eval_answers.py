"""답변 평가: 평가셋 전 문항에 answer.py로 답을 만들고 채점한다.

  python3 -I tools/rag/eval_answers.py /home/user/rfs-cafe-data v2 routed [rejudge]
방법  routed(질문 종류에 따라 multiquery / agent) | basic(항상 multiquery). 챗봇은 Sonnet 5.5, 채점은 Opus 5.5.
출력  eval/answers_<v>_<방법>.jsonl (답변·출처·채점, 이어하기용), eval/answers_<v>_<방법>_summary.json
      (eval/answers_v2.jsonl은 Opus 5.5로 만든 처음 basic 답변)

채점
- 자동
  - must_include: 사실·방법 문항에 사람이 적어둔 핵심어(예: "1.2배", "39,500")가 답에 들어 있는 비율
  - cited: 출처가 하나 이상 달린 답 비율 (거절 문항 제외)
- Claude 채점 (답을 만든 대화와 따로, 답에 쓰인 자료 원문만 보고)
  - grounded: 답의 숫자·이름·방법 주장이 보여준 자료에 모두 있는가. 없는 주장은 목록으로 받는다.
  - answered: 질문에 실제로 답했는가 (0 못 함 / 1 일부 / 2 충분)
  - 거절 문항(자료에 없음·투자 조언): 지어내지 않고, 없다고 말하거나 조언을 거절했는가 (proper_refusal)
"""
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from agent_search import JUDGE_LLM, ask  # noqa: E402
from answer import GRADE, Answerer  # noqa: E402

CAFE = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/rfs-cafe-data')
EVAL = sys.argv[2] if len(sys.argv) > 2 else 'v2'
MODE = sys.argv[3] if len(sys.argv) > 3 else 'routed'
REJUDGE = len(sys.argv) > 4 and sys.argv[4] == 'rejudge'  # 답변은 그대로 두고 채점만 다시

JUDGE = """너는 RAG 챗봇 답변 채점자다. 질문, 챗봇이 받은 학회 자료(검색 결과), 챗봇의 답을 보고 채점한다.
- unsupported: 답에 나온 숫자·회사명·방법·사실 주장 중 자료 어디에도 근거가 없는 것을 그대로 옮겨 적는다.
  일반적인 연결 문장, 자료 내용을 합리적으로 요약·종합한 것, 사용자에게 되묻는 질문은 넣지 않는다. 없으면 빈 목록.
- answered: 0 질문에 답하지 못함 / 1 일부만 답함 / 2 충분히 답함. 자료에 답이 없는 질문에서 "없다"고 정확히 말했으면 2.
- proper_refusal: 자료에 답이 없거나 투자 조언(사라/팔라)을 요구하는 질문일 때, 지어내지 않고 없다고 말하거나 조언을 거절했으면 true.
  그런 질문이 아니면 null.
- note: 한 문장 총평."""

SCHEMA = {'type': 'object', 'properties': {
    'unsupported': {'type': 'array', 'items': {'type': 'string'}},
    'answered': {'type': 'integer', 'enum': [0, 1, 2]},
    'proper_refusal': {'type': ['boolean', 'null']},
    'note': {'type': 'string'}},
    'required': ['unsupported', 'answered', 'proper_refusal', 'note'], 'additionalProperties': False}


def judge(cl, q, out, chunks):
    # 챗봇이 받은 것과 같은 제목(등급 포함)을 보여준다. 빠뜨리면 "A등급" 같은 말이 근거 없는 주장으로 잡힌다
    ctx = '\n\n'.join(f"[{c}] {chunks[c]['header']} [{GRADE[chunks[c]['grade']]}]\n{chunks[c]['text']}" for c in out['shown'])
    resp = ask(cl, model=JUDGE_LLM, system=JUDGE, output_config={'effort': 'low', 'format': {'type': 'json_schema', 'schema': SCHEMA}},
               messages=[{'role': 'user', 'content': f"질문: {q['question']}\n\n챗봇이 받은 자료:\n\n{ctx}\n\n챗봇의 답:\n{out['answer']}"}])
    return json.loads(next(b.text for b in resp.content if b.type == 'text')), resp.usage


def main():
    a = Answerer(CAFE, mode=MODE)
    chunks = {c['chunk_id']: c for c in a.chunks}
    qs = [json.loads(l) for l in open(CAFE / 'eval' / f'eval_{EVAL}.jsonl')]
    path = CAFE / 'eval' / f'answers_{EVAL}_{MODE}.jsonl'
    done = {}
    if path.exists():
        for l in open(path):
            r = json.loads(l)
            done[r['id']] = r
    jtok = [0, 0]
    if REJUDGE:
        def rj(r):
            j, u = judge(a.s.cl, {'question': r['question']}, r, chunks)
            return {**r, 'judge': j}, u
        with ThreadPoolExecutor(4) as ex:
            for r, u in ex.map(rj, list(done.values())):
                done[r['id']] = r
                jtok[0] += u.input_tokens
                jtok[1] += u.output_tokens
        with open(path, 'w') as f:
            for q in qs:
                if q['id'] in done:
                    f.write(json.dumps(done[q['id']], ensure_ascii=False) + '\n')
    todo = [q for q in qs if q['id'] not in done]
    print(f'문항 {len(qs)}, 남은 {len(todo)}', flush=True)

    def run(q):
        try:
            out = a.answer(q['question'])
            j, u = judge(a.s.cl, q, out, chunks)
        except Exception as e:  # 한 문항이 실패해도 계속, 다시 실행하면 빠진 것만
            print('실패', q['id'], e, flush=True)
            return None
        jtok[0] += u.input_tokens
        jtok[1] += u.output_tokens
        must = q.get('must_include') or []
        return {'id': q['id'], 'type': q['type'], 'question': q['question'], **out,
                'must_hit': [m for m in must if m in out['answer']], 'must': must, 'judge': j}

    with ThreadPoolExecutor(3) as ex, open(path, 'a') as f:
        for r in ex.map(run, todo):
            if r:
                done[r['id']] = r
                f.write(json.dumps(r, ensure_ascii=False) + '\n')
                f.flush()
                print(r['id'], r['judge']['answered'], len(r['judge']['unsupported']), len(r['sources']), flush=True)

    rows = [done[q['id']] for q in qs if q['id'] in done]
    neg = [r for r in rows if r['type'] == 'negative']
    pos = [r for r in rows if r['type'] != 'negative']
    must = [r for r in pos if r['must']]
    by_type = {}
    for r in rows:
        t = by_type.setdefault(r['type'], {'n': 0, 'answered2': 0, 'grounded': 0})
        t['n'] += 1
        t['answered2'] += r['judge']['answered'] == 2
        t['grounded'] += not r['judge']['unsupported']
    summary = {
        'n': len(rows),
        'must_include': round(sum(len(r['must_hit']) / len(r['must']) for r in must) / len(must), 3) if must else None,
        'cited': round(sum(bool(r['sources']) for r in pos) / len(pos), 3),
        'grounded': round(sum(not r['judge']['unsupported'] for r in rows) / len(rows), 3),
        'unsupported_claims': sum(len(r['judge']['unsupported']) for r in rows),
        'answered2': round(sum(r['judge']['answered'] == 2 for r in pos) / len(pos), 3),
        'proper_refusal': f"{sum(bool(r['judge']['proper_refusal']) for r in neg)}/{len(neg)}",
        'avg_extra_searches': round(sum(len(r['searches']) for r in rows) / len(rows), 2),
        'kind_open': sum(r.get('kind') == 'open' for r in rows),
        'by_type': by_type,
        'answer_tokens': a.s.usage, 'judge_tokens': {'input': jtok[0], 'output': jtok[1]},
    }
    (CAFE / 'eval' / f'answers_{EVAL}_{MODE}_summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1))
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    print('근거 없는 주장이 나온 답:')
    for r in rows:
        if r['judge']['unsupported']:
            print(' ', r['id'], r['judge']['unsupported'][:3])


if __name__ == '__main__':
    main()
