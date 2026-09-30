#!/usr/bin/env node
// 공유 썸네일(카카오톡·메신저 링크 미리보기, 1200x630 JPG) 생성기.
//   assets/og/site.jpg      메인·Research 페이지용
//   assets/og/<id>.jpg      리포트별 (배경 사진이 있으면 사진, 없으면 네이비)
// 데이터는 index.html의 REPORTS. 내용이 바뀐 카드만 다시 그린다(tools/.og-cache.json).
// Chrome 또는 Edge가 설치되어 있어야 한다.
//
// 사용법: node tools/build-og.js          (바뀐 것만)
//         node tools/build-og.js --all    (전부 다시)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { siteCard, reportCard } = require('./og-cards');
const C = require('./seo-config');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'og');
const TMP = path.join(require('os').tmpdir(), 'rfs-og');
const CACHE = path.join(__dirname, '.og-cache.json');
const SITE_STYLE = 'navy';
const REPORT_STYLE = 'photo';

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];

function loadReports() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const start = html.indexOf('const REPORTS = [');
  const open = html.indexOf('[', start);
  let depth = 0, quote = null, i = open;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) break;
  }
  return new Function('return ' + html.slice(open, i + 1))();
}

function main() {
  const browser = BROWSERS.find((b) => fs.existsSync(b));
  if (!browser) throw new Error('Chrome/Edge를 찾지 못했습니다');
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });
  const all = process.argv.includes('--all');
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch {}

  const site = ROOT.replace(/\\/g, '/');
  const reports = loadReports();
  const jobs = [
    ['site', siteCard(SITE_STYLE, { reports: reports.length, alumni: C.ALUMNI }, site)],
    ...reports.map((r) => [r.id, reportCard(REPORT_STYLE, r, site)]),
  ];

  let drawn = 0;
  for (const [name, html] of jobs) {
    const bg = name === 'site' ? '' : (reports.find((r) => r.id === name).heroBg || reports.find((r) => r.id === name).photoBg || '');
    const key = crypto.createHash('sha1').update(html + (bg && fs.existsSync(path.join(ROOT, bg)) ? fs.statSync(path.join(ROOT, bg)).size : '')).digest('hex');
    const out = path.join(OUT, name + '.jpg');
    if (!all && cache[name] === key && fs.existsSync(out)) continue;
    const file = path.join(TMP, name + '.html');
    fs.writeFileSync(file, html);
    execFileSync(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      `--user-data-dir=${path.join(TMP, 'profile')}`, '--window-size=1200,630', '--virtual-time-budget=15000',
      '--allow-file-access-from-files', `--screenshot=${out}`, 'file:///' + file.replace(/\\/g, '/')], { stdio: 'ignore' });
    cache[name] = key;
    drawn++;
    process.stdout.write(`\r썸네일 ${drawn}장 그림 (${name})        `);
  }
  // REPORTS에서 빠진 리포트의 썸네일 정리
  const keep = new Set(jobs.map(([n]) => n + '.jpg'));
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.jpg') && !keep.has(f)) { fs.unlinkSync(path.join(OUT, f)); delete cache[f.replace('.jpg', '')]; }
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  console.log(`\n썸네일 ${jobs.length}장 중 ${drawn}장 새로 그림 → assets/og/`);
}

main();
