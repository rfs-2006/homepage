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
const FOOTER = `<footer>© R.F.S. (Rising Financial Stars) · 중앙대학교 가치투자학회 · <a href="/">caurfs.kr</a> · <a href="https://www.instagram.com/cau_rfs/">Instagram</a> · <a href="https://cafe.naver.com/caurfs">네이버 카페</a> · <a href="/privacy/">개인정보처리방침</a> · <span style="white-space:nowrap">Crafted by Minseok Kim (41st)</span></footer>
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
  return head({ title, desc, url, keywords }) +
`<script type="application/ld+json">${json(crumbLd('People', url))}</script>
<script src="/research/spa.js"></script>
</head>
<body>
${NAV}
<main>
<div class="crumb"><a href="/">R.F.S.</a> › People</div>
<h1>People</h1>
<p class="headline">${COHORT}기까지 이어진 알럼나이 ${ALUMNI}명</p>
<section><h2>조직</h2>${dl(teams)}</section>
<section><h2>알럼나이 진로</h2><p>${esc(careers)}</p><p>증권사, 자산운용사, 은행, IB·PE·VC, 회계법인 등 금융권 전반에 R.F.S. 동문이 있습니다. 현역 학회원은 직무 세미나와 선배님 멘토링으로 진로를 준비합니다.</p></section>
<div class="btns"><a class="btn solid" href="/#people">People 페이지 열기</a><a class="btn" href="/about/">학회 소개</a><a class="btn" href="/recruiting/">신입 학회원 모집</a></div>
</main>
${FOOTER}`;
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
<p class="headline">시행일 2026년 10월 26일</p>
<p>중앙대학교 가치투자학회 R.F.S.(이하 "학회")는 「개인정보 보호법」에 따라 홈페이지 회원의 개인정보를 처리합니다. 학회는 영리 목적이 아닌 학회 운영을 위해 필요한 최소한의 정보만 받습니다.</p>
<section><h2>1. 처리하는 항목과 목적</h2><table style="border-collapse:collapse;width:100%">
${row('필수', '아이디, 비밀번호, 이름, 닉네임, 이메일, 생년월일')}
${row('선택', '기수(학회원인 경우), 블로그 주소')}
${row('자동 생성', '가입 신청·승인 시각, 접속 IP의 일방향 암호화 값(중복 신청 방지, 승인 후 삭제)')}
${row('목적', '학회원 여부 확인과 가입 승인, 로그인, 학회원 전용 서비스(AGORA 등) 제공, 운영 공지 연락')}
</table><p style="color:var(--muted)">비밀번호는 복원할 수 없는 방식으로 저장되며 학회 운영진도 볼 수 없습니다. 만 14세 미만은 가입할 수 없습니다.</p></section>
<section><h2>2. 보유 기간과 파기</h2><ul class="list">
<li style="padding:8px 0">회원 정보는 탈퇴할 때까지 보유하고, 탈퇴를 요청하면 지체 없이 파기합니다.</li>
<li style="padding:8px 0">가입을 승인하지 않은 신청은 거절하는 즉시 파기합니다.</li>
<li style="padding:8px 0">전자 파일은 복구할 수 없는 방법으로 삭제합니다.</li></ul></section>
<section><h2>3. 제3자 제공</h2><p>학회는 회원의 개인정보를 제3자에게 제공하지 않습니다. 법령에 따라 요구되는 경우는 예외로 합니다.</p></section>
<section><h2>4. 처리 위탁과 국외 이전</h2><table style="border-collapse:collapse;width:100%">
${row('Supabase Inc. (미국)', '회원 계정·로그인, 데이터 저장. 가입 신청 시 입력한 정보 전체가 Supabase의 클라우드 서버에 저장됩니다(정보통신망을 통한 전송, 회원 탈퇴 시까지).')}
${row('(주)솔라피 (대한민국)', '가입 신청 알림 문자 발송(운영진에게 신청자의 이름·기수만 전송)')}
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

// sitemap에 두 페이지를 넣는다 (build-site.js가 sitemap을 새로 쓰므로 그 다음에 실행)
let sm = read('sitemap.xml');
const today = new Date().toISOString().slice(0, 10);
for (const p of ['about', 'recruiting', 'fund', 'people', 'privacy']) {
  const loc = `${C.SITE}/${p}/`;
  if (!sm.includes(`<loc>${loc}</loc>`)) sm = sm.replace('</urlset>', `  <url><loc>${loc}</loc><lastmod>${today}</lastmod></url>\n</urlset>`);
}
write('sitemap.xml', sm);
console.log(`about/, recruiting/, fund/, people/, privacy/ 생성 (FAQ ${faqs.length}개, 일정 ${RECRUIT.schedule.length}단계)`);
