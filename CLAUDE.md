# 메모
- "토스버전" = `templates/toss/fund.html` (FUND 페이지 토스 스타일 디자인 보관본). 템플릿 목록은 `templates/README.md`.
- 홈 앱 로직·데이터(REPORTS·INDUSTRY 등)는 `assets/app.js`, 큰 CSS는 `assets/app.css` (index.html에는 화면 틀만). 고친 뒤 `node tools/build-site.js && node tools/build-pages.js`로 ?v=·검색용 페이지·sitemap·rss를 다시 만든다.
- 기업 리포트 올리기: 보통은 `python3 tools/add-report.py <pdf>` 한 번이면 아래 순서를 다 한다 (GitHub에서는 `inbox/`에 PDF 올리면 add-report.yml이 PR까지). 손으로 할 때 (빠짐없이 차례로): PDF → `assets/reports/<학기>_<id>.pdf`, 표지 `assets/covers/<학기>_<id>-top169.webp`(1190×669)·`-p1.webp`(1쪽 전체, 폭 1000) → `assets/app.js` REPORTS 맨 앞에 항목 → `python3 tools/extract-page1.py`(새 id만 page1.json에 반영, 기존 항목은 건드리지 않기) → `python3 tools/extract-full.py <id>` → FULL_REPORTS에 id → **용어 풀이** `python3 tools/build-glossary.py <id>`(키 없으면 같은 형식으로 직접 90~110개, glossary.json의 <id>) → (홈 '리포트 발간' 슬라이드·LATEST는 최근 발간일로 자동) → DATA_VER 올리기 → `node tools/build-prices.js` → 해외 종목은 `tools/seo-config.js` ALIASES → 빌드 두 개.
- 밸류에이션 커리큘럼 = `learn/` (공개, 소개 페이지 Curriculum 구역 버튼). 화면 `learn/cur.js`·`learn/mN.json`·`learn/vis/`, 엑셀식 실습 시트는 엔진 `learn/lab.js` + 모듈별 데이터 `learn/labs/mN.js`(`lab.html?m=mN`). 모듈 숫자를 바꾸면 그 모듈 시트의 expect도 같이 맞춘다.
- 커리큘럼 글쓰기: 개념은 무엇 → 왜 → 식 순서(식부터 던지지 않기). 규칙엔 이유 한 문장. '실제로·너무·훨씬·크게' 같은 정도 부사 대신 본문 숫자나 장면으로 보여 주기(새로 계산한 숫자는 그 단계 calc에 넣어 numbers.py로 검산). 출처·기준일은 본문 괄호 말고 단계의 `src`(화면 아래 각주). 쉬운 말·해요체, 문단 1~2문장. 핵심 진술(정의·이유·식의 뜻)은 `**구절**`로 굵게 — 낱말 하나 말고 뜻 구절, 화면당 1~3곳(note·points·takeaways에서만).
- 커리큘럼은 지식 레이어: 아무것도 모르는 대학생이 PRE → M0 → … → M9 순서로 보면 다음 모듈을 이해할 수 있어야 한다. 각 모듈은 앞 모듈에서 배운 말만 쓰고, 처음 나오는 용어는 그 자리에서 풀거나 빼거나 뒤로 보낸다. 처음 나오는 한자어는 글자 뜻으로 한 번 풀어 준다(시가총액 = 시장(市)이 매긴 가격(價)의 총액), 영어 약어는 단어 뜻으로(PER = Price Earnings Ratio, 주가가 이익의 몇 배인지). 어원이 정확하지 않아도 뜻이 통하면 된다.
- 운영에 쓰는 서비스·키 위치·학회 계정 이전 방법은 `docs/운영인수인계.md` (키 값은 넣지 않는다). 관리자 운영 대시보드는 `assets/ops.js`.

# 작업 규칙
- 답은 한국어로, 짧고 AI 티 안 나게.
- 머지는 사용자가 "머지해"라고 할 때만. 그 전에는 브랜치 push → PR → Netlify 미리보기 주소(`https://deploy-preview-<PR번호>--remarkable-starlight-e4bf02.netlify.app`)까지.
- 키·토큰·비밀번호는 저장소와 채팅에 넣지 않는다. 공개 FUND 페이지에는 금액·수량·평단을 넣지 않는다. RFM 순위에는 실명 대신 별칭만 쓴다. 가입 신청의 개인정보(이름·생년월일 등)는 Supabase Auth 계정 정보에만 두고, `/privacy/` 방침과 맞춘다 (`supabase/MEMBER_SIGNUP.md`).

# RFS 챗봇 (RAG)
- 진행 상황과 결정은 `tools/rag/NOTES.md`. 코드는 `tools/rag/`(parse → chunk → embed → eval_retrieval).
- 원문·파싱 결과·벡터·평가셋은 비공개 저장소 `rfs-2006/rfs-cafe-data`(parsed/*.gz, vectors/, eval/). 공개 저장소에 원문 텍스트를 올리지 않는다.
- Voyage 키는 네트워크 시크릿(api.voyageai.com), Anthropic 키는 환경 변수 `RAG_ANTHROPIC_API_KEY`.
- 다음 할 일: 답이 문서별 나열이라 읽기 어렵다 → 단계별 설명 + 사례로 프롬프트·채점 바꾸고 나란히 비교 (NOTES 13절). 서버 띄울 곳 정하기, 엑셀 모델 밸류에이션 DB 추출.
