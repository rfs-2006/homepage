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
const changed = new Set();   // 이번 실행에서 내용이 바뀐 파일 (sitemap lastmod용)
const write = (p, s) => {
  const f = path.join(ROOT, p);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== s) changed.add(p);
  fs.writeFileSync(f, s);
};
const SHELL = fs.readFileSync(path.join(__dirname, 'page-shell.html'), 'utf8');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const json = (o) => JSON.stringify(o).replace(/<\//g, '<\\/');

// ---------- index.html에서 데이터 읽기 ----------

const HTML = read('index.html') + '\n' + read('assets/app.js');   // 데이터(RECRUIT·REPORTS 등)는 assets/app.js에

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
const REPORTS = constant('REPORTS');
const INDUSTRY = constant('INDUSTRY');
const IND_FULL = constant('IND_FULL');
const officers = field('people');
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
const FOOTER = `<footer>© R.F.S. (Rising Financial Stars) · 중앙대학교 가치투자학회 · <a href="/">caurfs.kr</a> · <a href="https://www.instagram.com/cau_rfs/">Instagram</a> · <a href="https://cafe.naver.com/caurfs">네이버 카페</a> · <a href="/privacy/">개인정보처리방침</a> · <span style="white-space:nowrap">Crafted by Minseok Kim (41st)</span></footer>
</body>
</html>
`;

function head({ title, desc, url, keywords, image }) {
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
    ...(image ? [`<meta property="og:image" content="${C.SITE}/${image}">`] : [`<meta property="og:image" content="${C.SITE}/assets/og/site.jpg">`, `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`]),
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
<script src="/research/spa.js"></script>
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
<script src="/research/spa.js"></script>
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
<p class="note">문의: recruiting@caurfs.kr</p>
</main>
${FOOTER}`;
}


// ---------- /fund/ (검색엔진용. 브라우저에서는 spa.js가 메인 앱의 FUND 화면을 띄운다) ----------

function fundPage() {
  const url = `${C.SITE}/fund/`;
  const title = 'AMT Fund · Weekly Strategy | 중앙대학교 가치투자학회 R.F.S. 운용팀';
  const desc = '중앙대학교 가치투자학회 R.F.S. Asset Management Team이 2020년부터 실제 자금으로 운용하는 RFS 펀드. 매주 투자전략(Weekly Strategy)을 공개하고, 보유종목·자산구성·기여도를 투명하게 기록합니다.';
  const keywords = ['RFS 펀드', 'AMT Fund', '중앙대 가치투자학회 펀드', '대학생 펀드 운용', '학회 펀드', '주간 투자전략', 'Weekly Strategy', '중앙대 RFS'];
  return head({ title, desc, url, keywords }) +
`<script type="application/ld+json">${json(crumbLd('Fund', url))}</script>
<script src="/research/spa.js"></script>
</head>
<body>
${NAV}
<main>
<div class="crumb"><a href="/">R.F.S.</a> › Fund</div>
<h1>AMT Fund</h1>
<p class="headline">Asset Management Team · 2020년부터 실제 자금으로 운용</p>
<p>R.F.S. Asset Management Team은 2020년 신설된 운용팀입니다. 학회원이 직접 투자전략을 세우고 포트폴리오를 구성해 RFS 펀드를 운용하며, 운용 성과를 분석해 운용 보고서와 매크로 보고서를 씁니다. 모든 운용은 교육 목적이며 특정 종목의 매수·매도를 권유하지 않습니다.</p>
<section><h2>Weekly Strategy</h2><p>운용팀은 매주 다음 주의 시장 판단과 대응 계획을 Weekly Strategy로 공개합니다. 지난주 리뷰, 섹터별 근거, 매매 계획을 담습니다.</p></section>
<section><h2>공개하는 것</h2><ul class="list"><li style="padding:12px 0"><strong>기준가와 수익률</strong><br><span style="color:var(--muted)">설정일 기준가 1,000에서 출발한 기준가 추이와 KOSPI·KOSDAQ 비교</span></li><li style="padding:12px 0"><strong>자산구성과 보유종목</strong><br><span style="color:var(--muted)">종목별 비중, 업종 구성, 현금 비중</span></li><li style="padding:12px 0"><strong>기여도</strong><br><span style="color:var(--muted)">종목별로 수익률에 얼마나 기여했는지</span></li></ul></section>
<div class="btns"><a class="btn solid" href="/#fund">운용 현황 보기</a><a class="btn" href="/#fund/strategy">Weekly Strategy 보기</a><a class="btn" href="/research/">기업분석 보고서</a></div>
</main>
${FOOTER}`;
}

// ---------- /people/ ----------

function peoplePage() {
  const url = `${C.SITE}/people/`;
  const title = 'People · 알럼나이 네트워크 | 중앙대학교 가치투자학회 R.F.S.';
  const careers = CHART.map((x) => `${x.label} ${x.pct}%`).join(' · ');
  const desc = `중앙대학교 가치투자학회 R.F.S.의 조직과 알럼나이 ${ALUMNI}명. 진로: ${careers}.`;
  const keywords = ['중앙대 가치투자학회 알럼나이', 'RFS 동문', '중앙대 금융권 취업', '중앙대 증권사', '중앙대 학회 진로', '중앙대 RFS'];
  const ko = { President: '회장', 'Vice President': '부회장', 'Asset Management': '운용팀장' };
  const job = (o) => ko[o.role] || o.desc;
  const orgLd = {
    '@context': 'https://schema.org', '@type': 'Organization', name: C.SITE_NAME, alternateName: ['R.F.S.', 'RFS', 'Rising Financial Stars', '중앙대 RFS'], url: `${C.SITE}/`,
    logo: `${C.SITE}/assets/rfs-seal-navy.png`, foundingDate: '2006', parentOrganization: { '@type': 'CollegeOrUniversity', name: '중앙대학교' },
    member: officers.map((o) => ({ '@type': 'Person', name: o.name, jobTitle: `${COHORT}기 ${job(o)} (${o.role})`, image: `${C.SITE}/${o.photo}`, memberOf: { '@type': 'Organization', name: C.SITE_NAME } })),
  };
  const cards = officers.map((o) => `<figure style="margin:0"><img src="/${o.photo}" alt="중앙대학교 가치투자학회 R.F.S. ${COHORT}기 ${attr(job(o))} ${attr(o.name)}" width="300" height="400" loading="lazy" style="width:100%;height:auto;aspect-ratio:3/4;object-fit:cover;border-radius:8px"><figcaption style="padding-top:8px"><strong>${esc(o.name)}</strong><br><span style="color:var(--muted)">${esc(`${job(o)} · ${o.role}`)}</span></figcaption></figure>`).join('');
  return head({ title, desc, url, keywords, image: 'assets/people-group.webp' }) +
`<script type="application/ld+json">${json(crumbLd('People', url))}</script>
<script type="application/ld+json">${json(orgLd)}</script>
<script src="/research/spa.js"></script>
</head>
<body>
${NAV}
<main>
<div class="crumb"><a href="/">R.F.S.</a> › People</div>
<h1>People</h1>
<p class="headline">${COHORT}기까지 이어진 알럼나이 ${ALUMNI}명</p>
<img class="cover" src="/assets/people-group.webp" alt="중앙대학교 가치투자학회 R.F.S. ${COHORT}기 단체 사진" style="width:100%;height:auto;border-radius:8px">
<section><h2>${COHORT}기 임원진</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:18px">${cards}</div></section>
<section><h2>조직</h2>${dl(teams)}</section>
<section><h2>알럼나이 진로</h2><p>${esc(careers)}</p><p>증권사, 자산운용사, 은행, IB·PE·VC, 회계법인 등 금융권 전반에 R.F.S. 동문이 있습니다. 현역 학회원은 직무 세미나와 선배님 멘토링으로 진로를 준비합니다.</p></section>
<div class="btns"><a class="btn solid" href="/#people">People 페이지 열기</a><a class="btn" href="/about/">학회 소개</a><a class="btn" href="/recruiting/">신입 학회원 모집</a></div>
</main>
${FOOTER}`;
}

// ---------- /research/ind-<id>/ 산업 리포트 ----------
// 웹 전문이 있는 산업 리포트(IND_FULL)마다 검색용 페이지. 1쪽 요약·목차는 assets/reports/full/ind-<id>.json에서

const isoD = (d) => d.replace(/\./g, '-');
const plain = (ps) => ps.map((seg) => seg.t).join('').replace(/\s+/g, ' ').trim();
function indPage(x) {
  const id = 'ind-' + x.id, url = `${C.SITE}/research/${id}/`;
  const full = JSON.parse(read(`assets/reports/full/${id}.json`));
  const p1 = full.p1 || {};
  const secs = (p1.sections || []).filter((sc) => sc.h || sc.ps.length);
  const toc = (full.blocks || []).filter((b) => b.h).map((b) => b.h);
  const first = secs.flatMap((sc) => sc.ps.map(plain)).find((t) => t.length > 40) || '';
  const [yy, hh] = x.sem.split('-');
  const year = x.date.slice(0, 4), yearUrl = `${C.SITE}/research/${year}/`;
  const semKo = `20${yy}년 ${hh}학기`;
  const head1 = p1.head || (p1.cover && p1.cover.title) || '';
  const nm0 = x.name.replace(/\s*산업$/, '');
  const dupOlder = indWeb.some((y) => y !== x && y.name.replace(/\s*산업$/, '') === nm0 && y.date > x.date);   // 같은 산업이 또 있으면 옛것에 연도
  const title = `${nm0} 산업 전망${dupOlder ? ` (${x.date.slice(0, 4)})` : ''} | 산업분석 리포트 - 중앙대 RFS`;
  // 1쪽 요약도 장 제목도 없는 옛 양식은 INDUSTRY의 desc(손으로 쓴 한 줄 소개)를 쓴다
  const desc = (`${nm0} 산업 전망. ${semKo} R.F.S. 산업분석${head1 ? ' — ' + head1 : ''}. ` + (first || x.desc || toc.join(' · '))).slice(0, 155);
  const nm = nm0;
  const keywords = [`${x.name}`, `${nm} 산업 분석`, `${nm} 산업 전망`, `${x.name} 리포트`, `${x.name} 보고서`, '산업분석 리포트', ...C.PAGE_BRAND_KEYWORDS];
  const ld = [{
    '@context': 'https://schema.org', '@type': 'Report', headline: title.replace(/ - 중앙대 RFS$/, ''), description: desc,
    datePublished: isoD(x.date), inLanguage: 'ko', url, author: ORG, publisher: ORG, about: { '@type': 'Thing', name: x.name },
    isPartOf: { '@type': 'CollectionPage', '@id': yearUrl, url: yearUrl, name: `${year}년 R.F.S. 리포트` },
    associatedMedia: { '@type': 'MediaObject', contentUrl: `${C.SITE}/${x.pdf}`, encodingFormat: 'application/pdf' },
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'R.F.S.', item: `${C.SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Research', item: `${C.SITE}/research/` },
      { '@type': 'ListItem', position: 3, name: year, item: yearUrl },
      { '@type': 'ListItem', position: 4, name: x.name, item: url },
    ],
  }];
  // 같은 섹터의 다른 산업 리포트, 발간일이 가까운 순으로 5편
  const near = indWeb.filter((y) => y !== x && y.sector === x.sector)
    .sort((a, b) => Math.abs(Date.parse(isoD(a.date)) - Date.parse(isoD(x.date))) - Math.abs(Date.parse(isoD(b.date)) - Date.parse(isoD(x.date))) || b.date.localeCompare(a.date))
    .slice(0, 5);
  const nearHtml = near.map((y) => `<li><a href="/research/ind-${y.id}/"><span>${esc(y.name)}</span><span class="meta">${esc(`${y.sector} · ${y.date}`)}</span></a></li>`).join('');
  const body = secs.map((sc) => (sc.h ? `<h3>${esc(sc.h)}</h3>` : '') + sc.ps.map((ps) => `<p>${esc(plain(ps))}</p>`).join('')).join('');
  return head({ title, desc, url, keywords }) +
`<script type="application/ld+json">${json(ld)}</script>
<script src="/research/spa.js"></script>
</head>
<body>
${NAV}
<main>
<div class="crumb"><a href="/">R.F.S.</a> › <a href="/research/">Research</a> › <a href="/research/${year}/">${year}</a> › ${esc(x.name)}</div>
<h1>${esc(/산업$/.test(x.name) ? x.name + ' 분석' : x.name + ' 산업분석')}</h1>
${head1 ? `<p class="headline">${esc(head1)}</p>` : ''}
<dl class="stats"><div><dt>발간</dt><dd>${esc(x.date)}</dd></div><div><dt>학기</dt><dd>${esc(semKo)}</dd></div><div><dt>섹터</dt><dd>${esc(x.sector)}</dd></div><div><dt>분량</dt><dd>${x.pages}쪽</dd></div>${x.team ? `<div><dt>작성</dt><dd>Research Team ${esc(x.team)}</dd></div>` : ''}</dl>
${body ? `<section><h2>요약</h2>${body}</section>` : ''}
${toc.length ? `<section><h2>목차</h2><ul class="list">${toc.map((t) => `<li style="padding:8px 0">${esc(t)}</li>`).join('')}</ul></section>` : ''}
<div class="btns"><a class="btn solid" href="/${x.pdf}">보고서 PDF 보기 <span style="font-weight:400;opacity:.8">(${x.pages}쪽)</span></a><a class="btn" href="/#research/${id}">R.F.S. 사이트에서 전문 읽기</a></div>
${nearHtml ? `<section><h2>같은 섹터 리포트</h2><ul class="list">${nearHtml}</ul>` : '<section>'}
<p style="margin-top:14px"><a href="/research/${year}/">${year}년 리포트 전체 보기 →</a> · <a href="/research/">전체 보고서 보기 →</a></p></section>
<p class="note">본 자료는 중앙대학교 가치투자학회 R.F.S.의 학술 리서치 결과물이며, 특정 종목의 매매를 권유하지 않습니다.</p>
</main>
${FOOTER}`;
}
const indWeb = INDUSTRY.filter((x) => IND_FULL.includes('ind-' + x.id));

// ---------- /research/<연도>/ 연도별 모음 ----------
// 기업분석·산업분석을 연도별로 묶은 허브. spa.js를 넣지 않는다: 메인 앱은 /research/<x>/를 리포트 id로 읽어
// 없는 리포트 화면을 띄우고, 앱의 Research 화면에는 연도 필터가 없어서 이 페이지가 브라우저에서도 그대로 보여야 한다

const repSorted = [...REPORTS].sort((a, b) => b.date.localeCompare(a.date));
const indSorted = [...INDUSTRY].sort((a, b) => b.date.localeCompare(a.date));
const YEARS = [...new Set([...REPORTS, ...INDUSTRY].map((r) => r.date.slice(0, 4)))].sort().reverse();
const hasIndPage = (x) => IND_FULL.includes('ind-' + x.id);
const yearLastmod = (y) => isoD([...REPORTS, ...INDUSTRY].filter((r) => r.date.startsWith(y)).map((r) => r.date).sort().pop());

function yearPage(y) {
  const url = `${C.SITE}/research/${y}/`;
  const reps = repSorted.filter((r) => r.date.startsWith(y));
  const inds = indSorted.filter((x) => x.date.startsWith(y));
  const title = `${y} 기업분석 보고서${inds.length ? ' · 산업 리포트' : ''} | R.F.S. 중앙대학교 가치투자학회`;
  const names = [...new Set(reps.map((r) => r.name))];
  const desc = (`중앙대학교 가치투자학회 R.F.S.가 ${y}년에 발간한 기업분석 보고서 ${reps.length}편${inds.length ? `과 산업분석 리포트 ${inds.length}편` : ''}. ` +
    `${names.slice(0, 6).join(', ')}${names.length > 6 ? ' 등' : ''}의 투자의견·목표주가·밸류에이션${inds.length ? `, ${[...new Set(inds.map((x) => x.name.replace(/\s*산업$/, '')))].slice(0, 3).join('·')} 등 산업 전망` : ''}.`).slice(0, 160);
  const keywords = [`${y} 기업분석 보고서`, `${y} 기업분석 리포트`, `${y} 산업분석`, ...names.slice(0, 10).map((n) => `${n} 리포트`), ...C.PAGE_BRAND_KEYWORDS];
  const items = [
    ...reps.map((r) => ({ url: `${C.SITE}/research/${r.id}/`, name: `${r.name} (${r.ticker}) 기업분석` })),
    ...inds.map((x) => ({ url: hasIndPage(x) ? `${C.SITE}/research/ind-${x.id}/` : `${C.SITE}/${x.pdf}`, name: `${x.name} 산업분석` })),
  ];
  const ld = [{
    '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': url, name: title.replace(/ \| .*$/, ''), description: desc, url, inLanguage: 'ko', publisher: ORG,
    isPartOf: { '@type': 'CollectionPage', url: `${C.SITE}/research/` },
    mainEntity: { '@type': 'ItemList', numberOfItems: items.length, itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: it.url, name: it.name })) },
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'R.F.S.', item: `${C.SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Research', item: `${C.SITE}/research/` },
      { '@type': 'ListItem', position: 3, name: y, item: url },
    ],
  }];
  const repRows = reps.map((r) => `<li><a href="/research/${r.id}/"><span>${esc(`${r.name} (${r.ticker}) — ${r.headline}`)}</span><span class="meta">${esc(`${r.team} · ${r.op} · ${r.tp || '-'} · ${r.date}`)}</span></a></li>`).join('');
  const indRows = inds.map((x) => `<li><a href="${hasIndPage(x) ? `/research/ind-${x.id}/` : `/${x.pdf}`}"><span>${esc(x.name)}${hasIndPage(x) ? '' : ' <small style="color:var(--muted)">(PDF)</small>'}</span><span class="meta">${esc(`${x.sector}${x.team ? ` · Research Team ${x.team}` : ''} · ${x.date}`)}</span></a></li>`).join('');
  return head({ title, desc, url, keywords }) +
`<script type="application/ld+json">${json(ld)}</script>
</head>
<body>
${NAV}
<main>
<div class="crumb"><a href="/">R.F.S.</a> › <a href="/research/">Research</a> › ${y}</div>
<h1>${y}년 리포트</h1>
<p class="headline">중앙대학교 가치투자학회 R.F.S. 기업분석 보고서 ${reps.length}편${inds.length ? ` · 산업분석 리포트 ${inds.length}편` : ''}</p>
<nav class="years" aria-label="연도별 리포트">${YEARS.map((z) => `<a href="/research/${z}/"${z === y ? ' aria-current="page"' : ''}>${z}</a>`).join('')}</nav>
${reps.length ? `<section><h2>기업분석 보고서 ${reps.length}편</h2><ul class="list">${repRows}</ul></section>` : ''}
${inds.length ? `<section id="industry"><h2>산업분석 리포트 ${inds.length}편</h2><ul class="list">${indRows}</ul></section>` : ''}
<div class="btns"><a class="btn solid" href="/research/">전체 보고서 보기</a><a class="btn" href="/#research">R.F.S. 사이트에서 보기</a></div>
<p class="note">본 자료는 중앙대학교 가치투자학회 R.F.S.의 학술 리서치 결과물이며, 특정 종목의 매매를 권유하지 않습니다. 투자의견·목표주가는 각 보고서 발간일 기준입니다.</p>
</main>
${FOOTER}`;
}

// ---------- _headers: 리포트 PDF → HTML 페이지 canonical ----------
// 구글이 PDF를 HTML 리포트 페이지와 따로 색인해 서로 경쟁한다. PDF 응답에 Link rel=canonical 헤더를 붙인다.
// 보안·캐시 헤더는 netlify.toml의 [[headers]]에 있고, Netlify는 경로가 맞는 규칙을 모두 합쳐 적용한다 (여기는 Link만)

function headersFile() {
  const real = (rel) => {   // 디스크의 실제 대소문자로 (Netlify 경로 매칭은 대소문자를 가린다)
    let dir = ROOT;
    for (const part of rel.split('/')) {
      const hit = fs.existsSync(dir) && fs.readdirSync(dir).find((f) => f.toLowerCase() === part.toLowerCase());
      if (!hit) return null;
      dir = path.join(dir, hit);
    }
    return path.relative(ROOT, dir).split(path.sep).join('/');
  };
  const rows = [...REPORTS.map((r) => [r.pdf, `research/${r.id}/`]), ...indWeb.map((x) => [x.pdf, `research/ind-${x.id}/`])]
    .map(([pdf, page]) => [real(pdf), page]).filter(([pdf]) => pdf);
  const body = rows.map(([pdf, page]) => `/${encodeURI(pdf)}\n  Link: <${C.SITE}/${page}>; rel="canonical"`).join('\n');
  return { n: rows.length, text: `# 자동 생성 (tools/build-pages.js). 손으로 고치지 않는다.\n# 리포트 PDF가 검색 결과에서 HTML 리포트 페이지와 경쟁하지 않게 canonical을 HTML로 지정한다.\n# 보안·캐시 헤더는 netlify.toml에 있고 Netlify가 함께 적용한다.\n\n${body}\n` };
}

// ---------- /privacy/ ----------
// 가입 신청 폼(assets/join.js)의 수집·이용 동의와 같은 내용. 바꾸면 join.js의 동의 표와 member-signup의 POLICY_VERSION도 같이 바꾼다

function privacyPage() {
  const url = `${C.SITE}/privacy/`;
  const title = '개인정보처리방침 | 중앙대학교 가치투자학회 R.F.S.';
  const desc = '중앙대학교 가치투자학회 R.F.S. 홈페이지 회원 가입 신청에서 받는 개인정보의 항목, 목적, 보유 기간, 파기, 위탁, 이용자의 권리.';
  const row = (a, b) => `<tr><th style="text-align:left;padding:10px 14px 10px 0;vertical-align:top;white-space:nowrap;font-weight:600">${a}</th><td style="padding:10px 0;color:var(--muted)">${b}</td></tr>`;
  return head({ title, desc, url, keywords: ['R.F.S. 개인정보처리방침'] }) +
`</head>
<body>
${NAV}
<main>
<div class="crumb"><a href="/">R.F.S.</a> › 개인정보처리방침</div>
<h1>개인정보처리방침</h1>
<p class="headline">시행일 2026년 11월 4일 (휴대폰 번호 수집, 알림 메일 위탁 추가)</p>
<p>중앙대학교 가치투자학회 R.F.S.(이하 "학회")는 「개인정보 보호법」에 따라 홈페이지 회원의 개인정보를 처리합니다. 학회는 영리 목적이 아닌 학회 운영을 위해 필요한 최소한의 정보만 받습니다.</p>
<section><h2>1. 처리하는 항목과 목적</h2><table style="border-collapse:collapse;width:100%">
${row('필수', '아이디, 비밀번호, 이름, 닉네임, 이메일, 휴대폰 번호, 생년월일')}
${row('선택', '기수(학회원인 경우), 블로그 주소')}
${row('자동 생성', '가입 신청·승인 시각, 접속 IP의 일방향 암호화 값(중복 신청 방지, 승인 후 삭제)')}
${row('이용 중 생성', 'Polaris(리서치 챗봇)에 로그인한 채 남긴 질문과 답. 지난 대화를 다시 보여 주는 데만 쓰며, 회원이 지우면 즉시, 탈퇴하면 계정과 함께 파기합니다.')}
${row('목적', '학회원 여부 확인과 가입 승인, 승인 결과 문자 안내(휴대폰 번호), 로그인, 학회원 전용 서비스(AGORA 등) 제공, 운영 공지 연락')}
</table><p style="color:var(--muted)">비밀번호는 복원할 수 없는 방식으로 저장되며 학회 운영진도 볼 수 없습니다. 만 14세 미만은 가입할 수 없습니다.</p></section>
<section><h2>2. 보유 기간과 파기</h2><ul class="list">
<li style="padding:8px 0">회원 정보는 탈퇴할 때까지 보유하고, 탈퇴를 요청하면 지체 없이 파기합니다.</li>
<li style="padding:8px 0">가입을 승인하지 않은 신청은 거절하는 즉시 파기합니다.</li>
<li style="padding:8px 0">전자 파일은 복구할 수 없는 방법으로 삭제합니다.</li></ul></section>
<section><h2>3. 제3자 제공</h2><p>학회는 회원의 개인정보를 제3자에게 제공하지 않습니다. 법령에 따라 요구되는 경우는 예외로 합니다.</p></section>
<section><h2>4. 처리 위탁과 국외 이전</h2><table style="border-collapse:collapse;width:100%">
${row('Supabase Inc. (미국)', '회원 계정·로그인, 데이터 저장. 가입 신청 시 입력한 정보 전체가 Supabase의 클라우드 서버에 저장됩니다(정보통신망을 통한 전송, 회원 탈퇴 시까지).')}
${row('(주)솔라피 (대한민국)', '문자 발송: 가입 신청 알림(운영진에게 신청자의 이름·기수), 가입 승인 안내(신청자의 휴대폰 번호로 이름·아이디), AGORA 선배님 연락처 문자(학회원이 입력한 번호로)')}
${row('Resend, Inc. (미국)', '운영진 알림 메일 발송: 가입 신청·승인, AGORA 문자 발송 기록(회원의 이름·아이디·기수, 문자를 받은 번호의 가운데를 가린 값). 정보통신망을 통해 발송 시점에 전송되며 발송 기록은 Resend의 보관 기간 동안 남습니다.')}
${row('Netlify, Inc. (미국)', '홈페이지 호스팅(접속 기록)')}
</table><p style="color:var(--muted)">국외 이전을 원하지 않으면 가입을 신청하지 않을 수 있습니다. 이 경우 학회원 전용 서비스를 이용할 수 없습니다.</p></section>
<section><h2>5. 이용자의 권리</h2><p>회원은 언제든지 자신의 개인정보 열람, 정정, 삭제, 처리 정지와 탈퇴를 요청할 수 있습니다. 아래 이메일로 요청하면 지체 없이 처리합니다.</p></section>
<section><h2>6. 동의를 거부할 권리</h2><p>개인정보 수집·이용에 동의하지 않을 수 있습니다. 다만 필수 항목에 동의하지 않으면 가입 신청을 할 수 없습니다.</p></section>
<section><h2>7. 쿠키 등</h2><p>로그인 상태 유지를 위해 브라우저 저장소를 사용하고, 방문 통계를 위해 Google Analytics를 사용합니다. 브라우저 설정에서 저장을 거부할 수 있으며, 이 경우 로그인이 유지되지 않을 수 있습니다.</p></section>
<section><h2>8. 개인정보 보호책임자</h2><p>R.F.S. 회장 · <a href="mailto:contact@caurfs.kr">contact@caurfs.kr</a></p>
<p style="color:var(--muted)">개인정보 침해 신고·상담: 개인정보침해신고센터(privacy.kisa.or.kr, 국번 없이 118), 개인정보분쟁조정위원회(www.kopico.go.kr, 1833-6972)</p></section>
<section><h2>9. 변경</h2><p>이 방침을 바꾸면 시행 7일 전에 이 페이지에 알립니다.</p></section>
</main>
${FOOTER}`;
}

write('about/index.html', aboutPage());
write('fund/index.html', fundPage());
write('people/index.html', peoplePage());
write('recruiting/index.html', recruitingPage());
write('privacy/index.html', privacyPage());
// Polaris 화면(chat/)의 무작위 선배님 문구용 기수별 명단 (홈에 이미 공개된 ROSTER 그대로, 423KB app.js를 받지 않게 따로 뺀다)
write('assets/roster.json', JSON.stringify(constant('ROSTER')));
for (const x of indWeb) write(`research/ind-${x.id}/index.html`, indPage(x));
for (const y of YEARS) write(`research/${y}/index.html`, yearPage(y));
const hdr = headersFile();
write('_headers', hdr.text);

// 홈 index.html의 <noscript>에 리포트 링크 전부 (화면은 JS로 그려서 검색엔진이 따라갈 링크가 HTML에 없다. JS가 켜진 화면에는 안 보인다)
{
  const reps = constant('REPORTS');
  const links = [...reps].sort((a, b) => b.date.localeCompare(a.date)).map((r) => `<li><a href="/research/${r.id}/">${esc(`${r.name} (${r.ticker}) 기업분석 리포트`)}</a></li>`).join('') +
    [...indWeb].sort((a, b) => b.date.localeCompare(a.date)).map((x) => `<li><a href="/research/ind-${x.id}/">${esc(`${x.name} 산업분석 리포트`)}</a></li>`).join('');
  const block = `<!--seo-links--><nav aria-label="리포트"><h2>리포트</h2><ul>${YEARS.map((y) => `<li><a href="/research/${y}/">${y}년 리포트</a></li>`).join('')}${links}</ul></nav><!--/seo-links-->`;
  let home = read('index.html');
  home = /<!--seo-links-->[\s\S]*?<!--\/seo-links-->/.test(home) ? home.replace(/<!--seo-links-->[\s\S]*?<!--\/seo-links-->/, () => block) : home.replace('\n</noscript>', () => '\n' + block + '\n</noscript>');
  write('index.html', home);
}

// /research/ 목록에 산업 리포트 칸 (build-site.js가 새로 쓴 뒤에 붙인다)
{
  let ri = read('research/index.html').replace(/\n<section id="industry">[\s\S]*?<\/section>/, '');
  const rows = [...indWeb].sort((a, b) => b.date.localeCompare(a.date)).map((x) => `<li><a href="/research/ind-${x.id}/"><span>${esc(x.name)}</span><span class="meta">${esc(`${x.sector} · ${x.date}`)}</span></a></li>`).join('');
  ri = ri.replace('\n</main>', `\n<section id="industry"><h2>산업분석 보고서 ${indWeb.length}편</h2><ul class="list">${rows}</ul></section>\n</main>`);
  write('research/index.html', ri);
}

// sitemap에 두 페이지를 넣는다 (build-site.js가 sitemap을 새로 쓰므로 그 다음에 실행)
let sm = read('sitemap.xml');
const today = new Date().toISOString().slice(0, 10);
// lastmod는 페이지 내용이 마지막으로 바뀐 날: 이번에 바뀌었거나 커밋 전이면 오늘, 아니면 그 파일의 마지막 커밋 날짜
// (예전처럼 매번 오늘 날짜를 쓰면 검색엔진이 lastmod를 믿지 않게 된다)
function lastmod(file) {
  if (changed.has(file)) return today;
  try {
    const { execFileSync } = require('child_process');
    const git = (...a) => execFileSync('git', a, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (git('status', '--porcelain', '--', file)) return today;
    return git('log', '-1', '--format=%cs', '--', file) || today;
  } catch { return today; }
}
for (const p of ['about', 'recruiting', 'fund', 'privacy']) {
  const loc = `${C.SITE}/${p}/`;
  if (!sm.includes(`<loc>${loc}</loc>`)) sm = sm.replace('</urlset>', `  <url><loc>${loc}</loc><lastmod>${lastmod(`${p}/index.html`)}</lastmod></url>\n</urlset>`);
}
// People: 사진을 구글 이미지 검색에 올리도록 image:image를 단다
sm = sm.replace(/  <url><loc>[^<]*\/people\/<\/loc>[\s\S]*?<\/url>\n/, '').replace(/  <url><loc>[^<]*\/research\/(ind-\d+|\d{4})\/<\/loc>[^\n]*\n/g, '');
if (!sm.includes('xmlns:image')) sm = sm.replace('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">');
const imgs = [{ src: 'assets/people-group.webp' }, ...officers.map((o) => ({ src: o.photo }))];
sm = sm.replace('</urlset>', YEARS.map((y) => `  <url><loc>${C.SITE}/research/${y}/</loc><lastmod>${yearLastmod(y)}</lastmod></url>\n`).join('') +
  `  <url><loc>${C.SITE}/people/</loc><lastmod>${lastmod('people/index.html')}</lastmod>${imgs.map((i) => `<image:image><image:loc>${C.SITE}/${i.src}</image:loc></image:image>`).join('')}</url>\n` +
  indWeb.map((x) => `  <url><loc>${C.SITE}/research/ind-${x.id}/</loc><lastmod>${isoD(x.date)}</lastmod></url>\n`).join('') + '</urlset>');
write('sitemap.xml', sm);
console.log(`연도별 모음 ${YEARS.length}개 (${YEARS[YEARS.length - 1]}–${YEARS[0]}), PDF canonical 헤더 ${hdr.n}개`);
console.log(`산업 리포트 ${indWeb.length}편, about/, recruiting/, fund/, people/, privacy/ 생성 (FAQ ${faqs.length}개, 일정 ${RECRUIT.schedule.length}단계)`);
