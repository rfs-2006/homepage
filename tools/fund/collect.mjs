// RFS 펀드 실시간 수집기 (키움 REST API → Supabase)
// 고정 IP 국내 서버(네이버 클라우드 등)에서 상시 실행한다. 키움 REST API는 등록한 IP에서만 호출되므로 GitHub Actions에서는 쓸 수 없다.
// 앱키는 주문도 낼 수 있는 키라 이 서버의 .env에만 두고, Supabase에는 잔고 결과만 올린다.
//
// 환경 변수 (.env)
//   KIWOOM_APPKEY, KIWOOM_SECRETKEY   키움 REST API 앱키
//   KIWOOM_MOCK=1                     모의투자 서버 사용 (시험용)
//   SUPABASE_SERVICE_ROLE_KEY         Supabase service_role 키
//   FUND_START=YYYY-MM-DD             운용 시작일 (지수 비교 기준)
//   FUND_BASE=원                      시작 금액 (기준가 1,000 기준). 입출금이 있으면 FUND_FLOWS로 보정
//   FUND_FLOWS=YYYY-MM-DD:+금액,...   입금(+)/출금(-) 내역 (seed.json 마지막 날 이후 것만 쓴다)
// seed.json: 운용팀 AP 시트(국내+해외 당일손익)로 만든 날짜별 기준가 [[날짜, 기준가], ...]. 해외 잔고는 키움 API로 안 보여서
//   이 기간은 시트 값을 쓰고, 마지막 날 이후만 API 일별 자산으로 이어 붙인다. 금액은 넣지 않는다
//   FUND_EVERY=15                     장중 조회 간격(초)
//   TG_TOKEN, TG_CHAT                 매매 알림을 받을 텔레그램 봇 토큰과 대화 ID (TG_CHAT이 비어 있으면 시작할 때 찾아서 로그에 알려준다)
// 실행: node --env-file=.env collect.mjs        한 번만: node --env-file=.env collect.mjs --once

const SB_URL = process.env.SUPABASE_URL || 'https://xyewclvpshldjucryapr.supabase.co';
const API = process.env.KIWOOM_API || (process.env.KIWOOM_MOCK === '1' ? 'https://mockapi.kiwoom.com' : 'https://api.kiwoom.com');
const { KIWOOM_APPKEY, KIWOOM_SECRETKEY, SUPABASE_SERVICE_ROLE_KEY: SB_KEY } = process.env;
const ONCE = process.argv.includes('--once');
const DRY = process.argv.includes('--dry');
const EVERY = Math.max(5, +(process.env.FUND_EVERY || 15)) * 1000;
const START = process.env.FUND_START || '';
// 이미 들고 있던 종목의 편입일 (예: 005930:2026-08-04,062040:2026-08-12). 이후 새로 산 종목은 처음 보인 날로 자동 기록
const SINCE = Object.fromEntries((process.env.FUND_SINCE || '').split(',').map((x) => x.trim().split(':')).filter((x) => x.length === 2));
const BASE = +(process.env.FUND_BASE || 0);
import { readFileSync } from 'node:fs';
const SEED = (() => { try { return JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf8')); } catch { return []; } })();
const SEED_END = SEED.length ? SEED[SEED.length - 1][0] : '';
const FLOWS = (process.env.FUND_FLOWS || '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
  const [d, v] = x.split(':');
  return { d, v: +String(v).replace(/[,+\s]/g, '') };
}).filter((f) => !SEED_END || f.d > SEED_END);

for (const [k, v] of Object.entries({ KIWOOM_APPKEY, KIWOOM_SECRETKEY })) if (!v) { console.error('missing env ' + k); process.exit(1); }
if (!DRY && !SB_KEY) { console.error('missing env SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

// 키움 숫자는 "+000000012345" 같은 부호 포함 0 채움 문자열로 온다
const n = (s) => { const v = parseFloat(String(s ?? '').replace(/,/g, '')); return Number.isFinite(v) ? v : 0; };
const kst = () => new Date(Date.now() + 9 * 3600e3);
const ymd = () => kst().toISOString().slice(0, 10);
const stamp = () => kst().toISOString().slice(0, 19).replace('T', ' ');
const hm = () => { const k = kst(); return k.getUTCHours() * 60 + k.getUTCMinutes(); };
const weekday = () => { const d = kst().getUTCDay(); return d >= 1 && d <= 5; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 토큰 (au10001) ----------
let tok = null, tokExp = 0;
async function token() {
  if (tok && Date.now() < tokExp - 10 * 60e3) return tok;
  const r = await fetch(API + '/oauth2/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify({ grant_type: 'client_credentials', appkey: KIWOOM_APPKEY, secretkey: KIWOOM_SECRETKEY }),
  });
  const j = await r.json();
  if (!j.token) throw new Error('token failed: ' + (j.return_msg || r.status));
  tok = j.token;
  // expires_dt: "20241107083713" (KST)
  const e = String(j.expires_dt || '');
  tokExp = e.length === 14 ? Date.UTC(+e.slice(0, 4), +e.slice(4, 6) - 1, +e.slice(6, 8), +e.slice(8, 10) - 9, +e.slice(10, 12), +e.slice(12, 14)) : Date.now() + 6 * 3600e3;
  return tok;
}

// ---------- 계좌평가잔고내역 (kt00018), 연속조회 포함 ----------
async function balance() {
  let head = null; const rows = []; let cont = '', next = '';
  for (let page = 0; page < 20; page++) {
    const h = { 'Content-Type': 'application/json;charset=UTF-8', 'api-id': 'kt00018', authorization: 'Bearer ' + (await token()) };
    if (cont === 'Y') { h['cont-yn'] = 'Y'; h['next-key'] = next; }
    const r = await fetch(API + '/api/dostk/acnt', { method: 'POST', headers: h, body: JSON.stringify({ qry_tp: '1', dmst_stex_tp: 'KRX' }) });
    const j = await r.json();
    if (j.return_code !== undefined && +j.return_code !== 0) throw new Error('kt00018: ' + j.return_msg);
    head = head || j;
    rows.push(...(j.acnt_evlt_remn_indv_tot || []));
    cont = r.headers.get('cont-yn') || ''; next = r.headers.get('next-key') || '';
    if (cont !== 'Y') break;
    await sleep(250);
  }
  return { head, rows };
}

// ---------- 지수 (네이버 금융 공개 시세) ----------
const idxBase = {};
async function indexRet(code, start) {
  try {
    if (start && !idxBase[code]) {
      const xml = await (await fetch(`https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=500&requestType=0`)).text();
      const lim = start.replace(/-/g, '');
      for (const m of xml.matchAll(/data="(\d{8})\|[^|]*\|[^|]*\|[^|]*\|([\d.]+)\|/g)) {
        if (BASE ? m[1] < lim : m[1] >= lim) idxBase[code] = parseFloat(m[2]);
        if (!BASE && m[1] >= lim) break;
      }
    }
    const j = await (await fetch(`https://m.stock.naver.com/api/index/${code}/basic`)).json();
    const now = n(j.closePrice), day = n(j.fluctuationsRatio);
    return { now, day, ret: idxBase[code] ? (now / idxBase[code] - 1) * 100 : null };
  } catch { return null; }
}

// ---------- Supabase ----------
const sbH = () => ({ apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' });
async function loadPrev() {
  const r = await fetch(SB_URL + '/rest/v1/intranet_content?id=eq.fund_live&select=data', { headers: sbH() });
  if (!r.ok) throw new Error('supabase read ' + r.status);
  const j = await r.json();
  return (j[0] && j[0].data) || null;
}
async function save(data, table = 'intranet_content', id = 'fund_live') {
  const r = await fetch(SB_URL + '/rest/v1/' + table, {
    method: 'POST', headers: { ...sbH(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id, data }),
  });
  if (!r.ok) throw new Error('supabase write ' + table + ' ' + r.status + ' ' + (await r.text()));
}

// 외부 공개용: 장 마감 확정치만, 금액·수량·평단은 빼고 비율만 (public_content 테이블, 누구나 읽기)
async function savePublic(d) {
  const pub = {
    asOf: d.asOf.slice(0, 10), start: d.start, nav: d.nav, ret: d.ret, day: d.day, cashWeight: d.cashWeight,
    bm: { kospi: d.bm.kospi && { ret: d.bm.kospi.ret, day: d.bm.kospi.day }, kosdaq: d.bm.kosdaq && { ret: d.bm.kosdaq.ret, day: d.bm.kosdaq.day } },
    holdings: d.holdings.map((h) => ({ code: h.code, name: h.name, weight: h.weight, ret: h.ret, day: h.day, since: h.since })),
    history: d.history, weeks: d.weeks || [],
  };
  try { await save(pub, 'public_content', 'fund'); console.log(d.asOf + ' public snapshot saved'); }
  catch (e) { console.error('public snapshot skipped: ' + e.message.split('\n')[0]); }
}

// ---------- 한 번 조회 ----------
let prev = null;
async function round() {
  const { head, rows } = await balance();
  const total = n(head.prsm_dpst_aset_amt) || n(head.tot_evlt_amt); // 추정예탁자산 = 주식 평가 + 예수금
  const stock = n(head.tot_evlt_amt);
  const today = ymd();
  // 기준가: 시작 금액 1,000 기준, 입출금은 그날 기준가로 좌수를 늘리거나 줄인다
  // FUND_BASE가 없으면 처음 기록한 날의 총자산을 기준가 1,000으로 잡는다 (그날부터의 성과)
  const base = (SEED_END ? 0 : BASE) || (prev && prev.baseTotal) || total;
  const baseDate = SEED_END ? SEED[0][0] : BASE ? (START || null) : ((prev && prev.baseDate) || today);
  let units = base / 1000;
  const hist = (prev && prev.history) || [];
  if (units) for (const f of FLOWS) {
    const ref = hist.filter((h) => h[0] < f.d).pop();
    const navAt = ref ? ref[1] : 1000;
    units += f.v / navAt;
  }
  const nav = units ? total / units : null;
  const holdings = rows.map((r) => {
    const evlt = n(r.evlt_amt) || n(r.cur_prc) * n(r.rmnd_qty);
    const cur = Math.abs(n(r.cur_prc)), prevClose = Math.abs(n(r.pred_close_pric));
    return {
      code: String(r.stk_cd || '').replace(/^A/, ''), name: String(r.stk_nm || '').trim(),
      qty: n(r.rmnd_qty), avg: n(r.pur_pric), cur, evlt, pl: n(r.evltv_prft), ret: n(r.prft_rt),
      weight: total ? evlt / total * 100 : n(r.poss_rt),
      day: prevClose ? (cur / prevClose - 1) * 100 : null,
      dayPl: prevClose ? n(r.rmnd_qty) * (cur - prevClose) : null,
    };
  }).filter((h) => h.qty > 0).sort((a, b) => b.evlt - a.evlt);
  const prevSince = (prev && prev.since) || {};
  const since = {};
  holdings.forEach((h) => { h.since = SINCE[h.code] || prevSince[h.code] || today; since[h.code] = h.since; });
  const cash = Math.max(0, total - stock);
  const [kospi, kosdaq] = await Promise.all([indexRet('KOSPI', START || baseDate), indexRet('KOSDAQ', START || baseDate)]);
  const wk = (d) => { const x = new Date(d + 'T00:00:00Z').getUTCDay(); return x !== 0 && x !== 6; };
  const history = hist.filter((h) => h[0] !== today && wk(h[0]));
  const prevNav = history.length ? history[history.length - 1][1] : null;
  if (nav) history.push([today, +nav.toFixed(2), kospi && kospi.now, kosdaq && kosdaq.now]);
  // 주별 비중 기록: 그 주 월요일을 키로, 그 주 마지막 조회(금요일 마감 뒤에는 금요일 확정치)의 종목 비중과 현금 비중. 금액·수량은 넣지 않는다
  const monday = (() => { const d = new Date(today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); })();
  const snap = { week: monday, asOf: today, cash: total ? +(cash / total * 100).toFixed(2) : 0, h: holdings.map((h) => [h.code, h.name, +h.weight.toFixed(2)]) };
  const weeks = (((prev && prev.weeks) || []).filter((x) => x.week !== monday)).concat(nav ? [snap] : []).slice(-104);
  const data = {
    asOf: stamp(), start: START || baseDate, baseTotal: base, baseDate, backfilledFrom: (prev && prev.backfilledFrom) || null,
    total, stock, cash, cashWeight: total ? cash / total * 100 : 0,
    nav: nav && +nav.toFixed(2), ret: nav ? nav / 1000 * 100 - 100 : n(head.tot_prft_rt),
    day: nav && prevNav ? (nav / prevNav - 1) * 100 : null,
    pl: n(head.tot_evlt_pl), plRet: n(head.tot_prft_rt),
    holdings, since, bm: { kospi, kosdaq }, history: history.slice(-400), weeks,
  };
  if (DRY) { console.log(JSON.stringify({ ...data, holdings: data.holdings.length + ' holdings' })); return; }
  await save(data);
  // 홈페이지 FUND 페이지는 로그인 없이 public_content에서 읽는다. 금액·수량·평단·총자산은 빼고 비중·비율만 올린다
  const prevTotal = data.day !== null && data.day !== undefined ? total / (1 + data.day / 100) : null;
  const pubLive = {
    asOf: data.asOf, start: data.start, baseDate: data.baseDate, backfilledFrom: data.backfilledFrom,
    cashWeight: data.cashWeight, nav: data.nav, ret: data.ret, day: data.day, since: data.since, bm: data.bm, history: data.history, weeks: data.weeks,
    holdings: holdings.map((h) => ({ code: h.code, name: h.name, weight: h.weight, ret: h.ret, day: h.day, cur: h.cur, since: h.since,
      ctb: prevTotal && h.dayPl !== null && h.dayPl !== undefined ? h.dayPl / prevTotal * 100 : null })),
  };
  await save(pubLive, 'public_content', 'fund_live').catch((e) => console.error('public live skipped: ' + e.message.split('\n')[0]));
  await tradeAlert(holdings, total, data.asOf).catch((e) => console.error('telegram skipped: ' + e.message));
  prev = data;
  if (round.publish) await savePublic(data);
  if (!round.lastLog || Date.now() - round.lastLog > 60e3) { round.lastLog = Date.now(); console.log(`${data.asOf} saved: ${holdings.length} holdings`); }
}

// ---------- 매매 알림 (텔레그램, 운용자 한 명에게만) ----------
// 직전 조회와 보유 수량이 달라지면 알린다. 잔고 조회가 잠깐 이상하게 오는 경우를 걸러내려고 같은 변화가 두 번 연속 보일 때만 보낸다.
const TG_TOKEN = process.env.TG_TOKEN || '', TG_CHAT = process.env.TG_CHAT || '';
const won = (v) => Math.round(v).toLocaleString('ko-KR') + '원';
let lastQty = null, pendingKey = '';
async function tg(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: TG_CHAT, text }) });
  if (!r.ok) throw new Error('telegram ' + r.status);
}
async function tradeAlert(holdings, total, asOf) {
  if (!TG_TOKEN || !TG_CHAT) return;
  const now = {}; holdings.forEach((h) => { now[h.code] = h; });
  if (!lastQty) { lastQty = Object.fromEntries(holdings.map((h) => [h.code, { qty: h.qty, name: h.name, cur: h.cur, avg: h.avg }])); return; }
  if (!holdings.length && Object.keys(lastQty).length > 1) return; // 잔고가 통째로 비어 오면 조회 오류로 본다
  const changes = [];
  for (const code of new Set([...Object.keys(lastQty), ...Object.keys(now)])) {
    const a = lastQty[code] ? lastQty[code].qty : 0, b = now[code] ? now[code].qty : 0;
    if (a !== b) changes.push({ code, a, b });
  }
  const key = changes.map((c) => c.code + ':' + c.a + '>' + c.b).join(',');
  if (!changes.length) { pendingKey = ''; return; }
  if (key !== pendingKey) { pendingKey = key; return; } // 다음 조회에서 같은 변화가 또 보이면 확정
  pendingKey = '';
  const lines = changes.map(({ code, a, b }) => {
    const h = now[code], o = lastQty[code] || {};
    const name = (h && h.name) || o.name || code, d = b - a;
    const tag = a === 0 ? '🆕 신규 매수' : b === 0 ? '🔴 전량 매도' : d > 0 ? '🟢 매수' : '🔴 매도';
    const px = h ? h.cur : o.cur;
    return [
      `${tag} · ${name}`,
      `  수량 ${d > 0 ? '+' : ''}${d.toLocaleString('ko-KR')}주 (${a.toLocaleString('ko-KR')} → ${b.toLocaleString('ko-KR')}주)`,
      `  현재가 ${px ? won(px) : '-'}` + (h && h.avg ? ` · 평단 ${won(h.avg)}` : ''),
      `  비중 ${h ? h.weight.toFixed(2) + '%' : '0%'}` + (px ? ` · 거래 약 ${won(Math.abs(d) * px)}` : ''),
    ].join('\n');
  });
  await tg(`[AMT Fund 매매] ${asOf}\n\n` + lines.join('\n\n') + `\n\n총자산 ${won(total)}`);
  lastQty = Object.fromEntries(holdings.map((h) => [h.code, { qty: h.qty, name: h.name, cur: h.cur, avg: h.avg }]));
  console.log(`${asOf} trade alert: ${changes.length} change(s)`);
}
// TG_CHAT을 모를 때: 봇에게 아무 말이나 보낸 뒤 서버를 재시작하면 로그에 대화 ID가 찍힌다
async function tgFindChat() {
  if (!TG_TOKEN || TG_CHAT) return;
  try {
    const j = await (await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getUpdates`)).json();
    const ids = [...new Set((j.result || []).map((u) => u.message && u.message.chat && u.message.chat.id).filter(Boolean))];
    console.log(ids.length ? 'telegram chat id: ' + ids.join(', ') + '  → .env에 TG_CHAT=' + ids[0] + ' 를 넣고 재시작' : 'telegram: 봇에게 먼저 아무 메시지나 보낸 뒤 재시작하세요');
  } catch (e) { console.error('telegram setup failed: ' + e.message); }
}

const BF_KEY = START + '/5:' + SEED_END + ':' + FLOWS.map((f) => f.d + f.v).join(','); // 채우는 방식이 바뀌면 숫자를 올려 다시 채운다

// ---------- 지난 기록 채우기 (일별 추정예탁자산, kt00002) ----------
// FUND_START부터 어제까지 날짜별 총자산으로 기준가를 거꾸로 만든다. 첫날 총자산 = 1,000 (입출금이 있으면 FUND_FLOWS 필요)
async function indexCloses(code) {
  const xml = await (await fetch(`https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=500&requestType=0`)).text();
  const m = {}; for (const x of xml.matchAll(/data="(\d{8})\|[^|]*\|[^|]*\|[^|]*\|([\d.]+)\|/g)) m[x[1]] = parseFloat(x[2]);
  return m;
}
// 한 구간 조회 (연속조회 포함)
async function dailyAssets(sd, ed) {
  const out = []; let cont = '', next = '';
  for (let page = 0; page < 20; page++) {
    const h = { 'Content-Type': 'application/json;charset=UTF-8', 'api-id': 'kt00002', authorization: 'Bearer ' + (await token()) };
    if (cont === 'Y') { h['cont-yn'] = 'Y'; h['next-key'] = next; }
    const r = await fetch(API + '/api/dostk/acnt', { method: 'POST', headers: h, body: JSON.stringify({ start_dt: sd, end_dt: ed }) });
    const j = await r.json();
    if (j.return_code !== undefined && +j.return_code !== 0) throw new Error(j.return_msg || ('code ' + j.return_code));
    const arr = Object.values(j).find((v) => Array.isArray(v)) || [];
    if (!dailyAssets.logged && arr[0]) { dailyAssets.logged = true; console.log('kt00002 fields: ' + Object.keys(arr[0]).join(',')); }
    out.push(...arr);
    cont = r.headers.get('cont-yn') || ''; next = r.headers.get('next-key') || '';
    if (cont !== 'Y') break;
    await sleep(250);
  }
  return out;
}
async function backfill() {
  const s0 = START.replace(/-/g, ''), e0 = ymd().replace(/-/g, '');
  // 기간이 길면 거부될 수 있어 한 달씩 나눠 받고, 실패한 달은 건너뛴다
  const items = [];
  let cur = new Date(+s0.slice(0, 4), +s0.slice(4, 6) - 1, +s0.slice(6, 8));
  const end = new Date(+e0.slice(0, 4), +e0.slice(4, 6) - 1, +e0.slice(6, 8));
  const f8 = (d) => d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  while (cur <= end) {
    const me = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const sd = f8(cur), ed = f8(me < end ? me : end);
    try { const got = await dailyAssets(sd, ed); items.push(...got); console.log(`backfill ${sd}~${ed}: ${got.length} rows`); }
    catch (e) { console.error(`backfill ${sd}~${ed} failed: ${e.message}`); }
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    await sleep(300);
  }
  const rows = items.map((it) => {
    const d = String(it.dt || it.trde_dt || Object.values(it).find((v) => /^\d{8}$/.test(String(v))) || '');
    const k = Object.keys(it).find((x) => /prsm_dpst_aset/.test(x)) || Object.keys(it).find((x) => /aset/.test(x));
    return { d, v: k ? n(it[k]) : 0 };
  }).filter((r) => /^\d{8}$/.test(r.d) && r.v > 0 && r.d >= s0 && r.d < e0).sort((a, b) => (a.d < b.d ? -1 : 1));
  console.log(`backfill: kt00002 ${items.length} rows, ${rows.length} usable from ${rows[0] ? rows[0].d : '-'}`);
  if (!rows.length) { console.log('backfill: no daily asset rows'); return; }
  const [kc, qc] = await Promise.all([indexCloses('KOSPI'), indexCloses('KOSDAQ')]).catch(() => [{}, {}]);
  // 주말·휴장일은 빼고 거래일만 (지수 종가가 있는 날, 지수를 못 받으면 평일)
  const hasIdx = Object.keys(kc).length > 0;
  const trading = (d) => (hasIdx ? !!kc[d] : ![0, 6].includes(new Date(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8)).getDay()));
  for (let i = rows.length - 1; i >= 0; i--) if (!trading(rows[i].d)) rows.splice(i, 1);
  if (!rows.length) { console.log('backfill: no trading-day rows'); return; }
  // 시작 금액(FUND_BASE)이 있으면 시작일 직전을 1,000으로, 없으면 첫 기록일 총자산을 1,000으로
  const fmt = (d) => d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8);
  if (SEED_END) {
    // 시트 기간은 시트 기준가 그대로, 그 뒤는 마지막 날 API 자산을 시트 기준가에 맞춰 좌수를 정하고 이어 붙인다
    const key = (d) => d.replace(/-/g, '');
    const history = SEED.filter(([d]) => trading(key(d))).map(([d, v]) => [d, v, kc[key(d)] || null, qc[key(d)] || null]);
    const anchor = rows.filter((r) => fmt(r.d) <= SEED_END).pop();
    const seedAt = anchor && SEED.filter(([d]) => d <= fmt(anchor.d)).pop();
    if (!anchor || !seedAt) { console.log('backfill: no API row on or before seed end'); return; }
    const units0 = anchor.v / seedAt[1]; let units = units0, navPrev = SEED[SEED.length - 1][1]; const done = new Set();
    for (const r of rows) {
      const day = fmt(r.d); if (day <= SEED_END) continue;
      FLOWS.forEach((f, i) => { if (!done.has(i) && f.d <= day) { units += f.v / navPrev; done.add(i); } });
      const nav = r.v / units; navPrev = nav;
      history.push([day, +nav.toFixed(2), kc[r.d] || null, qc[r.d] || null]);
    }
    prev = { ...(prev || {}), baseTotal: units0 * 1000, baseDate: SEED[0][0], history, backfilledFrom: BF_KEY };
    console.log(`backfill: seed ${SEED[0][0]}~${SEED_END} + ${history.length} days`);
    return;
  }
  const base = BASE || rows[0].v;
  // 입출금(FUND_FLOWS)은 그 전날 기준가로 좌수를 늘리거나 줄여서 수익률에 섞이지 않게 한다
  let units = base / 1000, navPrev = 1000; const done = new Set();
  const history = rows.map((r) => {
    const day = fmt(r.d);
    FLOWS.forEach((f, i) => { if (!done.has(i) && f.d <= day) { units += f.v / navPrev; done.add(i); } });
    const nav = units > 0 ? r.v / units : 0; navPrev = nav || navPrev;
    return [day, +nav.toFixed(2), kc[r.d] || null, qc[r.d] || null];
  });
  if (BASE) {
    const before = Object.keys(kc).filter((d) => d < s0).sort().pop();
    if (before) history.unshift([fmt(before), 1000, kc[before] || null, qc[before] || null]);
  }
  prev = { ...(prev || {}), baseTotal: base, baseDate: BASE ? START : fmt(rows[0].d), history, backfilledFrom: BF_KEY };
  console.log(`backfill: ${history.length} days from ${history[0][0]}`);
}

// ---------- 실행 ----------
if (!DRY) prev = await loadPrev().catch(() => null);
await tgFindChat();
if (TG_TOKEN && TG_CHAT && !DRY && !ONCE) await tg('AMT Fund 매매 알림이 켜졌습니다.').catch((e) => console.error('telegram test failed: ' + e.message));
// 시작일이 있으면 한 번, 시작일부터 어제까지 지난 기록을 채운다
if (START && !(prev && prev.backfilledFrom === BF_KEY)) {
  await backfill().catch((e) => console.error('backfill failed: ' + e.message));
}
if (ONCE || DRY) { round.publish = ONCE; await round(); process.exit(0); }
// 켜질 때 한 번 바로 저장한다 (주말·장 마감 뒤에 재시작해도 다시 채운 기록과 공개분이 바로 올라가게)
round.publish = true; await round().catch((e) => console.error(stamp() + ' ' + e.message)); round.publish = false;
let closedDone = '';
for (;;) {
  const t0 = Date.now();
  const open = weekday() && hm() >= 535 && hm() <= 940; // 08:55~15:40
  try {
    if (open) await round();
    else if (weekday() && hm() > 940 && closedDone !== ymd()) { round.publish = true; await round(); round.publish = false; closedDone = ymd(); } // 마감 후 확정치 1회 + 외부 공개분
  } catch (e) { console.error(stamp() + ' ' + e.message); }
  await sleep(open ? Math.max(1000, EVERY - (Date.now() - t0)) : 60e3);
}
