#!/usr/bin/env node
// IndexNow: 이번 push에서 새로 생기거나 바뀐 페이지 주소를 네이버·빙에 바로 알린다.
// 키 파일은 사이트 루트의 <키>.txt (공개용 키라 저장소에 있어도 된다).
//
// 사용법 (사이트 루트에서):
//   node tools/indexnow.js <이전 커밋> [--wait]    이전 커밋과 HEAD 사이에 바뀐 HTML·sitemap에서 주소를 모은다
//   node tools/indexnow.js --urls https://caurfs.kr/a/ https://caurfs.kr/b/
//   --wait   배포가 끝나 caurfs.kr/sitemap.xml이 저장소 것과 같아질 때까지(최대 10분) 기다린 뒤 보낸다
//   --dry    보내지 않고 주소만 출력
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const C = require('./seo-config');

const ROOT = path.resolve(__dirname, '..');
const HOST = new URL(C.SITE).host;
const ENDPOINTS = ['https://searchadvisor.naver.com/indexnow', 'https://www.bing.com/indexnow'];
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);

function key() {
  const f = fs.readdirSync(ROOT).find((n) => /^[0-9a-f]{32}\.txt$/.test(n) && fs.readFileSync(path.join(ROOT, n), 'utf8').trim() === n.slice(0, 32));
  if (!f) throw new Error('IndexNow 키 파일(<키>.txt)을 찾지 못했습니다');
  return f.slice(0, 32);
}

// 바뀐 파일 → 공개 주소. 검색용이 아닌 화면(templates, assets 등)은 뺀다
function fileToUrl(f) {
  if (f === 'index.html') return `${C.SITE}/`;
  const m = f.match(/^((?:research\/[^/]+|research|about|recruiting|fund|people|privacy|chat))\/index\.html$/);
  return m ? `${C.SITE}/${m[1]}/` : null;
}

function changedUrls(base) {
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });
  const files = git('diff', '--name-only', '--diff-filter=AM', base, 'HEAD').split('\n').filter(Boolean);
  const urls = new Set(files.map(fileToUrl).filter(Boolean));
  // sitemap에 새로 들어오거나 lastmod가 바뀐 주소
  if (files.includes('sitemap.xml')) {
    for (const line of git('diff', '-U0', base, 'HEAD', '--', 'sitemap.xml').split('\n')) {
      const m = line.startsWith('+') && line.match(/<loc>([^<]+)<\/loc>/);
      if (m) urls.add(m[1]);
    }
  }
  if (files.includes('rss.xml')) urls.add(`${C.SITE}/rss.xml`);
  return [...urls].filter((u) => u.startsWith(C.SITE));
}

async function waitDeploy() {
  const want = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const until = Date.now() + 10 * 60 * 1000;
  while (Date.now() < until) {
    try {
      const r = await fetch(`${C.SITE}/sitemap.xml?t=${Date.now()}`, { cache: 'no-store' });
      if (r.ok && (await r.text()) === want) { console.log('배포 확인 (sitemap.xml 일치)'); return; }
    } catch (e) { /* 다시 시도 */ }
    await new Promise((res) => setTimeout(res, 20000));
  }
  console.log('10분 안에 sitemap.xml이 같아지지 않았습니다. 그래도 보냅니다');
}

async function main() {
  let urls;
  if (flag('--urls')) urls = args.slice(args.indexOf('--urls') + 1).filter((a) => /^https?:\/\//.test(a));
  else {
    const base = args.find((a) => !a.startsWith('--'));
    if (!base || /^0+$/.test(base)) { console.log('비교할 이전 커밋이 없어 보내지 않습니다'); return; }
    urls = changedUrls(base);
  }
  if (!urls.length) { console.log('알릴 주소가 없습니다'); return; }
  console.log(`주소 ${urls.length}개\n` + urls.join('\n'));
  if (flag('--dry')) return;
  if (flag('--wait')) await waitDeploy();
  const k = key();
  const body = JSON.stringify({ host: HOST, key: k, keyLocation: `${C.SITE}/${k}.txt`, urlList: urls.slice(0, 10000) });
  let ok = 0;
  for (const ep of ENDPOINTS) {
    try {
      const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
      console.log(`${ep} → ${r.status}`);
      if (r.status === 200 || r.status === 202) ok++;
    } catch (e) {
      console.log(`${ep} → 실패: ${e.message}`);
    }
  }
  if (!ok) process.exitCode = 1;
}

main();
