#!/usr/bin/env node
// 기업 리포트 목록의 '평가 기간 주가' 칸 데이터(assets/data/track.json)를 만든다.
// REPORTS(assets/app.js)를 읽어 종목별 일별 종가를 받고, 리포트마다 평가 기간(발간 다음 거래일부터 12개월) 결과를 계산한다.
//  - 시세: Yahoo spark(20종목씩). 국내 종목이 빠지면 Naver fchart로 한 번 더.
//  - 분할 보정·상장폐지 메모: tools/price-overrides.json (손으로 관리)
//  - 기간이 끝난 리포트는 값이 더 안 바뀌므로, 시세를 못 받으면 이전 track.json 값을 그대로 둔다.
// 사용법: 사이트 루트에서  node tools/build-prices.js   (키 필요 없음, curl 사용)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/data/track.json');
const OV = JSON.parse(fs.readFileSync(path.join(__dirname, 'price-overrides.json'), 'utf8'));
const N = 60;            // 주가선 점 개수 (평가 기간 전체를 같은 간격으로)
const MISMATCH = 0.15;   // 리포트 현재가와 발간 직전 종가가 이만큼 넘게 다르면 분할로 본다

// ---------- REPORTS 읽기 (다른 도구와 같은 방식: 짝이 맞는 괄호까지 잘라 평가) ----------
function readReports() {
  const src = fs.readFileSync(path.join(ROOT, 'assets/app.js'), 'utf8');
  const open = src.indexOf('[', src.indexOf('const REPORTS = ['));
  let depth = 0, quote = null, i = open;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) break;
  }
  return new Function('return ' + src.slice(open, i + 1))();
}

// ---------- 시세 받기 ----------
const get = (url) => execFileSync('curl', ['-sS', '-m', '60', '--retry', '2', '-A', 'Mozilla/5.0', url], { maxBuffer: 64 << 20 }).toString('latin1');

function yahooSpark(syms) {
  const out = {};
  for (let i = 0; i < syms.length; i += 20) {
    const b = syms.slice(i, i + 20);
    let j;
    try { j = JSON.parse(get('https://query1.finance.yahoo.com/v7/finance/spark?symbols=' + encodeURIComponent(b.join(',')) + '&range=10y&interval=1d')); }
    catch (e) { console.warn('yahoo 실패', b.join(','), e.message.slice(0, 120)); continue; }
    for (const r of (j.spark && j.spark.result) || []) {
      const x = r.response && r.response[0];
      if (!x || !x.timestamp) continue;
      const c = x.indicators.quote[0].close, off = x.meta.gmtoffset || 0;
      const d = x.timestamp.map((t, k) => [new Date((t + off) * 1000).toISOString().slice(0, 10), c[k]]).filter((p) => p[1] != null && p[1] > 0);
      const key = r.symbol.replace(/\.(KS|KQ)$/, '');
      if (d.length && (!out[key] || out[key].length < d.length)) out[key] = d;
    }
  }
  return out;
}

function naver(code) {
  try {
    const xml = get('https://fchart.stock.naver.com/sise.nhn?symbol=' + code + '&timeframe=day&count=2000&requestType=0');
    const d = [...xml.matchAll(/data="(\d{8})\|[^|]*\|[^|]*\|[^|]*\|([\d.]+)\|/g)].map((m) => [m[1].slice(0, 4) + '-' + m[1].slice(4, 6) + '-' + m[1].slice(6), +m[2]]);
    return d.length ? d : null;
  } catch (e) { return null; }
}

// ---------- 계산 ----------
const num = (s) => { const v = parseFloat(String(s || '').replace(/[^0-9.]/g, '')); return isNaN(v) ? null : v; };
const addM = (d, m) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCMonth(x.getUTCMonth() + m); return x.toISOString().slice(0, 10); };
const ts = (d) => Date.parse(d + 'T00:00:00Z');
const days = (a, b) => Math.round((ts(b) - ts(a)) / 864e5);
const r4 = (v) => Math.round(v * 1e4) / 1e4;
// 날짜 목록 cal 각각에 대해 그날까지의 마지막 값
const ffill = (d, cal) => { let j = 0, last = null; return cal.map((t) => { while (j < d.length && d[j][0] <= t) last = d[j++][1]; return last; }); };

function compute(r, p, bm, asOf) {
  const pub = r.date.replace(/\./g, '-');
  const i0 = p.findIndex((x) => x[0] > pub);
  if (i0 < 0) return null;
  let base = p[i0][1]; const d0 = p[i0][0];
  const months = (OV.months && OV.months[r.id]) || 12;
  const end = addM(d0, months);
  const run = end > asOf;
  const win = p.slice(i0).filter((x) => x[0] <= end);
  // 분할 보정: overrides 값이 있으면 그것, 없으면 리포트 현재가와 비교해 감지(경고)
  let f = 1;
  const ov = OV.split && OV.split[r.id];
  if (ov) f = ov.f;
  else {
    const cur = num(r.cur || r.buy), ref = i0 > 0 ? p[i0 - 1][1] : base;
    if (cur && Math.abs(ref / cur - 1) > MISMATCH) { f = ref / cur; console.warn(`분할 추정 ${r.id}: 리포트 ${r.cur || r.buy} vs 발간 직전 ${ref} → f=${f.toFixed(4)}. price-overrides.json에 확인해 적어 두세요`); }
  }
  // 리포트에 매수가(buy)가 따로 있으면 그 값을 기준가로 (분할 보정 같이)
  if (num(r.buy)) base = num(r.buy) * f;
  const tp0 = r.tpNum || num(r.tp);
  const tp = tp0 ? tp0 * f : null;
  let hit = null;
  if (tp) for (const x of win) if (x[1] >= tp) { hit = x[0]; break; }
  const last = win[win.length - 1];
  const bmv = ffill(bm, [d0, last[0]]);
  const ret = last[1] / base - 1, mret = bmv[0] && bmv[1] ? bmv[1] / bmv[0] - 1 : null;
  // 이상치 점검: 하루 ±60%는 분할 미반영 가능성
  for (let k = 1; k < win.length; k++) { const c = win[k][1] / win[k - 1][1] - 1; if (Math.abs(c) > 0.6) console.warn(`하루 ${(c * 100).toFixed(0)}% ${r.id} ${win[k][0]} (분할 미반영인지 확인)`); }
  // 주가선: 평가 기간을 N칸으로 나눈 시점마다 그날까지의 종가 (진행 중이면 지금까지만)
  const t0 = ts(d0), lastT = ts(last[0]), t1 = Math.min(ts(end), lastT);   // 진행 중이면 지금까지를 N칸으로 (선이 촘촘하게)
  const cal = [];
  for (let k = 0; k < N; k++) { const t = t0 + (t1 - t0) * k / (N - 1); if (t > lastT) break; cal.push(new Date(t).toISOString().slice(0, 10)); }
  const vals = ffill(win, cal);
  const o = { d: d0, e: end, m: months, st: hit ? 'hit' : run ? 'run' : 'end', r: r4(ret), b: mret == null ? null : r4(mret), mk: /^\d{6}$/.test(r.ticker) ? 'K' : 'S' };
  if (hit) {
    o.h = hit; o.hd = days(d0, hit);

    // 도달한 종가가 선 위에 오도록 그 칸 값을 도달 종가로 바꾼다
    const k = Math.min(cal.length - 1, Math.max(0, Math.round((ts(hit) - t0) / (t1 - t0) * (N - 1))));
    vals[k] = win.find((x) => x[0] === hit)[1]; o.hi = k;
  }
  // 수익률: 방향을 봤으니 기간 안(진행 중이면 지금까지) 최고 종가까지로 본다. 시장도 그 최고가 날까지
  // r = 기간 끝(진행 중이면 지금) 수익률, mx = 기간 안 최고 종가 수익률
  { const pk = win.reduce((a, x) => (x[1] > a[1] ? x : a)); o.mx = r4(pk[1] / base - 1); o.pk = pk[0]; }
  if (run) { if (cal[cal.length - 1] !== last[0]) vals.push(last[1]); o.x = Math.round((lastT - t0) / (ts(end) - t0) * 1000); o.l = last[0]; }   // x = 12개월 중 지난 만큼(0~1000)
  o.p = vals.map((v) => Math.round(v / base * 1000));
  if (tp) o.t = Math.round(tp / base * 1000);
  return o;
}

// ---------- 실행 ----------
function main() {
  const R = readReports().filter((r) => r.ticker);
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')).r || {}; } catch (e) {}
  const tickers = [...new Set(R.filter((r) => !(OV.delisted && OV.delisted[r.id])).map((r) => r.ticker))];
  const syms = [];
  for (const t of tickers) { if (/^\d{6}$/.test(t)) syms.push(t + '.KS', t + '.KQ'); else syms.push(t); }
  syms.push('^KS11', '^GSPC');
  const P = yahooSpark(syms);
  for (const t of tickers) if (!P[t] && /^\d{6}$/.test(t)) { const d = naver(t); if (d) { P[t] = d; console.log('naver', t, d.length); } }
  if (!P['^KS11']) P['^KS11'] = naver('KOSPI');
  if (!P['^KS11'] || !P['^GSPC']) { console.error('지수 시세를 못 받음. 쓰지 않고 끝냄'); process.exit(1); }
  // 기준일: 지수 중 늦은 쪽의 마지막 거래일 (휴장일엔 파일이 그대로라 커밋이 안 생긴다)
  const asOf = [P['^KS11'], P['^GSPC']].map((d) => d[d.length - 1][0]).sort().pop();

  const out = {}, miss = [];
  let fresh = 0;
  for (const r of R) {
    if (OV.delisted && OV.delisted[r.id]) continue;
    const p = P[r.ticker];
    const o = p && compute(r, p, /^\d{6}$/.test(r.ticker) ? P['^KS11'] : P['^GSPC'], asOf);
    if (o) { out[r.id] = o; fresh++; }
    else if (prev[r.id] && prev[r.id].st !== 'run') out[r.id] = prev[r.id];
    else miss.push(r.id);
  }
  if (miss.length) console.warn('시세 없음:', miss.join(', '));
  // 대부분 못 받았으면 망가진 응답으로 보고 덮어쓰지 않는다
  if (fresh < Object.keys(prev).length * 0.8) { console.error(`받은 리포트 ${fresh}편, 이전 ${Object.keys(prev).length}편. 쓰지 않고 끝냄`); process.exit(1); }

  const body = Object.entries(out).map(([k, v]) => JSON.stringify(k) + ':' + JSON.stringify(v)).join(',\n');
  const txt = '{"asOf":' + JSON.stringify(asOf) + ',"r":{\n' + body + '\n}}\n';
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, txt);
  const c = { hit: 0, end: 0, run: 0 };
  Object.values(out).forEach((v) => c[v.st]++);
  console.log(`track.json ${(txt.length / 1024).toFixed(1)}KB, ${Object.keys(out).length}편 (도달 ${c.hit} · 종료 ${c.end} · 진행 ${c.run}), 기준 ${asOf}`);
}

main();
