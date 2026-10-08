# 디테일 3단계 · 누르기 동작 — 올라감(hover) → 누름 → 뗌, 누른 자리에서 번지는 파동
import io
p = 'compositions/chrome.html'; s = io.open(p, encoding='utf-8').read()
def rep(a, b):
    global s
    assert a in s, a
    s = s.replace(a, b, 1)

rep('      #chrome .ring {', '''      #chrome .rip { position: absolute; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%;
        background: radial-gradient(circle, rgba(207,224,255,0.75) 0%, rgba(143,170,220,0.35) 55%, rgba(143,170,220,0) 72%);
        opacity: 0; pointer-events: none; transform: scale(0); }
      #chrome .ring {''')

a = s.index('          tl.to(cursor, { scale: 0.82, duration: 0.09, yoyo: true, repeat: 1, ease: "power2.inOut" }, t);')
b = s.index('          tl.to(b, { backgroundColor: "rgba(27,63,122,0)", duration: 0.4, ease: "power2.inOut" }, t + hold);')
b = s.index('\n', b) + 1
s = s[:a] + '''          // ① 올라감 — 커서가 닿는 순간 버튼이 먼저 밝아진다
          tl.fromTo(b, { backgroundColor: "rgba(143,170,220,0)" },
            { backgroundColor: "rgba(143,170,220,0.18)", duration: 0.15, ease: "power1.out", immediateRender: false }, t - 0.2);
          // ② 누름 — 커서와 버튼이 함께 눌리고, 누른 자리에서 파동이 번진다
          tl.to(cursor, { scale: 0.8, duration: 0.08, ease: "power2.in" }, t);
          tl.to(cursor, { scale: 1, duration: 0.18, ease: "back.out(2.5)" }, t + 0.1);
          tl.to(b, { backgroundColor: "rgba(27,63,122,1)", duration: 0.08, ease: "power2.out" }, t);
          tl.to(b, { scale: 0.92, duration: 0.08, ease: "power2.in" }, t);
          const rip = document.createElement("span");
          rip.className = "rip";
          b.appendChild(rip);
          tl.set(rip, { left: function () { return b.offsetWidth * 0.56; }, top: function () { return b.offsetHeight * 0.62; } }, t - 0.01);
          tl.fromTo(rip, { scale: 0, opacity: 0.9 }, { scale: 2.6, opacity: 0, duration: 0.55, ease: "power2.out", immediateRender: false }, t);
          if (rg) {
            tl.fromTo(rg, { opacity: 0, scale: 0.85 }, { opacity: 0.7, duration: 0.1, ease: "power2.out", immediateRender: false }, t + 0.04);
            tl.to(rg, { opacity: 0, scale: 1.35, duration: 0.5, ease: "power2.out" }, t + 0.14);
          }
          // ③ 뗌 — 살짝 튀어 올랐다 제자리, 누른 색은 빠지고 올라간 상태로
          tl.to(b, { scale: 1.03, duration: 0.14, ease: "power2.out" }, t + 0.1);
          tl.to(b, { scale: 1, duration: 0.22, ease: "power2.inOut" }, t + 0.24);
          tl.to(b, { backgroundColor: "rgba(143,170,220,0.18)", duration: 0.3, ease: "power1.inOut" }, t + Math.min(0.45, hold * 0.5));
          // 커서가 떠나면 원래대로
          tl.to(b, { backgroundColor: "rgba(143,170,220,0)", duration: 0.35, ease: "power2.inOut" }, t + hold);
''' + s[b:]
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# 입력창·메시지 창의 확인 버튼도 같은 문법 (올라감 → 누름 → 뗌)
p = 'index.html'; s = io.open(p, encoding='utf-8').read()
import re
def okfix(m):
    idsel, t = m.group(1), float(m.group(2))
    return ('tl.fromTo("%s", { backgroundColor: "#e5e5e5" }, { backgroundColor: "#d7e3fb", duration: 0.12, immediateRender: false }, %.3f);\n'
            '      tl.to("%s", { backgroundColor: "#b9cdf5", scale: 0.93, duration: 0.07 }, %.3f);\n'
            '      tl.to("%s", { backgroundColor: "#d7e3fb", scale: 1, duration: 0.16, ease: "back.out(2)" }, %.3f);'
            % (idsel, t - 0.22, idsel, t, idsel, t + 0.08))
s, n = re.subn(r'tl\.fromTo\("(#\w+_ok)", \{ backgroundColor: "#e5e5e5", scale: 1 \}, \{ backgroundColor: "#bcd3ff", scale: 0\.94, duration: 0\.1, yoyo: true, repeat: 1 \}, ([\d.]+)\);', okfix, s)
print('ok buttons', n)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
