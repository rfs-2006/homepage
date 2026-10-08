// 타임폴리오 RFM(Road To Fund Manager) 학회원 순위 수집기
// 타임폴리오 허가 범위(조회·CSV 다운로드, 학회 내부 공개)에서만 실행한다. 일정은 .github/workflows/rfm.yml
// 일반 사용자와 같은 화면 조작(로그인 → 대회 → 수익률 순위 → CSV 다운로드)만 사용하고 API는 호출하지 않는다.
// 결과는 Supabase intranet_content 의 id='rfm' 행에 저장되며, 로그인한 학회원만 AGORA에서 본다.
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
const members = RFM_MEMBERS.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
  const [name, ...rest] = l.split(/[,\t:]/);
  return { name: name.trim(), nick: rest.join(',').trim() };
}).filter((m) => m.name && m.nick);

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
async function fetchCsv() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, locale: 'ko-KR', timezoneId: 'Asia/Seoul', viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const email = page.locator('#email');
    if (!(await email.isVisible().catch(() => false))) {
      const login = page.getByText(/로그인|Login|Sign in/i).first();
      if (await login.isVisible().catch(() => false)) await login.click();
    }
    await email.waitFor();
    await email.fill(TF_EMAIL);
    await page.locator('#password').fill(TF_PASSWORD);
    await page.getByRole('button', { name: /submit|로그인|login/i }).first().click();
    await page.waitForFunction(() => !document.querySelector('#password'), null, { timeout: 30000 })
      .catch(() => { throw new Error('login failed (password field still visible)'); });

    await page.goto(BASE + '/Contest', { waitUntil: 'domcontentloaded' });
    await page.getByText('수익률 순위', { exact: false }).first().click();
    const btn = page.getByText('CSV 다운로드', { exact: false }).first();
    await btn.waitFor();
    const contest = await readContestName(page);
    const total = await readTotal(page);
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), btn.click()]);
    const stream = await dl.createReadStream();
    const chunks = []; for await (const c of stream) chunks.push(c);
    return { text: decode(Buffer.concat(chunks)), contest, total };
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
}

// ---------- main ----------
const kst = new Date(Date.now() + 9 * 3600e3);
const today = kst.toISOString().slice(0, 10);
const stamp = today + ' ' + kst.toISOString().slice(11, 16);

const got = CSV_FILE ? { text: decode(readFileSync(CSV_FILE)), contest: '', total: null } : await fetchCsv();
const all = rowsFromCsv(got.text);
const byNick = new Map(all.map((r) => [norm(r.nick), r]));
const prev = DRY ? null : await loadPrev();
const sameContest = prev && (!got.contest || !prev.contest || prev.contest === got.contest);
const series = sameContest && prev.series ? prev.series : {};

const out = members.map((m) => {
  const r = byNick.get(norm(m.nick));
  if (!r) return { name: m.name, nick: m.nick, found: false };
  const key = norm(m.nick);
  const s = (series[key] || []).filter((p) => p[0] !== today);
  s.push([today, r.nav, r.rank]);
  series[key] = s.slice(-120);
  return { name: m.name, nick: r.nick, found: true, rank: r.rank, rankChg: r.rankChg, nav: r.nav, navChg: r.navChg, weight: r.weight, count: r.count };
});

const data = {
  contest: got.contest || (prev && prev.contest) || '',
  asOf: stamp,
  total: got.total || all.length,
  members: out,
  series,
};

const found = out.filter((m) => m.found).length;
console.log(`parsed ${all.length} rows, matched ${found}/${members.length} members`);
if (DRY) { console.log('dry run, not saved'); process.exit(0); }
await save(data);
console.log('saved intranet_content/rfm at ' + stamp + ' KST');
