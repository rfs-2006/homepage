"""에이전트형 검색: 질문 단어와 리포트 단어가 다를 때 Claude가 검색어를 바꿔서 찾는다.

  python3 -I tools/rag/agent_search.py /home/user/rfs-cafe-data "적자인데 빠르게 크는 SaaS 기업은 어떻게 밸류에이션해?"
키  Claude API 키는 환경변수 RAG_ANTHROPIC_API_KEY (NOTES.md 작업 규칙).

두 방식
- multiquery: Claude가 질문을 리포트에 나올 법한 검색어 3~5개로 바꾼다 (한 번 호출).
  원 질문 + 검색어마다 하이브리드 검색 → RRF로 합침 → 원 질문으로 리랭크.
  예) "적자 SaaS 밸류에이션" → "PSR 밸류에이션", "ARR 성장률 멀티플", "CrowdStrike 목표주가"
- agent: Claude가 search 도구를 직접 여러 번 부르고(최대 MAX_SEARCH회), 결과를 읽고 다시 찾고,
  끝에 관련 청크를 골라 finish로 낸다. 비용·시간이 더 들지만 결과를 보고 검색어를 고칠 수 있다.
"""
import json
import os
import sys
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).parent))
from retriever import Retriever, rrf  # noqa: E402

# 챗봇(검색어 재작성·agent 검색·답변)은 Sonnet 5.5, 채점(judge.py, eval_answers.py)은 Opus 5.5.
# 채점 모델을 챗봇과 다르게 두면 자기가 낸 답을 후하게 보는 문제도 줄어든다.
LLM = 'claude-sonnet-5-5'
JUDGE_LLM = 'claude-opus-5-5'
MAX_SEARCH = 5
SNIPPET = 350

CORPUS = """자료: 중앙대 투자학회 RFS의 학회 자료 (2019~2026). 기업·산업 리포트, 세미나·교육 자료, 엑셀 밸류에이션 모델, 스터디, 투자제안서.
검색 단위는 청크이고, 청크 앞에 '제목 | 학기 | 종류 | 섹션 | 페이지' 머리글이 붙어 있다. 검색은 키워드(BM25)와 의미(임베딩)를 섞어 쓴다.
리포트는 증권사 리포트 문체다: 투자포인트, 밸류에이션(PER·PBR·EV/EBITDA·PSR·DCF), 실적 추정(Q×P, CAPA, 가동률), Peer Group, WACC 같은 용어를 쓴다."""

MQ_SYSTEM = CORPUS + """

사용자 질문을 이 자료에서 찾기 좋은 검색어로 바꿔라.
- 질문의 일상 표현을 리포트에 실제로 나올 용어로 바꾼다 (예: '적자인데 빠르게 크는' → 'PSR', '매출 성장률', 'ARR').
- 해당하는 회사·업종 이름을 알면 넣는다 (예: 항공사 → 대한항공, 저비용항공사).
- 검색어마다 다른 각도로. 3~5개, 각각 짧게 (2~8단어).
- 앞선 대화가 같이 오면, 마지막 질문이 무엇을 가리키는지 앞 대화로 풀어서 검색어를 만든다 (예: "LCC면?" → "저비용항공사 밸류에이션").
- standalone: 마지막 질문을 앞 대화 없이도 뜻이 통하는 한 문장으로 다시 쓴다. 앞선 대화가 없으면 질문 그대로.
- kind: 특정 문서·회사의 사실이나 용어 뜻을 묻는 질문은 fact, 방법·사례·예시를 넓게 모아야 하는 질문("어떻게 해?", "예시 알려줘",
  "목차는 보통", "~관련 리포트 있어?")은 open."""

AGENT_SYSTEM = CORPUS + """

너는 검색 담당이다. 사용자 질문에 답하는 데 필요한 청크를 찾아라. 답변은 쓰지 않는다.
- search 도구로 찾는다. 질문 표현 그대로보다 리포트에 나올 용어·회사 이름으로 바꿔서 찾는 게 잘 된다.
- 결과를 읽고 부족하면 검색어를 바꿔 다시 찾는다. search는 최대 {max}번.
- "사례 알려줘"류 질문은 서로 다른 리포트의 사례를 여러 개 모은다.
- 다 찾았으면 finish 도구에 관련 있는 chunk_id를 관련 높은 순서로 넣는다 (최대 20개). 질문에 대한 방법·근거·사례가 청크 안에 직접 있는 것만.
  관련 청크가 없으면 빈 목록을 낸다."""

TOOLS = [
    {'name': 'search', 'description': '학회 자료에서 청크를 검색한다. 상위 8개의 chunk_id, 머리글, 앞부분을 돌려준다.',
     'strict': True,
     'input_schema': {'type': 'object', 'properties': {'query': {'type': 'string', 'description': '검색어'}},
                      'required': ['query'], 'additionalProperties': False}},
    {'name': 'finish', 'description': '검색을 끝내고 관련 청크를 관련 높은 순서로 낸다.',
     'strict': True,
     'input_schema': {'type': 'object', 'properties': {'chunk_ids': {'type': 'array', 'items': {'type': 'string'}}},
                      'required': ['chunk_ids'], 'additionalProperties': False}},
]


def client():
    # 세션 환경의 ANTHROPIC_BASE_URL이 다른 곳을 가리킬 수 있어서 주소를 고정한다
    return anthropic.Anthropic(api_key=os.environ['RAG_ANTHROPIC_API_KEY'], base_url='https://api.anthropic.com')


def ask(cl, model=LLM, **kw):
    # 안전 분류기가 거절하면 서버가 다른 모델로 다시 돌린다 (fallbacks: default)
    r = cl.beta.messages.create(model=model, max_tokens=16000, betas=['server-side-fallback-2026-07-01'],
                                fallbacks='default', **kw)
    if r.stop_reason == 'refusal':
        raise RuntimeError(f'거절: {r.stop_details}')
    return r


class AgentSearch:
    def __init__(self, cafe, retriever=None):
        self.r = retriever or Retriever(cafe)
        self.cl = client()
        self.id2i = {c['chunk_id']: i for i, c in enumerate(self.r.chunks)}
        self.usage = {'input': 0, 'output': 0, 'cache_read': 0, 'cache_write': 0}
        self.log = []

    def _count(self, resp):
        u = resp.usage
        self.usage['input'] += u.input_tokens
        self.usage['output'] += u.output_tokens
        self.usage['cache_read'] += u.cache_read_input_tokens or 0
        self.usage['cache_write'] += u.cache_creation_input_tokens or 0

    def rewrite(self, question, context=''):
        """검색어 3~5개, 질문 종류(fact/open), 앞 대화 없이 통하는 질문을 돌려준다. context는 여러 턴 대화의 앞선 대화."""
        user = f'앞선 대화:\n{context}\n\n마지막 질문: {question}' if context else question
        resp = ask(self.cl, system=MQ_SYSTEM, output_config={'effort': 'low', 'format': {'type': 'json_schema', 'schema': {
            'type': 'object', 'properties': {'queries': {'type': 'array', 'items': {'type': 'string'}},
                                             'kind': {'type': 'string', 'enum': ['fact', 'open']},
                                             'standalone': {'type': 'string'}},
            'required': ['queries', 'kind', 'standalone'], 'additionalProperties': False}}},
            messages=[{'role': 'user', 'content': user}])
        self._count(resp)
        out = json.loads(next(b.text for b in resp.content if b.type == 'text'))
        return out['queries'][:5], out['kind'], out['standalone'] or question

    def multiquery(self, question, rerank_top=100, queries=None):
        qs = queries if queries is not None else self.rewrite(question)[0]
        self.log.append({'question': question, 'queries': qs})
        self.r.embed_queries([question] + qs)
        fused = rrf(*[self.r.hybrid(q) for q in [question] + qs])
        return self.r.rerank(question, fused, top=rerank_top)

    def _search_tool(self, query):
        res = self.r.rerank(query, self.r.hybrid(query), top=30)[:8]
        out = []
        for i in res:
            c = self.r.chunks[i]
            out.append(f"[{c['chunk_id']}] {c['header']}\n{c['text'][:SNIPPET]}")
        return res, '\n\n'.join(out)

    def agent(self, question):
        msgs = [{'role': 'user', 'content': question}]
        found, picked, n = [], None, 0
        trace = {'question': question, 'queries': []}
        for _ in range(MAX_SEARCH + 2):
            resp = ask(self.cl, system=AGENT_SYSTEM.format(max=MAX_SEARCH), tools=TOOLS, cache_control={'type': 'ephemeral'},
                       output_config={'effort': 'medium'}, messages=msgs)
            self._count(resp)
            msgs.append({'role': 'assistant', 'content': resp.content})
            if resp.stop_reason != 'tool_use':
                break
            results = []
            for b in resp.content:
                if b.type != 'tool_use':
                    continue
                if b.name == 'finish':
                    picked = [x for x in b.input['chunk_ids'] if x in self.id2i]
                    results.append({'type': 'tool_result', 'tool_use_id': b.id, 'content': '받음'})
                elif n >= MAX_SEARCH:
                    results.append({'type': 'tool_result', 'tool_use_id': b.id, 'is_error': True,
                                    'content': f'검색 횟수({MAX_SEARCH}) 초과. finish로 마무리해라.'})
                else:
                    n += 1
                    trace['queries'].append(b.input['query'])
                    res, text = self._search_tool(b.input['query'])
                    found.append(res)
                    results.append({'type': 'tool_result', 'tool_use_id': b.id, 'content': text or '결과 없음'})
            if picked is not None:
                break
            msgs.append({'role': 'user', 'content': results})
        trace['picked'] = picked
        self.log.append(trace)
        # 최종 순위: Claude가 고른 청크 → 나머지는 찾은 것 전부를 원 질문으로 리랭크
        head = [self.id2i[x] for x in dict.fromkeys(picked or [])]
        rest = [i for i in self.r.rerank(question, rrf(*found), top=50) if i not in set(head)] if found else []
        return head + rest


if __name__ == '__main__':
    cafe, q = sys.argv[1], sys.argv[2]
    mode = sys.argv[3] if len(sys.argv) > 3 else 'agent'
    s = AgentSearch(cafe)
    top = s.multiquery(q) if mode == 'multiquery' else s.agent(q)
    print(json.dumps(s.log, ensure_ascii=False, indent=1))
    for i in top[:10]:
        print(' ', s.r.chunks[i]['header'])
    print('토큰', s.usage)
