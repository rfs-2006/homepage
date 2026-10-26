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
MODELS = {'sonnet': 'claude-sonnet-5-5', 'haiku': 'claude-haiku-5-5', 'opus': 'claude-opus-5-5'}
MAX_SEARCH = 5
AXES = ['투자포인트', '탑다운', '리서치깊이', '추정', '밸류에이션', 'Peer케이스', '글']  # rubric.md 축 (밸류에이션은 추천 리포트가 없고 기준만 쓴다, NOTES 14절)
KINDS = ['explain', 'fact', 'feedback', 'cases', 'summary', 'file']  # 질문 유형. 유형마다 검색과 답 형식이 다르다 (answer.py TYPE)
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
- kind: 질문 유형.
  explain: 방법·개념을 설명해 달라 ("DCF 어떻게 해?", "설명해줘", "아무것도 몰라", "처음 해봐", "어디서부터 시작해?", "왜 ~를 써?").
  fact: 용어 뜻이나 특정 문서·회사의 사실 한 가지 ("WACC가 뭐야", "대한항공 목표주가 얼마였어?").
  feedback: 사용자가 쓴 글·모델·생각을 봐 달라 ("내 문장 봐줘", "이거 괜찮아?", 리포트 문단을 붙여 넣은 경우).
  cases: 사례·리포트를 모아 달라 ("예시 알려줘", "~관련 리포트 있어?", "다른 리포트들은 어떻게 했어?").
  summary: 특정 리포트·자료 하나를 요약하거나 그 내용을 정리해 달라 ("산일전기 리포트 요약좀", "대한항공 리포트 무슨 내용이야?",
  "TORM 리포트 투자포인트 뭐였어?", "OCI 리포트 정리해줘").
  file: 리포트 파일(PDF)만 달라는 요청 ("산일전기 리포트 pdf 줘", "대한항공 리포트 원본 받을 수 있어?"). 다른 질문이 같이 있으면 그 질문의 유형으로.
  애매하면 explain.
- want_file: 리포트 파일(PDF)·원본을 받고 싶다는 말이 있으면 true ("pdf", "파일", "원본 줘", "다운로드"). 없으면 false.
- target: summary·file이거나 want_file일 때 그 리포트를 찾을 이름 (회사·자료 이름, 학기를 말했으면 같이. 예: "산일전기", "대한항공 26-2"). 아니면 빈 문자열.
- axes: 리포트의 어느 부분·기준에 관한 질문인지. 여러 개 가능. 해당 없으면 빈 목록.
  투자포인트(주장 자체: 시장과 다른 점, 겹침, 목표주가 연결) / 탑다운(산업에서 기업으로 좁히기) / 리서치깊이(데이터를 직접 찾고 가공) /
  추정(매출·비용 추정) / 밸류에이션 / Peer케이스(비교 기업, 케이스 스터디) / 글(문장·문단·제목·표현).
  feedback이면 무엇을 봐 달라고 했는지로 고른다. "문장 봐줘", "글 어때?"는 글이 투자포인트 섹션이어도 글.
  사용자가 직접 말한 축을 맨 앞에 둔다 ("문장 봐줘" + 투자포인트 문단이면 글, 투자포인트 순서).
  무엇을 볼지 말이 없으면 붙인 글의 섹션에 맞는 내용 축 + 글 (투자포인트 문단이면 투자포인트, 글).
  explain·cases는 리포트의 한 부분을 쓰는 법을 묻는 질문일 때만 그 축 ("투자포인트 어떻게 써?" → 투자포인트). 사실 질문, 용어 뜻, 종목을 사도 되냐는 질문은 빈 목록.
- section: feedback에서 붙인 글이 리포트의 어느 섹션인지 (투자포인트, 산업분석, 기업개요, 실적 추정, 밸류에이션, 리스크 등). 모르면 빈 문자열."""

# 서버(대화)에서만 붙인다. 평가는 한 번 묻고 끝이라 되물으면 채점이 안 된다
ASK_RULE = """
- kind clarify: 답이 회사·업종·상황에 따라 크게 갈리는 코칭 질문인데, 그 정보가 질문과 앞 대화 어디에도 없을 때만.
  예) "밸류에이션 뭘로 해?", "매출 추정 어떻게 시작해?" → 어떤 회사인지 모르면 답의 절반이 쓸모없다.
  clarify가 아닌 것: "DCF 어떻게 해?"처럼 순서가 정해진 방법, 특정 리포트·용어를 묻는 질문, 이미 회사·업종을 말한 질문.
  애매하면 clarify로 하지 않는다. 되묻기는 짜증 나기 쉽다.
- ask_question / ask_options: clarify일 때만. ask_question은 존댓말로, 왜 묻는지 한 줄 + 질문 하나
  (예: "업종에 따라 쓰는 밸류에이션 방법이 달라져요. 어떤 회사를 분석하시나요?").
  ask_options는 신입도 고를 수 있는 쉬운 말로 2~5개, 마지막은 "잘 모르겠어요" (예: "제조업", "인터넷·소프트웨어", "바이오", "은행·증권", "잘 모르겠어요").
  clarify가 아니면 빈 문자열과 빈 목록."""

# 서버에서만. 검색·답변 없이 정해진 문구로 정중하게 돌려보낸다 (답변 비용이 안 들고 하루 질문 수도 안 깎는다)
DECLINE_RULE = """
- decline: 학회 자료로 답할 수 없거나 답할 거리가 없는 질문을 거른다. 해당 없으면 빈 문자열.
  vague: 무엇을 묻는지 알 수 없다 ("이거 뭐임", "그거 어케함", 뜻이 안 통하는 문장, 앞 대화로도 안 풀리는 지시어).
  broad: 아무 조건 없이 뭔가 내놓으라는 요청 ("괜찮은 거 갖고와봐", "아무거나 알려줘", "재밌는 거", "리포트 하나 줘").
  offtopic: 투자·리서치·학회와 무관 (날씨, 연애, 코딩 숙제, 맛집 등).
  stock: 종목 매수·매도·보유 판단이나 종목 추천 ("지금 사도 돼?", "오를 종목 추천", "삼전 팔까?").
  hello: 인사나 잡담만 있는 경우 ("안녕", "ㅎㅇ", "고마워").
  club: 학회 자체에 대한 질문 (가입·지원 자격·모집 일정·면접, 들어오면 하는 일·팀·세미나, 연락처·문의처, 알럼나이 진로, 연혁, SOHKA).
    리포트·밸류에이션 같은 공부 질문이 아니라 R.F.S.라는 단체를 묻는 것. 홈페이지 공개 내용으로 따로 답한다.
  짧아도 뜻이 통하면 거르지 않는다 ("WACC가 뭐야", "PER", "대한항공 리포트 있어?"는 정상 질문). 애매하면 거르지 않는다.
  글·모델을 봐 달라는 요청("내 리포트 문장 좀 봐줄래?")은 글이 아직 없어도 거르지 않는다 (feedback으로 두면 글을 붙여 달라고 한다).
- better: decline일 때만 (club이면 빈 목록). 이 사람이 실제로 궁금했을 법한 것을 학회 자료로 답할 수 있는 구체적인 질문 2~3개로 바꿔 쓴다.
  짧게, 사용자가 그대로 눌러 물을 수 있는 반말 질문체 (예: "항공사 리포트 투자포인트 사례 보여줘", "PER과 EV/EBITDA 언제 써?").
  stock이면 그 회사를 분석하는 방법 질문으로 (예: "삼성전자 밸류에이션은 어떻게 해?"). decline이 아니면 빈 목록."""

AGENT_SYSTEM = CORPUS + """

너는 검색 담당이다. 사용자 질문에 답하는 데 필요한 청크를 찾아라. 답변은 쓰지 않는다.
- search 도구로 찾는다. 질문 표현 그대로보다 리포트에 나올 용어·회사 이름으로 바꿔서 찾는 게 잘 된다.
- 결과를 읽고 부족하면 검색어를 바꿔 다시 찾는다. search는 최대 {max}번.
- "사례 알려줘"류 질문은 서로 다른 리포트의 사례를 여러 개 모은다.
- 방법 질문이면 핵심 개념을 설명한 학회 교육자료(신입생 가이드북, 세미나 자료) 청크도 1~2개 찾아 넣는다.
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


def ask(cl, model=LLM, on_text=None, **kw):
    """on_text가 있으면 스트리밍으로 받으면서 답 글자를 바로 넘긴다 (화면에 쓰는 대로 보이게).
    betas=[...]로 베타 기능(예: 어드바이저)을 더 켤 수 있다."""
    betas = ['server-side-fallback-2026-07-01', *kw.pop('betas', [])]
    if 'haiku' in model:  # Haiku 5.5는 서버 쪽 대체 모델(fallbacks)이 없다
        r = cl.messages.create(model=model, max_tokens=16000, **kw)
    elif on_text:
        # 대체 모델로 넘어가도 같은 스트림에서 이어진다 (이미 받은 글자는 그대로)
        with cl.beta.messages.stream(model=model, max_tokens=16000, betas=betas,
                                     fallbacks='default', **kw) as st:
            for ev in st:
                if ev.type == 'text':
                    on_text(ev.text)
            r = st.get_final_message()
    else:
        # 안전 분류기가 거절하면 서버가 다른 모델로 다시 돌린다 (fallbacks: default)
        r = cl.beta.messages.create(model=model, max_tokens=16000, betas=betas,
                                    fallbacks='default', **kw)
    if r.stop_reason == 'refusal':
        raise RuntimeError(f'거절: {r.stop_details}')
    return r


class AgentSearch:
    def __init__(self, cafe, retriever=None, model=LLM):
        self.r = retriever or Retriever(cafe)
        self.cl = client()
        self.model = model
        self.id2i = {c['chunk_id']: i for i, c in enumerate(self.r.chunks)}
        self.usage = {'input': 0, 'output': 0, 'cache_read': 0, 'cache_write': 0, 'web_search': 0}
        self.log = []

    def _count(self, resp):
        u = resp.usage
        self.usage['input'] += u.input_tokens
        self.usage['output'] += u.output_tokens
        self.usage['cache_read'] += u.cache_read_input_tokens or 0
        self.usage['cache_write'] += u.cache_creation_input_tokens or 0
        self.usage['web_search'] += getattr(getattr(u, 'server_tool_use', None), 'web_search_requests', 0) or 0

    def rewrite(self, question, context='', allow_ask=False, allow_decline=False):
        """검색어 3~5개, 질문 유형(KINDS, allow_ask면 clarify도), 앞 대화 없이 통하는 질문, 되물을 질문, 축 목록, 섹션, 요약할 자료 이름을 돌려준다.
        context는 여러 턴 대화의 앞선 대화. 되물을 질문은 clarify일 때만 {'question', 'options'}, 아니면 None.
        allow_decline이면 거를 질문일 때 kind가 decline:<이유>이고, 되물을 질문 자리에 {'better': 바꿔 쓴 질문들}을 준다.
        축(axes)은 rubric.md의 평가 축 목록 (축별 추천 리포트와 피드백 기준을 고를 때 쓴다), section은 피드백할 글의 섹션."""
        user = f'앞선 대화:\n{context}\n\n마지막 질문: {question}' if context else question
        props = {'queries': {'type': 'array', 'items': {'type': 'string'}},
                 'kind': {'type': 'string', 'enum': KINDS + (['clarify'] if allow_ask else [])},
                 'standalone': {'type': 'string'},
                 'axes': {'type': 'array', 'items': {'type': 'string', 'enum': AXES}},
                 'section': {'type': 'string'},
                 'target': {'type': 'string'},
                 'want_file': {'type': 'boolean'}}
        if allow_ask:
            props |= {'ask_question': {'type': 'string'}, 'ask_options': {'type': 'array', 'items': {'type': 'string'}}}
        if allow_decline:
            props |= {'decline': {'type': 'string', 'enum': ['', 'vague', 'broad', 'offtopic', 'stock', 'hello', 'club']},
                      'better': {'type': 'array', 'items': {'type': 'string'}}}
        resp = ask(self.cl, model=self.model, system=MQ_SYSTEM + (ASK_RULE if allow_ask else '') + (DECLINE_RULE if allow_decline else ''),
                   output_config={'effort': 'low', 'format': {'type': 'json_schema', 'schema': {
                       'type': 'object', 'properties': props, 'required': list(props), 'additionalProperties': False}}},
                   messages=[{'role': 'user', 'content': user}])
        self._count(resp)
        out = json.loads(next(b.text for b in resp.content if b.type == 'text'))
        if out.get('decline'):
            return [], 'decline:' + out['decline'], out['standalone'] or question, {'better': out['better'][:3]}, [], '', '', False
        ask_ = {'question': out['ask_question'], 'options': out['ask_options'][:5]} \
            if out['kind'] == 'clarify' and out.get('ask_question') else None
        kind = 'explain' if out['kind'] == 'clarify' and not ask_ else out['kind']
        axes = list(dict.fromkeys(out['axes']))
        return out['queries'][:5], kind, out['standalone'] or question, ask_, axes, out['section'], out.get('target', ''), \
            bool(out.get('want_file')) or kind == 'file'

    def multiquery(self, question, rerank_top=100, queries=None, log=None):
        """log: 검색 기록을 남길 목록 (서버는 대화마다 따로 준다. 없으면 self.log)"""
        qs = queries if queries is not None else self.rewrite(question)[0]
        (self.log if log is None else log).append({'question': question, 'queries': qs})
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

    def agent(self, question, log=None):
        msgs = [{'role': 'user', 'content': question}]
        found, picked, n = [], None, 0
        trace = {'question': question, 'queries': []}
        for _ in range(MAX_SEARCH + 2):
            resp = ask(self.cl, model=self.model, system=AGENT_SYSTEM.format(max=MAX_SEARCH), tools=TOOLS, cache_control={'type': 'ephemeral'},
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
        (self.log if log is None else log).append(trace)
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
