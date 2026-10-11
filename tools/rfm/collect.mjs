// 타임폴리오 RFM(Road To Fund Manager) 학회원 순위 수집기
// 타임폴리오 허가 범위(조회·CSV 다운로드, 학회 내부 공개)에서만 실행한다. 일정은 .github/workflows/rfm.yml
// 일반 사용자와 같은 화면 조작(로그인 → 대회 → 수익률 순위 → CSV 다운로드)만 사용하고 API는 호출하지 않는다.
// 결과는 Supabase intranet_content 의 id='rfm' 행에 저장되며, 홈페이지 #rfm 에서 학회원 로그인 후 본다.
//
// 환경 변수 (GitHub Actions Secrets)
//   TF_EMAIL, TF_PASSWORD        타임폴리오 계정
//   SUPABASE_SERVICE_ROLE_KEY    Supabase service_role 키
//   RFM_MEMBERS                  한 줄에 "이름,별칭" (쉼표·탭·콜론 구분)
// 로그에는 학회원 정보를 남기지 않는다.

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const SB_URL = process.env.SUPABASE_URL || 'https://xyewclvpshldjucryapr.supabase.co';
const BASE = 'https://contest.timefolio.net';
const { TF_EMAIL, TF_PASSWORD, SUPABASE_SERVICE_ROLE_KEY: SB_KEY, RFM_MEMBERS } = process.env;
const DRY = process.argv.includes('--dry');          // Supabase에 쓰지 않고 요약만 출력
const CSV_FILE = (process.argv.find((a) => a.startsWith('--csv=')) || '').slice(6); // 로컬 CSV로 파싱만 시험

const need = (k, v) => { if (!v) { console.error('missing env ' + k); process.exit(1); } };
need('RFM_MEMBERS', RFM_MEMBERS);
if (!CSV_FILE) { need('TF_EMAIL', TF_EMAIL); need('TF_PASSWORD', TF_PASSWORD); }
if (!DRY) need('SUPABASE_SERVICE_ROLE_KEY', SB_KEY);

const norm = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();
// 실명은 Supabase에 올리지 않는다. 한 줄이 "이름,별칭"이면 별칭만, 별칭만 있어도 된다.
const members = RFM_MEMBERS.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
  const parts = l.split(/[,\t:]/).map((x) => x.trim());
  return { nick: parts.length > 1 ? parts.slice(1).join(',') : parts[0] };
}).filter((m) => m.nick);

// ---------- CSV ----------
function decode(buf) {
  const u = new TextDecoder('utf-8').decode(buf);
  if (!u.includes('�')) return u.replace(/^﻿/, '');
  return new TextDecoder('euc-kr').decode(buf);
}

function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

const num = (s) => {
  const m = String(s || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};
// "7↑" "6↓" "-" "▲3" 등 순위 등락: 양수 = 순위 상승
const rankMove = (s) => {
  const t = String(s || '');
  const n = num(t);
  if (n === null) return 0;
  if (/[↓▼]/.test(t) || n < 0) return -Math.abs(n);
  return Math.abs(n);
};

// 헤더 이름이 바뀌어도 동작하도록 키워드로 열을 찾는다. 같은 키워드가 두 번이면 [현재, 등락] 순서.
function mapColumns(header) {
  const h = header.map((x) => norm(x));
  const all = (re) => h.map((x, i) => (re.test(x) ? i : -1)).filter((i) => i >= 0);
  const pick = (re, k = 0) => all(re)[k] ?? -1;
  const col = {
    nick: pick(/별칭|닉네임|nickname|alias/),
    rank: pick(/순위|rank/), rankChg: pick(/순위/, 1),
    nav: pick(/기준가|nav/), navChg: pick(/기준가/, 1),
    weight: pick(/편입/), count: pick(/종목수|종목/),
  };
  // "순위(현재)" "순위(등락)" 처럼 명시돼 있으면 그쪽을 따른다
  const chg = (re) => h.findIndex((x) => re.test(x) && /등락|변동|change|chg/.test(x));
  if (chg(/순위/) >= 0) { col.rankChg = chg(/순위/); col.rank = h.findIndex((x, i) => /순위/.test(x) && i !== col.rankChg); }
  if (chg(/기준가/) >= 0) { col.navChg = chg(/기준가/); col.nav = h.findIndex((x, i) => /기준가/.test(x) && i !== col.navChg); }
  // 묶음 헤더 없이 "현재,등락,별칭,현재,등락,..."만 온 경우: 별칭 앞이 순위, 뒤가 기준가
  if (col.nav < 0 && col.nick >= 0) {
    const cur = all(/현재/), chg = all(/등락/);
    const before = (a) => a.filter((i) => i < col.nick), after = (a) => a.filter((i) => i > col.nick);
    if (col.rank < 0 && before(cur).length) col.rank = before(cur)[0];
    if (col.rankChg < 0 && before(chg).length) col.rankChg = before(chg)[0];
    if (after(cur).length) col.nav = after(cur)[0];
    if (col.navChg < 0 && after(chg).length) col.navChg = after(chg)[0];
  }
  return col;
}

function rowsFromCsv(text) {
  const rows = parseCsv(text);
  const hi = rows.findIndex((r) => r.some((x) => /별칭|닉네임/.test(x)));
  if (hi < 0) throw new Error('CSV header not recognized: ' + JSON.stringify(rows[0]));
  // 두 줄 헤더(순위 / 현재·등락)인 경우 위아래를 합친다
  let header = rows[hi];
  let start = hi + 1;
  const next = rows[hi + 1] || [];
  if (next.some((x) => /현재|등락/.test(x)) && !next.some((x) => num(x) !== null && /\d{3}/.test(x))) {
    let last = '';
    header = header.map((x, i) => { if (x.trim()) last = x; return (x.trim() ? x : last) + (next[i] || ''); });
    start = hi + 2;
  }
  const col = mapColumns(header);
  if (col.nick < 0 || col.nav < 0) throw new Error('CSV columns not found: ' + JSON.stringify(header));
  return rows.slice(start).map((r) => ({
    nick: (r[col.nick] || '').trim(),
    rank: col.rank >= 0 ? num(r[col.rank]) : null,
    rankChg: col.rankChg >= 0 ? rankMove(r[col.rankChg]) : 0,
    nav: num(r[col.nav]),
    navChg: col.navChg >= 0 ? num(r[col.navChg]) : null,
    weight: col.weight >= 0 ? num(r[col.weight]) : null,
    count: col.count >= 0 ? num(r[col.count]) : null,
  })).filter((r) => r.nick && r.nav !== null);
}

// ---------- 브라우저 ----------
// CSV 다운로드는 사이트가 브라우저 안에서 파일을 만들어 내려준다. 저장 이벤트가 안 잡히는 경우를 대비해
// 만들어지는 내용을 페이지 안에서 함께 받아 둔다.
const CAPTURE = () => {
  window.__rfmCsv = []; window.__rfmSeen = [];
  // 별칭 헤더가 있거나 쉼표로 된 줄이 많은 텍스트를 CSV로 본다. 진단용으로 첫 줄(헤더)만 따로 남긴다
  const keep = (t) => {
    if (typeof t !== 'string') return;
    const first = t.replace(/^\uFEFF/, '').split(/\r?\n/)[0].slice(0, 80);
    window.__rfmSeen.push(first);
    if (t.includes('별칭') || (t.split('\n').length > 50 && first.split(',').length >= 5)) window.__rfmCsv.push(t);
  };
  const oc = URL.createObjectURL;
  URL.createObjectURL = function (b) { try { if (b instanceof Blob && b.size < 5e6) b.text().then(keep); } catch (e) {} return oc.apply(this, arguments); };
  const ac = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    try { if (this.href && this.href.startsWith('data:')) { const d = this.href.slice(this.href.indexOf(',') + 1); keep(/;base64/.test(this.href.slice(0, this.href.indexOf(','))) ? new TextDecoder().decode(Uint8Array.from(atob(d), (c) => c.charCodeAt(0))) : decodeURIComponent(d)); } } catch (e) {}
    return ac.apply(this, arguments);
  };
  const ad = HTMLAnchorElement.prototype.dispatchEvent;
  HTMLAnchorElement.prototype.dispatchEvent = function (ev) {
    try { if (ev && ev.type === 'click' && this.href && this.href.startsWith('data:')) { const d = this.href.slice(this.href.indexOf(',') + 1); keep(decodeURIComponent(d)); } } catch (e) {}
    return ad.apply(this, arguments);
  };
  window.showSaveFilePicker = async () => ({ createWritable: async () => { const parts = []; return { write: async (d) => { parts.push(d); }, close: async () => { keep(await new Blob(parts).text()); } }; } });
};

async function login(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const email = page.locator('#email');
  if (!(await email.isVisible().catch(() => false))) {
    const btn = page.getByText(/로그인|Login|Sign in/i).first();
    if (await btn.isVisible().catch(() => false)) await btn.click();
  }
  await email.waitFor();
  await email.fill(TF_EMAIL);
  await page.locator('#password').fill(TF_PASSWORD);
  await page.getByRole('button', { name: /submit|로그인|login/i }).first().click();
  await page.waitForFunction(() => !document.querySelector('#password'), null, { timeout: 30000 })
    .catch(() => { throw new Error('login failed (password field still visible)'); });
}

async function openRanking(page) {
  await page.goto(BASE + '/Contest', { waitUntil: 'domcontentloaded' });
  if (await page.locator('#password').isVisible().catch(() => false)) { await login(page); await page.goto(BASE + '/Contest', { waitUntil: 'domcontentloaded' }); }
  await page.getByText('수익률 순위', { exact: false }).first().click();
  await page.getByText('CSV 다운로드', { exact: false }).first().waitFor();
  await page.waitForTimeout(1500);
}

let cut50 = null;     // 전체 50위 기준가
let csvBroken = false; // 한 번 실패하면 이후 반복에서는 바로 검색 방식으로 간다
async function grabCsv(page) {
  await page.evaluate(() => { window.__rfmCsv = []; window.__rfmSeen = []; });
  const roleBtn = page.getByRole('button', { name: /CSV 다운로드/ }).first();
  const btn = (await roleBtn.count()) ? roleBtn : page.getByText('CSV 다운로드', { exact: false }).first();
  const dl = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await btn.click();
  const t0 = Date.now();
  while (Date.now() - t0 < 20000) {
    const got = await page.evaluate(() => (window.__rfmCsv || [])[0] || null);
    if (got) return got;
    const d = await Promise.race([dl, page.waitForTimeout(500).then(() => undefined)]);
    if (d) {
      const chunks = []; for await (const c of await d.createReadStream()) chunks.push(c);
      return decode(Buffer.concat(chunks));
    }
    if (d === null) break;
  }
  const seen = await page.evaluate(() => window.__rfmSeen || []).catch(() => []);
  console.log('csv capture failed; blobs seen: ' + seen.length); // 공개 저장소라 로그에 내용은 남기지 않는다
  return null;
}

// CSV가 안 될 때: 표 검색창에 별칭을 하나씩 넣어 보이는 행을 읽는다 (열 순서: 순위 현재·등락, 별칭, 기준가 현재·등락, 편입비, 종목수)
async function grabBySearch(page) {
  const box = page.getByPlaceholder(/search/i).first();
  const lines = ['순위현재,순위등락,별칭,기준가현재,기준가등락,편입비,종목수'];
  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  // 검색 전 첫 화면(순위순)에서 50위 기준가를 읽어 둔다 (포트폴리오 공개선)
  await box.fill('');
  await page.waitForTimeout(300);
  const first = await page.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim())));
  const r50 = first.find((c) => c.length >= 7 && num(c[0]) === 50);
  if (r50) cut50 = num(r50[3]);
  for (const m of members) {
    await box.fill(m.nick);
    // 표가 해당 별칭으로 걸러질 때까지 최대 2초 기다린다
    let hit = null;
    for (let t = 0; t < 20 && !hit; t++) {
      await page.waitForTimeout(100);
      const rows = await page.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim())));
      hit = rows.find((c) => c.length >= 7 && norm(c[2]) === norm(m.nick)) || null;
    }
    if (hit) lines.push(hit.slice(0, 7).map(q).join(','));
  }
  await box.fill('');
  return lines.join('\n');
}

async function snapshot(page) {
  await openRanking(page);
  let text = csvBroken ? null : await grabCsv(page);
  let via = 'csv';
  if (!text) { csvBroken = true; text = await grabBySearch(page); via = 'search'; }
  return { text, via, contest: await readContestName(page), total: await readTotal(page), start: await readStart(page) };
}

async function withBrowser(fn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, locale: 'ko-KR', timezoneId: 'Asia/Seoul', viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(CAPTURE);
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  try {
    await login(page);
    return await fn(page);
  } catch (e) {
    // 공개 저장소의 Actions 로그이므로 스크린샷·본문은 남기지 않고, 위치와 버튼 이름만 출력한다
    const url = page.url().replace(/[?#].*$/, '');
    const buttons = await page.locator('button, [role=tab]').allInnerTexts().catch(() => []);
    console.error('failed at ' + url + ' | controls: ' + buttons.map((t) => t.trim()).filter((t) => t && t.length < 20).slice(0, 30).join(' / '));
    throw e;
  } finally {
    await browser.close();
  }
}

async function readContestName(page) {
  try {
    const sel = page.locator('select').first();
    if (await sel.count()) {
      const t = await sel.evaluate((s) => s.options[s.selectedIndex] && s.options[s.selectedIndex].text);
      if (t) return t.trim();
    }
    const txt = await page.locator('body').innerText();
    const m = txt.match(/RFM\s*\d+\s*회/);
    return m ? m[0].replace(/\s+/g, ' ') : '';
  } catch { return ''; }
}

// 대회 기간 "2026.10.01 ~ 2026.11.30" 같은 문구에서 시작일을 찾는다
async function readStart(page) {
  try {
    const txt = await page.locator('body').innerText();
    const m = txt.match(/(20\d\d)[.\-\/년]\s*(\d{1,2})[.\-\/월]\s*(\d{1,2})일?\s*[~∼～-]\s*(?:20\d\d)?/);
    return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
  } catch { return null; }
}

// ---------- 벤치마크 (네이버 금융 공개 시세) ----------
// 대회 기준가 1,000은 시작일 직전 거래일 종가 기준이므로 지수도 같은 날 종가를 기준점으로 쓴다
const bmBase = {};
async function indexBase(code, start) {
  const k = code + start;
  if (bmBase[k]) return bmBase[k];
  const r = await fetch(`https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=200&requestType=0`);
  const xml = await r.text();
  const ymd = start.replace(/-/g, '');
  let base = null;
  for (const m of xml.matchAll(/data="(\d{8})\|[^|]*\|[^|]*\|[^|]*\|([\d.]+)\|/g)) if (m[1] < ymd) base = parseFloat(m[2]);
  if (base) bmBase[k] = base;
  return base;
}
async function indexNow(code) {
  const r = await fetch(`https://m.stock.naver.com/api/index/${code}/basic`);
  const j = await r.json();
  return num(j.closePrice);
}
async function benchmarks(start) {
  if (!start) return null;
  const out = { start };
  for (const [key, code] of [['kospi', 'KOSPI'], ['kosdaq', 'KOSDAQ']]) {
    try {
      const base = await indexBase(code, start), now = await indexNow(code);
      if (base && now) out[key] = { base, now, ret: (now / base - 1) * 100 };
    } catch (e) { /* 지수를 못 받아도 순위 저장은 계속한다 */ }
  }
  return out.kospi || out.kosdaq ? out : null;
}

async function readTotal(page) {
  try {
    const txt = await page.locator('body').innerText();
    const m = txt.match(/(?:총|of|전체)\s*([\d,]+)\s*(?:명|건|rows|entries)?/i);
    return m ? num(m[1]) : null;
  } catch { return null; }
}

// ---------- Supabase ----------
const sbHeaders = () => ({ apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' });

async function loadPrev() {
  const r = await fetch(SB_URL + '/rest/v1/intranet_content?id=eq.rfm&select=data', { headers: sbHeaders() });
  if (!r.ok) throw new Error('supabase read ' + r.status + ' ' + (await r.text()));
  const j = await r.json();
  return (j[0] && j[0].data) || null;
}

async function save(data) {
  const r = await fetch(SB_URL + '/rest/v1/intranet_content', {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: 'rfm', data }),
  });
  if (!r.ok) throw new Error('supabase write ' + r.status + ' ' + (await r.text()));
  // RFM 순위는 학회원 로그인 후에만 본다. 예전에 공개용으로 올렸던 public_content 행은 지운다
  const p = await fetch(SB_URL + '/rest/v1/public_content?id=eq.rfm', { method: 'DELETE', headers: { ...sbHeaders(), Prefer: 'return=minimal' } });
  if (!p.ok) console.error('public rfm cleanup skipped: ' + p.status);
}

// ---------- main ----------
const kstNow = () => new Date(Date.now() + 9 * 3600e3);
const kstHM = () => { const k = kstNow(); return k.getUTCHours() * 60 + k.getUTCMinutes(); };

let prev = null;
async function publish(got) {
  const k = kstNow();
  const today = k.toISOString().slice(0, 10);
  const stamp = today + ' ' + k.toISOString().slice(11, 19);
  const all = rowsFromCsv(got.text);
  if (!all.length) throw new Error('no rows parsed (' + got.via + ')');
  const byNick = new Map(all.map((r) => [norm(r.nick), r]));
  const r50 = all.find((r) => r.rank === 50);
  if (r50) cut50 = r50.nav;
  if (!DRY && !prev) prev = await loadPrev();
  const sameContest = prev && (!got.contest || !prev.contest || prev.contest === got.contest);
  const series = sameContest && prev.series ? prev.series : {};
  const out = members.map((m) => {
    const r = byNick.get(norm(m.nick));
    if (!r) return { nick: m.nick, found: false };
    const key = norm(m.nick);
    const s = (series[key] || []).filter((p) => p[0] !== today);
    s.push([today, r.nav, r.rank]);
    series[key] = s.slice(-120);
    return { nick: r.nick, found: true, rank: r.rank, rankChg: r.rankChg, nav: r.nav, navChg: r.navChg, weight: r.weight, count: r.count };
  });
  const data = {
    contest: got.contest || (prev && prev.contest) || '',
    bm: (await benchmarks(got.start || process.env.RFM_START || (prev && prev.bm && prev.bm.start))) || (prev && prev.bm) || null,
    asOf: stamp,
    total: got.via === 'csv' ? (got.total || all.length) : (got.total || (prev && prev.total) || null),
    members: out,
    cut50: cut50 || (prev && prev.cut50) || null,
    series,
  };
  // 15초마다 돌므로 로그는 1분에 한 줄만 남긴다
  if (!publish.lastLog || Date.now() - publish.lastLog > 55000) {
    publish.lastLog = Date.now();
    console.log(`${stamp} via ${got.via}: matched ${out.filter((m) => m.found).length}/${members.length}`);
  }
  if (DRY) return;
  await save(data);
  prev = data;
}

if (CSV_FILE) {
  await publish({ text: decode(readFileSync(CSV_FILE)), via: 'file', contest: '', total: null });
} else {
  // RFM_UNTIL=HH:MM (KST) 이면 그 시각까지 RFM_EVERY초(기본 60)마다 반복, 없으면 한 번만
  const until = (process.env.RFM_UNTIL || '').match(/^(\d{1,2}):(\d{2})$/);
  const endMin = until ? +until[1] * 60 + +until[2] : -1;
  const every = Math.max(10, +(process.env.RFM_EVERY || 60)) * 1000;
  const hardStop = Date.now() + 5.6 * 3600e3; // Actions 작업 한도(6시간) 안에서 끝낸다
  await withBrowser(async (page) => {
    let fails = 0;
    do {
      const t0 = Date.now();
      try { await publish(await snapshot(page)); fails = 0; }
      catch (e) { fails++; console.error('round failed: ' + e.message.split('\n')[0]); if (fails >= 5 || endMin < 0) throw e; }
      if (endMin < 0) break;
      const wait = every - (Date.now() - t0);
      if (wait > 0) await page.waitForTimeout(wait);
    } while (kstHM() < endMin && Date.now() < hardStop);
  });
}
