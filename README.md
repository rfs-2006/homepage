# R.F.S. — 중앙대학교 가치투자학회

[caurfs.kr](https://caurfs.kr)의 소스입니다. R.F.S.(Rising Financial Stars)는 2006년에 만들어진 중앙대학교 가치투자학회로, 학기마다 기업분석 리포트를 쓰고 학회 펀드를 운용합니다. 이 레포는 학회 홈페이지와, 학회 운영에 쓰는 자동화 도구를 담고 있습니다.

## 구성

| 경로 | 내용 |
|---|---|
| `index.html` | 홈페이지 본체. 해시 라우팅 SPA이고, 리포트·소개·모집 데이터가 이 파일 안의 JS 배열(`REPORTS`, `RECRUIT` 등)에 있습니다 |
| `research/<id>/` | 리포트별 정적 페이지 (검색엔진용). `tools/build-site.js`가 `REPORTS`에서 생성합니다 |
| `about/`, `recruiting/` | 소개·모집 정적 페이지. `tools/build-pages.js`가 `index.html`의 데이터에서 생성합니다 |
| `assets/` | 이미지, 리포트 PDF, 공유 썸네일, 알럼나이 재직 기관 로고(`assets/network/`) |
| `tools/` | 사이트 빌드 스크립트 (아래) |
| `tools/rfs-template-tools/` | 리포트 워드 템플릿, 설치 프로그램, 사용법 영상의 소스 ([설명](tools/rfs-template-tools/README.md)) |

## 사이트 빌드 도구 (`tools/`)

Node.js만 있으면 됩니다. 사이트 루트에서 실행합니다.

```bash
node tools/build-og.js     # 리포트별 공유 썸네일(1200x630) 생성. Chrome 또는 Edge 필요
node tools/build-site.js   # 리포트 개별 페이지, 목록, sitemap.xml 생성
node tools/build-pages.js  # /about/, /recruiting/ 생성 + 사이트맵에 추가
```

- 데이터의 원천은 `index.html` 하나입니다. 새 리포트를 `REPORTS`에 추가하고 위 세 줄을 돌리면, 정적 페이지·사이트맵·구조화 데이터(JSON-LD)·공유 썸네일이 함께 갱신됩니다.
- `tools/seo-config.js`는 데이터에서 뽑을 수 없는 키워드(옛 사명, 한글명 등)만 따로 둔 설정입니다.

## 학회 자동화 도구 (`tools/rfs-template-tools/`)

- **`vba/`** 리포트 워드 템플릿의 매크로 약 2,460줄. 서식 적용, 표·요약박스 삽입, 티커로 주가 차트 그리기(네이버 금융·Yahoo Finance·Stooq), 글꼴·크기 규격 점검
- **`installer/`** 템플릿을 팀원 PC에 깔아 주는 설치 프로그램의 빌드 스크립트. PowerShell + WPF로 설치 창을 그리고, ps2exe로 `.exe`를 만듭니다
- **`video/`** 템플릿 사용법 영상(약 2분 45초). 워드 화면을 녹화하지 않고 HTML/CSS/JS로 다시 그린 뒤 Hyperframes로 프레임 단위 렌더합니다. 효과음도 샘플 없이 코드로 합성합니다(`tools/sfx.py`)

## 배포

Netlify가 `main` 브랜치를 그대로(`publish = "."`) 배포합니다. 별도 빌드 단계는 없고, 위 생성물은 커밋해 둡니다.

## 만든 방식

이 레포의 코드는 AI 코딩 도구(Claude Code)와 함께 작성했습니다. 기획, 요구사항 정리, 결과 검수와 수정 지시는 R.F.S. 운영진이 했습니다. 커밋 기록에 공동 작성자로 표시된 것은 이 때문입니다.

## 유의사항

- 리포트 PDF와 기업 정보는 학회원이 교육 목적으로 작성한 자료이며 투자 권유가 아닙니다.
- `assets/network/`의 로고는 각 기관의 상표입니다. 알럼나이 재직 현황을 보여주는 용도로만 쓰며, 각 로고의 권리는 해당 기관에 있습니다.
- 글꼴 중 KoPubWorld돋움체와 윤고딕 540은 라이선스 때문에 포함하지 않았습니다. Pretendard, Source Serif 4, Noto Serif KR은 SIL Open Font License입니다.
