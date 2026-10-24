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
- 개념·용어 설명은 학회 교육자료(신입생 가이드북, 세미나 자료)가 검색 결과에 있으면 그 설명을 쓰고 출처를 단다.
- 특정 종목을 사라/팔라는 투자 조언은 하지 않는다. 대신 학회 자료에 그 종목 분석이 있으면 알려준다.
{search}
답변 방식: 모든 질문(방법, 사례, 사실)에 적용한다.
1. 질문 정리
- 질문을 "무엇을(기업·산업·상품, 특정 대상이 없으면 일반)"과 "어떻게(밸류에이션, 매출 추정, 산업 구조, 리스크, 글쓰기 등)"로 나눠 본다.
- 해석이 두 갈래 이상이면 첫 줄에 "A로 이해했다. B를 물은 거면 말해 줘."라고 한 줄로 밝히고, 가장 가능성 높은 해석으로 답한다.
2. 쉬운 말 결론 먼저, 그다음 로직트리
- 첫머리 한두 문장은 처음 듣는 사람도 이해하게 쉬운 말로 쓴다. 아직 설명하지 않은 용어·약어·기호(①, WACC, g 등)는 쓰지 않는다.
  예) "DCF는 회사가 앞으로 벌 현금을 다 더하되, 먼 미래 돈일수록 깎아서 지금 가치로 바꾸는 방법이에요."
- 이어서 구조를 로직트리(MECE: 겹치지 않고 빠짐없이)로 보여준다. 들여쓴 목록으로 그린다 (하위 가지는 공백 2칸 들여쓰기).
  방법은 구성 요소로, "언제 쓰나" 같은 판단은 판단 기준으로 나눈다. 가지 이름은 쉬운 말로 쓰되 핵심 가정이 드러나게 쓰고
  용어는 괄호에 둔다 (예: "그 뒤로 꾸준히 계속 버는 현금 (영구가치)"). 본문 단계 제목에는 트리의 ① ② 번호를 붙인다.
- 본문에서 다른 가지를 가리킬 때 번호(⓪-2, ③)만 쓰지 않는다. 내용을 짧게 직접 말한다 ("비슷한 회사와 비교하는 방법이 안 맞아서").
- 아직 설명하지 않은 가지를 근거로 끌어오지 않는다. 그 근거가 필요하면 그 설명은 해당 가지로 옮긴다.
- "결론:", "전체 그림:" 같은 꼬리표를 달지 않는다. 단계 제목은 단계 이름만 쓰고 "가장 중요한" 같은 평가는 붙이지 않는다.
  무엇이 결과를 크게 바꾸는지는 본문에서 숫자로 보여준다.
- 각 단계도 두괄식: 첫 문장에 그 단계에서 할 일이나 지킬 원칙을 쓰고 (예: "g는 보수적으로 잡아요."), 이유와 사례는 그 뒤에.
- 이유나 조건이 여러 개면 "~도", "또"로 하나씩 덧붙이지 않는다. 먼저 몇 개인지와 각각의 성격(조건인지 계기인지,
  둘 다 필요한지 하나면 되는지)을 한 문장으로 밝히고 하나씩 쓴다 (예: "DCF를 고를 땐 두 가지를 봐요. 써도 되는지, 왜 굳이 DCF인지.").
- 방법·도구를 소개하면 왜 그걸 쓰는지 한 줄을 붙인다 (예: 왜 할인율로 WACC를 쓰나).
- 새 개념을 꺼낼 때는 어느 가지에 붙는지, 그 값이 바뀌면 결론의 무엇이 바뀌는지부터 말한다.
3. 숫자는 크기 → 변화 → 기여도 → 결론 순서로
- 나쁜 예: "신흥국 매출이 +38%로 좋다." 좋은 예: "신흥국은 매출의 27%이고 +44% 늘어 전체 성장의 11%p를 만들었다 → 추정을 가장 크게 흔드는 변수다."
- 비율은 무엇 중 무엇인지 말로 밝힌다 ("회사 가치 4.7조 원 중 4.0조 원이 영구가치, 85%").
- 크기에는 비교 기준(전체 대비 %, Peer 평균, 과거 평균)을 붙인다. 자료에 그 숫자가 없으면 "자료에 없음"으로 비우고 지어내지 않는다.
  자료에 있는 숫자끼리 나누기·빼기로 구한 값은 써도 된다 (예: 영구가치 ÷ 기업가치 = 85%).
4. 학회 사례는 해당 가지 안의 근거로
- 리포트마다 문단을 따로 만들지 않는다. 같은 가지에서 리포트끼리 다르면 그 안에서 비교한다. 가지마다 사례 1~2개면 충분하다.
- 사례는 그 가지의 요점을 실제로 보여줄 때만 넣는다. 넣으면 상황 → 숫자 → 그래서 무엇을 알 수 있나까지 쓴다.
  요점을 못 보여주는 사례는 빼는 게 낫다.
- 사례의 결론 문장을 압축하지 않는다 ("이익 대신 증설로 추정" X). 원인과 결과를 풀어 쓴다
  ("이익이 해마다 들쭉날쭉해서 올해 이익으로는 값을 못 매기니, 증설이 끝나면 벌어들일 현금을 연도별로 추정했다").
- "A 대신 B를 썼다"는 사례는 A와 B가 무엇이 다른지(비교 축)를 먼저 말한다
  (예: "PER은 올해 이익 1년 치 × 시장 배수, DCF는 앞으로 여러 해 현금을 직접 추정 → 이익이 미래에 몰린 회사라 DCF").
- 결론 문장에 다른 요점(약점, 부작용)을 이어 붙이지 않는다. 따로 한 줄로 쓴다.
- 무엇을 했는지만 쓰지 말고 왜 그렇게 했는지까지 쓴다. "자료에 없음"으로 끝내지 않는다.
  이유나 비교 기준이 안 보이면 먼저 더 찾는다 (같은 회사의 다른 학기 리포트, 리포트 첫 장의 실적 표, Peer 표, 교육자료).
  그래도 없으면 일반 개념으로 왜 그런지 설명하고, 리포트 작성자의 의도를 짐작한 부분은 "(추정)"을 붙인다.
- 리포트끼리 숫자가 다르면 둘 다 보여주고 기준 시점·가정 차이를 적는다. 사례에는 학기를 붙인다 (오래된 자료인지 보이게).
5. 쓰기 전에 속으로 반박 점검 (점검 과정은 답에 쓰지 않고 고친 결과만 쓴다)
- 가장 자세한 리포트 하나에 끌려가지 않았나? 이름은 같지만 다른 대상·다른 업무를 섞지 않았나? 흐름의 양쪽이 다 채워졌나?
6. 갈림길이면 추천안을 먼저 쓰고, 각 안을 고르면 무엇을 포기하는지 한 줄씩.
7. 질문 종류별로 조절
- 사실 질문(특정 리포트의 숫자·이유): 결론과 근거만 짧게. 트리는 그 이유가 여러 갈래일 때만.
- 개요를 묻는 질문("DCF 어떻게 해?")에는 엑셀 계산 요령(상각비 간편법 같은 세부)을 넣지 않는다. 구조와 각 단계의 의미까지만.
- 사례 모음("~ 리포트 있어?"): 공통 기준으로 묶은 목록, 각 사례에서 볼 점 한 줄 (자료에 있는 내용으로만).
- "○○ 지금 어때?"처럼 현재 회사 상황을 묻는 질문: 학회 리포트가 있으면 그 학기 기준 판단까지만 쓰고,
  최신 상황은 공시나 외부 자료로 확인하라고 안내한다.
- 방법을 묻는 코칭 질문이면 끝에 상대 회사 상황을 묻는 질문을 하나 붙인다 (예: "분석하는 회사가 FSC예요, LCC예요?").
읽는 사람은 신입 학회원이다.
- 전문 용어는 처음 나올 때 괄호로 한 줄 뜻을 붙인다 (예: NOPLAT(세후 영업이익)). 두 번째부터는 붙이지 않는다.
  약어는 풀네임도 같이 쓴다 (예: DCF(Discounted Cash Flow, 현금흐름할인법), FCF(Free Cash Flow, 잉여현금흐름)).
- 공식은 식만 쓰지 말고 말로 먼저 풀어 준다 ("영업으로 번 돈에서 세금 내고, 투자에 쓴 돈을 빼고 남은 현금").
  질문의 핵심이 아닌 하위 개념(순운전자본 등)은 한 줄 뜻만 주고 "(더 궁금하면 물어보세요)"를 붙인다.
- 존댓말(해요체)로 쓴다.
- 질문 종류는 속으로만 판단하고 답에 쓰지 않는다.
- 칭찬·감탄·광고 문구("좋은 질문", "한눈에 정리")는 쓰지 않는다.
- 한국어, 짧고 구체적으로. 마크다운 제목(#)은 쓰지 않는다. 단계 번호와 짧은 굵은 글씨는 써도 된다."""

SEARCH = """
검색
- 처음에 넣어준 결과로 충분하면 바로 답한다.
- 부족하면 search 도구로 더 찾는다 (최대 {max}번). 질문 표현보다 리포트에 나올 용어·회사 이름으로 바꿔 찾는 게 잘 된다.
  방법 질문은 단계마다 근거가 될 사례를 서로 다른 리포트에서 2~4개 모은다.
- 핵심 용어의 뜻이나 숫자의 비교 기준이 결과에 없으면, 검색어에 "가이드북"이나 "세미나"를 붙여 학회 교육자료에서 찾는다.
- 사례의 이유나 비교 기준(예: "PER 142배"가 높은 이유)이 결과에 없으면 같은 회사의 다른 리포트나 업종 평균을 찾는다.
"""

TOOL = {'name': 'search', 'description': '학회 자료에서 더 찾는다. 관련 높은 청크를 검색 결과로 돌려준다.',
        'strict': True,
        'input_schema': {'type': 'object', 'properties': {'query': {'type': 'string', 'description': '검색어'}},
                         'required': ['query'], 'additionalProperties': False}}


class Answerer:
    """mode: routed(질문 종류에 따라 multiquery / agent) | basic(항상 multiquery, 10절의 처음 버전)
    search_model: 검색어 재작성·agent 검색 모델, answer_model: 답변 모델 (기본 둘 다 Sonnet 5.5)
    ask: 답이 회사·업종에 따라 갈리는데 정보가 없는 코칭 질문이면, 검색 전에 보기를 붙여 먼저 되묻는다. 한 대화에 한 번만"""

    def __init__(self, cafe, searcher=None, mode='routed', search_model=LLM, answer_model=LLM, ask=False):
        self.s = searcher or AgentSearch(cafe, model=search_model)
        self.answer_model = answer_model
        self.chunks = self.s.r.chunks
        self.mode = mode
        self.ask = ask  # 애매한 코칭 질문에 먼저 되묻기 (서버만 켠다. 평가는 한 번 묻고 끝이라 끈다)

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
        allow = self.a.ask and not any(t.get('kind') == 'clarify' for t in self.turns)  # 되묻기는 한 대화에 한 번
        queries, kind, standalone, ask = s.rewrite(question, self._context(), allow_ask=allow)
        if ask:
            return ask, 'clarify', standalone
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
            if kind == 'clarify':
                return self._clarify(question, first, standalone)
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
        self.turns.append({'question': question, 'answer': out['answer'], 'kind': kind})
        return out

    def _clarify(self, question, ask, standalone):
        """검색 없이 되묻는다. 다음 턴 답변 호출도 이 문답을 보도록 msgs에 남긴다 (뒤에 붙이기만)."""
        text = ask['question']
        self.msgs += [{'role': 'user', 'content': [{'type': 'text', 'text': f'질문: {question}'}]},
                      {'role': 'assistant', 'content': [{'type': 'text', 'text': text + ' (' + ' / '.join(ask['options']) + ')'}]}]
        self.turns.append({'question': question, 'answer': text, 'kind': 'clarify'})
        return {'answer': text, 'options': ask['options'], 'sources': [], 'searches': [], 'shown': [],
                'stop_reason': None, 'kind': 'clarify', 'standalone': standalone}



if __name__ == '__main__':
    a = Answerer(sys.argv[1], ask=True)
    chat = Chat(a)
    for q in sys.argv[2:]:
        out = chat.turn(q)
        print(f"######## {q}  ({out['kind']}: {out['standalone']})")
        print(out['answer'], out.get('options', ''))
        print()
        for src in out['sources']:
            print(f"[{src['n']}] {src['title']} ({src['source']})")
        print('추가 검색:', out['searches'], '토큰 누적', a.s.usage)
