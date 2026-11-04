// 운영(관리자) 함수: AGORA의 '운영' 대시보드(assets/ops.js)와 가입 승인 화면(assets/join.js)이 부른다. 관리자(MEMBER_ADMINS)만 쓸 수 있다.
// - list: 승인 대기 중인 신청 목록
// - approve: 정지를 풀어 로그인할 수 있게 한다. role로 학회원('member')·일반('guest')을 정한다 (app_metadata.role, 본인은 못 바꾼다)
//            신청 때 받은 휴대폰으로 승인 안내 문자를 보내고(솔라피), 알림 이메일이 켜져 있으면 관리자에게도 메일
// - reject: 계정과 신청 정보를 바로 지운다 (개인정보처리방침: 거절하면 즉시 파기)
// - ops_get: 대시보드 데이터 (계좌 잔액 기록·유지비 표·설정, 문자 기록 최근 50건)
// - ops_save: 대시보드의 계좌·유지비·설정 저장 (ops_state 테이블, supabase/sql/ops_state.sql)
// - ga: Google Analytics 방문자 (최근 30일 일별 사용자·페이지뷰, 많이 본 페이지, 유입 경로). GA4 Data API, 서비스 계정
//
// 필요한 Secrets: MEMBER_ADMINS (관리자 로그인 이메일, 쉼표로 여러 개. 예: amt@caurfs.kr), 솔라피 키 3개(커피챗·agora-sms와 같은 것)
// 선택 Secrets: RESEND_API_KEY·MAIL_FROM (알림 메일), GA_PROPERTY_ID·GA_SA_KEY (방문자: GA 속성 ID 숫자, 서비스 계정 키 JSON 전체)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const OPS_KEYS = ['account', 'costs', 'settings'];
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const env = (...names: string[]) => names.map((n) => Deno.env.get(n)).find((v) => !!v) || '';
type DB = ReturnType<typeof createClient>;

async function hmac(secret: string, text: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function solapiSend(to: string, text: string) {
  const apiKey = env('SOLAPI_API_KEY', 'SOLAPI_KEY', 'SOLAPI_APIKEY');
  const secret = env('SOLAPI_API_SECRET', 'SOLAPI_SECRET', 'SOLAPI_SECRET_KEY', 'SOLAPI_API_SECRET_KEY');
  const from = digits(env('SOLAPI_SENDER', 'SOLAPI_FROM', 'SOLAPI_SENDER_NUMBER', 'SOLAPI_SENDER_PHONE', 'SMS_SENDER', 'SENDER_PHONE', 'SMS_FROM'));
  if (!apiKey || !secret || !from) throw new Error('solapi_not_configured');
  const date = new Date().toISOString(), salt = crypto.randomUUID().replace(/-/g, '');
  const auth = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${await hmac(secret, date + salt)}`;
  const r = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { to, from, text } }),
  });
  if (!r.ok) throw new Error('solapi_' + r.status);
}

// 관리자 알림 메일 (Resend). 받는 주소는 대시보드 설정(ops_state.settings.notify_email), 없으면 NOTIFY_EMAIL. 실패해도 본 작업은 그대로
async function mailAdmin(admin: DB, kind: string, subject: string, text: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return;
  const { data } = await admin.from('ops_state').select('value').eq('key', 'settings').maybeSingle();
  const s = (data?.value || {}) as Record<string, any>;
  const to = String(s.notify_email || Deno.env.get('NOTIFY_EMAIL') || '').trim();
  if (!to || (s.notify && s.notify[kind] === false)) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: Deno.env.get('MAIL_FROM') || 'R.F.S. 알림 <onboarding@resend.dev>', to: [to], subject, text }),
  }).catch(() => {});
}

// Google Analytics: 서비스 계정 키로 토큰을 받아(JWT, RS256) GA4 Data API batchRunReports를 부른다. 키는 Secret에만 있다
const b64u = (buf: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof buf === 'string' ? new TextEncoder().encode(buf) : new Uint8Array(buf as ArrayBuffer);
  let bin = ''; for (const x of bytes) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
async function gaToken(sa: { client_email: string; private_key: string }) {
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + b64u(sig) }),
  });
  if (!r.ok) throw new Error('token_' + r.status);
  return (await r.json()).access_token as string;
}
async function gaReport() {
  const prop = digits(Deno.env.get('GA_PROPERTY_ID')), raw = Deno.env.get('GA_SA_KEY');
  if (!prop || !raw) return { configured: false };
  const tok = await gaToken(JSON.parse(raw));
  const range = [{ startDate: '29daysAgo', endDate: 'today' }];
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${prop}:batchRunReports`, {
    method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [
      { dateRanges: range, dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }], orderBys: [{ dimension: { dimensionName: 'date' } }] },
      { dateRanges: range, dimensions: [{ name: 'pageTitle' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 10 },
      { dateRanges: range, dimensions: [{ name: 'sessionSource' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 },
      { dateRanges: range, metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }] },
    ] }),
  });
  if (!r.ok) return { configured: true, error: 'http_' + r.status };
  // deno-lint-ignore no-explicit-any
  const rep = ((await r.json()).reports || []) as any[];
  // deno-lint-ignore no-explicit-any
  const rows = (i: number) => (rep[i]?.rows || []).map((x: any) => ({ d: x.dimensionValues?.map((v: any) => v.value) || [], m: x.metricValues.map((v: any) => +v.value) }));
  const days = rows(0).map((x: { d: string[]; m: number[] }) => ({ date: `${x.d[0].slice(0, 4)}-${x.d[0].slice(4, 6)}-${x.d[0].slice(6, 8)}`, users: x.m[0], views: x.m[1] }));
  const total = rows(3)[0]?.m || [0, 0];
  return { configured: true, days, pages: rows(1).map((x: { d: string[]; m: number[] }) => ({ title: x.d[0], views: x.m[0] })), sources: rows(2).map((x: { d: string[]; m: number[] }) => ({ source: x.d[0], sessions: x.m[0] })), users30: total[0], views30: total[1] };
}

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
        out.push({ uid: x.id, id: String(x.email || '').replace(/@caurfs\.kr$/, ''), name: m.name, nickname: m.nickname, cohort: m.cohort, birth: m.birth, blog: m.blog, email: m.contact_email, phone: m.phone || '', applied_at: x.app_metadata.applied_at });
      }
      if (data.users.length < 200) break;
    }
    out.sort((a, c) => String(a.applied_at).localeCompare(String(c.applied_at)));
    return json(200, { ok: true, list: out });
  }

  if (b.action === 'ops_get') {
    const [{ data: rows }, { data: sms }] = await Promise.all([
      admin.from('ops_state').select('key, value, updated_at, updated_by'),
      admin.from('agora_sms_log').select('created_at, user_id, user_email, alumni_name, alumni_cohort, to_phone, status').order('created_at', { ascending: false }).limit(50),
    ]);
    // 받은 사람: 계정 아이디 대신 가입 때 적은 이름·기수. 공용 계정(member)은 사람을 알 수 없어서 받은 번호 끝 4자리를 같이 보여 준다
    const names: Record<string, string> = {};
    const ids: string[] = Array.from(new Set((sms || []).map((x) => String(x.user_id))));
    for (const id of ids) {
      const { data: w } = await admin.auth.admin.getUserById(id);
      const m = w?.user?.user_metadata || {};
      if (m.name) names[id] = `${m.cohort ? m.cohort + '기 ' : ''}${m.name}`;
    }
    const smsOut = (sms || []).map((x) => ({ created_at: x.created_at, who: names[String(x.user_id)] || '', id: String(x.user_email || '').replace(/@caurfs\.kr$/, ''), phone4: String(x.to_phone || '').slice(-4), alumni_name: x.alumni_name, alumni_cohort: x.alumni_cohort, status: x.status }));
    const state: Record<string, unknown> = {};
    for (const r of rows || []) state[r.key] = { value: r.value, updated_at: r.updated_at, updated_by: r.updated_by };
    return json(200, { ok: true, state, sms: smsOut, mail: !!Deno.env.get('RESEND_API_KEY') });
  }

  if (b.action === 'ga') {
    try { return json(200, { ok: true, ga: await gaReport() }); } catch (e) { return json(200, { ok: true, ga: { configured: true, error: String((e as Error).message).slice(0, 80) } }); }
  }

  if (b.action === 'ops_save') {
    const key = String(b.key || '');
    if (!OPS_KEYS.includes(key)) return json(400, { error: 'key' });
    const value = b.value ?? null;
    if (JSON.stringify(value).length > 60000) return json(413, { error: 'size' });
    const { error } = await admin.from('ops_state').upsert({ key, value, updated_at: new Date().toISOString(), updated_by: u.user.email });
    return error ? json(500, { error: 'save' }) : json(200, { ok: true });
  }

  const uid = String(b.uid || '');
  if (!/^[0-9a-f-]{36}$/.test(uid)) return json(400, { error: 'uid' });
  const { data: t } = await admin.auth.admin.getUserById(uid);
  if (!t?.user || t.user.app_metadata?.status !== 'pending') return json(404, { error: 'not_pending' });

  if (b.action === 'approve') {
    if (b.role !== 'member' && b.role !== 'guest') return json(400, { error: 'role' });
    const { error } = await admin.auth.admin.updateUserById(uid, {
      ban_duration: 'none',
      app_metadata: { ...t.user.app_metadata, status: 'approved', role: b.role === 'guest' ? 'guest' : 'member', approved_at: new Date().toISOString(), approved_by: u.user.email, ip: null },
    });
    if (error) return json(500, { error: 'approve' });
    // 승인 안내 문자: 실패해도 승인은 그대로
    const m = t.user.user_metadata || {}, phone = digits(m.phone), id = String(t.user.email || '').replace(/@caurfs\.kr$/, '');
    let sms = 'no_phone';
    if (/^01[016789]\d{7,8}$/.test(phone)) {
      try {
        // 승인 안내 문구 (공식): 학회원 승인이면 AGORA 안내 한 줄을 더한다
        await solapiSend(phone, [
          '[R.F.S. 중앙대학교 가치투자학회]',
          '',
          `${m.name || ''}님의 회원가입이 승인되었습니다.`,
          '',
          `아이디: ${id}`,
          '로그인: caurfs.kr',
          ...(b.role === 'guest' ? [] : ['학회원 전용 서비스(AGORA)를 이용하실 수 있습니다.']),
          '',
          '문의: contact@caurfs.kr',
        ].join('\n'));
        sms = 'sent';
      } catch { sms = 'failed'; }
    }
    await mailAdmin(admin, 'approval', `[R.F.S.] 가입 승인: ${m.name || id}`,
      `${u.user.email}이(가) ${m.cohort ? m.cohort + '기 ' : ''}${m.name || ''}(${id})을(를) ${b.role === 'guest' ? '일반 회원' : '학회원'}으로 승인했어요.\n안내 문자: ${sms === 'sent' ? '보냄' : sms === 'no_phone' ? '휴대폰 번호 없음' : '실패'}`);
    return json(200, { ok: true, sms });
  }
  if (b.action === 'reject') {
    const { error } = await admin.auth.admin.deleteUser(uid);
    return error ? json(500, { error: 'reject' }) : json(200, { ok: true });
  }
  return json(400, { error: 'action' });
});
