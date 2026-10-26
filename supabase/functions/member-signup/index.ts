// 회원가입: 로그인 화면의 '회원가입' 폼이 부른다. 로그인 없이 누구나 부를 수 있다.
// - 계정을 바로 만들되 '정지' 상태로 만든다. 정지된 계정은 로그인이 안 되므로, 관리자가 승인(정지 해제)하기 전에는 아무것도 못 본다
// - 비밀번호는 Supabase Auth가 해시로 저장한다. 이 함수와 DB 어디에도 평문으로 남지 않는다
// - 아이디는 로그인 칸에 그대로 쓰는 이름이다 (hong → hong@caurfs.kr 계정). 운영용 아이디는 막는다
// - 신청이 들어오면 관리자 휴대폰(ADMIN_PHONE)으로 짧은 문자를 보낸다 (솔라피, 실패해도 신청은 된다)
//
// 필요한 Secrets: ADMIN_PHONE(알림 받을 번호), 솔라피 키 3개(커피챗·agora-sms와 같은 것)
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 는 Supabase가 자동으로 넣어 준다.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const POLICY_VERSION = '2026-11-02';
const RESERVED = ['admin', 'root', 'amt', 'member', 'members', 'contact', 'recruiting', 'rfs', 'caurfs', 'agora', 'test', 'support', 'help', 'info', 'noreply', 'no-reply', 'postmaster', 'webmaster'];
const MAX_PENDING = 60, PER_IP_DAY = 3;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const str = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);

async function sha(text: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}
async function hmac(secret: string, text: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function notify(text: string) {
  const env = (...names: string[]) => names.map((n) => Deno.env.get(n)).find((v) => !!v) || '';
  const apiKey = env('SOLAPI_API_KEY', 'SOLAPI_KEY', 'SOLAPI_APIKEY');
  const secret = env('SOLAPI_API_SECRET', 'SOLAPI_SECRET', 'SOLAPI_SECRET_KEY', 'SOLAPI_API_SECRET_KEY');
  const from = digits(env('SOLAPI_SENDER', 'SOLAPI_FROM', 'SOLAPI_SENDER_NUMBER', 'SOLAPI_SENDER_PHONE', 'SMS_SENDER', 'SENDER_PHONE', 'SMS_FROM'));
  const to = digits(env('ADMIN_PHONE'));
  if (!apiKey || !secret || !from || !to) return;
  const date = new Date().toISOString(), salt = crypto.randomUUID().replace(/-/g, '');
  const auth = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${await hmac(secret, date + salt)}`;
  await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { to, from, text } }),
  }).catch(() => {});
}

// 신청 대기 중인 계정 (app_metadata.status = 'pending')
async function pending(admin: ReturnType<typeof createClient>) {
  const out: Array<Record<string, any>> = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    out.push(...data.users.filter((u) => u.app_metadata?.status === 'pending'));
    if (data.users.length < 200) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method' });
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json(400, { error: 'body' }); }

  const id = str(b.id, 40).toLowerCase(), pw = String(b.password ?? '');
  const name = str(b.name, 30), nickname = str(b.nickname, 30), email = str(b.email, 120).toLowerCase();
  const birth = digits(b.birth).slice(0, 8), blog = str(b.blog, 200), cohort = digits(b.cohort).slice(0, 3);
  if (b.agree !== true) return json(400, { error: 'agree' });
  if (!/^[a-z][a-z0-9._-]{3,19}$/.test(id) || RESERVED.includes(id)) return json(400, { error: 'id' });
  if (pw.length < 8 || pw.length > 72) return json(400, { error: 'password' });
  if (!name || !nickname) return json(400, { error: 'name' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'email' });
  const y = +birth.slice(0, 4), m = +birth.slice(4, 6), d = +birth.slice(6, 8), bd = new Date(Date.UTC(y, m - 1, d));
  if (birth.length !== 8 || bd.getUTCMonth() !== m - 1 || bd.getUTCDate() !== d || y < 1940) return json(400, { error: 'birth' });
  // 만 14세 미만은 법정대리인 동의가 필요해 받지 않는다
  const now = new Date(), age = now.getUTCFullYear() - y - ((now.getUTCMonth() + 1) * 100 + now.getUTCDate() < m * 100 + d ? 1 : 0);
  if (age < 14) return json(400, { error: 'age' });
  if (blog && !/^https?:\/\/\S+$/i.test(blog)) return json(400, { error: 'blog' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const ipHash = ip ? await sha(ip) : '';
  const list = await pending(admin);
  if (list.length >= MAX_PENDING) return json(429, { error: 'busy' });
  const since = Date.now() - 24 * 3600e3;
  if (ipHash && list.filter((u) => u.app_metadata?.ip === ipHash && Date.parse(u.created_at) > since).length >= PER_IP_DAY) return json(429, { error: 'limit' });

  const { error } = await admin.auth.admin.createUser({
    email: `${id}@caurfs.kr`, password: pw, email_confirm: true,
    ban_duration: '876000h', // 승인 전까지 로그인 불가
    user_metadata: { name, nickname, cohort: cohort || '', birth, blog, contact_email: email },
    app_metadata: { status: 'pending', applied_at: now.toISOString(), privacy_agreed_at: now.toISOString(), privacy_version: POLICY_VERSION, ip: ipHash },
  });
  if (error) return json(/already|exists|registered/i.test(error.message) ? 409 : 500, { error: /already|exists|registered/i.test(error.message) ? 'taken' : 'create' });

  await notify(`[R.F.S.] 회원가입 1건: ${cohort ? cohort + '기 ' : '외부 '}${name}. AGORA에서 승인해 주세요.`);
  return json(200, { ok: true });
});
