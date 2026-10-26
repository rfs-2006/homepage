-- Polaris 대화 기록: 로그인한 계정마다 자기 대화만 저장·열람·삭제한다 (chat/index.html)
create table if not exists public.polaris_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  turns jsonb not null default '[]'::jsonb,   -- [{q, a: {answer, sources, files, kind}}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists polaris_chats_user_updated on public.polaris_chats (user_id, updated_at desc);
alter table public.polaris_chats enable row level security;
drop policy if exists "own chats" on public.polaris_chats;
create policy "own chats" on public.polaris_chats for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
