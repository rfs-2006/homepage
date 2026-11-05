// 운영(관리자) 함수: AGORA의 '운영' 대시보드(assets/ops.js)와 가입 승인 화면(assets/join.js)이 부른다. 관리자(MEMBER_ADMINS)만 쓸 수 있다.
// - list: 승인 대기 중인 신청 목록
// - approve: 정지를 풀어 로그인할 수 있게 한다. role로 학회원('member')·일반('guest')을 정한다 (app_metadata.role, 본인은 못 바꾼다)
//            신청 때 받은 휴대폰으로 승인 안내 문자를 보내고(솔라피), 알림 이메일이 켜져 있으면 관리자에게도 메일
// - reject: 계정과 신청 정보를 바로 지운다 (개인정보처리방침: 거절하면 즉시 파기)
// - ops_get: 대시보드 데이터 (계좌 잔액 기록·유지비 표·설정, 문자 기록 최근 50건)
// - ops_save: 대시보드의 계좌·유지비·설정 저장 (ops_state 테이블, supabase/sql/ops_state.sql)
// - ga: Google Analytics 방문자 (최근 30일 일별 사용자·페이지뷰, 많이 본 페이지, 유입 경로). GA4 Data API, 서비스 계정
// - card_list · card_save · card_revoke: 학회원증 (member_cards 테이블, supabase/sql/member_cards.sql). 각 카드의 QR 토큰도 같이 준다
//   (QR 주소 https://caurfs.kr/v/#<토큰>, 확인은 member-verify 함수). card_revoke는 { no, revoked: false }면 정지를 푼다
// - ledger_get · ledger_save · ledger_export · ledger_log_list: 회계장부 (ops_state의 key 'ledger', 접근 기록은 ledger_log, supabase/sql/ledger_log.sql)
// - receipt_upload · receipt_url: 증빙 파일 (비공개 Storage 버킷 'ledger', 볼 때는 60초 서명 주소)
//   회계장부·증빙은 LEDGER_ADMINS가 있으면 그 이메일만 (MEMBER_ADMINS 확인도 거친다). 모든 호출을 ledger_log에 남긴다
//
// 필요한 Secrets: MEMBER_ADMINS (관리자 로그인 이메일, 쉼표로 여러 개. 예: amt@caurfs.kr), 솔라피 키 3개(커피챗·agora-sms와 같은 것)
// 선택 Secrets: RESEND_API_KEY·MAIL_FROM (알림 메일), GA_PROPERTY_ID·GA_SA_KEY (방문자: GA 속성 ID 숫자, 서비스 계정 키 JSON 전체)
//             CARD_SECRET (학회원증 QR 서명 키, member-verify와 같은 값)
//             LEDGER_ADMINS (회계장부를 볼 수 있는 이메일, 쉼표로 여러 개. 없으면 MEMBER_ADMINS 전체)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const OPS_KEYS = ['account', 'costs', 'settings'];
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '');
const env = (...names: string[]) => names.map((n) => Deno.env.get(n)).find((v) => !!v) || '';
type DB = ReturnType<typeof createClient>;

// 학회원증 QR 토큰: `<카드 번호>.<base64url(HMAC-SHA256(CARD_SECRET, 번호)) 앞 16바이트>` (member-verify와 같은 계산)
const CARD_NO = /^[A-Za-z0-9-]{1,40}$/;
const CARD_COLS = 'no, name, name_en, cohort, role, valid_from, valid_to, photo, revoked, created_at';
async function cardToken(no: string) {
  const secret = Deno.env.get('CARD_SECRET') || '';
  if (secret.length < 16) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(no))).slice(0, 16);
  let bin = ''; for (const x of sig) bin += String.fromCharCode(x);
  return no + '.' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const withToken = async (c: Record<string, unknown>) => ({ ...c, token: await cardToken(String(c.no)) });
const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

// 회계장부: 줄 모양을 엄격히 확인한다 (날짜 ISO, 금액은 유한한 숫자, 글자는 길이 제한). 증빙 경로는 우리가 만든 모양만
const LEDGER_MAX = 2000;
const RECEIPT_PATH = /^receipts\/\d{4}\/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/;
const RECEIPT_TYPES: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const amount = (v: unknown, nullable = false) => {
  if (v == null || v === '') return nullable ? null : 0;
  const n = typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && Math.abs(n) < 1e13 ? Math.round(n * 100) / 100 : undefined;
};
const str = (v: unknown, max: number) => (v == null ? '' : typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : undefined);
function ledgerRow(r: unknown) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  const x = r as Record<string, unknown>;
  const date = day(x.date), item = str(x.item, 200), note = str(x.note, 300);
  const income = amount(x.income), expense = amount(x.expense), balance = amount(x.balance, true);
  if (!date || !Number.isFinite(Date.parse(date)) || item === undefined || note === undefined || income === undefined || expense === undefined || balance === undefined) return null;
  if ((income as number) < 0 || (expense as number) < 0) return null;
  const receipt = x.receipt == null || x.receipt === '' ? null : String(x.receipt);
  if (receipt && !RECEIPT_PATH.test(receipt)) return null;
  return { date, item, income, expense, balance, note, receipt };
}
// 파일 앞 몇 바이트로 종류를 확인한다 (확장자·MIME은 믿지 않는다)
function sniff(b: Uint8Array) {
  const h = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  if (h(0, 0x25, 0x50, 0x44, 0x46)) return 'pdf';
  if (h(0, 0xff, 0xd8, 0xff)) return 'jpg';
  if (h(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'png';
  if (h(0, 0x52, 0x49, 0x46, 0x46) && h(8, 0x57, 0x45, 0x42, 0x50)) return 'webp';
  return '';
}
async function ledgerLog(admin: DB, email: string, action: string, detail: Record<string, unknown> = {}) {
  await admin.from('ledger_log').insert({ admin_email: email, action, detail });
  // 최근 500건만 남긴다
  const { data } = await admin.from('ledger_log').select('id').order('id', { ascending: false }).range(499, 499);
  if (data && data[0]) await admin.from('ledger_log').delete().lt('id', data[0].id);
}
const ledgerLogList = async (admin: DB) => (await admin.from('ledger_log').select('created_at, admin_email, action, detail').order('id', { ascending: false }).limit(50)).data || [];
async function ledgerState(admin: DB) {
  const { data } = await admin.from('ops_state').select('value, updated_at, updated_by').eq('key', 'ledger').maybeSingle();
  const v = (data?.value || {}) as Record<string, unknown>;
  return { rows: Array.isArray(v.rows) ? v.rows : [], updated_at: data?.updated_at || null, updated_by: data?.updated_by || null, source_name: v.source_name || null };
}

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
      admin.from('ops_state').select('key, value, updated_at, updated_by').in('key', OPS_KEYS),   // 회계장부(ledger)는 ledger_get으로만
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

  if (/^(ledger_|receipt_)/.test(String(b.action || ''))) {
    // 회계장부: LEDGER_ADMINS가 있으면 그 사람만 (위의 MEMBER_ADMINS 확인은 이미 통과)
    const ledgerAdmins = (Deno.env.get('LEDGER_ADMINS') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const me = String(u.user.email || '').toLowerCase();
    if (ledgerAdmins.length && !ledgerAdmins.includes(me)) return json(403, { error: 'ledger_admin' });

    if (b.action === 'ledger_get' || b.action === 'ledger_export') {
      const l = await ledgerState(admin);
      await ledgerLog(admin, me, b.action === 'ledger_get' ? 'view' : 'download', { rows: l.rows.length });
      return json(200, { ok: true, ledger: l, log: await ledgerLogList(admin) });
    }
    if (b.action === 'ledger_save') {
      if (!Array.isArray(b.rows)) return json(400, { error: 'rows' });
      if (b.rows.length > LEDGER_MAX) return json(413, { error: 'too_many' });
      const rows = [];
      for (let i = 0; i < b.rows.length; i++) {
        const r = ledgerRow(b.rows[i]);
        if (!r) return json(400, { error: 'row', index: i });
        rows.push(r);
      }
      // 다른 사람이 그 사이에 저장했으면 덮어쓰지 않는다 (불러온 때의 updated_at과 비교)
      const cur = await ledgerState(admin);
      if (b.base !== undefined && (b.base || null) !== (cur.updated_at || null)) return json(409, { error: 'stale' });
      const source_name = str(b.source_name, 120) || null, now = new Date().toISOString();
      const { error } = await admin.from('ops_state').upsert({ key: 'ledger', value: { rows, source_name }, updated_at: now, updated_by: me });
      if (error) return json(500, { error: 'save' });
      await ledgerLog(admin, me, 'save', { rows: rows.length, before: cur.rows.length });
      return json(200, { ok: true, ledger: await ledgerState(admin), log: await ledgerLogList(admin) });
    }
    if (b.action === 'ledger_log_list') {
      await ledgerLog(admin, me, 'log_view');
      return json(200, { ok: true, log: await ledgerLogList(admin) });
    }
    if (b.action === 'receipt_upload') {
      // { index, date, item, data(base64) } → 파일을 올리고 그 줄에 경로를 붙여 저장
      const raw = String(b.data || '').replace(/^data:[^,]*,/, '');
      if (!raw || raw.length > Math.ceil(5 * 1024 * 1024 / 3) * 4 + 4) return json(413, { error: 'size' });
      let bytes: Uint8Array;
      try { bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)); } catch { return json(400, { error: 'data' }); }
      if (bytes.length > 5 * 1024 * 1024) return json(413, { error: 'size' });
      const ext = sniff(bytes);
      if (!ext) return json(400, { error: 'type' });
      const cur = await ledgerState(admin);
      const i = Math.trunc(Number(b.index));
      const row = cur.rows[i] as Record<string, unknown> | undefined;
      if (!row || row.date !== b.date || row.item !== b.item) return json(409, { error: 'stale' });
      const path = `receipts/${String(row.date).slice(0, 4)}/${crypto.randomUUID()}.${ext}`;
      const up = await admin.storage.from('ledger').upload(path, bytes, { contentType: RECEIPT_TYPES[ext], upsert: false });
      if (up.error) return json(500, { error: 'upload' });
      const old = row.receipt;
      const rows = cur.rows.slice();
      rows[i] = { ...row, receipt: path };
      const { error } = await admin.from('ops_state').upsert({ key: 'ledger', value: { rows, source_name: cur.source_name }, updated_at: new Date().toISOString(), updated_by: me });
      if (error) { await admin.storage.from('ledger').remove([path]); return json(500, { error: 'save' }); }
      if (typeof old === 'string' && RECEIPT_PATH.test(old)) await admin.storage.from('ledger').remove([old]);
      await ledgerLog(admin, me, 'upload_receipt', { index: i, type: ext, bytes: bytes.length });
      return json(200, { ok: true, ledger: await ledgerState(admin), log: await ledgerLogList(admin) });
    }
    if (b.action === 'receipt_url') {
      const path = String(b.path || '');
      if (!RECEIPT_PATH.test(path)) return json(400, { error: 'path' });
      const cur = await ledgerState(admin);
      if (!cur.rows.some((r) => (r as Record<string, unknown>)?.receipt === path)) return json(404, { error: 'no_receipt' });
      const { data, error } = await admin.storage.from('ledger').createSignedUrl(path, 60);
      if (error || !data?.signedUrl) return json(500, { error: 'sign' });
      await ledgerLog(admin, me, 'view_receipt', {});
      return json(200, { ok: true, url: data.signedUrl, expires_in: 60 });
    }
    return json(400, { error: 'action' });
  }

  if (b.action === 'card_list') {
    const { data, error } = await admin.from('member_cards').select(CARD_COLS).order('no');
    if (error) return json(500, { error: 'cards' });
    return json(200, { ok: true, secret: !!(await cardToken('x')), list: await Promise.all((data || []).map(withToken)) });
  }
  if (b.action === 'card_save') {
    const c = (b.card || {}) as Record<string, unknown>;
    const no = String(c.no || '').trim().toUpperCase(), name = String(c.name || '').trim().slice(0, 40);
    if (!CARD_NO.test(no)) return json(400, { error: 'no' });
    if (!name) return json(400, { error: 'name' });
    const photo = String(c.photo || '').trim();
    if (photo && !/^\/(?!\/)[A-Za-z0-9._\/-]{1,200}$/.test(photo)) return json(400, { error: 'photo' });
    const cohort = c.cohort === '' || c.cohort == null ? null : Math.trunc(+c.cohort);
    if (cohort != null && !(cohort > 0 && cohort < 1000)) return json(400, { error: 'cohort' });
    const row = {
      no, name, name_en: String(c.name_en || '').trim().slice(0, 60) || null, cohort,
      role: String(c.role || '').trim().slice(0, 60) || null, valid_from: day(c.valid_from), valid_to: day(c.valid_to), photo: photo || null,
    };
    if (row.valid_from && row.valid_to && row.valid_from > row.valid_to) return json(400, { error: 'dates' });
    const { data, error } = await admin.from('member_cards').upsert(row, { onConflict: 'no' }).select(CARD_COLS).single();
    return error ? json(500, { error: 'card_save' }) : json(200, { ok: true, card: await withToken(data) });
  }
  if (b.action === 'card_revoke') {
    const no = String(b.no || '');
    if (!CARD_NO.test(no)) return json(400, { error: 'no' });
    const { data, error } = await admin.from('member_cards').update({ revoked: b.revoked !== false }).eq('no', no).select(CARD_COLS).maybeSingle();
    if (error) return json(500, { error: 'card_revoke' });
    return data ? json(200, { ok: true, card: await withToken(data) }) : json(404, { error: 'no_card' });
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
        // 승인 안내 문구 (학회원·일반 같음)
        await solapiSend(phone, [
          `[R.F.S.] ${m.name || ''}님, 환영합니다.`,
          '',
          '회원가입이 승인되었습니다.',
          '',
          `아이디: ${id} · caurfs.kr`,
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
