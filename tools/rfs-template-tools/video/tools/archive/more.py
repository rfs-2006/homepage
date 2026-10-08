import io

# ══════════ [주석 > 더보기] 메뉴 안 4개를 7막에 추가 ══════════

# ── chrome: 드롭다운 메뉴 ──
p = 'compositions/chrome.html'
s = io.open(p, encoding='utf-8').read()

CSS = '''      #chrome .zmenu { position: absolute; transform-origin: top left; opacity: 0;
        background: #1b3054; border: 1px solid rgba(143,170,220,0.5); border-radius: 6px;
        padding: 8px 0; filter: drop-shadow(0 16px 36px rgba(0,0,0,0.6)); }
      #chrome .zmenu .mi { display: flex; align-items: center; gap: 12px; padding: 9px 18px; white-space: nowrap; }
      #chrome .zmenu .mi img { width: 26px; height: 26px; display: block; }
      #chrome .zmenu .mi span { font-size: 21px; font-weight: 400; color: rgba(247,246,243,0.95); }
      #chrome .zmenu .mi .mring { position: absolute; left: 6px; right: 6px; height: 40px; margin-top: -7px;
        border: 2px solid #8faadc; border-radius: 5px; opacity: 0; pointer-events: none; }
'''
s = s.replace('      #chrome #conn { position: absolute;', CSS + '      #chrome #conn { position: absolute;')

FN = '''
        // 돋보기 안의 메뉴 버튼을 눌러 드롭다운을 펼친다
        const MOREITEMS = [
          { icon: "ShapesInsertGallery", label: "점선 화살표" },
          { icon: "ShapesInsertGallery", label: "이벤트 선" },
          { icon: "ShadingColorPicker",  label: "구간 음영" },
          { icon: "TextBoxInsert",       label: "남색 메모" },
        ];
        function dropdown(hostLabel, tOpen, tClose) {
          const host = B(hostLabel);
          if (!host) return;
          const hb = btnBox(host);
          const menu = document.createElement("div");
          menu.className = "zmenu";
          menu.style.left = (hb.x - 10) + "px";
          menu.style.top = (hb.y + hb.h + 6) + "px";
          MOREITEMS.forEach(function (it) {
            const row = document.createElement("div");
            row.className = "mi";
            row.dataset.mi = it.label;
            const im = document.createElement("img"); im.src = "assets/icons/" + it.icon + ".png"; im.alt = "";
            const sp = document.createElement("span"); sp.className = "z"; sp.textContent = it.label;
            const rg = document.createElement("div"); rg.className = "mring";
            row.appendChild(im); row.appendChild(sp); row.appendChild(rg);
            menu.appendChild(row);
          });
          root.appendChild(menu);
          tl.fromTo(menu, { opacity: 0, y: -12, scaleY: 0.85 },
            { opacity: 1, y: 0, scaleY: 1, duration: 0.35, ease: "power3.out", immediateRender: false }, tOpen);
          tl.to(menu, { opacity: 0, y: -10, duration: 0.35, ease: "power2.in" }, tClose);
          // 항목이 하나씩 짚어진다
          MOREITEMS.forEach(function (it, i) {
            const rg = menu.querySelector('[data-mi="' + it.label + '"] .mring');
            const t = tOpen + 0.55 + i * 0.44;
            tl.fromTo(rg, { opacity: 0 }, { opacity: 1, duration: 0.18, immediateRender: false }, t);
            tl.to(rg, { opacity: 0, duration: 0.3 }, t + 0.36);
          });
        }
'''
s = s.replace('        // ── 3막 · [데이터 > 주가 차트] ──', FN + '\n        // ── 3막 · [데이터 > 주가 차트] ──')

# 7막 재구성 — 더보기까지 포함
OLD7 = '''        focusOn(["주석"], 76.2);
        zoomGroup("주석", 76.3, 89.2);
        press("빨간 글", 78.6);
        press("화살표", 81.0);
        press("강조 상자", 83.4);
        press("점선 원", 85.8);
        focusOff(["주석"], 89.6);'''
NEW7 = '''        focusOn(["주석"], 76.2);
        zoomGroup("주석", 76.3, 89.4);
        press("빨간 글", 78.4);
        press("화살표", 80.4);
        press("강조 상자", 82.4);
        press("점선 원", 84.4);
        press("더보기", 86.3, 2.6);
        dropdown("더보기", 86.5, 89.0);
        focusOff(["주석"], 89.8);'''
assert OLD7 in s
s = s.replace(OLD7, NEW7)

s = s.replace('          { t: 86.00, btn: "점선 원",     ex: 1316, ey: 620, out: 1.00, side: "right" },',
              '          { t: 84.50, btn: "점선 원",     ex: 1316, ey: 620, out: 1.00, side: "right" },')
s = s.replace('          { t: 83.50, btn: "강조 상자",   ex: 1316, ey: 584, out: 1.00, side: "right" },',
              '          { t: 82.50, btn: "강조 상자",   ex: 1316, ey: 584, out: 1.00, side: "right" },')
s = s.replace('          { t: 81.10, btn: "화살표",     ex: 1316, ey: 544, out: 1.00, side: "right" },',
              '          { t: 80.50, btn: "화살표",     ex: 1316, ey: 544, out: 1.00, side: "right" },')
s = s.replace('          { t: 78.70, btn: "빨간 글",     ex: 1316, ey: 506, out: 1.00, side: "right" },',
              '          { t: 78.50, btn: "빨간 글",     ex: 1316, ey: 506, out: 1.00, side: "right" },')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('chrome 더보기 ok')

# ── body: 주석 타이밍 + 구간 음영 ──
p = 'compositions/body.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace('}, 45.1);', '}, 44.9);').replace('}, 47.5);', '}, 46.9);')
s = s.replace('}, 49.9);', '}, 48.9);').replace('}, 52.3);', '}, 50.9);')
s = s.replace('<div class="ann" id="annCircle"></div>',
              '<div class="ann" id="annCircle"></div>'
              '<div class="ann" id="annBand"></div>')
s = s.replace('      #bodyp #annCircle {',
              '      #bodyp #annBand { left: 18%; top: 4%; width: 9%; height: 88%; background: rgba(47,85,151,0.16);\n'
              '        border-left: 1px dashed #2f5597; border-right: 1px dashed #2f5597; }\n'
              '      #bodyp #annCircle {')
s = s.replace('\n        // ── 8막 · [마무리]',
              '\n        // [주석 > 더보기 > 구간 음영]\n'
              '        tl.fromTo(one("#annBand"), { opacity: 0, scaleY: 0.6 },\n'
              '          { opacity: 1, scaleY: 1, duration: 0.45, ease: "power2.out" }, 54.8);\n'
              '\n        // ── 8막 · [마무리]')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('body 구간 음영 ok')

# ── index: 자막 보강 ──
p = 'index.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace('<span class="sub">빨간 글 · 화살표 · 강조 상자 · 점선 원</span>',
              '<span class="sub">빨간 글 · 화살표 · 강조 상자 · 점선 원<br/>더보기 안에 점선 화살표 · 이벤트 선 · 구간 음영 · 남색 메모</span>')
s = s.replace('<br/>', '</span><span class="ln2">')
s = s.replace('      .capL .sub { display: block;',
              '      .capL .ln2 { display: block; }\n      .capL .sub { display: block;')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('index 자막 ok')
