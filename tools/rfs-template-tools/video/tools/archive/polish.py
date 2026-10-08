import io

# ══════════ 전체 검토 후 개선 ══════════
# 1) 4막 본문이 너무 작다 → 카메라를 본문 단으로 당긴다 (1.2배)
# 2) 8막 점검 형광펜이 안 보인다 → 0.60배 전체보기 대신 본문에 머문다
# 3) 9막 버튼 점등이 안 보인다 → 눌리는 버튼을 크게 튕겨 올린다
# 4) PDF 파일명이 페이지와 겹친다 → 왼쪽 빈 자리로

p = 'compositions/body.html'
s = io.open(p, encoding='utf-8').read()

# ── 4막: 본문 단으로 punch-in ──
s = s.replace('''        tl.fromTo(one("#bhr"), { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, 0.6);''',
'''        tl.fromTo(one("#bhr"), { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, 0.6);
        // 본문이 읽히도록 카메라를 당긴다 (CAM_A4 = scale 1.2 / x -40 / y -26)
        tl.to(one("#bWrap"), { scale: 1.2, x: -40, y: -26, duration: 1.0, ease: "power2.inOut" }, 0.6);''')

# ── 5막: 자료 자리로 내려갈 때 배율도 되돌린다 ──
s = s.replace('tl.to(one("#bWrap"), { y: -408, duration: 1.2, ease: "power2.inOut" }, 16.4);',
              'tl.to(one("#bWrap"), { scale: 1, x: 0, y: -408, duration: 1.3, ease: "power2.inOut" }, 16.4);')

# ── 8막: 0.60배 전체보기 → 본문으로 되돌아가 점검을 보여준다 ──
s = s.replace('tl.to(one("#bWrap"), { y: -60, scale: 0.60, duration: 1.3, ease: "power2.inOut" }, 56.6);',
              'tl.to(one("#bWrap"), { scale: 1.2, x: -40, y: -26, duration: 1.3, ease: "power2.inOut" }, 56.6);')

# ── 8막 마지막: PDF 직전에만 문서 전체를 보여준다 (local 70.6 = 전역 104.2) ──
s = s.replace('\n        // 9막으로 — 문서가 물러난다',
'''
        // PDF 직전 — 완성된 문서 전체를 한 번 보여준다
        tl.to(one("#bWrap"), { scale: 0.58, x: -49, y: -55, duration: 1.2, ease: "power2.inOut" }, 70.6);

        // 9막으로 — 문서가 물러난다''')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('body 카메라 개선')

# ── chrome ──
p = 'compositions/chrome.html'
s = io.open(p, encoding='utf-8').read()

# 4막 연결선 끝점을 CAM_A4 기준으로 다시 계산
for old, new in [
    ('{ t: 35.10, btn: "대제목",     ex:  792, ey: 634, out: 1.25 },', '{ t: 35.10, btn: "대제목",     ex:  793, ey: 631, out: 1.25 },'),
    ('{ t: 36.90, btn: "요약박스",   ex:  790, ey: 690, out: 1.25 },', '{ t: 36.90, btn: "요약박스",   ex:  791, ey: 698, out: 1.25 },'),
    ('{ t: 38.50, btn: "중제목",     ex:  792, ey: 715, out: 1.05 },', '{ t: 38.50, btn: "중제목",     ex:  793, ey: 727, out: 1.05 },'),
    ('{ t: 39.80, btn: "소제목",     ex:  792, ey: 744, out: 1.05 },', '{ t: 39.80, btn: "소제목",     ex:  793, ey: 765, out: 1.05 },'),
    ('{ t: 41.30, btn: "본문",       ex:  792, ey: 772, out: 1.35 },', '{ t: 41.30, btn: "본문",       ex:  793, ey: 795, out: 1.35 },'),
    ('{ t: 43.10, btn: "사이드노트", ex:  608, ey: 765, out: 1.35 },', '{ t: 43.10, btn: "사이드노트", ex:  572, ey: 800, out: 1.35 },'),
]:
    assert old in s, old
    s = s.replace(old, new)

# 8막 돋보기는 PDF 를 누른 뒤에 닫는다
s = s.replace('zoomGroup("마무리", 90.3, 109.0);', 'zoomGroup("마무리", 90.3, 107.6);')

# 9막 — 버튼이 크게 튕기며 켜진다
OLD9 = '''        tl.fromTo(rest, { backgroundColor: "rgba(27,63,122,0)" },
          { backgroundColor: "rgba(143,170,220,0.42)", duration: 0.26, ease: "power1.out",
            stagger: 0.36, immediateRender: false }, 111.0);
        tl.to(rest, { backgroundColor: "rgba(27,63,122,0)", duration: 0.5, ease: "power1.inOut", stagger: 0.36 }, 111.7);'''
NEW9 = '''        rest.forEach(function (b, i) {
          const t = 111.0 + i * 0.44;
          const rg = b.querySelector(".ring");
          tl.fromTo(b, { backgroundColor: "rgba(27,63,122,0)" },
            { backgroundColor: "rgba(27,63,122,1)", duration: 0.14, ease: "power2.out", immediateRender: false }, t);
          tl.fromTo(b, { scale: 1 }, { scale: 1.7, duration: 0.22, ease: "back.out(2.6)", immediateRender: false }, t);
          tl.to(b, { scale: 1, duration: 0.3, ease: "power2.inOut" }, t + 0.34);
          tl.to(b, { backgroundColor: "rgba(27,63,122,0)", duration: 0.35, ease: "power2.inOut" }, t + 0.4);
          if (rg) {
            tl.fromTo(rg, { opacity: 0, scale: 0.7 }, { opacity: 1, duration: 0.12, immediateRender: false }, t);
            tl.to(rg, { opacity: 0, scale: 1.7, duration: 0.5, ease: "power2.out" }, t + 0.12);
          }
        });'''
assert OLD9 in s
s = s.replace(OLD9, NEW9)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('chrome 연결선·9막 개선')

# ── index ──
p = 'index.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace('      #pdfName { position: absolute; left: 0; right: 0; top: 876px; text-align: center; opacity: 0; z-index: 4; }',
              '      #pdfName { position: absolute; left: 130px; width: 620px; top: 640px; text-align: left; opacity: 0; z-index: 4; }')
s = s.replace('.fn { font-size: 26px;', '.fn { font-size: 23px;')
# 점검 자막을 PDF 자막보다 먼저 끝낸다
s = s.replace('id="cap13" data-start="101.6" data-duration="7.6"', 'id="cap13" data-start="101.6" data-duration="3.4"')
s = s.replace('tl.to("#cap13", { opacity: 0, duration: 0.5, ease: "power1.in" }, 108.6);',
              'tl.to("#cap13", { opacity: 0, duration: 0.45, ease: "power1.in" }, 104.4);')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('index PDF 자리 개선')
