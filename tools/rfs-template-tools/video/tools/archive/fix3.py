import io
p='compositions/chrome.html'; s=io.open(p,encoding='utf-8').read()

# 돋보기를 왼쪽 아래로 — 왼쪽 = 설명+도구 / 오른쪽 = 문서
s=s.replace('const PX = 1372, PY = 560, PS = 1.9;    // 돋보기 패널 위치·배율',
            'const PX = 140, PY = 768, PS = 1.55;    // 돋보기 패널 위치·배율 (자막 아래 왼쪽)')
s=s.replace('#chrome .zpanel { position: absolute; left: 1372px; top: 560px; transform-origin: top left;',
            '#chrome .zpanel { position: absolute; left: 140px; top: 768px; transform-origin: top left;')

# 연결선 — 이제 패널이 종이 왼쪽에 있으므로 모두 왼쪽에서 들어간다
for a,b in [
 ('{ t: 51.50, btn: "1단 틀",     ex: 1316, ey: 470, out: 1.00, side: "right" },','{ t: 51.50, btn: "1단 틀",     ex:  608, ey: 470, out: 1.00 },'),
 ('{ t: 53.00, btn: "2단 틀",     ex: 1316, ey: 722, out: 1.00, side: "right" },','{ t: 53.00, btn: "2단 틀",     ex:  608, ey: 722, out: 1.00 },'),
 ('{ t: 54.50, btn: "3단 틀",     ex: 1316, ey: 912, out: 1.00, side: "right" },','{ t: 54.50, btn: "3단 틀",     ex:  608, ey: 912, out: 1.00 },'),
 ('{ t: 63.30, btn: "차트 양식",   ex: 1316, ey: 580, out: 1.10, side: "right" },','{ t: 63.30, btn: "차트 양식",   ex:  608, ey: 577, out: 1.10 },'),
 ('{ t: 66.70, btn: "엑셀 표",     ex: 1316, ey: 760, out: 1.10, side: "right" },','{ t: 66.70, btn: "엑셀 표",     ex:  608, ey: 800, out: 1.10 },'),
 ('{ t: 69.90, btn: "추정치 구분", ex: 1316, ey: 560, out: 1.10, side: "right" },','{ t: 69.90, btn: "추정치 구분", ex:  608, ey: 556, out: 1.10 },'),
 ('{ t: 78.50, btn: "빨간 글",     ex: 1316, ey: 506, out: 1.00, side: "right" },','{ t: 78.50, btn: "빨간 글",     ex:  608, ey: 500, out: 1.00 },'),
 ('{ t: 80.50, btn: "화살표",     ex: 1316, ey: 544, out: 1.00, side: "right" },','{ t: 80.50, btn: "화살표",     ex:  608, ey: 540, out: 1.00 },'),
 ('{ t: 82.50, btn: "강조 상자",   ex: 1316, ey: 584, out: 1.00, side: "right" },','{ t: 82.50, btn: "강조 상자",   ex:  608, ey: 584, out: 1.00 },'),
 ('{ t: 84.50, btn: "점선 원",     ex: 1316, ey: 620, out: 1.00, side: "right" },','{ t: 84.50, btn: "점선 원",     ex:  608, ey: 624, out: 1.00 },'),
]:
    assert a in s, a
    s=s.replace(a,b)
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
print('돋보기 좌측 이동 + 연결선 재배치')
