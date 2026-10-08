import io
p = 'tools/events.py'; s = io.open(p, encoding='utf-8').read()
a = s.index('ev(C + 13.4, "cam", dur=1.2, gain=0.55)'); b = s.index('ev(C + 21.4, "whoosh_out", gain=0.45)')
s = s[:a] + '''ev(C + 13.6, "cam", dur=1.1, gain=0.65)          # 티커로 다가감
ev(C + 15.0, "pop", pitch=12, gain=0.4)
ev(C + 15.6, "cam", dur=1.0, gain=0.7)          # Stock Data
for i in range(9): ev(C + 16.4 + i * 0.12, "pop", pitch=[0, 2, 4, 5, 7, 9, 11, 12, 14][i], gain=0.22)
ev(C + 17.2, "softclick", gain=0.5); ev(C + 17.45, "softclick", gain=0.5)
ev(C + 18.0, "cam", dur=0.8, gain=0.6)          # Stock Price
ev(C + 18.4, "draw", dur=1.1, gain=0.6)
ev(C + 19.1, "softclick", gain=0.5)
ev(C + 19.35, "cam", dur=0.7, gain=0.6)         # 남색 박스
ev(C + 19.9, "pop", pitch=7, gain=0.35)
ev(C + 20.05, "softclick", gain=0.5); ev(C + 20.25, "softclick", gain=0.5)
ev(C + 20.65, "cam", dur=0.8, gain=0.55)
''' + s[b:]
s = s.replace('ev(C + 21.4, "whoosh_out", gain=0.45)', 'ev(C + 21.55, "whoosh_out", gain=0.45)')
o = "for m in re.finditer(r'\\n\\s*cam\\(CAM_\\w+"
i = s.index(o)
s = s[:i] + '''for m in re.finditer(r'fx\\("[^"]+", ([\\d.]+), "(?:pop|sel)"(, \\{([^}]*)\\})?', bd):
    if 'punch: false' in (m.group(3) or ''): continue
    ev(B + float(m.group(1)) - 0.55, "cam", dur=0.7, gain=0.35)
''' + s[i:]
io.open(p, 'w', encoding='utf-8', newline='\n').write(s); print('ok')
