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
