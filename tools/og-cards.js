// 공유 썸네일(1200x630) HTML 템플릿. site: 사이트 루트 절대경로(file:// 용)
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fileUrl = (site, rel) => 'file:///' + (site + '/' + rel.replace(/^\//, '')).replace(/\\/g, '/');

const HEAD = `<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=block" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">`;

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:'Pretendard Variable',Pretendard,sans-serif;-webkit-font-smoothing:antialiased;position:relative}
.serif{font-family:'Noto Serif KR',serif}
`;

// 긴 이름은 폭에 맞게 글자 크기를 줄인다
const FIT = `<script>
document.fonts.ready.then(()=>{document.querySelectorAll('[data-fit]').forEach(el=>{
  let s=parseFloat(getComputedStyle(el).fontSize);
  while(el.scrollWidth>el.clientWidth&&s>40){s-=2;el.style.fontSize=s+'px'}});document.body.dataset.ready=1});
</script>`;

// ---------- 사이트 공통 ----------

function siteCard(style, d, site) {
  const sealLight = fileUrl(site, 'assets/rfs-seal-light.png');
  const sealNavy = fileUrl(site, 'assets/rfs-seal-navy.png');
  const facts = `기업분석 리포트 ${d.reports}편 · RFS 펀드 운용 · 알럼나이 ${d.alumni}명`;
  if (style === 'navy') return `<!doctype html><html><head>${HEAD}<style>${BASE_CSS}
body{background:#0F1B2E;color:#F7F6F3}
.seal{position:absolute;left:96px;top:135px;width:360px;height:360px}
.t{position:absolute;left:530px;top:150px;right:80px}
.k{font-size:19px;letter-spacing:.22em;color:rgba(247,246,243,.55)}
.n{font-size:112px;font-weight:700;line-height:1;margin:22px 0 18px;letter-spacing:-.01em}
.s{font-size:42px;font-weight:600}
.r{height:1px;background:rgba(247,246,243,.25);margin:34px 0 24px}
.f{font-size:23px;color:rgba(247,246,243,.72)}
</style></head><body>
<img class="seal" src="${sealLight}">
<div class="t"><div class="k">CHUNG-ANG UNIVERSITY · SINCE 2006</div>
<div class="n serif">R.F.S.</div><div class="s serif">중앙대학교 가치투자학회</div>
<div class="r"></div><div class="f">${esc(facts)}</div></div>${FIT}</body></html>`;

  if (style === 'paper') return `<!doctype html><html><head>${HEAD}<style>${BASE_CSS}
body{background:#F7F6F3;color:#0F1B2E}
.top{position:absolute;left:0;right:0;top:0;height:10px;background:#203864}
.seal{position:absolute;left:96px;top:140px;width:350px;height:350px}
.t{position:absolute;left:520px;top:150px;right:80px}
.k{font-size:19px;letter-spacing:.22em;color:rgba(26,26,26,.55)}
.n{font-size:112px;font-weight:700;line-height:1;margin:22px 0 18px}
.s{font-size:42px;font-weight:600;color:#203864}
.r{height:2px;background:#0F1B2E;margin:34px 0 24px}
.f{font-size:23px;color:rgba(26,26,26,.7)}
</style></head><body><div class="top"></div>
<img class="seal" src="${sealNavy}">
<div class="t"><div class="k">CHUNG-ANG UNIVERSITY · SINCE 2006</div>
<div class="n serif">R.F.S.</div><div class="s serif">중앙대학교 가치투자학회</div>
<div class="r"></div><div class="f">${esc(facts)}</div></div>${FIT}</body></html>`;

  // photo
  return `<!doctype html><html><head>${HEAD}<style>${BASE_CSS}
body{background:#0F1B2E url('${fileUrl(site, d.photo)}') center/cover;color:#F7F6F3}
.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,18,32,.92) 0%,rgba(10,18,32,.78) 55%,rgba(10,18,32,.45) 100%)}
.brand{position:absolute;left:80px;top:62px;display:flex;align-items:center;gap:16px}
.brand img{width:64px;height:64px}
.brand b{font-size:28px;display:block;line-height:1.1}.brand span{font-size:17px;opacity:.8}
.t{position:absolute;left:80px;bottom:88px;right:80px}
.n{font-size:92px;font-weight:700;line-height:1.05}
.s{font-size:40px;margin-top:14px;font-weight:600}
.r{height:1px;background:rgba(247,246,243,.35);margin:34px 0 22px;width:720px}
.f{font-size:23px;color:rgba(247,246,243,.8)}
</style></head><body><div class="shade"></div>
<div class="brand"><img src="${sealLight}"><div><b class="serif">R.F.S.</b><span>중앙대학교 가치투자학회</span></div></div>
<div class="t"><div class="n serif">Rising Financial Stars</div><div class="s serif">중앙대학교 가치투자학회 R.F.S.</div>
<div class="r"></div><div class="f">${esc(facts)}</div></div>${FIT}</body></html>`;
}

// ---------- 리포트별 ----------

function reportCard(style, r, site) {
  const sealLight = fileUrl(site, 'assets/rfs-seal-light.png');
  const sealNavy = fileUrl(site, 'assets/rfs-seal-navy.png');
  const title = `${r.name} (${r.ticker})`;
  const stats = [
    ['투자의견', r.op],
    r.tp && r.tp !== '-' ? ['목표주가', r.tp] : null,
    r.upside && r.upside !== '-' ? ['상승여력', r.upside] : null,
  ].filter(Boolean);
  const kicker = `${r.sector} · Company Analysis · ${r.date}`;
  const bg = r.heroBg || r.photoBg;
  const photo = style === 'photo' && bg ? fileUrl(site, bg) : null;

  if (style === 'paper') return `<!doctype html><html><head>${HEAD}<style>${BASE_CSS}
body{background:#F7F6F3;color:#1A1A1A}
.top{position:absolute;left:0;right:0;top:0;height:10px;background:#203864}
.brand{position:absolute;left:80px;top:56px;display:flex;align-items:center;gap:14px}
.brand img{width:56px;height:56px}
.brand b{font-size:24px;display:block;line-height:1.1;color:#0F1B2E}.brand span{font-size:15px;color:rgba(26,26,26,.62)}
.kick{position:absolute;left:80px;top:178px;font-size:21px;color:rgba(26,26,26,.6)}
.n{position:absolute;left:78px;top:214px;right:80px;font-size:80px;font-weight:700;color:#0F1B2E;white-space:nowrap;letter-spacing:-.02em;line-height:1.2}
.h{position:absolute;left:80px;top:326px;right:80px;font-size:34px;color:#203864;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stats{position:absolute;left:80px;right:80px;bottom:64px;display:flex;border-top:3px solid #0F1B2E;border-bottom:1px solid rgba(26,26,26,.14)}
.stats div{flex:1;padding:18px 0 18px}
.stats dt{font-size:16px;letter-spacing:.12em;color:rgba(26,26,26,.6)}
.stats dd{font-size:36px;font-weight:700;margin-top:4px;color:#0F1B2E}
</style></head><body><div class="top"></div>
<div class="brand"><img src="${sealNavy}"><div><b class="serif">R.F.S.</b><span>중앙대학교 가치투자학회</span></div></div>
<div class="kick">${esc(kicker)}</div>
<div class="n serif" data-fit="1040">${esc(title)}</div>
<div class="h serif">${esc(r.headline)}</div>
<dl class="stats">${stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
${FIT}</body></html>`;

  // navy / photo (사진이 없으면 네이비)
  return `<!doctype html><html><head>${HEAD}<style>${BASE_CSS}
body{background:#0F1B2E ${photo ? `url('${photo}') center/cover` : ''};color:#F7F6F3}
.shade{position:absolute;inset:0;background:${photo ? 'linear-gradient(0deg,rgba(10,18,32,.95) 0%,rgba(10,18,32,.6) 32%,rgba(10,18,32,0) 55%),linear-gradient(90deg,rgba(10,18,32,.93) 0%,rgba(10,18,32,.80) 60%,rgba(10,18,32,.55) 100%)' : 'transparent'}}
.wm{position:absolute;right:-90px;top:-40px;width:520px;height:520px;opacity:${photo ? 0 : .06}}
.brand{position:absolute;left:80px;top:56px;display:flex;align-items:center;gap:14px}
.brand img{width:56px;height:56px}
.brand b{font-size:24px;display:block;line-height:1.1}.brand span{font-size:15px;opacity:.75}
.kick{position:absolute;left:80px;top:180px;font-size:21px;color:rgba(247,246,243,.65)}
.n{position:absolute;left:78px;top:214px;right:80px;font-size:80px;font-weight:700;white-space:nowrap;letter-spacing:-.01em;line-height:1.2}
.h{position:absolute;left:80px;top:328px;right:80px;font-size:34px;color:rgba(247,246,243,.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stats{position:absolute;left:80px;right:80px;bottom:62px;display:flex;align-items:baseline;gap:0;border-top:1px solid rgba(247,246,243,.3);padding-top:26px}
.stats div{display:flex;align-items:baseline;gap:12px;padding-right:38px;margin-right:38px;border-right:1px solid rgba(247,246,243,.25)}
.stats div:last-child{border-right:0}
.stats dt{font-size:20px;color:rgba(247,246,243,.65)}
.stats dd{font-size:36px;font-weight:700}
</style></head><body><div class="shade"></div><img class="wm" src="${sealLight}">
<div class="brand"><img src="${sealLight}"><div><b class="serif">R.F.S.</b><span>중앙대학교 가치투자학회</span></div></div>
<div class="kick">${esc(kicker)}</div>
<div class="n serif" data-fit="1040">${esc(title)}</div>
<div class="h serif">${esc(r.headline)}</div>
<dl class="stats">${stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
${FIT}</body></html>`;
}

module.exports = { siteCard, reportCard };
