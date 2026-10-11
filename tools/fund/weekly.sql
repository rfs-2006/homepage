-- FUND 위클리 게시판: 누구나 읽고, 운용팀 계정(amt@caurfs.kr)만 쓰고 지운다.
-- Supabase → SQL Editor 에 붙여넣고 Run 한 번. 다시 실행해도 괜찮다.
create table if not exists public.fund_weekly (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  week date not null,
  title text not null,
  body text not null default '',
  images text[] not null default '{}',
  link text not null default ''
);
alter table public.fund_weekly enable row level security;
drop policy if exists "weekly read" on public.fund_weekly;
drop policy if exists "weekly write" on public.fund_weekly;
drop policy if exists "weekly edit" on public.fund_weekly;
drop policy if exists "weekly delete" on public.fund_weekly;
create policy "weekly read" on public.fund_weekly for select using (true);
create policy "weekly write" on public.fund_weekly for insert with check ((auth.jwt() ->> 'email') = 'amt@caurfs.kr');
create policy "weekly edit" on public.fund_weekly for update using ((auth.jwt() ->> 'email') = 'amt@caurfs.kr');
create policy "weekly delete" on public.fund_weekly for delete using ((auth.jwt() ->> 'email') = 'amt@caurfs.kr');

-- 사진 저장소 (공개 읽기)
insert into storage.buckets (id, name, public) values ('fund-weekly', 'fund-weekly', true) on conflict (id) do nothing;
drop policy if exists "weekly img write" on storage.objects;
drop policy if exists "weekly img delete" on storage.objects;
create policy "weekly img write" on storage.objects for insert with check (bucket_id = 'fund-weekly' and (auth.jwt() ->> 'email') = 'amt@caurfs.kr');
create policy "weekly img delete" on storage.objects for delete using (bucket_id = 'fund-weekly' and (auth.jwt() ->> 'email') = 'amt@caurfs.kr');

-- 카테고리 (공지 / 투자전략)
alter table public.fund_weekly add column if not exists category text not null default '투자전략';
