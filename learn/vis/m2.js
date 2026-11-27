// ── M2 PER 개념 그림 (harness/PLUGIN.md) ─────────────────────
// m2Store : (map_what) 가게값 막대 = 한 해 이익 n칸. 칸 수가 PER. 정적
// m2Stack : (map_why) 순이익을 주식 수로 나눈 한 칸(EPS) → 그 칸을 PER개 쌓으면 주가. 슬라이더 PER
// m2Cost  : (qni) 손익 계단: 매출 − 변동비 − 고정비 = 영업이익. 슬라이더 판매량, 고정비 막대는 길이 그대로
// m2Look  : (qper) 시간축: 뒤(같은 회사의 과거 배수) / 옆(비슷한 회사의 지금 배수) → 지금 우리 회사 몇 배? 정적
// m2Zero  : (qlim) 시가총액 막대 안에 순이익 칸이 몇 번 들어가나 = PER. 순이익이 0에 가깝거나 적자면 PER이 뜻을 잃음
(function () {
  var L = window.CUR_LIB, esc = L.esc, fmt = L.fmt, clamp = L.clamp, wOf = L.wOf;
  var GOLD = '#E2C48F', NAVY = '#1C2C48', INK = '#F2EFE8', LINE = 'rgba(242,239,232,.35)', HAIR = 'rgba(242,239,232,.22)';
  L.addCss('cur-m2-font', "@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&display=swap');");
  L.addCss('cur-m2-css', [
    '.cur .vis svg.m2 text{font-family:"IBM Plex Sans","RFS Dotum UI",sans-serif;font-variant-numeric:tabular-nums;fill:#F2EFE8;font-size:13.5px}',
    '.cur .vis svg.m2 text.sm,.cur .vis svg.m2 tspan.sm{font-size:12.5px;fill:rgba(242,239,232,.74)}',
    '.cur .vis svg.m2 text.xs{font-size:11.5px;fill:rgba(242,239,232,.7)}',
    '.cur .vis svg.m2 text.dk{fill:#0D1829}',
    '.cur .vis svg.m2 text.big{font-family:"Noto Serif KR",serif;font-size:26px;font-weight:600}',
    '.cur .vis svg.m2 text.off{fill:rgba(242,239,232,.45);text-decoration:line-through}',
    '.cur .vis svg.m2 text.gd,.cur .vis svg.m2 tspan.gd{fill:#E2C48F}',
    '.cur .vis svg.m2 .pop{animation:curM2Pop .5s cubic-bezier(.2,.8,.2,1) both}',
    '@keyframes curM2Pop{from{opacity:0}to{opacity:1}}',
    '.cur .vis svg.m2 .mv{transition:all .25s cubic-bezier(.2,.8,.2,1)}',
    '.cur .m2c .vctl label{min-width:0}'
  ].join('\n'));

  function rect(x, y, w, h, fill, stroke, extra) { return '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + h + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '"' : '') + (extra || '') + '/>'; }
  function line(x1, y1, x2, y2, c, extra) { return '<line x1="' + x1.toFixed(1) + '" y1="' + y1 + '" x2="' + x2.toFixed(1) + '" y2="' + y2 + '" stroke="' + c + '"' + (extra || '') + '/>'; }
  function txt(x, y, s, cls, anchor, fit) { return '<text x="' + x.toFixed(1) + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : '') + (anchor ? ' text-anchor="' + anchor + '"' : '') + (fit ? ' data-fit="1"' : '') + '>' + s + '</text>'; }
  // 글자가 오른쪽 끝을 넘으면 안쪽으로 당긴다 (text-anchor start만)
  function fit(svg, w) {
    svg.querySelectorAll('text[data-fit]').forEach(function (t) {
      var n = 0; try { n = t.getComputedTextLength(); } catch (e) { return; }
      var x = +t.getAttribute('x'); if (x + n > w) t.setAttribute('x', Math.max(0, w - n).toFixed(1));
    });
  }
  function put(svg, w, h, o, aria) { svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o; svg.setAttribute('aria-label', aria); fit(svg, w); }
  function slide(inp, f) { inp.addEventListener('input', f); inp.addEventListener('keydown', function (e) { e.stopPropagation(); }); }
  function x1(v) { return String(Math.round(v * 10) / 10); }
  function fm(v) { return Math.abs(v - Math.round(v)) > 1e-9 ? x1(v) : fmt(v); }

  // ════ m2Store: 가게값 = 한 해 이익 × n ════
  window.CUR_VIS.m2Store = function (host, p, ctx) {
    var n = p.n || 10;
    host.innerHTML = '<svg class="m2" role="img"></svg>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg');
    ctx.ready(true);
    function draw() {
      var w = wOf(host), u = w / n, by = 80, bh = Math.round(clamp(w * 0.07, 44, 60)), o = '';
      // 위: 가게값 전체를 묶는 괄호
      o += txt(w / 2, 16, '가게값', '', 'middle') + txt(w / 2, 34, '주식에선 주가', 'sm', 'middle');
      o += '<path d="M0.5 60V50H' + (w - 0.5) + 'V60" fill="none" stroke="' + LINE + '"/>';
      // 막대: 한 해 이익 n칸, 하나씩 채워진다
      for (var i = 0; i < n; i++) {
        var first = i === 0;
        o += '<g class="pop" style="animation-delay:' + (150 + i * 90) + 'ms">' + rect(i * u + 1, by, u - 2, bh, first ? GOLD : NAVY, first ? null : 'rgba(242,239,232,.28)') +
          txt(i * u + u / 2, by + bh / 2 + 4, (i + 1) + (u > 44 ? '년' : ''), first ? 'xs dk' : 'xs', 'middle') + '</g>';
      }
      // 아래 왼쪽: 한 칸 = 한 해 이익
      o += line(u / 2, by + bh + 2, u / 2, by + bh + 30, GOLD);
      o += txt(0, by + bh + 50, '한 해 이익', '', '', true) + txt(0, by + bh + 70, '주식에선 EPS', 'sm', '', true);
      // 아래 오른쪽: 칸 수 = PER
      o += txt(w, by + bh + 52, n + '배', 'big gd', 'end') + txt(w, by + bh + 72, '이 칸 수가 PER', 'sm', 'end');
      put(svg, w, by + bh + 82, o, '가게값 막대가 한 해 이익 ' + n + '칸으로 채워져요. 칸 수 ' + n + '이 PER이에요. 주식에선 가게값이 주가, 한 해 이익이 EPS예요.');
    }
    return { draw: draw };
  };

  // ════ m2Stack: ÷ 주식 수 → EPS, × PER → 주가 ════
  window.CUR_VIS.m2Stack = function (host, p, ctx) {
    var S = p.slices || 30, lo = p.min || 3, hi = p.max || 25, per = p.per || 10;
    host.innerHTML = '<div class="m2c"><svg class="m2" role="img"></svg>' + L.sliderHtml('curM2per', '몇 해 치를 쳐 줄까요', lo, hi, 1, per, 'PER, 한 해 이익의 몇 해 치') + '<p class="vr" aria-live="polite"></p></div>';
    var svg = host.querySelector('svg'), inp = host.querySelector('input'), b = host.querySelector('.vctl b'), vr = host.querySelector('.vr');
    ctx.ready(true);
    function draw() {
      var w = wOf(host), u = w / S, o = '', len = per * u;
      // 1) 회사 전체 순이익을 주식 수만큼 나눈다
      o += txt(0, 16, '회사 전체 순이익') + txt(w, 16, '÷ 주식 수', 'sm', 'end');
      o += rect(0.5, 26, w - 1, 26, NAVY, 'rgba(242,239,232,.28)');
      for (var i = 1; i < S; i++) o += line(i * u, 26, i * u, 52, HAIR);
      o += rect(0.5, 26, u - 0.5, 26, GOLD);
      // 2) 한 칸 = EPS
      o += line(u / 2, 54, u / 2, 76, LINE, ' stroke-dasharray="3 3"');
      o += rect(0.5, 78, u - 0.5, 26, GOLD);
      o += line(u + 4, 91, u + 22, 91, LINE) + txt(u + 28, 89, 'EPS') + txt(u + 28, 106, '한 주 몫 이익', 'sm');
      // 3) EPS 칸을 PER개 쌓으면 주가
      o += txt(0, 136, '주가');
      o += rect(0.75, 146, len - 1.5, 40, 'rgba(226,196,143,.16)', GOLD, ' stroke-width="1.5" class="mv"');
      for (var k = 1; k < per; k++) o += line(k * u, 147, k * u, 185, 'rgba(226,196,143,.45)');
      o += '<path class="mv" d="M0.5 194V200H' + (len - 0.5).toFixed(1) + 'V194" fill="none" stroke="' + LINE + '"/>';
      var cx = clamp(len / 2, 34, w - 34);
      o += txt(cx, 230, per + '배', 'big', 'middle') + txt(cx, 249, 'PER', 'sm', 'middle');
      put(svg, w, 256, o, '순이익을 주식 수로 나눈 한 칸이 EPS. EPS ' + per + '칸을 이어 붙이면 주가, PER ' + per + '배.');
      b.textContent = per + '배';
      vr.innerHTML = per <= 6 ? '이익이 몇 해 못 갈 거라 보면 <b>' + per + '년 치</b>만 쳐 줘요.'
        : per >= 18 ? '이익이 오래 이어지고 늘 거라 믿으면 <b>' + per + '년 치</b>까지 쳐 줘요.'
          : '주가가 한 해 이익(EPS)의 <b>' + per + '년 치</b>인 셈이에요.';
    }
    slide(inp, function () { per = +inp.value; draw(); });
    return { draw: draw };
  };

  // ════ m2Cost: 손익 계단, 판매량 슬라이더 ════
  window.CUR_VIS.m2Cost = function (host, p, ctx) {
    var price = p.price, cr = p.cogs / 100, F = p.fixed, v0 = p.vol, v = p.vol, lo = p.min, hi = p.max, st = p.step || 0.5;
    host.innerHTML = '<div class="m2c"><svg class="m2" role="img"></svg>' + L.sliderHtml('curM2vol', '판매량', lo, hi, st, v, '판매량, 억 개') + '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '') + '</div>';
    var svg = host.querySelector('svg'), inp = host.querySelector('input'), b = host.querySelector('.vctl b'), vr = host.querySelector('.vr');
    ctx.ready(true);
    function calc(q) { var R = price * q, V = R * cr; return { R: R, V: V, P: R - V - F }; }
    function draw() {
      var w = wOf(host), c = calc(v), c0 = calc(v0), K = w / (price * hi), o = '', bh = w > 600 ? 30 : 24, gap = bh + 32, y0 = 22;
      var xs = [[0, c.R], [0, c.V], [c.V, c.V + F], [c.V + F, c.R]];
      var lab = ['매출', '변동비&#160; <tspan class="sm">판매량 따라</tspan>', '고정비&#160; <tspan class="sm">그대로</tspan>', '영업이익'], num = [c.R, c.V, F, c.P];
      xs.forEach(function (s, i) {
        var y = y0 + i * gap, a = s[0] * K, z = s[1] * K;
        o += txt(a, y, lab[i], '', '', true);
        var fill = i === 0 ? 'none' : i === 1 ? NAVY : i === 2 ? 'rgba(242,239,232,.10)' : GOLD;
        var stroke = i === 0 ? 'rgba(242,239,232,.6)' : i === 3 ? null : 'rgba(242,239,232,.35)';
        o += rect(a + 0.5, y + 8, z - a - 1, bh, fill, stroke, ' class="mv"');
        var ns = fmt(num[i]) + '억', inside = z - a > ns.length * 8 + 16;
        o += txt(inside ? z - 8 : z + 6, y + 8 + bh / 2 + 5, ns, i === 3 ? (inside ? 'dk' : 'gd') : '', inside ? 'end' : '', !inside);
        if (i < 3) { var xe = i === 0 ? 0 : z; o += line(Math.max(0.5, xe), y + 8 + bh, Math.max(0.5, xe), y + gap - 10, HAIR, ' stroke-dasharray="2 3"'); }
      });
      put(svg, w, y0 + 3 * gap + bh + 14, o, '매출 ' + fmt(c.R) + '억에서 변동비 ' + fmt(c.V) + '억, 고정비 ' + fmt(F) + '억을 빼면 영업이익 ' + fmt(c.P) + '억');
      b.textContent = x1(v) + '억 개';
      if (Math.abs(v - v0) < 1e-9) vr.innerHTML = '판매량을 움직여도 고정비 막대는 그대로예요.';
      else {
        var dq = (v / v0 - 1) * 100, dp = (c.P / c0.P - 1) * 100, sg = function (x) { return (x > 0 ? '+' : '−') + Math.round(Math.abs(x)) + '%'; };
        vr.innerHTML = '고정비가 그대로라 판매량 <b>' + sg(dq) + '</b>에 영업이익은 <b>' + sg(dp) + '</b>예요.';
      }
    }
    slide(inp, function () { v = +inp.value; draw(); });
    return { draw: draw };
  };

  // ════ m2Look: 뒤(Historical) / 옆(Peer) ════
  window.CUR_VIS.m2Look = function (host, p, ctx) {
    host.innerHTML = '<svg class="m2" role="img"></svg>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg');
    ctx.ready(true);
    var HIST = [0.55, 0.42, 0.5, 0.3, 0.38, 0.62, 0.48, 0.4, 0.52], PEER = [0.16, 0.33, 0.5, 0.67, 0.84];
    function draw() {
      var w = wOf(host), top = 66, bot = 66 + Math.round(clamp(w * 0.24, 130, 190)), Y = function (f) { return top + (bot - top) * f; }, o = '';
      var hx = function (i) { return w * 0.56 * i / (HIST.length - 1); }, nx = w * 0.66, px = w * 0.86, my = Y(0.5);
      // 축
      o += line(0, bot + 6, w, bot + 6, HAIR) + txt(0, top - 6, 'PER ↑', 'xs');
      o += rect(nx - 18, top - 4, px - nx + 36, bot - top + 10, 'rgba(242,239,232,.05)');
      o += txt(0, bot + 24, '과거', 'xs') + txt((nx + px) / 2, bot + 24, '지금', 'xs', 'middle');
      // 뒤: 같은 회사의 과거 배수
      o += '<path d="' + HIST.map(function (f, i) { return (i ? 'L' : 'M') + hx(i).toFixed(1) + ' ' + Y(f).toFixed(1); }).join('') + '" fill="none" stroke="' + INK + '" stroke-opacity=".8" stroke-width="1.8" stroke-linejoin="round"/>';
      o += txt(0, 16, '뒤를 봐요&#160; <tspan class="sm">Historical PER</tspan>', '', '', true) + txt(0, 35, '같은 회사가 예전에 받던 배수', 'sm', '', true);
      o += line(hx(3), 42, hx(3), Y(HIST[3]) - 6, LINE);
      o += line(hx(HIST.length - 1) + 6, Y(HIST[HIST.length - 1]), nx - 14, my, LINE, ' stroke-dasharray="2 4"');
      // 옆: 비슷한 회사들의 지금 배수
      PEER.forEach(function (f) { o += '<circle cx="' + px.toFixed(1) + '" cy="' + Y(f).toFixed(1) + '" r="5" fill="none" stroke="' + INK + '" stroke-opacity=".75"/>'; });
      o += line(px - 10, my, nx + 14, my, LINE, ' stroke-dasharray="2 4"');
      o += line(px, Y(PEER[PEER.length - 1]) + 8, px, bot + 36, LINE);
      o += txt(w, bot + 52, '옆을 봐요&#160; <tspan class="sm">Peer PER</tspan>', '', 'end') + txt(w, bot + 71, '비슷한 회사가 지금 받는 배수', 'sm', 'end');
      // 지금 우리 회사: 몇 배?
      o += '<circle cx="' + nx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="8" fill="' + GOLD + '"/>' + txt(nx, my - 16, '?', 'big gd', 'middle');
      put(svg, w, bot + 80, o, '시간축. 왼쪽은 같은 회사가 과거에 받던 PER(Historical), 오른쪽은 비슷한 회사들이 지금 받는 PER(Peer). 둘을 보고 지금 우리 회사에 줄 배수를 골라요.');
    }
    return { draw: draw };
  };

  // ════ m2Zero: 시가총액 안에 순이익이 몇 번 들어가나 ════
  window.CUR_VIS.m2Zero = function (host, p, ctx) {
    var cap = p.mcap, vals = p.vals, i = p.start != null ? p.start : vals.length - 2;
    host.innerHTML = '<div class="m2c"><svg class="m2" role="img"></svg>' + L.sliderHtml('curM2ni', '순이익', 0, vals.length - 1, 1, i, '순이익, 억 원') + '<p class="vr" aria-live="polite"></p></div>';
    var svg = host.querySelector('svg'), inp = host.querySelector('input'), b = host.querySelector('.vctl b'), vr = host.querySelector('.vr');
    ctx.ready(true);
    function draw() {
      var w = wOf(host), ni = vals[i], per = cap / ni, x0 = 28, W = w - x0, u = Math.abs(ni) / cap * W, o = '';
      o += '<defs><pattern id="curM2h" width="3" height="6" patternUnits="userSpaceOnUse"><rect width="1" height="6" fill="rgba(226,196,143,.5)"/></pattern></defs>';
      o += txt(x0, 16, '시가총액') + txt(w, 16, fmt(cap) + '억', '', 'end');
      o += rect(x0 + 0.5, 26, W - 1, 40, 'none', 'rgba(242,239,232,.6)');
      if (ni > 0) {
        if (u >= 3) for (var k = 1; k * u < W - 0.5; k++) o += line(x0 + k * u, 27, x0 + k * u, 65, 'rgba(226,196,143,.45)');
        else o += rect(x0 + 1, 27, W - 2, 38, 'url(#curM2h)');
        o += rect(x0 + 0.5, 26, Math.max(1, u), 40, GOLD);
      }
      // 순이익 한 칸 (0 기준선 왼쪽은 적자)
      o += line(x0, 84, x0, 132, LINE) + txt(x0, 148, '0', 'xs', 'middle');
      if (ni > 0) o += rect(x0 + 0.5, 96, Math.max(1, u), 24, GOLD, null, ' class="mv"');
      else o += rect(x0 - u, 96, u, 24, 'none', GOLD, ' stroke-dasharray="3 2"');
      var lx = ni > 0 ? x0 + Math.max(1, u) + 8 : x0 + 8;
      o += txt(lx, 107, (ni < 0 ? '−' : '') + fm(Math.abs(ni)) + '억', '', '', true) + txt(lx, 125, '순이익', 'sm', '', true);
      // 읽기: 몇 번 들어가나
      var big = ni < 0 ? '−' + fmt(Math.abs(per)) + '배' : fmt(per) + '배';
      o += txt(x0, 186, big, ni < 0 ? 'big off' : 'big', '')  + txt(x0, 206, 'PER = ' + fmt(cap) + ' ÷ ' + (ni < 0 ? '−' : '') + fm(Math.abs(ni)), 'sm', '', true);
      put(svg, w, 214, o, '시가총액 ' + fmt(cap) + '억, 순이익 ' + ni + '억, PER ' + x1(per) + '배');
      b.textContent = (ni < 0 ? '−' : '') + fm(Math.abs(ni)) + '억';
      vr.innerHTML = ni < 0 ? '적자면 음수 배수라 뜻을 읽기 어려워요.'
        : per >= 300 ? '순이익이 0에 가까우면 PER이 <b>' + fmt(per) + '배</b>까지 튀어요.'
          : per >= 50 ? '이익이 작아질수록 PER이 빠르게 커져요.'
            : '이익이 안정적이면 PER이 회사 값을 잘 보여 줘요.';
    }
    slide(inp, function () { i = +inp.value; draw(); });
    return { draw: draw };
  };
})();
