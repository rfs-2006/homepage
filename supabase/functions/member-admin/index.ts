// 가입 신청 승인: AGORA의 '가입 신청' 화면이 부른다. 관리자(MEMBER_ADMINS)만 쓸 수 있다.
// - list: 승인 대기 중인 신청 목록
// - approve: 정지를 풀어 로그인할 수 있게 한다
// - reject: 계정과 신청 정보를 바로 지운다 (개인정보처리방침: 거절하면 즉시 파기)
//
// 필요한 Secrets: MEMBER_ADMINS (관리자 로그인 이메일, 쉼표로 여러 개. 예: amt@caurfs.kr)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
  const { data: u } = await asUser.auth.getUser();
  if (!u?.user) return json(401, { error: 'login' });
  const admins = (Deno.env.get('MEMBER_ADMINS') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!admins.includes(String(u.user.email || '').toLowerCase())) return json(403, { error: 'admin' });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json(400, { error: 'body' }); }

  if (b.action === 'list') {
    const out = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return json(500, { error: 'list' });
      for (const x of data.users) {
        if (x.app_metadata?.status !== 'pending') continue;
        const m = x.user_metadata || {};
        out.push({ uid: x.id, id: String(x.email || '').replace(/@caurfs\.kr$/, ''), name: m.name, nickname: m.nickname, cohort: m.cohort, birth: m.birth, blog: m.blog, email: m.contact_email, applied_at: x.app_metadata.applied_at });
      }
      if (data.users.length < 200) break;
    }
    out.sort((a, c) => String(a.applied_at).localeCompare(String(c.applied_at)));
    return json(200, { ok: true, list: out });
  }

  const uid = String(b.uid || '');
  if (!/^[0-9a-f-]{36}$/.test(uid)) return json(400, { error: 'uid' });
  const { data: t } = await admin.auth.admin.getUserById(uid);
  if (!t?.user || t.user.app_metadata?.status !== 'pending') return json(404, { error: 'not_pending' });

  if (b.action === 'approve') {
    const { error } = await admin.auth.admin.updateUserById(uid, {
      ban_duration: 'none',
      app_metadata: { ...t.user.app_metadata, status: 'approved', approved_at: new Date().toISOString(), approved_by: u.user.email, ip: null },
    });
    return error ? json(500, { error: 'approve' }) : json(200, { ok: true });
  }
  if (b.action === 'reject') {
    const { error } = await admin.auth.admin.deleteUser(uid);
    return error ? json(500, { error: 'reject' }) : json(200, { ok: true });
  }
  return json(400, { error: 'action' });
});
