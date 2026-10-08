import io, re
# ── index: 시작 경로를 커서가 눌러 따라간다 · 끝에 리본 그림자 제거 · 엔딩 문구
p = 'index.html'; s = io.open(p, encoding='utf-8').read()
def rep(a, b):
    global s
    assert a in s, a
    s = s.replace(a, b, 1)
rep('      #start .sep {', '      #cur0 { position: absolute; left: 0; top: 0; width: 26px; height: 30px; opacity: 0; z-index: 7; pointer-events: none; }\n      #start .sep {')
rep('      <div id="start" class="clip"',
    '      <svg id="cur0" viewBox="0 0 26 30"><path d="M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26.2 L12 17 L20 17 Z" fill="#f7f6f3" stroke="#0f1b2e" stroke-width="1.6" stroke-linejoin="round" /></svg>\n      <div id="start" class="clip"')
a = s.index('      ["#st1", "#st2", "#st3", "#st4"].forEach(function (id, i) {')
b = s.index('      tl.to("#start", { opacity: 0, y: -8, duration: 0.45, ease: "power1.in" }, 10.85);')
s = s[:a] + '''      // 커서가 한 칸씩 눌러 따라간다 (좌표는 재생 시점에 읽는다)
      function at(id, fx, fy) { const r = document.querySelector(id).getBoundingClientRect(); const R = document.getElementById("root").getBoundingClientRect(); const k = R.width / 1920; return [(r.left - R.left) / k + r.width / k * fx, (r.top - R.top) / k + r.height / k * fy]; }
      tl.fromTo("#cur0", { opacity: 0, x: 1180, y: 900 }, { opacity: 1, duration: 0.2 }, 8.45);
      ["#st1", "#st2", "#st3", "#st4"].forEach(function (id, i) {
        const tc = 8.95 + i * 0.45;
        tl.to("#cur0", { x: function () { return at(id, 0.55, 0.6)[0]; }, y: function () { return at(id, 0.55, 0.6)[1]; }, duration: 0.32, ease: "power2.inOut" }, tc - 0.36);
        tl.to("#cur0", { scale: 0.82, duration: 0.08, yoyo: true, repeat: 1 }, tc);
        tl.to(id, { color: "rgba(247,246,243,0.95)", backgroundColor: "rgba(143,170,220,0.16)", borderColor: "rgba(143,170,220,0.7)", duration: 0.15 }, tc);
        tl.to(id, { scale: 0.94, duration: 0.08, yoyo: true, repeat: 1 }, tc);
        if (i < 3) tl.to(id, { backgroundColor: "rgba(143,170,220,0)", borderColor: "rgba(143,170,220,0)", duration: 0.3 }, tc + 0.3);
      });
      tl.to("#cur0", { opacity: 0, duration: 0.3 }, 10.7);
''' + s[b:]
s = re.sub(r'(id="endMsg"[^>]*>)[^<]*<', r'\g<1>좋은 리포트 기대하겠습니다.<', s)
rep('      tl.to("#topfade", { opacity: 1, duration: 0.6 }, 11.4);   // 리본이 붙은 뒤에만 그림자',
    '      tl.to("#topfade", { opacity: 1, duration: 0.6 }, 11.4);   // 리본이 붙은 뒤에만 그림자\n'
    '      tl.to("#topfade", { opacity: 0, duration: 0.8 }, 141.9);  // 리본이 빠지면 그림자도')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# 효과음: 칸 클릭
p = 'tools/events.py'; e = io.open(p, encoding='utf-8').read()
e = e.replace('for i in range(4): ev(8.75 + i * 0.4, "softclick", gain=0.4)\nev(10.3, "click", gain=0.9)',
              'for i in range(4): ev(8.95 + i * 0.45, "click", gain=0.8)')
io.open(p, 'w', encoding='utf-8', newline='\n').write(e)

# ── body: 폭 맞추기는 폭만 (높이는 그대로)
p = 'compositions/body.html'; s = io.open(p, encoding='utf-8').read()
rep('        gsap.set(one("#chWrap"), { scale: 0.74 });', '        gsap.set(one("#chWrap"), { width: "74%" });')
rep('        tl.to(one("#chWrap"), { scale: 1, duration: 0.7, ease: "power3.inOut" }, 54.75);',
    '        tl.to(one("#chWrap"), { width: "100%", duration: 0.7, ease: "power3.inOut" }, 54.75);')
rep('strip(n, "transform", n.id === "chWrap" ? "scale(" + (f.chs || 1) + ")" : "none");',
    'strip(n, "transform", "none"); if (n.id === "chWrap") strip(n, "width", ((f.chs || 1) * 100) + "%");')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
