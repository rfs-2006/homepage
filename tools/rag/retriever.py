"""검색기: BM25, 벡터, 하이브리드(RRF), 리랭크. eval_retrieval.py와 agent_search.py가 같이 쓴다.

- BM25: 형태소 분석기 없이 한글 2글자 묶음 + 영문·숫자 단어.
- 벡터: Voyage voyage-3.5, 질문은 input_type=query.
- 하이브리드: 두 순위를 RRF(k=60)로 합친다. 점수 크기가 달라 직접 더할 수 없어서.
- 리랭크: 상위 후보를 Voyage rerank-2.5로 다시 정렬.
"""
import gzip
import json
import re
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

import numpy as np
from rank_bm25 import BM25Okapi

sys.path.insert(0, str(Path(__file__).parent))
from embed import embed, voyage_headers  # noqa: E402

MODEL = 'voyage-3.5'


def tokens(s):
    """한국어는 띄어쓰기 단위가 '리포트에서', '리포트의'처럼 조사로 갈려서 단어로는 잘 안 맞는다.
    형태소 분석기 없이 쓰는 방법으로 2글자 묶음(bigram)과 영문·숫자 단어를 함께 쓴다."""
    s = s.lower()
    out = re.findall(r'[a-z0-9]+(?:[./][a-z0-9]+)*', s)
    for w in re.findall(r'[가-힣]+', s):
        out += [w[i:i + 2] for i in range(len(w) - 1)] or [w]
    return out


def load_chunks(cafe):
    p = Path(cafe) / 'parsed' / 'chunks.jsonl'
    return [json.loads(l) for l in (open(p) if p.exists() else gzip.open(f'{p}.gz', 'rt'))]


def rrf(*lists, k=60):
    # Reciprocal Rank Fusion: 점수 크기가 다른 검색 결과를 순위만으로 합친다
    sc = defaultdict(float)
    for lst in lists:
        for r, i in enumerate(lst, 1):
            sc[i] += 1 / (k + r)
    return sorted(sc, key=lambda i: -sc[i])


class Retriever:
    def __init__(self, cafe, chunks=None, bm=True, vec=True):
        self.chunks = chunks or load_chunks(cafe)
        self.texts = [c['header'] + '\n' + c['text'] for c in self.chunks]
        self.bm = BM25Okapi([tokens(t) for t in self.texts]) if bm else None
        self.V = None
        if vec:
            V = np.load(Path(cafe) / 'vectors' / f'{MODEL}.f16.npy').astype(np.float32)
            self.V = V / np.linalg.norm(V, axis=1, keepdims=True)
        self._qv = {}

    def embed_queries(self, qs):
        new = [q for q in dict.fromkeys(qs) if q not in self._qv]
        for i in range(0, len(new), 64):
            vecs, _ = embed(new[i:i + 64], input_type='query', model=MODEL)
            for q, v in zip(new[i:i + 64], vecs):
                v = np.asarray(v, dtype=np.float32)
                self._qv[q] = v / np.linalg.norm(v)

    def bm25(self, q, n=200):
        return list(np.argsort(-self.bm.get_scores(tokens(q)))[:n])

    def vector(self, q, n=200):
        self.embed_queries([q])
        return list(np.argsort(-(self.V @ self._qv[q]))[:n])

    def hybrid(self, q, n=200):
        return rrf(self.bm25(q, n), self.vector(q, n))[:n]

    def rerank(self, q, cand, top=50):
        cand = list(cand)
        top = min(top, len(cand))
        body = json.dumps({'query': q, 'documents': [self.texts[i] for i in cand[:top]],
                           'model': 'rerank-2.5', 'top_k': top}).encode()
        req = urllib.request.Request('https://api.voyageai.com/v1/rerank', data=body, headers=voyage_headers())
        with urllib.request.urlopen(req, timeout=120) as r:
            j = json.load(r)
        return [cand[d['index']] for d in j['data']] + cand[top:]
