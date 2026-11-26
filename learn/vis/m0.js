// ── M0 밸류에이션이란: 개념 그림 부품 (harness/PLUGIN.md) ─────────────
// m0ValuePrice  가치(앞으로 벌 돈에서 나온 값, 금색 막대) 옆에 가격(테두리 막대). 슬라이더로 가격을 움직이면 틈과 '싸요/비싸요'가 따라 변한다
// m0Think       정적인 생각 갈래: 상황 → 질문 → 갈래마다 '이렇게 보면 ⇒ 이렇게 한다' (슬라이더·토글 없음)
// m0GapEq       가치 = 이익 × 배수를 줄마다 쓰고, 내 가치와 다른 칸(이익이냐 배수냐)만 짚어 실적 괴리·밸류에이션 괴리를 가른다
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
    '.cur .vis .m0v .vbt button[aria-pressed=true]{background:#1C2C48;border-color:#E2C48F}',
    '.cur .vis .thk{max-width:620px;color:#F2EFE8}',
    '.cur .vis .thk-top{display:flex;gap:28px;padding-bottom:14px;border-bottom:1px solid rgba(242,239,232,.18)}',
    ".cur .vis .thk-top span{display:flex;flex-direction:column;gap:2px}.cur .vis .thk-top small{font-size:13px;color:rgba(242,239,232,.62)}.cur .vis .thk-top b{font-family:'Noto Serif KR',serif;font-weight:600;font-size:24px}.cur .vis .thk-top .gd b{color:#E2C48F}",
    ".cur .vis .thk-ask{margin:16px 0 12px;font-family:'Noto Serif KR',serif;font-weight:600;font-size:18px;line-height:1.5}",
    '.cur .vis .thk-w{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
    '.cur .vis .thk-c{border:1px solid rgba(242,239,232,.28);padding:14px 16px;display:flex;flex-direction:column;gap:10px}',
    '.cur .vis .thk-see{font-size:16px;line-height:1.55;color:rgba(242,239,232,.8)}',
    '.cur .vis .thk-then{font-size:16.5px;line-height:1.55;font-weight:500}.cur .vis .thk-then i{font-style:normal;margin-right:8px;color:rgba(242,239,232,.62)}',
    '.cur .vis .thk-foot{margin-top:14px;font-size:15.5px;line-height:1.6;color:rgba(242,239,232,.8)}',
    '@media (max-width:560px){.cur .vis .thk-w{grid-template-columns:1fr}}',
    '.cur .vis .geq{max-width:560px;display:flex;flex-direction:column;border-top:1px solid rgba(242,239,232,.18)}',
    ".cur .vis .geq-r{display:grid;grid-template-columns:5.5em 3em 1.2em 3em 1.2em 3.6em minmax(0,1fr);align-items:center;column-gap:6px;padding:14px 0;border-bottom:1px solid rgba(242,239,232,.18);font-family:'IBM Plex Sans','RFS Dotum UI',sans-serif;font-variant-numeric:tabular-nums;color:#F2EFE8}",
    '.cur .vis .geq-r.hd{padding:8px 0;font-size:13px;color:rgba(242,239,232,.62)}',
    '.cur .vis .geq-k{font-size:15px}',
    ".cur .vis .geq-v{font-family:'Noto Serif KR',serif;font-weight:600;font-size:22px;text-align:right}",
    '.cur .vis .geq-r.hd .geq-v{font-family:inherit;font-weight:400;font-size:13px}',
    '.cur .vis .geq-o{text-align:center;color:rgba(242,239,232,.62)}',
    '.cur .vis .geq-n{font-size:18px;text-align:center;padding:2px 0;border:1px solid transparent}',
    '.cur .vis .geq-r.hd .geq-n{font-size:13px}',
    '.cur .vis .geq-n.df{border-color:#F2EFE8;font-weight:500}',
    '.cur .vis .geq-r.me .geq-v{color:#E2C48F}',
    '.cur .vis .geq-w{display:flex;flex-direction:column;gap:2px;padding-left:10px;font-size:15px}.cur .vis .geq-w b{font-weight:500}.cur .vis .geq-w small{font-size:12.5px;color:rgba(242,239,232,.62)}',
    '@media (max-width:560px){.cur .vis .geq-r{grid-template-columns:5em 2.6em 1em 2.6em 1em 3.4em;row-gap:6px}.cur .vis .geq-w{grid-column:1/-1;padding-left:0}.cur .vis .geq-r.hd .geq-w,.cur .vis .geq-r.me .geq-w{display:none}}'
  ].join('\n'));

  var GOLD = '#E2C48F', NAVY = '#1C2C48', INK = '#F2EFE8';
  function n1(x) { return String(Math.round(x * 10) / 10); }

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
      o += '<text x="' + (VX + W / 2) + '" y="' + (B + 20) + '" text-anchor="middle" class="lb">가치</text>';
      o += '<line x1="' + (VX + W) + '" y1="' + vy + '" x2="344" y2="' + vy + '" stroke="rgba(242,239,232,.3)" stroke-dasharray="3 3"/>';
      // 가격(테두리)
      o += '<rect x="' + PX + '" y="' + py + '" width="' + W + '" height="' + ph + '" fill="rgba(242,239,232,.06)" stroke="rgba(242,239,232,.8)" stroke-width="1.5"/>';
      o += '<text x="' + (PX + W / 2) + '" y="' + (B + 20) + '" text-anchor="middle" class="lb">가격</text>';
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
      vr.innerHTML = pct === 0 ? '가격과 가치가 같아 제값에 사는 셈이에요.' :
        r < 1 ? '가격이 가치보다 <b>' + pct + '%</b> 낮아 싸게 사는 셈이에요.' :
        '가격이 가치보다 <b>' + pct + '%</b> 높아 비싸게 사는 셈이에요.';
    }
    sl.addEventListener('input', function () { r = Math.round(+sl.value / stp) * stp; r = Math.round(r * 100) / 100; draw(); });
    sl.addEventListener('keydown', function (e) { e.stopPropagation(); });
    if (ctx && ctx.ready) ctx.ready(true);
    return { draw: draw };
  };

  // ════ m0Think ════
  // params: top [{k, v, gold?}], ask, ways [{see, then}], foot
  // 정적인 생각 갈래: 위에 상황, 가운데 질문, 아래로 갈래마다 '이렇게 보면 ⇒ 이렇게 한다'. 누르는 장치 없음
  window.CUR_VIS.m0Think = function (host, p, ctx) {
    var T = p.top || [], W = p.ways || [];
    host.innerHTML = '<div class="m0v thk">' +
      (T.length ? '<div class="thk-top">' + T.map(function (t) { return '<span' + (t.gold ? ' class="gd"' : '') + '><small>' + esc(t.k) + '</small><b>' + esc(t.v) + '</b></span>'; }).join('') + '</div>' : '') +
      (p.ask ? '<p class="thk-ask">' + esc(p.ask) + '</p>' : '') +
      '<div class="thk-w">' + W.map(function (w) { return '<div class="thk-c"><p class="thk-see">' + esc(w.see) + '</p><p class="thk-then"><i aria-hidden="true">⇒</i>' + esc(w.then) + '</p></div>'; }).join('') + '</div>' +
      (p.foot ? '<p class="thk-foot">' + esc(p.foot) + '</p>' : '') + '</div>';
    if (ctx && ctx.ready) ctx.ready(true);
    return { draw: function () {} };
  };

  // ════ m0GapEq ════
  // params: head[3] (가치·이익·배수 이름), my {k, e, m}, cases [{k, e, m, why, tag}]
  // 가치 = 이익 × 배수를 줄마다 쓰고, 내 가치와 다른 칸만 테두리로 짚는다. 그 줄 옆(폰은 아래)에 무엇이 달랐는지 쓴다
  window.CUR_VIS.m0GapEq = function (host, p, ctx) {
    var H = p.head || ['가치', '이익', '배수'], my = p.my || { k: '내 가치', e: 10, m: 10 }, C = p.cases || [];
    function row(r, base) {
      var de = base && r.e !== base.e, dm = base && r.m !== base.m;
      return '<div class="geq-r' + (base ? '' : ' me') + '"><span class="geq-k">' + esc(r.k) + '</span>' +
        '<span class="geq-v">' + n1(r.e * r.m) + '</span><span class="geq-o">=</span>' +
        '<span class="geq-n' + (de ? ' df' : '') + '">' + n1(r.e) + '</span><span class="geq-o">×</span>' +
        '<span class="geq-n' + (dm ? ' df' : '') + '">' + n1(r.m) + '배</span>' +
        (base ? '<span class="geq-w"><b>' + esc(r.why || '') + '</b>' + (r.tag ? '<small>' + esc(r.tag) + '</small>' : '') + '</span>' : '<span class="geq-w"></span>') + '</div>';
    }
    host.innerHTML = '<div class="m0v geq" role="img" aria-label="' + esc(H[0] + ' = ' + H[1] + ' × ' + H[2] + '. ' + my.k + ' ' + n1(my.e * my.m) + ' = ' + my.e + ' × ' + my.m + '배. ' +
      C.map(function (c) { return c.k + ' ' + n1(c.e * c.m) + ' = ' + c.e + ' × ' + c.m + '배, ' + (c.why || '') + ' (' + (c.tag || '') + ')'; }).join('. ')) + '">' +
      '<div class="geq-r hd" aria-hidden="true"><span class="geq-k"></span><span class="geq-v">' + esc(H[0]) + '</span><span class="geq-o">=</span><span class="geq-n">' + esc(H[1]) + '</span><span class="geq-o">×</span><span class="geq-n">' + esc(H[2]) + '</span><span class="geq-w"></span></div>' +
      row(my, null) + C.map(function (c) { return row(c, my); }).join('') + '</div>';
    if (ctx && ctx.ready) ctx.ready(true);
    return { draw: function () {} };
  };
})();
