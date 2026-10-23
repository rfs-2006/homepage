// AGORA '선배님께 여쭙기' 마지막 단계: 로그인한 학회원이 자기 번호를 넣으면,
// 고른 선배님의 연락처와 보낼 문구를 그 번호로 문자(솔라피)로 보내 준다.
// - 선배님 번호는 클라이언트가 보내는 값을 믿지 않고, 서버가 명부(intranet_content 'main')에서 찾는다
// - 누가 언제 어느 선배님 번호를 받았는지 agora_sms_log에 남긴다 (RLS로 관리자만 열람)
// - 한 사람당 하루 5건까지
//
// 필요한 Secrets: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER (솔라피에 등록한 발신번호, 숫자만)
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY 는 Supabase가 자동으로 넣어 준다.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const DAILY_LIMIT = 5;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const fmt = (d: string) => d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : d;

async function hmac(secret: string, text: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function solapiSend(to: string, text: string) {
  const apiKey = Deno.env.get('SOLAPI_API_KEY'), secret = Deno.env.get('SOLAPI_API_SECRET'), from = digits(Deno.env.get('SOLAPI_SENDER'));
  if (!apiKey || !secret || !from) throw new Error('solapi_not_configured');
  const date = new Date().toISOString(), salt = crypto.randomUUID().replace(/-/g, '');
  const auth = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${await hmac(secret, date + salt)}`;
  const r = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { to, from, text, subject: '[R.F.S. AGORA] 선배님 연락처' } }),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('solapi_' + r.status + ':' + (body.errorCode || '') + ' ' + (body.errorMessage || ''));
  return body;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') || '';
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: u } = await asUser.auth.getUser();
  if (!u?.user) return json(401, { error: 'login' });
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json(400, { error: 'body' }); }
  const to = digits(b.toPhone);
  if (!/^01[016789]\d{7,8}$/.test(to)) return json(400, { error: 'toPhone' });
  const name = String(b.alumniName ?? '').trim(), cohort = digits(b.alumniCohort);
  if (!name || !cohort) return json(400, { error: 'alumni' });

  // 하루 한도
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { count } = await admin.from('agora_sms_log').select('id', { count: 'exact', head: true }).eq('user_id', u.user.id).gte('created_at', since).eq('status', 'sent');
  if ((count ?? 0) >= DAILY_LIMIT) return json(429, { error: 'limit' });

  // 선배님 번호는 명부에서
  const { data: row } = await admin.from('intranet_content').select('data').eq('id', 'main').maybeSingle();
  const list: Array<Record<string, unknown>> = (row?.data?.ALUMNI as Array<Record<string, unknown>>) || [];
  const a = list.find((x) => String(x.name ?? '').trim() === name && digits(x.cohort) === cohort);
  const phone = digits(a?.phone);
  if (!a || phone.length < 10) return json(404, { error: 'no_phone' });

  // 문구·매너는 학회원에게 맡긴다. 연락처와 한 줄의 무게만
  const sms = [
    `[R.F.S. AGORA]`,
    ``,
    `${a.name} 선배님`,
    `${cohort}기${a.company ? ' · ' + a.company : ''}`,
    `${fmt(phone)}`,
    ``,
    `선배님께서 학회를 믿고 남겨 주신 연락처입니다.`,
    `정중히 연락드려 주십시오.`,
  ].join('\n');

  const log = { user_id: u.user.id, user_email: u.user.email, alumni_name: name, alumni_cohort: cohort, to_phone: to, status: 'sent', error: null as string | null };
  try {
    await solapiSend(to, sms);
  } catch (e) {
    log.status = 'failed'; log.error = String((e as Error).message).slice(0, 300);
    await admin.from('agora_sms_log').insert(log);
    return json(502, { error: log.error.startsWith('solapi_not_configured') ? 'not_configured' : 'send' });
  }
  await admin.from('agora_sms_log').insert(log);
  return json(200, { ok: true });
});
