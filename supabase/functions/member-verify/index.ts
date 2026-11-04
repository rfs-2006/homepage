// 학회원증 QR 확인 (로그인 없이 누구나): 카드 QR → https://caurfs.kr/v/#<토큰> → 이 함수에 POST { t }.
// - 토큰은 `<카드 번호>.<서명>`. 서명 = base64url(HMAC-SHA256(CARD_SECRET, 카드 번호)) 앞 16바이트. 발급은 member-admin의 card_*.
// - 서명이 틀리거나 없는 카드면 똑같이 404 { error: 'unknown' } (어느 쪽인지 알려 주지 않는다)
// - 정지·기간 지난 카드면 200 { ok: false, status: 'revoked' | 'expired' } (이름 등은 주지 않는다)
// - 유효하면 200 { ok: true, no, name, name_en, cohort, role, valid_from, valid_to, photo, server_time }
// - IP당 1분 30번까지 (함수 인스턴스 메모리 기준이라 대략적)
//
// 필요한 Secrets: CARD_SECRET (긴 무작위 문자열. 바꾸면 이미 찍은 카드 QR이 전부 무효가 된다)
// 표: supabase/sql/member_cards.sql. 배포: supabase functions deploy member-verify (/v/ 화면은 사이트 공개 anon 키를 붙여 부른다)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const NO_RE = /^[A-Za-z0-9-]{1,40}$/;

const b64u = (bytes: Uint8Array) => {
  let bin = ''; for (const x of bytes) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
async function cardSig(secret: string, no: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(no)));
  return b64u(sig.slice(0, 16));
}
// 길이와 상관없이 끝까지 비교 (시간으로 몇 글자 맞았는지 알 수 없게)
function same(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return d === 0;
}

const hits = new Map<string, { n: number; t: number }>();
function limited(ip: string) {
  const now = Date.now(), h = hits.get(ip);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.t > 60_000) hits.delete(k);
  if (!h || now - h.t > 60_000) { hits.set(ip, { n: 1, t: now }); return false; }
  return ++h.n > 30;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method' });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown';
  if (limited(ip)) return json(429, { error: 'rate' });

  const secret = Deno.env.get('CARD_SECRET') || '';
  if (secret.length < 16) return json(500, { error: 'config' });

  let t = '';
  try { t = String(((await req.json()) || {}).t || ''); } catch { return json(400, { error: 'body' }); }
  const dot = t.lastIndexOf('.');
  const no = dot > 0 ? t.slice(0, dot) : '', sig = dot > 0 ? t.slice(dot + 1) : '';
  if (!NO_RE.test(no) || !/^[A-Za-z0-9_-]{22}$/.test(sig) || !same(sig, await cardSig(secret, no))) return json(404, { error: 'unknown' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: c, error } = await admin.from('member_cards').select('no, name, name_en, cohort, role, valid_from, valid_to, photo, revoked').eq('no', no).maybeSingle();
  if (error) return json(500, { error: 'db' });
  if (!c) return json(404, { error: 'unknown' });

  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);   // 한국 날짜
  if (c.revoked) return json(200, { ok: false, status: 'revoked' });
  if ((c.valid_from && today < c.valid_from) || (c.valid_to && today > c.valid_to)) return json(200, { ok: false, status: 'expired' });
  return json(200, {
    ok: true, no: c.no, name: c.name, name_en: c.name_en, cohort: c.cohort, role: c.role,
    valid_from: c.valid_from, valid_to: c.valid_to, photo: c.photo, server_time: new Date().toISOString(),
  });
});
