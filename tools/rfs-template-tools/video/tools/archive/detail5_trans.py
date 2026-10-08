# 디테일 5단계 · 장면 전환 — 리본 강조 막대가 그룹에서 그룹으로 미끄러지고, 설명글은 위로 빠진다
import io
def rep(s, a, b):
    assert a in s, a
    return s.replace(a, b, 1)

p = 'compositions/chrome.html'; s = io.open(p, encoding='utf-8').read()
s = rep(s, '      #chrome .group .focusbar {', '      #chrome .group .focusbar { display: none; }\n'
        '      #chrome #slider { position: absolute; left: 0; top: 46px; width: 100px; height: 3px; background: #8faadc; opacity: 0;\n'
        '        transform-origin: left center; box-shadow: 0 0 10px rgba(143,170,220,0.8); z-index: 3; pointer-events: none; }\n'
        '      #chrome .group .focusbar {')
s = rep(s, '      <div data-hf-id="hf-psid" id="groups"></div>', '      <div data-hf-id="hf-psid" id="groups"></div>\n      <div id="slider"></div>')
s = rep(s, '        function focusOn(names, t) {\n          t = SH(t);', '        const FOC = [];\n        function focusOn(names, t) {\n          t = SH(t);\n          FOC.push({ t: t, on: true, name: names[0] });')
s = rep(s, '        function focusOff(names, t) {\n          t = SH(t);', '        function focusOff(names, t) {\n          t = SH(t);\n          FOC.push({ t: t, on: false });')
s = rep(s, '        const CONN = [', '''        // 강조 막대 하나가 그룹에서 그룹으로 옮겨 간다 (잠깐 비는 사이에는 사라지지 않는다)
        (function () {
          const sl = one("#slider");
          FOC.sort(function (a, b) { return a.t - b.t; });
          let shown = false;
          FOC.forEach(function (f, i) {
            if (f.on) {
              const gm = GEOM[f.name];
              const x = gm.x - 24, sx = gm.w / 100;
              if (!shown) {
                tl.set(sl, { x: x, scaleX: sx }, f.t);
                tl.to(sl, { opacity: 1, duration: 0.35, ease: "power1.out" }, f.t);
              } else {
                tl.to(sl, { x: x, scaleX: sx, duration: 0.6, ease: "power3.inOut" }, f.t);
              }
              shown = true;
            } else {
              const nx = FOC[i + 1];
              if (nx && nx.on && nx.t - f.t < 1.2) return;
              tl.to(sl, { opacity: 0, duration: 0.35, ease: "power1.in" }, f.t);
              shown = false;
            }
          });
        })();

        const CONN = [''')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

p = 'index.html'; s = io.open(p, encoding='utf-8').read()
s = rep(s, '        tl.to(id, { opacity: 0, duration: 0.45, ease: "power1.in" }, tOut);',
        '        tl.to(id, { opacity: 0, y: -10, duration: 0.45, ease: "power1.in" }, tOut);')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
