"""평가셋 v1: v0에서 코칭·글쓰기·종합 문항의 정답을 넓힌다.

  python3 -I tools/rag/build_eval_v1.py /home/user/rfs-cafe-data

v0은 이 문항들의 정답을 1~2개 문서로만 잡아서, 다른 리포트의 올바른 사례를 찾아도 틀린 것으로 셌다.
- 코칭(q27~q34): BM25·벡터·리랭크 상위 결과와 사람이 바꿔 쓴 검색어 결과를 모아, 질문에 실제로 답이 되는 청크를 하나씩 읽고 골랐다 (ADD).
- 글쓰기·종합(q35~q38): "예시 몇 개", "리포트 있어?"처럼 맞는 문서가 수십 개라 손으로 고르지 않고 규칙으로 뽑는다 (RULES).
판정 기준: 질문에 대한 방법·근거·사례가 청크 안에 직접 있어야 한다. 같은 회사·같은 업종이라도 그 내용이 없으면 뺀다.
등급 C(신입 투자제안서)도 사례로는 맞으므로 정답에 넣는다. 답변 단계에서 등급을 따로 반영한다.
"""
import json
import re
import sys
from pathlib import Path

CAFE = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/rfs-cafe-data')

ADD = {
    # 항공사 밸류에이션: 대한항공 PBR(19-1, 20-2 Fair PBR, 22-2), EV/EBITDA(25-1 제안서, 26-2), 티웨이 DCF
    'q27': ['d00732-010', 'd02343-035', 'd02343-037', 'd00881-030', 'd01776-033', 'd01775-035', 'd00737-037',
            'd00737-038', 'd00771-006', 'd00814-047', 'd00814-048'],
    # 해외 매출 비중이 큰 회사: 법인세 차이를 배제하는 EV/EBITDA, 글로벌 Peer 할인, 해외 비중에 따른 PER 격차
    'q28': ['d00983-004', 'd00983-001', 'd02256-028', 'd00020-475', 'd00013-020', 'd02343-042', 'd02260-022',
            'd02260-023', 'd01264-023', 'd00758-038', 'd02271-038', 'd01304-009', 'd01304-008'],
    # 적자·고성장 SaaS: CrowdStrike PSR, PSR 정의, 고성장 기업 EV/EBITDA(듀오링고), 성장 플랫폼 PSR(NAVER, 위지윅)
    'q29': ['d00204-036', 'd02320-036', 'd00000-048', 'd02321-047', 'd01212-040', 'd01141-068', 'd00732-028',
            'd01860-023', 'd01862-023'],
    # 배터리 매출 추정: CAPA×가동률, 셀 업체 Q·P, 양극재 CAPA·판가
    'q30': ['d01000-004', 'd00999-086', 'd00998-088', 'd02030-030', 'd02031-026', 'd00724-016', 'd01971-037',
            'd02279-028', 'd01009-035', 'd01005-027', 'd02286-025'],
    # 수출 통계로 매출 추정: 무역통계 Q, 수출 금액·중량·ASP, K-뷰티 수출액
    'q31': ['d02333-037', 'd02008-054', 'd01936-029', 'd01985-034', 'd02307-038', 'd00600-019'],
    # 판관비 항목별 추정
    'q32': ['d00024-001', 'd00289-044', 'd02328-079', 'd00947-064', 'd00948-021', 'd00977-011', 'd02343-054',
            'd02345-060', 'd01074-060', 'd00835-010', 'd02298-034', 'd02341-046', 'd02319-037', 'd02015-020',
            'd01996-042', 'd01995-040', 'd02008-062', 'd02006-056', 'd01977-046', 'd02014-040', 'd02016-040',
            'd01981-041', 'd02004-046'],
    # Peer Group 선정 기준: 사업구조·시가총액·규모·수익성
    'q33': ['d02256-028', 'd00013-008', 'd01013-028', 'd01012-028', 'd02265-002', 'd00244-007', 'd02260-022',
            'd00089-030', 'd02280-028', 'd02271-039', 'd00758-038', 'd01509-011', 'd01690-014', 'd01716-021'],
    # 타인자본비용: 이자비용/차입금, 신용등급 회사채 금리, 세후 Kd
    'q34': ['d00615-003', 'd01202-003', 'd00000-060', 'd00306-062', 'd00341-009', 'd02246-010', 'd00800-006',
            'd01269-005', 'd00022-008', 'd00784-004', 'd00358-001', 'd00574-002', 'd00347-000', 'd00348-000',
            'd00580-000', 'd01277-000'],
}

REPORT = ('company', 'industry')


def head_chunks(c):
    # 리포트 앞부분(표지·목차·요약)만 본다
    return c['doc_type'] in REPORT and int(c['chunk_id'].split('-')[1]) < 4


RULES = {
    # 목차: 리포트 앞부분에 목차가 있고 투자포인트·밸류에이션 같은 섹션 이름이 보이는 청크
    'q35': lambda c: head_chunks(c) and re.search(r'CONTENTS|목\s*차', c['text'])
    and re.search(r'Investment|투자\s*포인트|Valuation|밸류에이션', c['text']),
    # 투자포인트 제목 예시: 표지·요약에 투자포인트가 두 개 이상 제목으로 나오는 청크
    'q36': lambda c: head_chunks(c)
    and len(re.findall(r'Investment Point|투자\s*포인트|투자포인트', c['text'])) >= 2,
    # DCF 리포트 예시: 기업 리포트의 밸류에이션 부분에서 DCF를 채택했다고 쓴 청크
    # (DCF와 '채택' 등이 멀리 떨어진 표지 요약까지 잡히지 않도록 60자 안에 같이 나올 때만)
    'q37': lambda c: c['doc_type'] == 'company'
    and re.search(r'DCF.{0,60}(채택|적용|활용|이용|산정)', c['text'], re.S)
    and not re.search(r'DCF.{0,60}(부적합|적합하지)', c['text'], re.S),
    # 양극재 리포트: 양극재를 여러 번 다루는 기업·산업 리포트 청크
    'q38': lambda c: c['doc_type'] in REPORT and c['text'].count('양극재') >= 3,
}


def main():
    chunks = [json.loads(l) for l in open(CAFE / 'parsed' / 'chunks.jsonl')]
    ids = {c['chunk_id'] for c in chunks}
    out = []
    for l in open(CAFE / 'eval' / 'eval_v0.jsonl'):
        q = json.loads(l)
        gold = list(q['gold_chunks'])
        if q['id'] in ADD:
            gold += ADD[q['id']]
        if q['id'] in RULES:
            gold += [c['chunk_id'] for c in chunks if RULES[q['id']](c)]
        missing = [g for g in gold if g not in ids]
        assert not missing, (q['id'], missing)
        q['gold_chunks'] = list(dict.fromkeys(gold))
        q['gold_v0'] = json.loads(l)['gold_chunks']
        out.append(q)
        if len(q['gold_chunks']) != len(q['gold_v0']):
            nd = len({g.split('-')[0] for g in q['gold_chunks']})
            print(q['id'], q['type'], f"청크 {len(q['gold_v0'])} → {len(q['gold_chunks'])}, 문서 {nd}")
    with open(CAFE / 'eval' / 'eval_v1.jsonl', 'w') as f:
        for q in out:
            f.write(json.dumps(q, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
