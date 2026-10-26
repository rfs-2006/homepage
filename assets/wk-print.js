// 위클리 리포트를 A4 운용보고서(PDF)로 만든다. 화면에 그려진 .wr(리포트)에서 값을 읽어 표지 → 주요 운용 보고 → 운용 경과 → 펀드 개요 순으로 짠다.
// window.RFSPrint = { build(wrEl, opt) → HTML 문자열, open(wrEl, opt) → 새 창에서 인쇄(PDF 저장) }
// opt: { team: [[이름, 역할, 담당], ...], note: 매니저 한마디, turnover: 매매회전율 문자열, bm: 비교지수 이름 }
(function () {
  var NAVY = '#203864', SKY = '#8FAADC', PAPER = '#F7F6F3', INK = '#1A1A1A';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tx(root, sel) { var n = root.querySelector(sel); return n ? (n.textContent || n.getAttribute('data-t') || '').trim() : ''; }
  function abs(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }

  function read(wr) {
    var rows = [].slice.call(wr.querySelectorAll('.wr-pt tr')).slice(1).map(function (tr) {
      return [].slice.call(tr.children).map(function (td) { return { t: td.textContent.trim(), c: td.style.color || '' }; });
    });
    var hold = [].slice.call(wr.querySelectorAll('.wr-hold .wr-hr')).map(function (r) {
      var sm = r.querySelectorAll('small');
      return { n: tx(r, 'span'), w: tx(r, 'em'), d: sm[0] ? sm[0].textContent.trim() : '', dc: sm[0] ? sm[0].style.color : '', r: sm[1] ? sm[1].textContent.trim() : '', rc: sm[1] ? sm[1].style.color : '' };
    });
    var body = wr.querySelector('.wr-body');
    var b = body ? body.cloneNode(true) : document.createElement('div');
    b.querySelectorAll('img').forEach(function (im) { im.src = abs(im.getAttribute('src')); im.removeAttribute('loading'); });
    b.querySelectorAll('details').forEach(function (d) { d.setAttribute('open', ''); });
    b.querySelectorAll('.wr-h > span').forEach(function (s, i) { s.textContent = (i < 9 ? '0' : '') + (i + 1); }); // 화면은 01이 펀드 성과라 02부터, 보고서 본문은 01부터
    // 칸마다 제목(.wr-h)은 왼쪽, 나머지는 오른쪽 한 덩어리로
    b.querySelectorAll('.wr-sec').forEach(function (sec) {
      var c = document.createElement('div'); c.className = 'c';
      [].slice.call(sec.childNodes).forEach(function (k) { if (!(k.classList && k.classList.contains('wr-h'))) c.appendChild(k); });
      if (!sec.querySelector('.wr-h')) { var h = document.createElement('div'); h.className = 'wr-h'; sec.appendChild(h); }
      sec.appendChild(c);
    });
    var ch = wr.querySelector('.wr-ch');
    var ax = [].slice.call(wr.querySelectorAll('.wr-ax > span')).map(function (s) { return s.textContent.trim(); });
    return {
      kind: tx(wr, '.wr-k'), title: tx(wr, '.wr-t'), meta: tx(wr, '.wr-m'), asOf: tx(wr, '.wr-sl span'),
      rows: rows, hold: hold, body: b.innerHTML, chart: ch ? ch.outerHTML : '', chFrom: ax[0] || '', chTo: ax[2] || '', topAsOf: tx(wr, '.wr-hold .wr-h small'),
    };
  }

  // 삼성 자산운용보고서 밀도: 9pt 안팎, 줄간격 1.5, 표 줄 높이 5mm 남짓, 왼쪽에 큰 칸 제목 + 오른쪽 내용
  function css(doc) {
    var F = abs('/assets/fonts/rfs-report-dotum-');
    var hd = 'font:500 7.5pt D;color:' + NAVY + ';vertical-align:bottom;padding-bottom:2mm;border-bottom:.6pt solid ' + NAVY;
    return '@font-face{font-family:D;src:url(' + F + 'light.woff2) format("woff2");font-weight:300}' +
      '@font-face{font-family:D;src:url(' + F + 'medium.woff2) format("woff2");font-weight:500}' +
      '@font-face{font-family:D;src:url(' + F + 'bold.woff2) format("woff2");font-weight:700}' +
      '@page{size:A4;margin:16mm 13mm 13mm;@top-left{content:"' + String(doc || '').replace(/["\\]/g, '') + '";' + hd + '}@top-right{content:"R.F.S. Asset Management";' + hd + '}@bottom-left{content:counter(page, decimal-leading-zero);font:700 9pt D;color:' + NAVY + '}}' +
      '@page cover{margin:0;@top-left{content:none;border:0}@top-right{content:none;border:0}@bottom-left{content:none}}' +
      '*{box-sizing:border-box}html,body{margin:0;background:#fff;color:' + INK + ';font-family:D,"Pretendard Variable",sans-serif;font-weight:300;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      'body{font-size:8.8pt;line-height:1.5}b,strong{font-weight:700}' +
      // 표지
      '.cv{page:cover;height:297mm;display:flex;flex-direction:column;break-after:page;background:#fff}' +
      '.cv-top{background:' + NAVY + ';color:' + PAPER + ';height:118mm;padding:16mm 16mm 11mm;display:flex;flex-direction:column}' +
      '.cv-br{display:flex;justify-content:space-between;align-items:center}.cv-br img{width:13mm;height:auto}.cv-br p{margin:0;text-align:right;font-weight:500;font-size:8pt;letter-spacing:.16em;color:' + SKY + '}.cv-br p b{display:block;font-size:11pt;letter-spacing:.02em;color:' + PAPER + '}' +
      '.cv-t{margin-top:auto}.cv-t p{margin:0;font-size:9pt;letter-spacing:.2em;color:' + SKY + ';font-weight:500}.cv-t h1{margin:3mm 0 0;font-size:25pt;line-height:1.25;font-weight:700}.cv-t div{margin-top:3mm;font-size:10pt}' +
      '.cv-as{margin-top:9mm;padding-top:3mm;border-top:.6pt solid rgba(247,246,243,.35);display:flex;justify-content:space-between;font-size:8.5pt}' +
      '.cv-in{padding:11mm 16mm 0;flex:1;display:flex;flex-direction:column}' +
      '.cv-h,.sh{display:flex;align-items:baseline;gap:2.5mm;margin:0 0 2.5mm;font-size:10pt;font-weight:700;color:' + NAVY + '}.cv-h::before,.sh::before{content:"";align-self:center;width:1.2mm;height:3.6mm;background:' + NAVY + '}.sh small,.cv-h small{margin-left:auto;font-size:7.5pt;font-weight:300;color:' + INK + '}' +
      '.kp{display:flex;gap:9mm;margin:1mm 0 10mm}.kp div{min-width:0}.kp span{display:inline-block;font-size:7.8pt;font-weight:500;color:#fff;background:' + NAVY + ';padding:.5mm 2.5mm}' +
      '.kp b{display:block;margin-top:1.5mm;font-size:21pt;line-height:1.1;font-weight:500;letter-spacing:-.02em;font-variant-numeric:tabular-nums}.kp em{display:block;margin-top:1mm;font-style:normal;font-size:8pt}' +
      '.nt{font-size:11pt;line-height:1.5;font-weight:500;padding-left:3.7mm;min-height:20mm}.nt.empty{border-bottom:.5pt solid #D9D6CF;min-height:12mm}' +
      '.cv-ft{margin-top:auto;padding:4mm 0 10mm;font-size:7.5pt;line-height:1.55;border-top:.5pt solid #D9D6CF}' +
      // 왼쪽 큰 제목 + 오른쪽 내용 칸
      '.pg{break-before:page}' +
      '.blk{display:grid;grid-template-columns:38mm 1fr;column-gap:6mm;padding:5mm 0 6mm;border-bottom:.8pt solid #D9D6CF}.blk:last-child{border-bottom:0}' +
      '.blk>h2{margin:0;font-size:17pt;line-height:1.25;font-weight:700;color:' + INK + ';letter-spacing:-.02em}.blk>h2 small{display:block;margin-top:1.5mm;font-size:7.8pt;font-weight:300;letter-spacing:0}' +
      '.blk>div>*+.sh{margin-top:5mm}' +
      'table.t{width:100%;border-collapse:collapse;font-size:8.2pt;line-height:1.35;font-variant-numeric:tabular-nums}' +
      'table.t th{background:' + NAVY + ';color:#fff;font-weight:500;padding:1mm 1.8mm;text-align:right}table.t th:first-child,table.t td:first-child{text-align:left}' +
      'table.t td{padding:.9mm 1.8mm;text-align:right;border-bottom:.4pt solid #D9D6CF}table.t tr.f td{font-weight:700}table.t td.h{background:rgba(143,170,220,.22);font-weight:700}' +
      '.chw svg{display:block;width:100%;height:30mm}.chw .a{fill:rgba(32,56,100,.06)}.chw .z{fill:none;stroke:#CFCCC4;stroke-width:1}.chw .k{fill:none;stroke:' + SKY + ';stroke-width:1.3;vector-effect:non-scaling-stroke}.chw .f{fill:none;stroke:' + NAVY + ';stroke-width:1.6;vector-effect:non-scaling-stroke}' +
      '.ax{display:flex;justify-content:space-between;font-size:7.2pt;margin-top:1mm}.ax i{display:inline-block;width:4mm;height:1.2pt;margin:0 1.2mm .8mm 3mm;vertical-align:middle}' +
      '.two{display:grid;grid-template-columns:1fr 1fr;gap:4mm;align-items:start}.cap{margin:1mm 0 0;font-size:7.2pt}' +
      // 운용 경과(위클리 본문): 칸마다 왼쪽 제목, 오른쪽 글
      '.bd{font-size:8.8pt;line-height:1.55}.bd .wr-sec{display:grid;grid-template-columns:38mm 1fr;column-gap:6mm;padding:4.5mm 0 4mm;border-bottom:.8pt solid #D9D6CF}.bd .wr-sec:first-child{padding-top:0}' +
      '.bd .wr-h{display:block;margin:0;padding:0;border:0;break-after:avoid}.bd .wr-h span{display:block;font-size:7.5pt;font-weight:700;color:' + SKY + ';letter-spacing:.12em}.bd .wr-h h2{margin:.5mm 0 0;font-size:13pt;line-height:1.3;font-weight:700;color:' + INK + ';letter-spacing:-.02em}' +
      '.bd .c>:first-child{margin-top:0}.bd p{margin:.6mm 0}.bd .wr-sub{margin:3mm 0 .8mm;padding:.8mm 2.5mm;background:rgba(143,170,220,.2);font-weight:700;color:' + NAVY + ';break-after:avoid}.bd strong{color:' + NAVY + '}' +
      '.bd ul,.bd ol{margin:.6mm 0;padding-left:4mm}.bd li{margin:.15mm 0}.bd li::marker{color:' + NAVY + '}.bd li>ul,.bd li>ol{margin:.2mm 0}' +
      '.bd figure{margin:2.5mm 0;break-inside:avoid}.bd img{max-width:100%;max-height:78mm;height:auto;display:block;border:.4pt solid #D9D6CF}' +
      '.bd table{width:100%;border-collapse:collapse;margin:2mm 0;font-size:8pt;line-height:1.35;break-inside:avoid}.bd td,.bd th{border:.4pt solid #D9D6CF;padding:.8mm 1.6mm}.bd hr{display:none}.bd h1,.bd h2.h1{display:none}' +
      '.bd h3{margin:2.5mm 0 .8mm;font-size:9.5pt;color:' + NAVY + '}.bd details>summary{list-style:none;font-weight:700}.bd .chk{margin-right:1.2mm}' +
      // 부록
      'table.ov{width:100%;border-collapse:collapse;font-size:8.4pt;line-height:1.45}table.ov th{width:26mm;text-align:left;font-weight:500;color:' + NAVY + ';padding:1.2mm 0;border-bottom:.4pt solid #D9D6CF;vertical-align:top}table.ov td{padding:1.2mm 0;border-bottom:.4pt solid #D9D6CF}' +
      '.rk p{margin:0 0 1.2mm;font-size:8pt;line-height:1.5}.rk b{color:' + NAVY + ';margin-right:1.5mm}';
  }

  function build(wr, opt) {
    opt = opt || {};
    var d = read(wr), bm = opt.bm || 'KOSPI';
    var fund = d.rows[0] || [], kospi = d.rows[1] || [];
    var kp = [['1주', 1], ['1개월', 2], ['설정 이후', 4]].map(function (x) {
      var f = fund[x[1]] || { t: '—', c: '' }, k = kospi[x[1]] || { t: '—' };
      return '<div><span>' + x[0] + '</span><b style="color:' + (f.c || INK) + '">' + esc(f.t) + '</b><em>' + esc(bm) + ' ' + esc(k.t) + '</em></div>';
    }).join('');
    var note = (opt.note || '').trim();
    var head = ['구분', '1주', '1개월', '3개월', '설정 이후'];
    var perf = '<table class="t"><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr>' +
      d.rows.map(function (r, i) { return '<tr class="' + (i === 0 ? 'f' : '') + '">' + r.map(function (c, j) { return '<td' + (j === 1 ? ' class="h"' : '') + ' style="' + (j ? 'color:' + (c.c || INK) : '') + '">' + esc(c.t.replace(/%p?$/, '')) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
    var holdT = function (l) { return '<table class="t"><tr><th>종목명</th><th>비중</th><th>증감</th></tr>' + l.map(function (h) {
      return '<tr><td>' + esc(h.n) + '</td><td class="h">' + esc(h.w.replace('%', '')) + '</td><td style="color:' + (h.dc || INK) + '">' + esc((h.d || '-').replace('%p', '')) + '</td></tr>';
    }).join('') + '</table>'; };
    var num = function (s) { var m = /([+−-])\s*([\d.]+)/.exec(String(s).replace('−', '-')); return m ? (m[1] === '+' ? 1 : -1) * +m[2] : /편출/.test(s) ? -999 : 0; };
    var up = d.hold.filter(function (h) { return num(h.d) > 0; }).sort(function (a, b) { return num(b.d) - num(a.d); }).slice(0, 5);
    var dn = d.hold.filter(function (h) { return num(h.d) < 0; }).sort(function (a, b) { return num(a.d) - num(b.d); }).slice(0, 5);
    var mv = function (l) { return '<table class="t"><tr><th>종목명</th><th>증감</th></tr>' + (l.length ? l.map(function (h) { return '<tr><td>' + esc(h.n) + '</td><td style="color:' + (h.dc || INK) + '">' + esc(h.d.replace('%p', '')) + '</td></tr>'; }).join('') : '<tr><td>해당 종목 없음</td><td></td></tr>') + '</table>'; };
    var team = (opt.team || []).filter(function (r) { return r && r[0]; });
    var teamT = team.length ? '<table class="t"><tr><th>이름</th><th>역할</th><th>담당</th></tr>' + team.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td style="text-align:left">' + esc(r[1] || '') + '</td><td style="text-align:left">' + esc(r[2] || '') + '</td></tr>'; }).join('') + '</table>' : '';
    var seal = abs('/assets/rfs-seal-light-256.png');

    return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(d.title) + ' · AMT Fund 운용보고서</title><style>' + css('AMT Fund 주간 운용보고서 · ' + d.title) + '</style></head><body>' +
      '<section class="cv"><div class="cv-top"><div class="cv-br"><img src="' + seal + '" alt=""><p><b>주간 운용보고서</b>WEEKLY STRATEGY</p></div>' +
      '<div class="cv-t"><p>AMT FUND</p><h1>' + esc(d.title) + '</h1><div>' + esc(d.meta) + '</div></div>' +
      '<div class="cv-as"><span>R.F.S. Asset Management</span><span>' + esc(d.asOf) + '</span></div></div>' +
      '<div class="cv-in"><h2 class="cv-h">펀드 수익률<small>' + esc(d.asOf) + '</small></h2><div class="kp">' + kp + '</div>' +
      '<h2 class="cv-h">펀드매니저의 한마디</h2><div class="nt' + (note ? '' : ' empty') + '">' + esc(note) + '</div>' +
      '<p class="cv-ft">중앙대학교 가치투자학회 R.F.S. 운용팀이 교육 목적으로 운용하는 펀드의 주간 보고서입니다. 특정 종목의 매수·매도를 권유하지 않으며, 과거 수익률이 미래 수익을 보장하지 않습니다.</p></div></section>' +

      '<section class="pg">' +
      '<div class="blk"><h2>펀드 수익률<small>' + esc(d.asOf) + '</small></h2><div>' +
      '<div class="sh">기간 수익률<small>(단위: %) 비교지수 ' + esc(bm) + '</small></div>' + perf +
      (d.chart ? '<div class="sh">누적 수익률<small>설정일 기준</small></div><div class="chw">' + d.chart + '<div class="ax"><span>' + esc(d.chFrom) + '</span><span><i style="background:' + NAVY + '"></i>AMT Fund<i style="background:' + SKY + '"></i>' + esc(bm) + '</span><span>' + esc(d.chTo) + '</span></div></div>' : '') +
      '</div></div>' +
      '<div class="blk"><h2>운용 현황<small>' + esc(d.topAsOf.replace(/ ·.*$/, '')) + '</small></h2><div>' +
      (d.hold.length ? '<div class="sh">보유 종목 비중<small>(단위: %)</small></div><div class="two">' + holdT(d.hold.slice(0, Math.ceil(d.hold.length / 2))) + holdT(d.hold.slice(Math.ceil(d.hold.length / 2))) + '</div>' : '') +
      '<div class="sh">비중 증감<small>전주 대비 (단위: %p)</small></div><div class="two"><div>' + mv(up) + '<p class="cap">비중이 늘어난 종목</p></div><div>' + mv(dn) + '<p class="cap">비중이 줄어든 종목</p></div></div>' +
      '<div class="sh">매매회전율<small>최근 1주 · 매매 금액 ÷ 평균 순자산</small></div><table class="t"><tr><th>기간</th><th>회전율</th></tr><tr><td>최근 1주</td><td>' + esc(opt.turnover || '집계 중') + '</td></tr></table>' +
      '</div></div></section>' +

      '<section class="pg"><div class="bd">' + d.body + '</div></section>' +

      '<section class="pg"><div class="blk"><h2>펀드 개요</h2><div>' +
      '<table class="ov"><tr><th>펀드명</th><td>AMT Fund</td></tr><tr><th>운용</th><td>중앙대학교 가치투자학회 R.F.S. Asset Management Team</td></tr>' +
      '<tr><th>비교지수</th><td>' + esc(bm) + '</td></tr><tr><th>투자 대상</th><td>국내 상장 주식</td></tr>' +
      '<tr><th>투자 원칙</th><td>GPS — 성장(Growth)이 담보된 기업을 좋은 가격(Price)에 포착하고, 시장 심리(Sentiment)를 활용해 매매 시점을 잡는다</td></tr>' +
      '<tr><th>운용 방식</th><td>탑다운으로 유망 섹터 선정, 바텀업으로 종목 선별. 주간 회의에서 팀 합의로 편입·비중·엑시트 결정, 최종 책임은 운용팀장</td></tr>' +
      '<tr><th>보고</th><td>매주 투자전략(본 보고서), 이슈 발생 시 담당 매니저 코멘트</td></tr></table>' +
      '</div></div>' + (teamT ? '<div class="blk"><h2>운용 인력</h2><div>' + teamT + '</div></div>' : '') +
      '<div class="blk"><h2>투자 위험</h2><div class="rk">' +
      '<p><b>원본 손실 위험</b> 원본을 보장하지 않으며, 투자 원본의 전부 또는 일부 손실이 생길 수 있습니다.</p>' +
      '<p><b>시장 및 개별 종목 위험</b> 주식 가격, 금리 등 거시 지표 변화와 발행 회사의 영업·재무 상황에 따라 가치가 크게 변할 수 있습니다.</p>' +
      '<p><b>집중 투자 위험</b> 소수 종목·특정 업종에 집중 투자할 수 있어 해당 업종의 변동에 성과가 크게 좌우될 수 있습니다.</p>' +
      '<p><b>비교지수와의 괴리</b> 업종 구성과 종목 비중이 비교지수와 달라 시장 국면에 따라 수익률 차이가 커질 수 있습니다.</p>' +
      '<p><b>잦은 매매에 따른 비용</b> 시장 상황에 따라 적극적으로 매매하므로 매매 비용이 늘어날 수 있습니다.</p></div></div></section>' +
      '</body></html>';
  }

  function open(wr, opt) {
    var w = window.open('', '_blank');
    if (!w) return false;
    w.document.open(); w.document.write(build(wr, opt)); w.document.close();
    var go = function () { w.focus(); w.print(); };
    (w.document.fonts && w.document.fonts.ready ? w.document.fonts.ready : Promise.resolve()).then(function () { setTimeout(go, 400); });
    return true;
  }

  window.RFSPrint = { build: build, open: open };
})();
