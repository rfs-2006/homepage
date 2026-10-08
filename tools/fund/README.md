# RFS 펀드 실시간 수집기

키움 REST API로 운용 계좌 잔고를 장중 15초마다 조회해 Supabase(`intranet_content`, id=`fund_live`)에 저장합니다.
키움 REST API는 등록한 IP에서만 호출되므로 고정 IP가 있는 국내 서버에서 상시 실행합니다.

- 앱키는 주문도 가능한 키입니다. 서버의 `.env`에만 두고 저장소나 홈페이지에는 넣지 않습니다.
- 홈페이지에는 잔고 결과(종목, 비중, 수익률 등)만 올라갑니다.

## 1. 서버 만들기 (AWS Lightsail 서울 리전 기준)

1. https://lightsail.aws.amazon.com 접속 후 로그인
2. Create instance
   - Region: **Seoul (ap-northeast-2)**
   - Platform: Linux/Unix, Blueprint: OS Only → **Ubuntu 24.04 LTS**
   - Plan: 가장 작은 플랜으로 충분
3. 인스턴스가 만들어지면 Networking 탭 → **Attach static IP** (고정 IP, 인스턴스에 연결돼 있으면 무료)
4. 고정 IP 주소를 메모

## 2. 키움 REST API 준비

1. https://openapi.kiwoom.com 로그인 (운용 계좌 명의 키움 아이디)
2. API 사용신청 → 약관 동의 후 신청
3. 계좌 APP Key 관리 → 운용 계좌 선택 → **IP 등록에 1번의 고정 IP 추가**
4. App Key, Secret Key 확인 (서버에만 입력)

## 3. 서버에 설치

Lightsail 인스턴스 화면의 **Connect using SSH** 버튼으로 터미널을 열고 아래를 차례로 붙여넣습니다.

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
sudo cp rfs-fund.service /etc/systemd/system/
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
