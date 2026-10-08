import io

# ══════════ 7막 · [주석] / 8막 · [마무리] ══════════
p = 'compositions/body.html'
s = io.open(p, encoding='utf-8').read()

CSS = '''
      /* 7막 — 차트 위 주석 */
      #bodyp .ann { position: absolute; opacity: 0; }
      #bodyp #annTxt { left: 54%; top: 6%; font-size: 7px; font-weight: 700; color: #c00000; white-space: nowrap; }
      #bodyp #annArrow { left: 46%; top: 12%; width: 16%; height: 22%; }
      #bodyp #annArrow svg { width: 100%; height: 100%; }
      #bodyp #annBox { left: 62%; top: 18%; width: 24%; height: 52%; background: rgba(192,0,0,0.10); }
      #bodyp #annCircle { left: 30%; top: 30%; width: 13%; height: 34%;
        border: 1.2px dashed #c00000; border-radius: 50%; }

      /* 8막 — 점검 형광펜 */
      #bodyp .hl { position: absolute; opacity: 0; border-radius: 1px; }
      #bodyp .hlY { background: rgba(255,235,59,0.55); }
      #bodyp .hlP { background: rgba(255,105,180,0.45); }
      #bodyp .hlT { background: rgba(64,224,208,0.45); }
      #bodyp .hlG { background: rgba(144,238,144,0.55); }
'''
s = s.replace('      /* 6막 — 자료 칸 안의 차트 */', CSS + '      /* 6막 — 자료 칸 안의 차트 */')

ANN = ('<div class="ann" id="annTxt">증설 발표 이후 기울기 전환</div>'
       '<div class="ann" id="annArrow"><svg viewBox="0 0 60 60"><defs><marker id="ah" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">'
       '<path d="M0 0 L6 3 L0 6 z" fill="#c00000"/></marker></defs>'
       '<path d="M4 52 L52 10" stroke="#c00000" stroke-width="0.75" fill="none" marker-end="url(#ah)"/></svg></div>'
       '<div class="ann" id="annBox"></div>'
       '<div class="ann" id="annCircle"></div>')
s = s.replace('<div class="chart" id="chRfs">', ANN + '<div class="chart" id="chRfs">')

HL = ('<div class="hl hlY" style="left:205.8px; top:263px; width:150px; height:13px"></div>'
      '<div class="hl hlP" style="left:205.8px; top:96px; width:22px; height:30px"></div>'
      '<div class="hl hlT" style="left:205.8px; top:292px; width:96px; height:13px"></div>'
      '<div class="hl hlG" style="left:514px; top:-500px; width:0; height:0"></div>')
s = s.replace('        <div class="abs z" id="bf">', HL + '\n        <div class="abs z" id="bf">')

ACT78 = '''
        // ── 7막 · [주석] (전역 76~90초) ──
        tl.fromTo(one("#annTxt"),    { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, 45.1);
        tl.fromTo(one("#annArrow"),  { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, 47.5);
        tl.fromTo(one("#annBox"),    { opacity: 0, scaleX: 0.5 }, { opacity: 1, scaleX: 1, duration: 0.4, ease: "power2.out" }, 49.9);
        tl.fromTo(one("#annCircle"), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2.4)" }, 52.3);

        // ── 8막 · [마무리] (전역 90~110초) ──
        // 페이지 전체가 보이도록 물러난다
        tl.to(one("#bWrap"), { y: -60, scale: 0.60, duration: 1.3, ease: "power2.inOut" }, 56.6);
        // [필드 갱신] — 번호가 한 번 깜빡이며 다시 계산된다
        tl.fromTo(q(".fcap .no"), { color: "#2f5597" },
          { color: "#c00000", duration: 0.25, yoyo: true, repeat: 1, ease: "power1.inOut", stagger: 0.06, immediateRender: false }, 59.6);
        tl.fromTo(one("#bf"), { opacity: 1 }, { opacity: 0.35, duration: 0.25, yoyo: true, repeat: 1, immediateRender: false }, 59.6);
        // [양식 점검] — 형광펜이 훑고 지나간다
        tl.fromTo(q(".hlY, .hlP, .hlT"), { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: "power1.out", stagger: 0.18, immediateRender: false }, 63.0);
        tl.to(q(".hlY, .hlP, .hlT"), { opacity: 0, duration: 0.4, ease: "power1.in", stagger: 0.1 }, 66.4);
        // [내용 점검] — 표지와 본문을 대조한다
        tl.fromTo(q(".hlT"), { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: false }, 68.6);
        tl.to(q(".hlT"), { opacity: 0, duration: 0.4 }, 71.4);
'''
s = s.replace('\n        window.__timelines["bodyp"] = tl;', ACT78 + '\n        window.__timelines["bodyp"] = tl;')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('body act7/8 ok')

# ── chrome ──
p = 'compositions/chrome.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace('        // ── 버튼 → 결과물 연결선 ──', '''        // ── 7막 · [주석] — 돋보기 ──
        focusOn(["주석"], 76.2);
        zoomGroup("주석", 76.3, 89.2);
        press("빨간 글", 78.6);
        press("화살표", 81.0);
        press("강조 상자", 83.4);
        press("점선 원", 85.8);
        focusOff(["주석"], 89.6);

        // ── 8막 · [마무리] — 돋보기 ──
        focusOn(["마무리"], 90.2);
        zoomGroup("마무리", 90.3, 109.0);
        press("필드 갱신", 93.0);
        press("양식 점검", 96.4);
        press("내용 점검", 102.0);
        press("PDF 내보내기", 105.4);
        focusOff(["마무리"], 109.4);

        // ── 버튼 → 결과물 연결선 ──''')
s = s.replace('          { t: 69.90, btn: "추정치 구분", ex: 1316, ey: 560, out: 1.10, side: "right" },',
              '          { t: 69.90, btn: "추정치 구분", ex: 1316, ey: 560, out: 1.10, side: "right" },\n'
              '          { t: 78.70, btn: "빨간 글",     ex: 1316, ey: 506, out: 1.00, side: "right" },\n'
              '          { t: 81.10, btn: "화살표",     ex: 1316, ey: 544, out: 1.00, side: "right" },\n'
              '          { t: 83.50, btn: "강조 상자",   ex: 1316, ey: 584, out: 1.00, side: "right" },\n'
              '          { t: 86.00, btn: "점선 원",     ex: 1316, ey: 620, out: 1.00, side: "right" },')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('chrome act7/8 ok')

# ── index ──
p = 'index.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace('data-start="0" data-duration="76" data-width="1920"', 'data-start="0" data-duration="110" data-width="1920"')
s = s.replace('data-composition-id="chrome" data-start="0" data-duration="76"', 'data-composition-id="chrome" data-start="0" data-duration="110"')
s = s.replace('data-composition-id="bodyp" data-start="33.6" data-duration="42.4"', 'data-composition-id="bodyp" data-start="33.6" data-duration="76.4"')
s = s.replace('''    </div>

    <script>''', '''      <div class="cap capL clip" id="cap11" data-start="78.2" data-duration="9.4" data-track-index="2">
        <span><span class="lead">STEP 06</span>[주석]<span class="sub">빨간 글 · 화살표 · 강조 상자 · 점선 원</span></span>
      </div>
      <div class="cap capL clip" id="cap12" data-start="92.6" data-duration="8.4" data-track-index="2">
        <span><span class="lead">STEP 07</span>[마무리]<span class="sub">필드 갱신 → 양식 점검 → 내용 점검 → PDF</span></span>
      </div>
      <div class="cap capL clip" id="cap13" data-start="101.6" data-duration="7.6" data-track-index="2">
        <span><span class="lead">STEP 07</span>점검이 먼저 읽습니다<span class="sub">스타일 없는 문단 · 번호 없는 대제목 · 허용 외 글꼴</span></span>
      </div>
    </div>

    <script>''')
s = s.replace('      #cap9, #cap10 { left: 140px; width: 430px; top: 560px; }',
              '      #cap9, #cap10 { left: 140px; width: 430px; top: 560px; }\n      #cap11, #cap12, #cap13 { left: 140px; width: 430px; top: 560px; }')
s = s.replace('      window.__timelines["main"] = tl;', '''      tl.fromTo("#cap11", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 78.4);
      tl.to("#cap11", { opacity: 0, duration: 0.45, ease: "power1.in" }, 87.0);
      tl.fromTo("#cap12", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 92.8);
      tl.to("#cap12", { opacity: 0, duration: 0.45, ease: "power1.in" }, 100.4);
      tl.fromTo("#cap13", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 101.8);
      tl.to("#cap13", { opacity: 0, duration: 0.5, ease: "power1.in" }, 108.6);

      window.__timelines["main"] = tl;''')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('index act7/8 ok')
