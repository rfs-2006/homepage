/* AGORA 로그인 전 화면: 608명(누적 학회원)을 별 608개의 구로 보여 주고, 그 안에 로그인 칸을 띄운다.
 * 별에 붙는 이름은 WHERE WE WORK 첫 화면에 나오는 재직 기관(공개 목록)뿐이고, 개인 정보는 없다.
 * 로그인에 성공하면 dive(): 카메라가 구 쪽으로 다가가며 이 화면이 그대로 투명해져 아래의 AGORA 화면과 겹쳐 바뀐다. */
(function () {
  var CSS = '\
.ag-gate{position:fixed;inset:0;z-index:40;background:#02050C;color:#F7F6F3;font-family:"Pretendard Variable",Pretendard,sans-serif;overflow:hidden;transition:opacity 1.5s ease}\
.ag-gate.dive{z-index:3500;opacity:0;pointer-events:none;transition-delay:.15s}\
.ag-sky{position:absolute;inset:-3%;background:url(/assets/hero/sky.webp) center 40%/cover;opacity:0;transform:scale(1.08);transition:opacity 1.4s ease,transform 14s cubic-bezier(.2,.6,.2,1)}\
@media (max-width:899px){.ag-sky{background-image:url(/assets/hero/sky-m.webp)}}\
.ag-sky.on{opacity:.42;transform:none}\
.ag-sky::after{content:"";position:absolute;inset:0;background:radial-gradient(46% 52% at 50% 50%,rgba(2,5,12,.15),rgba(2,5,12,.55) 70%,rgba(2,5,12,.9)),linear-gradient(180deg,rgba(2,5,12,.5),rgba(2,5,12,0) 30%,rgba(2,5,12,0) 70%,rgba(2,5,12,.7))}\
.ag-gate canvas{position:absolute;inset:0;width:100%;height:100%}\
.ag-ttl{position:absolute;left:0;right:0;top:92px;text-align:center;opacity:0;transform:translateY(-8px);transition:opacity 1.2s,transform 1.2s;padding:0 16px}\
.ag-ttl b{display:block;font:300 clamp(56px,6.2vw,92px)/1 "Source Serif 4",serif;letter-spacing:-.02em;color:#fff;text-shadow:0 2px 30px rgba(0,0,0,.55)}\
.ag-ttl small{display:block;margin-top:14px;font-size:11.5px;font-weight:500;letter-spacing:.32em;color:rgba(200,220,255,.7)}\
.ag-lg{position:absolute;left:50%;top:58%;width:min(330px,calc(100% - 32px));transform:translate(-50%,-50%) scale(.94);padding:34px 30px;border:1px solid rgba(170,205,255,.26);background:rgba(5,10,22,.5);-webkit-backdrop-filter:blur(16px) saturate(1.3);backdrop-filter:blur(16px) saturate(1.3);text-align:center;opacity:0;transition:opacity 1s,transform 1.1s cubic-bezier(.2,.8,.2,1);box-shadow:0 30px 80px rgba(0,0,0,.45),0 0 120px rgba(70,130,255,.16)}\
@media (max-width:699px){.ag-lg{padding:26px 22px;background:rgba(5,10,22,.42)}.ag-lg p{font-size:12.5px}}\
.ag-lg img{width:48px;height:auto;display:block;margin:0 auto}\
.ag-lg small{display:block;margin-top:16px;font-size:11px;letter-spacing:.24em;color:rgba(247,246,243,.6)}\
.ag-lg h1{margin:8px 0 0;font:400 24px "Noto Serif KR",serif;letter-spacing:-.02em;color:#F7F6F3}\
.ag-lg p{margin:10px 0 0;font-size:13px;line-height:1.6;color:rgba(247,246,243,.72)}\
.ag-lg form{margin-top:20px;display:flex;flex-direction:column;gap:8px}\
.ag-lg input{height:46px;padding:0 14px;border:1px solid rgba(247,246,243,.3);background:rgba(247,246,243,.06);color:#F7F6F3;font:inherit;font-size:15px;text-align:center;border-radius:0;outline:none}\
.ag-lg input:focus{border-color:rgba(247,246,243,.7)}\
.ag-lg input::placeholder{color:rgba(247,246,243,.5)}\
.ag-lg button{height:48px;margin-top:4px;border:0;background:#F7F6F3;color:#0F1B2E;font:inherit;font-size:12px;font-weight:600;letter-spacing:.14em;cursor:pointer}\
.ag-lg button:disabled{opacity:.6;cursor:default}\
.ag-lg .er{margin:4px 0 0;font-size:12px;color:#E8A9A9;min-height:0}\
.ag-lg .hp{margin:16px 0 0;font-size:12px;color:rgba(247,246,243,.6)}.ag-lg .hp a{color:rgba(247,246,243,.85);display:inline-flex;align-items:center;min-height:44px}\
.ag-lg .jl{margin:0;font-size:12px;color:rgba(247,246,243,.6)}.ag-lg .jl a{color:#F7F6F3;display:inline-flex;align-items:center;min-height:36px;text-decoration:underline;text-underline-offset:3px}\
.ag-gate .on{opacity:1}\
@media (min-width:900px){.ag-lg{top:60%}}.ag-gate .ag-ttl.on{transform:none}.ag-gate .ag-lg.on{transform:translate(-50%,-50%)}\
.ag-gate.dive .ag-lg,.ag-gate.dive .ag-ttl{opacity:0;transition:opacity .5s ease}\
';
  var g = null;

  function mount(o) {
    if (g) return g.api;
    if (!document.getElementById('ag-gate-css')) { var c = document.createElement('style'); c.id = 'ag-gate-css'; c.textContent = CSS; document.head.appendChild(c); }
    var el = document.createElement('div');
    el.className = 'ag-gate'; el.setAttribute('data-nav', 'dark');
    el.innerHTML = '<div class="ag-sky"></div><canvas aria-hidden="true"></canvas>' +
      '<div class="ag-ttl"><b>' + (o.total || 608) + '</b><small>RISEN FINANCIAL STARS</small></div>' +
      '<div class="ag-lg" role="dialog" aria-label="학회원 로그인"><img src="/assets/rfs-seal-light-256.png" alt="R.F.S."><small>MEMBERS ONLY</small><h1>학회원 로그인</h1>' +
      '<form><input name="username" autocomplete="username" autocapitalize="none" placeholder="아이디" required><input name="password" type="password" autocomplete="current-password" placeholder="비밀번호" required><p class="er" aria-live="polite"></p><button type="submit">LOGIN</button></form>' +
      '<p class="hp">비밀번호 문의 · <a href="mailto:contact@caurfs.kr">contact@caurfs.kr</a></p><p class="jl">계정이 없다면 · <a href="#" class="jn-go">회원가입</a></p></div>';
    document.body.appendChild(el);
    var sky = el.querySelector('.ag-sky'), ttl = el.querySelector('.ag-ttl'), lg = el.querySelector('.ag-lg'), form = el.querySelector('form'), er = el.querySelector('.er'), btn = el.querySelector('button');
    el.querySelector('.jn-go').onclick = function (e) { e.preventDefault(); if (o.join) o.join(); };
    form.onsubmit = function (e) {
      e.preventDefault();
      if (btn.disabled) return;
      btn.disabled = true; btn.textContent = '…'; er.textContent = '';
      Promise.resolve(o.login(form.username.value, form.password.value)).then(function (r) {
        if (r && r.error) { btn.disabled = false; btn.textContent = 'LOGIN'; er.textContent = /banned/i.test((r.error && r.error.message) || '') || (r.error && r.error.code) === 'user_banned' ? '승인 대기 중이에요. 승인되면 로그인할 수 있어요.' : '아이디와 비밀번호를 확인해 주세요.'; form.password.value = ''; form.password.focus(); }
      }, function () { btn.disabled = false; btn.textContent = 'LOGIN'; er.textContent = '연결에 실패했습니다. 잠시 후 다시 시도해 주세요.'; });
    };

    var cv = el.querySelector('canvas'), x = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 1.5), W, H, small;
    // 별 모양 한 장을 미리 그려 두고 찍는다: 가운데 빛 + 번짐 + 십자 빛살 (점 대신 별처럼)
    var sprite = function (rgb) {
      var c = document.createElement('canvas'), S = 96, h = S / 2, g; c.width = c.height = S; g = c.getContext('2d');
      var rg = g.createRadialGradient(h, h, 0, h, h, h);
      rg.addColorStop(0, 'rgba(' + rgb + ',1)'); rg.addColorStop(.06, 'rgba(' + rgb + ',.95)'); rg.addColorStop(.16, 'rgba(' + rgb + ',.32)'); rg.addColorStop(.4, 'rgba(' + rgb + ',.07)'); rg.addColorStop(1, 'rgba(' + rgb + ',0)');
      g.fillStyle = rg; g.fillRect(0, 0, S, S); g.globalCompositeOperation = 'lighter';
      [0, 1].forEach(function (v) { var lg = v ? g.createLinearGradient(h, 0, h, S) : g.createLinearGradient(0, h, S, h); lg.addColorStop(0, 'rgba(' + rgb + ',0)'); lg.addColorStop(.5, 'rgba(' + rgb + ',.85)'); lg.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = lg; if (v) g.fillRect(h - .8, 0, 1.6, S); else g.fillRect(0, h - .8, S, 1.6); });
      return c;
    }, SP_COOL = sprite('205,225,255'), SP_WARM = sprite('255,232,190');
    var wide; function rs() { W = innerWidth; H = innerHeight; small = W < 700; wide = W >= 900; cv.width = W * dpr; cv.height = H * dpr; }
    rs(); addEventListener('resize', rs);
    var mx = 0, my = 0, tmx = 0, tmy = 0;
    function pm(e) { tmx = e.clientX / W - .5; tmy = e.clientY / H - .5; }
    addEventListener('pointermove', pm);

    // 608점: 위에서 아래로 43개 띠(1기~43기), 띠마다 점 수는 둘레에 비례
    var N = o.total || 608, B = 43, P = [], s0 = 11, rnd = function () { s0 = (s0 * 16807) % 2147483647; return s0 / 2147483647; };
    var wts = [], ws = 0, i, j;
    for (i = 0; i < B; i++) { wts.push(Math.sin(Math.PI * (i + .5) / B)); ws += wts[i]; }
    var cnt = wts.map(function (w) { return Math.max(3, Math.round(w / ws * N)); }), diff = N - cnt.reduce(function (a, b) { return a + b; }, 0);
    for (i = 0; diff !== 0; i++) { var k = 21 + (i % 7) - 3; if (diff > 0) { cnt[k]++; diff--; } else { cnt[k]--; diff++; } }
    cnt.forEach(function (n, b) { var lat = Math.PI * (b + .5) / B, y = Math.cos(lat), r = Math.sin(lat), o0 = rnd() * 6.28; for (var q = 0; q < n; q++) { var t = o0 + 6.2832 * q / n + (rnd() - .5) * .25; P.push({ x: Math.cos(t) * r, y: y, z: Math.sin(t) * r, j: rnd(), lab: null, rk: 0 }); } });
    // 이름을 받을 수 있는 별 (절반 정도). 이름은 미리 붙이지 않고, 화면 앞쪽에 온 별에 그때그때 순서(선호도)대로 붙인다
    var CO = o.names || [];
    for (j = 0; j < N; j++) P[j].nm = rnd() < .5;
    var E = [];
    for (var a = 0; a < N; a++) { var b1 = -1, b2 = -1, d1 = 9, d2 = 9; for (var b = 0; b < N; b++) { if (a === b) continue; var p = P[a], q = P[b], d = (p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y) + (p.z - q.z) * (p.z - q.z); if (d < d1) { d2 = d1; b2 = b1; d1 = d; b1 = b; } else if (d < d2) { d2 = d; b2 = b; } } if (a < b1) E.push([a, b1]); if (a < b2) E.push([a, b2]); }
    var BG = []; for (i = 0; i < 260; i++) BG.push({ x: rnd(), y: rnd(), r: rnd() * 1.1 + .2, a: rnd() * .5 + .15, j: rnd() });
    var LA = new Float32Array(N), SIDE = new Int8Array(N), ON = new Uint8Array(N);
    var cl = function (t) { return t < 0 ? 0 : t > 1 ? 1 : t; }, eo = function (t) { return 1 - Math.pow(1 - cl(t), 3); };
    // 한 번 본 사람·움직임 줄이기 설정은 펼쳐지는 부분을 건너뛴다
    var skip = 0; try { if (localStorage.getItem('rfs_gate_seen')) skip = 1.6; localStorage.setItem('rfs_gate_seen', '1'); } catch (e) {}
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) skip = 3;
    var start = performance.now() - skip * 1000, dive = null, raf = 0, pr = new Array(N);

    function f(now) {
      raf = 0;
      if (document.hidden) { raf = requestAnimationFrame(f); return; }
      var t = (now - start) / 1000;
      var dv = dive == null ? 0 : cl((t - dive) / 1.6), dvE = dv < .5 ? 4 * dv * dv * dv : 1 - Math.pow(-2 * dv + 2, 3) / 2;
      mx += (tmx - mx) * .05; my += (tmy - my) * .05;
      x.globalCompositeOperation = 'source-over'; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
      sky.classList.toggle('on', t > .05);
      // 넓은 화면에서는 구를 화면 아래로 크게 내려 윗부분만 지평선처럼 보이게 한다
      var cz0 = wide ? 1.8 : 2.15, cx = W / 2, cy = wide ? H * 1.3 : H * (small ? .65 : .63), R = wide ? Math.max(W * .62, H * .9) / 1.17 : small ? Math.min(W * 1.05, H * .52) : Math.min(W * .42, H * .54);
      var burst = 1 - Math.pow(2, -9 * cl((t - .05) / 1.05)), s = .04 + .96 * burst, camZ = cz0 - .9 * dvE;
      var rot = t * .04 + (1 - eo((t - .05) / 1.5)) * .8 + mx * .25 + dvE * .35, tilt = .3 + my * .35;
      var cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt), i, p, q;
      var bgA = eo((t - .9) / 1.2) * (1 - dv);
      for (i = 0; i < BG.length; i++) { var bb = BG[i], tw0 = .6 + .4 * Math.sin(t * 1.7 + bb.j * 30); x.fillStyle = 'rgba(220,232,255,' + bb.a * tw0 * bgA + ')'; x.beginPath(); x.arc(((bb.x + t * .004 + mx * .01) % 1) * W, (bb.y + my * .01) * H, bb.r, 0, 7); x.fill(); }
      for (i = 0; i < N; i++) {
        p = P[i]; var X = p.x * cr + p.z * sr, Z = -p.x * sr + p.z * cr, Y = p.y * ct - Z * st; Z = p.y * st + Z * ct;
        var dz = camZ - Z; if (dz < .08) { pr[i] = { hid: 1, Z: Z }; continue; }
        var sc = 1 / dz; pr[i] = { X: cx + X * R * s * sc * 1.75, Y: cy + Y * R * s * sc * 1.75, Z: Z, sc: sc };
      }
      x.globalCompositeOperation = 'lighter';
      var gR = R * Math.max(s, .12) * 1.45, gg = x.createRadialGradient(cx, cy, 0, cx, cy, gR);
      gg.addColorStop(0, 'rgba(80,140,255,' + (.08 * (1 - dv * .5)) + ')'); gg.addColorStop(1, 'rgba(80,140,255,0)'); x.fillStyle = gg; x.fillRect(0, 0, W, H);
      var ringA = eo((t - 1.3) / 1) * (1 - dv);
      if (ringA > 0) {
        x.save(); x.translate(cx, cy); x.rotate(-.18); x.lineWidth = 1;
        [[1.32, .22], [1.38, .1]].forEach(function (rk) { x.beginPath(); x.ellipse(0, 0, R * rk[0] * 1.25, R * rk[0] * .3, 0, 0, 7); var lg2 = x.createLinearGradient(-R * 1.6, 0, R * 1.6, 0); lg2.addColorStop(0, 'rgba(150,195,255,0)'); lg2.addColorStop(.5, 'rgba(150,195,255,' + rk[1] * ringA + ')'); lg2.addColorStop(1, 'rgba(150,195,255,0)'); x.strokeStyle = lg2; x.stroke(); });
        var oa = t * .35; x.fillStyle = 'rgba(220,235,255,' + .9 * ringA + ')'; x.beginPath(); x.arc(Math.cos(oa) * R * 1.32 * 1.25, Math.sin(oa) * R * 1.32 * .3, 2.2, 0, 7); x.fill(); x.restore();
      }
      var wfa = eo((t - .3) / 1.2) * (1 - dv);
      if (wfa > 0) {
        var pj = function (X0, Y0, Z0) { var X = X0 * cr + Z0 * sr, Z = -X0 * sr + Z0 * cr, Y = Y0 * ct - Z * st; Z = Y0 * st + Z * ct; var sc = 1 / (camZ - Z); return [cx + X * R * s * sc * 1.75, cy + Y * R * s * sc * 1.75, Z]; };
        // 격자 조각을 깊이(밝기) 4단계로 나눠 단계마다 한 번에 그린다 (조각마다 따로 그리면 한 프레임에 3천 번이 넘어 버벅였다)
        var WB = [[], [], [], []];
        var line = function (fn) { var pv = null; for (var k = 0; k <= 72; k++) { var qq = fn(k / 72 * 6.2832); if (pv) WB[Math.min(3, ((pv[2] + qq[2]) / 2 + 1) * 2 | 0)].push(pv[0], pv[1], qq[0], qq[1]); pv = qq; } };
        x.lineWidth = .7;
        for (var bb2 = 1; bb2 < 43; bb2 += 2) (function (lat) { var y0 = Math.cos(lat), r0 = Math.sin(lat); line(function (th) { return pj(Math.cos(th) * r0, y0, Math.sin(th) * r0); }); })(Math.PI * bb2 / 43);
        for (var m = 0; m < 24; m++) (function (ph) { line(function (th) { return pj(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)); }); })(m / 24 * Math.PI);
        WB.forEach(function (seg, lv) { if (!seg.length) return; x.strokeStyle = 'rgba(140,190,255,' + wfa * (.03 + .09 * (lv + .5) / 4) + ')'; x.beginPath(); for (var k = 0; k < seg.length; k += 4) { x.moveTo(seg[k], seg[k + 1]); x.lineTo(seg[k + 2], seg[k + 3]); } x.stroke(); });
        var Rv = R * s * 1.75 / Math.sqrt(Math.max(camZ * camZ - 1, .05)), rg = x.createRadialGradient(cx, cy, Rv * .86, cx, cy, Rv * 1.06);
        rg.addColorStop(0, 'rgba(90,150,255,0)'); rg.addColorStop(.75, 'rgba(110,165,255,' + .16 * wfa + ')'); rg.addColorStop(1, 'rgba(90,150,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
      }
      var lt = eo((t - .35) / .9); x.lineWidth = small ? 1 : 1.3;
      if (lt > 0) {   // 별 연결선도 깊이 5단계로 묶어 그린다
        var EB = [[], [], [], [], []];
        for (i = 0; i < E.length; i++) { p = pr[E[i][0]]; q = pr[E[i][1]]; if (p.hid || q.hid) continue; EB[Math.min(4, ((p.Z + q.Z) / 2 + 1) * 2.5 | 0)].push(p.X, p.Y, q.X, q.Y); }
        EB.forEach(function (seg, lv) { if (!seg.length) return; x.strokeStyle = 'rgba(140,190,255,' + (.12 + .46 * (lv + .5) / 5) * lt * (1 - dv * .6) + ')'; x.beginPath(); for (var k = 0; k < seg.length; k += 4) { x.moveTo(seg[k], seg[k + 1]); x.lineTo(seg[k + 2], seg[k + 3]); } x.stroke(); });
      }
      for (i = 0; i < N; i++) {
        p = pr[i]; if (p.hid) continue;
        var dd = (p.Z + 1) / 2, tw = .75 + .25 * Math.sin(t * 2.4 + P[i].j * 20), hot = LA[i] > .05;
        var r = (.8 + 2.4 * dd * dd) * (.6 + .4 * s) * (hot ? 1.35 : 1) * Math.min(4, .55 + .45 * p.sc * 1.2) * (small ? .8 : 1);
        var al = cl(t / .35) * (.18 + .82 * dd) * tw;
        var sz = r * (dd > .45 || hot ? 9 : 5.5);   // 앞쪽 별일수록 빛살이 길다
        x.globalAlpha = Math.min(1, al); x.drawImage(hot ? SP_WARM : SP_COOL, p.X - sz / 2, p.Y - sz / 2, sz, sz); x.globalAlpha = 1;
      }
      x.globalCompositeOperation = 'source-over';
      // 기관 이름: 정면 쪽 별 몇 개만, 순서가 앞선 곳부터. 스며들듯 켜지고 꺼지며, 켜질 때 정한 쪽(왼/오른)에 끝까지 붙어 간다
      var la = eo((t - 1.1) / .8) * (1 - dv * 3);
      if (la > 0 || LA.some(function (v) { return v > .01; })) {
        var L = lg.getBoundingClientRect(), TB = ttl.getBoundingClientRect().bottom + 16, max = small ? 7 : wide ? 12 : 14;
        var ok = function (k) { var pp = pr[k]; if (pp.hid || pp.Y < TB || pp.Y > H - 24 || pp.X < 8 || pp.X > W - 8) return false; return !(pp.X > L.left - 30 && pp.X < L.right + 30 && pp.Y > L.top - 20 && pp.Y < L.bottom + 20); };
        var on = {}, n = 0, used = [], shown = {};
        x.font = (small ? '500 12px' : '500 15px') + ' "Pretendard Variable",Pretendard,sans-serif';
        var fits = function (k, keep) { var pp = pr[k], w = x.measureText(P[k].lab).width + 30, rt = keep ? SIDE[k] === 1 : pp.X > cx; return rt ? pp.X + w < W - 6 : pp.X - w > 6; };
        var Rv2 = R * s * 1.75 / Math.sqrt(Math.max(camZ * camZ - 1, .05)), mid = function (k, lim) { return Math.hypot(pr[k].X - cx, pr[k].Y - cy) < Rv2 * lim; };
        var fx = cx, fy = wide ? (TB + L.top) / 2 : cy;
        var top = o.top || 0, near = function (k) { return Math.hypot(pr[k].X - fx, pr[k].Y - fy) < Rv2 * .42; };
        // 글자 상자끼리 겹치지 않게
        var box = function (k, side) { var w = x.measureText(P[k].lab).width, X0 = side ? pr[k].X + 24 : pr[k].X - 24 - w; return [X0 - 6, X0 + w + 6, pr[k].Y]; };
        var hit = function (b) { return used.some(function (u) { return Math.abs(u[2] - b[2]) < 24 && b[0] < u[1] && u[0] < b[1]; }); };
        var cell = {}, ck = function (k) { return Math.floor(pr[k].X / (W / 6)) + ':' + Math.floor(pr[k].Y / (H / 4)); };
        for (i = 0; i < N; i++) if (P[i].lab && ON[i] && pr[i].Z > .02 && mid(i, wide ? .97 : .86) && ok(i) && fits(i, 1) && (CO.indexOf(P[i].lab) >= top || near(i))) { on[i] = 1; n++; shown[P[i].lab] = 1; used.push(box(i, SIDE[i] === 1)); cell[ck(i)] = (cell[ck(i)] || 0) + 1; }
        // 비어 있는 자리: 구 한가운데에 가까운 별부터, 아직 안 보이는 이름 중 순서가 앞선 것을 붙인다 (처음엔 J.P. Morgan·PwC 등 첫 화면 기관이 먼저)
        var free = CO.filter(function (nm) { return !shown[nm]; }), fi = 0;
        var cand = []; for (i = 0; i < N; i++) { if (!P[i].nm || on[i] || P[i].lab) continue; if (pr[i].Z < .02 || !mid(i, wide ? .95 : .72) || !ok(i)) continue; cand.push(i); }
        // 가장 눈에 띄는 자리(넓은 화면에서는 로그인 칸 바로 오른쪽)에 가까운 별부터 순위가 높은 이름을 받는다
        cand.sort(function (a2, b2) { return Math.hypot(pr[a2].X - fx, pr[a2].Y - fy) - Math.hypot(pr[b2].X - fx, pr[b2].Y - fy); });
        for (var c2 = 0; c2 < cand.length && n < max && fi < free.length; c2++) {
          i = cand[c2]; p = pr[i]; if ((cell[ck(i)] || 0) >= 3) continue;
          P[i].lab = free[fi]; var bx = box(i, p.X > cx); if (!fits(i) || hit(bx)) { P[i].lab = null; continue; }
          fi++; on[i] = 1; n++; cell[ck(i)] = (cell[ck(i)] || 0) + 1; used.push(bx); LA[i] = 0; SIDE[i] = p.X > cx ? 1 : 0;
        }
        x.textBaseline = "middle"; x.font = (small ? '500 12px' : '500 15px') + ' "Pretendard Variable",Pretendard,sans-serif';
        for (i = 0; i < N; i++) {
          ON[i] = on[i] ? 1 : 0; if (!P[i].lab) continue; var tg = on[i] ? la : 0; LA[i] += (tg - LA[i]) * (tg > LA[i] ? .035 : .06); var aa = LA[i]; if (aa < .01) { if (!on[i]) { P[i].lab = null; LA[i] = 0; } continue; }
          p = pr[i]; if (p.hid) continue; var right = SIDE[i] === 1; x.textAlign = right ? 'left' : 'right';
          x.strokeStyle = 'rgba(255,226,180,' + aa * .35 + ')'; x.lineWidth = .8; x.beginPath(); x.moveTo(p.X + (right ? 6 : -6), p.Y); x.lineTo(p.X + (right ? 6 + 14 * aa : -6 - 14 * aa), p.Y); x.stroke();
          x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 6; x.fillStyle = 'rgba(255,242,222,' + aa + ')'; x.fillText(P[i].lab, p.X + (right ? 24 : -24), p.Y); x.shadowBlur = 0;
        }
      }
      ttl.classList.toggle('on', t > .8); lg.classList.toggle('on', t > 1);
      if (g && g.el === el) raf = requestAnimationFrame(f);
    }
    raf = requestAnimationFrame(f);

    function destroy() {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      removeEventListener('resize', rs); removeEventListener('pointermove', pm);
      if (el.parentNode) el.parentNode.removeChild(el);
      if (g && g.el === el) g = null;
    }
    var api = {
      dive: function () {
        if (dive != null) return; dive = (performance.now() - start) / 1000;
        el.classList.add('dive'); setTimeout(destroy, 1900);
      },
      destroy: destroy
    };
    g = { el: el, api: api };
    setTimeout(function () { if (g && g.el === el && innerWidth >= 900) try { form.username.focus({ preventScroll: true }); } catch (e) {} }, 1200);
    return api;
  }

  window.AgoraGate = { mount: mount, isOpen: function () { return !!g; } };
})();
