import io, re

A, B, BT = 6.6, 4.2, 92.0   # 전체 지연(인트로+표지), 주가 비교 입력창으로 늘어난 시간, 그 기준 시각(원래 타임라인)

def S(t):                   # 원래 전역 시각 → 새 전역 시각 (18.2초 이후 구간)
    return t + A + (B if t >= BT else 0)

def M(g):                   # index 전역 시각 변환
    if g < 8: return g
    if g < 18.2: return 11.5 + 1.3 * (g - 8)
    return S(g)

def fmt(x): return ('%.2f' % x).rstrip('0').rstrip('.')

# ─────────── chrome ───────────
p = 'compositions/chrome.html'; s = io.open(p, encoding='utf-8').read()

# CSS
s = s.replace('#chrome #mark { position: absolute; left: 232px; top: 88px; }',
              '#chrome #mark { position: absolute; left: 232px; top: 88px; transform-origin: 0 0; }\n'
              '      #chrome #introRule { position: absolute; left: 470px; right: 470px; top: 614px; height: 1px; opacity: 0;\n'
              '        background: linear-gradient(90deg, rgba(143,170,220,0) 0%, #8faadc 50%, rgba(143,170,220,0) 100%); transform-origin: center; }')
s = s.replace('      #chrome #conn { position: absolute;',
              '      #chrome #conn rect.glow { fill: rgba(143,170,220,0.10); stroke: #8faadc; stroke-width: 2; opacity: 0;\n'
              '        filter: drop-shadow(0 0 10px rgba(143,170,220,0.85)); }\n'
              '      #chrome #conn .lead { fill: none; stroke: rgba(143,170,220,0.6); stroke-width: 1; opacity: 0; }\n'
              '      #chrome #conn .leadfill { fill: rgba(143,170,220,0.05); stroke: none; opacity: 0; }\n'
              '      #chrome #conn { position: absolute;', 1)
s = s.replace('    <div id="mark">', '    <div id="introRule"></div>\n    <div id="mark">', 1)

# 인트로 재작성
a = s.index('        tl.fromTo(one("#sealWrap"), { opacity: 0, scale: 0.84 }')
b = s.index('        // ── 막마다 리본을 짚는 헬퍼 ──')
INTRO = '''        // ── 1막 · 인트로 ──
        // 1) 선 하나가 화면을 가른다
        tl.fromTo(one("#introRule"), { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 1.2, ease: "power3.inOut" }, 0.15);
        // 2) 인장이 떠오르고 테두리가 천천히 그려진다
        tl.fromTo(one("#sealWrap"), { opacity: 0, x: -361, y: -40, scale: 0.52 },
          { opacity: 1, scale: 0.6, duration: 1.5, ease: "power3.out" }, 0.6);
        tl.fromTo(ring, { strokeDashoffset: C }, { strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut" }, 0.85);
        // 3) 워드마크가 옆으로 열린다
        tl.fromTo(one("#mark"), { opacity: 1, x: 497, y: 340, scale: 2.2, clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: 1.2, ease: "power3.inOut" }, 2.0);
        tl.to(one("#introRule"), { opacity: 0, duration: 0.9 }, 2.9);
        tl.to(one("#ring"), { opacity: 0, duration: 0.7 }, 3.4);
        // 4) 한 박자 머문 뒤 로크업째 좌상단으로
        tl.to(one("#sealWrap"), { x: -788, y: -424, scale: 0.2133, duration: 1.35, ease: "power3.inOut" }, 3.9);
        tl.to(one("#mark"), { x: 0, y: 0, scale: 1, duration: 1.35, ease: "power3.inOut" }, 3.9);
        // 5) 리본 — 선이 먼저 그어지고, 판이 가운데부터 올라온다
        tl.fromTo(one("#hairline"), { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: "power2.inOut" }, 4.8);
        tl.fromTo(q(".group"), { y: 34, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.75, ease: "power3.out", stagger: { each: 0.075, from: "center" } }, 5.2);
        tl.fromTo(q(".gbody"), { opacity: 0 }, { opacity: 0.55, duration: 0.4, ease: "power1.out", stagger: { each: 0.075, from: "center" } }, 5.7);
        tl.fromTo(q(".g-label"), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out", stagger: { each: 0.075, from: "center" } }, 5.7);
        tl.fromTo(q(".tab"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.05 }, 6.2);
        tl.fromTo(one("#sweep"), { x: -280, opacity: 0 }, { x: 1940, opacity: 1, duration: 1.2, ease: "power1.inOut", immediateRender: false }, 6.7);
        tl.to(one("#sweep"), { opacity: 0, duration: 0.25 }, 7.75);
        // 6) 그룹이 왼쪽부터 차례로 켜진다
        tl.fromTo(q(".gbody"), { opacity: 0.55 },
          { opacity: 1, duration: 0.45, ease: "power1.out", stagger: { each: 0.24 }, immediateRender: false }, 7.3);
        tl.fromTo(q(".sbtn span, .lbtn span"), { color: "rgba(247,246,243,0.62)" },
          { color: "rgba(247,246,243,0.92)", duration: 0.45, ease: "power1.out", stagger: { each: 0.03 }, immediateRender: false }, 7.36);
        // 7) 2막으로 — 리본은 위로 붙고 한 톤 가라앉는다
        tl.to(one("#ribbon"), { y: -40, duration: 0.9, ease: "power2.inOut" }, 10.6);
        tl.to(one("#mark"), { y: -18, opacity: 0.5, duration: 0.9, ease: "power2.inOut" }, 10.6);
        tl.to(one("#sealWrap"), { opacity: 0.5, duration: 0.9, ease: "power2.inOut" }, 10.6);


'''
s = s[:a] + INTRO + s[b:]

# 시각 변환 함수 + 헬퍼 안에서 적용
s = s.replace('        const NS = "http://www.w3.org/2000/svg";',
              '        // 원래 타임라인 기준 시각 → 새 시각 (인트로·표지 +%s초, 주가 비교 입력창 이후 +%s초)\n'
              '        function S(t) { return t + %s + (t >= %s ? %s : 0); }\n'
              '        const NS = "http://www.w3.org/2000/svg";' % (A, B, A, BT, B), 1)
for old, new in [
    ('function focusOn(names, t) {', 'function focusOn(names, t) {\n          t = S(t);'),
    ('function focusOff(names, t) {', 'function focusOff(names, t) {\n          t = S(t);'),
    ('function zoomGroup(name, tIn, tOut) {', 'function zoomGroup(name, tIn, tOut) {\n          tIn = S(tIn); tOut = S(tOut);'),
    ('function press(label, t, hold) {', 'function press(label, t, hold) {\n          t = S(t);'),
    ('function dropdown(hostLabel, items, tOpen, tClose) {', 'function dropdown(hostLabel, items, tOpen, tClose) {\n          tOpen = S(tOpen); tClose = S(tClose);'),
]:
    assert old in s, old
    s = s.replace(old, new, 1)
for old in ['}, 134.4);', '}, 134.6);']:
    n = s.count(old); assert n >= 1, old
    s = s.replace(old, '}, %s);' % fmt(S(float(old[3:-2]))))

# 돋보기 투영선 — 리본 그룹에서 패널로
OLD = '''          const dx = gm.x - PX, dy = (gm.y + RIBBON_SHIFT) - PY;'''
NEW = '''          const dx = gm.x - PX, dy = (gm.y + RIBBON_SHIFT) - PY;
          // 어디서 가져왔는지 — 그룹 아래 모서리에서 패널 위 모서리로 투영선
          const gy = gm.y + RIBBON_SHIFT + gm.h, pw = gm.w * PS;
          const pts = [[gm.x, gy, PX, PY], [gm.x + gm.w, gy, PX + pw, PY]];
          const poly = document.createElementNS(NS, "polygon");
          poly.setAttribute("class", "leadfill");
          poly.setAttribute("points", gm.x + "," + gy + " " + (gm.x + gm.w) + "," + gy + " " + (PX + pw) + "," + PY + " " + PX + "," + PY);
          conn.appendChild(poly);
          const leads = pts.map(function (q4) {
            const ln = document.createElementNS(NS, "path");
            ln.setAttribute("class", "lead");
            ln.setAttribute("pathLength", "1");
            ln.setAttribute("d", "M " + q4[0] + " " + q4[1] + " L " + q4[2] + " " + q4[3]);
            ln.style.strokeDasharray = "1"; ln.style.strokeDashoffset = "1";
            conn.appendChild(ln);
            return ln;
          });
          tl.to(leads, { opacity: 1, duration: 0.1 }, tIn + 0.05);
          tl.fromTo(leads, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: "power2.out", immediateRender: false }, tIn + 0.05);
          tl.fromTo(poly, { opacity: 0 }, { opacity: 1, duration: 0.5, immediateRender: false }, tIn + 0.35);
          tl.to(leads.concat([poly]), { opacity: 0, duration: 0.7, ease: "power1.in" }, tIn + 1.9);'''
assert OLD in s; s = s.replace(OLD, NEW, 1)

# 연결선 루프 — 시각 변환 + 반짝임(glow) 모드
a = s.index('        CONN.forEach(function (L) {')
b = s.index('        if (document.fonts && document.fonts.ready) {', a)
LOOP = '''        CONN.forEach(function (L) {
          const T = (L.at != null) ? L.at : S(L.t);
          const b = B(L.btn);
          if (!b) return;
          if (L.r) {
            // 후반부 — 선 대신 결과물 자리가 버튼과 함께 반짝인다
            const rr = document.createElementNS(NS, "rect");
            rr.setAttribute("class", "glow");
            rr.setAttribute("x", L.r[0]); rr.setAttribute("y", L.r[1]);
            rr.setAttribute("width", L.r[2]); rr.setAttribute("height", L.r[3]);
            rr.setAttribute("rx", "6");
            conn.appendChild(rr);
            tl.fromTo(rr, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "power2.out", immediateRender: false }, T);
            tl.to(rr, { opacity: 0.35, duration: 0.22, yoyo: true, repeat: 1, ease: "power1.inOut" }, T + 0.2);
            tl.to(rr, { opacity: 0, duration: 0.45, ease: "power1.out" }, T + (L.out || 1.1));
            return;
          }
          const p = document.createElementNS(NS, "path");
          p.setAttribute("pathLength", "1");
          p.setAttribute("d", pathFor(b, L));
          p.style.strokeDasharray = "1";
          p.style.strokeDashoffset = "1";
          conn.appendChild(p);
          const dot = document.createElementNS(NS, "circle");
          dot.setAttribute("cx", L.ex); dot.setAttribute("cy", L.ey); dot.setAttribute("r", "4.5");
          conn.appendChild(dot);
          drawn.push({ b: b, p: p, L: L });
          tl.to(p, { opacity: 1, duration: 0.08 }, T);
          tl.fromTo(p, { strokeDashoffset: 1 },
            { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut", immediateRender: false }, T);
          tl.fromTo(dot, { opacity: 0, scale: 0.4 },
            { opacity: 1, scale: 1, duration: 0.22, ease: "back.out(3)", immediateRender: false }, T + 0.38);
          tl.to([p, dot], { opacity: 0, duration: 0.3, ease: "power1.out" }, T + L.out);
        });

'''
s = s[:a] + LOOP + s[b:]

# 후반부 연결 목록 교체 — 주석부터는 반짝임
a = s.index('          { t: 76.70, btn: "빨간 글"')
b = s.index('        ];', a)
TAIL = '''          { t: 76.70, btn: "빨간 글",     r: [644, 487, 132, 22], out: 1.0 },
          { t: 78.30, btn: "화살표",     r: [788, 510, 96, 56],  out: 1.0 },
          { t: 79.90, btn: "강조 상자",   r: [1046, 525, 164, 105], out: 1.0 },
          { t: 81.50, btn: "폭 맞추기",   r: [618, 480, 688, 194], out: 1.0 },
          { t: 82.90, btn: "점선 상자",   r: [897, 521, 124, 112], out: 1.0 },
          { t: 84.30, btn: "점선 원",     r: [727, 558, 76, 60],  out: 1.0 },
          { at: %s, btn: "주가 비교",   r: [961, 730, 344, 130], out: 1.3 },
          { t: 93.30, btn: "모델 값",     ex: 845, ey: 800, out: 1.0 },
          { t: 98.40, btn: "코펍 볼드",   r: [880, 603, 400, 50], out: 0.9 },
          { t: 99.80, btn: "코펍 미디움", r: [880, 603, 400, 50], out: 0.9 },
          { t: 101.20, btn: "코펍 라이트", r: [880, 603, 400, 50], out: 0.9 },
          { t: 102.60, btn: "윤고딕 540", r: [660, 900, 830, 28], out: 1.0 },
          { t: 111.60, btn: "필드 갱신",   r: [730, 704, 460, 96], out: 1.6 },
          { t: 116.00, btn: "양식 점검",   r: [876, 598, 580, 290], out: 1.4 },
          { t: 120.20, btn: "내용 점검",   r: [876, 598, 580, 290], out: 1.4 },
''' % fmt(101.4)
s = s[:a] + TAIL + s[b:]
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('chrome ok')

# ─────────── cover ───────────
p = 'compositions/cover.html'; s = io.open(p, encoding='utf-8').read()
def cv(m):
    v = float(m.group(2))
    v2 = v * 1.3 if v < 10.2 else v + 3.1
    return m.group(1) + fmt(v2) + m.group(3)
s2 = re.sub(r'(\}\s*,\s*)(\d+(?:\.\d+)?)(\s*\);)', cv, s)
s2 = re.sub(r'(\]\s*,\s*\{[^{}]*\}\s*,\s*\{[^{}]*\}\s*,\s*)(\d+(?:\.\d+)?)(\s*\);)', cv, s2)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s2)
print('cover ok')

# ─────────── body ───────────
p = 'compositions/body.html'; s = io.open(p, encoding='utf-8').read()
def bv(m):
    v = float(m.group(2)); return m.group(1) + fmt(v + (B if v >= 65.2 else 0)) + m.group(3)
s = re.sub(r'(\}\s*,\s*)(\d+(?:\.\d+)?)(\s*\);)', bv, s)
s = re.sub(r'(cam\((?:\w+|\{[^}]*\}),\s*)(\d+(?:\.\d+)?)(\s*[,)])', bv, s)
s = s.replace('tl.to(one("#ph2b"), { opacity: 0, duration: 0.25 }, 63.7);', 'tl.to(one("#ph2b"), { opacity: 0, duration: 0.25 }, 68);')
s = s.replace('tl.fromTo(one("#chCmp"), { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" }, 63.7);',
              'tl.fromTo(one("#chCmp"), { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" }, 68);')
s = s.replace('<text x="173" y="9">KOSPI</text>', '<text x="173" y="9">SK하이닉스</text>')
# 엑셀 표 글자는 검정
s = s.replace('#bodyp .xtab td { padding: 0 6px; text-align: center; border-bottom: 1px solid #e3e3e3; }',
              '#bodyp .xtab td { padding: 0 6px; text-align: center; border-bottom: 1px solid #e3e3e3; color: #1a1a1a; }')
# 목차 — 실물대로 가운데 정렬
s = s.replace('#tocT { position: absolute; left: 205.8px; top: 110px; font-size: 22px; font-weight: 700; letter-spacing: 0.16em; }',
              '#tocT { position: absolute; left: 0; right: 0; top: 124px; text-align: center; font-size: 17px; font-weight: 700; color: #203864; letter-spacing: 0.08em; }')
s = s.replace('#tocL { position: absolute; left: 205.8px; right: 21.9px; top: 168px; }',
              '#tocL { position: absolute; left: 137px; right: 137px; top: 172px; }')
s = s.replace('#bodyp .tr { display: flex; align-items: baseline; font-size: 13px; font-weight: 500; line-height: 30px; }',
              '#bodyp .tr { display: flex; align-items: baseline; font-size: 14.5px; font-weight: 700; color: #203864; line-height: 28px; }')
s = s.replace('#bodyp .tr.sub { font-size: 11.5px; font-weight: 300; padding-left: 16px; }',
              '#bodyp .tr.sub { font-size: 13.4px; font-weight: 300; color: #1a1a1a; padding-left: 24px; }')
s = s.replace('#bodyp .tr .dots { flex: 1; border-bottom: 1px dotted #9aa3b5; margin: 0 8px 4px; }',
              '#bodyp .tr .dots { flex: 1; border-bottom: 2px dotted #b8bfcc; margin: 0 8px 5px; }')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('body ok')

# ─────────── index ───────────
p = 'index.html'; s = io.open(p, encoding='utf-8').read()
TOTAL = S(142.0)
s = s.replace('data-start="0" data-duration="142" data-width="1920"', 'data-start="0" data-duration="%s" data-width="1920"' % fmt(TOTAL))
s = s.replace('data-composition-id="chrome" data-start="0" data-duration="142"', 'data-composition-id="chrome" data-start="0" data-duration="%s"' % fmt(TOTAL))
s = s.replace('data-composition-id="cover" data-start="8" data-duration="19"', 'data-composition-id="cover" data-start="11.5" data-duration="22.1"')
s = s.replace('data-composition-id="bodyp" data-start="26.8" data-duration="115.2"',
              'data-composition-id="bodyp" data-start="33.4" data-duration="%s"' % fmt(TOTAL - 33.4))
s = s.replace('id="cap1" data-start="6.0" data-duration="2.6"', 'id="cap1" data-start="8.4" data-duration="3.0"')
s = s.replace('}, 6.2);\n      tl.to("#cap1", { opacity: 0, duration: 0.4, ease: "power1.in" }, 8.1);',
              '}, 8.6);\n      tl.to("#cap1", { opacity: 0, duration: 0.5, ease: "power1.in" }, 10.8);')
# 캡션·오버레이 시작/길이
def ds(m):
    st, du = float(m.group(1)), float(m.group(2))
    if st < 8: return m.group(0)
    a2, b2 = M(st), M(st + du)
    return 'data-start="%s" data-duration="%s"' % (fmt(a2), fmt(b2 - a2))
s = re.sub(r'data-start="(\d+(?:\.\d+)?)" data-duration="(\d+(?:\.\d+)?)" data-track-index="2"',
           lambda m: ds(m) + ' data-track-index="2"', s)
s = re.sub(r'(cap\("#\w+",\s*)(\d+(?:\.\d+)?)(,\s*)(\d+(?:\.\d+)?)(\);)',
           lambda m: m.group(1) + fmt(M(float(m.group(2)))) + m.group(3) + fmt(M(float(m.group(4)))) + m.group(5), s)
def iv(m):
    v = float(m.group(2))
    return m.group(1) + (fmt(M(v)) if v >= 11 else m.group(2)) + m.group(3)
s = re.sub(r'(\}\s*,\s*)(\d+(?:\.\d+)?)(\s*\);)', iv, s)

# 주가 비교 입력창 (워드 InputBox)
CSS = '''
      /* 주가 비교 입력창 */
      .dlg { position: absolute; left: 1000px; width: 480px; top: 470px; opacity: 0; z-index: 6;
        background: #f3f3f3; border: 1px solid #9aa3b5; border-radius: 6px; overflow: hidden;
        box-shadow: 0 24px 60px rgba(0,0,0,0.55); font-family: "Pretendard", sans-serif; transform-origin: 50% 40%; }
      .dlg .tb { background: #ffffff; padding: 10px 16px; font-size: 14px; font-weight: 500; color: #1a1a1a; border-bottom: 1px solid #ddd; }
      .dlg .bd { padding: 16px 18px 18px; }
      .dlg .msg { font-size: 14px; color: #1a1a1a; line-height: 1.5; margin-bottom: 12px; }
      .dlg .in { background: #fff; border: 1px solid #2f5597; padding: 8px 10px; font-size: 16px; color: #1a1a1a; height: 38px;
        white-space: nowrap; overflow: hidden; }
      .dlg .in span { display: inline-block; white-space: nowrap; }
      .dlg .btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
      .dlg .bt { padding: 6px 20px; font-size: 14px; border: 1px solid #adadad; background: #e5e5e5; color: #1a1a1a; border-radius: 3px; }
      .dlg .bt.ok { border-color: #2f5597; }
'''
s = s.replace('    </style>', CSS + '    </style>', 1)
T0 = S(90.4)  # 주가 비교 누름
HTML = '''      <div class="dlg clip" id="dlg1" data-start="%s" data-duration="2.8" data-track-index="3">
        <div class="tb">RFS 주가 비교</div>
        <div class="bd"><div class="msg">비교할 티커를 쉼표로 (첫 번째가 기준)</div>
          <div class="in"><span id="dt1">005930.KS, 000660.KS</span></div>
          <div class="btns"><div class="bt ok" id="ok1">확인</div><div class="bt">취소</div></div></div>
      </div>
      <div class="dlg clip" id="dlg2" data-start="%s" data-duration="1.7" data-track-index="3">
        <div class="tb">RFS 주가 비교</div>
        <div class="bd"><div class="msg">시작일 (YYYY-MM-DD) — 이 날을 100으로 맞춥니다</div>
          <div class="in"><span id="dt2">2025-09-24</span></div>
          <div class="btns"><div class="bt ok" id="ok2">확인</div><div class="bt">취소</div></div></div>
      </div>
''' % (fmt(T0 + 0.25), fmt(T0 + 2.95))
s = s.replace('      <div class="end clip" id="endMsg"', HTML + '      <div class="end clip" id="endMsg"', 1)
TL = '''      // 주가 비교 입력창 — 티커 → 시작일
      tl.fromTo("#dlg1", { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.25, ease: "power2.out" }, %(a)s);
      tl.fromTo("#dt1", { clipPath: "inset(0 100%% 0 0)" }, { clipPath: "inset(0 0%% 0 0)", duration: 1.3, ease: "steps(20)" }, %(b)s);
      tl.fromTo("#ok1", { backgroundColor: "#e5e5e5" }, { backgroundColor: "#cfe0ff", duration: 0.12, yoyo: true, repeat: 1 }, %(c)s);
      tl.to("#dlg1", { opacity: 0, scale: 0.97, duration: 0.2 }, %(d)s);
      tl.fromTo("#dlg2", { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out" }, %(e)s);
      tl.fromTo("#dt2", { clipPath: "inset(0 100%% 0 0)" }, { clipPath: "inset(0 0%% 0 0)", duration: 0.7, ease: "steps(10)" }, %(f)s);
      tl.fromTo("#ok2", { backgroundColor: "#e5e5e5" }, { backgroundColor: "#cfe0ff", duration: 0.12, yoyo: true, repeat: 1 }, %(g)s);
      tl.to("#dlg2", { opacity: 0, scale: 0.97, duration: 0.2 }, %(h)s);

      window.__timelines["main"] = tl;''' % dict(a=fmt(T0+0.3), b=fmt(T0+0.75), c=fmt(T0+2.4), d=fmt(T0+2.8),
                                                   e=fmt(T0+2.95), f=fmt(T0+3.25), g=fmt(T0+4.1), h=fmt(T0+4.4))
s = s.replace('      window.__timelines["main"] = tl;', TL, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('index ok  total', fmt(TOTAL))
