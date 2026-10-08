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
//   FUND_FLOWS=YYYY-MM-DD:+금액,...   입금(+)/출금(-) 내역
//   FUND_EVERY=15                     장중 조회 간격(초)
// 실행: node --env-file=.env collect.mjs        한 번만: node --env-file=.env collect.mjs --once

const SB_URL = process.env.SUPABASE_URL || 'https://xyewclvpshldjucryapr.supabase.co';
const API = process.env.KIWOOM_API || (process.env.KIWOOM_MOCK === '1' ? 'https://mockapi.kiwoom.com' : 'https://api.kiwoom.com');
const { KIWOOM_APPKEY, KIWOOM_SECRETKEY, SUPABASE_SERVICE_ROLE_KEY: SB_KEY } = process.env;
const ONCE = process.argv.includes('--once');
const DRY = process.argv.includes('--dry');
const EVERY = Math.max(5, +(process.env.FUND_EVERY || 15)) * 1000;
const START = process.env.FUND_START || '';
const BASE = +(process.env.FUND_BASE || 0);
const FLOWS = (process.env.FUND_FLOWS || '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
  const [d, v] = x.split(':');
  return { d, v: +String(v).replace(/[,+\s]/g, '') };
});

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
      for (const m of xml.matchAll(/data="(\d{8})\|[^|]*\|[^|]*\|[^|]*\|([\d.]+)\|/g)) if (m[1] >= lim) { idxBase[code] = parseFloat(m[2]); break; }
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
    holdings: d.holdings.map((h) => ({ code: h.code, name: h.name, weight: h.weight, ret: h.ret, day: h.day })),
    history: d.history,
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
  const base = BASE || (prev && prev.baseTotal) || total;
  const baseDate = BASE ? (START || null) : ((prev && prev.baseDate) || today);
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
  const cash = Math.max(0, total - stock);
  const [kospi, kosdaq] = await Promise.all([indexRet('KOSPI', START || baseDate), indexRet('KOSDAQ', START || baseDate)]);
  const history = hist.filter((h) => h[0] !== today);
  const prevNav = history.length ? history[history.length - 1][1] : null;
  if (nav) history.push([today, +nav.toFixed(2), kospi && kospi.now, kosdaq && kosdaq.now]);
  const data = {
    asOf: stamp(), start: START || baseDate, baseTotal: base, baseDate, backfilledFrom: (prev && prev.backfilledFrom) || null,
    total, stock, cash, cashWeight: total ? cash / total * 100 : 0,
    nav: nav && +nav.toFixed(2), ret: nav ? nav / 1000 * 100 - 100 : n(head.tot_prft_rt),
    day: nav && prevNav ? (nav / prevNav - 1) * 100 : null,
    pl: n(head.tot_evlt_pl), plRet: n(head.tot_prft_rt),
    holdings, bm: { kospi, kosdaq }, history: history.slice(-400),
  };
  if (DRY) { console.log(JSON.stringify({ ...data, holdings: data.holdings.length + ' holdings' })); return; }
  await save(data);
  prev = data;
  if (round.publish) await savePublic(data);
  if (!round.lastLog || Date.now() - round.lastLog > 60e3) { round.lastLog = Date.now(); console.log(`${data.asOf} saved: ${holdings.length} holdings`); }
}

// ---------- 지난 기록 채우기 (일별 추정예탁자산, kt00002) ----------
// FUND_START부터 어제까지 날짜별 총자산으로 기준가를 거꾸로 만든다. 첫날 총자산 = 1,000 (입출금이 있으면 FUND_FLOWS 필요)
async function indexCloses(code) {
  const xml = await (await fetch(`https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=500&requestType=0`)).text();
  const m = {}; for (const x of xml.matchAll(/data="(\d{8})\|[^|]*\|[^|]*\|[^|]*\|([\d.]+)\|/g)) m[x[1]] = parseFloat(x[2]);
  return m;
}
async function backfill() {
  const s0 = START.replace(/-/g, ''), e0 = ymd().replace(/-/g, '');
  const items = []; let cont = '', next = '';
  for (let page = 0; page < 20; page++) {
    const h = { 'Content-Type': 'application/json;charset=UTF-8', 'api-id': 'kt00002', authorization: 'Bearer ' + (await token()) };
    if (cont === 'Y') { h['cont-yn'] = 'Y'; h['next-key'] = next; }
    const r = await fetch(API + '/api/dostk/acnt', { method: 'POST', headers: h, body: JSON.stringify({ start_dt: s0, end_dt: e0 }) });
    const j = await r.json();
    if (j.return_code !== undefined && +j.return_code !== 0) throw new Error('kt00002: ' + j.return_msg);
    const arr = Object.values(j).find((v) => Array.isArray(v)) || [];
    if (!page && arr[0]) console.log('kt00002 fields: ' + Object.keys(arr[0]).join(','));
    items.push(...arr);
    cont = r.headers.get('cont-yn') || ''; next = r.headers.get('next-key') || '';
    if (cont !== 'Y') break;
    await sleep(250);
  }
  const rows = items.map((it) => {
    const d = String(it.dt || it.trde_dt || Object.values(it).find((v) => /^\d{8}$/.test(String(v))) || '');
    const k = Object.keys(it).find((x) => /prsm_dpst_aset/.test(x)) || Object.keys(it).find((x) => /aset/.test(x));
    return { d, v: k ? n(it[k]) : 0 };
  }).filter((r) => /^\d{8}$/.test(r.d) && r.v > 0 && r.d >= s0 && r.d < e0).sort((a, b) => (a.d < b.d ? -1 : 1));
  if (!rows.length) { console.log('backfill: no daily asset rows'); return; }
  const [kc, qc] = await Promise.all([indexCloses('KOSPI'), indexCloses('KOSDAQ')]).catch(() => [{}, {}]);
  const base = rows[0].v;
  const fmt = (d) => d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8);
  const history = rows.map((r) => [fmt(r.d), +(r.v / base * 1000).toFixed(2), kc[r.d] || null, qc[r.d] || null]);
  prev = { ...(prev || {}), baseTotal: base, baseDate: fmt(rows[0].d), history, backfilledFrom: START };
  console.log(`backfill: ${history.length} days from ${history[0][0]}`);
}

// ---------- 실행 ----------
if (!DRY) prev = await loadPrev().catch(() => null);
// 시작일이 있는데 기록이 그보다 늦게 시작하면 지난 기록을 채운다 (시작 금액을 직접 넣은 경우는 제외)
if (START && !BASE && !(prev && prev.backfilledFrom === START)) {
  await backfill().catch((e) => console.error('backfill failed: ' + e.message));
}
if (ONCE || DRY) { round.publish = ONCE; await round(); process.exit(0); }
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
