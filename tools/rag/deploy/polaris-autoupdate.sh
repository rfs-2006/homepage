#!/bin/sh
# Polaris 자동 갱신: 5분마다(polaris-autoupdate.timer) 코드(homepage)와 데이터(rfs-cafe-data)를 받아,
# 챗봇에 쓰는 것이 바뀌었을 때만 다시 시작하고 /health를 확인한다.
# 바깥(GitHub)에서 서버로 들어오는 접속은 없다. 서버가 가져오기만 한다 (펀드 키가 있는 서버라 SSH 키를 밖에 주지 않으려고).
# 로그: journalctl -u polaris-autoupdate
set -u
H=/srv/polaris/homepage
D=/srv/polaris/rfs-cafe-data
as() { sudo -u polaris env GIT_SSH_COMMAND='ssh -o StrictHostKeyChecking=accept-new' "$@"; }

restart=0
old=$(as git -C "$H" rev-parse HEAD)
if as git -C "$H" pull -q --ff-only; then
  new=$(as git -C "$H" rev-parse HEAD)
  if [ "$old" != "$new" ] && ! as git -C "$H" diff --quiet "$old" "$new" -- tools/rag; then
    echo "코드 바뀜: $old → $new"; restart=1
  fi
else
  echo "homepage pull 실패 (손으로 바꾼 파일이 있으면 git -C $H status)"
fi
old=$(as git -C "$D" rev-parse HEAD)
if as git -C "$D" pull -q --ff-only; then
  new=$(as git -C "$D" rev-parse HEAD)
  [ "$old" != "$new" ] && { echo "데이터 바뀜: $old → $new"; restart=1; }
else
  echo "rfs-cafe-data pull 실패"
fi

[ "$restart" = 1 ] || exit 0
systemctl restart polaris
for i in $(seq 1 30); do
  sleep 5
  if curl -sf localhost:8787/health >/dev/null; then echo "다시 시작함, health ok"; exit 0; fi
done
echo "다시 시작했는데 /health가 2분 넘게 응답 없음 (journalctl -u polaris)"
exit 1
