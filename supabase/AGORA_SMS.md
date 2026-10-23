# AGORA 문자 받기 (솔라피) 켜는 법

학회원이 AGORA에서 선배님을 고르고 질문을 쓰면, 마지막에 **자기 번호**를 넣고 "문자로 받기"를 누른다.
그 번호로 선배님 이름·기수·회사·연락처와 짧은 한 줄이 문자로 간다. 연락 문구와 방식은 학회원에게 맡긴다. 기록은 관리자만 본다.

코드는 이미 들어가 있다. 아래 4단계만 하면 켜진다. 켜기 전에는 "문자 보내기를 준비하고 있어요" 안내와 문구 복사만 된다.

## 1. 솔라피 가입·충전·발신번호
1. https://solapi.com 가입 (사업자 없이 개인으로 가능)
2. 충전: 처음엔 1~2만 원이면 충분 (장문 1건 수십 원)
3. **발신번호 등록**: 콘솔 → 발신번호 관리 → 회장 휴대폰 번호 등록 (휴대폰 인증)
   - 통신사 규정상 등록한 번호로만 보낼 수 있다

## 2. API 키 만들기
콘솔 → 개발/연동 → API Key 관리 → 새 API Key 생성 → **API Key**와 **API Secret** 확인 (채팅에 붙여넣지 말 것)

## 3. Supabase에 넣기 (프로젝트 xyewclvpshldjucryapr)
**SQL Editor**에서 `supabase/sql/agora_sms_log.sql` 내용을 붙여넣고 Run (기록 테이블, 관리자만 열람)

**Edge Functions → Secrets** 에 세 개 추가
| 이름 | 값 |
|---|---|
| SOLAPI_API_KEY | 2단계 API Key |
| SOLAPI_API_SECRET | 2단계 API Secret |
| SOLAPI_SENDER | 1단계에서 등록한 발신번호 (숫자만, 예: 01012345678) |

## 4. 함수 올리기
**Edge Functions → Deploy a new function → Via Editor**
- 이름: `agora-sms`
- 코드: `supabase/functions/agora-sms/index.ts` 전체 붙여넣기 → Deploy
- "Verify JWT"는 켜 둔 채로 (로그인한 학회원만 호출 가능)

## 확인
사이트에 로그인 → AGORA → 선배님 고르고 질문 → 내 번호 넣고 "문자로 받기" → 문자 도착.
기록: Table Editor → `agora_sms_log` (누가·언제·어느 선배님·받은 번호·성공 여부)

## 규칙 (코드에 들어 있음)
- 선배님 번호는 서버가 명부에서 직접 찾는다 (화면에서 조작 불가)
- 한 사람당 24시간에 5건까지
- 실패한 시도도 기록에 남는다 (status = failed, error에 이유)
