// ── M0 밸류에이션이란: 개념 그림 부품 (harness/PLUGIN.md) ─────────────
// m0ValuePrice  가치(앞으로 벌 돈에서 나온 값, 금색 막대) 옆에 가격(테두리 막대). 슬라이더로 가격을 움직이면 틈과 '싸요/비싸요'가 따라 변한다
// m0Order       다섯 단계를 한 줄로 잇고, 단계 하나를 빼면 그 아래가 끊기며 무엇이 흔들리는지 바로 옆에 쓴다
// m0GapSplit    가치 = 이익 × 배수 면적. 같은 괴리 20이 이익 폭(실적 괴리)에서 오는지, 배수 높이(밸류에이션 괴리)에서 오는지 견준다
(function () {
  var L = window.CUR_LIB, esc = L.esc, clamp = L.clamp;
  if (!document.getElementById('cur-plex')) {
    var lk = document.createElement('link'); lk.id = 'cur-plex'; lk.rel = 'stylesheet';
    lk.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&display=swap'; document.head.appendChild(lk);
  }
  L.addCss('cur-m0-css', [
    '.cur .vis .m0v{max-width:500px}',
    ".cur .vis .m0v text{font-family:'IBM Plex Sans','RFS Dotum UI',sans-serif;font-variant-numeric:tabular-nums;fill:#F2EFE8;font-size:13.5px}",
    ".cur .vis .m0v text.big{font-family:'Noto Serif KR',serif;font-weight:600;font-size:23px}",
    '.cur .vis .m0v text.sm{font-size:12px;fill:rgba(242,239,232,.62)}',
    '.cur .vis .m0v text.gd{fill:#E2C48F}',
    '.cur .vis .m0v text.lb{font-size:14.5px}',
    '.cur .vis .m0v .dim{opacity:.32}',
    '.cur .vis .m0v text.an{font-size:13px}',
    '.cur .vis .m0v .m0ob button{padding:0 11px}',
    '.cur .vis .m0v .vctl label{min-width:0}',
    '.cur .vis .m0v .vr b{font-weight:500}',
    '.cur .vis .m0v .vbt button[aria-pressed=true]{background:#1C2C48;border-color:#E2C48F}'
  ].join('\n'));

  var GOLD = '#E2C48F', NAVY = '#1C2C48', INK = '#F2EFE8';
  function josa(t, a, b) { var c = String(t).charCodeAt(String(t).length - 1) - 0xAC00; return t + (c >= 0 && c < 11172 && c % 28 ? a : b); }
  function n1(x) { return String(Math.round(x * 10) / 10); }
  // 한글 줄 바꿈: 낱말 단위로 max 글자 넘으면 다음 줄
  function wrap(t, max) {
    if (String(t).indexOf('\n') >= 0) return String(t).split('\n');
    var out = [], cur = '';
    String(t).split(' ').forEach(function (w) { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; });
    if (cur) out.push(cur);
    return out;
  }
  function tlines(x, y, lines, cls, lh) {
    return lines.map(function (s, i) { return '<text x="' + x + '" y="' + (y + i * lh) + '" class="' + cls + '">' + esc(s) + '</text>'; }).join('');
  }

  // ════ m0ValuePrice ════
  // params: start(가격 ÷ 가치, 기본 0.9), min, max, step, cap
  window.CUR_VIS.m0ValuePrice = function (host, p, ctx) {
    var r = p.start != null ? p.start : 0.9, mn = p.min || 0.5, mx = p.max || 1.5, stp = p.step || 0.05;
    host.innerHTML = '<div class="m0v"><svg viewBox="0 0 400 290" role="img" aria-label="해마다 벌어 줄 돈이 모여 가치가 되고, 그 옆 가격 막대는 시장에 따라 오르내려요"></svg>' +
      '<div class="vctl"><label for="curM0p">가격 <b></b></label><input id="curM0p" type="range" min="' + mn + '" max="' + mx + '" step="' + stp + '" value="' + r + '" aria-label="가격 (가치 대비)"></div>' +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '') + '</div>';
    var svg = host.querySelector('svg'), sl = host.querySelector('input'), lb = host.querySelector('label b'), vr = host.querySelector('.vr');
    var B = 262, H = 150, VX = 196, PX = 272, W = 56;
    function draw() {
      var o = '', i, vy = B - H, ph = H * r, py = B - ph, pct = Math.round(Math.abs(1 - r) * 100);
      // 해마다 벌어 줄 돈: 시간축 막대
      for (i = 0; i < 7; i++) o += '<rect x="' + (10 + i * 20) + '" y="' + (B - 30) + '" width="13" height="30" fill="' + NAVY + '" stroke="rgba(242,239,232,.38)" opacity="' + (1 - i * 0.11).toFixed(2) + '"/>';
      o += '<text x="152" y="' + (B - 6) + '" class="sm">…</text>';
      o += '<path d="M10 220V214H143V220" fill="none" stroke="rgba(242,239,232,.4)"/>';
      o += '<text x="10" y="204" class="lb">해마다 벌어 줄 돈</text>';
      o += '<text x="10" y="' + (B + 18) + '" class="sm">올해</text><text x="164" y="' + (B + 18) + '" class="sm" text-anchor="end">앞으로</text>';
      o += '<path d="M147 214C170 214 176 190 190 190" fill="none" stroke="rgba(242,239,232,.45)"/><path d="M186 186L192 190 186 194" fill="none" stroke="rgba(242,239,232,.45)"/>';
      o += '<line x1="4" y1="' + B + '" x2="396" y2="' + B + '" stroke="rgba(242,239,232,.18)"/>';
      // 가치(금색) · 기준선
      o += '<rect x="' + VX + '" y="' + vy + '" width="' + W + '" height="' + H + '" fill="' + GOLD + '"/>';
      o += '<text x="' + (VX + W / 2) + '" y="' + (vy - 10) + '" text-anchor="middle" class="lb">가치</text>';
      o += '<line x1="' + (VX + W) + '" y1="' + vy + '" x2="344" y2="' + vy + '" stroke="rgba(242,239,232,.3)" stroke-dasharray="3 3"/>';
      // 가격(테두리)
      o += '<rect x="' + PX + '" y="' + py + '" width="' + W + '" height="' + ph + '" fill="rgba(242,239,232,.06)" stroke="rgba(242,239,232,.8)" stroke-width="1.5"/>';
      o += '<text x="' + (PX + W / 2) + '" y="' + (py + 22) + '" text-anchor="middle" class="lb">가격</text>';
      // 틈 꺾쇠 + 몇 %
      if (pct > 0) {
        var a = Math.min(py, vy), b2 = Math.max(py, vy), mid = clamp((a + b2) / 2, 40, B - 40);
        o += '<path d="M336 ' + a + 'H342V' + b2 + 'H336" fill="none" stroke="' + INK + '" stroke-opacity=".7"/>';
        o += '<text x="350" y="' + (mid + 2) + '" class="big">' + pct + '%</text>';
        o += '<text x="350" y="' + (mid + 22) + '" class="lb">' + (r < 1 ? '싸요' : '비싸요') + '</text>';
      } else {
        o += '<text x="350" y="' + (vy + 6) + '" class="lb">제값</text>';
      }
      svg.innerHTML = o;
      lb.textContent = '가치의 ' + Math.round(r * 100) + '%';
      vr.innerHTML = pct === 0 ? '가격과 가치가 같아요. 제값에 사는 셈이에요.' :
        r < 1 ? '가격이 가치보다 <b>' + pct + '%</b> 낮아요. 앞으로 벌 돈에 비해 싸게 사는 셈이에요.' :
        '가격이 가치보다 <b>' + pct + '%</b> 높아요. 앞으로 벌 돈보다 비싸게 사는 셈이에요.';
    }
    sl.addEventListener('input', function () { r = Math.round(+sl.value / stp) * stp; r = Math.round(r * 100) / 100; draw(); });
    sl.addEventListener('keydown', function (e) { e.stopPropagation(); });
    if (ctx && ctx.ready) ctx.ready(true);
    return { draw: draw };
  };

  // ════ m0Order ════
  // params: hand[5] (다음 단계로 넘기는 것), drop[5] (그 단계를 빼면 생기는 일), goal (다 이어졌을 때 결과 옆 문장)
  window.CUR_VIS.m0Order = function (host, p, ctx) {
    var mp = (ctx && ctx.mod && ctx.mod.map) || {}, it = (mp.items || []).map(function (x) { return x.t; }), res = mp.res || '결과';
    var hand = p.hand || [], drop = p.drop || [], off = -1;
    host.innerHTML = '<div class="m0v"><svg viewBox="0 0 400 322" role="img" aria-label="' + esc(it.join(' → ') + ' → ' + res) + '. 단계 하나를 빼면 그 아래 판단이 흔들려요"></svg>' +
      '<div class="vbt m0ob" role="group" aria-label="빼 볼 단계">' + it.map(function (t, i) { return '<button type="button" aria-pressed="false" data-i="' + i + '">' + esc(t) + '</button>'; }).join('') + '</div>' +
      '<p class="vr" aria-live="polite"></p></div>';
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr'), bs = host.querySelectorAll('.vbt button');
    var X = 18, Y = function (i) { return 24 + i * 52; }, RY = Y(it.length) + 6;
    function draw() {
      var o = '', i;
      // 줄기: 끊긴 곳 아래는 점선·흐리게
      for (i = 0; i < it.length; i++) {
        var y1 = Y(i), y2 = i === it.length - 1 ? RY : Y(i + 1), broken = off >= 0 && i >= off;
        o += '<line x1="' + X + '" y1="' + (y1 + 8) + '" x2="' + X + '" y2="' + (y2 - 9) + '" stroke="' + INK + '" stroke-opacity="' + (broken ? 0.3 : 0.55) + '"' + (broken ? ' stroke-dasharray="3 5"' : '') + '/>';
      }
      for (i = 0; i < it.length; i++) {
        var y = Y(i), gone = i === off, dim = off >= 0 && i > off;
        o += '<g' + (dim ? ' class="dim"' : '') + '>';
        o += gone ? '<circle cx="' + X + '" cy="' + y + '" r="6" fill="none" stroke="' + INK + '" stroke-dasharray="2 2"/>' : '<circle cx="' + X + '" cy="' + y + '" r="5.5" fill="' + INK + '"/>';
        o += '<text x="36" y="' + (y + 5) + '" class="lb"' + (gone ? ' text-decoration="line-through" opacity=".5"' : '') + '>' + esc(it[i]) + '</text>';
        if (hand[i] && !gone) o += '<text x="36" y="' + (y + 24) + '" class="sm">→ ' + esc(hand[i]) + '</text>';
        o += '</g>';
      }
      // 결과
      var ok = off < 0;
      o += '<path d="M' + X + ' ' + (RY - 8) + 'L' + (X + 8) + ' ' + RY + 'L' + X + ' ' + (RY + 8) + 'L' + (X - 8) + ' ' + RY + 'Z" fill="' + (ok ? GOLD : 'none') + '" stroke="' + (ok ? GOLD : 'rgba(242,239,232,.5)') + '"/>';
      o += '<text x="36" y="' + (RY + 6) + '" class="big' + (ok ? ' gd' : '') + '" style="font-size:18px"' + (ok ? '' : ' opacity=".45"') + '>' + esc(res) + (ok ? '' : ' ?') + '</text>';
      // 직접 주석: 뺀 단계 옆 (금색) / 다 이어졌으면 결과 옆
      if (off >= 0) {
        var ly = Y(off), lines = wrap(drop[off] || '', 16), lx = 36 + it[off].length * 14 + 6;
        o += '<line x1="' + lx + '" y1="' + ly + '" x2="152" y2="' + ly + '" stroke="' + GOLD + '"/>';
        o += tlines(160, ly + 5, lines, 'gd an', 19);
      } else if (p.goal) {
        var gl = wrap(p.goal, 16);
        o += '<line x1="132" y1="' + RY + '" x2="152" y2="' + RY + '" stroke="rgba(242,239,232,.35)"/>';
        o += tlines(160, RY + 5 - (gl.length - 1) * 9.5, gl, 'an', 19);
      }
      svg.innerHTML = o;
      bs.forEach(function (b, j) { b.setAttribute('aria-pressed', j === off ? 'true' : 'false'); });
      vr.innerHTML = off < 0 ? '단계 하나를 빼 보세요. 그 아래로 무엇이 흔들리는지 보여요.' : '<b>' + esc(josa(it[off], '을', '를')) + '</b> 뺐어요. 한 번 더 누르면 되돌려요.';
    }
    bs.forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-i'); off = off === i ? -1 : i; draw(); }; });
    if (ctx && ctx.ready) ctx.ready(true);
    return { draw: draw };
  };

  // ════ m0GapSplit ════
  // params: my {e, m} 내 이익·배수, cases [{k, t, e, m, why, go}], start(case 번호), cap
  window.CUR_VIS.m0GapSplit = function (host, p, ctx) {
    var my = p.my || { e: 10, m: 10 }, C = p.cases || [], at = p.start || 0;
    host.innerHTML = '<div class="m0v"><svg viewBox="0 0 400 296" role="img" aria-label="가치는 이익 곱하기 배수, 곧 사각형 넓이예요. 같은 괴리라도 폭이 줄었는지 높이가 줄었는지 달라요"></svg>' +
      '<div class="vbt" role="group" aria-label="괴리의 종류">' + C.map(function (c, i) { return '<button type="button" aria-pressed="false" data-i="' + i + '">' + esc(c.k) + '</button>'; }).join('') + '</div>' +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '') + '</div>';
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr'), bs = host.querySelectorAll('.vbt button');
    var X0 = 52, B = 250, SX = 20, SY = 20;
    function draw() {
      var c = C[at] || { e: my.e, m: my.m }, o = '';
      var mw = my.e * SX, mh = my.m * SY, cw = c.e * SX, ch = c.m * SY, gap = my.e * my.m - c.e * c.m;
      // 축
      o += '<line x1="' + X0 + '" y1="' + B + '" x2="' + (X0 + mw + 12) + '" y2="' + B + '" stroke="rgba(242,239,232,.35)"/>';
      o += '<line x1="' + X0 + '" y1="' + B + '" x2="' + X0 + '" y2="' + (B - mh - 12) + '" stroke="rgba(242,239,232,.35)"/>';
      o += '<text x="' + (X0 + mw / 2) + '" y="' + (B + 38) + '" text-anchor="middle" class="sm">이익 (폭)</text>';
      o += '<text x="' + (X0 - 8) + '" y="' + (B - mh / 2 + 4) + '" text-anchor="end" class="sm">배수</text><text x="' + (X0 - 8) + '" y="' + (B - mh / 2 + 19) + '" text-anchor="end" class="sm">(높이)</text>';
      var xt = [my.e], yt = [my.m];
      if (c.e !== my.e) xt.push(c.e);
      if (c.m !== my.m) yt.push(c.m);
      xt.forEach(function (v) { var x = X0 + v * SX; o += '<line x1="' + x + '" y1="' + B + '" x2="' + x + '" y2="' + (B + 5) + '" stroke="rgba(242,239,232,.5)"/><text x="' + x + '" y="' + (B + 19) + '" text-anchor="middle">' + n1(v) + '</text>'; });
      yt.forEach(function (v) { var y = B - v * SY; o += '<line x1="' + (X0 - 5) + '" y1="' + y + '" x2="' + X0 + '" y2="' + y + '" stroke="rgba(242,239,232,.5)"/><text x="' + (X0 - 9) + '" y="' + (y + 4) + '" text-anchor="end">' + n1(v) + '배</text>'; });
      // 시장 가격(남색 면) · 괴리(금색 띠) · 내 가치(점선 테두리)
      o += '<rect x="' + X0 + '" y="' + (B - ch) + '" width="' + cw + '" height="' + ch + '" fill="' + NAVY + '"/>';
      var gx, gy, gw, gh;
      if (c.e !== my.e) { gx = X0 + cw; gy = B - mh; gw = mw - cw; gh = mh; } else { gx = X0; gy = B - mh; gw = mw; gh = mh - ch; }
      if (gap > 0) o += '<rect x="' + gx + '" y="' + gy + '" width="' + gw + '" height="' + gh + '" fill="' + GOLD + '"/>';
      o += '<rect x="' + X0 + '" y="' + (B - mh) + '" width="' + mw + '" height="' + mh + '" fill="none" stroke="' + INK + '" stroke-opacity=".75" stroke-dasharray="4 3"/>';
      o += '<text x="' + X0 + '" y="' + (B - mh - 22) + '" class="lb">내 가치 ' + n1(my.e * my.m) + ' = 이익 ' + n1(my.e) + ' × ' + n1(my.m) + '배</text>';
      o += '<text x="' + (X0 + cw / 2) + '" y="' + (B - ch / 2) + '" text-anchor="middle" class="lb">시장 ' + n1(c.e * c.m) + '</text>';
      o += '<text x="' + (X0 + cw / 2) + '" y="' + (B - ch / 2 + 19) + '" text-anchor="middle" class="sm">이익 ' + n1(c.e) + ' × ' + n1(c.m) + '배</text>';
      // 직접 주석
      if (gap > 0) {
        var ay = gy + gh / 2, ax = gx + gw, tx = X0 + mw + 22;
        o += '<line x1="' + ax + '" y1="' + ay + '" x2="' + (tx - 6) + '" y2="' + ay + '" stroke="' + GOLD + '"/>';
        o += '<text x="' + tx + '" y="' + (ay - 6) + '" class="big gd">' + n1(gap) + '</text>';
        o += tlines(tx, ay + 16, wrap(c.why || '', 6), 'lb', 18);
      }
      svg.innerHTML = o;
      bs.forEach(function (b, j) { b.setAttribute('aria-pressed', j === at ? 'true' : 'false'); });
      vr.textContent = c.go || '';
    }
    bs.forEach(function (b) { b.onclick = function () { at = +b.getAttribute('data-i'); draw(); }; });
    if (ctx && ctx.ready) ctx.ready(true);
    return { draw: draw };
  };
})();
