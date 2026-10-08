import io, re

# ══════════ body: 결과물로 들어가는 카메라 ══════════
p = 'compositions/body.html'; s = io.open(p, encoding='utf-8').read()
if 'const FOCUS = [];' not in io.open('compositions/body.html', encoding='utf-8').read():
    BODY_DONE = 'const FOCUS = [];' in s
    old = s[s.index('          if (opt.punch !== false) {'):s.index('        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { FX.forEach(place); });')]
    s = s.replace(old, '''          if (opt.punch !== false) FOCUS.push({ t: t, f: f, fx: opt.fx, max: opt.max });
            }
    ''')
    s = s.replace('        const FX = [];', '        const FX = [];\n        const FOCUS = [];')
    cam = '''        // ── 카메라: 버튼을 누르면 바뀌는 자리로 들어가고, 같은 막 안에서는 결과에서 결과로 미끄러진다 ──
            // 화면 좌표 = 960 + (px - 360)·s + x,  520 + py·s + y   (W 의 기준점이 위 가운데)
            function focusCam() {
              FOCUS.sort(function (a, b) { return a.t - b.t; });
              function baseAt(t) { let b = CAMS[0]; CAMS.forEach(function (k) { if (k.t <= t) b = k; }); return b; }
              function camBetween(a, b) { return CAMS.some(function (k) { return k.t > a && k.t < b; }); }
              FOCUS.forEach(function (F, i) {
                const f = F.f, hostTop = f.host === BP ? 0 : f.host.offsetTop;
                const FXp = F.fx || 1250, FYp = 745;
                function sc() {
                  const w = parseFloat(f.box.style.width), h = parseFloat(f.box.style.height);
                  return Math.max(1.25, Math.min(F.max || 2.2, 980 / w, 500 / h));
                }
                const tIn = F.t - 0.55;
                tl.to(W, {
                  scale: function () { return sc(); },
                  x: function () { const k = sc(); return FXp - 960 - (f.cx - 360) * k; },
                  y: function () { const k = sc(); return FYp - 520 - (f.cy + hostTop) * k; },
                  duration: 0.7, ease: "power3.inOut"
                }, tIn);
                const nx = FOCUS[i + 1];
                if (nx && nx.t - F.t <= 2.7 && !camBetween(F.t, nx.t)) return;   // 다음 결과로 바로 넘어간다
                const b = baseAt(F.t);
                let tOut = F.t + 1.35;
                const nextCam = CAMS.filter(function (k) { return k.t > F.t; })[0];
                if (nextCam) tOut = Math.min(tOut, nextCam.t - 0.85);
                tl.to(W, { scale: b.c.scale, x: b.c.x, y: b.c.y, duration: 0.8, ease: "power2.inOut" }, Math.max(tOut, F.t + 0.35));
              });
            }
    '''
    s = s.replace('        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { FX.forEach(place); });',
                  '        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { FX.forEach(place); });\n' + cam)
    # 점검 장면 — 요약 창이 오른쪽에 뜨므로 왼쪽에 맞춘다
    s = s.replace('        drift();\n', '''        fx("#p2, #wd1", 93.5, "pop", { punch: true, fx: 1010, max: 1.9 });
            fx("#fg3", 97.7, "pop", { fx: 1010, max: 1.8 });
            focusCam();
    ''')
    # 점검 fx 는 빛 상자 없이 카메라만
    s = s.replace('''          if (mode === "sel") {''', '''          if (opt.camOnly) {
                // 빛 상자 없이 카메라만
              } else if (mode === "sel") {''')
    s = s.replace('fx("#p2, #wd1", 93.5, "pop", { punch: true, fx: 1010, max: 1.9 });', 'fx("#p2, #wd1", 93.5, "pop", { camOnly: true, fx: 1010, max: 1.9 });')
    s = s.replace('fx("#fg3", 97.7, "pop", { fx: 1010, max: 1.8 });', 'fx("#fg3", 97.7, "pop", { camOnly: true, fx: 1010, max: 1.8 });')
    # 왼쪽 자막 칸을 덮지 않도록 문서 층의 왼쪽을 부드럽게 지운다
    o = '#bodyp { width: 100%; height: 100%; position: relative; clip-path: inset(404px 0 0 0); }'
    assert o in s
    s = s.replace(o, '#bodyp { width: 100%; height: 100%; position: relative; clip-path: inset(404px 0 0 0);\n'
                     '        -webkit-mask-image: linear-gradient(90deg, transparent 560px, #000 604px); mask-image: linear-gradient(90deg, transparent 560px, #000 604px); }')
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ══════════ cover: 틀은 표지와 함께, 주가 차트는 클로즈업으로 따라간다 ══════════
p = 'compositions/cover.html'; s = io.open(p, encoding='utf-8').read()
R = [
 ('#cover { width: 100%; height: 100%; position: relative; clip-path: inset(404px 0 0 0); }',
  '#cover { width: 100%; height: 100%; position: relative; clip-path: inset(404px 0 0 0);\n'
  '        -webkit-mask-image: linear-gradient(90deg, transparent 560px, #000 604px); mask-image: linear-gradient(90deg, transparent 560px, #000 604px); }\n'
  '      #cover .tag { position: absolute; opacity: 0; font-size: 6.6px; font-weight: 700; color: #fff; padding: 1.6px 5px; border-radius: 2px; white-space: nowrap; letter-spacing: 0.02em; }\n'
  '      #cover .tag.auto { background: #2f5597; }\n'
  '      #cover .tag.man { background: #c55a11; }\n'
  '      #cover .mbox { position: absolute; opacity: 0; border: 1.2px dashed #c55a11; border-radius: 2px; }\n'
  '      #cover .abox { position: absolute; opacity: 0; border: 1.2px solid rgba(47,85,151,0.75); border-radius: 2px; background: rgba(143,170,220,0.12); }'),
 # 틀은 표지를 만들 때 함께 (늦게 나오지 않게)
 ('tl.fromTo([one("#sdT"), one("#sdR")], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 7.1);',
  'tl.fromTo([one("#sdT"), one("#sdR")], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 5.35);'),
 ('tl.fromTo(q("#sd .sdr"), { opacity: 0 }, { opacity: 1, duration: 0.22, stagger: 0.05 }, 5.65);',
  'tl.fromTo(q("#sd .sdr"), { opacity: 0 }, { opacity: 1, duration: 0.22, stagger: 0.05 }, 5.55);'),
 ('tl.fromTo([one("#spT"), one("#spR"), one("#spAx"), one("#spXl")], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 8.28);',
  'tl.fromTo([one("#spT"), one("#spR"), one("#spAx"), one("#spXl")], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 6.1);'),
]
for a, b in R:
    assert a in s, a; s = s.replace(a, b)
o = '        tl.to(one("#pagesWrap"), { scale: 1, x: 0, y: 0, duration: 1.2, ease: "power2.inOut" }, 13.4);\n'
assert o in s; s = s.replace(o, '')
# 3막 카메라 재작성
a = s.index('        // 2) 표지 티커가 한 번 반짝 — 이 값을 읽어간다')
b = s.index('        tl.to(one("#pagesWrap"), { opacity: 0, y: 40, duration: 0.6, ease: "power2.in" }, 21.4);')
# 화면 좌표 = 600 + px·s + x, 520 + py·s + y (왼쪽 위 기준). 초점 (1250, 745)
def C(px, py, sc): return (round(650 - px * sc, 1), round(225 - py * sc, 1))
tk = C(228, 142, 2.3); sd = C(602, 410, 2.9); sp = C(600, 598, 2.9); bx = C(602, 270, 2.9)
s = s[:a] + '''        // 2) 누르기 직전 — 표지 티커에 다가간다
        tl.to(one("#pagesWrap"), { scale: 2.3, x: %s, y: %s, duration: 1.1, ease: "power3.inOut" }, 13.6);
        tl.fromTo(one("#nameL"), { color: "#f2f2f2" },
          { color: "#cfe0ff", duration: 0.35, yoyo: true, repeat: 1, immediateRender: false }, 15.0);
        tl.fromTo(one("#tkBox"), { opacity: 0 }, { opacity: 1, duration: 0.2, yoyo: true, repeat: 1, repeatDelay: 0.3 }, 15.0);

        // 3) 티커를 읽어 Stock Data 로 — 채워지는 칸과 직접 칠 칸
        tl.to(one("#pagesWrap"), { scale: 2.9, x: %s, y: %s, duration: 1.0, ease: "power3.inOut" }, 15.6);
        tl.to(q("#sd .av"), { opacity: 1, duration: 0.24, ease: "power1.out", stagger: 0.12 }, 16.4);
        tl.fromTo([one("#sdA"), one("#sdAt")], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 17.2);
        tl.fromTo([one("#sdM"), one("#sdMt")], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 17.45);

        // 4) 아래로 — Stock Price 가 그려진다
        tl.to(one("#pagesWrap"), { scale: 2.9, x: %s, y: %s, duration: 0.8, ease: "power3.inOut" }, 18.0);
        tl.to(sp, { strokeDashoffset: 0, duration: 1.1, ease: "power1.inOut" }, 18.4);
        tl.fromTo(one("#spAt"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, 19.1);

        // 5) 위로 — 남색 박스: 현재주가만 자동, 나머지는 직접
        tl.to(one("#pagesWrap"), { scale: 2.9, x: %s, y: %s, duration: 0.7, ease: "power3.inOut" }, 19.35);
        tl.to(q("#box .av"), { opacity: 1, duration: 0.3, ease: "power1.out" }, 19.9);
        tl.fromTo([one("#bxA"), one("#bxAt")], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 20.05);
        tl.fromTo([one("#bxM1"), one("#bxM2"), one("#bxMt")], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 20.25);

        // 6) 완성된 표지 전체 — 표시는 남겨 둔다
        tl.to(one("#pagesWrap"), { scale: 1, x: 0, y: 0, duration: 0.8, ease: "power2.inOut" }, 20.65);
''' % (tk + sd + sp + bx) + s[b:]
s = s.replace('tl.to(one("#pagesWrap"), { opacity: 0, y: 40, duration: 0.6, ease: "power2.in" }, 21.4);',
              'tl.to(one("#pagesWrap"), { opacity: 0, y: 40, duration: 0.5, ease: "power2.in" }, 21.55);')
# 표시 요소 (페이지 좌표)
marks = '''
        <div class="abox" id="tkBox" style="left:30px; top:114px; width:392px; height:54px; border-color:#cfe0ff; background:rgba(207,224,255,0.12)"></div>
        <div class="abox" id="sdA" style="left:500px; top:353px; width:205px; height:86px"></div>
        <div class="abox" id="sdA2" style="left:500px; top:465px; width:205px; height:16px"></div>
        <div class="tag auto" id="sdAt" style="left:452px; top:356px">자동</div>
        <div class="mbox" id="sdM" style="left:500px; top:437px; width:205px; height:29px"></div>
        <div class="tag man" id="sdMt" style="left:437px; top:444px">직접 입력</div>
        <div class="tag auto" id="spAt" style="left:452px; top:548px">자동</div>
        <div class="abox" id="bxA" style="left:511px; top:268px; width:183px; height:32px"></div>
        <div class="tag auto" id="bxAt" style="left:463px; top:277px">자동</div>
        <div class="mbox" id="bxM1" style="left:511px; top:206px; width:183px; height:63px"></div>
        <div class="mbox" id="bxM2" style="left:511px; top:299px; width:183px; height:33px"></div>
        <div class="tag man" id="bxMt" style="left:448px; top:231px">직접 입력</div>
'''
import re as _re
m = _re.search(r'        <div[^>]*id="rtT">Research Team 3</div>', s)
assert m; s = s[:m.start()] + marks + s[m.start():]
s = s.replace('tl.fromTo([one("#sdA"), one("#sdAt")], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 17.2);',
              'tl.fromTo([one("#sdA"), one("#sdA2"), one("#sdAt")], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 17.2);')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# 자막
p = 'index.html'; s = io.open(p, encoding='utf-8').read()
o = '표지 티커로 1년치 주가와 Stock Data를 받아옵니다'
assert o in s; s = s.replace(o, '티커로 주가·Stock Data를 채웁니다. 투자의견·목표주가·주요주주는 직접')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok', tk, sd, sp, bx)
