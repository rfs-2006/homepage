#!/usr/bin/env python3
# 리포트 화면 전용 폰트 만들기: KoPubWorld 돋움(실제 리포트 PDF 폰트)에서 필요한 글자만 잘라 woff2로 저장한다.
# 글자 범위: 자주 쓰는 한글 2,350자(KS X 1001) + 영문·숫자·기호 + 리포트 데이터(page1.json, REPORTS, 전문 full/*.json, 용어 풀이)에 나오는 모든 글자.
# 라이선스(KoPub 약관 제4조 ②)상 수정본에는 'KoPub' 이름을 쓸 수 없어 'RFS Report Dotum'으로 이름을 바꾼다.
#
# 사용법: 사이트 루트에서
#   npm pack font-kopubworld && tar xzf font-kopubworld-*.tgz   (package/fonts/ 에 원본이 풀린다)
#   pip install fonttools brotli ttfautohint-py
# 원본 OTF(CFF)에는 힌팅이 없어 Windows에서 얇은 획이 픽셀 사이에 걸려 흐릿하게 보인다.
# 그래서 TrueType 곡선으로 바꾸고 ttfautohint로 세로 힌팅을 넣는다. 모든 크기에서 켠다
# (본문 14.5px에서 여섯 가지를 견줘 보고 고른 방식. 획 굵기는 그대로 두는 natural 모드)
#   python3 tools/build-report-font.py package/fonts
# 새 리포트를 추가하고 extract-page1.py를 돌린 뒤 이것도 다시 돌리면 새 글자가 포함된다.
import io, os, re, sys
from fontTools import subset
from fontTools.ttLib import TTFont, newTable
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
import ttfautohint                     # pip install ttfautohint-py

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
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read() + '\n' + open(os.path.join(ROOT, 'assets', 'app.js'), encoding='utf-8').read()   # REPORTS는 assets/app.js에
i = html.index('const REPORTS = ['); chars |= set(html[i:html.index('\n];', i)])
import glob                            # 리포트 전문·용어 풀이에 나오는 글자(Ⅰ·℃·㎡·한자 등)도 넣는다
for path in glob.glob(os.path.join(ROOT, 'assets', 'reports', 'full', '*.json')) + glob.glob(os.path.join(ROOT, 'assets', 'reports', 'glossary.json')):
    chars |= set(open(path, encoding='utf-8').read())
chars = {c for c in chars if c.isprintable()}



def to_truetype(f):
    """CFF 곡선(3차) → TrueType 곡선(2차). 모양은 1/1000 안에서 같다"""
    gs = f.getGlyphSet(); order = f.getGlyphOrder(); glyphs = {}
    for n in order:
        pen = TTGlyphPen(gs); gs[n].draw(Cu2QuPen(pen, max_err=1.0, reverse_direction=True)); glyphs[n] = pen.glyph()
    f['loca'] = newTable('loca'); g = f['glyf'] = newTable('glyf'); g.glyphOrder = order; g.glyphs = glyphs
    del f['CFF ']
    if 'VORG' in f:
        del f['VORG']
    f['head'].glyphDataFormat = 0
    m = f['maxp']; m.tableVersion = 0x00010000
    for k in ('maxZones', 'maxTwilightPoints', 'maxStorage', 'maxFunctionDefs', 'maxInstructionDefs', 'maxStackElements',
              'maxSizeOfInstructions', 'maxComponentElements', 'maxComponentDepth', 'maxPoints', 'maxContours',
              'maxCompositePoints', 'maxCompositeContours'):
        setattr(m, k, 1 if k == 'maxZones' else 0)
    f['post'].formatType = 3.0
    f.sfntVersion = '\0\1\0\0'
    return f


def autohint(f):
    """세로 방향 힌팅. 한글은 ttfautohint가 따로 다루지 않아 라틴 기준(latn)으로 가로획 높이를 맞춘다. 획 굵기는 그대로(natural)"""
    b = io.BytesIO(); f.flavor = None; f.save(b)
    out = ttfautohint.ttfautohint(in_buffer=b.getvalue(), fallback_script='latn', hinting_range_min=8, hinting_range_max=60,
                                  increase_x_height=0, windows_compatibility=True, gray_stem_width_mode=-1,
                                  gdi_cleartype_stem_width_mode=-1, dw_cleartype_stem_width_mode=-1, no_info=True)
    return TTFont(io.BytesIO(out))


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
    f = autohint(to_truetype(f))
    path = os.path.join(OUT, f'rfs-report-dotum-{w.lower()}.woff2')
    f.flavor = 'woff2'; f.save(path)
    print(path, os.path.getsize(path) // 1024, 'KB')
