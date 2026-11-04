"""외부 API 사용량을 날짜별로 센다 (운영 대시보드용). Voyage는 사용량 조회 API가 없어서 서버가 직접 센다.

- 서버(server.py)가 enable(경로)를 부르면 그때부터 센다. 평가 스크립트 등에서는 꺼져 있다.
- {날짜: {'voyage-3.5': 토큰, 'rerank-2.5': 토큰, 'q_member': 질문 수, 'q_anon': 질문 수}} 를 JSON 파일 하나에 둔다.
  하루 몇 줄이라 작다. 최근 120일만 남긴다. 사람 정보(이메일·IP·질문 내용)는 남기지 않는다.
"""
import json
import threading
import time
from pathlib import Path

_lock = threading.Lock()
_path = None
_data = {}
_dirty = 0.0


def enable(path):
    global _path, _data
    _path = Path(path)
    try:
        _data = json.loads(_path.read_text())
    except (OSError, ValueError):
        _data = {}


def add(name, n):
    """name 칸에 n을 더한다 (토큰 수나 질문 1개)."""
    global _dirty
    if _path is None or not n:
        return
    day = time.strftime('%Y-%m-%d')
    with _lock:
        d = _data.setdefault(day, {})
        d[name] = d.get(name, 0) + int(n)
        for k in sorted(_data)[:-120]:
            del _data[k]
        # 너무 자주 쓰지 않게 10초에 한 번만 파일로
        if time.time() - _dirty > 10:
            _save()


def _save():
    global _dirty
    _dirty = time.time()
    tmp = _path.with_suffix('.tmp')
    tmp.write_text(json.dumps(_data, ensure_ascii=False))
    tmp.replace(_path)


def flush():
    if _path is not None:
        with _lock:
            _save()


def snapshot(days=62):
    with _lock:
        return {k: dict(v) for k, v in sorted(_data.items())[-days:]}
