-- 회계장부 접근 기록 (운영 대시보드 → 회계장부). 누가 언제 보고·저장하고·내려받고·증빙을 올렸는지.
-- 장부 자체는 ops_state의 key 'ledger'에 있다 (supabase/sql/ops_state.sql). 둘 다 member-admin 함수(service role)만 읽고 쓴다.
-- RLS를 켜고 정책을 두지 않는다 → 사이트(anon·로그인 사용자)에서는 읽기·쓰기 모두 막힘. 최근 500건만 남긴다(함수가 지움).
-- SQL Editor에서 한 번 실행.
create table if not exists public.ledger_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  admin_email text not null,
  action text not null,            -- 'view' | 'save' | 'download' | 'upload_receipt' | 'view_receipt' | 'log_view'
  detail jsonb not null default '{}'::jsonb   -- 줄 수 등 숫자만. 금액·항목 내용은 넣지 않는다
);
create index if not exists ledger_log_created_idx on public.ledger_log (created_at desc);
alter table public.ledger_log enable row level security;
revoke all on public.ledger_log from anon, authenticated;

-- 증빙(영수증) 파일: 비공개 Storage 버킷 'ledger'. 절대 public으로 바꾸지 않는다.
-- 함수가 service role로 올리고, 볼 때는 60초짜리 서명 주소만 준다. Storage 정책(storage.objects)은 만들지 않는다.
-- 대시보드에서 만들어도 된다: Storage → New bucket → 이름 ledger, Public 끔, 5MB, pdf·jpg·png·webp.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ledger', 'ledger', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
