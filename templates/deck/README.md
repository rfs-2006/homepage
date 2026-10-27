# 발표 덱 양식 (2026 하반기 반기결산)

남색 그라데이션 배경 + 위쪽 머리띠 + 큰 캡처 한 장 + 굵은 제목 한 줄 + 보조 한 줄. TORM(2026 SOKHA) 발표 서식을 참고했다.
원본 덱: claude.ai Slides 아티팩트 "R.F.S. 43대 2026 하반기 반기결산" (회장단 계정).

## 들어 있는 것
| 경로 | 내용 |
|---|---|
| `slides/cover.html` | 표지: 금속판 로고 배경 + 오른쪽 제목 |
| `slides/summary.html` | 목차(SUMMARY): 세로줄 + Ⅰ~Ⅷ 번호 |
| `slides/content.html` | 본문: 머리띠(R.F.S. · 섹션 이름 · 로고) + 제목 + 보조 + 캡처 1장 |
| `slides/ranking.html` | 순위 카드 3장 (시상·결과 발표용) |
| `slides/closing.html` | 마무리: 밝은 그라데이션 + 따옴표 인용 |
| `assets/bg-dark.jpg` · `bg-light.jpg` | 본문·마무리 배경 (1920×1080) |
| `assets/cover-slab.jpg` | 표지 배경 (금속판 로고 3D 렌더, RFS 색 보정) |
| `cover/scene.py` · `seal_h.png` | 표지 배경을 다시 렌더링하는 Blender 스크립트와 로고 높이 지도 |
| `preview/*.jpg` | 완성 모습 |

## 쓰는 법
- 슬라이드 파일은 Claude Slides 형식(1920×1080, `<section>` 하나, 인라인 스타일)이다. Claude에게 "templates/deck 양식으로 덱 만들어 줘"라고 하면 된다.
- 자리 표시 `[제목 한 줄]` `[보조 한 줄]` `[섹션 이름]` `[캡처 이미지]` `[발표 노트]`를 채운다. 이미지 경로는 이 폴더 기준이다 (Slides 아티팩트에 올리면 `/_blob/...` 주소로 바뀐다).
- 글꼴: 제목 KoPub 돋움 Bold, 본문 KoPub 돋움 Medium (`assets/fonts/rfs-report-dotum-*.woff2`, 라이선스 `assets/fonts/KoPub-LICENSE.md`).
- 색: 남색 #203864 · 하늘 #8FAADC · 종이 #F7F6F3 · 잉크 #0F1B2E. 회색 글씨와 작은 부가 설명은 쓰지 않는다.
- 캡처는 1440×900으로 찍어 1040×650 칸에 넣는다. 화면의 Polaris 말풍선(.rfs-bot-tip)은 지우고 찍는다.

## 표지 배경 다시 만들기
```
pip install bpy            # Blender 5.x 파이썬 모듈
python -c "import sys;sys.argv=['x','--','slab','out.png','48','100','s1'];exec(open('templates/deck/cover/scene.py').read())"
```
마지막 인자 `s1`~`s4`는 카메라 구도. 렌더 뒤 밝기를 RFS 색으로 바꾸는 보정(어두운 곳 #203864, 밝은 곳 #8FAADC)을 한 번 거친다.

## 주의
- 공개 저장소다. 실명·연락처·금액이 든 캡처나 슬라이드는 여기 올리지 않는다 (RFM은 별칭만).
