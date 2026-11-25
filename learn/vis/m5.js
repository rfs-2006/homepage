// ── M5 SOTP 부품 (harness/PLUGIN.md) ─────────────────────────
// m5Sotp   : 줄마다 기준값 × 배수 × 지분율 × (1 − 할인율)을 쌓고, 순차입금을 빼 주당 가치까지. 문제 모드: 슬라이더 하나로 목표 시가총액을 지금 시가총액에 맞추기 → { key, value, tol }
// m5Struct : SOTP 뼈대. 왼쪽(사업부 EV + 비영업자산) = 오른쪽(Equity value + 순차입금). 블록을 다 눌러 봐야 넘어간다
// m5Consol : 연결(자회사 100%) vs 모회사 주주 몫(지분율만큼). 지분율 슬라이더, 매출/영업이익 전환
// m5Rev    : 수주 프로젝트 매출 짜기. 호기 수 × 호기당 단가를 건설 기간에 나눠 연도별 매출·이익
(function () {
  var L = window.CUR_LIB, esc = L.esc, fmt = L.fmt, clamp = L.clamp;
  L.addCss('cur-m5-css', [
    '.cur .m5rl{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:4px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}',
    '.cur .m5rl li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;align-items:baseline;padding:7px 10px;border:1px solid var(--hair);background:rgba(9,17,31,.35);cursor:pointer;transition:border-color .2s}',
    '.cur .m5rl li:hover,.cur .m5rl li.on{border-color:var(--ac)}',
    '.cur .m5rl li b{font-weight:500;font-size:14px;color:var(--tx);min-width:0}',
    '.cur .m5rl li em{font-style:normal;font-family:var(--ser);font-weight:600;font-size:15px;color:var(--tx);font-variant-numeric:tabular-nums;text-align:right}',
    '.cur .m5rl li small{grid-column:1/-1;font-size:12px;color:var(--t3);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}',
    '.cur .m5rl li i{font-style:normal;font-size:11px;letter-spacing:.06em;color:var(--ac2);margin-right:6px}',
    '.cur .m5st{display:grid;grid-template-columns:minmax(0,1fr) 22px minmax(0,1fr);gap:0 6px;align-items:end}',
    '.cur .m5st h4{margin:0 0 6px;font-size:12.5px;font-weight:500;letter-spacing:.04em;color:var(--t3);text-align:center}',
    '.cur .m5st .col{display:flex;flex-direction:column;gap:3px}',
    '.cur .m5st .eqm{align-self:center;text-align:center;color:var(--t3);font-size:20px}',
    '.cur .m5b{display:flex;flex-direction:column;justify-content:center;align-items:center;padding:4px 6px;border:1px solid var(--hair);color:var(--tx);font:inherit;text-align:center;cursor:pointer;min-height:30px;overflow:hidden;transition:height .35s var(--e),border-color .2s,background .2s}',
    '.cur .m5b b{font-weight:500;font-size:13px;line-height:1.25}.cur .m5b small{font-size:11px;color:var(--t3);line-height:1.2}',
    '.cur .m5b.ev{background:rgba(143,170,220,.32);border-color:rgba(143,170,220,.6)}.cur .m5b.noa{background:rgba(242,239,232,.1)}',
    '.cur .m5b.eqv{background:rgba(232,201,160,.5);border-color:var(--wm);cursor:default}.cur .m5b.nd{background:rgba(9,17,31,.5);border-style:dashed;cursor:default}',
    '.cur .m5b.done{box-shadow:inset 0 0 0 1px var(--ac2)}.cur .m5b:focus-visible{outline:2px solid var(--ac);outline-offset:2px}',
    '.cur .m5tg{display:flex;gap:8px;margin-top:4px}',
    '.cur .m5lg{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:8px;font-size:12.5px;color:var(--t3)}.cur .m5lg i{display:inline-block;width:10px;height:10px;margin-right:5px;vertical-align:-1px;border:1px solid var(--hair)}'
  ].join('\n'));

  function f2(x) { return (Math.round(x * 100) / 100).toFixed(2).replace(/0$/, '').replace(/\.$/, ''); }
  function sg(x) { return (x < 0 ? '−' : '') + fmt(Math.abs(x)); }
  function pctS(x) { return (x >= 0 ? '+' : '−') + Math.abs(Math.round(x * 100)) + '%'; }
  function n2(x) { return (Math.round(x * 100) / 100).toString(); }
  // range 입력: step="any"로 두고 JS에서 논리 step에 맞춘다 (처음 값은 평가표 숫자 그대로 두려고)
  function slider(id, label, s, val) {
    return '<div class="vctl"><label for="' + id + '">' + esc(label) + ' <b></b></label><input id="' + id + '" type="range" min="' + s.min + '" max="' + s.max + '" step="any" value="' + val + '" aria-label="' + esc(label) + '"></div>';
  }
  function bindSlider(inp, s, get, set, onMove) {
    function put(x) { var v = clamp(+s.min + Math.round((x - s.min) / s.step) * s.step, +s.min, +s.max); v = Math.round(v * 1e6) / 1e6; set(v); inp.value = v; onMove(); }
    inp.addEventListener('input', function () { put(+inp.value); });
    inp.addEventListener('keydown', function (e) {
      e.stopPropagation();
      var d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
      if (d) { e.preventDefault(); if (!inp.disabled) put(get() + d * s.step); }
    });
  }

  // ════ m5Sotp ════
  window.CUR_VIS.m5Sotp = function (host, p, ctx) {
    var Q = ctx.mode === 'question', U = p.unit || '억 원', won = p.won || 1e8, rows = JSON.parse(JSON.stringify(p.rows || [])), R = {}, SL = p.sl || [], ans = ctx.answer || {};
    var GL = p.gl || { A: '(A) 영업가치', B: '(B) 기타 영업가치', C: '(C) 비영업가치' }, GC = { A: ['rgba(143,170,220,.55)', 'var(--ac)'], B: ['rgba(201,216,245,.28)', 'var(--ac2)'], C: ['rgba(242,239,232,.14)', 'rgba(242,239,232,.5)'] };
    rows.forEach(function (r) { R[r.id] = r; });
    var moved = false, locked = false, showAns = false, sel = null;
    var DS = SL.filter(function (s) { return s.key === 'disc'; })[0];
    function getK(key) { if (key === 'disc') { var r0 = R[DS.rows[0]]; return r0 ? (r0.disc || 0) : 0; } return R[key.slice(2)].k; }
    function setK(key, v) { if (key === 'disc') DS.rows.forEach(function (id) { R[id].disc = v; }); else R[key.slice(2)].k = v; }
    function val(r) { return r.v != null ? r.v : r.b * (r.k == null ? 1 : r.k) * (r.own == null ? 100 : r.own) / 100 * (1 - (r.disc || 0) / 100); }
    function calc() {
      var g = { A: 0, B: 0, C: 0 }; rows.forEach(function (r) { g[r.g || 'A'] += val(r); });
      var tot = g.A + g.B + g.C, e = tot - (p.nd || 0); return { g: g, tot: tot, eq: e, ps: e * won / p.shares };
    }
    function formula(r) {
      if (r.v != null) return '평가액 ' + fmt(r.v);
      var s = (r.bl ? r.bl + ' ' : '') + fmt(r.b);
      if (r.k != null) s += ' × ' + f2(r.k) + '배';
      if (r.own != null && r.own !== 100) s += ' × 지분 ' + r.own + '%';
      if (r.disc) s += ' × (1 − ' + r.disc + '%)';
      return s;
    }
    host.innerHTML = '<div class="eqs" aria-live="polite"></div><svg role="img"></svg>' +
      SL.map(function (s, i) { return slider('curM5s' + i, s.l, s, getK(s.key)); }).join('') +
      '<p class="vr" aria-live="polite"></p><ul class="m5rl"></ul>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eq = host.querySelector('.eqs'), vr = host.querySelector('.vr'), ul = host.querySelector('.m5rl'), ins = host.querySelectorAll('.vctl input');
    function box(t, x, c) { return '<div class="eq ' + (c || '') + '"><small>' + esc(t) + '</small><b>' + x + '</b></div>'; }
    function labels() {
      host.querySelectorAll('.vctl').forEach(function (cl, i) { var s = SL[i], v = getK(s.key); cl.querySelector('b').textContent = (s.u === '%' ? Math.round(v) : f2(v)) + (s.u || ''); cl.querySelector('input').value = v; });
    }
    function list() {
      ul.innerHTML = rows.map(function (r) {
        return '<li data-r="' + esc(r.id) + '" class="' + (sel === r.id ? 'on' : '') + '" tabindex="0"><b><i>' + esc((GL[r.g || 'A'] || '').replace(/\s.*$/, '')) + '</i>' + esc(r.l) + '</b><em>' + fmt(val(r)) + '</em><small>' + esc(formula(r)) + '</small></li>';
      }).join('');
      ul.querySelectorAll('li').forEach(function (li) {
        function pick() { sel = li.getAttribute('data-r'); list(); read(); }
        li.onclick = pick; li.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick(); } };
      });
    }
    function read() {
      var c = calc(), ex = p.price ? c.ps / p.price - 1 : null, gs = ['A', 'B', 'C'].filter(function (k) { return rows.some(function (r) { return (r.g || 'A') === k; }); });
      eq.innerHTML = gs.map(function (k, i) { return (i ? '<i>+</i>' : '') + box(GL[k] || k, fmt(c.g[k])); }).join('') + '<i>−</i>' + box('순차입금', sg(p.nd || 0)) + '<i>=</i>' + box('주주가치', sg(c.eq), 'hl') + '<i>÷</i>' + box('주식 수', fmt(p.shares) + '주') + '<i>=</i>' + box('주당 가치', (c.eq > 0 ? fmt(c.ps) : '0') + '원', 'ac');
      var s = '';
      if (Q) {
        var gap = c.eq / p.target - 1;
        s = locked ? '' : moved ? '목표 시가총액 <b>' + fmt(c.eq) + '</b> vs 지금 시가총액 <b>' + fmt(p.target) + '</b> ' + esc(U) + ' (' + (Math.abs(gap) < 0.005 ? '거의 같아요' : pctS(gap)) + ')' : esc(p.ask || '슬라이더를 움직여 보세요.');
      } else {
        s = '주주가치 <b>' + sg(c.eq) + '</b> ' + esc(U) + (p.name ? ' · ' + esc(p.name) : '') + ' → 주당 <b>' + (c.eq > 0 ? fmt(c.ps) : '0') + '원</b>' + (ex != null && c.eq > 0 ? ' · 현재가 ' + fmt(p.price) + '원 대비 ' + pctS(ex) : '');
        var big = rows.slice().sort(function (a, b) { return val(b) - val(a); })[0];
        if (big && c.tot > 0) s += '<br>가장 큰 줄: ' + esc(big.l) + ' (전체 가치의 ' + Math.round(100 * val(big) / c.tot) + '%)';
      }
      if (sel && R[sel] && R[sel].d && !(Q && !locked && !moved)) s += (s ? '<br>' : '') + '<b>' + esc(R[sel].l) + '</b> · ' + esc(R[sel].d);
      vr.innerHTML = s;
    }
    function draw() {
      var w = L.wOf(host), c = calc(), top = Math.max(c.tot, c.eq, Q ? p.target : 0, 1), bw = w, X = function (v) { return bw * Math.max(0, v) / top; }, o = '', y1 = 22, bh = 34, y2 = y1 + bh + 40, h = y2 + bh + 30;
      o += '<text x="0" y="14" class="tt">전체 가치 ' + fmt(c.tot) + '</text>';
      var x = 0;
      rows.forEach(function (r) {
        var vv = Math.max(0, val(r)), ww = bw * vv / top, col = GC[r.g || 'A'];
        o += '<rect x="' + X(x) + '" y="' + y1 + '" width="' + Math.max(0, ww - 1) + '" height="' + bh + '" fill="' + col[0] + '" stroke="' + col[1] + '" style="transition:all .3s"' + (sel === r.id ? ' stroke-width="2.5"' : '') + '><title>' + esc(r.l) + ' ' + fmt(vv) + '</title></rect>';
        if (ww > Math.max(56, r.l.length * 11)) o += '<text x="' + (X(x) + 6) + '" y="' + (y1 + 21) + '" class="tt">' + esc(r.l) + '</text>';
        x += vv;
      });
      var e = Math.max(0, c.eq), nd = p.nd || 0;
      o += '<text x="0" y="' + (y2 - 8) + '" class="tt">누구 몫?</text>';
      o += '<rect x="0" y="' + y2 + '" width="' + Math.max(0, X(e) - 1) + '" height="' + bh + '" fill="rgba(232,201,160,.45)" stroke="var(--wm)" style="transition:all .3s"/>';
      if (X(e) > 90) o += '<text x="6" y="' + (y2 + 21) + '" class="twm">주주가치 ' + fmt(e) + '</text>';
      if (nd > 0) { o += '<rect x="' + X(e) + '" y="' + y2 + '" width="' + Math.max(0, X(e + nd) - X(e) - 1) + '" height="' + bh + '" fill="none" stroke="rgba(242,239,232,.55)" stroke-dasharray="4 3" style="transition:all .3s"/>'; if (X(e + nd) - X(e) > 70) o += '<text x="' + (X(e) + 6) + '" y="' + (y2 + 21) + '" class="tt">순차입금 ' + fmt(nd) + '</text>'; }
      if (Q) { var tx = X(p.target); o += '<line x1="' + tx + '" x2="' + tx + '" y1="' + (y2 - 6) + '" y2="' + (y2 + bh + 6) + '" stroke="var(--ok)" stroke-width="2"/><text x="' + clamp(tx, 60, w - 60) + '" y="' + (y2 + bh + 22) + '" text-anchor="middle" class="tok">지금 시가총액 ' + fmt(p.target) + '</text>'; }
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', rows.map(function (r) { return r.l + ' ' + fmt(val(r)); }).join(', ') + ', 순차입금 ' + fmt(nd) + ', 주주가치 ' + fmt(c.eq) + ' ' + U);
      labels(); list(); read();
    }
    ins.forEach(function (inp, i) {
      var s = SL[i];
      bindSlider(inp, s, function () { return getK(s.key); }, function (v) { setK(s.key, v); }, function () { if (locked) return; if (Q) { moved = true; ctx.ready(true); } draw(); });
    });
    if (!Q) L.gate(ctx, true);
    var aSl = SL.filter(function (s) { return s.key === ans.key; })[0];
    function hit() { return Math.abs(getK(ans.key) - ans.value) <= (ans.tol || 0) + 1e-9; }
    if (Q) host.__solve = function (right) {
      if (!aSl) return;
      var v = right ? ans.value : (ans.value + (aSl.max - ans.value > ans.value - aSl.min ? 1 : -1) * Math.max(4 * (ans.tol || aSl.step), (aSl.max - aSl.min) / 3));
      v = clamp(+aSl.min + Math.round((v - aSl.min) / aSl.step) * aSl.step, +aSl.min, +aSl.max);
      setK(ans.key, Math.round(v * 1e6) / 1e6); moved = true; ctx.ready(true); draw();
    };
    return {
      draw: draw,
      gated: function () { return false; },
      check: function () { var c = calc(); return { right: hit(), detail: (aSl ? aSl.l + ' ' + f2(getK(ans.key)) + (aSl.u || '') + ', ' : '') + '목표 시가총액 ' + fmt(c.eq) + ' ' + U + '.' }; },
      reveal: function (right, a) {
        locked = true; showAns = a || right; ins.forEach(function (s) { s.disabled = true; });
        if (showAns && !right && aSl) setK(ans.key, ans.value);
        draw();
        var c = calc();
        vr.innerHTML = (aSl ? esc(aSl.l) + ' <b>' + f2(getK(ans.key)) + (aSl.u || '') + '</b> → ' : '') + '목표 시가총액 ' + fmt(c.eq) + ' vs 지금 ' + fmt(p.target) + ' ' + esc(U) + (showAns && !right ? '<br>정답 근처로 옮겨 놓았어요: 약 <b>' + f2(ans.value) + (aSl ? aSl.u || '' : '') + '</b>.' : '');
      }
    };
  };

  // ════ m5Struct ════
  window.CUR_VIS.m5Struct = function (host, p, ctx) {
    var P = p.parts || [], U = p.unit || '억 원', nd = p.nd || 0, seen = {}, sel = -1;
    var tot = P.reduce(function (a, b) { return a + b.v; }, 0), ndMax = p.ndMax || tot;
    var sl = { min: 0, max: ndMax, step: p.ndStep || 100 };
    host.innerHTML = '<div class="m5st"><div><h4>기업 전체 가치</h4><div class="col cl1"></div></div><div class="eqm">=</div><div><h4>누구 몫?</h4><div class="col cl2"></div></div></div>' +
      '<p class="m5lg"><span><i style="background:rgba(143,170,220,.32)"></i>영업가치(EV)</span><span><i style="background:rgba(242,239,232,.1)"></i>비영업자산(NOA)</span><span><i style="background:rgba(232,201,160,.5)"></i>주주 몫</span></p>' +
      slider('curM5nd', '순차입금', sl, nd) + '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var c1 = host.querySelector('.cl1'), c2 = host.querySelector('.cl2'), vr = host.querySelector('.vr'), inp = host.querySelector('input');
    function H() { return L.wOf(host) < 480 ? 330 : 380; }
    function build() {
      var Ht = H(), n = P.length, free = Ht - 30 * n - 3 * (n - 1);
      c1.innerHTML = P.map(function (b, i) {
        var hh = 30 + free * b.v / tot;
        return '<button type="button" class="m5b vgo ' + (b.g === 'noa' ? 'noa' : 'ev') + (seen[i] ? ' done' : '') + '" data-i="' + i + '" style="height:' + hh.toFixed(1) + 'px" aria-pressed="' + (sel === i) + '"><b>' + esc(b.l) + '</b>' + (hh > 46 && b.sub ? '<small>' + esc(b.sub) + '</small>' : '') + '</button>';
      }).join('');
      c1.querySelectorAll('.m5b').forEach(function (b) {
        b.onclick = function () { var i = +b.getAttribute('data-i'); seen[i] = 1; sel = i; b.classList.add('done'); read(); L.gate(ctx, Object.keys(seen).length >= P.length); c1.querySelectorAll('.m5b').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); };
      });
      right();
    }
    function right() {
      var Ht = H() - 3, e = Math.max(0, tot - nd), he = Math.max(nd > 0 ? 40 : Ht, Ht * e / tot), hn = Math.max(0, Ht - he);
      if (nd > 0 && hn < 30) { hn = 30; he = Ht - 30; }
      c2.innerHTML = '<div class="m5b eqv" style="height:' + he.toFixed(1) + 'px"><b>Equity value</b><small>목표 시가총액 ' + fmt(e) + '</small></div>' + (nd > 0 ? '<div class="m5b nd" style="height:' + hn.toFixed(1) + 'px"><b>Net Debt</b><small>순차입금 ' + fmt(nd) + '</small></div>' : '');
      host.querySelector('.vctl b').textContent = fmt(nd) + U.replace(' 원', '');
    }
    function read() {
      var ev = P.filter(function (b) { return b.g !== 'noa'; }).reduce(function (a, b) { return a + b.v; }, 0), noa = tot - ev, e = tot - nd;
      var s = '영업가치 <b>' + fmt(ev) + '</b> + 비영업가치 <b>' + fmt(noa) + '</b> − 순차입금 ' + fmt(nd) + ' = Equity value <b>' + sg(e) + '</b> ' + esc(U);
      if (sel >= 0) s = '<b>' + esc(P[sel].l) + ' ' + fmt(P[sel].v) + '</b> · ' + esc(P[sel].d || P[sel].sub || '') + '<br>' + s;
      var n = Object.keys(seen).length; if (n < P.length) s += '<br>' + n + ' / ' + P.length + ' 블록을 눌러 봤어요.';
      vr.innerHTML = s;
    }
    bindSlider(inp, sl, function () { return nd; }, function (v) { nd = v; }, function () { right(); read(); });
    L.gate(ctx, false);
    function draw() { build(); read(); }
    return { draw: draw, gated: function () { return Object.keys(seen).length < P.length; } };
  };

  // ════ m5Consol ════
  window.CUR_VIS.m5Consol = function (host, p, ctx) {
    var A = p.par, B = p.sub, U = p.unit || '조 원', own = p.own || 50, k = 'op', sl = { min: 5, max: 100, step: 1 };
    host.innerHTML = '<div class="vbt m5tg" role="group" aria-label="보는 숫자"><button type="button" data-k="op" class="on">영업이익</button><button type="button" data-k="sales">매출</button></div><svg role="img"></svg>' +
      slider('curM5own', B.l + ' 지분율', sl, own) + '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr'), inp = host.querySelector('input');
    function draw() {
      var w = L.wOf(host), a = A[k], b = B[k], top = a + b, lw = Math.min(120, w * 0.3), bw = w - lw - 48, rh = 50, o = '', X = function (v) { return lw + bw * v / top; };
      var BL = ['rgba(143,170,220,.55)', 'var(--ac)'], WM = ['rgba(232,201,160,.45)', 'var(--wm)'];
      var RR = [{ l: '모회사 별도', parts: [[a].concat(BL)] }, { l: '연결 (100%)', parts: [[a].concat(BL), [b].concat(WM)] }, { l: '모회사 주주 몫', parts: [[a].concat(BL), [b * own / 100].concat(WM)] }];
      RR.forEach(function (r, i) {
        var y = 8 + i * rh, x = 0;
        o += '<text x="0" y="' + (y + 21) + '" class="tt">' + r.l + '</text>';
        r.parts.forEach(function (pt) { o += '<rect x="' + X(x) + '" y="' + (y + 4) + '" width="' + Math.max(0, X(x + pt[0]) - X(x) - 1) + '" height="' + (rh - 22) + '" fill="' + pt[1] + '" stroke="' + pt[2] + '" style="transition:all .3s"/>'; x += pt[0]; });
        o += '<text x="' + (X(x) + 6) + '" y="' + (y + 25) + '" class="th">' + n2(x) + '</text>';
      });
      var h = 8 + 3 * rh + 20, lx2 = lw + Math.min(150, bw / 2);
      o += '<rect x="' + lw + '" y="' + (h - 14) + '" width="10" height="10" fill="' + BL[0] + '"/><text x="' + (lw + 14) + '" y="' + (h - 5) + '">' + esc(A.l) + '</text><rect x="' + lx2 + '" y="' + (h - 14) + '" width="10" height="10" fill="' + WM[0] + '"/><text x="' + (lx2 + 14) + '" y="' + (h - 5) + '">' + esc(B.l) + '</text>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + (h + 4)); svg.setAttribute('height', h + 4); svg.innerHTML = o;
      svg.setAttribute('aria-label', (k === 'op' ? '영업이익' : '매출') + ': 모회사 ' + a + ', 연결 ' + n2(a + b) + ', 모회사 주주 몫 ' + n2(a + b * own / 100) + ' ' + U);
      host.querySelector('.vctl b').textContent = own + '%';
      var nm = k === 'op' ? '영업이익' : '매출', mine = a + b * own / 100, u = U.replace(' 원', '');
      vr.innerHTML = '연결 ' + nm + ' <b>' + n2(a + b) + u + '</b> 중 ' + esc(B.l) + ' <b>' + Math.round(100 * b / (a + b)) + '%</b> · 지분 ' + own + '%만큼 따지면 모회사 주주 몫 <b>' + n2(mine) + u + '</b>, 그중 ' + esc(B.l) + ' ' + Math.round(100 * (b * own / 100) / mine) + '%';
    }
    host.querySelectorAll('.m5tg button').forEach(function (bt) { bt.onclick = function () { k = bt.getAttribute('data-k'); host.querySelectorAll('.m5tg button').forEach(function (x) { x.classList.toggle('on', x === bt); }); draw(); }; });
    bindSlider(inp, sl, function () { return own; }, function (v) { own = v; }, draw);
    L.gate(ctx, true);
    return { draw: draw, gated: function () { return false; } };
  };

  // ════ m5Rev ════
  window.CUR_VIS.m5Rev = function (host, p, ctx) {
    var Y = p.years || [], F = p.fixed || [], pr = JSON.parse(JSON.stringify(p.proj)), U = p.unit || '조 원', fc = p.focus || [Y[2]], u = U.replace(' 원', '');
    var SL = [{ key: 'units', l: '호기 수', min: 1, max: 6, step: 1, u: '기' }, { key: 'price', l: '호기당 단가', min: 0.4, max: 2.4, step: 0.1, u: '조' }, { key: 'start', l: '착공 연도', min: Y[0] - 1, max: Y[Y.length - 1], step: 1, u: '년' }, { key: 'period', l: '건설 기간', min: 3, max: 7, step: 1, u: '년' }];
    var COL = [['rgba(232,201,160,.55)', 'var(--wm)'], ['rgba(143,170,220,.55)', 'var(--ac)'], ['rgba(169,216,188,.45)', 'var(--ok)'], ['rgba(242,239,232,.14)', 'rgba(242,239,232,.5)']];
    host.innerHTML = '<svg role="img"></svg>' + SL.map(function (s, i) { return slider('curM5r' + i, pr.l + ' ' + s.l, s, pr[s.key]); }).join('') + '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr'), ins = host.querySelectorAll('input');
    function projAt(y) { return y >= pr.start && y < pr.start + pr.period ? pr.units * pr.price / pr.period : 0; }
    function yearRows(i) { var y = Y[i]; return [{ l: pr.l, v: projAt(y), m: pr.m }].concat(F.map(function (f) { return { l: f.l, v: f.v[i], m: f.m }; })); }
    function draw() {
      var w = L.wOf(host), tops = Y.map(function (y, i) { return yearRows(i).reduce(function (a, r) { return a + r.v; }, 0); }), top = Math.max.apply(null, tops.concat([10])), ih = 190, base = ih + 26, n = Y.length, gw = w / n, bw = Math.min(46, gw * 0.62), o = '';
      o += '<line class="ax" x1="0" x2="' + w + '" y1="' + base + '" y2="' + base + '"/>';
      Y.forEach(function (y, i) {
        var x = i * gw + (gw - bw) / 2, yy = base, on = fc.indexOf(y) >= 0;
        yearRows(i).forEach(function (r, j) { var hh = ih * r.v / top; if (hh > 0) o += '<rect x="' + x + '" y="' + (yy - hh) + '" width="' + bw + '" height="' + Math.max(0, hh - 1) + '" fill="' + COL[j % 4][0] + '" stroke="' + COL[j % 4][1] + '" style="transition:all .3s"/>'; yy -= hh; });
        o += '<text x="' + (x + bw / 2) + '" y="' + (yy - 6) + '" text-anchor="middle" class="' + (on ? 'th' : 'tt') + '">' + n2(tops[i]) + '</text>';
        o += '<text x="' + (x + bw / 2) + '" y="' + (base + 16) + '" text-anchor="middle" class="' + (on ? 'twm' : '') + '">' + y + '</text>';
      });
      var lg = [pr.l].concat(F.map(function (f) { return f.l; })), lx = 0, ly = base + 36;
      lg.forEach(function (t, j) { if (lx + 90 > w) { lx = 0; ly += 18; } o += '<rect x="' + lx + '" y="' + (ly - 9) + '" width="10" height="10" fill="' + COL[j % 4][0] + '" stroke="' + COL[j % 4][1] + '"/><text x="' + (lx + 14) + '" y="' + ly + '">' + esc(t) + '</text>'; lx += 30 + t.length * 13; });
      var h = ly + 8;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', Y.map(function (y, i) { return y + '년 매출 ' + n2(tops[i]) + U; }).join(', ') + ' (예시)');
      host.querySelectorAll('.vctl').forEach(function (cl, i) { var s = SL[i]; cl.querySelector('b').textContent = (s.key === 'price' ? n2(pr.price) : pr[s.key]) + s.u; });
      vr.innerHTML = fc.map(function (y) {
        var i = Y.indexOf(y), rs = yearRows(i), rev = rs.reduce(function (a, r) { return a + r.v; }, 0), gp = rs.reduce(function (a, r) { return a + r.v * r.m / 100; }, 0);
        return y + '년 매출 <b>' + n2(rev) + u + '</b> · 이익(이익률 가정) <b>' + n2(gp) + u + '</b> · ' + esc(pr.l) + ' ' + n2(projAt(y));
      }).join('<br>') + '<br>' + esc(pr.l) + ' 총 ' + n2(pr.units * pr.price) + u + '을 ' + pr.start + '~' + (pr.start + pr.period - 1) + '년에 나눠 인식 (예시)';
    }
    ins.forEach(function (inp, i) { var s = SL[i]; bindSlider(inp, s, function () { return pr[s.key]; }, function (v) { pr[s.key] = v; }, draw); });
    L.gate(ctx, true);
    return { draw: draw, gated: function () { return false; } };
  };
})();
