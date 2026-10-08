# 디테일 4단계 · 글자 — STEP 숫자가 아래에서 넘어오고, 설명 위에 10칸 진행 표시
import io, re
p = 'index.html'; s = io.open(p, encoding='utf-8').read()
caps = [(int(m.group(1)), float(m.group(2)), float(m.group(3))) for m in re.finditer(r'cap\("#s(\d\d)", ([\d.]+), ([\d.]+)\)', s)]
caps.sort()
assert len(caps) == 10, caps

# 1) 숫자만 따로 감싸 롤링
s = re.sub(r'<span class="lead">STEP (\d\d)</span>',
           r'<span class="lead">STEP <span class="num"><span class="nr" id="nr\1">\1</span></span></span>', s)
css = '''      .capL .lead .num { display: inline-block; overflow: hidden; height: 1.25em; vertical-align: top; }
      .capL .lead .nr { display: inline-block; }
      /* 진행 표시 — 10단계 중 지금 어디인지 */
      #prog { position: absolute; left: 140px; top: 522px; display: flex; gap: 6px; opacity: 0; z-index: 5; }
      #prog i { display: block; width: 30px; height: 2px; background: rgba(143,170,220,0.22); position: relative; overflow: hidden; }
      #prog i b { position: absolute; left: 0; top: 0; bottom: 0; width: 100%; background: #8faadc; transform: scaleX(0); transform-origin: left center; }
'''
s = s.replace('    </style>', css + '    </style>', 1)
first, last = caps[0][1], caps[-1][2]
bars = ''.join('<i><b id="pg%02d"></b></i>' % n for n, _, _ in caps)
html = '      <div id="prog" class="clip" data-start="%.3f" data-duration="%.3f" data-track-index="2">%s</div>\n' % (first - 0.2, last - first + 1.0, bars)
i = s.index('      <div class="cap capL clip" id="s01"')
s = s[:i] + html + s[i:]
T = ['      // 4단계 · 글자 — 진행 표시와 STEP 숫자 롤링',
     '      tl.fromTo("#prog", { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power1.out" }, %.3f);' % (first - 0.1),
     '      tl.to("#prog", { opacity: 0, duration: 0.5, ease: "power1.in" }, %.3f);' % last]
for n, tin, tout in caps:
    T.append('      tl.fromTo("#pg%02d", { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power3.inOut", immediateRender: false }, %.3f);' % (n, tin + 0.05))
    T.append('      tl.fromTo("#nr%02d", { yPercent: 110 }, { yPercent: 0, duration: 0.55, ease: "power3.out", immediateRender: false }, %.3f);' % (n, tin + 0.12))
    if n > 1:   # 지난 칸은 한 톤 낮춘다
        T.append('      tl.to("#pg%02d", { opacity: 0.55, duration: 0.4 }, %.3f);' % (n - 1, tin + 0.05))
o = '      tl.to("#topfade", { opacity: 1'
assert o in s
s = s.replace(o, '\n'.join(T) + '\n\n' + o, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', first, last)
