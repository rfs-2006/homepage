// ── M3 PBR 개념 그림 부품 (harness/PLUGIN.md) ─────────────────
// m3Book : 정적 비례 막대. 전체(자산) 하나를 parts로 쪼개 길이로 보여 주고, 숫자·뜻을 선으로 끌어 옆에 쓴다
// m3Mult : 움직여 보기. 순자산 막대 옆 시가총액 테두리 막대를 슬라이더로 움직이면 PBR 배수·장부와의 차이·주당 값이 같이 변한다
// m3Pair : 정적 비교. 같은 순자산·같은 PER, ROE만 다른 두 회사의 시가총액 막대와 PBR
(function () {
  var L = window.CUR_LIB, esc = L.esc, fmt = L.fmt, clamp = L.clamp;
  if (!document.getElementById('cur-plex-font')) {
    var lk = document.createElement('link'); lk.id = 'cur-plex-font'; lk.rel = 'stylesheet';
    lk.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&display=swap'; document.head.appendChild(lk);
  }
  var INK = '#F2EFE8', GOLD = '#E2C48F', NAVY = '#1C2C48', HAIR = 'rgba(242,239,232,.28)', FAINT = 'rgba(242,239,232,.18)';
  L.addCss('cur-m3-css', [
    '.cur .m3v svg{display:block;width:100%;max-width:540px;height:auto;overflow:visible}',
    '.cur .m3v .vctl,.cur .m3v .vr,.cur .m3v .m3ps,.cur .m3v .vcap{max-width:540px}',
    '.cur .m3v svg text{font-family:"IBM Plex Sans","RFS Dotum UI",sans-serif;font-variant-numeric:tabular-nums;fill:#F2EFE8;font-size:13px}',
    '.cur .m3v svg text.s,.cur .m3v svg tspan.s{font-size:12px;fill:rgba(242,239,232,.72)}',
    '.cur .m3v svg text.b{font-family:"Noto Serif KR",serif;font-weight:600;font-size:23px;letter-spacing:-.01em}',
    '.cur .m3v svg text.g{fill:#E2C48F}',
    '.cur .m3v svg text.pc{font-size:14px;font-weight:500}.cur .m3v svg text.pc.dk{fill:#0B1526}',
    '.cur .m3v svg .gr{transform-box:fill-box;transform-origin:50% 100%;animation:m3Grow .9s cubic-bezier(.2,.8,.2,1) both}',
    '.cur .m3v svg .fd{animation:m3Fade .6s ease .55s both}',
    '@keyframes m3Grow{from{transform:scaleY(0)}}@keyframes m3Fade{from{opacity:0}}',
    '.cur .m3v .m3ps{margin-top:14px;padding-top:12px;border-top:1px solid var(--hair);font-family:"IBM Plex Sans","RFS Dotum UI",sans-serif;font-variant-numeric:tabular-nums;font-size:14.5px;color:var(--tx);line-height:1.7}',
    '.cur .m3v .m3ps small{display:block;font-family:"RFS Dotum UI",sans-serif;font-size:12.5px;color:var(--t3)}',
    '.cur .m3v .m3ps b{font-weight:500}',
    '.cur .m3v .vctl label b{font-family:"IBM Plex Sans","RFS Dotum UI",sans-serif;font-weight:500;font-size:18px}',
    '.cur .m3v .vcap{color:var(--t3)}',
    '@media (max-width:560px){.cur .m3v svg text{font-size:14.5px}.cur .m3v svg text.s,.cur .m3v svg tspan.s{font-size:13px}.cur .m3v svg text.b{font-size:26px}}',
    '@media (prefers-reduced-motion:reduce){.cur .m3v svg .gr,.cur .m3v svg .fd{animation:none}}'
  ].join('\n'));

  function n1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function mult(x) { var s = (Math.round(x * 100) / 100).toFixed(2).replace(/0$/, ''); return s + '배'; }
  function t(x, y, s, cls, anchor) { return '<text x="' + x + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : '') + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(s) + '</text>'; }
  function ln(x1, y1, x2, y2, c, extra) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '"' + (extra || '') + '/>'; }

  // ════ m3Book ════ params: { head(막대 이름), headNum(막대 위 숫자), total, parts:[{v, big, t, d, pct, hl}], foot }
  window.CUR_VIS.m3Book = function (host, p, ctx) {
    host.classList.add('m3v');
    var W = 420, top = 34, bot = 280, H = bot - top, x0 = 30, bw = 92, lx = x0 + bw + 46;
    var parts = p.parts || [], tot = p.total || parts.reduce(function (a, b) { return a + b.v; }, 0);
    var o = t(x0 + bw / 2, 22, p.headNum || '', '', 'middle') + t(x0 + bw / 2, bot + 22, p.head || '', '', 'middle');
    var y = top, mids = [];
    parts.forEach(function (q, i) {
      var h = H * q.v / tot;
      o += '<rect class="gr" style="animation-delay:' + (i * 0.12) + 's" x="' + x0 + '" y="' + y.toFixed(1) + '" width="' + bw + '" height="' + h.toFixed(1) + '" fill="' + (q.hl ? GOLD : NAVY) + '"' + (q.hl ? '' : ' stroke="' + HAIR + '"') + '/>';
      if (i) o += ln(x0, y.toFixed(1), x0 + bw, y.toFixed(1), '#0B1526', ' stroke-width="2"');
      // 자산 대비 비율: 조각 가운데에 (글자보다 낮은 조각엔 안 넣는다)
      if (q.pct != null && h >= 24) o += '<g class="fd">' + t(x0 + bw / 2, (y + h / 2 + 5).toFixed(1), n1(q.pct) + '%', 'pc' + (q.hl ? ' dk' : ''), 'middle') + '</g>';
      mids.push({ y: y + h / 2, h: h, q: q });
      y += h;
    });
    // 주석: 좁은 조각은 글이 겹치지 않게 아래로 밀고, 선을 꺾어 이어 준다
    var last = -1e9;
    mids.forEach(function (m) {
      var ty = Math.max(m.y, last + 60); ty = Math.min(ty, bot - 30); last = ty;
      var c = m.q.hl ? GOLD : 'rgba(242,239,232,.4)';
      o += '<g class="fd">' + ln(x0 + bw, m.y.toFixed(1), x0 + bw + 22, m.y.toFixed(1), c) + ln(x0 + bw + 22, m.y.toFixed(1), x0 + bw + 22, ty.toFixed(1), c) + ln(x0 + bw + 22, ty.toFixed(1), lx - 8, ty.toFixed(1), c) +
        t(lx, ty - 4, m.q.big || String(m.q.v), 'b') +
        // 이름은 흰 글씨, 뜻은 아래 줄에 옅은 글씨로
        t(lx, ty + 18, m.q.t) + (m.q.d ? t(lx, ty + 36, m.q.d, 's') : '') + '</g>';
    });
    host.innerHTML = '<svg viewBox="0 0 ' + W + ' 312" role="img" aria-label="' + esc(p.aria || p.head || '') + '">' + o + '</svg>' + (p.foot ? '<p class="vcap">' + esc(p.foot) + '</p>' : '');
    ctx.ready(true);
    return { draw: function () {} };
  };

  // ════ m3Mult ════ params: { book, cap0, min, max, step, shares(만 주), name, unit, cap }
  window.CUR_VIS.m3Mult = function (host, p, ctx) {
    host.classList.add('m3v');
    var B = p.book, v = p.cap0, U = p.unit || '억', id = 'curM3mc';
    var W = 420, base = 250, k = 204 / p.max, xb = 16, xm = 194, bw = 66;
    host.innerHTML = '<svg viewBox="0 0 ' + W + ' 300" role="img" aria-label="순자산 막대와 시가총액 막대 비교"></svg>' +
      L.sliderHtml(id, '시가총액', p.min, p.max, p.step, v, '시가총액(' + U + ' 원)') +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), inp = host.querySelector('#' + id), lb = host.querySelector('.vctl label b'), vr = host.querySelector('.vr');
    var bps = B * 1e4 / p.shares; // 억 원 ÷ 만 주 → 원
    function draw() {
      var hb = B * k, yb = base - hb, hm = v * k, ym = base - hm, r = v / B, o = '';
      o += ln(8, base, W - 8, base, FAINT);
      // 순자산: 지금까지 쌓인 값
      o += '<rect x="' + xb + '" y="' + yb + '" width="' + bw + '" height="' + hb + '" fill="' + NAVY + '" stroke="' + HAIR + '"/>';
      o += t(xb + bw / 2, yb - 10, fmt(B) + U, '', 'middle');
      o += t(xb + bw / 2, base + 22, '순자산', '', 'middle') + t(xb + bw / 2, base + 40, '장부에 쌓인 값', 's', 'middle');
      // 1배 선: 순자산 높이를 시가총액 쪽까지 끌어 온다
      o += ln(xb + bw, yb, xm + bw + 12, yb, 'rgba(242,239,232,.45)', ' stroke-dasharray="3 4"');
      // 시가총액: 장부만큼(옅게) + 기대를 얹은 몫 / 모자란 몫
      o += '<rect x="' + xm + '" y="' + Math.max(ym, yb) + '" width="' + bw + '" height="' + (base - Math.max(ym, yb)) + '" fill="rgba(226,196,143,.08)"/>';
      if (v > B) o += '<rect x="' + xm + '" y="' + ym + '" width="' + bw + '" height="' + (yb - ym) + '" fill="rgba(226,196,143,.26)"/>';
      o += '<rect x="' + xm + '" y="' + ym + '" width="' + bw + '" height="' + hm + '" fill="none" stroke="' + GOLD + '" stroke-width="1.5"/>';
      if (v < B) o += '<rect x="' + xm + '" y="' + yb + '" width="' + bw + '" height="' + (ym - yb) + '" fill="none" stroke="rgba(242,239,232,.4)" stroke-dasharray="3 3"/>';
      o += t(xm + bw / 2, Math.min(ym, yb) - 10, fmt(v) + U, '', 'middle');
      o += t(xm + bw / 2, base + 22, '시가총액', '', 'middle') + t(xm + bw / 2, base + 40, '시장이 매긴 값', 's', 'middle');
      // 장부와의 차이: 막대 사이에 직접 쓴다
      var d = v - B, gap = Math.abs(yb - ym);
      if (gap >= 14) {
        var my = (yb + ym) / 2, two = gap >= 42;
        o += t(xm - 10, my + (two ? -3 : 4.5), (d > 0 ? '+' : '−') + fmt(Math.abs(d)) + U, d > 0 ? 'g' : '', 'end');
        if (two) o += t(xm - 10, my + 14, d > 0 ? '기대를 얹은 몫' : '장부에 못 미친 몫', 's', 'end');
      }
      // 배수: 테두리 막대 오른쪽 괄호
      var bx = xm + bw + 14;
      o += ln(bx - 6, ym, bx, ym, GOLD) + ln(bx, ym, bx, base, GOLD) + ln(bx - 6, base, bx, base, GOLD);
      var py = Math.min(Math.max((ym + base) / 2 - 6, ym + 26), base - 40);
      o += t(bx + 12, py, mult(r), 'b g') + t(bx + 12, py + 19, 'PBR', 's') + t(bx + 12, py + 35, '= ' + fmt(v) + ' ÷ ' + fmt(B), 's');
      svg.innerHTML = o;
      lb.textContent = fmt(v) + U;
      vr.textContent = Math.abs(r - 1) < 1e-9 ? '시가총액이 순자산과 같아요. 장부값 그대로 1배예요.' :
        r < 1 ? '1배보다 낮아요. 시장이 이 순자산으로 버는 힘을 장부보다 낮게 보는 거예요.' :
        '1배보다 높아요. 시장이 이 순자산으로 앞으로 더 벌 거라고 보고 값을 얹은 거예요.';
    }
    inp.addEventListener('input', function () { v = clamp(Math.round(+inp.value / p.step) * p.step, p.min, p.max); draw(); });
    inp.addEventListener('keydown', function (e) { e.stopPropagation(); });
    ctx.ready(true);
    return { draw: draw };
  };

  // ════ m3Pair ════ params: { book, per, cos:[{t, roe, hl}], unit, cap }
  window.CUR_VIS.m3Pair = function (host, p, ctx) {
    host.classList.add('m3v');
    var B = p.book, PER = p.per, cos = p.cos || [], W = 420, base = 240, bw = 46;
    var caps = cos.map(function (c) { return B * c.roe / 100 * PER; }), mx = Math.max.apply(null, caps.concat([B])), k = 170 / mx;
    var o = ln(8, base, W - 8, base, FAINT), yb = base - B * k;
    o += ln(8, yb, W - 8, yb, 'rgba(242,239,232,.4)', ' stroke-dasharray="3 4"') + t(W - 8, yb - 6, '1배', 's', 'end');
    cos.forEach(function (c, i) {
      var gx = 18 + i * 206, ni = B * c.roe / 100, mc = caps[i], ym = base - mc * k, r = mc / B, col = c.hl ? GOLD : 'rgba(242,239,232,.7)';
      o += '<rect class="gr" x="' + gx + '" y="' + yb + '" width="' + bw + '" height="' + (base - yb) + '" fill="' + NAVY + '" stroke="' + HAIR + '"/>';
      o += '<rect class="gr" style="animation-delay:.15s" x="' + (gx + bw + 10) + '" y="' + ym + '" width="' + bw + '" height="' + (base - ym) + '" fill="' + (c.hl ? 'rgba(226,196,143,.1)' : 'rgba(242,239,232,.05)') + '" stroke="' + col + '" stroke-width="1.5"/>';
      o += t(gx + bw / 2, base + 18, '순자산', 's', 'middle') + t(gx + bw * 1.5 + 10, base + 18, '시가총액', 's', 'middle');
      o += '<g class="fd">' + t(gx + bw / 2, yb - 8, fmt(B), '', 'middle') + t(gx + bw * 1.5 + 10, ym - 8, fmt(mc), '', 'middle');
      var py = Math.min(ym + 30, base - 40);
      o += t(gx + 2 * bw + 22, py, mult(r), 'b' + (c.hl ? ' g' : '')) + t(gx + 2 * bw + 22, py + 18, 'PBR', 's') + t(gx + 2 * bw + 22, py + 34, '= ' + fmt(mc) + ' ÷ ' + fmt(B), 's') + '</g>';
      o += t(gx, base + 46, (c.t ? c.t + ' ' : '') + 'ROE ' + c.roe + '%', c.hl ? 'g' : '');
      o += t(gx, base + 64, '순이익 ' + fmt(ni), 's');
    });
    host.innerHTML = '<svg viewBox="0 0 ' + W + ' 310" role="img" aria-label="' + esc(p.aria || '같은 PER, 다른 ROE의 PBR 비교') + '">' + o + '</svg>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    ctx.ready(true);
    return { draw: function () {} };
  };
})();
