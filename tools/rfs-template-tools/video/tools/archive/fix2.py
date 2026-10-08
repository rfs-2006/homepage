import io, re

# ══════════ 지적 사항 수정 ══════════

# ── A. 리본 첫 그룹이 화면 왼쪽에서 잘린다 → 좌우 여백 24px ──
p = 'compositions/chrome.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace('#chrome #ribbon { position: absolute; left: 0px; top: 206px; width: 1920px; }',
              '#chrome #ribbon { position: absolute; left: 24px; top: 206px; width: 1872px; }')
s = s.replace("var w = (g.basis / total) * 1920;\n          GEOM[g.name] = { x: _cum, y: 252, w: w, h: 150 };",
              "var w = (g.basis / total) * 1872;\n          GEOM[g.name] = { x: 24 + _cum, y: 252, w: w, h: 150 };")
s = s.replace('#chrome #tabRow { height: 44px; display: flex; align-items: flex-end; gap: 26px; padding-left: 44px; }',
              '#chrome #tabRow { height: 44px; display: flex; align-items: flex-end; gap: 26px; padding-left: 20px; }')

# ── F. 연결선이 자막을 가로지른다 → 위로 붙어 가다가 끝에서 내려온다 ──
OLD = '''          const midY = sy + (L.ey - sy) * 0.55;
          const cx2 = L.side === "right" ? L.ex + 190 : L.ex - 170;
          return "M " + sx.toFixed(1) + " " + sy.toFixed(1) +
                 " C " + sx.toFixed(1) + " " + midY.toFixed(1) +
                 ", " + cx2.toFixed(1) + " " + L.ey.toFixed(1) +
                 ", " + L.ex.toFixed(1) + " " + L.ey.toFixed(1);'''
NEW = '''          // 자막 위를 지나가지 않도록 리본 높이를 유지하다가 목표 근처에서 내려온다
          const cx1 = sx + (L.ex - sx) * 0.52;
          const cx2 = L.side === "right" ? L.ex + 150 : L.ex - 150;
          return "M " + sx.toFixed(1) + " " + sy.toFixed(1) +
                 " C " + cx1.toFixed(1) + " " + sy.toFixed(1) +
                 ", " + cx2.toFixed(1) + " " + L.ey.toFixed(1) +
                 ", " + L.ex.toFixed(1) + " " + L.ey.toFixed(1);'''
assert OLD in s; s = s.replace(OLD, NEW)

# ── E. 페이지를 자막에서 떼어놓는다 (tx -40 → +40) → 연결선 끝점도 이동 ──
for old, new in [
    ('ex:  793, ey: 631', 'ex:  873, ey: 631'),
    ('ex:  791, ey: 698', 'ex:  871, ey: 698'),
    ('ex:  793, ey: 727', 'ex:  873, ey: 727'),
    ('ex:  793, ey: 765', 'ex:  873, ey: 765'),
    ('ex:  793, ey: 795', 'ex:  873, ey: 795'),
    ('ex:  572, ey: 800', 'ex:  652, ey: 800'),
]:
    assert old in s, old
    s = s.replace(old, new)

# ── H. 9막 튕김을 과하지 않게 ──
s = s.replace('{ scale: 1.7, duration: 0.22, ease: "back.out(2.6)", immediateRender: false }, t);',
              '{ scale: 1.42, duration: 0.24, ease: "back.out(1.9)", immediateRender: false }, t);')
s = s.replace('tl.to(rg, { opacity: 0, scale: 1.7, duration: 0.5, ease: "power2.out" }, t + 0.12);',
              'tl.to(rg, { opacity: 0, scale: 1.5, duration: 0.5, ease: "power2.out" }, t + 0.12);')
s = s.replace('filter: drop-shadow(0 20px 46px rgba(0,0,0,0.6)); }',
              'filter: drop-shadow(0 16px 38px rgba(0,0,0,0.5)); }')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('chrome 수정 완료')

# ── body ──
p = 'compositions/body.html'
s = io.open(p, encoding='utf-8').read()

# E. 카메라 x 를 +40 으로
s = s.replace('{ scale: 1.2, x: -40, y: -26, duration: 1.0, ease: "power2.inOut" }, 0.6);',
              '{ scale: 1.2, x: 40, y: -26, duration: 1.0, ease: "power2.inOut" }, 0.6);')
s = s.replace('{ scale: 1.2, x: -40, y: -26, duration: 1.3, ease: "power2.inOut" }, 56.6);',
              '{ scale: 1.2, x: 40, y: -26, duration: 1.3, ease: "power2.inOut" }, 56.6);')

# D. 자료 칸 안의 절대배치 기준을 .area 로 (엑셀 표가 캡션을 덮고 2칸을 가로지르던 문제)
s = s.replace('#bodyp .area { display: flex; align-items: center; justify-content: center;',
              '#bodyp .area { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;')

# B. 자료 번호·장 번호는 실물대로 검정. 붙는 순간에만 파랑이었다가 가라앉는다
s = s.replace('#bodyp .fcap .no { color: #2f5597; }', '#bodyp .fcap .no { color: #1a1a1a; }')
s = s.replace('#h1 .num { color: #2f5597; }', '#h1 .num { color: #1a1a1a; }')
s = s.replace('tl.fromTo(one("#h1 .num"), { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.5, ease: "back.out(2)" }, 2.1);',
              'tl.fromTo(one("#h1 .num"), { opacity: 0, x: -14, color: "#2f5597" },\n'
              '          { opacity: 1, x: 0, duration: 0.5, ease: "back.out(2)" }, 2.1);\n'
              '        tl.to(one("#h1 .num"), { color: "#1a1a1a", duration: 0.7, ease: "power1.inOut" }, 3.4);')
s = s.replace('''        tl.fromTo(q(".fcap .no"), { color: "#1a1a1a" },
          { color: "#c00000", duration: 0.3, yoyo: true, repeat: 1, ease: "power1.inOut",
            stagger: 0.12, immediateRender: false }, 23.0);''',
'''        tl.fromTo(q(".fcap .no"), { color: "#2f5597" },
          { color: "#1a1a1a", duration: 0.8, ease: "power1.inOut", stagger: 0.1, immediateRender: false }, 23.0);''')
s = s.replace('''        tl.fromTo(q(".fcap .no"), { color: "#2f5597" },
          { color: "#c00000", duration: 0.25, yoyo: true, repeat: 1, ease: "power1.inOut", stagger: 0.06, immediateRender: false }, 59.6);''',
'''        tl.fromTo(q(".fcap .no"), { color: "#1a1a1a" },
          { color: "#2f5597", duration: 0.3, yoyo: true, repeat: 1, ease: "power1.inOut", stagger: 0.06, immediateRender: false }, 59.6);''')

# C. 차트가 출처선·상단 선과 겹친다 → 여백을 두고 다시 그린다
A = [(24,112),(94,98),(164,105),(234,72),(304,83),(374,54),(444,61)]
B = [(24,134),(94,127),(164,119),(234,112),(304,95),(374,88),(444,76)]
def ser(pts, color, w, cls='ln'):
    d = ' L '.join('%s %s' % (x, y) for x, y in pts)
    return '<path class="%s" stroke="%s" stroke-width="%s" d="M %s"></path>' % (cls, color, w, d)

raw = ('<svg id="rawc" viewBox="0 0 470 190" preserveAspectRatio="none">'
       + ''.join('<line class="g" x1="24" y1="%d" x2="450" y2="%d"></line>' % (y, y) for y in (46, 76, 106, 136))
       + ser(A, '#e03131', 4) + ser(B, '#2f9e44', 4)
       + '<text x="24" y="158">2024</text><text x="150" y="158">2025</text><text x="280" y="158">2026E</text><text x="396" y="158">2027E</text>'
       + '<rect x="150" y="174" width="14" height="4" fill="#e03131"></rect><text x="170" y="179">매출액</text>'
       + '<rect x="250" y="174" width="14" height="4" fill="#2f9e44"></rect><text x="270" y="179">영업이익</text>'
       + '</svg>')
rfs = ('<svg id="rfsc" viewBox="0 0 470 190" preserveAspectRatio="none">'
       + '<rect x="290" y="30" width="160" height="116" fill="#2f5597" opacity="0" id="estband"></rect>'
       + '<line class="ax" x1="24" y1="146" x2="450" y2="146"></line>'
       + '<line class="ax" x1="24" y1="30" x2="24" y2="146"></line>'
       + ser(A, '#16305c', 1.75) + ser(B, '#2f5597', 1.75)
       + '<text x="24" y="160">2024A</text><text x="150" y="160">2025A</text><text x="280" y="160">2026E</text><text x="396" y="160">2027E</text>'
       + '<rect x="150" y="16" width="10" height="2.5" fill="#16305c"></rect><text x="165" y="20">매출액</text>'
       + '<rect x="230" y="16" width="10" height="2.5" fill="#2f5597"></rect><text x="245" y="20">영업이익</text>'
       + '</svg>')
s = re.sub(r'<svg id="rawc".*?</svg>', raw, s, flags=re.S)
s = re.sub(r'<svg id="rfsc".*?</svg>', rfs, s, flags=re.S)
s = s.replace('#rawc .ln { fill: none; stroke-width: 4; }', '#rawc .ln { fill: none; }')
s = s.replace('#rfsc .ln { fill: none; stroke-width: 1.75; }', '#rfsc .ln { fill: none; }')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('body 수정 완료')
