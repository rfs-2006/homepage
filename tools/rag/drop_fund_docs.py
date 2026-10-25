"""운용팀 문서(chunk.is_fund)의 청크와 벡터를 검색 대상에서 뺀다. 원문(parsed/docs)은 그대로 둔다.

  python3 -I tools/rag/drop_fund_docs.py /home/user/rfs-cafe-data
- 금액·수량·평단을 지시문으로만 막고 있었는데, 기업 RAG에서 가장 많이 지적하는 실수가 권한을 답을 만든 뒤에 거는 것이다.
  검색 전에 빼야 우회 질문에도 안 나온다 (2026-10-25, 사용자 결정).
- chunk.py도 같은 규칙으로 거르므로 청크를 다시 만들어도 안 들어간다. 이 스크립트는 이미 만든 청크·벡터를 다시 임베딩 없이 거르는 용도.
"""
import gzip
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from chunk import is_fund  # noqa: E402

CAFE = Path(sys.argv[1])
MODEL = 'voyage-3.5'


def main():
    P, V = CAFE / 'parsed', CAFE / 'vectors'
    fund = {d['doc_id'] for d in map(json.loads, gzip.open(P / 'docs.jsonl.gz', 'rt')) if is_fund(d)}
    chunks = [json.loads(l) for l in gzip.open(P / 'chunks.jsonl.gz', 'rt')]
    vec, ids = np.load(V / f'{MODEL}.f16.npy'), json.loads((V / f'{MODEL}.ids.json').read_text())
    assert len(vec) == len(ids) == len(chunks) and all(c['chunk_id'] == i for c, i in zip(chunks, ids))
    keep = [k for k, c in enumerate(chunks) if c['doc_id'] not in fund]
    with gzip.open(P / 'chunks.jsonl.gz', 'wt') as f:
        for k in keep:
            f.write(json.dumps(chunks[k], ensure_ascii=False) + '\n')
    np.save(V / f'{MODEL}.f16.npy', vec[keep])
    (V / f'{MODEL}.ids.json').write_text(json.dumps([ids[k] for k in keep]))
    print(f'운용팀 문서 {len(fund)}개, 청크 {len(chunks)} → {len(keep)}')


if __name__ == '__main__':
    main()
