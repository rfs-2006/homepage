"""PDF 읽기 설명 (학회원 전용): /read/ 화면에 학회원이 올린 PDF(주로 리포트)를 읽다가 드래그한 부분을 설명한다.
리포트 화면의 용어 풀이 팝업(assets/reports/glossary.json)과 같은 모양·말투로 돌려준다:
  t 드래그한 말(짧게) · k 분류 · d 뜻 풀이(토스 말투, 필요하면 웹 검색으로 확인) · c '이 리포트에서는'(문서 글 근거)
PDF는 서버로 오지 않는다. 화면(pdf.js)이 글자만 뽑아 보낸다:
  - 드래그한 부분과 그 쪽의 글
  - 같은 문서 안에서 그 말이 나온 다른 쪽 (화면에서 PDF 글자를 찾아 보낸다)
  - 첫 쪽 (투자의견·요약)
카페 자료 검색(RAG)·Voyage는 쓰지 않는다. 웹 검색(Claude 서버 도구)은 정확한 뜻·최신 사실이 필요할 때만 최대 2번.
키  Claude API 키는 환경변수 RAG_ANTHROPIC_API_KEY.
"""
import json
import re

from agent_search import MODELS, ask, client

LIMITS = {'title': 200, 'selection': 800, 'context': 7000, 'hits': 4000, 'first': 2500}
KINDS = ('재무', '회계', '밸류에이션', '산업', '기업', '거시', '정책·제도', '기술', '시장', '문장')
WEB_SEARCH = {'type': 'web_search_20260209', 'name': 'web_search', 'max_uses': 2}

SYSTEM = """너는 중앙대학교 가치투자학회 R.F.S.의 리서치 도우미 Polaris다. 학회원이 PDF(주로 증권사·학회 리포트)를 읽다가 드래그한 부분을 설명한다.

드래그한 부분만 설명한다. 주변 글은 그 말이 어떤 맥락에서 쓰였는지 알기 위해서만 읽는다. 리포트 전체를 요약하거나 다른 내용으로 넓히지 않는다.

두 칸으로 나눠 쓴다.
- d (뜻 풀이): 이 말이 무엇인지 일반적으로 설명한다. 리포트를 안 읽은 사람도 알 수 있게 쓴다. 용어·약어·제도·기업·기술처럼 정확한 뜻이나 최신 사실이 필요하면 웹 검색으로 확인하고 쓴다. 누구나 아는 말이거나 문서만 봐도 되는 문장이면 검색하지 않는다. 3~5문장.
- c (이 리포트에서는): 이 문서에서 이 말이 왜·어떻게 쓰였는지, 관련 숫자가 있으면 숫자와 함께 1~2문장. 주어진 문서 글에 근거가 있을 때만 쓰고, 없으면 빈 문자열. 다른 쪽을 근거로 들면 (p.N)을 붙인다.
- 숫자·표·계산을 드래그했으면 d에서 그 지표가 무엇이고 어떻게 계산하는지, c에서 이 문서의 숫자가 어디서 나왔는지 쓴다.
- 문장을 통째로 드래그했으면 d에 그 문장이 하는 말을 쉬운 말로 풀고, 낯선 말이 있으면 함께 풀어 준다.

말투는 토스처럼 쓴다.
- "~예요", "~해요"로 끝나는 짧은 문장. 한 문장에 한 가지만.
- 어려운 한자어·업계 말은 쉬운 말로 바꾸거나 바로 뒤에 풀어 준다. 계산은 (A ÷ B − 1)처럼 괄호 식으로 짧게.
- 인사·머리말·맺음말·강조 표시·목록 기호 없이 바로 설명한다.
- 문서나 검색 결과에 없는 숫자·사실은 지어내지 않는다. 확실하지 않으면 그렇다고 쓴다.

예시 (리포트 용어 풀이와 같은 결)
{"t": "영업 레버리지", "k": "재무", "d": "매출이 늘 때 영업이익이 그보다 더 크게 늘어나는 효과예요. 인건비·감가상각처럼 매출과 상관없이 나가는 고정비가 있으면 생겨요. 반대로 매출이 줄면 고정비 때문에 이익이 더 크게 줄기도 해요. 영업이익 증가율 ÷ 매출 증가율로 크기를 가늠해요.", "c": "매출이 28% 늘 때 영업이익은 34% 늘었어요. 물량이 늘어도 공장·인력 고정비는 그대로라 이익이 더 빨리 커진 거예요."}

출력은 JSON 하나만. 다른 글자 없이:
{"t": "드래그한 말을 짧게 (문장이면 핵심 말 10자 안팎)", "k": "재무 | 회계 | 밸류에이션 | 산업 | 기업 | 거시 | 정책·제도 | 기술 | 시장 | 문장 중 하나", "d": "...", "c": "..."}"""


def _clip(req, k):
    return str(req.get(k) or '').strip()[:LIMITS[k]]


def _sources(content):
    """웹 검색을 했으면 답에 인용된 곳(없으면 검색 결과 앞쪽)을 최대 3개: [{title, url}]"""
    seen, out = set(), []

    def add(url, title):
        if url and url not in seen and len(out) < 3:
            seen.add(url)
            out.append({'title': (title or url)[:80], 'url': url})
    for b in content:
        for c in (getattr(b, 'citations', None) or []):
            add(getattr(c, 'url', ''), getattr(c, 'title', ''))
    if not out:
        for b in content:
            if getattr(b, 'type', '') == 'web_search_tool_result' and isinstance(getattr(b, 'content', None), list):
                for r in b.content[:2]:
                    add(getattr(r, 'url', ''), getattr(r, 'title', ''))
    return out


def explain(req, model=MODELS['sonnet']):
    """req: {title, selection, page, context, hits, first} → {t, k, d, c, sources} 또는 {'error'}"""
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
        parts.append(f"[같은 문서의 다른 언급]\n{_clip(req, 'hits')}")
    if _clip(req, 'first'):
        parts.append(f"[문서 첫 쪽]\n{_clip(req, 'first')}")
    messages = [{'role': 'user', 'content': '\n\n'.join(parts)}]
    cl, content = client(), []
    for _ in range(3):   # 웹 검색이 길어지면 서버가 pause_turn으로 끊어 보낸다. 받은 것을 붙여 이어 쓰게 한다
        r = ask(cl, model=model, system=SYSTEM, messages=messages, tools=[WEB_SEARCH])
        content += list(r.content)
        if r.stop_reason != 'pause_turn':
            break
        messages = messages + [{'role': 'assistant', 'content': r.content}]
    text = ''.join(b.text for b in content if getattr(b, 'type', '') == 'text').strip()
    m = re.search(r'\{.*\}', text, re.S)
    try:
        out = json.loads(m.group(0) if m else text)
    except ValueError:
        return {'error': '설명을 만들지 못했습니다. 다시 눌러 주세요.'}
    d = str(out.get('d') or '').strip()
    if not d:
        return {'error': '설명을 만들지 못했습니다. 다시 눌러 주세요.'}
    k = str(out.get('k') or '').strip()
    return {'t': (str(out.get('t') or '').strip() or sel)[:60], 'k': k if k in KINDS else '설명',
            'd': d[:1200], 'c': str(out.get('c') or '').strip()[:600], 'sources': _sources(content)}
