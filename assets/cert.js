/* 수료증 만들기 (운영 대시보드 → '수료증'). 관리자만. RFSCert.open({ sb })
 * 양식은 학회 수료증 원본(A4 세로 794×1123px, 금색 이중 테두리·중앙대 워터마크·R.F.S. 엠블럼·인감·회장/부회장 서명)과 같다.
 * - 이름·기수·학기별 소속(리서치 1팀 팀원 …)을 넣으면 활동기간과 본문("리서치 1팀(팀원), 운용팀(팀장)으로 활동하며")을 만들어 바로 보여 준다.
 *   1학기 = 1월~6월, 2학기 = 7월~12월. 발급일은 오늘, 마지막 학기가 아직 안 끝났으면 그 학기 끝(6/30·12/31). 직접 바꿀 수 있다.
 * - 본문은 양끝 정렬. 줄마다 띄어쓰기가 너무 벌어지지 않게 본문 폭(좌우 108~140px)을 사람마다 골라 맞춘다.
 * - 회장·부회장 이름과 서명, 인감은 '서명·인감 설정'에서 바꾼다. 위조에 쓰일 수 있어서 공개 저장소가 아니라
 *   member-admin의 cert_get·cert_save(ops_state 'cert', 관리자만 읽음)에 둔다. 엠블럼·워터마크는 공개 파일(assets/cert/).
 * - PNG(300dpi)·PDF(A4)는 브라우저에서 만든다 (html2canvas·jsPDF, 버전 고정 + SRI). 만든 수료증은 서버에 남기지 않는다. */
(function () {
  var LIB = {
    h2c: { src: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', sri: 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H' },
    pdf: { src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', sri: 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk' },
  };
  var FONT = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700;800;900&display=swap';
  var UNITS = ['리서치 1팀', '리서치 2팀', '리서치 3팀', '리서치 4팀', '리서치 5팀', '리서치 6팀', '운용팀', '회장', '부회장'];
  var ROLES = ['팀원', '팀장'];
  // 설정을 아직 저장하지 않았을 때 쓰는 이름 (서명·인감 이미지는 공개 파일에 두지 않으므로 서버 설정에서만 온다)
  var DEFAULT_NAMES = { chair: '김민석', vice: '이승혁' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var kst = function () { return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); };
  var st = null;

  function call(sb, body) {
    return sb.functions.invoke('member-admin', { body: body }).then(function (r) {
      if (!r.error) return r.data || { ok: true };
      var ctx = r.error.context;
      return ctx && ctx.json ? ctx.json().then(function (j) { return { error: (j && j.error) || 'fail' }; }, function () { return { error: 'fail' }; }) : { error: 'fail' };
    }, function () { return { error: 'fail' }; });
  }
  function lib(k) {
    var g = k === 'h2c' ? 'html2canvas' : 'jspdf';
    if (window[g]) return Promise.resolve(window[g]);
    return new Promise(function (ok, no) {
      var sc = document.createElement('script'); sc.src = LIB[k].src; sc.integrity = LIB[k].sri; sc.crossOrigin = 'anonymous';
      sc.onload = function () { window[g] ? ok(window[g]) : no(); }; sc.onerror = no; document.head.appendChild(sc);
    });
  }

  // ---- 내용 만들기 (순수 함수)
  // rows: [{ y: 2025, h: 1|2, unit: '리서치 1팀', role: '팀원' }] (학기 순서대로)
  function semEnd(y, h) { return h === 1 ? y + '-06-30' : y + '-12-31'; }
  function compose(d) {
    var rows = (d.rows || []).filter(function (r) { return r.y && r.h && r.unit; }).slice().sort(function (a, b) { return a.y - b.y || a.h - b.h; });
    var parts = [];
    rows.forEach(function (r) {
      var t = /장$/.test(r.unit) && r.unit.indexOf('팀') < 0 ? r.unit : r.unit + '⁠(' + (r.role || '팀원') + ')';   // 회장·부회장은 괄호 없이. '3팀'과 '(팀장)'이 줄에서 갈라지지 않게 WJ
      if (parts.indexOf(t) < 0) parts.push(t);
    });
    var f = rows[0], l = rows[rows.length - 1];
    var period = f ? f.y + '년 ' + (f.h === 1 ? 1 : 7) + '월 ~ ' + l.y + '년 ' + (l.h === 1 ? 6 : 12) + '월' : '';
    var end = l ? semEnd(l.y, l.h) : '';
    return { parts: parts, period: period, end: end, autoDate: end && end > kst() ? end : kst() };
  }
  var korDate = function (s) { var p = (s || '').split('-'); return p.length === 3 ? +p[0] + '년 ' + +p[1] + '월 ' + +p[2] + '일' : ''; };
  var spaced = function (n) { return esc(n); };

  // ---- 수료증 한 장 (원본 수료증.html과 같은 자리·크기)
  var PAGE_CSS = '\
.rcp{position:relative;width:794px;height:1123px;background:#fff;overflow:hidden;font-family:"Noto Serif KR",serif;color:#000;line-height:normal;text-align:left}\
.rcp *{box-sizing:border-box;margin:0;padding:0;color:#000}\
.rcp .b1{position:absolute;inset:30px;border:1.3px solid #a98a55}.rcp .b2{position:absolute;inset:37px;border:.6px solid #a98a55}\
.rcp .cn{position:absolute;width:30px;height:30px;border:0 solid #a98a55}\
.rcp .tl{top:44px;left:44px;border-top-width:1px;border-left-width:1px}.rcp .tr{top:44px;right:44px;border-top-width:1px;border-right-width:1px}\
.rcp .bl{bottom:44px;left:44px;border-bottom-width:1px;border-left-width:1px}.rcp .br{bottom:44px;right:44px;border-bottom-width:1px;border-right-width:1px}\
.rcp .wm{position:absolute;left:197px;top:397px;width:400px;height:376px;opacity:.11}.rcp .wm img{width:100%;height:100%;display:block}\
.rcp .regno{position:absolute;top:84px;left:84px;font-size:12.5px;letter-spacing:.02em}\
.rcp .emb{position:absolute;top:62px;right:80px;width:64px;height:64px}\
.rcp h1{position:absolute;top:186px;left:0;right:0;text-align:center;font-size:50px;font-weight:800;line-height:1;letter-spacing:.55em;padding-left:.55em}\
.rcp .info{position:absolute;top:312px;left:130px;font-size:16.5px;line-height:40px;font-weight:500}\
.rcp .info div{display:flex}.rcp .k{width:76px;display:flex;justify-content:space-between}.rcp .c{width:26px;text-align:center}\
.rcp .nm{font-weight:700;letter-spacing:.35em}.rcp i{font-style:normal}\
.rcp .body{position:absolute;top:498px;left:124px;right:124px;font-size:21.5px;font-weight:600;line-height:2.05;text-align:justify;word-break:keep-all;text-indent:.5em}\
.rcp .nw{white-space:nowrap}\
.rcp .date{position:absolute;top:762px;left:0;right:0;text-align:center;font-size:19px;font-weight:500;letter-spacing:.08em;padding-left:.08em}\
.rcp .org{position:absolute;top:868px;left:0;right:0;text-align:center;font-size:21px;font-weight:700;letter-spacing:.06em;padding-left:.06em}\
.rcp .seal{position:absolute;left:547px;top:836px;width:88px;height:82px;object-fit:contain;mix-blend-mode:multiply;opacity:.95}\
.rcp .sg{position:absolute;top:925px;left:0;right:0;display:flex;justify-content:center;gap:56px}\
.rcp .sr{display:flex;align-items:center;gap:12px;height:64px}.rcp .sr .t{font-size:15px;font-weight:500;letter-spacing:.1em}\
.rcp .sr .n{font-size:23px;font-weight:700;letter-spacing:.22em}.rcp .sr img{display:block;width:auto;height:52px;margin-left:-10px}';
  function page(d, cfg) {
    var c = compose(d), date = d.date || c.autoDate, s = function (p) { return (cfg && cfg[p]) || {}; };
    var sig = function (p, t) { var o = s(p); return '<div class="sr"><span class="t">' + t + '</span><span class="n">' + spaced(o.name || '') + '</span>' + (o.sig ? '<img src="' + o.sig + '" alt="서명">' : '') + '</div>'; };
    return '<div class="rcp"><div class="b1"></div><div class="b2"></div><div class="cn tl"></div><div class="cn tr"></div><div class="cn bl"></div><div class="cn br"></div>' +
      '<div class="wm"><img src="/assets/cert/cau-watermark.webp" alt=""></div><div class="regno">고유번호 : 140-82-93254</div><img class="emb" src="/assets/cert/emblem-gold.svg" alt="">' +
      '<h1>수료증</h1><div class="info">' +
      '<div><span class="k"><i>기</i><i>수</i></span><span class="c">:</span><span>' + (d.gen ? '제' + esc(d.gen) + '기' : '') + '</span></div>' +
      '<div><span class="k"><i>활</i><i>동</i><i>기</i><i>간</i></span><span class="c">:</span><span>' + esc(c.period) + '</span></div>' +
      '<div><span class="k"><i>성</i><i>명</i></span><span class="c">:</span><span class="nm">' + esc((d.name || '').replace(/\s+/g, '')) + '</span></div></div>' +
      '<p class="body">위 사람은 비영리법인 중앙대학교 가치투자학회 <span class="nw">R.F.S.의</span> 학회원으로서 ' + (c.parts.length ? esc(c.parts.join(', ')) + '으로 활동하며 ' : '') + '회칙에 따른 정규 커리큘럼을 성실히 이수하였으므로 이 증서를 수여합니다.</p>' +
      '<div class="date">' + esc(korDate(date)) + '</div><div class="org">비영리법인 중앙대학교 가치투자학회 R.F.S.</div>' + (cfg && cfg.seal ? '<img class="seal" src="' + cfg.seal + '" alt="">' : '') +
      '<div class="sg">' + sig('chair', '회장') + sig('vice', '부회장') + '</div></div>';
  }
  // 본문 폭 맞추기: 좌우 108~140px 중 마지막 줄을 뺀 줄들의 남는 폭(= 양끝 정렬로 벌어질 띄어쓰기)이 가장 작은 값
  function fitBody(root) {
    var e = root.querySelector('.body'); if (!e) return;
    var best = null, k0 = e.getBoundingClientRect().width / (e.offsetWidth || 1) || 1;   // 미리보기는 줄여 보여 주므로 원래 크기로 환산
    for (var x = 108; x <= 140; x++) {
      e.style.left = e.style.right = x + 'px'; e.style.textAlign = 'left';
      var R = e.getBoundingClientRect().right, rng = document.createRange(), lines = {}, w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT), n;
      while ((n = w.nextNode())) for (var i = 0; i < n.length; i++) { rng.setStart(n, i); rng.setEnd(n, i + 1); var r = rng.getBoundingClientRect(); if (r.width) { var k = Math.round(r.top); lines[k] = Math.max(lines[k] || 0, r.right); } }
      var ks = Object.keys(lines).map(Number).sort(function (a, b) { return a - b; });
      if (ks.length > 4) continue;
      var slack = ks.slice(0, -1).map(function (k) { return (R - lines[k]) / k0; }), last = (R - lines[ks[ks.length - 1]]) / k0;
      var score = Math.max.apply(null, slack.concat([0])) + (last > 520 ? 400 : 0);
      if (!best || score < best.s) best = { x: x, s: score };
    }
    e.style.textAlign = ''; if (best) e.style.left = e.style.right = best.x + 'px';
  }

  // ---- 화면
  var CSS = '\
.rc{position:fixed;inset:0;z-index:3600;background:#F4F2ED;color:#131B27;overflow-y:auto;font:400 14px/1.6 "Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo",sans-serif}\
.rc *{box-sizing:border-box}.rc button,.rc input,.rc select{font:inherit}\
.rc-top{background:#0F1B2E;color:#F4F2ED}.rc-top-in{max-width:1240px;margin:0 auto;padding:28px max(24px,env(safe-area-inset-right,0px)) 28px max(24px,env(safe-area-inset-left,0px));display:flex;align-items:center;gap:16px}\
.rc-top h2{margin:0;font:400 28px/1.2 "Noto Serif KR",serif}.rc-top .ey{font-size:11px;letter-spacing:.24em;color:#C9B98A}\
.rc-top .x{margin-left:auto;width:40px;height:40px;border:1px solid rgba(244,242,237,.2);border-radius:2px;background:none;color:#F4F2ED;font-size:20px;cursor:pointer}\
.rc-in{max-width:1240px;margin:0 auto;padding:28px max(24px,env(safe-area-inset-right,0px)) 80px max(24px,env(safe-area-inset-left,0px));display:grid;grid-template-columns:minmax(0,1fr) 520px;gap:28px;align-items:start}\
.rc-f{background:#fff;border:1px solid #E7E4DD;border-radius:2px;padding:28px;display:grid;grid-template-columns:minmax(0,1fr);gap:20px;min-width:0}\
.rc-f h3{margin:0;font:600 15px/1.4 inherit}.rc-f .g{display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:12px}\
.rc label{display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:#6B7480;min-width:0}\
.rc input,.rc select{height:40px;border:1px solid #D8D4CB;border-radius:2px;padding:0 10px;background:#fff;color:#131B27;font-size:14px;min-width:0;width:100%}\
.rc input:focus,.rc select:focus{outline:2px solid #8FAADC;outline-offset:-1px}\
.rc-rows{display:grid;gap:8px;min-width:0}.rc-row{display:grid;grid-template-columns:minmax(72px,96px) minmax(72px,84px) minmax(0,1fr) minmax(64px,88px) 36px;gap:8px;align-items:center;min-width:0}\
.rc-row .del{height:40px;border:1px solid #D8D4CB;border-radius:2px;background:#fff;color:#6B7480;cursor:pointer}\
.rc .bt{height:40px;padding:0 16px;border:1px solid #D8D4CB;border-radius:2px;background:#fff;color:#131B27;font-weight:500;cursor:pointer}\
.rc .bt.p{background:#0F1B2E;border-color:#0F1B2E;color:#F4F2ED}.rc .bt:disabled{opacity:.5;cursor:default}\
.rc .acts{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.rc .msg{font-size:13px;color:#6B7480}\
.rc .note{margin:0;font-size:12.5px;color:#6B7480;line-height:1.7}\
.rc-pv{position:sticky;top:20px}.rc-pv .frame{width:520px;height:735px;overflow:hidden;background:#fff;box-shadow:0 1px 2px rgba(15,27,46,.1),0 16px 36px -18px rgba(15,27,46,.4)}\
.rc-pv .frame>.rcp{transform:scale(.6549);transform-origin:0 0}\
.rc-set{border-top:1px solid #E7E4DD;padding-top:20px}.rc-set summary{cursor:pointer;font-weight:600}\
.rc-sg{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}.rc-sg .bx{border:1px solid #E7E4DD;padding:14px;display:grid;gap:10px}\
.rc-sg .im{height:56px;display:flex;align-items:center;justify-content:center;background:#FAF9F6;border:1px dashed #D8D4CB}.rc-sg .im img{max-height:52px;max-width:100%}\
.rc-off{position:fixed;left:-20000px;top:0}\
@media (max-width:1180px){.rc-in{grid-template-columns:minmax(0,1fr)}.rc-pv{position:static}.rc-pv .frame{width:100%;max-width:520px;height:auto;aspect-ratio:794/1123}}\
@media (max-width:560px){.rc-row{grid-template-columns:1fr 1fr;}.rc-f .g,.rc-sg{grid-template-columns:1fr}}' + PAGE_CSS;

  function yearOpts(v) { var y0 = new Date().getFullYear(), o = ''; for (var y = y0 + 1; y >= 2018; y--) o += '<option' + (y === v ? ' selected' : '') + '>' + y + '</option>'; return o; }
  function rowHtml(r, i) {
    var role = r.unit === '회장' || r.unit === '부회장';
    return '<div class="rc-row" data-i="' + i + '"><select data-k="y" aria-label="연도">' + yearOpts(r.y) + '</select>' +
      '<select data-k="h" aria-label="학기"><option value="1"' + (r.h === 1 ? ' selected' : '') + '>1학기</option><option value="2"' + (r.h === 2 ? ' selected' : '') + '>2학기</option></select>' +
      '<select data-k="unit" aria-label="소속">' + UNITS.map(function (u) { return '<option' + (u === r.unit ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select>' +
      '<select data-k="role" aria-label="직책"' + (role ? ' disabled' : '') + '>' + ROLES.map(function (x) { return '<option' + (x === r.role ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
      '<button class="del" type="button" data-del="' + i + '" aria-label="이 학기 지우기">×</button></div>';
  }
  function nextSem(r) { return r.h === 1 ? { y: r.y, h: 2 } : { y: r.y + 1, h: 1 }; }

  function draw() {
    if (!st) return;
    var pv = st.el.querySelector('.frame');
    pv.innerHTML = page(st.d, st.cfg);
    fitBody(pv);
    var c = compose(st.d), di = st.el.querySelector('#rc-date');
    if (!st.dateTouched) di.value = c.autoDate;
    var ok = st.d.name && st.d.gen && c.parts.length;
    st.el.querySelectorAll('[data-a="png"],[data-a="pdf"]').forEach(function (b) { b.disabled = !ok; });
  }
  function readRows() {
    st.d.rows = Array.prototype.map.call(st.el.querySelectorAll('.rc-row'), function (row) {
      var g = function (k) { return row.querySelector('[data-k="' + k + '"]').value; };
      return { y: +g('y'), h: +g('h'), unit: g('unit'), role: g('role') };
    });
  }
  function drawRows() {
    st.el.querySelector('.rc-rows').innerHTML = st.d.rows.map(rowHtml).join('');
  }
  function fileName() { return (st.d.name || '수료증').replace(/\s+/g, '') + '_수료증'; }
  function capture() {
    // 미리보기는 줄여 보여 주므로, 화면 밖에 원래 크기로 한 장 더 그려서 찍는다
    // html2canvas는 SVG 그림(엠블럼·서명)을 빠뜨릴 때가 있어서, 찍기 전에 SVG를 큰 PNG로 바꿔 둔다
    var off = document.createElement('div'); off.className = 'rc-off'; off.innerHTML = page(st.d, st.cfg); st.el.appendChild(off);
    var imgs = Array.prototype.map.call(off.querySelectorAll('img'), function (im) {
      return (im.complete ? Promise.resolve() : new Promise(function (ok) { im.onload = im.onerror = ok; })).then(function () { return /\.svg($|\?)|^data:image\/svg/.test(im.getAttribute('src')) ? toPng(im) : null; });
    });
    return Promise.all([lib('h2c'), document.fonts.ready].concat(imgs)).then(function (r) {
      fitBody(off);
      return r[0](off.firstChild, { scale: 3.125, backgroundColor: '#ffffff', useCORS: true, logging: false });
    }).then(function (cv) { off.remove(); return cv; }, function (e) { off.remove(); throw e; });
  }
  function toPng(im) {
    return new Promise(function (ok) {
      var w = im.offsetWidth || 64, h = im.offsetHeight || 64, k = 6, c = document.createElement('canvas'), src = new Image();
      c.width = w * k; c.height = h * k;
      src.onload = function () { try { c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); var u = c.toDataURL('image/png'); im.onload = function () { ok(); }; im.src = u; } catch (e) { ok(); } };
      src.onerror = function () { ok(); };
      src.src = im.src;
    });
  }
  function dl(href, name) { var a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }

  function open(o) {
    if (!document.getElementById('rc-css')) {
      var c = document.createElement('style'); c.id = 'rc-css'; c.textContent = CSS; document.head.appendChild(c);
      var f = document.createElement('link'); f.rel = 'stylesheet'; f.href = FONT; document.head.appendChild(f);
    }
    close();
    var y = new Date().getFullYear(), h = new Date().getMonth() < 6 ? 1 : 2;
    st = { sb: o.sb, cfg: { chair: { name: DEFAULT_NAMES.chair }, vice: { name: DEFAULT_NAMES.vice }, seal: '' }, d: { name: '', gen: '', rows: [{ y: h === 1 ? y - 1 : y, h: h === 1 ? 2 : 1, unit: '리서치 1팀', role: '팀원' }, { y: y, h: h, unit: '리서치 1팀', role: '팀원' }] } };
    var el = document.createElement('div'); el.className = 'rc'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '수료증 만들기');
    el.innerHTML = '<div class="rc-top"><div class="rc-top-in"><div><div class="ey">R.F.S. · CERTIFICATE</div><h2>수료증 만들기</h2></div><button class="x" type="button" aria-label="닫기">×</button></div></div>' +
      '<div class="rc-in"><form class="rc-f" autocomplete="off">' +
      '<div class="g"><label>성명<input id="rc-name" maxlength="10" placeholder="홍길동"></label><label>기수<input id="rc-gen" inputmode="numeric" maxlength="3" placeholder="41"></label></div>' +
      '<div><h3>활동 학기 · 소속</h3><p class="note">한 학기에 한 줄. 1학기는 1~6월, 2학기는 7~12월로 활동기간을 만들어요. 같은 소속·직책이 다시 나오면 본문에는 한 번만 적어요.</p></div>' +
      '<div class="rc-rows"></div><div class="acts"><button class="bt" type="button" data-a="addrow">학기 추가</button></div>' +
      '<label style="max-width:220px">발급일<input id="rc-date" type="date"></label>' +
      '<p class="note">기본 발급일은 오늘이에요. 마지막 학기가 아직 안 끝났으면 그 학기 마지막 날(6/30, 12/31)로 들어가요.</p>' +
      '<div class="acts"><button class="bt p" type="button" data-a="png" disabled>PNG 저장</button><button class="bt p" type="button" data-a="pdf" disabled>PDF 저장</button><span class="msg" data-m="out"></span></div>' +
      '<details class="rc-set"><summary>서명·인감 설정</summary><p class="note" style="margin-top:8px">회장·부회장이 바뀌면 여기서 이름과 서명을 바꿔요. 서명·인감 이미지는 배경이 투명한 PNG나 SVG가 좋아요. 관리자만 볼 수 있는 곳에 저장돼요.</p>' +
      '<div class="rc-sg">' + ['chair', 'vice'].map(function (p) { var t = p === 'chair' ? '회장' : '부회장'; return '<div class="bx"><label>' + t + ' 이름<input data-p="' + p + '" data-k="name" maxlength="10"></label><div class="im" data-im="' + p + '">서명 없음</div><label>' + t + ' 서명 이미지<input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" data-p="' + p + '" data-k="sig"></label></div>'; }).join('') +
      '<div class="bx"><div class="im" data-im="seal">인감 없음</div><label>인감 이미지<input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" data-k="seal"></label></div></div>' +
      '<div class="acts" style="margin-top:16px"><button class="bt p" type="button" data-a="savecfg">설정 저장</button><span class="msg" data-m="cfg"></span></div></details>' +
      '</form><div class="rc-pv"><div class="frame"></div><p class="note" style="margin-top:10px">미리보기 · 저장하면 A4 원래 크기(PNG 300dpi, PDF)로 나와요</p></div></div>';
    document.body.appendChild(el); st.el = el;
    drawRows();
    el.querySelector('.x').onclick = close;
    st.key = function (e) { if (e.key === 'Escape') close(); }; document.addEventListener('keydown', st.key);
    var form = el.querySelector('.rc-f');
    form.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id === 'rc-name') st.d.name = t.value; else if (t.id === 'rc-gen') st.d.gen = t.value.replace(/\D/g, '');
      else if (t.id === 'rc-date') { st.d.date = t.value; st.dateTouched = !!t.value; }
      else if (t.dataset.p && t.dataset.k === 'name') st.cfg[t.dataset.p].name = t.value;
      else if (t.closest('.rc-row')) { readRows(); if (t.dataset.k === 'unit') drawRows(); }
      if (t.type !== 'file') draw();
    });
    form.addEventListener('change', function (e) {
      var t = e.target; if (t.type !== 'file' || !t.files[0]) return;
      if (t.files[0].size > 400 * 1024) { el.querySelector('[data-m="cfg"]').textContent = '이미지는 400KB 이하로 올려 주세요'; t.value = ''; return; }
      var rd = new FileReader();
      rd.onload = function () { if (t.dataset.k === 'seal') st.cfg.seal = rd.result; else st.cfg[t.dataset.p].sig = rd.result; drawCfg(); draw(); el.querySelector('[data-m="cfg"]').textContent = '바뀜 · 설정 저장을 눌러야 다음에도 남아요'; };
      rd.readAsDataURL(t.files[0]);
    });
    form.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      if (t.dataset.del != null) { readRows(); st.d.rows.splice(+t.dataset.del, 1); drawRows(); draw(); return; }
      var a = t.dataset.a;
      if (a === 'addrow') { readRows(); var l = st.d.rows[st.d.rows.length - 1] || { y: new Date().getFullYear() - 1, h: 2, unit: '리서치 1팀', role: '팀원' }; var n = nextSem(l); st.d.rows.push({ y: n.y, h: n.h, unit: l.unit, role: '팀원' }); drawRows(); draw(); }
      if (a === 'savecfg') {
        var m = el.querySelector('[data-m="cfg"]'); m.textContent = '저장 중';
        call(st.sb, { action: 'cert_save', value: st.cfg }).then(function (r) { if (st) m.textContent = r && r.ok ? '저장됨' : r && r.error === 'size' ? '이미지가 너무 커요' : '저장 실패 · member-admin 배포 확인'; });
      }
      if (a === 'png' || a === 'pdf') {
        var mo = el.querySelector('[data-m="out"]'); mo.textContent = '만드는 중'; t.disabled = true;
        capture().then(function (cv) {
          if (a === 'png') { dl(cv.toDataURL('image/png'), fileName() + '.png'); mo.textContent = 'PNG 저장됨'; t.disabled = false; return; }
          return lib('pdf').then(function (J) {
            var doc = new J.jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
            doc.addImage(cv.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
            doc.save(fileName() + '.pdf'); mo.textContent = 'PDF 저장됨'; t.disabled = false;
          });
        }).catch(function () { if (st) { mo.textContent = '만들지 못했어요 · 새로고침 뒤 다시'; t.disabled = false; } });
      }
    });
    draw();
    call(st.sb, { action: 'cert_get' }).then(function (r) {
      if (!st) return;
      if (r && r.ok && r.cert) st.cfg = { chair: r.cert.chair || { name: DEFAULT_NAMES.chair }, vice: r.cert.vice || { name: DEFAULT_NAMES.vice }, seal: r.cert.seal || '' };
      else if (!(r && r.ok)) el.querySelector('[data-m="cfg"]').textContent = '설정을 못 불러왔어요 · member-admin 배포 확인';
      if (!st.cfg.chair.sig || !st.cfg.seal) el.querySelector('.rc-set').open = true;
      drawCfg(); draw();
    });
  }
  function drawCfg() {
    ['chair', 'vice'].forEach(function (p) {
      st.el.querySelector('[data-p="' + p + '"][data-k="name"]').value = st.cfg[p].name || '';
      st.el.querySelector('[data-im="' + p + '"]').innerHTML = st.cfg[p].sig ? '<img src="' + st.cfg[p].sig + '" alt="서명">' : '서명 없음';
    });
    st.el.querySelector('[data-im="seal"]').innerHTML = st.cfg.seal ? '<img src="' + st.cfg.seal + '" alt="인감">' : '인감 없음';
  }
  function close() {
    if (!st) return;
    document.removeEventListener('keydown', st.key);
    var el = st.el; st = null; if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  window.RFSCert = { open: open, close: close, compose: compose };
})();
