# Polaris 챗봇 서버 설치 (펀드 서버에 같이 올리기)

네이버 클라우드 펀드 서버(Micro, 1GB)에 챗봇을 같이 돌린다. 챗봇 메모리는 최대 약 0.5GB.

- 챗봇은 전용 사용자 `polaris`로 돌고, systemd 설정으로 `/root`(펀드 코드·키움 `.env`)를 아예 못 본다.
- Anthropic·Voyage 키는 root만 읽는 `/etc/polaris.env`에 두고 systemd가 넣어 준다.
- 바깥에서는 Caddy가 `https://api.caurfs.kr`로 받아 이 서버 안의 챗봇(127.0.0.1:8787)에 넘긴다. 8787은 밖에 열지 않는다.

## 0. 미리 할 것 (콘솔에서)

1. 네이버 클라우드 → Server → 펀드 서버(rfs-fund)의 ACG에 들어오는 규칙 추가: TCP 80, TCP 443 (접근 소스 0.0.0.0/0)
2. caurfs.kr 도메인 DNS에 A 레코드 추가: 이름 `api`, 값 = 펀드 서버 공인 IP

## 1. 서버에 접속

```bash
ssh root@펀드서버공인IP
```

## 2. 설치 (차례로 붙여 넣기)

```bash
# 메모리 여유: 1GB 스왑 (이미 있으면 건너뛴다)
[ -f /swapfile ] || { fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab; }

apt-get update && apt-get install -y python3-venv git caddy

# 전용 사용자와 폴더
useradd --system --home /srv/polaris --shell /usr/sbin/nologin polaris
mkdir -p /srv/polaris/log /srv/polaris/.ssh && chown -R polaris:polaris /srv/polaris && chmod 700 /srv/polaris/.ssh

# 비공개 데이터 저장소를 받을 읽기 전용 키
sudo -u polaris ssh-keygen -t ed25519 -N '' -C polaris-server -f /srv/polaris/.ssh/id_ed25519
cat /srv/polaris/.ssh/id_ed25519.pub
```

마지막 줄에 나온 `ssh-ed25519 …` 한 줄을 복사해서
GitHub → rfs-2006/rfs-cafe-data → Settings → Deploy keys → Add deploy key 에 붙여 넣는다 (Title: polaris-server, **Allow write access는 체크하지 않는다**).

```bash
# 코드(공개)와 데이터(비공개, 검색에 쓰는 폴더만)
sudo -u polaris git clone --depth 1 -b main https://github.com/rfs-2006/homepage.git /srv/polaris/homepage
sudo -u polaris env GIT_SSH_COMMAND='ssh -o StrictHostKeyChecking=accept-new' \
  git clone --filter=blob:none --sparse git@github.com:rfs-2006/rfs-cafe-data.git /srv/polaris/rfs-cafe-data
sudo -u polaris git -C /srv/polaris/rfs-cafe-data sparse-checkout set parsed vectors eval

# 파이썬 환경
sudo -u polaris python3 -m venv /srv/polaris/venv
sudo -u polaris /srv/polaris/venv/bin/pip install -q numpy anthropic

# 키 넣기 (nano에서 두 키를 채우고 Ctrl+O, Enter, Ctrl+X)
cp /srv/polaris/homepage/tools/rag/deploy/polaris.env.example /etc/polaris.env
chown root:root /etc/polaris.env && chmod 600 /etc/polaris.env
nano /etc/polaris.env

# 상시 실행
cp /srv/polaris/homepage/tools/rag/deploy/polaris.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now polaris
sleep 20 && curl -s localhost:8787/health      # {"ok": true} 가 나오면 성공

# https (DNS가 연결돼 있어야 인증서가 나온다)
cp /srv/polaris/homepage/tools/rag/deploy/Caddyfile /etc/caddy/Caddyfile
systemctl restart caddy
curl -s https://api.caurfs.kr/health           # {"ok": true}
```

로그 보기: `journalctl -u polaris -f` (Ctrl+C로 나가기)

## 3. 업데이트

```bash
sudo -u polaris git -C /srv/polaris/homepage pull
sudo -u polaris git -C /srv/polaris/rfs-cafe-data pull
systemctl restart polaris
```

## 하루 사용량 바꾸기

`/etc/polaris.env`의 `ANON_DAILY`(비로그인 IP당), `PER_IP_DAILY`(학회 계정 IP당), `DAILY_LIMIT`(전체)를 고치고 `systemctl restart polaris`.
