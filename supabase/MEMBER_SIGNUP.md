# 회원가입 · 승인 켜는 법

로그인 화면의 "회원가입" → `member-signup` 함수가 **정지된 계정**을 만든다 (승인 전에는 로그인 불가).
관리자가 AGORA 위쪽 바의 "회원가입 승인"에서 승인하면 정지가 풀리고, 거절하면 계정과 정보가 바로 지워진다 (`member-admin` 함수).

Supabase Auth의 "Allow new users to sign up"은 **꺼진 채로 둔다.** 계정은 서버 함수만 만든다.
켜면 누구나 승인 없이 로그인 계정을 만들 수 있어 명부가 열린다.

## 1. Secrets (Edge Functions → Secrets)
| 이름 | 값 |
|---|---|
| `MEMBER_ADMINS` | 승인할 수 있는 로그인 이메일, 쉼표로 여러 개. 예: `amt@caurfs.kr` 또는 본인이 쓸 관리자 계정 |
| `ADMIN_PHONE` | 신청 알림 문자를 받을 번호 (예: 01012345678) |
| 솔라피 3개 | 커피챗·agora-sms가 이미 쓰는 것 그대로 |

## 2. 함수 배포 (Edge Functions → Deploy a new function → Via Editor)
- 이름 `member-signup`: `supabase/functions/member-signup/index.ts` 내용을 그대로 붙여넣고 Deploy
- 이름 `member-admin`: `supabase/functions/member-admin/index.ts` 내용을 그대로 붙여넣고 Deploy
- 편집기에는 `index.ts` 파일 하나만 있어야 한다. SQL은 넣지 않는다 (이번 기능은 SQL이 필요 없다).

## 3. 확인
- 로그인 화면 → "회원가입" → 시험 계정 신청 → 관리자 휴대폰에 알림 문자
- 시험 계정으로 로그인 → "승인 대기 중이에요"
- 관리자 계정으로 로그인 → AGORA 위쪽 바의 "회원가입 승인 1" → 승인 → 시험 계정으로 로그인 됨
- 거절하면 Authentication → Users 목록에서 사라진다

## 알아 둘 것
- 새 계정의 로그인 이메일은 `아이디@caurfs.kr` 형식이다 (로그인 칸에는 아이디만 쓰면 된다). 실제 메일함은 없으므로 비밀번호 찾기 메일은 가지 않는다.
  비밀번호를 잊으면 관리자가 Authentication → Users에서 바꿔 준다. 신청자가 적은 연락용 이메일은 user_metadata.contact_email에 있다.
- 승인은 두 가지다. **학회원 승인**은 AGORA(명부·선배님 연결·게시판·문자)까지, **일반 승인**은 로그인·POLARIS만. 등급은 `app_metadata.role`(`member`/`guest`)에 들어가고 본인은 못 바꾼다. 값이 없는 계정(공용 계정, 예전에 승인한 사람)은 학회원으로 본다.
- DB 차단: `supabase/sql/agora_member_only.sql`을 SQL Editor에서 한 번 실행한다 (명부·게시판에 guest 차단 정책 추가). `agora-sms`도 guest를 막는다. `coffee-chat` 함수는 저장소에 코드가 없어서, 대시보드에서 로그인 확인 바로 아래에 `if (user.app_metadata?.role === 'guest') return 403` 한 줄을 넣어야 한다.
- 등급을 바꾸면 그 사람이 다시 로그인해야(또는 최대 1시간 뒤 토큰이 갱신돼야) 적용된다. 바꾸는 SQL은 같은 파일 아래 주석에 있다.
- 개인정보처리방침: `/privacy/` (tools/build-pages.js가 만든다). 수집 항목을 바꾸면 방침, `assets/join.js`의 동의 표, `member-signup`의 `POLICY_VERSION`을 같이 바꾼다.
