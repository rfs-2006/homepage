# 급한 구간만 시간축을 늘린다 — 모든 파일의 '전역 시각'을 같은 W 로 바꿔 싱크를 유지한다
import io, re, json

# (옛 전역 시각, 새 전역 시각) — 사이는 직선
BP = [(0, 0), (28.0, 28.0), (34.5, 39.5),          # STEP 01 주가 차트 ×1.77
      (56.0, 61.0), (61.5, 67.875),                 # 자료 틀 ×1.25
      (65.0, 71.375), (70.0, 77.375),               # 강조 ×1.2
      (84.2, 91.575), (96.4, 106.825),              # 주석 ×1.25
      (110.2, 120.625), (116.0, 128.165)]           # 글꼴 ×1.3
def W(t):
    for (a0, b0), (a1, b1) in zip(BP, BP[1:]):
        if t <= a1: return b0 + (t - a0) * (b1 - b0) / (a1 - a0)
    a, b = BP[-1]; return b + (t - a)
def fm(x): return ('%.3f' % x).rstrip('0').rstrip('.')
OLD_END = 151.1; NEW_END = W(OLD_END)
COVER0, BODY0_OLD = 13.0, 34.9; BODY0_NEW = W(BODY0_OLD)

def warp_js_times(s, conv):
    s = re.sub(r'(\}\s*,\s*)(\d+(?:\.\d+)?)(\s*\);)', lambda m: m.group(1) + fm(conv(float(m.group(2)))) + m.group(3), s)
    return s

# ── index (전역)
p = 'index.html'; s = io.open(p, encoding='utf-8').read()
def ds(m):
    st, du = float(m.group(2)), float(m.group(4))
    a, b = W(st), W(st + du)
    return m.group(1) + fm(a) + m.group(3) + fm(b - a) + m.group(5)
s = re.sub(r'(data-start=")([\d.]+)(" data-duration=")([\d.]+)(")', ds, s)
s = warp_js_times(s, W)
s = re.sub(r'(cap\("#\w+", )([\d.]+)(, )([\d.]+)(\))', lambda m: m.group(1) + fm(W(float(m.group(2)))) + m.group(3) + fm(W(float(m.group(4)))) + m.group(5), s)
s = re.sub(r'(go\([^;]*?, )(\d+(?:\.\d+)?)((?:, [\d.]+)*\);)', lambda m: m.group(1) + fm(W(float(m.group(2)))) + m.group(3), s)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ── chrome (전역): SH 결과와 전역 숫자에 W
p = 'compositions/chrome.html'; s = io.open(p, encoding='utf-8').read()
o = 'function SH(t) { return t + 8.1 + (t >= 92.0 ? 4.2 : 0); }'
assert o in s
js_bp = '[' + ', '.join('[%s, %s]' % (fm(a), fm(b)) for a, b in BP) + ']'
s = s.replace(o, '''// 급한 구간을 늘린 시간축 (tools/warp.py 와 같은 표)
        const WBP = %s;
        function WARP(t) { for (let i = 1; i < WBP.length; i++) { if (t <= WBP[i][0]) { const a = WBP[i - 1], b = WBP[i]; return a[1] + (t - a[0]) * (b[1] - a[1]) / (b[0] - a[0]); } } const l = WBP[WBP.length - 1]; return l[1] + (t - l[0]); }
        function SH(t) { return WARP(t + 8.1 + (t >= 92.0 ? 4.2 : 0)); }''' % js_bp)
s = warp_js_times(s, lambda t: W(t) if t >= 8.3 else t)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ── cover (로컬 = 전역 - 13)
p = 'compositions/cover.html'; s = io.open(p, encoding='utf-8').read()
s = warp_js_times(s, lambda l: W(COVER0 + l) - COVER0)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ── body (로컬 = 전역 - 시작)
p = 'compositions/body.html'; s = io.open(p, encoding='utf-8').read()
bl = lambda l: W(BODY0_OLD + l) - BODY0_NEW
s = warp_js_times(s, bl)
s = re.sub(r'(cam\(CAM_\w+, )([\d.]+)(, [\d.]+\))', lambda m: m.group(1) + fm(bl(float(m.group(2)))) + m.group(3), s)
s = re.sub(r'(fx\("[^"]+", )([\d.]+)(,)', lambda m: m.group(1) + fm(bl(float(m.group(2)))) + m.group(3), s)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ── 효과음: 옛 파일 기준으로 뽑은 큐를 같은 W 로
d = json.load(io.open('backup_r14/events_old.json', encoding='utf-8'))
for e in d['events']:
    if e['type'] == 'bed': e['dur'] = round(NEW_END, 3); continue
    e['t'] = round(W(e['t']), 3)
d['duration'] = round(NEW_END, 3)
json.dump(d, io.open('tools/events.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('new end', fm(NEW_END), 'body start', fm(BODY0_NEW))
