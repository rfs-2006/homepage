-- 공유 체크리스트(/check/<주소>/) 저장소. 주소를 아는 사람은 누구나 읽고 체크를 바꿀 수 있다 (주소 자체가 비밀).
-- 새 행은 여기서만 만든다 (anon은 insert 불가). SQL Editor에서 한 번 실행.
create table if not exists public.shared_checks (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.shared_checks enable row level security;
revoke all on public.shared_checks from anon, authenticated;
grant select, update (state, updated_at) on public.shared_checks to anon, authenticated;
drop policy if exists shared_checks_read on public.shared_checks;
create policy shared_checks_read on public.shared_checks for select to anon, authenticated using (true);
drop policy if exists shared_checks_write on public.shared_checks;
create policy shared_checks_write on public.shared_checks for update to anon, authenticated using (true) with check (true);
insert into public.shared_checks (id) values ('3cnoa5qbv9') on conflict do nothing;
