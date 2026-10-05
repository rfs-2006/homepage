#!/usr/bin/env python3
# 리포트 화면 전용 폰트 만들기: KoPubWorld 돋움(실제 리포트 PDF 폰트)에서 필요한 글자만 잘라 woff2로 저장한다.
# 글자 범위: 자주 쓰는 한글 2,350자(KS X 1001) + 영문·숫자·기호 + 리포트 데이터(page1.json, REPORTS)에 나오는 모든 글자.
# 라이선스(KoPub 약관 제4조 ②)상 수정본에는 'KoPub' 이름을 쓸 수 없어 'RFS Report Dotum'으로 이름을 바꾼다.
#
# 사용법: 사이트 루트에서
#   npm pack font-kopubworld && tar xzf font-kopubworld-*.tgz   (package/fonts/ 에 원본이 풀린다)
#   pip install fonttools brotli
#   python3 tools/build-report-font.py package/fonts
# 새 리포트를 추가하고 extract-page1.py를 돌린 뒤 이것도 다시 돌리면 새 글자가 포함된다.
import os, re, sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else 'package/fonts'
OUT = os.path.join(ROOT, 'assets', 'fonts')
FAMILY = 'RFS Report Dotum'

chars = set(chr(c) for c in range(0x20, 0x7F))
chars |= set('‘’“”·…–—―│|→↑↓←×÷%‰°※■□▲△▶▷○●◎◇◆★☆①②③④⑤⑥⑦⑧⑨⑩㈜™®©€£¥₩向無有大小上下中前後年月日')
for hi in range(0xB0, 0xC9):           # KS X 1001 완성형 한글 2,350자
    for lo in range(0xA1, 0xFF):
        try: chars.add(bytes([hi, lo]).decode('euc-kr'))
        except UnicodeDecodeError: pass
chars |= set(open(os.path.join(ROOT, 'assets', 'reports', 'page1.json'), encoding='utf-8').read())
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
i = html.index('const REPORTS = ['); chars |= set(html[i:html.index('\n];', i)])
chars = {c for c in chars if c.isprintable()}

os.makedirs(OUT, exist_ok=True)
for w in ['Light', 'Medium', 'Bold']:
    f = TTFont(os.path.join(SRC, f'KoPubWorld-Dotum-{w}.otf'))
    cmap = f.getBestCmap()
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']
    s = subset.Subsetter(opts); s.populate(unicodes=[ord(c) for c in chars if ord(c) in cmap]); s.subset(f)
    for rec in f['name'].names:          # 이름 바꾸기 (1·4·6·16번: 패밀리/전체/PostScript/선호 패밀리)
        if rec.nameID in (1, 16): rec.string = FAMILY
        elif rec.nameID == 4: rec.string = f'{FAMILY} {w}'
        elif rec.nameID == 6: rec.string = f'RFSReportDotum-{w}'
    path = os.path.join(OUT, f'rfs-report-dotum-{w.lower()}.woff2')
    f.flavor = 'woff2'; f.save(path)
    print(path, os.path.getsize(path) // 1024, 'KB')
