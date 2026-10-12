// 네이버 카페 자료 내려받기 (챗봇 자료 모으기용, 본인 PC에서 실행)
// 로그인은 뜨는 크롬 창에서 직접 한다. 아이디·비밀번호는 스크립트가 보거나 저장하지 않는다.
// 받은 파일은 저장소 밖(기본 ~/rfs-cafe)에 둔다. 저장소는 공개라 카페 자료를 커밋하면 안 된다.
//
//   npm i playwright@1.48.2
//   node download.mjs menus --cafe=카페주소      게시판 목록과 받을 대상 표시만
//   node download.mjs --cafe=카페주소            받기 (끊기면 다시 실행하면 받은 글은 건너뜀)
//   옵션: --out=폴더  --only=게시판이름  --skip=게시판이름,게시판이름  --delay=초  --max=글수(시험용)  --debug

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import readline from 'node:readline/promises';

const arg = (k) => (process.argv.find((a) => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const has = (k) => process.argv.includes('--' + k);
const MODE = process.argv[2] === 'menus' ? 'menus' : 'download';
const CAFE = arg('cafe');
const OUT = arg('out') || join(homedir(), 'rfs-cafe');
const ONLY = arg('only');
const SKIP = new Set(arg('skip').split(',').filter(Boolean).map((x) => x.replace(/\s+/g, '').toLowerCase()));
const MAX = Number(arg('max')) || Infinity;
if (!CAFE) { console.error('--cafe=카페주소 가 필요합니다 (cafe.naver.com/ 뒤 부분)'); process.exit(1); }

// 받을 게시판. 카페 왼쪽 메뉴 이름 그대로.
const BOARDS = {
  'RFS 세미나 자료': ['에너지 / 유틸리티', '소재', '산업재', '필수 소비재', '경기관련 소비재', '건강관리', '커뮤니케이션', '금융', 'IT', '일반 산업 / 기업 분석 외', 'RFS 미니세미나'],
  'RFS 자산운용': ['운용 현황 보고', '투자제안서', '운용팀 증시 뉴스', '매크로 보고서'],
  '소모임': ['23 알럼나이 스터디', '22 경영전략 스터디', '22 Finance-Python 스터디', '22 매크로 이슈 브리핑', '22 하계 방학 스터디', '20 Research Center', '21 산업 분석', '~2019 소모임'],
  'RFS EDUCATION': ['R.F.S 가이드북', 'R.F.S 기초세미나', 'R.F.S 정보공유'],
};
const norm = (s) => String(s || '').replace(/&amp;/g, '&').replace(/\s+/g, '').toLowerCase();
const WANT = new Map();
for (const [g, list] of Object.entries(BOARDS)) for (const b of list) WANT.set(norm(b), g);

const DOC = /\.(pdf|pptx?|xlsx?|xlsm|docx?|hwpx?|zip|csv|txt)$/i;
// 윈도우는 이름 끝의 점·공백을 못 다룬다 ("입니다." 폴더가 안 열림)
const safe = (s) => String(s || '').replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80).replace(/[. ]+$/, '') || 'untitled';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 글 사이 쉬는 시간(초). 기본 0.8~1.6초, --delay=2 처럼 늘릴 수 있다
const DELAY = (Number(arg('delay')) || 0.8) * 1000;
const pause = () => sleep(DELAY + Math.random() * DELAY);

// JSON 안에서 조건에 맞는 객체를 전부 찾는다. 네이버 응답 모양이 바뀌어도 버티게.
function walk(o, fn, out = []) {
  if (Array.isArray(o)) o.forEach((x) => walk(x, fn, out));
  else if (o && typeof o === 'object') { if (fn(o)) out.push(o); Object.values(o).forEach((x) => walk(x, fn, out)); }
  return out;
}
const firstStr = (o, keys) => { for (const k of keys) if (typeof o[k] === 'string' && o[k]) return o[k]; return ''; };

const ctx = await chromium.launchPersistentContext(join(OUT, '.profile'), { channel: 'chrome', headless: false, acceptDownloads: true });
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto(/^\d+$/.test(CAFE) ? 'https://cafe.naver.com/f-e/cafes/' + CAFE : 'https://cafe.naver.com/' + CAFE);
// 네이버 로그인 쿠키는 브라우저를 닫으면 사라질 수 있어서 매번 확인한다
const loggedIn = async () => (await ctx.cookies('https://naver.com')).some((c) => c.name === 'NID_AUT');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
await rl.question('\n크롬 창에서 네이버 로그인을 마치고 카페가 보이면 여기서 엔터를 누르세요. ');
while (!(await loggedIn())) await rl.question('아직 로그인이 안 됐습니다. 크롬 창 오른쪽 위에서 로그인한 뒤 엔터를 누르세요. ');
rl.close();

async function api(url) {
  const r = await ctx.request.get(url, { headers: { referer: 'https://cafe.naver.com/' } });
  const t = await r.text();
  if (!r.ok()) throw new Error(r.status() + ' ' + url.split('?')[0] + ' ' + t.slice(0, 200));
  return JSON.parse(t);
}

// 카페 번호
let club = /^\d+$/.test(CAFE) ? CAFE : '';
if (!club) {
  try {
    const j = await api('https://apis.naver.com/cafe-web/cafe2/CafeGateInfo.json?cluburl=' + encodeURIComponent(CAFE));
    const hit = walk(j, (o) => o.cafeId || o.clubid || o.clubId)[0];
    club = String(hit ? (hit.cafeId || hit.clubid || hit.clubId) : '');
  } catch {}
}
if (!club) {
  for (const f of page.frames()) {
    const m = (await f.content().catch(() => '')).match(/clubid=(\d+)|cafeId["':=\s]+(\d+)|cafes\/(\d+)/i);
    if (m) { club = m[1] || m[2] || m[3]; break; }
  }
}
if (!club) { console.error('카페 번호를 못 찾았습니다. --cafe=숫자 로 직접 넣어주세요.'); process.exit(1); }
console.log('카페 번호', club);

// 게시판 목록
const mj = await api('https://apis.naver.com/cafe-web/cafe2/SideMenuList?cafeId=' + club);
const menus = walk(mj, (o) => o.menuId != null && typeof o.menuName === 'string');
const targets = menus.filter((m) => WANT.has(norm(m.menuName)) && (!ONLY || norm(m.menuName) === norm(ONLY)) && !SKIP.has(norm(m.menuName)));
if (MODE === 'menus') {
  for (const m of menus) console.log((WANT.has(norm(m.menuName)) ? '[받음] ' : '       ') + m.menuId + '  ' + m.menuName.replace(/&amp;/g, '&'));
  const found = new Set(targets.map((m) => norm(m.menuName)));
  const miss = [...WANT.keys()].filter((k) => !found.has(k));
  if (miss.length) console.log('\n메뉴에서 못 찾은 게시판:', miss.join(', '));
  await ctx.close(); process.exit(0);
}

async function listArticles(menuId) {
  const ids = new Map();
  for (let p = 1; p < 500; p++) {
    let j;
    try { j = await api(`https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/${club}/menus/${menuId}/articles?page=${p}&pageSize=50&sortBy=TIME&viewType=L`); }
    catch { j = await api(`https://apis.naver.com/cafe-web/cafe2/ArticleListV2dot1.json?search.clubid=${club}&search.menuid=${menuId}&search.page=${p}&search.perPage=50`); }
    const before = ids.size;
    for (const a of walk(j, (o) => o.articleId != null)) if (!ids.has(String(a.articleId))) ids.set(String(a.articleId), firstStr(a, ['subject', 'title']));
    if (ids.size === before) break;
    await pause();
  }
  return ids;
}

const htmlText = (h) => String(h || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, '\n')
  .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();

let done = 0, files = 0, debugged = false;
for (const m of targets) {
  const name = m.menuName.replace(/&amp;/g, '&');
  const dir = join(OUT, safe(WANT.get(norm(m.menuName))), safe(name));
  mkdirSync(dir, { recursive: true });
  const ids = await listArticles(m.menuId);
  console.log(`\n[${name}] 글 ${ids.size}개`);
  for (const [aid, subj] of ids) {
    if (done >= MAX) break;
    const adir = join(dir, aid + '_' + safe(subj));
    if (existsSync(join(adir, 'meta.json'))) continue;
    try {
      const j = await api(`https://apis.naver.com/cafe-web/cafe-articleapi/v2.1/cafes/${club}/articles/${aid}?useCafeId=true&requestFrom=A`);
      if (has('debug') && !debugged) { writeFileSync(join(OUT, 'debug.json'), JSON.stringify(j, null, 1)); debugged = true; }
      mkdirSync(adir, { recursive: true });
      const art = walk(j, (o) => typeof o.contentHtml === 'string')[0] || {};
      const body = htmlText(art.contentHtml);
      if (body) writeFileSync(join(adir, 'body.txt'), body);
      // 첨부: 문서 확장자를 가진 이름이나 주소가 있는 객체
      const atts = walk(j, (o) => {
        const u = firstStr(o, ['url', 'downloadUrl', 'fileUrl', 'link']);
        const n = firstStr(o, ['name', 'fileName', 'originalFileName', 'title']);
        return /^https?:/.test(u) && (DOC.test(n) || DOC.test(u.split('?')[0]));
      });
      const saved = [];
      for (const a of atts) {
        const u = firstStr(a, ['url', 'downloadUrl', 'fileUrl', 'link']);
        const n = safe(firstStr(a, ['name', 'fileName', 'originalFileName', 'title']) || decodeURIComponent(u.split('?')[0].split('/').pop()));
        if (saved.includes(n)) continue;
        const r = await ctx.request.get(u, { headers: { referer: 'https://cafe.naver.com/' } });
        if (!r.ok()) { console.log('  첨부 실패', r.status(), n); continue; }
        writeFileSync(join(adir, n), await r.body());
        saved.push(n); files++;
      }
      // 작성자 이름은 남기지 않는다
      const date = walk(j, (o) => o.writeDate || o.writeDateTimestamp)[0] || {};
      writeFileSync(join(adir, 'meta.json'), JSON.stringify({
        group: WANT.get(norm(m.menuName)), board: name, articleId: aid,
        subject: firstStr(art, ['subject']) || subj, date: date.writeDate || date.writeDateTimestamp || null, files: saved,
      }, null, 1));
      done++;
      console.log(`  ${aid} ${safe(subj).slice(0, 40)}  첨부 ${saved.length}`);
    } catch (e) {
      const msg = String(e.message);
      if (/로그인|401|login/i.test(msg)) { console.error('\n로그인이 풀렸습니다. 다시 실행해서 로그인해 주세요. (받은 글은 건너뜁니다)'); await ctx.close(); process.exit(1); }
      console.log('  실패', aid, msg.slice(0, 160));
    }
    await pause();
  }
}
console.log(`\n끝. 글 ${done}개, 파일 ${files}개 → ${OUT}`);
await ctx.close();
