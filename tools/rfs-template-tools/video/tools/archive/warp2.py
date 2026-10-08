# 두 번째 시간축 늘림 — 필드 갱신 직전(대제목 → Ⅱ·2·2.1 제목) 구간만 1.7배
import io, re, json
BP = [(0, 0), (130.2, 130.2), (133.3, 130.2 + 3.1 * 1.7)]
def W(t):
    for (a0, b0), (a1, b1) in zip(BP, BP[1:]):
        if t <= a1: return b0 + (t - a0) * (b1 - b0) / (a1 - a0)
    a, b = BP[-1]; return b + (t - a)
def fm(x): return ('%.3f' % x).rstrip('0').rstrip('.')
BODY0 = 39.9
def jt(s, conv):
    return re.sub(r'(\}\s*,\s*)(\d+(?:\.\d+)?)(\s*\);)', lambda m: m.group(1) + fm(conv(float(m.group(2)))) + m.group(3), s)

# index
p = 'index.html'; s = io.open(p, encoding='utf-8').read()
def ds(m):
    st, du = float(m.group(2)), float(m.group(4)); a, b = W(st), W(st + du)
    return m.group(1) + fm(a) + m.group(3) + fm(b - a) + m.group(5)
s = re.sub(r'(data-start=")([\d.]+)(" data-duration=")([\d.]+)(")', ds, s)
s = jt(s, W)
s = re.sub(r'(cap\("#\w+", )([\d.]+)(, )([\d.]+)(\))', lambda m: m.group(1) + fm(W(float(m.group(2)))) + m.group(3) + fm(W(float(m.group(4)))) + m.group(5), s)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# chrome
p = 'compositions/chrome.html'; s = io.open(p, encoding='utf-8').read()
o = '        function SH(t) { return WARP(t + 8.1 + (t >= 92.0 ? 4.2 : 0)); }'
assert o in s
s = s.replace(o, '''        const WBP2 = %s;
        function WARP2(t) { for (let i = 1; i < WBP2.length; i++) { if (t <= WBP2[i][0]) { const a = WBP2[i - 1], b = WBP2[i]; return a[1] + (t - a[0]) * (b[1] - a[1]) / (b[0] - a[0]); } } const l = WBP2[WBP2.length - 1]; return l[1] + (t - l[0]); }
        function SH(t) { return WARP2(WARP(t + 8.1 + (t >= 92.0 ? 4.2 : 0))); }''' % ('[' + ', '.join('[%s, %s]' % (fm(a), fm(b)) for a, b in BP) + ']'))
s = jt(s, lambda t: W(t) if t >= 8.3 else t)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# body (로컬)
p = 'compositions/body.html'; s = io.open(p, encoding='utf-8').read()
bl = lambda l: W(BODY0 + l) - BODY0
s = jt(s, bl)
s = re.sub(r'(cam\(CAM_\w+, )([\d.]+)(, [\d.]+\))', lambda m: m.group(1) + fm(bl(float(m.group(2)))) + m.group(3), s)
s = re.sub(r'(fx\("[^"]+", )([\d.]+)(,)', lambda m: m.group(1) + fm(bl(float(m.group(2)))) + m.group(3), s)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# 효과음
p = 'tools/events.json'; d = json.load(io.open(p, encoding='utf-8'))
for e in d['events']:
    if e['type'] == 'bed': e['dur'] = round(W(e['t'] + e.get('dur', d['duration'])) - e['t'], 3); continue
    e['t'] = round(W(e['t']), 3)
d['duration'] = round(W(d['duration']), 3)
json.dump(d, io.open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('end', d['duration'])
