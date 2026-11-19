# inbox — 리포트 PDF 올리는 곳

여기에 기업 리포트 PDF를 올리면(GitHub 웹: Add file → Upload files → main에 Commit)
`.github/workflows/add-report.yml`이 `tools/add-report.py`로 사이트 반영까지 하고 PR을 연다.

- 파일 이름을 영문 소문자로 하면 그게 리포트 주소가 된다 (예: `gigavis.pdf` → caurfs.kr/research/gigavis/). 한글이면 회사 이름을 로마자로 바꿔 쓴다.
- 1쪽 양식(발간일│Company Analysis, │섹터│, 회사명(티커), 투자의견·목표주가·현재주가·상승여력, Research Team N)이 지금 리포트와 같아야 읽힌다.
- PR 미리보기에서 확인 → 머지. 올린 PDF는 PR에서 이 폴더에서 지워진다.
