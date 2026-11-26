// ── M1 기업 읽기 개념 그림 부품 (harness/PLUGIN.md) ─────────────────
// m1Split   : 정적 비례 막대. 순이익 하나를 '해마다 나는 몫'과 '한 번 생긴 몫'으로 쪼개고 숫자·뜻을 선으로 끌어 옆에 쓴다
// m1Mult    : 움직여 보기. PER 슬라이더 → 정상 이익 × PER 막대와 순이익 그대로 × PER 막대, 그 차이(부풀린 가치)가 같이 변한다
// m1Buyback : 움직여 보기. 주가 슬라이더 → 같은 현금으로 사서 소각하는 주식 수(점선 면적 = 쓴 현금)와 남은 한 주의 가치
// m1CashGap : 정적 가로 계단. 영업이익(참고) / 영업활동현금 → CAPEX → FCF. 이익은 났는데 현금은 모자란 걸 길이로
(function () {
  var L = window.CUR_LIB, esc = L.esc, fmt = L.fmt, clamp = L.clamp;
  if (!document.getElementById('cur-plex-font')) {
    var lk = document.createElement('link'); lk.id = 'cur-plex-font'; lk.rel = 'stylesheet';
    lk.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&display=swap'; document.head.appendChild(lk);
  }
  var INK = '#F2EFE8', GOLD = '#E2C48F', NAVY = '#1C2C48', HAIR = 'rgba(242,239,232,.28)', FAINT = 'rgba(242,239,232,.18)', BG = '#0B1526';
  L.addCss('cur-m1-css', [
    '.cur .m1v svg{display:block;width:100%;max-width:520px;height:auto;overflow:visible}',
    '.cur .m1v svg text{font-family:"IBM Plex Sans","RFS Dotum UI",sans-serif;font-variant-numeric:tabular-nums;fill:#F2EFE8;font-size:13px}',
    '.cur .m1v svg text.s{font-size:12px;fill:rgba(242,239,232,.72)}',
    '.cur .m1v svg text.m{font-size:15px;font-weight:500}',
    '.cur .m1v svg text.b{font-family:"Noto Serif KR",serif;font-weight:600;font-size:23px;letter-spacing:-.01em}',
    '.cur .m1v svg text.g{fill:#E2C48F}',
    '.cur .m1v svg .gr{transform-box:fill-box;transform-origin:50% 100%;animation:m1Grow .9s cubic-bezier(.2,.8,.2,1) both}',
    '.cur .m1v svg .gx{transform-box:fill-box;transform-origin:0 50%;animation:m1GrowX .8s cubic-bezier(.2,.8,.2,1) both}',
    '.cur .m1v svg .fd{animation:m1Fade .6s ease .5s both}',
    '@keyframes m1Grow{from{transform:scaleY(0)}}@keyframes m1GrowX{from{transform:scaleX(0)}}@keyframes m1Fade{from{opacity:0}}',
    '@media (max-width:600px){.cur .m1v svg text{font-size:15px}.cur .m1v svg text.s{font-size:14px}.cur .m1v svg text.m{font-size:17px}}',
    '.cur .m1v .vctl label b{font-family:"IBM Plex Sans","RFS Dotum UI",sans-serif;font-weight:500;font-size:18px}',
    '.cur .m1v .vr b{color:#E2C48F;font-weight:500}',
    '.cur .m1v .vcap{color:var(--t3)}',
    '@media (prefers-reduced-motion:reduce){.cur .m1v svg .gr,.cur .m1v svg .gx,.cur .m1v svg .fd{animation:none}}'
  ].join('\n'));

  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function sg(x) { return (x < 0 ? '−' : '+') + fmt(Math.abs(x)); }
  function t(x, y, s, cls, anchor) { return '<text x="' + x + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : '') + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(s) + '</text>'; }
  function ln(x1, y1, x2, y2, c, extra) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '"' + (extra || '') + '/>'; }
  function rc(x, y, w, h, fill, extra) { return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function shares(x) { return x >= 1 - 1e-9 && Math.abs(x - Math.round(x)) < 1e-9 ? fmt(Math.round(x)) + '억 주' : fmt(Math.round(x * 10000)) + '만 주'; }

  // ════ m1Split ════ params: { head, parts:[{v, t, d, hl, dash}] (위에서 아래로), cap }
  window.CUR_VIS.m1Split = function (host, p) {
    host.classList.add('m1v');
    var top = 44, bot = 286, x0 = 30, bw = 92, lx = x0 + bw + 46, parts = p.parts || [];
    var tot = parts.reduce(function (a, b) { return a + b.v; }, 0), y = top, o = t(x0, 24, p.head || '', 'm');
    parts.forEach(function (q, i) {
      var h = (bot - top) * q.v / tot, mid = y + h / 2;
      o += rc(x0, y, bw, h, q.hl ? GOLD : NAVY, ' class="gr" style="animation-delay:' + (i * 120) + 'ms"' + (q.hl ? '' : ' stroke="' + (q.dash ? 'rgba(242,239,232,.55)' : HAIR) + '"' + (q.dash ? ' stroke-dasharray="4 3"' : '')));
      if (i) o += ln(x0, y, x0 + bw, y, BG, ' stroke-width="2"');
      o += '<g class="fd">' + ln(x0 + bw, mid, lx - 8, mid, q.hl ? GOLD : 'rgba(242,239,232,.35)') +
        t(lx, mid - 4, fmt(q.v), 'b' + (q.hl ? ' g' : '')) + t(lx, mid + 19, q.t || '') + (q.d ? t(lx, mid + 39, q.d, 's') : '') + '</g>';
      y += h;
    });
    host.innerHTML = '<svg viewBox="0 0 420 312" role="img" aria-label="' + esc(p.aria || ((p.head || '') + ': ' + parts.map(function (q) { return q.t + ' ' + fmt(q.v); }).join(', '))) + '">' + o + '</svg>' +
      (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    return { draw: function () {} };
  };

  // ════ m1Mult ════ params: { e, raw, k(표시 단위 환산), u, per, min, max, step, nT, rT, cap }
  window.CUR_VIS.m1Mult = function (host, p, ctx) {
    host.classList.add('m1v');
    var k = p.k == null ? 1 : p.k, u = p.u || '', e = p.e * k, raw = p.raw * k, one = raw - e, per = p.per || 10, mx = p.max || 25;
    host.innerHTML = '<svg viewBox="0 0 420 304" role="img"></svg>' + L.sliderHtml('curM1Per', 'PER', p.min || 5, mx, p.step || 1, per, 'PER(배)') +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr'), sl = host.querySelector('#curM1Per');
    var base = 262, hmax = 206, sc = hmax / (raw * mx), x1 = 40, x2 = 168, bw = 80;
    function draw() {
      var v1 = e * per, v2 = raw * per, vg = one * per, h1 = v1 * sc, h2 = v2 * sc, y1 = base - h1, y2 = base - h2, o = '';
      o += ln(16, base, 404, base, FAINT);
      // 정상 이익 × PER
      o += rc(x1, y1, bw, h1, GOLD) + t(x1 + bw / 2, y1 - 8, fmt(Math.round(v1)) + u, 'g', 'middle');
      // 순이익 그대로 × PER : 아래는 같은 몫, 위는 한 번 생긴 몫이 배수만큼 불어난 부분
      o += rc(x2, y1, bw, h1, NAVY, ' stroke="' + HAIR + '"') + rc(x2, y2, bw, h2 - h1, 'rgba(242,239,232,.06)', ' stroke="rgba(242,239,232,.55)" stroke-dasharray="4 3"');
      o += ln(x1 + bw, y1, x2, y1, 'rgba(242,239,232,.3)', ' stroke-dasharray="2 3"');
      o += t(x2 + bw / 2, y2 - 8, fmt(Math.round(v2)) + u, '', 'middle');
      // 차이 괄호 + 직접 주석
      var bx = x2 + bw + 10, ty = clamp((y1 + y2) / 2, 64, base - 52);
      o += ln(bx - 6, y2, bx, y2, INK) + ln(bx, y2, bx, y1, INK) + ln(bx - 6, y1, bx, y1, INK);
      o += t(bx + 12, ty, '+' + fmt(Math.round(vg)) + u, 'b') + t(bx + 12, ty + 23, '부풀린 가치') + t(bx + 12, ty + 42, f1(one) + u + ' × ' + per + '배', 's');
      // 막대 아래 식
      o += t(x1, base + 20, p.nT || '정상 이익') + t(x1, base + 38, f1(e) + u + ' × ' + per + '배', 's');
      o += t(x2, base + 20, p.rT || '순이익 그대로') + t(x2, base + 38, f1(raw) + u + ' × ' + per + '배', 's');
      svg.innerHTML = o;
      svg.setAttribute('aria-label', 'PER ' + per + '배: ' + (p.nT || '정상 이익') + '으로 매긴 가치 ' + fmt(Math.round(v1)) + u + ', ' + (p.rT || '순이익 그대로') + ' 쓴 가치 ' + fmt(Math.round(v2)) + u + ', 차이 ' + fmt(Math.round(vg)) + u);
      host.querySelector('.vctl b').textContent = per + '배';
      vr.innerHTML = 'PER ' + per + '배면 한 번 생긴 ' + f1(one) + esc(u) + '도 <b>' + fmt(Math.round(vg)) + esc(u) + '</b>으로 불어나요.';
    }
    sl.oninput = function () { per = +sl.value; draw(); };
    sl.addEventListener('keydown', function (ev) { ev.stopPropagation(); });
    ctx.ready(true);
    return { draw: draw };
  };

  // ════ m1Buyback ════ params: { value(억 원), cash(억 원), shares(억 주), price(원), min, max, step, cap }
  window.CUR_VIS.m1Buyback = function (host, p, ctx) {
    host.classList.add('m1v');
    var V = p.value, C = p.cash, N = p.shares, P = p.price, ps0 = V / N;
    host.innerHTML = '<svg viewBox="0 0 420 288" role="img"></svg>' + L.sliderHtml('curM1Px', '주가', p.min, p.max, p.step || 500, P, '자사주를 사는 주가(원)') +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr'), sl = host.querySelector('#curM1Px');
    var base = 220, kk = 110 / ps0, W0 = 140, xa = 16, xb = 214, strip = W0 / 10;
    function strips(x, w, y, h, c) { var o = ''; for (var s = x + strip; s < x + w - 0.5; s += strip) o += ln(s.toFixed(1), y.toFixed(1), s.toFixed(1), (y + h).toFixed(1), c); return o; }
    function draw() {
      var bought = C / P, left = N - bought, ps = (V - C) / left, ch = ps / ps0 - 1, o = '';
      var wa = W0, ha = ps0 * kk, wb = W0 * left / N, hb = ps * kk, wg = W0 - wb, hg = P * kk, y0 = base - ha;
      o += ln(10, base, 410, base, FAINT);
      // 사기 전
      o += t(xa, 22, '사기 전', 's') + t(xa, 46, '한 주 ' + fmt(ps0) + '원', 'm');
      o += rc(xa, y0, wa, ha, NAVY, ' stroke="' + HAIR + '"') + strips(xa, wa, y0, ha, 'rgba(242,239,232,.12)');
      o += t(xa, base + 22, shares(N)) + t(xa, base + 42, '회사 가치 ' + fmt(V) + '억 원', 's') + t(xa, base + 60, '(현금 ' + fmt(C) + '억 포함)', 's');
      // 사서 소각한 뒤
      o += t(xb, 22, '사서 소각한 뒤', 's') + t(xb, 46, '한 주 ' + fmt(Math.round(ps)) + '원', 'm');
      var pct = Math.abs(ch) < 5e-4 ? '0%' : (ch > 0 ? '+' : '−') + f1(Math.abs(ch * 100)) + '%';
      o += t(xb, 78, pct, 'b g');
      var yb = base - hb;
      if (ps >= ps0) o += rc(xb, y0, wb, ha, NAVY, ' stroke="' + HAIR + '"') + rc(xb, yb, wb, y0 - yb, GOLD);
      else o += rc(xb, yb, wb, hb, NAVY, ' stroke="' + HAIR + '"') + rc(xb, y0, wb, yb - y0, 'none', ' stroke="' + GOLD + '" stroke-dasharray="3 3"');
      o += strips(xb, wb, Math.max(yb, y0), base - Math.max(yb, y0), 'rgba(242,239,232,.12)');
      // 점선: 사서 없앤 주식. 폭 = 주식 수, 높이 = 산 값 → 면적 = 쓴 현금
      o += rc(xb + wb, base - hg, wg, hg, 'rgba(242,239,232,.05)', ' stroke="rgba(242,239,232,.6)" stroke-dasharray="4 3"');
      o += ln(xa + wa, y0, xb + W0 + 6, y0, 'rgba(242,239,232,.4)', ' stroke-dasharray="2 3"');
      o += t(xb, base + 22, '남은 주식 ' + shares(left)) + t(xb, base + 42, '남은 가치 ' + fmt(V - C) + '억 원', 's') + t(xb, base + 60, '점선 = 소각한 ' + shares(bought), 's');
      svg.innerHTML = o;
      svg.setAttribute('aria-label', '주가 ' + fmt(P) + '원에 현금 ' + fmt(C) + '억 원으로 ' + shares(bought) + '를 사서 소각하면 한 주 가치 ' + fmt(ps0) + '원 → ' + fmt(Math.round(ps)) + '원 (' + pct + ')');
      host.querySelector('.vctl b').textContent = fmt(P) + '원';
      vr.innerHTML = '주가가 가치의 ' + (Math.round(P / ps0 * 100) / 100) + '배예요. 남은 가치 ' + fmt(V - C) + '억 원 ÷ ' + shares(left) + ' = 한 주 <b>' + fmt(Math.round(ps)) + '원</b>.';
    }
    sl.oninput = function () { P = +sl.value; draw(); };
    sl.addEventListener('keydown', function (ev) { ev.stopPropagation(); });
    ctx.ready(true);
    return { draw: draw };
  };

  // ════ m1CashGap ════ params: { head, rows:[{l, v, k:'ref'|'start'|'step'|'end', d}], cap }
  window.CUR_VIS.m1CashGap = function (host, p) {
    host.classList.add('m1v');
    var rows = p.rows || [], cum = 0, segs = [];
    rows.forEach(function (r) {
      var a, b;
      if (r.k === 'ref') { a = 0; b = r.v; }
      else if (r.k === 'start') { a = 0; b = cum = r.v; }
      else if (r.k === 'step') { a = cum; b = cum = cum + r.v; }
      else { a = 0; b = cum; }
      segs.push({ r: r, a: a, b: b });
    });
    var lo = Math.min.apply(null, [0].concat(segs.map(function (s) { return Math.min(s.a, s.b); }))), hi = Math.max.apply(null, [0].concat(segs.map(function (s) { return Math.max(s.a, s.b); })));
    var xL = 20, xR = 400, X = function (v) { return xL + (xR - xL) * (v - lo) / (hi - lo); }, z = X(0), rh = 22, gap = 64, y0 = 64, o = t(xL, 22, p.head || '', 'm');
    var yz = y0 + gap * (rows.length - 1) + rh + 8; o += ln(z, 40, z, yz, 'rgba(242,239,232,.3)') + t(z, yz + 16, '0', 's', 'middle');
    segs.forEach(function (s, i) {
      var y = y0 + gap * i, xa = X(Math.min(s.a, s.b)), xb = X(Math.max(s.a, s.b)), k = s.r.k, end = k === 'end';
      var fill = end ? GOLD : k === 'ref' ? 'none' : NAVY, st = end ? '' : ' stroke="' + (k === 'ref' ? 'rgba(242,239,232,.7)' : HAIR) + '"';
      o += rc(xa, y, xb - xa, rh, fill, st + ' class="gx" style="animation-delay:' + (i * 140) + 'ms;transform-origin:' + (s.b >= s.a ? '0' : '100%') + ' 50%"');
      if (i && k !== 'ref' && segs[i - 1].r.k !== 'ref') { var xp = X(segs[i - 1].b); o += ln(xp, y - gap + rh, xp, y, 'rgba(242,239,232,.45)', ' stroke-dasharray="2 3"'); }
      if (end) {
        o += '<g class="fd">' + t(xa, y - 8, s.r.l) + t(xb + 10, y + rh - 3, sg(s.b), 'b g') + (s.r.d ? t(xb + 92, y + rh - 4, s.r.d, 's') : '') + '</g>';
      } else {
        var lab = s.r.l + ' ' + sg(s.r.v) + (s.r.d ? ' · ' + s.r.d : '');
        o += '<g class="fd">' + t(k === 'step' ? xa : z, y - 8, lab, k === 'ref' ? 's' : '') + '</g>';
      }
    });
    var H = y0 + gap * (rows.length - 1) + rh + 30;
    host.innerHTML = '<svg viewBox="0 0 420 ' + H + '" role="img" aria-label="' + esc((p.head || '') + ': ' + segs.map(function (s) { return s.r.l + ' ' + sg(s.r.k === 'end' ? s.b : s.r.v); }).join(', ')) + '">' + o + '</svg>' +
      (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    return { draw: function () {} };
  };
})();
