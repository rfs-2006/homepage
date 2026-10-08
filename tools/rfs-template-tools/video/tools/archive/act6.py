import io

# ── 6막 · [차트·표] — 날것 차트가 RFS 서식으로 변신 ──
p = 'compositions/body.html'
s = io.open(p, encoding='utf-8').read()

# 패널 높이를 내용에 맞춘다(5막 잔여 여백 제거)는 chrome 쪽이고, 여기는 차트를 넣는다.
CSS = '''
      /* 6막 — 자료 칸 안의 차트 */
      #bodyp .chart { position: absolute; inset: 0; opacity: 0; }
      #bodyp .chart svg { width: 100%; height: 100%; }
      #bodyp .ph { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
      /* 엑셀에서 갓 붙여넣은 모습 — 굵은 선, 원색, 아래 범례 */
      #rawc .ln { fill: none; stroke-width: 4; }
      #rawc .g  { stroke: #c9c9c9; stroke-width: 1; }
      #rawc text { font-size: 11px; fill: #444; font-family: sans-serif; }
      /* RFS 서식 — 얇은 선, 위 범례, 브랜드색 */
      #rfsc .ln { fill: none; stroke-width: 1.75; }
      #rfsc .ax { stroke: #333; stroke-width: 0.25; }
      #rfsc text { font-size: 7px; fill: #222; }
      #rfsc .est { stroke-dasharray: 4 3; }
'''

def series(cls, pts, color, extra=''):
    d = ' L '.join('%s %s' % (x, y) for x, y in pts)
    return '<path class="%s" stroke="%s" d="M %s" %s></path>' % (cls, color, d, extra)

A = [(20,120),(90,104),(160,112),(230,74),(300,86),(370,52),(440,60)]
B = [(20,146),(90,138),(160,128),(230,120),(300,100),(370,92),(440,78)]

raw = ('<svg id="rawc" viewBox="0 0 470 190" preserveAspectRatio="none">'
       + ''.join('<line class="g" x1="20" y1="%d" x2="450" y2="%d"></line>' % (y, y) for y in (40,70,100,130,160))
       + series('ln', A, '#e03131') + series('ln', B, '#2f9e44')
       + '<text x="20" y="182">2024</text><text x="150" y="182">2025</text><text x="280" y="182">2026E</text><text x="400" y="182">2027E</text>'
       + '<rect x="150" y="186" width="14" height="4" fill="#e03131"></rect><text x="170" y="191">매출액</text>'
       + '<rect x="250" y="186" width="14" height="4" fill="#2f9e44"></rect><text x="270" y="191">영업이익</text>'
       + '</svg>')

rfs = ('<svg id="rfsc" viewBox="0 0 470 190" preserveAspectRatio="none">'
       + '<line class="ax" x1="20" y1="170" x2="450" y2="170"></line>'
       + '<line class="ax" x1="20" y1="30" x2="20" y2="170"></line>'
       + '<rect x="285" y="30" width="165" height="140" fill="#2f5597" opacity="0" id="estband"></rect>'
       + series('ln', A, '#16305c') + series('ln', B, '#2f5597')
       + '<text x="20" y="184">2024A</text><text x="150" y="184">2025A</text><text x="280" y="184">2026E</text><text x="400" y="184">2027E</text>'
       + '<rect x="150" y="18" width="10" height="2.5" fill="#16305c"></rect><text x="165" y="22">매출액</text>'
       + '<rect x="230" y="18" width="10" height="2.5" fill="#2f5597"></rect><text x="245" y="22">영업이익</text>'
       + '</svg>')

s = s.replace('      #fg1 { top: 348px; }', CSS + '      #fg1 { top: 348px; }')

old_area = '<div class="area"><span class="z">차트/표 붙여넣기 (폭 20.1cm)</span></div><div class="srule"></div><div class="src z">출처: , RFS Team 3</div></div></div>\n        <div class="fg" id="fg2">'
assert old_area in s
new_area = ('<div class="area"><span class="ph z">차트/표 붙여넣기 (폭 20.1cm)</span>'
            '<div class="chart" id="chRaw">' + raw + '</div>'
            '<div class="chart" id="chRfs">' + rfs + '</div>'
            '</div><div class="srule"></div><div class="src z">출처: , RFS Team 3</div></div></div>\n        <div class="fg" id="fg2">')
s = s.replace(old_area, new_area)

# fg2 왼쪽 칸에 들어갈 RFS 표
tbl = ('<div class="xtab" id="xtab"><table><tr><td>구분</td><td>2025A</td><td>2026E</td></tr>'
       '<tr><td>매출액</td><td>468</td><td>561</td></tr>'
       '<tr><td>영업이익</td><td>41</td><td>67</td></tr>'
       '<tr><td>OPM</td><td>8.8</td><td>11.9</td></tr></table></div>')
s = s.replace('#fg2 { top: 600px; }',
              '#bodyp .xtab { position: absolute; inset: 6px 10px; opacity: 0; }\n'
              '      #bodyp .xtab table { width: 100%; border-collapse: collapse; font-size: 7px; }\n'
              '      #bodyp .xtab td { padding: 2px 4px; text-align: center; border-bottom: 1px solid #e3e3e3; }\n'
              '      #bodyp .xtab tr:first-child td { background: #203864; color: #f7f6f3; font-weight: 500; }\n'
              '      #fg2 { top: 600px; }')
s = s.replace('<div class="area"><span class="z">차트/표 붙여넣기 (폭 10.05cm)</span></div>',
              '<div class="area"><span class="z">차트/표 붙여넣기 (폭 10.05cm)</span>' + tbl + '</div>', 1)

# 타임라인 (body local = global - 33.6)
ACT6 = '''
        // ── 6막 · [차트·표] (전역 59~76초) ──
        // 엑셀에서 갓 붙여넣은 차트가 툭 떨어진다
        tl.fromTo(one("#chRaw"), { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 26.4);
        tl.to(one("#fg1 .ph"), { opacity: 0, duration: 0.3 }, 26.4);
        // [차트 양식] — 0.6초 만에 RFS 서식으로 갈아끼워진다
        tl.to(one("#chRaw"), { opacity: 0, duration: 0.45, ease: "power2.inOut" }, 29.7);
        tl.fromTo(one("#chRfs"), { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.inOut" }, 29.7);
        // [엑셀 표] — 2단 칸에 RFS 표가 들어앉는다
        tl.to(one("#fg2 .ph"), { opacity: 0, duration: 0.3 }, 33.1);
        tl.fromTo(one("#xtab"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, 33.1);
        // [추정치 구분] — E 구간이 연한 띠 + 점선으로
        tl.to(one("#estband"), { opacity: 0.12, duration: 0.4, ease: "power1.out" }, 36.3);
        tl.to(q("#rfsc .ln"), { attr: { "stroke-dasharray": "0" }, duration: 0.01 }, 36.3);
'''
s = s.replace('\n        window.__timelines["bodyp"] = tl;', ACT6 + '\n        window.__timelines["bodyp"] = tl;')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('body.html act6 ok')

# ── chrome: 6막 리본 + 연결선 ──
p = 'compositions/chrome.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace('        // ── 버튼 → 결과물 연결선 ──', '''        // ── 6막 · [차트·표] — 돋보기 ──
        focusOn(["차트·표"], 59.2);
        zoomGroup("차트·표", 59.3, 75.0);
        press("차트 양식", 63.2);
        press("엑셀 표", 66.6);
        press("추정치 구분", 69.8);
        focusOff(["차트·표"], 75.4);

        // ── 버튼 → 결과물 연결선 ──''')
s = s.replace('          { t: 54.50, btn: "3단 틀",     ex: 1316, ey: 912, out: 1.00, side: "right" },',
              '          { t: 54.50, btn: "3단 틀",     ex: 1316, ey: 912, out: 1.00, side: "right" },\n'
              '          { t: 63.30, btn: "차트 양식",   ex: 1316, ey: 580, out: 1.10, side: "right" },\n'
              '          { t: 66.70, btn: "엑셀 표",     ex: 1316, ey: 760, out: 1.10, side: "right" },\n'
              '          { t: 69.90, btn: "추정치 구분", ex: 1316, ey: 560, out: 1.10, side: "right" },')
# 돋보기 패널 높이를 내용에 맞춘다
s = s.replace('clone.style.height = gm.h + "px";', 'clone.style.height = "auto";\n          clone.style.paddingBottom = "10px";')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('chrome.html act6 ok')

# ── index: 길이 + 자막 ──
p = 'index.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace('data-start="0" data-duration="60" data-width="1920"', 'data-start="0" data-duration="76" data-width="1920"')
s = s.replace('data-composition-id="chrome" data-start="0" data-duration="60"', 'data-composition-id="chrome" data-start="0" data-duration="76"')
s = s.replace('data-composition-id="bodyp" data-start="33.6" data-duration="26.4"', 'data-composition-id="bodyp" data-start="33.6" data-duration="42.4"')
s = s.replace('''    </div>

    <script>''', '''      <div class="cap capL clip" id="cap9" data-start="62.8" data-duration="5.4" data-track-index="2">
        <span><span class="lead">STEP 05</span>[차트·표 &gt; 차트 양식]<span class="sub">엑셀에서 그려 붙이고, 버튼 하나로 RFS 서식</span></span>
      </div>
      <div class="cap capL clip" id="cap10" data-start="69.4" data-duration="5.2" data-track-index="2">
        <span><span class="lead">STEP 05</span>[엑셀 표] · [추정치 구분]<span class="sub">E로 끝나는 항목은 연한 색·점선으로</span></span>
      </div>
    </div>

    <script>''')
s = s.replace('      #cap7, #cap8 { left: 140px; width: 430px; top: 560px; }',
              '      #cap7, #cap8 { left: 140px; width: 430px; top: 560px; }\n      #cap9, #cap10 { left: 140px; width: 430px; top: 560px; }')
s = s.replace('      window.__timelines["main"] = tl;', '''      tl.fromTo("#cap9", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 63.0);
      tl.to("#cap9", { opacity: 0, duration: 0.45, ease: "power1.in" }, 67.6);
      tl.fromTo("#cap10", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 69.6);
      tl.to("#cap10", { opacity: 0, duration: 0.5, ease: "power1.in" }, 74.0);

      window.__timelines["main"] = tl;''')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('index.html act6 ok')
