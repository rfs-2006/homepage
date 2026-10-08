import io, re
D = 1.5          # 파일 화면을 넣느라 뒤를 미는 시간
def fm(x): return ('%.2f' % x).rstrip('0').rstrip('.')

# ══════════ index.html ══════════
p = 'index.html'; s = io.open(p, encoding='utf-8').read()
# 1) 기존 '시작하는 법' 글자 경로 제거
a = s.index('      <div id="start" class="clip"'); b = s.index('      <div class="cap capL clip" id="s2a"')
s = s[:a] + '@@BS@@\n' + s[b:]
a = s.index('      // 시작하는 법 — 파일 › 새로 만들기 › 개인 › RFS_Report')
b = s.index('\n', s.index('      tl.to("#start", { opacity: 0, y: -8, duration: 0.45, ease: "power1.in" }, 10.85);')) + 1
s = s[:a] + '@@BSTL@@\n' + s[b:]
a = s.index('      /* 시작하는 법 */'); b = s.index('      #cur0 {')
s = s[:a] + s[b:]
s = re.sub(r'\n      #start \.sep \{[^\n]*', '', s)

# 2) 8.3초 이후 전부 D 만큼 뒤로
def sh(v): return v + D if v >= 8.3 else v
s = re.sub(r'(\}\s*,\s*)(\d+(?:\.\d+)?)(\s*\);)', lambda m: m.group(1) + fm(sh(float(m.group(2)))) + m.group(3), s)
s = re.sub(r'(cap\("#\w+", )([\d.]+)(, )([\d.]+)(\))', lambda m: m.group(1) + fm(sh(float(m.group(2)))) + m.group(3) + fm(sh(float(m.group(4)))) + m.group(5), s)
def ds(m):
    st = float(m.group(2))
    return m.group(1) + fm(sh(st)) + m.group(3)
s = re.sub(r'(data-start=")([\d.]+)(")', ds, s)
for cid in ('main', 'chrome'):
    s = re.sub(r'(data-composition-id="%s" data-start="0" data-duration=")([\d.]+)(")' % cid, lambda m: m.group(1) + fm(float(m.group(2)) + D) + m.group(3), s)
s = re.sub(r'(<audio id="sfx"[^>]*data-duration=")([\d.]+)(")', lambda m: m.group(1) + fm(float(m.group(2)) + D) + m.group(3), s)

# 3) 워드 '파일' 화면 (Backstage)
css = '''      /* 워드 파일 화면 — 파일 › 새로 만들기 › 개인 › RFS_Report */
      #bs { position: absolute; left: 24px; top: 166px; width: 1872px; height: 874px; opacity: 0; z-index: 6; display: flex;
        background: #f7f6f3; box-shadow: 0 30px 80px rgba(0,0,0,0.5); font-family: "Pretendard", sans-serif; overflow: hidden; }
      #bs .side { width: 290px; background: #203864; padding-top: 26px; flex: none; }
      #bs .side .back { font-size: 26px; color: #f7f6f3; padding: 6px 34px 22px; }
      #bs .side .it { font-size: 19px; color: rgba(247,246,243,0.92); padding: 13px 34px; }
      #bs .side .gap { height: 1px; background: rgba(247,246,243,0.2); margin: 14px 26px; }
      #bs .main { position: relative; flex: 1; padding: 44px 64px; }
      #bs .h { position: absolute; left: 64px; top: 40px; font-size: 38px; font-weight: 500; color: #1a1a1a; }
      #bs .tabs { position: absolute; left: 64px; top: 118px; display: flex; gap: 40px; font-size: 19px; font-weight: 500; color: #666; }
      #bs .tabs .tb { padding-bottom: 8px; }
      #bs #bsU { position: absolute; left: 0; bottom: 0; height: 3px; width: 64px; background: #203864; transform-origin: 0 0; }
      #bs .grid { position: absolute; left: 64px; top: 190px; display: flex; gap: 40px; }
      #bs .th { width: 196px; text-align: center; }
      #bs .th .pg { height: 254px; background: #fff; border: 1px solid #d4d4d4; box-shadow: 0 2px 8px rgba(0,0,0,0.08); position: relative; overflow: hidden; }
      #bs .th .nm { margin-top: 12px; font-size: 16px; color: #1a1a1a; }
      #bs .ln { position: absolute; left: 18px; height: 5px; background: #e6e6e6; }
      #bs .rfs .bn { position: absolute; left: 8px; right: 8px; top: 16px; height: 46px; background: #6f706f; }
      #bs .rfs .tt { position: absolute; left: 14px; top: 34px; width: 90px; height: 9px; background: #f2f2f2; }
      #bs .rfs .bx { position: absolute; right: 12px; top: 74px; width: 54px; height: 44px; background: #001f5f; }
      #bs .rfs .t2 { position: absolute; left: 14px; top: 74px; width: 100px; height: 6px; background: #002060; }
'''
s = s.replace('      #cur0 {', css + '      #cur0 {', 1)
lines = lambda xs: ''.join('<i class="ln" style="top:%dpx; width:%dpx"></i>' % (y, w) for y, w in xs)
html = '''      <div id="bs" class="clip" data-start="8.6" data-duration="3.6" data-track-index="3">
        <div class="side"><div class="back">←</div><div class="it" id="bsHome">홈</div><div class="it" id="bsNew">새로 만들기</div><div class="it">열기</div><div class="gap"></div><div class="it">정보</div><div class="it">저장</div><div class="it">다른 이름으로 저장</div><div class="it">인쇄</div><div class="it">내보내기</div><div class="it">닫기</div></div>
        <div class="main">
          <div class="h" id="bsH1">홈</div><div class="h" id="bsH2" style="opacity:0">새로 만들기</div>
          <div class="tabs" id="bsTabs" style="opacity:0"><span class="tb" id="bsT1">Office</span><span class="tb" id="bsT2">개인</span><i id="bsU"></i></div>
          <div class="grid" id="gOff" style="opacity:0">
            <div class="th"><div class="pg"></div><div class="nm">새 문서</div></div>
            <div class="th"><div class="pg">%s</div><div class="nm">보고서</div></div>
            <div class="th"><div class="pg">%s</div><div class="nm">편지</div></div>
          </div>
          <div class="grid" id="gPer" style="opacity:0">
            <div class="th" id="bsRfs"><div class="pg rfs"><i class="bn"></i><i class="tt"></i><i class="t2"></i><i class="bx"></i>%s</div><div class="nm">RFS_Report</div></div>
          </div>
        </div>
      </div>''' % (lines([(40, 150), (60, 120), (90, 150), (104, 140)]), lines([(40, 90), (120, 150), (134, 140), (148, 150)]),
                   lines([(92, 80), (130, 90), (144, 80), (158, 90)]))
s = s.replace('@@BS@@\n', html + '\n')
tl = '''      // 시작 — 커서가 워드 '파일' 탭을 눌러 새로 만들기 › 개인 › RFS_Report 로 들어간다 (좌표는 재생 시점에 읽는다)
      function at(sel, fx, fy) { const r = document.querySelector(sel).getBoundingClientRect(); const R = document.getElementById("root").getBoundingClientRect(); const k = R.width / 1920; return [(r.left - R.left) / k + r.width / k * fx, (r.top - R.top) / k + r.height / k * fy]; }
      function go(sel, t, fx, fy) {
        tl.to("#cur0", { x: function () { return at(sel, fx || 0.5, fy || 0.6)[0]; }, y: function () { return at(sel, fx || 0.5, fy || 0.6)[1]; }, duration: 0.42, ease: "power2.inOut" }, t - 0.46);
        tl.to("#cur0", { scale: 0.82, duration: 0.08, yoyo: true, repeat: 1 }, t);
      }
      tl.fromTo("#cur0", { opacity: 0, x: 900, y: 700 }, { opacity: 1, duration: 0.2 }, 8.2);
      go("#chrome .tab", 8.75);
      tl.fromTo("#bs", { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, 8.8);
      go("#bsNew", 9.55, 0.3);
      tl.to("#bsNew", { backgroundColor: "rgba(247,246,243,0.16)", duration: 0.15 }, 9.55);
      tl.to("#bsH1", { opacity: 0, duration: 0.12 }, 9.6);
      tl.to(["#bsH2", "#bsTabs", "#gOff"], { opacity: 1, duration: 0.3 }, 9.65);
      go("#bsT2", 10.35);
      tl.to("#bsU", { x: function () { return document.getElementById("bsT2").offsetLeft; }, scaleX: 0.7, duration: 0.25, ease: "power2.out" }, 10.35);
      tl.to("#bsT2", { color: "#203864", duration: 0.15 }, 10.35);
      tl.to("#gOff", { opacity: 0, duration: 0.15 }, 10.4);
      tl.fromTo("#gPer", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 }, 10.5);
      go("#bsRfs .pg", 11.2);
      tl.to("#bsRfs .pg", { borderColor: "#203864", boxShadow: "0 0 0 3px rgba(32,56,100,0.35)", duration: 0.15 }, 10.9);
      tl.to("#bsRfs .pg", { scale: 0.96, duration: 0.08, yoyo: true, repeat: 1 }, 11.2);
      tl.to("#cur0", { opacity: 0, duration: 0.25 }, 11.5);
      tl.to("#bs", { opacity: 0, scale: 0.985, duration: 0.4, ease: "power2.in" }, 11.6);
'''
s = s.replace('@@BSTL@@\n', tl)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ══════════ chrome.html: 리본이 붙는 시점 이후 D 만큼 ══════════
p = 'compositions/chrome.html'; s = io.open(p, encoding='utf-8').read()
o = 'function SH(t) { return t + 6.6 + '; assert o in s
s = s.replace(o, 'function SH(t) { return t + %s + ' % fm(6.6 + D))
s = re.sub(r'(\}\s*,\s*)(\d+(?:\.\d+)?)(\s*\);)', lambda m: m.group(1) + (fm(float(m.group(2)) + D) if float(m.group(2)) >= 10.5 else m.group(2)) + m.group(3), s)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ══════════ events.py ══════════
p = 'tools/events.py'; s = io.open(p, encoding='utf-8').read()
R = [('DUR = 149.6', 'DUR = %s' % fm(149.6 + D)),
     ('def SH(t): return t + 6.6 +', 'def SH(t): return t + %s +' % fm(6.6 + D)),
     ('C = 11.5', 'C = %s' % fm(11.5 + D)), ('B = 33.4', 'B = %s' % fm(33.4 + D)),
     ('ev(10.6, "cam", dur=0.9, gain=0.6)', 'ev(%s, "cam", dur=0.9, gain=0.6)' % fm(10.6 + D)),
     ('for i in range(4): ev(8.95 + i * 0.45, "click", gain=0.8)',
      'for t in (8.75, 9.55, 10.35, 11.2): ev(t, "click", gain=0.85)\nev(8.8, "whoosh", gain=0.5); ev(9.65, "pop", pitch=5, gain=0.3); ev(10.5, "pop", pitch=9, gain=0.3); ev(11.6, "whoosh_out", gain=0.5)'),
     ('ev(142.0, "whoosh_out", gain=0.6)', 'ev(%s, "whoosh_out", gain=0.6)' % fm(142.0 + D)),
     ('ev(142.8, "cam", dur=1.4, gain=0.5)', 'ev(%s, "cam", dur=1.4, gain=0.5)' % fm(142.8 + D)),
     ('ev(143.6, "chime", gain=0.8)', 'ev(%s, "chime", gain=0.8)' % fm(143.6 + D))]
for a, b in R:
    assert a in s, a; s = s.replace(a, b)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
