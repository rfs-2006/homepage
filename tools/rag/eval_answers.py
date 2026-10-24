"""답변 평가: 평가셋 전 문항에 answer.py로 답을 만들고 채점한다.

  python3 -I tools/rag/eval_answers.py /home/user/rfs-cafe-data v2 routed [rejudge]
  python3 -I tools/rag/eval_answers.py /home/user/rfs-cafe-data v2 given:routed@haiku-sonnet
방법  routed(질문 종류에 따라 multiquery / agent) | basic(항상 multiquery). 챗봇은 Sonnet 5.5, 채점은 Opus 5.5.
      given:<기존 답 파일> — 검색하지 않고 그 답이 받은 청크(shown)를 그대로 넣어 지금 프롬프트로 다시 답한다.
      검색을 고정하고 프롬프트만 바꿔 비교할 때 쓴다 (13절). 추가 검색도 없다. 출력은 answers_<v>_<기존>_p2.jsonl
출력  eval/answers_<v>_<방법>.jsonl (답변·출처·채점, 이어하기용), eval/answers_<v>_<방법>_summary.json
      (eval/answers_v2.jsonl은 Opus 5.5로 만든 처음 basic 답변)

채점
- 자동
  - must_include: 사실·방법 문항에 사람이 적어둔 핵심어(예: "1.2배", "39,500")가 답에 들어 있는 비율
  - cited: 출처가 하나 이상 달린 답 비율 (거절 문항 제외)
- Claude 채점 (답을 만든 대화와 따로, 답에 쓰인 자료 원문만 보고)
  - 자료 밖 내용을 두 가지로 나눠 받는다 (13절부터).
    - unsupported: 학회 자료 주장(숫자, 회사·리포트 이름, "학회 리포트는 이렇게 했다") 중 자료에 없는 것
    - general: 교과서 수준 일반 개념 설명(용어 뜻, 방법 순서, 공식). 근거 없는 주장으로 세지 않는다
    - general_wrong: general 중 틀렸거나 오해를 부를 설명
  - grounded: unsupported와 general_wrong이 모두 없는 답
  - answered: 질문에 실제로 답했는가 (0 못 함 / 1 일부 / 2 충분)
  - 거절 문항(자료에 없음·투자 조언): 지어내지 않고, 없다고 말하거나 조언을 거절했는가 (proper_refusal)
"""
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from agent_search import JUDGE_LLM, MODELS, ask  # noqa: E402
from answer import GRADE, Answerer  # noqa: E402

CAFE = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/rfs-cafe-data')
EVAL = sys.argv[2] if len(sys.argv) > 2 else 'v2'
# 방법 뒤에 '@검색모델/답변모델'로 Claude 모델을 고른다 (예: routed@haiku/haiku, routed@haiku/sonnet). 없으면 둘 다 sonnet
MODE = sys.argv[3] if len(sys.argv) > 3 else 'routed'
GIVEN = MODE.removeprefix('given:') if MODE.startswith('given:') else None
BASE, _, MS = ('routed' if GIVEN else MODE).partition('@')
SEARCH_M, _, ANSWER_M = (MS or 'sonnet/sonnet').partition('/')
REJUDGE = len(sys.argv) > 4 and sys.argv[4] == 'rejudge'  # 답변은 그대로 두고 채점만 다시 (이전 채점은 judge_old에 둔다)
OUT = f"{GIVEN}_p2" if GIVEN else MODE.replace('/', '-')

JUDGE = """너는 RAG 챗봇 답변 채점자다. 질문, 챗봇이 받은 학회 자료(검색 결과), 챗봇의 답을 보고 채점한다.
답에서 자료에 없는 내용을 찾아 두 가지로 나눈다.
- unsupported: 학회 자료 주장인데 자료 어디에도 근거가 없는 것. 숫자, 회사·리포트 이름, 학기, "학회 리포트(모델)는 이렇게 했다",
  자료 내용을 넘어선 사실 주장. 그대로 옮겨 적는다.
- general: 자료에는 없지만 재무·회계·산업의 교과서 수준 일반 개념 설명(용어 뜻, 방법의 순서, 공식, 왜 그렇게 하는지).
  근거 없는 주장이 아니다. 주요한 것만 짧게 옮겨 적는다. 구체적인 숫자(업종 평균, 시장 수치 등)가 들어가면 general이 아니라 unsupported.
- general_wrong: general 중 틀렸거나 학회원이 오해할 만한 설명. 없으면 빈 목록.
일반적인 연결 문장, 자료 내용을 합리적으로 요약·종합한 것, 사용자에게 되묻는 질문은 어디에도 넣지 않는다.
- answered: 0 질문에 답하지 못함 / 1 일부만 답함 / 2 충분히 답함. 자료에 답이 없는 질문에서 "없다"고 정확히 말했으면 2.
- proper_refusal: 자료에 답이 없거나 투자 조언(사라/팔라)을 요구하는 질문일 때, 지어내지 않고 없다고 말하거나 조언을 거절했으면 true.
  그런 질문이 아니면 null.
- note: 한 문장 총평."""

SCHEMA = {'type': 'object', 'properties': {
    'unsupported': {'type': 'array', 'items': {'type': 'string'}},
    'general': {'type': 'array', 'items': {'type': 'string'}},
    'general_wrong': {'type': 'array', 'items': {'type': 'string'}},
    'answered': {'type': 'integer', 'enum': [0, 1, 2]},
    'proper_refusal': {'type': ['boolean', 'null']},
    'note': {'type': 'string'}},
    'required': ['unsupported', 'general', 'general_wrong', 'answered', 'proper_refusal', 'note'], 'additionalProperties': False}


def ok(j):
    return not j['unsupported'] and not j.get('general_wrong')


def judge(cl, q, out, chunks):
    # 챗봇이 받은 것과 같은 제목(등급 포함)을 보여준다. 빠뜨리면 "A등급" 같은 말이 근거 없는 주장으로 잡힌다
    ctx = '\n\n'.join(f"[{c}] {chunks[c]['header']} [{GRADE[chunks[c]['grade']]}]\n{chunks[c]['text']}" for c in out['shown'])
    resp = ask(cl, model=JUDGE_LLM, system=JUDGE, output_config={'effort': 'low', 'format': {'type': 'json_schema', 'schema': SCHEMA}},
               messages=[{'role': 'user', 'content': f"질문: {q['question']}\n\n챗봇이 받은 자료:\n\n{ctx}\n\n챗봇의 답:\n{out['answer']}"}])
    return json.loads(next(b.text for b in resp.content if b.type == 'text')), resp.usage


def main():
    a = Answerer(CAFE, mode=BASE, search_model=MODELS[SEARCH_M], answer_model=MODELS[ANSWER_M or SEARCH_M])
    chunks = {c['chunk_id']: c for c in a.chunks}
    qs = [json.loads(l) for l in open(CAFE / 'eval' / f'eval_{EVAL}.jsonl')]
    path = CAFE / 'eval' / f"answers_{EVAL}_{OUT}.jsonl"
    base = {}
    if GIVEN:  # 기존 답이 받은 청크와 질문 종류를 그대로 쓴다
        base = {r['id']: r for r in map(json.loads, open(CAFE / 'eval' / f'answers_{EVAL}_{GIVEN}.jsonl'))}
        id2i = {c['chunk_id']: i for i, c in enumerate(a.chunks)}
        qs = [q for q in qs if q['id'] in base]
    done = {}
    if path.exists():
        for l in open(path):
            r = json.loads(l)
            done[r['id']] = r
    jtok = [0, 0]
    if REJUDGE:
        def rj(r):
            j, u = judge(a.s.cl, {'question': r['question']}, r, chunks)
            return {**r, 'judge': j, 'judge_old': r['judge']}, u
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
            if GIVEN:
                b = base[q['id']]
                out = a.answer(q['question'], given=[id2i[c] for c in b['shown']])
                out['kind'] = b.get('kind')
            else:
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
        t['grounded'] += ok(r['judge'])
    summary = {
        'n': len(rows),
        'must_include': round(sum(len(r['must_hit']) / len(r['must']) for r in must) / len(must), 3) if must else None,
        'cited': round(sum(bool(r['sources']) for r in pos) / len(pos), 3),
        'grounded': round(sum(ok(r['judge']) for r in rows) / len(rows), 3),
        'unsupported_claims': sum(len(r['judge']['unsupported']) for r in rows),
        'general_claims': sum(len(r['judge'].get('general', [])) for r in rows),
        'general_wrong': sum(len(r['judge'].get('general_wrong', [])) for r in rows),
        'answered2': round(sum(r['judge']['answered'] == 2 for r in pos) / len(pos), 3),
        'proper_refusal': f"{sum(bool(r['judge']['proper_refusal']) for r in neg)}/{len(neg)}",
        'avg_extra_searches': round(sum(len(r['searches']) for r in rows) / len(rows), 2),
        'kind_open': sum(r.get('kind') == 'open' for r in rows),
        'by_type': by_type,
        'answer_tokens': a.s.usage, 'judge_tokens': {'input': jtok[0], 'output': jtok[1]},
    }
    (CAFE / 'eval' / f"answers_{EVAL}_{OUT}_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1))
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    print('근거 없는 주장이 나온 답:')
    for r in rows:
        if not ok(r['judge']):
            print(' ', r['id'], r['judge']['unsupported'][:3], r['judge'].get('general_wrong', [])[:2])


if __name__ == '__main__':
    main()
