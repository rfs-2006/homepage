"""RFS 챗봇 서버: 홈페이지 /chat/ 화면이 부르는 API. 누구나 쓰고, 로그인(Supabase 학회 계정)하지 않으면 IP당 하루 ANON_DAILY번까지.

  RAG_ANTHROPIC_API_KEY=... VOYAGE_API_KEY=... python3 -I tools/rag/server.py /path/to/rfs-cafe-data
환경변수
  RAG_ANTHROPIC_API_KEY  Claude API 키 (필수)
  VOYAGE_API_KEY         Voyage 키. 이 개발 환경처럼 프록시가 키를 붙여 주는 곳에서는 없어도 된다.
  PORT                   기본 8787
  HOST                   기본 127.0.0.1 (앞단 Caddy만 접속). 직접 받으려면 0.0.0.0
  ALLOW_ORIGIN           CORS 허용 주소, 기본 https://caurfs.kr (쉼표로 여러 개)
  PER_IP_DAILY           학회 계정으로 로그인했을 때 IP 하나가 하루에 보낼 수 있는 질문 수, 기본 40
  ANON_DAILY             로그인하지 않았을 때 IP 하나가 하루에 보낼 수 있는 질문 수, 기본 5
  DAILY_LIMIT            전체 하루 질문 수 상한 (비용 안전장치), 기본 100 (질문 1개 약 6~8센트, 꽉 차도 월 30~40만 원 안쪽)
  LOG_PATH               질문·답·출처를 jsonl로 남길 파일 (평가셋 보강용). 비우면 남기지 않는다. 사람 정보는 남기지 않는다.
API
  GET  /health                   준비됐는지
  POST /chat  {conversation_id?, message}   헤더 Authorization: Bearer <Supabase access token> (없어도 된다)
       → {conversation_id, answer, sources:[{n, title, source, cited}], kind, options, left}
         left는 오늘 남은 질문 수
         kind가 clarify면 검색 없이 되묻는 턴이고, options는 화면에 버튼으로 보일 보기다 (아니면 빈 목록)

- 데이터(청크·벡터)는 비공개 저장소에만 있으므로 이 서버도 비공개로 띄워야 한다. 메모리 약 0.5GB(최대 0.47GB), 시작 때 BM25 색인에 10초쯤 걸린다. 1GB 서버에 올라간다.
- 학회원 계정이 공용(member@caurfs.kr)이라 사람별 제한은 못 한다. 대신 IP별·전체 하루 상한을 둔다.
- 대화는 메모리에만 두고 2시간 쓰지 않으면 버린다. 한 대화는 최대 MAX_TURNS턴 (길어질수록 매 턴 비용이 커져서).
"""
import json
import os
import sys
import threading
import time
import urllib.error
import urllib.request
import uuid
from collections import defaultdict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from agent_search import MODELS  # noqa: E402
from answer import Answerer, Chat  # noqa: E402

SB_URL = 'https://xyewclvpshldjucryapr.supabase.co'
# 공개용 anon 키 (홈페이지 index.html에도 그대로 있다). 토큰 확인 요청에 같이 보낸다
SB_ANON = ('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5ZXdjbHZwc2hsZGp1Y3J5YXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzI0MTAsImV4cCI6MjEwNTA0ODQxMH0'
           '.6JRZhZ6FPh-VUb1RHGf0wxfo_Y69ZQ-V6vk6TCoyM4c')
ALLOWED_DOMAIN = '@caurfs.kr'
ORIGINS = [o.strip() for o in os.environ.get('ALLOW_ORIGIN', 'https://caurfs.kr').split(',')]
PER_IP_DAILY = int(os.environ.get('PER_IP_DAILY', 40))
ANON_DAILY = int(os.environ.get('ANON_DAILY', 5))
DAILY_LIMIT = int(os.environ.get('DAILY_LIMIT', 100))
LOG_PATH = os.environ.get('LOG_PATH')
MAX_TURNS, IDLE_SEC, MAX_MSG = 12, 2 * 3600, 1000

lock = threading.Lock()
convs = {}            # id → {'chat', 'used', 'lock'}
tokens_ok = {}        # access token → 확인 시각 (5분 캐시)
counts = defaultdict(int)  # (날짜, ip 또는 '*') → 질문 수
answerer = None


def verify(token):
    """Supabase에 토큰 주인을 묻는다. 학회 계정(@caurfs.kr)이면 통과."""
    now = time.time()
    with lock:
        if tokens_ok.get(token, 0) > now - 300:
            return True
    req = urllib.request.Request(f'{SB_URL}/auth/v1/user', headers={'apikey': SB_ANON, 'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            email = (json.load(r).get('email') or '').lower()
    except (urllib.error.URLError, TimeoutError, ValueError):
        return False
    if not email.endswith(ALLOWED_DOMAIN):
        return False
    with lock:
        tokens_ok[token] = now
    return True


def take_quota(ip, member):
    """질문 하나를 쓴다. 넘으면 (오류 문구, 0), 아니면 (None, 오늘 남은 수). 로그인 여부에 따라 IP별 칸을 따로 센다."""
    day, cap, key = time.strftime('%Y-%m-%d'), PER_IP_DAILY if member else ANON_DAILY, (ip, member)
    with lock:
        if counts[(day, '*')] >= DAILY_LIMIT:
            return '오늘 챗봇 전체 사용량이 다 찼습니다. 내일 다시 써 주세요.', 0
        if counts[(day, key)] >= cap:
            more = '' if member else ' 학회원은 로그인하면 더 쓸 수 있습니다.'
            return f'오늘 질문 {cap}개를 다 썼습니다. 내일 다시 써 주세요.{more}', 0
        counts[(day, '*')] += 1
        counts[(day, key)] += 1
        for k in [k for k in counts if k[0] != day]:
            del counts[k]
        return None, cap - counts[(day, key)]


def give_back(ip, member, left):
    day = time.strftime('%Y-%m-%d')
    with lock:
        counts[(day, '*')] -= 1
        counts[(day, (ip, member))] -= 1
    return left + 1


def get_conv(cid):
    now = time.time()
    with lock:
        for k in [k for k, v in convs.items() if v['used'] < now - IDLE_SEC]:
            del convs[k]
        if cid not in convs:
            cid = uuid.uuid4().hex
            convs[cid] = {'chat': Chat(answerer), 'used': now, 'lock': threading.Lock()}
        convs[cid]['used'] = now
        return cid, convs[cid]


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        origin = self.headers.get('Origin', '')
        if origin in ORIGINS:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            return self._json(200, {'ok': answerer is not None})
        self._json(404, {'error': 'not found'})

    def do_POST(self):
        if self.path != '/chat':
            return self._json(404, {'error': 'not found'})
        token = self.headers.get('Authorization', '').removeprefix('Bearer ').strip()
        member = bool(token) and verify(token)
        try:
            req = json.loads(self.rfile.read(min(int(self.headers.get('Content-Length', 0)), 20000)) or b'{}')
        except ValueError:
            return self._json(400, {'error': '요청 형식이 잘못됐습니다.'})
        msg = str(req.get('message', '')).strip()[:MAX_MSG]
        if not msg:
            return self._json(400, {'error': '질문을 입력해 주세요.'})
        ip = (self.headers.get('X-Forwarded-For') or self.client_address[0]).split(',')[0].strip()
        err, left = take_quota(ip, member)
        if err:
            return self._json(429, {'error': err, 'left': 0})
        cid, conv = get_conv(str(req.get('conversation_id') or ''))
        if len(conv['chat'].turns) >= MAX_TURNS:
            return self._json(400, {'error': '대화가 길어졌습니다. 새 대화를 시작해 주세요.', 'conversation_id': cid})
        with conv['lock']:  # 같은 대화에 동시에 두 질문이 들어오면 차례로
            try:
                out = conv['chat'].turn(msg)
            except Exception as e:  # noqa: BLE001 — 사용자에게는 짧게, 서버 로그에는 자세히
                print('오류', cid, repr(e), flush=True)
                return self._json(500, {'error': '답을 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.', 'conversation_id': cid})
        if out['kind'] == 'decline':  # 걸러진 질문은 하루 질문 수에서 빼 준다
            left = give_back(ip, member, left)
        with lock:
            answerer.s.log.clear()  # 검색 로그는 평가용이라 서버에서는 쌓지 않는다
        if LOG_PATH:
            with lock, open(LOG_PATH, 'a') as f:
                f.write(json.dumps({'t': time.strftime('%Y-%m-%dT%H:%M:%S'), 'conv': cid, 'q': msg, 'kind': out['kind'],
                                    'answer': out['answer'], 'sources': [s['source'] for s in out['sources']]},
                                   ensure_ascii=False) + '\n')
        self._json(200, {'conversation_id': cid, 'answer': out['answer'], 'kind': out['kind'], 'options': out.get('options', []), 'left': left,
                         'sources': [{k: s[k] for k in ('n', 'title', 'source', 'cited')} for s in out['sources']]})

    def log_message(self, fmt, *args):  # 접속 로그에 토큰·질문이 남지 않게 경로만
        print(time.strftime('%H:%M:%S'), self.command, self.path, args[1] if len(args) > 1 else '', flush=True)


def main():
    global answerer
    cafe = sys.argv[1] if len(sys.argv) > 1 else '/home/user/rfs-cafe-data'
    port = int(os.environ.get('PORT', 8787))
    # 기본은 이 서버 안에서만 받는다(앞단 Caddy가 https로 받아 넘겨 준다). 밖에서 바로 받으면 X-Forwarded-For를 속여 하루 제한을 피할 수 있다
    host = os.environ.get('HOST', '127.0.0.1')
    print('자료 불러오는 중 (BM25 색인 10초쯤)', flush=True)
    # 12절: 검색은 Haiku로 바꿔도 품질이 그대로, 답변은 Sonnet이어야 한다
    answerer = Answerer(cafe, mode='routed', search_model=MODELS['haiku'], answer_model=MODELS['sonnet'], ask=True)
    print(f'준비됨 {host}:{port}, 허용 주소 {ORIGINS}', flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()


if __name__ == '__main__':
    main()
