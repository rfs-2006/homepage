import io, re

# ── chrome.html : 막 블록 교체 + 압축된 오프닝 + 글로우 CSS ──
p='compositions/chrome.html'; s=io.open(p,encoding='utf-8').read()
blk=io.open('tools/act-block.js',encoding='utf-8').read()
a=s.index('        // \u2500\u2500 \ub9c9\ub9c8\ub2e4 \ub9ac\ubcf8\uc744 \uc9da\ub294 \ud5ec\ud37c \u2500\u2500')
b=s.index('        window.__timelines["chrome"] = tl;')
s=s[:a]+blk+s[b:]

if '.zglow' not in s:
    s=s.replace('      #chrome #conn { position: absolute;',
      '      #chrome .zglow { position: absolute; left: -3px; right: -3px; top: -3px; bottom: -3px;\n'
      '        border: 2px solid #8faadc; border-radius: 4px; opacity: 0; pointer-events: none; }\n'
      '      #chrome #conn { position: absolute;')

# 오프닝 압축
for x,y in [('duration: 1.25, ease: "power2.out" }, 0);','duration: 1.0, ease: "power2.out" }, 0);'),
            ('duration: 1.35, ease: "power1.inOut" }, 0.35);','duration: 1.1, ease: "power1.inOut" }, 0.3);'),
            ('duration: 0.45, ease: "power1.out" }, 1.82);','duration: 0.4, ease: "power1.out" }, 1.5);'),
            ('duration: 1.2, ease: "power3.inOut", immediateRender: false }, 1.95);','duration: 1.0, ease: "power3.inOut", immediateRender: false }, 1.6);'),
            ('duration: 0.7, ease: "power2.out" }, 3.06);','duration: 0.6, ease: "power2.out" }, 2.5);'),
            ('stagger: { each: 0.088, from: "center" } }, 2.92);','stagger: { each: 0.07, from: "center" } }, 2.3);'),
            ('stagger: { each: 0.088, from: "center" } }, 3.34);','stagger: { each: 0.07, from: "center" } }, 2.7);'),
            ('duration: 0.85, ease: "power2.inOut" }, 3.88);','duration: 0.7, ease: "power2.inOut" }, 3.2);'),
            ('stagger: 0.045 }, 4.12);','stagger: 0.04 }, 3.4);'),
            ('stagger: { each: 0.30 }, immediateRender: false }, 4.86);','stagger: { each: 0.21 }, immediateRender: false }, 4.0);'),
            ('stagger: { each: 0.035 }, immediateRender: false }, 4.94);','stagger: { each: 0.028 }, immediateRender: false }, 4.06);'),
            ('}, 9.6);','}, 7.2);')]:
    s=s.replace(x,y)
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
print('chrome 재구성')

# ── cover.html : 시작을 8초로 옮기며 3막 타이밍 당기기 ──
p='compositions/cover.html'; s=io.open(p,encoding='utf-8').read()
for x,y in [('}, 11.9);','}, 10.2);'),('}, 12.0);','}, 10.3);'),
            ('immediateRender: false }, 13.0);','immediateRender: false }, 11.2);'),
            ('}, 15.3);','}, 12.2);'),('}, 16.4);','}, 13.2);'),
            ('}, 17.3);','}, 14.2);'),('}, 19.0);','}, 15.8);')]:
    s=s.replace(x,y)
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
print('cover 타이밍 당김')
