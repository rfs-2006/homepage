"""PDF 읽기 설명 (학회원 전용): /read/ 화면에 학회원이 올린 PDF(주로 리포트)를 읽다가 드래그한 부분을 그 문서 안의 글로 풀어 준다.
PDF는 서버로 오지 않는다. 화면(pdf.js)이 글자만 뽑아 아래 것을 보낸다.
server.py의 POST /explain이 부른다. 카페 자료 검색(RAG)은 하지 않는다. 화면이 보내 주는 문서 글만 근거로 쓴다:
  - 드래그한 부분과 그 쪽의 글
  - 같은 리포트 안에서 그 말이 나온 다른 쪽 (화면에서 PDF 글자를 찾아 보낸다)
  - 리포트 첫 쪽 (투자의견·요약)
키  Claude API 키는 환경변수 RAG_ANTHROPIC_API_KEY.
"""
from agent_search import MODELS, ask, client

LIMITS = {'title': 200, 'selection': 800, 'context': 7000, 'hits': 4000, 'first': 2500}

SYSTEM = """너는 중앙대학교 가치투자학회 R.F.S.의 리서치 도우미 Polaris다. 학회원이 올린 PDF(주로 증권사·학회 리포트)를 읽다가 드래그한 부분을 설명한다. 아래에서 "리포트"는 이 PDF를 말한다.

설명하는 법
- 근거는 먼저 이 리포트다. 주어진 쪽 글과 같은 리포트의 다른 언급에서 그 말이 어떤 뜻·맥락으로 쓰였는지 찾아 설명한다.
- 용어·약어면: 한 줄로 뜻을 풀고, 이 리포트에서 왜·어떻게 쓰였는지 이어서 설명한다.
- 숫자·표·계산이면: 그 숫자가 리포트의 어디서 나왔고 어떤 가정·계산으로 이어지는지 보여 준다. 리포트 글로 계산을 확인할 수 있으면 식을 적는다.
- 문장·주장이면: 무엇을 말하는지 쉽게 풀고, 리포트가 든 근거를 짚는다.
- 리포트에 없는 일반 지식으로 보충할 때는 "일반적으로"라고 구분한다. 리포트에 없는 숫자·사실은 지어내지 않는다. 주어진 글로 알 수 없으면 그렇다고 말한다.
- 다른 쪽을 근거로 들면 (p.N)으로 쪽을 적는다.

형식
- 짧게. 3~6문장, 또는 짧은 항목 3~5개. 인사·머리말·맺음말 없이 바로 설명한다.
- 평서문(~다)으로 쓴다. 강조는 **굵게**만 쓰고 표·제목은 쓰지 않는다.
- PDF에서 뽑은 글이라 줄바꿈·띄어쓰기가 어색하거나 표의 숫자가 흩어져 있을 수 있다. 앞뒤를 보고 읽는다."""


def _clip(req, k):
    return str(req.get(k) or '').strip()[:LIMITS[k]]


def explain(req, model=MODELS['sonnet']):
    """req: {title, selection, page, context, hits, first} → {'answer'} 또는 {'error'}"""
    sel = _clip(req, 'selection')
    if not sel:
        return {'error': '설명할 부분을 드래그해 주세요.'}
    try:
        page = int(req.get('page') or 0)
    except (TypeError, ValueError):
        page = 0
    parts = [f"문서: {_clip(req, 'title') or '(제목 없음)'}",
             f"[드래그한 부분{f' (p.{page})' if page else ''}]\n{sel}",
             f"[그 쪽의 글]\n{_clip(req, 'context')}"]
    if _clip(req, 'hits'):
        parts.append(f"[같은 리포트의 다른 언급]\n{_clip(req, 'hits')}")
    if _clip(req, 'first'):
        parts.append(f"[리포트 첫 쪽]\n{_clip(req, 'first')}")
    r = ask(client(), model=model, system=SYSTEM, messages=[{'role': 'user', 'content': '\n\n'.join(parts)}])
    out = ''.join(b.text for b in r.content if getattr(b, 'type', '') == 'text').strip()
    return {'answer': out} if out else {'error': '설명을 만들지 못했습니다. 다시 눌러 주세요.'}
