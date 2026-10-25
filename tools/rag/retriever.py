"""검색기: BM25, 벡터, 하이브리드(RRF), 리랭크. eval_retrieval.py와 agent_search.py가 같이 쓴다.

- BM25: 형태소 분석기 없이 한글 2글자 묶음 + 영문·숫자 단어.
- 벡터: Voyage voyage-3.5, 질문은 input_type=query.
- 하이브리드: 두 순위를 RRF(k=60)로 합친다. 점수 크기가 달라 직접 더할 수 없어서.
- 리랭크: 상위 후보를 Voyage rerank-2.5로 다시 정렬.
"""
import gzip
import json
import math
import re
import sys
import urllib.request
from array import array
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

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


# 실행 중(answer·agent_search·peek·eval)에 읽는 청크 필드. 나머지(title, file, board 등)는 메모리만 먹어서 서버에선 버린다
KEEP = ('chunk_id', 'doc_id', 'doc_type', 'grade', 'page_start', 'page_end', 'header', 'text')


def load_chunks(cafe, keep=None):
    p = Path(cafe) / 'parsed' / 'chunks.jsonl'
    rows = (json.loads(l) for l in (open(p) if p.exists() else gzip.open(f'{p}.gz', 'rt')))
    if not keep:
        return list(rows)
    return [{k: c.get(k) for k in keep} for c in rows]


class BM25:
    """rank_bm25.BM25Okapi와 점수가 비트 단위로 같은 BM25 (k1=1.5, b=0.75, epsilon=0.25).
    BM25Okapi는 청크마다 {단어: 횟수} dict를 들고 있어 700만 개 항목이 파이썬 객체로 1GB 가까이 먹는다.
    여기선 단어 → 그 단어가 나온 청크 번호·횟수 배열(CSC)로 들고, 질문 단어가 나온 청크만 계산한다.
    idf·평균 idf는 BM25Okapi와 같은 순서(단어가 처음 나온 순서)로 math.log로 더해 값이 똑같다."""

    def __init__(self, docs, k1=1.5, b=0.75, epsilon=0.25):
        self.k1, self.b = k1, b
        self.vocab = {}
        # 청크별 작은 배열 3만 개 대신 큰 버퍼 하나에 이어 붙인다 (작은 배열은 지워도 힙이 조각나 메모리가 안 돌아온다)
        terms, freqs, lens, nt = array('i'), array('i'), [], []
        for doc in docs:  # 토큰 목록을 하나씩 받아 바로 버린다 (전체 토큰을 한꺼번에 들고 있지 않게)
            cnt = Counter(doc)
            lens.append(len(doc))
            nt.append(len(cnt))
            terms.extend(self.vocab.setdefault(w, len(self.vocab)) for w in cnt)
            freqs.extend(cnt.values())
        n = len(lens)
        self.doc_len = np.array(lens)
        self.avgdl = sum(lens) / n
        t = np.frombuffer(terms, np.int32)
        o = np.argsort(t, kind='stable')  # 단어순, 같은 단어 안에선 청크 번호순
        self.ptr = np.concatenate([[0], np.cumsum(np.bincount(t, minlength=len(self.vocab)))])
        del t, terms
        self.tf = np.frombuffer(freqs, np.int32)[o]
        del freqs
        self.docs = np.repeat(np.arange(n, dtype=np.int32), nt)[o]
        del o
        nd = np.diff(self.ptr)  # 단어가 나온 청크 수
        idf, neg, tot = [], [], 0
        for w, k in enumerate(nd.tolist()):
            x = math.log(n - k + 0.5) - math.log(k + 0.5)
            idf.append(x)
            tot += x  # sum()은 3.12부터 보정 합산이라 값이 미세하게 달라진다. BM25Okapi처럼 차례로 더한다
            if x < 0:
                neg.append(w)
        eps = epsilon * (tot / len(idf))
        for w in neg:
            idf[w] = eps
        self.idf = np.array(idf)
        self.corpus_size = n

    def get_scores(self, query):
        score = np.zeros(self.corpus_size)
        for q in query:
            w = self.vocab.get(q)
            if w is None or not self.idf[w]:
                continue
            a, z = self.ptr[w], self.ptr[w + 1]
            i, tf = self.docs[a:z], self.tf[a:z].astype(np.int64)
            score[i] += self.idf[w] * (tf * (self.k1 + 1) /
                                       (tf + self.k1 * (1 - self.b + self.b * self.doc_len[i] / self.avgdl)))
        return score


def rrf(*lists, k=60):
    # Reciprocal Rank Fusion: 점수 크기가 다른 검색 결과를 순위만으로 합친다
    sc = defaultdict(float)
    for lst in lists:
        for r, i in enumerate(lst, 1):
            sc[i] += 1 / (k + r)
    return sorted(sc, key=lambda i: -sc[i])


class Retriever:
    def __init__(self, cafe, chunks=None, bm=True, vec=True):
        self.chunks = chunks or load_chunks(cafe, KEEP)
        self.bm = BM25(tokens(self.text(i)) for i in range(len(self.chunks))) if bm else None
        self.V = None
        if vec:
            # float32로 바꾸고 길이 1로 나누기를 4096줄씩 한다. 한꺼번에 하면 128MB짜리 임시 배열이 두세 개 생겨 시작 때 메모리가 튄다
            # (줄마다 따로 계산하는 거라 결과는 한꺼번에 할 때와 같다)
            V16 = np.load(Path(cafe) / 'vectors' / f'{MODEL}.f16.npy', mmap_mode='r')
            self.V = np.empty(V16.shape, np.float32)
            for a in range(0, len(V16), 4096):
                v = V16[a:a + 4096].astype(np.float32)
                self.V[a:a + 4096] = v / np.linalg.norm(v, axis=1, keepdims=True)
            del V16
        self._qv = {}

    def text(self, i):
        # 임베딩·리랭크에 넣는 글 (머리글 + 본문). 전체 목록을 따로 들고 있지 않고 그때그때 만든다
        c = self.chunks[i]
        return c['header'] + '\n' + c['text']

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
        body = json.dumps({'query': q, 'documents': [self.text(i) for i in cand[:top]],
                           'model': 'rerank-2.5', 'top_k': top}).encode()
        req = urllib.request.Request('https://api.voyageai.com/v1/rerank', data=body, headers=voyage_headers())
        with urllib.request.urlopen(req, timeout=120) as r:
            j = json.load(r)
        return [cand[d['index']] for d in j['data']] + cand[top:]
