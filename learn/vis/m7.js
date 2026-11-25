// ── M7 DCF 2: FCFF 추정 부품 (harness/PLUGIN.md) ─────────────────
// m7Table  숫자 표: 가로 스크롤 + 첫 열 고정. 줄 하나씩 열기(start), 두 상태 바꿔 보기(toggle, v2), 고친 칸 색(fix)
// m7Dep    감가상각 스케줄: 정률법/정액법, 첫해 반년치. 막대 = 그해 상각비, 선 = 연말 장부가
// m7Spot   (문제) 표에서 이상한 칸 고르기. answer { cells: [열 번호] }
// m7Nwc    순운전자본: 회전일수 슬라이더 → 매출채권·재고·매입채무 → NWC → ΔNWC → FCFF 영향
// m7Build  (문제) FCFF 빌더: 한 해 열의 빈칸(NOPAT → 소계 → 소계 → FCFF)을 직접 채움. answer { cells: {k: 값} }
// m7Map    FCFF 한 줄 지도: 다섯 칸 + 칸마다 정할 질문. on = 지금 구역(tax·da·capex·nwc·all), 없으면 전체 지도
// m7Fix    고치기 켜고 끄기: 감가상각비 연간값·ΔNWC 부호 → 해마다 FCFF와 EV(모델 할인식 그대로)
(function () {
  var L = window.CUR_LIB, esc = L.esc, fmt = L.fmt;
  L.addCss('cur-m7-css', [
    '.cur .m7tw{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border-top:1px solid var(--hair)}',
    '.cur .m7t{border-collapse:collapse;min-width:100%;font-size:13.5px;font-variant-numeric:tabular-nums}',
    '.cur .m7t th,.cur .m7t td{padding:8px 9px;border-bottom:1px solid var(--hair);text-align:right;white-space:nowrap;color:var(--tx)}',
    '.cur .m7t thead th{font-family:var(--ser);font-size:13.5px;color:var(--ac2);font-weight:600}',
    '.cur .m7t thead th:first-child{font-family:inherit;font-size:11px;color:var(--t3);font-weight:300;position:sticky;left:0;background:#0B1526;z-index:1}',
    '.cur .m7t tbody th{text-align:left;font-weight:400;font-size:13px;position:sticky;left:0;background:#0B1526;z-index:1;min-width:104px;max-width:160px;white-space:normal;line-height:1.35}',
    '.cur .m7t tr.hid{display:none}',
    '.cur .m7t tr.hl td,.cur .m7t tr.hl th{font-weight:600;background:rgba(143,170,220,.10)}',
    '.cur .m7t tr.hl th{background:#16243a}',
    '.cur .m7t tr.sub th{padding-left:20px;color:var(--t3)}',
    '.cur .m7t tr.sub td{color:var(--t3)}',
    '.cur .m7t tr.grp th{color:var(--wm);font-weight:500}',
    '.cur .m7t tr.dim td,.cur .m7t tr.dim th{color:var(--t3)}',
    '.cur .m7t td.fx{color:var(--wm);font-weight:600;background:rgba(232,201,160,.08)}',
    '.cur .m7t td.m7k,.cur .m7t th.m7k{background:rgba(232,201,160,.10)}',
    '.cur .m7t tbody tr[data-d]{cursor:pointer}',
    '.cur .m7t button.m7c{min-height:36px;min-width:64px;padding:0 8px;border:1px dashed var(--hair);background:rgba(9,17,31,.4);color:var(--tx);font:inherit;font-variant-numeric:tabular-nums;cursor:pointer}',
    '.cur .m7t button.m7c.on{border:1px solid var(--wm);background:rgba(232,201,160,.16)}',
    '.cur .m7t button.m7c.ok{border:1px solid var(--ok);color:var(--ok)}',
    '.cur .m7t button.m7c.no{border:1px solid var(--no);color:var(--no)}',
    '.cur .m7t button.m7c.ans{outline:2px solid var(--ok);outline-offset:1px}',
    '.cur .m7in{width:92px;min-height:38px;padding:0 6px;border:1px solid var(--ac);background:rgba(9,17,31,.6);color:var(--tx);font:inherit;font-size:16px;text-align:right;font-variant-numeric:tabular-nums}',
    '.cur .m7in:focus{outline:2px solid var(--wm);outline-offset:1px}',
    '.cur .m7in.ok{border-color:var(--ok);color:var(--ok)}',
    '.cur .m7in.no{border-color:var(--no);color:var(--no)}',
    '.cur .m7t small.m7a{display:block;font-size:11.5px;color:var(--ok);margin-top:2px}',
    '.cur .m7map{display:flex;align-items:stretch;flex-wrap:wrap;gap:6px 4px;margin:6px 0 4px}',
    '.cur .m7map .cell{flex:1 1 0;min-width:104px;padding:12px 12px 13px;border-top:2px solid var(--hair);display:flex;flex-direction:column;gap:6px;transition:opacity .3s,border-color .3s}',
    '.cur .m7map .cell b{font-family:var(--ser);font-weight:600;font-size:17px;color:var(--tx)}',
    '.cur .m7map .cell small{font-size:12.5px;line-height:1.45;color:var(--t2)}',
    '.cur .m7map .op{align-self:flex-start;padding-top:12px;font-size:17px;color:var(--t3);width:14px;text-align:center}',
    '.cur .m7map .cell.res{flex:0 0 auto;min-width:72px}',
    '.cur .m7map .cell.res b{color:var(--wm)}',
    '.cur .m7map.sel .cell.dim{opacity:.38}',
    '.cur .m7map.sel .cell.done{opacity:.62}',
    '.cur .m7map .cell.on{border-top-color:var(--wm)}',
    '.cur .m7map .cell.on small{color:var(--tx)}',
    '@media (max-width:640px){.cur .m7map{flex-direction:column;gap:0}.cur .m7map .op{display:none}.cur .m7map .cell{flex-direction:row;align-items:baseline;justify-content:space-between;border-top-width:1px;padding:10px 2px;min-width:0}.cur .m7map .cell.on{border-top-width:2px}}',
    '.cur .m7leg{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px;font-size:12.5px;color:var(--t3)}',
    '.cur .m7leg span{display:inline-flex;align-items:center;gap:6px}',
    '.cur .m7leg i{display:inline-block;width:14px;height:10px}'
  ].join('\n'));

  function num(s) {
    if (typeof s === 'number') return s;
    var t = String(s == null ? '' : s).replace(/[,%\s]/g, '').replace(/−/g, '-');
    if (/^\(.*\)$/.test(t)) t = '-' + t.slice(1, -1);
    if (t === '' || t === '-') return null;
    var v = parseFloat(t); return isNaN(v) ? null : v;
  }
  function sg(v) { return (v < 0 ? '−' : '') + fmt(Math.abs(v)); }
  function cell(s) { return esc(String(s == null ? '' : s)); }
  function head(p, cols, mark) { return '<thead><tr><th scope="col">' + esc(p.unit || '') + '</th>' + cols.map(function (c, j) { return '<th scope="col"' + (j === mark ? ' class="m7k"' : '') + '>' + esc(c) + '</th>'; }).join('') + '</tr></thead>'; }

  // ── 숫자 표 ──────────────────────────────────────────

  window.CUR_VIS.m7Map = function (host, p) {
    var K = [
      { k: 'ebit', op: '', t: 'EBIT', q: '손익 추정에서 가져와요' },
      { k: 'tax', op: '−', t: '세금', q: '어떤 세율을 쓸까요?' },
      { k: 'da', op: '+', t: '감가상각비', q: '설비값을 어떻게 나눌까요?' },
      { k: 'capex', op: '−', t: 'CAPEX', q: '얼마나 다시 투자할까요?' },
      { k: 'nwc', op: '−', t: '운전자본 증가', q: '돈이 얼마나 묶일까요?' }
    ];
    var ord = ['tax', 'da', 'capex', 'nwc', 'all'], on = p.on || '', at = ord.indexOf(on);
    function st(c) {
      if (!on) return '';
      if (on === 'all') return ' done';
      if (c.k === on || (on === 'tax' && c.k === 'ebit')) return ' on';
      var i = ord.indexOf(c.k);
      return (c.k === 'ebit' || (i >= 0 && i < at)) ? ' done' : ' dim';
    }
    host.innerHTML = '<div class="m7map' + (on ? ' sel' : '') + '" role="img" aria-label="FCFF = EBIT − 세금 + 감가상각비 − CAPEX − 운전자본 증가">' +
      K.map(function (c) {
        return (c.op ? '<span class="op" aria-hidden="true">' + c.op + '</span>' : '') +
          '<div class="cell' + st(c) + '"><b>' + esc(c.t) + '</b>' + (on && on !== 'all' && st(c) !== ' on' ? '' : '<small>' + esc(c.q) + '</small>') + '</div>';
      }).join('') +
      '<span class="op" aria-hidden="true">=</span><div class="cell res' + (on === 'all' ? ' on' : '') + '"><b>FCFF</b></div></div>';
    return { draw: function () {} };
  };

  window.CUR_VIS.m7Table = function (host, p, ctx) {
    var cols = p.cols || [], rows = p.rows || [], tg = p.toggle, alt = false, seen2 = !tg, n = p.start == null ? rows.length : p.start;
    function body() {
      return rows.map(function (r, i) {
        var vs = alt && r.v2 ? r.v2 : r.v, fx = (tg ? (alt && r.fix) : r.fix) || [];
        return '<tr class="' + (i < n ? '' : 'hid') + (r.hl ? ' hl' : '') + (r.sub ? ' sub' : '') + (r.grp ? ' grp' : '') + (r.dim ? ' dim' : '') + '"' + (r.d ? ' data-d="' + i + '"' : '') + '><th scope="row">' + cell(r.l) + '</th>' +
          cols.map(function (c, j) { return '<td class="' + (fx.indexOf(j) >= 0 ? 'fx' : '') + (p.mark === j ? ' m7k' : '') + '">' + cell(vs[j]) + '</td>'; }).join('') + '</tr>';
      }).join('');
    }
    host.innerHTML = (tg ? '<div class="vbt m7tg" role="group" aria-label="보기">' + tg.map(function (t, i) { return '<button type="button" data-t="' + i + '" class="' + (i ? 'vgo' : 'on') + '" aria-pressed="' + !i + '">' + esc(t) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="m7tw" tabindex="0" aria-label="' + esc(p.label || '표') + ' (가로로 밀어 보기)"><table class="m7t">' + head(p, cols, p.mark) + '<tbody></tbody></table></div>' +
      (n < rows.length ? '<div class="vbt"><button type="button" class="vgo on m7nx"></button></div>' : '') +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var tb = host.querySelector('tbody'), vr = host.querySelector('.vr'), nb = host.querySelector('.m7nx');
    function paint() { tb.innerHTML = body(); }
    function lab(i) {
      var r = rows[i];
      if (r && r.d) vr.innerHTML = '<b>' + esc(r.l) + '</b> · ' + esc(r.d);
      else vr.innerHTML = esc(alt && p.ask2 ? p.ask2 : (p.ask || (tg ? '위 버튼으로 두 상태를 바꿔 보세요.' : rows.some(function (x) { return x.d; }) ? '줄을 누르면 뜻이 보여요.' : '')));
      if (nb) { if (n >= rows.length) { nb.hidden = true; nb.classList.add('done'); } else nb.textContent = (n ? '다음 줄 · ' : '첫 줄 열기 · ') + rows[n].l; }
      L.gate(ctx, n >= rows.length && seen2);
    }
    if (nb) nb.onclick = function () { if (n >= rows.length) return; n++; paint(); lab(n - 1); };
    tb.addEventListener('click', function (e) { var tr = e.target.closest && e.target.closest('tr[data-d]'); if (tr) lab(+tr.getAttribute('data-d')); });
    host.querySelectorAll('.m7tg button').forEach(function (b) {
      b.onclick = function () {
        alt = b.getAttribute('data-t') === '1'; if (alt) { seen2 = true; b.classList.add('done'); }
        host.querySelectorAll('.m7tg button').forEach(function (x) { var o = x === b; x.classList.toggle('on', o); x.setAttribute('aria-pressed', o); });
        paint(); lab(-1);
      };
    });
    paint(); lab(-1);
    return { draw: function () {}, gated: function () { return n < rows.length || !seen2; } };
  };

  // ── 감가상각 스케줄 ───────────────────────────────────
  window.CUR_VIS.m7Dep = function (host, p, ctx) {
    var cost = p.cost || 16000, r = p.rate || 0.451, life = p.life || 5, salv = p.salv == null ? 0.05 : p.salv, half = p.half !== false, y0 = p.y0 || 2022, N = p.years || life, m = p.method || 'db', seen = {};
    seen[m] = 1;
    host.innerHTML = '<div class="vbt m7m" role="group" aria-label="상각 방법">' + [['db', '정률법'], ['sl', '정액법']].map(function (x) { return '<button type="button" data-m="' + x[0] + '" aria-pressed="' + (x[0] === m) + '" class="' + (x[0] === m ? 'on done' : 'vgo') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="eqs" aria-live="polite"></div><svg role="img"></svg>' + L.sliderHtml('curM7Cost', '취득원가', 4000, 20000, 500, cost, '취득원가(백만 원)') +
      '<p class="vr" aria-live="polite"></p><div class="m7leg"><span><i style="background:rgba(143,170,220,.85)"></i>그해 상각비</span><span><i style="background:var(--wm);height:2px"></i>연말 장부가</span></div>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eq = host.querySelector('.eqs'), vr = host.querySelector('.vr'), sl = host.querySelector('#curM7Cost');
    function sched() {
      var out = [], bv = cost, base = cost * (1 - salv) / life;
      for (var i = 0; i < N; i++) { var d = m === 'db' ? bv * r * (i === 0 && half ? 0.5 : 1) : base * (i === 0 && half ? 0.5 : 1); bv -= d; out.push({ y: y0 + i, d: d, bv: bv }); }
      return out;
    }
    function draw() {
      var S = sched(), w = L.wOf(host), h = Math.round(L.clamp(w * 0.5, 220, 300)), ml = 44, mr = 8, mt = 18, mb = 28, iw = w - ml - mr, ih = h - mt - mb, cw = iw / S.length, hi = cost, o = '';
      var Y = function (v) { return mt + ih * (1 - v / hi); };
      [0, 0.25, 0.5, 0.75, 1].forEach(function (k) { var v = hi * k; o += '<line class="gl" x1="' + ml + '" x2="' + (w - mr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text x="' + (ml - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + (v >= 1000 ? L.f1(v / 1000) + 'k' : Math.round(v)) + '</text>'; });
      var bw = Math.min(46, cw * 0.56), pts = [[ml, Y(cost)]];
      S.forEach(function (s, i) {
        var cx = ml + cw * i + cw / 2;
        o += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + Y(s.d).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + (Y(0) - Y(s.d)).toFixed(1) + '" fill="rgba(143,170,220,.85)"/>';
        o += '<text x="' + cx + '" y="' + (Y(s.d) - 5) + '" text-anchor="middle" class="tt" style="font-size:11.5px">' + fmt(s.d) + '</text>';
        o += '<text x="' + cx + '" y="' + (h - 9) + '" text-anchor="middle">' + (w < 520 ? '’' + String(s.y).slice(2) : s.y) + '</text>';
        pts.push([ml + cw * (i + 1), Y(s.bv)]);
      });
      o += '<line class="ax" x1="' + ml + '" x2="' + (w - mr) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/><path d="' + L.pathOf(pts) + '" fill="none" stroke="var(--wm)" stroke-width="2"/>';
      pts.forEach(function (q) { o += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3" fill="var(--wm)"/>'; });
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', (m === 'db' ? '정률법' : '정액법') + ' 상각비: ' + S.map(function (s) { return s.y + '년 ' + fmt(s.d); }).join(', ') + ' (백만 원)');
      var s0 = S[0], s1 = S[1];
      eq.innerHTML = m === 'db'
        ? '<div class="eq"><small>상각률</small><b>' + r + '</b></div><i>·</i><div class="eq"><small>첫해 (반년치)</small><b>' + fmt(cost) + ' × ' + r + (half ? ' ÷ 2' : '') + ' = ' + fmt(s0.d) + '</b></div><i>·</i><div class="eq hl"><small>둘째 해</small><b>' + fmt(cost - s0.d) + ' × ' + r + ' = ' + fmt(s1.d) + '</b></div>'
        : '<div class="eq"><small>한 해치</small><b>' + fmt(cost) + ' × ' + (1 - salv) + ' ÷ ' + life + ' = ' + fmt(cost * (1 - salv) / life) + '</b></div><i>·</i><div class="eq hl"><small>첫해 (반년치)</small><b>' + fmt(s0.d) + '</b></div>';
      var tot = S.reduce(function (a, s) { return a + s.d; }, 0);
      vr.innerHTML = '<b>' + (m === 'db' ? '정률법' : '정액법') + '</b> · ' + S.length + '년 동안 상각비 합계 ' + fmt(tot) + ', 남은 장부가 ' + fmt(S[S.length - 1].bv) + ' (백만 원, 예시)' + (m === 'db' ? '. 앞쪽 해에 비용이 커요.' : '. 해마다 같은 금액이에요.');
      host.querySelectorAll('.m7m button').forEach(function (b) { var o2 = b.getAttribute('data-m') === m; b.classList.toggle('on', o2); b.setAttribute('aria-pressed', o2); });
      host.querySelector('.vctl b').textContent = fmt(cost);
      L.gate(ctx, seen.db && seen.sl);
    }
    host.querySelectorAll('.m7m button').forEach(function (b) { b.onclick = function () { m = b.getAttribute('data-m'); seen[m] = 1; b.classList.add('done'); draw(); }; });
    sl.oninput = function () { cost = +sl.value; draw(); };
    sl.addEventListener('keydown', function (e) { e.stopPropagation(); });
    return { draw: draw, gated: function () { return !(seen.db && seen.sl); } };
  };

  // ── 이상한 칸 고르기 (문제) ───────────────────────────
  window.CUR_VIS.m7Spot = function (host, p, ctx) {
    var cols = p.cols || [], rows = p.rows || [], pr = rows.findIndex(function (r) { return r.pick; }), sel = {}, locked = false, ans = (ctx.answer || {}).cells || [];
    host.innerHTML = '<div class="m7tw"><table class="m7t">' + head(p, cols) + '<tbody>' +
      rows.map(function (r, i) {
        return '<tr class="' + (r.hl ? 'hl' : '') + (r.dim ? ' dim' : '') + '"><th scope="row">' + cell(r.l) + '</th>' + cols.map(function (c, j) {
          return '<td>' + (i === pr ? '<button type="button" class="m7c" data-j="' + j + '" aria-pressed="false">' + cell(r.v[j]) + '</button>' : cell(r.v[j])) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div><p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var vr = host.querySelector('.vr'), bs = host.querySelectorAll('button.m7c');
    function picked() { return Object.keys(sel).filter(function (k) { return sel[k]; }).map(Number).sort(function (a, b) { return a - b; }); }
    function lab() {
      var k = picked();
      vr.innerHTML = k.length ? '고른 칸: <b>' + k.map(function (j) { return esc(cols[j]); }).join(', ') + '</b>' : esc(p.ask || '이상한 칸을 모두 눌러 고르세요. 다시 누르면 풀려요.');
      bs.forEach(function (b) { var on = !!sel[b.getAttribute('data-j')]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      ctx.ready(k.length > 0);
    }
    function tog(j) { if (locked || j < 0 || j >= cols.length) return; sel[j] = !sel[j]; lab(); }
    bs.forEach(function (b) { b.onclick = function () { tog(+b.getAttribute('data-j')); }; });
    host.__solve = function (right) { sel = {}; (right ? ans : ans.slice(1)).forEach(function (j) { sel[j] = true; }); if (!right && !ans.slice(1).length) sel[(ans[0] + 1) % cols.length] = true; lab(); };
    lab();
    return {
      draw: function () {},
      key: function (n) { tog(n - 1); },
      check: function () { var k = picked(); return { right: k.length === ans.length && k.every(function (j) { return ans.indexOf(j) >= 0; }), detail: '고른 칸: ' + k.map(function (j) { return cols[j]; }).join(', ') + '.' }; },
      reveal: function (right, show) {
        locked = true;
        bs.forEach(function (b) { var j = +b.getAttribute('data-j'), on = !!sel[j], a = ans.indexOf(j) >= 0; b.disabled = true; if (on) b.classList.add(a ? 'ok' : 'no'); if ((show || right) && a) b.classList.add('ans'); });
        if (show || right) vr.innerHTML = '이상한 칸: <b>' + ans.map(function (j) { return esc(cols[j]); }).join(', ') + '</b>';
      }
    };
  };

  // ── 순운전자본 슬라이더 ───────────────────────────────
  window.CUR_VIS.m7Nwc = function (host, p, ctx) {
    var v = { ar: p.ar, inv: p.inv, ap: p.ap }, SL = [['ar', '매출채권 회전일수', p.arMin || 20, p.arMax || 80], ['inv', '재고 회전일수', 0, p.invMax || 40], ['ap', '매입채무 회전일수', p.apMin || 10, p.apMax || 120]];
    host.innerHTML = '<div class="eqs" aria-live="polite"></div><svg role="img"></svg>' + SL.map(function (s) { return L.sliderHtml('curM7' + s[0], s[1], s[2], s[3], 0.5, v[s[0]], s[1] + '(일)').replace('<input ', '<input data-k="' + s[0] + '" '); }).join('') +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eq = host.querySelector('.eqs'), vr = host.querySelector('.vr');
    function calc() { var ar = p.sales * v.ar / 365, inv = p.invexp * v.inv / 365, ap = p.invexp * v.ap / 365, nwc = ar + p.ca + inv - ap; return { ar: ar, inv: inv, ap: ap, nwc: nwc, d: nwc - p.nwc0 }; }
    function box(t, x, c) { return '<div class="eq ' + (c || '') + '"><small>' + t + '</small><b>' + x + '</b></div>'; }
    function draw() {
      var c = calc(), w = L.wOf(host), h = 120, lw = Math.min(110, w * 0.3), rw = 66, hi = Math.max(p.nwc0, c.nwc, 1) * 1.08, X = function (x) { return lw + (w - lw - rw) * Math.max(0, x) / hi; }, o = '';
      [[p.prev + ' NWC', p.nwc0, 'rgba(242,239,232,.35)'], [p.year + ' NWC', c.nwc, 'rgba(143,170,220,.85)']].forEach(function (b, i) {
        var y = 14 + i * 46;
        o += '<text x="0" y="' + (y + 19) + '" class="tt">' + esc(b[0]) + '</text><rect x="' + lw + '" y="' + y + '" width="' + Math.max(2, X(b[1]) - lw).toFixed(1) + '" height="28" fill="' + b[2] + '"/><text x="' + w + '" y="' + (y + 19) + '" text-anchor="end" class="th">' + sg(b[1]) + '</text>';
      });
      var up = c.d > 0;
      o += '<text x="' + lw + '" y="' + (h - 6) + '" class="' + (up ? 'tno' : 'tok') + '">ΔNWC ' + (up ? '+' : '') + sg(c.d) + ' → ' + (up ? '현금이 묶여요 (FCFF −' + fmt(Math.abs(c.d)) + ')' : '현금이 풀려요 (FCFF +' + fmt(Math.abs(c.d)) + ')') + '</text>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', p.prev + ' NWC ' + fmt(p.nwc0) + ', ' + p.year + ' NWC ' + fmt(c.nwc) + ', 증가 ' + sg(c.d) + ' (백만 원)');
      eq.innerHTML = box('매출채권', fmt(c.ar)) + '<i>+</i>' + box('계약자산', fmt(p.ca)) + '<i>+</i>' + box('재고', fmt(c.inv)) + '<i>−</i>' + box('매입채무', fmt(c.ap)) + '<i>=</i>' + box(p.year + ' NWC', fmt(c.nwc), 'hl') + '<i>−</i>' + box(p.prev, fmt(p.nwc0)) + '<i>=</i>' + box('ΔNWC', sg(c.d), 'ac');
      host.querySelectorAll('.vctl').forEach(function (cl) { var k = cl.querySelector('input').getAttribute('data-k'); cl.querySelector('b').textContent = L.f1(v[k]) + '일'; });
      vr.innerHTML = '매출채권 = 매출 ' + fmt(p.sales) + ' × ' + L.f1(v.ar) + '일 ÷ 365. 재고·매입채무는 재고 관련 비용 ' + fmt(p.invexp) + '에 일수를 곱해요. <b>FCFF에는 ΔNWC를 빼요</b> (백만 원).';
    }
    host.querySelectorAll('.vctl input').forEach(function (s) {
      s.oninput = function () { v[s.getAttribute('data-k')] = +s.value; draw(); };
      s.addEventListener('keydown', function (e) { e.stopPropagation(); });
    });
    return { draw: draw };
  };

  // ── FCFF 빌더 (문제) ──────────────────────────────────
  window.CUR_VIS.m7Build = function (host, p, ctx) {
    var Y = p.years || [], T = p.target || 0, Ln = p.lines || [], A = (ctx.answer || {}).cells || {}, tol = (ctx.answer || {}).tol == null ? 2 : ctx.answer.tol, Q = ctx.mode === 'question';
    host.innerHTML = '<div class="m7tw"><table class="m7t">' + head(p, Y, T) + '<tbody>' +
      Ln.map(function (l) {
        return '<tr class="' + (l.blank ? 'hl' : '') + '"><th scope="row">' + cell(l.l) + '</th>' + Y.map(function (y, j) {
          if (l.blank && j === T && Q) return '<td class="m7k"><input class="m7in" data-k="' + esc(l.k) + '" inputmode="numeric" autocomplete="off" aria-label="' + esc(y + ' ' + l.l) + '" placeholder="?"></td>';
          return '<td class="' + (j === T ? 'm7k' : '') + '">' + sg(l.v[j]) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div><p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var ins = host.querySelectorAll('.m7in'), vr = host.querySelector('.vr');
    function val(i) { return num(i.value); }
    function full() { return Array.prototype.every.call(ins, function (i) { return val(i) != null; }); }
    function lab() { var k = Array.prototype.filter.call(ins, function (i) { return val(i) != null; }).length; vr.innerHTML = esc(p.ask || '') + ' <b>' + k + ' / ' + ins.length + '칸</b>'; if (Q) ctx.ready(full()); }
    ins.forEach(function (i) {
      i.oninput = function () { i.value = i.value.replace(/[^\d,\-−]/g, ''); lab(); };
      i.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); var nx = ins[Array.prototype.indexOf.call(ins, i) + 1]; if (nx) nx.focus(); } });
    });
    if (Q) host.__solve = function (right) { ins.forEach(function (i, n) { var a = A[i.getAttribute('data-k')]; i.value = String(Math.round(right || n < ins.length - 1 ? a : a + 1000)); }); lab(); };
    lab();
    return {
      draw: function () {},
      check: function () {
        var bad = [];
        ins.forEach(function (i) { var k = i.getAttribute('data-k'), v = val(i); if (v == null || Math.abs(v - A[k]) > tol) bad.push(k); });
        var lb = function (k) { return (Ln.filter(function (l) { return l.k === k; })[0] || {}).l || k; };
        return { right: !bad.length, detail: bad.length ? '맞은 칸 ' + (ins.length - bad.length) + ' / ' + ins.length + ' · 다시 볼 칸: ' + bad.map(lb).join(', ') + '.' : '네 칸 모두 맞았어요.' };
      },
      reveal: function (right, show) {
        ins.forEach(function (i) {
          var k = i.getAttribute('data-k'), v = val(i), ok = v != null && Math.abs(v - A[k]) <= tol;
          i.disabled = true; i.classList.add(ok ? 'ok' : 'no');
          if (!ok && show) { var s = document.createElement('small'); s.className = 'm7a'; s.textContent = '정답 ' + sg(A[k]); i.parentNode.appendChild(s); }
        });
      }
    };
  };

  // ── 고치기 켜고 끄기: FCFF와 EV ───────────────────────
  window.CUR_VIS.m7Fix = function (host, p, ctx) {
    var Y = p.years || [], f = { dep: false, nwc: false }, seen = { dep: false, nwc: false }, W = p.wacc, g = p.g;
    function fcff(on) { return Y.map(function (y, i) { return p.nopat[i] + (on.dep ? p.da1[i] : p.da0[i]) + (on.nwc ? -p.dnwc[i] : p.dnwc[i]) - p.capex[i]; }); }
    function ev(F) { var pv = F.reduce(function (a, x, i) { return a + x / Math.pow(1 + W, 0.5 + i); }, 0), t = F[F.length - 1] * (1 + g); return pv + (t + t / (W - g)) / Math.pow(1 + W, F.length + 0.5); }
    function ps(e) { return (e + p.noa - p.ibd) / p.shares * 1e6; }
    host.innerHTML = '<div class="vbt m7f" role="group" aria-label="고치기">' + [['dep', '고치기 1 · 상각비 연간값'], ['nwc', '고치기 2 · ΔNWC는 빼기']].map(function (x) { return '<button type="button" class="vgo" data-f="' + x[0] + '" aria-pressed="false">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="eqs" aria-live="polite"></div><svg role="img"></svg><div class="m7leg"><span><i style="background:rgba(242,239,232,.3)"></i>실수한 모델</span><span><i style="background:rgba(143,170,220,.9)"></i>지금 고친 모델</span></div><p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eq = host.querySelector('.eqs'), vr = host.querySelector('.vr');
    function draw() {
      var F0 = fcff({}), F = fcff(f), e0 = ev(F0), e = ev(F), w = L.wOf(host), h = Math.round(L.clamp(w * 0.5, 230, 300)), ml = 44, mr = 6, mt = 22, mb = 28, iw = w - ml - mr, ih = h - mt - mb, o = '';
      var all = F0.concat(F).concat([0]), lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), pad = (hi - lo) * 0.12; lo = lo < 0 ? lo - pad : 0; hi += pad;
      var Yp = function (v) { return mt + ih * (hi - v) / (hi - lo); }, cw = iw / Y.length, bw = Math.min(30, cw * 0.32);
      [lo, 0, hi / 2, hi].forEach(function (v) { if (v === lo && lo === 0) return; o += '<line class="gl" x1="' + ml + '" x2="' + (w - mr) + '" y1="' + Yp(v) + '" y2="' + Yp(v) + '"/><text x="' + (ml - 6) + '" y="' + (Yp(v) + 4) + '" text-anchor="end">' + (Math.abs(v) >= 1000 ? (v < 0 ? '−' : '') + L.f1(Math.abs(v) / 1000) + 'k' : Math.round(v)) + '</text>'; });
      o += '<line class="ax" x1="' + ml + '" x2="' + (w - mr) + '" y1="' + Yp(0) + '" y2="' + Yp(0) + '"/>';
      Y.forEach(function (y, i) {
        var cx = ml + cw * i + cw / 2;
        [[F0[i], 'rgba(242,239,232,.3)', -1], [F[i], 'rgba(143,170,220,.9)', 0]].forEach(function (b) {
          var x = cx + b[2] * bw, y1 = Yp(Math.max(0, b[0])), y2 = Yp(Math.min(0, b[0]));
          o += '<rect x="' + x.toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + (bw - 2) + '" height="' + Math.max(1, y2 - y1).toFixed(1) + '" fill="' + b[1] + '"/>';
        });
        o += '<text x="' + (cx + bw / 2) + '" y="' + (Yp(Math.max(0, F[i])) - 6) + '" text-anchor="middle" class="tt" style="font-size:11px">' + (w < 420 ? (F[i] < 0 ? '−' : '') + L.f1(Math.abs(F[i]) / 1000) + 'k' : sg(F[i])) + '</text>';
        o += '<text x="' + cx + '" y="' + (h - 9) + '" text-anchor="middle">' + esc(w < 520 ? String(y).replace('FY20', '’') : y) + '</text>';
      });
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', 'FCFF ' + Y.map(function (y, i) { return y + ' 실수한 모델 ' + sg(F0[i]) + ', 지금 ' + sg(F[i]); }).join(' / ') + ' (백만 원)');
      eq.innerHTML = '<div class="eq"><small>실수한 모델 EV</small><b>' + fmt(e0) + '</b></div><i>→</i><div class="eq hl"><small>지금 EV</small><b>' + fmt(e) + '</b></div><i>·</i><div class="eq ac"><small>주당 가치</small><b>' + fmt(ps(e)) + '원</b></div>';
      vr.innerHTML = (f.dep || f.nwc ? '고친 것: <b>' + [f.dep ? '감가상각비' : '', f.nwc ? 'ΔNWC 부호' : ''].filter(Boolean).join(' + ') + '</b> · EV ' + (e >= e0 ? '+' : '−') + fmt(Math.abs(e - e0)) + ' (' + L.pc(e / e0 - 1) + '), 주당 ' + fmt(ps(e0)) + '원 → ' + fmt(ps(e)) + '원' : '버튼을 눌러 하나씩 고쳐 보세요.') + ' (백만 원, 할인율·TV 식은 모델 값 그대로)';
      host.querySelectorAll('.m7f button').forEach(function (b) { var k = b.getAttribute('data-f'); b.classList.toggle('on', f[k]); b.setAttribute('aria-pressed', f[k]); });
      L.gate(ctx, seen.dep && seen.nwc);
    }
    host.querySelectorAll('.m7f button').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-f'); f[k] = !f[k]; if (f[k]) { seen[k] = true; b.classList.add('done'); } draw(); }; });
    return { draw: draw, gated: function () { return !(seen.dep && seen.nwc); } };
  };
})();
