# 메모
- "토스버전" = `templates/toss/fund.html` (FUND 페이지 토스 스타일 디자인 보관본). 템플릿 목록은 `templates/README.md`.

# 작업 규칙
- 답은 한국어로, 짧고 AI 티 안 나게.
- 머지는 사용자가 "머지해"라고 할 때만. 그 전에는 브랜치 push → PR → Netlify 미리보기 주소(`https://deploy-preview-<PR번호>--remarkable-starlight-e4bf02.netlify.app`)까지.
- 키·토큰·비밀번호는 저장소와 채팅에 넣지 않는다. 공개 FUND 페이지에는 금액·수량·평단을 넣지 않는다. RFM 순위에는 실명 대신 별칭만 쓴다. 가입 신청의 개인정보(이름·생년월일 등)는 Supabase Auth 계정 정보에만 두고, `/privacy/` 방침과 맞춘다 (`supabase/MEMBER_SIGNUP.md`).

# RFS 챗봇 (RAG)
- 진행 상황과 결정은 `tools/rag/NOTES.md`. 코드는 `tools/rag/`(parse → chunk → embed → eval_retrieval).
- 원문·파싱 결과·벡터·평가셋은 비공개 저장소 `rfs-2006/rfs-cafe-data`(parsed/*.gz, vectors/, eval/). 공개 저장소에 원문 텍스트를 올리지 않는다.
- Voyage 키는 네트워크 시크릿(api.voyageai.com), Anthropic 키는 환경 변수 `RAG_ANTHROPIC_API_KEY`.
- 다음 할 일: 답이 문서별 나열이라 읽기 어렵다 → 단계별 설명 + 사례로 프롬프트·채점 바꾸고 나란히 비교 (NOTES 13절). 서버 띄울 곳 정하기, 엑셀 모델 밸류에이션 DB 추출.
