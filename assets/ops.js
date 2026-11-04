/* 운영 대시보드: 관리자(member-admin의 MEMBER_ADMINS)만. AGORA 위쪽 바의 '운영'에서 연다 (app.js openJoinAdmin).
 * 한 화면에 ① 계좌 잔액·이번 달 유지비·버틸 수 있는 기간·승인 대기 ② 회원가입 승인 ③ 계좌 잔액 기록(손으로 입력)
 * ③-2 방문자(Google Analytics, member-admin의 ga) ④ Voyage 사용량·Polaris 질문 수(Polaris 서버 /usage, 이번 달·지난달) ⑤ 유지비 표 ⑥ 문자 기록 ⑦ 알림 메일 설정. (홈페이지 유지비만 본다: Claude API는 뺐다)
 * 저장은 member-admin의 ops_save → ops_state 테이블(사이트에서는 못 읽음). 금액은 공개 화면 어디에도 나가지 않는다.
 * RFSOps.open({ sb, onPending }) */
(function () {
  var API = 'https://api.caurfs.kr';
  // Voyage 단가 (USD / 100만 토큰). 계정마다 첫 2억 토큰은 무료라, 무료분이 남아 있으면 실제 청구는 0
  var VOYAGE = { 'voyage-3.5': 0.06, 'rerank-2.5': 0.05 };
  var DEFAULT_COSTS = [
    { name: 'Netlify (호스팅)', amount: 9, cur: 'USD', cycle: 'month', next: '2026-11-29', note: 'Personal · 월 1,000 크레딧, 넘기면 추가 요금' },
    { name: 'Voyage (Polaris 검색)', auto: 'voyage', cur: 'USD', cycle: 'month', note: '서버가 센 토큰 × 단가' },
    { name: '솔라피 (문자)', amount: 5000, cur: 'KRW', cycle: 'month', next: '', note: '충전식' },
    { name: '도메인 caurfs.kr', amount: 20000, cur: 'KRW', cycle: 'year', next: '2027-09-14', note: '호스팅케이알(hosting.kr) · 자동연장 확인 · DNS는 Netlify' },
    { name: '도메인 caurfs.com', amount: 20000, cur: 'KRW', cycle: 'year', next: '2027-08-24', note: '가비아 · caurfs.kr로 넘기는 용도' },
    { name: 'Polaris 서버 (네이버 클라우드)', amount: 0, cur: 'KRW', cycle: 'month', next: '', note: '무료 크레딧 30만 원 사용 중 (만료일 확인)' },
    { name: 'Supabase', amount: 0, cur: 'KRW', cycle: 'month', next: '', note: '무료 요금제' },
    { name: 'Resend (알림 메일)', amount: 0, cur: 'KRW', cycle: 'month', next: '', note: '무료 월 3,000통 · caurfs.kr 인증됨', owner: 'kmss2036@gmail.com', moved: 'personal' },
    { name: 'GitHub (저장소 rfs-2006)', amount: 0, cur: 'KRW', cycle: 'month', next: '', note: '무료' },
    { name: 'Google Analytics·Cloud', amount: 0, cur: 'KRW', cycle: 'month', next: '', note: '무료 · GA 연결용 서비스 계정' },
  ];
  // 학회 공용 계정으로 옮겼는지 (docs/운영인수인계.md)
  var MOVED = [['', '모름'], ['personal', '개인 계정'], ['club', '학회 계정']];
  var CSS = '\
.op{position:fixed;inset:0;z-index:3500;background:#070D18;color:#E9E7E1;overflow-y:auto;opacity:0;transition:opacity .25s;font-family:Pretendard Variable,Pretendard,"Noto Sans KR",system-ui,sans-serif;-webkit-font-smoothing:antialiased}\
.op.show{opacity:1}\
.op *{box-sizing:border-box}\
.op-in{max-width:1180px;margin:0 auto;padding:28px max(20px,env(safe-area-inset-right,0px)) 60px max(20px,env(safe-area-inset-left,0px))}\
.op-hd{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;border-bottom:1px solid rgba(233,231,225,.14);padding-bottom:16px}\
.op-hd small{display:block;font-size:11px;letter-spacing:.24em;color:rgba(233,231,225,.55)}\
.op-hd h2{margin:4px 0 0;font:400 28px "Noto Serif KR",serif;letter-spacing:-.02em}\
.op-hd .r{display:flex;gap:8px;align-items:center;font-size:12px;color:rgba(233,231,225,.55)}\
.op button{font:inherit;cursor:pointer}\
.op .bt{height:34px;padding:0 14px;border:1px solid rgba(233,231,225,.3);background:none;color:#E9E7E1;font-size:12.5px;border-radius:6px}\
.op .bt.p{background:#E9E7E1;color:#0F1B2E;border-color:#E9E7E1}\
.op .bt:disabled{opacity:.5;cursor:default}\
.op .x{width:40px;height:40px;border:0;background:none;color:rgba(233,231,225,.7);font-size:22px}\
.op-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:20px}\
.op-k{background:#0E182B;border:1px solid rgba(143,170,220,.16);border-radius:10px;padding:16px 18px;min-width:0}\
.op-k span{display:block;font-size:12px;color:rgba(233,231,225,.6)}\
.op-k b{display:block;margin-top:6px;font-size:24px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.op-k em{display:block;margin-top:4px;font-style:normal;font-size:12px;color:rgba(233,231,225,.5)}\
.op-k.warn b{color:#F0B77A}.op-k.bad b{color:#EE9A9A}\
.op-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}\
.op-p{background:#0E182B;border:1px solid rgba(143,170,220,.16);border-radius:10px;padding:18px;min-width:0}\
.op-p.w{grid-column:1/-1}\
.op-p h3{margin:0 0 12px;font-size:14px;font-weight:600;display:flex;justify-content:space-between;align-items:baseline;gap:8px}\
.op-p h3 i{font-style:normal;font-weight:400;font-size:12px;color:rgba(233,231,225,.5)}\
.op-p p.s{margin:0;font-size:12.5px;line-height:1.7;color:rgba(233,231,225,.6)}\
.op table{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}\
.op th,.op td{padding:8px 6px;border-bottom:1px solid rgba(233,231,225,.08);text-align:left;vertical-align:middle}\
.op th{font-weight:500;font-size:11.5px;color:rgba(233,231,225,.5)}\
.op td.n,.op th.n{text-align:right}\
.op .tw{overflow-x:auto}\
.op .tw td,.op .tw th{white-space:nowrap}\
.op input,.op select{height:34px;padding:0 10px;border:1px solid rgba(233,231,225,.22);background:rgba(233,231,225,.04);color:#E9E7E1;font:inherit;font-size:13px;border-radius:6px;min-width:0;width:100%}\
.op input:focus,.op select:focus,.op button:focus-visible{outline:2px solid #8FAADC;outline-offset:1px}\
.op .frm{display:grid;grid-template-columns:1.3fr 1fr 1.4fr auto;gap:8px;margin-bottom:12px}\
.op .bars{display:flex;align-items:flex-end;gap:2px;height:84px;margin:10px 0 4px;border-bottom:1px solid rgba(233,231,225,.14)}\
.op .bars i{flex:1;min-width:2px;background:#8FAADC;border-radius:2px 2px 0 0;opacity:.85}\
.op .bars i.z{background:rgba(233,231,225,.12)}\
.op .ax{display:flex;justify-content:space-between;font-size:11px;color:rgba(233,231,225,.45)}\
.op .big{font-size:22px;font-weight:600;font-variant-numeric:tabular-nums}\
.op .sub{font-size:12px;color:rgba(233,231,225,.55);margin-left:6px}\
.op .tag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:4px;background:rgba(143,170,220,.16);color:#BFD0EE}\
.op .tag.warn{background:rgba(240,183,122,.16);color:#F0B77A}.op .tag.bad{background:rgba(238,154,154,.16);color:#EE9A9A}\
.op .mini{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}\
.op .chk{display:flex;gap:8px;align-items:center;font-size:13px;margin-top:8px}.op .chk input{width:16px;height:16px}\
.op .msg{font-size:12.5px;color:#BFD0EE;min-height:18px;margin-top:8px}\
@media (max-width:860px){.op-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.op-k b{font-size:19px}.op-k{padding:14px}.op-g,.op .mini{grid-template-columns:1fr}.op .frm{grid-template-columns:1fr 1fr}}\
';
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var won = function (n) { return Math.round(n || 0).toLocaleString('ko-KR') + '원'; };
  var usd = function (n) { return '$' + (n || 0).toFixed(n >= 100 ? 0 : 2); };
  var today = function () { var d = new Date(Date.now() + 9 * 3600e3); return d.toISOString().slice(0, 10); };   // 한국 날짜
  var st = null;

  function call(sb, body) {
    return sb.functions.invoke('member-admin', { body: body }).then(function (r) {
      if (!r.error) return r.data || { ok: true };
      var ctx = r.error.context;
      return ctx && ctx.json ? ctx.json().then(function (j) { return { error: (j && j.error) || 'fail' }; }, function () { return { error: 'fail' }; }) : { error: 'fail' };
    }, function () { return { error: 'fail' }; });
  }
  function polarisUsage(sb) {
    return sb.auth.getSession().then(function (s) {
      var tok = s && s.data && s.data.session && s.data.session.access_token;
      if (!tok) return null;
      return fetch(API + '/usage', { headers: { Authorization: 'Bearer ' + tok } }).then(function (r) { return r.ok ? r.json() : { error: r.status }; });
    }).catch(function () { return null; });
  }

  // ---- 계산
  function monthInfo() {
    var t = today(), y = +t.slice(0, 4), m = +t.slice(5, 7), d = +t.slice(8, 10);
    return { key: t.slice(0, 7), day: d, days: new Date(y, m, 0).getDate() };
  }
  function voyageMonth(days) {
    var mi = monthInfo(), tok = { 'voyage-3.5': 0, 'rerank-2.5': 0 }, q = 0, series = [], lm = { usd: 0, q: 0, n: 0 };
    var pm = new Date(Date.UTC(+mi.key.slice(0, 4), +mi.key.slice(5, 7) - 2, 1)).toISOString().slice(0, 7);
    Object.keys(days || {}).sort().forEach(function (k) {
      var v = days[k];
      if (k.slice(0, 7) === mi.key) { tok['voyage-3.5'] += v['voyage-3.5'] || 0; tok['rerank-2.5'] += v['rerank-2.5'] || 0; q += (v.q_member || 0) + (v.q_anon || 0); }
      if (k.slice(0, 7) === pm) { lm.n++; lm.q += (v.q_member || 0) + (v.q_anon || 0); lm.usd += (v['voyage-3.5'] || 0) / 1e6 * VOYAGE['voyage-3.5'] + (v['rerank-2.5'] || 0) / 1e6 * VOYAGE['rerank-2.5']; }
    });
    for (var i = 29; i >= 0; i--) {
      var k = new Date(Date.now() + 9 * 3600e3 - i * 864e5).toISOString().slice(0, 10), v = (days || {})[k] || {};
      series.push({ k: k, usd: (v['voyage-3.5'] || 0) / 1e6 * VOYAGE['voyage-3.5'] + (v['rerank-2.5'] || 0) / 1e6 * VOYAGE['rerank-2.5'], q: (v.q_member || 0) + (v.q_anon || 0) });
    }
    return { last: lm, lastKey: pm, tok: tok, q: q, usd: tok['voyage-3.5'] / 1e6 * VOYAGE['voyage-3.5'] + tok['rerank-2.5'] / 1e6 * VOYAGE['rerank-2.5'], series: series };
  }
  // 이번 달 쓴 만큼 → 월말 예상
  var project = function (soFar) { var mi = monthInfo(); return soFar / Math.max(1, mi.day) * mi.days; };
  function monthlyKRW(c, rate) {
    var a = c.auto === 'voyage' ? project(st.voyage ? st.voyage.usd : 0) : +c.amount || 0;
    if (c.cur === 'USD') a *= rate;
    return c.cycle === 'year' ? a / 12 : c.cycle === 'once' ? 0 : a;
  }

  // ---- 그리기
  function bars(series, key, fmt) {
    var max = Math.max.apply(null, series.map(function (x) { return x[key]; }).concat([1e-9]));
    return '<div class="bars" role="img" aria-label="최근 30일">' + series.map(function (x) {
      var h = x[key] > 0 ? Math.max(3, x[key] / max * 100) : 2;
      return '<i class="' + (x[key] > 0 ? '' : 'z') + '" style="height:' + h + '%" title="' + esc(x.k + ' · ' + fmt(x[key])) + '"></i>';
    }).join('') + '</div><div class="ax"><span>' + esc(series[0].k.slice(5)) + '</span><span>최고 ' + esc(fmt(max)) + '</span><span>' + esc(series[series.length - 1].k.slice(5)) + '</span></div>';
  }

  function render() {
    var s = st, el = s.el.querySelector('.op-body');
    var acc = (s.state.account && s.state.account.value && s.state.account.value.entries) || [];
    var costs = ((s.state.costs && s.state.costs.value && s.state.costs.value.rows) || DEFAULT_COSTS).filter(function (c) { return c.auto !== 'claude'; });
    var set = (s.state.settings && s.state.settings.value) || {};
    var rate = +set.usd_krw || 1400;
    var last = acc[0], prev = acc[1];
    var month = costs.reduce(function (a, c) { return a + monthlyKRW(c, rate); }, 0);
    var runway = last && month > 0 ? last.balance / month : null;
    var kpi = '<div class="op-kpi">' +
      '<div class="op-k"><span>계좌 잔액</span><b>' + (last ? won(last.balance) : '—') + '</b><em>' + (last ? esc(last.date) + ' 기준' + (prev ? ' · 지난 기록보다 ' + (last.balance - prev.balance >= 0 ? '+' : '') + won(last.balance - prev.balance) : '') : '아래에서 잔액을 입력해 주세요') + '</em></div>' +
      '<div class="op-k"><span>이번 달 유지비 (예상)</span><b>' + won(month) + '</b><em>연 ' + won(month * 12) + ' · 환율 ' + rate.toLocaleString() + '원</em></div>' +
      '<div class="op-k ' + (runway != null && runway < 6 ? (runway < 3 ? 'bad' : 'warn') : '') + '"><span>잔액으로 버틸 수 있는 기간</span><b>' + (runway == null ? '—' : runway >= 120 ? '10년 이상' : runway.toFixed(1) + '개월') + '</b><em>잔액 ÷ 월 유지비</em></div>' +
      '<div class="op-k ' + (s.pending ? 'warn' : '') + '"><span>가입 승인 대기</span><b>' + (s.pending == null ? '—' : s.pending + '건') + '</b><em><button class="bt" type="button" data-a="approve" style="height:26px;padding:0 10px;font-size:12px">승인 화면 열기</button></em></div>' +
      '</div>';

    // 계좌
    var accP = '<div class="op-p"><h3>계좌 잔액 기록<i>손으로 입력 · 최근 12건</i></h3>' +
      '<form class="frm" data-f="acc"><input id="op-bal" inputmode="numeric" placeholder="잔액 (원)" aria-label="잔액 (원)"><input id="op-date" type="date" value="' + today() + '" aria-label="기준일"><input id="op-memo" placeholder="메모 (예: 회비 입금, 서버비)" aria-label="메모" maxlength="60"><button class="bt p" type="submit">기록</button></form>' +
      (acc.length ? '<div class="tw"><table><thead><tr><th>기준일</th><th class="n">잔액</th><th class="n">변동</th><th>메모</th><th></th></tr></thead><tbody>' + acc.slice(0, 12).map(function (e, i) {
        var d = acc[i + 1] ? e.balance - acc[i + 1].balance : null;
        return '<tr><td>' + esc(e.date) + '</td><td class="n">' + won(e.balance) + '</td><td class="n">' + (d == null ? '' : (d >= 0 ? '+' : '') + won(d)) + '</td><td>' + esc(e.memo || '') + '</td><td class="n"><button class="bt" type="button" data-del="' + i + '" style="height:26px;padding:0 8px;font-size:11.5px" aria-label="이 기록 지우기">지우기</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="s">아직 기록이 없어요. 은행 앱에서 잔액을 보고 적어 주세요. 금액은 이 화면(관리자)에서만 보여요.</p>') +
      '<div class="msg" data-m="acc"></div></div>';

    // API 사용량
    var v = s.voyage;
    var vHtml = s.usageErr ? '<p class="s">Polaris 서버에서 사용량을 못 받았어요 (' + esc(s.usageErr) + '). 서버를 최신으로 올리고(polaris-update main) OPS_ADMINS에 이 계정을 넣어 주세요.</p>'
      : !v ? '<p class="s">불러오는 중…</p>'
      : '<div><span class="big">' + usd(v.usd) + '</span><span class="sub">이번 달 · 질문 ' + v.q.toLocaleString() + '개 · 임베딩 ' + (v.tok['voyage-3.5'] / 1e3).toFixed(0) + 'K · 리랭크 ' + (v.tok['rerank-2.5'] / 1e6).toFixed(2) + 'M 토큰</span></div>' +
        bars(v.series, 'usd', usd) + '<p class="s" style="margin-top:8px">지난달(' + esc(v.lastKey) + '): ' + (v.last.n ? usd(v.last.usd) + ' (' + won(v.last.usd * rate) + ') · 질문 ' + v.last.q.toLocaleString() + '개' + (v.last.n < 28 ? ' · ' + v.last.n + '일치만 기록됨' : '') : '기록 없음 (서버가 사용량을 세기 시작한 뒤부터 나와요. 그 전 달은 dashboard.voyageai.com의 Usage에서 확인)') + '</p><p class="s">하루 질문 수: ' + v.series.slice(-7).map(function (x) { return x.q; }).join(' · ') + ' (최근 7일). 무료 토큰이 남아 있으면 실제 청구는 0이에요.</p>';
    var ga = s.ga, gaHtml;
    if (!ga) gaHtml = '<p class="s">불러오는 중…</p>';
    else if (!ga.configured) gaHtml = '<p class="s">Supabase Secret에 GA_PROPERTY_ID·GA_SA_KEY를 넣으면 방문자 수가 나와요.</p>';
    else if (ga.error) gaHtml = '<p class="s">Google Analytics를 불러오지 못했어요 (' + esc(ga.error) + '). 서비스 계정이 GA 속성에 뷰어로 들어가 있는지 확인해 주세요.</p>';
    else {
      var gd = ga.days || [], sum = function (n) { return gd.slice(-n).reduce(function (a, x) { return a + x.users; }, 0); };
      var tdy = gd.length ? gd[gd.length - 1] : { users: 0, views: 0 };
      gaHtml = '<div class="mini" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div><span class="sub" style="margin:0">오늘 방문자</span><div class="big">' + tdy.users.toLocaleString() + '</div><span class="sub" style="margin:0">페이지뷰 ' + tdy.views.toLocaleString() + '</span></div>' +
        '<div><span class="sub" style="margin:0">최근 7일 (일별 합)</span><div class="big">' + sum(7).toLocaleString() + '</div></div>' +
        '<div><span class="sub" style="margin:0">최근 30일 방문자</span><div class="big">' + (ga.users30 || 0).toLocaleString() + '</div><span class="sub" style="margin:0">페이지뷰 ' + (ga.views30 || 0).toLocaleString() + '</span></div></div>' +
        (gd.length > 1 ? bars(gd.map(function (x) { return { k: x.date, u: x.users }; }), 'u', function (n) { return Math.round(n) + '명'; }) : '') +
        '<div class="mini" style="margin-top:12px"><div><h3 style="font-size:13px">많이 본 페이지 (30일)</h3><div class="tw"><table><tbody>' + (ga.pages || []).map(function (x) { return '<tr><td style="max-width:320px;overflow:hidden;text-overflow:ellipsis">' + esc(x.title) + '</td><td class="n">' + x.views.toLocaleString() + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
        '<div><h3 style="font-size:13px">들어온 경로 (30일)</h3><div class="tw"><table><tbody>' + (ga.sources || []).map(function (x) { return '<tr><td>' + esc(x.source) + '</td><td class="n">' + x.sessions.toLocaleString() + '</td></tr>'; }).join('') + '</tbody></table></div></div></div>';
    }
    var gaP = '<div class="op-p w"><h3>방문자<i>Google Analytics · 최근 30일 · 학회원 로그인 접속은 내부 트래픽으로 표시</i></h3>' + gaHtml + '</div>';
    var apiP = '<div class="op-p w"><h3>Voyage · Polaris 사용량<i>Polaris 서버가 센 토큰 × 단가 · 최근 30일</i></h3>' + vHtml + '</div>';

    // 유지비 표
    var soon = function (d) { if (!d) return ''; var n = Math.round((Date.parse(d) - Date.parse(today())) / 864e5); return n < 0 ? '<span class="tag bad">지남</span>' : n <= 30 ? '<span class="tag warn">' + n + '일 남음</span>' : ''; };
    var movedN = costs.filter(function (c) { return c.moved === 'club'; }).length;
    var costP = '<div class="op-p w"><h3>유지비 · 계정<i>학회 계정으로 이전 ' + movedN + '/' + costs.length + ' · 바꾼 뒤 저장 · 연 단위는 12로 나눠 월에 더해요 · 자동 칸은 이번 달 사용량으로 월말 예상</i></h3><div class="tw"><table data-t="costs"><thead><tr><th>서비스</th><th class="n">금액</th><th>통화</th><th>주기</th><th>다음 결제·갱신</th><th class="n">월 환산</th><th>메모</th><th>관리 계정</th><th>이전</th><th></th></tr></thead><tbody>' +
      costs.map(function (c, i) {
        return '<tr data-i="' + i + '"><td><input data-k="name" value="' + esc(c.name) + '" aria-label="서비스"></td>' +
          '<td class="n">' + (c.auto ? '<span class="tag">자동</span>' : '<input data-k="amount" inputmode="decimal" value="' + esc(c.amount) + '" style="text-align:right;width:96px" aria-label="금액">') + '</td>' +
          '<td>' + (c.auto ? 'USD' : '<select data-k="cur" aria-label="통화"><option' + (c.cur === 'KRW' ? ' selected' : '') + '>KRW</option><option' + (c.cur === 'USD' ? ' selected' : '') + '>USD</option></select>') + '</td>' +
          '<td><select data-k="cycle" aria-label="주기"><option value="month"' + (c.cycle === 'month' ? ' selected' : '') + '>매월</option><option value="year"' + (c.cycle === 'year' ? ' selected' : '') + '>매년</option><option value="once"' + (c.cycle === 'once' ? ' selected' : '') + '>한 번</option></select></td>' +
          '<td><input data-k="next" type="date" value="' + esc(c.next || '') + '" aria-label="다음 결제일" style="width:140px"> ' + soon(c.next) + '</td>' +
          '<td class="n">' + won(monthlyKRW(c, rate)) + '</td>' +
          '<td><input data-k="note" value="' + esc(c.note || '') + '" aria-label="메모"></td>' +
          '<td><input data-k="owner" value="' + esc(c.owner || '') + '" placeholder="가입한 이메일" aria-label="관리 계정" style="width:170px"></td>' +
          '<td><select data-k="moved" aria-label="학회 계정으로 이전">' + MOVED.map(function (o) { return '<option value="' + o[0] + '"' + ((c.moved || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></td>' +
          '<td class="n">' + (c.auto ? '' : '<button class="bt" type="button" data-rm="' + i + '" style="height:26px;padding:0 8px;font-size:11.5px">빼기</button>') + '</td></tr>';
      }).join('') +
      '</tbody><tfoot><tr><td colspan="5"><b>합계</b></td><td class="n"><b>' + won(month) + '</b></td><td colspan="4"></td></tr></tfoot></table></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center"><button class="bt" type="button" data-a="add">줄 추가</button><button class="bt p" type="button" data-a="savecosts">유지비 저장</button><label style="display:flex;gap:6px;align-items:center;font-size:12.5px;color:rgba(233,231,225,.65)">환율 <input id="op-rate" inputmode="numeric" value="' + rate + '" style="width:80px"> 원/달러</label></div><div class="msg" data-m="costs"></div></div>';

    // 문자 기록 + 알림
    var smsP = '<div class="op-p"><h3>문자 기록<i>AGORA 선배님 연락처 · 최근 50건</i></h3>' + (s.sms && s.sms.length ? '<div class="tw" style="max-height:280px;overflow-y:auto"><table><thead><tr><th>시각</th><th>받은 사람</th><th>선배님</th><th>결과</th></tr></thead><tbody>' + s.sms.map(function (x) {
      return '<tr><td>' + esc(new Date(x.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })) + '</td><td>' + esc(String(x.user_email || '').replace(/@caurfs\.kr$/, '')) + '</td><td>' + esc(x.alumni_cohort + '기 ' + x.alumni_name) + '</td><td>' + (x.status === 'sent' ? '보냄' : '<span class="tag bad">실패</span>') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<p class="s">아직 보낸 문자가 없어요.</p>') + '</div>';
    var nt = set.notify || {};
    var mailP = '<div class="op-p w" style="max-width:640px"><h3>알림 메일<i>' + (s.mail ? '메일 발송 켜짐' : 'RESEND_API_KEY를 넣으면 켜져요') + '</i></h3>' +
      '<form data-f="set"><input id="op-mail" type="email" placeholder="알림 받을 이메일" aria-label="알림 받을 이메일" value="' + esc(set.notify_email || '') + '">' +
      '<label class="chk"><input type="checkbox" id="op-n1"' + (nt.agora_sms === false ? '' : ' checked') + '>AGORA에서 누가 어느 선배님 연락처를 문자로 받았을 때</label>' +
      '<label class="chk"><input type="checkbox" id="op-n2"' + (nt.signup === false ? '' : ' checked') + '>회원가입 신청이 들어왔을 때</label>' +
      '<label class="chk"><input type="checkbox" id="op-n3"' + (nt.approval === false ? '' : ' checked') + '>가입을 승인했을 때 (안내 문자 결과 포함)</label>' +
      '<button class="bt p" type="submit" style="margin-top:12px">설정 저장</button></form><div class="msg" data-m="set"></div></div>';

    el.innerHTML = kpi + '<div class="op-g">' + gaP + accP + smsP + apiP + costP + mailP + '</div>';
    wire();
  }

  function save(key, value, m, done) {
    var box = st.el.querySelector('[data-m="' + m + '"]');
    if (box) box.textContent = '저장하는 중…';
    call(st.sb, { action: 'ops_save', key: key, value: value }).then(function (r) {
      if (r && r.ok) { st.state[key] = { value: value }; if (done) done(); render(); var b2 = st.el.querySelector('[data-m="' + m + '"]'); if (b2) b2.textContent = '저장했어요.'; }
      else if (box) box.textContent = r && r.error === 'save' ? '저장하지 못했어요. ops_state 테이블(supabase/sql/ops_state.sql)을 만들었는지 확인해 주세요.' : '저장하지 못했어요. 다시 시도해 주세요.';
    });
  }
  function readCosts() {
    var base = ((st.state.costs && st.state.costs.value && st.state.costs.value.rows) || DEFAULT_COSTS).filter(function (c) { return c.auto !== 'claude'; });
    return [].map.call(st.el.querySelectorAll('[data-t="costs"] tbody tr'), function (tr) {
      var c = Object.assign({}, base[+tr.getAttribute('data-i')]);
      tr.querySelectorAll('[data-k]').forEach(function (x) { c[x.getAttribute('data-k')] = x.value; });
      if (!c.auto) c.amount = +String(c.amount).replace(/[^\d.]/g, '') || 0;
      return c;
    });
  }
  function wire() {
    var el = st.el;
    el.querySelector('[data-a="approve"]').onclick = function () { if (window.RFSJoin) window.RFSJoin.admin({ sb: st.sb, onChange: function (n) { st.pending = n; if (st.onPending) st.onPending(n); render(); } }); };
    el.querySelector('[data-f="acc"]').onsubmit = function (e) {
      e.preventDefault();
      var bal = +el.querySelector('#op-bal').value.replace(/[^\d-]/g, ''), date = el.querySelector('#op-date').value || today(), memo = el.querySelector('#op-memo').value.trim().slice(0, 60);
      if (!isFinite(bal) || !el.querySelector('#op-bal').value.trim()) { el.querySelector('[data-m="acc"]').textContent = '잔액을 숫자로 적어 주세요.'; return; }
      var acc = ((st.state.account && st.state.account.value && st.state.account.value.entries) || []).concat([{ date: date, balance: bal, memo: memo }]);
      acc.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
      save('account', { entries: acc.slice(0, 200) }, 'acc');
    };
    el.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        var acc = (st.state.account.value.entries || []).slice(); acc.splice(+b.getAttribute('data-del'), 1);
        save('account', { entries: acc }, 'acc');
      };
    });
    el.querySelector('[data-a="add"]').onclick = function () { var rows = readCosts(); rows.push({ name: '', amount: 0, cur: 'KRW', cycle: 'month', next: '', note: '' }); st.state.costs = { value: { rows: rows } }; render(); };
    el.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { var rows = readCosts(); rows.splice(+b.getAttribute('data-rm'), 1); st.state.costs = { value: { rows: rows } }; render(); }; });
    el.querySelector('[data-a="savecosts"]').onclick = function () {
      var rows = readCosts().filter(function (c) { return c.auto || String(c.name).trim(); });
      var rate = +el.querySelector('#op-rate').value.replace(/\D/g, '') || 1400;
      var set = Object.assign({}, (st.state.settings && st.state.settings.value) || {}, { usd_krw: rate });
      save('costs', { rows: rows }, 'costs', function () { call(st.sb, { action: 'ops_save', key: 'settings', value: set }); st.state.settings = { value: set }; });
    };
    el.querySelector('[data-f="set"]').onsubmit = function (e) {
      e.preventDefault();
      var mail = el.querySelector('#op-mail').value.trim();
      if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { el.querySelector('[data-m="set"]').textContent = '이메일 주소를 확인해 주세요.'; return; }
      var set = Object.assign({}, (st.state.settings && st.state.settings.value) || {}, { notify_email: mail, notify: { agora_sms: el.querySelector('#op-n1').checked, signup: el.querySelector('#op-n2').checked, approval: el.querySelector('#op-n3').checked } });
      save('settings', set, 'set');
    };
  }

  function load() {
    var sb = st.sb;
    st.el.querySelector('.op-up').textContent = '불러오는 중…';
    Promise.all([
      call(sb, { action: 'ops_get' }),
      call(sb, { action: 'list' }),
      polarisUsage(sb),
    ]).then(function (r) {
      call(sb, { action: 'ga' }).then(function (x) { if (!st) return; st.ga = x && x.ok ? x.ga : { configured: true, error: (x && x.error) || 'fail' }; render(); });
      if (!st) return;
      var g = r[0];
      if (!g || !g.ok) { st.el.querySelector('.op-body').innerHTML = '<p class="s" style="margin-top:24px">운영 데이터를 불러오지 못했어요' + (g && g.error === 'admin' ? ' (관리자 계정이 아니에요)' : ' (member-admin 함수를 최신으로 올렸는지 확인해 주세요)') + '.</p>'; return; }
      st.state = g.state || {}; st.sms = g.sms; st.mail = g.mail;
      st.pending = r[1] && r[1].ok ? (r[1].list || []).length : null;
      if (st.onPending && st.pending != null) st.onPending(st.pending);
      var u = r[2];
      st.voyage = u && u.ok ? voyageMonth(u.days) : null;
      st.usageErr = !u ? '로그인 정보 없음' : u.ok ? '' : u.error === 403 ? '권한 없음' : '연결 실패';
      st.el.querySelector('.op-up').textContent = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) + ' 기준';
      render();
    });
  }

  function open(o) {
    if (!document.getElementById('op-css')) { var c = document.createElement('style'); c.id = 'op-css'; c.textContent = CSS; document.head.appendChild(c); }
    close();
    var el = document.createElement('div');
    el.className = 'op'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '운영 대시보드');
    el.innerHTML = '<div class="op-in"><div class="op-hd"><div><small>ADMIN</small><h2>운영</h2></div><div class="r"><span class="op-up"></span><button class="bt" type="button" data-a="reload">새로고침</button><button class="x" type="button" aria-label="닫기">×</button></div></div><div class="op-body"><p class="s" style="margin-top:24px;color:rgba(233,231,225,.6)">불러오는 중…</p></div></div>';
    document.body.appendChild(el);
    st = { el: el, sb: o.sb, onPending: o.onPending, state: {} };
    el.querySelector('.x').onclick = close;
    el.querySelector('[data-a="reload"]').onclick = load;
    st.key = function (e) { if (e.key === 'Escape' && !document.querySelector('.jn')) close(); };
    document.addEventListener('keydown', st.key);
    requestAnimationFrame(function () { el.classList.add('show'); });
    load();
  }
  function close() {
    if (!st) return;
    document.removeEventListener('keydown', st.key);
    var el = st.el; st = null; el.classList.remove('show'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  }
  window.RFSOps = { open: open, close: close };
})();
