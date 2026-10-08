import io, re
p = 'compositions/body.html'; s = io.open(p, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert a in s, a
    s = s.replace(a, b) if n == 0 else s.replace(a, b, n)

# ── 2) 틀: 1단·2단·3단 모두 위아래 선이 하나로 이어진다 (칸 사이 간격은 글자에만)
rep('#bodyp .fg { position: absolute; left: 21.9px; right: 18.6px; display: flex; gap: 7px; opacity: 0; }',
    '#bodyp .fg { position: absolute; left: 21.9px; right: 18.6px; display: flex; gap: 0; opacity: 0; }\n'
    '      #bodyp .col1 > .fcap, #bodyp .col1 > .area, #bodyp .col1 > .src { margin: 0 3.5px; }\n'
    '      #bodyp .col1:first-child > .fcap, #bodyp .col1:first-child > .area, #bodyp .col1:first-child > .src { margin-left: 0; }\n'
    '      #bodyp .col1:last-child > .fcap, #bodyp .col1:last-child > .area, #bodyp .col1:last-child > .src { margin-right: 0; }\n'
    '      #chWrap { position: absolute; left: 0; top: 0; width: 100%; height: 100%; transform-origin: 0 0; }\n'
    '      #chSel { position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0; border: 1px solid #8c8c8c; }\n'
    '      #chSel i { position: absolute; width: 5px; height: 5px; background: #fff; border: 1px solid #6b6b6b; }\n'
    '      #chDim { position: absolute; left: 0; right: 0; bottom: -1px; height: 12px; opacity: 0; display: flex; align-items: center; }\n'
    '      #chDim .ar { flex: 1; height: 1px; background: #2f5597; position: relative; }\n'
    '      #chDim .lb { padding: 0 6px; font-size: 7.5px; font-weight: 700; color: #2f5597; background: #fbfaf8; }')

# ── 3) 폭 맞추기: 붙여넣은 차트는 칸보다 좁다 → 누르면 칸 폭에 맞춰 커진다 (주석도 함께)
a = s.index('<div data-hf-id="hf-txv5" class="ann" id="annBand"></div>')
b = s.index('</div>', s.index('id="annNote"')) + len('</div>')
inner = s[a:b]
s = s[:a] + '<div id="chWrap">' + inner + '''
                <div id="chSel"><i style="left:-3px;top:-3px"></i><i style="right:-3px;top:-3px"></i><i style="left:-3px;bottom:-3px"></i><i style="right:-3px;bottom:-3px"></i><i style="left:50%;top:-3px;margin-left:-3px"></i><i style="left:50%;bottom:-3px;margin-left:-3px"></i><i style="left:-3px;top:50%;margin-top:-3px"></i><i style="right:-3px;top:50%;margin-top:-3px"></i></div>
              </div>
              <div id="chDim"><div class="ar"></div><span class="lb">20.1cm</span><div class="ar"></div></div>''' + s[b:]
FIT = 0.74
rep('''        // ══ 8막 · 차트·표 ══''', '''        // 붙여넣은 차트는 칸 폭보다 좁다 — [폭 맞추기] 전까지
        gsap.set(one("#chWrap"), { scale: %s });
        // ══ 8막 · 차트·표 ══''' % FIT)

# ── 4b) 추정치 구분: E 항목의 선이 점선으로 (띠가 아니라)
rep(''''<rect id="estband" x="290" y="30" width="160" height="116" fill="#2f5597" opacity="0"></rect>' +''', '')
rep('pth(A, "#16305c", 1.75, "ln s1") + pth(B, "#2f5597", 1.75, "ln s2") +',
    'pth(A, "#203864", 1.75, "ln s1") + pth(B, "#d0cece", 1.75, "ln s2") +\n'
    '          pth(A.slice(0, 4), "#203864", 1.75, "ln act") + pth(B.slice(0, 4), "#d0cece", 1.75, "ln act") +\n'
    '          pth(A.slice(3), "#203864", 1.75, "ln est") + pth(B.slice(3), "#d0cece", 1.75, "ln est") +')
s = s.replace('<rect x="230" y="16" width="10" height="2.5" fill="#2f5597"></rect>', '<rect x="230" y="16" width="10" height="2.5" fill="#d0cece"></rect>')
s = s.replace('<rect x="150" y="16" width="10" height="2.5" fill="#16305c"></rect>', '<rect x="150" y="16" width="10" height="2.5" fill="#203864"></rect>')
rep('      #bodyp .chart .ln { fill: none; }', '      #bodyp .chart .ln { fill: none; }\n      #chRfs .act, #chRfs .est { opacity: 0; }\n      #chRfs .est { stroke-dasharray: 5 3; }')
rep('        tl.to(one("#estband"), { opacity: 0.12, duration: 0.35 }, 43.7);',
    '        tl.to([sp1, sp2], { opacity: 0, duration: 0.3 }, 43.7);\n'
    '        tl.to(q("#chRfs .act, #chRfs .est"), { opacity: 1, duration: 0.3 }, 43.7);')
rep('fx("#estband", 43.6, "pop", { pad: 1 });', 'fx("#chRfs .est", 43.6, "pop", { pad: 3, chs: %s });' % FIT)
rep('fx("#fg1 .area", 39.6, "pop", { pad: 0, punch: 1.04 });', 'fx("#chWrap", 39.6, "pop", { pad: 0, chs: %s });' % FIT)

# 엑셀 표: 숫자 오른쪽 정렬 (매크로 규칙)
rep('#bodyp .xtab td { padding: 0 6px; text-align: center; border-bottom: 1px solid #e3e3e3; color: #1a1a1a; }',
    '#bodyp .xtab td { padding: 0 8px; text-align: right; border-bottom: 1px solid #e3e3e3; color: #1a1a1a; }\n'
    '      #bodyp .xtab td:first-child { text-align: left; }')

# ── 주석: 기본 자리에 생긴 뒤 끌어서 위치 (매크로 설명 그대로)
W_, H_ = 679.5, 186
def drag(eid, t, fl, ft, ease_in='power2.out'):
    dx = round((0.03 - fl) * W_, 1); dy = round((0.05 - ft) * H_, 1)
    return ('        tl.fromTo(one("#%s"), { opacity: 0, x: %s, y: %s }, { opacity: 1, duration: 0.2, immediateRender: false }, %s);\n'
            '        tl.to(one("#%s"), { x: 0, y: 0, duration: 0.6, ease: "power2.inOut" }, %s);\n') % (eid, dx, dy, t, eid, round(t + 0.45, 2))
old = s[s.index('        tl.fromTo(one("#annTxt"),'):s.index('        tl.fromTo(one("#annBand"),')]
new = (drag('annTxt', 49.9, 0.215, 0.185) + drag('annArrow', 51.5, 0.368, 0.235) + drag('annBox', 53.1, 0.764, 0.21)
       + '''        // [폭 맞추기] — 차트를 클릭(선택 핸들) → 칸 폭 20.1cm 에 맞춘다
        tl.fromTo(one("#chSel"), { opacity: 0 }, { opacity: 1, duration: 0.15 }, 54.2);
        tl.to(one("#chWrap"), { scale: 1, duration: 0.7, ease: "power3.inOut" }, 54.75);
        tl.to(one("#chSel"), { opacity: 0, duration: 0.3 }, 55.7);
        tl.fromTo(one("#chDim"), { opacity: 0 }, { opacity: 1, duration: 0.25 }, 55.4);
        tl.to(one("#chDim"), { opacity: 0, duration: 0.4 }, 56.6);
'''
       + drag('annDash', 56.1, 0.026, 0.46) + drag('annCircle', 57.5, 0.473, 0.286))
s = s.replace(old, new)
rep('fx("#annTxt", 49.8, "pop", { pad: 3 });   fx("#annArrow", 51.4, "pop", { pad: 1 });  fx("#annBox", 53.0, "pop", { pad: 1 });',
    'fx("#annTxt", 50.8, "pop", { pad: 3, chs: %s });   fx("#annArrow", 52.4, "pop", { pad: 1, chs: %s });  fx("#annBox", 54.0, "pop", { pad: 1, chs: %s, punch: false });' % (FIT, FIT, FIT))
rep('fx("#fg1 .area", 54.6, "pop", { pad: 0, punch: 1.03 });', 'fx("#fg1 .area", 55.3, "pop", { pad: 0 });')
rep('fx("#annDash", 56.0, "pop", { pad: 1 });  fx("#annCircle", 57.4, "pop", { pad: 1 });',
    'fx("#annDash", 57.0, "pop", { pad: 1 });  fx("#annCircle", 58.4, "pop", { pad: 1 });')

# ── 4a) 강조는 선택한 글자, 첫문장 볼드는 문서 전체의 첫 문장을 한 번에
rep('        tl.fromTo(one("#em1"), { fontWeight: 300 }, { fontWeight: 700, duration: 0.25, immediateRender: false }, 30.7);',
    '        tl.fromTo(one("#wd1"), { fontWeight: 300 }, { fontWeight: 700, duration: 0.25, immediateRender: false }, 30.7);')
rep('        tl.fromTo(one("#em2"), { fontWeight: 300 }, { fontWeight: 700, duration: 0.25, immediateRender: false }, 33.9);',
    '        tl.fromTo([one("#em1"), one("#em2")], { fontWeight: 300 }, { fontWeight: 700, duration: 0.25, immediateRender: false }, 33.9);')
rep('fx("#em1", 30.6, "sel", { fw: 700 });  fx("#em3", 32.2, "sel", { fw: 700 });  fx("#em2", 33.8, "sel", { fw: 700 });',
    'fx("#wd1", 30.6, "sel", { fw: 700 });  fx("#em3", 32.2, "sel", { fw: 700 });\n'
    '        fx("#bodytxt", 33.8, "pop", { camOnly: true, max: 1.7 });  fx("#em1", 33.8, "pop", { fw: 700, punch: false });  fx("#em2", 33.8, "pop", { fw: 700, punch: false });')
# 양식 점검의 '허용 외 글꼴' 은 다른 단어로
rep('① HBM4 양산 일정이', '① <span id="wd2">HBM4</span> 양산 일정이')
s = s.replace('tl.fromTo(one("#wd1"), { backgroundColor: "rgba(64,224,208,0)" }', 'tl.fromTo(one("#wd2"), { backgroundColor: "rgba(64,224,208,0)" }')
s = s.replace('tl.to([one("#em2"), one("#em3"), one("#wd1")], { backgroundColor', 'tl.to([one("#em2"), one("#em3"), one("#wd2")], { backgroundColor')
rep('fx("#p2, #wd1", 93.5,', 'fx("#p2, #blist", 93.5,')

# place(): #chWrap 은 그 시점의 배율로 잰다
rep('            for (let n = el; n && n !== f.host; n = n.parentElement) strip(n, "transform", "none");',
    '            for (let n = el; n && n !== f.host; n = n.parentElement) strip(n, "transform", n.id === "chWrap" ? "scale(" + (f.chs || 1) + ")" : "none");')
rep('const f = { els: els, host: host, box: box, pad: opt.pad, fw: opt.fw };', 'const f = { els: els, host: host, box: box, pad: opt.pad, fw: opt.fw, chs: opt.chs };')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
