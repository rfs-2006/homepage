# R.F.S. Template Tools

중앙대 가치투자학회 R.F.S.의 기업분석 리포트 워드 템플릿(`RFS_Report.dotm`), 그 템플릿을 팀원 PC에 깔아 주는 설치 프로그램, 사용법 안내 영상의 소스입니다.

```
installer/   설치 프로그램 빌드 스크립트와 재료
vba/         템플릿 매크로 소스 (.dotm에서 뽑은 텍스트)
video/       사용법 영상 (HTML/CSS/JS → Hyperframes로 MP4 렌더)
```

## 1. 리포트 템플릿과 매크로 (`vba/`)

`RFS_Macros.bas`(약 2,460줄)는 `RFS_Report.dotm`에 들어 있는 매크로를 그대로 뽑은 것입니다. 워드 리본의 R.F.S. 탭 버튼이 이 매크로를 부릅니다.

- 표지·본문 서식 적용, 표·요약박스·사이드노트 삽입(템플릿 끝 '블록 저장소'에서 서식째 복사)
- 주가 차트: 티커와 시작일을 받아 네이버 금융·Yahoo Finance·Stooq에서 시세를 받아 차트로 그림 (API 키 불필요)
- 양식 점검: 글꼴·크기가 규격에서 벗어난 곳을 찾아 표시

코드를 고칠 때는 `.dotm`을 워드에서 열고 VBA 편집기(Alt+F11)에서 수정한 뒤, 이 폴더의 `.bas`도 다시 내보내 맞춰 둡니다.

## 2. 설치 프로그램 (`installer/`)

`배포파일_만들기.bat`을 실행하면 같은 폴더에 `RFS_Template_Setup.bat`과 `RFS_Template_Setup.exe`가 생깁니다. 팀원에게는 이 파일 하나만 보내면 됩니다.

- 템플릿·인장·배경 이미지·글꼴을 gzip + base64로 설치 파일 하나에 넣습니다.
- 설치 창은 PowerShell + WPF로 그립니다. 인장이 나타난 뒤 남색 판이 펼쳐지며 창이 조립되는 인트로가 있습니다.
- 설치하면 템플릿은 `문서\사용자 지정 Office 서식 파일`로, 글꼴은 사용자 글꼴 폴더로 들어갑니다. 관리자 권한은 필요 없습니다.
- exe 변환에는 [ps2exe](https://github.com/MScholtes/PS2EXE)를 씁니다. 없으면 처음 한 번 자동으로 설치합니다.

**글꼴:** 빌드하는 PC에 KoPubWorld돋움체와 윤고딕 540이 설치돼 있어야 설치 파일에 들어갑니다. `installer/fonts/` 폴더를 만들어 넣어도 됩니다. 이 레포에는 글꼴 파일이 없습니다.

## 3. 사용법 영상 (`video/`)

실제 워드 화면을 녹화하지 않았습니다. 워드 화면을 단순화해 HTML로 다시 그리고, [Hyperframes](https://www.npmjs.com/package/hyperframes)로 프레임 단위로 렌더했습니다. 길이는 약 2분 45초입니다.

```bash
cd video
python tools/check-order.py                                # 렌더 전 점검: 누르지 않은 버튼의 결과가 먼저 보이는 곳이 없는지
python tools/sfx.py tools/events.json assets/sfx.wav       # 효과음 트랙 생성 (약 40초, 샘플 없이 전부 합성)
npm run dev                                                # 미리보기
npm run render                                             # MP4 렌더
```

- `assets/sfx.wav`는 용량(30MB) 때문에 레포에서 뺐습니다. 위 명령으로 만들면 원본과 바이트 단위로 같은 파일이 나옵니다.
- `tools/events.json`이 효과음 타이밍의 최종본입니다. 시간축 조정과 손 편집이 반영돼 있으니 `tools/archive/`의 `events.py`나 `warp*.py`로 다시 만들지 마세요.
- `tools/archive/`에는 제작 중에 한 번씩 쓴 수정 스크립트가 있습니다. 기록용이고, 다시 돌리면 `index.html`이 바뀝니다.
- 콘티와 결정 사항은 `PROJECT.md`에 있습니다.

**아이콘:** 영상 속 워드 리본은 Office의 `imageMso` 아이콘을 단순화해 그렸습니다. 마이크로소프트 소유 자산이라 이 레포에는 `video/assets/icons/`, `icons_32/`를 넣지 않았습니다. 영상을 다시 렌더하려면 워드의 VBA에서 `Application.CommandBars.GetImageMso(이름, 크기)`로 `PROJECT.md`에 적힌 26종을 직접 뽑아 두 폴더에 넣으세요. 없으면 영상의 해당 자리가 비어 보입니다.

**글꼴:** 레포에 든 Pretendard, Source Serif 4, Noto Serif KR은 SIL Open Font License입니다. 리포트 본문을 재현하는 아래 글꼴은 라이선스 때문에 넣지 않았으니, 각자 받아 `video/assets/fonts/`에 이 이름 그대로 넣으세요.

| 파일 이름 | 글꼴 | 받는 곳 |
|---|---|---|
| `KoPubWorld Dotum Light.ttf` | KoPubWorld돋움체 Light | 한국출판인회의 |
| `KoPubWorld Dotum Medium.ttf` | KoPubWorld돋움체 Medium | 한국출판인회의 |
| `KoPubWorld Dotum Bold.ttf` | KoPubWorld돋움체 Bold | 한국출판인회의 |
| `YoonGothic540.ttf` | 윤고딕 540 | 윤디자인 (유료) |

글꼴이 없으면 영상 속 리포트 본문이 기본 글꼴로 대체됩니다.
