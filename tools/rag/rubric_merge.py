"""축별 평가(rubric.md) 결과를 합쳐 축별 추천 리포트 목록을 만든다.

  python3 -I tools/rag/rubric_merge.py /home/user/rfs-cafe-data <평가 결과 폴더(batch_*.jsonl)>
출력  eval/rubric_scores.jsonl (리포트마다 축별 점수·이유·인용·검산, 글 지표 붙임)
      eval/rubric_recommend.json (축마다 3점 리포트 = 챗봇이 "이 축은 이 선배 리포트를 보라"고 보여줄 후보)
      eval/rubric_agreement.json (같은 리포트를 두 에이전트가 따로 매긴 점수 비교)

평가는 리포트를 5개씩 나눠 맡은 에이전트들이 했다 (NOTES 14절). batch_40은 다른 배치에도 들어 있는 리포트 5개를 한 번 더 매긴 것이라
점수에 쓰지 않고 일치도만 잰다.
"""
import collections
import glob
import json
import sys
from pathlib import Path

CAFE, SRC = Path(sys.argv[1]), Path(sys.argv[2])
AXES = ['투자포인트', '탑다운', '리서치깊이', '추정', '밸류에이션', 'Peer케이스', '글']


def load(files):
    return [json.loads(l) for f in files for l in open(f) if l.strip()]


def main():
    files = sorted(glob.glob(str(SRC / 'batch_*.jsonl')))
    rows = load(f for f in files if not f.endswith('batch_40.jsonl'))
    again = load(f for f in files if f.endswith('batch_40.jsonl'))
    metrics = {}
    p = CAFE / 'eval' / 'style_metrics.jsonl'
    if p.exists():
        for l in open(p):
            m = json.loads(l)
            metrics[m['subject']] = m
    docs = {}
    for l in __import__('gzip').open(CAFE / 'parsed' / 'docs.jsonl.gz', 'rt'):
        d = json.loads(l)
        docs[d['doc_id']] = d['subject']
    with open(CAFE / 'eval' / 'rubric_scores.jsonl', 'w') as f:
        for r in rows:
            r['subject_full'] = docs.get(r['doc_id'], r['subject'])
            m = metrics.get(r['subject_full'])
            if m:
                r['글지표'] = {k: v for k, v in m.items() if k not in ('doc_id', 'subject', 'doc_type', 'ext')}
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    rec = {a: [{'doc_id': r['doc_id'], 'subject': r['subject_full'], 'reason': r['reasons'].get(a, '')}
               for r in rows if r['scores'].get(a) == 3] for a in AXES}
    dist = {a: dict(collections.Counter(str(r['scores'].get(a)) for r in rows)) for a in AXES}
    (CAFE / 'eval' / 'rubric_recommend.json').write_text(json.dumps({'reports': len(rows), 'distribution': dist, 'top': rec},
                                                                    ensure_ascii=False, indent=1))
    first = {r['doc_id']: r for r in rows}
    pairs, same, near = [], 0, 0
    for r in again:
        a = first.get(r['doc_id'])
        if not a:
            continue
        for ax in AXES:
            x, y = a['scores'].get(ax), r['scores'].get(ax)
            if x is None and y is None:
                continue
            pairs.append({'subject': a['subject'], 'axis': ax, 'first': x, 'second': y})
            same += x == y
            near += x is not None and y is not None and abs(x - y) <= 1
    agree = {'pairs': len(pairs), 'exact': same, 'within_1': near, 'detail': pairs}
    (CAFE / 'eval' / 'rubric_agreement.json').write_text(json.dumps(agree, ensure_ascii=False, indent=1))
    print(json.dumps({'reports': len(rows), 'distribution': dist, 'agreement': {k: v for k, v in agree.items() if k != 'detail'}},
                     ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
