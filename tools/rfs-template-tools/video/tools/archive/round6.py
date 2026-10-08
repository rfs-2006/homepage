import io, re

def fm(x): return ('%.2f' % x).rstrip('0').rstrip('.')

p = 'index.html'; s = io.open(p, encoding='utf-8').read()
# ── 기존 파일명 박스·입력창 제거
a = s.index('      <div data-hf-id="hf-iv4l" id="pdfName"'); b = s.index('      <div data-hf-id="hf-iwke" class="end clip" id="endMsg"')
s = s[:a] + '@@DLG@@\n' + s[b:]
a = s.index('      tl.fromTo("#pdfName"'); b = s.index('      tl.fromTo("#endMsg"')
s = s[:a] + s[b:]
a = s.index('      // 주가 비교 입력창 — 티커 → 시작일'); b = s.index('      tl.to("#topfade"')
s = s[:a] + '@@DLGTL@@\n' + s[b:]
a = s.index('      #pdfName {'); b = s.index('      /* 엔딩 */')
s = s[:a] + s[b:]

css = '''      .dlg { position: absolute; left: 1440px; width: 440px; top: 470px; opacity: 0; z-index: 6;
        background: #f3f3f3; border: 1px solid #9aa3b5; border-radius: 6px; overflow: hidden;
        box-shadow: 0 24px 60px rgba(0,0,0,0.55); font-family: "Pretendard", sans-serif; transform-origin: 50% 40%; }
      .dlg .tb { background: #ffffff; padding: 10px 16px; font-size: 14px; font-weight: 500; color: #1a1a1a; border-bottom: 1px solid #ddd; }
      .dlg .bd { padding: 16px 18px 18px; }
      .dlg .msg { font-size: 14px; color: #1a1a1a; line-height: 1.55; margin-bottom: 12px; white-space: pre-line; }
      .dlg .in { background: #fff; border: 1px solid #2f5597; padding: 8px 10px; font-size: 16px; color: #1a1a1a; height: 38px;
        white-space: nowrap; overflow: hidden; }
      .dlg .in span { display: inline-block; white-space: nowrap; vertical-align: top; }
      .dlg .in .dv { background: #cfe0ff; }
      .dlg .btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
      .dlg .bt { padding: 6px 20px; font-size: 14px; border: 1px solid #adadad; background: #e5e5e5; color: #1a1a1a; border-radius: 3px; }
      .dlg .bt.ok { border-color: #2f5597; }
      .dlg .row { display: flex; gap: 14px; align-items: flex-start; }
      .dlg .ico { flex: none; width: 30px; height: 30px; border-radius: 50%; background: #2f5597; color: #fff; font-size: 18px; font-weight: 500;
        display: flex; align-items: center; justify-content: center; margin-top: 2px; }
      /* PDF 뷰어 */
      #pdfBg { position: absolute; left: 690px; top: 430px; width: 540px; height: 650px; background: #525659; z-index: 1; opacity: 0; }
      #pdfBar { position: absolute; left: 690px; top: 430px; width: 540px; height: 40px; background: #323639; z-index: 5; opacity: 0;
        display: flex; align-items: center; gap: 10px; padding: 0 14px; font-size: 13px; color: #f1f1f1; white-space: nowrap; overflow: hidden; }
      #pdfBar .pg { margin-left: auto; color: #bdbdbd; font-size: 12px; }
'''
a = s.index('      .dlg { position: absolute;'); b = s.index('      .dlg .bt.ok { border-color: #2f5597; }')
b = s.index('\n', b) + 1
s = s[:a] + css + s[b:]

H = []; T = []
def inbox(did, title, msg, default, typed, t0, t1, typ_at=None, typ_dur=None, sel=False):
    ds = ('<span class="dv">%s</span>' if sel else '<span>%s</span>') % default
    ty = '<span id="%s_t">%s</span>' % (did, typed) if typed else ''
    H.append('''      <div class="dlg clip" id="%s" data-start="%s" data-duration="%s" data-track-index="3">
        <div class="tb">%s</div>
        <div class="bd"><div class="msg">%s</div>
          <div class="in"><span id="%s_d">%s</span>%s</div>
          <div class="btns"><div class="bt ok" id="%s_ok">확인</div><div class="bt">취소</div></div></div>
      </div>''' % (did, fm(t0 - 0.05), fm(t1 - t0 + 0.35), title, msg, did, ds, ty, did))
    T.append('      tl.fromTo("#%s", { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.22, ease: "power2.out" }, %s);' % (did, fm(t0)))
    if typed:
        if sel:   # 기본값이 선택된 채로 뜨고, 치면 바뀐다
            T.append('      tl.set("#%s_d", { display: "none" }, %s);' % (did, fm(typ_at)))
        T.append('      tl.fromTo("#%s_t", { clipPath: "inset(0 100%% 0 0)" }, { clipPath: "inset(0 0%% 0 0)", duration: %s, ease: "steps(%d)" }, %s);'
                 % (did, fm(typ_dur), max(4, len(typed)), fm(typ_at)))
    T.append('      tl.fromTo("#%s_ok", { backgroundColor: "#e5e5e5", scale: 1 }, { backgroundColor: "#bcd3ff", scale: 0.94, duration: 0.1, yoyo: true, repeat: 1 }, %s);' % (did, fm(t1 - 0.35)))
    T.append('      tl.to("#%s", { opacity: 0, scale: 0.97, duration: 0.18 }, %s);' % (did, fm(t1)))

def msgbox(did, title, msg, t0, t1, top=470):
    H.append('''      <div class="dlg clip" id="%s" style="top:%dpx" data-start="%s" data-duration="%s" data-track-index="3">
        <div class="tb">%s</div>
        <div class="bd"><div class="row"><div class="ico">i</div><div class="msg">%s</div></div>
          <div class="btns"><div class="bt ok" id="%s_ok">확인</div></div></div>
      </div>''' % (did, top, fm(t0 - 0.05), fm(t1 - t0 + 0.35), title, msg, did))
    T.append('      tl.fromTo("#%s", { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.22, ease: "power2.out" }, %s);' % (did, fm(t0)))
    T.append('      tl.fromTo("#%s_ok", { backgroundColor: "#e5e5e5", scale: 1 }, { backgroundColor: "#bcd3ff", scale: 0.94, duration: 0.1, yoyo: true, repeat: 1 }, %s);' % (did, fm(t1 - 0.35)))
    T.append('      tl.to("#%s", { opacity: 0, scale: 0.97, duration: 0.18 }, %s);' % (did, fm(t1)))

T.append('      // 주가 비교 — 입력창 세 개 (티커 → 시작일 → 방식)')
inbox('cmp1', 'RFS 주가 비교', '비교할 티커를 쉼표로 (첫 번째가 기준). 예: 089030.KQ, 000660.KS, 005930.KS, MU', '005930.KS', ', 000660.KS', 97.3, 99.4, 97.9, 1.1)
inbox('cmp2', 'RFS 주가 비교', '시작일. 예: 2024-12-01', '2025-09-25', '', 99.55, 100.3)
inbox('cmp3', 'RFS 주가 비교', '1 = 시작일 100으로 정규화 (축 하나, 여러 종목 비교)\n2 = 실제 주가 (원화 왼쪽 축, 달러 오른쪽 축)', '1', '', 100.45, 101.2)
T.append('      // 양식 점검 · 내용 점검 — 형광펜을 칠하고 요약 창')
msgbox('chkF', 'RFS 양식 점검', "스타일 없는 본문 문단(노랑): 1\n장 번호 필드 없는 대제목(분홍): 0\n허용 글꼴 외 단어(청록): 1\n페이지에 걸친 자료 틀(보라): 0\n\n고친 뒤 다시 '양식 점검'을 누르면 표시가 지워집니다.", 127.4, 129.6)
msgbox('chkC', 'RFS 내용 점검', '빈칸(노랑): 9\n표지 값과 다른 숫자(연두): 0\n표기 규칙(청록): 0\n\n형광펜은 표시만 합니다. 고친 뒤 다시 누르면 지워집니다.', 131.6, 133.5)
T.append('      // PDF 내보내기 — 학기 → 밸류 → (필드 갱신) → PDF 가 열리고 → 저장 알림')
inbox('pdf1', 'RFS PDF 내보내기', '학기 표기 (예: 26-1)', '26-1', '26-2', 134.3, 135.95, 134.85, 0.45, sel=True)
inbox('pdf2', 'RFS PDF 내보내기', '밸류에이션 방식 (예: PER, EVEBITDA, DCF)', 'PER', '', 136.1, 136.95)
H.append('''      <div id="pdfBg" class="clip" data-start="137" data-duration="4.4" data-track-index="3"></div>
      <div id="pdfBar" class="clip" data-start="137" data-duration="4.4" data-track-index="3"><span>[26-2]_삼성전자_Research_Team_3_PER_260925.pdf</span><span class="pg">1 / 2</span></div>''')
T.append('      tl.fromTo(["#pdfBg", "#pdfBar"], { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.out" }, 137.3);')
T.append('      tl.to(["#pdfBg", "#pdfBar"], { opacity: 0, duration: 0.45, ease: "power1.in" }, 140.9);')
msgbox('pdfOk', 'RFS', 'PDF 저장: [26-2]_삼성전자_Research_Team_3_PER_260925.pdf\nC:\\Users\\RFS\\Documents\\', 138.6, 140.5, 520)
s = s.replace('@@DLG@@\n', '\n'.join(H) + '\n').replace('@@DLGTL@@\n', '\n'.join(T) + '\n\n')

# PDF 자막
o = 'cap("#c12a", 116.6, 125.3);  cap("#c12b", 126.2, 132.9);'; assert o in s
s = s.replace(o, 'cap("#c12a", 116.6, 125.3);  cap("#c12b", 126.2, 133.3);  cap("#c12c", 134.1, 140.7);')
s = re.sub(r'(id="c12b" data-start=")[\d.]+(" data-duration=")[\d.]+"', r'\g<1>126\g<2>7.8"', s)
cap12c = '''      <div class="cap capL clip" id="c12c" data-start="134" data-duration="7.2" data-track-index="2">
        <span><span class="lead">STEP 10</span>[마무리 &gt; PDF 내보내기]<span class="sub">학기·밸류만 넣으면 필드 갱신 후 학회 규칙 이름으로 저장하고 바로 엽니다</span></span></div>
'''
i = s.index('      <div class="dlg clip" id="cmp1"'); s = s[:i] + cap12c + '\n' + s[i:]

# 끝 시각 (설치 막 삭제분 당김)
for a_, b_ in [('data-start="146.8" data-duration="6"', 'data-start="143.4" data-duration="6.2"'),
               ('data-start="147.4" data-duration="5.4"', 'data-start="144" data-duration="5.6"'),
               ('data-start="147.8" data-duration="5"', 'data-start="144.4" data-duration="5.2"'),
               ('ease: "power2.out" }, 147);', 'ease: "power2.out" }, 143.6);'),
               ('ease: "power2.out" }, 147.6);', 'ease: "power2.out" }, 144.2);'),
               ('ease: "power2.out" }, 148);', 'ease: "power2.out" }, 144.6);'),
               ('data-composition-id="main" data-start="0" data-duration="152.8"', 'data-composition-id="main" data-start="0" data-duration="149.6"'),
               ('data-composition-id="chrome" data-start="0" data-duration="152.8"', 'data-composition-id="chrome" data-start="0" data-duration="149.6"'),
               ('data-composition-id="bodyp" data-start="33.4" data-duration="119.4"', 'data-composition-id="bodyp" data-start="33.4" data-duration="116.2"')]:
    assert a_ in s, a_; s = s.replace(a_, b_)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ── chrome: 마무리 막 시각, 엔딩
p = 'compositions/chrome.html'; s = io.open(p, encoding='utf-8').read()
for a_, b_ in [('zoomGroup("마무리", 107.7, 128.3);', 'zoomGroup("마무리", 107.7, 130.0);'),
               ('press("PDF 내보내기", 122.8);', 'press("PDF 내보내기", 123.2);'),
               ('focusOff(["마무리"], 128.6);', 'focusOff(["마무리"], 130.3);'),
               ('tl.to(one("#mark"), { opacity: 0, duration: 0.8, ease: "power2.inOut" }, 145.2);', 'tl.to(one("#mark"), { opacity: 0, duration: 0.8, ease: "power2.inOut" }, 142.0);'),
               ('tl.to(q(".tab"), { opacity: 0, duration: 0.5 }, 145.2);', 'tl.to(q(".tab"), { opacity: 0, duration: 0.5 }, 142.0);'),
               ('ease: "power3.inOut" }, 146.0);', 'ease: "power3.inOut" }, 142.8);'),
               ('{ y: -320, opacity: 0, duration: 1.1, ease: "power2.inOut" }, 145.2);', '{ y: -320, opacity: 0, duration: 1.1, ease: "power2.inOut" }, 142.0);')]:
    assert a_ in s, a_; s = s.replace(a_, b_)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ── body: 점검 형광펜을 실제 글자에, 주가 비교 차트 실물 규칙, PDF 카메라
p = 'compositions/body.html'; s = io.open(p, encoding='utf-8').read()
s = re.sub(r'\s*<div[^>]*class="hl hl[YPTG]"[^>]*></div>', '', s)
o = '장비 발주는 이미 시작됐고,'; assert o in s
s = s.replace(o, '<span id="wd1">장비 발주는</span> 이미 시작됐고,')
s, n1 = re.subn(r'(<span[^>]*class="no">\[자료 1-[456]\]</span>) 제목 입력</span><span([^>]*)>\(단위: \)</span>',
                r'\1 <span class="kw">제목 입력</span></span><span\2><span class="kw">(단위: )</span></span>', s)
s, n2 = re.subn(r'(<div[^>]*class="src z">)출처: , RFS Team 3</div>', r'\1<span class="kw">출처: ,</span> RFS Team 3</div>', s)
assert n1 == 3 and n2 == 3, (n1, n2)
a = s.index('        tl.fromTo(q(".hlY, .hlP, .hlT")'); b = s.index('        // [PDF 내보내기]')
s = s[:a] + '''        const HLY = "rgba(255,235,59,0.85)", HLT = "rgba(64,224,208,0.7)";
        tl.fromTo([one("#em2"), one("#em3")], { backgroundColor: "rgba(255,235,59,0)" }, { backgroundColor: HLY, duration: 0.2, immediateRender: false }, 93.4);
        tl.fromTo(one("#wd1"), { backgroundColor: "rgba(64,224,208,0)" }, { backgroundColor: HLT, duration: 0.2, immediateRender: false }, 93.6);
        // [내용 점검] — 이전 표시를 지우고 빈칸을 칠한다
        tl.to([one("#em2"), one("#em3"), one("#wd1")], { backgroundColor: "rgba(255,235,59,0)", duration: 0.2 }, 97.2);
        cam(CAM_FIG, 96.9, 1.0);
        tl.fromTo(q("#fg3 .kw"), { backgroundColor: "rgba(255,235,59,0)" }, { backgroundColor: HLY, duration: 0.18, stagger: 0.05, immediateRender: false }, 97.6);
        tl.to(q("#fg3 .kw"), { backgroundColor: "rgba(255,235,59,0)", duration: 0.3 }, 100.6);
''' + s[b:]
for a_, b_ in [('        cam(CAM_ALL, 100.6, 1.2);', '        cam(CAM_ALL, 103.6, 1.2);'),
               ('const CAM_ALL = { scale: 0.52, x: -5, y: -40 };', 'const CAM_ALL = { scale: 0.5, x: -5, y: -30 };'),
               ('tl.to(W, { y: 460, opacity: 0, duration: 1.1, ease: "power2.in" }, 107.8);', 'tl.to(W, { y: 460, opacity: 0, duration: 1.1, ease: "power2.in" }, 107.4);'),
               ('const end = i + 1 < CAMS.length ? CAMS[i + 1].t : 105.8;', 'const end = i + 1 < CAMS.length ? CAMS[i + 1].t : 103.6;'),
               ('pth(C1, "#16305c", 1.4) + pth(C2, "#8faadc", 1.4) +', 'pth(C1, "#203864", 1.75) + pth(C2, "#d0cece", 1.75) +'),
               ('<rect x="90" y="6" width="9" height="2" fill="#16305c"></rect><text x="103" y="9">삼성전자</text>',
                '<rect x="52" y="6" width="9" height="2" fill="#203864"></rect><text x="65" y="9">삼성전자(005930.KS)</text>'),
               ('<rect x="160" y="6" width="9" height="2" fill="#8faadc"></rect><text x="173" y="9">SK하이닉스</text>',
                '<rect x="152" y="6" width="9" height="2" fill="#d0cece"></rect><text x="165" y="9">SK하이닉스(000660.KS)</text>'),
               ('<text x="20" y="105">Sep-25</text><text x="130" y="105">Mar-26</text><text x="238" y="105">Sep-26</text>',
                '<text x="12" y="105">Sep-25</text><text x="74" y="105">Dec-25</text><text x="136" y="105">Mar-26</text><text x="198" y="105">Jun-26</text><text x="252" y="105">Sep-26</text>')]:
    assert a_ in s, a_; s = s.replace(a_, b_)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
