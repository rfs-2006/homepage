import io, re

# ═══════════════ 전방위 개선 ═══════════════

# ── A. cover: 3막 마지막에 표지 전체로 빠져나온다 (멈춰 있던 6초 해소) ──
p = 'compositions/cover.html'; s = io.open(p, encoding='utf-8').read()
s = s.replace('        window.__timelines["cover"] = tl;',
'''        // 값이 다 채워지면 완성된 표지 전체를 보여준다
        tl.to(one("#pagesWrap"), { scale: 1, x: 0, y: 0, duration: 1.0, ease: "power2.inOut" }, 16.6);

        window.__timelines["cover"] = tl;''')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('cover ok')

# ── B. body ──
p = 'compositions/body.html'; s = io.open(p, encoding='utf-8').read()
s = s.replace('@font-face { font-family: "KPW"; src: url("assets/fonts/KoPubWorld Dotum Bold.ttf") format("truetype"); font-weight: 700; font-display: block; }',
              '@font-face { font-family: "KPW"; src: url("assets/fonts/KoPubWorld Dotum Bold.ttf") format("truetype"); font-weight: 700; font-display: block; }\n'
              '      @font-face { font-family: "YoonGo"; src: url("assets/fonts/YoonGothic540.ttf") format("truetype"); font-weight: 500; font-display: block; }')
s = s.replace('#bWrap { position: absolute; left: 600px; top: 520px; width: 720px; height: 1200px; transform-origin: center top; }',
              '#bWrap { position: absolute; left: 600px; top: 520px; width: 720px; height: 1200px; transform-origin: center top; opacity: 0; }')
# 구간 음영 → 오른쪽 끝 좁은 띠 (점선 원과 겹치지 않게)
s = s.replace('#annBand { left: 7%; top: 6%; width: 11%; height: 84%;', '#annBand { left: 87%; top: 6%; width: 9%; height: 84%;')
# 글꼴 막 — 눈에 보이게: 대제목 굵기가 바뀌고, 자료 캡션이 윤고딕으로
OLD = '''        tl.fromTo(one("#sum"), { fontWeight: 300 }, { fontWeight: 700, duration: 0.25, immediateRender: false }, 71.8);
        tl.fromTo(one("#sum"), { fontWeight: 700 }, { fontWeight: 500, duration: 0.25, immediateRender: false }, 73.2);
        tl.fromTo(one("#sum"), { fontWeight: 500 }, { fontWeight: 300, duration: 0.25, immediateRender: false }, 74.6);
        tl.fromTo(q(".src"), { color: "#1a1a1a" }, { color: "#555", duration: 0.25, immediateRender: false }, 76.0);'''
NEW = '''        tl.fromTo(one("#h1"), { fontWeight: 500 }, { fontWeight: 700, duration: 0.2, immediateRender: false }, 71.8);
        tl.fromTo(one("#h1"), { fontWeight: 700 }, { fontWeight: 500, duration: 0.2, immediateRender: false }, 73.2);
        tl.fromTo(one("#h1"), { fontWeight: 500 }, { fontWeight: 300, duration: 0.2, immediateRender: false }, 74.6);
        tl.to(one("#h1"), { fontWeight: 500, duration: 0.2 }, 75.5);
        tl.fromTo(q(".fcap"), { fontFamily: '"KPW", sans-serif' }, { fontFamily: '"YoonGo", "KPW", sans-serif', duration: 0.01, immediateRender: false }, 76.0);
        tl.fromTo(q(".fcap"), { color: "#1a1a1a" }, { color: "#2f5597", duration: 0.3, yoyo: true, repeat: 1, immediateRender: false }, 76.0);'''
assert OLD in s; s = s.replace(OLD, NEW)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('body ok')

# ── C. chrome ──
p = 'compositions/chrome.html'; s = io.open(p, encoding='utf-8').read()

# C-1 커서 + 빛 훑기 CSS/엘리먼트
s = s.replace('      #chrome #conn { position: absolute;',
'''      #chrome #cursor { position: absolute; left: 0; top: 0; width: 26px; height: 30px; opacity: 0; pointer-events: none;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.55)); }
      #chrome #sweep { position: absolute; left: 0; top: 206px; width: 260px; height: 196px; opacity: 0; pointer-events: none;
        background: linear-gradient(100deg, rgba(247,246,243,0) 0%, rgba(247,246,243,0.16) 50%, rgba(247,246,243,0) 100%); }

      #chrome #conn { position: absolute;''')
s = s.replace('    <svg id="conn" viewBox="0 0 1920 1080"></svg>',
'''    <svg id="conn" viewBox="0 0 1920 1080"></svg>
    <div id="sweep"></div>
    <svg id="cursor" viewBox="0 0 26 30"><path d="M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26.2 L12 17 L20 17 Z" fill="#f7f6f3" stroke="#0f1b2e" stroke-width="1.6" stroke-linejoin="round"/></svg>''')

# C-2 오프닝 — 워드마크가 인장 아래 가운데에 먼저 서고, 같이 좌상단으로 간다. 판은 아래에서 올라오고 빛이 한 번 훑는다.
OLD = '''        tl.fromTo(one("#mark"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 2.5);'''
NEW = '''        // 워드마크: 인장 아래 가운데 → 인장과 함께 좌상단으로
        tl.fromTo(one("#mark"), { opacity: 0, x: 560, y: 640 }, { opacity: 1, x: 560, y: 616, duration: 0.6, ease: "power2.out" }, 1.0);
        tl.to(one("#mark"), { x: 0, y: 0, duration: 1.0, ease: "power3.inOut" }, 1.6);'''
assert OLD in s; s = s.replace(OLD, NEW)
OLD = '''        tl.fromTo(q(".group"), { scaleX: 0, opacity: 0.6 },
          { scaleX: 1, opacity: 1, duration: 0.58, ease: "power3.out", stagger: { each: 0.07, from: "center" } }, 2.3);'''
NEW = '''        // 남색 판 10장이 가운데부터 아래에서 올라와 자리를 잡는다
        tl.fromTo(q(".group"), { y: 34, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.62, ease: "power3.out", stagger: { each: 0.06, from: "center" } }, 2.3);
        // 조립이 끝나면 빛이 왼쪽에서 오른쪽으로 한 번 훑는다
        tl.fromTo(one("#sweep"), { x: -280, opacity: 0 }, { x: 1940, opacity: 1, duration: 1.05, ease: "power1.inOut", immediateRender: false }, 3.5);
        tl.to(one("#sweep"), { opacity: 0, duration: 0.2 }, 4.45);'''
assert OLD in s; s = s.replace(OLD, NEW)

# C-3 돋보기 배율을 그룹 폭에 맞춰 적응 + 커서 + 전환 타이밍
OLD = '''        const PX = 140, PY = 768, PS = 1.55;'''
NEW = '''        const PX = 140, PY = 768;
        // 좁은 그룹은 크게, 넓은 그룹은 화면에 맞게 — 패널 폭 300~440px 목표
        function panelScale(w) { return Math.max(1.55, Math.min(2.2, 300 / w, 440 / w)); }'''
assert OLD in s; s = s.replace(OLD, NEW)
OLD = '''          const panel = el.closest(".zpanel");
          if (panel) {
            const r = layoutBox(el, panel);
            return { x: PX + r.x * PS, y: PY + r.y * PS, w: r.w * PS, h: r.h * PS };
          }'''
NEW = '''          const panel = el.closest(".zpanel");
          if (panel) {
            const ps = parseFloat(panel.dataset.ps || "1.55");
            const r = layoutBox(el, panel);
            return { x: PX + r.x * ps, y: PY + r.y * ps, w: r.w * ps, h: r.h * ps };
          }'''
assert OLD in s; s = s.replace(OLD, NEW)
OLD = '''          const g = G(name);
          const gm = GEOM[name];
          const panel = document.createElement("div");
          panel.className = "zpanel";'''
NEW = '''          const g = G(name);
          const gm = GEOM[name];
          const PS = panelScale(gm.w);
          const panel = document.createElement("div");
          panel.className = "zpanel";
          panel.dataset.ps = PS;'''
assert OLD in s; s = s.replace(OLD, NEW)

# 커서: 누르기 전에 버튼으로 미끄러져 가고, 누를 때 살짝 눌린다
OLD = '''        function press(label, t, hold) {
          hold = hold || 0.85;
          const b = B(label);
          if (!b) return;
          const rg = b.querySelector(".ring");'''
NEW = '''        const cursor = one("#cursor");
        function press(label, t, hold) {
          hold = hold || 0.85;
          const b = B(label);
          if (!b) return;
          const rg = b.querySelector(".ring");
          // 커서가 버튼으로 간다 (좌표는 재생 시점에 계산 — 글꼴 로딩 뒤 폭에 맞음)
          tl.to(cursor, { opacity: 1, duration: 0.18 }, t - 0.55);
          tl.to(cursor, { x: function () { const bb = btnBox(b); return bb.x + bb.w * 0.56; },
                          y: function () { const bb = btnBox(b); return bb.y + bb.h * 0.62; },
                          duration: 0.5, ease: "power2.inOut" }, t - 0.55);
          tl.to(cursor, { scale: 0.82, duration: 0.09, yoyo: true, repeat: 1, ease: "power2.inOut" }, t);'''
assert OLD in s; s = s.replace(OLD, NEW)
# 그룹 집중이 풀릴 때 커서도 사라진다
OLD = '''        function focusOff(names, t) {
          names.forEach(function (n) {'''
NEW = '''        function focusOff(names, t) {
          tl.to(cursor, { opacity: 0, duration: 0.3 }, t);
          names.forEach(function (n) {'''
assert OLD in s; s = s.replace(OLD, NEW)

# C-4 막 사이 공백 제거 — 돋보기·집중을 다음 막 직전까지 유지
for x, y in [
    ('zoomGroup("제목", 27.1, 35.2);', 'zoomGroup("제목", 27.1, 35.5);'),
    ('zoomGroup("문단", 36.1, 45.4);', 'zoomGroup("문단", 36.1, 46.5);'), ('focusOff(["문단"], 45.8);', 'focusOff(["문단"], 46.8);'),
    ('zoomGroup("자료 틀", 47.1, 54.4);', 'zoomGroup("자료 틀", 47.1, 55.5);'), ('focusOff(["자료 틀"], 54.8);', 'focusOff(["자료 틀"], 55.8);'),
    ('zoomGroup("강조", 56.1, 62.4);', 'zoomGroup("강조", 56.1, 63.5);'), ('focusOff(["강조"], 62.8);', 'focusOff(["강조"], 63.8);'),
    ('zoomGroup("차트·표", 64.1, 72.6);', 'zoomGroup("차트·표", 64.1, 74.5);'), ('focusOff(["차트·표"], 73.0);', 'focusOff(["차트·표"], 74.8);'),
    ('zoomGroup("주석", 75.1, 87.2);', 'zoomGroup("주석", 75.1, 88.5);'), ('focusOff(["주석"], 88.6);', 'focusOff(["주석"], 88.8);'),
    ('zoomGroup("데이터", 89.1, 96.0);', 'zoomGroup("데이터", 89.1, 96.5);'), ('focusOff(["데이터"], 96.4);', 'focusOff(["데이터"], 96.8);'),
    ('zoomGroup("글꼴", 97.1, 104.2);', 'zoomGroup("글꼴", 97.1, 104.5);'), ('focusOff(["글꼴"], 104.6);', 'focusOff(["글꼴"], 104.8);'),
    ('zoomGroup("마무리", 107.7, 126.2);', 'zoomGroup("마무리", 107.7, 128.3);'), ('focusOff(["마무리"], 126.6);', 'focusOff(["마무리"], 128.6);'),
    ('zoomGroup("설정", 128.9, 134.0);', 'zoomGroup("설정", 128.9, 133.6);'), ('focusOff(["설정"], 134.4);', 'focusOff(["설정"], 133.9);'),
    ('duration: 1.1, ease: "power2.inOut" }, 135.4);', 'duration: 1.1, ease: "power2.inOut" }, 134.4);'),
    ('duration: 0.8, ease: "power2.inOut" }, 135.4);', 'duration: 0.8, ease: "power2.inOut" }, 134.4);'),
    ('duration: 1.4, ease: "power3.inOut" }, 135.6);', 'duration: 1.4, ease: "power3.inOut" }, 134.6);'),
]:
    assert x in s, x
    s = s.replace(x, y)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('chrome ok')

# ── D. index ──
p = 'index.html'; s = io.open(p, encoding='utf-8').read()
s = s.replace('#sceneChrome { z-index: 3; }', '#sceneChrome { z-index: 4; }\n      #topfade { position: absolute; left: 0; right: 0; top: 402px; height: 56px; z-index: 3; pointer-events: none;\n        background: linear-gradient(180deg, #0f1b2e 0%, rgba(15,27,46,0) 100%); }')
s = s.replace('.cap { z-index: 4; }', '.cap { z-index: 5; }')
s = s.replace('opacity: 0; z-index: 4; }\n      #pdfName .box', 'opacity: 0; z-index: 5; }\n      #pdfName .box')
s = s.replace('#pdfName { position: absolute; left: 130px; width: 620px; top: 640px;', '#pdfName { position: absolute; left: 130px; width: 620px; top: 556px;')
s = s.replace('.end { position: absolute; left: 0; right: 0; text-align: center; opacity: 0; color: #f7f6f3; z-index: 4; }',
              '.end { position: absolute; left: 0; right: 0; text-align: center; opacity: 0; color: #f7f6f3; z-index: 5; }')
s = s.replace('      <div class="vignette"></div>\n', '      <div class="vignette"></div>\n      <div id="topfade"></div>\n')
s = s.replace('data-start="0" data-duration="144" data-width="1920"', 'data-start="0" data-duration="142" data-width="1920"')
s = s.replace('data-composition-id="chrome" data-start="0" data-duration="144"', 'data-composition-id="chrome" data-start="0" data-duration="142"')
s = s.replace('data-composition-id="bodyp" data-start="26.8" data-duration="117.2"', 'data-composition-id="bodyp" data-start="26.8" data-duration="115.2"')
# 자막을 다음 막 직전까지 유지 (공백 제거)
for x, y in [
    ('id="c3" data-start="19.6" data-duration="6.4"', 'id="c3" data-start="19.6" data-duration="7.8"'),
    ('id="c4" data-start="28.2" data-duration="7.0"', 'id="c4" data-start="28.2" data-duration="9.0"'),
    ('id="c5" data-start="37.2" data-duration="8.2"', 'id="c5" data-start="37.2" data-duration="10.8"'),
    ('id="c6" data-start="48.2" data-duration="6.2"', 'id="c6" data-start="48.2" data-duration="8.8"'),
    ('id="c7" data-start="57.2" data-duration="5.4"', 'id="c7" data-start="57.2" data-duration="8.8"'),
    ('id="c8" data-start="66.2" data-duration="6.6"', 'id="c8" data-start="66.2" data-duration="10.0"'),
    ('id="c9b" data-start="85.4" data-duration="3.2"', 'id="c9b" data-start="85.4" data-duration="4.6"'),
    ('id="c10" data-start="90.2" data-duration="6.0"', 'id="c10" data-start="90.2" data-duration="7.8"'),
    ('id="c11" data-start="98.2" data-duration="6.2"', 'id="c11" data-start="98.2" data-duration="7.2"'),
    ('id="c12a" data-start="105.6" data-duration="8.4"', 'id="c12a" data-start="105.6" data-duration="9.4"'),
    ('id="c12b" data-start="115.2" data-duration="6.6"', 'id="c12b" data-start="115.2" data-duration="7.4"'),
    ('id="pdfName" class="clip" data-start="122.6" data-duration="5.8"', 'id="pdfName" class="clip" data-start="122.6" data-duration="7.0"'),
    ('id="c13" data-start="129.8" data-duration="4.8"', 'id="c13" data-start="129.8" data-duration="4.6"'),
    ('id="endMsg"  data-start="137.0" data-duration="7.0"', 'id="endMsg"  data-start="136.0" data-duration="6.0"'),
    ('id="endWho"  data-start="137.6" data-duration="6.4"', 'id="endWho"  data-start="136.6" data-duration="5.4"'),
    ('id="endSite" data-start="138.0" data-duration="6.0"', 'id="endSite" data-start="137.0" data-duration="5.0"'),
    ('cap("#c3", 19.8, 25.4);', 'cap("#c3", 19.8, 26.9);'),
    ('cap("#c4", 28.4, 34.6);', 'cap("#c4", 28.4, 36.7);'),
    ('cap("#c5", 37.4, 44.8);', 'cap("#c5", 37.4, 47.5);'),
    ('cap("#c6", 48.4, 53.8);', 'cap("#c6", 48.4, 56.5);'),
    ('cap("#c7", 57.4, 62.0);', 'cap("#c7", 57.4, 65.5);'),
    ('cap("#c8", 66.4, 72.2);', 'cap("#c8", 66.4, 75.7);'),
    ('cap("#c9b", 85.6, 88.0);', 'cap("#c9b", 85.6, 89.5);'),
    ('cap("#c10", 90.4, 95.6);', 'cap("#c10", 90.4, 97.5);'),
    ('cap("#c11", 98.4, 103.8);', 'cap("#c11", 98.4, 104.9);'),
    ('cap("#c12a", 105.8, 113.4);', 'cap("#c12a", 105.8, 114.5);'),
    ('cap("#c12b", 115.4, 121.2);', 'cap("#c12b", 115.4, 122.1);'),
    ('tl.to("#pdfName", { opacity: 0, duration: 0.5, ease: "power1.in" }, 127.6);', 'tl.to("#pdfName", { opacity: 0, duration: 0.5, ease: "power1.in" }, 129.1);'),
    ('cap("#c13", 130.0, 134.0);', 'cap("#c13", 130.0, 133.9);'),
    ('}, 137.2);', '}, 136.2);'), ('}, 137.8);', '}, 136.8);'), ('}, 138.2);', '}, 137.2);'),
]:
    assert x in s, x
    s = s.replace(x, y)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('index ok')
