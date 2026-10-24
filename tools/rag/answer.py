"""RFS 챗봇 답변: 학회 자료를 찾아 출처를 단 답을 쓴다. 여러 턴 대화를 이어간다.

  python3 -I tools/rag/answer.py /home/user/rfs-cafe-data "항공사 밸류에이션은 뭘로 하는 게 좋아?" ["FSC야"] ...
  (질문을 여러 개 주면 한 대화로 이어서 묻는다)
키  Claude API 키는 환경변수 RAG_ANTHROPIC_API_KEY.

흐름
1. Claude가 질문을 검색어 3~5개로 바꾸고 종류를 정한다 (fact / open). 여러 턴이면 앞 대화를 보고 질문을 혼자 통하게 다시 쓴다.
   - fact: multiquery(검색어마다 하이브리드 → 합쳐서 리랭크) 상위 PREFETCH개를 넣는다.
   - open(방법·사례·예시): agent 검색(검색어를 바꿔 가며 최대 5번 찾고 골라냄)이 고른 청크를 넣는다.
     9절 평가에서 열린 질문은 이렇게 찾을 때 크게 좋아졌다 (코칭 nDCG 0.86 → 0.94, 글쓰기 0.29 → 0.84).
2. 그래도 부족하면 답하는 Claude가 search 도구를 최대 MAX_SEARCH번 더 부른다.
3. 검색 결과는 search_result 블록으로 넣는다. Claude가 답의 문장마다 어느 청크에서 왔는지 citations로 돌려준다.
   출처 표시를 프롬프트로 시키지 않아도 되고, 인용한 원문(cited_text)이 그대로 따라와서 검증할 수 있다.
4. 자료 등급을 제목에 붙인다. A(정규 리포트·가이드)는 모범 사례, C(신입 투자제안서)는 아이디어 사례로만 쓰게 한다.
5. 대화는 앞부분을 바꾸지 않고 뒤에 붙이기만 한다. 그래서 프롬프트 캐싱이 턴마다 앞부분을 다시 읽지 않게 해 준다.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from agent_search import LLM, AgentSearch, ask  # noqa: E402

PREFETCH, OPEN_PREFETCH, MAX_SEARCH, PER_SEARCH = 8, 10, 3, 6
GRADE = {'A': 'A 정규 리포트·가이드·모델', 'B': 'B 스터디·운용 보고·게시글', 'C': 'C 신입 투자제안서'}

SYSTEM = """너는 중앙대 투자학회 RFS의 리서치 코치다. 학회원이 리포트를 쓰고 모델을 만들 때 옆에서 돕는다.

근거: 두 가지를 나눠서 다룬다.
- 일반 개념: 용어 뜻, 방법의 순서, 공식, 왜 그렇게 하는지 같은 재무·회계 교과서 수준 설명. 출처 없이 써도 된다.
  설명을 이해시키는 뼈대로만 쓰고 짧게. 업종 평균 베타, 시장위험프리미엄 몇 % 같은 구체적인 숫자는 일반 개념이 아니다.
- 학회 자료 주장: 숫자, 회사·리포트 이름, "학회 리포트는 이렇게 했다". 검색 결과에 있는 것만 쓰고 반드시 출처가 달리게 쓴다.
  자료에 없으면 지어내지 않는다. 질문이 특정 리포트·학회 자료를 묻는데 자료에 없으면 "학회 자료에서는 찾지 못했다"고 말하고,
  무엇을 찾아봤는지 한 줄로 알려준다. 그 자리를 일반 지식으로 메우지 않는다.
- 검색 결과 제목 끝의 [등급]을 반영한다. A는 모범 사례로 써도 된다. C(신입 투자제안서)는 "아이디어 참고용"이라고 밝히고 쓴다.
- 같은 내용이 여러 학기에 있으면 최근 자료를 앞에 둔다.
- 특정 종목을 사라/팔라는 투자 조언은 하지 않는다. 대신 학회 자료에 그 종목 분석이 있으면 알려준다.
{search}
답변 구조: 질문 종류에 맞춘다.
- 사실 질문(특정 리포트의 숫자·이유·방법): 답을 먼저 한두 줄로, 그다음 근거를 짧게. 단계 설명을 덧붙이지 않는다.
- 방법 질문("어떻게 해?", "뭘로 해?", "어떻게 시작해?"): 단계별 설명이 뼈대다.
  먼저 전체 흐름을 한 줄로 보여주고(예: "① 매출 추정 → ② FCF → ③ WACC → ④ 터미널 가치 → ⑤ 민감도"),
  ① ② ③ 단계마다 무엇을 왜 하는지, 실제로 어떻게 하는지를 설명한다. 학회 사례는 그 단계 안에 근거로 넣는다.
  예) "③ WACC: 자기자본비용은 CAPM으로 구한다. 상장 Peer의 베타를 평균해 쓰는 경우가 많다 (예: ○○ 리포트는 Peer 베타 평균 1.1로 WACC 7.2%)."
  리포트마다 문단을 따로 만들지 않는다. 같은 단계에서 리포트끼리 방법이 다르면 그 단계 안에서 비교한다 ("A는 Peer 평균 베타, B는 회귀 베타").
  사례는 단계마다 1~2개면 충분하고, 학회 사례가 없는 단계는 설명만 한다. 자료에 흔한 실수나 확인할 점이 있으면 해당 단계에 짚는다.
- 사례 모음 질문("~한 리포트 예시", "~ 관련 리포트 있어?"): 사례를 목록으로 주되, 각 사례에서 볼 점을 한 줄로 붙인다.
- 방법을 묻는 코칭 질문이면 끝에 상대 회사 상황을 묻는 질문을 하나 붙여 다음 대화를 연다
  (예: "분석하는 회사가 FSC야 LCC야?").
- 질문 종류는 속으로만 판단하고 답에 쓰지 않는다. 바로 답부터 쓴다.
- 한국어, 짧고 구체적으로. 마크다운 제목(#)은 쓰지 않는다. 단계 번호와 짧은 굵은 글씨는 써도 된다."""

SEARCH = """
검색
- 처음에 넣어준 결과로 충분하면 바로 답한다.
- 부족하면 search 도구로 더 찾는다 (최대 {max}번). 질문 표현보다 리포트에 나올 용어·회사 이름으로 바꿔 찾는 게 잘 된다.
  방법 질문은 단계마다 근거가 될 사례를 서로 다른 리포트에서 2~4개 모은다.
"""

TOOL = {'name': 'search', 'description': '학회 자료에서 더 찾는다. 관련 높은 청크를 검색 결과로 돌려준다.',
        'strict': True,
        'input_schema': {'type': 'object', 'properties': {'query': {'type': 'string', 'description': '검색어'}},
                         'required': ['query'], 'additionalProperties': False}}


class Answerer:
    """mode: routed(질문 종류에 따라 multiquery / agent) | basic(항상 multiquery, 10절의 처음 버전)
    search_model: 검색어 재작성·agent 검색 모델, answer_model: 답변 모델 (기본 둘 다 Sonnet 5.5)"""

    def __init__(self, cafe, searcher=None, mode='routed', search_model=LLM, answer_model=LLM):
        self.s = searcher or AgentSearch(cafe, model=search_model)
        self.answer_model = answer_model
        self.chunks = self.s.r.chunks
        self.mode = mode

    def result_block(self, i):
        c = self.chunks[i]
        pages = f"p.{c['page_start']}" + (f"-{c['page_end']}" if c.get('page_end') not in (None, c['page_start']) else '') \
            if c.get('page_start') else ''
        # 문단 단위로 나눠 넣으면 인용 범위가 문단 단위로 잡힌다 (통째로 넣으면 늘 청크 전체가 인용된다)
        paras = [p for p in c['text'].split('\n') if p.strip()] or [c['text']]
        return {'type': 'search_result', 'source': f"{c['chunk_id']} {pages}".strip(),
                'title': f"{c['header']} [{GRADE[c['grade']]}]",
                'content': [{'type': 'text', 'text': p} for p in paras],
                'citations': {'enabled': True}}

    def answer(self, question, given=None):
        return Chat(self).turn(question, given)

    def render(self, resp, shown, searches):
        """답 본문에 [1] 같은 출처 번호를 달고, 번호별 문서·페이지·인용 원문을 모은다."""
        text, sources, num = '', [], {}
        for b in resp.content:
            if b.type != 'text':
                continue
            text += b.text
            marks = []
            for c in b.citations or []:
                key = c.source
                if key not in num:
                    num[key] = len(num) + 1
                    sources.append({'n': num[key], 'source': c.source, 'title': c.title, 'cited': []})
                src = sources[num[key] - 1]
                if c.cited_text not in src['cited']:
                    src['cited'].append(c.cited_text)
                marks.append(num[key])
            if marks:
                text += ''.join(f'[{m}]' for m in dict.fromkeys(marks))
        # 드물게 답 앞에 <reference_check>…</reference_check> 같은 혼잣말 메모가 붙는다 (13절 평가 41개 중 1개)
        text = re.sub(r'^\s*<([a-z_]+)>.*?</\1>', '', text, flags=re.S)
        return {'answer': text.strip(), 'sources': sources, 'searches': searches,
                'shown': [self.chunks[i]['chunk_id'] for i in shown], 'stop_reason': resp.stop_reason}


class Chat:
    """한 사람과의 대화. msgs는 뒤에 붙이기만 한다 (앞을 고치면 캐시와 이전 턴의 thinking이 무효가 된다)."""

    def __init__(self, answerer):
        self.a = answerer
        self.msgs, self.shown, self.turns = [], [], []

    def _context(self):
        return '\n'.join(f"Q: {t['question']}\nA: {t['answer'][:600]}" for t in self.turns[-3:])

    def _retrieve(self, question):
        s = self.a.s
        queries, kind, standalone = s.rewrite(question, self._context())
        if self.a.mode == 'routed' and kind == 'open':
            found = s.agent(standalone)[:OPEN_PREFETCH]
        else:
            kind = kind if self.a.mode == 'routed' else 'basic'
            found = s.multiquery(standalone, queries=queries)[:PREFETCH]
        return [i for i in found if i not in self.shown], kind, standalone

    def turn(self, question, given=None):
        """given: 검색 대신 넣을 청크 번호 목록 (평가에서 예전 답과 같은 자료로 프롬프트만 바꿔 비교할 때). 이때는 추가 검색도 없다."""
        a, s = self.a, self.a.s
        if given is None:
            first, kind, standalone = self._retrieve(question)
            system, tools = SYSTEM.format(search=SEARCH.format(max=MAX_SEARCH)), {'tools': [TOOL]}
        else:
            first, kind, standalone = [i for i in given if i not in self.shown], 'given', question
            system, tools = SYSTEM.format(search=''), {}
        self.shown += first
        content = [a.result_block(i) for i in first] + [{'type': 'text', 'text': f'질문: {question}'}]
        self.msgs.append({'role': 'user', 'content': content})
        searches, n = [], 0
        for _ in range(MAX_SEARCH + 2):
            # cache_control: 마지막 블록까지를 캐시에 쓴다. 다음 호출(도구 결과 뒤, 다음 턴)은 이 앞부분을 캐시에서 읽는다
            resp = ask(s.cl, model=a.answer_model, system=system, **tools, cache_control={'type': 'ephemeral'},
                       output_config={'effort': 'medium'}, messages=self.msgs)
            s._count(resp)
            self.msgs.append({'role': 'assistant', 'content': resp.content})
            if resp.stop_reason != 'tool_use':
                break
            results = []
            for b in resp.content:
                if b.type != 'tool_use':
                    continue
                if n >= MAX_SEARCH:
                    results.append({'type': 'tool_result', 'tool_use_id': b.id, 'is_error': True,
                                    'content': f'검색 횟수({MAX_SEARCH}) 초과. 지금까지 찾은 자료로 답해라.'})
                    continue
                n += 1
                searches.append(b.input['query'])
                q = b.input['query']
                found = [i for i in s.r.rerank(q, s.r.hybrid(q), top=30) if i not in self.shown][:PER_SEARCH]
                self.shown += found
                results.append({'type': 'tool_result', 'tool_use_id': b.id,
                                'content': [a.result_block(i) for i in found] or [{'type': 'text', 'text': '새 결과 없음'}]})
            self.msgs.append({'role': 'user', 'content': results})
        out = a.render(resp, self.shown, searches)
        out.update(kind=kind, standalone=standalone)
        self.turns.append({'question': question, 'answer': out['answer']})
        return out



if __name__ == '__main__':
    a = Answerer(sys.argv[1])
    chat = Chat(a)
    for q in sys.argv[2:]:
        out = chat.turn(q)
        print(f"######## {q}  ({out['kind']}: {out['standalone']})")
        print(out['answer'])
        print()
        for src in out['sources']:
            print(f"[{src['n']}] {src['title']} ({src['source']})")
        print('추가 검색:', out['searches'], '토큰 누적', a.s.usage)
