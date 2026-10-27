"""위클리 글 피드백 (작성자 전용): 올리기 전에 운용팀이 쓴 글을 읽고 빠진 맥락·설명 없는 용어·다듬을 문장을 짚는다.
server.py의 POST /wk/feedback이 부른다. 운용팀 계정(amt@caurfs.kr)만 쓸 수 있다.
키  Claude API 키는 환경변수 RAG_ANTHROPIC_API_KEY.
"""
import json
import re

from agent_search import MODELS, ask, client

MAX_TEXT = 30000

SYSTEM = """너는 자산운용사 운용보고서 편집자다. 대학 투자학회 운용팀이 쓴 주간 투자전략 초안을 받아, 올리기 전에 작성자에게 고칠 점을 짚어 준다.

독자는 이 팀의 회의에 없던 사람이다. 학회원, 신입, 외부 방문자. 지난주 글도 안 읽었다고 생각하고 읽어라.

짚을 것 세 가지:
1. 맥락: 앞뒤 사정을 알아야만 이해되는 문장. 무엇을 가리키는지 없는 지시어, 갑자기 나오는 판단의 근거, 지난주 결정을 전제로 한 말, 숫자의 기준(무엇 대비, 언제 기준)이 빠진 곳.
2. 용어: 설명 없이 쓴 업계 용어·약어·은어. 처음 나올 때 한 번 풀어 주면 되는 것만. 흔한 말(PER, 매출, 금리)은 넘어간다.
3. 문장: 운용사 보고서 문체로 다듬을 문장. 명사형 개조식으로 짧게 끊는다 ("~할 것으로 판단" "~ 확대" "~ 전망"). 구어체("~듯", "딱히", "..?"), 말줄임, 감탄, "본다"류 어미, 한 문장에 판단 여러 개 섞인 것.

지킬 것:
- 작성자의 판단·숫자·종목·비중은 바꾸지 않는다. 표현과 빠진 설명만 다룬다.
- 고친 문장에 원문에 없는 사실을 지어 넣지 않는다. 설명이 필요한데 원문에 근거가 없으면 fix에 "[작성자가 채울 것: ...]"으로 비워 둔다.
- 중요한 것부터 최대 15개. 같은 종류가 반복되면 대표 하나만 짚고 issue에 "같은 표현 N곳"이라고 적는다.
- 칭찬, 총평, 인사는 쓰지 않는다.

출력은 JSON 하나만. 다른 글자 없이:
{"items": [{"type": "맥락" | "용어" | "문장", "quote": "원문에서 그대로 옮긴 짧은 구절", "issue": "무엇이 문제인지 한 줄", "fix": "고친 문장 또는 덧붙일 설명"}]}"""


def feedback(text, model=MODELS['sonnet']):
    text = (text or '').strip()[:MAX_TEXT]
    if not text:
        return {'items': []}
    r = ask(client(), model=model, system=SYSTEM, messages=[{'role': 'user', 'content': '초안:\n\n' + text}])
    out = ''.join(b.text for b in r.content if getattr(b, 'type', '') == 'text').strip()
    m = re.search(r'\{.*\}', out, re.S)
    try:
        items = json.loads(m.group(0) if m else out).get('items', [])
    except ValueError:
        return {'items': [], 'error': '피드백을 읽지 못했습니다. 다시 눌러 주세요.'}
    keep = []
    for it in items[:15]:
        if not isinstance(it, dict):
            continue
        keep.append({k: str(it.get(k, ''))[:600] for k in ('type', 'quote', 'issue', 'fix')})
    return {'items': keep}


# ---------- 문체 다듬기: 위클리 초안을 운용사 보고서 문체(명사형 개조식)로 바꾼다 ----------
# 화면이 노션식 HTML을 보내면 태그·순서·사진 자리([[IMG n]])는 그대로 두고 글자만 고쳐서 돌려준다.
POLISH_SYSTEM = """너는 자산운용사 주간 운용보고서 편집자다. 대학 투자학회 운용팀이 노션에 쓴 주간 투자전략 초안을 증권사·운용사 보고서 문체로 다듬는다.

문체
- 명사형 개조식으로 짧게 끝낸다: "~ 지속", "~ 확대 예정", "~할 전망", "~으로 판단됨", "~ 검토 중", "~ 미흡".
- 구어체·은어·말줄임·물음표·이모티콘을 없앤다: "딱히", "~듯", "먹었다", "..", "..?" 같은 표현.
- "본다", "생각함", "~인 것 같음"은 "판단됨", "전망", "예상"으로 바꾼다.
- 약칭은 처음 한 번 풀어 쓴다: 외인 → 외국인, 삼전 → 삼성전자, 하닉 → SK하이닉스, 전닉 → 삼성전자·SK하이닉스.
- 숫자는 천 단위 쉼표와 단위를 붙인다(641억 → 641억 원). %와 %p를 구분한다.

예시 (초안 → 다듬은 문장)
- 외인은 지속적 매도세, 금요일 매수는 로테이션 정도로 해석 → 외국인 매도세 지속. 금요일 순매수는 업종 간 로테이션으로 판단됨
- 딱히 없음.. 금요일 기술적 반등을 먹었다 정도..? → 특기할 성과 없음. 금요일 기술적 반등을 일부 수익으로 연결
- 정해진 계획을 지키지 못하여 계획된 주식비 15% 오버 → 사전 계획을 준수하지 못해 목표 대비 주식 비중 15%p 초과
- 하방을 열어놓고 현금비 확대 → 하방 위험에 대비해 현금 비중 확대
- 6월 피크 때까지도 개인 위주의 수급으로 올랐다고 볼 수 있음 → 6월 고점까지의 상승은 개인 수급 중심이었던 것으로 판단됨
- 구글은 메모리 LTA를 2035년까지 연장하는 방안을 모색 → 구글: 메모리 장기공급계약(LTA)을 2035년까지 연장하는 방안 검토 중

지킬 것
- 작성자의 판단·숫자·종목·비중·날짜는 하나도 바꾸지 않는다. 문장 표현만 고친다. 없는 내용을 더하지 않는다.
- HTML 태그와 순서를 그대로 둔다. 태그 안의 글자만 바꾼다. 태그를 새로 만들거나 지우지 않는다.
- [[IMG 1]] 같은 사진 자리 표시는 글자 하나 바꾸지 말고 그 자리에 그대로 둔다.
- 제목(h1, h2, h3)과 칸 이름(포트폴리오, 주간 리뷰, BM Plan 등)은 그대로 둔다.
- 이미 보고서 문체인 문장은 건드리지 않는다.

출력은 다듬은 HTML 하나만. 설명이나 코드블록 표시 없이."""

MAX_HTML = 60000


def polish(html, model=MODELS['sonnet']):
    html = (html or '').strip()
    if not html:
        return {'html': ''}
    if len(html) > MAX_HTML:
        return {'error': '글이 너무 깁니다. 나눠서 다듬어 주세요.'}
    r = ask(client(), model=model, system=POLISH_SYSTEM, messages=[{'role': 'user', 'content': html}])
    out = ''.join(b.text for b in r.content if getattr(b, 'type', '') == 'text').strip()
    out = re.sub(r'^```(?:html)?\s*|\s*```$', '', out)
    # 사진 자리 표시가 하나라도 빠지면 쓰지 않는다 (사진이 사라지면 안 되므로)
    need = re.findall(r'\[\[IMG \d+\]\]', html)
    if sorted(need) != sorted(re.findall(r'\[\[IMG \d+\]\]', out)):
        return {'error': '사진 자리가 맞지 않아 다듬은 글을 쓰지 않았습니다. 다시 눌러 주세요.'}
    return {'html': out}
