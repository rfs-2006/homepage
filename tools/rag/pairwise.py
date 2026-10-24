"""두 답변 비교: 같은 질문에 대한 두 방법의 답을 Opus가 나란히 보고 어느 쪽이 학회원에게 더 도움이 되는지 고른다.

  python3 -I tools/rag/pairwise.py /home/user/rfs-cafe-data answers_v2_basic answers_v2_routed
출력  eval/pairwise_<A>__<B>.json

- 개별 채점(eval_answers.py)은 "충분히 답했나"가 41문항 모두 2점이라 방법 간 차이가 안 보인다. 나란히 놓고 고르게 한다.
- 위치 편향(먼저 나온 답을 고르는 경향)을 막으려고 A/B 순서를 바꿔 두 번 묻고, 두 번 다 같은 쪽을 고를 때만 승으로 센다.
- 근거 없는 주장은 개별 채점 결과(unsupported, 틀린 일반 설명 general_wrong)를 같이 보여준다. 채점자가 자료를 다시 읽지 않아도 정확성을 반영하게.
- 13절부터 기준에 "읽고 이해해서 바로 따라 할 수 있나"를 넣었다. 이전 비교(11·12절)와 기준이 달라 숫자를 섞지 않는다.
"""
import json
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from agent_search import JUDGE_LLM, ask, client  # noqa: E402

CAFE = Path(sys.argv[1])
A, B = sys.argv[2], sys.argv[3]

SYSTEM = """너는 투자학회 RFS 챗봇의 답변 두 개를 비교하는 채점자다. 질문한 학회원에게 어느 답이 더 도움이 되는지 고른다.
기준 (중요한 순서)
1. 정확성: 자료에 근거 없는 주장이 적은 쪽. 각 답 아래에 별도 검사에서 찾은 '근거 없는 주장'이 적혀 있다.
2. 질문에 맞는 내용: 질문이 묻는 것(사실, 방법, 사례 여러 개, 예시)을 직접 다루는 쪽.
3. 이해·따라 하기: 처음 해 보는 학회원이 읽고 무엇부터 어떻게 할지 이해해서 바로 따라 할 수 있는 쪽.
4. 쓸모: 학회 리포트의 구체적 사례(회사·학기·숫자·방법)가 근거로 붙어 있는 쪽.
길이 자체는 기준이 아니다. 차이가 거의 없으면 tie."""

SCHEMA = {'type': 'object', 'properties': {'winner': {'type': 'string', 'enum': ['1', '2', 'tie']},
                                           'reason': {'type': 'string'}},
          'required': ['winner', 'reason'], 'additionalProperties': False}


def fmt(r):
    un = r['judge']['unsupported'] + [f'(틀린 일반 설명) {x}' for x in r['judge'].get('general_wrong', [])]
    return r['answer'] + '\n\n(근거 없는 주장: ' + ('; '.join(un) if un else '없음') + ')'


def compare(cl, q, first, second):
    resp = ask(cl, model=JUDGE_LLM, system=SYSTEM,
               output_config={'effort': 'low', 'format': {'type': 'json_schema', 'schema': SCHEMA}},
               messages=[{'role': 'user', 'content': f"질문: {q}\n\n[답 1]\n{fmt(first)}\n\n[답 2]\n{fmt(second)}"}])
    return json.loads(next(b.text for b in resp.content if b.type == 'text')), resp.usage


def main():
    load = lambda n: {json.loads(l)['id']: json.loads(l) for l in open(CAFE / 'eval' / f'{n}.jsonl')}
    ra, rb = load(A), load(B)
    ids = [i for i in ra if i in rb]
    cl = client()

    def run(i):
        j1, u1 = compare(cl, ra[i]['question'], ra[i], rb[i])  # 1=A
        j2, u2 = compare(cl, ra[i]['question'], rb[i], ra[i])  # 1=B
        v1 = {'1': 'A', '2': 'B', 'tie': 'tie'}[j1['winner']]
        v2 = {'1': 'B', '2': 'A', 'tie': 'tie'}[j2['winner']]
        win = v1 if v1 == v2 else 'tie'  # 순서를 바꿔도 같은 쪽일 때만 승
        return {'id': i, 'type': ra[i]['type'], 'kind': ra[i].get('kind'), 'win': win, 'votes': [v1, v2], 'reasons': [j1['reason'], j2['reason']],
                'tokens': u1.input_tokens + u2.input_tokens}

    with ThreadPoolExecutor(4) as ex:
        rows = list(ex.map(run, ids))
    by, by_kind = {}, {}
    for r in rows:
        by.setdefault(r['type'], Counter())[r['win']] += 1
        by_kind.setdefault(r['kind'], Counter())[r['win']] += 1
    total = Counter(r['win'] for r in rows)
    out = {'A': A, 'B': B, 'total': dict(total), 'by_type': {t: dict(c) for t, c in by.items()},
           'by_kind': {t: dict(c) for t, c in by_kind.items()},
           'position_flips': sum(r['votes'][0] != r['votes'][1] for r in rows), 'rows': rows}
    (CAFE / 'eval' / f'pairwise_{A}__{B}.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(json.dumps({k: v for k, v in out.items() if k != 'rows'}, ensure_ascii=False, indent=1))
    for r in rows:
        if r['win'] != 'tie':
            print(r['id'], r['type'], r['win'], '|', r['reasons'][0][:120])


if __name__ == '__main__':
    main()
