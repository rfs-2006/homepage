// ── M8 DCF 3 할인율·TV·검증 부품 (harness/PLUGIN.md) ─────────────
// m8Wacc : mode 'ke'  — CAPM 선(β → Ke). mode 'wacc' — Ke·세후 Kd·비중을 섞어 WACC. sl: 보여 줄 슬라이더
// m8Beta : mode 'calc' — 언레버(÷)·리레버(×) 계산기 (part 'u'면 언레버만). mode 'peers' — Peer 표에서 흔한 실수 식과 바른 식 비교 (둘 다 봐야 다음)
// m8Tv   : FCFF 현재가치 + TV 현재가치 = 영업가치, TV 비중. sl: ['W','g'] 중, alt면 'TV 해 CAPEX = 감가상각비' 버튼(눌러 봐야 다음)
// m8Grid : WACC × g 민감도 표. mode 'values'(주어진 표) | 'dcf'(FCFF로 주당가치 계산). concept: marks 버튼 / chart: 칸 고르기 → { r, c }
(function () {
  var L = window.CUR_LIB, esc = L.esc, fmt = L.fmt, clamp = L.clamp, gate = L.gate, wOf = L.wOf;
  L.addCss('cur-m8-css', [
    '.cur .m8eq{margin-bottom:8px}.cur .m8eq .eq{padding:6px 9px}.cur .m8eq .eq b{font-size:15px}',
    '.cur .m8eq .eq.no{border-color:var(--no)}.cur .m8eq .eq.no b{color:var(--no)}',
    '.cur .m8t{margin-top:10px}.cur .m8t td.up{color:var(--no);font-weight:500}.cur .m8t td.dn{color:var(--ok)}.cur .m8t tr.sum td,.cur .m8t tr.sum th{color:var(--wm);border-top:1px solid var(--hair)}',
    '.cur .m8t thead th{font-size:12px}.cur .m8t tbody th{width:30%}',
    '.cur .m8g td{cursor:pointer}.cur .m8g td.bs{outline:1px dashed var(--ac2);outline-offset:-3px}',
    '.cur .m8g td.on{outline:2px solid var(--wm);outline-offset:-2px;color:var(--wm);font-weight:600;font-family:inherit;font-size:inherit}',
    '.cur .m8g td.ok{outline:2px solid var(--ok);outline-offset:-2px;color:var(--ok);font-weight:600}.cur .m8g td.no{outline:2px solid var(--no);outline-offset:-2px;color:var(--no);font-weight:600}',
    '.cur .m8g.lk td{cursor:default}',
    '@media (max-width:420px){.cur .m8eq .eq b{font-size:13.5px}.cur .m8eq .eq{padding:5px 6px}.cur .m8t th,.cur .m8t td{font-size:12px}}'
  ].join('\n'));

  function nf(x) { return String(Math.round(x * 100) / 100); }
  function p2(x) { return (Math.round(x * 100) / 100).toFixed(2) + '%'; }
  function b2(x) { return (Math.round(x * 100) / 100).toFixed(2); }
  function p1(x) { return (Math.round(x * 1000) / 10).toFixed(1) + '%'; }
  function box(t, x, c) { return '<div class="eq ' + (c || '') + '"><small>' + t + '</small><b>' + x + '</b></div>'; }
  function op(s) { return '<i>' + s + '</i>'; }
  // 슬라이더: step="any"로 두고 JS에서 논리 간격에 맞춘다 (처음 값은 주어진 숫자 그대로)
  function slider(id, d, val) {
    return '<div class="vctl"><label for="' + id + '">' + esc(d[0]) + ' <b></b></label><input id="' + id + '" type="range" min="' + d[1] + '" max="' + d[2] + '" step="any" value="' + val + '" aria-label="' + esc(d[0]) + '"></div>';
  }
  function bind(inp, d, get, set, moved) {
    function put(x) { var v = clamp(d[1] + Math.round((x - d[1]) / d[3]) * d[3], d[1], d[2]); v = Math.round(v * 1e6) / 1e6; set(v); inp.value = get(); moved(); }
    inp.addEventListener('input', function () { put(+inp.value); });
    inp.addEventListener('keydown', function (e) {
      e.stopPropagation();
      var k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
      if (k) { e.preventDefault(); put(get() + k * d[3]); }
    });
  }
  function dcf(p, W, g, F) {
    var Wd = W / 100, gd = g / 100, n = p.fc.length, pv = p.fc.map(function (f, i) { return f / Math.pow(1 + Wd, p.t[i]); }), sum = pv.reduce(function (a, b) { return a + b; }, 0);
    var Fn = F == null ? p.fc[n - 1] * (1 + gd) : F, tv = Fn / (Wd - gd), pvtv = tv / Math.pow(1 + Wd, p.t[n - 1]), ev = sum + pvtv, eq = ev + (p.noa || 0) - (p.ibd || 0);
    return { pv: pv, sum: sum, F: Fn, tv: tv, pvtv: pvtv, ev: ev, share: pvtv / ev, eq: eq, ps: eq / p.shares * 1e6 };
  }

  // ════ m8Wacc ════
  window.CUR_VIS.m8Wacc = function (host, p, ctx) {
    var KE = p.mode === 'ke';
    var v = { rf: p.rf, beta: p.beta, erp: p.erp, crp: p.crp || 0, kd: p.kd || 0, t: p.t || 0, dw: p.dw != null ? p.dw : (p.D != null ? 100 * p.D / (p.D + p.E) : 0) };
    var v0 = JSON.parse(JSON.stringify(v));
    var DEF = { rf: ['Rf', 0, 8, 0.05, '%'], beta: ['베타 β', 0.2, 2.2, 0.01, ''], erp: ['ERP', 3, 12, 0.1, '%'], crp: ['국가위험', 0, 5, 0.5, '%'], kd: ['세전 Kd', 0, 10, 0.05, '%'], t: ['세율 t', 0, 40, 0.5, '%'], dw: ['빚 비중 D/(D+E)', 0, 80, 0.5, '%'] };
    var SL = (p.sl || ['beta']).filter(function (k) { return DEF[k]; });
    host.innerHTML = '<div class="m8eq" aria-live="polite"></div><svg role="img"></svg>' + SL.map(function (k) { return slider('curM8w' + k, DEF[k], v[k]); }).join('') +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eqh = host.querySelector('.m8eq'), vr = host.querySelector('.vr');
    function calc(s) { var ke = s.rf + s.beta * s.erp + s.crp + (p.size || 0) + (p.spec || 0), kda = s.kd * (1 - s.t / 100), wd = s.dw / 100; return { ke: ke, kda: kda, wd: wd, w: (1 - wd) * ke + wd * kda }; }
    function draw() {
      var c = calc(v), c0 = calc(v0), w = wOf(host), o = '';
      host.querySelectorAll('.vctl').forEach(function (cl, i) { var k = SL[i]; cl.querySelector('b').textContent = (k === 'beta' ? b2(v[k]) : nf(v[k])) + DEF[k][4]; });
      var r1 = '<div class="eqs">' + box('Rf', nf(v.rf) + '%') + op('+') + box('베타', b2(v.beta), 'wm') + op('×') + box('ERP', nf(v.erp) + '%') + (v.crp ? op('+') + box('국가위험', nf(v.crp) + '%') : '') + op('=') + box('Ke', p2(c.ke), KE ? 'ac' : 'hl') + '</div>';
      if (KE) eqh.innerHTML = r1;
      else eqh.innerHTML = r1 + '<div class="eqs">' + box('세전 Kd', nf(v.kd) + '%') + op('×') + box('(1 − t)', nf(100 - v.t) + '%') + op('=') + box('세후 Kd', p2(c.kda), 'hl') + '</div>' +
          '<div class="eqs">' + box('E/(D+E)', nf(100 - v.dw) + '%') + op('×') + box('Ke', p2(c.ke)) + op('+') + box('D/(D+E)', nf(v.dw) + '%') + op('×') + box('세후 Kd', p2(c.kda)) + op('=') + box('WACC', p2(c.w), 'ac') + '</div>';
      if (KE) {
        var h = 200, m = { l: 34, r: 12, t: 14, b: 30 }, iw = w - m.l - m.r, ih = h - m.t - m.b, XM = 2.2, YM = Math.max(20, v.rf + v.crp + XM * v.erp) * 1.05;
        var X = function (b) { return m.l + iw * b / XM; }, Y = function (k) { return m.t + ih * (1 - k / YM); };
        for (var gy = 0; gy <= YM; gy += 5) o += '<line class="gl" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(gy) + '" y2="' + Y(gy) + '"/><text x="' + (m.l - 6) + '" y="' + (Y(gy) + 4) + '" text-anchor="end">' + gy + '%</text>';
        [0, 0.5, 1, 1.5, 2].forEach(function (b) { o += '<text x="' + X(b) + '" y="' + (h - 10) + '" text-anchor="middle">' + b + '</text>'; });
        o += '<line class="ax" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
        o += '<line x1="' + X(1) + '" x2="' + X(1) + '" y1="' + m.t + '" y2="' + Y(0) + '" stroke="rgba(242,239,232,.3)" stroke-dasharray="3 4"/><text x="' + (X(1) + 4) + '" y="' + (m.t + 10) + '" class="tt">시장 β = 1</text>';
        o += '<line x1="' + X(0) + '" x2="' + X(XM) + '" y1="' + Y(v.rf + v.crp) + '" y2="' + Y(v.rf + v.crp + XM * v.erp) + '" stroke="var(--ac)" stroke-width="2"/>';
        o += '<line x1="' + m.l + '" x2="' + X(v.beta) + '" y1="' + Y(c.ke) + '" y2="' + Y(c.ke) + '" stroke="var(--wm)" stroke-dasharray="4 4"/><line x1="' + X(v.beta) + '" x2="' + X(v.beta) + '" y1="' + Y(c.ke) + '" y2="' + Y(0) + '" stroke="var(--wm)" stroke-dasharray="4 4"/>';
        o += '<circle cx="' + X(v.beta) + '" cy="' + Y(c.ke) + '" r="6" fill="var(--wm)"/><text x="' + clamp(X(v.beta) + (v.beta > 1.6 ? -8 : 8), 40, w - 20) + '" y="' + (Y(c.ke) - 10) + '" text-anchor="' + (v.beta > 1.6 ? 'end' : 'start') + '" class="twm">Ke ' + p2(c.ke) + '</text>';
        o += '<text x="' + (X(0) + 4) + '" y="' + (Y(v.rf + v.crp) + 16) + '" class="tt">Rf ' + nf(v.rf) + '%</text><text x="' + (w - m.r) + '" y="' + (Y(0) - 6) + '" text-anchor="end" class="tt">β →</text>';
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
        svg.setAttribute('aria-label', 'CAPM 선: 베타 ' + b2(v.beta) + '일 때 Ke ' + p2(c.ke));
        vr.innerHTML = (p.name ? esc(p.name) + ' · ' : '') + '베타 <b>' + b2(v.beta) + '</b> → Ke <b>' + p2(c.ke) + '</b>' + (Math.abs(c.ke - c0.ke) > 0.004 ? ' (처음 ' + p2(c0.ke) + ')' : '') + '. 베타가 0.1 오르면 Ke가 ERP의 10분의 1(' + nf(v.erp / 10) + '%p)만큼 올라요.';
        return;
      }
      var hh = 148, lw = 64, rw = 62, bw = w - lw - rw, top = Math.max(16, c.ke, c.kda) * 1.02, S = function (x) { return bw * Math.max(0, x) / top; }, rows = [['Ke', c.ke, 'rgba(143,170,220,.55)'], ['세후 Kd', c.kda, 'rgba(242,239,232,.22)']];
      rows.forEach(function (r, i) { var y = 12 + i * 42; o += '<text x="0" y="' + (y + 17) + '" class="tt">' + r[0] + '</text><rect x="' + lw + '" y="' + y + '" width="' + S(r[1]) + '" height="24" fill="' + r[2] + '" style="transition:width .3s"/><text x="' + (lw + S(r[1]) + 6) + '" y="' + (y + 17) + '" class="tt">' + p2(r[1]) + '</text>'; });
      var y3 = 96, ce = (1 - c.wd) * c.ke, cd = c.wd * c.kda;
      o += '<text x="0" y="' + (y3 + 17) + '" class="th">WACC</text><rect x="' + lw + '" y="' + y3 + '" width="' + S(ce) + '" height="24" fill="rgba(232,201,160,.6)" stroke="var(--wm)" style="transition:width .3s"/><rect x="' + (lw + S(ce)) + '" y="' + y3 + '" width="' + S(cd) + '" height="24" fill="rgba(242,239,232,.28)" stroke="rgba(242,239,232,.5)" style="transition:all .3s"/>';
      o += '<text x="' + (lw + S(c.w) + 6) + '" y="' + (y3 + 17) + '" class="twm">' + p2(c.w) + '</text><text x="' + lw + '" y="' + (hh - 4) + '" class="tt">자기자본 몫 ' + p2(ce) + ' + 빚 몫 ' + p2(cd) + '</text>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + hh); svg.setAttribute('height', hh); svg.innerHTML = o;
      svg.setAttribute('aria-label', 'Ke ' + p2(c.ke) + ', 세후 Kd ' + p2(c.kda) + ', WACC ' + p2(c.w));
      vr.innerHTML = (p.name ? esc(p.name) + ' · ' : '') + 'Ke <b>' + p2(c.ke) + '</b> · 세후 Kd <b>' + p2(c.kda) + '</b> · WACC <b>' + p2(c.w) + '</b>' + (Math.abs(c.w - c0.w) > 0.004 ? ' (처음 ' + p2(c0.w) + ', ' + (c.w > c0.w ? '+' : '−') + nf(Math.abs(c.w - c0.w)) + '%p)' : '');
    }
    SL.forEach(function (k) { bind(host.querySelector('#curM8w' + k), DEF[k], function () { return v[k]; }, function (x) { v[k] = x; }, draw); });
    return { draw: draw };
  };

  // ════ m8Beta ════
  window.CUR_VIS.m8Beta = function (host, p, ctx) {
    if (p.mode === 'peers') return peers(host, p, ctx);
    var v = { bl: p.bl, de: p.de, t: p.t, tde: p.tde }, U = p.part === 'u';
    var DEF = { bl: ['관측 베타 βL', 0.3, 2.5, 0.01, ''], de: ['Peer D/E', 0, 300, 0.5, '%'], t: ['세율 t', 0, 40, 0.5, '%'], tde: ['목표 D/E', 0, 300, 0.5, '%'] };
    var SL = (p.sl || ['bl', 'de', 't', 'tde']).filter(function (k) { return DEF[k]; });
    host.innerHTML = '<div class="m8eq" aria-live="polite"></div><svg role="img"></svg>' + SL.map(function (k) { return slider('curM8b' + k, DEF[k], v[k]); }).join('') + '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eqh = host.querySelector('.m8eq'), vr = host.querySelector('.vr');
    function draw() {
      var f = 1 + (1 - v.t / 100) * v.de / 100, bu = v.bl / f, ft = 1 + (1 - v.t / 100) * v.tde / 100, br = bu * ft, w = wOf(host), h = 190, o = '';
      host.querySelectorAll('.vctl').forEach(function (cl, i) { var k = SL[i]; cl.querySelector('b').textContent = (k === 'bl' ? b2(v[k]) : nf(v[k])) + DEF[k][4]; });
      eqh.innerHTML = '<div class="eqs">' + box('βL', b2(v.bl)) + op('÷') + box('1 + (1 − t) × D/E', f.toFixed(3)) + op('=') + box('βU (언레버)', b2(bu), U ? 'ac' : 'hl') + '</div>' + (U ? '' :
        '<div class="eqs">' + box('βU', b2(bu)) + op('×') + box('1 + (1 − t) × 목표 D/E', ft.toFixed(3)) + op('=') + box('목표 β (리레버)', b2(br), 'ac') + '</div>');
      var n = U ? 2 : 3, top = Math.max(2, v.bl, U ? 0 : br) * 1.12, base = h - 26, sc = (base - 18) / top, bw = Math.min(84, (w - 20) / n - 22), gap = (w - bw * n) / (n - 1);
      var B = [['관측 βL', v.bl, 'rgba(242,239,232,.2)', 'rgba(242,239,232,.5)'], ['언레버 βU', bu, 'rgba(143,170,220,.5)', 'var(--ac)'], ['목표 β', br, 'rgba(232,201,160,.55)', 'var(--wm)']].slice(0, n);
      o += '<line class="ax" x1="0" x2="' + w + '" y1="' + base + '" y2="' + base + '"/><line x1="0" x2="' + w + '" y1="' + (base - sc) + '" y2="' + (base - sc) + '" stroke="rgba(242,239,232,.3)" stroke-dasharray="3 4"/><text x="' + (w - 2) + '" y="' + (base - sc - 4) + '" text-anchor="end" class="tt">β = 1</text>';
      B.forEach(function (b, i) { var x = i * (bw + gap); o += '<rect x="' + x + '" y="' + (base - b[1] * sc) + '" width="' + bw + '" height="' + b[1] * sc + '" fill="' + b[2] + '" stroke="' + b[3] + '" style="transition:all .3s"/><text x="' + (x + bw / 2) + '" y="' + (base - b[1] * sc - 6) + '" text-anchor="middle" class="th">' + b2(b[1]) + '</text><text x="' + (x + bw / 2) + '" y="' + (h - 8) + '" text-anchor="middle">' + b[0] + '</text>'; });
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', '관측 베타 ' + b2(v.bl) + ', 언레버 ' + b2(bu) + (U ? '' : ', 목표 ' + b2(br)));
      vr.innerHTML = (p.name ? esc(p.name) + ' · ' : '') + (U ? 'D/E ' + nf(v.de) + '%의 빚 효과를 빼면 βL ' + b2(v.bl) + ' → βU <b>' + b2(bu) + '</b>' + (v.de > 0 ? '. 빚이 늘수록 βU는 βL보다 더 작아져요.' : '. 빚이 없으면 βU = βL이에요.')
        : 'βU ' + b2(bu) + '에 목표 D/E ' + nf(v.tde) + '%만큼 빚 위험을 다시 얹으면 <b>' + b2(br) + '</b>. 목표 빚이 많을수록 목표 베타가 커져요.');
    }
    SL.forEach(function (k) { bind(host.querySelector('#curM8b' + k), DEF[k], function () { return v[k]; }, function (x) { v[k] = x; }, draw); });
    return { draw: draw };
  };
  function peers(host, p, ctx) {
    var P = p.peers || [], t = (p.t || 0) / 100, ft = 1 + (1 - t) * p.tde / 100, seen = {}, cur = null;
    host.innerHTML = '<div class="m8eq" aria-live="polite"></div><div class="frw"><table class="frt m8t"><thead><tr><th scope="col">Peer</th><th scope="col">βL</th><th scope="col">D/E</th><th scope="col">언레버 칸</th><th scope="col">리레버 칸</th></tr></thead><tbody></tbody></table></div>' +
      '<div class="vbt" role="group" aria-label="식 고르기"><button type="button" class="vgo" data-m="orig">흔한 실수 식</button><button type="button" class="vgo" data-m="fix">바른 식</button></div><p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var tb = host.querySelector('tbody'), eqh = host.querySelector('.m8eq'), vr = host.querySelector('.vr');
    function rows(m) {
      return P.map(function (r) { var f = 1 + (1 - t) * r.de / 100, u = m === 'orig' ? r.bl * f : r.bl / f, rl = m === 'orig' ? u / ft : u * ft; return { n: r.n, bl: r.bl, de: r.de, u: u, rl: rl }; });
    }
    function draw() {
      if (!cur) {
        tb.innerHTML = P.map(function (r) { return '<tr><th scope="row">' + esc(r.n) + '</th><td>' + b2(r.bl) + '</td><td>' + nf(r.de) + '%</td><td>?</td><td>?</td></tr>'; }).join('');
        eqh.innerHTML = '<div class="eqs">' + box('목표 D/E (Peer 평균)', nf(p.tde) + '%') + box('세율', nf(p.t) + '%') + '</div>';
        vr.textContent = '두 버튼을 차례로 눌러 언레버 칸과 목표 베타를 견줘 보세요.';
        return;
      }
      var R = rows(cur), au = R.reduce(function (a, r) { return a + r.u; }, 0) / R.length, tgt = cur === 'orig' ? R.reduce(function (a, r) { return a + r.rl; }, 0) / R.length : au * ft;
      tb.innerHTML = R.map(function (r) { return '<tr><th scope="row">' + esc(r.n) + '</th><td>' + b2(r.bl) + '</td><td>' + nf(r.de) + '%</td><td class="' + (r.u > r.bl + 1e-9 ? 'up' : 'dn') + '">' + b2(r.u) + '</td><td>' + b2(r.rl) + '</td></tr>'; }).join('') +
        '<tr class="sum"><th scope="row">평균 → 목표 β</th><td></td><td></td><td>' + b2(au) + '</td><td>' + b2(tgt) + '</td></tr>';
      eqh.innerHTML = cur === 'orig'
        ? '<div class="eqs">' + box('실수: 언레버 칸', 'βL × (1 + (1 − t) × D/E)', 'no') + box('실수: 리레버 칸', '÷ (1 + (1 − t) × 목표 D/E)', 'no') + '</div>'
        : '<div class="eqs">' + box('언레버', 'βL ÷ (1 + (1 − t) × D/E)', 'hl') + box('리레버', '평균 βU × (1 + (1 − t) × 목표 D/E)', 'ac') + '</div>';
      var up = R.filter(function (r) { return r.u > r.bl + 1e-9; });
      vr.innerHTML = cur === 'orig' ? '실수한 식: 언레버 칸이 관측 베타보다 커요(' + up.map(function (r) { return esc(r.n) + ' ' + b2(r.bl) + ' → ' + b2(r.u); }).join(', ') + '). 목표 베타 <b>' + b2(tgt) + '</b>.'
        : '바른 식: 언레버 평균 <b>' + b2(au) + '</b>, 목표 D/E ' + nf(p.tde) + '%로 다시 얹으면 <b>' + b2(tgt) + '</b>.';
    }
    host.querySelectorAll('.vgo').forEach(function (b) {
      b.onclick = function () {
        cur = b.getAttribute('data-m'); seen[cur] = 1; b.classList.add('done');
        host.querySelectorAll('.vgo').forEach(function (x) { x.classList.toggle('on', x === b); });
        draw(); gate(ctx, seen.orig && seen.fix);
      };
    });
    gate(ctx, false); draw();
    return { draw: function () {}, gated: function () { return !(seen.orig && seen.fix); } };
  }

  // ════ m8Tv ════
  window.CUR_VIS.m8Tv = function (host, p, ctx) {
    var v = { W: p.wacc, g: p.g }, alt = false, seen = !p.alt, n = p.fc.length, v0 = { W: p.wacc, g: p.g };
    var DEF = { W: ['WACC', 5, 12, 0.05, '%'], g: ['영구성장률 g', 0, 3, 0.1, '%'] }, TS = (p.sl || ['W', 'g']).filter(function (k) { return DEF[k]; });
    host.innerHTML = '<div class="m8eq" aria-live="polite"></div><svg role="img"></svg>' + TS.map(function (k) { return slider('curM8t' + k, DEF[k], v[k]); }).join('') +
      (p.alt ? '<div class="vbt"><button type="button" class="vgo" aria-pressed="false">' + esc(p.alt.label) + '</button></div>' : '') +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eqh = host.querySelector('.m8eq'), vr = host.querySelector('.vr'), U = p.unit || '';
    function calc(s, a) { return dcf(p, s.W, s.g, a ? p.alt.b * (1 + s.g / 100) : null); }
    function draw() {
      if (v.g > v.W - 0.5) v.g = Math.round((v.W - 0.5) * 10) / 10;
      TS.forEach(function (k) { var e = host.querySelector('#curM8t' + k); e.value = v[k]; e.parentNode.querySelector('b').textContent = k === 'W' ? p2(v.W) : nf(v.g) + '%'; });
      var c = calc(v, alt), c0 = calc(v0, false), w = wOf(host), h = 236, o = '';
      eqh.innerHTML = '<div class="eqs">' + box('FCFF ' + (p.next || 'n+1'), fmt(c.F)) + op('÷') + box('WACC − g', p2(v.W - v.g)) + op('=') + box('TV', fmt(c.tv), 'wm') + '</div>' +
        '<div class="eqs">' + box('FCFF 현재가치 합', fmt(c.sum)) + op('+') + box('TV 현재가치', fmt(c.pvtv), 'hl') + op('=') + box('영업가치', fmt(c.ev), 'ac') + '</div>';
      var sh = c.share, x1 = w * (1 - sh);
      o += '<rect x="0" y="4" width="' + x1 + '" height="26" fill="rgba(143,170,220,.5)" stroke="var(--ac)" style="transition:width .3s"/><rect x="' + x1 + '" y="4" width="' + (w - x1) + '" height="26" fill="rgba(232,201,160,.5)" stroke="var(--wm)" style="transition:all .3s"/>';
      o += '<text x="4" y="' + (x1 > 120 ? 22 : 46) + '" class="tt">예측기간 ' + p1(1 - sh) + '</text><text x="' + (w - 4) + '" y="22" text-anchor="end" class="th">TV ' + p1(sh) + '</text>';
      var base = h - 22, topY = 58, sc = (base - topY - 16) / Math.max(c.pvtv, 1), k = n + 1, bw = Math.min(64, (w - 8) / k - 8), gap = (w - bw * k) / (k - 1);
      o += '<line class="ax" x1="0" x2="' + w + '" y1="' + base + '" y2="' + base + '"/>';
      for (var i = 0; i <= n; i++) {
        var val = i < n ? c.pv[i] : c.pvtv, x = i * (bw + gap), hgt = Math.max(1, Math.abs(val) * sc), tv = i === n;
        o += '<rect x="' + x + '" y="' + (val >= 0 ? base - hgt : base) + '" width="' + bw + '" height="' + hgt + '" fill="' + (tv ? 'rgba(232,201,160,.55)' : 'rgba(143,170,220,.5)') + '" stroke="' + (tv ? 'var(--wm)' : 'var(--ac)') + '" style="transition:all .3s"/>';
        o += '<text x="' + (x + bw / 2) + '" y="' + (base - hgt - 5) + '" text-anchor="middle" class="' + (tv ? 'twm' : 'tt') + '" style="font-size:10.5px">' + fmt(val) + '</text>';
        o += '<text x="' + (x + bw / 2) + '" y="' + (h - 6) + '" text-anchor="middle" style="font-size:11px">' + esc(tv ? 'TV' : (p.labels || [])[i] || '') + '</text>';
      }
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', '영업가치 ' + fmt(c.ev) + ' ' + U + ' 중 TV 현재가치 ' + fmt(c.pvtv) + ', 비중 ' + p1(sh));
      var moved = Math.abs(c.ev - c0.ev) > 0.5;
      vr.innerHTML = (p.name ? esc(p.name) + ' · ' : '') + 'TV 비중 <b>' + p1(sh) + '</b> · 영업가치 <b>' + fmt(c.ev) + '</b> ' + esc(U) + (p.shares ? ' · 주당가치 <b>' + fmt(c.ps) + '원</b>' : '') +
        (moved ? '<br>처음(WACC ' + p2(v0.W) + ', g ' + nf(v0.g) + '%) 대비 영업가치 ' + L.pc(c.ev / c0.ev - 1) + (alt ? ', TV 해 CAPEX = 감가상각비' : '') : '');
    }
    TS.forEach(function (k) { bind(host.querySelector('#curM8t' + k), DEF[k], function () { return v[k]; }, function (x) { v[k] = x; }, draw); });
    var bt = host.querySelector('.vgo');
    if (bt) bt.onclick = function () { alt = !alt; seen = true; bt.classList.add('done'); bt.classList.toggle('on', alt); bt.setAttribute('aria-pressed', alt); draw(); gate(ctx, true); };
    gate(ctx, seen);
    return { draw: draw, gated: function () { return !seen; } };
  };

  // ════ m8Grid ════
  window.CUR_VIS.m8Grid = function (host, p, ctx) {
    var Q = ctx.mode === 'question', ans = ctx.answer || {}, vals, rl, cl, sel = null, locked = false, seen = {}, M = p.marks || [];
    if (p.mode === 'dcf') {
      vals = p.rws.map(function (w) { return p.cls.map(function (g) { return dcf(p, w, g).ps; }); });
      rl = p.rws.map(function (x) { return p2(x); }); cl = p.cls.map(function (x) { return x.toFixed(1) + '%'; });
    } else { vals = p.vals; rl = p.rows; cl = p.cols; }
    var all = [].concat.apply([], vals), mn = Math.min.apply(null, all), mx = Math.max.apply(null, all), U = p.unit || '', B = p.base || [-1, -1];
    host.innerHTML = '<div class="frw"><table class="pdt m8g"><thead><tr><th scope="col">' + esc(p.rlab || 'WACC') + '＼' + esc(p.clab || 'g') + '</th>' + cl.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      vals.map(function (row, i) {
        return '<tr><th scope="row">' + esc(rl[i]) + '</th>' + row.map(function (x, j) { var a = (x - mn) / ((mx - mn) || 1); return '<td data-r="' + i + '" data-c="' + j + '" class="' + (i === B[0] && j === B[1] ? 'bs' : '') + '" style="background:rgba(143,170,220,' + (0.06 + a * 0.42).toFixed(2) + ')" tabindex="0">' + fmt(x) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>' +
      (M.length && !Q ? '<div class="vbt" role="group" aria-label="칸 찾기">' + M.map(function (m, i) { return '<button type="button" class="vgo" data-k="' + i + '">' + esc(m.k) + '</button>'; }).join('') + '</div>' : '') +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var vr = host.querySelector('.vr'), tbl = host.querySelector('.m8g');
    function td(r, c) { return host.querySelector('.m8g td[data-r="' + r + '"][data-c="' + c + '"]'); }
    function read(r, c) { return esc(p.rlab || 'WACC') + ' ' + esc(rl[r]) + ', g ' + esc(cl[c]) + ' → <b>' + fmt(vals[r][c]) + '</b> ' + esc(U); }
    function mark(r, c) { host.querySelectorAll('.m8g td.on').forEach(function (x) { x.classList.remove('on'); }); var e = td(r, c); if (e) e.classList.add('on'); }
    vr.innerHTML = Q ? esc(p.ask || '칸을 하나 누르세요.') : (B[0] >= 0 ? '기준 칸(점선) ' + read(B[0], B[1]) + '. ' : '') + (M.length ? '버튼을 눌러 칸을 찾아보세요.' : '칸을 눌러 읽어 보세요.');
    function pick(r, c) {
      if (locked) return;
      if (Q) { sel = { r: r, c: c }; mark(r, c); vr.innerHTML = '고른 칸: ' + read(r, c); ctx.ready(true); return; }
      mark(r, c); vr.innerHTML = read(r, c) + (B[0] >= 0 && (r !== B[0] || c !== B[1]) ? ' (기준 ' + fmt(vals[B[0]][B[1]]) + ' 대비 ' + L.pc(vals[r][c] / vals[B[0]][B[1]] - 1) + ')' : '');
    }
    host.querySelectorAll('.m8g td').forEach(function (e) {
      var r = +e.getAttribute('data-r'), c = +e.getAttribute('data-c');
      e.onclick = function () { pick(r, c); };
      e.onkeydown = function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); pick(r, c); } };
    });
    host.querySelectorAll('.vbt .vgo').forEach(function (b) {
      b.onclick = function () { var i = +b.getAttribute('data-k'), m = M[i]; seen[i] = 1; b.classList.add('done'); host.querySelectorAll('.vbt .vgo').forEach(function (x) { x.classList.toggle('on', x === b); }); mark(m.r, m.c); vr.innerHTML = '<b>' + esc(m.k) + '</b> · ' + esc(m.d || ''); gate(ctx, Object.keys(seen).length >= M.length); };
    });
    if (!Q) gate(ctx, !M.length);
    if (Q) host.__solve = function (right) {
      var r = ans.r, c = ans.c;
      if (!right) { c = (ans.c + 1) % cl.length; if (r === B[0] && c === B[1]) c = (c + 1) % cl.length; }
      pick(r, c);
    };
    return {
      draw: function () {},
      check: function () { var right = !!sel && sel.r === ans.r && sel.c === ans.c; return { right: right, detail: sel ? '고른 칸: ' + rl[sel.r] + ', ' + cl[sel.c] + ' → ' + fmt(vals[sel.r][sel.c]) + ' ' + U + '.' : '' }; },
      reveal: function (right, showAns) {
        locked = true; tbl.classList.add('lk');
        if (sel) { var e = td(sel.r, sel.c); e.classList.remove('on'); e.classList.add(right ? 'ok' : 'no'); }
        if (showAns && !right) { var a = td(ans.r, ans.c); if (a) a.classList.add('ok'); vr.innerHTML = '정답 칸: ' + read(ans.r, ans.c); }
      }
    };
  };
})();
