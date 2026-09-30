#!/usr/bin/env node
// 정적 소개·모집 페이지 생성기. 메인(index.html)은 해시 라우팅이라 검색엔진이 About·Recruiting을
// 별도 페이지로 인식하지 못한다. 같은 내용을 /about/, /recruiting/ 정적 페이지로도 내보낸다.
// 내용은 index.html 안의 데이터(RECRUIT, aboutStats, history, faqs 등)를 그대로 읽어 온다.
//
// 사용법: 사이트 루트에서  node tools/build-pages.js   (build-site.js 다음에 실행)

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const C = require('./seo-config');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => {
  fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, p), s);
};
const SHELL = fs.readFileSync(path.join(__dirname, 'page-shell.html'), 'utf8');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const json = (o) => JSON.stringify(o).replace(/<\//g, '<\\/');

// ---------- index.html에서 데이터 읽기 ----------

const HTML = read('index.html');

// start 위치의 '[' 또는 '{'부터 짝이 맞는 닫는 괄호까지 잘라 JS 리터럴로 평가한다
function literalAt(start) {
  const open = HTML[start];
  const close = open === '[' ? ']' : '}';
  let depth = 0, quote = null, i = start;
  for (; i < HTML.length; i++) {
    const ch = HTML[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '[' || ch === '{') depth++;
    else if ((ch === ']' || ch === '}') && --depth === 0 && ch === close) break;
  }
  return vm.runInNewContext('(' + HTML.slice(start, i + 1) + ')', { s: { counted: true } });
}
function field(key) {
  const at = HTML.indexOf(`\n      ${key}: [`);
  if (at < 0) throw new Error(`index.html에서 ${key}를 찾지 못했습니다`);
  return literalAt(HTML.indexOf('[', at));
}
function constant(name) {
  const at = HTML.indexOf(`const ${name} = `);
  if (at < 0) throw new Error(`index.html에서 const ${name}를 찾지 못했습니다`);
  return literalAt(at + `const ${name} = `.length);
}

const RECRUIT = constant('RECRUIT');
const CHART = constant('CHART');
const stats = field('aboutStats');
const history = field('history');
const teams = field('teams');
const commitments = field('commitments');
const procNotes = field('procNotes');
const activities = field('activityItems');
const etc = field('etcActivities');
const sohka = field('sohka');
const programs = field('programs');
const faqs = field('faqs');
const nextRecruit = (HTML.match(/nextRecruit \?\? '([^']+)'/) || [])[1] || '';
const stat = (key) => stats.find((x) => x.key === key) || {};
const COHORT = stat('Cohort').target, ALUMNI = stat('Alumni').target, REPORTS_N = stat('Reports').target;

// ---------- 공통 틀 ----------

const ORG = { '@type': 'Organization', name: C.SITE_NAME, url: `${C.SITE}/` };
const NAV = `<header class="nav"><a class="brand" href="/">R.F.S.<small>중앙대학교 가치투자학회</small></a>
<nav><a href="/research/">Research</a><a href="/about/">About</a><a href="/recruiting/">Recruiting</a></nav></header>`;
const FOOTER = `<footer>© R.F.S. (Rising Financial Stars) · 중앙대학교 가치투자학회 · <a href="/">caurfs.kr</a> · <a href="https://www.instagram.com/cau_rfs/">Instagram</a> · <a href="https://cafe.naver.com/caurfs">네이버 카페</a></footer>
</body>
</html>
`;

function head({ title, desc, url, keywords }) {
  return `<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n` + [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${attr(desc)}">`,
    `<meta name="keywords" content="${attr(keywords.join(', '))}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${attr(C.SITE_NAME)}">`,
    `<meta property="og:locale" content="ko_KR">`,
    `<meta property="og:title" content="${attr(title)}">`,
    `<meta property="og:description" content="${attr(desc)}">`,
    `<meta property="og:image" content="${C.SITE}/assets/og/site.jpg">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:url" content="${url}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    '',
  ].join('\n') + SHELL;
}
const crumbLd = (name, url) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'R.F.S.', item: `${C.SITE}/` },
    { '@type': 'ListItem', position: 2, name, item: url },
  ],
});
const dl = (items) => `<ul class="list">${items.map((x) =>
  `<li style="padding:12px 0"><strong>${esc(x.name || x.label)}</strong><br><span style="color:var(--muted)">${esc((x.desc || '').replace(/\s+/g, ' ').trim())}</span></li>`).join('')}</ul>`;

// ---------- /about/ ----------

function aboutPage() {
  const url = `${C.SITE}/about/`;
  const title = '학회 소개 | 중앙대학교 가치투자학회 R.F.S. (중앙대 금융학회)';
  const desc = `중앙대학교 가치투자학회 R.F.S.는 2006년 창립해 ${COHORT}기가 활동 중인 중앙대 금융·투자 학회입니다. 기업분석 보고서 ${REPORTS_N}편 이상 발간, RFS 펀드 운용, 알럼나이 ${ALUMNI}명.`;
  const keywords = ['중앙대 가치투자학회', '중앙대학교 가치투자학회', '중앙대 금융학회', '중앙대 투자학회', '중앙대 주식 학회', '중앙대 RFS', 'R.F.S.', 'SOHKA', '대학생 투자학회'];
  const careers = CHART.map((x) => `${x.label} ${x.pct}%`).join(' · ');
  const ld = {
    '@context': 'https://schema.org', '@type': 'AboutPage', name: title, url, inLanguage: 'ko',
    mainEntity: { ...ORG, foundingDate: '2006', alternateName: ['RFS', '중앙대 가치투자학회', '중앙대 금융학회'],
      parentOrganization: { '@type': 'CollegeOrUniversity', name: '중앙대학교' },
      sameAs: ['https://www.instagram.com/cau_rfs/', 'https://cafe.naver.com/caurfs'] },
  };
  return head({ title, desc, url, keywords }) +
`<script type="application/ld+json">${json(ld)}</script>
<script type="application/ld+json">${json(crumbLd('About', url))}</script>
</head>
<body>
${NAV}
<main>
<div class="crumb"><a href="/">R.F.S.</a> › About</div>
<h1>중앙대학교 가치투자학회 R.F.S.</h1>
<p class="headline">Rising Financial Stars · 2006년 창립 · ${COHORT}기 활동 중</p>
<p>R.F.S.(Rising Financial Stars)는 2006년 창립한 중앙대학교 가치투자학회입니다. Vita contemplativa — 사색하는 삶을 기반으로 금융과 경제를 탐구합니다. Research Team이 기업분석 보고서를 쓰고, Asset Management Team이 실제 자금으로 RFS 펀드를 운용합니다.</p>
<dl class="stats">
${stats.map((x) => `<div><dt>${esc(x.key)}</dt><dd>${esc(x.key === 'Founded' ? x.suffix : x.target + x.suffix)}</dd></div>`).join('\n')}
</dl>
<section><h2>조직</h2>${dl(teams)}</section>
<section><h2>활동</h2>${dl(activities)}${dl(etc)}</section>
<section><h2>연혁</h2><ul class="list">${history.map((h) => `<li style="padding:12px 0"><strong>${esc(h.year)} · ${esc(h.title)}</strong><br><span style="color:var(--muted)">${esc(h.text)}</span></li>`).join('')}</ul></section>
<section><h2>SOHKA 연합</h2><p>R.F.S.는 5개 대학 가치투자학회 연합 SOHKA의 회원 학회입니다: ${sohka.map((x) => `${esc(x.name)}(${esc(x.school)})`).join(', ')}.</p></section>
<section><h2>리서치 환경</h2>${dl(programs)}</section>
<section><h2>알럼나이 ${ALUMNI}명의 진로</h2><p>${esc(careers)}</p></section>
<div class="btns"><a class="btn solid" href="/research/">기업분석 보고서 보기</a><a class="btn" href="/recruiting/">신입 학회원 모집</a></div>
</main>
${FOOTER}`;
}

// ---------- /recruiting/ ----------

function recruitingPage() {
  const url = `${C.SITE}/recruiting/`;
  const title = '신입 학회원 모집 | 중앙대학교 가치투자학회 R.F.S. (중앙대 금융학회·투자학회 모집)';
  const desc = `중앙대학교 가치투자학회 R.F.S. 신입 학회원 모집 안내. 지원 자격: ${RECRUIT.eligibility}(전공·학번·나이 제한 없음). 모집 일정, 활동 내용, 자주 묻는 질문.${nextRecruit ? ` 다음 모집: ${nextRecruit}.` : ''}`;
  const keywords = ['중앙대 학회 모집', '중앙대 금융학회 모집', '중앙대 투자학회 모집', '중앙대 가치투자학회 모집', '중앙대 주식 동아리 모집', '중앙대 동아리 모집', 'RFS 모집', 'RFS 리크루팅', '중앙대 신입생 학회'];
  const ld = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  return head({ title, desc, url, keywords }) +
`<script type="application/ld+json">${json(ld)}</script>
<script type="application/ld+json">${json(crumbLd('Recruiting', url))}</script>
</head>
<body>
${NAV}
<main>
<div class="crumb"><a href="/">R.F.S.</a> › Recruiting</div>
<h1>R.F.S. 신입 학회원 모집</h1>
<p class="headline">중앙대학교 가치투자학회 · ${COHORT}기까지 이어진 중앙대 금융·투자 학회</p>
<p><strong>지원 자격</strong> — ${esc(RECRUIT.eligibility)}. 전공·학번·나이 제한이 없고, 금융 지식이나 투자 경험이 없어도 지원할 수 있습니다.${nextRecruit ? ` <strong>다음 모집</strong>은 ${esc(nextRecruit)}로 예정되어 있습니다.` : ''} 모집 소식은 <a href="https://www.instagram.com/cau_rfs/">인스타그램 @cau_rfs</a>에서 가장 먼저 알려 드립니다.</p>
<section><h2>모집 일정 (직전 모집 기준)</h2><dl class="stats">
${RECRUIT.schedule.map((d) => `<div><dt>${esc(d.step)}</dt><dd>${esc(d.date)}</dd><span style="font-size:12px;color:var(--muted)">${esc(d.note)}</span></div>`).join('\n')}
</dl></section>
<section><h2>들어오면 하는 일</h2>${dl(commitments)}${dl(procNotes)}</section>
<section><h2>자주 묻는 질문</h2>${faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('\n')}</section>
<div class="btns"><a class="btn solid" href="/#recruit">모집 페이지 열기</a><a class="btn" href="/about/">학회 소개</a><a class="btn" href="/research/">보고서 보기</a></div>
<p class="note">문의: recruiting.rfs@gmail.com</p>
</main>
${FOOTER}`;
}

write('about/index.html', aboutPage());
write('recruiting/index.html', recruitingPage());

// sitemap에 두 페이지를 넣는다 (build-site.js가 sitemap을 새로 쓰므로 그 다음에 실행)
let sm = read('sitemap.xml');
const today = new Date().toISOString().slice(0, 10);
for (const p of ['about', 'recruiting']) {
  const loc = `${C.SITE}/${p}/`;
  if (!sm.includes(`<loc>${loc}</loc>`)) sm = sm.replace('</urlset>', `  <url><loc>${loc}</loc><lastmod>${today}</lastmod></url>\n</urlset>`);
}
write('sitemap.xml', sm);
console.log(`about/, recruiting/ 생성 (FAQ ${faqs.length}개, 일정 ${RECRUIT.schedule.length}단계)`);
