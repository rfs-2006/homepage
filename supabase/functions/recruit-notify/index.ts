// 모집 알림 신청: 리크루팅 페이지 맨 아래에서 휴대폰 번호를 넣으면 부른다. 로그인 없이 누구나.
// - 번호는 ops_state의 key 'recruit_notify'({ rows: [{ phone, sem, at }] })에만 둔다. 사이트에서는 못 읽고, 운영 대시보드(관리자)만 본다
// - 새 번호가 들어오면 관리자 휴대폰(ADMIN_PHONE)으로 "모집 알림 신청 010-…" 문자를 보낸다 (솔라피, 실패해도 신청은 된다)
// - 같은 모집에 같은 번호는 한 번만. 남용 막기: IP(일방향 암호화)당 하루 3번, 하루 전체 문자 40통까지
// - 개인정보처리방침(/privacy/): 그 모집 안내 문자를 보낸 뒤, 늦어도 모집이 끝나면 지운다 (대시보드 '모집 알림'의 '모두 지우기')
// 필요한 Secrets: ADMIN_PHONE, 솔라피 키 3개 (member-signup과 같은 것). 배포: main에 올리면 deploy-functions.yml
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const KEY = 'recruit_notify', PER_IP_DAY = 3, SMS_DAY = 40, MAX_ROWS = 3000;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const env = (...names: string[]) => names.map((n) => Deno.env.get(n)).find((v) => !!v) || '';
const pretty = (p: string) => p.length === 11 ? `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}` : `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;

async function sha(text: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}
async function hmac(secret: string, text: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function smsAdmin(text: string) {
  const apiKey = env('SOLAPI_API_KEY', 'SOLAPI_KEY', 'SOLAPI_APIKEY');
  const secret = env('SOLAPI_API_SECRET', 'SOLAPI_SECRET', 'SOLAPI_SECRET_KEY', 'SOLAPI_API_SECRET_KEY');
  const from = digits(env('SOLAPI_SENDER', 'SOLAPI_FROM', 'SOLAPI_SENDER_NUMBER', 'SOLAPI_SENDER_PHONE', 'SMS_SENDER', 'SENDER_PHONE', 'SMS_FROM'));
  const to = digits(env('ADMIN_PHONE'));
  if (!apiKey || !secret || !from || !to) return false;
  const date = new Date().toISOString(), salt = crypto.randomUUID().replace(/-/g, '');
  const auth = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${await hmac(secret, date + salt)}`;
  const r = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { to, from, text } }),
  }).catch(() => null);
  return !!(r && r.ok);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method' });
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json(400, { error: 'body' }); }
  if (b.hp) return json(200, { ok: true });   // 사람 눈에 안 보이는 칸을 채웠으면 봇
  const phone = digits(b.phone);
  if (!/^01[016789]\d{7,8}$/.test(phone)) return json(400, { error: 'phone' });
  if (b.agree !== true) return json(400, { error: 'agree' });
  const sem = String(b.sem ?? '').trim().slice(0, 40);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data } = await admin.from('ops_state').select('value').eq('key', KEY).maybeSingle();
  // deno-lint-ignore no-explicit-any
  const rows: any[] = Array.isArray(data?.value?.rows) ? data.value.rows : [];
  if (rows.some((r) => r.phone === phone && r.sem === sem)) return json(200, { ok: true, dup: true });

  const now = new Date(), day = new Date(now.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',').pop()!.trim();
  const ipKey = await sha(ip + '|' + day);
  if (rows.filter((r) => r.ip === ipKey).length >= PER_IP_DAY) return json(429, { error: 'limit' });
  if (rows.length >= MAX_ROWS) return json(503, { error: 'full' });

  rows.push({ phone, sem, at: now.toISOString(), ip: ipKey });
  const { error } = await admin.from('ops_state').upsert({ key: KEY, value: { rows }, updated_at: now.toISOString(), updated_by: 'recruit-notify' });
  if (error) return json(500, { error: 'save' });

  const today = rows.filter((r) => String(r.at).slice(0, 10) === now.toISOString().slice(0, 10)).length;
  if (today <= SMS_DAY) await smsAdmin(`[RFS] 모집 알림 신청 ${pretty(phone)}${sem ? ' (' + sem + ')' : ''} · 지금까지 ${rows.length}명`);
  return json(200, { ok: true });
});
