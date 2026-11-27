// ── PRE 기초 지식: 개념 그림 부품 (harness/PLUGIN.md) ─────────────
// preLink : 정적. 손익 계단(매출 → 비용 → 순이익) 옆에 작년 말·올해 말 자본. 올해 늘어난 몫(금색)이 순이익과 같다
// preDep  : 버튼으로 정액법·정률법을 바꾼다. 해마다 감가상각비 막대, 첫해 칸엔 그해 나간 현금(점선 테두리)
// preTax  : 슬라이더로 세전이익을 움직인다. 위는 구간으로 나눈 이익, 아래는 같은 눈금의 세금(금색). 세금 막대 길이가 곧 유효세율
// prePV   : 슬라이더로 할인율을 움직인다. 같은 100을 지금·1년 뒤…5년 뒤에 받을 때의 현재가치 막대
(function () {
  var L = window.CUR_LIB, esc = L.esc, clamp = L.clamp;
  if (!document.getElementById('cur-plex-font')) {
    var lk = document.createElement('link'); lk.id = 'cur-plex-font'; lk.rel = 'stylesheet';
    lk.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&display=swap'; document.head.appendChild(lk);
  }
  var GOLD = '#E2C48F', NAVY = '#1C2C48', HAIR = 'rgba(242,239,232,.28)', FAINT = 'rgba(242,239,232,.18)';
  L.addCss('cur-pre-css', [
    '.cur .prv svg{display:block;width:100%;max-width:540px;height:auto;overflow:visible}',
    '.cur .prv .vctl,.cur .prv .vr,.cur .prv .vbt,.cur .prv .vcap{max-width:540px}',
    '.cur .prv svg text{font-family:"IBM Plex Sans","RFS Dotum UI",sans-serif;font-variant-numeric:tabular-nums;fill:#F2EFE8;font-size:13px}',
    '.cur .prv svg text.s{font-size:12px;fill:rgba(242,239,232,.62)}',
    '.cur .prv svg text.n{font-size:14px;font-weight:500;paint-order:stroke;stroke:#0B1526;stroke-width:5px;stroke-linejoin:round}',
    '.cur .prv svg text.b{font-family:"Noto Serif KR",serif;font-weight:600;font-size:24px;letter-spacing:-.01em}',
    '.cur .prv svg text.h{font-size:12px;letter-spacing:.04em;fill:rgba(242,239,232,.62)}',
    '.cur .prv svg .gr{transform-box:fill-box;transform-origin:50% 100%;animation:prGrow .8s cubic-bezier(.2,.8,.2,1) both}',
    '.cur .prv svg .gx{transform-box:fill-box;transform-origin:0 50%;animation:prGrowX .8s cubic-bezier(.2,.8,.2,1) both}',
    '.cur .prv svg .fd{animation:prFade .5s ease .45s both}',
    '@keyframes prGrow{from{transform:scaleY(0)}}@keyframes prGrowX{from{transform:scaleX(0)}}@keyframes prFade{from{opacity:0}}',
    '.cur .prv .vctl label b{font-family:"IBM Plex Sans","RFS Dotum UI",sans-serif;font-weight:500;font-size:18px}',
    '.cur .prv .vr b{font-weight:500}',
    '.cur .prv .vbt button[aria-pressed=true]{background:#1C2C48;border-color:#E2C48F}',
    '@media (max-width:560px){.cur .prv svg text{font-size:15px}.cur .prv svg text.s,.cur .prv svg text.h{font-size:13.5px}.cur .prv svg text.n{font-size:16px}.cur .prv svg text.b{font-size:27px}}',
    '@media (prefers-reduced-motion:reduce){.cur .prv svg .gr,.cur .prv svg .gx,.cur .prv svg .fd{animation:none}}'
  ].join('\n'));

  function num(x, d) { var k = Math.pow(10, d || 0), v = Math.round(x * k) / k; return v.toLocaleString('ko-KR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function t(x, y, s, cls, anchor) { return '<text x="' + (+x).toFixed(1) + '" y="' + (+y).toFixed(1) + '"' + (cls ? ' class="' + cls + '"' : '') + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(s) + '</text>'; }
  function ln(x1, y1, x2, y2, c, extra) { return '<line x1="' + (+x1).toFixed(1) + '" y1="' + (+y1).toFixed(1) + '" x2="' + (+x2).toFixed(1) + '" y2="' + (+y2).toFixed(1) + '" stroke="' + c + '"' + (extra || '') + '/>'; }
  function rect(x, y, w, h, fill, extra) { return '<rect x="' + (+x).toFixed(1) + '" y="' + (+y).toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  // 막대 아래 두 줄: 이름(흰 글씨) / 뜻(옅은 글씨)
  function under(x, base, name, sub) { return t(x, base + 22, name, '', 'middle') + (sub ? t(x, base + 40, sub, 's', 'middle') : ''); }

  // ════ preLink ════ params: { sales, cost, eq0, unit }
  window.CUR_VIS.preLink = function (host, p, ctx) {
    host.classList.add('prv');
    var S = p.sales, C = p.cost, NI = S - C, E0 = p.eq0, E1 = E0 + NI, U = p.unit || '억';
    var W = 440, base = 250, H = 180, mx = Math.max(S, E1), k = H / mx, bw = 50;
    var xs = [18, 96, 174, 290, 368], o = '';
    o += ln(6, base, 248, base, FAINT) + ln(268, base, W - 6, base, FAINT);
    o += t(18, 22, '손익계산서 · 한 해 동안', 'h') + t(290, 22, '재무상태표 · 연말', 'h');
    o += ln(258, 10, 258, base + 44, FAINT, ' stroke-dasharray="2 4"');
    // 손익 계단: 매출 → 비용(위에서 내려오는 막대) → 순이익
    var ySales = base - S * k, yNI = base - NI * k;
    o += rect(xs[0], ySales, bw, S * k, NAVY, ' class="gr" stroke="' + HAIR + '"');
    o += rect(xs[1], ySales, bw, C * k, 'rgba(242,239,232,.06)', ' class="gr" style="transform-origin:50% 0;animation-delay:.12s" stroke="' + HAIR + '" stroke-dasharray="3 3"');
    o += rect(xs[2], yNI, bw, NI * k, NAVY, ' class="gr" style="animation-delay:.24s" stroke="rgba(242,239,232,.7)"');
    o += ln(xs[0] + bw, ySales, xs[1], ySales, HAIR, ' stroke-dasharray="2 3"') + ln(xs[1] + bw, yNI, xs[2], yNI, HAIR, ' stroke-dasharray="2 3"');
    o += '<g class="fd">' + t(xs[0] + bw / 2, ySales - 9, num(S), 'n', 'middle') + t(xs[1] + bw / 2, ySales - 9, num(C), 'n', 'middle') + t(xs[2] + bw / 2, yNI - 9, num(NI), 'n', 'middle') + '</g>';
    o += under(xs[0] + bw / 2, base, '매출', '판 돈') + under(xs[1] + bw / 2, base, '비용', '쓴 돈') + under(xs[2] + bw / 2, base, '순이익', '남은 돈');
    // 자본: 작년 말 → 올해 말. 늘어난 몫(= 순이익)만 금색
    var yE0 = base - E0 * k, yE1 = base - E1 * k;
    o += rect(xs[3], yE0, bw, E0 * k, NAVY, ' class="gr" style="animation-delay:.3s" stroke="' + HAIR + '"');
    o += rect(xs[4], yE0, bw, E0 * k, NAVY, ' class="gr" style="animation-delay:.36s" stroke="' + HAIR + '"');
    o += rect(xs[4], yE1, bw, NI * k, GOLD, ' class="fd"');
    o += ln(xs[3] + bw, yE0, xs[4], yE0, HAIR, ' stroke-dasharray="2 3"');
    o += '<g class="fd">' + t(xs[3] + bw / 2, yE0 - 9, num(E0), 'n', 'middle') + t(xs[4] + bw / 2, yE1 - 9, num(E1), 'n', 'middle') +
      // 순이익 막대 꼭대기에서 늘어난 몫으로 잇는 선
      '<path d="M' + (xs[2] + bw) + ' ' + (yNI + NI * k / 2).toFixed(1) + 'C' + (xs[2] + bw + 70) + ' ' + (yNI + NI * k / 2).toFixed(1) + ' ' + (xs[4] - 60) + ' ' + (yE1 + NI * k / 2).toFixed(1) + ' ' + (xs[4] - 4) + ' ' + (yE1 + NI * k / 2).toFixed(1) + '" fill="none" stroke="rgba(242,239,232,.55)" stroke-dasharray="3 3"/>' +
      '<path d="M' + (xs[4] - 9) + ' ' + (yE1 + NI * k / 2 - 4).toFixed(1) + 'L' + (xs[4] - 3) + ' ' + (yE1 + NI * k / 2).toFixed(1) + 'L' + (xs[4] - 9) + ' ' + (yE1 + NI * k / 2 + 4).toFixed(1) + '" fill="none" stroke="rgba(242,239,232,.55)"/>' + '</g>';
    o += under(xs[3] + bw / 2, base, '자본', '작년 말') + under(xs[4] + bw / 2, base, '자본', '올해 말');
    host.innerHTML = '<svg viewBox="0 0 ' + W + ' 300" role="img" aria-label="' + esc('매출 ' + num(S) + U + '에서 비용 ' + num(C) + U + '을 빼면 순이익 ' + num(NI) + U + '. 자본은 ' + num(E0) + U + '에서 순이익만큼 늘어 ' + num(E1) + U + '이 돼요') + '"></svg>' +
      (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    host.querySelector('svg').innerHTML = o;
    ctx.ready(true);
    return { draw: function () {} };
  };

  // ════ preDep ════ params: { cost, life, salvage, rate, unit, start: 'sl' | 'db' }
  window.CUR_VIS.preDep = function (host, p, ctx) {
    host.classList.add('prv');
    var C = p.cost, N = p.life, SV = p.salvage || 0, R = p.rate, U = p.unit || '만', mode = p.start || 'sl';
    var SL = [], DB = [], bv = C, i;
    for (i = 0; i < N; i++) { SL.push((C - SV) / N); var d = bv * R; DB.push(d); bv -= d; }
    var W = 440, base = 240, H = 190, k = H / C, cw = 46, gap = (W - 30 - N * cw) / (N - 1);
    host.innerHTML = '<svg viewBox="0 0 ' + W + ' 296" role="img"></svg>' +
      '<div class="vbt" role="group" aria-label="감가상각 방법"><button type="button" data-m="sl">정액법</button><button type="button" data-m="db">정률법</button></div>' +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr'), bs = host.querySelectorAll('.vbt button');
    function draw() {
      var V = mode === 'sl' ? SL : DB, o = ln(6, base, W - 6, base, FAINT), x0 = 18;
      // 첫해 칸: 그해 나간 현금(점선 테두리)
      var yc = base - C * k;
      o += rect(x0 - 6, yc, cw + 12, C * k, 'none', ' stroke="rgba(242,239,232,.55)" stroke-dasharray="4 3"');
      o += t(x0 + cw / 2, yc - 9, num(C), 'n', 'middle');
      o += ln(x0 + cw + 6, yc + 14, x0 + cw + 30, yc + 14, 'rgba(242,239,232,.4)') + t(x0 + cw + 36, yc + 18, '산 해에 나간 현금', '') + t(x0 + cw + 36, yc + 36, '이후엔 0', 's');
      V.forEach(function (v, j) {
        var x = x0 + j * (cw + gap), h = v * k, y = base - h;
        o += rect(x, y, cw, h, j === 0 ? GOLD : NAVY, ' class="gr" style="animation-delay:' + (j * 0.08) + 's"' + (j === 0 ? '' : ' stroke="' + HAIR + '"'));
        o += '<g class="fd">' + t(x + cw / 2, y - 9, num(v), 'n', 'middle') + '</g>';
        o += under(x + cw / 2, base, (j + 1) + '년', j === 0 ? '산 해' : '');
      });
      svg.innerHTML = o;
      svg.setAttribute('aria-label', (mode === 'sl' ? '정액법' : '정률법') + ' 해마다 감가상각비 ' + V.map(function (v) { return num(v); }).join(', ') + U + ' 원. 현금 ' + num(C) + U + ' 원은 산 해에 나가요');
      bs.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === mode)); });
      var sum = V.reduce(function (a, b) { return a + b; }, 0);
      vr.innerHTML = mode === 'sl' ?
        '정액법: 해마다 <b>' + num(SL[0]) + U + ' 원</b>씩 같아요. 다섯 해 합은 ' + num(sum) + U + ' 원이에요.' :
        '정률법: 첫해 <b>' + num(DB[0]) + U + ' 원</b>에서 해마다 줄어요. 다섯 해 합은 약 ' + num(sum) + U + ' 원이에요.';
    }
    bs.forEach(function (b) { b.onclick = function () { mode = b.getAttribute('data-m'); draw(); }; });
    draw();
    ctx.ready(true);
    return { draw: draw };
  };

  // ════ preTax ════ params: { cut(첫 구간 끝), r1, r2(%), start, min, max, step, unit }
  window.CUR_VIS.preTax = function (host, p, ctx) {
    host.classList.add('prv');
    var CUT = p.cut, R1 = p.r1 / 100, R2 = p.r2 / 100, P = p.start, U = p.unit || '억', id = 'curPreTax';
    var W = 440, x0 = 20, bw = 300, y1 = 58, y2 = 168, bh = 30;
    host.innerHTML = '<svg viewBox="0 0 ' + W + ' 262" role="img"></svg>' + L.sliderHtml(id, '세전이익', p.min, p.max, p.step, P, '세전이익(' + U + ' 원)') +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), inp = host.querySelector('#' + id), lb = host.querySelector('.vctl label b'), vr = host.querySelector('.vr');
    function d1(x) { return Math.abs(x - Math.round(x)) < 1e-9 ? num(x) : num(x, 1); }
    function pct(x) { var v = Math.round(x * 1000) / 10; return (v % 1 ? v.toFixed(1) : String(v)) + '%'; }
    function draw() {
      var a = Math.min(P, CUT), b = Math.max(P - CUT, 0), ta = a * R1, tb = b * R2, T = ta + tb, k = bw / P, eff = T / P, o = '';
      // 위: 세전이익을 구간으로 나눈 막대
      o += rect(x0, y1, a * k, bh, NAVY, ' stroke="' + HAIR + '"');
      if (b > 0) o += rect(x0 + a * k, y1, b * k, bh, 'rgba(28,44,72,.55)', ' stroke="' + HAIR + '"');
      if (a * k >= 30) o += t(x0 + a * k / 2, y1 - 9, d1(a) + U, 'n', 'middle');
      if (b > 0 && b * k >= 30) o += t(x0 + a * k + b * k / 2, y1 - 9, d1(b) + U, 'n', 'middle');
      if (a * k >= 44) o += t(x0 + a * k / 2, y1 + bh + 18, p.r1 + '% 구간', 's', 'middle');
      if (b > 0 && b * k >= 56) o += t(x0 + a * k + b * k / 2, y1 + bh + 18, p.r2 + '% 구간', 's', 'middle');
      o += t(x0, y1 + bh + 40, '세전이익', '') + t(x0 + 58, y1 + bh + 40, '세금을 매기기 전 이익', 's');
      // 아래: 같은 눈금의 세금 막대(금색). 길이 ÷ 위 막대 길이 = 유효세율
      var xr = x0 + bw * R2;
      o += ln(xr, y2 - 26, xr, y2 + bh + 6, 'rgba(242,239,232,.55)', ' stroke-dasharray="3 3"') + t(xr + 6, y2 - 16, p.r2 + '%', 's');
      o += rect(x0, y2, T * k, bh, GOLD);
      if (b > 0) o += ln(x0 + ta * k, y2, x0 + ta * k, y2 + bh, '#0B1526', ' stroke-width="1.5"');
      o += t(x0 + T * k / 2, y2 - 9, num(T, 1) + U, 'n', 'middle');
      o += t(x0, y2 + bh + 22, '법인세', '') + t(x0 + 44, y2 + bh + 22, '구간마다 매긴 세금의 합', 's');
      // 오른쪽: 유효세율 큰 숫자
      o += t(x0 + bw + 26, y2 + 14, pct(eff), 'b') + t(x0 + bw + 26, y2 + 34, '유효세율', 's');
      svg.innerHTML = o;
      svg.setAttribute('aria-label', '세전이익 ' + d1(P) + U + ' 원, 법인세 ' + num(T, 1) + U + ' 원, 유효세율 ' + pct(eff));
      lb.textContent = d1(P) + U + ' 원';
      vr.innerHTML = '이익 ' + d1(P) + U + ' 원에 세금 ' + num(T, 1) + U + ' 원, 유효세율은 <b>' + pct(eff) + '</b>예요. 점선은 가장 높은 구간 세율 ' + p.r2 + '%예요.';
    }
    inp.addEventListener('input', function () { P = clamp(Math.round(+inp.value / p.step) * p.step, p.min, p.max); draw(); });
    inp.addEventListener('keydown', function (e) { e.stopPropagation(); });
    draw();
    ctx.ready(true);
    return { draw: draw };
  };

  // ════ prePV ════ params: { fv, years:[0,1,…], hl(금색 해), start, min, max, step(%), unit }
  window.CUR_VIS.prePV = function (host, p, ctx) {
    host.classList.add('prv');
    var FV = p.fv, Y = p.years || [0, 1, 2, 3, 4, 5], HL = p.hl, r = p.start / 100, U = p.unit || '만', id = 'curPrePv';
    var W = 440, base = 214, H = 160, k = H / FV, cw = 42, x0 = 16, gap = (W - 2 * x0 - 70 - Y.length * cw) / (Y.length - 1);
    host.innerHTML = '<svg viewBox="0 0 ' + W + ' 262" role="img"></svg>' + L.sliderHtml(id, '할인율', p.min, p.max, p.step, p.start, '할인율(%)') +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), inp = host.querySelector('#' + id), lb = host.querySelector('.vctl label b'), vr = host.querySelector('.vr');
    function pv(n) { return FV / Math.pow(1 + r, n); }
    function draw() {
      var o = ln(6, base, W - 6, base, FAINT), yt = base - FV * k;
      // 받을 돈 높이
      o += ln(x0, yt, W - 70, yt, 'rgba(242,239,232,.45)', ' stroke-dasharray="3 4"') + t(W - 64, yt + 4, '받을 돈', '') + t(W - 64, yt + 22, num(FV) + U + ' 원', 's');
      Y.forEach(function (n, j) {
        var x = x0 + j * (cw + gap), v = pv(n), h = v * k, y = base - h, hl = n === HL;
        o += rect(x, y, cw, h, hl ? GOLD : NAVY, hl ? '' : ' stroke="' + HAIR + '"');
        o += t(x + cw / 2, y - 9, n === 0 ? num(v) : num(v, 1), 'n', 'middle');
        o += t(x + cw / 2, base + 22, n === 0 ? '지금' : n + '년 뒤', '', 'middle');
      });
      svg.innerHTML = o;
      svg.setAttribute('aria-label', '할인율 ' + Math.round(r * 100) + '%에서 ' + num(FV) + U + ' 원의 현재가치: ' + Y.map(function (n) { return (n ? n + '년 뒤 ' : '지금 ') + num(pv(n), 1); }).join(', '));
      lb.textContent = Math.round(r * 100) + '%';
      vr.innerHTML = '할인율 ' + Math.round(r * 100) + '%에서 ' + HL + '년 뒤 ' + num(FV) + U + ' 원은 지금 <b>' + num(pv(HL), 1) + U + ' 원</b>이에요.';
    }
    inp.addEventListener('input', function () { r = clamp(Math.round(+inp.value / p.step) * p.step, p.min, p.max) / 100; draw(); });
    inp.addEventListener('keydown', function (e) { e.stopPropagation(); });
    draw();
    ctx.ready(true);
    return { draw: draw };
  };
})();
