import io
p='compositions/chrome.html'; s=io.open(p,encoding='utf-8').read()
R=[
('      @font-face { font-family: "SourceSerif4"; src: url("assets/fonts/SourceSerif4-SemiBold.woff2") format("woff2"); font-weight: 600; font-display: block; }',
 '      @font-face { font-family: "SourceSerif4"; src: url("assets/fonts/SourceSerif4-SemiBold.woff2") format("woff2"); font-weight: 600; font-display: block; }\n'
 '      @font-face { font-family: "SourceSerif4"; src: url("assets/fonts/SourceSerif4-latin-300-normal.woff2") format("woff2"); font-weight: 300; font-display: block; }\n'
 '      @font-face { font-family: "SourceSerif4"; src: url("assets/fonts/SourceSerif4-latin-400-italic.woff2") format("woff2"); font-weight: 400; font-style: italic; font-display: block; }'),
('#chrome #markName { font-family: "SourceSerif4", serif; font-weight: 600; font-size: 38px; color: #f7f6f3; letter-spacing: 0.06em; line-height: 1; }',
 '#chrome #markName { font-family: "SourceSerif4", serif; font-weight: 300; font-size: 40px; color: #f7f6f3; letter-spacing: 0.16em; line-height: 1; }'),
('#chrome #markSub { margin-top: 10px; font-weight: 500; font-size: 14px; color: #8faadc; letter-spacing: 0.34em; text-transform: uppercase; }',
 '#chrome #markSub { margin-top: 12px; font-weight: 400; font-size: 12px; color: #8faadc; letter-spacing: 0.46em; text-transform: uppercase; }\n'
 '      #chrome #credit { position: absolute; left: 0; right: 0; top: 648px; text-align: center; opacity: 0; }\n'
 '      #chrome #credit .by { font-family: "SourceSerif4", serif; font-style: italic; font-weight: 400; font-size: 19px; color: #8faadc; letter-spacing: 0.04em; }\n'
 '      #chrome #credit .who { margin-top: 14px; display: flex; justify-content: center; align-items: baseline; gap: 18px; }\n'
 '      #chrome #credit .role { font-size: 15px; font-weight: 400; color: rgba(247,246,243,0.72); letter-spacing: 0.28em; }\n'
 '      #chrome #credit .nm { font-size: 24px; font-weight: 500; color: #f7f6f3; letter-spacing: 0.34em; }'),
('    <div data-hf-id="hf-022f" id="introRule"></div>',
 '    <div data-hf-id="hf-022f" id="introRule"></div>\n'
 '    <div id="credit"><div class="by z">Presented by</div><div class="who"><span class="role z">R.F.S. 43대 회장</span><span class="nm z">김민석</span></div></div>'),
]
for a,b in R:
    assert a in s,a; s=s.replace(a,b)
a=s.index('        tl.to(one("#introRule"), { opacity: 0, duration: 0.9 }, 2.9);')
b=s.index('        // 7) 2막으로')
s=s[:a]+'''        // 4) 로크업 아래로 만든 사람 — 선은 남겨 둔다
        tl.to(one("#introRule"), { opacity: 0.45, duration: 0.8 }, 2.9);
        tl.fromTo(one("#credit"), { opacity: 0 }, { opacity: 1, duration: 0.01 }, 3.3);
        tl.fromTo(one("#credit .by"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 3.3);
        tl.fromTo(one("#credit .role"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 3.6);
        tl.fromTo(one("#credit .nm"), { opacity: 0, letterSpacing: "0.6em" }, { opacity: 1, letterSpacing: "0.34em", duration: 1.1, ease: "power3.out" }, 3.75);
        tl.to([one("#credit"), one("#introRule"), one("#ring")], { opacity: 0, duration: 0.5, ease: "power1.in" }, 4.95);
        // 5) 로크업째 좌상단으로
        tl.to(one("#sealWrap"), { x: -788, y: -424, scale: 0.2133, duration: 1.35, ease: "power3.inOut" }, 5.3);
        tl.to(one("#mark"), { x: 0, y: 0, scale: 1, duration: 1.35, ease: "power3.inOut" }, 5.3);
        // 6) 리본 — 선이 먼저 그어지고, 판이 가운데부터 올라온다
        tl.fromTo(one("#hairline"), { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: "power2.inOut" }, 6.0);
        tl.fromTo(q(".group"), { y: 34, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.75, ease: "power3.out", stagger: { each: 0.075, from: "center" } }, 6.3);
        tl.fromTo(q(".gbody"), { opacity: 0 }, { opacity: 0.55, duration: 0.4, ease: "power1.out", stagger: { each: 0.075, from: "center" } }, 6.8);
        tl.fromTo(q(".g-label"), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out", stagger: { each: 0.075, from: "center" } }, 6.8);
        tl.fromTo(q(".tab"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.05 }, 7.2);
        tl.fromTo(one("#sweep"), { x: -280, opacity: 0 }, { x: 1940, opacity: 1, duration: 1.2, ease: "power1.inOut", immediateRender: false }, 7.6);
        tl.to(one("#sweep"), { opacity: 0, duration: 0.25 }, 8.65);
        // 7) 그룹이 왼쪽부터 차례로 켜진다
        tl.fromTo(q(".gbody"), { opacity: 0.55 },
          { opacity: 1, duration: 0.45, ease: "power1.out", stagger: { each: 0.2 }, immediateRender: false }, 8.1);
        tl.fromTo(q(".sbtn span, .lbtn span"), { color: "rgba(247,246,243,0.62)" },
          { color: "rgba(247,246,243,0.92)", duration: 0.45, ease: "power1.out", stagger: { each: 0.025 }, immediateRender: false }, 8.16);
'''+s[b:]
io.open(p,'w',encoding='utf-8',newline='\n').write(s)

p='index.html'; s=io.open(p,encoding='utf-8').read()
o='R.F.S. 43rd · 김민석'; assert o in s; s=s.replace(o,'R.F.S. 43대 회장 · 김민석')
io.open(p,'w',encoding='utf-8',newline='\n').write(s)

p='tools/events.py'; s=io.open(p,encoding='utf-8').read()
a=s.index('ev(3.9, "whoosh", gain=0.7)'); b=s.index('ev(10.6, "cam", dur=0.9, gain=0.6)')
s=s[:a]+'''ev(3.3, "shimmer", dur=1.4, gain=0.35)          # 크레딧
ev(3.75, "pop", pitch=0, gain=0.35)
ev(5.3, "whoosh", gain=0.7)                     # 로크업이 모서리로
ev(6.0, "draw", dur=1.0, gain=0.5)              # 헤어라인
ev(6.3, "whoosh", gain=0.55)                    # 판이 올라온다
for i in range(8): ev(6.4 + i * 0.075, "softclick", gain=0.25, pan=round(-0.6 + i * 0.17, 2))
ev(7.6, "shimmer", dur=1.2, gain=0.6)           # 스윕
for i in range(12): ev(8.1 + i * 0.2, "pop", pitch=[0, 2, 4, 7, 9, 12][i % 6], gain=0.18, pan=round(-0.7 + i * 0.12, 2))
'''+s[b:]
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
print('ok')
