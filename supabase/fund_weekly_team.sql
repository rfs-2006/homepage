-- 위클리 글에 운용 인력 명단과 매니저 한마디 칸을 더한다 (운용보고서 PDF 표지·펀드 개요에 쓰임)
alter table public.fund_weekly
  add column if not exists team jsonb not null default '[]'::jsonb,
  add column if not exists note text not null default '';
