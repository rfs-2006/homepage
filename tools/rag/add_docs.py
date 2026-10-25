"""수집에서 빠진 리포트 PDF를 기존 데이터 뒤에 붙인다 (원본 전체를 다시 파싱하지 않고).

  python3 -I tools/rag/add_docs.py /home/user/rfs-cafe-data 파일.pdf "[24-1] 삼양식품_SOHKA_DCF_240516" [파일.pdf "제목" ...]
제목은 카페 리포트 제목 형식으로 준다 (학기·회사·팀·밸류에이션 방법·날짜). 학기는 제목의 [24-1]에서 읽는다.

- 파싱(parse.pdf)·청킹(chunk.rows_of)·임베딩(embed.embed)은 전체 파이프라인과 같은 함수를 쓴다.
- docs / chunks / 벡터 / ids 뒤에 붙이기만 한다. 검색기는 청크 순서와 벡터 순서가 같다고 보기 때문.
- 같은 제목이 이미 있으면 건너뛴다. 기존 문서와 내용이 같은지(중복)는 따로 보지 않으니, 넣기 전에 제목으로 확인한다.
- 원문 3.6GB에서 parse.py를 다시 돌리면 이 문서들은 빠진다 (그 전에 원본 폴더에 넣어 둘 것).
"""
import gzip
import json
import sys
from pathlib import Path

import numpy as np

CAFE, ARGS = Path(sys.argv[1]), sys.argv[2:]
sys.argv = sys.argv[:2]  # parse·chunk·embed가 import 시점에 argv에서 경로를 읽는다
sys.path.insert(0, str(Path(__file__).parent))
from chunk import rows_of  # noqa: E402
from embed import BATCH, MODEL, embed  # noqa: E402
from parse import GRADE, pdf  # noqa: E402


def gz_lines(p):
    return [json.loads(l) for l in gzip.open(p, 'rt')]


def gz_write(p, rows):
    with gzip.open(p, 'wt') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')


def main(pairs):
    P, V = CAFE / 'parsed', CAFE / 'vectors'
    docs, chunks = gz_lines(P / 'docs.jsonl.gz'), gz_lines(P / 'chunks.jsonl.gz')
    vec, ids = np.load(V / f'{MODEL}.f16.npy'), json.loads((V / f'{MODEL}.ids.json').read_text())
    assert len(vec) == len(ids) == len(chunks)
    have = {d['subject'] for d in docs}
    nxt = max(int(d['doc_id'][1:]) for d in docs) + 1
    new_docs, new_chunks = [], []
    for path, subject in pairs:
        if subject in have:
            print('이미 있음, 건너뜀:', subject)
            continue
        r = pdf(Path(path))
        d = {'source': 'upload', 'group': '추가 업로드', 'board': '리포트', 'article_id': None, 'subject': subject,
             'date': None, 'file': subject + '.pdf', 'ext': '.pdf', 'doc_type': 'company', 'text': '\n\n'.join(r['pages']),
             **r, 'doc_id': f'd{nxt:05d}'}
        d['grade'], d['chars'] = GRADE['company'], len(d['text'])
        nxt += 1
        rows = list(rows_of(d))
        print(f"{subject}: {r.get('n_pages')}쪽, {d['chars']:,}자, 청크 {len(rows)}개")
        new_docs.append(d)
        new_chunks += rows
    if not new_chunks:
        return
    texts = [c['header'] + '\n' + c['text'] for c in new_chunks]
    vecs, tok = [], 0
    for i in range(0, len(texts), BATCH):
        v, t = embed(texts[i:i + BATCH])
        vecs += v
        tok += t
    gz_write(P / 'docs.jsonl.gz', docs + new_docs)
    gz_write(P / 'chunks.jsonl.gz', chunks + new_chunks)
    np.save(V / f'{MODEL}.f16.npy', np.concatenate([vec, np.asarray(vecs, dtype=np.float16)]))
    (V / f'{MODEL}.ids.json').write_text(json.dumps(ids + [c['chunk_id'] for c in new_chunks]))
    print(f'추가: 문서 {len(new_docs)}, 청크 {len(new_chunks)}, 임베딩 토큰 {tok:,}')


if __name__ == '__main__':
    main(list(zip(ARGS[0::2], ARGS[1::2])))
