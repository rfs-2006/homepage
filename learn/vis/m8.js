// ── M8 DCF 3 할인율·TV·검증 부품 (harness/PLUGIN.md) ─────────────
// m8Wacc : mode 'ke'  — CAPM 선(β → Ke). mode 'wacc' — Ke·세후 Kd·비중을 섞어 WACC. sl: 보여 줄 슬라이더
// m8Beta : mode 'calc' — 언레버(÷)·리레버(×) 계산기 (part 'u'면 언레버만). mode 'peers' — Peer 표에서 흔한 실수 식과 바른 식 비교 (둘 다 봐야 다음)
// m8Tv   : FCFF 현재가치 + TV 현재가치 = 영업가치, TV 비중. sl: ['W','g'] 중, alt면 'TV 해 CAPEX = 감가상각비' 버튼(눌러 봐야 다음)
// m8Grid : WACC × g 민감도 표. mode 'values'(주어진 표) | 'dcf'(FCFF로 주당가치 계산). concept: marks 버튼 / chart: 칸 고르기 → { r, c }
// 개념 그림: m8Pv(할인 슬라이더) · m8Bridge(주당가치 다리) · m8Ledger(T자 장부, 돈을 댄 두 쪽) · m8Lever(빚 효과 벗기고 다시 얹기) · m8Tail(예측 기간 뒤 TV)
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
        vr.innerHTML = '베타 <b>' + b2(v.beta) + '</b> → Ke <b>' + p2(c.ke) + '</b>' + (Math.abs(c.ke - c0.ke) > 0.004 ? ' (처음 ' + p2(c0.ke) + ')' : '') + '. 베타가 0.1 오르면 Ke가 ERP의 10분의 1(' + nf(v.erp / 10) + '%p)만큼 올라요.';
        return;
      }
      var hh = 148, lw = 64, rw = 62, bw = w - lw - rw, top = Math.max(16, c.ke, c.kda) * 1.02, S = function (x) { return bw * Math.max(0, x) / top; }, rows = [['Ke', c.ke, 'rgba(143,170,220,.55)'], ['세후 Kd', c.kda, 'rgba(242,239,232,.22)']];
      rows.forEach(function (r, i) { var y = 12 + i * 42; o += '<text x="0" y="' + (y + 17) + '" class="tt">' + r[0] + '</text><rect x="' + lw + '" y="' + y + '" width="' + S(r[1]) + '" height="24" fill="' + r[2] + '" style="transition:width .3s"/><text x="' + (lw + S(r[1]) + 6) + '" y="' + (y + 17) + '" class="tt">' + p2(r[1]) + '</text>'; });
      var y3 = 96, ce = (1 - c.wd) * c.ke, cd = c.wd * c.kda;
      o += '<text x="0" y="' + (y3 + 17) + '" class="th">WACC</text><rect x="' + lw + '" y="' + y3 + '" width="' + S(ce) + '" height="24" fill="rgba(232,201,160,.6)" stroke="var(--wm)" style="transition:width .3s"/><rect x="' + (lw + S(ce)) + '" y="' + y3 + '" width="' + S(cd) + '" height="24" fill="rgba(242,239,232,.28)" stroke="rgba(242,239,232,.5)" style="transition:all .3s"/>';
      o += '<text x="' + (lw + S(c.w) + 6) + '" y="' + (y3 + 17) + '" class="twm">' + p2(c.w) + '</text><text x="' + lw + '" y="' + (hh - 4) + '" class="tt">자기자본 몫 ' + p2(ce) + ' + 빚 몫 ' + p2(cd) + '</text>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + hh); svg.setAttribute('height', hh); svg.innerHTML = o;
      svg.setAttribute('aria-label', 'Ke ' + p2(c.ke) + ', 세후 Kd ' + p2(c.kda) + ', WACC ' + p2(c.w));
      vr.innerHTML = 'Ke <b>' + p2(c.ke) + '</b>, 세후 Kd <b>' + p2(c.kda) + '</b>, WACC <b>' + p2(c.w) + '</b>' + (Math.abs(c.w - c0.w) > 0.004 ? ' (처음 ' + p2(c0.w) + ', ' + (c.w > c0.w ? '+' : '−') + nf(Math.abs(c.w - c0.w)) + '%p)' : '');
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
      vr.innerHTML = (U ? 'D/E ' + nf(v.de) + '%의 빚 효과를 빼면 βL ' + b2(v.bl) + ' → βU <b>' + b2(bu) + '</b>' + (v.de > 0 ? '. 빚이 늘수록 βU는 βL보다 더 작아져요.' : '. 빚이 없으면 βU = βL이에요.')
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
      vr.innerHTML = 'TV 비중 <b>' + p1(sh) + '</b>, 영업가치 <b>' + fmt(c.ev) + '</b> ' + esc(U) + (p.shares ? ', 주당가치 <b>' + fmt(c.ps) + '원</b>' : '') +
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
      b.onclick = function () { var i = +b.getAttribute('data-k'), m = M[i]; seen[i] = 1; b.classList.add('done'); host.querySelectorAll('.vbt .vgo').forEach(function (x) { x.classList.toggle('on', x === b); }); mark(m.r, m.c); vr.innerHTML = '<b>' + esc(m.k) + '</b> ' + esc(m.d || ''); gate(ctx, Object.keys(seen).length >= M.length); };
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
  // ════ 개념 그림: m8Pv(할인, 슬라이더) · m8Bridge(주당가치 다리) · m8Ledger(돈을 댄 두 쪽) · m8Lever(빚 효과 벗기고 다시 얹기) · m8Tail(예측 기간 뒤 TV) ════
  // 박스 나열 대신 비례 막대 + 그림 옆 직접 주석. 강조색은 금색 하나(화면 핵심 한 곳), 나머지는 옅은 남색과 흰 선. 폭은 실제 px(wOf)로 그려 글씨 크기가 폰에서도 그대로
  if (!document.getElementById('cur-plex')) {
    var lk = document.createElement('link'); lk.id = 'cur-plex'; lk.rel = 'stylesheet';
    lk.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&display=swap'; document.head.appendChild(lk);
  }
  L.addCss('cur-m8v-css', [
    '.cur .vis svg.m8v text{font-family:"IBM Plex Sans","RFS Dotum UI",sans-serif;font-variant-numeric:tabular-nums;fill:#F2EFE8;font-size:13px}',
    '.cur .vis svg.m8v text.s,.cur .vis svg.m8v tspan.s{font-size:12px;fill:rgba(242,239,232,.74)}',
    '.cur .vis svg.m8v text.md{font-family:"Noto Serif KR",serif;font-size:17px;font-weight:600}',
    '.cur .vis svg.m8v text.big{font-family:"Noto Serif KR",serif;font-size:22px;font-weight:600}',
    '.cur .vis svg.m8v text.dk{fill:#0D1829;font-weight:500}',
    '.cur .vis svg.m8v .mv{transition:all .25s var(--e)}'
  ].join('\n'));
  var GOLD = '#E2C48F', NAVY = '#1C2C48', EDGE = 'rgba(242,239,232,.28)', FAINT = 'rgba(242,239,232,.35)';
  function r1(x) { return Math.round(x * 10) / 10; }
  function T(x, y, s, cls, anc) { return '<text x="' + r1(x) + '" y="' + r1(y) + '"' + (cls ? ' class="' + cls + '"' : '') + (anc ? ' text-anchor="' + anc + '"' : '') + '>' + s + '</text>'; }
  function RC(x, y, w, h, fill, stroke, ex) { return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(Math.max(0, w)) + '" height="' + r1(Math.max(0, h)) + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '"' : '') + (ex || '') + '/>'; }
  function LN(x1, y1, x2, y2, c, ex) { return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '" stroke="' + c + '"' + (ex || '') + '/>'; }
  // 글자 폭 어림: 한글은 글자 크기만큼, 숫자·영문은 0.58배
  function tw(s, z) { var n = 0; String(s).replace(/<[^>]+>/g, '').split('').forEach(function (ch) { n += /[가-힣]/.test(ch) ? 1 : ch === ' ' ? 0.3 : 0.58; }); return n * (z || 13); }
  function fit(x, s, z, w) { return Math.max(0, Math.min(x, w - tw(s, z) - 2)); }
  // 넓은 화면에서 그림이 벌어지지 않게 폭 상한(WMAX)을 두고 왼쪽에 붙인다
  function put(svg, w, h, o, label) { svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.style.maxWidth = w + 'px'; svg.innerHTML = o; svg.setAttribute('aria-label', label); }
  function W(host, mx) { return Math.min(wOf(host), mx); }
  // '이름 = 뜻': 이름은 흰 글씨, '= 뜻'은 옅은 글씨
  function nm(s) { var i = String(s).indexOf(' = '); return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<tspan class="s">' + esc(s.slice(i)) + '</tspan>'; }
  function capHtml(p) { return p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : ''; }

  // ── m8Pv: 1년 뒤 받을 돈 → 할인율로 나눠 지금 값. 할인율 슬라이더 (map_what) ──
  window.CUR_VIS.m8Pv = function (host, p, ctx) {
    var fv = p.fv || 110, U = p.unit || '만 원', D = ['할인율', 0, p.rmax || 20, 1, '%'], v = { r: p.r != null ? p.r : 10 };
    host.innerHTML = '<div style="max-width:480px"><svg class="m8v" role="img"></svg>' + slider('curM8pv', D, v.r) + '<p class="vr" aria-live="polite"></p>' + capHtml(p) + '</div>';
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr');
    function num(x) { return (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, ''); }
    function draw() {
      host.querySelector('.vctl b').textContent = v.r + '%';
      var r = v.r, pv = fv / (1 + r / 100), w = W(host, 480), h = 290, base = h - 34, fH = 168, k = fH / fv, bw = Math.min(88, Math.round(w * 0.2));
      var xl = 2, xr = w - bw - 2, yF = base - fH, yP = base - pv * k, mx = (xl + bw + xr) / 2, o = '';
      o += LN(0, base, w, base, 'rgba(242,239,232,.18)');
      // 1년 뒤 받을 돈 (남색) · 지금 값 (금색)
      o += RC(xr, yF, bw, fH, NAVY, EDGE) + T(xr + bw / 2, yF - 10, fv + U, '', 'middle');
      o += RC(xl, yP, bw, base - yP, GOLD, null, ' class="mv"');
      // 110 높이를 왼쪽까지 끌어 와 깎인 몫을 보이게
      o += LN(xl, yF, xr, yF, FAINT, ' stroke-dasharray="3 4"');
      // 화살표: 오른쪽 → 왼쪽, ÷ (1 + r)
      var ax0 = xr + bw / 2 - 14, ay0 = yF - 26, ax1 = xl + bw / 2, ay1 = yF - 6, cy = yF - 62;
      o += '<path d="M' + r1(ax0) + ' ' + r1(ay0) + ' Q' + r1(mx) + ' ' + r1(cy) + ' ' + r1(ax1) + ' ' + r1(ay1) + '" fill="none" stroke="rgba(242,239,232,.55)" marker-end="url(#curM8pvA)"/>';
      o += '<defs><marker id="curM8pvA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5 0 10z" fill="rgba(242,239,232,.7)"/></marker></defs>';
      o += T(mx, yF - 46, '÷ (1 + ' + r + '%)', '', 'middle');
      // 깎인 몫 괄호
      if (r > 0) {
        var bx = xl + bw + 7;
        o += LN(bx, yF, bx, yP, 'rgba(242,239,232,.6)') + LN(bx - 4, yF, bx, yF, 'rgba(242,239,232,.6)') + LN(bx - 4, yP, bx, yP, 'rgba(242,239,232,.6)');
        o += T(bx + 7, Math.max(yF + 13, (yF + yP) / 2 + 4), '할인으로 줄어든 ' + num(fv - pv) + U, 's');
      }
      var ym = Math.max(yP + 52, (yP + base) / 2 + 6);
      o += T(xl + bw + 16, ym, num(pv) + U, 'big') + T(xl + bw + 16, ym + 20, '지금 값', 's');
      o += T(xl + bw / 2, base + 22, '지금', '', 'middle') + T(xr + bw / 2, base + 22, '1년 뒤', '', 'middle');
      put(svg, w, h, o, '할인율 ' + r + '%면 1년 뒤 ' + fv + U + '은 지금 ' + num(pv) + U);
      vr.innerHTML = '할인율 <b>' + r + '%</b>면 1년 뒤 ' + fv + U + '은 지금 <b>' + num(pv) + U + '</b>이에요.' +
        (r === 0 ? ' 할인하지 않으면 그대로예요.' : r > (p.r != null ? p.r : 10) ? ' 할인율을 올리면 지금 값이 내려가요.' : '');
    }
    bind(host.querySelector('#curM8pv'), D, function () { return v.r; }, function (x) { v.r = x; }, draw);
    if (ctx && ctx.ready) ctx.ready(true);
    return { draw: draw };
  };

  // ── m8Bridge: FCFF 현재가치 + TV 현재가치 + 비영업자산 − 이자부부채 = 주주 몫 → ÷ 주식 수. 비례 가로 다리 (map_why) ──
  window.CUR_VIS.m8Bridge = function (host, p, ctx) {
    host.innerHTML = '<svg class="m8v" role="img"></svg>' + capHtml(p);
    var svg = host.querySelector('svg'), rows = p.rows || [];
    function draw() {
      var w = W(host, 560), lc = Math.round(clamp(w * 0.38, 124, 176)), bx = lc + 8, bwid = w - bx - 2, run = 0, top = 0, segs = [], o = '';
      rows.forEach(function (r) { var a = run, b = r.op === '−' ? run - r.v : run + r.v; segs.push({ a: Math.min(a, b), b: Math.max(a, b), end: b, r: r }); run = b; top = Math.max(top, a, b); });
      var eq = run, sc = bwid / top, X = function (x) { return bx + x * sc; }, rh = 60, y = 22;
      o += T(w, 11, esc(p.unit || ''), 's', 'end');
      segs.forEach(function (sg, i) {
        var r = sg.r, by = y + 6, bh = 20, x0 = X(sg.a), x1 = X(sg.b), val = fmt(r.v), vz = tw(val, 13);
        o += T(0, y + 15, (r.op ? r.op + ' ' : '') + esc(r.t)) + String(r.d || '').split('\n').map(function (ln, j) { return T(0, y + 32 + j * 15, esc(ln), 's'); }).join('');
        o += r.op === '−' ? RC(x0, by, x1 - x0, bh, 'none', 'rgba(242,239,232,.65)', ' stroke-dasharray="3 3"') : RC(x0, by, x1 - x0, bh, NAVY, EDGE);
        // 값: 막대 오른쪽에 자리가 있으면 오른쪽, 막대가 넓으면 안, 아니면 왼쪽
        if (w - x1 >= vz + 8) o += T(x1 + 6, by + 15, val);
        else if (x1 - x0 >= vz + 12) o += T((x0 + x1) / 2, by + 15, val, '', 'middle');
        else o += T(x0 - 6, by + 15, val, '', 'end');
        o += LN(X(sg.end), by + bh, X(sg.end), by + rh, FAINT, ' stroke-dasharray="2 3"');
        y += rh;
      });
      // 주주 몫 (금색 하나)
      o += LN(0, y + 2, w, y + 2, 'rgba(242,239,232,.4)');
      y += 8;
      o += T(0, y + 15, '= ' + esc(p.total || '주주 몫')) + T(0, y + 33, fmt(eq), 'md');
      o += RC(X(0), y + 6, eq * sc, 20, GOLD) + RC(X(eq), y + 6, (top - eq) * sc, 20, 'none', 'rgba(242,239,232,.25)', ' stroke-dasharray="2 3"');
      if (p.td) o += T(X(0), y + 44, esc(p.td), 's');
      y += p.td ? 66 : 54;
      // ÷ 주식 수 → 한 주의 값
      var ps = eq * (p.mult || 1e6) / p.shares;
      o += T(0, y + 15, '÷ 주식 수') + T(0, y + 32, fmt(p.shares) + '주', 's');
      o += T(bx, y + 24, fmt(ps) + '원', 'big') + T(bx + tw(fmt(ps), 22) + 30, y + 23, '한 주의 값', 's');
      put(svg, w, y + 44, o, rows.map(function (r) { return (r.op || '') + r.t + ' ' + fmt(r.v); }).join(' ') + ' = ' + (p.total || '주주 몫') + ' ' + fmt(eq) + ', 주당 ' + fmt(ps) + '원');
    }
    return { draw: draw };
  };

  // ── m8Ledger: 재무상태표 T자. 왼쪽 사업(FCFF), 오른쪽 돈을 댄 두 쪽(부채 D·자본 E)을 비중대로 (qwacc) ──
  window.CUR_VIS.m8Ledger = function (host, p, ctx) {
    host.innerHTML = '<svg class="m8v" role="img"></svg>' + capHtml(p);
    var svg = host.querySelector('svg'), dw = p.dw, ew = 100 - p.dw, A = p.ann || {};
    function draw() {
      var w = W(host, 520), LW = Math.round(Math.min(w * 0.56, 300)), cw = LW / 2, y0 = 40, H = 196, y1 = y0 + H, hd = H * dw / 100, o = '';
      o += T(cw / 2, 20, '자산', '', 'middle') + T(cw + cw / 2, 20, '돈을 댄 쪽', '', 'middle');
      o += LN(0, 30, LW, 30, '#F2EFE8', ' stroke-width="1.5"') + LN(cw, 30, cw, y1 + 8, '#F2EFE8', ' stroke-width="1.5"');
      o += RC(4, y0, cw - 12, H, NAVY, EDGE) + T(cw / 2 - 2, y0 + H / 2 - 4, esc(p.asset || '사업'), 'md', 'middle') + T(cw / 2 - 2, y0 + H / 2 + 16, esc(p.assetSub || ''), 's', 'middle');
      var rx = cw + 8, rw = LW - cw - 12;
      o += RC(rx, y0, rw, hd - 1, NAVY, EDGE) + RC(rx, y0 + hd + 1, rw, H - hd - 1, NAVY, EDGE);
      o += T(rx + rw / 2, y0 + hd / 2 - 3, '부채 D', 's', 'middle') + T(rx + rw / 2, y0 + hd / 2 + 15, nf(dw) + '%', '', 'middle');
      o += T(rx + rw / 2, y0 + hd + (H - hd) / 2 - 3, '자본 E', 's', 'middle') + T(rx + rw / 2, y0 + hd + (H - hd) / 2 + 15, nf(ew) + '%', '', 'middle');
      // 직접 주석: 부채 → Kd, 자본 → Ke
      var ax = LW + 16;
      [[y0 + hd / 2, A.d || ['Kd']], [y0 + hd + (H - hd) / 2, A.e || ['Ke']]].forEach(function (a) {
        var yy = a[0], L2 = a[1];
        o += LN(LW - 4, yy, ax - 6, yy, FAINT);
        o += T(ax, yy - 2, esc(L2[0]), 'md') + L2.slice(1).map(function (s, j) { return T(ax, yy + 16 + j * 15, esc(s), 's'); }).join('');
      });
      // 두 요구수익률을 비중대로 섞으면 WACC (금색 하나)
      var yb = y1 + 22;
      o += LN(rx, yb, rx + rw, yb, GOLD, ' stroke-width="1.5"') + LN(rx, yb - 6, rx, yb, GOLD, ' stroke-width="1.5"') + LN(rx + rw, yb - 6, rx + rw, yb, GOLD, ' stroke-width="1.5"');
      var mix = esc(p.mix || '둘을 비중대로 섞으면 WACC');
      o += T(fit(rx, mix, 13, w), yb + 20, mix);
      put(svg, w, yb + 30, o, '자산(사업)은 부채 ' + nf(dw) + '%와 자본 ' + nf(ew) + '%로 돈을 댔어요. 부채엔 Kd, 자본엔 Ke, 둘을 섞으면 WACC');
    }
    return { draw: draw };
  };

  // ── m8Lever: Peer 관측 βL = 사업 위험 βU + 빚 효과. 빚 효과를 벗겨 평균 낸 βU에 목표 빚을 다시 얹는다 (qke) ──
  window.CUR_VIS.m8Lever = function (host, p, ctx) {
    host.innerHTML = '<svg class="m8v" role="img"></svg>' + capHtml(p);
    var svg = host.querySelector('svg'), P = p.peers || [];
    function draw() {
      var w = W(host, 520), top = Math.max.apply(null, P.map(function (r) { return r.bl; }).concat([p.target])), sc = w * 0.66 / top, rh = 48, y = 4, o = '', bh = 20;
      P.forEach(function (r, i) {
        var xu = r.bu * sc, xl = r.bl * sc, by = y + 20;
        o += T(0, y + 13, esc(r.n)) + T(tw(r.n, 13) + 8, y + 13, '관측 βL ' + b2(r.bl), 's');
        o += RC(0, by, xu, bh, NAVY, EDGE) + RC(xu, by, xl - xu, bh, 'none', 'rgba(242,239,232,.6)', ' stroke-dasharray="3 3"');
        if (xu >= 34) o += T(xu / 2, by + 14.5, b2(r.bu), 's', 'middle');
        if (i === 0 && p.ann) o += T(xl + 8, by + 14.5, esc(p.ann), 's');
        y += rh;
      });
      var mid = esc(p.mid || '');
      o += T(0, y + 12, mid, 's');
      y += 26;
      var xa = p.avg * sc, xt = p.target * sc, by = y + 20;
      o += T(0, y + 13, esc(p.name || '')) + T(tw(p.name || '', 13) + 8, y + 13, esc(p.tlab || '목표 β (리레버)'), 's');
      o += RC(0, by, xa, bh, NAVY, EDGE) + T(xa / 2, by + 14.5, b2(p.avg), 's', 'middle');
      o += RC(xa, by, xt - xa, bh, 'rgba(226,196,143,.28)', GOLD, ' stroke-width="1.5"');
      o += T(xt + 10, by + 17, b2(p.target), 'big');
      var dn = esc(p.down || '');
      o += LN(xa + 1, by + bh + 3, xa + 1, by + bh + 12, GOLD) + T(fit(xa - 2, dn, 12, w), by + bh + 26, dn, 's');
      put(svg, w, by + bh + 34, o, P.map(function (r) { return r.n + ' βL ' + b2(r.bl) + ' 중 βU ' + b2(r.bu); }).join(', ') + '. βU 평균 ' + b2(p.avg) + '에 목표 빚을 얹으면 ' + b2(p.target));
    }
    return { draw: draw };
  };

  // ── m8Tail: 예측 기간 FCFF 막대 뒤로 g씩 자라는 현금이 끝없이. 그걸 하나로 묶은 게 TV (qtv) ──
  window.CUR_VIS.m8Tail = function (host, p, ctx) {
    host.innerHTML = '<svg class="m8v" role="img"></svg>' + capHtml(p);
    var svg = host.querySelector('svg'), fc = p.fc, n = fc.length, g = (p.g || 0) / 100, LB = p.labels || [];
    function draw() {
      var w = W(host, 580), m = w < 520 ? 4 : 6, slots = n + m + 1, pitch = w / slots, bw = pitch * 0.62, pad = (pitch - bw) / 2, base = 172, o = '';
      var last = fc[n - 1], maxV = last * Math.pow(1 + g, m), hs = 100 / maxV, X = function (i) { return i * pitch + pad; }, wide = pitch >= 48;
      o += LN(0, base, w, base, 'rgba(242,239,232,.3)');
      fc.forEach(function (f, i) {
        var hh = Math.max(2, f * hs);
        o += RC(X(i), base - hh, bw, hh, NAVY, EDGE);
        o += T(X(i) + bw / 2, base + 17, esc(wide ? LB[i] : String(LB[i]).replace(/E$/, '')), 's', 'middle');
      });
      var dx = n * pitch, ytop = base - maxV * hs - 14;
      o += T(Math.min(X(n - 1) + bw / 2 + tw(fmt(last), 12) / 2, dx - 5), base - last * hs - 7, fmt(last), 's', 'end');
      o += T((X(0) + X(n - 1) + bw) / 2, ytop - 10, '예측 기간', 's', 'middle');
      o += LN(dx, ytop - 24, dx, base + 6, 'rgba(242,239,232,.45)', ' stroke-dasharray="3 4"');
      for (var j = 0; j < m; j++) {
        var v = last * Math.pow(1 + g, j + 1), hh2 = v * hs, a = Math.max(0.16, 0.6 - j * 0.08);
        o += RC(X(n + j), base - hh2, bw, hh2, 'none', 'rgba(242,239,232,' + a.toFixed(2) + ')', ' stroke-dasharray="3 3"');
      }
      o += T(X(n + m) + bw / 2, base - 40, '…', 'md', 'middle');
      o += T(X(n) + bw / 2, base + 17, esc(wide ? p.next : String(p.next).replace(/E$/, '')), 's', 'middle');
      var gl = esc(p.grow || '');
      o += T(fit(X(n), gl, 12, w), base + 36, gl, 's');
      // TV 괄호 (금색 하나): 그 뒤 현금을 모두 하나로
      var b0 = X(n), b1 = w - 2, yb = base - maxV * hs - 14, one = p.tv || '', two = (p.tv2 || []).map(esc);
      o += LN(b0, yb, b1, yb, GOLD, ' stroke-width="1.5"') + LN(b0, yb, b0, yb + 7, GOLD, ' stroke-width="1.5"') + LN(b1, yb, b1, yb + 7, GOLD, ' stroke-width="1.5"');
      if (tw(one, 13) <= b1 - b0 || !two.length) o += T(b0, yb - 10, nm(one));
      else o += T(b0, yb - 26, two[0]) + T(b0, yb - 10, two[1] || '', 's');
      put(svg, w, base + 46, o, '예측 기간 ' + LB[0] + '~' + LB[n - 1] + ' FCFF 막대 뒤로 해마다 g씩 자라는 현금이 이어지고, 그 현금을 모두 하나로 묶은 값이 TV');
    }
    return { draw: draw };
  };
})();
