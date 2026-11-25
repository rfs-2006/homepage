/* M9 종합 실습(와이엔텍) 그래프 부품. 규약: harness/PLUGIN.md
 * 모델 식은 harness/ext_m9.py 의 m9_env / m9_total / m9_sens / m9_capex 와 같다 (단위 억 원). 입력은 모두 params.M.
 *   m9QxP   { M, ref:{inc,lf,st,lab}, cap }            소각·매립·스팀 Q×P 매출 만들기 (concept, 슬라이더 4개)
 *   m9Capex { M, starts:[연도], cap }                   증설 가동 연도별 증설만의 FCFF·가치 (concept, 연도 버튼 다 눌러야 다음)
 *   m9Scen  { M, scs:['base','bull'], full, cap }       환경 FCFF 표·할인·TV, full이면 부문 합·주당 가치까지 (concept, 시나리오 버튼 다 눌러야 다음)
 *   m9Sotp  { M, sc, sl?:['ship','fin'], cap }          환경 DCF + 해운·기타 배수 + 비영업자산 − 차입금 = 주당 가치 (concept, 슬라이더)
 *   m9Sens  { M, kinds:['wg','pu'] | kind, ask, cap }   민감도 표 (concept: 표 버튼 다 열기 / chart: 칸 index = 행 × 5 + 열)
 */
(function () {
  var L = window.CUR_LIB, esc = L.esc, fmt = L.fmt, f1 = L.f1;
  L.addCss('cur-m9-css',
    '.cur .rsec li.hl.risk{background:#F3DCDC;border-left-color:#A04848}' +
    '.cur .m9q{display:flex;flex-direction:column;gap:8px;margin-bottom:6px}' +
    '.cur .m9q .r{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;padding:8px 10px;border:1px solid var(--hair);background:rgba(9,17,31,.45);font-size:13.5px;line-height:1.5;color:var(--tx)}' +
    '.cur .m9q .r b{font-family:var(--ser);font-weight:600;font-size:15px;margin-left:auto;color:var(--tx)}' +
    '.cur .m9q .r small{font-size:11.5px;color:var(--ac2);letter-spacing:.06em;min-width:30px}' +
    '.cur .m9q .r.tot{border-color:var(--wm)}.cur .m9q .r.tot b{color:var(--wm);font-size:18px}' +
    '.cur .m9t{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;font-variant-numeric:tabular-nums;margin-top:6px}' +
    '.cur .m9t th,.cur .m9t td{padding:6px 2px;border-bottom:1px solid var(--hair);text-align:right;white-space:nowrap;overflow:hidden;color:var(--tx)}' +
    '.cur .m9t thead th{font-family:var(--ser);color:var(--ac2);font-weight:600;font-size:12.5px}' +
    '.cur .m9t tbody th{text-align:left;font-weight:500;font-size:11.5px;white-space:normal;line-height:1.3}' +
    '.cur .m9t col.l{width:27%}' +
    '.cur .m9t tr.hl td,.cur .m9t tr.hl th{background:rgba(143,170,220,.12)}' +
    '.cur .m9t td.neg{color:var(--no)}.cur .m9t td.tv{color:var(--wm)}' +
    '.cur .m9s td{padding:0;border:1px solid rgba(11,21,38,.9)}' +
    '.cur .m9s td button{width:100%;min-height:40px;border:0;background:none;color:var(--tx);font:inherit;font-size:12px;cursor:pointer;font-variant-numeric:tabular-nums}' +
    '.cur .m9s td.ctr button{outline:2px solid var(--wm);outline-offset:-3px}' +
    '.cur .m9s td.pk button{outline:2px solid var(--ac);outline-offset:-3px;font-weight:600}' +
    '.cur .m9s td.ok button{outline:2px solid var(--ok);outline-offset:-3px;color:var(--ok);font-weight:600}' +
    '.cur .m9s td.no button{outline:2px solid var(--no);outline-offset:-3px;color:var(--no)}' +
    '.cur .m9s thead th,.cur .m9s tbody th{font-size:11px;color:var(--ac2);text-align:center;padding:6px 1px}' +
    '.cur .m9s tbody th{text-align:left}' +
    '.cur .m9cap{margin-top:8px;font-size:12px;color:var(--t3)}');

  // ── 모델 (ext_m9.py 와 같은 식) ──
  function env(M, sc, o) {
    o = o || {}; var S = M.sc[sc];
    var wacc = o.wacc == null ? M.wacc : o.wacc, g = o.g == null ? M.g : o.g, util = o.util || S.util, cx = o.cx || S.cx, px = o.px || S.px, sh = o.shift || 0;
    var q0 = M.capOld * M.days * M.uOld / 1e4, rev0 = q0 * M.pInc + M.qLf * M.pLf + q0 * M.steam;
    var pi = M.pInc, pl = M.pLf, prev = rev0, rows = [], started = false, pvsum = 0;
    for (var i = 0; i < M.years.length; i++) {
      pi *= 1 + px[i]; pl *= 1 + px[i];
      var qn = M.capNew * M.days * util[i] / 1e4; if (util[i] > 0) started = true;
      var q = q0 + qn, inc = q * pi * (1 + sh), lf = M.qLf * pl * (1 + sh), st = q * M.steam, rev = inc + lf + st;
      var ebitda = rev * M.margin, da = M.daOld + (started ? M.capex / M.life : 0), ebit = ebitda - da, capex = da + cx[i], dnwc = M.nwc * (rev - prev); prev = rev;
      var fcff = ebit * (1 - M.tax) + da - capex - dnwc, df = Math.pow(1 + wacc, -(i + 1));
      rows.push({ y: M.years[i], q: q, qn: qn, inc: inc, lf: lf, st: st, rev: rev, ebitda: ebitda, da: da, ebit: ebit, nopat: ebit * (1 - M.tax), capex: capex, cx: cx[i], dnwc: dnwc, fcff: fcff, df: df, pv: fcff * df });
      pvsum += fcff * df;
    }
    var last = rows[rows.length - 1], tv = last.fcff * (1 + g) / (wacc - g), pvtv = tv * last.df;
    return { q0: q0, rev0: rev0, rows: rows, tv: tv, pvtv: pvtv, pvsum: pvsum, ev: pvsum + pvtv, share: pvtv / (pvsum + pvtv) };
  }
  function total(M, sc, o) {
    o = o || {}; var S = M.sc[sc], e = env(M, sc, o), ship = o.ship == null ? S.ship : o.ship, fin = o.fin == null ? S.fin : o.fin;
    var sv = M.shipEb * ship, ev2 = M.etcEb * M.etcMult, ev = e.ev + sv + ev2, noa = M.cash + M.fin * fin, eq = ev + noa - M.ibd;
    return { env: e, ship: sv, etc: ev2, ev: ev, noa: noa, finv: M.fin * fin, eq: eq, ps: eq * 1e4 / M.shares };
  }
  var SENS = {
    wg: { rows: [0.071, 0.076, 0.081, 0.086, 0.091], cols: [0, 0.005, 0.01, 0.015, 0.02], rl: function (r) { return 'WACC ' + (r * 100).toFixed(1) + '%'; }, cl: function (c) { return 'g ' + (c * 100).toFixed(1) + '%'; },
      f: function (M, r, c) { return total(M, 'base', { wacc: r, g: c }).ps; }, t: 'WACC × 영구성장률', rh: '행: WACC · 열: 영구성장률 g' },
    pu: { rows: [-0.10, -0.05, 0, 0.05, 0.10], cols: [0.6, 0.75, 0.9, 1.05, 1.2], rl: function (r) { return '단가 ' + (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(Math.round(r * 100)) + '%'; }, cl: function (c) { return Math.round(c * 100) + '%'; },
      f: function (M, r, c) { return total(M, 'base', { shift: r, util: [0, 0, 0.5, c - 0.1, c] }).ps; }, t: '소각 단가 × 신설 가동률', rh: '행: 단가 변화 · 열: 신설 소각로 정상 가동률' }
  };
  function capexCase(M, start) {
    var ys = M.years, util = [0, 0, 0, 0, 0], cx = [0, 0, 0, 0, 0], i0 = ys.indexOf(start);
    for (var i = i0; i < ys.length; i++) util[i] = [0.5, 0.8, 0.9][Math.min(i - i0, 2)];
    if (i0 >= 1) cx[i0 - 1] = M.capex;
    var none = env(M, 'base', { util: [0, 0, 0, 0, 0], cx: [0, 0, 0, 0, 0] }), w = env(M, 'base', { util: util, cx: cx });
    return { util: util, cx: cx, w: w, none: none, value: w.ev - none.ev };
  }
  window.CUR_M9 = { env: env, total: total, SENS: SENS, capexCase: capexCase };   // 하네스 대조용 (그래프 부품 아님)

  function sg(x) { return (x < 0 ? '−' : '') + fmt(Math.abs(x)); }
  function s1(x) { var v = Math.round(Math.abs(x) * 10) / 10; return (x < 0 && v ? '−' : '') + v.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function pct(x) { return Math.round(x * 100) + '%'; }
  function box(t, x, c) { return '<div class="eq ' + (c || '') + '"><small>' + t + '</small><b>' + x + '</b></div>'; }
  function capHtml(p) { return p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : ''; }

  // ── 1. Q×P 매출 만들기 ──
  window.CUR_VIS.m9QxP = function (host, p, ctx) {
    var M = p.M, v = { uOld: M.uOld, pInc: M.pInc, qLf: M.qLf, pLf: M.pLf }, ref = p.ref || null;
    var SL = [['uOld', '기존 소각 가동률', 0.9, 1.3, 0.01], ['pInc', '소각 단가(만 원/톤)', 24, 32, 0.5], ['qLf', '매립량(만 톤)', 10, 20, 0.5], ['pLf', '매립 단가(만 원/톤)', 9, 15, 0.5]];
    host.innerHTML = '<div class="m9q" aria-live="polite"></div><svg role="img"></svg>' + SL.map(function (s) { return L.sliderHtml('curM9q' + s[0], s[1], s[2], s[3], s[4], v[s[0]]); }).join('') +
      '<p class="vr"></p>' + capHtml(p);
    var q = host.querySelector('.m9q'), svg = host.querySelector('svg'), vr = host.querySelector('.vr'), ins = host.querySelectorAll('.vctl input');
    ins.forEach(function (el, i) { el.setAttribute('data-k', SL[i][0]); });
    function calc() { var qq = M.capOld * M.days * v.uOld / 1e4, inc = qq * v.pInc, lf = v.qLf * v.pLf, st = qq * M.steam; return { q: qq, inc: inc, lf: lf, st: st, rev: inc + lf + st }; }
    function draw() {
      var c = calc(), w = L.wOf(host), h = 74, x0 = 0, tot = Math.max(c.rev, 1), sc = (w - 2) / Math.max(tot, 420), o = '';
      q.innerHTML = '<div class="r"><small>소각</small>' + M.capOld + '톤/일 × ' + M.days + '일 × ' + pct(v.uOld) + ' = ' + c.q.toFixed(2) + '만 톤 × ' + v.pInc.toFixed(1) + '만 원<b>' + s1(c.inc) + '억</b></div>' +
        '<div class="r"><small>매립</small>' + v.qLf.toFixed(1) + '만 톤 × ' + v.pLf.toFixed(1) + '만 원<b>' + s1(c.lf) + '억</b></div>' +
        '<div class="r"><small>스팀</small>소각 ' + c.q.toFixed(2) + '만 톤 × ' + M.steam.toFixed(1) + '만 원<b>' + s1(c.st) + '억</b></div>' +
        '<div class="r tot"><small>합계</small>환경 매출<b>' + s1(c.rev) + '억 원</b></div>';
      [[c.inc, 'rgba(143,170,220,.55)', '소각'], [c.lf, 'rgba(232,201,160,.55)', '매립'], [c.st, 'rgba(169,216,188,.55)', '스팀']].forEach(function (s) {
        var ww = s[0] * sc; o += '<rect x="' + x0 + '" y="8" width="' + Math.max(ww, 0) + '" height="30" fill="' + s[1] + '" stroke="rgba(242,239,232,.4)" style="transition:all .3s"/>' + (ww > 40 ? '<text x="' + (x0 + ww / 2) + '" y="28" text-anchor="middle" class="tt">' + s[2] + '</text>' : ''); x0 += ww;
      });
      if (ref) { var rx = (ref.inc + ref.lf + ref.st) * sc; o += '<line x1="' + rx + '" x2="' + rx + '" y1="2" y2="46" stroke="var(--wm)" stroke-dasharray="3 3"/><text x="' + Math.min(rx, w - 4) + '" y="62" text-anchor="end" class="twm">' + esc('2023년 추정 ' + fmt(ref.inc + ref.lf + ref.st) + '억') + '</text>'; }
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', '소각 ' + s1(c.inc) + '억, 매립 ' + s1(c.lf) + '억, 스팀 ' + s1(c.st) + '억, 합계 ' + s1(c.rev) + '억 원');
      host.querySelectorAll('.vctl').forEach(function (cl) { var k = cl.querySelector('input').getAttribute('data-k'); cl.querySelector('b').textContent = k === 'uOld' ? pct(v[k]) : v[k].toFixed(1); });
      var d = c.rev - (M.capOld * M.days * M.uOld / 1e4) * (M.pInc + M.steam) - M.qLf * M.pLf;
      vr.innerHTML = '환경 매출 <b>' + s1(c.rev) + '억 원</b>' + (Math.abs(d) > 0.05 ? ' (처음보다 ' + (d > 0 ? '+' : '−') + s1(Math.abs(d)) + '억)' : '') +
        (ref ? '<br>' + esc(ref.lab) + ': 소각 ' + ref.inc + ' · 매립 ' + ref.lf + ' · 스팀 ' + ref.st + '억' : '');
    }
    ins.forEach(function (el) { el.addEventListener('input', function () { v[el.getAttribute('data-k')] = +el.value; draw(); }); el.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
    return { draw: draw };
  };

  // ── 2. 증설 가동 연도와 가치 ──
  window.CUR_VIS.m9Capex = function (host, p, ctx) {
    var M = p.M, starts = p.starts || [2026, 2027, 2028], seen = {}, cur = null;
    host.innerHTML = '<div class="vbt" role="group" aria-label="가동 연도">' + starts.map(function (y, i) { return '<button type="button" class="vgo" data-y="' + y + '"><b>' + y + '년 가동</b><i>' + (i + 1) + '</i></button>'; }).join('') + '</div>' +
      '<svg role="img"></svg><div class="eqs" aria-live="polite"></div><p class="vr"></p>' + capHtml(p);
    var svg = host.querySelector('svg'), eq = host.querySelector('.eqs'), vr = host.querySelector('.vr');
    function draw() {
      var w = L.wOf(host), h = 252, ys = M.years, n = ys.length, lw = 6, cw = (w - lw) / n, mid = 112, o = '';
      o += '<line class="ax" x1="0" x2="' + w + '" y1="' + mid + '" y2="' + mid + '"/>';
      if (!cur) {
        o += '<text x="' + (w / 2) + '" y="' + (mid - 14) + '" text-anchor="middle" class="tt">가동 연도 버튼을 눌러 보세요</text>';
        ys.forEach(function (y, i) { o += '<text x="' + (lw + cw * i + cw / 2) + '" y="' + (h - 8) + '" text-anchor="middle">' + y + '</text>'; });
        eq.innerHTML = ''; vr.innerHTML = '증설이 있을 때와 없을 때 환경 FCFF의 차이를 해마다 보여 줘요.';
      } else {
        var c = capexCase(M, cur), d = c.w.rows.map(function (r, i) { return r.fcff - c.none.rows[i].fcff; }), mx = Math.max.apply(null, d.map(Math.abs).concat([M.capex])), sc = 84 / mx;
        d.forEach(function (x, i) {
          var cx0 = lw + cw * i + cw * 0.2, bw = cw * 0.6, hh = Math.abs(x) * sc, y = x >= 0 ? mid - hh : mid;
          o += '<rect x="' + cx0 + '" y="' + y + '" width="' + bw + '" height="' + Math.max(hh, 1) + '" fill="' + (x >= 0 ? 'rgba(169,216,188,.5)' : 'rgba(232,169,169,.5)') + '" stroke="' + (x >= 0 ? 'var(--ok)' : 'var(--no)') + '" style="transition:all .3s"/>';
          o += '<text x="' + (cx0 + bw / 2) + '" y="' + (x >= 0 ? y - 6 : (hh > 24 ? y + hh - 8 : y + hh + 14)) + '" text-anchor="middle" class="' + (x >= 0 ? 'tok' : (hh > 24 ? 'tt' : 'tno')) + '">' + sg(x) + '</text>';
          o += '<text x="' + (cx0 + bw / 2) + '" y="' + (h - 26) + '" text-anchor="middle" style="font-size:10.5px">' + (c.cx[i] ? 'CAPEX' : c.util[i] ? '신설 ' + pct(c.util[i]) : '') + '</text>';
          o += '<text x="' + (cx0 + bw / 2) + '" y="' + (h - 8) + '" text-anchor="middle">' + ys[i] + '</text>';
        });
        var pvd = c.w.pvsum - c.none.pvsum, tvd = c.w.pvtv - c.none.pvtv;
        eq.innerHTML = box('5년 현재가치 차이', sg(pvd) + '억') + '<i>+</i>' + box('TV 현재가치 차이', sg(tvd) + '억') + '<i>=</i>' + box('증설 가치', sg(c.value) + '억', 'hl');
        vr.innerHTML = '<b>' + cur + '년 가동</b> · 확장 CAPEX ' + fmt(M.capex) + '억 원은 ' + (cur - 1) + '년에 나가요. 마지막 해 신설 가동률 ' + pct(c.util[n - 1]) + (c.util[n - 1] < 0.9 ? ' (아직 정상 가동 전이라 TV가 낮게 잡혀요)' : '') + '.';
      }
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', cur ? cur + '년 가동일 때 해마다 증설로 달라지는 FCFF (억 원)' : '가동 연도를 고르면 해마다 증설로 달라지는 FCFF가 보여요');
    }
    host.querySelectorAll('.vgo').forEach(function (b) {
      b.onclick = function () {
        cur = +b.getAttribute('data-y'); seen[cur] = 1; b.classList.add('done');
        host.querySelectorAll('.vgo').forEach(function (x) { x.classList.toggle('on', x === b); });
        draw(); L.gate(ctx, Object.keys(seen).length >= starts.length);
      };
    });
    L.gate(ctx, false);
    return { draw: draw, gated: function () { return Object.keys(seen).length < starts.length; } };
  };

  // ── 3. 환경 DCF 표 (시나리오) ──
  window.CUR_VIS.m9Scen = function (host, p, ctx) {
    var M = p.M, scs = p.scs || ['base'], seen = {}, cur = null;
    var NOTE = { base: '신설 2027년 가동(50 → 80 → 90%) · 단가 2년간 −2% · 해운 4배 · 금융자산 70%', bull: '신설 2026년 가동(60 → 90 → 100%) · 단가 유지 · 해운 5배 · 금융자산 100%' };
    host.innerHTML = '<div class="vbt" role="group" aria-label="시나리오">' + scs.map(function (k, i) { return '<button type="button" class="vgo" data-s="' + k + '"><b>' + (scs.length > 1 ? M.sc[k].label : '표 열기 · ' + M.sc[k].label) + '</b><i>' + (i + 1) + '</i></button>'; }).join('') + '</div>' +
      '<div class="m9w"></div><div class="eqs" aria-live="polite"></div><div class="eqs m9e2"></div><p class="vr"></p>' + capHtml(p);
    var wrap = host.querySelector('.m9w'), eq = host.querySelector('.eqs'), eq2 = host.querySelector('.m9e2'), vr = host.querySelector('.vr');
    function draw() {
      if (!cur) { wrap.innerHTML = ''; eq.innerHTML = ''; eq2.innerHTML = ''; vr.innerHTML = '버튼을 눌러 표를 여세요. (억 원)'; return; }
      var t = total(M, cur), e = t.env, R = e.rows;
      function row(l, f, cls, tv) { return '<tr class="' + (cls || '') + '"><th scope="row">' + l + '</th>' + R.map(function (r) { var x = f(r); return '<td class="' + (x < -0.5 ? 'neg' : '') + '">' + sg(x) + '</td>'; }).join('') + '<td class="tv">' + (tv == null ? '' : sg(tv)) + '</td></tr>'; }
      wrap.innerHTML = '<table class="m9t"><colgroup><col class="l">' + R.map(function () { return '<col>'; }).join('') + '<col></colgroup><thead><tr><th scope="col"><span style="font-size:10.5px;font-family:inherit;font-weight:300;color:var(--t3)">억 원</span></th>' + R.map(function (r) { return '<th scope="col">' + String(r.y).slice(2) + 'E</th>'; }).join('') + '<th scope="col">TV</th></tr></thead><tbody>' +
        row('매출', function (r) { return r.rev; }) + row('EBITDA', function (r) { return r.ebitda; }) + row('EBIT×(1−t)', function (r) { return r.nopat; }) + row('+ D&amp;A', function (r) { return r.da; }) +
        row('− CAPEX', function (r) { return -r.capex; }) + row('− ΔNWC', function (r) { return -r.dnwc; }) + row('FCFF', function (r) { return r.fcff; }, 'hl', e.tv) + row('현재가치', function (r) { return r.pv; }, '', e.pvtv) + '</tbody></table>';
      eq.innerHTML = box('5년 현재가치 합', fmt(e.pvsum) + '억') + '<i>+</i>' + box('TV 현재가치', fmt(e.pvtv) + '억') + '<i>=</i>' + box('환경 EV', fmt(e.ev) + '억', 'hl') + box('TV 비중', pct(e.share), 'wm');
      eq2.innerHTML = p.full ? box('+ 해운·기타', fmt(t.ship + t.etc) + '억') + '<i>+</i>' + box('비영업자산', s1(t.noa) + '억') + '<i>−</i>' + box('차입금', s1(M.ibd) + '억') + '<i>=</i>' + box('주주가치', fmt(t.eq) + '억', 'hl') + '<i>÷</i>' + box('주식 수', fmt(M.shares) + '만 주') + '<i>=</i>' + box('주당 가치', fmt(t.ps) + '원', 'ac') : '';
      vr.innerHTML = '<b>' + M.sc[cur].label + '</b> · ' + esc(NOTE[cur] || '') + '<br>WACC ' + f1(M.wacc * 100) + '%, g ' + f1(M.g * 100) + '%, 세율 ' + Math.round(M.tax * 100) + '%. TV = ' + s1(R[R.length - 1].fcff) + ' × (1 + g) ÷ (WACC − g)' + (p.full ? ' · 지금 주가 ' + fmt(M.px) + '원' : '');
    }
    host.querySelectorAll('.vgo').forEach(function (b) {
      b.onclick = function () {
        cur = b.getAttribute('data-s'); seen[cur] = 1; b.classList.add('done');
        host.querySelectorAll('.vgo').forEach(function (x) { x.classList.toggle('on', x === b); });
        draw(); L.gate(ctx, Object.keys(seen).length >= scs.length);
      };
    });
    L.gate(ctx, false);
    return { draw: draw, gated: function () { return Object.keys(seen).length < scs.length; } };
  };

  // ── 4. 부문 더하기 → 주당 가치 ──
  window.CUR_VIS.m9Sotp = function (host, p, ctx) {
    var M = p.M, sc = p.sc || 'base', v = { ship: M.sc[sc].ship, fin: Math.round(M.sc[sc].fin * 100) };
    var SLS = { ship: ['curM9ship', '해운 EV/EBITDA', 2, 6, 0.5], fin: ['curM9fin', '금융자산 반영률', 0, 100, 10] }, sl = p.sl || ['ship', 'fin'];
    host.innerHTML = '<svg role="img"></svg>' + sl.map(function (k) { var s = SLS[k]; return L.sliderHtml(s[0], s[1], s[2], s[3], s[4], v[k]); }).join('') + '<p class="vr" aria-live="polite"></p>' + capHtml(p);
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr'), ins = host.querySelectorAll('.vctl input');
    ins.forEach(function (el, i) { el.setAttribute('data-k', sl[i]); });
    var base0 = total(M, sc);
    function draw() {
      var t = total(M, sc, { ship: v.ship, fin: v.fin / 100 }), w = L.wOf(host), lw = Math.min(118, w * 0.33), vw = 52, rh = 27, top = Math.max(t.ev + t.noa, base0.ev + M.cash + M.fin) * 1.02;
      var items = [['환경 EV (DCF)', t.env.ev, 'a'], ['해운 ' + f1(v.ship) + '배', t.ship, 'a'], ['기타 ' + f1(M.etcMult) + '배', t.etc, 'a'], ['= EV', t.ev, 'sum'], ['현금', M.cash, 'g'], ['금융자산 ' + v.fin + '%', t.finv, 'g'], ['− 차입금', -M.ibd, 'n'], ['= 주주가치', t.eq, 'sum']];
      var X = function (x) { return lw + (w - lw - vw) * x / top; }, run = 0, o = '', h = items.length * rh + 54;
      items.forEach(function (it, i) {
        var y = 6 + i * rh, a, b;
        if (it[2] === 'sum') { a = 0; b = it[1]; run = it[1]; } else { a = run; b = run + it[1]; run = b; }
        var x1 = X(Math.min(a, b)), x2 = X(Math.max(a, b)), col = it[2] === 'sum' ? 'rgba(232,201,160,.55)' : it[2] === 'n' ? 'rgba(232,169,169,.5)' : it[2] === 'g' ? 'rgba(169,216,188,.45)' : 'rgba(143,170,220,.5)';
        o += '<text x="0" y="' + (y + 15) + '" class="' + (it[2] === 'sum' ? 'th' : 'tt') + '" style="font-size:12.5px">' + esc(it[0]) + '</text>';
        o += '<rect x="' + x1 + '" y="' + (y + 2) + '" width="' + Math.max(x2 - x1, 1) + '" height="18" fill="' + col + '" style="transition:all .3s"/>';
        o += '<text x="' + w + '" y="' + (y + 15) + '" text-anchor="end" class="' + (it[1] < 0 ? 'tno' : it[2] === 'sum' ? 'twm' : 'tt') + '">' + (it[2] === 'g' && it[1] % 1 ? s1(it[1]) : it[2] === 'n' ? '−' + s1(-it[1]) : sg(it[1])) + '</text>';
      });
      var yy = 6 + items.length * rh + 8, pmax = Math.max(t.ps, M.px, base0.ps) * 1.05, pw = w - lw - vw, bx = function (x) { return lw + pw * x / pmax; };
      o += '<text x="0" y="' + (yy + 13) + '" class="tt" style="font-size:12.5px">주당 가치</text><rect x="' + lw + '" y="' + yy + '" width="' + (bx(Math.max(t.ps, 0)) - lw) + '" height="14" fill="rgba(143,170,220,.6)" style="transition:all .3s"/><text x="' + w + '" y="' + (yy + 12) + '" text-anchor="end" class="th">' + fmt(t.ps) + '원</text>';
      o += '<line x1="' + bx(M.px) + '" x2="' + bx(M.px) + '" y1="' + (yy - 4) + '" y2="' + (yy + 34) + '" stroke="var(--wm)" stroke-dasharray="3 3"/><text x="' + bx(M.px) + '" y="' + (yy + 32) + '" text-anchor="start" class="twm" style="font-size:11px"> 주가 ' + fmt(M.px) + '</text>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', '환경 ' + fmt(t.env.ev) + ' + 해운 ' + fmt(t.ship) + ' + 기타 ' + fmt(t.etc) + ' = EV ' + fmt(t.ev) + '억, 주주가치 ' + fmt(t.eq) + '억, 주당 ' + fmt(t.ps) + '원');
      host.querySelectorAll('.vctl').forEach(function (cl) { var k = cl.querySelector('input').getAttribute('data-k'); cl.querySelector('b').textContent = k === 'ship' ? f1(v.ship) + '배' : v.fin + '%'; });
      var dp = t.ps - base0.ps;
      vr.innerHTML = 'EV <b>' + fmt(t.ev) + '억</b> → 주주가치 <b>' + fmt(t.eq) + '억</b> → 주당 <b>' + fmt(t.ps) + '원</b>, 주가의 ' + (t.ps / M.px).toFixed(1) + '배' + (Math.abs(dp) >= 1 ? ' (처음보다 ' + (dp > 0 ? '+' : '−') + fmt(Math.abs(dp)) + '원)' : '');
    }
    ins.forEach(function (el) { el.addEventListener('input', function () { v[el.getAttribute('data-k')] = +el.value; draw(); }); el.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
    return { draw: draw };
  };

  // ── 5. 민감도 표 ──
  window.CUR_VIS.m9Sens = function (host, p, ctx) {
    var M = p.M, Q = ctx.mode === 'question', kinds = Q ? [p.kind || 'pu'] : (p.kinds || ['wg', 'pu']), kind = kinds[0], seen = {}, pick = null, locked = false, showAns = false, center = total(M, 'base').ps;
    host.innerHTML = (Q || kinds.length < 2 ? '' : '<div class="vbt" role="tablist" aria-label="민감도 표">' + kinds.map(function (k, i) { return '<button type="button" role="tab" class="vgo" data-k="' + k + '"><b>' + esc(SENS[k].t) + '</b><i>' + (i + 1) + '</i></button>'; }).join('') + '</div>') +
      '<div class="m9g"></div><p class="m9cap"></p><p class="vr" aria-live="polite"></p>' + capHtml(p);
    var g = host.querySelector('.m9g'), cp = host.querySelector('.m9cap'), vr = host.querySelector('.vr');
    function grid(k) { var S = SENS[k]; return S.rows.map(function (r) { return S.cols.map(function (c) { return S.f(M, r, c); }); }); }
    function draw() {
      var S = SENS[kind], G = grid(kind), all = [].concat.apply([], G), lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), ans = Q ? ctx.answer : -1;
      g.innerHTML = '<table class="m9t m9s"><colgroup><col class="l">' + S.cols.map(function () { return '<col>'; }).join('') + '</colgroup><thead><tr><th scope="col"><span class="sr-only">행</span></th>' + S.cols.map(function (c) { return '<th scope="col">' + esc(S.cl(c)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        G.map(function (row, i) {
          return '<tr><th scope="row">' + esc(S.rl(S.rows[i])) + '</th>' + row.map(function (x, j) {
            var idx = i * 5 + j, a = (x - lo) / Math.max(hi - lo, 1), cls = (i === 2 && j === 2 ? 'ctr ' : '') + (pick === idx ? (locked ? (pick === ans ? 'ok' : 'no') : 'pk') : '') + (locked && showAns && idx === ans && pick !== ans ? ' ok' : '');
            return '<td class="' + cls + '" style="background:rgba(143,170,220,' + (0.08 + 0.42 * a).toFixed(2) + ')"><button type="button" data-i="' + idx + '"' + (Q ? '' : ' tabindex="-1"') + ' aria-label="' + esc(S.rl(S.rows[i]) + ', ' + S.cl(S.cols[j]) + ': ' + fmt(x) + '원') + '">' + fmt(x) + '</button></td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
      cp.textContent = S.rh + ' · 주당 가치(원), 가운데 = Base ' + fmt(center) + '원';
      if (Q) {
        g.querySelectorAll('button').forEach(function (b) { b.onclick = function () { if (locked) return; pick = +b.getAttribute('data-i'); ctx.ready(true); draw(); }; });
        if (!locked) vr.innerHTML = pick == null ? esc(p.ask || '칸을 하나 고르세요.') : '고른 칸: <b>' + esc(S.rl(S.rows[Math.floor(pick / 5)]) + ' · ' + S.cl(S.cols[pick % 5])) + '</b> → ' + fmt(G[Math.floor(pick / 5)][pick % 5]) + '원';
      } else vr.innerHTML = '<b>' + esc(S.t) + '</b> · ' + fmt(lo) + '~' + fmt(hi) + '원. 지금 주가 ' + fmt(M.px) + '원' + (lo > M.px ? '보다 모두 높아요.' : '보다 낮은 칸이 있어요.');
    }
    host.querySelectorAll('.vgo').forEach(function (b) {
      b.onclick = function () {
        kind = b.getAttribute('data-k'); seen[kind] = 1; b.classList.add('done');
        host.querySelectorAll('.vgo').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
        draw(); L.gate(ctx, Object.keys(seen).length >= kinds.length);
      };
    });
    if (!Q) L.gate(ctx, kinds.length < 2);
    if (Q) host.__solve = function (right) { pick = right ? ctx.answer : (ctx.answer + 6) % 25; ctx.ready(true); draw(); };
    return {
      draw: draw,
      gated: function () { return !Q && kinds.length > 1 && Object.keys(seen).length < kinds.length; },
      check: function () { var S = SENS[kind]; return { right: pick === ctx.answer, detail: '고른 칸: ' + S.rl(S.rows[Math.floor(pick / 5)]) + ' · ' + S.cl(S.cols[pick % 5]) + '.' }; },
      reveal: function (right, a) {
        locked = true; showAns = a || right; draw();
        var S = SENS[kind], G = grid(kind), ai = ctx.answer;
        vr.innerHTML = (right ? '맞는 칸이에요. ' : '') + (showAns ? '<b>' + esc(S.rl(S.rows[Math.floor(ai / 5)]) + ' · ' + S.cl(S.cols[ai % 5])) + '</b> = ' + fmt(G[Math.floor(ai / 5)][ai % 5]) + '원' : '');
      }
    };
  };
})();
