import io

# ══════════ 9막 · 도구함 / 10막 · 엔딩 + PDF 파일명 ══════════

# ── chrome: 9막 도구함 점등, 10막 인장 복귀 ──
p = 'compositions/chrome.html'
s = io.open(p, encoding='utf-8').read()

ACT910 = '''        // ── 9막 · 도구함 (전역 110~121초) ──
        // 아직 한 번도 안 누른 버튼들이 왼쪽부터 차례로 켜진다
        const USED = ["주가 차트","대제목","요약박스","중제목","소제목","본문","사이드노트",
                      "1단 틀","2단 틀","3단 틀","차트 양식","엑셀 표","추정치 구분",
                      "빨간 글","화살표","강조 상자","점선 원",
                      "필드 갱신","양식 점검","내용 점검","PDF 내보내기"];
        const rest = [];
        root.querySelectorAll("#groups [data-btn]").forEach(function (b) {
          if (USED.indexOf(b.dataset.btn) === -1) rest.push(b);
        });
        tl.fromTo(rest, { backgroundColor: "rgba(27,63,122,0)" },
          { backgroundColor: "rgba(143,170,220,0.42)", duration: 0.26, ease: "power1.out",
            stagger: 0.36, immediateRender: false }, 111.0);
        tl.to(rest, { backgroundColor: "rgba(27,63,122,0)", duration: 0.5, ease: "power1.inOut", stagger: 0.36 }, 111.7);

        // ── 10막 · 엔딩 (전역 121~129초) ──
        tl.to(one("#ribbon"), { y: -300, opacity: 0, duration: 1.1, ease: "power2.inOut" }, 121.0);
        tl.to(one("#mark"), { opacity: 0, duration: 0.8, ease: "power2.inOut" }, 121.0);
        tl.to(one("#sealWrap"), { x: 0, y: -96, scale: 0.78, opacity: 1, duration: 1.4, ease: "power3.inOut" }, 121.2);

        // ── 버튼 → 결과물 연결선 ──'''
s = s.replace('        // ── 버튼 → 결과물 연결선 ──', ACT910)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('chrome act9/10 ok')

# ── body: 9막 전 페이지 퇴장 ──
p = 'compositions/body.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace('\n        window.__timelines["bodyp"] = tl;',
'''
        // 9막으로 — 문서가 물러난다 (local = global - 33.6)
        tl.to(one("#bWrap"), { y: 300, opacity: 0, duration: 1.2, ease: "power2.in" }, 75.9);
\n        window.__timelines["bodyp"] = tl;''')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('body act9 ok')

# ── index: PDF 파일명 · 9막/10막 자막 · 길이 ──
p = 'index.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace('data-start="0" data-duration="110" data-width="1920"', 'data-start="0" data-duration="129" data-width="1920"')
s = s.replace('data-composition-id="chrome" data-start="0" data-duration="110"', 'data-composition-id="chrome" data-start="0" data-duration="129"')
s = s.replace('data-composition-id="bodyp" data-start="33.6" data-duration="76.4"', 'data-composition-id="bodyp" data-start="33.6" data-duration="77.4"')

CSS = '''
      /* PDF 파일명 */
      #pdfName { position: absolute; left: 0; right: 0; top: 858px; text-align: center; opacity: 0; }
      #pdfName .box { display: inline-block; padding: 16px 26px; background: rgba(32,56,100,0.92);
        border: 1px solid rgba(143,170,220,0.45); border-radius: 6px; }
      #pdfName .fn { font-size: 26px; font-weight: 500; color: #f7f6f3; letter-spacing: -0.01em;
        white-space: nowrap; overflow: hidden; display: inline-block; vertical-align: bottom; }
      #pdfName .lead2 { display: block; font-size: 13px; font-weight: 500; letter-spacing: 0.3em;
        color: #8faadc; margin-bottom: 12px; }

      /* 엔딩 */
      .end { position: absolute; left: 0; right: 0; text-align: center; opacity: 0; color: #f7f6f3; }
      #endMsg  { top: 620px; font-size: 40px; font-weight: 400; letter-spacing: -0.01em; }
      #endWho  { top: 706px; font-size: 20px; font-weight: 500; color: rgba(247,246,243,0.72); letter-spacing: 0.05em; }
      #endSite { top: 752px; font-size: 17px; font-weight: 500; color: #8faadc; letter-spacing: 0.22em; }
'''
s = s.replace('    </style>', CSS + '    </style>')

s = s.replace('''    </div>

    <script>''', '''      <div id="pdfName" class="clip" data-start="105.2" data-duration="5.6" data-track-index="2">
        <div class="box"><span class="lead2">PDF 내보내기</span><span class="fn" id="fnText">[26-2]_삼성전자_Research_Team_3_PER_260924.pdf</span></div>
      </div>

      <div class="cap capL clip" id="cap14" data-start="111.0" data-duration="9.0" data-track-index="2">
        <span><span class="lead">STEP 08</span>나머지는 필요할 때<span class="sub">글머리 ① · 강조 · 글꼴 · 주가 비교 · 모델 값 · 설치</span></span>
      </div>

      <div class="end clip" id="endMsg"  data-start="123.0" data-duration="6.0" data-track-index="2">좋은 리포트 기대하겠습니다.</div>
      <div class="end clip" id="endWho"  data-start="123.6" data-duration="5.4" data-track-index="2">R.F.S. 43rd · 김민석</div>
      <div class="end clip" id="endSite" data-start="124.0" data-duration="5.0" data-track-index="2">CAURFS.KR</div>
    </div>

    <script>''')
s = s.replace('      window.__timelines["main"] = tl;', '''      // PDF 파일명이 한 글자씩 타이핑된다
      tl.fromTo("#pdfName", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, 105.4);
      tl.fromTo("#fnText", { clipPath: "inset(0 100% 0 0)" },
        { clipPath: "inset(0 0% 0 0)", duration: 1.9, ease: "steps(46)" }, 105.8);
      tl.to("#pdfName", { opacity: 0, duration: 0.5, ease: "power1.in" }, 110.0);

      tl.fromTo("#cap14", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, 111.2);
      tl.to("#cap14", { opacity: 0, duration: 0.5, ease: "power1.in" }, 119.4);

      tl.fromTo("#endMsg",  { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" }, 123.2);
      tl.fromTo("#endWho",  { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 123.9);
      tl.fromTo("#endSite", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 124.3);

      window.__timelines["main"] = tl;''')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('index act9/10 ok')
