/* 운영 대시보드: 관리자(member-admin의 MEMBER_ADMINS)만. AGORA 위쪽 바의 '운영'에서 연다 (app.js openJoinAdmin).
 * 한 화면에 ① 계좌 잔액·이번 달 유지비·버틸 수 있는 기간·승인 대기 ② 회원가입 승인 ③ 계좌 잔액 기록(손으로 입력)
 * ③-2 방문자(Google Analytics, member-admin의 ga) ④ Voyage 사용량·Polaris 질문 수(Polaris 서버 /usage, 이번 달·지난달) ⑤ 유지비 표 ⑥ 문자 기록 ⑦ 알림 메일 설정. (홈페이지 유지비만 본다: Claude API는 뺐다)
 * ⑧ 학회원증: 카드 목록·발급/수정·정지, QR 보기(https://caurfs.kr/v/#토큰, member-admin의 card_*, 확인 화면은 /v/ + member-verify)
 * 화면: 왼쪽 메뉴(NAV)를 누르면 오른쪽이 그 페이지로 바뀐다(go → showPage, 칸은 다 그려 두고 지금 것만 보임). 첫 화면 '홈'은 할 일 + 잔액·방문자 카드
 * ⑪ 자동 작업: GitHub Actions 링크 (리포트 PDF 올리기 inbox/ → add-report.yml, 학기 넘기기 new-term.yml)
 * ⑩ 수료증: '수료증 만들기'를 누르면 assets/cert.js(RFSCert)를 불러와 연다. 서명·인감은 member-admin cert_get·cert_save
 * ⑨ 회계장부: 잠근 채로 열리고 '열기'를 눌러야 서버에서 받는다(member-admin ledger_*·receipt_*, LEDGER_ADMINS). 금액은 가려 두고 '금액 보기'는 60초 뒤 다시 가린다.
 *    10분 동안 손대지 않으면 다시 잠근다. 장부는 메모리에만 두고 localStorage·sessionStorage에 넣지 않는다. 엑셀은 브라우저에서 읽고 쓴다(SheetJS, 버전 고정 + SRI).
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
  // 학회원증 QR: 주소는 우리 도메인만. QR 그림은 브라우저에서 그린다 (qrcode-generator, 버전 고정 + SRI)
  var CARD_URL = 'https://caurfs.kr/v/#';
  var QR_LIB = { src: 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js', sri: 'sha384-8FWZA6BGMXhsfO+BLtrJK0We6gg5o1JyO8xQm6peWDEUs17ACA5ziE/NIAkl9z2k' };
  // 회계장부 엑셀: SheetJS. 회계장부 칸을 열 때만 불러온다
  var XLSX_LIB = { src: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', sri: 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw' };
  var LG_IDLE = 10 * 60e3, LG_SHOW = 60e3, LG_FILE = 5 * 1024 * 1024;
  var LG_ACT = { view: '열람', save: '저장', download: '내려받기', upload_receipt: '증빙 올림', view_receipt: '증빙 열람', log_view: '기록 조회' };
  var LG_ERR = { ledger_admin: '권한 없음 · LEDGER_ADMINS', admin: '관리자 계정 아님', stale: '다른 관리자가 먼저 저장함 · 다시 열고 올리기', row: '형식 오류가 있는 줄', too_many: '최대 2,000줄', save: '저장 실패 · ops_state 테이블 확인', size: '최대 5MB', type: 'PDF·JPG·PNG·WEBP만', upload: '업로드 실패 · Storage 버킷 ledger 확인', no_receipt: '증빙 없음', sign: '증빙 주소 생성 실패' };
  var CARD_ERR = { no: '카드 번호: 영문·숫자·하이픈 (RFS-41-001)', name: '이름 필요', photo: '사진: 사이트 경로 (/assets/officers/president.webp)', cohort: '기수: 숫자', dates: '유효기간 시작이 끝보다 늦음', card_save: '저장 실패 · member_cards 테이블 확인' };
  // 디자인: 토스처럼 — 연회색 바탕(#F2F4F6)에 모서리 둥근 흰 카드, 큰 굵은 숫자, "~해요" 말투. 왼쪽 메뉴를 누르면 오른쪽 화면이 그 페이지로 바뀐다 (아래로 길게 늘어놓지 않음)
  // 주 버튼은 남색(#1B2E4F), 그래프·강조는 파랑(#3182F6), 늘어남 빨강·줄어듦 파랑(한국 증권 관례). 글꼴은 Pretendard 하나. 폰에서는 메뉴가 위쪽 가로 줄로 바뀐다
  var CSS = '\
.op{--ink:#191F28;--ink2:#4E5968;--mut:#8B95A1;--fnt:#B0B8C1;--line:#F2F4F6;--line2:#E5E8EB;--paper:#F2F4F6;--panel:#F9FAFB;--navy:#1B2E4F;--navy2:#24406C;--sky:#3182F6;--gold:#C9B98A;--up:#F04452;--dn:#3182F6;--ok:#03A65F;--warn:#E07B00}\
.op{position:fixed;inset:0;z-index:3500;background:var(--paper);color:var(--ink);overflow-y:auto;opacity:0;transition:opacity .2s ease;font:400 15px/1.6 "Pretendard Variable",Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums;letter-spacing:-.01em}\
.op.show{opacity:1}\
.op *{box-sizing:border-box}\
.op button{font:inherit;cursor:pointer}\
.op-app{display:grid;grid-template-columns:256px minmax(0,1fr);min-height:100%}\
.op-nav{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;padding:28px 16px 20px;overflow-y:auto;scrollbar-width:none}\
.op-nav::-webkit-scrollbar{display:none}\
.op-brand{display:flex;align-items:center;justify-content:space-between;padding:0 12px 20px}\
.op-brand b{font-size:20px;font-weight:700;letter-spacing:-.02em}.op-brand b span{margin-left:6px;font-size:14px;font-weight:500;color:var(--mut)}\
.op .x{width:36px;height:36px;border:0;border-radius:10px;background:none;color:var(--mut);font-size:22px;line-height:1;transition:background .15s,color .15s}\
.op .x:hover{background:var(--line2);color:var(--ink)}\
.op-grp{margin-top:14px}.op-grp h6{margin:0 0 4px;padding:0 14px;font-size:12px;font-weight:600;color:var(--mut)}\
.op-nv{display:flex;align-items:center;gap:12px;width:100%;height:44px;padding:0 12px;border:0;border-radius:12px;background:none;color:var(--ink2);font-size:15px;font-weight:600;text-align:left;text-decoration:none;transition:background .15s,color .15s}\
.op-nv:hover{background:var(--line2)}\
.op-nv.on{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.04)}\
.op-nv i{width:28px;height:28px;flex:none;border-radius:9px;display:grid;place-items:center;background:var(--line2);color:var(--ink2)}\
.op-nv i svg{width:16px;height:16px}\
.op-nv.on i{background:var(--navy);color:#fff}\
.op-nv em{margin-left:auto;font-style:normal;font-size:12px;font-weight:700;color:#fff;background:var(--up);border-radius:10px;padding:0 7px;line-height:20px}\
.op-foot{margin-top:auto;padding:20px 12px 0;font-size:13px;color:var(--mut);display:flex;align-items:center;justify-content:space-between;gap:8px}\
.op-foot button{height:30px;padding:0 10px;border:0;border-radius:8px;background:var(--line2);color:var(--ink2);font-size:13px;font-weight:600}\
.op-main{min-width:0;padding:36px 40px 96px;max-width:1080px}\
.op-ph{margin:0 0 24px}.op-ph h1{margin:0;font-size:26px;font-weight:700;letter-spacing:-.025em}.op-ph p{margin:6px 0 0;color:var(--mut);font-size:14px}\
.op-body{display:grid;gap:16px}\
.op-s{background:#fff;border-radius:22px;padding:28px 30px;min-width:0}\
.op-s[hidden]{display:none}\
.op-s>.op-h{display:none}\
.op-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px 16px;flex-wrap:wrap}\
.op-h h3{margin:0;font-size:18px;font-weight:700}\
.op-h h4{margin:0;font-size:17px;font-weight:700;color:var(--ink)}\
.op-h .mt{font-size:13px;color:var(--mut);display:flex;align-items:center;gap:8px}\
.op .sub{margin-top:40px;padding-top:28px;border-top:1px solid var(--line)}\
.op-hl{margin:0 0 24px;font-size:28px;font-weight:700;line-height:1.3;letter-spacing:-.02em}\
.op-hl small{font-size:15px;font-weight:500;color:var(--mut);margin-left:2px;letter-spacing:0}\
.op-hl .dot{display:inline-block;width:1px;height:.7em;background:var(--line2);margin:0 16px;vertical-align:-.02em;overflow:hidden;color:transparent}\
.op .note{font-size:14px;line-height:1.7;color:var(--mut);margin:0}\
.op .op-st{margin:0;padding:20px 0;font-size:14px;color:var(--mut)}\
.op .op-st.err{color:var(--up)}\
.op .op-st.load{color:var(--fnt)}\
.op-home{display:grid;gap:16px}\
.op-hi{margin:0 0 8px;font-size:26px;font-weight:700;letter-spacing:-.025em}\
.op-hi+p{margin:0 0 12px;color:var(--mut);font-size:14px}\
.op-g2{display:grid;grid-template-columns:1.25fr 1fr;gap:16px}.op-g3{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}\
.op-c{background:#fff;border-radius:22px;padding:24px 26px;min-width:0}\
.op-c h3{margin:0;font-size:15px;font-weight:600;color:var(--ink2)}\
.op-c .big{margin:6px 0 2px;font-size:32px;font-weight:700;letter-spacing:-.025em;line-height:1.25;white-space:nowrap}\
.op-c .big small{font-size:18px;font-weight:600;margin-left:2px}\
.op-c .cap{color:var(--mut);font-size:14px}\
.op-c .cap .up{color:var(--up)}.op-c .cap .dn{color:var(--dn)}\
.op-c.mini .big{font-size:24px}\
.op-c.lnk{cursor:pointer;transition:transform .15s}.op-c.lnk:hover{transform:translateY(-1px)}\
.op-pill{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.op-pill span{background:var(--paper);border-radius:10px;padding:8px 12px;font-size:14px;color:var(--ink2)}.op-pill b{color:var(--ink);margin-left:4px}\
.op-pill b.w{color:var(--warn)}.op-pill b.bad{color:var(--up)}\
.op-spark{display:flex;align-items:flex-end;gap:5px;height:84px;margin-top:18px}.op-spark i{flex:1;border-radius:5px;background:var(--line2)}.op-spark i.on{background:var(--sky)}\
.op-todo{margin-top:8px}\
.op-todo .it{display:flex;align-items:center;gap:14px;padding:14px 0;border-top:1px solid var(--line)}.op-todo .it:first-child{border-top:0}\
.op-todo .ic{width:40px;height:40px;flex:none;border-radius:14px;display:grid;place-items:center}.op-todo .ic svg{width:18px;height:18px}\
.op-todo .t{flex:1;min-width:0}.op-todo .t b{display:block;font-weight:600;font-size:15.5px}.op-todo .t small{display:block;color:var(--mut);font-size:13.5px}\
.op-todo .none{padding:18px 0 4px;color:var(--mut)}\
.op table{width:100%;border-collapse:collapse;font-size:14.5px}\
.op .tw{overflow-x:auto;-webkit-overflow-scrolling:touch}\
.op th{padding:10px 14px;font-weight:500;font-size:13px;color:var(--mut);text-align:left;border-bottom:1px solid var(--line2);white-space:nowrap}\
.op td{padding:14px;border-bottom:1px solid var(--line);vertical-align:middle;white-space:nowrap}\
.op th:first-child,.op td:first-child{padding-left:0}\
.op th:last-child,.op td:last-child{padding-right:0}\
.op tbody tr:last-child td{border-bottom:0}\
.op td b{font-weight:600}\
.op td.n,.op th.n{text-align:right;font-variant-numeric:tabular-nums}\
.op td.sb,.op td .sb,.op .sb{color:var(--mut);font-size:13.5px}\
.op td.wrap{white-space:normal;min-width:120px}\
.op tfoot td{border-top:1px solid var(--line2);border-bottom:0;font-weight:700}\
.op .up{color:var(--up)}.op .dn{color:var(--dn)}.op .nil{color:var(--fnt)}\
.op .bars{display:flex;align-items:flex-end;gap:4px;height:140px}\
.op .bars i{flex:1;min-width:2px;background:var(--sky);border-radius:4px 4px 0 0;transition:opacity .15s}\
.op .bars i:hover{opacity:.7}\
.op .bars i.z{background:var(--line2)}\
.op .ax{display:flex;justify-content:space-between;font-size:12.5px;color:var(--fnt);margin-top:8px}\
.op .two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px;margin-top:40px}\
.op .two h4{margin:0 0 8px;font-size:16px;font-weight:700}\
.op .kpi{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 24px}\
.op .kpi.q4{grid-template-columns:repeat(4,minmax(0,1fr))}\
.op .kpi>div{padding:16px 18px;background:var(--panel);border-radius:14px;min-width:0}\
.op .kpi span{display:block;font-size:13px;color:var(--mut)}\
.op .kpi b{display:block;margin-top:4px;font-size:22px;font-weight:700;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.op .kpi b small{font-size:13px;font-weight:500;color:var(--mut);margin-left:2px}\
.op .kpi em{display:block;margin-top:2px;font-style:normal;font-size:12.5px;color:var(--fnt)}\
.op input,.op select{height:44px;padding:0 14px;border:1px solid transparent;border-radius:12px;background:var(--paper);color:var(--ink);font:inherit;font-size:15px;min-width:0;width:100%;transition:border-color .15s,background .15s,box-shadow .15s}\
.op input::placeholder{color:var(--fnt)}\
.op select{appearance:none;-webkit-appearance:none;padding-right:34px;background:var(--paper) url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%276%27%3E%3Cpath d=%27M1 1l4 4 4-4%27 fill=%27none%27 stroke=%27%238B95A1%27 stroke-width=%271.5%27/%3E%3C/svg%3E") no-repeat right 14px center}\
.op td input,.op td select{height:38px;font-size:14px;padding:0 10px;border-radius:10px}\
.op td select{padding-right:28px}\
.op input:hover,.op select:hover{background-color:#ECEEF1}\
.op input:focus,.op select:focus{outline:none;border-color:var(--sky);background-color:#fff;box-shadow:0 0 0 3px rgba(49,130,246,.12)}\
.op input[readonly]{color:var(--mut)}\
.op button:focus-visible,.op a:focus-visible{outline:2px solid var(--sky);outline-offset:2px}\
.op .bt{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 16px;border:0;border-radius:11px;background:var(--paper);color:var(--ink2);font-size:14.5px;font-weight:600;white-space:nowrap;text-decoration:none;transition:background .15s,color .15s}\
.op .bt:hover{background:var(--line2);color:var(--ink)}\
.op .bt.p{background:var(--navy);color:#fff}\
.op .bt.p:hover{background:var(--navy2)}\
.op .bt.lt{background:#E8F3FF;color:#1B64DA}.op .bt.lt:hover{background:#D6E9FF}\
.op .au-r{display:flex;gap:24px;align-items:flex-start;justify-content:space-between;padding:22px 0;border-top:1px solid var(--line)}.op .au-r:first-of-type{border-top:0;padding-top:4px}.op .au-t b{font-size:16px;font-weight:700}.op .au-t ol{margin:6px 0 0;padding-left:18px;color:var(--ink2);font-size:14px;line-height:1.75}.op .au-t ol b{font-size:inherit;color:var(--ink)}.op a.bt.au-b{flex:none}@media(max-width:640px){.op .au-r{flex-direction:column;gap:12px}}\
.op .bt.s{height:32px;padding:0 11px;font-size:13px;border-radius:9px}\
.op .bt:disabled{opacity:.4;cursor:default}\
.op .frm{display:grid;grid-template-columns:1.2fr .9fr 1.6fr auto;gap:8px;margin:0 0 24px}\
.op .tag{display:inline-block;font-size:12.5px;font-weight:600;line-height:22px;padding:0 8px;border-radius:7px;color:var(--ink2);background:var(--paper);white-space:nowrap}\
.op .tag.w{color:var(--warn);background:#FFF4E5}.op .tag.bad{color:var(--up);background:#FFEEEF}.op .tag.ok{color:var(--ok);background:#E5F7EE}.op .tag.mute{color:var(--fnt)}\
.op .acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px;align-items:center}\
.op .acts label{display:flex;gap:8px;align-items:center;font-size:14px;color:var(--mut)}\
.op .acts label input{width:auto}\
.op .acts .sp{flex:1}\
.op .chk{display:flex;gap:12px;align-items:center;font-size:15px;min-height:54px;border-bottom:1px solid var(--line);cursor:pointer}\
.op .chk input{width:20px;height:20px;accent-color:var(--sky);box-shadow:none}\
.op .msg{font-size:14px;color:var(--sky);min-height:20px;margin-top:12px}\
.op .mailbox{max-width:560px}\
.op .cfrm{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px 8px;margin:32px 0 0}\
.op .cfrm label{display:grid;gap:6px;font-size:13px;color:var(--mut);min-width:0}\
.op .panel{margin-top:24px;padding:24px;background:var(--panel);border-radius:16px}\
.op .qrbox{display:grid;grid-template-columns:auto minmax(0,1fr);gap:28px;align-items:center}\
.op .qrbox canvas{width:200px;height:200px;background:#fff;border-radius:12px;image-rendering:pixelated;display:block}\
.op .qrbox .u{font-size:13px;color:var(--mut);word-break:break-all;margin:8px 0 0}\
.op .qrbox h4{margin:6px 0 0;font-size:22px;font-weight:700}\
.op .eyb{font-size:13px;color:var(--mut);font-weight:600}\
.op .lgf{display:grid;grid-template-columns:200px minmax(0,1fr);gap:8px;margin:32px 0 8px}\
.op .lgpv h4{margin:0;font-size:16px;font-weight:700}\
.op .lgpv .cnt{display:flex;gap:8px 24px;flex-wrap:wrap;font-size:14px;color:var(--mut);margin:14px 0 8px}\
.op .lgpv .cnt b{color:var(--ink);font-weight:700;margin-left:6px}\
.op .lgpv .cnt b.bad{color:var(--up)}\
.op .lgpv .tw{margin-top:12px}\
.op tr.bad td{background:#FFF7F7}\
.op .lock{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;margin-top:0}\
.op .lock b{display:block;font-size:18px;font-weight:700;margin-bottom:2px}\
.op .mask{letter-spacing:.16em;color:var(--fnt)}\
.op .kpi b .mask{font-size:18px;letter-spacing:.2em}\
.op .meta2{margin-top:0;font-size:13.5px;color:var(--mut)}\
@media (max-width:860px){.op-app{grid-template-columns:minmax(0,1fr)}.op-nav{min-width:0;position:sticky;top:0;z-index:3;height:auto;padding:12px 0 0;background:rgba(242,244,246,.96);backdrop-filter:blur(8px);flex-direction:row;flex-wrap:wrap;overflow:visible}.op-brand{width:100%;padding:0 12px 8px 16px}.op-grps{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:0 16px 12px;width:100%;min-width:0}.op-grps::-webkit-scrollbar{display:none}.op-grp{display:contents}.op-grp h6{display:none}.op-nv{width:auto;flex:none;height:38px;padding:0 14px;font-size:14px;border-radius:19px;background:#fff}.op-nv i{display:none}.op-nv.on{background:var(--navy);color:#fff}.op-nv em{margin-left:6px}.op-foot{display:none}.op-main{padding:20px 16px 64px}.op-ph h1,.op-hi{font-size:22px}.op-s,.op-c{padding:22px 20px;border-radius:18px}.op-g2,.op-g3{grid-template-columns:1fr}.op-c .big{font-size:28px}.op-hl{font-size:22px}.op-hl .dot{margin:0 10px}.op .acts .sp{display:none}.op .bars{height:104px}.op .two{grid-template-columns:1fr;gap:32px;margin-top:32px}.op .kpi,.op .kpi.q4{grid-template-columns:1fr 1fr}.op .kpi b{font-size:19px}.op .frm{grid-template-columns:1fr 1fr}.op .cfrm{grid-template-columns:1fr 1fr}.op .panel{padding:18px}.op .qrbox{grid-template-columns:1fr;gap:18px}.op .lgf{grid-template-columns:1fr;margin-top:24px}.op .sub{margin-top:32px;padding-top:24px}}\
@media (prefers-reduced-motion:reduce){.op,.op *{transition:none!important}}\
'
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
    return '<section class="op-s' + (dark ? ' dk' : '') + '" id="op-' + id + '"><div class="op-h"><h3>' + label + '</h3><span class="mt">' + meta + '</span></div>' + body + '</section>';
  };
  // 불러오는 중 · 비어 있음 · 오류: 모든 칸에서 같은 모양
  var stn = function (kind, text) { return '<p class="op-st ' + kind + '">' + text + '</p>'; };
  var LOADING = stn('load', '불러오는 중');
  var num = function (n) { return Math.round(n || 0).toLocaleString('ko-KR'); };

  // ---- 학회원증
  function cardState(c) {
    var t = today();
    if (c.revoked) return ['bad', '정지'];
    if (c.valid_to && t > c.valid_to) return ['w', '기간 지남'];
    if (c.valid_from && t < c.valid_from) return ['', '시작 전'];
    return ['ok', '유효'];
  }
  function cardSection(s) {
    var cards = s.cards, e = s.editCard || {};
    var f = function (k, label, attrs) { return '<label>' + label + '<input data-c="' + k + '" value="' + esc(e[k] == null ? '' : e[k]) + '" ' + (attrs || '') + '></label>'; };
    var form = '<form data-f="card"><div class="cfrm">' +
      f('no', '카드 번호', 'placeholder="RFS-41-001" maxlength="40" autocapitalize="characters"' + (e.no && s.editCardOld ? ' readonly' : '')) +
      f('name', '이름', 'placeholder="홍길동" maxlength="40"') + f('name_en', '영문 이름', 'placeholder="HONG GIL-DONG" maxlength="60"') + f('cohort', '기수', 'inputmode="numeric" placeholder="41"') +
      f('role', '직책', 'placeholder="회장 · President" maxlength="60"') + f('valid_from', '유효기간 시작', 'type="date"') + f('valid_to', '유효기간 끝', 'type="date"') + f('photo', '사진 경로 (선택)', 'placeholder="/assets/officers/president.webp"') +
      '</div><div class="acts"><button class="bt p" type="submit">' + (s.editCardOld ? '수정 저장' : '발급') + '</button>' + (s.editCardOld ? '<button class="bt" type="button" data-a="cardnew">새 카드</button>' : '') + '</div></form><div class="msg" data-m="card"></div>';
    var list;
    if (s.cardErr) list = stn('err', '불러오기 실패 (' + esc(s.cardErr) + ') · member_cards 테이블, member-admin 배포 확인');
    else if (!cards) list = LOADING;
    else if (!cards.length) list = stn('empty', '발급한 카드 없음');
    else list = '<div class="tw" style="margin-top:32px"><table><thead><tr><th>카드 번호</th><th>이름</th><th class="n">기수</th><th>직책</th><th>유효기간</th><th>상태</th><th></th></tr></thead><tbody>' + cards.map(function (c, i) {
      var cs = cardState(c);
      return '<tr><td><b>' + esc(c.no) + '</b></td><td>' + esc(c.name) + (c.name_en ? ' <span class="sb">' + esc(c.name_en) + '</span>' : '') + '</td><td class="n">' + (c.cohort ? esc(c.cohort) + '기' : '—') + '</td><td>' + esc(c.role || '—') + '</td>' +
        '<td class="sb">' + esc((c.valid_from || '').replace(/-/g, '.')) + ' – ' + esc((c.valid_to || '').replace(/-/g, '.')) + '</td><td><span class="tag ' + cs[0] + '">' + cs[1] + '</span></td>' +
        '<td class="n"><button class="bt s" type="button" data-cq="' + i + '"' + (c.token ? '' : ' disabled title="CARD_SECRET 필요"') + '>QR 보기</button> <button class="bt s" type="button" data-ce="' + i + '">수정</button> <button class="bt s" type="button" data-cr="' + i + '">' + (c.revoked ? '정지 풀기' : '정지') + '</button></td></tr>';
    }).join('') + '</tbody></table></div>';
    var qc = s.qr != null && cards && cards[s.qr];
    var qr = qc ? '<div class="panel qrbox"><canvas data-qr width="10" height="10" aria-label="QR 코드"></canvas><div><div class="eyb">QR · ' + esc(qc.no) + '</div><h4>' + esc(qc.name) + '</h4><p class="u" data-qu>' + esc(CARD_URL + qc.token) + '</p>' +
      '<div class="acts"><button class="bt p" type="button" data-a="qrpng">PNG 저장</button><button class="bt" type="button" data-a="qrcopy">주소 복사</button><button class="bt" type="button" data-a="qrclose">닫기</button></div><div class="msg" data-m="qr"></div>' +
      '<p class="note" style="margin-top:8px">오류 복원 H(30%) · 인쇄 2cm 이상 · 정지하면 같은 QR이 ‘정지된 카드’로 표시</p></div></div>' : '';
    return sec('card', '학회원증', (cards ? cards.length + '장' : '') + (s.cardSecret === false ? ' · CARD_SECRET 필요' : ' · QR → caurfs.kr/v/'), list + qr + form);
  }
  function loadQR() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    return new Promise(function (ok, no) {
      var sc = document.createElement('script');
      sc.src = QR_LIB.src; sc.integrity = QR_LIB.sri; sc.crossOrigin = 'anonymous';
      sc.onload = function () { window.qrcode ? ok(window.qrcode) : no(); }; sc.onerror = no;
      document.head.appendChild(sc);
    });
  }
  // QR을 캔버스에 그린다: 모듈당 12px, 둘레 4모듈 여백 (PNG로 저장해도 인쇄에 충분)
  function drawQR(cv, text) {
    return loadQR().then(function (qrcode) {
      var q = qrcode(0, 'H'); q.addData(text, 'Byte'); q.make();
      var n = q.getModuleCount(), px = 12, m = 4, size = (n + m * 2) * px, g = cv.getContext('2d');
      cv.width = size; cv.height = size;
      g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#0F1B2E';
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect((c + m) * px, (r + m) * px, px, px);
    });
  }
  function loadCards() {
    return call(st.sb, { action: 'card_list' }).then(function (r) {
      if (!st) return;
      if (r && r.ok) { st.cards = r.list || []; st.cardSecret = !!r.secret; st.cardErr = ''; } else { st.cards = null; st.cardErr = (r && r.error) || 'fail'; }
      render();
    });
  }

  // ---- 회계장부: 엑셀 읽기 (순수 함수. 시트를 2차원 배열로 받는다 — XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, range: 0 }), 그래서 i + 1이 엑셀 행 번호)
  var LG_HEAD = { '날짜': 'date', '일자': 'date', '항목': 'item', '내용': 'item', '수입': 'income', '입금': 'income', '지출': 'expense', '출금': 'expense', '계': 'balance', '잔액': 'balance', '비고': 'note', '메모': 'note' };
  function lgCell(v) { return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v; }
  function lgDate(v) {
    var y, m, d;
    if (v instanceof Date && !isNaN(v)) { y = v.getFullYear(); m = v.getMonth() + 1; d = v.getDate(); }
    else if (typeof v === 'number' && v > 20000 && v < 80000) { var t = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5); y = t.getUTCFullYear(); m = t.getUTCMonth() + 1; d = t.getUTCDate(); }
    else if (typeof v === 'string') {
      var x = v.trim().match(/^(\d{4}|\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})\s*[.일]?$/);
      if (!x) return null;
      y = x[1].length === 2 ? 2000 + +x[1] : +x[1]; m = +x[2]; d = +x[3];
    } else return null;
    var chk = new Date(Date.UTC(y, m - 1, d));
    if (chk.getUTCFullYear() !== y || chk.getUTCMonth() !== m - 1 || chk.getUTCDate() !== d) return null;
    return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }
  function lgNum(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).trim(), neg = /^\(.*\)$/.test(s) || /^[-−▲△]/.test(s);
    s = s.replace(/[^\d.]/g, '');
    if (!s) return null;
    var n = parseFloat(s);
    return isFinite(n) ? (neg ? -n : n) : null;
  }
  function parseLedger(aoa) {
    var out = { rows: [], mismatches: [], dateFails: [], header: -1 };
    var h = -1, col = {};
    for (var r = 0; r < Math.min(aoa.length, 50) && h < 0; r++) {
      var row = (aoa[r] || []).map(lgCell);
      if (row.indexOf('날짜') >= 0 && row.indexOf('항목') >= 0) {
        h = r;
        row.forEach(function (c, i) { var k = LG_HEAD[c]; if (k && col[k] == null) col[k] = i; });
      }
    }
    out.header = h;
    if (h < 0) return out;
    var prev = null;
    for (var i = h + 1; i < aoa.length; i++) {
      var a = aoa[i] || [], g = function (k) { return col[k] == null ? null : lgCell(a[col[k]]); };
      var rawDate = g('date'), item = g('item'), inc = lgNum(g('income')), exp = lgNum(g('expense')), bal = lgNum(g('balance')), note = g('note');
      var empty = function (v) { return v == null || v === ''; };
      if (empty(rawDate) && empty(item) && inc == null && exp == null) continue;
      if (empty(rawDate) && /^(합계|소계|총계|계)$/.test(String(item || ''))) continue;
      var date = lgDate(rawDate);
      if (!date) { out.dateFails.push(i + 1); continue; }
      var x = { date: date, item: String(item == null ? '' : item).slice(0, 200), income: Math.abs(inc || 0), expense: Math.abs(exp || 0), balance: bal, note: String(note == null ? '' : note).slice(0, 300) };
      var want = prev == null ? null : Math.round((prev + x.income - x.expense) * 100) / 100;
      if (x.balance == null) x.balance = want;
      else if (want != null && Math.abs(want - x.balance) > 0.5) out.mismatches.push({ index: out.rows.length, line: i + 1, expected: want });
      prev = x.balance;
      out.rows.push(x);
    }
    return out;
  }
  // 올린 장부와 지금 장부 비교: 같은 날짜·항목(몇 번째인지까지)을 같은 줄로 본다. 증빙은 그대로 이어 붙인다
  function ledgerDiff(oldRows, newRows) {
    var key = function (rows) { var seen = {}; return rows.map(function (r) { var k = r.date + '|' + r.item; seen[k] = (seen[k] || 0) + 1; return k + '|' + seen[k]; }); };
    var ok = key(oldRows), nk = key(newRows), om = {}, d = { added: 0, changed: 0, balance: 0, removed: 0, same: 0, rows: [] };
    ok.forEach(function (k, i) { om[k] = oldRows[i]; });
    nk.forEach(function (k, i) {
      var n = Object.assign({}, newRows[i]), o = om[k];
      if (!o) d.added++;
      else {
        if (o.receipt && !n.receipt) n.receipt = o.receipt;
        // 수입·지출·비고가 바뀌면 '바뀐 줄', 잔액(계)만 달라졌으면 따로 센다 (앞 줄 하나를 고치면 뒤 잔액이 다 바뀌어서)
        if (+o.income !== +n.income || +o.expense !== +n.expense || String(o.note || '') !== String(n.note || '')) d.changed++;
        else if ((o.balance == null ? null : +o.balance) !== (n.balance == null ? null : +n.balance)) d.balance++; else d.same++;
        delete om[k];
      }
      d.rows.push(n);
    });
    d.removed = Object.keys(om).length;
    return d;
  }
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (loadXLSX.p) return loadXLSX.p;
    loadXLSX.p = new Promise(function (ok, no) {
      var sc = document.createElement('script');
      sc.src = XLSX_LIB.src; sc.integrity = XLSX_LIB.sri; sc.crossOrigin = 'anonymous'; sc.referrerPolicy = 'no-referrer';
      sc.onload = function () { window.XLSX ? ok(window.XLSX) : no(); }; sc.onerror = function () { loadXLSX.p = null; no(); };
      document.head.appendChild(sc);
    });
    return loadXLSX.p;
  }

  // ---- 회계장부 화면
  var lgWhen = function (t) { return t ? new Date(t).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; };
  function lgAmt(n, show) { return n == null ? '<span class="nil">—</span>' : show ? num(n) : '<span class="mask">•••••</span>'; }
  function lgFiltered(lg) {
    var q = (lg.q || '').toLowerCase();
    var out = [];
    for (var i = lg.rows.length - 1; i >= 0; i--) {
      var r = lg.rows[i];
      if (lg.month && r.date.slice(0, 7) !== lg.month) continue;
      if (q && (String(r.item) + ' ' + String(r.note || '')).toLowerCase().indexOf(q) < 0) continue;
      out.push(i);
    }
    // 최신 날짜 먼저 (같은 날은 장부에서 나중 줄 먼저). 잔액은 장부 순서 그대로
    return out.sort(function (a, b) { var x = lg.rows[a].date, y = lg.rows[b].date; return x < y ? 1 : x > y ? -1 : b - a; });
  }
  function ledgerTable(lg) {
    var idx = lgFiltered(lg), show = lg.show;
    if (!lg.rows.length) return stn('empty', '장부 없음 · 엑셀 올리기로 시작');
    if (!idx.length) return stn('empty', '조건에 맞는 줄 없음');
    return '<div class="tw"><table><thead><tr><th>날짜</th><th>항목</th><th class="n">수입</th><th class="n">지출</th><th class="n">잔액</th><th>비고</th><th class="n">증빙</th></tr></thead><tbody>' + idx.map(function (i) {
      var r = lg.rows[i];
      return '<tr><td>' + esc(r.date.replace(/-/g, '.')) + '</td><td class="wrap" style="min-width:160px">' + esc(r.item) + '</td>' +
        '<td class="n">' + (r.income ? lgAmt(r.income, show) : '<span class="nil">—</span>') + '</td>' +
        '<td class="n">' + (r.expense ? lgAmt(r.expense, show) : '<span class="nil">—</span>') + '</td>' +
        '<td class="n"><b>' + lgAmt(r.balance, show) + '</b></td><td class="sb wrap" style="min-width:140px">' + esc(r.note || '') + '</td>' +
        '<td class="n">' + (r.receipt ? '<button class="bt s" type="button" data-lgv="' + i + '">보기</button> ' : '') + '<button class="bt s" type="button" data-lgu="' + i + '">' + (r.receipt ? '교체' : '첨부') + '</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function ledgerSection(s) {
    var lg = s.lg || { locked: true };
    var meta = 'LEDGER_ADMINS 전용 · 모든 접근 기록';
    if (lg.locked) {
      return sec('ledger', '회계장부', meta, '<div class="panel lock"><div><b>잠김</b><span class="note">' + (lg.why || '열면 서버에서 새로 받음 · 열람 기록됨') + '</span></div><button class="bt p" type="button" data-a="lgopen"' + (lg.loading ? ' disabled' : '') + '>' + (lg.loading ? '불러오는 중' : '열기') + '</button></div><div class="msg" data-m="lg">' + esc(lg.err || '') + '</div>');
    }
    var rows = lg.rows, last = rows[rows.length - 1], show = lg.show, mk = today().slice(0, 7);
    var mi = 0, mo = 0;
    rows.forEach(function (r) { if (r.date.slice(0, 7) === mk) { mi += +r.income || 0; mo += +r.expense || 0; } });
    var months = []; rows.forEach(function (r) { var m = r.date.slice(0, 7); if (months.indexOf(m) < 0) months.push(m); }); months.sort().reverse();
    var body = '<div class="kpi q4"><div><span>현재 잔액</span><b>' + (last && last.balance != null ? lgAmt(last.balance, show) + (show ? '<small>원</small>' : '') : '—') + '</b></div>' +
      '<div><span>이번 달 수입</span><b>' + lgAmt(mi, show) + '</b></div><div><span>이번 달 지출</span><b>' + lgAmt(mo, show) + '</b></div>' +
      '<div><span>기록</span><b>' + num(rows.length) + '<small>줄</small></b></div></div>' +
      '<p class="meta2">마지막 수정 ' + esc(lgWhen(lg.updated_at)) + (lg.updated_by ? ' · ' + esc(lg.updated_by) : '') + (lg.source_name ? ' · ' + esc(lg.source_name) : '') + '</p>' +
      '<div class="acts"><button class="bt' + (show ? ' p' : '') + '" type="button" data-a="lgshow">' + (show ? '금액 가리기' : '금액 보기') + '</button>' +
      '<button class="bt" type="button" data-a="lgup">엑셀 올리기</button><button class="bt" type="button" data-a="lgdown"' + (rows.length ? '' : ' disabled') + '>엑셀 내려받기</button>' +
      '<span class="sp"></span><button class="bt" type="button" data-a="lglock">잠그기</button>' +
      '<input type="file" data-lgfile accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden><input type="file" data-lgrc accept="application/pdf,image/jpeg,image/png,image/webp" hidden></div>' +
      '<div class="msg" data-m="lg">' + esc(lg.msg || '') + '</div>';
    var pv = lg.pv;
    if (pv) {
      body += '<div class="panel lgpv"><div class="eyb">올릴 장부 확인</div><h4 style="margin-top:4px">' + esc(pv.name) + '</h4>' +
        '<div class="cnt"><span>전체<b>' + num(pv.rows.length) + '줄</b></span><span>새 줄<b>' + num(pv.diff.added) + '</b></span><span>바뀐 줄<b>' + num(pv.diff.changed) + '</b></span><span>빠진 줄<b>' + num(pv.diff.removed) + '</b></span>' + (pv.diff.balance ? '<span>잔액만 바뀐 줄<b>' + num(pv.diff.balance) + '</b></span>' : '') +
        '<span>계 불일치<b' + (pv.mismatches.length ? ' class="bad"' : '') + '>' + num(pv.mismatches.length) + '</b></span><span>날짜 오류<b' + (pv.dateFails.length ? ' class="bad"' : '') + '>' + num(pv.dateFails.length) + '</b></span></div>' +
        (pv.dateFails.length ? '<p class="note">날짜 오류 엑셀 행 ' + pv.dateFails.slice(0, 20).join(', ') + (pv.dateFails.length > 20 ? ' …' : '') + ' · 저장에서 제외</p>' : '') +
        (pv.mismatches.length ? '<div class="tw"><table><thead><tr><th>엑셀 행</th><th>날짜</th><th>항목</th><th class="n">엑셀 계</th><th class="n">계산 잔액</th></tr></thead><tbody>' + pv.mismatches.slice(0, 30).map(function (m) {
          var r = pv.rows[m.index];
          return '<tr class="bad"><td class="sb">' + m.line + '</td><td>' + esc(r.date.replace(/-/g, '.')) + '</td><td class="wrap">' + esc(r.item) + '</td><td class="n">' + lgAmt(r.balance, show) + '</td><td class="n"><b>' + lgAmt(m.expected, show) + '</b></td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="note">계 불일치 없음</p>') +
        '<div class="acts"><button class="bt p" type="button" data-a="lgsave"' + (pv.rows.length ? '' : ' disabled') + '>저장</button><button class="bt" type="button" data-a="lgcancel">취소</button><span class="note">저장 시 현재 장부를 대체</span></div></div>';
    }
    body += '<div class="lgf"><select data-lgm aria-label="월"><option value="">전체 기간</option>' + months.map(function (m) { return '<option value="' + m + '"' + (lg.month === m ? ' selected' : '') + '>' + m.replace('-', '년 ') + '월</option>'; }).join('') + '</select>' +
      '<input data-lgq type="search" placeholder="항목·비고 검색" aria-label="항목·비고 검색" value="' + esc(lg.q || '') + '"></div>' +
      '<div data-lgt>' + ledgerTable(lg) + '</div>';
    var log = lg.log || [];
    body += '<div class="sub"><div class="op-h"><h4>접근 기록</h4><span class="mt">최근 50건<button class="bt s" type="button" data-a="lglog">새로고침</button></span></div>' +
      (log.length ? '<div class="tw" style="margin-top:16px;max-height:360px;overflow-y:auto"><table><thead><tr><th>시각</th><th>관리자</th><th>동작</th><th class="n">줄 수</th></tr></thead><tbody>' + log.map(function (x) {
        var d = x.detail || {};
        return '<tr><td class="sb">' + esc(lgWhen(x.created_at)) + '</td><td>' + esc(x.admin_email) + '</td><td><span class="tag' + (x.action === 'save' || x.action === 'upload_receipt' ? ' w' : x.action === 'download' ? ' bad' : ' mute') + '">' + esc(LG_ACT[x.action] || x.action) + '</span></td><td class="n sb">' + (d.rows != null ? num(d.rows) : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : stn('empty', '기록 없음')) + '</div>';
    return sec('ledger', '회계장부', meta, body);
  }
  function renderLedger() {
    if (!st) return;
    var old = st.el.querySelector('#op-ledger');
    if (!old) return;
    var tmp = document.createElement('div'); tmp.innerHTML = ledgerSection(st);
    old.parentNode.replaceChild(tmp.firstChild, old);
    wireLedger(st.el);
    showPage();
  }
  function lgMsg(t) { if (st && st.lg) st.lg.msg = t; var b = st && st.el.querySelector('[data-m="lg"]'); if (b) b.textContent = t; }
  function lgApply(r) {
    // 서버 응답(ledger·log)을 화면 상태에 넣는다
    var lg = st.lg;
    if (r.ledger) { lg.rows = (r.ledger.rows || []).filter(function (x) { return x && typeof x.date === 'string'; }); lg.updated_at = r.ledger.updated_at; lg.updated_by = r.ledger.updated_by; lg.source_name = r.ledger.source_name; }
    if (r.log) lg.log = r.log;
  }
  function lgLock(why) {
    if (!st) return;
    if (st.lg && st.lg.showT) clearTimeout(st.lg.showT);
    st.lg = { locked: true, why: why || '' };   // 장부·기록을 메모리에서도 지운다
    renderLedger();
  }
  function lgOpen() {
    if (!st || (st.lg && (st.lg.loading || !st.lg.locked))) return;
    st.lg = { locked: true, loading: true }; renderLedger();
    loadXLSX().catch(function () {});
    call(st.sb, { action: 'ledger_get' }).then(function (r) {
      if (!st) return;
      if (!r || !r.ok) { st.lg = { locked: true, err: LG_ERR[r && r.error] || '불러오기 실패 · member-admin 배포 확인' }; renderLedger(); return; }
      st.lg = { locked: false, rows: [], log: [], show: false, month: '', q: '' };
      lgApply(r); st.lgAct = Date.now(); renderLedger();
    });
  }
  function lgShow(on) {
    var lg = st.lg; if (lg.showT) clearTimeout(lg.showT);
    lg.show = on; lg.showT = on ? setTimeout(function () { if (st && st.lg === lg) { lg.show = false; renderLedger(); } }, LG_SHOW) : null;
    renderLedger();
  }
  function lgReadFile(f) {
    var lg = st.lg;
    if (!/\.xlsx?$/i.test(f.name)) { lgMsg('.xlsx 파일만'); return; }
    lgMsg('엑셀 읽는 중');
    Promise.all([loadXLSX(), f.arrayBuffer()]).then(function (a) {
      var X = a[0], wb = X.read(a[1], { type: 'array', cellDates: true });
      var name = wb.SheetNames.indexOf('회계장부') >= 0 ? '회계장부' : null, res = null;
      (name ? [name] : wb.SheetNames).some(function (n) { var p = parseLedger(X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null, blankrows: true, range: 0 })); if (p.header >= 0) { res = p; return true; } return false; });
      if (!st || st.lg !== lg) return;
      if (!res) { lgMsg('‘날짜’·‘항목’ 머리줄 없음'); return; }
      if (res.rows.length > 2000) { lgMsg('최대 2,000줄'); return; }
      var d = ledgerDiff(lg.rows, res.rows);
      lg.pv = { name: f.name.slice(0, 120), rows: d.rows, diff: d, mismatches: res.mismatches, dateFails: res.dateFails };
      lg.msg = ''; renderLedger();
    }).catch(function () { lgMsg('엑셀 읽기 실패 · 파일·네트워크 확인'); });
  }
  function lgExport() {
    lgMsg('내려받는 중');
    Promise.all([loadXLSX(), call(st.sb, { action: 'ledger_export' })]).then(function (a) {
      var X = a[0], r = a[1];
      if (!st || !st.lg || st.lg.locked) return;
      if (!r || !r.ok) { lgMsg(LG_ERR[r && r.error] || '내려받기 실패'); return; }
      lgApply(r);
      var aoa = [['날짜', '항목', '수입', '지출', '계', '비고']].concat(st.lg.rows.map(function (x) {
        return [x.date.slice(2).replace(/-/g, '.'), x.item, x.income || null, x.expense ? -x.expense : null, x.balance, x.note || null];
      }));
      var ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 10 }, { wch: 32 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 40 }];
      var wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, '회계장부');
      var blob = new Blob([X.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var u = URL.createObjectURL(blob), a2 = document.createElement('a');
      a2.href = u; a2.download = 'RFS_ledger_' + today() + '.xlsx'; document.body.appendChild(a2); a2.click(); a2.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
      st.lg.msg = '내려받기 완료'; renderLedger();
    }).catch(function () { lgMsg('엑셀 라이브러리 불러오기 실패'); });
  }
  function lgReceipt(i, f) {
    var lg = st.lg, row = lg.rows[i];
    if (!row) return;
    if (f.size > LG_FILE) { lgMsg(LG_ERR.size); return; }
    if (['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].indexOf(f.type) < 0) { lgMsg(LG_ERR.type); return; }
    lgMsg('증빙 올리는 중');
    var fr = new FileReader();
    fr.onload = function () {
      call(st.sb, { action: 'receipt_upload', index: i, date: row.date, item: row.item, data: String(fr.result) }).then(function (r) {
        if (!st || st.lg !== lg) return;
        if (!r || !r.ok) { lgMsg(LG_ERR[r && r.error] || '증빙 업로드 실패'); return; }
        lgApply(r); lg.msg = row.date.replace(/-/g, '.') + ' 증빙 첨부됨'; renderLedger();
      });
    };
    fr.onerror = function () { lgMsg('파일 읽기 실패'); };
    fr.readAsDataURL(f);
  }
  function lgViewReceipt(i) {
    var row = st.lg.rows[i];
    if (!row || !row.receipt) return;
    lgMsg('증빙 여는 중');
    call(st.sb, { action: 'receipt_url', path: row.receipt }).then(function (r) {
      if (!st || !st.lg || st.lg.locked) return;
      if (!r || !r.ok || !/^https:\/\//.test(r.url || '')) { lgMsg(LG_ERR[r && r.error] || '증빙 열기 실패'); return; }
      var a = document.createElement('a'); a.href = r.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      document.body.appendChild(a); a.click(); a.remove();
      lgMsg('새 탭에서 열림 · 주소는 60초 뒤 만료');
    });
  }
  function wireLedgerTable(box) {
    box.querySelectorAll('[data-lgv]').forEach(function (b) { b.onclick = function () { lgViewReceipt(+b.getAttribute('data-lgv')); }; });
    box.querySelectorAll('[data-lgu]').forEach(function (b) {
      b.onclick = function () {
        var inp = st.el.querySelector('[data-lgrc]'); if (!inp) return;
        inp.value = ''; inp.onchange = function () { if (inp.files[0]) lgReceipt(+b.getAttribute('data-lgu'), inp.files[0]); };
        inp.click();
      };
    });
  }
  function wireLedger(el) {
    var q = function (sel, fn) { var x = el.querySelector(sel); if (x) x.onclick = fn; };
    q('[data-a="lgopen"]', lgOpen);
    var lg = st.lg;
    if (!lg || lg.locked) return;
    q('[data-a="lgshow"]', function () { lgShow(!lg.show); });
    q('[data-a="lglock"]', function () { lgLock(); });
    q('[data-a="lgdown"]', lgExport);
    q('[data-a="lgcancel"]', function () { lg.pv = null; renderLedger(); });
    q('[data-a="lglog"]', function () { call(st.sb, { action: 'ledger_log_list' }).then(function (r) { if (st && st.lg === lg && r && r.ok) { lgApply(r); renderLedger(); } }); });
    var file = el.querySelector('[data-lgfile]');
    q('[data-a="lgup"]', function () { file.value = ''; file.click(); });
    if (file) file.onchange = function () { if (file.files[0]) lgReadFile(file.files[0]); };
    q('[data-a="lgsave"]', function () {
      var pv = lg.pv; if (!pv) return;
      if (pv.diff.removed && !confirm('현재 장부에서 ' + pv.diff.removed + '줄이 빠집니다. 저장할까요?')) return;
      lgMsg('저장 중');
      var rows = pv.rows.map(function (r) { return { date: r.date, item: r.item, income: r.income, expense: r.expense, balance: r.balance, note: r.note, receipt: r.receipt || null }; });
      call(st.sb, { action: 'ledger_save', rows: rows, base: lg.updated_at || null, source_name: pv.name }).then(function (r) {
        if (!st || st.lg !== lg) return;
        if (!r || !r.ok) { lgMsg(LG_ERR[r && r.error] || '저장 실패 · 다시 시도'); return; }
        lgApply(r); lg.pv = null; lg.msg = num(lg.rows.length) + '줄 저장됨'; renderLedger();
      });
    });
    var box = el.querySelector('[data-lgt]');
    var refilter = function () { box.innerHTML = ledgerTable(lg); wireLedgerTable(box); };
    var m = el.querySelector('[data-lgm]'), s = el.querySelector('[data-lgq]');
    if (m) m.onchange = function () { lg.month = m.value; refilter(); };
    if (s) s.oninput = function () { lg.q = s.value; refilter(); };
    if (box) wireLedgerTable(box);
  }

  // ---- 메뉴와 페이지
  // 아이콘: 24칸 선 그림 (글꼴 기호는 기기마다 달라 보여서 SVG로)
  var SVG = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var ICON = {
    home: SVG('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>'),
    won: SVG('<path d="M4 6l3 12 5-10 5 10 3-12"/><path d="M3 11h18M3 14h18"/>'),
    book: SVG('<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11"/>'),
    card: SVG('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>'),
    user: SVG('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    id: SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17c.8-1.8 2-2.5 3.5-2.5s2.7.7 3.5 2.5M15 10h4M15 14h3"/>'),
    cert: SVG('<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h5"/>'),
    sms: SVG('<path d="M4 5h16v11H9l-5 4z"/>'),
    chart: SVG('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    bolt: SVG('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    mail: SVG('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
    bell: SVG('<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>'),
  };
  var NAV = [
    ['', [['home', '홈', 'home']]],
    ['돈', [['acc', '계좌', 'won'], ['ledger', '회계장부', 'book'], ['cost', '유지비 · 계정', 'card']]],
    ['회원', [['approve', '가입 승인', 'user'], ['notify', '모집 알림', 'bell'], ['card', '학회원증', 'id'], ['cert', '수료증', 'cert'], ['sms', '문자 기록', 'sms']]],
    ['사이트', [['visit', '방문자', 'chart'], ['auto', '자동 작업', 'bolt'], ['mail', '알림 메일', 'mail']]],
  ];
  var TITLE = { home: '', notify: '모집 알림', acc: '계좌', ledger: '회계장부', cost: '유지비 · 계정', card: '학회원증', cert: '수료증', sms: '문자 기록', visit: '방문자', auto: '자동 작업', mail: '알림 메일' };
  function markNav() {
    st.el.querySelectorAll('[data-nv]').forEach(function (b) { var on = b.getAttribute('data-nv') === st.page; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    var bd = st.el.querySelector('[data-badge]'); if (bd) { bd.hidden = !st.pending; bd.textContent = st.pending || ''; }
  }
  // 지금 페이지의 칸만 보이고, 위 제목에는 그 칸의 설명(.mt)을 옮겨 쓴다
  function showPage() {
    if (!st) return;
    var el = st.el, pg = st.page, sec0 = null;
    el.querySelectorAll('.op-body>.op-s').forEach(function (x) { var on = x.id === 'op-' + pg; x.hidden = !on; if (on) sec0 = x; });
    var ph = el.querySelector('.op-ph');
    ph.hidden = pg === 'home' || !sec0;
    if (!ph.hidden) { ph.querySelector('h1').textContent = TITLE[pg]; var mt = sec0.querySelector('.op-h .mt'); ph.querySelector('p').textContent = mt ? mt.textContent : ''; }
    markNav();
  }
  function go(pg) {
    if (!st || !TITLE.hasOwnProperty(pg)) return;
    st.page = pg;
    try { sessionStorage.setItem('rfs_ops_page', pg); } catch (e) {}
    showPage();
    st.el.scrollTo({ top: 0 });
    if (pg === 'ledger') lgOpen();   // 회계장부를 누르면 연다 (서버에서 받고 SheetJS도 이때 불러온다)
  }
  function openApprove() {
    if (window.RFSJoin) window.RFSJoin.admin({ sb: st.sb, onChange: function (n) { st.pending = n; if (st.onPending) st.onPending(n); render(); } });
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
    var ga = s.ga, gaOk = ga && ga.configured && !ga.error && ga.days;
    var diff = last && prev ? last.balance - prev.balance : null;

    // ① 홈: 할 일 + 잔액·방문자 카드 + 작은 숫자들 (토스처럼 지금 처리할 것부터)
    var dueOf = function (c) {   // 매월·매년은 날짜가 지났으면 같은 날짜로 다음 달·내년 (ops-reminder 함수와 같은 계산)
      if (!c.next || !/^\d{4}-\d{2}-\d{2}$/.test(c.next)) return null;
      var step = c.cycle === 'month' ? 1 : c.cycle === 'year' ? 12 : 0, nx = c.next, p = c.next.split('-').map(Number);
      var dd = function (x) { return Math.round((Date.parse(x) - Date.parse(today())) / 864e5); };
      for (var k = 1; step && dd(nx) < 0 && k < 600; k++) {
        var t = new Date(Date.UTC(p[0], p[1] - 1 + step * k, 1)), lastD = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
        nx = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(p[2], lastD))).toISOString().slice(0, 10);
      }
      return { date: nx, days: dd(nx) };
    };
    var md = function (d) { return +d.slice(5, 7) + '월 ' + +d.slice(8, 10) + '일'; };
    var nrows = ((s.state.recruit_notify && s.state.recruit_notify.value && s.state.recruit_notify.value.rows) || []).slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    var pp = function (p) { p = String(p || ''); return p.length === 11 ? p.slice(0, 3) + '-' + p.slice(3, 7) + '-' + p.slice(7) : p.slice(0, 3) + '-' + p.slice(3, 6) + '-' + p.slice(6); };
    var todos = [];
    if (s.pending) todos.push({ ic: 'user', bg: '#FFEEEF', fg: '#F04452', t: '가입 신청 ' + s.pending + '건이 기다려요', sub: '승인하면 신청자에게 안내 문자가 가요', btn: '승인하기', a: 'approve', p: true });
    costs.forEach(function (c) {
      var d = dueOf(c); if (!d) return;
      var win = c.cycle === 'month' ? 14 : 45;
      if (d.days < 0) todos.push({ ic: 'card', bg: '#FFF4E5', fg: '#E07B00', t: c.name + ' 날짜가 ' + (-d.days) + '일 지났어요', sub: '끝났으면 유지비 표에서 지우거나 날짜를 고쳐 주세요', btn: '유지비', go: 'cost' });
      else if (d.days <= win) todos.push({ ic: 'card', bg: '#FFF4E5', fg: '#E07B00', t: c.name.replace(/\s*\(.*\)$/, '') + (d.days === 0 ? ' 결제일이 오늘이에요' : ' 결제가 ' + d.days + '일 남았어요'), sub: md(d.date) + (c.auto ? '' : ' · ' + (c.cur === 'USD' ? '$' + (+c.amount || 0) : num(c.amount) + '원')), btn: '보기', go: 'cost' });
    });
    var accAge = last ? Math.round((Date.parse(today()) - Date.parse(last.date)) / 864e5) : null;
    if (accAge == null || accAge > 35) todos.push({ ic: 'won', bg: '#E8F3FF', fg: '#3182F6', t: accAge == null ? '계좌 잔액을 아직 기록하지 않았어요' : '계좌 잔액을 기록한 지 ' + accAge + '일 됐어요', sub: '한 달에 한 번, 큰 입출금이 있을 때 적어 두면 돼요', btn: '기록하기', go: 'acc' });
    if (!set.notify_email) todos.push({ ic: 'mail', bg: '#F2F4F6', fg: '#4E5968', t: '알림 받을 이메일이 없어요', sub: '가입 신청·결제 알림을 받으려면 넣어 주세요', btn: '넣기', go: 'mail' });
    var gd0 = gaOk ? ga.days || [] : [], sp = gd0.slice(-14), spMax = Math.max.apply(null, sp.map(function (x) { return x.users; }).concat([1]));
    var u7 = gd0.slice(-7).reduce(function (a, x) { return a + x.users; }, 0), u7p = gd0.slice(-14, -7).reduce(function (a, x) { return a + x.users; }, 0);
    var cardsN = s.cards ? s.cards.filter(function (c) { return cardState(c)[0] === 'ok'; }).length : null, cardsOff = s.cards ? s.cards.filter(function (c) { return c.revoked; }).length : 0;
    var sms30 = (s.sms || []).filter(function (x) { return Date.now() - Date.parse(x.created_at) < 30 * 864e5; }).length;
    var homeHtml = '<section class="op-s op-home" id="op-home" style="background:none;padding:0">' +
      '<h2 class="op-hi">' + (todos.length ? '확인할 게 ' + todos.length + '개 있어요' : '지금 처리할 일은 없어요') + '</h2><p>' + esc(md(today())) + ' · ' + esc(st.upAt || '') + '</p>' +
      '<div class="op-g2"><div class="op-c lnk" data-go="acc"><h3>법인계좌</h3><div class="big">' + (last ? num(last.balance) + '<small>원</small>' : '—') + '</div>' +
        '<div class="cap">' + (last ? md(last.date) + '에 기록했어요' + (diff == null ? '' : ' · 직전보다 <span class="' + (diff >= 0 ? 'up' : 'dn') + '">' + (diff >= 0 ? '+' : '−') + num(Math.abs(diff)) + '원</span>') : '잔액 기록이 없어요') + '</div>' +
        '<div class="op-pill"><span>이번 달 유지비<b>' + won(month) + '</b></span><span>버틸 수 있는 기간<b class="' + (runway != null && runway < 6 ? (runway < 3 ? 'bad' : 'w') : '') + '">' + (runway == null ? '—' : runway >= 120 ? '10년 이상' : Math.floor(runway) + '개월') + '</b></span></div></div>' +
      '<div class="op-c lnk" data-go="visit"><h3>최근 30일 방문자</h3><div class="big">' + (gaOk ? num(ga.users30) + '<small>명</small>' : '—') + '</div>' +
        '<div class="cap">' + (gaOk ? (u7p ? '이번 주 ' + num(u7) + '명 · 지난주보다 ' + (u7 >= u7p ? '<span class="up">' + Math.round((u7 / u7p - 1) * 100) + '% 늘었어요</span>' : '<span class="dn">' + Math.round((1 - u7 / u7p) * 100) + '% 줄었어요</span>') : '이번 주 ' + num(u7) + '명') : !ga ? '불러오는 중' : 'GA 연결이 필요해요') + '</div>' +
        (sp.length ? '<div class="op-spark">' + sp.map(function (x, k) { return '<i class="' + (k >= sp.length - 7 ? 'on' : '') + '" style="height:' + Math.max(6, x.users / spMax * 100) + '%" title="' + esc(x.date + ' · ' + x.users + '명') + '"></i>'; }).join('') + '</div>' : '') + '</div></div>' +
      '<div class="op-c"><h3>할 일</h3><div class="op-todo">' + (todos.length ? todos.map(function (x) {
        return '<div class="it"><span class="ic" style="background:' + x.bg + ';color:' + x.fg + '">' + ICON[x.ic] + '</span><div class="t"><b>' + esc(x.t) + '</b><small>' + esc(x.sub) + '</small></div>' +
          '<button class="bt ' + (x.p ? 'p' : 'lt') + '" type="button"' + (x.a ? ' data-a="' + x.a + '"' : ' data-go="' + x.go + '"') + '>' + x.btn + '</button></div>';
      }).join('') : '<div class="none">다 처리했어요. 새로 생기면 여기에 떠요.</div>') + '</div></div>' +
      '<div class="op-g3"><div class="op-c mini lnk" data-go="card"><h3>학회원증</h3><div class="big">' + (cardsN == null ? '—' : cardsN + '<small>장</small>') + '</div><div class="cap">' + (cardsOff ? '정지 ' + cardsOff + '장' : '지금 쓸 수 있는 카드') + '</div></div>' +
      '<div class="op-c mini lnk" data-go="notify"><h3>모집 알림 신청</h3><div class="big">' + num(nrows.length) + '<small>명</small></div><div class="cap">모집이 열리면 문자로 알려요</div></div>' +
      '<div class="op-c mini lnk" data-go="sms"><h3>최근 30일 문자</h3><div class="big">' + num(sms30) + '<small>건</small></div><div class="cap">AGORA 선배님 연락처</div></div>' +
      '<div class="op-c mini lnk" data-go="cost"><h3>이번 달 Polaris 질문</h3><div class="big">' + (s.voyage ? num(s.voyage.q) + '<small>개</small>' : '—') + '</div><div class="cap">' + (s.voyage ? 'Voyage ' + usd(s.voyage.usd) : '서버 사용량') + '</div></div></div>' +
      '</section>';

    // ② 방문자
    var gaBody;
    if (!ga) gaBody = LOADING;
    else if (!ga.configured) gaBody = stn('empty', '미연결 · Secret GA_PROPERTY_ID, GA_SA_KEY');
    else if (ga.error) gaBody = stn('err', '불러오기 실패 (' + esc(ga.error) + ') · 서비스 계정의 GA 뷰어 권한 확인');
    else {
      var gd = ga.days || [], sum = function (n) { return gd.slice(-n).reduce(function (a, x) { return a + x.users; }, 0); };
      var tdy = gd.length ? gd[gd.length - 1] : { users: 0, views: 0 };
      var list = function (rows, k, v) { return '<div class="tw"><table><tbody>' + rows.map(function (x, i) { return '<tr><td class="sb" style="width:32px">' + (i + 1) + '</td><td class="wrap">' + esc(x[k]) + '</td><td class="n">' + num(x[v]) + '</td></tr>'; }).join('') + '</tbody></table></div>'; };
      gaBody = '<div class="op-hl">오늘 ' + num(tdy.users) + '<small>명</small><span class="dot">·</span>7일 ' + num(sum(7)) + '<small>명</small><span class="dot">·</span>30일 ' + num(ga.users30) + '<small>명</small></div>' +
        (gd.length > 1 ? bars(gd.map(function (x) { return { k: x.date, u: x.users }; }), 'u', function (n) { return Math.round(n) + '명'; }) : '') +
        '<div class="two"><div><h4>많이 본 페이지</h4>' + list(ga.pages || [], 'title', 'views') + '</div><div><h4>들어온 경로</h4>' + list(ga.sources || [], 'source', 'sessions') + '</div></div>';
    }
    var visit = sec('visit', '방문자', 'Google Analytics · 최근 30일' + (gaOk ? ' · 페이지뷰 ' + num(ga.views30) : ''), gaBody);

    // ③ 계좌
    var accBody = '<form class="frm" data-f="acc"><input id="op-bal" inputmode="numeric" placeholder="잔액 (원)" aria-label="잔액 (원)"><input id="op-date" type="date" value="' + today() + '" aria-label="기준일"><input id="op-memo" placeholder="메모" aria-label="메모" maxlength="60"><button class="bt p" type="submit">기록</button></form>' +
      (acc.length ? '<div class="tw"><table><thead><tr><th>기준일</th><th class="n">잔액</th><th class="n">변동</th><th>메모</th><th></th></tr></thead><tbody>' + acc.slice(0, 12).map(function (e, i) {
        var d = acc[i + 1] ? e.balance - acc[i + 1].balance : null;
        return '<tr><td>' + esc(e.date.replace(/-/g, '.')) + '</td><td class="n"><b>' + won(e.balance) + '</b></td><td class="n ' + (d == null ? 'nil' : d >= 0 ? 'up' : 'dn') + '">' + (d == null ? '—' : (d >= 0 ? '+' : '−') + num(Math.abs(d))) + '</td><td class="sb">' + esc(e.memo || '') + '</td><td class="n"><button class="bt s" type="button" data-del="' + i + '" aria-label="이 기록 지우기">지우기</button></td></tr>';
      }).join('') + '</tbody></table></div>' : stn('empty', '기록 없음 · 월 1회, 큰 입출금 때 기록')) +
      '<div class="msg" data-m="acc"></div>';
    var account = sec('acc', '계좌', '수기 입력 · 최근 12건', accBody);

    // ④ 유지비 · 계정
    var soon = function (d) { if (!d) return ''; var n = Math.round((Date.parse(d) - Date.parse(today())) / 864e5); return n < 0 ? ' <span class="tag bad">지남</span>' : n <= 30 ? ' <span class="tag w">' + n + '일 남음</span>' : ''; };
    var movedN = costs.filter(function (c) { return c.moved === 'club'; }).length;
    var v = s.voyage;
    var costBody = '<div class="op-hl">월 ' + num(month) + '<small>원</small><span class="dot">·</span>연 ' + num(month * 12) + '<small>원</small></div>' +
      (!s.editCosts ? '<div class="tw"><table><thead><tr><th>서비스</th><th class="n">금액</th><th>다음 결제·갱신</th><th class="n">월 환산</th><th>관리 계정</th></tr></thead><tbody>' + costs.map(function (c) {
          var amt = c.auto ? '<span class="tag">자동</span>' : (c.cur === 'USD' ? '$' + (+c.amount || 0) : num(c.amount) + '원') + ' <span class="sb">' + ({ month: '/ 월', year: '/ 년', once: '한 번' }[c.cycle] || '') + '</span>';
          var mv = c.moved === 'club' ? '<span class="tag ok">학회 계정</span>' : c.moved === 'personal' ? '<span class="tag w">개인 계정</span>' : '<span class="tag mute">모름</span>';
          return '<tr><td class="wrap"><b>' + esc(c.name) + '</b>' + (c.note ? '<div class="sb" style="margin-top:2px">' + esc(c.note) + '</div>' : '') + '</td><td class="n">' + amt + '</td><td>' + (c.next ? esc(c.next.replace(/-/g, '.')) + soon(c.next) : '<span class="sb">—</span>') + '</td><td class="n"><b>' + won(monthlyKRW(c, rate)) + '</b></td><td>' + mv + (c.owner ? ' <span class="sb">' + esc(c.owner) + '</span>' : '') + '</td></tr>';
        }).join('') + '</tbody><tfoot><tr><td colspan="3">합계</td><td class="n">' + won(month) + '</td><td></td></tr></tfoot></table></div><div class="acts"><button class="bt" type="button" data-a="editcosts">편집</button><span class="sb">환율 ' + num(rate) + '원/달러</span></div><div class="msg" data-m="costs"></div>'
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
      '<div class="sub"><div class="op-h"><h4>Voyage · Polaris</h4><span class="mt">서버 집계 토큰 × 단가 · 무료 한도 내 청구 0원</span></div>' +
      (s.usageErr ? stn('err', '사용량 불러오기 실패 (' + esc(s.usageErr) + ') · 서버 버전과 OPS_ADMINS 확인')
        : !v ? LOADING
        : '<div class="op-hl">이번 달 ' + usd(v.usd) + '<span class="dot">·</span>지난달 ' + (v.last.n ? usd(v.last.usd) : '—') + '<span class="dot">·</span>질문 ' + num(v.q) + '<small>개</small></div>' +
          '<div class="kpi"><div><span>임베딩 (이번 달)</span><b>' + num(v.tok['voyage-3.5'] / 1e3) + 'K</b><em>voyage-3.5 토큰</em></div><div><span>리랭크 (이번 달)</span><b>' + (v.tok['rerank-2.5'] / 1e6).toFixed(2) + 'M</b><em>rerank-2.5 토큰</em></div><div><span>최근 7일 질문</span><b>' + num(v.series.slice(-7).reduce(function (a, x) { return a + x.q; }, 0)) + '</b><em>' + v.series.slice(-7).map(function (x) { return x.q; }).join(' · ') + '</em></div></div>' +
          bars(v.series, 'usd', usd) + (v.last.n ? '' : '<p class="note" style="margin-top:12px">지난달: 집계 시작 이후만 · 이전은 dashboard.voyageai.com Usage</p>')) + '</div>';
    var cost = sec('cost', '유지비 · 계정', '학회 계정 이전 ' + movedN + '/' + costs.length + ' · 연 단위는 월 환산', costBody);

    // ⑤ 문자 기록
    var smsBody = s.sms && s.sms.length ? '<div class="op-hl">' + num(s.sms.length) + '<small>건</small><span class="dot">·</span>최근 ' + esc(new Date(s.sms[0].created_at).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' })) + '</div><div class="tw" style="max-height:420px;overflow-y:auto"><table><thead><tr><th>시각</th><th>받은 사람</th><th>선배님</th><th class="n">결과</th></tr></thead><tbody>' + s.sms.map(function (x) {
      var who = x.who ? '<b>' + esc(x.who) + '</b> <span class="sb">' + esc(x.id) + '</span>' : esc(x.id === 'member' ? '공용 계정' : x.id) + (x.phone4 ? ' <span class="sb">…' + esc(x.phone4) + '</span>' : '');
      return '<tr><td class="sb">' + esc(new Date(x.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })) + '</td><td>' + who + '</td><td>' + esc(x.alumni_cohort + '기 ' + x.alumni_name) + '</td><td class="n">' + (x.status === 'sent' ? '<span class="tag ok">발송</span>' : '<span class="tag bad">실패</span>') + '</td></tr>';
    }).join('') + '</tbody></table></div>' : stn('empty', '기록 없음');
    var sms = sec('sms', '문자 기록', 'AGORA 선배님 연락처 · 최근 50건', smsBody);

    // ⑥ 알림 메일
    var nt = set.notify || {};
    var mail = sec('mail', '알림 메일', s.mail ? '발송 켜짐' : '꺼짐 · RESEND_API_KEY 필요',
      '<form data-f="set" class="mailbox" style="margin-top:32px"><input id="op-mail" type="email" placeholder="알림 받을 이메일" aria-label="알림 받을 이메일" value="' + esc(set.notify_email || '') + '">' +
      '<div style="margin-top:16px"><label class="chk"><input type="checkbox" id="op-n1"' + (nt.agora_sms === false ? '' : ' checked') + '>AGORA 선배님 연락처 문자 발송</label>' +
      '<label class="chk"><input type="checkbox" id="op-n2"' + (nt.signup === false ? '' : ' checked') + '>회원가입 신청</label>' +
      '<label class="chk"><input type="checkbox" id="op-n3"' + (nt.approval === false ? '' : ' checked') + '>가입 승인 (안내 문자 결과 포함)</label>' +
      '<label class="chk"><input type="checkbox" id="op-n4"' + (nt.due === false ? '' : ' checked') + '>결제·만료 알림 (매주 월요일, 유지비 표의 다음 결제일 기준)</label></div>' +
      '<div class="acts"><button class="bt p" type="submit">저장</button></div></form><div class="msg" data-m="set"></div>');

    // 모집 알림: 리크루팅 페이지에서 넣은 번호 (recruit-notify 함수 → ops_state.recruit_notify). 안내 문자를 보낸 뒤, 늦어도 모집이 끝나면 지운다 (/privacy/)
    var notifyPg = sec('notify', '모집 알림', nrows.length ? nrows.length + '명 · 모집이 열리면 문자 보내고 지워요' : '리크루팅 페이지 맨 아래에서 번호를 받아요',
      (nrows.length ? '<div class="op-hl">' + num(nrows.length) + '<small>명</small></div><div class="tw" style="max-height:480px;overflow-y:auto"><table><thead><tr><th>번호</th><th>모집</th><th class="n">신청</th></tr></thead><tbody>' + nrows.map(function (r) {
        return '<tr><td><b>' + esc(pp(r.phone)) + '</b></td><td class="sb">' + esc(r.sem || '') + '</td><td class="n sb">' + esc(new Date(r.at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })) + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="acts"><button class="bt p" type="button" data-a="ncopy">번호 전부 복사</button><span class="sp"></span><button class="bt" type="button" data-a="nclear">모두 지우기</button></div>'
      : stn('empty', '아직 신청한 사람이 없어요. 새로 들어오면 관리자 번호로 문자가 가요.')) + '<div class="msg" data-m="notify"></div>');
    var cert = sec('cert', '수료증', 'A4 · PNG·PDF', '<p class="note">이름·기수·학기별 소속을 넣으면 학회 수료증 양식으로 바로 만들어요. 회장·부회장 서명과 인감은 그 화면의 \u2018서명·인감 설정\u2019에서 바꿔요.</p><div class="acts" style="margin-top:24px"><button class="bt p" type="button" data-a="cert">수료증 만들기</button><span class="msg" data-m="cert"></span></div>');
    // ⑪ 자동 작업 (GitHub Actions): 리포트 PDF 올리기·학기 넘기기는 GitHub 화면에서 한다 (학회 GitHub 계정 로그인 필요)
    var GH = 'https://github.com/rfs-2006/homepage';
    var autoRow = function (title, steps, href, btn) {
      return '<div class="au-r"><div class="au-t"><b>' + title + '</b><ol>' + steps.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol></div>' +
        '<a class="bt p au-b" href="' + GH + href + '" target="_blank" rel="noopener">' + btn + ' \u2197</a></div>';
    };
    var auto = sec('auto', '자동 작업', 'GitHub에서 해요',
      '<p class="note">버튼을 누르면 GitHub가 새 탭으로 열려요. 학회 GitHub 계정으로 로그인돼 있어야 해요.</p>' +
      autoRow('리포트 올리기', ['리포트 PDF를 화면에 끌어다 놓기 (파일 이름을 영문으로, 예: gigavis.pdf → 주소 /research/gigavis/)', '아래 초록 버튼 <b>Commit changes</b>', '5분쯤 뒤 \u2018열린 PR\u2019에 새 PR이 생겨요. 미리보기에서 확인하고 <b>Merge</b>'], '/upload/main/inbox', 'PDF 올리기') +
      autoRow('학기 넘기기', ['열린 화면 오른쪽 <b>Run workflow</b> 누르기', '새 학기(예: 27-1)·알럼나이 수·임원 이름 쓰고 초록 <b>Run workflow</b>', '1분쯤 뒤 생긴 PR에 임원 사진 올리고 <b>Merge</b>'], '/actions/workflows/new-term.yml', '학기 넘기기') +
      autoRow('열린 PR', ['자동으로 만든 변경이 여기 쌓여요', '눌러서 미리보기 주소로 확인하고 <b>Merge pull request</b>'], '/pulls', 'PR 보기') +
      autoRow('자동 작업 기록', ['주가 갱신·RFM·용어 풀이·함수 배포·알림 메일이 잘 돌았는지', '초록 체크면 성공, 빨간 X면 실패 (실패하면 눌러서 이유 보기)'], '/actions', '기록 보기'));
    el.innerHTML = homeHtml + visit + account + ledgerSection(s) + cost + notifyPg + sms + cardSection(s) + cert + auto + mail;
    wire();
    showPage();
  }

  function save(key, value, m, done) {
    var box = st.el.querySelector('[data-m="' + m + '"]');
    if (box) box.textContent = '저장 중';
    call(st.sb, { action: 'ops_save', key: key, value: value }).then(function (r) {
      if (r && r.ok) { st.state[key] = { value: value }; if (done) done(); render(); var b2 = st.el.querySelector('[data-m="' + m + '"]'); if (b2) b2.textContent = '저장됨'; }
      else if (box) box.textContent = r && r.error === 'save' ? '저장 실패 · ops_state 테이블 확인' : '저장 실패 · 다시 시도';
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
    el.querySelector('[data-a="cert"]').onclick = function () {
      var m = el.querySelector('[data-m="cert"]'), go = function () { window.RFSCert.open({ sb: st.sb }); };
      if (window.RFSCert) return go();
      m.textContent = '불러오는 중';
      var sc = document.createElement('script'); sc.src = '/assets/cert.js?v=3';
      sc.onload = function () { m.textContent = ''; if (window.RFSCert && st) go(); }; sc.onerror = function () { m.textContent = '불러오지 못했어요'; };
      document.head.appendChild(sc);
    };
    el.querySelectorAll('.op-body [data-a="approve"]').forEach(function (b) { b.onclick = openApprove; });
    el.querySelectorAll('.op-body [data-go]').forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-go')); }; });
    el.querySelector('[data-f="acc"]').onsubmit = function (e) {
      e.preventDefault();
      var bal = +el.querySelector('#op-bal').value.replace(/[^\d-]/g, ''), date = el.querySelector('#op-date').value || today(), memo = el.querySelector('#op-memo').value.trim().slice(0, 60);
      if (!isFinite(bal) || !el.querySelector('#op-bal').value.trim()) { el.querySelector('[data-m="acc"]').textContent = '잔액: 숫자만'; return; }
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
      if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { el.querySelector('[data-m="set"]').textContent = '이메일 형식 확인'; return; }
      var set = Object.assign({}, (st.state.settings && st.state.settings.value) || {}, { notify_email: mail, notify: { agora_sms: el.querySelector('#op-n1').checked, signup: el.querySelector('#op-n2').checked, approval: el.querySelector('#op-n3').checked, due: el.querySelector('#op-n4').checked } });
      save('settings', set, 'set');
    };
    q('[data-a="ncopy"]', function () {
      var list = ((st.state.recruit_notify && st.state.recruit_notify.value && st.state.recruit_notify.value.rows) || []).map(function (r) { return r.phone; }).join('\n');
      var m = el.querySelector('[data-m="notify"]'), done = function () { m.textContent = '복사했어요. 문자 보낼 때 받는 사람 칸에 붙여 넣으면 돼요'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(list).then(done, function () { prompt('번호', list); }); else prompt('번호', list);
    });
    q('[data-a="nclear"]', function () { if (confirm('모집 알림 번호를 모두 지울까요? 안내 문자를 다 보낸 뒤에 지우세요.')) save('recruit_notify', { rows: [] }, 'notify'); });
    wireCards(el);
    wireLedger(el);
  }
  function wireCards(el) {
    var msg = function (m, t) { var b = el.querySelector('[data-m="' + m + '"]'); if (b) b.textContent = t; };
    var cards = st.cards || [];
    el.querySelector('[data-f="card"]').onsubmit = function (e) {
      e.preventDefault();
      var c = {};
      el.querySelectorAll('[data-c]').forEach(function (x) { c[x.getAttribute('data-c')] = x.value.trim(); });
      if (!c.no || !c.name) { msg('card', '카드 번호·이름 필요'); return; }
      if (!st.editCardOld && cards.some(function (x) { return x.no === c.no.toUpperCase(); }) && !confirm(c.no + ' 카드가 이미 있습니다. 덮어쓸까요?')) return;
      msg('card', '저장 중');
      call(st.sb, { action: 'card_save', card: c }).then(function (r) {
        if (!r || !r.ok) { st.editCard = c; msg('card', CARD_ERR[r && r.error] || '저장 실패 · 다시 시도'); return; }
        var i = cards.findIndex(function (x) { return x.no === r.card.no; });
        if (i >= 0) cards[i] = r.card; else { cards.push(r.card); cards.sort(function (a, b) { return a.no < b.no ? -1 : 1; }); }
        st.cards = cards; st.editCard = null; st.editCardOld = null; st.qr = cards.indexOf(r.card); render();
        msg('card', r.card.no + ' 저장됨');
      });
    };
    var nw = el.querySelector('[data-a="cardnew"]');
    if (nw) nw.onclick = function () { st.editCard = null; st.editCardOld = null; render(); };
    el.querySelectorAll('[data-ce]').forEach(function (b) {
      b.onclick = function () { var c = cards[+b.getAttribute('data-ce')]; st.editCard = Object.assign({}, c); st.editCardOld = c.no; render(); var f = el.querySelector('[data-f="card"]'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
    });
    el.querySelectorAll('[data-cr]').forEach(function (b) {
      b.onclick = function () {
        var c = cards[+b.getAttribute('data-cr')], on = !c.revoked;
        if (on && !confirm(c.no + ' ' + c.name + ' 카드를 정지할까요? QR이 ‘정지된 카드’로 표시됩니다.')) return;
        b.disabled = true;
        call(st.sb, { action: 'card_revoke', no: c.no, revoked: on }).then(function (r) {
          if (r && r.ok) { cards[cards.indexOf(c)] = r.card; render(); } else { b.disabled = false; alert('변경 실패 · 다시 시도'); }
        });
      };
    });
    el.querySelectorAll('[data-cq]').forEach(function (b) { b.onclick = function () { st.qr = +b.getAttribute('data-cq'); render(); var x = el.querySelector('.qrbox'); if (x) x.scrollIntoView({ behavior: 'smooth', block: 'center' }); }; });
    var cv = el.querySelector('[data-qr]'), qc = st.qr != null && cards[st.qr];
    if (!cv || !qc || !qc.token) return;
    var url = CARD_URL + qc.token;
    drawQR(cv, url).catch(function () { msg('qr', 'QR 라이브러리 불러오기 실패'); });
    el.querySelector('[data-a="qrclose"]').onclick = function () { st.qr = null; render(); };
    el.querySelector('[data-a="qrpng"]').onclick = function () {
      var a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = qc.no + '-qr.png'; document.body.appendChild(a); a.click(); a.remove();
    };
    el.querySelector('[data-a="qrcopy"]').onclick = function () {
      var done = function () { msg('qr', '주소 복사됨'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { prompt('주소', url); });
      else prompt('주소', url);
    };
  }

  function load() {
    var sb = st.sb;
    st.el.querySelector('.op-up').textContent = '불러오는 중';
    Promise.all([
      call(sb, { action: 'ops_get' }),
      call(sb, { action: 'list' }),
      polarisUsage(sb),
    ]).then(function (r) {
      call(sb, { action: 'ga' }).then(function (x) { if (!st) return; st.ga = x && x.ok ? x.ga : { configured: true, error: (x && x.error) || 'fail' }; render(); });
      if (!st) return;
      var g = r[0];
      if (!g || !g.ok) { st.el.querySelector('.op-ph').hidden = true; st.el.querySelector('.op-body').innerHTML = '<section class="op-s">' + stn('err', '불러오기 실패 · ' + (g && g.error === 'admin' ? '관리자 계정 아님' : 'member-admin 배포 확인')) + '</section>'; return; }
      st.state = g.state || {}; st.sms = g.sms; st.mail = g.mail;
      loadCards();
      st.pending = r[1] && r[1].ok ? (r[1].list || []).length : null;
      if (st.onPending && st.pending != null) st.onPending(st.pending);
      var u = r[2];
      st.voyage = u && u.ok ? voyageMonth(u.days) : null;
      st.usageErr = !u ? '로그인 정보 없음' : u.ok ? '' : u.error === 403 ? '권한 없음' : '연결 실패';
      st.upAt = new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }) + ' 기준';
      st.el.querySelector('.op-up').textContent = st.upAt;
      render();
      if (st.page === 'ledger') lgOpen();
    });
  }

  function open(o) {
    if (!document.getElementById('op-css')) { var c = document.createElement('style'); c.id = 'op-css'; c.textContent = CSS; document.head.appendChild(c); }
    close();
    var el = document.createElement('div');
    el.className = 'op'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '운영 대시보드');
    var me = '';
    el.innerHTML = '<div class="op-app"><aside class="op-nav" aria-label="운영 메뉴"><div class="op-brand"><b>R.F.S.<span>운영</span></b><button class="x" type="button" aria-label="닫기">×</button></div><div class="op-grps">' +
      NAV.map(function (g) {
        var items = g[1].map(function (n) { return '<button class="op-nv" type="button" data-nv="' + n[0] + '"><i>' + ICON[n[2]] + '</i>' + n[1] + (n[0] === 'approve' ? '<em hidden data-badge></em>' : '') + '</button>'; }).join('');
        return g[0] ? '<div class="op-grp"><h6>' + g[0] + '</h6>' + items + '</div>' : '<div class="op-grp">' + items + '</div>';
      }).join('') + '</div><div class="op-foot"><span class="op-up">' + me + '</span><button type="button" data-a="reload">새로고침</button></div></aside>' +
      '<main class="op-main"><header class="op-ph" hidden><h1></h1><p></p></header><div class="op-body"><section class="op-s">' + LOADING + '</section></div></main></div>';
    document.body.appendChild(el);
    var page0 = 'home'; try { page0 = sessionStorage.getItem('rfs_ops_page') || 'home'; } catch (e) {}
    st = { el: el, sb: o.sb, onPending: o.onPending, state: {}, page: TITLE[page0] ? page0 : 'home' };
    el.querySelector('.x').onclick = close;
    el.querySelector('[data-a="reload"]').onclick = load;
    // 왼쪽 메뉴: 누르면 오른쪽 화면이 그 페이지로 바뀐다. 가입 승인은 승인 창을 연다
    el.querySelectorAll('[data-nv]').forEach(function (b) {
      b.onclick = function () { var id = b.getAttribute('data-nv'); if (id === 'approve') openApprove(); else go(id); };
    });
    markNav();
    // 회계장부: 10분 동안 손대지 않으면 잠근다
    st.lgAct = Date.now();
    st.act = function () { if (st) st.lgAct = Date.now(); };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) { el.addEventListener(t, st.act, { passive: true }); });
    st.idle = setInterval(function () { if (st && st.lg && !st.lg.locked && Date.now() - st.lgAct > LG_IDLE) lgLock('10분 동안 사용 없음 · 자동 잠금'); }, 15e3);
    st.key = function (e) { if (e.key === 'Escape' && !document.querySelector('.jn')) close(); };
    document.addEventListener('keydown', st.key);
    requestAnimationFrame(function () { el.classList.add('show'); });
    load();
  }
  function close() {
    if (!st) return;
    document.removeEventListener('keydown', st.key);
    clearInterval(st.idle); if (st.lg && st.lg.showT) clearTimeout(st.lg.showT);
    var el = st.el; st = null; el.classList.remove('show'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  }
  window.RFSOps = { open: open, close: close, parseLedger: parseLedger, ledgerDiff: ledgerDiff };
})();
