import io
p='compositions/chrome.html'; s=io.open(p,encoding='utf-8').read()
a=s.index('      #chrome #introRule {'); b=s.index('      /* ── 리본')
s=s[:a]+'''      /* 인트로 — caurfs.kr 과 같은 문법: 도시 사진 위 남색, 가운데 큰 인장, 굵은 세리프, 아래 가는 선 + 자간 넓은 대문자 */
      #chrome #introTitle { position: absolute; left: 0; right: 0; top: 648px; text-align: center; opacity: 0; }
      #chrome #introTitle .t { font-family: "NotoSerifKR", serif; font-weight: 700; font-size: 58px; color: #f7f6f3; letter-spacing: -0.025em; line-height: 1.1; }
      #chrome #introTitle .l { margin-top: 16px; font-size: 14px; font-weight: 500; color: rgba(247,246,243,0.78); letter-spacing: 0.32em; }
      #chrome #credit { position: absolute; left: 0; right: 0; top: 790px; text-align: center; opacity: 0; }
      #chrome #credit .by { font-size: 12px; font-weight: 600; color: #8faadc; letter-spacing: 0.34em; }
      #chrome #credit .who { margin-top: 12px; display: flex; justify-content: center; align-items: baseline; gap: 14px; }
      #chrome #credit .role { font-size: 18px; font-weight: 400; color: rgba(247,246,243,0.78); letter-spacing: 0.02em; }
      #chrome #credit .nm { font-size: 26px; font-weight: 600; color: #f7f6f3; letter-spacing: 0.06em; }
      #chrome #introCap { position: absolute; left: 0; right: 0; top: 944px; text-align: center; opacity: 0; }
      #chrome #introCap .ln { width: 600px; height: 1px; margin: 0 auto 16px; background: rgba(247,246,243,0.7); transform-origin: center; }
      #chrome #introCap .tx { font-size: 17px; font-weight: 500; color: rgba(247,246,243,0.82); letter-spacing: 0.16em; }
      #chrome #markName { font-family: "NotoSerifKR", serif; font-weight: 700; font-size: 36px; color: #f7f6f3; letter-spacing: -0.02em; line-height: 1; }
      #chrome #markSub { margin-top: 10px; font-weight: 500; font-size: 12px; color: rgba(247,246,243,0.72); letter-spacing: 0.24em; text-transform: uppercase; }

'''+s[b:]
s=s.replace('      @font-face { font-family: "SourceSerif4"; src: url("assets/fonts/SourceSerif4-latin-400-italic.woff2") format("woff2"); font-weight: 400; font-style: italic; font-display: block; }',
            '      @font-face { font-family: "NotoSerifKR"; src: url("assets/fonts/NotoSerifKR-Bold.woff2") format("woff2"); font-weight: 700; font-display: block; }')
# 마크업
a=s.index('    <div data-hf-id="hf-022f" id="introRule"></div>')
b=s.index('\n',s.index('<div id="credit">'))+1
s=s[:a]+'''    <div id="introTitle"><div class="t z">Equity Research Template</div><div class="l z">중앙대학교 가치투자학회 R.F.S.</div></div>
    <div id="credit"><div class="by z">PRESENTED BY</div><div class="who"><span class="role z">R.F.S. 43대 회장</span><span class="nm z">김민석</span></div></div>
    <div id="introCap"><div class="ln"></div><div class="tx z">RISING FINANCIAL STARS · CHUNG-ANG UNIVERSITY</div></div>
'''+s[b:]
# 타임라인
a=s.index('        // 1) 선 하나가 화면을 가른다'); b=s.index('        // 6) 리본 — 선이 먼저 그어지고')
s=s[:a]+'''        // 1) 도시 위로 인장이 떠오르고 테두리가 그려진다 (배경 사진은 index.html)
        tl.fromTo(one("#sealWrap"), { opacity: 0, x: 0, y: -96, scale: 0.8 },
          { opacity: 1, scale: 0.9, duration: 1.8, ease: "power3.out" }, 0.5);
        tl.fromTo(ring, { strokeDashoffset: C }, { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut" }, 0.8);
        // 2) 아래 가는 선과 학회 이름 — 사이트 첫 화면 그대로
        tl.fromTo(one("#introCap"), { opacity: 0 }, { opacity: 1, duration: 0.01 }, 1.1);
        tl.fromTo(one("#introCap .ln"), { scaleX: 0 }, { scaleX: 1, duration: 1.3, ease: "power3.inOut" }, 1.1);
        tl.fromTo(one("#introCap .tx"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 1.7);
        // 3) 제목
        tl.fromTo(one("#introTitle"), { opacity: 0 }, { opacity: 1, duration: 0.01 }, 2.1);
        tl.fromTo(one("#introTitle .t"), { opacity: 0, y: 22, clipPath: "inset(0 0 100% 0)" },
          { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)", duration: 1.0, ease: "power3.out" }, 2.1);
        tl.fromTo(one("#introTitle .l"), { opacity: 0 }, { opacity: 1, duration: 0.7 }, 2.6);
        // 4) 만든 사람
        tl.fromTo(one("#credit"), { opacity: 0 }, { opacity: 1, duration: 0.01 }, 3.2);
        tl.fromTo(one("#credit .by"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 3.2);
        tl.fromTo(one("#credit .who"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, 3.45);
        tl.to([one("#introTitle"), one("#credit"), one("#introCap"), one("#ring")], { opacity: 0, duration: 0.55, ease: "power1.in" }, 4.9);
        // 5) 인장만 좌상단으로, 워드마크는 그 옆에서 켜진다
        tl.to(one("#sealWrap"), { x: -788, y: -424, scale: 0.2133, duration: 1.3, ease: "power3.inOut" }, 5.2);
        tl.fromTo(one("#mark"), { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.7, ease: "power2.out" }, 6.1);
'''+s[b:]
io.open(p,'w',encoding='utf-8',newline='\n').write(s)

p='index.html'; s=io.open(p,encoding='utf-8').read()
s=s.replace('      .vignette { position: absolute; inset: 0;',
 '      #hero { position: absolute; inset: 0; opacity: 0; overflow: hidden; }\n'
 '      #hero img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform-origin: 50% 45%; }\n'
 '      #hero .scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(20,34,62,0.62) 0%, rgba(15,27,46,0.74) 100%); }\n'
 '      .vignette { position: absolute; inset: 0;',1)
o='<div data-hf-id="hf-q7bi" class="vignette"></div>'; assert o in s
s=s.replace(o,o+'\n      <div id="hero"><img id="heroImg" src="assets/img/city.jpg" alt=""><div class="scrim"></div></div>')
o='      tl.to("#topfade"'; assert o in s
s=s.replace(o,'''      // 인트로 배경 — 학회 사이트 첫 화면의 도시 사진
      tl.fromTo("#hero", { opacity: 0 }, { opacity: 1, duration: 1.6, ease: "power1.out" }, 0.1);
      tl.fromTo("#heroImg", { scale: 1.14 }, { scale: 1.04, duration: 6.2, ease: "none" }, 0);
      tl.to("#hero", { opacity: 0, duration: 1.2, ease: "power1.inOut" }, 5.4);

'''+o,1)
io.open(p,'w',encoding='utf-8',newline='\n').write(s)

p='tools/events.py'; s=io.open(p,encoding='utf-8').read()
a=s.index('ev(0.1, "riser"'); b=s.index('ev(5.3, "whoosh", gain=0.7)')
s=s[:a]+'''ev(0.1, "riser", dur=2.0, gain=0.8)
ev(1.1, "draw", dur=1.3, gain=0.45)             # 아래 가는 선
ev(2.1, "impact", gain=0.85)                    # 제목
ev(2.1, "shimmer", dur=1.0, gain=0.35)
ev(3.2, "shimmer", dur=1.2, gain=0.3)           # 크레딧
ev(3.45, "pop", pitch=0, gain=0.3)
'''+s[b:]
s=s.replace('ev(5.3, "whoosh", gain=0.7)                     # 로크업이 모서리로','ev(5.2, "whoosh", gain=0.7)                     # 인장이 모서리로')
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
print('ok')
