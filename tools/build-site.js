#!/usr/bin/env node
// 정적 페이지·SEO 생성기. index.html의 REPORTS 배열 하나를 원천으로 아래를 다시 쓴다.
//   1) research/<id>/index.html  리포트 개별 페이지 (없으면 새로 만든다)
//   2) research/index.html       전체 목록
//   3) 루트 index.html의 <meta name="keywords"> 한 줄 (나머지는 건드리지 않음)
//   4) sitemap.xml, robots.txt
// 공유 썸네일(assets/og/*.jpg)은 tools/build-og.js가 만든다. 있으면 og:image로 쓴다.
//
// 사용법: 사이트 루트에서  node tools/build-og.js && node tools/build-site.js && node tools/build-pages.js

const fs = require('fs');
const path = require('path');
const C = require('./seo-config');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => {
  fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, p), s);
};
const SHELL = fs.readFileSync(path.join(__dirname, 'page-shell.html'), 'utf8');

// ---------- 데이터 ----------

function loadReports() {
  const html = read('index.html');
  const start = html.indexOf('const REPORTS = [');
  if (start < 0) throw new Error('index.html에서 const REPORTS를 찾지 못했습니다');
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

// ---------- 유틸 ----------

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');
const isoDate = (d) => d.replace(/\./g, '-');
const isForeign = (r) => r.region === 'Global' || !/^\d{6}$/.test(r.ticker);
const hasTp = (r) => r.tp && r.tp !== '-';
const uniq = (arr) => [...new Set(arr.filter(Boolean).map((s) => s.trim()).filter(Boolean))];
const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
const json = (o) => JSON.stringify(o).replace(/<\//g, '<\\/');

function clip(s, max) {
  const chars = [...s];
  return chars.length <= max ? s : chars.slice(0, max - 1).join('').trimEnd() + '…';
}

// 디스크의 실제 파일명(대소문자)으로 맞춘다. 없으면 null.
function resolveAsset(rel) {
  if (!rel) return null;
  let dir = ROOT;
  for (const part of rel.replace(/^\//, '').split('/')) {
    if (!fs.existsSync(dir)) return null;
    const hit = fs.readdirSync(dir).find((f) => f.toLowerCase() === part.toLowerCase());
    if (!hit) return null;
    dir = path.join(dir, hit);
  }
  return '/' + path.relative(ROOT, dir).split(path.sep).join('/');
}

const ORG = { '@type': 'Organization', name: C.SITE_NAME, url: `${C.SITE}/` };
const NAV = `<header class="nav"><a class="brand" href="/">R.F.S.<small>중앙대학교 가치투자학회</small></a>
<nav><a href="/research/">Research</a><a href="/about/">About</a><a href="/recruiting/">Recruiting</a></nav></header>`;
const FOOTER = `<footer>© R.F.S. (Rising Financial Stars) · 중앙대학교 가치투자학회 · <a href="https://www.instagram.com/cau_rfs/">Instagram</a> · <a href="https://cafe.naver.com/caurfs">네이버 카페</a></footer>
</body>
</html>
`;
const docStart = (seo) => `<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n${seo}${SHELL}`;

// ---------- 키워드 ----------

function companyKeywords(group) {
  const a = C.ALIASES[group[0].ticker] || {};
  const ticker = group[0].ticker;
  const names = uniq([...group.map((r) => r.name.replace(/\s+plc\.?$/i, '')), ...group.map((r) => r.name), ...(a.expand || [])]);
  const kw = [];
  for (const n of names) {
    kw.push(n);
    for (const s of C.COMPANY_SUFFIXES) kw.push(`${n} ${s}`);
  }
  kw.push(ticker);
  if (group.some(isForeign)) kw.push(`${ticker} 주가`);
  kw.push(...(a.aka || []));
  return uniq(kw);
}

function generalKeywords() {
  const combos = [];
  for (const s of C.SCHOOLS) for (const c of C.CLUBS) combos.push(`${s} ${c}`, `${s}${c}`);
  return uniq([...C.GENERAL_KEYWORDS, ...combos]);
}

// ---------- 리포트 페이지 ----------

function koName(r) {
  const a = C.ALIASES[r.ticker];
  return isForeign(r) && a && a.expand ? a.expand[0] : null;
}

function ogImage(r) {
  const og = resolveAsset(`assets/og/${r.id}.jpg`);
  const cover = resolveAsset(r.cover) || resolveAsset(r.heroCover);
  return { url: C.SITE + (og || cover || C.DEFAULT_IMAGE), large: Boolean(og || cover) };
}

function reportSeo(r, { yearSuffix, groupKeywords }) {
  const ko = koName(r);
  const display = ko ? `${r.name} (${ko})` : r.name;
  const url = `${C.SITE}/research/${r.id}/`;
  const title = `${display} 기업분석 리포트${yearSuffix} | 중앙대 가치투자학회 RFS`;
  const idPart = ko ? `${r.name}(${ko}, ${r.ticker})` : `${r.name}(${r.ticker})`;
  const lead = `${idPart} 기업분석 리포트. 투자의견 ${r.op}${hasTp(r) ? `, 목표주가 ${r.tp}` : ''}. `;
  const desc = clip(`${lead}${r.headline} — ${r.summary}`, 150);
  const ogTitle = `${r.name} (${ko ? `${ko}, ` : ''}${r.ticker}) 기업분석 리포트 · ${r.op}${hasTp(r) ? ` · 목표주가 ${r.tp}` : ''} | R.F.S.`;
  const img = ogImage(r);
  const keywords = uniq([...groupKeywords, ...C.PAGE_BRAND_KEYWORDS]).join(', ');
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${attr(desc)}">`,
    `<meta name="keywords" content="${attr(keywords)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="${attr(C.SITE_NAME)}">`,
    `<meta property="og:locale" content="ko_KR">`,
    `<meta property="og:title" content="${attr(ogTitle)}">`,
    `<meta property="og:description" content="${attr(desc)}">`,
    `<meta property="og:image" content="${attr(img.url)}">`,
    ...(img.large ? ['<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">'] : []),
    `<meta property="og:url" content="${url}">`,
    `<meta property="article:published_time" content="${isoDate(r.date)}">`,
    `<meta name="twitter:card" content="${img.large ? 'summary_large_image' : 'summary'}">`,
    '',
  ].join('\n');
}

// 같은 섹터 최대 4편 + 최신순으로 채워 6편
function related(r, sorted) {
  const same = sorted.filter((x) => x.sector === r.sector && x.id !== r.id).slice(0, 4);
  const rest = sorted.filter((x) => x.id !== r.id && !same.includes(x));
  return [...same, ...rest].slice(0, 6);
}

function reportPage(r, sorted, seoOpts) {
  const url = `${C.SITE}/research/${r.id}/`;
  const cover = resolveAsset(r.cover);
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'Report',
      headline: `${r.name} (${r.ticker}) — ${r.headline}`,
      description: r.summary, datePublished: isoDate(r.date), inLanguage: 'ko', url,
      ...(r.cover ? { image: `${C.SITE}/${r.cover}` } : {}),
      author: ORG, publisher: ORG,
      about: { '@type': 'Corporation', name: r.name, tickerSymbol: r.ticker },
      associatedMedia: { '@type': 'MediaObject', contentUrl: `${C.SITE}/${r.pdf}`, encodingFormat: 'application/pdf' },
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'R.F.S.', item: `${C.SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Research', item: `${C.SITE}/research/` },
        { '@type': 'ListItem', position: 3, name: r.name, item: url },
      ],
    },
  ];
  const third = r.buy ? ['매수가', r.buy] : ['분석 당시 주가', r.cur || '-'];
  const stats = [['Rating', r.op], ['목표주가', r.tp || '-'], third, ['상승여력', r.upside || '-'], ['섹터', r.sector], ['발간일', r.date]];
  const points = (r.points || []).map((p) => `<h3>${esc(p.title)}</h3><p>${esc(p.body)}</p>`).join('');
  const rel = related(r, sorted).map((x) => `<li><a href="/research/${x.id}/"><span>${esc(`${x.name} (${x.ticker}) — ${x.headline}`)}</span><span class="meta">${esc(`${x.sector} · ${x.date}`)}</span></a></li>`).join('');
  return docStart(reportSeo(r, seoOpts)) +
`<script type="application/ld+json">${json(ld)}</script>
</head>
<body>
${NAV}
<main>
<div class="crumb"><a href="/">R.F.S.</a> › <a href="/research/">Research</a> › ${esc(r.name)}</div>
<h1>${esc(`${r.name} (${r.ticker})`)} 기업분석</h1>
<p class="headline">${esc(r.headline)}</p>
${cover ? `<img class="cover" src="/${r.cover}" alt="${attr(r.name)} 기업분석 보고서 표지" width="1600" height="900">` : ''}
<dl class="stats">${stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
<section><h2>요약</h2><p>${esc(r.summary)}</p></section>
<section><h2>투자포인트</h2>${points}</section>
<section><h2>밸류에이션</h2><p>${esc(r.valuation)}</p></section>
<section><h2>작성</h2><p>${esc(`${r.team} · ${r.members}`)}</p></section>
<div class="btns">
<a class="btn solid" href="/${r.pdf}">보고서 PDF 보기 <span style="font-weight:400;opacity:.8">(${esc(r.pdfMeta)})</span></a>
<a class="btn" href="/#research/${r.id}">R.F.S. 사이트에서 보기</a>
</div>
<section><h2>다른 보고서</h2><ul class="list">${rel}</ul>
<p style="margin-top:14px"><a href="/research/">전체 보고서 보기 →</a></p></section>
<p class="note">본 자료는 중앙대학교 가치투자학회 R.F.S.의 학술 리서치 결과물이며, 특정 종목의 매매를 권유하지 않습니다. 목표주가와 주가는 보고서 발간일(${r.date}) 기준입니다.</p>
</main>
${FOOTER}`;
}

// ---------- research 인덱스 ----------

function indexPage(sorted, groups) {
  const n = sorted.length;
  const top = sorted.slice(0, 6).map((r) => r.name).join(', ');
  const desc = `중앙대학교 가치투자학회 R.F.S.가 발간한 기업분석 보고서 ${n}편. ${top} 등 국내외 기업의 투자포인트, 밸류에이션, 목표주가를 PDF로 제공합니다.`;
  const ogDesc = `중앙대 가치투자학회 RFS의 기업분석 리포트 ${n}편 전체 목록. 국내외 ${groups.size}개 기업의 투자의견, 목표주가, 밸류에이션.`;
  const names = uniq([...groups.values()].flatMap((g) => [...g.map((r) => r.name), ...((C.ALIASES[g[0].ticker] || {}).expand || [])]));
  const keywords = uniq(['중앙대 RFS', '중앙대 가치투자학회', '기업분석 리포트', '기업분석 보고서', '리서치 보고서', '에쿼티 리서치', ...names]).join(', ');
  const ogImg = resolveAsset('assets/og/site.jpg');
  const seo = [
    `<title>기업분석 보고서 ${n}편 | R.F.S. 중앙대학교 가치투자학회 Research</title>`,
    `<meta name="description" content="${attr(desc)}">`,
    `<meta name="keywords" content="${attr(keywords)}">`,
    `<link rel="canonical" href="${C.SITE}/research/">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${attr(C.SITE_NAME)}">`,
    `<meta property="og:locale" content="ko_KR">`,
    `<meta property="og:title" content="R.F.S. Research | 기업분석 보고서 ${n}편">`,
    `<meta property="og:description" content="${attr(ogDesc)}">`,
    `<meta property="og:image" content="${C.SITE}${ogImg || C.DEFAULT_IMAGE}">`,
    ...(ogImg ? ['<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">'] : []),
    `<meta property="og:url" content="${C.SITE}/research/">`,
    `<meta name="twitter:card" content="${ogImg ? 'summary_large_image' : 'summary'}">`,
    '',
  ].join('\n');
  const ld = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'R.F.S. Research — 기업분석 보고서',
    url: `${C.SITE}/research/`, inLanguage: 'ko', publisher: ORG,
    mainEntity: { '@type': 'ItemList', itemListElement: sorted.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: `${C.SITE}/research/${r.id}/`, name: `${r.name} (${r.ticker})` })) },
  };
  const years = [...new Set(sorted.map((r) => r.date.slice(0, 4)))];
  const sections = years.map((y) => `<section><h2>${y}</h2><ul class="list">${sorted.filter((r) => r.date.startsWith(y)).map((r) =>
    `<li><a href="/research/${r.id}/"><span>${esc(`${r.name} (${r.ticker}) — ${r.headline}`)}</span><span class="meta">${esc(`${r.op} · ${r.tp} · ${r.date}`)}</span></a></li>`).join('')}</ul></section>`).join('\n');
  return docStart(seo) +
`<script type="application/ld+json">${json(ld)}</script>
</head>
<body>
${NAV}
<main>
<div class="crumb"><a href="/">R.F.S.</a> › Research</div>
<h1>R.F.S. Research</h1>
<p class="headline">중앙대학교 가치투자학회 기업분석 보고서 ${n}편</p>
${sections}
</main>
${FOOTER}`;
}

// ---------- sitemap ----------

function sitemap(sorted) {
  const latest = isoDate(sorted[0].date);
  const rows = [
    `  <url><loc>${C.SITE}/</loc><lastmod>${latest}</lastmod></url>`,
    `  <url><loc>${C.SITE}/research/</loc><lastmod>${latest}</lastmod></url>`,
    ...sorted.map((r) => `  <url><loc>${C.SITE}/research/${r.id}/</loc><lastmod>${isoDate(r.date)}</lastmod></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
}

// ---------- 루트 index.html head ----------

function patchRoot(rootKw) {
  let root = read('index.html');
  const kwTag = `<meta name="keywords" content="${attr(rootKw.join(', '))}">\n`;
  if (/<meta name="keywords"[^>]*>\n/.test(root)) root = root.replace(/<meta name="keywords"[^>]*>\n/, () => kwTag);
  else root = root.replace(/(<meta name="description"[^>]*>\n)/, (m) => m + kwTag);
  const og = resolveAsset('assets/og/site.jpg');
  if (og) {
    root = root.replace(/<meta property="og:image" content="[^"]*">\n(?:<meta property="og:image:(?:width|height)" content="\d+">\n)*/,
      () => `<meta property="og:image" content="${C.SITE}${og}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n`);
    root = root.replace(/<meta name="twitter:card" content="[^"]*">/, '<meta name="twitter:card" content="summary_large_image">');
  }
  write('index.html', root);
}

// ---------- 실행 ----------

function main() {
  const reports = loadReports();
  const ids = new Set();
  for (const r of reports) {
    if (ids.has(r.id)) throw new Error(`REPORTS에 id가 중복됩니다: ${r.id}`);
    ids.add(r.id);
    if (!resolveAsset(r.pdf)) console.warn(`경고: ${r.id}: PDF 파일이 없습니다 (${r.pdf})`);
  }
  const sorted = [...reports].sort(byDateDesc); // 안정 정렬: 같은 날짜는 REPORTS 순서 유지
  const groups = new Map();
  for (const r of sorted) (groups.get(r.ticker) || groups.set(r.ticker, []).get(r.ticker)).push(r);

  let created = 0;
  for (const [, group] of groups) {
    const gkw = companyKeywords(group);
    group.forEach((r, idx) => {
      const file = `research/${r.id}/index.html`;
      if (!fs.existsSync(path.join(ROOT, file))) created++;
      const yearSuffix = group.length > 1 && idx > 0 ? ` (${r.date.slice(0, 4)})` : '';
      write(file, reportPage(r, sorted, { yearSuffix, groupKeywords: gkw }));
    });
  }
  write('research/index.html', indexPage(sorted, groups));

  const rootKw = uniq([...generalKeywords(), ...[...groups.values()].flatMap(companyKeywords)]);
  patchRoot(rootKw);

  write('sitemap.xml', sitemap(sorted));
  const robots = read('robots.txt');
  if (!/^Sitemap:/m.test(robots)) write('robots.txt', robots.replace(/\n?$/, '\n') + `Sitemap: ${C.SITE}/sitemap.xml\n`);

  // REPORTS에서 빠진 리포트 폴더는 지우지 않고 알려만 준다
  const orphan = fs.readdirSync(path.join(ROOT, 'research')).filter((d) => fs.statSync(path.join(ROOT, 'research', d)).isDirectory() && !ids.has(d));
  for (const d of orphan) console.warn(`경고: research/${d}/ 는 REPORTS에 없습니다`);

  console.log(`리포트 ${reports.length}건 (새 페이지 ${created}개), 고유 기업 ${groups.size}개, 루트 keywords ${rootKw.length}개, sitemap URL ${sorted.length + 2}개`);
  const noAlias = [...groups.values()].filter((g) => isForeign(g[0]) && !C.ALIASES[g[0].ticker]).map((g) => g[0].name);
  if (noAlias.length) console.warn(`경고: 한글명 미등록 해외 종목(tools/seo-config.js ALIASES에 추가 권장): ${noAlias.join(', ')}`);
}

main();
