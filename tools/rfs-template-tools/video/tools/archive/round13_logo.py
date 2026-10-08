import io
def rep(s, a, b):
    assert a in s, a
    return s.replace(a, b, 1)

# ══════════ chrome ══════════
p = 'compositions/chrome.html'; s = io.open(p, encoding='utf-8').read()
# 1) 인장 바깥 파란 원 제거 (테두리 두 겹)
s = rep(s, '      #chrome #ring circle {', '      #chrome #ring { display: none; }\n      #chrome #ring circle {')
# 2) 작은 한글 줄 제거
s = rep(s, '<div class="l z">중앙대학교 가치투자학회 R.F.S.</div>', '')
s = rep(s, '        tl.fromTo(one("#introTitle .l"), { opacity: 0 }, { opacity: 1, duration: 0.7 }, 2.6);\n', '')
# 3) 제목: 잘리는 마스크 대신 흐림에서 선명하게 떠오른다
s = rep(s, '''tl.fromTo(one("#introTitle .t"), { opacity: 0, y: 22, clipPath: "inset(0 0 100% 0)" },''',
           '''tl.fromTo(one("#introTitle .t"), { opacity: 0, y: 16, filter: "blur(10px)" },''')
s = s.replace('{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)", duration: 1.0, ease: "power3.out" }, 2.1);',
              '{ opacity: 1, y: 0, filter: "blur(0px)", duration: 1.2, ease: "power3.out" }, 2.1);')
# 5) 엔딩: 인장은 모서리에서 사라지고, 가운데에서 새로 떠오른다
s = rep(s, '        tl.to(one("#sealWrap"), { x: 0, y: -96, scale: 0.78, opacity: 1, duration: 1.4, ease: "power3.inOut" }, 144.3);',
           '        tl.to(one("#sealWrap"), { opacity: 0, duration: 0.45, ease: "power1.in" }, 143.5);\n'
           '        tl.set(one("#sealWrap"), { x: 0, y: -96, scale: 0.82 }, 144.1);\n'
           '        tl.to(one("#sealWrap"), { opacity: 1, scale: 0.9, duration: 1.8, ease: "power3.out" }, 144.3);')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ══════════ index ══════════
p = 'index.html'; s = io.open(p, encoding='utf-8').read()
# 4) 배경 동심원 무늬(밴딩) — 아주 옅은 노이즈를 얹는다
noise = ("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>"
         "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>"
         "<feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.5 0'/></filter>"
         "<rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")
s = rep(s, '      #hero { position: absolute;',
        '      .grain { position: absolute; inset: 0; opacity: 0.06; background-image: url("%s"); background-size: 240px 240px; }\n'
        '      #blackout { position: absolute; inset: 0; background: #000; opacity: 0; z-index: 40; }\n'
        '      #endCap { position: absolute; left: 0; right: 0; top: 944px; text-align: center; opacity: 0; z-index: 5; }\n'
        '      #endCap .ln { width: 600px; height: 1px; margin: 0 auto 16px; background: rgba(247,246,243,0.7); transform-origin: center; }\n'
        '      #endCap .tx { font-size: 17px; font-weight: 500; color: rgba(247,246,243,0.82); letter-spacing: 0.16em; }\n'
        '      #hero { position: absolute;' % noise)
s = rep(s, '<div data-hf-id="hf-q7bi" class="vignette"></div>', '<div data-hf-id="hf-q7bi" class="vignette"></div>\n      <div class="grain"></div>')
# 6) 엔딩을 인트로와 같은 틀로
s = rep(s, '      #endMsg  { top: 620px; font-size: 40px; font-weight: 400; letter-spacing: -0.01em; }',
           '      #endMsg  { top: 650px; font-size: 44px; font-weight: 500; letter-spacing: -0.015em; }')
s = rep(s, '      #endWho  { top: 706px; font-size: 20px; font-weight: 500; color: rgba(247,246,243,0.72); letter-spacing: 0.05em; }',
           '      #endWho  { top: 728px; font-size: 19px; font-weight: 400; color: rgba(247,246,243,0.78); letter-spacing: 0.02em; }')
s = rep(s, '      #endSite { top: 752px; font-size: 17px; font-weight: 500; color: #8faadc; letter-spacing: 0.22em; }',
           '      #endSite { top: 1000px; font-size: 14px; font-weight: 500; color: #8faadc; letter-spacing: 0.3em; }')
s = rep(s, '<div data-hf-id="hf-ltez" class="end clip" id="endSite"',
           '<div id="endCap" class="clip" data-start="145.3" data-duration="5.8" data-track-index="2"><div class="ln"></div><div class="tx">RISING FINANCIAL STARS · CHUNG-ANG UNIVERSITY</div></div>\n'
           '      <div id="blackout" class="clip" data-start="149.9" data-duration="1.2" data-track-index="5"></div>\n'
           '      <div data-hf-id="hf-ltez" class="end clip" id="endSite"')
s = rep(s, '      tl.fromTo("#endMsg",  { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" }, 145.1);',
           '      // 엔딩 — 인트로와 같은 도시 사진 위에서 닫는다\n'
           '      tl.fromTo("#hero", { opacity: 0 }, { opacity: 1, duration: 1.6, ease: "power1.inOut", immediateRender: false }, 143.6);\n'
           '      tl.fromTo("#heroImg", { scale: 1.1 }, { scale: 1.03, duration: 7.5, ease: "none", immediateRender: false }, 143.6);\n'
           '      tl.fromTo("#endMsg",  { opacity: 0, y: 14, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.1, ease: "power3.out" }, 145.2);\n'
           '      tl.fromTo("#endCap", { opacity: 0 }, { opacity: 1, duration: 0.01 }, 145.4);\n'
           '      tl.fromTo("#endCap .ln", { scaleX: 0 }, { scaleX: 1, duration: 1.3, ease: "power3.inOut" }, 145.4);\n'
           '      tl.fromTo("#endCap .tx", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 146.0);\n'
           '      tl.fromTo("#blackout", { opacity: 0 }, { opacity: 1, duration: 1.1, ease: "power1.in" }, 150.0);')
s = rep(s, 'tl.fromTo("#endWho",  { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 145.7);',
           'tl.fromTo("#endWho",  { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 145.8);')
s = rep(s, 'tl.fromTo("#endSite", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 146.1);',
           'tl.fromTo("#endSite", { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out" }, 146.4);')
s = rep(s, 'data-track-index="4" data-volume="1"></audio>', 'data-track-index="4" data-volume="1" data-fade-out="1.1"></audio>')
s = s.replace('R.F.S. 43대 회장 · 김민석', 'R.F.S. 43대 회장 김민석')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
