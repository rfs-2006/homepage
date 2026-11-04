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
    { name: 'Polaris 서버 (네이버 클라우드)', amount: 0, cur: 'KRW', cycle: 'month', next: '2027-01-31', note: '크레딧 296,490원 남음 · 2027-01-31 만료 뒤 카드 결제' },
    { name: 'Supabase', amount: 0, cur: 'KRW', cycle: 'month', next: '', note: '무료 요금제' },
    { name: 'Resend (알림 메일)', amount: 0, cur: 'KRW', cycle: 'month', next: '', note: '무료 월 3,000통 · caurfs.kr 인증됨', owner: 'kmss2036@gmail.com', moved: 'personal' },
    { name: 'GitHub (저장소 rfs-2006)', amount: 0, cur: 'KRW', cycle: 'month', next: '', note: '무료' },
    { name: 'Google Analytics·Cloud', amount: 0, cur: 'KRW', cycle: 'month', next: '', note: '무료 · GA 연결용 서비스 계정' },
  ];
  // 학회 공용 계정으로 옮겼는지 (docs/운영인수인계.md)
  var MOVED = [['', '모름'], ['personal', '개인 계정'], ['club', '학회 계정']];
  // 디자인: FUND 페이지 '토스버전'(templates/toss/fund.html)과 같은 결 — 미색 바탕, 모서리 없는 흰 카드, 남색 SUMMARY, 큰 숫자, 자간 넓은 작은 라벨, 굵은 윗선 표
  var CSS = '\
.op{position:fixed;inset:0;z-index:3500;background:#EDEBE5;color:#191F28;overflow-y:auto;opacity:0;transition:opacity .25s;font-family:"Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}\
.op.show{opacity:1}\
.op *{box-sizing:border-box}\
.op button{font:inherit;cursor:pointer}\
.op-top{background:#0F1B2E;color:#F7F6F3}\
.op-top-in{max-width:1208px;margin:0 auto;padding:28px max(24px,env(safe-area-inset-right,0px)) 40px max(24px,env(safe-area-inset-left,0px));position:relative}\
.op-top .x{position:absolute;top:14px;right:max(14px,env(safe-area-inset-right,0px));width:44px;height:44px;border:0;background:none;color:rgba(247,246,243,.75);font-size:24px}\
.op-top .ey{font-size:12px;letter-spacing:.18em;color:#8FAADC;font-weight:600;margin-top:28px}\
.op-top h2{margin:8px 0 0;font:400 46px/1.1 "Source Serif 4","Noto Serif KR",Georgia,serif;letter-spacing:-.01em}\
.op-top .meta{margin-top:14px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:13px;color:rgba(247,246,243,.6)}\
.op-top .meta button{height:30px;padding:0 12px;border:1px solid rgba(247,246,243,.3);background:none;color:#F7F6F3;font-size:12.5px;border-radius:6px}\
.op-tabs{position:sticky;top:0;z-index:2;background:#F7F6F3;border-bottom:1px solid #E5E8EB}\
.op-tabs-in{max-width:1208px;margin:0 auto;display:flex;overflow-x:auto;scrollbar-width:none;padding:0 max(24px,env(safe-area-inset-left,0px))}\
.op-tabs a{flex:1 0 auto;text-align:center;padding:20px 14px 18px;font-size:14px;color:#6B7684;text-decoration:none;border-bottom:2px solid transparent;white-space:nowrap}\
.op-tabs a:hover,.op-tabs a:focus-visible{color:#191F28;outline:none}\
.op-tabs a.on{color:#191F28;font-weight:600;border-bottom-color:#203864}\
.op-in{max-width:1208px;margin:0 auto;padding:24px max(24px,env(safe-area-inset-right,0px)) 72px max(24px,env(safe-area-inset-left,0px));display:grid;gap:20px}\
.op-s{background:#fff;padding:52px 64px;scroll-margin-top:72px;min-width:0}\
.op-s.dk{background:#0F1B2E;color:#F7F6F3}\
.op-h{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}\
.op-h .lb{font-size:12px;font-weight:700;letter-spacing:.14em;color:#203864}\
.op-s.dk .op-h .lb{color:#8FAADC}\
.op-h .mt{font-size:13px;color:#6B7684}\
.op-s.dk .op-h .mt{color:rgba(247,246,243,.55)}\
.op-hl{margin:20px 0 28px;font-size:34px;font-weight:700;letter-spacing:-.02em;line-height:1.25}\
.op-hl small{font-size:.55em;font-weight:600;color:#6B7684;margin-left:4px}\
.op-hl .dot{color:#B0B8C1;margin:0 12px;font-weight:400}\
.op-hl .up{color:#D6404E}.op-hl .dn{color:#2F64C2}\
.op .note{font-size:13.5px;line-height:1.75;color:#6B7684;margin:0}\
.op-sum{display:grid;grid-template-columns:1.1fr 1fr;gap:48px;align-items:end;margin-top:20px}\
.op-sum .k{font-size:15px;color:rgba(247,246,243,.65)}\
.op-sum .big{font-size:76px;font-weight:700;letter-spacing:-.03em;line-height:1.05;margin-top:10px;white-space:nowrap}\
.op-sum .big small{font-size:.36em;font-weight:600;margin-left:6px;color:rgba(247,246,243,.75)}\
.op-sum .chg{margin-top:14px;font-size:17px;color:rgba(247,246,243,.65)}\
.op-sum .chg b{margin-left:8px;font-weight:700}\
.op-sum .chg .up{color:#F08A93}.op-sum .chg .dn{color:#8FAADC}\
.op-sum .pn{background:#1B2940;padding:26px 30px}\
.op-sum .pn .row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(247,246,243,.08);font-size:14px;color:rgba(247,246,243,.65)}\
.op-sum .pn .row:last-child{border-bottom:0}\
.op-sum .pn .row b{font-size:20px;font-weight:700;color:#F7F6F3;white-space:nowrap}\
.op-sum .pn .row>span:last-child{display:flex;align-items:center;white-space:nowrap}\
.op-sum .pn .row b.w{color:#F0B77A}.op-sum .pn .row b.bad{color:#F08A93}\
.op-sum .pn .go{height:30px;padding:0 12px;border:0;background:#8FAADC;color:#0F1B2E;font-size:12.5px;font-weight:600;border-radius:6px;margin-left:10px}\
.op table{width:100%;border-collapse:collapse;font-size:14.5px}\
.op .tw{overflow-x:auto;border-top:2px solid #191F28}\
.op th{padding:14px 12px;font-weight:500;font-size:13px;color:#6B7684;text-align:left;border-bottom:1px solid #E5E8EB;white-space:nowrap}\
.op td{padding:14px 12px;border-bottom:1px solid #E5E8EB;vertical-align:middle;white-space:nowrap}\
.op td.n,.op th.n{text-align:right}\
.op td.sb,.op td .sb{color:#6B7684;font-size:13px}\
.op tfoot td{border-top:1px solid #191F28;font-weight:700}\
.op .bars{display:flex;align-items:flex-end;gap:3px;height:150px;border-bottom:1px solid #191F28}\
.op .bars i{flex:1;min-width:2px;background:#203864;transition:background .15s}\
.op .bars i:hover{background:#8FAADC}\
.op .bars i.z{background:#E5E8EB}\
.op .ax{display:flex;justify-content:space-between;font-size:12px;color:#8B95A1;margin-top:8px}\
.op .two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px;margin-top:40px}\
.op .two h4{margin:0 0 12px;font-size:15px;font-weight:700}\
.op .trio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:#E5E8EB;border-top:2px solid #191F28;margin-bottom:36px}\
.op .trio div{background:#fff;padding:20px 4px 20px 0}\
.op .trio span{display:block;font-size:13px;color:#6B7684}\
.op .trio b{display:block;margin-top:6px;font-size:30px;font-weight:700;letter-spacing:-.02em}\
.op .trio em{display:block;margin-top:2px;font-style:normal;font-size:13px;color:#8B95A1}\
.op input,.op select{height:44px;padding:0 14px;border:1px solid transparent;background:#F4F5F7;color:#191F28;font:inherit;font-size:14.5px;border-radius:8px;min-width:0;width:100%}\
.op td input,.op td select{height:38px;font-size:14px;padding:0 10px}\
.op input:focus,.op select:focus{outline:none;border-color:#203864;background:#fff}\
.op button:focus-visible,.op a:focus-visible{outline:2px solid #8FAADC;outline-offset:2px}\
.op .bt{height:44px;padding:0 18px;border:1px solid #D1D6DB;background:#fff;color:#191F28;font-size:14px;font-weight:600;border-radius:8px}\
.op .bt.p{background:#203864;border-color:#203864;color:#fff}\
.op .bt.s{height:32px;padding:0 10px;font-size:12.5px;font-weight:500;color:#6B7684}\
.op .bt:disabled{opacity:.5;cursor:default}\
.op .frm{display:grid;grid-template-columns:1.2fr .9fr 1.6fr auto;gap:10px;margin:28px 0 24px}\
.op .tag{display:inline-block;font-size:12px;font-weight:600;padding:3px 8px;border-radius:6px;background:#E6ECF7;color:#203864}\
.op .tag.w{background:#FDF1E2;color:#B5651D}.op .tag.bad{background:#FDECEC;color:#D6404E}.op .tag.ok{background:#E8F3EC;color:#2E7D4F}\
.op .acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px;align-items:center}\
.op .acts label{display:flex;gap:8px;align-items:center;font-size:14px;color:#6B7684}\
.op .chk{display:flex;gap:10px;align-items:center;font-size:15px;padding:14px 0;border-bottom:1px solid #E5E8EB;cursor:pointer}\
.op .chk input{width:20px;height:20px;accent-color:#203864}\
.op .msg{font-size:13.5px;color:#203864;min-height:20px;margin-top:12px}\
.op .mailbox{max-width:560px}\
@media (max-width:860px){.op-s{padding:32px 20px}.op-sum .pn{padding:14px 18px}.op-sum .pn .row b{font-size:17px}.op .bars{height:110px}.op-sum{grid-template-columns:1fr;gap:28px}.op-sum .big{font-size:48px}.op-hl{font-size:26px}.op .two{grid-template-columns:1fr;gap:28px}.op .trio b{font-size:22px}.op .frm{grid-template-columns:1fr 1fr}.op-top h2{font-size:36px}.op-tabs a{flex:0 0 auto}}\
@media (prefers-reduced-motion:reduce){.op{transition:none}}\
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
    }).join('') + '</div><div class="ax"><span>' + esc(series[0].k.slice(5).replace('-', '.')) + '</span><span>최고 ' + esc(fmt(max)) + '</span><span>' + esc(series[series.length - 1].k.slice(5).replace('-', '.')) + '</span></div>';
  }
  var sec = function (id, label, meta, body, dark) {
    return '<section class="op-s' + (dark ? ' dk' : '') + '" id="op-' + id + '"><div class="op-h"><span class="lb">' + label + '</span><span class="mt">' + meta + '</span></div>' + body + '</section>';
  };
  var num = function (n) { return Math.round(n || 0).toLocaleString('ko-KR'); };

  function render() {
    var s = st, el = s.el.querySelector('.op-body');
    var acc = (s.state.account && s.state.account.value && s.state.account.value.entries) || [];
    var costs = ((s.state.costs && s.state.costs.value && s.state.costs.value.rows) || DEFAULT_COSTS).filter(function (c) { return c.auto !== 'claude'; });
    var set = (s.state.settings && s.state.settings.value) || {};
    var rate = +set.usd_krw || 1400;
    var last = acc[0], prev = acc[1];
    var month = costs.reduce(function (a, c) { return a + monthlyKRW(c, rate); }, 0);
    var runway = last && month > 0 ? last.balance / month : null;
    var ga = s.ga, gaOk = ga && ga.configured && !ga.error && ga.days;

    // ① SUMMARY
    var diff = last && prev ? last.balance - prev.balance : null;
    var summary = sec('sum', 'SUMMARY', last ? esc(last.date) + ' 기준 · 관리자만 보는 화면' : '관리자만 보는 화면',
      '<div class="op-sum"><div><div class="k">법인계좌 잔액</div>' +
        '<div class="big">' + (last ? num(last.balance) + '<small>원</small>' : '—') + '</div>' +
        '<div class="chg">' + (diff == null ? (last ? '첫 기록이에요' : '아래 계좌 칸에 잔액을 적어 주세요') : '지난 기록 대비<b class="' + (diff >= 0 ? 'up' : 'dn') + '">' + (diff >= 0 ? '+' : '−') + num(Math.abs(diff)) + '원</b>') + '</div></div>' +
      '<div class="pn">' +
        '<div class="row"><span>이번 달 유지비 (예상)</span><b>' + won(month) + '</b></div>' +
        '<div class="row"><span>잔액으로 버틸 수 있는 기간</span><b class="' + (runway != null && runway < 6 ? (runway < 3 ? 'bad' : 'w') : '') + '">' + (runway == null ? '—' : runway >= 120 ? '10년 이상' : runway.toFixed(1) + '개월') + '</b></div>' +
        '<div class="row"><span>최근 30일 방문자</span><b>' + (gaOk ? num(ga.users30) + '명' : '—') + '</b></div>' +
        '<div class="row"><span>가입 승인 대기</span><span><b class="' + (s.pending ? 'w' : '') + '">' + (s.pending == null ? '—' : s.pending + '건') + '</b><button class="go" type="button" data-a="approve">승인하기</button></span></div>' +
      '</div></div>', true);

    // ② 방문자
    var gaBody;
    if (!ga) gaBody = '<p class="note" style="margin-top:20px">불러오는 중…</p>';
    else if (!ga.configured) gaBody = '<p class="note" style="margin-top:20px">Supabase Secret에 GA_PROPERTY_ID·GA_SA_KEY를 넣으면 방문자 수가 나와요.</p>';
    else if (ga.error) gaBody = '<p class="note" style="margin-top:20px">Google Analytics를 불러오지 못했어요 (' + esc(ga.error) + '). 서비스 계정이 GA 속성에 뷰어로 들어가 있는지 확인해 주세요.</p>';
    else {
      var gd = ga.days || [], sum = function (n) { return gd.slice(-n).reduce(function (a, x) { return a + x.users; }, 0); };
      var tdy = gd.length ? gd[gd.length - 1] : { users: 0, views: 0 };
      var list = function (rows, k, v) { return '<div class="tw"><table><tbody>' + rows.map(function (x, i) { return '<tr><td class="sb" style="width:28px">' + (i + 1) + '</td><td style="white-space:normal">' + esc(x[k]) + '</td><td class="n">' + num(x[v]) + '</td></tr>'; }).join('') + '</tbody></table></div>'; };
      gaBody = '<div class="op-hl">오늘 ' + num(tdy.users) + '<small>명</small><span class="dot">·</span>7일 ' + num(sum(7)) + '<small>명</small><span class="dot">·</span>30일 ' + num(ga.users30) + '<small>명</small></div>' +
        (gd.length > 1 ? bars(gd.map(function (x) { return { k: x.date, u: x.users }; }), 'u', function (n) { return Math.round(n) + '명'; }) : '') +
        '<div class="two"><div><h4>많이 본 페이지</h4>' + list(ga.pages || [], 'title', 'views') + '</div><div><h4>들어온 경로</h4>' + list(ga.sources || [], 'source', 'sessions') + '</div></div>';
    }
    var visit = sec('visit', '방문자', 'Google Analytics · 최근 30일' + (gaOk ? ' · 페이지뷰 ' + num(ga.views30) : ''), gaBody);

    // ③ 계좌
    var accBody = '<form class="frm" data-f="acc"><input id="op-bal" inputmode="numeric" placeholder="잔액 (원)" aria-label="잔액 (원)"><input id="op-date" type="date" value="' + today() + '" aria-label="기준일"><input id="op-memo" placeholder="메모 (예: 회비 입금, 서버비)" aria-label="메모" maxlength="60"><button class="bt p" type="submit">기록</button></form>' +
      (acc.length ? '<div class="tw"><table><thead><tr><th>기준일</th><th class="n">잔액</th><th class="n">변동</th><th>메모</th><th></th></tr></thead><tbody>' + acc.slice(0, 12).map(function (e, i) {
        var d = acc[i + 1] ? e.balance - acc[i + 1].balance : null;
        return '<tr><td>' + esc(e.date.replace(/-/g, '.')) + '</td><td class="n"><b>' + won(e.balance) + '</b></td><td class="n" style="color:' + (d == null ? '#8B95A1' : d >= 0 ? '#D6404E' : '#2F64C2') + '">' + (d == null ? '—' : (d >= 0 ? '+' : '−') + num(Math.abs(d))) + '</td><td class="sb">' + esc(e.memo || '') + '</td><td class="n"><button class="bt s" type="button" data-del="' + i + '" aria-label="이 기록 지우기">지우기</button></td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="note">은행 앱에서 잔액을 보고 한 달에 한 번, 그리고 큰 입출금이 있을 때 적어 주세요.</p>') +
      '<div class="msg" data-m="acc"></div>';
    var account = sec('acc', '계좌', '손으로 입력 · 최근 12건', accBody);

    // ④ 유지비 · 계정
    var soon = function (d) { if (!d) return ''; var n = Math.round((Date.parse(d) - Date.parse(today())) / 864e5); return n < 0 ? ' <span class="tag bad">지남</span>' : n <= 30 ? ' <span class="tag w">' + n + '일 남음</span>' : ''; };
    var movedN = costs.filter(function (c) { return c.moved === 'club'; }).length;
    var v = s.voyage;
    var costBody = '<div class="op-hl">월 ' + num(month) + '<small>원</small><span class="dot">·</span>연 ' + num(month * 12) + '<small>원</small></div>' +
      (!s.editCosts ? '<div class="tw"><table><thead><tr><th>서비스</th><th class="n">금액</th><th>다음 결제·갱신</th><th class="n">월 환산</th><th>관리 계정</th></tr></thead><tbody>' + costs.map(function (c) {
          var amt = c.auto ? '<span class="tag">자동</span>' : (c.cur === 'USD' ? '$' + (+c.amount || 0) : num(c.amount) + '원') + ' <span class="sb">' + ({ month: '/ 월', year: '/ 년', once: '한 번' }[c.cycle] || '') + '</span>';
          var mv = c.moved === 'club' ? '<span class="tag ok">학회 계정</span>' : c.moved === 'personal' ? '<span class="tag w">개인 계정</span>' : '<span class="tag" style="background:#F2F4F6;color:#8B95A1">모름</span>';
          return '<tr><td style="white-space:normal"><b>' + esc(c.name) + '</b>' + (c.note ? '<div class="sb" style="margin-top:3px">' + esc(c.note) + '</div>' : '') + '</td><td class="n">' + amt + '</td><td>' + (c.next ? esc(c.next.replace(/-/g, '.')) + soon(c.next) : '<span class="sb">—</span>') + '</td><td class="n"><b>' + won(monthlyKRW(c, rate)) + '</b></td><td>' + mv + (c.owner ? ' <span class="sb">' + esc(c.owner) + '</span>' : '') + '</td></tr>';
        }).join('') + '</tbody><tfoot><tr><td colspan="3">합계</td><td class="n">' + won(month) + '</td><td></td></tr></tfoot></table></div><div class="acts"><button class="bt" type="button" data-a="editcosts">편집</button><span class="sb" style="font-size:13px;color:#8B95A1">환율 ' + num(rate) + '원/달러</span></div><div class="msg" data-m="costs"></div>'
      : (      '<div class="tw"><table data-t="costs"><thead><tr><th>서비스</th><th class="n">금액</th><th>통화</th><th>주기</th><th>다음 결제·갱신</th><th class="n">월 환산</th><th>메모</th><th>관리 계정</th><th>이전</th><th></th></tr></thead><tbody>' +
      costs.map(function (c, i) {
        return '<tr data-i="' + i + '"><td><input data-k="name" value="' + esc(c.name) + '" aria-label="서비스" style="min-width:190px"></td>' +
          '<td class="n">' + (c.auto ? '<span class="tag">자동</span>' : '<input data-k="amount" inputmode="decimal" value="' + esc(c.amount) + '" style="text-align:right;width:100px" aria-label="금액">') + '</td>' +
          '<td>' + (c.auto ? '<span class="sb">USD</span>' : '<select data-k="cur" aria-label="통화" style="width:84px"><option' + (c.cur === 'KRW' ? ' selected' : '') + '>KRW</option><option' + (c.cur === 'USD' ? ' selected' : '') + '>USD</option></select>') + '</td>' +
          '<td><select data-k="cycle" aria-label="주기" style="width:84px"><option value="month"' + (c.cycle === 'month' ? ' selected' : '') + '>매월</option><option value="year"' + (c.cycle === 'year' ? ' selected' : '') + '>매년</option><option value="once"' + (c.cycle === 'once' ? ' selected' : '') + '>한 번</option></select></td>' +
          '<td><input data-k="next" type="date" value="' + esc(c.next || '') + '" aria-label="다음 결제일" style="width:150px">' + soon(c.next) + '</td>' +
          '<td class="n"><b>' + won(monthlyKRW(c, rate)) + '</b></td>' +
          '<td><input data-k="note" value="' + esc(c.note || '') + '" aria-label="메모" style="min-width:220px"></td>' +
          '<td><input data-k="owner" value="' + esc(c.owner || '') + '" placeholder="가입한 이메일" aria-label="관리 계정" style="width:190px"></td>' +
          '<td><select data-k="moved" aria-label="학회 계정으로 이전" style="width:110px">' + MOVED.map(function (o) { return '<option value="' + o[0] + '"' + ((c.moved || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></td>' +
          '<td class="n">' + (c.auto ? '' : '<button class="bt s" type="button" data-rm="' + i + '">빼기</button>') + '</td></tr>';
      }).join('') +
      '</tbody><tfoot><tr><td colspan="5">합계</td><td class="n">' + won(month) + '</td><td colspan="4"></td></tr></tfoot></table></div>' +
      '<div class="acts"><button class="bt" type="button" data-a="add">줄 추가</button><button class="bt" type="button" data-a="cancelcosts">취소</button><button class="bt p" type="button" data-a="savecosts">저장</button><label>환율 <input id="op-rate" inputmode="numeric" value="' + rate + '" style="width:96px"> 원/달러</label></div><div class="msg" data-m="costs"></div>')) +
      // Voyage
      '<div style="margin-top:56px"><div class="op-h"><span class="lb">VOYAGE · POLARIS</span><span class="mt">Polaris 서버가 센 토큰 × 단가 · 무료 토큰이 남아 있으면 실제 청구는 0원</span></div>' +
      (s.usageErr ? '<p class="note" style="margin-top:16px">Polaris 서버에서 사용량을 못 받았어요 (' + esc(s.usageErr) + '). 서버를 최신으로 올리고(polaris-update main) OPS_ADMINS에 이 계정을 넣어 주세요.</p>'
        : !v ? '<p class="note" style="margin-top:16px">불러오는 중…</p>'
        : '<div class="op-hl">이번 달 ' + usd(v.usd) + '<span class="dot">·</span>지난달 ' + (v.last.n ? usd(v.last.usd) : '—') + '<span class="dot">·</span>질문 ' + num(v.q) + '<small>개</small></div>' +
          '<div class="trio"><div><span>임베딩 (이번 달)</span><b>' + num(v.tok['voyage-3.5'] / 1e3) + 'K</b><em>voyage-3.5 토큰</em></div><div><span>리랭크 (이번 달)</span><b>' + (v.tok['rerank-2.5'] / 1e6).toFixed(2) + 'M</b><em>rerank-2.5 토큰</em></div><div><span>최근 7일 질문</span><b>' + num(v.series.slice(-7).reduce(function (a, x) { return a + x.q; }, 0)) + '</b><em>' + v.series.slice(-7).map(function (x) { return x.q; }).join(' · ') + '</em></div></div>' +
          bars(v.series, 'usd', usd) + (v.last.n ? '' : '<p class="note" style="margin-top:12px">지난달 기록은 서버가 사용량을 세기 시작한 뒤부터 나와요. 그 전은 dashboard.voyageai.com → Usage에서 확인해요.</p>')) + '</div>';
    var cost = sec('cost', '유지비 · 계정', '학회 계정으로 이전 ' + movedN + '/' + costs.length + ' · 연 단위는 12로 나눠 월에 더해요', costBody);

    // ⑤ 문자 기록
    var smsBody = s.sms && s.sms.length ? '<div class="op-hl">' + num(s.sms.length) + '<small>건</small><span class="dot">·</span>최근 ' + esc(new Date(s.sms[0].created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' })) + '</div><div class="tw" style="max-height:420px;overflow-y:auto"><table><thead><tr><th>시각</th><th>받은 사람</th><th>선배님</th><th class="n">결과</th></tr></thead><tbody>' + s.sms.map(function (x) {
      var who = x.who ? '<b>' + esc(x.who) + '</b> <span class="sb">' + esc(x.id) + '</span>' : esc(x.id === 'member' ? '공용 계정' : x.id) + (x.phone4 ? ' <span class="sb">번호 …' + esc(x.phone4) + '</span>' : '');
      return '<tr><td class="sb">' + esc(new Date(x.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })) + '</td><td>' + who + '</td><td>' + esc(x.alumni_cohort + '기 ' + x.alumni_name) + '</td><td class="n">' + (x.status === 'sent' ? '<span class="tag ok">보냄</span>' : '<span class="tag bad">실패</span>') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<p class="note" style="margin-top:20px">아직 보낸 문자가 없어요.</p>';
    var sms = sec('sms', '문자 기록', 'AGORA 선배님 연락처 · 최근 50건', smsBody);

    // ⑥ 알림 메일
    var nt = set.notify || {};
    var mail = sec('mail', '알림 메일', s.mail ? '메일 발송 켜짐' : 'RESEND_API_KEY를 넣으면 켜져요',
      '<form data-f="set" class="mailbox" style="margin-top:24px"><input id="op-mail" type="email" placeholder="알림 받을 이메일" aria-label="알림 받을 이메일" value="' + esc(set.notify_email || '') + '">' +
      '<div style="margin-top:12px"><label class="chk"><input type="checkbox" id="op-n1"' + (nt.agora_sms === false ? '' : ' checked') + '>AGORA에서 선배님 연락처를 문자로 받았을 때</label>' +
      '<label class="chk"><input type="checkbox" id="op-n2"' + (nt.signup === false ? '' : ' checked') + '>회원가입 신청이 들어왔을 때</label>' +
      '<label class="chk"><input type="checkbox" id="op-n3"' + (nt.approval === false ? '' : ' checked') + '>가입을 승인했을 때 (안내 문자 결과 포함)</label></div>' +
      '<div class="acts"><button class="bt p" type="submit">저장</button></div></form><div class="msg" data-m="set"></div>');

    el.innerHTML = summary + visit + account + cost + sms + mail;
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
    var q = function (sel, fn) { var x = el.querySelector(sel); if (x) x.onclick = fn; };
    q('[data-a="editcosts"]', function () { st.editCosts = true; render(); });
    q('[data-a="cancelcosts"]', function () { st.editCosts = false; render(); });
    if (el.querySelector('[data-a="add"]')) el.querySelector('[data-a="add"]').onclick = function () { var rows = readCosts(); rows.push({ name: '', amount: 0, cur: 'KRW', cycle: 'month', next: '', note: '' }); st.state.costs = { value: { rows: rows } }; render(); };
    el.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { var rows = readCosts(); rows.splice(+b.getAttribute('data-rm'), 1); st.state.costs = { value: { rows: rows } }; render(); }; });
    if (el.querySelector('[data-a="savecosts"]')) el.querySelector('[data-a="savecosts"]').onclick = function () {
      var rows = readCosts().filter(function (c) { return c.auto || String(c.name).trim(); });
      var rate = +el.querySelector('#op-rate').value.replace(/\D/g, '') || 1400;
      var set = Object.assign({}, (st.state.settings && st.state.settings.value) || {}, { usd_krw: rate });
      save('costs', { rows: rows }, 'costs', function () { st.editCosts = false; call(st.sb, { action: 'ops_save', key: 'settings', value: set }); st.state.settings = { value: set }; });
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
    var tabs = [['sum', 'Summary'], ['visit', '방문자'], ['acc', '계좌'], ['cost', '유지비 · 계정'], ['sms', '문자 기록'], ['mail', '알림 메일']];
    el.innerHTML = '<div class="op-top"><div class="op-top-in"><button class="x" type="button" aria-label="닫기">×</button><div class="ey">R.F.S. OPERATIONS</div><h2>Operations</h2><div class="meta"><span class="op-up"></span><button type="button" data-a="reload">새로고침</button></div></div></div>' +
      '<nav class="op-tabs" aria-label="운영 메뉴"><div class="op-tabs-in">' + tabs.map(function (t, i) { return '<a href="#op-' + t[0] + '" data-t="' + t[0] + '"' + (i ? '' : ' class="on"') + '>' + t[1] + '</a>'; }).join('') + '</div></nav>' +
      '<div class="op-in op-body"><p class="note">불러오는 중…</p></div>';
    document.body.appendChild(el);
    st = { el: el, sb: o.sb, onPending: o.onPending, state: {} };
    el.querySelector('.x').onclick = close;
    el.querySelector('[data-a="reload"]').onclick = load;
    // 위쪽 탭: 누르면 그 칸으로, 스크롤하면 지금 칸에 밑줄 (화면 주소는 바꾸지 않는다)
    el.querySelectorAll('.op-tabs a').forEach(function (a) {
      a.onclick = function (e) { e.preventDefault(); var t = el.querySelector('#op-' + a.getAttribute('data-t')); if (t) el.scrollTo({ top: t.offsetTop - 64, behavior: 'smooth' }); };
    });
    el.addEventListener('scroll', function () {
      var cur = 'sum';
      el.querySelectorAll('.op-s').forEach(function (x) { if (x.offsetTop - 90 <= el.scrollTop) cur = x.id.slice(3); });
      el.querySelectorAll('.op-tabs a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-t') === cur); });
    }, { passive: true });
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
