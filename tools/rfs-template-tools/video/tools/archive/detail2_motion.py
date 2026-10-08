# 디테일 2단계 · 움직임 질감 — 카메라 가감속 통일(power3.inOut) + 빠른 이동 중 짧은 모션 블러
import io, re
def rep(s, a, b):
    assert a in s, a
    return s.replace(a, b, 1)

# ── body
p = 'compositions/body.html'; s = io.open(p, encoding='utf-8').read()
s = rep(s, '        function cam(c, t, d) { CAMS.push({ c: c, t: t, d: d || 1.1 }); tl.to(W, Object.assign({ duration: d || 1.1, ease: "power2.inOut" }, c), t); }',
        '''        // 이동 중에만 살짝 흐려진다 (모션 블러) — 가운데서 가장 흐리고 도착하면 선명
        function mb(el, t, d, amt) {
          tl.to(el, { filter: "blur(" + amt + "px)", duration: d * 0.45, ease: "power2.in" }, t);
          tl.to(el, { filter: "blur(0px)", duration: d * 0.55, ease: "power2.out" }, t + d * 0.45);
        }
        function cam(c, t, d) { d = d || 1.1; CAMS.push({ c: c, t: t, d: d }); tl.to(W, Object.assign({ duration: d, ease: "power3.inOut" }, c), t); mb(W, t, d, 1.6); }''')
s = rep(s, '              duration: 0.7, ease: "power3.inOut"\n            }, tIn);',
        '              duration: 0.7, ease: "power3.inOut"\n            }, tIn);\n            mb(W, tIn, 0.7, 1.2);')
s = rep(s, '            tl.to(W, { scale: b.c.scale, x: b.c.x, y: b.c.y, duration: 0.8, ease: "power2.inOut" }, Math.max(tOut, F.t + 0.35));',
        '            const tb = Math.max(tOut, F.t + 0.35);\n'
        '            tl.to(W, { scale: b.c.scale, x: b.c.x, y: b.c.y, duration: 0.8, ease: "power3.inOut" }, tb);\n'
        '            mb(W, tb, 0.8, 1.2);')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ── cover: 표지 카메라 이동에도 같은 블러
p = 'compositions/cover.html'; s = io.open(p, encoding='utf-8').read()
pat = re.compile(r'        tl\.to\(one\("#pagesWrap"\), \{ scale: [^}]*?duration: ([\d.]+), ease: "power\d\.inOut" \}, ([\d.]+)\);')
def add_mb(m):
    line, d, t = m.group(0), float(m.group(1)), float(m.group(2))
    line = line.replace('ease: "power2.inOut"', 'ease: "power3.inOut"')
    return (line + '\n        tl.to(one("#pagesWrap"), { filter: "blur(1.4px)", duration: %.3f, ease: "power2.in" }, %.3f);'
            '\n        tl.to(one("#pagesWrap"), { filter: "blur(0px)", duration: %.3f, ease: "power2.out" }, %.3f);'
            % (d * 0.45, t, d * 0.55, t + d * 0.45))
s, n = pat.subn(add_mb, s)
print('cover moves', n)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ── chrome: 확대 패널이 흐림에서 선명하게 열리고, 닫힐 때 살짝 흐려진다
p = 'compositions/chrome.html'; s = io.open(p, encoding='utf-8').read()
DS = 'drop-shadow(0 16px 38px rgba(0,0,0,0.5))'
s = rep(s, '          tl.fromTo(panel, { opacity: 0, x: 0, y: 0, scale: PS * 0.9 },\n            { opacity: 1, scale: PS * 1.03, duration: 0.6, ease: "power3.out", immediateRender: false }, tIn + 0.3);',
        '          tl.fromTo(panel, { opacity: 0, x: 0, y: 0, scale: PS * 0.9, filter: "blur(6px) %s" },\n'
        '            { opacity: 1, scale: PS * 1.03, filter: "blur(0px) %s", duration: 0.6, ease: "power3.out", immediateRender: false }, tIn + 0.3);' % (DS, DS))
s = rep(s, '          tl.to(panel, { opacity: 0, scale: PS * 0.94, duration: 0.38, ease: "power2.in" }, tOut);',
        '          tl.to(panel, { opacity: 0, scale: PS * 0.94, filter: "blur(4px) %s", duration: 0.38, ease: "power2.in" }, tOut);' % DS)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
