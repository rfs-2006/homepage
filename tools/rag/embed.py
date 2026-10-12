"""RFS 챗봇 3단계: 청크 → 벡터 (Voyage AI)

  python3 -I tools/rag/embed.py /home/user/rfs-cafe-data [모델]
입력  parsed/chunks.jsonl
출력  vectors/<모델>.f16.npy (청크 순서대로, float16), vectors/<모델>.ids.json
키    Voyage 키는 실행 환경의 네트워크 시크릿이 api.voyageai.com 요청에 붙인다. 코드에는 키가 없다.

- 문서 쪽은 input_type=document, 질문 쪽은 input_type=query로 넣는다. Voyage는 둘을 다르게 처리해서 검색 정확도가 오른다.
- 머리글(종목·학기·종류·섹션)을 본문 앞에 붙여서 임베딩한다.
- 배치마다 중간 저장해서, 끊겨도 다시 실행하면 이어서 한다.
"""
import json
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

CAFE = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/rfs-cafe-data')
MODEL = sys.argv[2] if len(sys.argv) > 2 else 'voyage-3.5'
BATCH, WORKERS = 64, 4
OUT = CAFE / 'vectors'
PART = OUT / f'{MODEL}.parts'


def embed(texts, input_type='document', model=MODEL, tries=6):
    body = json.dumps({'input': texts, 'model': model, 'input_type': input_type, 'truncation': True}).encode()
    for k in range(tries):
        req = urllib.request.Request('https://api.voyageai.com/v1/embeddings', data=body, headers={'content-type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                j = json.load(r)
            return [d['embedding'] for d in sorted(j['data'], key=lambda d: d['index'])], j['usage']['total_tokens']
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and k < tries - 1:
                time.sleep(2 ** k * 2)
                continue
            raise RuntimeError(f'{e.code} {e.read()[:300]}')
        except (urllib.error.URLError, TimeoutError):
            time.sleep(2 ** k * 2)
    raise RuntimeError('재시도 초과')


def main():
    chunks = [json.loads(l) for l in open(CAFE / 'parsed' / 'chunks.jsonl')]
    texts = [c['header'] + '\n' + c['text'] for c in chunks]
    PART.mkdir(parents=True, exist_ok=True)
    jobs = [i for i in range(0, len(texts), BATCH) if not (PART / f'{i:06d}.npy').exists()]
    print(f'청크 {len(texts)}, 남은 배치 {len(jobs)}', flush=True)
    used = [0]
    t0 = time.time()

    def run(i):
        vecs, tok = embed(texts[i:i + BATCH])
        np.save(PART / f'{i:06d}.npy', np.asarray(vecs, dtype=np.float16))
        used[0] += tok
        return i

    with ThreadPoolExecutor(WORKERS) as ex:
        for n, _ in enumerate(ex.map(run, jobs), 1):
            if n % 50 == 0:
                print(f'{n}/{len(jobs)} 배치, 토큰 {used[0]:,}, {time.time() - t0:.0f}s', flush=True)
    arr = np.concatenate([np.load(PART / f'{i:06d}.npy') for i in range(0, len(texts), BATCH)])
    assert len(arr) == len(chunks)
    np.save(OUT / f'{MODEL}.f16.npy', arr)
    (OUT / f'{MODEL}.ids.json').write_text(json.dumps([c['chunk_id'] for c in chunks]))
    print(f'끝: {arr.shape}, 이번 실행 토큰 {used[0]:,}, {time.time() - t0:.0f}s')


if __name__ == '__main__':
    main()
