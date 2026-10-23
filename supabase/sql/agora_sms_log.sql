-- AGORA 문자 기록: 누가 언제 어느 선배님 연락처를 문자로 받았는지.
-- RLS를 켜고 정책을 하나도 두지 않아서, 사이트(anon/로그인 사용자)에서는 읽기·쓰기가 모두 막히고
-- 서버 함수(service role)와 Supabase 대시보드(관리자)에서만 보인다.
create table if not exists public.agora_sms_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null,
  user_email text,
  alumni_name text not null,
  alumni_cohort text not null,
  to_phone text not null,
  status text not null,
  error text
);
create index if not exists agora_sms_log_user_day on public.agora_sms_log (user_id, created_at desc);
alter table public.agora_sms_log enable row level security;
revoke all on public.agora_sms_log from anon, authenticated;
