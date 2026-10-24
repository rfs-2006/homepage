"""평가셋 v2: v1의 정답 오류를 고치고, 에이전트형 검색이 새로 찾아온 문서 중 맞는 것을 정답에 넣는다.

  python3 -I tools/rag/build_eval_v2.py /home/user/rfs-cafe-data

v1 정답 후보는 BM25·벡터·리랭크 결과에서만 골랐다 (순환 편향). multiquery·agent가 그 밖에서 찾아온 청크를
상위 10개 기준으로 하나씩 읽고, v1과 같은 기준(질문에 대한 방법·근거·사례가 청크 안에 직접 있는가)으로 골랐다.
- FIX: 정답 자체가 틀린 문항. q17은 v0 정답이 휴메딕스가 아니라 'TRASS'가 들어간 다른 문서(기초세미나, 제주반도체)였다.
- ADD: 새로 넣은 정답. 뺀 것의 예: 유니슨 PBR(적자지만 SaaS·고성장 아님), 현대차 DCF(해외 매출을 따로 추정했을 뿐 방법 선택 근거가 아님).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from retriever import load_chunks  # noqa: E402

CAFE = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/rfs-cafe-data')

FIX = {
    # 휴메딕스 매출추정의 브라질 HA필러: TRASS 성남·원주發 브라질 필러 수출액에서 휴젤분 차감 (리포트 2종 + 엑셀 모델)
    'q17': ['d02324-055', 'd00622-053', 'd00623-025'],
}

ADD = {
    # 대한항공 엑셀 모델: 싱가포르항공·캐세이퍼시픽 Peer EV/EBITDA
    'q27': ['d00882-000'],
    # 에이피알: 수출 비중 91% → DCF 대신 P/E, 해외 성장률로 Peer 선정 / LS ELECTRIC: 북미 수출로 글로벌 Peer
    # 오리온: 해외 비중에 따른 PER 격차 / 휴메딕스: 해외 필러 성장 Historical Peer
    'q28': ['d02006-039', 'd02008-050', 'd02328-063', 'd01305-009', 'd02324-064', 'd02324-065'],
    # CrowdStrike PSR 모델, Rule of 40, Palantir PSR, 기초세미나 PSR 설명, 초기 플랫폼 PSR(인터넷/게임 가이드)
    'q29': ['d00205-000', 'd01421-018', 'd01471-007', 'd00013-000', 'd01158-011'],
    # 태광: 글로벌 배터리 수요 → K배터리 3사 가동률 → 매출 회귀
    'q30': ['d00870-053', 'd02340-053'],
    # 비올 소모품 수출 통계 P, 에이피알 관세청 북미 수출액×점유율, 티앤엘 안성시 창상피복재 수출, 파마리서치 강릉시 수출 통계
    'q31': ['d00361-034', 'd00360-024', 'd00360-025', 'd02006-046', 'd02311-036', 'd01980-009'],
    # 한샘 계정별 추정 논리 표, 파마리서치 광고선전비·인건비 분해, 기아 판관비 계정별 회귀, 삼성E&A 판관비 인건비
    'q32': ['d00509-028', 'd01979-038', 'd00562-027', 'd02338-058'],
    # LG에너지솔루션 증권신고서 비교회사 선정(모집단→재무 유사성→사업 유사성), 루트로닉 사업구조·시가총액 가중,
    # 하이트진로 내수 Peer·비상장 제외, 파크시스템스·한미반도체 장비 Peer, HD현대마린솔루션 BM 유사 Peer,
    # 신세계인터내셔날 사업부별 Peer, 덴티움 글로벌 Peer 할인, 기초세미나 '사업부문·규모·비용구조 확인'
    'q33': ['d00020-479', 'd00020-484', 'd00020-370', 'd00020-474', 'd02276-026', 'd02276-027', 'd00332-029',
            'd01284-020', 'd02306-054', 'd02306-055', 'd00177-054', 'd02315-043', 'd00847-042', 'd02323-046',
            'd00250-008', 'd00351-026', 'd00352-028', 'd00048-038'],
    # 호텔신라·KT&G·롯데칠성 WACC 시트: 신용등급별 회사채 금리, 가중평균 차입이자율
    'q34': ['d00568-004', 'd00578-004', 'd01326-004', 'd01318-006'],
}


def main():
    ids = {c['chunk_id'] for c in load_chunks(CAFE)}
    out = []
    for l in open(CAFE / 'eval' / 'eval_v1.jsonl'):
        q = json.loads(l)
        q['gold_v1'] = q['gold_chunks']
        gold = FIX.get(q['id'], q['gold_chunks']) + ADD.get(q['id'], [])
        missing = [g for g in gold if g not in ids]
        assert not missing, (q['id'], missing)
        q['gold_chunks'] = list(dict.fromkeys(gold))
        if q['gold_chunks'] != q['gold_v1']:
            print(q['id'], q['type'], f"청크 {len(q['gold_v1'])} → {len(q['gold_chunks'])}", '(수정)' if q['id'] in FIX else '')
        out.append(q)
    with open(CAFE / 'eval' / 'eval_v2.jsonl', 'w') as f:
        for q in out:
            f.write(json.dumps(q, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
