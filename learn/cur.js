/* R.F.S. 밸류에이션 커리큘럼 (프로토타입)
 * AGORA "선배님께 여쭙기"(assets/ask.js)와 같은 틀: 화면 하나에 질문 하나, 큰 선택 버튼, 진행 막대, 브레드크럼.
 * index.html          → 코스 홈 (course.json: 모듈 지도, 진행률, 수료증 미리 보기)
 * index.html?m=m0     → 모듈 플레이 (m0.json). ?step=c4 로 바로 열기, ?review=1 로 단계 id·검수 상태 보기, ?nointro 로 인트로 생략
 * 상태는 메모리에만 둔다 (새로 고치면 처음부터). 그래프는 전부 인라인 SVG, 외부 차트 라이브러리 없음.
 *
 * ── course.json ──────────────────────────────────────────
 * { title, org, intro, groups: [{ id, label, range }], certificate: { title, line, unlockAfter },
 *   modules: [{ id, code, group, title, minutes, questions, objectives: [string], file?, ready }] }
 *
 * ── 모듈 JSON (m0.json) ──────────────────────────────────
 * { module, title, subtitle, start: stepId, next: { id, label, href?, ready }, vis?: ['vis/m5.js'], steps: [Step] }
 *   vis: 모듈 전용 그래프 부품 스크립트. 첫 단계를 그리기 전에 차례로 불러온다 (규약은 harness/PLUGIN.md)
 *
 * ── Step ─────────────────────────────────────────────────
 *  id       string   고유 id
 *  type     'intro' | 'concept' | 'chart' | 'choice' | 'multi' | 'match' | 'sort' | 'numeric' | 'text' | 'info' | 'summary'
 *  section  string   소주제 (브레드크럼, 인트로 목차). 같은 section이 이어지면 한 섹션
 *  prompt   string   큰 글씨 제목. 문제는 질문으로 시작한다 (<br>만 허용)
 *  note     string?  작은 상황 설명. 예시 숫자는 '(예시)'로 표시
 *  options  타입별
 *           intro        : { objectives: [string], time, prep }
 *           choice/multi : [{ label, sub?, icon? }]     icon: up down scale equal coin book bars people target search
 *           match        : { rows: [{ id, label, sub? }], cols: [string] }   열 하나에 줄 하나 (1:1)
 *           sort         : { rows: [{ id, label, tag? }], bins: [string] }   줄마다 바구니 하나 (체크리스트·분류, 바구니 재사용)
 *           numeric      : { unit?, tolerance?, placeholder? }
 *           text         : { fields: [{ id, label, placeholder }] }
 *           summary      : { takeaways: [string] }
 *  visual   concept·chart 전용 { name, params, wide? }  name = 그래프 부품 이름 (아래 VIS). wide면 그래프를 전체 폭으로
 *           priceValue { months }                       가격 vs 가치 선 그래프 (chart: 살 점 고르기)
 *           perBand    { bands:[8,12,16], start, min, max }  PER 밴드 + 배수 슬라이더 (chart: 밴드 고르기)
 *           absRel     { cf:[..], rate, peers:[[이름,배수]], eps }  절대 vs 상대 애니메이션 (concept)
 *           methodMap  { cards?: [{ id, label }] }      기법 지도 2D (chart: 카드 끌어 놓기 / 거품 누르기)
 *           goodPrice  { eps0, growth, years, exitPer, scenarios:[..], start, min, max }  같은 회사, 다른 진입 PER
 *           storyNumber{ story:[..], number:[..], value }  이야기 → 숫자 → 가치
 *           twoForces  { nodes:[a,b], left:{title,items}, right:{title,items}, mid }  두 힘 다이어그램 (가치 vs 가격 동인 등)
 *           methodTree {}                               자산·수익·시장 접근 기법 나무
 *           compTable  { cols:[..], rows:[[항목, 값...]] }  비교표 (폰에선 열 하나씩 탭으로)
 *           epsPer     { ni, pref, shares, per, niMin, niMax, perMin, perMax, name, cap }  지배순이익·주식수 → EPS × PER = 주가, 블록 = 한 해 이익 (concept)
 *           peerScatter{ peers:[{id,n,g,per}], target:{n,g,eps}, yMax, xMin, xMax, off:[id], cap }  비교 회사 산점도·평균 vs 중간값 (chart: answer {exclude:[id]})
 *           bandRead   { years, eps:[연간], price:[분기], bands, est, marks:[{k,a,b,t,d}], name, cap }  PER 밴드 읽기 + 시점 슬라이더 (concept: 구간 다 열기 / chart: 구간 index)
 *           perDcf     { rates:[%], growths:[%], r, g, cf, cap }  PER = 1 ÷ (할인율 − 성장률) 표 (concept)
 *           fwdTrail   { y0, years, now, types:[{k,s,a,b,den,num,pro,con,use,hit,when}], goal, cap }  Trailing·Forward 타임라인 (concept, 다 눌러야 다음)
 *           plBuilder  { vol, price, cogs, fixed, nonop, tax, minority, shares, per, now, name, cap }  PER 5단계 모형 (concept, 단계별 공개)
 *           bandRead에 { mlab:'PBR', blab:'BPS', dec:2 }를 주면 PBR 밴드로 읽어요
 *           bpsPbr     { asset, debt, nci, shares, pbr, aMin.., name, cap }  자산 − 부채 = 순자산 ÷ 주식수 = BPS × PBR = 주가 (concept)
 *           spreadQuad { p0, c0, dp, dc, range, labels:[4], notes:[4], cap }  제품·원재료 가격 네 국면과 스프레드 (concept: 네 국면 다 보기 / chart: 국면 index 0~3)
 *           roeLink    { mode:'per'|'coe', roe, per, coe, g, cap }  PBR = ROE × PER, PBR = (ROE − g) ÷ (COE − g) 슬라이더 (concept)
 *           roePath    { pts:[{y,roe,pbr}], segs:[{k,a,b}], ray?, xMin, xMax, yMin, yMax, name, cap }  ROE-PBR 산점도·회귀선 R²·PER 선·경로 (concept / chart: 구간 index)
 *           equityRoll { e0, shares, ni, payout, cb, cbPrice, pbr, now, name, cap }  PBR 6단계 모형: 자본변동표 → 기말 BPS × PBR (concept, 단계별 공개)
 *           evBridge   { mc, debt, cash, noa, noNoa?, cmp?, events:[{k,t,mc?,debt?,cash?,noa?,d}], ask, name, cap }  noNoa: 비영업자산 슬라이더·칸 숨김, cmp: 주주가치 vs EV 비교 문구 보이기
 *                      { mode:'parts', mc, nd, cap }  슬라이더 없는 두 블록: EV = 주주 몫(시가총액) + 채권자 몫(순차입금) (concept)
 *                      기본: 시장가치 재무상태표: 시가총액 + 차입금 − 현금 − 비영업자산 = EV (concept: 사건 다 눌러 보기 / chart: answer { need:'equity>ev'|'equity<ev' })
 *                      { mode:'value', ebitda, mult, nd, shares, name, cap }  EBITDA × 배수 = EV − 순차입금 = 주주가치 ÷ 주식수 (concept)
 *           ebitdaBuild{ sales, cost, da, int, nonop, tax, sl?:[슬라이더], pick?:[줄], ask, name, cap }  이익 사다리: 매출 → EBITDA → EBIT → 세전 → 순이익 (concept / chart: pick index)
 *  kind     concept 전용 '개념'(기본) | '정리'   정리는 그래프 없이 points만
 *  points   concept 전용 [string]  짧은 요점
 *  tag      string?  제목 위 꼬리표 덮어쓰기 (예: '종합 퀴즈', '실습')
 *  answer   choice: index | multi: [index] | match: { rowId: col } | sort: { rowId: bin } | numeric: 숫자
 *           chart: priceValue { discountAtLeast } | perBand 밴드 index | methodMap { cardId: method } | spreadQuad 국면 index | roePath 구간 index | evBridge { need } | ebitdaBuild 줄 index
 *  tolerance chart·numeric 허용 오차 (priceValue는 필요한 최소 할인율)
 *  explain  string   답한 뒤 펼쳐지는 짧은 설명 (2~4줄). note·explain·hint는 빈 줄(\n\n)로 문단을 나눠요 (문단 하나는 1~2문장)
 *  map      [{ m, when, how }]?  match 정답 뒤 기법 지도 표
 *  branch   { onWrong?: stepId, onRight: stepId }
 *           채점 문항: 처음 틀리면 onWrong(보충 info)으로, 맞으면 onRight로.
 *           info: onRight = 다시 풀 문항. 다시 풀어도 틀리면 정답을 보여 주고 넘어간다.
 *  hint     string   info(보충) 본문
 *  rubric   text 전용 [{ id, label, field, minLen?, regex?, any?: [단어], ok, miss }]  프로토타입은 흉내 채점 (실제는 서버)
 *  status   'draft' | 'review' | 'approved'  검수 상태 (?review=1 일 때 보임)
 *  review   string | [string]?  검수 메모: 출처 자료를 고친 곳·원래 값 등. ?review=1 일 때만 화면 아래에 보이고 학습 화면에는 안 나온다.
 *           학습자에게 보이는 글(note·explain·hint·points·캡션·선택지·그래프 글)에는 출처 자료를 가리키는 말과 맨 앞 † 를 쓰지 않는다 (금지어 목록은 check.py)
 *
 * 본 경로(진행 막대·번호)는 start에서 branch.onRight를 따라간 길이고, 거기 없는 단계는 보충 단계다.
 */
(function () {
  'use strict';
  var CSS = "\
.cur{position:fixed;inset:0;color:#F2EFE8;background:#0B1526;font-family:'RFS Dotum UI','Pretendard Variable',Pretendard,sans-serif;font-weight:300;-webkit-font-smoothing:antialiased;word-break:keep-all;overflow-wrap:break-word;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;opacity:0;transition:opacity .45s ease}\
.cur.show{opacity:1}\
.cur *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}\
.cur{--tx:#F2EFE8;--t2:#F2EFE8;--t3:rgba(242,239,232,.74);--ac:#8FAADC;--ac2:#C9D8F5;--ok:#A9D8BC;--no:#E8A9A9;--wm:#E8C9A0;--hair:rgba(242,239,232,.16);--e:cubic-bezier(.2,.8,.2,1);--ser:'Noto Serif KR',serif;--pad:22px}\
@media (min-width:900px){.cur{--pad:clamp(40px,6vw,96px)}}\
.cur-bg{position:fixed;inset:0;background:url(assets/curriculum.webp) center 60%/cover;transform:scale(1.05);animation:curDrift 34s ease-in-out infinite alternate}\
.cur-bg::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(9,17,31,.86),rgba(9,17,31,.7) 38%,rgba(9,17,31,.94) 82%,#09111F)}\
@keyframes curDrift{to{transform:scale(1.1) translateX(-1.5%)}}\
.cur-grain{position:fixed;inset:0;background:url(../assets/grain.png);opacity:.1;mix-blend-mode:overlay;pointer-events:none}\
.cur-bar{position:fixed;top:0;left:0;height:2px;width:0;background:var(--ac);z-index:5;transition:width .7s var(--e)}\
.cur-top{position:fixed;top:0;left:0;right:0;z-index:6;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(10px,3vw,40px);background:linear-gradient(180deg,rgba(9,17,31,.96) 62%,rgba(9,17,31,0))}\
.cur-top .sl{position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;font-family:var(--ser);font-size:12.5px;letter-spacing:.2em;white-space:nowrap;background:none;border:0;color:var(--tx);cursor:pointer}\
.cur-top .sl img{width:24px;height:24px;opacity:.9}\
.cur .tb{height:44px;padding:0 10px;border:0;background:none;color:var(--t2);font:inherit;font-size:12.5px;letter-spacing:.04em;cursor:pointer;white-space:nowrap;transition:color .2s}.cur .tb:hover{color:var(--tx)}.cur .tb[hidden]{display:none}\
.cur .ib{width:44px;height:44px;border:0;background:none;display:flex;align-items:center;justify-content:center;color:var(--t2);cursor:pointer;transition:opacity .25s,color .2s}\
.cur .ib:hover{color:var(--tx)}.cur .ib:disabled{opacity:0;pointer-events:none}.cur .ib svg{width:22px;height:22px}\
.cur .rvw{position:fixed;top:64px;right:clamp(10px,3vw,40px);z-index:6;font-size:11px;letter-spacing:.06em;color:var(--t2);border:1px solid var(--hair);padding:3px 8px;background:rgba(9,17,31,.6)}\
.cur .rvw b{font-weight:500;color:var(--wm)}\
.cur .rvn{margin-top:28px;max-width:46em;border:1px dashed rgba(232,201,160,.55);background:rgba(9,17,31,.72);padding:12px 14px;font-size:13px;line-height:1.6;color:var(--t2)}\
.cur .rvn b{display:block;margin-bottom:6px;font-size:11px;font-weight:500;letter-spacing:.12em;color:var(--wm)}.cur .rvn li{margin-left:16px}.cur .rvn li+li{margin-top:4px}\
.cur :focus-visible{outline:2px solid var(--ac);outline-offset:2px}\
.cur-wrap{position:relative;z-index:2;min-height:100vh;min-height:100svh;display:flex;flex-direction:column;padding:104px var(--pad) 130px}\
@media (min-width:900px){.cur-wrap{padding:112px var(--pad) 132px}.cur-wrap.done,.cur-wrap.pad{padding-bottom:132px}}\
.cur .meta{display:flex;flex-wrap:wrap;align-items:center;font-size:13px;letter-spacing:.04em;color:var(--ac);margin-bottom:16px;font-weight:500}\
.cur .meta a{color:inherit;text-decoration:none;cursor:pointer;transition:color .2s}.cur .meta a:hover{color:var(--tx)}.cur .meta i{font-style:normal;margin:0 8px;color:var(--t3)}\
.cur .meta .sup{color:var(--wm)}\
.cur .meta .n{margin-left:auto;padding-left:12px;color:var(--t3);font-variant-numeric:tabular-nums;font-weight:300}\
.cur .q{color:var(--tx);text-shadow:0 2px 24px rgba(0,0,0,.35);font-family:var(--ser);font-weight:600;font-size:clamp(32px,9vw,46px);line-height:1.22;letter-spacing:-.045em}\
@media (min-width:900px){.cur .q{font-size:clamp(48px,4.6vw,80px);line-height:1.12;max-width:15em}}\
.cur .q.sm{font-size:clamp(28px,7.6vw,38px)}\
@media (min-width:900px){.cur .q.sm{font-size:clamp(34px,3vw,52px);line-height:1.18}}\
.cur .kd{display:inline-block;align-self:flex-start;margin-bottom:14px;font-size:11.5px;font-weight:500;letter-spacing:.14em;color:var(--ac);border:1px solid rgba(143,170,220,.5);padding:3px 9px}\
.cur .kd.rc{color:var(--ok);border-color:rgba(169,216,188,.5)}.cur .kd.qz{color:var(--wm);border-color:rgba(232,201,160,.5)}\
.cur .note{margin-top:16px;max-width:36em;font-size:16px;line-height:1.75;color:var(--t2)}\
@media (min-width:900px){.cur .note{font-size:17px}}\
.cur .pts{list-style:none;margin-top:20px;display:flex;flex-direction:column;gap:10px;max-width:34em}\
.cur .pts li{position:relative;padding-left:18px;font-size:16.5px;line-height:1.65;color:var(--t2)}\
.cur .pts li::before{content:'';position:absolute;left:0;top:.72em;width:8px;height:1px;background:var(--ac)}\
.cur .pts.big{gap:0;margin-top:30px;border-top:1px solid var(--hair);max-width:760px}\
.cur .pts.big li{padding:18px 0 18px 40px;border-bottom:1px solid var(--hair);font-family:var(--ser);font-size:clamp(19px,5vw,24px);font-weight:600;letter-spacing:-.025em;line-height:1.45;color:var(--tx)}\
@media (min-width:900px){.cur .pts.big li{font-size:clamp(22px,1.8vw,28px)}}\
.cur .pts.big li::before{content:'';top:24px;width:20px;height:10px;border-left:2px solid var(--ok);border-bottom:2px solid var(--ok);background:none;transform:rotate(-45deg)}\
.cur .in .pts li{animation:curRise .7s var(--e) both}\
.cur .cx{display:flex;flex-direction:column;gap:26px}\
.cur .cl{display:flex;flex-direction:column;min-width:0}\
.cur .cv{min-width:0}\
@media (min-width:900px){.cur .cx{display:grid;grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr);gap:clamp(36px,4vw,72px);align-items:start}.cur .cv{padding-top:6px}}\
.cur .in .cv{animation:curRise .85s var(--e) .18s both}\
.cur .L{display:flex;flex-direction:column;margin-top:30px}\
.cur .o{position:relative;display:flex;align-items:center;gap:14px;width:100%;min-height:60px;padding:12px 0 12px 16px;background:none;border:0;color:var(--tx);font:inherit;text-align:left;cursor:pointer;transition:opacity .35s,transform .35s var(--e)}\
.cur .o::before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:2px;background:var(--hair);transition:background .3s,top .35s var(--e),bottom .35s var(--e)}\
.cur .o .ot{display:flex;flex-direction:column;gap:4px;min-width:0}\
.cur .o .lb{font-family:var(--ser);font-size:21px;font-weight:600;letter-spacing:-.03em;line-height:1.3}\
.cur .o .s{font-size:13.5px;color:var(--t2);line-height:1.5}\
.cur .o:hover::before,.cur .o:focus-visible::before,.cur .o.on::before{background:var(--ac);top:8px;bottom:8px}\
.cur .o:active{transform:translateX(4px)}\
.cur .L.picked .o:not(.on):not(.ans){opacity:.2}\
.cur .o .k,.cur .o .key{display:none}\
.cur .o .ck{flex:none;width:22px;height:22px;border:1px solid var(--t3);display:flex;align-items:center;justify-content:center;transition:background .25s,border-color .25s}\
.cur .o .ck svg{width:14px;height:14px;opacity:0;color:#0B1526;transition:opacity .2s}\
.cur .o.on .ck{background:var(--tx);border-color:var(--tx)}.cur .o.on .ck svg{opacity:1}\
.cur .o .mk{position:absolute;right:0;top:50%;transform:translateY(-50%);font-size:12px;font-weight:500;letter-spacing:.06em;padding:3px 8px;border:1px solid currentColor;animation:curPop .5s var(--e) both}\
.cur .o.ok .mk,.cur .o.ans .mk{color:var(--ok)}.cur .o.no .mk{color:var(--no)}\
.cur .o.ok::before,.cur .o.ans::before{background:var(--ok)!important;top:8px;bottom:8px}.cur .o.no::before{background:var(--no)!important;top:8px;bottom:8px}\
.cur .o.no .lb{color:var(--no)}\
.cur .L.locked .o{cursor:default}.cur .L.locked .o:active{transform:none}\
@keyframes curPop{from{opacity:0;transform:scale(.85)}}\
.cur .sym{display:block;flex:none;width:26px;height:26px;color:var(--ac2)}\
.cur .sym *{fill:none;stroke:currentColor;stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:1}\
.cur .in .sym *{animation:curDraw 1.3s cubic-bezier(.5,0,.2,1) forwards}\
@keyframes curDraw{to{stroke-dashoffset:0}}\
.cur .o:hover .sym,.cur .o.on .sym{color:#fff}\
@media (max-width:899px){.cur .o .mk{position:static;transform:none;margin-left:auto;flex:none}.cur .o{padding-right:2px}}\
@media (min-width:900px){\
 .cur .L{flex-direction:row;margin:auto calc(-1*var(--pad)) 0;height:min(40vh,360px);border-top:1px solid var(--hair);background:linear-gradient(180deg,transparent,rgba(9,17,31,.55));transition:height .6s var(--e)}\
 .cur .o{flex:1 1 0;min-width:0;flex-direction:column;align-items:flex-start;justify-content:flex-end;gap:10px;padding:0 clamp(16px,1.6vw,26px) 40px;overflow:hidden;isolation:isolate;min-height:0}\
 .cur .o+.o{box-shadow:inset 1px 0 0 var(--hair)}\
 .cur .o:first-child{padding-left:var(--pad)}.cur .o:first-child .k{left:var(--pad)}.cur .o:last-child{padding-right:var(--pad)}\
 .cur .o::before{left:0;right:0;top:auto;bottom:0;width:auto;height:0;z-index:-1;background:linear-gradient(0deg,rgba(32,56,100,.85),rgba(32,56,100,.15));transition:height .55s var(--e)}\
 .cur .o:hover::before,.cur .o:focus-visible::before{top:auto;bottom:0;height:100%;background:linear-gradient(0deg,rgba(32,56,100,.85),rgba(32,56,100,.15))}\
 .cur .o.on::before{top:auto;bottom:0;height:100%;background:linear-gradient(0deg,#26457A,rgba(38,69,122,.5))}\
 .cur .o.ok::before,.cur .o.ans::before{top:auto!important;bottom:0!important;height:100%;background:linear-gradient(0deg,rgba(60,120,90,.55),rgba(60,120,90,.08))!important}\
 .cur .o.no::before{top:auto!important;bottom:0!important;height:100%;background:linear-gradient(0deg,rgba(140,60,60,.5),rgba(140,60,60,.08))!important}\
 .cur .o .lb{font-size:clamp(21px,1.7vw,29px);transition:transform .45s var(--e)}\
 .cur .o .s{font-size:14px;transition:color .3s}\
 .cur .L:not(.locked) .o:hover .lb{transform:translateY(-6px)}.cur .o:hover .s{color:var(--tx)}.cur .o:active{transform:none}\
 .cur .o .k{display:block;position:absolute;top:22px;left:clamp(16px,1.6vw,26px);font-size:12px;color:var(--t3);font-weight:500;letter-spacing:.08em}\
 .cur .o .key{display:block;position:absolute;top:20px;right:18px;font-size:11px;color:var(--t3);border:1px solid var(--hair);padding:1px 6px;opacity:0;transition:opacity .3s}\
 .cur .L:not(.locked) .o:hover .key{opacity:1}\
 .cur .o .mk{top:18px;right:18px;transform:none}\
 .cur .o .ck{position:absolute;top:20px;right:18px}\
 .cur .o.on .key,.cur .L[role=group] .o .key{display:none}\
 .cur .sym{width:clamp(48px,4vw,64px);height:clamp(48px,4vw,64px);margin-bottom:auto;margin-top:58px;transition:transform .45s var(--e),color .3s,opacity .4s}\
 .cur .L:not(.locked) .o:hover .sym{transform:translateY(-6px)}\
 .cur .done .L{height:min(26vh,230px)}.cur .done .sym{opacity:0}\
}\
.cur .rv{margin-top:22px;max-width:40em;animation:curRise .7s var(--e) both}\
.cur .rv .vd{font-family:var(--ser);font-size:21px;font-weight:600;letter-spacing:-.03em;color:var(--ok)}\
.cur .rv.bad .vd{color:var(--no)}\
.cur .rv .dt{margin-top:8px;font-size:15px;color:var(--tx)}\
.cur .rv .ex{margin-top:8px;font-size:15.5px;line-height:1.8;color:var(--t2)}\
.cur .note p+p,.cur .rv .ex p+p,.cur .bub p+p,.cur .fb .sm p+p{margin-top:.8em}\
@media (min-width:900px){.cur .rv .vd{font-size:25px}.cur .rv .ex{font-size:16.5px}}\
.cur .wr{margin-top:34px;max-width:960px}\
.cur .num{display:flex;align-items:baseline;gap:12px;border-bottom:1px solid var(--hair);max-width:360px;transition:border-color .3s}\
.cur .num:focus-within{border-bottom-color:var(--ac)}\
.cur .num input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--tx);font-family:var(--ser);font-weight:600;font-size:64px;line-height:1.2;letter-spacing:-.04em;padding:4px 0;font-variant-numeric:tabular-nums;caret-color:var(--ac)}\
.cur .num input::placeholder{color:rgba(242,239,232,.22)}\
.cur .num span{font-family:var(--ser);font-size:28px;color:var(--t2)}\
.cur .num.ok{border-bottom-color:var(--ok)}.cur .num.no{border-bottom-color:var(--no)}.cur .num.no input{color:var(--no)}\
.cur .calc{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:16px;font-size:14px;color:var(--tx)}\
.cur .mt{display:flex;flex-direction:column;gap:18px;margin-top:24px}\
.cur .mc{position:sticky;top:64px;z-index:3;display:flex;flex-wrap:wrap;gap:8px;padding:10px var(--pad);margin:0 calc(-1*var(--pad));background:rgba(9,17,31,.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}\
.cur .mc button{min-height:44px;padding:0 14px;border:1px solid var(--hair);background:rgba(9,17,31,.4);color:var(--tx);font-family:var(--ser);font-size:17px;font-weight:600;letter-spacing:-.02em;cursor:pointer;display:flex;align-items:center;gap:8px;transition:border-color .25s,background .25s,opacity .25s,transform .3s var(--e)}\
.cur .mc button:hover{border-color:var(--ac)}.cur .mc button:active{transform:scale(.97)}\
.cur .mc button.used{opacity:.38}\
.cur .mc button i{font-style:normal;font-family:'RFS Dotum UI',sans-serif;font-size:11px;font-weight:500;color:var(--t3)}\
.cur .mr{display:flex;flex-direction:column}\
.cur .mw{position:relative;display:flex;align-items:center;gap:14px;width:100%;min-height:62px;padding:10px 0 10px 16px;background:none;border:0;color:var(--tx);font:inherit;text-align:left;cursor:pointer;animation:curRise .7s var(--e) both}\
.cur .mw::before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:2px;background:var(--hair);transition:background .3s,top .35s var(--e),bottom .35s var(--e)}\
.cur .mw.act::before{background:var(--ac);top:6px;bottom:6px}\
.cur .mw.act{background:linear-gradient(90deg,rgba(38,69,122,.35),transparent)}\
.cur .mw .ot{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}\
.cur .mw .lb{font-family:var(--ser);font-size:18px;font-weight:600;letter-spacing:-.03em;line-height:1.35}\
.cur .mw .s{font-size:13px;color:var(--t2);line-height:1.5}\
.cur .mw .sl2{flex:none;min-width:72px;text-align:right;font-family:var(--ser);font-size:15px;font-weight:600;color:var(--t3);letter-spacing:-.02em;transition:color .3s}\
.cur .mw .sl2.f{color:var(--ac2)}\
.cur .mw.ok .sl2{color:var(--ok)}.cur .mw.no .sl2{color:var(--no);text-decoration:line-through}\
.cur .mw.ok::before{background:var(--ok)}.cur .mw.no::before{background:var(--no)}\
.cur .mw .fx{display:block;font-family:var(--ser);font-size:13px;color:var(--ok);font-weight:600}\
.cur .mt.locked .mw,.cur .mt.locked .mc button{cursor:default}\
@media (min-width:900px){\
 .cur .mt{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:0 clamp(32px,4vw,72px);align-items:start}\
 .cur .mc{order:2;position:static;flex-direction:column;flex-wrap:nowrap;gap:0;margin:0;padding:0;background:none;border-top:1px solid var(--hair);backdrop-filter:none}\
 .cur .mc button{justify-content:space-between;min-height:56px;padding:0 4px;border:0;border-bottom:1px solid var(--hair);background:none;font-size:clamp(20px,1.6vw,26px)}\
 .cur .mc button:hover{background:linear-gradient(90deg,rgba(38,69,122,.35),transparent)}\
 .cur .mr{order:1;border-top:1px solid var(--hair)}\
 .cur .mw{min-height:62px;border-bottom:1px solid var(--hair)}\
 .cur .mw .lb{font-size:clamp(18px,1.35vw,22px)}\
 .cur .mw .sl2{min-width:130px;font-size:19px;padding-right:12px}\
}\
.cur .map{margin-top:22px;border-top:1px solid var(--hair);max-width:1100px}\
.cur .map div{display:grid;grid-template-columns:96px minmax(0,1fr);gap:4px 16px;padding:12px 0;border-bottom:1px solid var(--hair);animation:curRise .6s var(--e) both}\
.cur .map b{grid-row:span 2;font-family:var(--ser);font-weight:600;font-size:17px;color:var(--ac2);letter-spacing:-.02em}\
.cur .map span{font-size:15px;color:var(--tx);line-height:1.5}.cur .map small{font-size:13px;color:var(--t3);line-height:1.5}\
@media (min-width:900px){.cur .map div{grid-template-columns:150px minmax(0,1fr) minmax(0,1.2fr);align-items:baseline}.cur .map b{grid-row:auto;font-size:20px}.cur .map span{font-size:16px}.cur .map small{font-size:14px}}\
.cur .tw{display:flex;flex-direction:column}\
@media (min-width:900px){.cur .tw{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(32px,4vw,64px);align-items:start}.cur .tw .fb{margin-top:30px}}\
.cur .fl{display:flex;flex-direction:column;gap:26px;margin-top:30px}\
.cur .fl label{display:block;font-size:13px;font-weight:500;letter-spacing:.08em;color:var(--ac);margin-bottom:6px}\
.cur .fl textarea{display:block;width:100%;min-height:76px;padding:0 0 12px;background:none;border:0;border-bottom:1px solid var(--hair);outline:0;resize:none;overflow:hidden;font-family:var(--ser);font-size:21px;font-weight:400;line-height:1.55;letter-spacing:-.025em;color:var(--tx);caret-color:var(--ac);transition:border-color .3s}\
@media (min-width:900px){.cur .fl textarea{font-size:24px;min-height:52px}}\
.cur .fl textarea:focus{border-bottom-color:var(--ac)}.cur .fl textarea::placeholder{color:rgba(242,239,232,.28)}\
.cur .fl textarea[readonly]{color:var(--t2)}\
.cur .fb{margin-top:30px;max-width:720px;background:rgba(242,239,232,.06);border:1px solid var(--hair);padding:20px 20px 18px;animation:curRise .7s var(--e) both;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}\
.cur .fb .hd{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;justify-content:space-between}\
.cur .fb .hd b{font-family:var(--ser);font-size:19px;font-weight:600;letter-spacing:-.02em}\
.cur .fb .tag{font-size:11.5px;font-weight:500;letter-spacing:.04em;color:var(--wm);border:1px solid rgba(232,201,160,.5);padding:3px 8px}\
.cur .fb .cr{margin-top:14px;font-size:12.5px;letter-spacing:.06em;color:var(--t3)}\
.cur .fb ul{list-style:none;margin-top:8px;display:flex;flex-direction:column}\
.cur .fb li{display:grid;grid-template-columns:28px minmax(0,1fr);gap:2px 8px;padding:12px 0;border-top:1px solid var(--hair);animation:curRise .55s var(--e) both}\
.cur .fb li em{grid-row:span 2;font-style:normal;font-size:16px;font-weight:700;line-height:1.4}\
.cur .fb li.y em{color:var(--ok)}.cur .fb li.n em{color:var(--wm)}\
.cur .fb li span{font-size:15px;color:var(--tx);line-height:1.5}.cur .fb li small{font-size:13.5px;color:var(--t2);line-height:1.6}\
.cur .fb .sm{margin-top:12px;font-size:14px;color:var(--t2);line-height:1.7}\
.cur .fb.ld{min-height:120px;display:flex;align-items:center;gap:12px;font-size:14px;color:var(--t2)}\
.cur .dots{display:inline-flex;gap:5px}.cur .dots i{width:6px;height:6px;border-radius:50%;background:var(--ac);animation:curDot 1s ease-in-out infinite}.cur .dots i:nth-child(2){animation-delay:.15s}.cur .dots i:nth-child(3){animation-delay:.3s}\
@keyframes curDot{50%{opacity:.25;transform:translateY(-3px)}}\
.cur .bub{margin-top:30px;max-width:600px;background:#F2EFE8;color:#121C2C;padding:20px 22px;border-radius:20px 20px 20px 4px;font-size:16px;line-height:1.78;transform-origin:bottom left;animation:curBub .7s cubic-bezier(.34,1.3,.5,1) .3s both}\
.cur .bub b{display:block;font-size:12px;font-weight:500;letter-spacing:.08em;color:#26457A;margin-bottom:6px}\
@media (min-width:900px){.cur .bub{font-size:17.5px;padding:24px 26px}}\
@keyframes curBub{from{opacity:0;transform:scale(.9) translateY(10px)}}\
.cur .ig{display:flex;flex-direction:column;gap:30px;margin-top:30px;max-width:1100px}\
@media (min-width:900px){.cur .ig{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:64px}}\
.cur .ig h3,.cur .sg h3{font-size:13px;font-weight:500;letter-spacing:.08em;color:var(--ac);margin-bottom:10px}\
.cur .ig ul,.cur .ig ol{list-style:none;border-top:1px solid var(--hair)}\
.cur .ig li{display:flex;gap:14px;padding:12px 0;border-bottom:1px solid var(--hair);font-size:15.5px;line-height:1.55;color:var(--tx);animation:curRise .6s var(--e) both}\
.cur .ig li b{flex:none;width:26px;font-family:var(--ser);font-weight:600;color:var(--ac2);font-variant-numeric:tabular-nums}\
.cur .ig .kv{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px 20px;margin-bottom:26px;font-size:15.5px}\
.cur .ig .kv dt{color:var(--t3)}.cur .ig .kv dd{color:var(--tx)}\
.cur .sc{display:flex;align-items:baseline;flex-wrap:wrap;gap:10px;font-family:var(--ser);animation:curRise .8s var(--e) both}\
.cur .sc b{font-size:clamp(76px,20vw,140px);font-weight:400;line-height:.9;letter-spacing:-.05em;color:var(--tx);font-variant-numeric:tabular-nums}\
.cur .sc span{font-size:24px;color:var(--t3)}\
.cur .sc small{flex-basis:100%;font-family:'RFS Dotum UI',sans-serif;font-size:14px;color:var(--t2)}\
.cur .sh{display:flex;align-items:center;gap:clamp(20px,4vw,56px);margin-top:22px}\
.cur .stp{flex:none;width:clamp(120px,32vw,190px);height:auto;color:var(--wm);transform:rotate(-12deg);animation:curStamp .8s cubic-bezier(.3,1.5,.5,1) .5s both}\
.cur .stp circle{fill:none;stroke:currentColor}.cur .stp text{fill:currentColor;font-family:var(--ser);text-anchor:middle}\
@keyframes curStamp{from{opacity:0;transform:rotate(-12deg) scale(1.6)}}\
.cur .sg{display:flex;flex-direction:column;gap:34px;margin-top:34px;max-width:1100px}\
@media (min-width:900px){.cur .sg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:64px;max-width:min(1100px,calc(100% - 230px))}}\
.cur .sg ul{list-style:none;border-top:1px solid var(--hair)}\
.cur .sg li{padding:13px 0;border-bottom:1px solid var(--hair);font-size:15.5px;line-height:1.6;color:var(--tx);animation:curRise .6s var(--e) both}\
.cur .sg li small{display:block;font-size:12.5px;color:var(--t3);letter-spacing:.04em;margin-bottom:2px}\
.cur .sg li a{color:var(--ac2);text-decoration:none;box-shadow:inset 0 -1px 0 var(--hair);cursor:pointer;font-size:13.5px;margin-left:6px;white-space:nowrap}\
.cur .sg li.zero{color:var(--t2)}\
.cur .more{align-self:flex-start;margin-top:22px;background:none;border:0;color:var(--t2);font:inherit;font-size:14px;cursor:pointer;box-shadow:inset 0 -1px 0 var(--hair);padding:6px 0;transition:color .2s,box-shadow .2s}\
.cur .more:hover{color:var(--tx);box-shadow:inset 0 -1px 0 var(--ac)}\
.cur .soon{margin-top:14px;font-size:14px;color:var(--wm);min-height:1.4em}\
.cur .labc{margin-top:30px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:20px 22px;border:1px solid var(--hair);border-radius:12px}\
.cur .labc small{display:block;font-size:12px;letter-spacing:.08em;color:var(--t2)}\
.cur .labc b{display:block;font-size:17px;font-weight:600;margin:4px 0 2px}\
.cur .labc span{font-size:13px;color:var(--t2)}\
.cur .labc a{color:inherit;text-decoration:none;font-size:15px;font-weight:600;padding:10px 16px;border-radius:8px;border:1px solid var(--hair);white-space:nowrap}\
.cur .labc a:hover,.cur .labc a:focus-visible{border-color:currentColor}\
.cur .labc.done small{color:var(--ok,#7FCBA0)}\
.cur .md .ft .lb{border:1px solid var(--hair);border-radius:4px;padding:0 6px}\
.cur .nx{position:fixed;z-index:6;left:22px;right:22px;bottom:calc(20px + env(safe-area-inset-bottom));height:56px;display:flex;align-items:center;justify-content:center;gap:10px;background:var(--tx);color:#0B1526;border:0;font-family:inherit;font-size:16px;font-weight:500;cursor:pointer;opacity:0;transform:translateY(20px);pointer-events:none;transition:opacity .4s,transform .45s var(--e)}\
.cur .nx.show{opacity:1;transform:none;pointer-events:auto}\
.cur .nx:disabled{opacity:.2!important;cursor:default}\
.cur .nx.alt{background:var(--wm)}\
@media (min-width:900px){.cur .nx{left:auto;right:var(--pad);bottom:48px;height:auto;padding:0 0 8px;background:none!important;color:var(--tx);font-family:var(--ser);font-size:24px;font-weight:600;box-shadow:inset 0 -1px 0 var(--ac)}.cur .nx.alt{color:var(--wm);box-shadow:inset 0 -1px 0 var(--wm)}.cur .nx svg{transition:transform .3s var(--e)}.cur .nx:hover svg{transform:translateX(6px)}}\
.cur .in .meta,.cur .in .q,.cur .in .kd{animation:curRise .85s var(--e) both}.cur .in .q{animation-delay:.04s}.cur .in .note{animation:curRise .85s var(--e) .1s both}\
.cur .in .L>*,.cur .in .wr,.cur .in .mt,.cur .in .fl,.cur .in .bub,.cur .in .more{animation:curRise .75s var(--e) both}\
.cur .out>*{opacity:0;transform:translateY(-14px);transition:all .3s ease}\
@keyframes curRise{from{opacity:0;transform:translateY(28px)}}\
@media (min-width:900px){.cur .in .L>*{animation-name:curCol}@keyframes curCol{from{opacity:0;transform:translateY(60px)}}}\
.cur .ttl{margin:auto;text-align:center;font-family:var(--ser);font-weight:700;font-size:clamp(48px,5.6vw,80px);letter-spacing:-.035em;line-height:1;color:var(--tx);text-shadow:0 6px 28px rgba(4,8,16,.45);animation:curTtl 2s cubic-bezier(.2,.8,.2,1) both}\
.cur .ttl small{display:block;margin-top:18px;font-family:'RFS Dotum UI',sans-serif;font-size:14px;font-weight:300;letter-spacing:.2em;color:var(--t2)}\
@keyframes curTtl{0%{opacity:0;transform:translateY(14px)}25%,72%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-10px)}}\
.cur .err{margin:auto;max-width:30em;text-align:center;font-size:16px;line-height:1.7;color:var(--t2)}\
/* 그래프 */\
.cur .vis{position:relative;width:100%}\
.cur .vis svg{display:block;width:100%;overflow:visible}\
.cur .vis text{font-family:'RFS Dotum UI',sans-serif;fill:rgba(242,239,232,.78);font-size:11.5px}\
.cur .vis text.tt{fill:var(--tx);font-size:13px}.cur .vis text.th{fill:var(--tx);font-family:var(--ser);font-weight:600;font-size:15px}\
.cur .vis text.ta{fill:var(--ac2)}.cur .vis text.tok{fill:var(--ok)}.cur .vis text.tno{fill:var(--no)}.cur .vis text.twm{fill:var(--wm)}\
.cur .vis .gl{stroke:rgba(242,239,232,.1);stroke-width:1}\
.cur .vis .ax{stroke:rgba(242,239,232,.35);stroke-width:1;fill:none}\
.cur .vis .lp{fill:none;stroke:#F2EFE8;stroke-width:2;stroke-linejoin:round}\
.cur .vis .lv{fill:none;stroke:var(--ac);stroke-width:2;stroke-dasharray:6 5}\
.cur .vis .draw{stroke-dasharray:1;stroke-dashoffset:1;animation:curDraw 1.6s cubic-bezier(.5,0,.2,1) .3s forwards}\
.cur .vis .zo{fill:rgba(232,169,169,.17)}.cur .vis .zu{fill:rgba(169,216,188,.17)}\
.cur .vis .zu.hl{fill:rgba(169,216,188,.38)}\
.cur .vis .hit{fill:transparent;cursor:crosshair}\
.cur .vis .vf{animation:curRise .6s var(--e) both}\
.cur .vis .grow{transform-box:fill-box;animation:curGrowX .9s var(--e) both}\
@keyframes curGrowX{from{transform:scaleX(0)}}\
.cur .vis:focus-visible{outline:2px solid var(--ac);outline-offset:6px}\
.cur .vr{margin-top:10px;min-height:1.5em;font-size:15px;color:var(--t2);font-variant-numeric:tabular-nums;line-height:1.6}\
.cur .vr b{color:var(--tx);font-weight:500}\
.cur .vctl{display:flex;align-items:center;gap:14px;margin-top:14px}\
.cur .vctl label{flex:none;font-size:14px;color:var(--t2);min-width:104px}.cur .vctl label b{font-family:var(--ser);font-size:20px;font-weight:600;color:var(--wm);font-variant-numeric:tabular-nums}\
.cur .vctl input[type=range]{flex:1;min-width:0;-webkit-appearance:none;appearance:none;height:28px;background:none;cursor:pointer}\
.cur .vctl input[type=range]::-webkit-slider-runnable-track{height:2px;background:var(--hair)}\
.cur .vctl input[type=range]::-moz-range-track{height:2px;background:var(--hair)}\
.cur .vctl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;margin-top:-10px;border-radius:50%;background:var(--wm);border:3px solid #0B1526;box-shadow:0 0 0 1px var(--wm)}\
.cur .vctl input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--wm);border:3px solid #0B1526}\
.cur .vbt{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}\
.cur .vbt button{min-height:44px;padding:0 14px;border:1px solid var(--hair);background:rgba(9,17,31,.4);color:var(--tx);font:inherit;font-size:14.5px;cursor:pointer;transition:border-color .2s,background .2s}\
.cur .vbt button:hover{border-color:var(--ac)}.cur .vbt button.on{background:#26457A;border-color:var(--ac)}\
.cur .vbt button.ok{border-color:var(--ok);color:var(--ok)}.cur .vbt button.no{border-color:var(--no);color:var(--no)}\
.cur .vbt button i{font-style:normal;font-size:11px;color:var(--t3);margin-left:6px}\
.cur .mp{position:relative}\
.cur .bb{position:absolute;inset:0;pointer-events:none}\
.cur .bz{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:64px;min-height:44px;padding:8px 12px;border:1px solid var(--ac);border-radius:999px;background:rgba(20,38,70,.78);color:var(--tx);font:inherit;cursor:pointer;transition:background .25s,border-color .25s,transform .3s var(--e),box-shadow .25s;animation:curPopB .6s var(--e) both}\
@keyframes curPopB{from{opacity:0;transform:translate(-50%,-50%) scale(.6)}}\
.cur .bz b{font-family:var(--ser);font-size:15px;font-weight:600;letter-spacing:-.02em;white-space:nowrap}\
.cur .bz small{font-size:11px;color:var(--t2);white-space:nowrap}\
.cur .bz.dash{border-style:dashed}\
.cur .bz:hover,.cur .bz.over{background:#26457A;box-shadow:0 0 0 6px rgba(143,170,220,.18);transform:translate(-50%,-50%) scale(1.06)}\
.cur div.bz{cursor:default}.cur div.bz:hover{transform:translate(-50%,-50%);box-shadow:none;background:rgba(20,38,70,.78)}\
.cur .bz .kn{position:absolute;top:-8px;right:-4px;font-size:10px;color:var(--t3);background:#0B1526;border:1px solid var(--hair);padding:0 4px}\
.cur .tg{position:absolute;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none}\
.cur .tg span{font-size:11.5px;padding:2px 7px;background:#F2EFE8;color:#121C2C;white-space:nowrap;animation:curPop .4s var(--e) both}\
.cur .tg span.ok{background:var(--ok)}.cur .tg span.no{background:var(--no)}\
.cur .dcw{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px;min-height:56px}\
.cur .dc{display:flex;flex-direction:column;gap:2px;padding:10px 16px;background:#F2EFE8;color:#121C2C;cursor:grab;touch-action:none;user-select:none;box-shadow:0 10px 30px rgba(0,0,0,.35);transform:rotate(-1.5deg);transition:transform .3s var(--e),opacity .3s;animation:curRise .5s var(--e) both}\
.cur .dc small{font-size:11px;letter-spacing:.06em;color:#26457A;font-weight:500}.cur .dc b{font-family:var(--ser);font-size:17px;font-weight:600;letter-spacing:-.02em}\
.cur .dc.drag{opacity:.35}\
.cur .dc.done{background:none;color:var(--t2);box-shadow:none;transform:none;cursor:default;border:1px dashed var(--hair)}\
.cur-ghost{position:fixed;z-index:9999;pointer-events:none;padding:10px 16px;background:#F2EFE8;color:#121C2C;font-family:'Noto Serif KR',serif;font-weight:600;font-size:17px;box-shadow:0 18px 40px rgba(0,0,0,.45);transform:translate(-50%,-60%) rotate(-3deg)}\
.cur .mini{background:none;border:0;color:var(--t2);font:inherit;font-size:13px;cursor:pointer;box-shadow:inset 0 -1px 0 var(--hair);padding:4px 0}\
.cur .vcap{margin-top:12px;font-size:13.5px;color:var(--tx);line-height:1.6}\
/* 코스 홈 */\
.cur-wrap.home{display:block;padding-bottom:80px}\
.cur .hm .ey{font-size:13px;letter-spacing:.12em;color:var(--ac);font-weight:500}\
.cur .hm h1{margin-top:14px;font-family:var(--ser);font-weight:700;font-size:clamp(40px,11vw,96px);line-height:1.08;letter-spacing:-.045em;color:var(--tx);text-shadow:0 2px 24px rgba(0,0,0,.35)}\
.cur .hm .lead{margin-top:20px;max-width:40em;font-size:16.5px;line-height:1.8;color:var(--t2)}\
.cur .hm .stt{display:flex;flex-wrap:wrap;gap:8px 26px;margin-top:22px;font-size:14px;color:var(--t2)}\
.cur .hm .stt b{font-family:var(--ser);font-size:22px;font-weight:600;color:var(--tx);margin-right:4px}\
.cur .ovp{margin-top:34px;max-width:760px}\
.cur .ovp .row{display:flex;justify-content:space-between;align-items:baseline;font-size:13.5px;color:var(--t2)}\
.cur .ovp .row b{font-family:var(--ser);font-size:20px;color:var(--tx);font-weight:600}\
.cur .ovp .tr{margin-top:10px;height:4px;background:var(--hair);position:relative;overflow:hidden}\
.cur .ovp .tr i{position:absolute;left:0;top:0;bottom:0;background:var(--ac);transition:width 1s var(--e)}\
.cur .ovp .seg{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;margin-top:6px}\
.cur .ovp .seg span{height:3px;background:rgba(242,239,232,.08)}.cur .ovp .seg span.on{background:var(--ok)}.cur .ovp .seg span.half{background:linear-gradient(90deg,var(--ac) var(--p),rgba(242,239,232,.08) var(--p))}\
.cur .hm h2{margin-top:56px;font-family:var(--ser);font-size:clamp(24px,6vw,34px);font-weight:600;letter-spacing:-.03em}\
.cur .gp{margin-top:26px}\
.cur .gp>h3{display:flex;align-items:baseline;gap:10px;font-size:13px;font-weight:500;letter-spacing:.08em;color:var(--ac);margin-bottom:12px}.cur .gp>h3 small{color:var(--t3);font-weight:300}\
.cur .mods{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}\
@media (min-width:700px){.cur .mods{grid-template-columns:repeat(2,minmax(0,1fr))}}\
@media (min-width:1200px){.cur .mods{grid-template-columns:repeat(4,minmax(0,1fr))}}\
.cur .md{position:relative;display:flex;flex-direction:column;gap:12px;padding:18px 18px 16px;border:1px solid var(--hair);background:rgba(9,17,31,.55);color:var(--tx);font:inherit;text-align:left;cursor:pointer;transition:border-color .25s,background .25s,transform .35s var(--e);animation:curRise .7s var(--e) both;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}\
.cur .md:hover{border-color:var(--ac);background:rgba(20,38,70,.7);transform:translateY(-3px)}\
.cur .md.lock{cursor:default}.cur .md.lock:hover{transform:none;border-color:var(--hair);background:rgba(9,17,31,.55)}\
.cur .md.lock .mh,.cur .md.lock ul{opacity:.62}\
.cur .md .mh{display:flex;align-items:center;gap:14px}\
.cur .md .mh .tt{display:flex;flex-direction:column;gap:2px;min-width:0}\
.cur .md .mh small{font-size:12px;letter-spacing:.1em;color:var(--ac);font-weight:500}\
.cur .md .mh b{font-family:var(--ser);font-size:20px;font-weight:600;letter-spacing:-.03em;line-height:1.3}\
.cur .md ul{list-style:none;display:flex;flex-direction:column;gap:5px}\
.cur .md li{position:relative;padding-left:14px;font-size:13.5px;line-height:1.55;color:var(--t2)}\
.cur .md li::before{content:'';position:absolute;left:0;top:.7em;width:6px;height:1px;background:var(--ac)}\
.cur .md .ft{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;margin-top:auto;padding-top:10px;border-top:1px solid var(--hair);font-size:12.5px;color:var(--t3)}\
.cur .md .ch{margin-left:auto;font-size:11.5px;font-weight:500;letter-spacing:.04em;padding:2px 8px;border:1px solid currentColor}\
.cur .md .ch.go{color:var(--ac2)}.cur .md .ch.ok{color:var(--ok)}.cur .md .ch.lk{color:var(--t3)}\
.cur .md .cta{font-family:var(--ser);font-size:16px;font-weight:600;color:var(--tx);display:flex;align-items:center;gap:8px}\
.cur .md .cta svg{width:18px;height:18px;transition:transform .3s var(--e)}.cur .md:hover .cta svg{transform:translateX(4px)}\
.cur .ring{flex:none;width:52px;height:52px}.cur .ring circle{fill:none;stroke-width:3}.cur .ring .rt{stroke:rgba(242,239,232,.12)}.cur .ring .rf{stroke:var(--ac);transition:stroke-dashoffset 1.2s var(--e)}.cur .ring.ok .rf{stroke:var(--ok)}\
.cur .ring text{fill:var(--tx);font-family:var(--ser);font-weight:600;font-size:14px;text-anchor:middle}\
.cur .ring svg{display:block}\
.cur .cert{position:relative;margin-top:22px;max-width:760px;overflow:hidden}\
.cur .cert .pp{background:#F2EFE8;color:#121C2C;padding:clamp(22px,5vw,44px);border:1px solid #D9D3C4;box-shadow:inset 0 0 0 6px #F2EFE8,inset 0 0 0 7px #B9B19E;text-align:center;filter:blur(1.5px) grayscale(.5);opacity:.55}\
.cur .cert.open .pp{filter:none;opacity:1}\
.cur .cert .pp img{width:56px;height:56px;filter:invert(1) brightness(.35)}\
.cur .cert .pp .t1{margin-top:10px;font-size:12px;letter-spacing:.3em;color:#26457A}\
.cur .cert .pp .t2{margin-top:10px;font-family:var(--ser);font-size:clamp(26px,6vw,38px);font-weight:700;letter-spacing:-.03em}\
.cur .cert .pp .t3{margin-top:14px;font-size:15px;line-height:1.7;color:#3A4456}\
.cur .cert .pp .t4{margin-top:20px;display:flex;justify-content:space-between;gap:12px;font-size:12.5px;color:#5A6273;border-top:1px solid #CFC8B7;padding-top:12px}\
.cur .cert .lk{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:20px;background:rgba(9,17,31,.35)}\
.cur .cert .lk svg{width:34px;height:34px;color:var(--tx)}\
.cur .cert .lk b{font-family:var(--ser);font-size:20px;font-weight:600}.cur .cert .lk span{font-size:14px;color:var(--t2)}\
.cur .toast{position:fixed;left:50%;bottom:28px;z-index:8;transform:translate(-50%,20px);opacity:0;background:var(--tx);color:#0B1526;font-size:14px;padding:12px 18px;transition:opacity .3s,transform .4s var(--e);pointer-events:none;max-width:calc(100% - 44px);text-align:center}\
.cur .toast.show{opacity:1;transform:translate(-50%,0)}\
.cur .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}\
.cur .ctb{width:100%;margin-top:14px;border-collapse:collapse;table-layout:fixed;font-size:14px;line-height:1.55}\
.cur .ctb th,.cur .ctb td{text-align:left;vertical-align:top;padding:11px 12px 11px 0;border-bottom:1px solid var(--hair)}\
.cur .ctb thead th{font-family:var(--ser);font-size:18px;font-weight:600;color:var(--ac2);border-bottom-color:rgba(143,170,220,.5)}\
.cur .ctb tbody th{width:30%;font-weight:500;color:var(--tx);font-size:13px}\
.cur .ctb td{color:var(--tx)}\
.cur .ctb tbody tr.hid{display:none}.cur .ctb tbody{cursor:pointer}.cur .rvc{margin-top:8px}\
@media (min-width:700px){.cur .ctab{display:none}.cur .ctb tbody th{width:12%}}\
@media (max-width:699px){.cur .ctb thead{display:none}.cur .ctb[data-sel='0'] [data-c]:not([data-c='0']),.cur .ctb[data-sel='1'] [data-c]:not([data-c='1']),.cur .ctb[data-sel='2'] [data-c]:not([data-c='2']){display:none}}\
.cur .cx.wide{display:flex;flex-direction:column;gap:8px}\
.cur .sx{display:flex;flex-direction:column;margin-top:24px;border-top:1px solid var(--hair);max-width:1100px}\
.cur .sr{display:flex;flex-direction:column;gap:10px;padding:14px 0 14px 16px;border-bottom:1px solid var(--hair);position:relative;animation:curRise .6s var(--e) both}\
.cur .sr::before{content:'';position:absolute;left:0;top:16px;bottom:16px;width:2px;background:var(--hair);transition:background .3s}\
.cur .sr.act::before{background:var(--ac)}.cur .sr.ok::before{background:var(--ok)}.cur .sr.no::before{background:var(--no)}\
.cur .sr .ot{display:flex;flex-direction:column;gap:3px;min-width:0}\
.cur .sr small{font-size:11.5px;letter-spacing:.08em;color:var(--ac);font-weight:500}\
.cur .sr .lb{font-family:var(--ser);font-size:17px;font-weight:600;letter-spacing:-.025em;line-height:1.45}\
.cur .sr .vbt{margin-top:0}.cur .sr .fx{font-size:13px;color:var(--ok)}\
@media (min-width:900px){.cur .sr{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:24px}.cur .sr .lb{font-size:19px}.cur .sr .vbt button{min-width:110px}}\
/* 새 부품: 카드·한 줄씩 공개·괴리·리포트 지도·표 */\
.cur .vgo{min-height:44px}\
.cur .pts.lockp{display:none}.cur .pts.unl li{animation:curRise .6s var(--e) both}\
.cur .fcg{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}\
@media (min-width:700px){.cur .fcg{grid-template-columns:repeat(var(--n),minmax(0,1fr))}}\
.cur .fc{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-height:120px;padding:16px 16px 34px;border:1px solid var(--hair);background:rgba(9,17,31,.5);color:var(--tx);font:inherit;text-align:left;cursor:pointer;transition:border-color .25s,background .3s,transform .35s var(--e);animation:curRise .6s var(--e) both}\
.cur .fc:hover{border-color:var(--ac)}.cur .fc small{font-size:11.5px;letter-spacing:.08em;color:var(--ac);font-weight:500}\
.cur .fc b{font-family:var(--ser);font-size:21px;font-weight:600;letter-spacing:-.03em;line-height:1.3}\
.cur .fc .fq{font-size:14px;color:var(--t2);line-height:1.55}\
.cur .fc .fa{display:none;font-size:14.5px;line-height:1.65;color:var(--tx);border-top:1px solid var(--hair);padding-top:10px;margin-top:4px}\
.cur .fc .fa em{display:block;font-style:normal;font-family:var(--ser);font-weight:600;font-size:15px;margin-bottom:2px;color:var(--ac2)}.cur .fc .fa em.ok{color:var(--ok)}.cur .fc .fa em.no{color:var(--no)}\
.cur .fc i{position:absolute;left:16px;bottom:10px;font-style:normal;font-size:12px;color:var(--t3)}\
.cur .fc.open{background:rgba(38,69,122,.32);border-color:rgba(143,170,220,.6);cursor:default}.cur .fc.open .fa{display:block;animation:curRise .45s var(--e) both}.cur .fc.open i{display:none}.cur .fc.open{padding-bottom:16px}\
.cur .rvg{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}\
@media (min-width:700px){.cur .rvg{grid-template-columns:repeat(var(--n),minmax(0,1fr))}}\
.cur .rcol h4{font-family:var(--ser);font-size:19px;font-weight:600;letter-spacing:-.02em;color:var(--ac2);padding-bottom:8px;border-bottom:1px solid rgba(143,170,220,.5)}\
.cur .rcol.wm h4{color:var(--wm);border-bottom-color:rgba(232,201,160,.5)}.cur .rcol p{margin-top:6px;font-size:13px;color:var(--tx)}\
.cur .rcol ul,.cur .rvo{list-style:none;display:flex;flex-direction:column;min-height:20px}\
.cur .rvo{counter-reset:ri;border-top:1px solid var(--hair)}\
.cur .ri{display:flex;flex-direction:column;gap:3px;padding:11px 0 11px 14px;border-bottom:1px solid var(--hair);position:relative;animation:curRise .5s var(--e) both}\
.cur .ri::before{content:'';position:absolute;left:0;top:15px;width:6px;height:6px;border-radius:50%;background:var(--ac)}\
.cur .ri.ok::before{background:var(--ok)}.cur .ri.no::before{background:var(--no)}.cur .ri.wm::before{background:var(--wm)}\
.cur .rvo .ri{padding-left:34px;counter-increment:ri}.cur .rvo .ri::before{content:counter(ri);width:auto;height:auto;background:none;top:11px;font-family:var(--ser);font-weight:600;color:var(--ac2);font-size:15px}\
.cur .ri small{font-size:11.5px;letter-spacing:.06em;color:var(--ac);font-weight:500}.cur .ri.no small{color:var(--no)}.cur .ri.ok small{color:var(--ok)}\
.cur .ri b{font-family:var(--ser);font-size:16.5px;font-weight:600;letter-spacing:-.02em;line-height:1.45}.cur .ri span{font-size:14px;color:var(--t2);line-height:1.6}\
.cur .gk{display:flex;flex-direction:column;gap:10px}\
.cur .gb{display:grid;grid-template-columns:88px minmax(0,1fr) 44px;align-items:center;gap:10px;font-size:13.5px;color:var(--t2)}\
.cur .gb i{display:block;height:16px;background:var(--ac);transition:width .3s var(--e)}.cur .gb i.mk2{background:rgba(242,239,232,.55)}.cur .gb b{font-family:var(--ser);font-size:17px;color:var(--tx);text-align:right}\
.cur .gm{display:flex;flex-direction:column;gap:8px;margin-top:4px}\
.cur .gml{display:grid;grid-template-columns:120px minmax(0,1fr);gap:10px;align-items:center;font-size:13px;color:var(--t2)}\
.cur .gml span:last-child{display:flex;gap:4px;flex-wrap:wrap}.cur .gml em{font-style:normal;font-size:12.5px;padding:3px 8px;border:1px solid var(--hair);color:var(--t3);transition:all .25s}.cur .gml em.on{color:#0B1526;background:var(--wm);border-color:var(--wm)}\
.cur .gr{margin-top:12px;font-family:var(--ser);font-weight:600;font-size:17px}\
.cur .gt{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}@media (min-width:700px){.cur .gt{grid-template-columns:repeat(2,minmax(0,1fr))}}\
.cur .gn .vgo{width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:12px 14px;border:1px solid var(--ac);background:rgba(20,38,70,.6);color:var(--tx);font:inherit;text-align:left;cursor:pointer;transition:background .25s}\
.cur .gn .vgo small{font-size:11.5px;color:var(--ac);letter-spacing:.06em}.cur .gn .vgo b{font-family:var(--ser);font-size:16.5px;font-weight:600;line-height:1.4}.cur .gn .vgo.on{background:#26457A}\
.cur .gn .go{display:flex;gap:8px;padding:10px 4px 0;font-size:14.5px;line-height:1.65;color:var(--tx);animation:curRise .45s var(--e) both}.cur .gn .go span{color:var(--ac2)}\
.cur .gf{margin-top:6px;padding:14px 16px;border:1px solid rgba(169,216,188,.55);background:rgba(60,120,90,.16);animation:curRise .5s var(--e) both}.cur .gf b{font-family:var(--ser);font-size:16.5px;color:var(--ok)}.cur .gf p{margin-top:4px;font-size:14.5px;line-height:1.65}\
.cur .rmp{display:flex;flex-direction:column;gap:14px}\
.cur .rch{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}\
.cur .rch .vgo{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 12px;border:1px solid var(--hair);background:rgba(9,17,31,.45);color:var(--tx);font:inherit;text-align:left;cursor:pointer}\
.cur .rch .vgo small{font-size:11px;color:var(--t3)}.cur .rch .vgo b{font-family:var(--ser);font-size:16px;font-weight:600}.cur .rch .vgo.on{border-color:var(--wm);background:rgba(232,201,160,.12)}\
.cur .rsec{list-style:none;display:flex;flex-direction:column;gap:4px;padding:12px;background:#F2EFE8;color:#121C2C}\
.cur .rsec li{display:flex;flex-direction:column;padding:8px 10px;border-left:3px solid #CFC8B7;transition:background .3s,border-color .3s;font-size:13px;color:#5A6273}\
.cur .rsec li b{font-family:var(--ser);font-size:15px;color:#121C2C}\
.cur .rsec li.hl.good{background:#DCE6F7;border-left-color:#26457A}.cur .rsec li.hl.value{background:#F4E6D0;border-left-color:#B8862E}\
.cur .rwarn{font-size:14px;line-height:1.65;color:var(--wm);border-left:2px solid var(--wm);padding-left:12px;animation:curRise .5s var(--e) both}\
.cur .stg button{display:inline-flex;align-items:center;gap:6px;min-height:36px;font-size:13px;opacity:.55}.cur .stg button.on{opacity:1;background:rgba(9,17,31,.4)}.cur .stg .sw{width:10px;height:10px;display:inline-block}\
.cur .yrs button{min-width:56px}\
.cur .frw{max-width:100%;overflow:hidden}\
.cur .frt{width:100%;border-collapse:collapse;table-layout:fixed;font-size:14px;font-variant-numeric:tabular-nums}\
.cur .frt th,.cur .frt td{padding:9px 6px;border-bottom:1px solid var(--hair);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.cur .frt thead th{font-family:var(--ser);font-size:14px;color:var(--ac2);font-weight:600}.cur .frt thead th:first-child{font-family:inherit;font-size:11px;color:var(--t3);font-weight:300}\
.cur .frt tbody th{text-align:left;font-weight:500;color:var(--t2);font-size:13px;width:34%;white-space:normal}\
.cur .frt tr.hid{display:none}.cur .frt tr.hl td,.cur .frt tr.hl th{color:var(--tx);background:rgba(143,170,220,.10)}.cur .frt tr.sub td{color:var(--wm)}\
.cur .frt td.neg{color:var(--no)}.cur .frt td.fx{color:var(--wm);font-weight:500}\
@media (max-width:420px){.cur .frt{font-size:12.5px}.cur .frt th,.cur .frt td{padding:8px 3px}}\
/* M2 부품: 식 상자·산점도 버튼·밴드 구간·PER-DCF 표·타임라인·5단계 모형 */\
.cur .eqs{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:14px}\
.cur .eq{display:flex;flex-direction:column;gap:1px;padding:7px 10px;border:1px solid var(--hair);background:rgba(9,17,31,.45);min-width:0}\
.cur .eq small{font-size:11px;color:var(--t3);white-space:nowrap}.cur .eq b{font-family:var(--ser);font-size:16px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}\
.cur .eq.hl{border-color:var(--ac)}.cur .eq.wm b{color:var(--wm)}.cur .eq.ac{background:rgba(38,69,122,.55);border-color:var(--ac)}\
.cur .eqs i{font-style:normal;color:var(--t3);font-size:16px}\
.cur .pst button{display:inline-flex;align-items:center;gap:6px;min-height:40px;font-size:13.5px;font-variant-numeric:tabular-nums}.cur .pst button b{font-weight:500}\
.cur .pst button.offp{opacity:.5;text-decoration:line-through}\
.cur .brm button{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;text-align:left}.cur .brm button b{font-family:var(--ser);font-size:16px;color:var(--wm)}.cur .brm button.done{border-color:rgba(143,170,220,.5)}\
.cur .sqb button,.cur .rps button{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;text-align:left}.cur .sqb button b,.cur .rps button b{font-family:var(--ser);font-size:16px;color:var(--wm)}.cur .sqb button.done{border-color:rgba(143,170,220,.5)}\
.cur .brd{padding:10px 12px;border-left:2px solid var(--wm);background:rgba(232,201,160,.06)}\
.cur .pdt{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:12px;font-size:13px;font-variant-numeric:tabular-nums}\
.cur .pdt th,.cur .pdt td{padding:7px 2px;text-align:center;border:1px solid rgba(11,21,38,.9);white-space:nowrap;transition:outline-color .2s}\
.cur .pdt thead th{font-weight:500;color:var(--ac2);font-size:12px}.cur .pdt thead th:first-child{font-size:10px;color:var(--t3);font-weight:300;white-space:normal;line-height:1.3}\
.cur .pdt tbody th{font-weight:500;color:var(--t2);font-size:12px}\
.cur .pdt .rw,.cur .pdt .cl{color:var(--tx)}.cur .pdt td.on{outline:2px solid var(--wm);outline-offset:-2px;color:var(--wm);font-weight:600;font-family:var(--ser);font-size:15px}\
@media (max-width:420px){.cur .pdt{font-size:11.5px}.cur .pdt td.on{font-size:13px}}\
.cur .ftb button{display:inline-flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:1px;min-height:52px;padding:6px 14px;text-align:left}.cur .ftb button b{font-family:var(--ser);font-size:16px;font-weight:600}.cur .ftb button i{margin:0;font-size:11.5px}\
.cur .ftb button.done{border-color:rgba(143,170,220,.5)}\
.cur .ftd{display:grid;grid-template-columns:84px minmax(0,1fr);gap:6px 12px;margin-top:12px;font-size:14px;line-height:1.6;animation:curRise .45s var(--e) both}.cur .ftd dt{color:var(--ac);font-size:12.5px;font-weight:500;padding-top:2px}.cur .ftd dd{color:var(--tx)}\
.cur .pbs{display:flex;flex-direction:column;gap:12px}\
.cur .pbx{padding:10px 0 12px 14px;border-left:2px solid var(--ac);animation:curRise .5s var(--e) both}\
.cur .pbx h4{font-family:var(--ser);font-size:17px;font-weight:600;letter-spacing:-.02em}.cur .pbx .pq{margin-top:4px;font-size:13.5px;color:var(--t2);line-height:1.6}\
.cur .pbx .vctl{margin-top:8px}.cur .pbr{display:flex;flex-direction:column;margin-top:8px;font-size:14px;font-variant-numeric:tabular-nums}\
.cur .pbr div{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid var(--hair)}.cur .pbr span{color:var(--t2);min-width:0}.cur .pbr b{font-weight:500;white-space:nowrap}\
.cur .pbr .hl b{font-family:var(--ser);font-weight:600;font-size:16px;color:var(--ac2)}.cur .pbr .ok b{color:var(--ok)}.cur .pbr .no b{color:var(--no)}\
@media (prefers-reduced-motion:reduce){.cur *,.cur{animation:none!important;transition:none!important}.cur .sym *,.cur .vis .draw{stroke-dashoffset:0}}\
";

  var SY = {
    up: '<path d="M8 50l14-14 10 8 22-24"/><path d="M42 20h12v12"/>',
    down: '<path d="M8 18l14 14 10-8 22 24"/><path d="M42 48h12V36"/>',
    scale: '<path d="M32 10v44M14 54h36"/><path d="M12 20h40"/><path d="M12 20l-6 16h12zM52 20l-6 16h12z"/>',
    equal: '<path d="M14 24h36M14 40h36"/>',
    coin: '<circle cx="32" cy="32" r="22"/><path d="M22 24l5 18 5-14 5 14 5-18M20 31h24"/>',
    book: '<path d="M10 14h18c3 0 4 2 4 4v34c0-2-1-4-4-4H10z"/><path d="M54 14H36c-3 0-4 2-4 4v34c0-2 1-4 4-4h18z"/>',
    bars: '<path d="M12 52V12M12 52h40"/><path d="M20 44v-8M28 44V26M36 44V32M44 44V18"/>',
    people: '<circle cx="22" cy="22" r="7"/><path d="M9 50c2-11 24-11 26 0"/><circle cx="44" cy="26" r="6"/><path d="M38 40c6-4 16-2 18 10"/>',
    target: '<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="12"/><circle cx="32" cy="32" r="2"/>',
    search: '<circle cx="28" cy="28" r="16"/><path d="M40 40l14 14"/>'
  };
  var STAR = '<path d="M32 16c1 10 6 15 16 16-10 1-15 6-16 16-1-10-6-15-16-16 10-1 15-6 16-16z"/>';
  var ARR = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>';
  var CHK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
  var LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>';
  var GRADED = { choice: 1, multi: 1, numeric: 1, match: 1, chart: 1, sort: 1 };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function rich(s) { return esc(s).replace(/&lt;br&gt;/g, '<br>'); }
  // 글 문단: 빈 줄(\n\n)로 나눈 문단마다 <p>. 한 문단이면 그대로 <p class>
  function paras(t) { return String(t == null ? '' : t).split(/\n\s*\n/).map(function (x) { return '<p>' + sl(esc(x.trim())) + '</p>'; }).join(''); }

  // ── v2: 장식 덜기 (시안). .cur.v2 로 묶어 기존 규칙보다 우선 ──
  var CSS2 = [
    '.cur.v2{background:radial-gradient(120% 70% at 50% -10%,#13223A 0%,#0B1526 55%) fixed #0B1526;--t3:rgba(242,239,232,.6);--hair:rgba(242,239,232,.12)}',
    '.cur.v2 .cur-bg,.cur.v2 .cur-grain{display:none}',
    '.cur.v2 .cur-bar{background:var(--wm)}',
    '.cur.v2 .cur-top{background:linear-gradient(180deg,rgba(11,21,38,.97) 60%,rgba(11,21,38,0))}',
    '.cur.v2 .cur-wrap{padding-top:96px}',
    '@media (min-width:900px){.cur.v2 .cur-wrap{padding:104px var(--pad) 140px}}',
    '.cur.v2 .meta{font-size:14px;letter-spacing:.02em;color:var(--t3);font-weight:400;margin-bottom:14px}',
    '.cur.v2 .meta a:hover{color:var(--tx)}',
    '.cur.v2 .meta .sec{color:var(--t3)}',
    '.cur.v2 .mapx{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:0 0 40px;padding-bottom:16px;border-bottom:1px solid var(--hair);font-size:15px;color:rgba(242,239,232,.42);font-variant-numeric:tabular-nums}',
    '.cur.v2 .mapx .t{padding:3px 0;border-bottom:2px solid transparent;transition:color .3s,border-color .3s}',
    '.cur.v2 .mapx .t.done{color:var(--t3)}',
    '.cur.v2 .mapx .t.on{color:var(--tx);border-bottom-color:var(--wm)}',
    '.cur.v2 .mapx .res{color:var(--wm)}',
    '.cur.v2 .mapx .res.on{border-bottom:2px solid var(--wm);padding:3px 0}',
    '.cur.v2 .kd{border:0;padding:0;margin-bottom:12px;font-size:12.5px;letter-spacing:.06em;font-weight:500;color:var(--wm)}',
    '.cur.v2 .kd.rc{color:var(--ok)}',
    '.cur.v2 .q{text-shadow:none;font-weight:600;font-size:clamp(28px,7.4vw,34px);line-height:1.3;letter-spacing:-.025em;max-width:20em;text-wrap:balance}',
    '.cur.v2 .q.sm{font-size:clamp(26px,6.8vw,30px)}',
    '@media (min-width:900px){.cur.v2 .q{font-size:clamp(34px,2.7vw,42px);line-height:1.28}.cur.v2 .q.sm{font-size:clamp(30px,2.3vw,36px);line-height:1.3}}',
    '.cur.v2 .note{margin-top:20px;max-width:34em;font-size:17.5px;line-height:1.8}',
    '.cur b.kw{font-weight:700;color:#FFFFFF}',
    '@media (min-width:900px){.cur.v2 .note{font-size:18.5px}}',
    '.cur.v2 .pts:empty{display:none}',
    '.cur.v2 .pts.big li{font-size:clamp(18px,4.6vw,21px);padding:16px 0 16px 36px}',
    '@media (min-width:900px){.cur.v2 .pts.big li{font-size:22px}}',
    '.cur.v2 .defs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:32px;border-top:1px solid rgba(242,239,232,.2);max-width:780px}',
    '.cur.v2 .defs div{padding:18px 24px 18px 0;display:flex;flex-direction:column;gap:6px}',
    '.cur.v2 .defs div+div{padding-left:24px;border-left:1px solid var(--hair)}',
    '.cur.v2 .defs b{font-family:var(--ser);font-size:19px;font-weight:600;letter-spacing:-.02em}',
    '.cur.v2 .defs span{font-size:16px;line-height:1.65;color:var(--t3)}',
    '@media (max-width:640px){.cur.v2 .defs{grid-template-columns:minmax(0,1fr)}.cur.v2 .defs div+div{padding-left:0;border-left:0;border-top:1px solid var(--hair)}}',
    /* 선택지: 한 줄씩 */
    '.cur.v2 .L,.cur.v2 .L.picked{flex-direction:column;height:auto;margin:36px 0 0;max-width:780px;border-top:1px solid rgba(242,239,232,.2);background:none}',
    '.cur.v2 .o{flex:none;flex-direction:row;align-items:center;justify-content:flex-start;gap:16px;min-height:0;padding:16px 56px 16px 6px;border-bottom:1px solid var(--hair);box-shadow:none;overflow:visible}',
    '.cur.v2 .o+.o{box-shadow:none}',
    '.cur.v2 .o:first-child,.cur.v2 .o:last-child{padding-left:6px;padding-right:56px}',
    '.cur.v2 .o::before{left:0;right:0;top:0;bottom:0;width:auto;height:auto;z-index:-1;opacity:0;background:linear-gradient(90deg,rgba(143,170,220,.10),transparent 75%)!important;transition:opacity .25s}',
    '.cur.v2 .o:hover::before,.cur.v2 .o:focus-visible::before,.cur.v2 .o.on::before{opacity:1;top:0;bottom:0;height:auto}',
    '.cur.v2 .o.ok::before,.cur.v2 .o.ans::before{opacity:1;top:0!important;bottom:0!important;height:auto;background:linear-gradient(90deg,rgba(127,203,160,.14),transparent 75%)!important}',
    '.cur.v2 .o.no::before{opacity:1;top:0!important;bottom:0!important;height:auto;background:linear-gradient(90deg,rgba(232,169,169,.14),transparent 75%)!important}',
    '.cur.v2 .o:active{transform:none}',
    '.cur.v2 .o .sym,.cur.v2 .o .k{display:none}',
    '.cur.v2 .o .key{display:inline-grid;position:static;opacity:1;padding:0;place-items:center;flex:none;width:26px;height:26px;border:1px solid rgba(242,239,232,.28);border-radius:6px;font-size:12.5px;font-weight:500;color:var(--t3);transition:border-color .2s,color .2s}',
    '.cur.v2 .o:hover .key,.cur.v2 .o.on .key{border-color:var(--wm);color:var(--wm)}',
    '.cur.v2 .o.ok .key,.cur.v2 .o.ans .key{border-color:var(--ok);color:var(--ok)}.cur.v2 .o.no .key{border-color:var(--no);color:var(--no)}',
    '.cur.v2 .o .lb{font-family:inherit;font-size:18.5px;font-weight:400;letter-spacing:0;line-height:1.5}',
    '.cur.v2 .o .s{font-size:14.5px;color:var(--t3)}',
    '.cur.v2 .o .mk{right:8px;border-radius:4px}',
    '.cur.v2 .L.picked .o:not(.on):not(.ans){opacity:.35}',
    /* 코스 홈: R.F.S. 페이지 문법(사진 히어로 + 큰 세리프, About 숫자 띠, History 타임라인, Fund 카드) */
    '.cur-wrap.home{padding-bottom:0}',
    '.cur.v2[data-view="home"] .cur-bg{display:block;animation:none;transform:none}',
    '.cur.v2[data-view="home"] .cur-bg::after{background:linear-gradient(180deg,rgba(11,21,36,.55),rgba(11,21,36,.35) 40%,rgba(11,21,36,.92) 90%,#0B1524)}',
    '.cur .hx{padding:clamp(80px,16vh,180px) 0 56px}',
    '.cur .hx .lb,.cur .rx .lb,.cur .cx .lb{margin:0 0 16px;font-size:13px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:rgba(247,246,243,.85)}',
    '.cur .hx h1{margin:0;font-family:var(--ser);font-weight:700;font-size:clamp(52px,6vw,84px);line-height:1;letter-spacing:-.035em;color:#F7F6F3;text-shadow:0 1px 2px rgba(4,8,16,.35),0 6px 28px rgba(4,8,16,.45)}',
    '.cur .hx .ld{margin:22px 0 0;max-width:40em;font-size:17px;line-height:1.85;color:#F7F6F3}',
    '.cur .sts{display:flex;flex-wrap:wrap;gap:28px clamp(36px,6vw,96px);margin-top:56px;padding-top:28px;border-top:1px solid rgba(247,246,243,.35)}',
    '.cur .sts b{display:block;font-family:var(--ser);font-weight:700;font-size:clamp(34px,3.4vw,52px);line-height:1;letter-spacing:-.03em;color:#F7F6F3}',
    '.cur .sts b small{font-size:.5em;font-weight:400}',
    '.cur .sts span{display:block;margin-top:10px;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#F7F6F3}',
    '.cur .rx,.cur .cx{position:relative;margin:0 calc(-1 * var(--pad));padding:88px var(--pad) 72px;background:#0F1B2E}',
    '.cur .cx{background:#0B1524;padding-bottom:120px}',
    '.cur .tl{list-style:none;margin:40px 0 0;padding:0;display:grid;grid-template-columns:repeat(10,minmax(0,1fr))}',
    '.cur .tl button{all:unset;cursor:pointer;display:block;width:100%;box-sizing:border-box;padding-right:10px;color:#F7F6F3}',
    '.cur .tl button:focus-visible{outline:2px solid #8FAADC;outline-offset:6px}',
    '.cur .tl .eb{display:block;height:14px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}',
    '.cur .tl .cd{display:block;margin-top:14px;font-family:var(--ser);font-weight:700;font-size:clamp(28px,2.6vw,40px);line-height:1;letter-spacing:-.03em;transition:color .2s}',
    '.cur .tl .ln{display:block;position:relative;height:1px;margin:22px -10px 0 0;border-top:1px solid rgba(247,246,243,.35)}',
    '.cur .tl .ln i{position:absolute;left:0;top:-6px;width:11px;height:11px;background:#0F1B2E;box-shadow:inset 0 0 0 1px #F7F6F3;outline:3px solid #0F1B2E}',
    '.cur .tl li.done .ln i{background:#F7F6F3;box-shadow:none}',
    '.cur .tl li.now .ln i{background:#8FAADC;box-shadow:none}',
    '.cur .tl li.now .cd,.cur .tl li:hover .cd{color:#8FAADC}',
    '.cur .tl .tt{display:block;margin-top:22px;font-size:15px;font-weight:700;line-height:1.45;word-break:keep-all}',
    '.cur .tl li.sel .tt{text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:1px}',
    '.cur .tl li.lock{opacity:.5}',
    '.cur .mc{margin-top:64px;background:#0B1524;box-shadow:0 0 0 1px rgba(247,246,243,.18)}',
    '.cur .mc .hd{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding:30px 36px 28px;background:#203864}',
    '.cur .mc .hd small{display:block;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#F7F6F3}',
    '.cur .mc .hd h2{margin:12px 0 8px;font-family:var(--ser);font-weight:700;font-size:30px;line-height:1.2;letter-spacing:-.02em;color:#F7F6F3}',
    '.cur .mc .hd p{margin:0;font-size:16px;color:#F7F6F3}',
    '.cur .mc .hd img{width:58px;height:58px;flex:none}',
    '.cur .mc .bd{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:48px;padding:32px 36px 36px}',
    '.cur .mc h4{margin:0 0 14px;font-size:11px;font-weight:600;letter-spacing:.14em;color:#F7F6F3}',
    '.cur .mc .fx{display:flex;flex-wrap:wrap;align-items:center;gap:10px;min-height:48px}',
    '.cur .mc .fx .c{padding:14px 16px;font-family:var(--ser);font-weight:700;font-size:18px;line-height:1;white-space:nowrap;color:#F7F6F3;box-shadow:inset 0 0 0 1px rgba(247,246,243,.35)}',
    '.cur .mc .fx .op{font-size:18px;color:#F7F6F3}',
    '.cur .mc .fx .c.res{background:#F7F6F3;color:#0B1524;box-shadow:none}',
    '.cur .mc .ob{list-style:none;margin:0;padding:0;border-top:1px solid rgba(247,246,243,.18)}',
    '.cur .mc .ob li{padding:12px 0;border-bottom:1px solid rgba(247,246,243,.18);font-size:15px;line-height:1.6;color:#F7F6F3}',
    '.cur .mc .ft{display:flex;align-items:center;flex-wrap:wrap;gap:24px;margin-top:28px}',
    '.cur .mc .go{display:inline-flex;align-items:center;gap:10px;padding:14px 26px;border:0;background:#F7F6F3;color:#0B1524;font:700 14px inherit;font-family:inherit;cursor:pointer}',
    '.cur .mc .go:disabled{opacity:.5;cursor:default}',
    '.cur .mc .go svg{width:16px;height:16px}',
    '.cur .mc .mt{font-size:13.5px;color:#F7F6F3}',
    '@media (max-width:980px){.cur .tl{grid-template-columns:repeat(5,minmax(0,1fr));row-gap:40px}.cur .mc .bd{grid-template-columns:minmax(0,1fr)}}',
    '@media (max-width:560px){.cur .tl{grid-template-columns:repeat(2,minmax(0,1fr))}.cur .mc .hd,.cur .mc .bd{padding-left:20px;padding-right:20px}.cur .mc .hd img{display:none}}',
    '.cur.v2 .hm .ey{color:var(--t3);letter-spacing:.08em;font-weight:400}',
    '.cur.v2 .hm h1{font-size:clamp(36px,8.6vw,60px);font-weight:600;letter-spacing:-.035em;line-height:1.15;text-shadow:none}',
    '.cur.v2 .hm .lead{max-width:36em;font-size:17.5px}',
    '.cur.v2 .hm .stt b{font-size:20px}',
    '.cur.v2 .hm h2{margin-top:72px;font-size:clamp(22px,5vw,28px)}',
    '.cur.v2 .md{border-color:var(--hair);background:rgba(255,255,255,.015);border-radius:8px;transition:border-color .25s,background .25s}',
    '.cur.v2 button.md:hover{border-color:rgba(242,239,232,.3);background:rgba(255,255,255,.03)}',
    '.cur.v2 .md .ch{border:0;padding:0}',
    '.cur.v2 .md .ft .lb{border-radius:4px;color:var(--wm);border-color:rgba(226,196,143,.4)}',
    '.cur.v2 .fmap{display:flex;align-items:stretch;flex-wrap:wrap;gap:8px 6px;margin-top:8px;max-width:980px}',
    '.cur.v2 .fmap .c{flex:1 1 0;min-width:112px;padding:14px 14px 16px 0;border-top:2px solid rgba(242,239,232,.2);display:flex;flex-direction:column;gap:8px}',
    '.cur.v2 .fmap .c b{font-family:var(--ser);font-weight:600;font-size:19px;letter-spacing:-.02em}',
    '.cur.v2 .fmap .c small{font-size:15px;line-height:1.55;color:var(--t3);text-wrap:balance}',
    '.cur.v2 .fmap .c.on{border-top-color:var(--wm)}',
    '.cur.v2 .fmap .c.res{flex:0 0 auto;min-width:80px}.cur.v2 .fmap .c.res b{color:var(--wm)}',
    '.cur.v2 .fmap .op{padding-top:14px;width:16px;text-align:center;font-size:18px;color:var(--t3)}',
    '@media (max-width:640px){.cur.v2 .fmap{flex-direction:column;gap:0}.cur.v2 .fmap .op{display:none}.cur.v2 .fmap .c{border-top-width:1px;padding:12px 0;min-width:0}}',
    '.cur.v2 .note,.cur.v2 .note p,.cur.v2 .pts li,.cur.v2 .ex,.cur.v2 .ex p,.cur.v2 .defs span,.cur.v2 .o .lb,.cur.v2 .o .s,.cur.v2 .hm .lead{text-wrap:pretty}',
    '.cur.v2 p.src{margin-top:auto;padding-top:28px;font-size:13.5px;line-height:1.6;color:rgba(242,239,232,.45);max-width:60em}',
    /* 다음 버튼: 알약 */
    '.cur.v2 .nx{border-radius:999px;font-weight:500}',
    '@media (min-width:900px){.cur.v2 .nx{right:var(--pad);bottom:40px;height:auto;padding:12px 22px;background:var(--tx)!important;color:#0B1526;font-family:inherit;font-size:15.5px;font-weight:500;box-shadow:none}.cur.v2 .nx.alt{background:var(--wm)!important;color:#0B1526;box-shadow:none}}'
  ].join('\n');

  // 문장마다 줄을 바꾸고, **핵심 구절**은 굵게(화면마다 그 화면의 요점 한 곳)
  function sl(h) { return String(h).replace(/\*\*(.+?)\*\*/g, '<b class="kw">$1</b>').replace(/([.?!])\s+(?=[^\s)])/g, '$1<br>'); }
  function block(t, cls) { var ps = String(t == null ? '' : t).split(/\n\s*\n/); return ps.length < 2 ? '<p class="' + cls + '">' + sl(esc(t)) + '</p>' : '<div class="' + cls + '">' + paras(t) + '</div>'; }
  function plain(s) { return String(s || '').replace(/<br>/g, ' '); }
  function sym(k) { return '<svg class="sym" viewBox="0 0 64 64" aria-hidden="true">' + (SY[k] || STAR).replace(/<(path|circle)/g, '<$1 pathLength="1"') + '</svg>'; }
  function pad(i) { return (i < 9 ? '0' : '') + (i + 1); }
  function qs(k) { var m = new RegExp('[?&]' + k + '(=([^&]*))?').exec(location.search); return m ? decodeURIComponent(m[2] || '1') : null; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function fmt(n) { return Math.round(n).toLocaleString('ko-KR'); }
  function pc(x) { return (x >= 0 ? '+' : '−') + Math.abs(Math.round(x * 100)) + '%'; }
  function f1(x) { return (Math.round(x * 10) / 10).toString(); }
  function wOf(host) { return Math.max(260, Math.floor(host.clientWidth || 320)); }
  function still() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function pathOf(pts) { return 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('L'); }

  var st = null;

  // ══ 그래프 부품 ════════════════════════════════════════
  // VIS[name](host, params, ctx) → { draw(), check?() → { right, detail }, reveal?(right, showAnswer), key?(n) }
  // ctx: { mode: 'concept' | 'question', ready(bool) }
  // 플러그인: 모듈 JSON의 "vis": ["vis/m5.js"] 스크립트가 window.CUR_VIS에 부품을 더한다 (harness/PLUGIN.md)
  var VIS = window.CUR_VIS = window.CUR_VIS || {};
  // flowMap: 모듈 계산식 소개 (모듈 JSON의 map.items[].q = 칸마다 정할 질문). params.on = 지금 항목(선택)
  VIS.flowMap = function (host, p, ctx) {
    var mp = (ctx && ctx.mod && ctx.mod.map) || {}, it = mp.items || [], on = p.on || '';
    host.innerHTML = '<div class="fmap" role="img" aria-label="' + esc(mp.label || '') + '">' + it.map(function (x) {
      return (x.op ? '<span class="op" aria-hidden="true">' + esc(x.op) + '</span>' : '') + '<div class="c' + (on && (x.k === on || x.with === on) ? ' on' : '') + '"><b>' + esc(x.t) + '</b>' + (x.q ? '<small>' + esc(x.q) + '</small>' : '') + '</div>';
    }).join('') + (mp.res ? '<span class="op" aria-hidden="true">=</span><div class="c res"><b>' + esc(mp.res) + '</b></div>' : '') + '</div>';
    return { draw: function () {} };
  };

  // (a) 가격 vs 가치: 가격선이 가치선 주변을 출렁인다. 질문 모드에선 살 점을 고른다
  VIS.priceValue = function (host, p, ctx) {
    var N = p.months || 60, need = (ctx.answer && ctx.answer.discountAtLeast) || ctx.tolerance || 0.1, Q = ctx.mode === 'question';
    var pick = null, locked = false, showAns = false, first = true, G = {};
    function v(t) { return 100 * Math.pow(1.0075, t) * (1 + 0.025 * Math.sin(t / 13)); }
    function pr(t) { return v(t) * (1 + 0.22 * Math.sin(t / 6.4 + 0.5) + 0.06 * Math.sin(t / 2.2 + 1.3)); }
    var tmin = 0, tmax = 0;
    for (var t0 = 0; t0 <= N; t0++) { var d0 = pr(t0) / v(t0); if (d0 < pr(tmin) / v(tmin)) tmin = t0; if (d0 > pr(tmax) / v(tmax)) tmax = t0; }
    host.innerHTML = '<svg role="img" aria-label="A사 5년 가격과 추정 가치 그래프 (예시). 실선 가격이 점선 가치 위아래로 출렁이며, 위는 고평가 구간, 아래는 저평가 구간"></svg>' +
      (Q ? '<p class="vr" aria-live="polite">그래프를 눌러 살 시점을 고르세요.</p>' : '<p class="vcap">실선 가격 · 점선 가치(추정) · 빨강 고평가 · 초록 저평가 (예시)</p>');
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr');
    function draw() {
      var w = wOf(host), h = Math.round(clamp(w * 0.58, 250, 400)), m = { l: 38, r: 12, t: 34, b: 28 };
      var iw = w - m.l - m.r, ih = h - m.t - m.b, ts = [], lo = 1e9, hi = -1e9;
      for (var i = 0; i <= N * 4; i++) { var t = i / 4; ts.push(t); lo = Math.min(lo, pr(t), v(t)); hi = Math.max(hi, pr(t), v(t)); }
      lo *= 0.9; hi *= 1.03;
      var X = function (t) { return m.l + iw * t / N; }, Y = function (y) { return m.t + ih * (1 - (y - lo) / (hi - lo)); };
      G = { X: X, Y: Y, m: m, iw: iw };
      var s = '', run = [], sign = null;
      var flush = function () {
        if (run.length > 1) s += '<polygon class="' + (sign > 0 ? 'zo' : 'zu' + (showAns ? ' hl' : '')) + '" points="' + run.map(function (t) { return X(t).toFixed(1) + ',' + Y(pr(t)).toFixed(1); }).concat(run.slice().reverse().map(function (t) { return X(t).toFixed(1) + ',' + Y(v(t)).toFixed(1); })).join(' ') + '"/>';
      };
      ts.forEach(function (t) { var sg = pr(t) >= v(t) ? 1 : -1; if (sign !== null && sg !== sign) { run.push(t); flush(); run = [t]; } else run.push(t); sign = sg; });
      flush();
      var g = '';
      for (var k = 0; k <= 3; k++) { var yv = lo + (hi - lo) * k / 3; g += '<line class="gl" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(yv) + '" y2="' + Y(yv) + '"/><text x="' + (m.l - 6) + '" y="' + (Y(yv) + 4) + '" text-anchor="end">' + Math.round(yv) + '</text>'; }
      for (var yr = 1; yr <= 5; yr++) g += '<text x="' + X(yr * 12) + '" y="' + (h - 8) + '" text-anchor="' + (yr === 5 ? 'end' : 'middle') + '">' + yr + '년</text>';
      var lg = '<g transform="translate(' + m.l + ',' + 12 + ')"><line x1="0" x2="18" y1="0" y2="0" class="lp"/><text x="24" y="4" class="tt">가격</text><line x1="64" x2="82" y1="0" y2="0" class="lv"/><text x="88" y="4" class="tt">가치(추정)</text></g><text x="' + (w - m.r) + '" y="16" text-anchor="end">(예시)</text>';
      var zl = '<text x="' + clamp(X(tmax), m.l + 24, w - 30) + '" y="' + (Y(pr(tmax)) - 10) + '" text-anchor="middle" class="tno">고평가</text>' + (showAns ? '' : '<text x="' + clamp(X(tmin), m.l + 24, w - 30) + '" y="' + (Y(pr(tmin)) + 20) + '" text-anchor="middle" class="tok">저평가</text>');
      var pp = ts.map(function (t) { return [X(t), Y(pr(t))]; }), vp = ts.map(function (t) { return [X(t), Y(v(t))]; });
      var anim = first && !still() ? ' draw" pathLength="1' : '';
      var mk = '';
      if (pick != null) {
        var px = X(pick), py = Y(pr(pick)), ok = (v(pick) - pr(pick)) / v(pick) >= need;
        var col = locked ? (ok ? 'var(--ok)' : 'var(--no)') : 'var(--wm)';
        mk = '<line x1="' + px + '" x2="' + px + '" y1="' + m.t + '" y2="' + (h - m.b) + '" stroke="' + col + '" stroke-dasharray="3 3"/><circle cx="' + px + '" cy="' + Y(v(pick)) + '" r="4" fill="var(--ac)"/><circle cx="' + px + '" cy="' + py + '" r="7" fill="' + col + '" stroke="#0B1526" stroke-width="2"/>';
      }
      if (showAns) mk += '<circle cx="' + X(tmin) + '" cy="' + Y(pr(tmin)) + '" r="11" fill="none" stroke="var(--ok)" stroke-width="2"/><text x="' + (X(tmin) + 16) + '" y="' + (Y(pr(tmin)) + 4) + '" class="tok">저평가 · 여기쯤이 좋아요</text>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h);
      svg.innerHTML = g + s + '<path class="lv' + anim + '" d="' + pathOf(vp) + '"/><path class="lp' + anim + '" d="' + pathOf(pp) + '"/>' + zl + lg + mk + (Q && !locked ? '<rect class="hit" x="' + m.l + '" y="' + m.t + '" width="' + iw + '" height="' + ih + '"/>' : '');
      first = false;
    }
    function setT(t) {
      pick = clamp(Math.round(t), 0, N); draw();
      if (vr) vr.innerHTML = '<b>' + (Math.floor(pick / 12)) + '년 ' + (pick % 12) + '개월</b> · 가격 ' + Math.round(pr(pick)) + ' · 가치 ' + Math.round(v(pick)) + ' (예시)';
      ctx.ready(true);
    }
    if (Q) {
      var down = false;
      var at = function (e) { var r = svg.getBoundingClientRect(); setT((e.clientX - r.left - G.m.l) / G.iw * N); };
      svg.style.touchAction = 'pan-y';
      svg.addEventListener('pointerdown', function (e) { if (locked) return; down = true; at(e); });
      svg.addEventListener('pointermove', function (e) { if (down && !locked) at(e); });
      window.addEventListener('pointerup', function () { down = false; });
      host.tabIndex = 0; host.setAttribute('role', 'slider'); host.setAttribute('aria-label', '살 시점 고르기. 왼쪽 오른쪽 화살표로 이동'); host.setAttribute('aria-valuemin', 0); host.setAttribute('aria-valuemax', N);
      host.addEventListener('keydown', function (e) {
        if (locked) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); setT((pick == null ? N / 2 : pick) + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 6 : 1)); host.setAttribute('aria-valuenow', pick); }
      });
      host.__test = function (k) { var r = svg.getBoundingClientRect(), t = k === 'under' ? tmin : tmax; return { x: r.left + G.X(t), y: r.top + G.Y(pr(t)) }; };
    }
    return {
      draw: draw,
      check: function () { var d = (v(pick) - pr(pick)) / v(pick); return { right: d >= need, detail: '고른 점은 가격이 가치보다 ' + Math.abs(Math.round(d * 100)) + '% ' + (d >= 0 ? '낮아요.' : '높아요.') }; },
      reveal: function (right, ans) { locked = true; showAns = ans || right; draw(); }
    };
  };

  // (b) PER 밴드: EPS × 8·12·16배 선 위의 주가. 슬라이더로 배수를 바꾸면 그 배수의 가격선이 움직인다
  VIS.perBand = function (host, p, ctx) {
    var Q = ctx.mode === 'question', B = p.bands || [8, 12, 16], k = p.start || 10, pick = null, locked = false, showAns = false, G = {};
    var MU = [11.0, 12.2, 13.6, 14.8, 15.6, 15.1, 13.8, 12.0, 10.2, 9.1, 8.6, 9.4, 10.8, 12.1, 13.0, 12.6, 12.9, 13.8, 14.2, 13.9, 13.5], N = MU.length - 1;
    function eps(t) { return 1000 + 45 * t - 110 * Math.exp(-Math.pow(t - 9, 2) / 5); }
    function price(t) { return eps(t) * MU[t]; }
    var nowP = price(N), nowE = eps(N), nowM = nowP / nowE;
    var names = [B[0] + '배 아래', B[0] + '~' + B[1] + '배', B[1] + '~' + B[2] + '배', B[2] + '배 위'];
    host.innerHTML = '<svg role="img" aria-label="B사 5년 주가와 EPS 곱하기 ' + B.join('·') + '배 밴드 (예시)"></svg>' +
      '<div class="vctl"><label for="curK">PER <b>' + f1(k) + '</b>배</label><input id="curK" type="range" min="' + (p.min || 4) + '" max="' + (p.max || 24) + '" step="0.5" value="' + k + '" aria-label="PER 배수"></div>' +
      '<p class="vr" aria-live="polite"></p>' +
      (Q ? '<div class="vbt" role="radiogroup" aria-label="지금 주가가 있는 밴드">' + names.map(function (n, i) { return '<button type="button" role="radio" aria-checked="false" data-b="' + i + '">' + n + '<i>' + (i + 1) + '</i></button>'; }).join('') + '</div>' : '');
    var svg = host.querySelector('svg'), sl = host.querySelector('input'), lb = host.querySelector('label b'), vr = host.querySelector('.vr');
    function read() { vr.innerHTML = 'PER ' + f1(k) + '배로 보면 지금 가격은 EPS ' + fmt(nowE) + '원 × ' + f1(k) + ' = <b>' + fmt(nowE * k) + '원</b> (예시)'; }
    function draw() {
      var w = wOf(host), h = Math.round(clamp(w * 0.6, 260, 400)), m = { l: 46, r: 40, t: 18, b: 28 }, iw = w - m.l - m.r, ih = h - m.t - m.b;
      var top = eps(N) * (B[2] + 4), X = function (t) { return m.l + iw * t / N; }, Y = function (y) { return m.t + ih * (1 - y / top); };
      var line = function (mul) { var a = []; for (var t = 0; t <= N; t++) a.push([X(t), Y(eps(t) * mul)]); return a; };
      var band = function (a, b, i) {
        var lo = line(a), hi = b ? line(b) : [[X(0), m.t], [X(N), m.t]];
        var cls = i === pick ? 'rgba(232,201,160,.28)' : (showAns && i === ctx.answer ? 'rgba(169,216,188,.3)' : (i === 1 ? 'rgba(143,170,220,.10)' : i === 2 ? 'rgba(143,170,220,.2)' : 'rgba(242,239,232,.02)'));
        return '<polygon data-b="' + i + '" fill="' + cls + '" points="' + lo.concat(hi.slice().reverse()).map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '"' + (Q && !locked ? ' style="cursor:pointer"' : '') + '/>';
      };
      var s = band(0, B[0], 0) + band(B[0], B[1], 1) + band(B[1], B[2], 2) + band(B[2], 0, 3);
      for (var j = 0; j < 4; j++) { var yv = top * j / 3; s += '<line class="gl" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(yv) + '" y2="' + Y(yv) + '"/><text x="' + (m.l - 6) + '" y="' + (Y(yv) + 4) + '" text-anchor="end">' + (yv ? fmt(yv / 1000) + 'k' : '0') + '</text>'; }
      B.forEach(function (b) { s += '<path d="' + pathOf(line(b)) + '" fill="none" stroke="rgba(143,170,220,.55)" stroke-width="1"/><text x="' + (w - m.r + 4) + '" y="' + (Y(eps(N) * b) + 4) + '" class="ta">' + b + '배</text>'; });
      for (var yr = 1; yr <= 5; yr++) s += '<text x="' + X(yr * 4) + '" y="' + (h - 8) + '" text-anchor="' + (yr === 5 ? 'end' : 'middle') + '">' + yr + '년</text>';
      var pp = []; for (var t = 0; t <= N; t++) pp.push([X(t), Y(price(t))]);
      s += '<path d="' + pathOf(line(k)) + '" fill="none" stroke="var(--wm)" stroke-width="1.6" stroke-dasharray="5 4"/>';
      s += '<path class="lp" d="' + pathOf(pp) + '"/>';
      s += '<circle cx="' + X(N) + '" cy="' + Y(nowP) + '" r="6" fill="#F2EFE8" stroke="#0B1526" stroke-width="2"/><text x="' + (X(N) - 10) + '" y="' + (Y(nowP) - 12) + '" text-anchor="end" class="tt">지금 ' + fmt(nowP) + '원</text>';
      s += '<text x="' + m.l + '" y="' + (m.t + 12) + '">주가(원) · (예시)</text>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = s;
      G = { h: h };
    }
    function setK(x) { k = clamp(x, +(sl.min), +(sl.max)); sl.value = k; lb.textContent = f1(k); read(); draw(); }
    function choose(i) {
      if (locked || !Q) return; pick = i;
      host.querySelectorAll('.vbt button').forEach(function (b) { var on = +b.getAttribute('data-b') === i; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      draw(); ctx.ready(true);
    }
    sl.oninput = function () { setK(+sl.value); };
    sl.addEventListener('keydown', function (e) { e.stopPropagation(); });
    if (Q) {
      host.querySelectorAll('.vbt button').forEach(function (b) { b.onclick = function () { choose(+b.getAttribute('data-b')); }; });
      svg.addEventListener('click', function (e) { var b = e.target.getAttribute && e.target.getAttribute('data-b'); if (b != null) choose(+b); });
    }
    read();
    return {
      draw: draw, key: function (n) { if (n >= 1 && n <= 4) choose(n - 1); },
      check: function () { return { right: pick === ctx.answer, detail: '고른 밴드: ' + names[pick] + '.' }; },
      reveal: function (right, ans) {
        locked = true; showAns = ans || right;
        host.querySelectorAll('.vbt button').forEach(function (b) { var i = +b.getAttribute('data-b'); if (i === pick) b.classList.add(right ? 'ok' : 'no'); if (showAns && i === ctx.answer) b.classList.add('ok'); b.disabled = true; });
        if (showAns) { setK(Math.round(nowM * 2) / 2); vr.innerHTML += '<br>지금 PER = ' + fmt(nowP) + ' ÷ ' + fmt(nowE) + ' ≈ <b>' + f1(nowM) + '배</b>'; } else draw();
      }
    };
  };

  // (c) 절대 vs 상대: 왼쪽은 미래 현금이 할인되어 '오늘'로 모이고, 오른쪽은 비슷한 회사 배수가 모여 중간값을 만든다
  VIS.absRel = function (host, p) {
    var CF = p.cf || [100, 110, 120, 130, 140], r = p.rate || 0.1, PEERS = p.peers || [['B사', 9], ['C사', 11], ['D사', 12], ['E사', 14]], E = p.eps || 40;
    var PV = CF.map(function (c, i) { return c / Math.pow(1 + r, i + 1); }), SUM = PV.reduce(function (a, b) { return a + b; }, 0);
    var ms = PEERS.map(function (x) { return x[1]; }).sort(function (a, b) { return a - b; }), MED = (ms[1] + ms[2]) / 2, REL = E * MED;
    host.innerHTML = '<svg role="img" aria-label="왼쪽: 5년 현금흐름 ' + CF.join(', ') + '을 할인율 ' + Math.round(r * 100) + '%로 할인하면 오늘 가치 ' + Math.round(SUM) + '. 오른쪽: 비슷한 회사 PER 중간값 ' + MED + '배 곱하기 EPS ' + E + ' = ' + Math.round(REL) + ' (예시)"></svg><button type="button" class="mini rp">다시 보기</button>';
    var svg = host.querySelector('svg'), ph = 1, t0 = 0, raf = 0;
    function ease(x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); }
    function render() {
      var w = wOf(host), side = w >= 640, pw = side ? (w - 24) / 2 : w, H = side ? 300 : 270, h = side ? H : H * 2 + 24, s = '';
      // 왼쪽 패널
      var ox = 0, oy = 0, base = oy + H - 34, sc = (H - 110) / (SUM * 1.05), cw = (pw - 20) / 6, bw = Math.min(30, cw * 0.55);
      var cx = function (i) { return ox + 10 + cw * i + cw / 2; };
      s += '<rect x="' + ox + '" y="' + oy + '" width="' + pw + '" height="' + H + '" fill="rgba(242,239,232,.03)" stroke="rgba(242,239,232,.12)"/>';
      s += '<text x="' + (ox + 14) + '" y="' + (oy + 26) + '" class="th">절대가치 · DCF</text><text x="' + (ox + 14) + '" y="' + (oy + 44) + '">미래 현금을 할인율 ' + Math.round(r * 100) + '%로 오늘 가치로 (예시)</text>';
      s += '<line class="ax" x1="' + (ox + 10) + '" x2="' + (ox + pw - 10) + '" y1="' + base + '" y2="' + base + '"/>';
      for (var i = 0; i <= 5; i++) s += '<text x="' + cx(i) + '" y="' + (base + 18) + '" text-anchor="middle"' + (i ? '' : ' class="ta"') + '>' + (i ? i + '년' : '오늘') + '</text>';
      var a = ease(ph / 0.22), stack = 0;
      CF.forEach(function (c, j) {
        var i = j + 1, hh = c * sc;
        s += '<rect x="' + (cx(i) - bw / 2) + '" y="' + (base - hh) + '" width="' + bw + '" height="' + hh + '" fill="rgba(242,239,232,.07)" stroke="rgba(242,239,232,.45)" opacity="' + a + '"/>';
        s += '<text x="' + cx(i) + '" y="' + (base - hh - 6) + '" text-anchor="middle" opacity="' + a + '">' + c + '</text>';
        var q = ease((ph - 0.25 - 0.1 * j) / 0.3), ch = (c + (PV[j] - c) * q) * sc, x = cx(i) + (cx(0) - cx(i)) * q, yTop0 = base - hh, yTop1 = base - (stack + PV[j]) * sc;
        if (q > 0) s += '<rect x="' + (x - bw / 2) + '" y="' + (yTop0 + (yTop1 - yTop0) * q) + '" width="' + bw + '" height="' + ch + '" fill="rgba(143,170,220,.85)" stroke="#0B1526"/>';
        stack += PV[j];
      });
      var sa = ease((ph - 0.82) / 0.15);
      s += '<text x="' + (cx(0) + bw / 2 + 6) + '" y="' + (base - SUM * sc + 14) + '" class="th" opacity="' + sa + '">' + Math.round(SUM) + '</text><text x="' + (cx(0) + bw / 2 + 6) + '" y="' + (base - SUM * sc + 30) + '" opacity="' + sa + '">현재가치 합</text>';
      // 오른쪽 패널
      var rx = side ? pw + 24 : 0, ry = side ? 0 : H + 24, lx0 = rx + 26, lx1 = rx + pw - 26, ly = ry + H * 0.56;
      var LX = function (mu) { return lx0 + (lx1 - lx0) * (mu - 6) / 10; };
      s += '<rect x="' + rx + '" y="' + ry + '" width="' + pw + '" height="' + H + '" fill="rgba(242,239,232,.03)" stroke="rgba(242,239,232,.12)"/>';
      s += '<text x="' + (rx + 14) + '" y="' + (ry + 26) + '" class="th">상대가치 · 멀티플</text><text x="' + (rx + 14) + '" y="' + (ry + 44) + '">비슷한 회사들의 PER을 빌려 와요 (예시)</text>';
      s += '<line class="ax" x1="' + lx0 + '" x2="' + lx1 + '" y1="' + ly + '" y2="' + ly + '"/>';
      for (var mu = 6; mu <= 16; mu += 2) s += '<line class="ax" x1="' + LX(mu) + '" x2="' + LX(mu) + '" y1="' + (ly - 4) + '" y2="' + (ly + 4) + '"/><text x="' + LX(mu) + '" y="' + (ly + 20) + '" text-anchor="middle">' + mu + '배</text>';
      PEERS.forEach(function (pr, j) {
        var q = ease((ph - 0.08 - 0.1 * j) / 0.25), up = j % 2 === 0;
        s += '<g opacity="' + q + '" transform="translate(0,' + ((1 - q) * -26) + ')"><circle cx="' + LX(pr[1]) + '" cy="' + ly + '" r="7" fill="#F2EFE8" stroke="#0B1526" stroke-width="2"/><text x="' + LX(pr[1]) + '" y="' + (up ? ly - 16 : ly + 38) + '" text-anchor="middle" class="tt">' + pr[0] + ' ' + pr[1] + '배</text></g>';
      });
      var mq = ease((ph - 0.55) / 0.18);
      s += '<line x1="' + LX(MED) + '" x2="' + LX(MED) + '" y1="' + (ly - 54 * mq) + '" y2="' + (ly + 6) + '" stroke="var(--ac)" stroke-width="2" stroke-dasharray="4 3"/><text x="' + LX(MED) + '" y="' + (ly - 60) + '" text-anchor="middle" class="ta" opacity="' + mq + '">중간값 ' + MED + '배</text>';
      var rq = ease((ph - 0.78) / 0.18);
      s += '<g opacity="' + rq + '"><text x="' + (rx + 14) + '" y="' + (ry + H - 22) + '" class="th">EPS ' + E + ' × ' + MED + '배 = ' + Math.round(REL) + '</text></g>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = s;
    }
    function frame(now) { if (!host.isConnected) return; ph = clamp((now - t0) / 2800, 0, 1); render(); if (ph < 1) raf = requestAnimationFrame(frame); }
    function play() { cancelAnimationFrame(raf); if (still()) { ph = 1; render(); return; } ph = 0; render(); setTimeout(function () { t0 = performance.now(); raf = requestAnimationFrame(frame); }, 450); }
    host.querySelector('.rp').onclick = play;
    play();
    return { draw: render };
  };

  // (d) 기법 지도: x = 이익 안정성, y = 자산·자본 집약도. 질문 모드에선 회사 카드를 거품 위로 끌어 놓는다
  var BUBS = [
    { m: 'PER', x: 0.8, y: 0.3, d: '이익이 꾸준' },
    { m: 'PBR', x: 0.22, y: 0.8, d: '자산이 곧 영업' },
    { m: 'EV/EBITDA', x: 0.72, y: 0.78, d: '설비·빚 구조' },
    { m: 'SOTP', x: 0.5, y: 0.52, d: '사업부가 여럿', dash: 1 },
    { m: 'DCF', x: 0.2, y: 0.26, d: '먼 미래 현금' }
  ];
  VIS.methodMap = function (host, p, ctx) {
    var Q = ctx.mode === 'question', cards = p.cards || [], idx = 0, placed = {}, locked = false, showAns = false, res = null;
    host.innerHTML = (Q ? '<div class="dcw"><div class="dc" tabindex="0" role="button"></div><button type="button" class="mini rs">다시 놓기</button></div>' : '') +
      '<div class="mp"><svg role="img" aria-label="기법 지도. 가로 이익 안정성, 세로 자산·자본 집약도. 이익이 꾸준하면 PER, 자산이 무겁고 이익이 출렁이면 PBR, 설비가 무거우면 EV/EBITDA, 먼 미래 현금이 핵심이면 DCF, 사업부가 여럿이면 SOTP"></svg><div class="bb"></div></div>' +
      (Q ? '<p class="vr" aria-live="polite"></p>' : '<p class="vcap">점선 거품(SOTP)은 한 칸에 안 들어가는 회사: 사업부를 나눠 각자 자리에 놓고 더해요.</p>');
    var svg = host.querySelector('svg'), bb = host.querySelector('.bb'), mp = host.querySelector('.mp'), dc = host.querySelector('.dc'), vr = host.querySelector('.vr');
    var short = function (c) { return c.label.replace(/^(설비투자가 큰 |지금은 적자인 )/, ''); };
    function card() {
      if (!Q) return;
      if (idx < cards.length) { dc.className = 'dc'; dc.innerHTML = '<small>회사 카드 ' + (idx + 1) + ' / ' + cards.length + '</small><b>' + esc(cards[idx].label) + '</b>'; dc.setAttribute('aria-label', cards[idx].label + ' 카드. 맞는 잣대를 누르거나 숫자키로 고르세요'); }
      else { dc.className = 'dc done'; dc.innerHTML = '<small>다 놓았어요</small><b>확인을 눌러요</b>'; }
      vr.textContent = idx < cards.length ? '‘' + cards[idx].label + '’에 맞는 잣대는?' : '';
    }
    function draw() {
      var w = wOf(host), h = Math.round(clamp(w * 0.66, 320, 460)), m = { l: 30, r: 12, t: 14, b: 34 }, iw = w - m.l - m.r, ih = h - m.t - m.b;
      var X = function (x) { return m.l + iw * x; }, Y = function (y) { return m.t + ih * (1 - y); };
      var s = '<defs><marker id="curAr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5 0 10z" fill="rgba(242,239,232,.5)"/></marker></defs>';
      s += '<rect x="' + X(0) + '" y="' + Y(1) + '" width="' + iw + '" height="' + ih + '" fill="rgba(242,239,232,.025)"/>';
      s += '<line class="gl" x1="' + X(0.5) + '" x2="' + X(0.5) + '" y1="' + Y(1) + '" y2="' + Y(0) + '" stroke-dasharray="3 4"/><line class="gl" x1="' + X(0) + '" x2="' + X(1) + '" y1="' + Y(0.5) + '" y2="' + Y(0.5) + '" stroke-dasharray="3 4"/>';
      s += '<line class="ax" x1="' + X(0) + '" x2="' + X(1) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" marker-end="url(#curAr)"/><line class="ax" x1="' + X(0) + '" x2="' + X(0) + '" y1="' + Y(0) + '" y2="' + Y(1) + '" marker-end="url(#curAr)"/>';
      s += '<text x="' + X(1) + '" y="' + (h - 10) + '" text-anchor="end" class="tt">이익 안정성 →</text><text x="' + X(0) + '" y="' + (h - 10) + '">출렁임</text>';
      s += '<text transform="translate(' + (m.l - 12) + ',' + Y(1) + ') rotate(-90)" text-anchor="end" class="tt">자산·자본 집약도 →</text>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = s;
      mp.style.height = h + 'px';
      var hb = '';
      BUBS.forEach(function (b, i) {
        var tag = Q ? cards.filter(function (c) { return placed[c.id] === b.m; }) : [];
        var miss = showAns ? cards.filter(function (c) { return ctx.answer[c.id] === b.m && placed[c.id] !== b.m; }) : [];
        var el = Q && !locked ? 'button type="button"' : 'div';
        hb += '<' + el + ' class="bz' + (b.dash ? ' dash' : '') + '" data-m="' + b.m + '" style="left:' + X(b.x) + 'px;top:' + Y(b.y) + 'px;animation-delay:' + (150 + i * 90) + 'ms" aria-label="' + b.m + ', ' + b.d + '">' + (Q && !locked ? '<span class="kn">' + (i + 1) + '</span>' : '') + '<b>' + b.m + '</b>' + (w >= 520 || !Q ? '<small>' + b.d + '</small>' : '') + '</' + el.split(' ')[0] + '>';
        if (tag.length || miss.length) hb += '<div class="tg" style="left:' + X(b.x) + 'px;top:' + (Y(b.y) + (w >= 520 || !Q ? 30 : 24)) + 'px">' + tag.map(function (c) { var cl = locked ? (ctx.answer[c.id] === b.m ? ' class="ok"' : ' class="no"') : ''; return '<span' + cl + '>' + esc(short(c)) + '</span>'; }).join('') + miss.map(function (c) { return '<span class="ok">정답 · ' + esc(short(c)) + '</span>'; }).join('') + '</div>';
      });
      bb.innerHTML = hb;
      if (Q && !locked) bb.querySelectorAll('.bz').forEach(function (b) { b.onclick = function () { put(b.getAttribute('data-m')); }; });
    }
    function put(mth) {
      if (locked || idx >= cards.length) return;
      placed[cards[idx].id] = mth; idx++;
      card(); draw(); ctx.ready(idx >= cards.length);
    }
    if (Q) {
      host.querySelector('.rs').onclick = function () { if (locked) return; placed = {}; idx = 0; card(); draw(); ctx.ready(false); };
      var ghost = null, over = null;
      dc.addEventListener('pointerdown', function (e) {
        if (locked || idx >= cards.length) return;
        e.preventDefault(); dc.setPointerCapture(e.pointerId); dc.classList.add('drag');
        ghost = document.createElement('div'); ghost.className = 'cur-ghost'; ghost.textContent = cards[idx].label; document.body.appendChild(ghost);
        move(e);
      });
      var move = function (e) {
        if (!ghost) return;
        ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
        var el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest && el.closest('.bz');
        if (over && over !== b) over.classList.remove('over');
        over = b; if (b) b.classList.add('over');
      };
      dc.addEventListener('pointermove', move);
      var end = function () { if (!ghost) return; ghost.remove(); ghost = null; dc.classList.remove('drag'); if (over) { var mth = over.getAttribute('data-m'); over.classList.remove('over'); over = null; put(mth); } };
      dc.addEventListener('pointerup', end); dc.addEventListener('pointercancel', end);
      host.__test = function (mth) { var b = bb.querySelector('[data-m="' + mth + '"]').getBoundingClientRect(), c = dc.getBoundingClientRect(); return { from: { x: c.left + c.width / 2, y: c.top + c.height / 2 }, to: { x: b.left + b.width / 2, y: b.top + b.height / 2 } }; };
      card();
    }
    return {
      draw: draw,
      key: function (n) { if (BUBS[n - 1]) put(BUBS[n - 1].m); },
      check: function () { var ok = cards.filter(function (c) { return placed[c.id] === ctx.answer[c.id]; }).length; res = ok; return { right: ok === cards.length, detail: cards.length + '장 중 ' + ok + '장을 맞게 놓았어요.' }; },
      reveal: function (right, ans) { locked = true; showAns = !right && ans; if (dc) dc.parentNode.style.display = 'none'; if (vr) vr.textContent = ''; draw(); }
    };
  };

  // (e) 좋은 기업 vs 좋은 가격: 같은 EPS 성장, 다른 진입 PER → 5년 수익 차이
  VIS.goodPrice = function (host, p) {
    var e0 = p.eps0 || 1000, g = p.growth || 0.1, n = p.years || 5, ex = p.exitPer || 15, sc = p.scenarios || [30, 12], k = p.start || 20, first = true;
    var e5 = e0 * Math.pow(1 + g, n), ret = function (per) { return ex * e5 / (e0 * per) - 1; }, be = ex * e5 / e0;
    host.innerHTML = '<p class="vcap" style="margin:0 0 10px">같은 A사 · EPS ' + fmt(e0) + '원 → ' + fmt(e5) + '원 (연 ' + Math.round(g * 100) + '% 성장) · 5년 뒤 PER ' + ex + '배 가정 (예시)</p><svg role="img"></svg>' +
      '<div class="vctl"><label for="curGp">내가 산 PER <b>' + k + '</b>배</label><input id="curGp" type="range" min="' + (p.min || 8) + '" max="' + (p.max || 40) + '" step="1" value="' + k + '" aria-label="진입 PER"></div><p class="vr" aria-live="polite"></p>';
    var svg = host.querySelector('svg'), sl = host.querySelector('input'), lb = host.querySelector('label b'), vr = host.querySelector('.vr');
    function draw() {
      var w = wOf(host), rows = sc.map(function (x) { return { lb: 'PER ' + x + '배에 샀다면', per: x }; }).concat([{ lb: '내가 고른 PER ' + k + '배', per: k, me: 1 }]);
      var rh = 62, h = 14 + rows.length * rh + 26, m = { l: 4, r: 64 }, lo = -0.5, hi = 2.1, iw = w - m.l - m.r;
      var X = function (x) { return m.l + iw * (clamp(x, lo, hi) - lo) / (hi - lo); };
      var s = '<line class="ax" x1="' + X(0) + '" x2="' + X(0) + '" y1="6" y2="' + (h - 22) + '"/><text x="' + X(0) + '" y="' + (h - 6) + '" text-anchor="middle">0%</text><line class="gl" x1="' + X(1) + '" x2="' + X(1) + '" y1="6" y2="' + (h - 22) + '" stroke-dasharray="3 4"/><text x="' + X(1) + '" y="' + (h - 6) + '" text-anchor="middle">+100%</text><line class="gl" x1="' + X(2) + '" x2="' + X(2) + '" y1="6" y2="' + (h - 22) + '" stroke-dasharray="3 4"/><text x="' + X(2) + '" y="' + (h - 6) + '" text-anchor="middle">+200%</text>';
      rows.forEach(function (r, i) {
        var y = 14 + i * rh, v = ret(r.per), x0 = X(0), x1 = X(v), pos = v >= 0;
        var fill = r.me ? 'var(--wm)' : (pos ? 'var(--ok)' : 'var(--no)');
        s += '<text x="' + (pos ? x0 + 4 : X(lo) + 2) + '" y="' + (y + 12) + '" class="tt">' + r.lb + '</text>';
        s += '<rect' + (first && !still() ? ' class="grow" style="transform-origin:' + (pos ? 'left' : 'right') + ';animation-delay:' + (300 + i * 160) + 'ms"' : '') + ' x="' + Math.min(x0, x1) + '" y="' + (y + 20) + '" width="' + Math.max(2, Math.abs(x1 - x0)) + '" height="22" fill="' + fill + '" opacity="' + (r.me ? 0.9 : 0.8) + '"/>';
        s += '<text x="' + (w - 2) + '" y="' + (y + 36) + '" text-anchor="end" class="th ' + (r.me ? 'twm' : pos ? 'tok' : 'tno') + '" style="fill:' + fill + '">' + pc(v) + '</text>';
      });
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h);
      svg.setAttribute('aria-label', '5년 수익률 비교 (예시). ' + rows.map(function (r) { return r.lb + ' ' + pc(ret(r.per)); }).join(', '));
      svg.innerHTML = s; first = false;
      vr.innerHTML = '본전이 되는 진입 PER은 <b>약 ' + f1(be) + '배</b>예요. 지금 고른 ' + k + '배면 5년 수익 <b>' + pc(ret(k)) + '</b> (예시)';
    }
    sl.oninput = function () { k = +sl.value; lb.textContent = k; draw(); };
    sl.addEventListener('keydown', function (e) { e.stopPropagation(); });
    return { draw: draw };
  };

  // 이야기 → 숫자 → 가치
  VIS.storyNumber = function (host, p) {
    var S = p.story || [], Nn = p.number || [], V = p.value || '가치';
    host.innerHTML = '<svg role="img" aria-label="이야기 ' + S.join(', ') + ' 가 숫자 ' + Nn.join(', ') + ' 로 옮겨지고, 숫자가 모여 ' + V + '가 돼요 (예시)"></svg>';
    var svg = host.querySelector('svg');
    function box(x, y, w, h, t, cls, d) { return '<g class="vf" style="animation-delay:' + d + 'ms"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (cls === 'v' ? 'rgba(143,170,220,.22)' : 'rgba(242,239,232,.05)') + '" stroke="' + (cls === 's' ? 'rgba(242,239,232,.4)' : 'var(--ac)') + '"/><text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 5) + '" text-anchor="middle" class="' + (cls === 'v' ? 'th' : 'tt') + '">' + esc(t) + '</text></g>'; }
    function arr(x1, y1, x2, y2, d) { return '<path class="vf" style="animation-delay:' + d + 'ms" d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + '" stroke="var(--ac)" stroke-width="1.3" fill="none" marker-end="url(#curAr2)"/>'; }
    function draw() {
      var w = wOf(host), s = '<defs><marker id="curAr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5 0 10z" fill="var(--ac)"/></marker></defs>', h;
      if (w >= 620) {
        var bw = Math.min(190, w * 0.26), bh = 46, cx = [w * 0.15, w * 0.5, w * 0.85], ys = [70, 150]; h = 250;
        ['Story', 'Number', 'Value'].forEach(function (t, i) { s += '<text x="' + cx[i] + '" y="26" text-anchor="middle" class="ta">' + t + '</text>'; });
        S.forEach(function (t, i) { s += box(cx[0] - bw / 2, ys[i], bw, bh, t, 's', 200 + i * 120); s += arr(cx[0] + bw / 2 + 4, ys[i] + bh / 2, cx[1] - bw / 2 - 6, ys[i] + bh / 2, 500 + i * 120); });
        Nn.forEach(function (t, i) { s += box(cx[1] - bw / 2, ys[i], bw, bh, t, 'n', 700 + i * 120); s += arr(cx[1] + bw / 2 + 4, ys[i] + bh / 2, cx[2] - bw / 2 - 6, 133, 1000 + i * 120); });
        s += box(cx[2] - bw / 2, 106, bw, 54, V, 'v', 1250);
        s += '<text x="' + (w / 2) + '" y="' + (h - 14) + '" text-anchor="middle">이야기를 바꾸면 숫자가 바뀌고, 숫자가 바뀌면 가치가 바뀌어요 (예시)</text>';
      } else {
        var bw2 = (w - 12) / 2, bh2 = 44; h = 330;
        s += '<text x="0" y="16" class="ta">Story</text>';
        S.forEach(function (t, i) { s += box(i * (bw2 + 12), 26, bw2, bh2, t, 's', 200 + i * 120); s += arr(i * (bw2 + 12) + bw2 / 2, 74, i * (bw2 + 12) + bw2 / 2, 116, 500 + i * 120); });
        s += '<text x="0" y="112" class="ta">Number</text>';
        Nn.forEach(function (t, i) { s += box(i * (bw2 + 12), 122, bw2, bh2, t, 'n', 700 + i * 120); s += arr(i * (bw2 + 12) + bw2 / 2, 170, w / 2 + (i ? 20 : -20), 222, 1000 + i * 120); });
        s += '<text x="0" y="218" class="ta">Value</text>';
        s += box(0, 228, w, 54, V, 'v', 1250);
        s += '<text x="0" y="' + (h - 18) + '">이야기 → 숫자 → 가치 (예시)</text>';
      }
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = s;
    }
    return { draw: draw };
  };

  // 공용: 상자와 화살표
  function vbox(x, y, w, h, t, kind, d, cls) {
    var fill = { s: 'rgba(242,239,232,.05)', n: 'rgba(143,170,220,.08)', v: 'rgba(143,170,220,.24)', w: 'rgba(232,201,160,.10)', m: 'rgba(143,170,220,.30)' }[kind] || 'none';
    var stroke = { s: 'rgba(242,239,232,.4)', n: 'var(--ac)', v: 'var(--ac)', w: 'var(--wm)', m: 'var(--ac2)' }[kind] || 'var(--hair)';
    return '<g class="vf" style="animation-delay:' + d + 'ms"><rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h + '" fill="' + fill + '" stroke="' + stroke + '"' + (kind === 'm' ? ' stroke-width="1.6"' : '') + '/><text x="' + (x + w / 2).toFixed(1) + '" y="' + (y + h / 2 + 5).toFixed(1) + '" text-anchor="middle" class="' + (cls || (kind === 'v' || kind === 'm' ? 'th' : 'tt')) + '">' + esc(t) + '</text></g>';
  }
  function varr(x1, y1, x2, y2, d, col, id) { return '<path class="vf" style="animation-delay:' + d + 'ms" d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" stroke="' + (col || 'var(--ac)') + '" stroke-width="1.2" fill="none" marker-end="url(#' + (id || 'curAr3') + ')"/>'; }
  var ARDEF = '<defs><marker id="curAr3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5 0 10z" fill="var(--ac)"/></marker><marker id="curAr4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5 0 10z" fill="var(--wm)"/></marker></defs>';

  // 두 힘: 왼쪽 묶음은 한 노드를, 오른쪽 묶음은 다른 노드를 움직이고, 두 노드 사이에 틈이 생긴다
  VIS.twoForces = function (host, p) {
    var L = p.left, Rt = p.right, nd = p.nodes || ['가치', '가격'];
    host.innerHTML = '<svg role="img" aria-label="' + esc(L.title + ': ' + L.items.join(', ') + ' → ' + nd[0] + '. ' + Rt.title + ': ' + Rt.items.join(', ') + ' → ' + nd[1] + '. ' + (p.mid || '')) + '"></svg>';
    var svg = host.querySelector('svg');
    function draw() {
      var w = wOf(host), s = ARDEF, h;
      if (w >= 600) {
        var bw = Math.min(150, w * 0.22), bh = 38, n = Math.max(L.items.length, Rt.items.length), top = 44; h = top + n * (bh + 12) + 60;
        var cy = top + (n * (bh + 12) - 12) / 2, nw = Math.min(110, w * 0.15), vx = w * 0.5 - nw - 28, px = w * 0.5 + 28;
        s += '<text x="' + (bw / 2) + '" y="24" text-anchor="middle" class="ta">' + esc(L.title) + '</text><text x="' + (w - bw / 2) + '" y="24" text-anchor="middle" class="twm">' + esc(Rt.title) + '</text>';
        L.items.forEach(function (t, i) { var y = top + i * (bh + 12) + (n - L.items.length) * (bh + 12) / 2; s += vbox(0, y, bw, bh, t, 'n', 150 + i * 90); s += varr(bw + 4, y + bh / 2, vx - 6, cy, 500 + i * 90); });
        Rt.items.forEach(function (t, i) { var y = top + i * (bh + 12) + (n - Rt.items.length) * (bh + 12) / 2; s += vbox(w - bw, y, bw, bh, t, 'w', 250 + i * 90); s += varr(w - bw - 4, y + bh / 2, px + nw + 6, cy, 600 + i * 90, 'var(--wm)', 'curAr4'); });
        s += vbox(vx, cy - 24, nw, 48, nd[0], 'v', 900) + vbox(px, cy - 24, nw, 48, nd[1], 'w', 950, 'th');
        s += '<g class="vf" style="animation-delay:1200ms"><path d="M' + (vx + nw + 4) + ' ' + (cy + 34) + 'v8h' + (px - vx - nw - 8) + 'v-8" fill="none" stroke="var(--t3)"/><text x="' + (w / 2) + '" y="' + (cy + 62) + '" text-anchor="middle" class="tt">' + esc(p.mid || '') + '</text></g>';
      } else {
        var cw = (w - 10) / 2, bh2 = 36, rl = Math.ceil(L.items.length / 2), rr = Math.ceil(Rt.items.length / 2), y0 = 24;
        var yN = y0 + rl * (bh2 + 8) + 30, nw2 = w * 0.36, vx2 = w * 0.25 - nw2 / 2, px2 = w * 0.75 - nw2 / 2, yR = yN + 48 + 64;
        h = yR + rr * (bh2 + 8) + 4;
        s += '<text x="0" y="14" class="ta">' + esc(L.title) + '</text>';
        L.items.forEach(function (t, i) { var x = (i % 2) * (cw + 10), y = y0 + Math.floor(i / 2) * (bh2 + 8); s += vbox(x, y, cw, bh2, t, 'n', 150 + i * 90); });
        s += varr(w * 0.25, y0 + rl * (bh2 + 8) - 2, w * 0.25, yN - 4, 500);
        s += vbox(vx2, yN, nw2, 48, nd[0], 'v', 800) + vbox(px2, yN, nw2, 48, nd[1], 'w', 850, 'th');
        s += '<g class="vf" style="animation-delay:1100ms"><path d="M' + (vx2 + nw2 / 2) + ' ' + (yN + 54) + 'v6H' + (px2 + nw2 / 2) + 'v-6" fill="none" stroke="var(--t3)"/><text x="' + (w / 2) + '" y="' + (yN + 78) + '" text-anchor="middle" class="tt">' + esc(p.mid || '') + '</text></g>';
        s += '<text x="0" y="' + (yR - 10) + '" class="twm">' + esc(Rt.title) + '</text>';
        Rt.items.forEach(function (t, i) { var x = (i % 2) * (cw + 10), y = yR + Math.floor(i / 2) * (bh2 + 8); s += vbox(x, y, cw, bh2, t, 'w', 300 + i * 90); });
        s += varr(w * 0.75, yR - 22, w * 0.75, yN + 52, 650, 'var(--wm)', 'curAr4');
      }
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = s;
    }
    return { draw: draw };
  };

  // 기법 나무: 자산·수익·시장 세 갈래, 주력 셋은 강조
  var TREE = [
    { t: '자산가치 접근', s: '가진 것으로', k: ['순자산 (장부가)', '청산가치'] },
    { t: '수익가치 접근', s: '벌 돈으로', k: ['DCF', 'RIM'] },
    { t: '시장가치 접근', s: '시장 가격으로', k: ['Trading comps', 'Transaction comps'] }
  ];
  var MAIN3 = { 'DCF': 1, 'Trading comps': 1, 'Transaction comps': 1 };
  VIS.methodTree = function (host) {
    host.innerHTML = '<svg role="img" aria-label="밸류에이션 기법 나무. 자산가치 접근: 순자산, 청산가치. 수익가치 접근: DCF, RIM. 시장가치 접근: Trading comps, Transaction comps. 주력은 DCF, Trading comps, Transaction comps"></svg><p class="vcap">굵은 테두리 = 실무에서 주로 쓰는 셋</p>';
    var svg = host.querySelector('svg');
    function draw() {
      var w = wOf(host), s = ARDEF, h, d = 100;
      if (w >= 640) {
        var cw = (w - 24) / 3, rw = 160; h = 330;
        s += vbox(w / 2 - rw / 2, 0, rw, 44, '밸류에이션', 'v', 0);
        TREE.forEach(function (b, i) {
          var x = i * (cw + 12), cx = x + cw / 2;
          s += varr(w / 2, 46, cx, 92, 200 + i * 120);
          s += vbox(x, 96, cw, 44, b.t, 'n', 300 + i * 120);
          s += '<text x="' + cx + '" y="160" text-anchor="middle" class="vf" style="animation-delay:' + (350 + i * 120) + 'ms">' + esc(b.s) + '</text>';
          b.k.forEach(function (k, j) { var y = 180 + j * 60; s += '<path class="vf" d="M' + cx + ' ' + (y - 14) + 'V' + y + '" stroke="var(--hair)"/>'; s += vbox(x + 14, y, cw - 28, 42, k, MAIN3[k] ? 'm' : 's', 600 + i * 120 + j * 80); });
        });
      } else {
        var ind = 26, y = 0; s += vbox(0, 0, w * 0.55, 42, '밸류에이션', 'v', 0); y = 56;
        TREE.forEach(function (b, i) {
          var by = y;
          s += '<path class="vf" d="M12 ' + (i ? by - 64 - 6 - 42 * 0 : 42) + 'V' + (by + 20) + 'H' + ind + '" fill="none" stroke="var(--hair)" style="animation-delay:' + (d * i) + 'ms"/>';
          s += vbox(ind, by, w - ind, 40, b.t + ' · ' + b.s, 'n', 200 + i * 150);
          b.k.forEach(function (k, j) { var ky = by + 50 + j * 48; s += '<path class="vf" d="M' + (ind + 14) + ' ' + (ky - 10) + 'V' + (ky + 20) + 'H' + (ind + 32) + '" fill="none" stroke="var(--hair)"/>'; s += vbox(ind + 32, ky, w - ind - 32, 40, k, MAIN3[k] ? 'm' : 's', 350 + i * 150 + j * 80); });
          y = by + 50 + b.k.length * 48 + 16;
        });
        h = y;
      }
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = s;
    }
    return { draw: draw };
  };

  // 비교표: 넓으면 전부, 좁으면 기법 버튼으로 한 열씩
  VIS.compTable = function (host, p, ctx) {
    var cols = p.cols || [], rows = p.rows || [], sel = 0, n = 0;
    host.innerHTML = '<div class="vbt ctab" role="tablist" aria-label="기법 고르기">' + cols.map(function (c, i) { return '<button type="button" role="tab" aria-selected="' + (i === 0) + '" class="' + (i === 0 ? 'on' : '') + '" data-c="' + i + '">' + esc(c) + '</button>'; }).join('') + '</div>' +
      '<table class="ctb" data-sel="0"><thead><tr><th scope="col"><span class="sr-only">항목</span></th>' + cols.map(function (c, i) { return '<th scope="col" data-c="' + i + '">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr class="hid"><th scope="row">' + esc(r[0]) + '</th>' + r.slice(1).map(function (v, i) { return '<td data-c="' + i + '">' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' +
      '<div class="vbt"><button type="button" class="rv vgo"></button></div><p class="vcap rvc"></p>';
    var tb = host.querySelector('table'), trs = host.querySelectorAll('tbody tr'), rv = host.querySelector('.rv'), cap = host.querySelector('.rvc');
    function lab() {
      if (n >= rows.length) { rv.hidden = true; rv.classList.add('done'); cap.textContent = '세 기법이 ' + rows.length + '가지에서 어떻게 갈리는지 봤어요. 다음으로 넘어가요.'; if (ctx && ctx.ready) ctx.ready(true); return; }
      rv.textContent = (n === 0 ? '첫 줄 열기 · ' : '다음 줄 · ') + rows[n][0]; cap.textContent = n + ' / ' + rows.length + ' 줄';
    }
    function open() { if (n >= rows.length) return; var tr = trs[n]; tr.classList.remove('hid'); tr.style.animation = 'curRise .5s var(--e) both'; n++; lab(); }
    rv.onclick = open; tb.onclick = open;
    host.tabIndex = 0;
    host.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { if (n < rows.length) { e.preventDefault(); e.stopPropagation(); open(); } } });
    host.querySelectorAll('.ctab button').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); sel = +b.getAttribute('data-c'); tb.setAttribute('data-sel', sel); host.querySelectorAll('.ctab button').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); }); };
    });
    lab();
    return { draw: function () {}, gated: function () { return n < rows.length; } };
  };


  // ── 단계별 공개 부품 공용 ──────────────────────────────
  // 눌러서 여는 버튼은 모두 .vgo (다 열면 .done 또는 숨김). play.js는 .vgo를 차례로 눌러 개념 카드를 넘긴다
  function gate(ctx, done) {
    if (ctx && ctx.ready) ctx.ready(!!done);
    // 다 열면 왼쪽 요점(답을 미리 알려 주지 않게 잠가 둔 것)을 보여 준다
    if (done && st && st.bx) st.bx.querySelectorAll('.pts.lockp').forEach(function (e) { e.classList.remove('lockp'); e.classList.add('unl'); });
  }

  // 뒤집는 카드: 앞면은 질문, 누르면 답. 다 열어야 다음으로
  VIS.cards = function (host, p, ctx) {
    var C = p.cards || [], n = 0;
    host.innerHTML = '<div class="fcg" style="--n:' + Math.min(C.length, p.cols || 3) + '">' + C.map(function (c, i) {
      var mk = c.mark === 'O' ? 'ok' : c.mark === 'X' ? 'no' : '';
      return '<button type="button" class="fc vgo" data-i="' + i + '" aria-expanded="false"><small>' + esc(c.k || '') + '</small><b>' + esc(c.t) + '</b>' + (c.q ? '<span class="fq">' + esc(c.q) + '</span>' : '') +
        '<span class="fa">' + (c.mark ? '<em class="' + mk + '">' + (c.mark === 'O' ? '맞아요' : c.mark === 'X' ? '아니에요' : esc(c.mark)) + '</em>' : '') + esc(c.a) + '</span><i>' + esc(p.tap || '눌러서 열기') + '</i></button>';
    }).join('') + '</div><p class="vcap" aria-live="polite"></p>';
    var cap = host.querySelector('.vcap');
    function lab() { cap.textContent = n >= C.length ? (p.done || '다 열었어요.') : n + ' / ' + C.length + ' 장 열었어요. 카드를 눌러 보세요.'; gate(ctx, n >= C.length); }
    host.querySelectorAll('.fc').forEach(function (b) {
      b.onclick = function () { if (b.classList.contains('open')) return; b.classList.add('open', 'done'); b.setAttribute('aria-expanded', 'true'); n++; lab(); };
    });
    lab();
    return { draw: function () {}, gated: function () { return n < C.length; } };
  };

  // 한 줄씩 공개: 칸(cols)이 있으면 칸마다 쌓고, 없으면 번호 목록
  VIS.reveal = function (host, p, ctx) {
    var cols = p.cols, items = p.items || [], n = 0;
    host.innerHTML = (cols ? '<div class="rvg" style="--n:' + cols.length + '">' + cols.map(function (c, i) {
      return '<div class="rcol ' + esc(c.tone || '') + '"><h4>' + esc(c.title) + '</h4>' + (c.sub ? '<p>' + esc(c.sub) + '</p>' : '') + '<ul data-c="' + i + '"></ul></div>';
    }).join('') + '</div>' : '<ol class="rvo"></ol>') + '<div class="vbt"><button type="button" class="vgo on"></button></div><p class="vcap" aria-live="polite"></p>';
    var bt = host.querySelector('.vgo'), cap = host.querySelector('.vcap');
    function lab() {
      if (n >= items.length) { bt.hidden = true; bt.classList.add('done'); cap.textContent = p.done || '다 봤어요.'; gate(ctx, true); return; }
      var nx = items[n]; bt.textContent = (p.btn || (n ? '다음' : '첫 줄 열기')) + ' · ' + (nx.tag || (n + 1) + ' / ' + items.length);
      cap.textContent = n + ' / ' + items.length; gate(ctx, false);
    }
    function open() {
      if (n >= items.length) return;
      var it = items[n], box = cols ? host.querySelector('ul[data-c="' + (it.c || 0) + '"]') : host.querySelector('ol');
      var li = document.createElement('li'); li.className = 'ri ' + (it.tone || '');
      li.innerHTML = (it.tag ? '<small>' + esc(it.tag) + '</small>' : '') + '<b>' + esc(it.t) + '</b>' + (it.d ? '<span>' + esc(it.d) + '</span>' : '');
      box.appendChild(li); n++; lab();
    }
    bt.onclick = open;
    for (var k = 0; k < (p.start || 0); k++) open();
    lab();
    return { draw: function () {}, gated: function () { return n < items.length; } };
  };

  // 내 가치 vs 시장 가격 괴리: 괴리 크기 슬라이더 + 원인 쪼개기 갈림길
  VIS.gapCheck = function (host, p, ctx) {
    var my = p.my || 100, pr = p.start || 80, B = p.branches || [], opened = {};
    host.innerHTML = '<div class="gk"><div class="gb"><span>내가 본 가치</span><i class="me" style="width:100%"></i><b>' + my + '</b></div><div class="gb"><span>시장 가격</span><i class="mk2"></i><b class="pv"></b></div>' +
      '<div class="vctl"><label for="curGap">괴리 <b></b></label><input id="curGap" type="range" min="' + (p.min || 50) + '" max="' + (p.max || 100) + '" step="1" value="' + pr + '" aria-label="시장 가격"></div>' +
      '<div class="gm" aria-live="polite"><div class="gml"><span>내가 틀렸을 가능성</span><span class="lv"></span></div><div class="gml"><span>필요한 검증</span><span class="lv2"></span></div></div>' +
      '<p class="gr">' + esc(p.root || '괴리가 보이면 먼저 원인을 둘로 쪼개요') + '</p><div class="gt">' + B.map(function (b, i) {
        return '<div class="gn"><button type="button" class="vgo" data-i="' + i + '"><small>' + esc(b.k) + '</small><b>' + esc(b.t) + '</b></button><div class="go" hidden><span>→</span><p>' + esc(b.go) + '</p></div></div>';
      }).join('') + '</div><div class="gf" hidden><b>' + esc(p.finalT || '그래도 내가 맞다면') + '</b><p>' + esc(p.final || '') + '</p></div></div><p class="vcap">' + esc(p.cap || '') + '</p>';
    var sl = host.querySelector('input'), lb = host.querySelector('label b'), bar = host.querySelector('.mk2'), pv = host.querySelector('.pv'), lv = host.querySelector('.lv'), lv2 = host.querySelector('.lv2');
    function upd() {
      pr = +sl.value; var g = (my - pr) / my;
      bar.style.width = (pr / my * 100) + '%'; pv.textContent = pr; lb.textContent = Math.round(g * 100) + '%';
      var lvl = g < 0.1 ? 0 : g < 0.3 ? 1 : 2;
      lv.innerHTML = ['낮아요', '꽤 있어요', '커요'].map(function (t, i) { return '<em class="' + (i === lvl ? 'on' : '') + '">' + t + '</em>'; }).join('');
      lv2.innerHTML = ['평소대로', '꼼꼼히', '아주 철저히, 두 번'].map(function (t, i) { return '<em class="' + (i === lvl ? 'on' : '') + '">' + t + '</em>'; }).join('');
    }
    sl.oninput = upd; sl.addEventListener('keydown', function (e) { e.stopPropagation(); });
    host.querySelectorAll('.gt .vgo').forEach(function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-i'); if (opened[i]) return; opened[i] = 1; b.classList.add('done', 'on');
        b.parentNode.querySelector('.go').hidden = false;
        var all = Object.keys(opened).length >= B.length;
        if (all) host.querySelector('.gf').hidden = false;
        gate(ctx, all);
      };
    });
    upd();
    return { draw: function () {}, gated: function () { return Object.keys(opened).length < B.length; } };
  };

  // 보는 기간에 따라 달라지는 가치: 시장 가격·내 가치·그 참여자가 보는 가치 막대
  VIS.horizon = function (host, p) {
    var S = p.stops || [], k = p.start || 0, my = p.my || 10, price = p.price || 9, u = p.unit || '조';
    host.innerHTML = '<svg role="img"></svg><div class="vctl"><label for="curHz">보는 기간 <b></b></label><input id="curHz" type="range" min="0" max="' + (S.length - 1) + '" step="1" value="' + k + '" aria-label="보는 기간"></div><p class="vr" aria-live="polite"></p><p class="vcap">' + esc(p.cap || '(예시)') + '</p>';
    var svg = host.querySelector('svg'), sl = host.querySelector('input'), lb = host.querySelector('label b'), vr = host.querySelector('.vr');
    function draw() {
      var s = S[k], w = wOf(host), h = 230, m = { l: 8, r: 8, t: 26, b: 40 }, top = Math.max.apply(null, S.map(function (x) { return x.v; }).concat([my, price])) * 1.15;
      var bars = [['시장 가격', price, 'rgba(242,239,232,.55)'], ['내가 본 가치', my, 'var(--ac)'], [s.who2 || '그 사람이 보는 가치', s.v, 'var(--wm)']];
      var bw = Math.min(110, (w - m.l - m.r) / 3 - 24), gap = (w - m.l - m.r - bw * 3) / 3, Y = function (v) { return m.t + (h - m.t - m.b) * (1 - v / top); }, o = '';
      o += '<line class="ax" x1="0" x2="' + w + '" y1="' + (h - m.b) + '" y2="' + (h - m.b) + '"/>';
      o += '<line x1="0" x2="' + w + '" y1="' + Y(price) + '" y2="' + Y(price) + '" stroke="rgba(242,239,232,.35)" stroke-dasharray="4 4"/>';
      bars.forEach(function (b, i) {
        var x = m.l + gap / 2 + i * (bw + gap), y = Y(b[1]);
        o += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + (h - m.b - y) + '" fill="' + b[2] + '" opacity=".85" style="transition:all .4s"/><text x="' + (x + bw / 2) + '" y="' + (y - 8) + '" text-anchor="middle" class="th">' + f1(b[1]) + u + '</text><text x="' + (x + bw / 2) + '" y="' + (h - m.b + 18) + '" text-anchor="middle" class="tt">' + esc(b[0]) + '</text>';
      });
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', '시장 가격 ' + price + u + ', 내가 본 가치 ' + my + u + ', ' + s.t + '을 보는 사람이 보는 가치 ' + s.v + u + ' (예시)');
      lb.textContent = s.t; vr.innerHTML = '<b>' + esc(s.who) + '</b><br>' + esc(s.me);
    }
    sl.oninput = function () { k = +sl.value; draw(); };
    sl.addEventListener('keydown', function (e) { e.stopPropagation(); });
    return { draw: draw };
  };

  // 리포트 지도: 고민 칩을 누르면 리포트의 어느 부분인지 켜진다
  VIS.reportMap = function (host, p, ctx) {
    var secs = p.secs || [], chips = p.chips || [], seen = {};
    host.innerHTML = '<div class="rmp"><div class="rch">' + chips.map(function (c) { return '<button type="button" class="vgo" data-g="' + esc(c.g) + '"><small>' + esc(c.k || '') + '</small><b>' + esc(c.t) + '</b></button>'; }).join('') + '</div>' +
      '<ol class="rsec">' + secs.map(function (s) { return '<li data-g="' + esc(s.g || '') + '"><b>' + esc(s.t) + '</b>' + (s.d ? '<span>' + esc(s.d) + '</span>' : '') + '</li>'; }).join('') + '</ol></div><p class="vr" aria-live="polite">' + esc(p.ask || '위의 고민을 하나씩 눌러 보세요.') + '</p><p class="rwarn" hidden>' + esc(p.warn || '') + '</p>';
    var vr = host.querySelector('.vr');
    host.querySelectorAll('.rch .vgo').forEach(function (b) {
      b.onclick = function () {
        var g = b.getAttribute('data-g'), c = chips.filter(function (x) { return x.g === g; })[0];
        seen[g] = 1; b.classList.add('done');
        host.querySelectorAll('.rch .vgo').forEach(function (x) { x.classList.toggle('on', x === b); });
        host.querySelectorAll('.rsec li').forEach(function (li) { li.className = li.getAttribute('data-g') === g ? 'hl ' + g : ''; });
        vr.textContent = c.say || '';
        var all = Object.keys(seen).length >= chips.length;
        if (all) host.querySelector('.rwarn').hidden = false;
        gate(ctx, all);
      };
    });
    return { draw: function () {}, gated: function () { return Object.keys(seen).length < chips.length; } };
  };

  // 재무상태표 + 해마다의 손익: 순이익이 자본에 쌓인다 (한 해씩 공개)
  VIS.bsStack = function (host, p, ctx) {
    var D = p.debt || 40, E0 = p.equity || 60, Ys = p.years || [], n = 0, u = p.unit || '억 원';
    var ni = function (y) { return y.op - y.int - y.tax; };
    var Efin = E0 + Ys.reduce(function (a, y) { return a + ni(y); }, 0);
    host.innerHTML = '<svg role="img"></svg><div class="vbt"><button type="button" class="vgo on"></button></div><p class="vr" aria-live="polite"></p><p class="vcap">' + esc(p.cap || '') + '</p>';
    var svg = host.querySelector('svg'), bt = host.querySelector('.vgo'), vr = host.querySelector('.vr');
    function E() { var e = E0; for (var i = 0; i < n; i++) e += ni(Ys[i]); return e; }
    function draw() {
      var w = wOf(host), h = Math.round(clamp(w * 0.55, 270, 340)), m = { t: 30, b: 34 }, ih = h - m.t - m.b;
      var tot = D + Efin, sc = ih / tot, bw = Math.min(70, w * 0.14), x0 = 0, o = ARDEF;
      var e = E(), yE = h - m.b - e * sc, yD = yE - D * sc;
      o += '<text x="0" y="16" class="ta">재무상태표</text>';
      o += '<rect x="' + x0 + '" y="' + yD + '" width="' + bw + '" height="' + (D + e) * sc + '" fill="rgba(242,239,232,.06)" stroke="rgba(242,239,232,.4)"/><text x="' + (x0 + bw / 2) + '" y="' + (yD + (D + e) * sc / 2 + 4) + '" text-anchor="middle" class="tt">자산</text>';
      o += '<rect x="' + (x0 + bw + 4) + '" y="' + yD + '" width="' + bw + '" height="' + D * sc + '" fill="rgba(242,239,232,.12)" stroke="rgba(242,239,232,.4)"/><text x="' + (x0 + bw * 1.5 + 4) + '" y="' + (yD + D * sc / 2 + 4) + '" text-anchor="middle" class="tt">부채 ' + D + '</text>';
      o += '<rect x="' + (x0 + bw + 4) + '" y="' + yE + '" width="' + bw + '" height="' + e * sc + '" fill="rgba(143,170,220,.32)" stroke="var(--ac)" style="transition:all .5s"/><text x="' + (x0 + bw * 1.5 + 4) + '" y="' + (yE + e * sc / 2 + 4) + '" text-anchor="middle" class="th">자본 ' + fmt(e) + '</text>';
      var gx = x0 + bw * 2 + 46, gw = w - gx, cw = Math.min(90, gw / Math.max(Ys.length, 1) - 10), mx = Math.max.apply(null, Ys.map(function (y) { return y.op; })), ysc = Math.min(sc * 1.6, (ih - 30) / mx);
      o += '<text x="' + gx + '" y="16" class="ta">해마다의 손익</text>';
      Ys.forEach(function (y, i) {
        var cx = gx + i * (cw + 8), base = h - m.b, on = i < n, op = y.op * ysc, nh = ni(y) * ysc, ih2 = y.int * ysc, th = y.tax * ysc;
        o += '<g opacity="' + (on ? 1 : 0.18) + '" style="transition:opacity .4s"><rect x="' + cx + '" y="' + (base - nh) + '" width="' + cw + '" height="' + nh + '" fill="rgba(143,170,220,.75)"/>' +
          '<rect x="' + cx + '" y="' + (base - nh - th) + '" width="' + cw + '" height="' + th + '" fill="rgba(232,201,160,.55)"/>' +
          '<rect x="' + cx + '" y="' + (base - op) + '" width="' + cw + '" height="' + ih2 + '" fill="rgba(242,239,232,.3)"/>' +
          '<text x="' + (cx + cw / 2) + '" y="' + (base + 16) + '" text-anchor="middle">' + esc(y.y) + '</text><text x="' + (cx + cw / 2) + '" y="' + (base - op - 6) + '" text-anchor="middle" class="tt">' + y.op + '</text></g>';
      });
      if (n > 0) { var ay = Math.max(yE + 16, h - m.b - 14); o += varr(gx - 6, ay, x0 + bw * 2 + 10, ay, 0, 'var(--ac)') + '<text x="' + (x0 + bw * 2 + 12) + '" y="' + (ay - 6) + '" class="ta" style="font-size:10.5px">+' + ni(Ys[n - 1]) + '</text>'; }
      var lg = [['이자(채권자 몫)', 'rgba(242,239,232,.3)'], ['세금(나라 몫)', 'rgba(232,201,160,.55)'], ['순이익(주주 몫)', 'rgba(143,170,220,.75)']];
      lg.forEach(function (l, i) { var lx2 = w * i / 3; o += '<rect x="' + lx2 + '" y="' + (h - 12) + '" width="10" height="10" fill="' + l[1] + '"/><text x="' + (lx2 + 14) + '" y="' + (h - 3) + '" style="font-size:10.5px">' + l[0] + '</text>'; });
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', '자산 = 부채 ' + D + ' + 자본 ' + fmt(e) + u + '. 해마다 영업이익에서 이자와 세금을 빼고 남은 순이익이 자본에 쌓여요 (예시)');
    }
    function lab() {
      if (n >= Ys.length) { bt.hidden = true; bt.classList.add('done'); gate(ctx, true); } else { bt.textContent = (n ? '한 해 더 · ' : '첫해 벌기 · ') + Ys[n].y; gate(ctx, false); }
      if (!n) vr.innerHTML = '처음 자본은 <b>' + E0 + u + '</b>이에요. 버튼을 눌러 한 해씩 벌어 보세요. (예시)';
      else { var y = Ys[n - 1]; vr.innerHTML = esc(y.y) + ': 영업이익 ' + y.op + ' − 이자 ' + y.int + ' − 세금 ' + y.tax + ' = 순이익 <b>' + ni(y) + '</b> → 자본 <b>' + fmt(E()) + u + '</b> (예시)'; }
    }
    bt.onclick = function () { if (n < Ys.length) { n++; draw(); lab(); } };
    lab();
    return { draw: draw, gated: function () { return n < Ys.length; } };
  };

  // 가로 폭포: 한 줄씩 더하고 빼며 끝 숫자까지 (k: 'sub'는 그때까지 합계)
  VIS.waterfall = function (host, p, ctx) {
    var It = p.items || [], n = p.start || 1, u = p.unit || '';
    var run = 0, rows = It.map(function (it) {
      if (it.k === 'sub') { if (it.v != null) run = it.v; return { l: it.l, a: 0, b: run, sub: 1, d: it.d }; }
      if (it.k === 'start') { run = it.v; return { l: it.l, a: 0, b: it.v, sub: 1, d: it.d }; }
      var a = run; run += it.v; return { l: it.l, a: a, b: run, v: it.v, d: it.d };
    });
    var lo = Math.min(0, Math.min.apply(null, rows.map(function (r) { return Math.min(r.a, r.b); }))), hi = Math.max.apply(null, rows.map(function (r) { return Math.max(r.a, r.b); }));
    host.innerHTML = '<svg role="img"></svg><div class="vbt"><button type="button" class="vgo on"></button></div><p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), bt = host.querySelector('.vgo'), vr = host.querySelector('.vr');
    function sg(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v)); }
    function draw() {
      var w = wOf(host), lw = Math.min(130, w * 0.32), vw = 74, rh = 40, h = rows.length * rh + 10, X = function (v) { return lw + (w - lw - vw) * (v - lo) / (hi - lo || 1); }, o = '';
      o += '<line class="gl" x1="' + X(0) + '" x2="' + X(0) + '" y1="0" y2="' + h + '"/>';
      rows.forEach(function (r, i) {
        var y = 6 + i * rh, on = i < n, x1 = X(Math.min(r.a, r.b)), x2 = X(Math.max(r.a, r.b)), col = r.sub ? 'var(--ac)' : r.v >= 0 ? 'var(--ok)' : 'var(--no)';
        o += '<g opacity="' + (on ? 1 : 0.12) + '" style="transition:opacity .45s"><text x="0" y="' + (y + 21) + '" class="' + (r.sub ? 'th' : 'tt') + '">' + esc(r.l) + '</text>';
        o += '<rect x="' + x1 + '" y="' + (y + 6) + '" width="' + Math.max(2, x2 - x1) + '" height="' + (rh - 14) + '" fill="' + col + '" opacity="' + (r.sub ? 0.55 : 0.75) + '"/>';
        if (i < rows.length - 1) o += '<line x1="' + X(r.b) + '" x2="' + X(r.b) + '" y1="' + (y + rh - 8) + '" y2="' + (y + rh + 6) + '" stroke="var(--t3)" stroke-dasharray="2 2"/>';
        o += '<text x="' + w + '" y="' + (y + 21) + '" text-anchor="end" class="' + (r.sub ? 'th' : r.v >= 0 ? 'tok' : 'tno') + '">' + (r.sub ? fmt(r.b) : sg(r.v)) + '</text></g>';
      });
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', rows.map(function (r) { return r.l + ' ' + (r.sub ? fmt(r.b) : sg(r.v)); }).join(', ') + ' (' + u + ')');
    }
    function lab() {
      var r = rows[n - 1];
      vr.innerHTML = '<b>' + esc(r.l) + ' ' + (r.sub ? fmt(r.b) : sg(r.v)) + '</b> ' + esc(u) + (r.d ? ' · ' + esc(r.d) : '');
      if (n >= rows.length) { bt.hidden = true; bt.classList.add('done'); gate(ctx, true); } else { bt.textContent = '다음 줄 · ' + rows[n].l; gate(ctx, false); }
    }
    bt.onclick = function () { if (n < rows.length) { n++; draw(); lab(); } };
    lab();
    return { draw: draw, gated: function () { return n < rows.length; } };
  };

  // 여러 해 막대 + 비율 선. 시리즈 켜고 끄기, 연도 눌러 숫자 보기. 문제 모드: 연도 하나 고르기
  VIS.series = function (host, p, ctx) {
    var Q = ctx.mode === 'question', Yr = p.years || [], Bs = p.bars || [], Ls = p.lines || [], est = p.est == null ? 99 : p.est, u = p.unit || '';
    var on = {}; (p.on || Bs.concat(Ls).map(function (s) { return s.n; })).forEach(function (n) { on[n] = 1; });
    var pick = null, locked = false, showAns = false, sel = null;
    var TONE = ['rgba(143,170,220,.85)', 'rgba(232,169,169,.8)', 'rgba(232,201,160,.85)', 'rgba(169,216,188,.85)', 'rgba(242,239,232,.6)'];
    var all = Bs.concat(Ls);
    host.innerHTML = (all.length > 1 ? '<div class="vbt stg" role="group" aria-label="보일 항목">' + all.map(function (s, i) { return '<button type="button" data-s="' + esc(s.n) + '" aria-pressed="' + !!on[s.n] + '" class="' + (on[s.n] ? 'on' : '') + '"><span class="sw" style="background:' + (s.c || (i < Bs.length ? TONE[i % 5] : 'var(--tx)')) + '"></span>' + esc(s.n) + '</button>'; }).join('') + '</div>' : '') +
      '<svg role="img"></svg><p class="vr" aria-live="polite"></p>' +
      (Q ? '<div class="vbt yrs" role="radiogroup" aria-label="연도 고르기">' + Yr.map(function (y, i) { return '<button type="button" role="radio" aria-checked="false" data-y="' + i + '">' + esc(y) + '</button>'; }).join('') + '</div>' : '') +
      (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr');
    Bs.forEach(function (s, i) { s._c = s.c || TONE[i % 5]; }); Ls.forEach(function (s, i) { s._c = s.c || ['var(--tx)', 'var(--wm)', 'var(--ok)'][i % 3]; });
    function num(v, s) { if (v == null) return '–'; if (s && s.pct) return (Math.round(v * 10) / 10) + '%'; var a = Math.abs(v), t = s && s.dec ? a.toFixed(s.dec) : fmt(a); return (v < 0 ? '−' : '') + t + (s && s.u ? s.u : ''); }
    function nice(a, b) { var raw = (b - a) / 4, mg = Math.pow(10, Math.floor(Math.log10(raw))), st2 = [1, 2, 2.5, 5, 10].map(function (k) { return k * mg; }).filter(function (k) { return k >= raw; })[0], out = []; for (var t = Math.ceil(a / st2) * st2; t <= b + 1e-9; t += st2) out.push(Math.abs(t) < 1e-9 ? 0 : t); return out; }
    function ax(v) { var a = Math.abs(v); return (v < 0 ? '−' : '') + (a >= 1000 ? f1(a / 1000) + 'k' : (a < 10 && a % 1 ? f1(a) : Math.round(a))); }
    function readout(i) {
      if (i == null) { vr.innerHTML = esc(p.hint || (Q ? '연도를 눌러 고르세요.' : '연도를 누르면 숫자가 보여요.')); return; }
      vr.innerHTML = '<b>' + esc(Yr[i]) + (i >= est ? ' (추정)' : '') + '</b> · ' + all.filter(function (s) { return on[s.n]; }).map(function (s) { return esc(s.n) + ' ' + num(s.v[i], s) + (s.abs && s.abs[i] != null ? ' (' + esc(s.abs[i]) + ')' : ''); }).join(' · ') + (u ? ' <small>(' + esc(u) + ')</small>' : '');
    }
    function draw() {
      var w = wOf(host), h = Math.round(clamp(w * 0.56, 250, 360)), hasL = Ls.some(function (s) { return on[s.n]; }), m = { l: 44, r: hasL ? (p.lunit && p.lunit !== '%' ? 50 : 40) : 8, t: 16, b: 30 }, iw = w - m.l - m.r, ih = h - m.t - m.b;
      var vb = Bs.filter(function (s) { return on[s.n]; }), vals = [0];
      vb.forEach(function (s) { s.v.forEach(function (v) { if (v != null) vals.push(v); }); });
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals); if (hi === lo) hi = lo + 1; var pad = (hi - lo) * 0.1; lo = lo < 0 ? lo - pad : 0; hi += pad;
      var lv = [0]; Ls.forEach(function (s) { if (on[s.n]) s.v.forEach(function (v) { if (v != null) lv.push(v); }); });
      var llo = Math.min.apply(null, lv), lhi = Math.max.apply(null, lv); if (lhi === llo) lhi = llo + 1; var lp = (lhi - llo) * 0.12; llo -= llo < 0 ? lp : 0; lhi += lp;
      var Y = function (v) { return m.t + ih * (hi - v) / (hi - lo); }, YL = function (v) { return m.t + ih * (lhi - v) / (lhi - llo); }, cw = iw / Yr.length, o = '';
      if (est < Yr.length) o += '<rect x="' + (m.l + cw * est) + '" y="' + m.t + '" width="' + cw * (Yr.length - est) + '" height="' + ih + '" fill="rgba(232,201,160,.07)"/><text x="' + (m.l + cw * est + 4) + '" y="' + (m.t + 12) + '" class="twm" style="font-size:10.5px">추정</text>';
      nice(lo, hi).forEach(function (yv) { o += '<line class="gl" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(yv) + '" y2="' + Y(yv) + '"/><text x="' + (m.l - 6) + '" y="' + (Y(yv) + 4) + '" text-anchor="end">' + ax(yv) + '</text>'; });
      if (hasL) nice(llo, lhi).forEach(function (lvv) { o += '<text x="' + (w - m.r + 4) + '" y="' + (YL(lvv) + 4) + '" class="twm">' + ax(lvv) + (p.lunit == null ? '%' : p.lunit) + '</text>'; });
      o += '<line class="ax" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
      var bw = Math.max(3, Math.min(26, (cw - 10) / Math.max(1, vb.length)));
      Yr.forEach(function (y, i) {
        var cx = m.l + cw * i, hl = i === sel || i === pick || (showAns && i === ctx.answer);
        if (hl) o += '<rect x="' + (cx + 1) + '" y="' + m.t + '" width="' + (cw - 2) + '" height="' + ih + '" fill="' + (showAns && i === ctx.answer ? 'rgba(169,216,188,.16)' : i === pick ? 'rgba(232,201,160,.16)' : 'rgba(143,170,220,.10)') + '"/>';
        vb.forEach(function (s, j) {
          var v = s.v[i]; if (v == null) return;
          var x = cx + cw / 2 - vb.length * bw / 2 + j * bw, y1 = Y(Math.max(0, v)), y2 = Y(Math.min(0, v));
          o += '<rect x="' + x.toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + (bw - 1.5).toFixed(1) + '" height="' + Math.max(1, y2 - y1).toFixed(1) + '" fill="' + s._c + '"' + (i >= est ? ' opacity=".6"' : '') + '/>';
        });
        o += '<text x="' + (cx + cw / 2) + '" y="' + (h - 10) + '" text-anchor="middle"' + (hl ? ' class="tt"' : '') + '>' + esc(String(y).replace(/^20(\d\d)/, w < 520 ? '’$1' : '20$1')) + '</text>';
      });
      Ls.forEach(function (s) {
        if (!on[s.n]) return;
        var pts = []; s.v.forEach(function (v, i) { if (v != null) pts.push([m.l + cw * i + cw / 2, YL(v), v]); });
        o += '<path d="' + pathOf(pts) + '" fill="none" stroke="' + s._c + '" stroke-width="2"/>';
        pts.forEach(function (q) { o += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="4" fill="' + s._c + '" stroke="#0B1526" stroke-width="1.5"/>'; if (Yr.length <= 6) o += '<text x="' + q[0] + '" y="' + (q[1] - 9) + '" text-anchor="middle" class="tt" style="font-size:11.5px">' + num(q[2], s) + '</text>'; });
      });
      Yr.forEach(function (y, i) { o += '<rect class="hit" data-y="' + i + '" x="' + (m.l + cw * i) + '" y="' + m.t + '" width="' + cw + '" height="' + (ih + 14) + '" style="cursor:pointer"/>'; });
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', (p.label || '') + ' ' + all.map(function (s) { return s.n + ': ' + Yr.map(function (y, i) { return y + ' ' + num(s.v[i], s); }).join(', '); }).join(' / ') + (u ? ' (' + u + ')' : ''));
    }
    function choose(i) {
      if (Q) { if (locked) return; pick = i; host.querySelectorAll('.yrs button').forEach(function (b) { var o2 = +b.getAttribute('data-y') === i; b.classList.toggle('on', o2); b.setAttribute('aria-checked', o2); }); ctx.ready(true); }
      sel = i; readout(i); draw();
    }
    host.querySelectorAll('.stg button').forEach(function (b) {
      b.onclick = function () { var n = b.getAttribute('data-s'); if (on[n] && Object.keys(on).filter(function (k) { return on[k]; }).length === 1) return; on[n] = on[n] ? 0 : 1; b.classList.toggle('on', !!on[n]); b.setAttribute('aria-pressed', !!on[n]); readout(sel); draw(); };
    });
    svg.addEventListener('click', function (e) { var y = e.target.getAttribute && e.target.getAttribute('data-y'); if (y != null) choose(+y); });
    host.querySelectorAll('.yrs button').forEach(function (b) { b.onclick = function () { choose(+b.getAttribute('data-y')); }; });
    if (Q) host.__solve = function (right) { choose(right ? ctx.answer : (ctx.answer + 1) % Yr.length); };
    readout(p.sel == null ? null : p.sel); if (p.sel != null) sel = p.sel;
    return {
      draw: draw,
      check: function () { return { right: pick === ctx.answer, detail: '고른 해: ' + Yr[pick] + '.' }; },
      reveal: function (right, ans) {
        locked = true; showAns = ans || right;
        host.querySelectorAll('.yrs button').forEach(function (b) { var i = +b.getAttribute('data-y'); if (i === pick) b.classList.add(right ? 'ok' : 'no'); if (showAns && i === ctx.answer) b.classList.add('ok'); b.disabled = true; });
        if (showAns) { sel = ctx.answer; readout(ctx.answer); } draw();
      }
    };
  };

  // 숫자 표를 한 줄씩: 줄을 열 때마다 그 줄의 뜻(d)이 아래에 나온다. 고친 숫자(fix)는 ?review=1 에서만 † 표시 (학습 화면엔 맞는 숫자만)
  VIS.finRows = function (host, p, ctx) {
    var cols = p.cols || [], rows = p.rows || [], n = p.start || 0;
    host.innerHTML = '<div class="frw"><table class="frt"><thead><tr><th scope="col">' + esc(p.unit || '') + '</th>' + cols.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, i) { return '<tr class="' + (i < n ? '' : 'hid') + (r.hl ? ' hl' : '') + (r.sub ? ' sub' : '') + '"><th scope="row">' + esc(r.l) + '</th>' + r.v.map(function (v, j) { var fx = !!(st && st.review) && r.fix && r.fix.indexOf(j) >= 0; return '<td class="' + (String(v).charAt(0) === '−' || String(v).charAt(0) === '-' ? 'neg' : '') + (fx ? ' fx' : '') + '">' + esc(v) + (fx ? '†' : '') + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div><div class="vbt"><button type="button" class="vgo on"></button></div><p class="vr" aria-live="polite"></p>' + (p.foot ? '<p class="vcap">' + esc(p.foot) + '</p>' : '');
    var trs = host.querySelectorAll('tbody tr'), bt = host.querySelector('.vgo'), vr = host.querySelector('.vr');
    function lab() {
      var r = rows[n - 1]; vr.innerHTML = r ? '<b>' + esc(r.l) + '</b>' + (r.d ? ' · ' + esc(r.d) : '') : esc(p.ask || '버튼을 눌러 한 줄씩 열어 보세요.');
      if (n >= rows.length) { bt.hidden = true; bt.classList.add('done'); gate(ctx, true); } else { bt.textContent = (n ? '다음 줄 · ' : '첫 줄 열기 · ') + rows[n].l; gate(ctx, false); }
    }
    bt.onclick = function () { if (n >= rows.length) return; trs[n].classList.remove('hid'); trs[n].style.animation = 'curRise .5s var(--e) both'; n++; lab(); };
    lab();
    return { draw: function () {}, gated: function () { return n < rows.length; } };
  };

  // ── M2 PER 부품 ─────────────────────────────────────
  // 이익 × PER: 지배주주순이익 − 우선주 배당 ÷ 유통주식수 = EPS, × PER = 주가. 블록 하나 = 한 해 이익
  VIS.epsPer = function (host, p) {
    var ni = p.ni || 300, pf = p.pref || 0, sh = p.shares || 1500, k = p.per || 12, nm = p.name || '';
    host.innerHTML = '<div class="eqs" aria-live="polite"></div><svg role="img"></svg>' +
      '<div class="vctl"><label for="curEn">순이익 <b></b></label><input id="curEn" type="range" min="' + (p.niMin || 100) + '" max="' + (p.niMax || 600) + '" step="10" value="' + ni + '" aria-label="지배주주순이익(억 원)"></div>' +
      '<div class="vctl"><label for="curEk">PER <b></b></label><input id="curEk" type="range" min="' + (p.perMin || 4) + '" max="' + (p.perMax || 30) + '" step="1" value="' + k + '" aria-label="PER 배수"></div>' +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eq = host.querySelector('.eqs'), vr = host.querySelector('.vr'), s1 = host.querySelector('#curEn'), s2 = host.querySelector('#curEk'), lb = host.querySelectorAll('.vctl label b');
    function box(t, v, c) { return '<div class="eq ' + (c || '') + '"><small>' + t + '</small><b>' + v + '</b></div>'; }
    function draw() {
      var e = (ni - pf) * 1e4 / sh, cap = (ni - pf) * k;
      lb[0].textContent = fmt(ni) + '억'; lb[1].textContent = k + '배';
      eq.innerHTML = box('지배주주순이익', fmt(ni) + '억') + '<i>−</i>' + box('우선주 배당', fmt(pf) + '억') + '<i>÷</i>' + box('유통주식수', fmt(sh) + '만 주') + '<i>=</i>' + box('EPS', fmt(e) + '원', 'hl') + '<i>×</i>' + box('PER', k + '배', 'wm') + '<i>=</i>' + box('주가', fmt(e * k) + '원', 'ac');
      var w = wOf(host), cols = 10, gap = 4, bw = Math.min(40, (w - gap * (cols - 1)) / cols), bh = 18, rows = Math.ceil(k / cols), h = 30 + rows * (bh + gap) + 8, o = '';
      o += '<text x="0" y="16" class="ta">블록 하나 = 한 해 순이익 ' + fmt(ni - pf) + '억 원 · PER ' + k + '배 = ' + k + '년 치</text>';
      for (var i = 0; i < k; i++) { var x = (i % cols) * (bw + gap), y = 28 + Math.floor(i / cols) * (bh + gap); o += '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + bw.toFixed(1) + '" height="' + bh + '" fill="' + (i < 10 ? 'rgba(143,170,220,.7)' : i < 20 ? 'rgba(143,170,220,.45)' : 'rgba(232,201,160,.55)') + '"/>'; }
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', '한 해 순이익 ' + fmt(ni - pf) + '억 원짜리 블록 ' + k + '개 = 시가총액 ' + fmt(cap) + '억 원 (예시)');
      vr.innerHTML = (nm ? esc(nm) + ' · ' : '') + '순이익 ' + fmt(ni - pf) + '억 × PER ' + k + ' = 시가총액 <b>' + fmt(cap) + '억 원</b> · 시가총액 ÷ 주식수 = 주가 <b>' + fmt(e * k) + '원</b> (예시)';
    }
    s1.oninput = function () { ni = +s1.value; draw(); }; s2.oninput = function () { k = +s2.value; draw(); };
    [s1, s2].forEach(function (s) { s.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
    return { draw: draw };
  };

  // 비교 회사 산점도: 가로 이익 성장률, 세로 PER. 점이나 버튼을 눌러 넣고 빼면 평균·중간값이 바뀐다. 문제 모드: 뺄 회사 고르기
  VIS.peerScatter = function (host, p, ctx) {
    var Q = ctx.mode === 'question', P = p.peers || [], off = {}, locked = false, showAns = false, mine = null, T = p.target || null, top = p.yMax || 40, x0 = p.xMin == null ? -10 : p.xMin, x1 = p.xMax || 40;
    var ans = (ctx.answer && ctx.answer.exclude) || [];
    (p.off || []).forEach(function (id) { off[id] = 1; });
    host.innerHTML = '<svg role="img"></svg><div class="vbt pst" role="group" aria-label="비교 회사 넣고 빼기">' + P.map(function (c) { return '<button type="button" data-p="' + esc(c.id) + '"><b>' + esc(c.n) + '</b>' + f1(c.per) + '배</button>'; }).join('') + '</div><p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr');
    function inc() { return P.filter(function (c) { return !off[c.id]; }); }
    function stats() {
      var v = inc().map(function (c) { return c.per; }).sort(function (a, b) { return a - b; }), n = v.length; if (!n) return null;
      return { n: n, mean: v.reduce(function (a, b) { return a + b; }, 0) / n, med: n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2 };
    }
    function paint() {
      host.querySelectorAll('.pst button').forEach(function (b) { var id = b.getAttribute('data-p'), o = !!off[id]; b.classList.toggle('on', !o); b.classList.toggle('offp', o); b.setAttribute('aria-pressed', !o); });
      var S = stats();
      if (!S) { vr.textContent = '회사를 하나 이상 넣어 주세요.'; return; }
      var t = '넣은 회사 ' + S.n + '곳 · 평균 <b>' + f1(S.mean) + '배</b> · 중간값 <b>' + f1(S.med) + '배</b>';
      if (T && T.eps) t += '<br>' + esc(T.n) + ' EPS ' + fmt(T.eps) + '원 × 중간값 ' + f1(S.med) + '배 = <b>' + fmt(T.eps * S.med) + '원</b> · 평균을 쓰면 ' + fmt(T.eps * S.mean) + '원';
      vr.innerHTML = t + ' (예시)';
    }
    function draw() {
      var w = wOf(host), h = Math.round(clamp(w * 0.6, 260, 380)), m = { l: 34, r: 12, t: 30, b: 38 }, iw = w - m.l - m.r, ih = h - m.t - m.b, s = '', S = stats();
      var X = function (g) { return m.l + iw * (clamp(g, x0, x1) - x0) / (x1 - x0); }, Y = function (v) { return m.t + ih * (1 - clamp(v, 0, top) / top); };
      for (var yv = 0; yv <= top; yv += 10) s += '<line class="gl" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(yv) + '" y2="' + Y(yv) + '"/><text x="' + (m.l - 6) + '" y="' + (Y(yv) + 4) + '" text-anchor="end">' + yv + '</text>';
      for (var g = Math.ceil(x0 / 10) * 10; g <= x1; g += 10) s += '<text x="' + X(g) + '" y="' + (h - 20) + '" text-anchor="middle">' + g + '%</text>';
      s += '<text x="' + (w - m.r) + '" y="' + (h - 4) + '" text-anchor="end">→ 이익 성장률(예상)</text><text x="0" y="14">PER(배) · (예시)</text>';
      s += '<line class="ax" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/>';
      if (T) s += '<line x1="' + X(T.g) + '" x2="' + X(T.g) + '" y1="' + m.t + '" y2="' + Y(0) + '" stroke="var(--wm)" stroke-dasharray="3 4"/><text x="' + clamp(X(T.g), m.l + 30, w - m.r - 30) + '" y="' + (m.t - 8) + '" text-anchor="middle" class="twm">' + esc(T.n) + ' ' + T.g + '%</text>';
      if (S) {
        var ym = Y(S.mean), yd = Y(S.med), lx = w - m.r - 2, near = Math.abs(ym - yd) < 14;
        s += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + ym + '" y2="' + ym + '" stroke="var(--no)" stroke-width="1.4" stroke-dasharray="6 4"/><line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + yd + '" y2="' + yd + '" stroke="var(--ac)" stroke-width="1.8"/>';
        s += '<text x="' + lx + '" y="' + (ym + (near && ym <= yd ? -6 : 14)) + '" text-anchor="end" class="tno">평균 ' + f1(S.mean) + '배' + (S.mean > top ? ' ↑' : '') + '</text><text x="' + lx + '" y="' + (yd + (near && ym <= yd ? 14 : -6)) + '" text-anchor="end" class="ta">중간값 ' + f1(S.med) + '배</text>';
      }
      var boxes = [], lw = w < 520 ? 62 : 74;
      if (S) { var lyM = Y(S.mean) + (Math.abs(Y(S.mean) - Y(S.med)) < 14 && Y(S.mean) <= Y(S.med) ? -6 : 14), lyD = Y(S.med) + (Math.abs(Y(S.mean) - Y(S.med)) < 14 && Y(S.mean) <= Y(S.med) ? 14 : -6); boxes.push([w - m.r - 40, lyM, 90], [w - m.r - 40, lyD, 90]); }
      function spot(cx, cy, up) {
        var tries = up ? [cy + 22, cy + 36] : [cy - 12, cy + 22, cy - 26, cy + 36];
        for (var q = 0; q < tries.length; q++) { var ty = tries[q], hit = boxes.some(function (b) { return Math.abs(b[0] - cx) < (b[2] || lw) && Math.abs(b[1] - ty) < 17; }); if (!hit) { boxes.push([cx, ty]); return ty; } }
        boxes.push([cx, tries[0]]); return tries[0];
      }
      P.slice().sort(function (a, b) { return b.per - a.per; }).forEach(function (c) {
        var o = !!off[c.id], cx = X(c.g), cy = Y(c.per), up = c.per > top, wantOff = ans.indexOf(c.id) >= 0;
        var col = showAns ? (wantOff ? 'var(--no)' : '#F2EFE8') : '#F2EFE8';
        s += '<g data-p="' + esc(c.id) + '" style="cursor:' + (locked ? 'default' : 'pointer') + '"><circle data-p="' + esc(c.id) + '" cx="' + cx + '" cy="' + cy + '" r="14" fill="transparent"/>';
        s += up ? '<path data-p="' + esc(c.id) + '" d="M' + (cx - 7) + ' ' + (cy + 6) + 'L' + cx + ' ' + (cy - 7) + 'L' + (cx + 7) + ' ' + (cy + 6) + 'z" fill="' + (o ? 'none' : col) + '" stroke="' + col + '" stroke-width="1.6"/>' : '<circle data-p="' + esc(c.id) + '" cx="' + cx + '" cy="' + cy + '" r="7" fill="' + (o ? 'none' : col) + '" stroke="' + (o ? 'rgba(242,239,232,.5)' : '#0B1526') + '" stroke-width="' + (o ? 1.4 : 2) + '"' + (o ? ' stroke-dasharray="2 2"' : '') + '/>';
        s += '<text x="' + clamp(cx, m.l + 20, w - m.r - 20) + '" y="' + spot(clamp(cx, m.l + 20, w - m.r - 20), cy, up) + '" text-anchor="middle" class="tt"' + (o ? ' style="opacity:.45"' : '') + '>' + esc(c.n) + ' ' + f1(c.per) + '배</text></g>';
      });
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = s;
      svg.setAttribute('aria-label', '비교 회사 PER 산점도 (예시). ' + P.map(function (c) { return c.n + ' 성장률 ' + c.g + '% PER ' + c.per + '배' + (off[c.id] ? ' (뺌)' : ''); }).join(', '));
      paint();
    }
    function tog(id) { if (locked) return; off[id] = off[id] ? 0 : 1; if (Q) ctx.ready(true); draw(); }
    host.querySelectorAll('.pst button').forEach(function (b) { b.onclick = function () { tog(b.getAttribute('data-p')); }; });
    svg.addEventListener('click', function (e) { var id = e.target.getAttribute && e.target.getAttribute('data-p'); if (id) tog(id); });
    function same(a) { var o = P.filter(function (c) { return off[c.id]; }).map(function (c) { return c.id; }); return o.length === a.length && a.every(function (x) { return o.indexOf(x) >= 0; }); }
    if (Q) host.__solve = function (right) { off = {}; var pick = right ? ans : [P.filter(function (c) { return ans.indexOf(c.id) < 0; })[0].id]; pick.forEach(function (id) { off[id] = 1; }); ctx.ready(true); draw(); };
    return {
      draw: draw,
      check: function () { var S = stats(), ok = same(ans); mine = JSON.parse(JSON.stringify(off)); return { right: ok, detail: '뺀 회사: ' + (P.filter(function (c) { return off[c.id]; }).map(function (c) { return c.n; }).join(', ') || '없음') + (S ? ' · 남은 중간값 ' + f1(S.med) + '배.' : '.') }; },
      reveal: function (right, a) {
        locked = true; showAns = a || right;
        host.querySelectorAll('.pst button').forEach(function (b) { var id = b.getAttribute('data-p'), ok = !!(mine || off)[id] === (ans.indexOf(id) >= 0); b.disabled = true; b.classList.add(ok ? 'ok' : 'no'); });
        if (showAns) { off = {}; ans.forEach(function (id) { off[id] = 1; }); }
        draw();
      }
    };
  };

  // PER 밴드 읽기: 해마다의 EPS × 배수 선(밴드)과 분기 주가. 슬라이더로 시점을 옮기며 그때 PER을 읽는다. 구간(A·B·…)을 눌러 해석 보기. 문제 모드: 설명에 맞는 구간 고르기
  VIS.bandRead = function (host, p, ctx) {
    var Q = ctx.mode === 'question', ML = p.mlab || 'PER', BL = p.blab || 'EPS', fm = function (x) { return p.dec ? x.toFixed(p.dec) : f1(x); }, B = p.bands || [10, 14, 18], Yr = p.years || [], E = p.eps || [], PR = p.price || [], est = p.est == null ? 99 : p.est, M = p.marks || [], N = PR.length - 1, k = p.start == null ? N : p.start, pick = null, seen = {}, locked = false, showAns = false, nm = p.name || '';
    var TONE = ['rgba(232,169,169,.7)', 'rgba(169,216,188,.7)', 'rgba(201,168,232,.75)', 'rgba(232,201,160,.85)', 'rgba(143,170,220,.7)'];
    function eq(i) { var t = (i - 1.5) / 4, a = Math.floor(t); if (t <= 0) return E[0]; if (a >= E.length - 1) return E[E.length - 1]; return E[a] + (E[a + 1] - E[a]) * (t - a); }
    function ql(i) { return Yr[Math.floor(i / 4)] + '년 ' + (i % 4 + 1) + '분기'; }
    function where(v) { if (v < B[0]) return B[0] + '배 아래'; for (var j = 0; j < B.length - 1; j++) if (v < B[j + 1]) return B[j] + '~' + B[j + 1] + '배 사이'; return B[B.length - 1] + '배 위'; }
    host.innerHTML = '<svg role="img"></svg><div class="vctl"><label for="curBr">시점 <b></b></label><input id="curBr" type="range" min="0" max="' + N + '" step="1" value="' + k + '" aria-label="시점 옮기기"></div><p class="vr" aria-live="polite"></p>' +
      '<div class="vbt brm" role="' + (Q ? 'radiogroup' : 'group') + '" aria-label="구간">' + M.map(function (mk, i) { return '<button type="button" ' + (Q ? 'role="radio" aria-checked="false" ' : 'class="vgo" ') + 'data-m="' + i + '"><b>' + esc(mk.k) + '</b>' + (Q ? '구간' : esc(mk.t)) + '<i>' + (i + 1) + '</i></button>'; }).join('') + '</div>' +
      (Q ? '' : '<p class="vr brd" aria-live="polite">구간 버튼을 눌러 그때 무슨 일이 있었는지 읽어 보세요.</p>') + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), sl = host.querySelector('input'), lb = host.querySelector('label b'), vr = host.querySelector('.vr'), brd = host.querySelector('.brd');
    function read() { var e = eq(k), m = PR[k] / e; lb.textContent = ql(k).replace(/^20/, '’').replace('년 ', ' ').replace('분기', 'Q'); vr.innerHTML = '<b>' + ql(k) + (Math.floor(k / 4) >= est ? ' (추정 이익)' : '') + '</b> · 주가 ' + fmt(PR[k]) + '원 · ' + BL + ' ' + fmt(e) + '원 → ' + ML + ' <b>' + fm(m) + '배</b> (' + where(m) + ')' + (nm ? ' · ' + esc(nm) : '') + ' (예시)'; }
    function draw() {
      var w = wOf(host), h = Math.round(clamp(w * 0.6, 260, 390)), m = { l: 46, r: 46, t: 18, b: 28 }, iw = w - m.l - m.r, ih = h - m.t - m.b, s = '';
      var hi = Math.max(Math.max.apply(null, PR), Math.max.apply(null, E) * B[B.length - 1]) * 1.1, X = function (i) { return m.l + iw * i / N; }, Y = function (v) { return m.t + ih * (1 - v / hi); };
      var line = function (mul) { var a = []; for (var i = 0; i <= N; i++) a.push([X(i), Y(eq(i) * mul)]); return a; };
      if (est < Yr.length) s += '<rect x="' + X(est * 4) + '" y="' + m.t + '" width="' + (X(N) - X(est * 4)) + '" height="' + ih + '" fill="rgba(232,201,160,.07)"/><text x="' + (X(est * 4) + 4) + '" y="' + (m.t + 12) + '" class="twm" style="font-size:10.5px">추정</text>';
      M.forEach(function (mk, i) {
        var on = i === pick || (showAns && i === ctx.answer) || (!Q && seen[i] === 2);
        var fill = showAns && i === ctx.answer ? 'rgba(169,216,188,.22)' : on ? 'rgba(232,201,160,.2)' : 'rgba(242,239,232,.05)';
        s += '<rect data-m="' + i + '" x="' + X(mk.a) + '" y="' + m.t + '" width="' + Math.max(6, X(mk.b) - X(mk.a)) + '" height="' + ih + '" fill="' + fill + '" style="cursor:pointer"/><text data-m="' + i + '" x="' + ((X(mk.a) + X(mk.b)) / 2) + '" y="' + (m.t + ih - 8) + '" text-anchor="middle" class="th" style="cursor:pointer">' + esc(mk.k) + '</text>';
      });
      for (var j = 0; j < 4; j++) { var yv = hi * j / 4; s += '<line class="gl" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(yv) + '" y2="' + Y(yv) + '"/><text x="' + (m.l - 6) + '" y="' + (Y(yv) + 4) + '" text-anchor="end">' + (yv ? f1(yv / 1000) + 'k' : '0') + '</text>'; }
      B.forEach(function (b, i) { s += '<path d="' + pathOf(line(b)) + '" fill="none" stroke="' + TONE[i % 5] + '" stroke-width="1.5"/><text x="' + (w - m.r + 4) + '" y="' + (Y(eq(N) * b) + 4) + '" style="fill:' + TONE[i % 5] + '">' + b + '배</text>'; });
      Yr.forEach(function (y, i) { if (w < 520 && i % 2) return; s += '<text x="' + X(i * 4 + 1.5) + '" y="' + (h - 8) + '" text-anchor="middle">' + esc(w < 520 ? '’' + String(y).slice(2) : y) + '</text>'; });
      var pp = PR.map(function (v, i) { return [X(i), Y(v)]; });
      s += '<path class="lp" d="' + pathOf(pp) + '"/>';
      s += '<line x1="' + X(k) + '" x2="' + X(k) + '" y1="' + m.t + '" y2="' + (h - m.b) + '" stroke="var(--wm)" stroke-dasharray="3 3"/><circle cx="' + X(k) + '" cy="' + Y(PR[k]) + '" r="6" fill="var(--wm)" stroke="#0B1526" stroke-width="2"/>';
      s += '<text x="' + m.l + '" y="' + (m.t + 12) + '">주가(원) · (예시)</text>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = s;
      svg.setAttribute('aria-label', (nm || '') + ' ' + ML + ' 밴드 (예시). 배수 ' + B.join('·') + '배. 연도별 ' + BL + ' ' + Yr.map(function (y, i) { return y + ' ' + E[i] + '원'; }).join(', '));
    }
    function setK(x) { k = clamp(Math.round(x), 0, N); sl.value = k; read(); draw(); }
    function choose(i) {
      if (Q) { if (locked) return; pick = i; host.querySelectorAll('.brm button').forEach(function (b) { var o = +b.getAttribute('data-m') === i; b.classList.toggle('on', o); b.setAttribute('aria-checked', o); }); ctx.ready(true); draw(); return; }
      var mk = M[i]; Object.keys(seen).forEach(function (x) { seen[x] = 1; }); seen[i] = 2;
      var b = host.querySelector('.brm button[data-m="' + i + '"]'); b.classList.add('done');
      host.querySelectorAll('.brm button').forEach(function (x) { x.classList.toggle('on', x === b); });
      brd.innerHTML = '<b>' + esc(mk.k + ' · ' + mk.t) + '</b><br>' + esc(mk.d || '');
      setK(Math.round((mk.a + mk.b) / 2));
      gate(ctx, Object.keys(seen).length >= M.length);
    }
    sl.oninput = function () { setK(+sl.value); };
    sl.addEventListener('keydown', function (e) { e.stopPropagation(); });
    host.querySelectorAll('.brm button').forEach(function (b) { b.onclick = function () { choose(+b.getAttribute('data-m')); }; });
    svg.addEventListener('click', function (e) { var i = e.target.getAttribute && e.target.getAttribute('data-m'); if (i != null) choose(+i); });
    if (Q) host.__solve = function (right) { choose(right ? ctx.answer : (ctx.answer + 1) % M.length); };
    read(); if (!Q) gate(ctx, !M.length);
    return {
      draw: draw, key: function (n) { if (Q && M[n - 1]) choose(n - 1); },
      gated: function () { return !Q && Object.keys(seen).length < M.length; },
      check: function () { return { right: pick === ctx.answer, detail: '고른 구간: ' + M[pick].k + '.' }; },
      reveal: function (right, a) {
        locked = true; showAns = a || right;
        host.querySelectorAll('.brm button').forEach(function (b) { var i = +b.getAttribute('data-m'); if (i === pick) b.classList.add(right ? 'ok' : 'no'); if (showAns && i === ctx.answer) b.classList.add('ok'); b.disabled = true; });
        if (showAns) { var mk = M[ctx.answer]; setK(Math.round((mk.a + mk.b) / 2)); if (mk.t) vr.innerHTML += '<br><b>' + esc(mk.k + ' · ' + mk.t) + '</b> ' + esc(mk.d || ''); } else draw();
      }
    };
  };

  // PER과 DCF: 이익을 전부 돌려주는 회사라면 PER = 1 ÷ (할인율 − 성장률). 슬라이더로 칸을 고르면 표에 불이 켜진다
  VIS.perDcf = function (host, p) {
    var R = p.rates || [8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12], G = p.growths || [0, 0.5, 1, 1.5, 2], ri = Math.max(0, R.indexOf(p.r == null ? 10 : p.r)), gi = Math.max(0, G.indexOf(p.g || 0)), cf = p.cf || 100;
    function per(r, g) { return 100 / (r - g); }
    function pc1(x) { return (Math.round(x * 10) / 10).toFixed(1) + '%'; }
    host.innerHTML = '<div class="vctl"><label for="curDr">할인율 <b></b></label><input id="curDr" type="range" min="0" max="' + (R.length - 1) + '" step="1" value="' + ri + '" aria-label="할인율"></div>' +
      '<div class="vctl"><label for="curDg">영구성장률 <b></b></label><input id="curDg" type="range" min="0" max="' + (G.length - 1) + '" step="1" value="' + gi + '" aria-label="영구성장률"></div><p class="vr" aria-live="polite"></p>' +
      '<div class="frw"><table class="pdt"><thead><tr><th scope="col">할인율＼성장률</th>' + G.map(function (g, j) { return '<th scope="col" data-g="' + j + '">' + pc1(g) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      R.map(function (r, i) { return '<tr data-r="' + i + '"><th scope="row">' + pc1(r) + '</th>' + G.map(function (g, j) { var v = per(r, g), a = clamp((v - 8) / 9, 0, 1); return '<td data-g="' + j + '" style="background:rgba(143,170,220,' + (0.06 + a * 0.4).toFixed(2) + ')">' + f1(v).replace(/^(\d+)$/, '$1.0') + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var s1 = host.querySelector('#curDr'), s2 = host.querySelector('#curDg'), lb = host.querySelectorAll('.vctl label b'), vr = host.querySelector('.vr');
    function draw() {
      var r = R[ri], g = G[gi], v = per(r, g);
      lb[0].textContent = pc1(r); lb[1].textContent = pc1(g);
      vr.innerHTML = '내년 이익 ' + cf + '이 해마다 ' + pc1(g) + '씩 자라며 영원히 → 현재가치 ' + cf + ' ÷ (' + (r / 100).toFixed(3).replace(/0$/, '') + ' − ' + (g / 100).toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + ') = <b>' + fmt(cf * v) + '</b> → 이익의 <b>' + f1(v) + '배</b> (예시)';
      host.querySelectorAll('.pdt td, .pdt th').forEach(function (c) { c.classList.remove('on', 'rw', 'cl'); });
      host.querySelectorAll('.pdt tr[data-r="' + ri + '"] td, .pdt tr[data-r="' + ri + '"] th').forEach(function (c) { c.classList.add('rw'); });
      host.querySelectorAll('.pdt [data-g="' + gi + '"]').forEach(function (c) { c.classList.add('cl'); });
      var on = host.querySelector('.pdt tr[data-r="' + ri + '"] td[data-g="' + gi + '"]'); if (on) on.classList.add('on');
    }
    s1.oninput = function () { ri = +s1.value; draw(); }; s2.oninput = function () { gi = +s2.value; draw(); };
    [s1, s2].forEach(function (s) { s.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
    host.querySelectorAll('.pdt td').forEach(function (c) { c.style.cursor = 'pointer'; c.onclick = function () { ri = +c.parentNode.getAttribute('data-r'); gi = +c.getAttribute('data-g'); s1.value = ri; s2.value = gi; draw(); }; });
    return { draw: draw };
  };

  // Trailing vs Forward: 분기 타임라인 위에 배수의 분모(어느 기간 이익인지)와 목표주가 도달 시점을 켠다. 네 종류를 다 눌러야 다음으로
  VIS.fwdTrail = function (host, p, ctx) {
    var T = p.types || [], now = p.now == null ? 6 : p.now, y0 = p.y0 || 2024, NQ = (p.years || 4) * 4, seen = {}, cur = -1;
    host.innerHTML = '<svg role="img"></svg><div class="vbt ftb" role="group" aria-label="배수 종류">' + T.map(function (t, i) { return '<button type="button" class="vgo" data-t="' + i + '"><b>' + esc(t.k) + '</b><i>' + esc(t.s || '') + '</i></button>'; }).join('') + '</div><div class="ftp" aria-live="polite"><p class="vr">' + esc(p.ask || '배수 종류를 하나씩 눌러 보세요.') + '</p></div>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), pn = host.querySelector('.ftp');
    function draw() {
      var w = wOf(host), h = 168, m = { l: 6, r: 6 }, iw = w - m.l - m.r, X = function (q) { return m.l + iw * q / NQ; }, s = ARDEF, t = T[cur];
      s += '<rect x="' + X(0) + '" y="44" width="' + (X(now) - X(0)) + '" height="34" fill="rgba(242,239,232,.08)"/><rect x="' + X(now) + '" y="44" width="' + (X(NQ) - X(now)) + '" height="34" fill="rgba(232,201,160,.07)"/>';
      s += '<text x="' + (X(now) - 6) + '" y="38" text-anchor="end">확정 실적</text><text x="' + (X(now) + 6) + '" y="38" class="twm">추정</text>';
      for (var q = 0; q <= NQ; q++) s += '<line x1="' + X(q) + '" x2="' + X(q) + '" y1="' + (q % 4 ? 70 : 44) + '" y2="78" stroke="rgba(242,239,232,' + (q % 4 ? '.18' : '.4') + ')"/>';
      for (var y = 0; y < NQ / 4; y++) s += '<text x="' + X(y * 4 + 2) + '" y="96" text-anchor="middle" class="tt">' + (y0 + y) + '</text>';
      s += '<line x1="' + X(now) + '" x2="' + X(now) + '" y1="22" y2="104" stroke="var(--tx)" stroke-width="2"/><text x="' + X(now) + '" y="16" text-anchor="middle" class="th">지금</text>';
      if (t) {
        s += '<rect x="' + X(t.a) + '" y="48" width="' + (X(t.b) - X(t.a)) + '" height="26" fill="rgba(143,170,220,.55)" stroke="var(--ac)"/><text x="' + ((X(t.a) + X(t.b)) / 2) + '" y="66" text-anchor="middle" class="tt">분모: ' + esc(t.den || '') + '</text>';
        if (t.hit != null) s += varr(X(t.b), 118, X(t.hit) + (t.hit > t.b ? -2 : 2), 118, 0, 'var(--wm)', 'curAr4') + '<circle cx="' + X(t.hit) + '" cy="118" r="5" fill="var(--wm)"/><text x="' + clamp(X(t.hit), 70, w - 70) + '" y="142" text-anchor="middle" class="twm">' + esc(t.when || '') + '</text>';
        else s += '<text x="' + X(now) + '" y="142" text-anchor="middle" class="twm">' + esc(t.when || '') + '</text>';
      }
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = s;
      svg.setAttribute('aria-label', '분기 타임라인 ' + y0 + '~' + (y0 + NQ / 4 - 1) + '년. ' + (t ? t.k + ': 분모 ' + t.den + ', ' + t.when : '배수 종류를 고르세요'));
    }
    host.querySelectorAll('.ftb .vgo').forEach(function (b) {
      b.onclick = function () {
        cur = +b.getAttribute('data-t'); seen[cur] = 1; b.classList.add('done');
        host.querySelectorAll('.ftb .vgo').forEach(function (x) { x.classList.toggle('on', x === b); });
        var t = T[cur];
        pn.innerHTML = '<dl class="ftd"><dt>분자</dt><dd>' + esc(t.num || '지금 시가총액') + '</dd><dt>분모</dt><dd>' + esc(t.den) + '</dd><dt>좋은 점</dt><dd>' + esc(t.pro) + '</dd><dt>조심할 점</dt><dd>' + esc(t.con) + '</dd><dt>' + esc(p.goal || '목표주가') + '</dt><dd>' + esc(t.use) + '</dd></dl>';
        draw(); gate(ctx, Object.keys(seen).length >= T.length);
      };
    });
    gate(ctx, false);
    return { draw: draw, gated: function () { return Object.keys(seen).length < T.length; } };
  };

  // PER 5단계 모형: 매출 → 비용 → 이익 → 배수 → 시가총액·주가. 단계를 하나씩 열고, 열린 단계의 슬라이더로 가정을 바꾼다
  VIS.plBuilder = function (host, p, ctx) {
    var v = { vol: p.vol || 5, pr: p.price || 1200, cg: p.cogs || 60, fx: p.fixed || 1160, no: p.nonop || -40, tx: p.tax || 25, mi: p.minority || 50, sh: p.shares || 1000, per: p.per || 12, now: p.now || 0 }, n = 1, nm = p.name || '';
    var ST = [
      { t: '1. 매출 추정', q: '왜 그 숫자인지 논리를 남겨요. 틀려도 어디서 틀렸는지 찾을 수 있게.', sl: ['vol', '판매량', 3, 7, 0.1, '억 개'] },
      { t: '2. 비용 추정', q: '팔수록 느는 비용(변동비)과 팔든 말든 나가는 비용(고정비)을 나눠요.', sl: ['cg', '원가율', 50, 70, 1, '%'] },
      { t: '3. 이익 추정', q: '영업 밖 손익, 세금, 남의 몫(비지배)을 떼고 지배주주순이익까지.' },
      { t: '4. 배수(PER) 정하기', q: '이 이익에 몇 배를 줄지, 어떤 논리로 줄지가 투자 의견이에요.', sl: ['per', 'PER', 6, 20, 0.5, '배'] },
      { t: '5. 시가총액·적정 주가', q: '지배주주순이익 × PER = 시가총액, EPS × PER = 적정 주가.' }
    ];
    host.innerHTML = '<div class="pbs">' + ST.map(function (s, i) {
      return '<section class="pbx" data-s="' + i + '"' + (i < n ? '' : ' hidden') + '><h4>' + esc(s.t) + '</h4><p class="pq">' + esc(s.q) + '</p>' +
        (s.sl ? '<div class="vctl"><label for="curPb' + i + '">' + esc(s.sl[1]) + ' <b></b></label><input id="curPb' + i + '" data-k="' + s.sl[0] + '" type="range" min="' + s.sl[2] + '" max="' + s.sl[3] + '" step="' + s.sl[4] + '" value="' + v[s.sl[0]] + '" aria-label="' + esc(s.sl[1]) + '"></div>' : '') + '<div class="pbr"></div></section>';
    }).join('') + '</div><div class="vbt"><button type="button" class="vgo on"></button></div><p class="vr pbsum" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var bt = host.querySelector('.vgo'), sum = host.querySelector('.pbsum');
    function calc() {
      var rev = v.vol * v.pr, cogs = rev * v.cg / 100, op = rev - cogs - v.fx, pre = op + v.no, tax = pre > 0 ? pre * v.tx / 100 : 0, ni = pre - tax, ct = ni - v.mi, eps = ct * 1e4 / v.sh;
      return { rev: rev, cogs: cogs, op: op, pre: pre, tax: tax, ni: ni, ct: ct, eps: eps, cap: ct * v.per, price: eps * v.per };
    }
    function row(l, x, cls) { return '<div class="' + (cls || '') + '"><span>' + l + '</span><b>' + x + '</b></div>'; }
    function sg(x) { return (x < 0 ? '−' : '') + fmt(Math.abs(x)); }
    function draw() {
      var c = calc(), R = [
        row('판매량 × 단가', f1(v.vol) + '억 개 × ' + fmt(v.pr) + '원') + row('매출', fmt(c.rev) + '억', 'hl'),
        row('매출원가 (원가율 ' + v.cg + '%)', '−' + fmt(c.cogs) + '억') + row('고정비 (인건비·임대료·감가상각)', '−' + fmt(v.fx) + '억') + row('영업이익', sg(c.op) + '억', 'hl'),
        row('영업외손익 (이자 등)', sg(v.no) + '억') + row('법인세 (' + v.tx + '%)', '−' + fmt(c.tax) + '억') + row('당기순이익', sg(c.ni) + '억') + row('비지배주주 몫', '−' + fmt(v.mi) + '억') + row('지배주주순이익', sg(c.ct) + '억', 'hl'),
        row('EPS (÷ ' + fmt(v.sh) + '만 주)', fmt(c.eps) + '원') + row('PER', f1(v.per) + '배', 'hl'),
        row('시가총액 = ' + fmt(c.ct) + '억 × ' + f1(v.per), fmt(c.cap) + '억') + row('적정 주가 = ' + fmt(c.eps) + '원 × ' + f1(v.per), fmt(c.price) + '원', 'hl') + (v.now ? row('지금 주가 ' + fmt(v.now) + '원 대비', pc(c.price / v.now - 1), c.price >= v.now ? 'ok' : 'no') : '')
      ];
      host.querySelectorAll('.pbx').forEach(function (s, i) { s.querySelector('.pbr').innerHTML = R[i]; var l = s.querySelector('label b'); if (l) { var d = ST[i].sl; l.textContent = (d[0] === 'vol' || d[0] === 'per' ? f1(v[d[0]]) : v[d[0]]) + d[5]; } });
      var chips = [['매출', fmt(c.rev) + '억'], ['영업이익', sg(c.op) + '억'], ['지배주주순이익', sg(c.ct) + '억'], ['PER', f1(v.per) + '배'], ['적정 주가', fmt(c.price) + '원']].slice(0, n);
      sum.innerHTML = (nm ? esc(nm) + ' · ' : '') + chips.map(function (x, i) { return (i === n - 1 ? '<b>' : '') + x[0] + ' ' + x[1] + (i === n - 1 ? '</b>' : ''); }).join(' → ') + ' (예시)';
    }
    function lab() { if (n >= ST.length) { bt.hidden = true; bt.classList.add('done'); gate(ctx, true); } else { bt.textContent = '다음 단계 · ' + ST[n].t; gate(ctx, false); } }
    host.querySelectorAll('.pbx input').forEach(function (s) { s.oninput = function () { v[s.getAttribute('data-k')] = +s.value; draw(); }; s.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
    bt.onclick = function () { if (n >= ST.length) return; var sx = host.querySelector('.pbx[data-s="' + n + '"]'); sx.hidden = false; n++; draw(); lab(); };
    draw(); lab();
    return { draw: function () {}, gated: function () { return n < ST.length; } };
  };

  // ── M3 PBR 부품 ─────────────────────────────────────
  // 자산 − 부채 = 순자산 ÷ 주식수 = BPS, × PBR = 주가. 막대: 자산 | 부채+순자산 | 시가총액
  VIS.bpsPbr = function (host, p) {
    var A = p.asset || 8000, D = p.debt || 5000, nc = p.nci || 0, sh = p.shares || 1500, k = p.pbr || 0.8, nm = p.name || '';
    host.innerHTML = '<div class="eqs" aria-live="polite"></div><svg role="img"></svg>' +
      '<div class="vctl"><label for="curBa">자산 <b></b></label><input id="curBa" type="range" min="' + (p.aMin || 4000) + '" max="' + (p.aMax || 12000) + '" step="100" value="' + A + '" aria-label="자산(억 원)"></div>' +
      '<div class="vctl"><label for="curBd">부채 <b></b></label><input id="curBd" type="range" min="' + (p.dMin || 1000) + '" max="' + (p.dMax || 9000) + '" step="100" value="' + D + '" aria-label="부채(억 원)"></div>' +
      '<div class="vctl"><label for="curBk">PBR <b></b></label><input id="curBk" type="range" min="' + (p.pMin || 0.2) + '" max="' + (p.pMax || 2.5) + '" step="0.1" value="' + k + '" aria-label="PBR 배수"></div>' +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eq = host.querySelector('.eqs'), vr = host.querySelector('.vr'), sA = host.querySelector('#curBa'), sD = host.querySelector('#curBd'), sK = host.querySelector('#curBk'), lb = host.querySelectorAll('.vctl label b');
    function box(t, v, c) { return '<div class="eq ' + (c || '') + '"><small>' + t + '</small><b>' + v + '</b></div>'; }
    function draw() {
      if (D > A - 100) { D = A - 100; sD.value = D; }
      var E = A - D, ctl = E - nc, bps = ctl * 1e4 / sh, mc = ctl * k;
      lb[0].textContent = fmt(A) + '억'; lb[1].textContent = fmt(D) + '억'; lb[2].textContent = k.toFixed(1) + '배';
      eq.innerHTML = box('자산', fmt(A) + '억') + '<i>−</i>' + box('부채', fmt(D) + '억') + (nc ? '<i>−</i>' + box('비지배 몫', fmt(nc) + '억') : '') + '<i>=</i>' + box('순자산(지배)', fmt(ctl) + '억', 'hl') + '<i>÷</i>' + box('주식수', fmt(sh) + '만 주') + '<i>=</i>' + box('BPS', fmt(bps) + '원', 'hl') + '<i>×</i>' + box('PBR', k.toFixed(1) + '배', 'wm') + '<i>=</i>' + box('주가', fmt(bps * k) + '원', 'ac');
      var w = wOf(host), h = 290, m = { t: 22, b: 30 }, ih = h - m.t - m.b, top = Math.max(p.aMax || 12000, mc) * 1.06, sc = ih / top, bw = Math.min(90, (w - 40) / 3 - 18), gap = (w - bw * 3) / 2, base = h - m.b, o = '';
      var x1 = 0, x2 = bw + gap, x3 = 2 * (bw + gap);
      o += '<line class="ax" x1="0" x2="' + w + '" y1="' + base + '" y2="' + base + '"/>';
      o += '<rect x="' + x1 + '" y="' + (base - A * sc) + '" width="' + bw + '" height="' + A * sc + '" fill="rgba(242,239,232,.08)" stroke="rgba(242,239,232,.45)" style="transition:all .3s"/><text x="' + (x1 + bw / 2) + '" y="' + (base - A * sc / 2 + 4) + '" text-anchor="middle" class="tt">자산</text>';
      o += '<rect x="' + x2 + '" y="' + (base - A * sc) + '" width="' + bw + '" height="' + D * sc + '" fill="rgba(242,239,232,.16)" stroke="rgba(242,239,232,.45)" style="transition:all .3s"/><text x="' + (x2 + bw / 2) + '" y="' + (base - A * sc + D * sc / 2 + 4) + '" text-anchor="middle" class="tt">부채 · 채권자 몫</text>';
      o += '<rect x="' + x2 + '" y="' + (base - E * sc) + '" width="' + bw + '" height="' + E * sc + '" fill="rgba(143,170,220,.4)" stroke="var(--ac)" style="transition:all .3s"/><text x="' + (x2 + bw / 2) + '" y="' + (base - E * sc / 2 + 4) + '" text-anchor="middle" class="th">순자산</text>';
      o += '<line x1="' + x2 + '" x2="' + (x3 + bw) + '" y1="' + (base - ctl * sc) + '" y2="' + (base - ctl * sc) + '" stroke="var(--ac)" stroke-dasharray="4 4"/>';
      o += '<rect x="' + x3 + '" y="' + (base - mc * sc) + '" width="' + bw + '" height="' + mc * sc + '" fill="rgba(232,201,160,.5)" stroke="var(--wm)" style="transition:all .3s"/><text x="' + (x3 + bw / 2) + '" y="' + (base - mc * sc - 8) + '" text-anchor="middle" class="twm">' + fmt(mc) + '억</text>';
      [['자산', x1], ['부채 + 자본', x2], ['시가총액', x3]].forEach(function (t) { o += '<text x="' + (t[1] + bw / 2) + '" y="' + (h - 10) + '" text-anchor="middle">' + t[0] + '</text>'; });
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', '자산 ' + fmt(A) + '억 = 부채 ' + fmt(D) + '억 + 순자산 ' + fmt(E) + '억. PBR ' + k.toFixed(1) + '배면 시가총액 ' + fmt(mc) + '억 원 (예시)');
      vr.innerHTML = (nm ? esc(nm) + ' · ' : '') + '시가총액 <b>' + fmt(mc) + '억</b>은 순자산의 <b>' + k.toFixed(1) + '배</b>' + (k < 1 ? ', 장부에 적힌 순자산보다 싸게 거래돼요' : k > 1 ? ', 장부보다 비싸게 쳐 주고 있어요' : ', 장부와 같아요') + ' (예시)';
    }
    sA.oninput = function () { A = +sA.value; draw(); }; sD.oninput = function () { D = +sD.value; draw(); }; sK.oninput = function () { k = +sK.value; draw(); };
    [sA, sD, sK].forEach(function (s) { s.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
    return { draw: draw };
  };

  // 제품 가격(세로) × 원재료 가격(가로) 네 국면. 슬라이더로 점을 옮기면 스프레드(P − C)가 바뀐다. 문제 모드: 국면 고르기
  VIS.spreadQuad = function (host, p, ctx) {
    var Q = ctx.mode === 'question', P0 = p.p0 || 100, C0 = p.c0 || 70, dp = p.dp || 0, dc = p.dc || 0, R = p.range || 40, seen = {}, pick = null, locked = false, showAns = false;
    var L = p.labels || ['Super Cycle', 'Good, but not normal', '경기 불황', 'Bad Cycle'], N = p.notes || [], PRE = [[20, 20], [20, -20], [-20, -20], [-20, 20]];
    host.innerHTML = '<svg role="img"></svg>' + (Q ? '' : '<div class="vctl"><label for="curSp">제품 가격 <b></b></label><input id="curSp" type="range" min="' + (-R) + '" max="' + R + '" step="5" value="' + dp + '" aria-label="제품 가격 변화(%)"></div><div class="vctl"><label for="curSc">원재료 가격 <b></b></label><input id="curSc" type="range" min="' + (-R) + '" max="' + R + '" step="5" value="' + dc + '" aria-label="원재료 가격 변화(%)"></div>') +
      '<div class="vbt sqb" role="' + (Q ? 'radiogroup' : 'group') + '" aria-label="국면">' + [0, 1, 2, 3].map(function (i) { return '<button type="button" ' + (Q ? 'role="radio" aria-checked="false" ' : 'class="vgo" ') + 'data-q="' + i + '"><b>' + (i + 1) + '</b>' + (Q ? '사분면' : esc(L[i])) + '<i>' + (i + 1) + '</i></button>'; }).join('') + '</div><p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr'), sP = host.querySelector('#curSp'), sC = host.querySelector('#curSc'), lb = host.querySelectorAll('.vctl label b');
    function quad(a, b) { if (a > 0 && b > 0) return 0; if (a > 0 && b < 0) return 1; if (a < 0 && b < 0) return 2; if (a < 0 && b > 0) return 3; return -1; }
    function sg(x) { return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x); }
    function read() {
      var pp = P0 * (1 + dp / 100), cc = C0 * (1 + dc / 100), spd = pp - cc, q = quad(dp, dc);
      if (lb.length) { lb[0].textContent = sg(dp) + '%'; lb[1].textContent = sg(dc) + '%'; }
      if (q >= 0) { seen[q] = 1; host.querySelectorAll('.sqb .vgo').forEach(function (b) { var i = +b.getAttribute('data-q'); b.classList.toggle('on', i === q); if (seen[i]) b.classList.add('done'); }); }
      vr.innerHTML = '제품 ' + f1(pp) + ' − 원재료 ' + f1(cc) + ' = 스프레드 <b>' + f1(spd) + '</b> (처음 ' + (P0 - C0) + ', ' + pc(spd / (P0 - C0) - 1) + ')' + (q >= 0 ? '<br><b>' + (q + 1) + '사분면 · ' + esc(L[q]) + '</b> ' + esc(N[q] || '') : '<br>축 위에 있어요. 한쪽으로 옮겨 보세요.') + ' (예시)';
      if (!Q) gate(ctx, Object.keys(seen).length >= 4);
    }
    function draw() {
      var w = wOf(host), h = Math.round(clamp(w * 0.62, 250, 340)), cx = w / 2, cy = h / 2, rx = w / 2 - 14, ry = h / 2 - 22, o = ARDEF;
      [[0, 1, 1], [1, -1, 1], [2, -1, -1], [3, 1, -1]].forEach(function (z) {
        var i = z[0], on = (Q ? i === pick : i === quad(dp, dc)), ans = showAns && i === ctx.answer;
        var fill = ans ? 'rgba(169,216,188,.22)' : on ? 'rgba(232,201,160,.18)' : i < 2 ? 'rgba(143,170,220,.08)' : 'rgba(242,239,232,.03)';
        o += '<rect data-q="' + i + '" x="' + (z[1] > 0 ? cx : cx - rx) + '" y="' + (z[2] > 0 ? cy - ry : cy) + '" width="' + rx + '" height="' + ry + '" fill="' + fill + '" style="cursor:' + (Q && !locked ? 'pointer' : 'default') + '"/>';
        o += '<text data-q="' + i + '" x="' + (cx + z[1] * rx / 2) + '" y="' + (cy - z[2] * ry / 2 - 4) + '" text-anchor="middle" class="th" style="font-size:22px">' + (i + 1) + '</text><text data-q="' + i + '" x="' + (cx + z[1] * rx / 2) + '" y="' + (cy - z[2] * ry / 2 + 16) + '" text-anchor="middle" class="tt">' + esc(Q ? '' : L[i]) + '</text>';
      });
      o += '<path class="ax" d="M' + (cx - rx) + ' ' + cy + 'H' + (cx + rx) + 'M' + cx + ' ' + (cy + ry) + 'V' + (cy - ry) + '"/>';
      o += '<text x="' + (cx + 6) + '" y="' + (cy - ry - 6) + '">↑ 제품 가격(P)</text><text x="' + (cx + rx) + '" y="' + (cy - 6) + '" text-anchor="end">원재료 가격(C) →</text>';
      if (!Q) { var px = cx + rx * dc / R * 0.92, py = cy - ry * dp / R * 0.92; o += varr(cx, cy, px, py, 0, 'var(--wm)', 'curAr4') + '<circle cx="' + px + '" cy="' + py + '" r="7" fill="var(--wm)" stroke="#0B1526" stroke-width="2"/>'; }
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', '세로축 제품 가격, 가로축 원재료 가격의 네 국면. 1 ' + L[0] + ', 2 ' + L[1] + ', 3 ' + L[2] + ', 4 ' + L[3] + (Q ? '' : '. 지금 제품 ' + sg(dp) + '%, 원재료 ' + sg(dc) + '%'));
    }
    function choose(i) {
      if (Q) { if (locked) return; pick = i; host.querySelectorAll('.sqb button').forEach(function (b) { var o = +b.getAttribute('data-q') === i; b.classList.toggle('on', o); b.setAttribute('aria-checked', o); }); vr.innerHTML = '<b>' + (i + 1) + '사분면</b>을 골랐어요.'; ctx.ready(true); draw(); return; }
      dp = PRE[i][0]; dc = PRE[i][1]; sP.value = dp; sC.value = dc; read(); draw();
    }
    if (!Q) { sP.oninput = function () { dp = +sP.value; read(); draw(); }; sC.oninput = function () { dc = +sC.value; read(); draw(); }; [sP, sC].forEach(function (s) { s.addEventListener('keydown', function (e) { e.stopPropagation(); }); }); read(); }
    else vr.textContent = p.ask || '네 국면 중 하나를 눌러 고르세요.';
    host.querySelectorAll('.sqb button').forEach(function (b) { b.onclick = function () { choose(+b.getAttribute('data-q')); }; });
    svg.addEventListener('click', function (e) { var i = e.target.getAttribute && e.target.getAttribute('data-q'); if (i != null && Q) choose(+i); });
    if (Q) host.__solve = function (right) { choose(right ? ctx.answer : (ctx.answer + 1) % 4); };
    return {
      draw: draw, key: function (n) { if (Q && n >= 1 && n <= 4) choose(n - 1); },
      gated: function () { return !Q && Object.keys(seen).length < 4; },
      check: function () { return { right: pick === ctx.answer, detail: '고른 국면: ' + (pick + 1) + '사분면 (' + L[pick] + ').' }; },
      reveal: function (right, a) {
        locked = true; showAns = a || right;
        host.querySelectorAll('.sqb button').forEach(function (b) { var i = +b.getAttribute('data-q'); if (i === pick) b.classList.add(right ? 'ok' : 'no'); if (showAns && i === ctx.answer) b.classList.add('ok'); b.disabled = true; });
        if (showAns) vr.innerHTML = '<b>' + (ctx.answer + 1) + '사분면 · ' + esc(L[ctx.answer]) + '</b> ' + esc(N[ctx.answer] || '');
        draw();
      }
    };
  };

  // PBR = ROE × PER (mode per) / PBR = (ROE − g) ÷ (COE − g) (mode coe). 슬라이더로 바꾸면 식과 그림이 같이 움직인다
  VIS.roeLink = function (host, p) {
    var mode = p.mode || 'per', roe = p.roe == null ? 20 : p.roe, per = p.per || 10, coe = p.coe || 10, g = p.g || 0;
    var SL = mode === 'per' ? [['roe', 'ROE', -10, 30, 1, '%'], ['per', 'PER', 2, 20, 0.5, '배']] : [['roe', 'ROE', 0, 30, 1, '%'], ['coe', 'COE', 5, 16, 0.5, '%'], ['g', '성장률 g', 0, 4, 0.5, '%']];
    var V = { roe: roe, per: per, coe: coe, g: g };
    host.innerHTML = '<div class="eqs" aria-live="polite"></div><svg role="img"></svg>' + SL.map(function (s) { return '<div class="vctl"><label for="curRl' + s[0] + '">' + s[1] + ' <b></b></label><input id="curRl' + s[0] + '" data-k="' + s[0] + '" type="range" min="' + s[2] + '" max="' + s[3] + '" step="' + s[4] + '" value="' + V[s[0]] + '" aria-label="' + s[1] + '"></div>'; }).join('') + '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eq = host.querySelector('.eqs'), vr = host.querySelector('.vr');
    function box(t, v, c) { return '<div class="eq ' + (c || '') + '"><small>' + t + '</small><b>' + v + '</b></div>'; }
    function f2(x) { return (Math.round(x * 100) / 100).toFixed(2); }
    function pbrOf(r) { return mode === 'per' ? r / 100 * V.per : (r - V.g) / (V.coe - V.g); }
    function draw() {
      host.querySelectorAll('.vctl').forEach(function (c, i) { c.querySelector('b').textContent = (SL[i][5] === '배' ? f1(V[SL[i][0]]) : V[SL[i][0]]) + SL[i][5]; });
      var b = pbrOf(V.roe), w = wOf(host), h = Math.round(clamp(w * 0.5, 220, 300)), o = '';
      if (mode === 'per') {
        eq.innerHTML = box('ROE', V.roe + '%') + '<i>×</i>' + box('PER', f1(V.per) + '배') + '<i>=</i>' + box('PBR', V.roe < 0 ? '−' : b.toFixed(1) + '배', 'ac');
        var bv1 = 100 * (1 + V.roe / 100), mc = 100 * Math.max(b, 0), hi = Math.max(140, bv1 * 1.1, mc * 1.1), m = { t: 22, b: 30 }, ih = h - m.t - m.b, Y = function (v) { return h - m.b - ih * v / hi; }, bw = Math.min(80, w / 3 - 24), gp = (w - 3 * bw) / 2;
        var bars = [['장부가 지금', 100, 'rgba(143,170,220,.4)'], ['장부가 1년 뒤', bv1, 'rgba(143,170,220,.7)'], ['시가총액', mc, 'rgba(232,201,160,.55)']];
        o += '<line class="ax" x1="0" x2="' + w + '" y1="' + Y(0) + '" y2="' + Y(0) + '"/><line x1="0" x2="' + w + '" y1="' + Y(100) + '" y2="' + Y(100) + '" stroke="var(--ac)" stroke-dasharray="4 4"/>';
        bars.forEach(function (r, i) { var x = i * (bw + gp); o += '<rect x="' + x + '" y="' + Y(r[1]) + '" width="' + bw + '" height="' + Math.max(0, Y(0) - Y(r[1])) + '" fill="' + r[2] + '" style="transition:all .3s"/><text x="' + (x + bw / 2) + '" y="' + (Y(r[1]) - 8) + '" text-anchor="middle" class="th">' + fmt(r[1]) + '</text><text x="' + (x + bw / 2) + '" y="' + (h - 10) + '" text-anchor="middle">' + r[0] + '</text>'; });
        vr.innerHTML = V.roe < 0 ? '적자예요. 이익이 음수라 PER도, ROE × PER도 쓸 수 없어요. 이럴 땐 자산가치(PBR)를 따로 봐요. (예시)' : '장부가 100이 1년 뒤 <b>' + fmt(bv1) + '</b>이 돼요(이익을 다 쌓아 둔다고 가정). 같은 PER ' + f1(V.per) + '배라도 PBR은 <b>' + b.toFixed(1) + '배</b>예요. (예시)';
      } else {
        eq.innerHTML = box('ROE − g', f1(V.roe - V.g) + '%') + '<i>÷</i>' + box('COE − g', f1(V.coe - V.g) + '%') + '<i>=</i>' + box('PBR', f2(b) + '배', 'ac') + (V.g === 0 ? '<i>·</i>' + box('PER = 1 ÷ COE', f1(100 / V.coe) + '배') : '');
        var m2 = { l: 34, r: 12, t: 16, b: 30 }, iw = w - m2.l - m2.r, ih2 = h - m2.t - m2.b, ym = 4, X = function (r) { return m2.l + iw * r / 30; }, Y2 = function (v) { return m2.t + ih2 * (1 - clamp(v, 0, ym) / ym); }, pts = [];
        for (var yv = 0; yv <= ym; yv++) o += '<line class="gl" x1="' + m2.l + '" x2="' + (w - m2.r) + '" y1="' + Y2(yv) + '" y2="' + Y2(yv) + '"/><text x="' + (m2.l - 6) + '" y="' + (Y2(yv) + 4) + '" text-anchor="end">' + yv + '</text>';
        for (var r = 0; r <= 30; r += 10) o += '<text x="' + X(r) + '" y="' + (h - 12) + '" text-anchor="middle">' + r + '%</text>';
        o += '<line x1="' + m2.l + '" x2="' + (w - m2.r) + '" y1="' + Y2(1) + '" y2="' + Y2(1) + '" stroke="var(--ac)" stroke-width="1.4"/><text x="' + (w - m2.r) + '" y="' + (Y2(1) - 6) + '" text-anchor="end" class="ta">PBR 1배</text>';
        o += '<line x1="' + X(V.coe) + '" x2="' + X(V.coe) + '" y1="' + m2.t + '" y2="' + (h - m2.b) + '" stroke="var(--no)" stroke-dasharray="4 4"/><text x="' + (X(V.coe) + 4) + '" y="' + (m2.t + 10) + '" class="tno">ROE = COE</text>';
        for (var q = 0; q <= 60; q++) { var rr = q / 2, v = pbrOf(rr); if (v >= 0) pts.push([X(rr), Y2(v)]); }
        if (pts.length > 1) o += '<path class="lp" d="' + pathOf(pts) + '"/>';
        o += '<circle cx="' + X(V.roe) + '" cy="' + Y2(b) + '" r="7" fill="var(--wm)" stroke="#0B1526" stroke-width="2"/>';
        o += '<text x="' + m2.l + '" y="10">PBR(배)</text><text x="' + (w - m2.r) + '" y="' + (h - 0) + '" text-anchor="end">→ ROE</text>';
        vr.innerHTML = 'ROE ' + V.roe + '%가 COE ' + f1(V.coe) + '%' + (V.roe > V.coe ? '보다 높아 PBR이 <b>1배 위</b>' : V.roe < V.coe ? '보다 낮아 PBR이 <b>1배 아래</b>' : '와 같아 PBR이 <b>딱 1배</b>') + '예요: ' + f2(b) + '배. (예시)';
      }
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', mode === 'per' ? 'ROE ' + V.roe + '%, PER ' + V.per + '배, PBR ' + f1(b) + '배 (예시)' : 'ROE에 따른 PBR 곡선. COE ' + V.coe + '%, 성장률 ' + V.g + '%, 지금 PBR ' + f2(b) + '배 (예시)');
    }
    host.querySelectorAll('.vctl input').forEach(function (s) { s.oninput = function () { V[s.getAttribute('data-k')] = +s.value; draw(); }; s.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
    return { draw: draw };
  };

  // ROE-PBR 산점도: 회귀선과 R², 원점을 지나는 PER 선(슬라이더), 점을 순서대로 잇는 경로. 문제 모드: 구간 고르기
  VIS.roePath = function (host, p, ctx) {
    var Q = ctx.mode === 'question', P = p.pts || [], S = p.segs || [], ray = p.ray, path = Q || !!p.path, pick = null, locked = false, showAns = false, nm = p.name || '';
    var x0 = p.xMin == null ? -15 : p.xMin, x1 = p.xMax || 25, y0 = p.yMin || 0, y1 = p.yMax || 2.4;
    host.innerHTML = '<svg role="img"></svg>' + (ray ? '<div class="vctl"><label for="curRp">PER 선 <b></b></label><input id="curRp" type="range" min="' + (p.rayMin || 2) + '" max="' + (p.rayMax || 20) + '" step="0.5" value="' + ray + '" aria-label="원점을 지나는 PER 선"></div>' : '') +
      (S.length ? '<div class="vbt rps" role="' + (Q ? 'radiogroup' : 'group') + '" aria-label="구간">' + (Q ? '' : '<button type="button" class="vgo on" data-path="1">점 순서대로 잇기</button>') + (Q ? S.map(function (s, i) { return '<button type="button" role="radio" aria-checked="false" data-s="' + i + '"><b>' + esc(s.k) + '</b><i>' + (i + 1) + '</i></button>'; }).join('') : '') + '</div>' : '') +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr'), sR = host.querySelector('#curRp');
    function reg() {
      var n = P.length, xs = P.map(function (q) { return q.roe / 100; }), ys = P.map(function (q) { return q.pbr; }), mx = xs.reduce(function (a, b) { return a + b; }, 0) / n, my = ys.reduce(function (a, b) { return a + b; }, 0) / n, sxy = 0, sxx = 0, syy = 0;
      for (var i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); syy += (ys[i] - my) * (ys[i] - my); }
      var a = sxy / sxx; return { a: a, b: my - a * mx, r2: sxy * sxy / (sxx * syy) };
    }
    function slope(s) { var A = P[s.a], B = P[s.b]; return (B.pbr - A.pbr) / ((B.roe - A.roe) / 100); }
    function f2(x) { return (Math.round(x * 100) / 100).toFixed(2); }
    function read() {
      var R2 = reg(), t = '회귀선 PBR = ' + f2(R2.a) + ' × ROE + ' + f2(R2.b) + ' · <b>R² ' + f2(R2.r2) + '</b>';
      if (ray) { var near = P.filter(function (q) { return q.roe > 0 && Math.abs(q.pbr / (q.roe / 100) - ray) / ray < 0.2; }).map(function (q) { return q.y; }); t += '<br>PER ' + f1(ray) + '배 선 근처: <b>' + (near.join(', ') || '없음') + '</b> · 해마다 PER = PBR ÷ ROE: ' + P.map(function (q) { return q.y + ' ' + (q.roe > 0 ? f1(q.pbr / (q.roe / 100)) + '배' : '적자'); }).join(', '); }
      if (path && S.length && !Q) t += '<br>' + S.map(function (s, i) { return (i + 1) + ' ' + esc(s.k) + ' 기울기 <b>' + f1(slope(s)) + '</b>'; }).join(' · ');
      vr.innerHTML = (nm ? esc(nm) + ' · ' : '') + t + ' (예시)';
    }
    function draw() {
      var w = wOf(host), h = Math.round(clamp(w * 0.62, 260, 380)), m = { l: 36, r: 12, t: 16, b: 34 }, iw = w - m.l - m.r, ih = h - m.t - m.b, o = ARDEF, R2 = reg();
      var X = function (r) { return m.l + iw * (clamp(r, x0, x1) - x0) / (x1 - x0); }, Y = function (v) { return m.t + ih * (1 - (clamp(v, y0, y1) - y0) / (y1 - y0)); }, dy = (y1 - y0) > 1.2 ? 0.4 : 0.1;
      for (var yv = y0; yv <= y1 + 1e-9; yv += dy) o += '<line class="gl" x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(yv) + '" y2="' + Y(yv) + '"/><text x="' + (m.l - 5) + '" y="' + (Y(yv) + 4) + '" text-anchor="end">' + (Math.round(yv * 10) / 10) + '</text>';
      for (var r = Math.ceil(x0 / 10) * 10; r <= x1; r += 10) o += '<text x="' + X(r) + '" y="' + (h - 16) + '" text-anchor="middle">' + r + '%</text>';
      if (x0 < 0) o += '<line class="ax" x1="' + X(0) + '" x2="' + X(0) + '" y1="' + m.t + '" y2="' + (h - m.b) + '"/>';
      o += '<text x="0" y="10">PBR(배)</text><text x="' + (w - m.r) + '" y="' + (h - 2) + '" text-anchor="end">→ ROE · (예시)</text>';
      var ya = R2.a * x0 / 100 + R2.b, yb = R2.a * x1 / 100 + R2.b;
      o += '<line x1="' + X(x0) + '" y1="' + Y(ya) + '" x2="' + X(x1) + '" y2="' + Y(yb) + '" stroke="var(--no)" stroke-width="1.4" stroke-dasharray="5 4"/><text x="' + (w - m.r) + '" y="' + (Y(yb) - 6) + '" text-anchor="end" class="tno">R² ' + f2(R2.r2) + '</text>';
      if (ray) { var xe = Math.min(x1, (y1 / ray) * 100); o += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(xe) + '" y2="' + Y(ray * xe / 100) + '" stroke="var(--wm)" stroke-width="1.6"/><text x="' + clamp(X(xe), m.l + 40, w - m.r - 4) + '" y="' + (Y(ray * xe / 100) + 14) + '" text-anchor="end" class="twm">PER ' + f1(ray) + '배</text>'; }
      if (path && S.length) S.forEach(function (s, i) {
        var on = Q ? i === pick : true, ans = showAns && i === ctx.answer, col = ans ? 'var(--ok)' : (Q && on) ? 'var(--wm)' : 'var(--ac)';
        var seq = []; for (var j = s.a; j <= s.b; j++) seq.push([X(P[j].roe), Y(P[j].pbr)]);
        o += '<path d="' + pathOf(seq) + '" fill="none" stroke="' + col + '" stroke-width="' + (ans || (Q && on) ? 3 : 1.6) + '" opacity="' + (Q && !on && !ans ? 0.45 : 1) + '"/>';
        var A = seq[seq.length - 2], B = seq[seq.length - 1]; o += varr(A[0], A[1], B[0] - (B[0] - A[0]) * 0.08, B[1] - (B[1] - A[1]) * 0.08, 0, 'var(--ac)');
        // 구간 번호 배지: 경로 길이의 35% 지점에서 선과 수직으로 조금 비켜 둔다 (점 이름과 덜 겹치게)
        var Ls = [], tot = 0; for (var u = 1; u < seq.length; u++) { var dl = Math.hypot(seq[u][0] - seq[u - 1][0], seq[u][1] - seq[u - 1][1]); Ls.push(dl); tot += dl; }
        var want = tot * 0.35, u2 = 0; while (u2 < Ls.length - 1 && want > Ls[u2]) { want -= Ls[u2]; u2++; }
        var P1 = seq[u2], P2 = seq[u2 + 1], tt = Ls[u2] ? want / Ls[u2] : 0, bx = P1[0] + (P2[0] - P1[0]) * tt, by = P1[1] + (P2[1] - P1[1]) * tt, nx2 = -(P2[1] - P1[1]) / (Ls[u2] || 1), ny2 = (P2[0] - P1[0]) / (Ls[u2] || 1);
        // 양쪽 후보 중 다른 선·점에서 더 먼 쪽
        var clear = function (qx, qy) { var d = 1e9; for (var a2 = 1; a2 < P.length; a2++) { var ax = X(P[a2 - 1].roe), ay = Y(P[a2 - 1].pbr), cx2 = X(P[a2].roe), cy2 = Y(P[a2].pbr), vx = cx2 - ax, vy = cy2 - ay, l2 = vx * vx + vy * vy || 1, t2 = clamp(((qx - ax) * vx + (qy - ay) * vy) / l2, 0, 1); d = Math.min(d, Math.hypot(qx - ax - vx * t2, qy - ay - vy * t2)); } P.forEach(function (q) { d = Math.min(d, Math.hypot(qx - X(q.roe), qy - Y(q.pbr)) - 6); }); return d; };
        var c1x = bx + nx2 * 13, c1y = by + ny2 * 13, c2x = bx - nx2 * 13, c2y = by - ny2 * 13;
        if (clear(c1x, c1y) >= clear(c2x, c2y)) { bx = c1x; by = c1y; } else { bx = c2x; by = c2y; }
        o += '<circle cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="9" fill="#0B1526" stroke="' + col + '" stroke-width="1.4"/><text x="' + bx.toFixed(1) + '" y="' + (by + 4).toFixed(1) + '" text-anchor="middle" class="ta" style="font-size:11px">' + (i + 1) + '</text>';
      });
      P.forEach(function (q) { o += '<circle cx="' + X(q.roe) + '" cy="' + Y(q.pbr) + '" r="5.5" fill="#F2EFE8" stroke="#0B1526" stroke-width="2"/><text x="' + (X(q.roe) + 8) + '" y="' + (Y(q.pbr) + 4) + '" class="tt" style="font-size:11.5px">' + esc(q.y) + '</text>'; });
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', (nm || '') + ' ROE-PBR 산점도 (예시). ' + P.map(function (q) { return q.y + ' ROE ' + q.roe + '% PBR ' + q.pbr + '배'; }).join(', ') + '. R² ' + f2(R2.r2));
    }
    if (sR) { sR.oninput = function () { ray = +sR.value; host.querySelector('.vctl b').textContent = f1(ray) + '배'; read(); draw(); }; sR.addEventListener('keydown', function (e) { e.stopPropagation(); }); host.querySelector('.vctl b').textContent = f1(ray) + '배'; }
    var pb = host.querySelector('[data-path]');
    if (pb) pb.onclick = function () { path = true; pb.classList.add('done'); pb.hidden = true; read(); draw(); gate(ctx, true); };
    function choose(i) { if (locked) return; pick = i; host.querySelectorAll('.rps button').forEach(function (b) { var o = +b.getAttribute('data-s') === i; b.classList.toggle('on', o); b.setAttribute('aria-checked', o); }); ctx.ready(true); draw(); }
    if (Q) { host.querySelectorAll('.rps button').forEach(function (b) { b.onclick = function () { choose(+b.getAttribute('data-s')); }; }); host.__solve = function (right) { choose(right ? ctx.answer : (ctx.answer + 1) % S.length); }; vr.innerHTML = esc(p.ask || '구간을 하나 고르세요.'); }
    else { read(); gate(ctx, !(S.length && !path)); }
    return {
      draw: draw, key: function (n) { if (Q && S[n - 1]) choose(n - 1); },
      gated: function () { return !Q && S.length && !path; },
      check: function () { return { right: pick === ctx.answer, detail: '고른 구간: ' + S[pick].k + ' (기울기 ' + f1(slope(S[pick])) + ').' }; },
      reveal: function (right, a) {
        locked = true; showAns = a || right;
        host.querySelectorAll('.rps button').forEach(function (b) { var i = +b.getAttribute('data-s'); if (i === pick) b.classList.add(right ? 'ok' : 'no'); if (showAns && i === ctx.answer) b.classList.add('ok'); b.disabled = true; });
        if (showAns) vr.innerHTML = S.map(function (s, i) { return (i === ctx.answer ? '<b>' : '') + esc(s.k) + ' 기울기 ' + f1(slope(s)) + (i === ctx.answer ? '</b>' : ''); }).join(' · ');
        draw();
      }
    };
  };

  // PBR 6단계 모형: 순이익(PER과 같은 단계) → 자본변동표(배당·CB 전환) → 기말 BPS → P/B → 목표주가. 단계를 하나씩 열고 슬라이더로 가정을 바꾼다
  VIS.equityRoll = function (host, p, ctx) {
    var v = { e0: p.e0 || 10000, sh: p.shares || 2000, ni: p.ni || 800, po: p.payout == null ? 25 : p.payout, cb: p.cb || 0, cp: p.cbPrice || 40000, k: p.pbr || 0.6, now: p.now || 0 }, n = 1, nm = p.name || '';
    var ST = [
      { t: '1~3. 매출 → 비용 → 순이익', q: '여기까지는 PER 때와 같아요. 투자 포인트를 쓰고, 그 논리로 매출과 비용을 추정해 지배주주순이익을 만들어요.', sl: ['ni', '순이익', -400, 1600, 50, '억'] },
      { t: '4. 자본변동표', q: '기초자본 + 순이익 − 배당 ± 기타 = 기말자본. 증자나 CB 전환이 있으면 기타에 따로 보여 줘요.', sl: [['po', '배당성향', 0, 60, 5, '%'], ['cb', 'CB 전환', 0, 2000, 100, '억'], ['cp', '전환가격', 20000, 80000, 1000, '원']] },
      { t: '5. P/B 배수 논리', q: '이 장부가에 몇 배를 줄지가 투자 의견이에요. 과거 밴드를 먼저, 비교 회사는 보조로.', sl: ['k', 'PBR', 0.3, 1.5, 0.05, '배'] },
      { t: '6. 목표주가', q: '기말 BPS × PBR = 목표주가. 지금 주가와 견줘 의견을 내요.' }
    ];
    function slHtml(s, i) { return '<div class="vctl"><label for="curEr' + s[0] + '">' + esc(s[1]) + ' <b></b></label><input id="curEr' + s[0] + '" data-k="' + s[0] + '" type="range" min="' + s[2] + '" max="' + s[3] + '" step="' + s[4] + '" value="' + v[s[0]] + '" aria-label="' + esc(s[1]) + '"></div>'; }
    host.innerHTML = '<div class="pbs">' + ST.map(function (s, i) {
      var sls = !s.sl ? [] : Array.isArray(s.sl[0]) ? s.sl : [s.sl];
      return '<section class="pbx" data-s="' + i + '"' + (i < n ? '' : ' hidden') + '><h4>' + esc(s.t) + '</h4><p class="pq">' + esc(s.q) + '</p>' + sls.map(slHtml).join('') + '<div class="pbr"></div></section>';
    }).join('') + '</div><div class="vbt"><button type="button" class="vgo on"></button></div><p class="vr pbsum" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var bt = host.querySelector('.vgo'), sum = host.querySelector('.pbsum'), U = {};
    ST.forEach(function (s) { (!s.sl ? [] : Array.isArray(s.sl[0]) ? s.sl : [s.sl]).forEach(function (x) { U[x[0]] = x; }); });
    function calc() {
      var div = Math.max(v.ni, 0) * v.po / 100, ns = v.cb * 1e4 / v.cp, e1 = v.e0 + v.ni - div + v.cb, sh1 = v.sh + ns, b0 = v.e0 * 1e4 / v.sh, b1 = e1 * 1e4 / sh1;
      return { div: div, ns: ns, e1: e1, sh1: sh1, b0: b0, b1: b1, tp: b1 * v.k };
    }
    function row(l, x, cls) { return '<div class="' + (cls || '') + '"><span>' + l + '</span><b>' + x + '</b></div>'; }
    function sg(x) { return (x < 0 ? '−' : '+') + fmt(Math.abs(x)); }
    function draw() {
      var c = calc(), R = [
        row('지배주주순이익', sg(v.ni).replace('+', '') + '억', 'hl') + row('ROE (기초자본 대비)', f1(v.ni / v.e0 * 100) + '%'),
        row('기초자본', fmt(v.e0) + '억') + row('+ 당기순이익', sg(v.ni) + '억') + row('− 배당 (배당성향 ' + v.po + '%)', '−' + fmt(c.div) + '억') + row('± 기타: CB 전환', sg(v.cb) + '억' + (v.cb ? ' · 새 주식 ' + fmt(c.ns) + '만 주' : '')) + row('기말자본', fmt(c.e1) + '억', 'hl') + row('주식 수', fmt(c.sh1) + '만 주') + row('기말 BPS (기초 ' + fmt(c.b0) + '원)', fmt(c.b1) + '원', 'hl'),
        row('PBR', v.k.toFixed(2) + '배', 'hl'),
        row('목표주가 = ' + fmt(c.b1) + '원 × ' + v.k.toFixed(2), fmt(c.tp) + '원', 'hl') + (v.now ? row('지금 주가 ' + fmt(v.now) + '원 대비', pc(c.tp / v.now - 1), c.tp >= v.now ? 'ok' : 'no') : '')
      ];
      host.querySelectorAll('.pbx').forEach(function (s, i) {
        s.querySelector('.pbr').innerHTML = R[i];
        s.querySelectorAll('.vctl').forEach(function (cl) { var k = cl.querySelector('input').getAttribute('data-k'), d = U[k]; cl.querySelector('b').textContent = (k === 'k' ? v.k.toFixed(2) : fmt(v[k])) + d[5]; });
      });
      var chips = [['순이익', sg(v.ni).replace('+', '') + '억'], ['기말 BPS', fmt(c.b1) + '원'], ['PBR', v.k.toFixed(2) + '배'], ['목표주가', fmt(c.tp) + '원']].slice(0, n);
      sum.innerHTML = (nm ? esc(nm) + ' · ' : '') + chips.map(function (x, i) { return (i === n - 1 ? '<b>' : '') + x[0] + ' ' + x[1] + (i === n - 1 ? '</b>' : ''); }).join(' → ') + ' (예시)';
    }
    function lab() { if (n >= ST.length) { bt.hidden = true; bt.classList.add('done'); gate(ctx, true); } else { bt.textContent = '다음 단계 · ' + ST[n].t; gate(ctx, false); } }
    host.querySelectorAll('.pbx input').forEach(function (s) { s.oninput = function () { v[s.getAttribute('data-k')] = +s.value; draw(); }; s.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
    bt.onclick = function () { if (n >= ST.length) return; host.querySelector('.pbx[data-s="' + n + '"]').hidden = false; n++; draw(); lab(); };
    draw(); lab();
    return { draw: function () {}, gated: function () { return n < ST.length; } };
  };

  // ── M4 EV·EBITDA 부품 ─────────────────────────────────
  // 시장가치 재무상태표: 시가총액 + 차입금 − 현금 − 비영업자산 = EV. 사건 버튼(차입·증자·배당…)을 누르면 세 칸이 어떻게 움직이는지 보여 준다.
  // mode 'value': EBITDA × 배수 = EV − 순차입금 = 주주가치 ÷ 주식수 = 주당 가치. 문제 모드(bs): 슬라이더로 { need: 'equity>ev' | 'equity<ev' } 만들기
  // mode 'parts': 슬라이더 없이 두 블록만. 영업활동의 가치(EV) = 주주 몫(시가총액) + 채권자 몫(순차입금)
  function evParts(host, p) {
    var mc = p.mc == null ? 3000 : p.mc, nd = p.nd == null ? 1000 : p.nd, ev = mc + nd;
    host.innerHTML = '<div class="eqs"><div class="eq wm"><small>주주 몫 (시가총액)</small><b>' + fmt(mc) + '억</b></div><i>+</i><div class="eq"><small>채권자 몫 (순차입금)</small><b>' + fmt(nd) + '억</b></div><i>=</i><div class="eq ac"><small>EV (기업가치)</small><b>' + fmt(ev) + '억</b></div></div><svg role="img"></svg>' +
      '<p class="vr">EV <b>' + fmt(ev) + '억</b> = 주주 ' + fmt(mc) + '억 + 채권자 ' + fmt(nd) + '억 (예시)</p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg');
    function draw() {
      var w = wOf(host), h = 240, base = h - 30, ih = h - 52, sc = ih / Math.max(ev, 1), bw = Math.min(120, (w - 30) / 2 - 30), xa = (w / 2 - bw) / 2, xb = w / 2 + (w / 2 - bw) / 2, o = '<line class="ax" x1="0" x2="' + w + '" y1="' + base + '" y2="' + base + '"/>';
      var he = ev * sc, hm = mc * sc, hn = nd * sc;
      o += '<rect x="' + xa + '" y="' + (base - he) + '" width="' + bw + '" height="' + he + '" fill="rgba(143,170,220,.4)" stroke="var(--ac)"/><text x="' + (xa + bw / 2) + '" y="' + (base - he / 2 + 4) + '" text-anchor="middle" class="th">EV ' + fmt(ev) + '</text>';
      o += '<rect x="' + xb + '" y="' + (base - hn) + '" width="' + bw + '" height="' + hn + '" fill="rgba(242,239,232,.16)" stroke="rgba(242,239,232,.45)"/>' + (hn > 17 ? '<text x="' + (xb + bw / 2) + '" y="' + (base - hn / 2 + 4) + '" text-anchor="middle" class="tt">채권자 ' + fmt(nd) + '</text>' : '');
      o += '<rect x="' + xb + '" y="' + (base - hn - hm) + '" width="' + bw + '" height="' + hm + '" fill="rgba(232,201,160,.5)" stroke="var(--wm)"/><text x="' + (xb + bw / 2) + '" y="' + (base - hn - hm / 2 + 4) + '" text-anchor="middle" class="tt">주주 ' + fmt(mc) + '</text>';
      o += '<line x1="' + xa + '" x2="' + (xb + bw) + '" y1="' + (base - he) + '" y2="' + (base - he) + '" stroke="var(--ac)" stroke-dasharray="4 4"/>';
      [['영업활동의 가치', xa], ['돈을 댄 두 쪽', xb]].forEach(function (x) { o += '<text x="' + (x[1] + bw / 2) + '" y="' + (h - 10) + '" text-anchor="middle">' + x[0] + '</text>'; });
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', 'EV ' + fmt(ev) + '억 원 = 주주 몫(시가총액) ' + fmt(mc) + '억 + 채권자 몫(순차입금) ' + fmt(nd) + '억 (예시)');
    }
    return { draw: draw };
  }
  VIS.evBridge = function (host, p, ctx) {
    if (p.mode === 'parts') return evParts(host, p);
    var Q = ctx.mode === 'question', VM = p.mode === 'value', nm = p.name || '', E = p.events || [], seen = {}, last = null, moved = false, locked = false, showAns = false, sh = p.shares || 2000;
    var v = VM ? { eb: p.ebitda || 700, k: p.mult || 10, nd: p.nd == null ? 3000 : p.nd } : { mc: p.mc || 3000, debt: p.debt == null ? 1500 : p.debt, cash: p.cash == null ? 400 : p.cash, noa: p.noa || 0 };
    var v0 = JSON.parse(JSON.stringify(v));
    var SL = VM ? [['eb', 'EBITDA', p.ebMin || 300, p.ebMax || 1200, 10, '억'], ['k', 'EV/EBITDA', p.kMin || 4, p.kMax || 16, 0.5, '배'], ['nd', '순차입금', p.ndMin == null ? -2000 : p.ndMin, p.ndMax || 6000, 100, '억']]
      : [['mc', '시가총액', p.mcMin || 500, p.mcMax || 6000, 100, '억'], ['debt', '차입금', 0, p.debtMax || 4000, 100, '억'], ['cash', '현금', 0, p.cashMax || 4000, 100, '억'], ['noa', '비영업자산', 0, p.noaMax || 2000, 100, '억']].filter(function (s) { return !(p.noNoa && s[0] === 'noa'); });
    if (!VM && p.noNoa) v.noa = 0;
    var LIM = {}; SL.forEach(function (s) { LIM[s[0]] = s; });
    host.innerHTML = '<div class="eqs" aria-live="polite"></div><svg role="img"></svg>' + SL.map(function (s) {
      return '<div class="vctl"><label for="curEv' + s[0] + '">' + esc(s[1]) + ' <b></b></label><input id="curEv' + s[0] + '" data-k="' + s[0] + '" type="range" min="' + s[2] + '" max="' + s[3] + '" step="' + s[4] + '" value="' + v[s[0]] + '" aria-label="' + esc(s[1]) + (s[5] === '억' ? '(억 원)' : '') + '"></div>';
    }).join('') + (E.length ? '<div class="vbt brm" role="group" aria-label="사건">' + E.map(function (e, i) { return '<button type="button" class="vgo" data-e="' + i + '"><b>' + esc(e.k) + '</b>' + esc(e.t) + '<i>' + (i + 1) + '</i></button>'; }).join('') + '</div>' : '') +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), eq = host.querySelector('.eqs'), vr = host.querySelector('.vr'), ins = host.querySelectorAll('.vctl input');
    function box(t, x, c) { return '<div class="eq ' + (c || '') + '"><small>' + t + '</small><b>' + x + '</b></div>'; }
    function sg(x) { return (x < 0 ? '−' : '') + fmt(Math.abs(x)); }
    function calc() {
      if (VM) { var ev = v.eb * v.k, e = ev - v.nd; return { ev: ev, eq: e, px: e * 1e4 / sh }; }
      return { ev: v.mc + v.debt - v.cash - v.noa, nd: v.debt - v.cash, eq: v.mc };
    }
    function labels() {
      host.querySelectorAll('.vctl').forEach(function (cl) { var k = cl.querySelector('input').getAttribute('data-k'); cl.querySelector('b').textContent = (k === 'k' ? f1(v.k) : sg(v[k])) + LIM[k][5]; cl.querySelector('input').value = v[k]; });
    }
    function read() {
      var c = calc();
      if (VM) {
        var c0 = (function () { var ev = v0.eb * v0.k, e = ev - v0.nd; return { ev: ev, px: e * 1e4 / sh }; })();
        eq.innerHTML = box('EBITDA', fmt(v.eb) + '억') + '<i>×</i>' + box('EV/EBITDA', f1(v.k) + '배', 'wm') + '<i>=</i>' + box('EV', fmt(c.ev) + '억', 'hl') + '<i>−</i>' + box('순차입금', sg(v.nd) + '억') + '<i>=</i>' + box('주주가치', sg(c.eq) + '억', 'hl') + '<i>÷</i>' + box('주식수', fmt(sh) + '만 주') + '<i>=</i>' + box('주당 가치', (c.eq > 0 ? fmt(c.px) : '0') + '원', 'ac');
        vr.innerHTML = (nm ? esc(nm) + ' · ' : '') + 'EV <b>' + fmt(c.ev) + '억</b> − 순차입금 ' + sg(v.nd) + '억 = 주주가치 <b>' + sg(c.eq) + '억</b>' + (c.eq > 0 ? ' → 주당 <b>' + fmt(c.px) + '원</b>' : ' → 빚을 갚고 나면 주주 몫이 남지 않아요') +
          (c0.ev && c0.px > 0 && c.eq > 0 && Math.abs(c.ev / c0.ev - 1) > 0.004 ? '<br>처음보다 EV ' + pc(c.ev / c0.ev - 1) + ', 주당 가치 ' + pc(c.px / c0.px - 1) + (v.nd > 0 && v.nd === v0.nd ? '. 빚이 있으면 주주 몫이 더 크게 흔들려요' : '') : '') + ' (예시)';
        return;
      }
      eq.innerHTML = box('시가총액', fmt(v.mc) + '억', 'wm') + '<i>+</i>' + box('차입금', fmt(v.debt) + '억') + '<i>−</i>' + box('현금', fmt(v.cash) + '억') + (!p.noNoa && (v.noa || p.noa) ? '<i>−</i>' + box('비영업자산', fmt(v.noa) + '억') : '') + '<i>=</i>' + box('EV', sg(c.ev) + '억', 'ac');
      // 주주가치 vs EV 비교는 그게 가르칠 점일 때만 (params.cmp)
      var cmp = !p.cmp ? '' : c.eq > c.ev ? '주주가치가 EV보다 <b>커요</b> (순현금 ' + fmt(v.cash + v.noa - v.debt) + '억)' : c.eq < c.ev ? '주주가치가 EV보다 작아요 (빚이 현금보다 많아요)' : '주주가치와 EV가 같아요';
      if (Q) { vr.innerHTML = locked ? '' : moved ? '시가총액(주주가치) <b>' + fmt(c.eq) + '억</b> · EV <b>' + sg(c.ev) + '억</b> · ' + (c.eq > c.ev ? '주주가치가 더 커요' : '아직 EV가 더 커요') + ' (예시)' : esc(p.ask || '슬라이더를 움직여 보세요.'); return; }
      var ev0 = last ? '<b>' + esc(last.e.k) + '</b> · 시가총액 ' + fmt(last.b.mc) + '→' + fmt(v.mc) + ', 순차입금 ' + sg(last.b.nd) + '→' + sg(c.nd) + ', EV ' + sg(last.b.ev) + '→<b>' + sg(c.ev) + '</b>' + (Math.round(c.ev - last.b.ev) === 0 ? ' <b>그대로</b>' : ' (' + (c.ev > last.b.ev ? '+' : '−') + fmt(Math.abs(c.ev - last.b.ev)) + ')') + (last.e.d ? '<br>' + esc(last.e.d) : '') + '<br>' : '';
      vr.innerHTML = ev0 + (nm ? esc(nm) + ' · ' : '') + 'EV <b>' + sg(c.ev) + '억</b> · 순차입금 ' + sg(c.nd) + '억' + (cmp ? ' · ' + cmp : '') + ' (예시)';
    }
    function draw() {
      var c = calc(), w = wOf(host), h = 250, m = { t: 22, b: 30 }, ih = h - m.t - m.b, base = h - m.b, o = '';
      if (VM) {
        var top = Math.max(LIM.eb[3] * LIM.k[3] * 0.55, c.ev, c.eq, 1), sc = ih / top, bw = Math.min(110, (w - 30) / 2 - 30), x1 = (w / 2 - bw) / 2, x2 = w / 2 + (w / 2 - bw) / 2;
        var evh = Math.max(c.ev, 0) * sc;
        o += '<line class="ax" x1="0" x2="' + w + '" y1="' + base + '" y2="' + base + '"/>';
        o += '<rect x="' + x1 + '" y="' + (base - evh) + '" width="' + bw + '" height="' + evh + '" fill="rgba(143,170,220,.4)" stroke="var(--ac)" style="transition:all .3s"/><text x="' + (x1 + bw / 2) + '" y="' + (base - evh - 8) + '" text-anchor="middle" class="th">EV ' + fmt(c.ev) + '</text>';
        if (v.nd >= 0) {
          var eqh = Math.max(c.eq, 0) * sc, ndh = Math.min(v.nd, c.ev) * sc;
          o += '<rect x="' + x2 + '" y="' + (base - ndh) + '" width="' + bw + '" height="' + ndh + '" fill="rgba(242,239,232,.16)" stroke="rgba(242,239,232,.45)" style="transition:all .3s"/>' + (ndh > 18 ? '<text x="' + (x2 + bw / 2) + '" y="' + (base - ndh / 2 + 4) + '" text-anchor="middle" class="tt">순차입금</text>' : '');
          o += '<rect x="' + x2 + '" y="' + (base - ndh - eqh) + '" width="' + bw + '" height="' + eqh + '" fill="rgba(232,201,160,.5)" stroke="var(--wm)" style="transition:all .3s"/><text x="' + (x2 + bw / 2) + '" y="' + (base - ndh - eqh - 8) + '" text-anchor="middle" class="twm">' + (c.eq > 0 ? '주주 ' + fmt(c.eq) : '주주 몫 0') + '</text>';
        } else {
          var eh2 = c.eq * sc, nch = -v.nd * sc;
          o += '<rect x="' + x2 + '" y="' + (base - eh2) + '" width="' + bw + '" height="' + eh2 + '" fill="rgba(232,201,160,.5)" stroke="var(--wm)" style="transition:all .3s"/><text x="' + (x2 + bw / 2) + '" y="' + (base - eh2 - 8) + '" text-anchor="middle" class="twm">주주 ' + fmt(c.eq) + '</text>';
          o += '<rect x="' + (x2 + 6) + '" y="' + (base - eh2 + 4) + '" width="' + (bw - 12) + '" height="' + Math.max(0, nch - 8) + '" fill="none" stroke="var(--ok)" stroke-dasharray="4 3"/>' + (nch > 22 ? '<text x="' + (x2 + bw / 2) + '" y="' + (base - eh2 + nch / 2 + 4) + '" text-anchor="middle" class="tok">+ 순현금</text>' : '');
        }
        [['EV = EBITDA × 배수', x1], ['순차입금 + 주주가치', x2]].forEach(function (t) { o += '<text x="' + (t[1] + bw / 2) + '" y="' + (h - 10) + '" text-anchor="middle">' + t[0] + '</text>'; });
        svg.setAttribute('aria-label', 'EBITDA ' + fmt(v.eb) + '억 × ' + f1(v.k) + '배 = EV ' + fmt(c.ev) + '억, 순차입금 ' + sg(v.nd) + '억을 빼면 주주가치 ' + sg(c.eq) + '억 원 (예시)');
      } else {
        var L = Math.max(c.ev, 0) + v.cash + v.noa, R = v.mc + v.debt, top2 = Math.max(L, R, (LIM.mc[3] + LIM.debt[3]) * 0.6), sc2 = ih / top2, bw2 = Math.min(110, (w - 30) / 2 - 30), xa = (w / 2 - bw2) / 2, xb = w / 2 + (w / 2 - bw2) / 2, y = base;
        function seg(x, val, fill, stroke, lab, cls) { var hh = val * sc2; if (hh <= 0) return ''; var r = '<rect x="' + x + '" y="' + (y - hh) + '" width="' + bw2 + '" height="' + hh + '" fill="' + fill + '" stroke="' + stroke + '" style="transition:all .3s"/>' + (hh > 17 ? '<text x="' + (x + bw2 / 2) + '" y="' + (y - hh / 2 + 4) + '" text-anchor="middle" class="' + cls + '">' + lab + '</text>' : ''); y -= hh; return r; }
        o += '<line class="ax" x1="0" x2="' + w + '" y1="' + base + '" y2="' + base + '"/>';
        var ansOn = showAns ? ' stroke-width="2.5"' : '';
        y = base; o += seg(xa, Math.max(c.ev, 0), 'rgba(143,170,220,.4)', 'var(--ac)', 'EV ' + sg(c.ev), 'th'); var yEv = y; o += seg(xa, v.noa, 'rgba(242,239,232,.08)', 'rgba(242,239,232,.4)', '비영업 ' + fmt(v.noa), 'tt'); o += seg(xa, v.cash, 'rgba(169,216,188,.22)', 'var(--ok)', '현금 ' + fmt(v.cash), 'tt');
        y = base; o += seg(xb, v.mc, 'rgba(232,201,160,.5)', 'var(--wm)', '시가총액 ' + fmt(v.mc), 'tt'); var yMc = y; o += seg(xb, v.debt, 'rgba(242,239,232,.16)', 'rgba(242,239,232,.45)', '차입금 ' + fmt(v.debt), 'tt');
        o += '<line x1="' + xa + '" x2="' + (xb + bw2) + '" y1="' + yEv + '" y2="' + yEv + '" stroke="var(--ac)" stroke-dasharray="4 4"' + ansOn + '/><line x1="' + xa + '" x2="' + (xb + bw2) + '" y1="' + yMc + '" y2="' + yMc + '" stroke="var(--wm)" stroke-dasharray="2 4"' + ansOn + '/>';
        [['쓰는 쪽 (시장가치)', xa], ['대는 쪽 (시장가치)', xb]].forEach(function (t) { o += '<text x="' + (t[1] + bw2 / 2) + '" y="' + (h - 10) + '" text-anchor="middle">' + t[0] + '</text>'; });
        svg.setAttribute('aria-label', '시가총액 ' + fmt(v.mc) + '억 + 차입금 ' + fmt(v.debt) + '억 = EV ' + sg(c.ev) + '억 + 현금 ' + fmt(v.cash) + '억' + (p.noNoa ? '' : ' + 비영업자산 ' + fmt(v.noa) + '억') + ' (예시)');
      }
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      labels(); read();
    }
    ins.forEach(function (s) {
      s.oninput = function () { if (locked) { s.value = v[s.getAttribute('data-k')]; return; } v[s.getAttribute('data-k')] = +s.value; last = null; if (Q) { moved = true; ctx.ready(true); } draw(); };
      s.addEventListener('keydown', function (e) { e.stopPropagation(); });
    });
    host.querySelectorAll('.brm .vgo').forEach(function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-e'), e = E[i], c = calc(), bf = { mc: v.mc, nd: c.nd, ev: c.ev };
        ['mc', 'debt', 'cash', 'noa'].forEach(function (k) { if (e[k]) v[k] = clamp(v[k] + e[k], LIM[k][2], LIM[k][3]); });
        last = { e: e, b: bf }; seen[i] = 1; b.classList.add('done');
        host.querySelectorAll('.brm .vgo').forEach(function (x) { x.classList.toggle('on', x === b); });
        draw(); gate(ctx, Object.keys(seen).length >= E.length);
      };
    });
    if (!Q) gate(ctx, !E.length);
    function hit() { var c = calc(); return (ctx.answer || {}).need === 'equity<ev' ? c.eq < c.ev : c.eq > c.ev; }
    if (Q) host.__solve = function (right) {
      if (right) { v.cash = clamp(v.debt + 600, 0, LIM.cash[3]); } else { v.cash = 0; v.noa = 0; }
      moved = true; ctx.ready(true); draw();
    };
    return {
      draw: draw,
      gated: function () { return !Q && E.length && Object.keys(seen).length < E.length; },
      check: function () { var c = calc(); return { right: hit(), detail: '만든 회사: 시가총액 ' + fmt(c.eq) + '억, EV ' + sg(c.ev) + '억.' }; },
      reveal: function (right, a) {
        locked = true; showAns = a || right; ins.forEach(function (s) { s.disabled = true; });
        draw();
        var c = calc();
        vr.innerHTML = '시가총액 ' + fmt(c.eq) + '억 · EV ' + sg(c.ev) + '억 → ' + (right ? '주주가치가 EV보다 커요' : '아직 EV가 더 커요') + (showAns ? '<br><b>현금 + 비영업자산 > 차입금</b>(순현금)이면 주주가치 = EV + 순현금이라 EV보다 커요.' : '') + ' (예시)';
      }
    };
  };

  // 이익 사다리: 매출 → EBITDA → 영업이익 → 세전이익 → 순이익. 상각비·이자·영업외손익·세율 슬라이더로 어느 줄이 움직이고 어느 줄이 버티는지. 문제 모드: 줄 고르기(pick index)
  VIS.ebitdaBuild = function (host, p, ctx) {
    var Q = ctx.mode === 'question', S0 = p.sales || 1000, C0 = p.cost || 800, nm = p.name || '', pick = null, locked = false, showAns = false;
    var v = { da: p.da == null ? 60 : p.da, int: p.int == null ? 30 : p.int, nonop: p.nonop || 0, tax: p.tax == null ? 25 : p.tax }, v0 = JSON.parse(JSON.stringify(v));
    var ALL = { da: ['da', '감가상각비', 0, p.daMax || 160, 5, '억'], int: ['int', '이자비용', 0, p.intMax || 120, 5, '억'], nonop: ['nonop', '영업외손익', -80, 40, 5, '억'], tax: ['tax', '법인세율', 0, 40, 1, '%'] };
    var SL = (p.sl || ['da', 'int', 'nonop', 'tax']).map(function (k) { return ALL[k]; }), PK = p.pick || ['EBITDA', '영업이익', '세전이익', '순이익'];
    host.innerHTML = '<svg role="img"></svg>' + SL.map(function (s) {
      return '<div class="vctl"><label for="curEb' + s[0] + '">' + esc(s[1]) + ' <b></b></label><input id="curEb' + s[0] + '" data-k="' + s[0] + '" type="range" min="' + s[2] + '" max="' + s[3] + '" step="' + s[4] + '" value="' + v[s[0]] + '" aria-label="' + esc(s[1]) + '"></div>';
    }).join('') + (Q ? '<div class="vbt rps" role="radiogroup" aria-label="이익 고르기">' + PK.map(function (k, i) { return '<button type="button" role="radio" aria-checked="false" data-s="' + i + '"><b>' + esc(k) + '</b><i>' + (i + 1) + '</i></button>'; }).join('') + '</div>' : '') +
      '<p class="vr" aria-live="polite"></p>' + (p.cap ? '<p class="vcap">' + esc(p.cap) + '</p>' : '');
    var svg = host.querySelector('svg'), vr = host.querySelector('.vr'), ins = host.querySelectorAll('.vctl input');
    function calc(x) { var eb = S0 - C0, ebit = eb - x.da, ebt = ebit - x.int + x.nonop, tx = Math.max(ebt, 0) * x.tax / 100; return { sales: S0, eb: eb, ebit: ebit, ebt: ebt, tx: tx, ni: ebt - tx }; }
    function sg(x) { return (x < 0 ? '−' : '') + fmt(Math.abs(x)); }
    function rows(c) {
      return [{ l: '매출액', k: 'sales', v: c.sales, who: 0 }, { l: 'EBITDA', k: 'eb', v: c.eb, who: 0, d: '− 원가·판관비(상각비 뺀) ' + fmt(C0) }, { l: '영업이익(EBIT)', k: 'ebit', v: c.ebit, who: 0, d: '− 상각비 ' + fmt(v.da) },
        { l: '세전이익', k: 'ebt', v: c.ebt, who: 1, d: '− 이자 ' + fmt(v.int) + (v.nonop ? (v.nonop > 0 ? ' + 영업외 ' : ' − 영업외 ') + fmt(Math.abs(v.nonop)) : '') }, { l: '순이익(NI)', k: 'ni', v: c.ni, who: 1, d: '− 세금 ' + fmt(c.tx) }];
    }
    var KEY = { 'EBITDA': 'eb', '영업이익': 'ebit', '세전이익': 'ebt', '순이익': 'ni' };
    function draw() {
      var c = calc(v), c0 = calc(v0), R = rows(c), R0 = rows(c0), w = wOf(host), lw = Math.min(130, w * 0.34), vw = 64, rh = 52, h = R.length * rh + 22, hi = Math.max(S0, 1), X = function (x) { return lw + (w - lw - vw) * clamp(x, 0, hi) / hi; }, o = '';
      var ansK = showAns ? KEY[PK[ctx.answer]] : null, pkK = (Q && pick != null) ? KEY[PK[pick]] : null;
      R.forEach(function (r, i) {
        var y = 4 + i * rh, dlt = Math.round(r.v - R0[i].v), on = r.k === ansK, pk = r.k === pkK, col = r.who ? 'rgba(232,201,160,.6)' : 'rgba(143,170,220,.55)', st2 = on ? 'var(--ok)' : pk ? 'var(--wm)' : 'none';
        o += '<text x="0" y="' + (y + 21) + '" class="' + (r.k === 'eb' ? 'th' : 'tt') + '">' + esc(r.l) + '</text>' + (r.d ? '<text x="' + lw + '" y="' + (y + 44) + '" style="font-size:11.5px">' + esc(r.d) + '</text>' : '');
        o += '<rect x="' + lw + '" y="' + (y + 6) + '" width="' + Math.max(2, X(r.v) - lw) + '" height="24" fill="' + col + '" stroke="' + st2 + '" stroke-width="2.5" style="transition:width .3s"/>';
        o += '<text x="' + w + '" y="' + (y + 23) + '" text-anchor="end" class="' + (r.v < 0 ? 'tno' : 'th') + '">' + sg(r.v) + '</text><text x="' + w + '" y="' + (y + 44) + '" text-anchor="end" class="' + (dlt ? (dlt > 0 ? 'tok' : 'tno') : 'ta') + '" style="font-size:11px">' + (i === 0 ? '' : dlt ? (dlt > 0 ? '▲ ' : '▼ ') + fmt(Math.abs(dlt)) : '그대로') + '</text>';
        if (i === 2) o += '<line x1="' + lw + '" x2="' + w + '" y1="' + (y + rh + 1) + '" y2="' + (y + rh + 1) + '" stroke="var(--wm)" stroke-dasharray="3 4"/>';
      });
      o += '<text x="' + lw + '" y="' + (h - 4) + '" style="font-size:10.5px" class="ta">■ 주주 + 채권자 몫</text><text x="' + w + '" y="' + (h - 4) + '" text-anchor="end" style="font-size:10.5px" class="twm">■ 주주 몫 (이자 뒤)</text>';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h); svg.setAttribute('height', h); svg.innerHTML = o;
      svg.setAttribute('aria-label', R.map(function (r) { return r.l + ' ' + sg(r.v); }).join(', ') + ' (억 원, 예시)');
      host.querySelectorAll('.vctl').forEach(function (cl) { var k = cl.querySelector('input').getAttribute('data-k'); cl.querySelector('b').textContent = (k === 'nonop' ? sg(v[k]) : fmt(v[k])) + ALL[k][5]; });
      if (!Q || pick != null || locked) {
        var moved = R.slice(1).filter(function (r, i) { return Math.round(r.v - R0[i + 1].v); }).map(function (r) { return r.l; });
        vr.innerHTML = (nm ? esc(nm) + ' · ' : '') + 'EBITDA <b>' + fmt(c.eb) + '</b> − 상각비 ' + fmt(v.da) + ' = 영업이익 <b>' + sg(c.ebit) + '</b> → 순이익 <b>' + sg(c.ni) + '</b>' + (moved.length ? '<br>처음과 달라진 줄: ' + moved.join(', ') : '') + ' (억 원, 예시)';
      }
    }
    ins.forEach(function (s) { s.oninput = function () { if (locked) return; v[s.getAttribute('data-k')] = +s.value; draw(); }; s.addEventListener('keydown', function (e) { e.stopPropagation(); }); });
    function choose(i) { if (locked) return; pick = i; host.querySelectorAll('.rps button').forEach(function (b) { var o = +b.getAttribute('data-s') === i; b.classList.toggle('on', o); b.setAttribute('aria-checked', o); }); ctx.ready(true); draw(); }
    if (Q) { host.querySelectorAll('.rps button').forEach(function (b) { b.onclick = function () { choose(+b.getAttribute('data-s')); }; }); host.__solve = function (right) { choose(right ? ctx.answer : (ctx.answer + 1) % PK.length); }; vr.innerHTML = esc(p.ask || '이익 줄을 하나 고르세요.'); }
    return {
      draw: draw, key: function (n) { if (Q && PK[n - 1]) choose(n - 1); },
      check: function () { return { right: pick === ctx.answer, detail: '고른 줄: ' + PK[pick] + '.' }; },
      reveal: function (right, a) {
        locked = true; showAns = a || right; ins.forEach(function (s) { s.disabled = true; });
        host.querySelectorAll('.rps button').forEach(function (b) { var i = +b.getAttribute('data-s'); if (i === pick) b.classList.add(right ? 'ok' : 'no'); if (showAns && i === ctx.answer) b.classList.add('ok'); b.disabled = true; });
        draw();
      }
    };
  };

  // ── 플러그인용 도구 (harness/PLUGIN.md) ─────────────────
  // vis/*.js 는 window.CUR_LIB 의 도구로 부품을 만들고 window.CUR_VIS.<name> = function (host, params, ctx) {...} 로 등록한다
  function sliderHtml(id, label, min, max, step, value, aria) { return '<div class="vctl"><label for="' + id + '">' + esc(label) + ' <b></b></label><input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '" aria-label="' + esc(aria || label) + '"></div>'; }
  function addCss(id, text) { if (document.getElementById(id)) return; var el = document.createElement('style'); el.id = id; el.textContent = text; document.head.appendChild(el); }
  window.CUR_LIB = { esc: esc, rich: rich, paras: paras, fmt: fmt, pc: pc, f1: f1, clamp: clamp, wOf: wOf, still: still, pathOf: pathOf, varr: varr, ARDEF: ARDEF, gate: gate, sym: sym, sliderHtml: sliderHtml, addCss: addCss, VIS: VIS };
  var visLoaded = {};
  function loadVis(list) {
    return (list || []).reduce(function (pr, src) {
      return pr.then(function () {
        if (visLoaded[src]) return visLoaded[src];
        return (visLoaded[src] = new Promise(function (ok, no) { var el = document.createElement('script'); el.src = src; el.async = false; el.onload = function () { ok(); }; el.onerror = function () { delete visLoaded[src]; no(new Error('vis ' + src)); }; document.head.appendChild(el); }));
      });
    }, Promise.resolve());
  }

  // ══ 흐름 ═══════════════════════════════════════════════
  function step(id) { return st.map[id]; }
  function mainOrder() {
    var out = [], id = st.mod.start, seen = {};
    while (id && st.map[id] && !seen[id]) { seen[id] = 1; out.push(id); id = (st.map[id].branch || {}).onRight; }
    return out;
  }
  function home(s) { return st.order.indexOf(s.id) >= 0 ? s.id : ((s.branch || {}).onRight || s.id); }
  function isSup(s) { return st.order.indexOf(s.id) < 0; }
  function res(id) { return st.res[id] || (st.res[id] = { tries: 0, first: null, given: null }); }
  function sections() { var out = []; st.order.forEach(function (id) { var s = step(id); if (s.type === 'intro' || s.type === 'summary') return; if (out[out.length - 1] !== s.section) out.push(s.section); }); return out; }

  function crumbs(s) {
    var i = st.order.indexOf(home(s)), n = st.order.length - 2, mp = st.mod.map, mid = s.type !== 'summary' && s.type !== 'intro';
    var h = '<div class="meta"><a tabindex="0" data-go="' + esc(st.mod.start) + '">' + esc(st.mod.module + ' ' + st.mod.title) + '</a>';
    if (mid) {
      if (isSup(s)) h += '<i>·</i><a tabindex="0" data-go="' + esc(home(s)) + '">' + esc(s.section) + '</a><i>·</i><span class="sup">보충</span>';
      else if (!mp) h += '<i>·</i><span class="sec">' + esc(s.section) + '</span>';
      if (i > 0) h += '<span class="n">' + (i - 1) + ' / ' + (n - 1) + '</span>';
    }
    h += '</div>';
    if (mp && mid) {
      var on = (mp.sections || {})[s.section] || '', ks = mp.items.map(function (x) { return x.k; }), at = ks.indexOf(on);
      h += '<div class="mapx" aria-label="' + esc(mp.label || '') + '">' + mp.items.map(function (x, j) {
        var c = x.k === on || (x.with && x.with === on) ? ' on' : (on === 'all' || (at >= 0 && j < at) ? ' done' : '');
        return (x.op ? '<span aria-hidden="true">' + esc(x.op) + '</span>' : '') + '<span class="t' + c + '">' + esc(x.t) + '</span>';
      }).join('') + '<span aria-hidden="true">=</span><span class="res' + (on === 'all' ? ' on' : '') + '">' + esc(mp.res || '') + '</span></div>';
    }
    return h;
  }
  function kicker(s) {
    if (s.type === 'concept') return s.kind === '정리' ? '<span class="kd rc">정리</span>' : '';
    if (isSup(s)) return '';
    if (s.tag) return '<span class="kd qz">' + esc(s.tag) + '</span>';
    if (s.type === 'chart') return '<span class="kd qz">그래프 문제</span>';
    if (GRADED[s.type]) return '<span class="kd qz">확인 문제</span>';
    return '';
  }
  function head(s, small) { return crumbs(s) + kicker(s) + '<h2 class="q' + (small ? ' sm' : '') + '">' + rich(s.prompt) + '</h2>' + (s.note ? block(s.note, 'note') : ''); }
  function prog(s) { var i = st.order.indexOf(home(s)); st.el.querySelector('.cur-bar').style.width = (s.type === 'summary' ? 100 : Math.round(4 + 90 * i / Math.max(1, st.order.length - 1))) + '%'; }
  function btn(label, disabled, fn, alt) {
    var nx = st.el.querySelector('.nx');
    if (!label) { nx.classList.remove('show'); nx.onclick = null; return; }
    nx.innerHTML = esc(label) + ARR; nx.disabled = !!disabled; nx.onclick = function () { if (!nx.disabled) fn(); };
    nx.classList.toggle('alt', !!alt);
    requestAnimationFrame(function () { requestAnimationFrame(function () { nx.classList.add('show'); }); });
  }
  function ready(b) { st.el.querySelector('.nx').disabled = !b; }
  function stagger() {
    st.bx.querySelectorAll('.L>*,.wr,.mt,.fl,.bub,.more,.mw,.sg li,.ig li,.pts li,.md').forEach(function (e, i) {
      e.style.animationDelay = (200 + Math.min(i, 14) * 60) + 'ms';
      e.querySelectorAll('.sym *').forEach(function (x) { x.style.animationDelay = (420 + i * 90) + 'ms'; });
    });
  }
  function go(fn) {
    var bx = st.bx; bx.classList.remove('in'); bx.classList.add('out'); btn();
    setTimeout(function () {
      bx.classList.remove('out', 'done', 'pad', 'home'); st.vis = null; fn(); bx.classList.add('in'); stagger(); st.el.scrollTop = 0;
      var f = bx.querySelector('.o,.mc button,.dc,.vis[tabindex],textarea,input,.md:not(.lock)'); if (f && st.kbd) f.focus({ preventScroll: true });
    }, 300);
  }
  function show(id, noPush) {
    var s = step(id); if (!s) return;
    if (!noPush) st.hist.push(id);
    st.cur = s; st.locked = false; st.el.setAttribute('data-step', s.id); st.el.setAttribute('data-view', 'module');
    var i = st.order.indexOf(s.id); if (i > st.ms.max) st.ms.max = i;
    if (s.type === 'summary') st.ms.done = true;
    st.el.querySelector('.bk').disabled = st.hist.length < 2;
    st.el.querySelector('.hb').hidden = false;
    var rv = st.el.querySelector('.rvw');
    rv.hidden = !st.review; rv.innerHTML = esc(s.id) + ' · ' + esc(s.type) + ' · <b>' + esc(s.status || 'draft') + '</b>';
    prog(s);
    (R[s.type] || R.info)(s);
    if (s.src) { var sp = document.createElement('p'); sp.className = 'src'; sp.textContent = s.src; st.bx.appendChild(sp); }
    // 검수 메모(review): ?review=1 일 때만. 학습 화면에는 절대 안 보인다
    if (st.review && s.review) {
      var rn = document.createElement('aside'), rl = [].concat(s.review);
      rn.className = 'rvn'; rn.innerHTML = '<b>검수 메모 (학습자에게 안 보임)</b><ul>' + rl.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      st.bx.appendChild(rn);
    }
  }
  function to(id) { go(function () { show(id); }); }
  function back() {
    if (!st) return;
    if (st.view === 'home') return;
    if (st.hist.length < 2) return nav('');
    st.hist.pop(); var id = st.hist[st.hist.length - 1];
    go(function () { show(id, true); });
  }
  function jump(id) { var i = st.hist.lastIndexOf(id); st.hist = i >= 0 ? st.hist.slice(0, i) : []; to(id); }
  function reset() { st.ms.res = st.res = {}; st.ms.text = st.text = {}; st.ms.hist = st.hist = []; st.ms.max = 0; }

  function reveal(s, right, extra, detail) {
    var r = res(s.id), firstTry = r.tries === 0;
    r.tries++;
    if (firstTry) r.first = right;
    var sup = !right && firstTry && s.branch && s.branch.onWrong;
    var vd = right ? (firstTry ? '맞아요.' : '이번엔 맞았어요.') : (sup ? '아쉬워요. 한 번만 더 생각해 볼까요?' : '정답을 같이 볼게요.');
    var ex = sup ? '보충 한 장 보고 다시 풀어 볼게요.' : s.explain;
    var box = document.createElement('div');
    box.className = 'rv' + (right ? '' : ' bad'); box.setAttribute('aria-live', 'polite');
    box.innerHTML = '<p class="vd">' + vd + '</p>' + (detail ? '<p class="dt">' + esc(detail) + '</p>' : '') + (ex ? block(ex, 'ex') : '') + (!sup && extra ? extra : '');
    var anchor = st.bx.querySelector('.cl .note') || st.bx.querySelector('.note') || st.bx.querySelector('.q');
    anchor.parentNode.insertBefore(box, anchor.nextSibling);
    st.bx.classList.add('done'); st.locked = true;
    if (sup) btn('보충 보기', false, function () { to(s.branch.onWrong); }, true);
    else btn('다음', false, function () { to(s.branch.onRight); });
    return { sup: sup, right: right, box: box };
  }

  // ── 타입별 화면 ─────────────────────────────────────
  var R = {};
  function optList(s, multi) {
    return '<div class="L" role="' + (multi ? 'group' : 'list') + '">' + s.options.map(function (o, i) {
      return '<button class="o" type="button" ' + (multi ? 'aria-pressed="false"' : 'role="listitem"') + ' data-i="' + i + '"><span class="k">' + pad(i) + '</span>' + (i < 9 ? '<span class="key">' + String.fromCharCode(65 + i) + '</span>' : '') + (multi ? '<span class="ck">' + CHK + '</span>' : '') + sym(o.icon) + '<span class="ot"><span class="lb">' + esc(o.label) + '</span>' + (o.sub ? '<span class="s">' + esc(o.sub) + '</span>' : '') + '</span></button>';
    }).join('') + '</div>';
  }
  function mark(b, cls, label) { b.classList.add(cls); var m = document.createElement('span'); m.className = 'mk'; m.textContent = label; b.appendChild(m); }

  R.intro = function (s) {
    var o = s.options || {}, secs = sections();
    st.bx.innerHTML = crumbs(s) + '<span class="kd">수업 안내</span><h2 class="q">' + rich(s.prompt) + '</h2>' + (s.note ? block(s.note, 'note') : '') +
      '<div class="ig"><div><h3>학습 목표</h3><ul>' + (o.objectives || []).map(function (t, i) { return '<li><b>' + (i + 1) + '</b><span>' + esc(t) + '</span></li>'; }).join('') + '</ul></div>' +
      '<div><dl class="kv"><dt>소요 시간</dt><dd>' + esc(o.time) + '</dd><dt>준비물</dt><dd>' + esc(o.prep) + '</dd><dt>문항</dt><dd>확인 문제 ' + st.order.filter(function (id) { return GRADED[step(id).type]; }).length + '개 + 실습 1개</dd></dl><h3>순서</h3><ol>' + secs.map(function (t, i) { return '<li><b>' + (i + 1) + '</b><span>' + esc(t) + '</span></li>'; }).join('') + '</ol></div></div>';
    st.bx.classList.add('pad');
    btn('시작할게요', false, function () { to(s.branch.onRight); });
  };

  function defs(s) { var d = (s.options || {}).defs; return d && d.length ? '<div class="defs">' + d.map(function (x) { return '<div><b>' + esc(x.t) + '</b><span>' + esc(x.d) + '</span></div>'; }).join('') + '</div>' : ''; }
  R.concept = function (s) {
    var rc = s.kind === '정리' || !s.visual;
    if (rc) {
      st.bx.innerHTML = head(s) + defs(s) + '<ul class="pts big">' + (s.points || []).map(function (t) { return '<li>' + sl(esc(t)) + '</li>'; }).join('') + '</ul>';
    } else if (s.visual.wide) {
      st.bx.innerHTML = crumbs(s) + '<div class="cx wide"><div class="cl">' + kicker(s) + '<h2 class="q sm">' + rich(s.prompt) + '</h2>' + (s.note ? block(s.note, 'note') : '') + '</div><div class="cv"><div class="vis"></div></div>' +
        ((s.points || []).length ? '<ul class="pts">' + s.points.map(function (t) { return '<li>' + sl(esc(t)) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
      mountVis(s, 'concept');
    } else {
      st.bx.innerHTML = crumbs(s) + '<div class="cx"><div class="cl">' + kicker(s) + '<h2 class="q sm">' + rich(s.prompt) + '</h2>' + (s.note ? block(s.note, 'note') : '') +
        '<ul class="pts">' + (s.points || []).map(function (t) { return '<li>' + sl(esc(t)) + '</li>'; }).join('') + '</ul></div><div class="cv"><div class="vis"></div></div></div>';
      mountVis(s, 'concept');
    }
    st.bx.classList.add('pad');
    var nxt = step(s.branch.onRight), lab = rc ? (nxt && nxt.section !== s.section ? '다음 섹션' : '다음') : '이해했어요';
    btn(lab, false, function () { to(s.branch.onRight); });
    if (st.vis && st.vis.gated && st.vis.gated()) { ready(false); st.bx.querySelectorAll('.cx .pts').forEach(function (e) { e.classList.add('lockp'); }); }
  };
  function mountVis(s, mode) {
    var host = st.bx.querySelector('.vis'), f = VIS[s.visual && s.visual.name];
    if (!f) { host.innerHTML = '<p class="vcap">그래프 부품 "' + esc(s.visual && s.visual.name) + '"이 없어요.</p>'; return; }
    st.vis = f(host, s.visual.params || {}, { mode: mode, answer: s.answer, tolerance: s.tolerance, ready: ready, mod: st.mod });
    st.vis.draw();
  }

  R.chart = function (s) {
    st.bx.innerHTML = crumbs(s) + '<div class="cx"><div class="cl">' + kicker(s) + '<h2 class="q sm">' + rich(s.prompt) + '</h2>' + (s.note ? block(s.note, 'note') : '') + '</div><div class="cv"><div class="vis"></div></div></div>';
    st.bx.classList.add('pad');
    btn('확인', true, function () {
      if (st.locked || !st.vis) return;
      var c = st.vis.check();
      var r = reveal(s, c.right, '', c.detail);
      st.vis.reveal(c.right, !r.sup);
    });
    mountVis(s, 'question');
  };

  R.choice = function (s) {
    st.bx.innerHTML = head(s) + optList(s, false);
    var L = st.bx.querySelector('.L');
    L.querySelectorAll('.o').forEach(function (b) {
      b.onclick = function () {
        if (st.locked) return;
        st.locked = true;
        var i = +b.getAttribute('data-i'), right = i === s.answer;
        b.classList.add('on'); L.classList.add('picked', 'locked'); res(s.id).given = i;
        setTimeout(function () {
          var r = reveal(s, right);
          if (right) mark(b, 'ok', '정답');
          else { mark(b, 'no', '내 답'); if (!r.sup) mark(L.children[s.answer], 'ans', '정답'); }
        }, 420);
      };
    });
  };

  R.multi = function (s) {
    st.bx.innerHTML = head(s) + optList(s, true);
    var L = st.bx.querySelector('.L'), bs = L.querySelectorAll('.o');
    var sel = function () { return [].filter.call(bs, function (b) { return b.classList.contains('on'); }).map(function (b) { return +b.getAttribute('data-i'); }); };
    bs.forEach(function (b) {
      b.onclick = function () { if (st.locked) return; var on = b.classList.toggle('on'); b.setAttribute('aria-pressed', on); ready(sel().length > 0); };
    });
    st.bx.classList.add('pad');
    btn('확인', true, function () {
      var picked = sel(), ans = s.answer.slice().sort();
      var right = picked.length === ans.length && picked.every(function (x, i) { return x === ans[i]; });
      res(s.id).given = picked; L.classList.add('locked'); st.locked = true;
      var r = reveal(s, right);
      bs.forEach(function (b, i) {
        var want = ans.indexOf(i) >= 0, got = picked.indexOf(i) >= 0;
        if (got && want) mark(b, 'ok', '맞음');
        else if (got && !want) mark(b, 'no', '아님');
        else if (!got && want && !r.sup) mark(b, 'ans', '빠짐');
        else if (!got) b.style.opacity = '.3';
      });
    });
  };

  R.numeric = function (s) {
    var o = s.options || {};
    st.bx.innerHTML = head(s) + '<div class="wr"><label class="num"><input id="curNum" type="text" inputmode="decimal" autocomplete="off" aria-label="답 (' + esc(o.unit || '') + ')" placeholder="' + esc(o.placeholder || '0') + '"><span>' + esc(o.unit || '') + '</span></label></div>';
    var inp = st.bx.querySelector('#curNum'), wrap = st.bx.querySelector('.num');
    var val = function () { var v = parseFloat(inp.value.replace(/,/g, '').trim()); return isNaN(v) ? null : v; };
    var submit = function () {
      var v = val(); if (v == null || st.locked) return;
      var right = Math.abs(v - s.answer) <= (o.tolerance || 0);
      res(s.id).given = v; inp.readOnly = true;
      wrap.classList.add(right ? 'ok' : 'no');
      var r = reveal(s, right);
      if (!right && !r.sup) { var c = document.createElement('p'); c.className = 'calc'; c.innerHTML = '<span>내 답 ' + esc(v) + esc(o.unit || '') + '</span><span>정답 ' + esc(s.answer) + esc(o.unit || '') + '</span>'; wrap.parentNode.appendChild(c); }
    };
    inp.oninput = function () { inp.value = inp.value.replace(/[^\d.,\-]/g, ''); ready(val() != null); };
    inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
    st.bx.classList.add('pad');
    btn('확인', true, submit);
    setTimeout(function () { if (st.cur === s && !st.locked) inp.focus({ preventScroll: true }); }, 650);
  };

  R.match = function (s) {
    var rows = s.options.rows, cols = s.options.cols, pick = {}, act = rows[0].id;
    st.bx.innerHTML = head(s, true) + '<div class="mt"><div class="mc" role="group" aria-label="기법">' + cols.map(function (c, i) {
      return '<button type="button" data-c="' + esc(c) + '"><span>' + esc(c) + '</span><i>' + (i + 1) + '</i></button>';
    }).join('') + '</div><div class="mr">' + rows.map(function (r) {
      return '<button type="button" class="mw" data-r="' + esc(r.id) + '"><span class="ot"><span class="lb">' + esc(r.label) + '</span>' + (r.sub ? '<span class="s">' + esc(r.sub) + '</span>' : '') + '</span><span class="sl2">고르기</span></button>';
    }).join('') + '</div></div>';
    var mt = st.bx.querySelector('.mt');
    var paint = function () {
      mt.querySelectorAll('.mw').forEach(function (w) {
        var id = w.getAttribute('data-r'), sl = w.querySelector('.sl2');
        w.classList.toggle('act', id === act && !st.locked);
        w.setAttribute('aria-pressed', id === act);
        sl.textContent = pick[id] || (id === act ? '← 기법을 눌러요' : '고르기');
        sl.classList.toggle('f', !!pick[id]);
      });
      var used = {}; Object.keys(pick).forEach(function (k) { used[pick[k]] = 1; });
      mt.querySelectorAll('.mc button').forEach(function (b) { b.classList.toggle('used', !!used[b.getAttribute('data-c')]); });
      ready(Object.keys(pick).length >= rows.length);
    };
    var choose = function (c) {
      if (st.locked || !act) return;
      Object.keys(pick).forEach(function (k) { if (pick[k] === c) delete pick[k]; });
      pick[act] = c;
      var nxt = rows.filter(function (r) { return !pick[r.id]; })[0];
      act = nxt ? nxt.id : null;
      paint();
    };
    st.matchKey = function (n) { if (cols[n - 1]) choose(cols[n - 1]); };
    mt.querySelectorAll('.mw').forEach(function (w) { w.onclick = function () { if (st.locked) return; act = w.getAttribute('data-r'); paint(); }; });
    mt.querySelectorAll('.mc button').forEach(function (b) { b.onclick = function () { choose(b.getAttribute('data-c')); }; });
    st.bx.classList.add('pad');
    btn('확인', true, function () {
      var bad = rows.filter(function (r) { return pick[r.id] !== s.answer[r.id]; });
      var right = !bad.length;
      res(s.id).given = JSON.parse(JSON.stringify(pick)); act = null; mt.classList.add('locked');
      st.locked = true; paint();
      var r = reveal(s, right);
      st.bx.querySelector('.rv .vd').textContent = right ? (res(s.id).tries === 1 ? rows.length + '개 다 맞아요.' : '이번엔 다 맞았어요.') : (rows.length - bad.length) + ' / ' + rows.length + ' 맞았어요.' + (r.sup ? '' : ' 정답을 같이 볼게요.');
      mt.querySelectorAll('.mw').forEach(function (w) {
        var id = w.getAttribute('data-r'), ok = pick[id] === s.answer[id];
        w.classList.add(ok ? 'ok' : 'no');
        if (!ok && !r.sup) { var f = document.createElement('span'); f.className = 'fx'; f.textContent = '정답 ' + s.answer[id]; w.querySelector('.ot').appendChild(f); }
      });
      if (!r.sup && s.map) { var mp = document.createElement('div'); mp.className = 'map'; mp.innerHTML = s.map.map(function (m, i) { return '<div style="animation-delay:' + (200 + i * 80) + 'ms"><b>' + esc(m.m) + '</b><span>' + esc(m.when) + '</span><small>' + esc(m.how) + '</small></div>'; }).join(''); mt.after(mp); }
    });
    paint();
  };

  R.text = function (s) {
    var fs = s.options.fields;
    st.bx.innerHTML = head(s, true) + '<div class="tw"><div class="fl">' + fs.map(function (f) {
      return '<div><label for="curF_' + esc(f.id) + '">' + esc(f.label) + '</label><textarea id="curF_' + esc(f.id) + '" rows="1" placeholder="' + esc(f.placeholder) + '">' + esc(st.text[f.id] || '') + '</textarea></div>';
    }).join('') + '</div></div>';
    var tas = st.bx.querySelectorAll('textarea');
    var grow = function (t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };
    var ok = function () { return [].every.call(tas, function (t) { return t.value.trim().length >= 5; }); };
    tas.forEach(function (t, i) {
      t.oninput = function () { st.text[fs[i].id] = t.value; grow(t); ready(ok()); };
      t.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && !(e.metaKey || e.ctrlKey) && i < tas.length - 1) { e.preventDefault(); tas[i + 1].focus(); } };
      setTimeout(function () { grow(t); }, 0);
    });
    st.bx.classList.add('pad');
    btn('피드백 받기', !ok(), function () {
      if (st.locked) return;
      st.locked = true; tas.forEach(function (t) { t.readOnly = true; });
      btn();
      var fb = document.createElement('div');
      fb.className = 'fb ld'; fb.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>읽어 보는 중이에요';
      st.bx.querySelector('.tw').appendChild(fb);
      if (window.innerWidth < 900) fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(function () {
        if (st.cur !== s) return;
        var checks = (s.rubric || []).map(function (c) { return { c: c, pass: grade(c, st.text) }; });
        var n = checks.filter(function (x) { return x.pass; }).length;
        res(s.id).given = { pass: n, of: checks.length }; res(s.id).tries++;
        fb.className = 'fb';
        fb.innerHTML = '<div class="hd"><b>' + (n === checks.length ? '기준을 다 채웠어요' : checks.length + '개 중 ' + n + '개를 채웠어요') + '</b><span class="tag">예시 피드백 · 실제는 서버 채점</span></div>' +
          '<p class="cr">채점 기준</p><ul>' + checks.map(function (x, i) {
            return '<li class="' + (x.pass ? 'y' : 'n') + '" style="animation-delay:' + (120 + i * 120) + 'ms"><em>' + (x.pass ? '✓' : '△') + '</em><span>' + esc(x.c.label) + '</span><small>' + esc(x.pass ? x.c.ok : x.c.miss) + '</small></li>';
          }).join('') + '</ul>' + block(s.explain, 'sm');
        st.bx.classList.add('done');
        btn('정리 보기', false, function () { to(s.branch.onRight); });
      }, 1100);
    });
    setTimeout(function () { if (st.cur === s && !st.locked && st.kbd) tas[0].focus({ preventScroll: true }); }, 650);
  };
  function grade(c, v) { // 프로토타입용 흉내 채점. 실제는 서버에서 모델이 rubric으로 채점
    var t = String(v[c.field] || '').trim();
    if (c.minLen && t.length < c.minLen) return false;
    if (c.regex && !new RegExp(c.regex).test(t)) return false;
    if (c.any && !c.any.some(function (w) { return t.toUpperCase().indexOf(w.toUpperCase()) >= 0; })) return false;
    return !!t;
  }

  // 줄마다 바구니 하나 고르기 (체크리스트, 분류)
  R.sort = function (s) {
    var rows = s.options.rows, bins = s.options.bins, pick = {};
    st.bx.innerHTML = head(s, true) + '<div class="sx">' + rows.map(function (r, k) {
      return '<div class="sr" data-r="' + esc(r.id) + '" style="animation-delay:' + (180 + k * 60) + 'ms"><div class="ot">' + (r.tag ? '<small>' + esc(r.tag) + '</small>' : '') + '<span class="lb">' + esc(r.label) + '</span></div><div class="vbt" role="radiogroup" aria-label="' + esc(r.label) + '">' +
        bins.map(function (b, i) { return '<button type="button" role="radio" aria-checked="false" data-b="' + esc(b) + '">' + esc(b) + '<i>' + (i + 1) + '</i></button>'; }).join('') + '</div></div>';
    }).join('') + '</div>';
    var sx = st.bx.querySelector('.sx');
    var paint = function () {
      var nxt = rows.filter(function (r) { return !pick[r.id]; })[0];
      sx.querySelectorAll('.sr').forEach(function (el) {
        var id = el.getAttribute('data-r');
        el.classList.toggle('act', !st.locked && nxt && nxt.id === id);
        el.querySelectorAll('button').forEach(function (b) { var on = pick[id] === b.getAttribute('data-b'); b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      });
      ready(!nxt);
    };
    var set = function (id, b) { if (st.locked) return; pick[id] = b; paint(); };
    sx.querySelectorAll('.sr').forEach(function (el) { el.querySelectorAll('button').forEach(function (b) { b.onclick = function () { set(el.getAttribute('data-r'), b.getAttribute('data-b')); }; }); });
    st.sortKey = function (n) { var nxt = rows.filter(function (r) { return !pick[r.id]; })[0]; if (nxt && bins[n - 1]) set(nxt.id, bins[n - 1]); };
    st.bx.classList.add('pad');
    btn('확인', true, function () {
      var bad = rows.filter(function (r) { return pick[r.id] !== s.answer[r.id]; }), right = !bad.length;
      res(s.id).given = JSON.parse(JSON.stringify(pick)); st.locked = true; paint();
      var r = reveal(s, right);
      st.bx.querySelector('.rv .vd').textContent = right ? (res(s.id).tries === 1 ? rows.length + '개 다 맞아요.' : '이번엔 다 맞았어요.') : (rows.length - bad.length) + ' / ' + rows.length + ' 맞았어요.' + (r.sup ? '' : ' 정답을 같이 볼게요.');
      sx.querySelectorAll('.sr').forEach(function (el) {
        var id = el.getAttribute('data-r'), ok = pick[id] === s.answer[id];
        el.classList.add(ok ? 'ok' : 'no');
        el.querySelectorAll('button').forEach(function (b) { b.disabled = true; if (b.classList.contains('on')) b.classList.add(ok ? 'ok' : 'no'); });
        if (!ok && !r.sup) { var f = document.createElement('span'); f.className = 'fx'; f.textContent = '정답 ' + s.answer[id]; el.querySelector('.ot').appendChild(f); }
      });
    });
    paint();
  };

  R.info = function (s) {
    st.bx.innerHTML = head(s) + '<div class="bub"><b>보충</b>' + paras(s.hint || s.explain || '') + '</div>';
    btn('다시 풀어 볼게요', false, function () { to(s.branch.onRight); });
  };

  function stamp(code, date) {
    return '<svg class="stp" viewBox="0 0 200 200" role="img" aria-label="' + esc(code) + ' 수료 도장"><defs><path id="curStp" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"/></defs><circle cx="100" cy="100" r="94" stroke-width="3"/><circle cx="100" cy="100" r="86" stroke-width="1"/><circle cx="100" cy="100" r="56" stroke-width="1"/>' +
      '<text font-size="12.5" letter-spacing="2.4"><textPath href="#curStp">R.F.S. VALUATION CURRICULUM · 중앙대 가치투자학회 ·</textPath></text>' +
      '<text x="100" y="98" font-size="34" font-weight="700">' + esc(code) + '</text><text x="100" y="124" font-size="18" font-weight="600" letter-spacing="6">수료</text><text x="100" y="146" font-size="11" letter-spacing="1">' + esc(date) + '</text></svg>';
  }
  function labDone(id) { try { return localStorage.getItem('rfs-lab-done-' + id) === '1'; } catch (e) { return false; } }
  function labCard() {
    var cm = (st.course && st.course.modules || []).filter(function (m) { return m.code === st.mod.module; })[0], lb = cm && cm.lab;
    if (!lb) return '';
    var dn = labDone(cm.id);
    return '<div class="labc' + (dn ? ' done' : '') + '"><div><small>' + (dn ? '직접 해보기 · 완료' : '직접 해보기') + '</small><b>' + esc(lb.title) + '</b><span>' + lb.steps + '단계 · 약 ' + lb.minutes + '분 · 키보드로 하는 실습이라 PC에서</span></div><a href="' + esc(lb.href) + '">' + (dn ? '시트 다시 열기' : '시트 열기') + ' →</a></div>';
  }
  R.summary = function (s) {
    var ids = st.order.filter(function (id) { return GRADED[step(id).type]; });
    var got = ids.filter(function (id) { return res(id).first === true; }).length;
    var wrong = ids.filter(function (id) { return res(id).first !== true; });
    var tx = st.order.filter(function (id) { return step(id).type === 'text'; })[0], tr = tx && res(tx).given;
    var d = new Date(), date = d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.';
    st.bx.innerHTML = crumbs(s) + '<span class="kd rc">모듈 완료</span><h2 class="q">' + rich(s.prompt) + '</h2>' +
      '<div class="sh">' + stamp(st.mod.module, date) + '<div class="sc" aria-label="첫 시도 정답 ' + got + ' / ' + ids.length + '"><b>' + got + '</b><span>/ ' + ids.length + '</span><small>한 번에 맞힌 문항' + (tr ? ' · 실습 기준 ' + tr.pass + '/' + tr.of : '') + '</small></div></div>' +
      '<div class="sg"><div><h3>다시 볼 것</h3><ul>' + (wrong.length ? wrong.map(function (id) {
        var q = step(id), r = res(id);
        return '<li><small>' + esc(q.section) + (r.tries ? '' : ' · 건너뜀') + '</small>' + esc(plain(q.prompt)) + '<a data-re="' + esc(id) + '" tabindex="0">다시 풀기</a></li>';
      }).join('') : '<li class="zero">틀린 문항이 없어요. 한 번에 다 맞혔어요.</li>') + '</ul></div>' +
      '<div><h3>' + esc(st.mod.module) + '에서 가져갈 것</h3><ul>' + (s.options.takeaways || []).map(function (t) { return '<li>' + sl(esc(t)) + '</li>'; }).join('') + '</ul></div></div>' +
      labCard() +
      '<div style="display:flex;gap:26px;flex-wrap:wrap"><button class="more hm2" type="button">코스 홈으로</button><button class="more rs2" type="button">처음부터 다시</button></div><p class="soon" aria-live="polite"></p>';
    st.bx.querySelectorAll('[data-re]').forEach(function (a) { a.onclick = function () { st.hist = st.ms.hist = []; to(a.getAttribute('data-re')); }; a.onkeydown = function (e) { if (e.key === 'Enter') a.click(); }; });
    st.bx.querySelector('.rs2').onclick = function () { reset(); to(st.mod.start); };
    st.bx.querySelector('.hm2').onclick = function () { nav(''); };
    var nx = st.mod.next || {};
    st.bx.classList.add('pad');
    btn(nx.label || '다음 모듈로', false, function () {
      if (nx.ready && nx.href) location.href = nx.href;
      else st.bx.querySelector('.soon').textContent = (nx.id || '다음 모듈') + '은 준비하고 있어요. 열리면 코스 홈에서 바로 이어져요.';
    });
  };

  // ══ 코스 홈 ═══════════════════════════════════════════
  function modProg(m) {
    var ms = st.mods[m.id];
    if (!ms) return { f: 0, label: m.ready ? '진행 중' : '잠김', cls: m.ready ? 'go' : 'lk' };
    if (ms.done) return { f: 1, label: '완료', cls: 'ok' };
    return { f: ms.total ? ms.max / (ms.total - 1) : 0, label: '진행 중', cls: 'go' };
  }
  function ring(f, txt, ok) {
    var c = 2 * Math.PI * 22;
    return '<span class="ring' + (ok ? ' ok' : '') + '"><svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="22" class="rt"/><circle cx="28" cy="28" r="22" class="rf" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - f)).toFixed(1) + '" transform="rotate(-90 28 28)" stroke-linecap="round"/><text x="28" y="33">' + esc(txt) + '</text></svg></span>';
  }
  function renderHome() {
    var C = st.course, mods = C.modules;
    st.view = 'home'; st.cur = null; st.el.setAttribute('data-view', 'home'); st.el.setAttribute('data-step', 'home');
    st.el.querySelector('.bk').disabled = true; st.el.querySelector('.hb').hidden = true; st.el.querySelector('.rvw').hidden = true;
    var ps = mods.map(modProg), tot = ps.reduce(function (a, p) { return a + p.f; }, 0) / mods.length, done = ps.filter(function (p) { return p.f === 1; }).length;
    st.el.querySelector('.cur-bar').style.width = Math.round(tot * 100) + '%';
    var mins = mods.reduce(function (a, m) { return a + m.minutes; }, 0), qn = mods.reduce(function (a, m) { return a + m.questions; }, 0), labs = mods.filter(function (m) { return m.lab; }).length;
    var certOpen = !!(st.mods[C.certificate.unlockAfter] && st.mods[C.certificate.unlockAfter].done);
    // 지금 할 모듈: 하다 만 모듈, 없으면 아직 안 끝낸 첫 모듈
    var now = ps.findIndex(function (p) { return p.f > 0 && p.f < 1; }); if (now < 0) now = ps.findIndex(function (p) { return p.f < 1; }); if (now < 0) now = 0;
    var GE = {}; C.groups.forEach(function (g) { GE[g.id] = g.en || g.label; });
    var seen = {};
    st.bx.classList.add('home');
    st.bx.innerHTML = '<section class="hx"><p class="lb">Valuation Curriculum</p><h1>Curriculum</h1><p class="ld">' + esc(C.intro) + '</p>' +
      '<div class="sts"><div><b>' + mods.length + '</b><span>Modules</span></div><div><b>' + Math.round(mins / 60) + 'h</b><span>Study time</span></div><div><b>' + qn + '</b><span>Questions</span></div>' + (labs ? '<div><b>' + labs + '</b><span>Lab sheets</span></div>' : '') + '<div><b>' + done + '<small> / ' + mods.length + '</small></b><span>Completed</span></div></div></section>' +
      '<section class="rx"><p class="lb">Modules</p><ol class="tl">' + mods.map(function (m, i) {
        var p = ps[i], eb = seen[m.group] ? '' : GE[m.group]; seen[m.group] = 1;
        return '<li class="' + (p.f === 1 ? 'done' : (i === now ? 'now' : '')) + (m.ready ? '' : ' lock') + '" data-i="' + i + '"><button type="button" aria-label="' + esc(m.code + ' ' + m.title + (p.f === 1 ? ', 완료' : p.f > 0 ? ', ' + Math.round(p.f * 100) + '%' : '')) + '"><span class="eb">' + esc(eb) + '</span><span class="cd">' + esc(m.code) + '</span><span class="ln"><i></i></span><span class="tt">' + esc(m.title) + '</span></button></li>';
      }).join('') + '</ol>' +
      '<article class="mc" aria-live="polite"><div class="hd"><div><small></small><h2></h2><p></p></div><img src="../assets/rfs-seal-light-256.png" alt=""></div>' +
      '<div class="bd"><div><h4></h4><div class="fx"></div><div class="ft"><button type="button" class="go"></button><span class="mt"></span></div></div><div><h4>목표</h4><ul class="ob"></ul></div></div></article></section>' +
      '<section class="cx"><p class="lb">Certificate</p><div class="cert' + (certOpen ? ' open' : '') + '"><div class="pp" aria-hidden="' + !certOpen + '"><img src="../assets/rfs-seal-light-256.png" alt=""><p class="t1">CERTIFICATE</p><p class="t2">' + esc(C.certificate.title) + '</p><p class="t3">이름 ______ 님은<br>R.F.S. ' + esc(C.certificate.line) + '.</p><div class="t4"><span>중앙대학교 가치투자학회 R.F.S.</span><span>' + new Date().getFullYear() + '</span></div></div>' +
      (certOpen ? '' : '<div class="lk">' + LOCK + '<b>M9까지 마치면 열려요</b><span>지금 ' + done + ' / ' + mods.length + ' 모듈 완료 · 모듈마다 수료 도장을 받아요</span></div>') + '</div></section>';
    var card = st.bx.querySelector('.mc');
    function pick(i) {
      var m = mods[i], p = ps[i], ms = st.mods[m.id];
      st.bx.querySelectorAll('.tl li').forEach(function (li) { li.classList.toggle('sel', +li.getAttribute('data-i') === i); });
      card.querySelector('small').textContent = m.code + ' · ' + GE[m.group];
      card.querySelector('h2').textContent = m.title;
      card.querySelector('.hd p').textContent = m.lead || m.objectives[0];
      card.querySelector('.ob').innerHTML = m.objectives.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('');
      card.querySelector('.mt').textContent = '약 ' + m.minutes + '분 · ' + m.questions + '문항' + (m.lab ? ' · 실습 시트' : '');
      var go = card.querySelector('.go');
      go.innerHTML = (!m.ready ? '준비 중' : p.f === 1 ? '다시 보기' : (ms && ms.max > 0 ? '이어서 하기' : '시작하기')) + (m.ready ? ARR : '');
      go.disabled = !m.ready; go.onclick = function () { nav('?m=' + m.id); };
      var fx = card.querySelector('.fx'), h4 = card.querySelector('.bd h4'); fx.innerHTML = ''; h4.textContent = '';
      if (m.ready) loadJSON(m.file).then(function (mod) {
        if (card.querySelector('h2').textContent !== m.title || !mod.map) return;
        var mp = mod.map, arrow = mp.items.some(function (x) { return x.op === '→'; });
        h4.textContent = arrow ? '순서' : '계산식';
        fx.innerHTML = mp.items.map(function (x) { return (x.op ? '<span class="op">' + esc(x.op) + '</span>' : '') + '<span class="c">' + esc(x.t) + '</span>'; }).join('') + '<span class="op">' + (arrow ? '→' : '=') + '</span><span class="c res">' + esc(mp.res) + '</span>';
      }).catch(function () {});
    }
    st.bx.querySelectorAll('.tl li').forEach(function (li) { li.querySelector('button').onclick = function () { pick(+li.getAttribute('data-i')); if (window.innerWidth < 980) card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
    pick(now);
    btn();
  }
  function toast(t) { var el = st.el.querySelector('.toast'); el.textContent = t; el.classList.add('show'); clearTimeout(st.tt); st.tt = setTimeout(function () { el.classList.remove('show'); }, 2200); }

  // ══ 길찾기 ════════════════════════════════════════════
  function nav(url) { history.pushState(null, '', url || location.pathname); route(); }
  function loadJSON(f) { st.cache = st.cache || {}; if (st.cache[f]) return Promise.resolve(st.cache[f]); return fetch(f, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) { st.cache[f] = j; return j; }); }
  function route() {
    var m = (qs('m') || '').replace(/[^\w-]/g, '');
    var info = m && st.course.modules.filter(function (x) { return x.id === m; })[0];
    if (!m) return go(renderHome);
    if (!info || !info.ready) { go(renderHome); return setTimeout(function () { toast('그 모듈은 준비 중이에요.'); }, 400); }
    loadJSON(info.file).then(function (mod) { return loadVis(mod.vis).then(function () { return mod; }); }).then(function (mod) {
      st.view = 'module'; st.mod = mod; st.map = {};
      mod.steps.forEach(function (s) { st.map[s.id] = s; });
      st.order = mainOrder();
      var ms = st.mods[info.id] || (st.mods[info.id] = { res: {}, text: {}, hist: [], max: 0, done: false });
      ms.total = st.order.length; st.ms = ms; st.res = ms.res; st.text = ms.text; st.hist = ms.hist;
      document.title = mod.module + ' ' + mod.title + ' · R.F.S. 커리큘럼';
      var want = qs('step') && st.map[qs('step')] ? qs('step') : null;
      go(function () { if (want) { st.hist = ms.hist = []; show(want); } else if (st.hist.length) show(st.hist[st.hist.length - 1], true); else show(mod.start); });
    }).catch(function () { st.bx.innerHTML = '<p class="err">모듈을 불러오지 못했어요. 잠시 후 다시 열어 주세요.</p>'; });
  }

  // ── 키보드 ──────────────────────────────────────────
  function onKey(e) {
    if (!st) return;
    if (e.key === 'Tab') st.kbd = true;
    if (e.key === 'Escape') { e.preventDefault(); return back(); }
    var t = e.target.tagName;
    if (t === 'TEXTAREA' || t === 'INPUT') { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); st.el.querySelector('.nx').click(); } return; }
    if (st.view !== 'module') return;
    var n = +e.key, ty = st.cur && st.cur.type, lk = /^[a-iA-I]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey ? e.key.toUpperCase().charCodeAt(0) - 64 : 0;
    if (lk && (ty === 'choice' || ty === 'multi') && !st.locked) n = lk;
    if (n >= 1 && n <= 9 && !st.locked) {
      if (ty === 'match') { e.preventDefault(); return st.matchKey(n); }
      if (ty === 'sort') { e.preventDefault(); return st.sortKey(n); }
      if (ty === 'chart' && st.vis && st.vis.key) { e.preventDefault(); return st.vis.key(n); }
      var os = st.bx.querySelectorAll('.L .o');
      if (n <= os.length) { e.preventDefault(); os[n - 1].click(); }
      return;
    }
    if (e.key === 'Enter' && !/^(BUTTON|A)$/.test(t)) { var nx = st.el.querySelector('.nx'); if (nx.classList.contains('show') && !nx.disabled) { e.preventDefault(); nx.click(); } }
  }

  // ── 시작 ───────────────────────────────────────────
  function boot() {
    var c = document.createElement('style'); c.textContent = CSS + '\n' + CSS2; document.head.appendChild(c);
    var el = document.createElement('div');
    el.className = 'cur v2'; el.setAttribute('aria-label', '밸류에이션 커리큘럼');
    el.innerHTML = '<div class="cur-bg"></div><div class="cur-grain"></div><div class="cur-bar"></div>' +
      '<div class="cur-top"><button class="ib bk" aria-label="이전" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><button class="sl" type="button" aria-label="코스 홈"><img src="../assets/rfs-seal-light-256.png" alt=""><span>CURRICULUM</span></button><button class="tb hb" type="button" hidden>코스 홈</button></div>' +
      '<div class="rvw" hidden></div><main class="cur-wrap"></main><button class="nx" type="button"></button><div class="toast" role="status" aria-live="polite"></div>';
    document.body.appendChild(el);
    st = { el: el, bx: el.querySelector('.cur-wrap'), mods: {}, hist: [], res: {}, text: {}, kbd: false, review: !!qs('review'), view: 'home' };
    el.querySelector('.bk').onclick = back;
    el.querySelector('.hb').onclick = function () { nav(''); };
    el.querySelector('.sl').onclick = function () { if (st.view !== 'home') nav(''); };
    st.bx.addEventListener('click', function (e) { var a = e.target.closest('.meta a'); if (a) jump(a.getAttribute('data-go')); });
    st.bx.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('.meta a')) e.target.click(); });
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('popstate', route);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (st.vis && st.vis.draw) st.vis.draw(); }, 120); });
    requestAnimationFrame(function () { el.classList.add('show'); });
    var intro = !qs('nointro') && !qs('step') && !qs('m') && !still(), t0 = Date.now();
    if (intro) st.bx.innerHTML = '<h1 class="ttl">Valuation<small>R.F.S. 밸류에이션 커리큘럼</small></h1>';
    loadJSON('course.json').then(function (course) {
      st.course = course;
      setTimeout(route, intro ? Math.max(0, 2000 - (Date.now() - t0)) : 0);
    }).catch(function () { st.bx.innerHTML = '<p class="err">코스를 불러오지 못했어요. 잠시 후 다시 열어 주세요.</p>'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
