"""같은 리포트가 PDF와 워드(docx·pptx·hwp)로 둘 다 검색에 들어간 경우 PDF만 남긴다.

  python3 -I tools/rag/drop_dup_docs.py /home/user/rfs-cafe-data
- parse.py의 중복 제거는 카페 PDF가 사이트 PDF와 같은 건 잡았지만, 같은 글의 워드판은 서식 차이로 유사도가 낮게 나와 놓쳤다.
  그래서 같은 리포트가 두 자리를 차지했다 (2026-10-25, 워드판 245개·청크 11,138개 = 전체의 25%).
- 규칙: 카페 글 하나에 살아 있는 기업·산업 리포트 PDF가 있거나(또는 그 글의 PDF가 사이트 PDF의 중복이면 그 사이트 PDF),
  같은 글의 워드판은 duplicate_of로 표시하고 그 청크와 벡터를 뺀다. PDF가 없는 글의 워드판은 그대로 둔다.
- PDF를 남기는 이유: 쪽 번호가 있어 출처를 "p.12"로 달 수 있다. 워드판은 텍스트 상자가 본문에 섞여 문장이 길게 잡힌다.
- docs / chunks / 벡터 / ids를 같은 순서로 걸러 다시 쓴다 (검색기는 청크 순서와 벡터 순서가 같다고 본다).
"""
import collections
import gzip
import json
import sys
from pathlib import Path

import numpy as np

CAFE = Path(sys.argv[1])
MODEL = 'voyage-3.5'


def main():
    P, V = CAFE / 'parsed', CAFE / 'vectors'
    docs = [json.loads(l) for l in gzip.open(P / 'docs.jsonl.gz', 'rt')]
    by = {d['doc_id']: d for d in docs}
    art = collections.defaultdict(list)
    for d in docs:
        if d['source'] == 'cafe' and d['article_id']:
            art[d['article_id']].append(d)
    drop = {}
    for v in art.values():
        pdf = None
        for d in v:
            if d['ext'] != '.pdf' or d['doc_type'] not in ('company', 'industry'):
                continue
            if 'duplicate_of' not in d:
                pdf = d['doc_id']
            elif by[d['duplicate_of']]['ext'] == '.pdf' and 'duplicate_of' not in by[d['duplicate_of']]:
                pdf = d['duplicate_of']
        if pdf:
            for d in v:
                if d['ext'] in ('.docx', '.pptx', '.hwp') and d['doc_type'] in ('company', 'industry') and 'duplicate_of' not in d:
                    drop[d['doc_id']] = pdf
    for i, p in drop.items():
        by[i]['duplicate_of'] = p
        by[i]['dup_reason'] = 'PDF판이 있는 리포트의 워드판 (drop_dup_docs.py)'
    chunks = [json.loads(l) for l in gzip.open(P / 'chunks.jsonl.gz', 'rt')]
    vec, ids = np.load(V / f'{MODEL}.f16.npy'), json.loads((V / f'{MODEL}.ids.json').read_text())
    assert len(vec) == len(ids) == len(chunks) and all(c['chunk_id'] == i for c, i in zip(chunks, ids))
    keep = [k for k, c in enumerate(chunks) if c['doc_id'] not in drop]
    with gzip.open(P / 'docs.jsonl.gz', 'wt') as f:
        for d in docs:
            f.write(json.dumps(d, ensure_ascii=False) + '\n')
    with gzip.open(P / 'chunks.jsonl.gz', 'wt') as f:
        for k in keep:
            f.write(json.dumps(chunks[k], ensure_ascii=False) + '\n')
    np.save(V / f'{MODEL}.f16.npy', vec[keep])
    (V / f'{MODEL}.ids.json').write_text(json.dumps([ids[k] for k in keep]))
    print(f'워드판 {len(drop)}개를 중복으로 표시, 청크 {len(chunks)} → {len(keep)}')


if __name__ == '__main__':
    main()
