import io, re

def SH(t): return t + 6.6 + (4.2 if t >= 92.0 else 0)
def fm(x): return ('%.2f' % x).rstrip('0').rstrip('.')
G = '&gt;'

# 단계: (id, lead, tIn, tOut, [(원래 누름 시각 or None, 제목, 설명줄들)])
STEPS = [
 ('s2a', '표지', 13.06, 20.08, [(None, '표지', ['종목명 · 티커 · 섹터 · 투자의견 · 목표주가 — 수기 입력'])]),
 ('s2b', '표지', 22.16, 25.2, [(None, '머리글 · 바닥글', ['종목명 · 팀명 — 자동 삽입'])]),
 ('s01', 'STEP 01', 26.4, 32.9, [(None, '[데이터 %s 주가 차트]' % G, ['주가 · Stock Data — API 연동, 자동 삽입', '투자의견 · 목표주가 · 상승여력 · 주요주주 — 수기 입력'])]),
 ('s02', 'STEP 02', 34.3, 41.8, [
    (28.4, '[제목 %s 대제목]' % G, ['검정 22pt · KoPub Medium · Ⅰ. 자동 번호']),
    (30.6, '[제목 %s 중제목]' % G, ['남색 12pt · KoPub Bold']),
    (32.4, '[제목 %s 소제목]' % G, ['파랑 10pt · KoPub Bold'])]),
 ('s03', 'STEP 03', 43.3, 52.8, [
    (37.4, '[문단 %s 본문]' % G, ['검정 10pt · KoPub Light · 장평 98%']),
    (39.2, '[문단 %s 글머리 ①]' % G, ['본문 + ① ② ③ 번호']),
    (41.0, '[문단 %s 요약박스]' % G, ['본문 + 회색 음영 (#D0CECE)']),
    (42.8, '[문단 %s 사이드노트]' % G, ['검정 10pt · KoPub Bold · 왼쪽 여백 5.5cm'])]),
 ('s04', 'STEP 04', 54.3, 61.8, [
    (48.4, '[자료 틀 %s 1단 틀]' % G, ['폭 20.1cm · 자료 번호 자동']),
    (49.9, '[자료 틀 %s 2단 틀]' % G, ['폭 10.05cm × 2 · 자료 번호 자동']),
    (51.4, '[자료 틀 %s 3단 틀]' % G, ['폭 6.7cm × 3 · 자료 번호 자동'])]),
 ('s05', 'STEP 05', 63.3, 69.8, [
    (57.4, '[강조 %s 강조]' % G, ['선택 글자 → KoPub Bold']),
    (59.0, '[강조 %s 빨강 강조]' % G, ['선택 글자 → 빨강 (#C00000) · KoPub Bold']),
    (60.6, '[강조 %s 첫문장 볼드]' % G, ['문서 전체 본문 첫 문장 → KoPub Bold'])]),
 ('s06', 'STEP 06', 71.3, 80.8, [
    (66.4, '[차트·표 %s 차트 양식]' % G, ['선 1.75pt · 축 0.25pt · 범례 위 · 코펍 7pt']),
    (68.4, '[차트·표 %s 엑셀 표]' % G, ['머리글 흰색 7.5pt · 남색 바탕', '본문 7.5pt · 숫자 오른쪽 정렬']),
    (70.4, '[차트·표 %s 추정치 구분]' % G, ['E 항목 (2026E …) → 점선 · 연한 색'])]),
 ('s07', 'STEP 07', 82.3, 94.8, [
    (76.6, '[주석 %s 빨간 글]' % G, ['빨강 7pt · KoPub Bold']),
    (78.2, '[주석 %s 화살표]' % G, ['빨강 0.75pt']),
    (79.8, '[주석 %s 강조 상자]' % G, ['빨강 · 투명도 90%']),
    (81.4, '[주석 %s 폭 맞추기]' % G, ['차트 → 칸 폭 (20.1 / 10.05 / 6.7cm)']),
    (82.8, '[주석 %s 점선 상자]' % G, ['빨강 점선 1.25pt · 채움 없음']),
    (84.2, '[주석 %s 점선 원]' % G, ['빨강 점선 1.25pt']),
    (85.6, '[주석 %s 더보기]' % G, ['구간 음영: 연파랑 · 투명도 50%', '남색 메모: 남색 6pt · Bold'])]),
 ('s08', 'STEP 08', 96.3, 107.0, [
    (90.4, '[데이터 %s 주가 비교]' % G, ['티커 · 시작일 입력 → 시작일 = 100 비교 차트', 'API 연동']),
    (93.2, '[데이터 %s 모델 값]' % G, ['엑셀 모델 값 → 본문 연결 숫자'])]),
 ('s09', 'STEP 09', 108.5, 114.9, [
    (98.4, '[글꼴 %s 코펍 볼드]' % G, ['KoPubWorld돋움체 Bold']),
    (99.8, '[글꼴 %s 코펍 미디움]' % G, ['KoPubWorld돋움체 Medium (표)']),
    (101.2, '[글꼴 %s 코펍 라이트]' % G, ['KoPubWorld돋움체 Light (본문)']),
    (102.6, '[글꼴 %s 윤고딕 540]' % G, ['Yoon 윤고딕 540 (자료 캡션 9pt)'])]),
 ('s10', 'STEP 10', 116.6, 140.7, [
    (109.0, '[마무리 %s 필드 갱신]' % G, ['목차 · 자료 번호 · 장 번호 · 쪽 번호 갱신']),
    (115.6, '[마무리 %s 양식 점검]' % G, ['노랑: 스타일 없는 문단', '분홍: 번호 없는 대제목', '청록: 허용 외 글꼴']),
    (119.8, '[마무리 %s 내용 점검]' % G, ['노랑: 빈 캡션 · 출처', '연두: 표지와 다른 숫자', '청록: 표기 규칙']),
    (123.2, '[마무리 %s PDF 내보내기]' % G, ['[학기]_회사_Research_Team_N_밸류_YYMMDD.pdf'])]),
]

p = 'index.html'; s = io.open(p, encoding='utf-8').read()
# 기존 자막 제거
s, n = re.subn(r'\n\s*<div[^>]*class="cap[^"]*"[^>]*>.*?</div>', '', s, flags=re.S)
print('removed caps', n)
s = re.sub(r'^[ \t]*(tl\.fromTo\("#cap1"|tl\.to\("#cap1"|cap\("#c\w+").*\n', '', s, flags=re.M)
left = [l for l in s.split('\n') if '"#cap1"' in l or 'cap("#c' in l]
assert not left, left

css = '''      .capL .sw { position: relative; height: 150px; }
      .capL .v { position: absolute; left: 0; top: 0; width: 100%; opacity: 0; }
      .capL .v .tt { display: block; }
      /* 시작하는 법 */
      #start { position: absolute; left: 0; right: 0; top: 688px; text-align: center; opacity: 0; z-index: 5; }
      #start .k { font-size: 13px; font-weight: 500; color: #8faadc; letter-spacing: 0.34em; }
      #start .path { margin-top: 18px; display: flex; justify-content: center; align-items: center; gap: 6px; }
      #start .c { font-size: 25px; font-weight: 500; color: rgba(247,246,243,0.34); padding: 7px 16px; border-radius: 4px; border: 1px solid rgba(143,170,220,0); }
      #start .sep { font-size: 22px; color: rgba(143,170,220,0.6); }
'''
s = s.replace('    </style>', css + '    </style>', 1)

H = ['''      <div id="start" class="clip" data-start="8.3" data-duration="3.2" data-track-index="2">
        <div class="k">START</div>
        <div class="path"><span class="c" id="st1">파일</span><span class="sep">›</span><span class="c" id="st2">새로 만들기</span><span class="sep">›</span><span class="c" id="st3">개인</span><span class="sep">›</span><span class="c" id="st4">RFS_Report</span></div>
      </div>''']
T = ['''      // 시작하는 법 — 파일 › 새로 만들기 › 개인 › RFS_Report
      tl.fromTo("#start", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 8.4);
      ["#st1", "#st2", "#st3", "#st4"].forEach(function (id, i) {
        tl.to(id, { color: "rgba(247,246,243,0.95)", duration: 0.25 }, 8.75 + i * 0.4);
      });
      tl.to("#st4", { backgroundColor: "rgba(143,170,220,0.22)", borderColor: "#8faadc", duration: 0.2 }, 10.15);
      tl.to("#st4", { scale: 0.93, duration: 0.1, yoyo: true, repeat: 1, ease: "power2.inOut" }, 10.3);
      tl.to("#start", { opacity: 0, y: -8, duration: 0.45, ease: "power1.in" }, 10.85);
''']
for sid, lead, tIn, tOut, vs in STEPS:
    vh = []
    for i, (pt, title, subs) in enumerate(vs):
        sub = ''.join('<span class="ln">%s</span>' % x for x in subs)
        vh.append('<div class="v" id="%sv%d"><span class="tt">%s</span><span class="sub">%s</span></div>' % (sid, i, title, sub))
    H.append('''      <div class="cap capL clip" id="%s" data-start="%s" data-duration="%s" data-track-index="2">
        <span class="lead">%s</span><div class="sw">%s</div></div>''' % (sid, fm(tIn - 0.1), fm(tOut - tIn + 0.7), lead, ''.join(vh)))
    T.append('      cap("#%s", %s, %s);  tl.set("#%sv0", { opacity: 1 }, %s);' % (sid, fm(tIn), fm(tOut), sid, fm(tIn - 0.05)))
    for i in range(1, len(vs)):
        ts = SH(vs[i][0]) - 0.55
        T.append('      tl.to("#%sv%d", { opacity: 0, y: -6, duration: 0.22 }, %s);  tl.fromTo("#%sv%d", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, %s);'
                 % (sid, i - 1, fm(ts), sid, i, fm(ts + 0.12)))
i = s.index('      <div data-hf-id="hf-iwke" class="end clip" id="endMsg"')
s = s[:i] + '\n'.join(H) + '\n' + s[i:]
i = s.index('      tl.fromTo("#endMsg"')
s = s[:i] + '\n'.join(T) + '\n\n' + s[i:]
# 엔딩 문구
s = re.sub(r'(id="endMsg"[^>]*>)[^<]*<', r'\g<1>R.F.S. Equity Research Template<', s)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# 효과음: 시작 경로
p = 'tools/events.py'; e = io.open(p, encoding='utf-8').read()
if '# 시작하는 법' not in e:
    e = e.replace("ev(10.6, \"cam\", dur=0.9, gain=0.6)",
                  "ev(10.6, \"cam\", dur=0.9, gain=0.6)\n# 시작하는 법\nfor i in range(4): ev(8.75 + i * 0.4, \"softclick\", gain=0.4)\nev(10.3, \"click\", gain=0.9)")
    io.open(p, 'w', encoding='utf-8', newline='\n').write(e)
print('ok')
