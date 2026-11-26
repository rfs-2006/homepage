// ── M4 EV와 EV/EBITDA 개념 그림 (harness/PLUGIN.md) ─────────────
// 박스 대신 비례 막대 + 선을 끌어 붙인 직접 주석. 강조색(금색)은 화면마다 한 곳.
// m4Buy  (정적) 회사를 통째로 사는 값: 시가총액 + 같이 떠안는 빚 = EV. params { mc, nd }
// m4Pair (슬라이더) EV 다리: 시가총액 + 차입금 − 현금 − 비영업자산 = EV, ÷ EBITDA.
//        비영업자산을 늘리면 시가총액도 그만큼 오르고(시장이 그 자산 값을 쳐 줌) EBITDA는 그대로.
//        params { op(시가총액 중 영업 몫), debt, cash, noa, ebitda, max, step }
// m4Lev  (슬라이더) 같은 영업, 빚 구조만 바꾸기: EV/EBITDA는 그대로, PER은 흔들림.
//        params { ev, ebitda, da, nonop, rate(%), tax(%), nd, max, step }
// m4Dep  (정적) 시간축: 0년 차 설비 현금 지출 vs 해마다 나눠 잡는 상각비. params { capex, years, hl }
(function () {
  var L = window.CUR_LIB, esc = L.esc, fmt = L.fmt;
  var INK = '#F2EFE8', GOLD = '#E2C48F', NAVY = '#1C2C48', BG = '#0B1526';
  if (!document.getElementById('cur-m4-font')) {
    var fl = document.createElement('link'); fl.id = 'cur-m4-font'; fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&display=swap';
    document.head.appendChild(fl);
  }
  L.addCss('cur-m4-css', [
    '.cur .vis .m4v svg{max-width:540px}',
    '.cur .vis .m4v text{font-family:"IBM Plex Sans","RFS Dotum UI",sans-serif;fill:#F2EFE8;font-size:13px;font-variant-numeric:tabular-nums}',
    '.cur .vis .m4v text.n{font-size:15px;font-weight:500}',
    '.cur .vis .m4v text.s,.cur .vis .m4v tspan.s{font-size:12px;fill-opacity:.72}',
    '.cur .vis .m4v text.b{font-family:"Noto Serif KR",serif;font-size:24px;font-weight:600}',
    '.cur .vis .m4v text.g{fill:#E2C48F}',
    '.cur .vis .m4v rect,.cur .vis .m4v line,.cur .vis .m4v path{transition:all .25s ease}',
    '.cur .vis .m4v .vctl label{min-width:0}',
    '@media (max-width:520px){.cur .vis .m4v text{font-size:14px}.cur .vis .m4v text.n{font-size:16px}.cur .vis .m4v text.s,.cur .vis .m4v tspan.s{font-size:13px}.cur .vis .m4v text.b{font-size:26px}}'
  ].join('\n'));

  function T(x, y, s, cls, anc) { return '<text x="' + r1(x) + '" y="' + r1(y) + '"' + (cls ? ' class="' + cls + '"' : '') + (anc ? ' text-anchor="' + anc + '"' : '') + '>' + s + '</text>'; }
  function Ln(x1, y1, x2, y2, st, ex) { return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '" stroke="' + st + '"' + (ex || '') + '/>'; }
  function Rc(x, y, w, h, fill, st, ex) { return '<rect x="' + r1(x) + '" y="' + r1(y) + '" width="' + r1(w) + '" height="' + r1(Math.max(0, h)) + '" fill="' + fill + '"' + (st ? ' stroke="' + st + '"' : '') + (ex || '') + '/>'; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, ''); }
  function hair(a) { return 'rgba(242,239,232,' + a + ')'; }
  function slider(id, label, min, max, step, val) {
    return '<div class="vctl"><label for="' + id + '">' + esc(label) + ' <b></b></label><input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" aria-label="' + esc(label) + '"></div>';
  }
  function keys(inp) { inp.addEventListener('keydown', function (e) { e.stopPropagation(); }); }

  // ════ m4Buy: 통째로 사는 값 ════
  window.CUR_VIS.m4Buy = function (host, p, ctx) {
    var mc = p.mc, nd = p.nd, ev = mc + nd;
    host.innerHTML = '<div class="m4v"><svg viewBox="0 0 440 300" role="img"></svg>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '') + '</div>';
    var svg = host.querySelector('svg');
    function draw() {
      var base = 284, top = 30, k = (base - top) / ev, x = 150, w = 92, yM = base - mc * k, o = '';
      // 막대: 아래 시가총액(옅은 남색), 위 떠안는 빚(흰 선)
      o += Rc(x, yM, w, mc * k, NAVY, hair(.3));
      o += Rc(x, top, w, nd * k, 'rgba(242,239,232,.06)', hair(.55), ' stroke-dasharray="4 3"');
      o += Ln(x, yM, x + w, yM, BG, ' stroke-width="2"');
      // 왼쪽: 금색 꺾쇠 = EV 전체
      var bx = x - 16;
      o += Ln(bx + 8, top, bx, top, GOLD) + Ln(bx, top, bx, base, GOLD, ' stroke-width="1.5"') + Ln(bx, base, bx + 8, base, GOLD);
      var my = (top + base) / 2;
      o += T(bx - 10, my - 18, fmt(ev), 'b g', 'end') + T(bx - 10, my + 6, 'EV', 'n g', 'end') + T(bx - 10, my + 26, '통째로 사는 값', 's', 'end');
      // 오른쪽: 선을 끌어 바로 쓴 주석
      var ax = x + w, tx = ax + 44, yd = top + nd * k / 2, ym = yM + mc * k / 2;
      o += Ln(ax, yd, ax + 34, yd, hair(.45)) + T(tx, yd - 6, fmt(nd), 'n') + T(tx, yd + 14, '같이 떠안는 빚', '');
      o += Ln(ax, ym, ax + 34, ym, hair(.45)) + T(tx, ym - 6, fmt(mc), 'n') + T(tx, ym + 14, '시가총액', '') + T(tx, ym + 32, '주식 전부 값', 's');
      svg.innerHTML = o;
      svg.setAttribute('aria-label', '시가총액 ' + fmt(mc) + '에 같이 떠안는 빚 ' + fmt(nd) + '을 더하면 EV ' + fmt(ev));
    }
    return { draw: draw };
  };

  // ════ m4Pair: EV 다리 + EBITDA 짝 ════
  window.CUR_VIS.m4Pair = function (host, p, ctx) {
    var v = { noa: p.noa };
    host.innerHTML = '<div class="m4v"><svg viewBox="0 0 440 330" role="img"></svg>' + slider('curM4pN', '비영업자산', 0, p.max || 1200, p.step || 100, v.noa) +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '') + '</div>';
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr'), inp = host.querySelector('input'), lb = host.querySelector('.vctl b');
    function draw() {
      var noa = v.noa, mc = p.op + noa, ev = mc + p.debt - p.cash - noa, raw = mc + p.debt - p.cash, m = ev / p.ebitda, mr = raw / p.ebitda;
      var MAX = p.op + (p.max || 1200) + p.debt, base = 262, top = 70, k = (base - top) / MAX, o = '';
      var Y = function (val) { return base - val * k; };
      var cw = 44, xs = [6, 70, 134, 198, 268, 346];
      o += Ln(0, base, 440, base, hair(.25));
      // 1 시가총액
      o += Rc(xs[0], Y(mc), cw, mc * k, NAVY, hair(.3));
      // 2 + 차입금 (떠 있는 막대)
      o += Rc(xs[1], Y(mc + p.debt), cw, p.debt * k, 'rgba(242,239,232,.10)', hair(.5));
      // 3 − 현금
      o += Rc(xs[2], Y(raw + p.cash), cw, p.cash * k, 'none', hair(.5), ' stroke-dasharray="4 3"');
      // 4 − 비영업자산 (움직이는 칸)
      o += Rc(xs[3], Y(raw), cw, noa * k, 'none', hair(.5), ' stroke-dasharray="4 3"');
      // 5 EV (금색)
      o += Rc(xs[4], Y(ev), cw, ev * k, GOLD);
      // 6 EBITDA
      o += Rc(xs[5], Y(p.ebitda), cw, p.ebitda * k, NAVY, hair(.55));
      // 계단 잇는 선
      [[0, mc + 0], [1, mc + p.debt], [2, raw], [3, ev]].forEach(function (c) { o += Ln(xs[c[0]] + cw, Y(c[1]), xs[c[0] + 1], Y(c[1]), hair(.28), ' stroke-dasharray="2 3"'); });
      // 아래 이름·숫자
      var L1 = ['시가총액', '+ 차입금', '− 현금', '− 비영업', 'EV', 'EBITDA'], L2 = [fmt(mc), fmt(p.debt), fmt(p.cash), fmt(noa), fmt(ev), fmt(p.ebitda)];
      xs.forEach(function (x, i) { o += T(x + cw / 2, base + 20, L1[i], i === 4 ? 'g' : '', 'middle') + T(x + cw / 2, base + 40, L2[i], 'n' + (i === 4 ? ' g' : ''), 'middle'); });
      // 위: 더하는 이유 / 빼는 이유 (선을 끌어 바로)
      var yDebt = Y(mc + p.debt);
      o += Ln(xs[1] + cw / 2, yDebt - 4, xs[1] + cw / 2, 34, hair(.4)) + T(xs[1] + cw / 2 - 2, 26, '같이 떠안는 빚', 's', 'middle');
      var yNoa = Y(raw) - 4;
      o += Ln(xs[3] + cw / 2, yNoa, xs[3] + cw / 2, 58, hair(.4)) + T(xs[3] + cw / 2 + 4, 34, 'EBITDA를', 's', 'middle') + T(xs[3] + cw / 2 + 4, 50, '안 만드는 자산', 's', 'middle');
      // EV ÷ EBITDA = 배수
      var xr = xs[5] + cw / 2, yE = Y(ev);
      o += Ln(xs[4] + cw, yE, xs[5] + cw + 6, yE, GOLD, ' stroke-dasharray="3 3"') + Ln(xs[5] + cw + 6, yE, xs[5] + cw + 6, base, GOLD);
      o += T(xr + 4, 40, f1(m) + '배', 'b g', 'middle') + T(xr + 4, 60, 'EV ÷ EBITDA', 's', 'middle');
      if (noa > 0) {
        var yR = Y(raw);
        o += Ln(xs[4] - 6, yR, xs[4] + cw + 6, yR, hair(.55), ' stroke-dasharray="4 3"') + T(xs[4] + cw / 2, yR - 8, '안 빼면 ' + f1(mr) + '배', 's', 'middle');
      }
      svg.innerHTML = o;
      svg.setAttribute('aria-label', '시가총액 ' + fmt(mc) + ' + 차입금 ' + fmt(p.debt) + ' − 현금 ' + fmt(p.cash) + ' − 비영업자산 ' + fmt(noa) + ' = EV ' + fmt(ev) + ', EBITDA ' + fmt(p.ebitda) + '로 나누면 ' + f1(m) + '배');
      lb.textContent = fmt(noa);
      vr.innerHTML = noa > 0 ? '비영업자산을 빼지 않으면 EV/EBITDA가 <b>' + f1(mr) + '배</b>로 부풀어요.' : '뺄 자산이 없으면 두 값이 같아요.';
    }
    inp.addEventListener('input', function () { v.noa = +inp.value; draw(); });
    keys(inp);
    ctx.ready(true);
    return { draw: draw };
  };

  // ════ m4Lev: 빚 구조만 바꾸기 ════
  window.CUR_VIS.m4Lev = function (host, p, ctx) {
    var v = { nd: p.nd };
    host.innerHTML = '<div class="m4v"><svg viewBox="0 0 440 320" role="img"></svg>' + slider('curM4lD', '빚(순차입금)', 0, p.max || 1600, p.step || 100, v.nd) +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '') + '</div>';
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr'), inp = host.querySelector('input'), lb = host.querySelector('.vctl b');
    function calc(nd) { var it = nd * p.rate / 100, ni = (p.ebitda - p.da - it + p.nonop) * (1 - p.tax / 100), mc = p.ev - nd; return { it: it, ni: ni, mc: mc, per: mc / ni, evm: p.ev / p.ebitda }; }
    function draw() {
      var c = calc(v.nd), base = 256, top = 92, k = (base - top) / p.ev, o = '', Y = function (x) { return base - x * k; };
      var w = 70, w2 = 40, xA = 18, xB = xA + w + 22, xC = 248, xD = xC + w + 22;
      o += Ln(0, base, 440, base, hair(.25));
      // 왼쪽: EV = 시가총액 + 순차입금, 옆에 EBITDA
      o += Rc(xA, Y(c.mc), w, c.mc * k, NAVY, hair(.3));
      if (v.nd > 0) o += Rc(xA, Y(p.ev), w, v.nd * k, 'rgba(242,239,232,.06)', hair(.55), ' stroke-dasharray="4 3"');
      o += Ln(xA, Y(c.mc), xA + w, Y(c.mc), BG, ' stroke-width="2"');
      o += Rc(xB, Y(p.ebitda), w2, p.ebitda * k, NAVY, hair(.55));
      // 오른쪽: 시가총액, 옆에 순이익
      o += Rc(xC, Y(c.mc), w, c.mc * k, NAVY, hair(.3));
      o += Rc(xD, Y(Math.max(c.ni, 0)), w2, Math.max(c.ni, 0) * k, NAVY, hair(.55));
      // 같은 시가총액을 잇는 선
      o += Ln(xA + w, Y(c.mc), xC, Y(c.mc), hair(.3), ' stroke-dasharray="2 4"');
      // 막대 안 숫자
      if (v.nd >= 300) o += T(xA + w / 2, Y(p.ev) + v.nd * k / 2 + 5, fmt(v.nd), 's', 'middle');
      if (c.mc * k > 26) { o += T(xA + w / 2, Y(c.mc) + 20, fmt(c.mc), 'n', 'middle'); o += T(xC + w / 2, Y(c.mc) + 20, fmt(c.mc), 'n', 'middle'); }
      // 아래 이름
      o += T(xB + w2 / 2, Y(p.ebitda) - 8, fmt(p.ebitda), 'n', 'middle') + T(xD + w2 / 2, Y(Math.max(c.ni, 0)) - 8, f1(c.ni), 'n', 'middle');
      o += T(xA + w / 2, base + 20, 'EV', '', 'middle') + T(xA + w / 2, base + 38, '시가총액 + 빚', 's', 'middle') + T(xB + w2 / 2, base + 20, 'EBITDA', '', 'middle');
      o += T(xC + w / 2, base + 20, '시가총액', '', 'middle') + T(xD + w2 / 2, base + 20, '순이익', '', 'middle');
      // 위: 배수 (금색은 그대로인 EV/EBITDA 하나)
      o += T(xA, 28, f1(c.evm) + '배', 'b g') + T(xA, 48, 'EV/EBITDA', '') + T(xA, 65, '= ' + fmt(p.ev) + ' ÷ ' + fmt(p.ebitda), 's');
      o += T(xC, 28, f1(c.per) + '배', 'b') + T(xC, 48, 'PER', '') + T(xC, 65, '= ' + fmt(c.mc) + ' ÷ ' + f1(c.ni), 's');
      svg.innerHTML = o;
      svg.setAttribute('aria-label', '빚 ' + fmt(v.nd) + '일 때 EV/EBITDA ' + f1(c.evm) + '배, PER ' + f1(c.per) + '배');
      lb.textContent = fmt(v.nd);
      vr.innerHTML = v.nd > 0 ? '빚이 ' + fmt(v.nd) + '이면 이자 ' + f1(c.it) + '만큼 순이익이 줄어 PER만 <b>' + f1(c.per) + '배</b>로 바뀌어요.' : '빚이 없으면 EV와 시가총액이 같아요.';
    }
    inp.addEventListener('input', function () { v.nd = +inp.value; draw(); });
    keys(inp);
    ctx.ready(true);
    return { draw: draw };
  };

  // ════ m4Dep: 시간축 — 현금은 한 번, 비용은 나눠서 ════
  window.CUR_VIS.m4Dep = function (host, p, ctx) {
    var C = p.capex, n = p.years, d = C / n, hl = p.hl || 4;
    host.innerHTML = '<div class="m4v"><svg viewBox="0 0 440 290" role="img"></svg>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '') + '</div>';
    var svg = host.querySelector('svg');
    function draw() {
      var axY = 118, k = 0.4, x0 = 104, step = 62, bw = 30, o = '';
      // 줄 이름 (왼쪽)
      o += T(0, axY - 40, '비용', 'n') + T(0, axY - 22, '손익계산서', 's');
      o += T(0, axY + 30, '현금', 'n') + T(0, axY + 48, '나간 돈', 's');
      o += Ln(x0 - 24, axY, 440, axY, hair(.4));
      for (var i = 0; i <= n; i++) {
        var cx = x0 + i * step;
        if (i === 0) {
          o += T(cx, axY - 8, '0년', 's', 'middle');
          o += Rc(cx - bw / 2, axY, bw, C * k, NAVY, hair(.5));
        } else {
          var gold = i === hl;
          o += Rc(cx - bw / 2, axY - d * k, bw, d * k, gold ? GOLD : 'rgba(242,239,232,.10)', gold ? null : hair(.5));
          o += T(cx, axY + 18, i + '년', 's', 'middle') + T(cx, axY + 40, '0', 'n', 'middle');
        }
      }
      // 0년 차 현금 주석 (막대 아래쪽에서 선을 끌어)
      var yb = axY + 104;
      o += Ln(x0 + bw / 2, yb, x0 + 44, yb, hair(.45)) + T(x0 + 52, yb + 5, fmt(C), 'n') + T(x0 + 52, yb + 24, '설비 살 때 한 번에', '');
      // 다섯 해 꺾쇠 = 합치면 처음 낸 돈
      var xa = x0 + step - bw / 2, xb = x0 + n * step + bw / 2, yt = axY - d * k - 12;
      o += Ln(xa, yt + 6, xa, yt, hair(.5)) + Ln(xa, yt, xb, yt, hair(.5)) + Ln(xb, yt, xb, yt + 6, hair(.5));
      o += T((xa + xb) / 2, yt - 8, '해마다 ' + fmt(d), 's', 'middle');
      // 금색: 올해 상각비 — 비용이지만 현금은 0
      var hx = Math.min(x0 + hl * step, 440 - 92);
      o += Ln(x0 + hl * step, axY + 48, x0 + hl * step, axY + 62, GOLD) + T(hx, axY + 80, '상각비', 'g', 'middle');
      o += T(hx, axY + 98, 'EBITDA는 빼기 전 이익', 's', 'middle');
      svg.innerHTML = o;
      svg.setAttribute('aria-label', '0년 차에 설비값 ' + fmt(C) + '이 현금으로 나가고, 1~' + n + '년 차에는 상각비 ' + fmt(d) + '씩 비용만 잡히고 현금은 나가지 않아요');
    }
    return { draw: draw };
  };
})();
