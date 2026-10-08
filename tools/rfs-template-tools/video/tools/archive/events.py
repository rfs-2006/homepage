# 효과음 큐 목록 — 타임라인 코드에서 뽑아 sfx.py 용 JSON 으로 쓴다
import io, re, json

DUR = 151.1
def SH(t): return t + 8.1 + (4.2 if t >= 92.0 else 0)
E = []
def ev(t, typ, **k):
    d = {"t": round(t, 3), "type": typ}; d.update(k); E.append(d)

# ── 인트로
ev(0.1, "riser", dur=2.0, gain=0.8)
ev(1.1, "draw", dur=1.3, gain=0.45)             # 아래 가는 선
ev(2.1, "impact", gain=0.85)                    # 제목
ev(2.1, "shimmer", dur=1.0, gain=0.35)
ev(3.2, "shimmer", dur=1.2, gain=0.3)           # 크레딧
ev(3.45, "pop", pitch=0, gain=0.3)
ev(5.2, "whoosh", gain=0.7)                     # 인장이 모서리로
ev(6.0, "draw", dur=1.0, gain=0.5)              # 헤어라인
ev(6.3, "whoosh", gain=0.55)                    # 판이 올라온다
for i in range(8): ev(6.4 + i * 0.075, "softclick", gain=0.25, pan=round(-0.6 + i * 0.17, 2))
ev(7.6, "shimmer", dur=1.2, gain=0.6)           # 스윕
for i in range(12): ev(8.1 + i * 0.2, "pop", pitch=[0, 2, 4, 7, 9, 12][i % 6], gain=0.18, pan=round(-0.7 + i * 0.12, 2))
ev(12.1, "cam", dur=0.9, gain=0.6)
# 시작하는 법
for t in (8.75, 9.55, 10.35, 11.2): ev(t, "click", gain=0.85)
ev(8.8, "whoosh", gain=0.5); ev(9.65, "pop", pitch=5, gain=0.3); ev(10.5, "pop", pitch=9, gain=0.3); ev(11.6, "whoosh_out", gain=0.5)

# ── 표지 (로컬 + 11.5)
C = 13
ev(C + 0.0, "whoosh", gain=0.55)
ev(C + 0.91, "whoosh_out", gain=0.4)            # 배너
ev(C + 1.89, "type", n=12, dur=1.15, gain=0.7)  # 종목명
ev(C + 4.55, "type", n=10, dur=0.9, gain=0.55)  # 투자의견·목표주가
ev(C + 8.45, "cam", dur=1.35, gain=0.6)
ev(C + 9.36, "whoosh", gain=0.45)               # 2쪽
ev(C + 10.53, "draw", dur=0.8, gain=0.45); ev(C + 11.3, "pop", pitch=0, gain=0.4)
ev(C + 11.18, "draw", dur=0.95, gain=0.45); ev(C + 12.2, "pop", pitch=4, gain=0.4)
ev(C + 13.6, "cam", dur=1.1, gain=0.65)          # 티커로 다가감
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
ev(C + 21.55, "whoosh_out", gain=0.45)

# ── 리본 조작 (chrome.html 에서 추출)
ch = io.open('compositions/chrome.html', encoding='utf-8').read()
body = ch[ch.index('// ══════════ 막 진행'):ch.index('// 14막 · 엔딩')]
for m in re.finditer(r'press\("([^"]+)", ([\d.]+)', body):
    ev(SH(float(m.group(2))), "click", gain=1.0)
for m in re.finditer(r'zoomGroup\("[^"]+", ([\d.]+), ([\d.]+)\)', body):
    ev(SH(float(m.group(1))) + 0.05, "draw", dur=0.6, gain=0.35)   # 투영선
    ev(SH(float(m.group(1))) + 0.3, "whoosh", gain=0.75)
    ev(SH(float(m.group(2))), "whoosh_out", gain=0.5)
for m in re.finditer(r'\], ([\d.]+), ([\d.]+)\);', body):             # 드롭다운
    to = SH(float(m.group(1)))
    ev(to, "softclick", gain=0.6)
    n = body[body.rfind('dropdown(', 0, m.start()):m.start()].count('{ icon:')
    for i in range(n): ev(to + 0.5 + i * 0.6, "softclick", gain=0.45)

# ── 문서 결과 (body.html fx, cam — 로컬 + 33.4)
B = 34.9
bd = io.open('compositions/body.html', encoding='utf-8').read()
pitches = [0, 2, 4, 7, 9]
for i, m in enumerate(re.finditer(r'fx\("[^"]+", ([\d.]+), "(pop|sel)"', bd)):
    if m.group(2) == "pop": ev(B + float(m.group(1)) + 0.12, "pop", pitch=pitches[i % 5], gain=0.55)
for m in re.finditer(r'fx\("[^"]+", ([\d.]+), "(?:pop|sel)"(, \{([^}]*)\})?', bd):
    if 'punch: false' in (m.group(3) or ''): continue
    ev(B + float(m.group(1)) - 0.55, "cam", dur=0.7, gain=0.35)
for m in re.finditer(r'\n\s*cam\(CAM_\w+, ([\d.]+), ([\d.]+)\)', bd):
    ev(B + float(m.group(1)), "cam", dur=float(m.group(2)), gain=0.55)
ev(B + 0.0, "whoosh", gain=0.55)                                      # 본문 페이지 등장
for t in (93.4, 97.6): ev(B + t, "draw", dur=0.5, gain=0.45)          # 형광펜
ev(B + 88.9 + 0.12, "pop", pitch=12, gain=0.45)

# ── 입력창·메시지 창 (index.html)
ix = io.open('index.html', encoding='utf-8').read()
for m in re.finditer(r'tl\.fromTo\("#(\w+)", \{ opacity: 0, scale: 0\.96 \}.*?, ([\d.]+)\);', ix):
    ev(float(m.group(2)), "dialog", gain=0.6)
for m in re.finditer(r'tl\.fromTo\("#\w+_t", .*?duration: ([\d.]+), ease: "steps\((\d+)\)" \}, ([\d.]+)\);', ix):
    ev(float(m.group(3)), "type", n=int(m.group(2)), dur=float(m.group(1)), gain=0.7)
for m in re.finditer(r'tl\.fromTo\("#\w+_ok".*?, ([\d.]+)\);', ix):
    ev(float(m.group(1)), "softclick", gain=0.8)

# ── 엔딩
ev(143.5, "whoosh_out", gain=0.6)
ev(144.3, "cam", dur=1.4, gain=0.5)
ev(145.1, "chime", gain=0.8)
ev(0.0, "bed", gain=0.11, dur=DUR)

E.sort(key=lambda d: d["t"])
json.dump({"duration": DUR, "seed": 260925, "events": E}, io.open('tools/events.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(E), 'events')
