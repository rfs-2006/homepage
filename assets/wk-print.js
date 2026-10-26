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
    var ch = wr.querySelector('.wr-ch');
    var ax = [].slice.call(wr.querySelectorAll('.wr-ax > span')).map(function (s) { return s.textContent.trim(); });
    return {
      kind: tx(wr, '.wr-k'), title: tx(wr, '.wr-t'), meta: tx(wr, '.wr-m'), asOf: tx(wr, '.wr-sl span'),
      rows: rows, hold: hold, body: b.innerHTML, chart: ch ? ch.outerHTML : '', chFrom: ax[0] || '', chTo: ax[2] || '', topAsOf: tx(wr, '.wr-hold .wr-h small'),
    };
  }

  function css(doc) {
    var F = abs('/assets/fonts/rfs-report-dotum-');
    return '@font-face{font-family:D;src:url(' + F + 'light.woff2) format("woff2");font-weight:300}' +
      '@font-face{font-family:D;src:url(' + F + 'medium.woff2) format("woff2");font-weight:500}' +
      '@font-face{font-family:D;src:url(' + F + 'bold.woff2) format("woff2");font-weight:700}' +
      '@page{size:A4;margin:22mm 16mm 18mm;@top-left{content:"' + String(doc || '').replace(/["\\]/g, '') + '";font:500 8pt D;color:' + NAVY + ';vertical-align:bottom;padding-bottom:3mm;border-bottom:.6pt solid ' + NAVY + '}@top-right{content:"R.F.S. Asset Management";font:500 8pt D;color:' + NAVY + ';vertical-align:bottom;padding-bottom:3mm;border-bottom:.6pt solid ' + NAVY + '}@bottom-center{content:counter(page);font:500 8pt D;color:' + INK + '}}' +
      '@page cover{margin:0;@top-left{content:none;border:0}@top-right{content:none;border:0}@bottom-center{content:none}}' +
      '*{box-sizing:border-box}html,body{margin:0;background:#fff;color:' + INK + ';font-family:D,"Pretendard Variable",sans-serif;font-weight:300;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      'body{font-size:9.6pt;line-height:1.7}b,strong{font-weight:700}' +
      // 표지
      '.cv{page:cover;height:297mm;display:flex;flex-direction:column;break-after:page;background:' + PAPER + '}' +
      '.cv-top{background:' + NAVY + ';color:' + PAPER + ';height:150mm;padding:18mm 18mm 14mm;display:flex;flex-direction:column}' +
      '.cv-br{display:flex;justify-content:space-between;align-items:center}.cv-br img{width:15mm;height:auto}.cv-br p{margin:0;text-align:right;font-weight:500;font-size:9pt;letter-spacing:.16em;color:' + SKY + '}.cv-br p b{display:block;font-size:12pt;letter-spacing:.02em;color:' + PAPER + '}' +
      '.cv-t{margin-top:auto}.cv-t p{margin:0;font-size:10pt;letter-spacing:.2em;color:' + SKY + ';font-weight:500}.cv-t h1{margin:4mm 0 0;font-size:30pt;line-height:1.25;font-weight:700;letter-spacing:-.01em}.cv-t div{margin-top:4mm;font-size:11pt;color:' + PAPER + '}' +
      '.cv-as{margin-top:12mm;padding-top:4mm;border-top:.6pt solid rgba(247,246,243,.35);display:flex;justify-content:space-between;font-size:9.5pt}' +
      '.cv-in{padding:12mm 18mm 0;flex:1;display:flex;flex-direction:column}' +
      '.cv-h{margin:0 0 4mm;font-size:11pt;font-weight:700;color:' + NAVY + ';padding-bottom:2.5mm;border-bottom:1.4pt solid ' + NAVY + '}' +
      '.kp{display:grid;grid-template-columns:repeat(3,1fr);margin-bottom:11mm}.kp div{padding:2mm 0 0}.kp div+div{border-left:.6pt solid #D9D6CF;padding-left:6mm}' +
      '.kp span{display:block;font-size:9.5pt;font-weight:500}.kp b{display:block;margin-top:1.5mm;font-size:24pt;line-height:1.1;font-variant-numeric:tabular-nums}.kp em{display:block;margin-top:1.5mm;font-style:normal;font-size:9pt}' +
      '.nt{min-height:30mm;border-top:.6pt solid #D9D6CF;padding-top:4mm;font-size:12pt;line-height:1.6;font-weight:500;color:' + NAVY + '}.nt.empty{background:repeating-linear-gradient(#F7F6F3 0 9.5mm,#D9D6CF 9.5mm 9.8mm)}' +
      '.cv-ft{margin-top:auto;padding:5mm 0 12mm;font-size:8pt;line-height:1.6;border-top:.6pt solid #D9D6CF}' +
      // 본문 공통
      '.pg{break-before:page}.pg:first-of-type{break-before:auto}' +
      '.ch{display:flex;align-items:baseline;gap:4mm;margin:0 0 6mm;padding-bottom:3mm;border-bottom:1.6pt solid ' + NAVY + '}.ch span{font-size:11pt;font-weight:700;color:' + SKY + '}.ch h2{margin:0;font-size:16pt;font-weight:700;color:' + NAVY + '}' +
      '.sh{margin:8mm 0 3mm;font-size:11pt;font-weight:700;color:' + NAVY + ';display:flex;align-items:baseline}.sh small{margin-left:auto;font-size:8.5pt;font-weight:300;color:' + INK + '}' +
      'table.t{width:100%;border-collapse:collapse;font-size:9pt;font-variant-numeric:tabular-nums}table.t th{background:' + NAVY + ';color:' + PAPER + ';font-weight:500;padding:2mm 2.5mm;text-align:right}table.t th:first-child,table.t td:first-child{text-align:left}' +
      'table.t td{padding:2mm 2.5mm;text-align:right;border-bottom:.5pt solid #D9D6CF}table.t tr.f td{font-weight:700}' +
      '.chw svg{display:block;width:100%;height:40mm}.chw .a{fill:rgba(32,56,100,.06)}.chw .z{fill:none;stroke:#CFCCC4;stroke-width:1}.chw .k{fill:none;stroke:' + SKY + ';stroke-width:1.6;vector-effect:non-scaling-stroke}.chw .f{fill:none;stroke:' + NAVY + ';stroke-width:2;vector-effect:non-scaling-stroke}' +
      '.ax{display:flex;justify-content:space-between;font-size:8pt;margin-top:1.5mm}.ax i{display:inline-block;width:5mm;height:1.4pt;margin:0 1.5mm 1mm 4mm;vertical-align:middle}' +
      '.three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7mm}' +
      '.mv{font-size:9pt}.mv div{display:flex;justify-content:space-between;padding:1.6mm 0;border-bottom:.5pt solid #D9D6CF}.mv p{margin:0;padding:2mm 0}' +
      '.to{display:flex;justify-content:space-between;align-items:baseline;padding:1.6mm 0;border-bottom:.5pt solid #D9D6CF;font-size:9pt}.to b{font-size:14pt;color:' + NAVY + '}' +
      // 운용 경과(위클리 본문)
      '.bd{font-size:9.8pt;line-height:1.75}.bd .wr-sec{break-inside:auto}.bd .wr-h{display:flex;align-items:baseline;gap:3mm;margin:9mm 0 3mm;padding-bottom:2mm;border-bottom:1pt solid ' + NAVY + ';break-after:avoid}.bd .wr-sec:first-child .wr-h{margin-top:0}' +
      '.bd .wr-h span{font-size:9pt;font-weight:700;color:' + SKY + '}.bd .wr-h h2{margin:0;font-size:12.5pt;font-weight:700;color:' + NAVY + '}' +
      '.bd p{margin:1.5mm 0}.bd .wr-sub{margin:5mm 0 1mm;padding-left:2.5mm;border-left:2pt solid ' + SKY + ';font-weight:700;break-after:avoid}.bd strong{color:' + NAVY + '}' +
      '.bd ul,.bd ol{margin:1mm 0;padding-left:5mm}.bd li{margin:.6mm 0}.bd li::marker{color:' + NAVY + '}' +
      '.bd figure{margin:4mm auto;max-width:150mm;break-inside:avoid}.bd img{max-width:100%;max-height:110mm;height:auto;display:block;margin:0 auto;border:.5pt solid #D9D6CF}' +
      '.bd table{width:100%;border-collapse:collapse;margin:3mm 0;font-size:8.8pt;break-inside:avoid}.bd td,.bd th{border:.5pt solid #D9D6CF;padding:1.5mm 2mm}.bd hr{display:none}.bd h1,.bd h2.h1{display:none}' +
      '.bd details>summary{list-style:none;font-weight:700}.bd .chk{margin-right:1.5mm}' +
      // 부록
      'table.ov{width:100%;border-collapse:collapse;font-size:9pt}table.ov th{width:32mm;text-align:left;font-weight:500;color:' + NAVY + ';padding:2.2mm 0;border-bottom:.5pt solid #D9D6CF;vertical-align:top}table.ov td{padding:2.2mm 0;border-bottom:.5pt solid #D9D6CF}' +
      '.rk p{margin:0 0 2mm;font-size:8.6pt;line-height:1.65}.rk b{color:' + NAVY + '}';
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
      d.rows.map(function (r, i) { return '<tr class="' + (i === 0 ? 'f' : '') + '">' + r.map(function (c, j) { return '<td style="' + (j ? 'color:' + (c.c || INK) : '') + '">' + esc(c.t) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
    var hold = '<table class="t"><tr><th>종목</th><th>비중</th><th>전주 대비</th></tr>' + d.hold.map(function (h) {
      return '<tr><td>' + esc(h.n) + '</td><td>' + esc(h.w) + '</td><td style="color:' + (h.dc || INK) + '">' + esc(h.d || '—') + '</td></tr>';
    }).join('') + '</table>';
    var num = function (s) { var m = /([+−-])\s*([\d.]+)/.exec(String(s).replace('−', '-')); return m ? (m[1] === '+' ? 1 : -1) * +m[2] : /편출/.test(s) ? -999 : 0; };
    var up = d.hold.filter(function (h) { return num(h.d) > 0; }).sort(function (a, b) { return num(b.d) - num(a.d); }).slice(0, 5);
    var dn = d.hold.filter(function (h) { return num(h.d) < 0; }).sort(function (a, b) { return num(a.d) - num(b.d); }).slice(0, 5);
    var mv = function (l) { return l.length ? l.map(function (h) { return '<div><span>' + esc(h.n) + '</span><span style="color:' + (h.dc || INK) + '">' + esc(h.d) + '</span></div>'; }).join('') : '<p>해당 종목 없음</p>'; };
    var team = (opt.team || []).filter(function (r) { return r && r[0]; });
    var teamT = team.length ? '<table class="t"><tr><th>이름</th><th>역할</th><th>담당</th></tr>' + team.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td style="text-align:left">' + esc(r[1] || '') + '</td><td style="text-align:left">' + esc(r[2] || '') + '</td></tr>'; }).join('') + '</table>' : '';
    var seal = abs('/assets/rfs-seal-light-256.png');

    return '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(d.title) + ' · AMT Fund 운용보고서</title><style>' + css('AMT Fund 주간 운용보고서 · ' + d.title) + '</style></head><body>' +
      '<section class="cv"><div class="cv-top"><div class="cv-br"><img src="' + seal + '" alt=""><p><b>주간 운용보고서</b>WEEKLY STRATEGY</p></div>' +
      '<div class="cv-t"><p>AMT FUND</p><h1>' + esc(d.title) + '</h1><div>' + esc(d.meta) + '</div></div>' +
      '<div class="cv-as"><span>R.F.S. Asset Management</span><span>' + esc(d.asOf) + '</span></div></div>' +
      '<div class="cv-in"><h2 class="cv-h">펀드 수익률</h2><div class="kp">' + kp + '</div>' +
      '<h2 class="cv-h">매니저의 한마디</h2><div class="nt' + (note ? '' : ' empty') + '">' + esc(note) + '</div>' +
      '<p class="cv-ft">중앙대학교 가치투자학회 R.F.S. 운용팀이 교육 목적으로 운용하는 펀드의 주간 보고서입니다. 특정 종목의 매수·매도를 권유하지 않으며, 과거 수익률이 미래 수익을 보장하지 않습니다.</p></div></section>' +

      '<section class="pg"><p class="doc" style="display:none">AMT Fund 주간 운용보고서 · ' + esc(d.title) + '</p>' +
      '<div class="ch"><span>Ⅰ</span><h2>주요 운용 보고</h2></div>' +
      '<div class="sh">기간 수익률<small>비교지수 ' + esc(bm) + ' · ' + esc(d.asOf) + '</small></div>' + perf +
      (d.chart ? '<div class="sh">누적 수익률<small>설정일 기준</small></div><div class="chw">' + d.chart + '<div class="ax"><span>' + esc(d.chFrom) + '</span><span><i style="background:' + NAVY + '"></i>AMT Fund<i style="background:' + SKY + '"></i>' + esc(bm) + '</span><span>' + esc(d.chTo) + '</span></div></div>' : '') +
      (d.hold.length ? '<div class="sh">보유 종목 비중<small>' + esc(d.topAsOf) + '</small></div>' + hold +
        '' : '') +
      '<div class="three"><div><div class="sh">비중이 늘어난 종목</div><div class="mv">' + mv(up) + '</div></div><div><div class="sh">비중이 줄어든 종목</div><div class="mv">' + mv(dn) + '</div></div>' +
      '<div><div class="sh">매매회전율</div><div class="to"><span>최근 1주</span><b>' + esc(opt.turnover || '집계 중') + '</b></div><p style="margin:1.5mm 0 0;font-size:8pt">매매 금액 ÷ 평균 순자산</p></div></div></section>' +

      '<section class="pg"><div class="ch"><span>Ⅱ</span><h2>운용 경과 및 계획</h2></div><div class="bd">' + d.body + '</div></section>' +

      '<section class="pg"><div class="ch"><span>Ⅲ</span><h2>펀드 개요</h2></div>' +
      '<table class="ov"><tr><th>펀드명</th><td>AMT Fund</td></tr><tr><th>운용</th><td>중앙대학교 가치투자학회 R.F.S. Asset Management Team</td></tr>' +
      '<tr><th>비교지수</th><td>' + esc(bm) + '</td></tr><tr><th>투자 대상</th><td>국내 상장 주식</td></tr>' +
      '<tr><th>투자 원칙</th><td>GPS — 성장(Growth)이 담보된 기업을 좋은 가격(Price)에 포착하고, 시장 심리(Sentiment)를 활용해 매매 시점을 잡는다</td></tr>' +
      '<tr><th>운용 방식</th><td>탑다운으로 유망 섹터 선정, 바텀업으로 종목 선별. 주간 회의에서 팀 합의로 편입·비중·엑시트 결정, 최종 책임은 운용팀장</td></tr>' +
      '<tr><th>보고</th><td>매주 투자전략(본 보고서), 이슈 발생 시 담당 매니저 코멘트</td></tr></table>' +
      (teamT ? '<div class="sh">운용 인력</div>' + teamT : '') +
      '<div class="sh">투자 위험</div><div class="rk">' +
      '<p><b>원본 손실 위험</b> 원본을 보장하지 않으며, 투자 원본의 전부 또는 일부 손실이 생길 수 있습니다.</p>' +
      '<p><b>시장 및 개별 종목 위험</b> 주식 가격, 금리 등 거시 지표 변화와 발행 회사의 영업·재무 상황에 따라 가치가 크게 변할 수 있습니다.</p>' +
      '<p><b>집중 투자 위험</b> 소수 종목·특정 업종에 집중 투자할 수 있어 해당 업종의 변동에 성과가 크게 좌우될 수 있습니다.</p>' +
      '<p><b>비교지수와의 괴리</b> 업종 구성과 종목 비중이 비교지수와 달라 시장 국면에 따라 수익률 차이가 커질 수 있습니다.</p>' +
      '<p><b>잦은 매매에 따른 비용</b> 시장 상황에 따라 적극적으로 매매하므로 매매 비용이 늘어날 수 있습니다.</p></div></section>' +
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
