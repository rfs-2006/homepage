-- 운영 대시보드(assets/ops.js) 저장소: 계좌 잔액 기록·유지비 표·알림 설정.
-- RLS를 켜고 정책을 두지 않아서 사이트에서는 읽기·쓰기가 막히고, member-admin 함수(service role)만 읽고 쓴다.
-- 관리자 여부는 함수가 MEMBER_ADMINS Secret으로 확인한다. SQL Editor에서 한 번 실행.
create table if not exists public.ops_state (
  key text primary key,            -- 'account' | 'costs' | 'settings'
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.ops_state enable row level security;
revoke all on public.ops_state from anon, authenticated;
