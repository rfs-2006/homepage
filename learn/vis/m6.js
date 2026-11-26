// M6 DCF 1: 구조 — 그래프 부품 (harness/PLUGIN.md)
// m6Ledger: 상황별 EV·NOA·IBD·Equity 장부 / m6Discount: (1+WACC)ⁿ 할인 타임라인 / m6Bridge: FCFF·FCFE 두 길 / m6Accounts: 계정 분류표·문제
(function () {
  var L = window.CUR_LIB, esc = L.esc, fmt = L.fmt, clamp = L.clamp, wOf = L.wOf;
  L.addCss('cur-m6-css',
    '.cur .m6t{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13.5px;font-variant-numeric:tabular-nums;margin-top:6px}' +
    '.cur .m6t th,.cur .m6t td{padding:8px 4px;border-bottom:1px solid var(--hair);text-align:right;color:var(--tx)}' +
    '.cur .m6t thead th{font-size:11.5px;color:var(--ac2);font-weight:500;line-height:1.3}.cur .m6t thead th:first-child,.cur .m6t tbody th{text-align:left}' +
    '.cur .m6t tbody th{font-weight:400;font-size:13px;line-height:1.45;width:40%}.cur .m6t tr.hid{display:none}.cur .m6t tr.cur6 th,.cur .m6t tr.cur6 td{background:rgba(143,170,220,.12)}' +
    '.cur .m6t td.eqv{color:var(--wm);font-weight:500}.cur .m6t tr.sub td,.cur .m6t tr.sub th{color:var(--wm)}.cur .m6t tr.dim td,.cur .m6t tr.dim th{opacity:.55}' +
    '@media (max-width:420px){.cur .m6t{font-size:12px}.cur .m6t th,.cur .m6t td{padding:7px 2px}.cur .m6t tbody th{font-size:12px}}' +
    '.cur .m6lg{display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:10px;font-size:12.5px;color:var(--tx)}.cur .m6lg span{display:inline-flex;align-items:center;gap:6px}' +
    '.cur .m6c{display:inline-block;min-width:38px;padding:2px 6px;border:1px solid var(--hair);font-style:normal;font-size:12px;text-align:center;color:var(--tx)}' +
    '.cur .m6c.NOA{border-color:var(--ac);background:rgba(143,170,220,.18)}.cur .m6c.IBD{border-color:var(--wm);background:rgba(232,201,160,.18)}.cur .m6c.X{color:var(--t3)}.cur .m6c.Q{border-style:dashed;color:var(--no)}' +
    '.cur .m6h{font-size:11.5px;color:var(--t3);margin:10px 0 4px}' +
    '.cur .m6al{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;border-top:1px solid var(--hair)}' +
    '.cur .m6al button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:40px;padding:6px 4px;border:0;border-bottom:1px solid var(--hair);background:none;color:var(--tx);font:inherit;font-size:13.5px;text-align:left;cursor:pointer}' +
    '.cur .m6al button:hover,.cur .m6al button.on{background:rgba(143,170,220,.10)}.cur .m6al small{display:block;font-size:11.5px;color:var(--t3);margin-top:1px}.cur .m6al .m6n{min-width:0;line-height:1.4}' +
    '.cur .m6tab button.done{border-color:rgba(143,170,220,.5)}.cur .m6tab button{font-size:13.5px;min-height:40px}' +
    '.cur .m6pk{display:flex;flex-direction:column;border-top:1px solid var(--hair)}' +
    '.cur .m6p{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 10px;padding:8px 0;border-bottom:1px solid var(--hair)}' +
    '.cur .m6p .m6n{flex:1 1 150px;min-width:0;font-size:14px;color:var(--tx)}.cur .m6p .m6n small{display:block;font-size:12px;color:var(--t3);font-variant-numeric:tabular-nums}' +
    '.cur .m6p .vbt{margin-top:0;gap:4px;flex:none}.cur .m6p .vbt button{min-height:38px;padding:0 10px;font-size:13px}' +
    '.cur .m6p.ok .m6n{color:var(--ok)}.cur .m6p.no .m6n{color:var(--no)}.cur .m6sd{font-size:11.5px;color:var(--ac2);margin-top:10px}' +
    '.cur .m6bad{color:var(--no)}');
  function box(t, x, c) { return '<div class="eq ' + (c || '') + '"><small>' + t + '</small><b>' + x + '</b></div>'; }

  // ── 상황별 장부: 행동을 하나씩 열면 EV·NOA·IBD·Equity가 바뀐다 ──
  window.CUR_VIS.m6Ledger = function (host, p, ctx) {
    var R = p.rows || [], n = clamp(p.start || 1, 1, R.length), u = p.unit || '', cols = p.cols || ['상황', 'EV', 'NOA', 'IBD', 'Equity Value'];
    function eqv(r) { return r.ev + r.noa - r.ibd; }
    function nu(x) { return x ? fmt(x) + (u === '만 원' ? '만' : '') : '0'; }
    host.innerHTML = '<div class="eqs" aria-live="polite"></div><svg role="img"></svg><table class="m6t"><thead><tr>' + cols.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      R.map(function (r, i) { return '<tr data-i="' + i + '"><th scope="row">' + esc(r.t) + '</th><td>' + nu(r.ev) + '</td><td>' + nu(r.noa) + '</td><td>' + nu(r.ibd) + '</td><td class="eqv">' + nu(eqv(r)) + '</td></tr>'; }).join('') +
      '</tbody></table><div class="vbt"><button type="button" class="vgo on"></button></div><p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eq = host.querySelector('.eqs'), vr = host.querySelector('.vr'), bt = host.querySelector('.vgo'), trs = host.querySelectorAll('tbody tr');
    var top = Math.max.apply(null, R.map(function (r) { return Math.max(r.ev + r.noa, r.ibd + Math.max(eqv(r), 0)); }).concat([1]));
    function draw() {
      var r = R[n - 1], w = wOf(host), h = 170, base = h - 28, sc = (h - 56) / top, bw = Math.min(120, w / 2 - 40), xa = (w / 2 - bw) / 2, xb = w / 2 + (w / 2 - bw) / 2, o = '';
      function seg(x, y, v, fill, stroke, lab) { var hh = v * sc; if (hh <= 0) return [y, '']; return [y - hh, '<rect x="' + x + '" y="' + (y - hh) + '" width="' + bw + '" height="' + hh + '" fill="' + fill + '" stroke="' + stroke + '" style="transition:all .35s"/>' + (hh > 16 ? '<text x="' + (x + bw / 2) + '" y="' + (y - hh / 2 + 4) + '" text-anchor="middle" class="tt">' + lab + '</text>' : '')]; }
      o += '<line class="ax" x1="0" x2="' + w + '" y1="' + base + '" y2="' + base + '"/>';
      var s1 = seg(xa, base, r.ev, 'rgba(143,170,220,.4)', 'var(--ac)', 'EV ' + nu(r.ev)); o += s1[1]; o += seg(xa, s1[0], r.noa, 'rgba(169,216,188,.22)', 'var(--ok)', 'NOA ' + nu(r.noa))[1];
      var s3 = seg(xb, base, r.ibd, 'rgba(242,239,232,.16)', 'rgba(242,239,232,.5)', 'IBD ' + nu(r.ibd)); o += s3[1]; o += seg(xb, s3[0], Math.max(eqv(r), 0), 'rgba(232,201,160,.5)', 'var(--wm)', 'Equity ' + nu(eqv(r)))[1];
      if (!r.ev && !r.noa) o += '<text x="' + (w / 2) + '" y="' + (base - 30) + '" text-anchor="middle" class="tt">아직 아무것도 없어요</text>';
      o += '<text x="' + (xa + bw / 2) + '" y="' + (h - 8) + '" text-anchor="middle">가진 것: EV + NOA</text><text x="' + (xb + bw / 2) + '" y="' + (h - 8) + '" text-anchor="middle">몫: IBD + Equity</text>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', r.t + ': EV ' + nu(r.ev) + ', NOA ' + nu(r.noa) + ', IBD ' + nu(r.ibd) + ', Equity Value ' + nu(eqv(r)) + ' (' + u + ', 예시)');
      eq.innerHTML = box('EV(영업가치)', nu(r.ev)) + '<i>+</i>' + box('NOA', nu(r.noa)) + '<i>−</i>' + box('IBD', nu(r.ibd)) + '<i>=</i>' + box('Equity Value', nu(eqv(r)), 'ac');
      trs.forEach(function (tr, i) { tr.classList.toggle('hid', i >= n); tr.classList.toggle('cur6', i === n - 1); });
      vr.innerHTML = '<b>' + esc(r.t) + '</b>' + (r.d ? '. ' + esc(r.d) : '') + ' (단위 ' + esc(u) + ', 예시)';
      if (n >= R.length) { bt.hidden = true; bt.classList.add('done'); L.gate(ctx, true); } else { bt.textContent = '다음 행동: ' + R[n].t; L.gate(ctx, false); }
    }
    bt.onclick = function () { if (n < R.length) { n++; draw(); } };
    return { draw: draw, gated: function () { return n < R.length; } };
  };

  // ── 할인 타임라인: FCFF를 (1+WACC)ᵗ로 나눠 오늘로, TV는 n년 할인. 흔한 실수(WACCⁿ)도 계산해 본다 ──
  window.CUR_VIS.m6Discount = function (host, p, ctx) {
    var CF = p.cf || [100, 110, 120, 130, 140], r = p.wacc || 10, g = p.g == null ? 1 : p.g, tried = false;
    host.innerHTML = '<div class="eqs" aria-live="polite"></div><svg role="img"></svg>' + L.sliderHtml('curM6r', 'WACC', 6, 14, 0.5, r) + L.sliderHtml('curM6g', '성장률 g', 0, 3, 0.5, g) +
      '<div class="vbt"><button type="button" class="vgo on">WACCⁿ으로 잘못 나누면?</button></div><p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eq = host.querySelector('.eqs'), vr = host.querySelector('.vr'), sr = host.querySelector('#curM6r'), sg = host.querySelector('#curM6g'), bt = host.querySelector('.vgo'), lb = host.querySelectorAll('.vctl label b');
    function calc(bad) {
      var k = r / 100, gg = g / 100, n = CF.length, pv = CF.map(function (c, i) { return c / Math.pow(bad ? k : 1 + k, i + 1); });
      var tv = CF[n - 1] * (1 + gg) / (k - gg), ptv = tv / Math.pow(bad ? k : 1 + k, n), s = pv.reduce(function (a, b) { return a + b; }, 0);
      return { pv: pv, sum: s, tv: tv, ptv: ptv, ev: s + ptv };
    }
    function draw() {
      var c = calc(false), n = CF.length, w = wOf(host), h = 300, top = Math.max.apply(null, CF) * 1.15, th = 128, base = 30 + th, cw = (w - 10) / (n + 1), bw = Math.min(34, cw * 0.5), o = '';
      var sc = th / top, cx = function (i) { return 5 + cw * i + cw / 2; };
      o += '<text x="4" y="14" class="tt">해마다 받는 FCFF와 오늘 가치 (예시)</text><line class="ax" x1="0" x2="' + w + '" y1="' + base + '" y2="' + base + '"/>';
      o += '<text x="' + cx(0) + '" y="' + (base + 16) + '" text-anchor="middle" class="ta">오늘</text>';
      CF.forEach(function (v, i) {
        var x = cx(i + 1), hr = v * sc, hp = c.pv[i] * sc;
        o += '<rect x="' + (x - bw / 2) + '" y="' + (base - hr) + '" width="' + bw + '" height="' + hr + '" fill="none" stroke="rgba(242,239,232,.45)" stroke-dasharray="3 3"/>';
        o += '<rect x="' + (x - bw / 2) + '" y="' + (base - hp) + '" width="' + bw + '" height="' + hp + '" fill="rgba(143,170,220,.75)" style="transition:all .3s"/>';
        o += '<text x="' + x + '" y="' + (base - hr - 5) + '" text-anchor="middle">' + v + '</text><text x="' + x + '" y="' + (base - hp + 14) + '" text-anchor="middle" class="tt" style="fill:#0B1526">' + Math.round(c.pv[i]) + '</text>';
        o += '<text x="' + x + '" y="' + (base + 16) + '" text-anchor="middle">' + (i + 1) + '년</text><text x="' + x + '" y="' + (base + 30) + '" text-anchor="middle" style="font-size:10px">÷' + Math.pow(1 + r / 100, i + 1).toFixed(2) + '</text>';
      });
      var y2 = base + 58, bh = 26, tot = Math.max(c.ev, 1), x0 = 4, ww = w - 8, a1 = ww * c.sum / tot;
      o += '<text x="4" y="' + (y2 - 8) + '" class="tt">EV = FCFF 현재가치 합 + TV 현재가치</text>';
      o += '<rect x="' + x0 + '" y="' + y2 + '" width="' + a1 + '" height="' + bh + '" fill="rgba(143,170,220,.75)" style="transition:all .3s"/><rect x="' + (x0 + a1) + '" y="' + y2 + '" width="' + (ww - a1) + '" height="' + bh + '" fill="rgba(232,201,160,.6)" style="transition:all .3s"/>';
      o += (a1 > 60 ? '<text x="' + (x0 + 6) + '" y="' + (y2 + 17) + '" style="fill:#0B1526">' + fmt(c.sum) + '</text>' : '') + '<text x="' + (x0 + ww - 6) + '" y="' + (y2 + 17) + '" text-anchor="end" style="fill:#0B1526">TV ' + fmt(c.ptv) + '</text>';
      o += '<text x="4" y="' + (y2 + bh + 22) + '">TV = ' + CF[n - 1] + ' × (1 + ' + L.f1(g) + '%) ÷ (' + L.f1(r) + '% − ' + L.f1(g) + '%) = ' + fmt(c.tv) + ', ÷ ' + Math.pow(1 + r / 100, n).toFixed(2) + ' (5년 할인)</text>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', 'WACC ' + r + '%, g ' + g + '%: FCFF ' + CF.join(', ') + '의 현재가치 합 ' + fmt(c.sum) + ', 잔존가치 현재가치 ' + fmt(c.ptv) + ', EV ' + fmt(c.ev) + ' (예시)');
      eq.innerHTML = box('Σ FCFFₜ ÷ (1+WACC)ᵗ', fmt(c.sum)) + '<i>+</i>' + box('TV ÷ (1+WACC)ⁿ', fmt(c.ptv), 'wm') + '<i>=</i>' + box('EV(영업가치)', fmt(c.ev), 'ac');
      lb[0].textContent = L.f1(r) + '%'; lb[1].textContent = L.f1(g) + '%';
      var b = calc(true);
      vr.innerHTML = 'TV가 EV의 <b>' + Math.round(c.ptv / c.ev * 100) + '%</b>예요. WACC가 오르면 먼 해의 현금일수록 더 줄어요. (1 + WACC)로 나누는 횟수가 많거든요.' +
        (tried ? '<br><span class="m6bad">흔한 실수처럼 WACCⁿ(' + L.f1(r / 100) + 'ⁿ)으로 나누면 EV ≈ ' + fmt(b.ev) + ', 맞는 식의 약 ' + fmt(b.ev / c.ev) + '배예요. 미래 돈이 오늘 값보다 부풀어요. 분모는 (1 + WACC)ⁿ이어야 해요.</span>' : '') + ' (예시)';
    }
    sr.oninput = function () { r = +sr.value; draw(); }; sg.oninput = function () { g = +sg.value; draw(); };
    [sr, sg].forEach(function (s) { s.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
    bt.onclick = function () { tried = true; bt.classList.add('done'); bt.hidden = true; draw(); L.gate(ctx, true); };
    L.gate(ctx, false);
    return { draw: draw, gated: function () { return !tried; } };
  };

  // ── 두 길: FCFF(영업가치 + NOA − IBD) vs FCFE(할인한 값 + NOA) ──
  window.CUR_VIS.m6Bridge = function (host, p, ctx) {
    var v = { op: p.op || 1000, noa: p.noa == null ? 200 : p.noa, ibd: p.ibd == null ? 600 : p.ibd }, sh = p.shares || 10, px = p.price || 30, route = 'ff', seen = { ff: 1 };
    host.innerHTML = '<div class="vbt m6tab" role="group" aria-label="길"><button type="button" class="vgo on done" data-r="ff">FCFF 길</button><button type="button" class="vgo" data-r="fe">FCFE 길</button></div><div class="eqs" aria-live="polite"></div><svg role="img"></svg>' +
      L.sliderHtml('curM6op', 'FCFF 영업가치', 400, 2000, 50, v.op) + L.sliderHtml('curM6na', 'NOA', 0, 600, 50, v.noa) + L.sliderHtml('curM6ib', 'IBD', 0, 1000, 50, v.ibd) +
      '<table class="m6t"><tbody></tbody></table><p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eq = host.querySelector('.eqs'), vr = host.querySelector('.vr'), tb = host.querySelector('tbody'), ins = host.querySelectorAll('.vctl input'), lb = host.querySelectorAll('.vctl label b');
    function sgn(x) { return (x < 0 ? '−' : '') + fmt(Math.abs(x)); }
    function draw() {
      var fe = v.op - v.ibd, eqt = v.op + v.noa - v.ibd, tp = Math.max(eqt, 0) / sh, up = tp / px - 1, w = wOf(host), h = 210, base = h - 28, top = Math.max(2600, v.op + v.noa, v.ibd + Math.max(eqt, 0)), sc = (h - 50) / top, bw = Math.min(120, w / 2 - 40), xa = (w / 2 - bw) / 2, xb = w / 2 + (w / 2 - bw) / 2, o = '';
      function seg(x, y, val, fill, stroke, lab, dash) { var hh = Math.max(val, 0) * sc; if (hh <= 0) return [y, '']; return [y - hh, '<rect x="' + x + '" y="' + (y - hh) + '" width="' + bw + '" height="' + hh + '" fill="' + fill + '" stroke="' + stroke + '"' + (dash ? ' stroke-dasharray="4 3"' : '') + ' style="transition:all .3s"/>' + (hh > 16 ? '<text x="' + (x + bw / 2) + '" y="' + (y - hh / 2 + 4) + '" text-anchor="middle" class="tt">' + lab + '</text>' : '')]; }
      o += '<line class="ax" x1="0" x2="' + w + '" y1="' + base + '" y2="' + base + '"/>';
      var s;
      if (route === 'ff') { s = seg(xa, base, v.op, 'rgba(143,170,220,.4)', 'var(--ac)', '(A) 영업 ' + fmt(v.op)); o += s[1]; o += seg(xa, s[0], v.noa, 'rgba(169,216,188,.22)', 'var(--ok)', '(B) NOA ' + fmt(v.noa))[1]; }
      else { var ib = Math.min(v.ibd, v.op); s = seg(xa, base, ib, 'none', 'rgba(242,239,232,.35)', '이미 빠진 빚', 1); o += s[1]; var s2 = seg(xa, s[0], fe, 'rgba(143,170,220,.4)', 'var(--ac)', 'FCFE ' + sgn(fe)); o += s2[1]; o += seg(xa, s2[0], v.noa, 'rgba(169,216,188,.22)', 'var(--ok)', 'NOA ' + fmt(v.noa))[1]; }
      s = seg(xb, base, v.ibd, 'rgba(242,239,232,.16)', 'rgba(242,239,232,.5)', '(C) IBD ' + fmt(v.ibd), route === 'fe'); o += s[1]; o += seg(xb, s[0], eqt, 'rgba(232,201,160,.5)', 'var(--wm)', '자본가치 ' + sgn(eqt))[1];
      o += '<text x="' + (xa + bw / 2) + '" y="' + (h - 8) + '" text-anchor="middle">' + (route === 'ff' ? '영업 + 비영업' : 'FCFE 할인값 + NOA') + '</text><text x="' + (xb + bw / 2) + '" y="' + (h - 8) + '" text-anchor="middle">빚 + 주주 몫</text>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', (route === 'ff' ? 'FCFF 길: ' + fmt(v.op) + ' + ' + fmt(v.noa) + ' − ' + fmt(v.ibd) : 'FCFE 길: ' + sgn(fe) + ' + ' + fmt(v.noa)) + ' = 자본가치 ' + sgn(eqt) + ' (예시)');
      eq.innerHTML = route === 'ff' ? box('(A) 영업자산가치', fmt(v.op)) + '<i>+</i>' + box('(B) 비영업자산', fmt(v.noa)) + '<i>−</i>' + box('(C) 타인자본가치', fmt(v.ibd)) + '<i>=</i>' + box('자본가치', sgn(eqt), 'ac')
        : box('FCFE 할인값', sgn(fe)) + '<i>+</i>' + box('비영업자산', fmt(v.noa)) + '<i>=</i>' + box('자본가치', sgn(eqt), 'ac');
      var rows = route === 'ff' ? [['(A) 영업자산가치', fmt(v.op)], ['(B) 비영업자산', fmt(v.noa)], ['(A+B) 기업가치', fmt(v.op + v.noa), 'sub'], ['(C) 타인자본가치', fmt(v.ibd)], ['(A+B−C) 자본가치', sgn(eqt), 'sub']]
        : [['(A) FCFE를 할인한 값', sgn(fe)], ['(B) 비영업자산', fmt(v.noa)], ['(A+B) 자본가치', sgn(eqt), 'sub'], ['타인자본가치', '빼지 않아요', 'dim']];
      rows = rows.concat([['유통주식수', fmt(sh) + '주'], ['목표주가', fmt(tp), 'sub'], ['현재주가', fmt(px)], ['상승여력', eqt > 0 ? L.pc(up) : '−']]);
      tb.innerHTML = rows.map(function (x) { return '<tr class="' + (x[2] || '') + '"><th scope="row">' + x[0] + '</th><td>' + x[1] + '</td></tr>'; }).join('');
      lb[0].textContent = fmt(v.op); lb[1].textContent = fmt(v.noa); lb[2].textContent = fmt(v.ibd);
      vr.innerHTML = (route === 'ff' ? '영업가치에 NOA를 더하고 IBD를 빼요.' : 'FCFE는 빚을 갚은 뒤의 현금이라 할인값이 이미 ' + fmt(v.op) + ' − ' + fmt(v.ibd) + ' = ' + sgn(fe) + '이에요. IBD를 또 빼지 않아요.') +
        (eqt <= 0 ? ' 빚이 가진 것보다 많아 주주 몫이 남지 않아요.' : ' 자본가치 ' + sgn(eqt) + ' ÷ ' + fmt(sh) + '주 = 목표주가 <b>' + fmt(tp) + '</b>') + ' (예시)';
    }
    ins.forEach(function (s) { s.oninput = function () { v[{ curM6op: 'op', curM6na: 'noa', curM6ib: 'ibd' }[s.id]] = +s.value; draw(); }; s.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
    host.querySelectorAll('.m6tab button').forEach(function (b) {
      b.onclick = function () { route = b.getAttribute('data-r'); seen[route] = 1; b.classList.add('done'); host.querySelectorAll('.m6tab button').forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); L.gate(ctx, !!seen.fe); };
    });
    L.gate(ctx, false);
    return { draw: draw, gated: function () { return !seen.fe; } };
  };

  // ── 계정 분류: table(탭으로 분류표 보기) / pick(문제: 계정마다 NOA·IBD·배제 고르기) ──
  window.CUR_VIS.m6Accounts = function (host, p, ctx) {
    var CLS = { NOA: 'NOA', IBD: 'IBD', '배제': 'X', '?': 'Q' };
    function chip(c) { return '<em class="m6c ' + (CLS[c] || 'X') + '">' + esc(c) + '</em>'; }
    if (p.mode !== 'pick') {
      var G = p.groups || [], gi = 0, vis = { 0: 1 }, lg = p.legend || {}, WHY = p.why || {};
      host.innerHTML = '<div class="m6lg">' + Object.keys(lg).map(function (k) { return '<span>' + chip(k) + esc(lg[k]) + '</span>'; }).join('') + '</div>' +
        '<div class="vbt m6tab" role="tablist">' + G.map(function (g, i) { return '<button type="button" role="tab" class="vgo' + (i ? '' : ' on done') + '" data-g="' + i + '">' + esc(g.k) + '</button>'; }).join('') + '</div>' +
        '<p class="m6h"></p><ul class="m6al"></ul><p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
      var ul = host.querySelector('.m6al'), vr = host.querySelector('.vr'), hd = host.querySelector('.m6h');
      var paint = function () {
        var g = G[gi];
        hd.textContent = g.p || g.k;
        ul.innerHTML = g.rows.map(function (r, i) { return '<li><button type="button" data-i="' + i + '"><span class="m6n">' + esc(r.n) + (r.s ? '<small>' + esc(r.s) + '</small>' : '') + '</span>' + chip(r.c) + '</button></li>'; }).join('');
        ul.querySelectorAll('button').forEach(function (b) {
          b.onclick = function () {
            var r = g.rows[+b.getAttribute('data-i')];
            ul.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
            vr.innerHTML = '<b>' + esc(r.n) + (r.s ? '(' + esc(r.s) + ')' : '') + '</b> → ' + esc(r.c) + '<br>' + esc(r.d || WHY[r.c] || '');
          };
        });
        vr.textContent = '계정을 누르면 그렇게 나눈 이유가 나와요.' + (G.length > 1 ? ' (' + Object.keys(vis).length + ' / ' + G.length + ' 묶음 봤어요)' : '');
        L.gate(ctx, Object.keys(vis).length >= G.length);
      };
      host.querySelectorAll('.m6tab button').forEach(function (b) {
        b.onclick = function () { gi = +b.getAttribute('data-g'); vis[gi] = 1; b.classList.add('done'); host.querySelectorAll('.m6tab button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); paint(); };
      });
      paint();
      return { draw: function () {}, gated: function () { return Object.keys(vis).length < G.length; } };
    }
    // 문제 모드
    var RW = p.rows || [], st = {}, locked = false, moved = false, ans = ctx.answer || {}, OPT = ['NOA', 'IBD', '배제'], md = p.model || {}, sh = p.shares || 1;
    RW.forEach(function (r) { st[r.id] = r.c0; });
    function want(id) { return (ans.NOA || []).indexOf(id) >= 0 ? 'NOA' : (ans.IBD || []).indexOf(id) >= 0 ? 'IBD' : '배제'; }
    function f1c(x) { return (x < 0 ? '−' : '') + Math.abs(x).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
    var side = null;
    host.innerHTML = '<div class="eqs" aria-live="polite"></div><div class="m6pk">' + RW.map(function (r) {
      var hd2 = r.side !== side ? '<p class="m6sd">' + (r.side === 'L' ? '부채' : '자산') + ' (' + esc(p.asof || '') + ', ' + esc(p.unit || '') + ')</p>' : ''; side = r.side;
      return hd2 + '<div class="m6p" data-r="' + esc(r.id) + '"><span class="m6n">' + esc(r.n) + '<small>' + f1c(r.v) + ' ' + esc(p.unit || '') + '</small></span><div class="vbt" role="radiogroup" aria-label="' + esc(r.n) + '">' +
        OPT.map(function (o) { return '<button type="button" role="radio" data-c="' + o + '">' + o + '</button>'; }).join('') + '</div></div>';
    }).join('') + '</div><p class="vr" aria-live="polite"></p>';
    var eq = host.querySelector('.eqs'), vr = host.querySelector('.vr');
    function tot() { var a = 0, b = 0; RW.forEach(function (r) { if (st[r.id] === 'NOA') a += r.v; if (st[r.id] === 'IBD') b += r.v; }); return { noa: a, ibd: b }; }
    function paint() {
      var t = tot(), d = (t.noa - t.ibd) - ((md.noa || 0) - (md.ibd || 0)), ps = d * 1e6 / sh;
      host.querySelectorAll('.m6p').forEach(function (el) {
        var id = el.getAttribute('data-r');
        el.querySelectorAll('button').forEach(function (b) { var on = b.getAttribute('data-c') === st[id]; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      });
      eq.innerHTML = box('NOA', f1c(t.noa)) + '<i>−</i>' + box('IBD', f1c(t.ibd)) + '<i>=</i>' + box('NOA − IBD', f1c(t.noa - t.ibd), 'ac');
      vr.innerHTML = (locked || moved ? '' : esc(p.ask || '') + '<br>') + esc(p.name || '') + ' 모델 값(NOA ' + f1c(md.noa || 0) + ', IBD ' + f1c(md.ibd || 0) + ')보다 주주 몫 <b>' + (d >= 0 ? '+' : '') + f1c(d) + '</b> ' + esc(p.unit || '') + ', 주당 <b>' + (ps >= 0 ? '+' : '−') + fmt(Math.abs(ps)) + '원</b>. 영업가치(EV)는 같다고 둘 때예요. (' + esc(p.asof || '') + ')';
    }
    host.querySelectorAll('.m6p').forEach(function (el) {
      var id = el.getAttribute('data-r');
      el.querySelectorAll('button').forEach(function (b) { b.onclick = function () { if (locked) return; st[id] = b.getAttribute('data-c'); moved = true; ctx.ready(true); paint(); }; });
    });
    host.__solve = function (right) { RW.forEach(function (r) { st[r.id] = right ? want(r.id) : r.c0; }); moved = true; ctx.ready(true); paint(); };
    paint();
    return {
      draw: function () {},
      check: function () {
        var bad = RW.filter(function (r) { return st[r.id] !== want(r.id); });
        return { right: !bad.length, detail: bad.length ? '아직 다른 칸: ' + bad.map(function (r) { return r.n; }).join(', ') + '.' : '모든 계정을 맞게 나눴어요.' };
      },
      reveal: function (right, show) {
        locked = true;
        host.querySelectorAll('.m6p').forEach(function (el) {
          var id = el.getAttribute('data-r'), ok = st[id] === want(id);
          el.classList.add(ok ? 'ok' : 'no');
          el.querySelectorAll('button').forEach(function (b) { b.disabled = true; if ((show || right) && b.getAttribute('data-c') === want(id)) b.classList.add('ok'); else if (b.getAttribute('data-c') === st[id] && !ok) b.classList.add('no'); });
        });
        if (show || right) { RW.forEach(function (r) { st[r.id] = want(r.id); }); }
        paint();
      }
    };
  };
  // ════ 개념 그림 (VISUAL_BRIEF): 비례 막대 + 직접 주석. 글씨 흰색, 금색은 화면마다 핵심 한 곳 ════
  // m6Pieces: 가게값 + 금고 현금 − 빚 = 내 몫 (가로 다리, 정적) / m6Claim: 가진 것 vs 누구 몫, 빚 슬라이더
  // m6Whose: FCFF 안의 FCFE (막대 하나 + 괄호) / m6Sheet: T자 재무상태표에서 NOA·IBD 줄만 골라내기
  (function () {
    if (!document.getElementById('cur-plex')) { var lk = document.createElement('link'); lk.id = 'cur-plex'; lk.rel = 'stylesheet'; lk.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&display=swap'; document.head.appendChild(lk); }
  })();
  var GOLD = '#E2C48F', NAVY = '#1C2C48', HAIR = 'rgba(242,239,232,.28)', INK = '#F2EFE8', NUMF = "'IBM Plex Sans','RFS Dotum UI',sans-serif";
  L.addCss('cur-m6v-css', [
    '.cur .vis svg.m6v{max-width:560px}',
    '.cur .vis svg.m6v text{fill:' + INK + ';font-size:13px}',
    '.cur .vis svg.m6v text.s{fill:rgba(242,239,232,.72);font-size:12px}',
    '.cur .vis svg.m6v text.n{font-family:' + NUMF + ';font-variant-numeric:tabular-nums;font-size:14px;font-weight:500}',
    '.cur .vis svg.m6v text.big{font-family:var(--ser);font-size:22px;font-weight:600}',
    '.cur .vis svg.m6v text.dk{fill:#0B1526;font-weight:500}',
    '.cur .vis svg.m6v text.h{fill:rgba(242,239,232,.72);font-size:12.5px;letter-spacing:.02em}',
    '.cur .vis svg.m6v .mv{transition:all .25s ease}',
    '.cur .m6vc{margin-top:10px;font-size:12.5px;color:rgba(242,239,232,.72);max-width:560px}',
    '.cur .vis.m6w .vctl{max-width:560px}.cur .m6vr{max-width:560px}.cur .m6vr .n{font-family:' + NUMF + ';font-variant-numeric:tabular-nums}',
    '.cur .m6led{max-width:560px;color:' + INK + ';font-size:14.5px}',
    '.cur .m6led .lh{display:grid;grid-template-columns:1fr 1fr;border-bottom:1.5px solid ' + INK + ';padding-bottom:6px;font-weight:500;font-size:14px}',
    '.cur .m6led .lh span:last-child{padding-left:16px}',
    '.cur .m6led .lb{display:grid;grid-template-columns:1fr 1fr;border-bottom:3px double ' + INK + '}',
    '.cur .m6led .sd .rw:last-child{border-bottom:0}',
    '.cur .m6led .sd{display:flex;flex-direction:column;padding:4px 16px 0 0;min-width:0}',
    '.cur .m6led .sd+.sd{border-left:1.5px solid ' + INK + ';padding:4px 0 0 16px}',
    '.cur .m6led .rw{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 0;border-bottom:1px solid rgba(242,239,232,.12)}',
    '.cur .m6led .rw.x span:first-child{opacity:.5}.cur .m6led .rw.x i{color:rgba(242,239,232,.5);font-family:inherit;font-weight:400;font-size:12.5px}',
    '.cur .m6led .rw i{font-style:normal;color:' + GOLD + ';font-family:' + NUMF + ';font-weight:500;white-space:nowrap}',
    '.cur .m6led .rw.own i{color:rgba(242,239,232,.72);font-family:inherit;font-weight:400;font-size:12.5px}',
    '.cur .m6led .lnote{margin:12px 0 0;font-size:13px;line-height:1.6;color:' + INK + '}',
    '.cur .m6led .lnote b{color:' + GOLD + ';font-weight:500}',
    '@media (max-width:420px){.cur .m6led{font-size:13.5px}.cur .m6led .sd{padding-right:10px}.cur .m6led .sd+.sd{padding-left:10px}}'
  ].join('\n'));
  function vw(host) { return Math.min(wOf(host), 560); }
  function t(x, y, cls, s, anchor) { return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '"' + (cls ? ' class="' + cls + '"' : '') + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + s + '</text>'; }
  function ln(x1, y1, x2, y2, st, dash) { return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + st + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'; }
  function rc(x, y, w, h, fill, st, dash, cls) { return '<rect' + (cls ? ' class="' + cls + '"' : '') + ' x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" fill="' + fill + '"' + (st ? ' stroke="' + st + '"' : '') + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'; }

  // ── 가로 다리: 가게값 + 금고 현금 − 빚 = 내 몫. 길이가 곧 값 ──
  window.CUR_VIS.m6Pieces = function (host, p, ctx) {
    var ev = p.ev || 1000, noa = p.noa || 200, ibd = p.ibd || 600, eq = ev + noa - ibd, R = p.rows || [['가게값', '영업가치'], ['금고 현금', '비영업자산'], ['은행 빚', '이자부부채'], ['내 몫', '주주가치']];
    host.innerHTML = '<svg class="m6v" role="img"></svg>' + (p.cap ? '<p class="m6vc">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg');
    function draw() {
      var w = vw(host), lw = clamp(Math.round(w * 0.24), 84, 116), x0 = lw + 10, nw = 62, bw = w - x0 - nw, top = Math.max(ev + noa, eq), sc = bw / top, X = function (v) { return x0 + v * sc; };
      var bh = 30, py = 58, y = function (i) { return 6 + i * py; }, o = '';
      o += ln(x0, 0, x0, y(3) + bh + 4, 'rgba(242,239,232,.35)');
      // 0 가게값
      o += rc(x0, y(0), ev * sc, bh, NAVY, HAIR) + t(X(ev) + 8, y(0) + 20, 'n', fmt(ev));
      o += ln(X(ev), y(0) + bh, X(ev), y(1), 'rgba(242,239,232,.35)', '3 3');
      // 1 + 금고 현금
      o += rc(X(ev), y(1), noa * sc, bh, 'rgba(242,239,232,.10)', 'rgba(242,239,232,.45)') + t(X(ev + noa) + 8, y(1) + 20, 'n', '+' + fmt(noa));
      o += ln(X(ev + noa), y(1) + bh, X(ev + noa), y(2), 'rgba(242,239,232,.35)', '3 3');
      // 2 − 빚 (오른쪽 끝에서 왼쪽으로 덜어 냄)
      o += rc(X(eq), y(2), ibd * sc, bh, 'rgba(242,239,232,.04)', 'rgba(242,239,232,.55)', '4 3') + t(X(ev + noa) + 8, y(2) + 20, 'n', '−' + fmt(ibd));
      o += ln(X(eq), y(2) + bh, X(eq), y(3), 'rgba(242,239,232,.35)', '3 3');
      // 3 = 내 몫
      o += rc(x0, y(3), eq * sc, bh, GOLD) + t(X(eq) + 10, y(3) + 23, 'big', fmt(eq));
      ['', '+ ', '− ', '= '].forEach(function (op, i) { o += t(lw, y(i) + 13, '', op + esc(R[i][0]), 'end') + t(lw, y(i) + 29, 's', esc(R[i][1]), 'end'); });
      var h = y(3) + bh + 6;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', R[0][0] + '(' + R[0][1] + ') ' + fmt(ev) + ' 더하기 ' + R[1][0] + ' ' + fmt(noa) + ' 빼기 ' + R[2][0] + ' ' + fmt(ibd) + ' 는 ' + R[3][0] + ' ' + fmt(eq) + ' (예시)');
    }
    return { draw: draw };
  };

  // ── 가진 것 vs 누구 몫: 빚을 움직이면 영업가치는 그대로, 주주 몫만 줄었다 늘었다 ──
  window.CUR_VIS.m6Claim = function (host, p, ctx) {
    var ev = p.ev || 1000, noa = p.noa == null ? 200 : p.noa, b = p.ibd == null ? 600 : p.ibd, tot = ev + noa;
    host.innerHTML = '<svg class="m6v" role="img"></svg>' + L.sliderHtml('curM6cl', p.sl || '이자부부채', p.min || 0, p.max || 1000, p.step || 50, b, '이자부부채 크기') +
      '<p class="vr m6vr" aria-live="polite"></p>' + (p.cap ? '<p class="m6vc">' + esc(p.cap) + '</p>' : '');
    host.classList.add('m6w');
    var svg = host.querySelector('svg'), sl = host.querySelector('#curM6cl'), lb = host.querySelector('.vctl label b'), vr = host.querySelector('.vr');
    function draw() {
      var w = vw(host), h = 286, base = h - 14, ph = 210, sc = ph / tot, bw = clamp(Math.round(w * 0.15), 48, 88), gap = clamp(Math.round(w * 0.07), 20, 36), xl = w / 2 - gap / 2 - bw, xr = w / 2 + gap / 2, eq = tot - b, o = '';
      var Y = function (v) { return base - v * sc; }, ta = xl - 12, tb = xr + bw + 12;
      o += ln(xl - 6, base, xr + bw + 6, base, 'rgba(242,239,232,.35)');
      o += t(xl + bw / 2, Y(tot) - 12, 'h', '가진 것', 'middle') + t(xr + bw / 2, Y(tot) - 12, 'h', '누구 몫', 'middle');
      // 왼쪽: 영업가치 + 비영업자산 (움직이지 않음)
      o += rc(xl, Y(ev), bw, ev * sc, NAVY, HAIR) + rc(xl, Y(tot), bw, noa * sc, 'rgba(242,239,232,.10)', 'rgba(242,239,232,.45)');
      o += ln(xl - 8, Y(ev / 2), xl, Y(ev / 2), HAIR) + t(ta, Y(ev / 2) - 3, '', '영업가치 <tspan class="n" style="font-size:13px">' + fmt(ev) + '</tspan>', 'end') + t(ta, Y(ev / 2) + 13, 's', esc(p.evNote || '이자 내기 전 현금'), 'end');
      if (noa) o += ln(xl - 8, Y(ev + noa / 2), xl, Y(ev + noa / 2), HAIR) + t(ta, Y(ev + noa / 2) - 3, '', '비영업자산 <tspan class="n" style="font-size:13px">' + fmt(noa) + '</tspan>', 'end') + t(ta, Y(ev + noa / 2) + 13, 's', esc(p.noaNote || '영업 현금엔 없어요'), 'end');
      // 오른쪽: 이자부부채 + 주주 몫
      o += rc(xr, Y(b), bw, b * sc, 'rgba(242,239,232,.04)', 'rgba(242,239,232,.55)', '4 3', 'mv') + rc(xr, Y(tot), bw, eq * sc, GOLD, null, null, 'mv');
      if (b > 0) o += ln(xr + bw, Y(b / 2), xr + bw + 8, Y(b / 2), HAIR) + t(tb, Y(b / 2) - 3, '', '이자부부채 <tspan class="n" style="font-size:13px">' + fmt(b) + '</tspan>', 'start') + t(tb, Y(b / 2) + 13, 's', esc(p.ibdNote || '채권자에게 먼저'), 'start');
      o += ln(xr + bw, Y(b + eq / 2), xr + bw + 8, Y(b + eq / 2), GOLD) + t(tb, Y(b + eq / 2) + 2, 'big', fmt(eq), 'start') + t(tb, Y(b + eq / 2) + 19, 's', '주주 몫', 'start');
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', '가진 것: 영업가치 ' + fmt(ev) + ' + 비영업자산 ' + fmt(noa) + '. 누구 몫: 이자부부채 ' + fmt(b) + ', 주주 몫 ' + fmt(eq) + ' (예시)');
      lb.textContent = fmt(b);
      vr.innerHTML = '<span class="n">' + fmt(ev) + ' + ' + fmt(noa) + ' − ' + fmt(b) + ' = </span><b class="n">' + fmt(eq) + '</b>. ' +
        (b > 0 ? '빚이 ' + fmt(b) + '이어도 영업가치는 ' + fmt(ev) + ' 그대로라, 빚만큼 주주 몫이 줄어요.' : '빚이 없으면 가진 것 ' + fmt(tot) + '이 모두 주주 몫이에요.') + ' (예시)';
    }
    sl.oninput = function () { b = +sl.value; draw(); };
    sl.addEventListener('keydown', function (e) { e.stopPropagation(); });
    ctx.ready(true);
    return { draw: draw };
  };

  // ── FCFF 안의 FCFE: 같은 현금 막대, 누구에게 가느냐로 둘을 나눈다 ──
  window.CUR_VIS.m6Whose = function (host, p, ctx) {
    var share = p.share || 0.4, ff = esc(p.ff || '채권자와 주주가 함께 나눌 현금'), ffr = esc(p.ffr || '영업가치'), fe = esc(p.fe || '이자와 원금을 갚고 주주에게 남는 현금'), fer = esc(p.fer || '빚을 뺀 주주 몫'), cr = esc(p.cr || '채권자 몫'), sh = esc(p.sh || '주주 몫');
    host.innerHTML = '<svg class="m6v" role="img" aria-label="FCFF는 채권자와 주주가 나눌 현금 전체, FCFE는 그중 이자와 원금을 갚고 주주에게 남는 부분"></svg>' + (p.cap ? '<p class="m6vc">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg');
    function draw() {
      var w = vw(host), x0 = 1, x1 = w - 1, xs = x0 + (x1 - x0) * (1 - share), by = 66, bh = 40, o = '';
      // 위 괄호: FCFF = 막대 전체
      o += t(x0, 18, '', '<tspan class="n" style="font-size:15px">FCFF</tspan>  ' + ff) + t(x0, 37, 's', '할인하면 → ' + ffr);
      o += ln(x0, 50, x1, 50, 'rgba(242,239,232,.6)') + ln(x0, 50, x0, 58, 'rgba(242,239,232,.6)') + ln(x1, 50, x1, 58, 'rgba(242,239,232,.6)');
      // 막대: 채권자 몫 | 주주 몫
      o += rc(x0, by, xs - x0, bh, NAVY, HAIR) + rc(xs, by, x1 - xs, bh, GOLD);
      o += t((x0 + xs) / 2, by + 25, '', cr, 'middle') + t((xs + x1) / 2, by + 25, 'dk', sh, 'middle');
      // 아래 괄호: FCFE = 금색 부분만
      var yb = by + bh + 10;
      o += ln(xs, yb + 8, x1, yb + 8, GOLD) + ln(xs, yb, xs, yb + 8, GOLD) + ln(x1, yb, x1, yb + 8, GOLD);
      o += t(x1, yb + 32, '', '<tspan class="n" style="font-size:15px">FCFE</tspan>  ' + fe, 'end') + t(x1, yb + 51, 's', '할인하면 → ' + fer, 'end');
      var h = yb + 58;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
    }
    return { draw: draw };
  };

  // ── T자 재무상태표: 흐린 줄은 이미 영업가치 안, 금색 표시 줄만 더하고 뺀다 ──
  window.CUR_VIS.m6Sheet = function (host, p, ctx) {
    var MK = { NOA: 'NOA +', IBD: 'IBD −', X: '배제' };
    function rows(A) {
      return A.map(function (r) {
        var c = r[1], cls = c === 'NOA' || c === 'IBD' ? '' : c === 'EQ' ? 'own' : 'x';
        return '<div class="rw ' + cls + '"><span>' + esc(r[0]) + '</span><i>' + (c === 'EQ' ? esc(r[2] || '') : MK[c] || '') + '</i></div>';
      }).join('');
    }
    var la = (p.L || []).map(function (r) { return r[0] + (r[1] === 'NOA' ? ' 더해요' : r[1] === 'IBD' ? ' 빼요' : ''); }), lr = (p.R || []).map(function (r) { return r[0] + (r[1] === 'NOA' ? ' 더해요' : r[1] === 'IBD' ? ' 빼요' : ''); });
    host.innerHTML = '<div class="m6led" role="img" aria-label="재무상태표. 자산: ' + esc(la.join(', ')) + '. 부채와 자본: ' + esc(lr.join(', ')) + '"><div class="lh"><span>' + esc(p.lh || '자산') + '</span><span>' + esc(p.rh || '부채와 자본') + '</span></div>' +
      '<div class="lb"><div class="sd">' + rows(p.L || []) + '</div><div class="sd">' + rows(p.R || []) + '</div></div>' + (p.note ? '<p class="lnote">' + p.note + '</p>' : '') + '</div>';
    return { draw: function () {} };
  };
})();
