-- AGORA는 학회원만: 일반 회원(app_metadata.role = 'guest')은 명부·게시판을 못 읽고 못 쓴다.
-- 기존 정책은 그대로 두고 "제한(RESTRICTIVE)" 정책을 하나씩 더한다. 제한 정책은 기존 허용 정책과 AND로 묶여서,
-- 지금 되던 사람(공용 계정·학회원)은 그대로 되고 guest만 빠진다. role 값이 없는 계정은 학회원으로 본다.
-- RFM·FUND(intranet_content의 rfm, fund_live 행)는 건드리지 않는다.

-- 1) 명부·공지 (intranet_content 'main' 행)
drop policy if exists agora_member_only on public.intranet_content;
create policy agora_member_only on public.intranet_content
  as restrictive for select to authenticated
  using (id <> 'main' or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'member') <> 'guest');

-- 2) AGORA 게시판 (posts, comments): 읽기·쓰기 모두
drop policy if exists agora_member_only on public.posts;
create policy agora_member_only on public.posts
  as restrictive for all to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'member') <> 'guest')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'member') <> 'guest');

drop policy if exists agora_member_only on public.comments;
create policy agora_member_only on public.comments
  as restrictive for all to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'member') <> 'guest')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'member') <> 'guest');

-- 확인: 지금 계정과 등급 (개인정보는 화면에서만 보고 저장하지 말 것)
-- select email, raw_app_meta_data ->> 'status' as status, coalesce(raw_app_meta_data ->> 'role', '(학회원)') as role
--   from auth.users order by created_at;

-- 이미 승인한 사람의 등급 바꾸기 (아이디 부분만 바꿔서 실행, 그 사람이 다시 로그인하면 적용)
-- update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"guest"}'  where email = '아이디@caurfs.kr';
-- update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"member"}' where email = '아이디@caurfs.kr';
