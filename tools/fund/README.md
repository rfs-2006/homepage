# RFS 펀드 실시간 수집기

키움 REST API로 운용 계좌 잔고를 장중 15초마다 조회해 Supabase(`intranet_content`, id=`fund_live`)에 저장합니다.
키움 REST API는 등록한 IP에서만 호출되므로 고정 IP가 있는 국내 서버에서 상시 실행합니다. 같은 절차로 다른 국내 클라우드(NHN Cloud, KT Cloud, 가비아 등)의 Ubuntu 서버에서도 동작합니다.

- 앱키는 주문도 가능한 키입니다. 서버의 `.env`에만 두고 저장소나 홈페이지에는 넣지 않습니다.
- 홈페이지에는 잔고 결과(종목, 비중, 수익률 등)만 올라갑니다.

## 1. 서버 만들기 (네이버 클라우드 플랫폼 기준, 원화 결제·국내 카드 가능)

1. https://www.ncloud.com 회원가입 후 결제수단(국내 카드) 등록
2. 콘솔 → Services → Compute → **Server** → 서버 생성
   - 리전: 한국
   - 이미지: **Ubuntu** (22.04 또는 24.04)
   - 서버 스펙: 가장 작은 것(Micro 또는 최저 사양)으로 충분
   - 인증키: 새로 만들고 `.pem` 파일을 내려받아 보관
   - ACG(방화벽): 기본값 그대로 (22번 SSH 허용)
3. 서버가 '운영중'이 되면 Server 목록에서 서버 선택 → **공인 IP** 신청 후 이 서버에 할당 (고정 IP, 이걸 키움에 등록)
4. 서버 선택 → 서버 관리 및 설정 변경 → **관리자 비밀번호 확인** (2의 .pem 파일 업로드)
5. 내 PC에서 접속: Windows는 PowerShell, Mac은 터미널에서 `ssh root@공인IP` 입력 후 4의 비밀번호

## 2. 키움 REST API 준비

1. https://openapi.kiwoom.com 로그인 (운용 계좌 명의 키움 아이디)
2. API 사용신청 → 약관 동의 후 신청
3. 계좌 APP Key 관리 → 운용 계좌 선택 → **IP 등록에 1번의 고정 IP 추가**
4. App Key, Secret Key 확인 (서버에만 입력)

## 3. 서버에 설치

1-5로 접속한 터미널에 아래를 차례로 붙여넣습니다.

```bash
sudo timedatectl set-timezone Asia/Seoul
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
git clone https://github.com/rfs-2006/homepage.git ~/homepage
cd ~/homepage/tools/fund
cp env.example .env
nano .env        # 값 입력 후 Ctrl+O, Enter, Ctrl+X
chmod 600 .env
node --env-file=.env collect.mjs --once   # "saved: N holdings"가 나오면 성공
```

## 4. 상시 실행 등록

```bash
sed "s#__USER__#$USER#; s#__DIR__#$PWD#" rfs-fund.service | sudo tee /etc/systemd/system/rfs-fund.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable --now rfs-fund
journalctl -u rfs-fund -f      # 로그 보기 (Ctrl+C로 나가기)
```

서버가 재부팅돼도 자동으로 다시 실행됩니다. 장중(평일 08:55~15:40)에는 15초마다, 마감 후에는 하루 한 번 확정치를 저장합니다.

## 5. 코드 업데이트

```bash
cd ~/homepage && git pull && sudo systemctl restart rfs-fund
```

## 입출금이 생기면

`.env`의 `FUND_FLOWS`에 `날짜:금액`을 쉼표로 이어 적고 `sudo systemctl restart rfs-fund` 합니다.
예: `FUND_FLOWS=2026-05-01:+1000000,2026-09-01:-500000`
