-- 학회원증(실물 카드 QR) 명부. 카드 QR은 https://caurfs.kr/v/#<no>.<서명> 을 열고, member-verify 함수가 서명을 확인한 뒤 이 표에서 찾는다.
-- RLS를 켜고 정책을 두지 않아서 사이트에서는 읽기·쓰기가 막히고, member-verify·member-admin 함수(service role)만 읽고 쓴다.
-- 발급·수정·정지는 운영 대시보드(assets/ops.js '학회원증')에서. 서명 키는 Supabase Secret CARD_SECRET. SQL Editor에서 한 번 실행.
create table if not exists public.member_cards (
  no text primary key,             -- 예: RFS-41-001
  name text not null,
  name_en text,
  cohort int,
  role text,                       -- 예: 회장 · President
  valid_from date,
  valid_to date,
  photo text,                      -- 사이트 경로 (예: /assets/officers/president.webp) 또는 null
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.member_cards enable row level security;
revoke all on public.member_cards from anon, authenticated;
