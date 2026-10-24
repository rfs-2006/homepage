/* AGORA "선배님께 여쭙기"
 * 화면 하나에 질문 하나. 분야(f1) > 업권(f2) > 일(f3) 순으로 좁혀서 선배님 세 분을 안내하고,
 * 공손한 첫 문자를 만들어 준다. 폰은 문자 앱을 바로 열고, PC는 QR로 폰에 넘긴다.
 * 쓰는 법: RFSAsk.open({ alumni, me: {name, cohort}, onSaveMe(name, cohort) })
 */
(function () {
  'use strict';
  var CSS = "\
.ask{position:fixed;inset:0;z-index:3000;color:#F2EFE8;background:#0B1526;font-family:'RFS Dotum UI','Pretendard Variable',Pretendard,sans-serif;font-weight:300;-webkit-font-smoothing:antialiased;word-break:keep-all;overflow-wrap:break-word;overflow-y:auto;overscroll-behavior:contain;opacity:0;transition:opacity .45s ease}\
.ask.show{opacity:1}\
.ask *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}\
.ask{--tx:#F2EFE8;--t2:rgba(242,239,232,.74);--t3:rgba(242,239,232,.5);--ac:#8FAADC;--ac2:#C9D8F5;--hair:rgba(242,239,232,.16);--e:cubic-bezier(.2,.8,.2,1);--ser:'Noto Serif KR',serif;--pad:22px}\
@media (min-width:900px){.ask{--pad:clamp(40px,6vw,96px)}}\
.ask-bg{position:fixed;inset:0;background:url(/assets/hero/cau.webp) center 70%/cover;transform:scale(1.05);animation:askDrift 34s ease-in-out infinite alternate}\
@media (max-width:899px){.ask-bg{background-image:url(/assets/hero/cau-m.webp);background-position:40% 60%}}\
.ask-bg::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(9,17,31,.84),rgba(9,17,31,.6) 38%,rgba(9,17,31,.93) 82%,#09111F)}\
@media (max-width:899px){.ask-bg::after{background:linear-gradient(180deg,rgba(9,17,31,.86),rgba(9,17,31,.74) 40%,rgba(9,17,31,.94) 80%,#09111F)}}\
@keyframes askDrift{to{transform:scale(1.1) translateX(-1.5%)}}\
.ask-grain{position:fixed;inset:0;background:url(/assets/grain.png);opacity:.1;mix-blend-mode:overlay;pointer-events:none}\
.ask-bar{position:fixed;top:0;left:0;height:2px;width:0;background:var(--ac);z-index:5;transition:width .7s var(--e)}\
.ask-top{position:fixed;top:0;left:0;right:0;z-index:4;height:64px;background:transparent;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(10px,3vw,40px)}\
.ask-top .sl{display:flex;align-items:center;gap:10px;font-family:var(--ser);font-size:12.5px;letter-spacing:.2em}\
.ask-top .sl img{width:24px;height:24px;opacity:.9}\
.ask .ib{width:44px;height:44px;border:0;background:none;display:flex;align-items:center;justify-content:center;color:var(--t2);cursor:pointer;transition:opacity .25s,color .2s}\
.ask .ib:hover{color:var(--tx)}.ask .ib:disabled{opacity:0;pointer-events:none}.ask .ib svg{width:22px;height:22px}\
.ask .ib:focus-visible,.ask .o:focus-visible,.ask .nx:focus-visible,.ask .how button:focus-visible,.ask .meta a:focus-visible,.ask .more:focus-visible{outline:2px solid var(--ac);outline-offset:2px}\
.ask-wrap{position:relative;z-index:2;min-height:100vh;min-height:100svh;display:flex;flex-direction:column;padding:104px var(--pad) 130px}\
@media (min-width:900px){.ask-wrap{padding:120px var(--pad) 0}}\
.ask .meta{font-size:13px;letter-spacing:.04em;color:var(--ac);margin-bottom:16px;font-weight:500}\
.ask .meta a{color:inherit;text-decoration:none;cursor:pointer;transition:color .2s}.ask .meta a:hover{color:var(--tx)}.ask .meta i{font-style:normal;margin:0 8px;color:var(--t3)}\
.ask .q{color:var(--tx) !important;text-shadow:0 2px 24px rgba(0,0,0,.35);font-family:var(--ser);font-weight:600;font-size:clamp(36px,10vw,46px);line-height:1.2;letter-spacing:-.045em}\
@media (min-width:900px){.ask .q{font-size:clamp(56px,5.2vw,88px);line-height:1.12;max-width:15em}}\
.ask .L{display:flex;flex-direction:column;margin-top:36px}\
.ask .o{position:relative;display:flex;align-items:center;gap:14px;width:100%;min-height:56px;padding:12px 0 12px 16px;background:none;border:0;color:var(--tx);font:inherit;text-align:left;cursor:pointer;transition:opacity .35s,transform .35s var(--e)}\
.ask .o::before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:2px;background:var(--hair);transition:background .3s,top .35s var(--e),bottom .35s var(--e)}\
.ask .o .lb{font-family:var(--ser);font-size:22px;font-weight:600;letter-spacing:-.03em;line-height:1.3}\
.ask .o .s{font-size:13px;color:var(--t2);margin-left:auto;padding-left:10px;white-space:nowrap}\
.ask .o:hover::before,.ask .o:focus-visible::before,.ask .o.on::before{background:var(--ac);top:8px;bottom:8px}\
.ask .o:active{transform:translateX(4px)}\
.ask .L.picked .o:not(.on){opacity:.18}\
.ask .o .k,.ask .o .key{display:none}\
.ask .sym{display:block;flex:none;width:26px;height:26px;color:var(--ac2)}\
.ask .sym *{fill:none;stroke:currentColor;stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:1}\
.ask .in .sym *{animation:askDraw 1.3s cubic-bezier(.5,0,.2,1) forwards}\
@keyframes askDraw{to{stroke-dashoffset:0}}\
.ask .o:hover .sym,.ask .o.on .sym{color:#fff}\
.ask .pp .cy{font-family:var(--ser);font-size:15px;color:var(--ac);font-weight:600;margin-left:auto;padding-left:10px;white-space:nowrap}\
.ask .pp .nm{display:flex;flex-direction:column;gap:3px}\
.ask .pp .co{font-size:13.5px;color:var(--t2);line-height:1.5}\
.ask .more{align-self:flex-start;margin-top:18px;background:none;border:0;color:var(--t2);font:inherit;font-size:14px;cursor:pointer;box-shadow:inset 0 -1px 0 var(--hair);padding:6px 0;transition:color .2s,box-shadow .2s}\
.ask .more:hover{color:var(--tx);box-shadow:inset 0 -1px 0 var(--ac)}\
.ask .empty{margin-top:32px;font-size:16px;color:var(--t2);line-height:1.7}\
@media (min-width:900px){\
 .ask .L{flex-direction:row;margin:auto calc(-1*var(--pad)) 0;height:min(42vh,380px);border-top:1px solid var(--hair);background:linear-gradient(180deg,transparent,rgba(9,17,31,.55))}\
 .ask .o{flex:1 1 0;min-width:0;flex-direction:column;align-items:flex-start;justify-content:flex-end;gap:10px;padding:0 clamp(16px,1.6vw,26px) 44px;overflow:hidden;isolation:isolate;min-height:0}\
 .ask .o+.o{box-shadow:inset 1px 0 0 var(--hair)}\
 .ask .o:first-child{padding-left:var(--pad)}.ask .o:first-child .k{left:var(--pad)}.ask .o:last-child{padding-right:var(--pad)}\
 .ask .o::before{left:0;right:0;top:auto;bottom:0;width:auto;height:0;z-index:-1;background:linear-gradient(0deg,rgba(32,56,100,.85),rgba(32,56,100,.15));transition:height .55s var(--e)}\
 .ask .o:hover::before,.ask .o:focus-visible::before{top:auto;bottom:0;height:100%;background:linear-gradient(0deg,rgba(32,56,100,.85),rgba(32,56,100,.15))}\
 .ask .o.on::before{top:auto;bottom:0;height:100%;background:linear-gradient(0deg,#26457A,rgba(38,69,122,.5))}\
 .ask .o .lb{font-size:clamp(22px,1.75vw,30px);transition:transform .45s var(--e)}\
 .ask .o .s{margin-left:0;padding-left:0;font-size:13.5px;white-space:normal;transition:color .3s}\
 .ask .o:hover .lb{transform:translateY(-6px)}.ask .o:hover .s{color:var(--tx)}.ask .o:active{transform:none}\
 .ask .o .k{display:block;position:absolute;top:22px;left:clamp(16px,1.6vw,26px);font-size:12px;color:var(--t3);font-weight:500;letter-spacing:.08em}\
 .ask .o .key{display:block;position:absolute;top:20px;right:18px;font-size:11px;color:var(--t3);border:1px solid var(--hair);padding:1px 6px;opacity:0;transition:opacity .3s}\
 .ask .o:hover .key{opacity:1}\
 .ask .sym{width:clamp(52px,4.2vw,68px);height:clamp(52px,4.2vw,68px);margin-bottom:auto;margin-top:58px;transition:transform .45s var(--e),color .3s}\
 .ask .o:hover .sym{transform:translateY(-6px)}\
 .ask .pp{justify-content:flex-start}\
 .ask .pp .nm{margin-top:64px;gap:10px}\
 .ask .pp .nm .lb{font-size:clamp(30px,2.6vw,42px)}\
 .ask .pp .co{font-size:15px;max-width:22em}\
 .ask .pp .cy{margin:auto 0 0;padding:0;font-size:clamp(56px,5vw,88px);font-weight:400;line-height:.9;color:rgba(242,239,232,.38);letter-spacing:-.05em;transition:color .3s}\
 .ask .pp:hover .cy,.ask .pp.on .cy{color:var(--tx)}\
 .ask .pp .cy small{font-size:18px;color:var(--t3);letter-spacing:0;margin-left:6px}\
 .ask .more{position:absolute;right:var(--pad);top:-52px;margin:0}\
 .ask .Lw{position:relative;margin-top:auto}\
 .ask .Lw .L{margin-top:0}\
 .ask .L.Lp{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));height:auto;margin-top:36px}\
 .ask .L.Lp .o{height:min(42vh,380px);padding-left:clamp(16px,1.6vw,26px);padding-right:clamp(16px,1.6vw,26px);border-bottom:1px solid var(--hair)}\
 .ask .L.Lp .o:nth-child(3n+1){padding-left:var(--pad);box-shadow:none}.ask .L.Lp .o:nth-child(3n+1) .k{left:var(--pad)}.ask .L.Lp .o:nth-child(3n){padding-right:var(--pad)}\
 .ask .Lw:has(.Lp){margin-top:0}\
}\
.ask .wr{margin-top:34px;max-width:900px}\
.ask .who{display:flex;gap:10px;margin-bottom:22px}\
.ask .who input{background:none;border:0;border-bottom:1px solid var(--hair);color:var(--tx);font:inherit;font-size:16px;padding:8px 0;outline:0;width:120px}\
.ask .who input:focus{border-bottom-color:var(--ac)}.ask .who input::placeholder{color:var(--t3)}\
.ask textarea{display:block;width:100%;min-height:118px;padding:0 0 14px;background:none;border:0;border-bottom:1px solid var(--hair);outline:0;resize:none;font-family:var(--ser);font-size:24px;font-weight:400;line-height:1.5;letter-spacing:-.025em;color:var(--tx);caret-color:var(--ac);transition:border-color .3s}\
@media (min-width:900px){.ask textarea{font-size:34px;min-height:116px}}\
.ask textarea:focus{border-bottom-color:var(--ac)}\
.ask textarea::placeholder{color:rgba(242,239,232,.3)}\
.ask .how{display:flex;gap:26px;margin-top:22px;flex-wrap:wrap}\
.ask .how button{background:none;border:0;min-height:44px;padding:8px 0;font:inherit;font-size:16px;font-weight:500;color:var(--t3);cursor:pointer;box-shadow:inset 0 -1px 0 transparent;transition:color .2s,box-shadow .3s}\
.ask .how button.on{color:var(--tx);box-shadow:inset 0 -1px 0 var(--ac)}\
.ask .ms{display:flex;flex-direction:column;gap:26px;margin-top:34px}\
@media (min-width:900px){.ask .ms{flex-direction:row;align-items:flex-end;gap:64px}}\
.ask .bub{max-width:560px;background:#F2EFE8;color:#121C2C;padding:18px 20px;border-radius:20px 20px 20px 4px;font-size:15.5px;line-height:1.72;white-space:pre-line;transform-origin:bottom left;animation:askBub .7s cubic-bezier(.34,1.3,.5,1) .3s both}\
@keyframes askBub{from{opacity:0;transform:scale(.9) translateY(10px)}}\
.ask .mine{display:flex;flex-direction:column;gap:10px;max-width:560px}\
.ask .mine label{font-size:14px;color:var(--t2);line-height:1.6}\
.ask .mine input{background:none;border:0;border-bottom:1px solid var(--hair);color:var(--tx);font:inherit;font-size:22px;letter-spacing:.02em;padding:8px 0;outline:0;width:min(320px,100%);font-variant-numeric:tabular-nums}\
.ask .mine input:focus{border-bottom-color:var(--ac)}.ask .mine input::placeholder{color:var(--t3)}\
.ask .mine .er{margin:0;font-size:13px;color:#E8A9A9;min-height:0}\
.ask .mine button{align-self:flex-start;background:none;border:0;color:var(--t2);font:inherit;font-size:14px;cursor:pointer;box-shadow:inset 0 -1px 0 var(--hair);padding:4px 0}\
.ask .ok{margin:0;font-size:17px;line-height:1.8;color:var(--t2)}\
.ask .qr{display:none;flex-direction:column;gap:12px;font-size:14px;color:var(--t2);line-height:1.6}\
.ask .qr .qc{background:#F2EFE8;padding:8px;width:max-content}.ask .qr .qc img,.ask .qr .qc svg{display:block;width:132px;height:132px}\
.ask .qr button{align-self:flex-start;background:none;border:0;color:var(--t2);font:inherit;font-size:14px;cursor:pointer;box-shadow:inset 0 -1px 0 var(--hair);padding:4px 0}\
.ask .qr button:hover{color:var(--tx)}\
@media (min-width:900px){.ask .qr{display:flex}}\
.ask .nx{position:fixed;z-index:4;left:22px;right:22px;bottom:calc(20px + env(safe-area-inset-bottom));height:56px;display:flex;align-items:center;justify-content:center;gap:10px;background:var(--tx);color:#0B1526;border:0;font-family:inherit;font-size:16px;font-weight:500;cursor:pointer;text-decoration:none;opacity:0;transform:translateY(20px);pointer-events:none;transition:opacity .4s,transform .45s var(--e)}\
.ask .nx.show{opacity:1;transform:none;pointer-events:auto}\
.ask .nx:disabled{opacity:.2 !important;cursor:default}\
@media (min-width:900px){.ask .nx{left:auto;right:var(--pad);bottom:56px;height:auto;padding:0 0 8px;background:none;color:var(--tx);font-family:var(--ser);font-size:24px;font-weight:600;box-shadow:inset 0 -1px 0 var(--ac)}.ask .nx svg{transition:transform .3s var(--e)}.ask .nx:hover svg{transform:translateX(6px)}}\
.ask .in .meta,.ask .in .q{animation:askRise .85s var(--e) both}.ask .in .q{animation-delay:.04s}\
.ask .in .L>*,.ask .in .wr,.ask .in .ms,.ask .in .empty,.ask .in .more{animation:askRise .75s var(--e) both}\
.ask .out>*{opacity:0;transform:translateY(-14px);transition:all .3s ease}\
@keyframes askRise{from{opacity:0;transform:translateY(28px)}}\
@media (min-width:900px){.ask .in .L>*{animation-name:askCol}@keyframes askCol{from{opacity:0;transform:translateY(60px)}}}\
@media (min-width:900px){\
 .ask .L.many{flex-wrap:wrap;height:auto;margin:auto 0 40px;border-top:0;background:none}\
 .ask .L.many .o{flex:0 0 calc(100% / var(--cols));max-width:calc(100% / var(--cols));height:min(22vh,200px);padding:0 22px 28px;box-shadow:inset 0 1px 0 var(--hair),inset 1px 0 0 var(--hair)}\
 .ask .L.many .o:first-child{padding-left:22px}.ask .L.many .o:first-child .k{left:22px}.ask .L.many .o:last-child{padding-right:22px}\
 .ask .L.many .sym{width:44px;height:44px;margin-top:48px}\
 .ask .L.many .o .lb{font-size:clamp(20px,1.6vw,26px)}\
}\
.ask .ttl{margin:auto;text-align:center;font-family:var(--ser);font-weight:700;font-size:clamp(48px,5.6vw,80px);letter-spacing:-.035em;line-height:1;color:var(--tx) !important;text-shadow:0 6px 28px rgba(4,8,16,.45);animation:askTtl 2s cubic-bezier(.2,.8,.2,1) both}\
@keyframes askTtl{0%{opacity:0;transform:translateY(14px)}25%,72%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-10px)}}\
@media (prefers-reduced-motion:reduce){.ask *,.ask{animation:none !important;transition:none !important}.ask .sym *{stroke-dashoffset:0}}\
";

  // 분야 상징 (64x64, 선 하나로)
  var SY = {
    '금융': '<path d="M6 56h52"/><path d="M14 14v34M10 22h8v16h-8z"/><path d="M30 8v32M26 14h8v18h-8z"/><path d="M46 18v32M42 26h8v16h-8z"/>',
    '산업': '<path d="M8 56V30l14 8v-8l14 8v-8l14 8V12h6v44z"/><path d="M8 56h48"/>',
    '공공': '<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="15"/><path d="M32 22l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z"/>',
    '아직 모르겠어요': '<path d="M32 8c1.5 15 9 22.5 24 24-15 1.5-22.5 9-24 24-1.5-15-9-22.5-24-24 15-1.5 22.5-9 24-24z"/>',
    '증권': '<path d="M6 56h52"/><path d="M14 14v34M10 22h8v16h-8z"/><path d="M30 8v32M26 14h8v18h-8z"/><path d="M46 18v32M42 26h8v16h-8z"/>',
    '은행': '<path d="M8 22L32 10l24 12z"/><path d="M13 26v22M23 26v22M32 26v22M41 26v22M51 26v22M6 54h52"/>',
    '자산운용': '<circle cx="32" cy="32" r="22"/><path d="M32 10v22h22"/><path d="M32 32L17 48"/>',
    'IB·PE·VC': '<circle cx="24" cy="32" r="15"/><circle cx="40" cy="32" r="15"/>',
    '회계법인': '<path d="M14 8h36v48H14z"/><path d="M21 18h22M21 26h22M21 34h12"/><path d="M34 45l4 4 8-9"/>',
    '금융공기업': '<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="15"/><path d="M32 22l3 7h7l-6 4 2 7-6-4-6 4 2-7-6-4h7z"/>',
    '보험': '<path d="M32 8l20 8v14c0 12-8.5 21-20 26-11.5-5-20-14-20-26V16z"/><path d="M24 32l6 6 11-12"/>',
    '카드·캐피탈': '<path d="M8 16h48v32H8z"/><path d="M8 26h48M16 40h12"/>',
    '리서치': '<path d="M10 8h28v40H10z"/><path d="M16 18h16M16 25h16M16 32h9"/><circle cx="40" cy="40" r="10"/><path d="M47 47l9 9"/>',
    'PB·WM': '<circle cx="24" cy="20" r="7"/><path d="M11 50c2-11 24-11 26 0"/><circle cx="44" cy="40" r="9"/><path d="M44 35v10M41 37.5h4.5a2.5 2.5 0 010 5H42"/>',
    'IB': '<path d="M20 56V12h24v44"/><path d="M26 20h4M34 20h4M26 28h4M34 28h4M26 36h4M34 36h4M29 56v-9h6v9M10 56h44"/>',
    '트레이딩·채권': '<path d="M20 52V12M11 21l9-9 9 9"/><path d="M44 12v40M35 43l9 9 9-9"/>',
    '법인영업': '<path d="M8 22h48v30H8z"/><path d="M24 22v-6h16v6M8 34h48"/>',
    '기업금융·IB': '<path d="M10 56V24h18v32M28 56V12h26v44M6 56h52"/><path d="M34 20h4M44 20h4M34 28h4M44 28h4M34 36h4M44 36h4"/>',
    'FX·자금시장': '<circle cx="24" cy="28" r="14"/><circle cx="40" cy="36" r="14"/>',
    '정책금융': '<path d="M8 22L32 10l24 12z"/><path d="M13 26v22M23 26v22M32 26v22M41 26v22M51 26v22M6 54h52"/>',
    '금융 인프라': '<circle cx="14" cy="32" r="5"/><circle cx="50" cy="16" r="5"/><circle cx="50" cy="48" r="5"/><path d="M19 30l26-12M19 34l26 12M50 21v22"/>',
    '감사': '<circle cx="28" cy="28" r="16"/><path d="M40 40l14 14M21 28l5 5 9-10"/>',
    '딜·M&A': '<circle cx="24" cy="32" r="15"/><circle cx="40" cy="32" r="15"/>',
    'PE': '<path d="M8 22h48v30H8z"/><path d="M24 22v-6h16v6M8 34h48"/>',
    'VC': '<path d="M32 56V30"/><path d="M32 36c-13 0-18-8-18-18 13 0 18 8 18 18z"/><path d="M32 30c0-11 6-18 18-18 0 11-6 18-18 18z"/>',
    'IB·M&A 자문': '<path d="M20 56V12h24v44"/><path d="M26 20h4M34 20h4M26 28h4M34 28h4M26 36h4M34 36h4M29 56v-9h6v9M10 56h44"/>',
    '개인·전업투자': '<path d="M8 50l14-14 10 8 22-24"/><path d="M42 20h12v12"/>',
    '주식·채권운용': '<path d="M8 50l14-14 10 8 22-24"/><path d="M42 20h12v12"/>',
    '대체투자': '<path d="M10 56V30l22-16 22 16v26z"/><path d="M26 56V40h12v16"/>',
    'ETF·연금': '<path d="M12 52V12M12 52h40"/><path d="M20 44v-8M28 44V26M36 44V32M44 44V18"/>',
    '투자자문': '<circle cx="24" cy="20" r="7"/><path d="M11 50c2-11 24-11 26 0"/><path d="M40 18h16v12H44l-4 4z"/>',
    '재무·IR': '<path d="M12 52V12M12 52h40"/><path d="M20 44v-8M28 44V26M36 44V32M44 44V18"/>',
    '창업·사업': '<path d="M32 56V30"/><path d="M32 36c-13 0-18-8-18-18 13 0 18 8 18 18z"/><path d="M32 30c0-11 6-18 18-18 0 11-6 18-18 18z"/>',
    '컨설팅·법무': '<path d="M32 10v44M14 54h36"/><path d="M12 20h40"/><path d="M12 20l-6 16h12zM52 20l-6 16h12z"/>',
    '전략·기획': '<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="12"/><circle cx="32" cy="32" r="2"/>',
    '공무원': '<path d="M8 22L32 10l24 12z"/><path d="M13 26v22M23 26v22M32 26v22M41 26v22M51 26v22M6 54h52"/>',
    '공공기관': '<path d="M10 56V20h44v36"/><path d="M18 28h6M30 28h6M42 28h4M18 38h6M30 38h6M42 38h4M28 56v-8h8v8M6 56h52"/>',
    '교육·연구': '<path d="M6 24l26-12 26 12-26 12z"/><path d="M16 29v13c0 4 7 8 16 8s16-4 16-8V29"/>'
  };
  var STAR = '<path d="M32 16c1 10 6 15 16 16-10 1-15 6-16 16-1-10-6-15-16-16 10-1 15-6 16-16z"/>';
  var SUB = { '금융': '증권, 은행, 운용, 회계', '산업': '전자, IT, 자동차, 유통', '공공': '공무원, 공공기관', '아직 모르겠어요': '여러 분야 선배님을 보여드려요' };
  var ORDER = ['금융', '산업', '공공', '증권', '은행', '자산운용', 'IB·PE·VC', '회계법인', '금융공기업', '보험', '카드·캐피탈'];
  var ARR = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16M14 6l6 6-6 6"/></svg>';
  var ANY = '상관없어요', UNSURE = '아직 모르겠어요';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function sym(k) { return '<svg class="sym" viewBox="0 0 64 64" aria-hidden="true">' + (SY[k] || STAR).replace(/<(path|circle)/g, '<$1 pathLength="1"') + '</svg>'; }
  function pad(i) { return (i < 9 ? '0' : '') + (i + 1); }
  function digits(p) { return String(p || '').replace(/\D/g, ''); }
  function coh(a) { var n = parseInt(a.cohort, 10); return isNaN(n) ? 999 : n; }

  var st = null; // 열려 있는 동안의 상태

  var FIELDS = ['f1', 'f2', 'f3'], OTHER = '그 밖의 회사', SHOW_ALL = 6, MAX_OPTS = 8;
  function groups(pool, field) { // 값별 인원 [값, 명], 정해 둔 순서가 있으면 그 순서, 없으면 많은 순
    var m = {};
    pool.forEach(function (a) { var v = a[field]; if (v) m[v] = (m[v] || 0) + 1; });
    return Object.keys(m).sort(function (x, y) { var lx = /^그 밖의/.test(x), ly = /^그 밖의/.test(y); if (lx !== ly) return lx ? 1 : -1; var a = ORDER.indexOf(x), b = ORDER.indexOf(y); if (field !== 'org' && (a >= 0 || b >= 0)) return (a < 0 ? 99 : a) - (b < 0 ? 99 : b); return m[y] - m[x] || x.localeCompare(y, 'ko'); }).map(function (k) { return [k, m[k]]; });
  }
  function match(a, step) {
    if (step.v === ANY) return true;
    if (step.v === OTHER) return a.org && step.ex.indexOf(a.org) < 0;
    return a[step.f] === step.v;
  }
  function filter() { return st.pool.filter(function (a) { return st.path.every(function (s) { return match(a, s); }); }); }
  function label(s) { return s.v === ANY ? '전체' : s.v; }

  // 지금까지 고른 길로 다음 질문을 만든다. 남은 선배님이 몇 분 안 되거나 더 좁힐 게 없으면 null
  function nextQuestion() {
    var p = st.path, last = p[p.length - 1];
    if (!p.length) return { f: 'f1', q: '어느 분야 선배님을<br>찾을까요?', opts: groups(st.pool, 'f1').concat([[UNSURE, 0]]) };
    if (p[0].v === UNSURE || last.f === 'f3' || last.v === ANY) return null;
    var sub = filter();
    if (sub.length <= SHOW_ALL) return null;
    var f1 = p[0].v, f2 = (p[1] && p[1].v !== ANY) ? p[1].v : '';
    for (var i = FIELDS.indexOf(last.f) + 1; i < FIELDS.length; i++) {
      var f = FIELDS[i], g = groups(sub, f), known = g.reduce(function (n, x) { return n + x[1]; }, 0);
      if (g.length < 2 && !(g.length === 1 && known < sub.length)) continue; // 고를 게 하나뿐이면 건너뜀
      if (f === 'f3' && known < 6) continue; // 일을 아는 분이 너무 적으면 회사로
      var q = f === 'f2'
        ? ({ '금융': '금융권 어디에서<br>찾을까요?', '산업': '어떤 업종에서<br>찾을까요?', '공공': '어디에서 일하는<br>분을 찾을까요?' }[f1] || '어디에서<br>찾을까요?')
        : (f2 ? esc(f2) + '에서 ' : '') + '어떤 일을 하는<br>분을 찾을까요?';
      return { f: f, q: q, opts: known < sub.length ? g.concat([[ANY, sub.length]]) : g };
    }
    return null;
  }
  function seniors() { // 기수가 가까운 분부터, 같은 거리면 섞어서
    var my = parseInt(st.me.cohort, 10) || 43, list;
    var shuffle = function (arr) { return arr.map(function (a) { return [Math.abs(coh(a) - my) + Math.random() * 1.5, a]; }).sort(function (x, y) { return x[0] - y[0]; }).map(function (x) { return x[1]; }); };
    if (st.path[0].v === UNSURE) { // 금융·산업·공공에서 골고루
      var by = {}; shuffle(st.pool).forEach(function (a) { (by[a.f1] = by[a.f1] || []).push(a); });
      list = []; var keys = Object.keys(by), i = 0;
      while (keys.some(function (k) { return by[k].length; })) { var k = keys[i++ % keys.length]; if (by[k].length) list.push(by[k].shift()); }
    } else list = shuffle(filter());
    return list;
  }

  function crumbs() {
    var p = st.path.map(label); if (st.pick) p.push(st.pick.name + ' 선배님');
    if (!p.length) return '';
    return '<div class="meta">' + p.map(function (x, i) { return i < st.path.length ? '<a tabindex="0" data-d="' + i + '">' + esc(x) + '</a>' : esc(x); }).join('<i>·</i>') + '</div>';
  }
  function prog(n) { st.el.querySelector('.ask-bar').style.width = n + '%'; }
  function btn(label, disabled, fn) {
    var nx = st.el.querySelector('.nx');
    if (!label) { nx.classList.remove('show'); nx.onclick = null; return; }
    nx.innerHTML = esc(label) + ARR; nx.disabled = !!disabled; nx.onclick = fn;
    requestAnimationFrame(function () { requestAnimationFrame(function () { nx.classList.add('show'); }); });
  }
  function stagger() {
    st.bx.querySelectorAll('.L>*,.wr,.ms,.empty,.more').forEach(function (e, i) {
      e.style.animationDelay = (200 + i * 70) + 'ms';
      e.querySelectorAll('.sym *').forEach(function (s) { s.style.animationDelay = (420 + i * 90) + 'ms'; });
    });
  }
  function go(fn) {
    var bx = st.bx; bx.classList.remove('in'); bx.classList.add('out');
    setTimeout(function () { if (!st) return; bx.classList.remove('out'); fn(); bx.classList.add('in'); stagger(); st.el.scrollTop = 0; var f = bx.querySelector('.o,textarea'); if (f && st.kbd) f.focus({ preventScroll: true }); }, 300);
  }
  function tap(b, fn) { if (b.parentElement.classList.contains('picked')) return; b.classList.add('on'); b.parentElement.classList.add('picked'); setTimeout(function () { go(fn); }, 460); }

  function render() {
    st.stage = 0; st.pick = null; st.el.querySelector('.bk').disabled = !st.path.length; btn();
    var n = nextQuestion();
    if (n) {
      prog(Math.min(12 + st.path.length * 18, 66));
      var many = n.opts.length > 6 ? ' many' : '';
      st.bx.innerHTML = crumbs() + '<h2 class="q">' + n.q + '</h2><div class="L' + many + '" role="list"' + (many ? ' style="--cols:' + Math.ceil(n.opts.length / 2) + '"' : '') + '>' + n.opts.map(function (o, i) {
        var k = o[0], s = !st.path.length ? (SUB[k] || '') : '';
        return '<button class="o" role="listitem" data-k="' + esc(k) + '"><span class="k">' + pad(i) + '</span>' + (i < 9 ? '<span class="key">' + (i + 1) + '</span>' : '') + (n.f === 'org' ? '' : sym(k)) + '<span class="lb">' + esc(k) + '</span>' + (s ? '<span class="s">' + esc(s) + '</span>' : '') + '</button>';
      }).join('') + '</div>';
      st.bx.querySelectorAll('.o').forEach(function (b) { b.onclick = function () { tap(b, function () { var v = b.getAttribute('data-k'); st.path.push({ f: n.f, v: v, ex: v === OTHER ? n.ex : null }); render(); }); }; });
      return;
    }
    // 선배님 안내
    prog(72);
    st.list = seniors(); st.off = 0;
    people();
  }
  function people() {
    // 넘기지 않고 전부 이어서 보여 준다 (아래로 내려서 보기). PC는 한 줄에 세 분씩 쌓인다
    var per = st.list.length, three = st.list.slice(0, per); st.off = 0;
    if (!three.length) {
      st.bx.innerHTML = crumbs() + '<h2 class="q">아직 찾을 수 있는<br>선배님이 없어요</h2><p class="empty">다른 분야를 고르거나 알럼나이 디렉토리에서 찾아보세요.</p>';
      return;
    }
    st.bx.innerHTML = crumbs() + '<h2 class="q">이 선배님들께<br>여쭤볼 수 있어요</h2><div class="Lw"><div class="L Lp" role="list">' + three.map(function (a, i) {
      var co = [a.company, a.role].filter(Boolean).join(' · ');
      return '<button class="o pp" role="listitem" data-i="' + (st.off + i) + '"><span class="key">' + (i + 1) + '</span><span class="nm"><span class="lb">' + esc(a.name) + '</span><span class="co">' + esc(co) + '</span></span><span class="cy">' + (coh(a) < 999 ? esc(a.cohort) + '<small>기</small>' : '') + '</span></button>';
    }).join('') + '</div>' + (st.list.length > per ? '<button class="more">다른 선배님 보기</button>' : '') + '</div>';
    st.bx.querySelectorAll('.o').forEach(function (b) { b.onclick = function () { tap(b, function () { st.pick = st.list[+b.getAttribute('data-i')]; if (st.sendSms) done(); else write(); }); }; });
    var m = st.bx.querySelector('.more');
    if (m) m.onclick = function () { st.off = st.off + 3 >= st.list.length ? 0 : st.off + 3; go(people); };
  }
  function write() {
    st.stage = 1; st.el.querySelector('.bk').disabled = false; prog(88);
    var needMe = !st.me.name || !st.me.cohort;
    st.bx.innerHTML = crumbs() + '<h2 class="q">어떤 게<br>궁금해요?</h2><div class="wr">' +
      (needMe ? '<div class="who"><input id="askName" placeholder="내 이름" value="' + esc(st.me.name) + '" autocomplete="name"><input id="askCoh" placeholder="기수" inputmode="numeric" value="' + esc(st.me.cohort) + '" style="width:72px"></div>' : '') +
      '<textarea id="askTx" rows="2" aria-label="여쭙고 싶은 내용" placeholder="예) 처음 맡을 섹터는 어떻게 정하셨나요?">' + esc(st.draft) + '</textarea>' +
      '<div class="how" role="radiogroup" aria-label="답을 받고 싶은 방법">' + ['짧은 문자', '10분 통화', '커피챗'].map(function (h) { return '<button role="radio" aria-checked="' + (h === st.how) + '" class="' + (h === st.how ? 'on' : '') + '">' + h + '</button>'; }).join('') + '</div></div>';
    var tx = st.bx.querySelector('#askTx'), nm = st.bx.querySelector('#askName'), ch = st.bx.querySelector('#askCoh');
    var ok = function () { return tx.value.trim().length >= 10 && (!needMe || (nm.value.trim() && /\d/.test(ch.value))); };
    btn('문자 미리 보기', true, function () {
      if (!ok()) return;
      if (needMe) { st.me = { name: nm.value.trim(), cohort: ch.value.replace(/\D/g, '') }; if (st.onSaveMe) try { st.onSaveMe(st.me.name, st.me.cohort); } catch (e) {} }
      go(done);
    });
    var chk = function () { st.el.querySelector('.nx').disabled = !ok(); };
    setTimeout(chk, 0);
    [tx, nm, ch].forEach(function (x) { if (x) x.oninput = function () { if (x === tx) st.draft = tx.value; chk(); }; });
    st.bx.querySelectorAll('.how button').forEach(function (b) { b.onclick = function () { st.how = b.textContent; st.bx.querySelectorAll('.how button').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); }; });
    setTimeout(function () { (needMe && !st.me.name ? nm : tx).focus({ preventScroll: true }); }, 600);
  }
  function message() {
    var ask = { '짧은 문자': '편하실 때 짧게 답해 주시면', '10분 통화': '편하실 때 10분 정도 통화가 가능하시다면', '커피챗': '잠깐이라도 뵐 수 있다면' }[st.how];
    return '안녕하십니까 선배님, 중앙대학교 가치투자학회 R.F.S. ' + st.me.cohort + '기 ' + st.me.name + '입니다. 학회 동문 명부를 보고 연락드립니다.\n\n' + st.draft.trim() + '\n\n' + ask + ' 큰 도움이 되겠습니다. 바쁘시면 부담 갖지 않으셔도 괜찮습니다. 감사합니다.';
  }
  function done() {
    st.stage = 2; prog(100);
    // 문자 받기가 연결돼 있으면(로그인한 학회원): 내 번호만 넣으면 선배님 연락처가 문자로 온다. 연락 문구는 학회원이 직접 쓴다
    if (st.sendSms) {
      st.el.querySelector('.bk').disabled = false;
      var saved = ''; try { saved = localStorage.getItem('rfs_my_phone') || ''; } catch (e) {}
      st.bx.innerHTML = crumbs() + '<h2 class="q">' + esc(st.pick.name) + ' 선배님 연락처를<br>문자로 보내 드릴게요</h2><div class="ms"><div class="mine"><label for="askMe">내 휴대폰 번호</label>' +
        '<input id="askMe" type="tel" inputmode="numeric" autocomplete="tel" placeholder="010-0000-0000" value="' + esc(saved) + '">' +
        '<p class="er" aria-live="polite"></p></div></div>';
      var me = st.bx.querySelector('#askMe'), er = st.bx.querySelector('.er');
      var good = function () { return /^01[016789]\d{7,8}$/.test(digits(me.value)); };
      var send = function () {
        if (!good()) return;
        btn('보내는 중', true);
        er.textContent = '';
        try { localStorage.setItem('rfs_my_phone', me.value.trim()); } catch (e) {}
        Promise.resolve(st.sendSms({ toPhone: digits(me.value), alumniName: st.pick.name, alumniCohort: String(st.pick.cohort || '') })).then(function (r) {
          if (r && r.ok) return sent();
          er.textContent = ({ limit: '오늘은 더 보낼 수 없어요. 하루 5건까지예요.', no_phone: '이 선배님은 연락처가 등록되지 않았어요.', toPhone: '휴대폰 번호를 확인해 주세요.', login: '로그인이 풀렸어요. 다시 로그인해 주세요.', not_configured: '문자 보내기를 준비하고 있어요. 문구를 복사해서 보내 주세요.' })[r && r.error] || '문자를 보내지 못했어요. 잠시 후 다시 시도하거나 문구를 복사해서 직접 보내 주세요.';
          btn('문자로 받기', !good(), send);
        });
      };
      me.oninput = function () { st.el.querySelector('.nx').disabled = !good(); };
      me.onkeydown = function (e) { if (e.key === 'Enter') send(); };
      btn('문자로 받기', !good(), send);
      setTimeout(function () { if (!good()) me.focus({ preventScroll: true }); }, 700);
      return;
    }
    var msg = message(), num = digits(st.pick.phone);
    var late = (function () { var h = new Date().getHours(); return h >= 22 || h < 8; })();
    st.bx.innerHTML = crumbs() + '<h2 class="q">이렇게<br>보낼게요</h2><div class="ms"><div class="bub">' + esc(msg) + '</div>' +
      '<div class="qr"><div class="qc" aria-label="문자 QR 코드"></div><span>휴대폰 카메라로 찍으면<br>문자 앱이 열려요</span><button type="button" class="cp">문구 복사</button></div></div>' +
      (late ? '<p class="empty" style="font-size:14px">지금은 늦은 시간이에요. 내일 오전에 보내면 어때요?</p>' : '');
    var href = 'sms:' + num + (/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) ? '&' : '?') + 'body=' + encodeURIComponent(msg);
    if (window.innerWidth < 900) btn('문자 앱 열기', !num, function () { location.href = href; }); else btn();
    var cp = st.bx.querySelector('.cp');
    cp.onclick = function () { try { navigator.clipboard.writeText(msg).then(function () { cp.textContent = '복사했어요'; }); } catch (e) {} };
    if (window.innerWidth >= 900) qr(st.bx.querySelector('.qc'), 'SMSTO:' + num + ':' + msg);
  }
  function sent() {
    st.stage = 3;
    var late = (function () { var h = new Date().getHours(); return h >= 22 || h < 8; })();
    st.bx.innerHTML = crumbs() + '<h2 class="q">문자를<br>보냈어요</h2><div class="ms"><p class="ok">' + esc(st.pick.name) + ' 선배님 연락처가 곧 도착해요.<br>' +
      (late ? '지금은 늦은 시간이니 내일 연락드려 주세요.' : '') + '</p></div>';
    btn('처음으로', false, function () { st.path = []; st.pick = null; st.draft = ''; go(render); });
    stagger();
  }
  function qr(box, text) {
    var draw = function () {
      try { var q = window.qrcode(0, 'L'); q.addData(text, 'Byte'); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); } catch (e) { box.parentNode.querySelector('span').textContent = '문구를 복사해서 휴대폰으로 보내 주세요'; box.remove(); }
    };
    if (window.qrcode) return draw();
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
    s.onload = function () { if (window.qrcode) { window.qrcode.stringToBytes = window.qrcode.stringToBytesFuncs['UTF-8']; draw(); } };
    s.onerror = function () { box.parentNode.querySelector('span').textContent = '문구를 복사해서 휴대폰으로 보내 주세요'; box.remove(); };
    document.head.appendChild(s);
  }
  function toPeople() { st.stage = 0; st.pick = null; prog(72); st.el.querySelector('.bk').disabled = !st.path.length; btn(); people(); }
  function back() {
    if (!st) return;
    if (st.stage === 3) return go(done);
    if (st.stage === 2) return go(st.sendSms ? toPeople : write);
    if (st.stage === 1) return go(toPeople);
    if (!st.path.length) return;
    st.path.pop(); go(render);
  }
  function onKey(e) {
    if (!st) return;
    if (e.key === 'Tab') st.kbd = true;
    if (e.key === 'Escape') { e.preventDefault(); return back(); }
    var t = e.target.tagName;
    if (t === 'TEXTAREA' || t === 'INPUT') { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) st.el.querySelector('.nx').click(); return; }
    var n = +e.key, os = st.bx.querySelectorAll('.L .o');
    if (n >= 1 && n <= os.length && !st.bx.querySelector('.picked')) { e.preventDefault(); os[n - 1].click(); }
  }
  function close(silent) {
    if (!st) return;
    var el = st.el, cb = st.onClose; el.classList.remove('show');
    document.removeEventListener('keydown', onKey, true);
    document.documentElement.style.overflow = st.ov;
    var ret = st.ret; st = null;
    setTimeout(function () { el.remove(); if (ret && ret.focus) ret.focus(); }, 450);
    if (cb && silent !== true) try { cb(); } catch (e) {}
  }

  function open(o) {
    if (st) return;
    if (!document.getElementById('ask-css')) { var c = document.createElement('style'); c.id = 'ask-css'; c.textContent = CSS; document.head.appendChild(c); }
    var pool = (o.alumni || []).filter(function (a) { return a && a.f1 && digits(a.phone).length >= 10 && a.company !== 'R.F.S.'; });
    var el = document.createElement('div');
    el.className = 'ask'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '선배님께 여쭙기');
    el.innerHTML = '<div class="ask-bg"></div><div class="ask-grain"></div><div class="ask-bar"></div>' +
      '<div class="ask-top"><button class="ib bk" aria-label="이전"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button><span class="sl"><img src="/assets/rfs-seal-light-256.png" alt="">AGORA</span><button class="ib cl" aria-label="닫기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<main class="ask-wrap"></main><button class="nx" type="button"></button>';
    document.body.appendChild(el);
    st = { el: el, bx: el.querySelector('.ask-wrap'), pool: pool, path: [], pick: null, stage: 0, draft: '', how: '짧은 문자', me: { name: (o.me && o.me.name) || '', cohort: String((o.me && o.me.cohort) || '').replace(/\D/g, '') }, onSaveMe: o.onSaveMe, sendSms: o.sendSms, onClose: o.onClose, ov: document.documentElement.style.overflow, ret: document.activeElement, kbd: false };
    document.documentElement.style.overflow = 'hidden';
    el.querySelector('.bk').onclick = back;
    el.querySelector('.cl').onclick = function () { close(); };
    st.bx.addEventListener('click', function (e) { var a = e.target.closest('.meta a'); if (!a) return; st.path = st.path.slice(0, +a.getAttribute('data-d')); go(render); });
    st.bx.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches('.meta a')) e.target.click(); });
    document.addEventListener('keydown', onKey, true);
    var first = function () { render(); st.bx.classList.add('in'); stagger(); };
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (o.intro && !still) { st.bx.innerHTML = '<h1 class="ttl">Agora</h1>'; setTimeout(function () { if (st && st.el === el) first(); }, 2000); }
    else first();
    requestAnimationFrame(function () { el.classList.add('show'); });
  }

  window.RFSAsk = { open: open, close: close, isOpen: function () { return !!st; } };
})();
