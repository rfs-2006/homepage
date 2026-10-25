"""리포트 글 지표: 체크리스트(rubric.md) '글' 축 중 셀 수 있는 것을 전체 리포트에 매긴다. LLM 없이 돈 안 든다.

  python3 -I tools/rag/style_metrics.py /home/user/rfs-cafe-data
출력  eval/style_metrics.jsonl (리포트마다 지표), eval/style_metrics_summary.json (분위수, 기준 글 값)

- 대상: 기업·산업 리포트, 중복 제외, 같은 제목이 여러 형식이면 PDF 우선 (PDF판과 워드판의 값이 꽤 다르다: TORM 판단문 숫자 81% vs 64%).
- 문장: 본문에서 '다/음/함/임'으로 끝나는 15~400자 문장. 같은 문장이 여러 번(차트 제목 중복) 나오면 한 번만 센다.
- 지표 (뜻과 기준 글 값은 NOTES 14절, 기준 글 = TORM·삼양식품)
  - 날카로움: 판단 문장(전망한다·판단한다·제한적이다 …) 중 숫자가 든 비율. 연도·분기 표기('26, 2Q26, 26E, 1H26, 24년)는 숫자로 안 친다.
  - 압축: 평균 문장 길이, 군더더기(통해·바탕으로·또한·더욱 …) 1,000자당, 정보 밀도(숫자·영문 고유명사) 100자당
  - 구어: 구어 표현(늘려줄·에선·대거·이뤄지며·문장 첫 '하지만,' …) 1,000자당
  - 짓기(TORM식 리듬): 짧은 문장(<30자) 비율, 완곡 종결, '대비', 양보절, 수단·메타어, 태도 부사, AI 상투어, 업계 서술어 (100문장당)
- 거칠게 센 값이다. 순위를 보는 용도로 쓰고, 한 리포트의 판정은 읽고 한다.
"""
import gzip
import json
import re
import statistics
import sys
from pathlib import Path

CAFE = Path(sys.argv[1] if len(sys.argv) > 1 else '/home/user/rfs-cafe-data')
sys.argv = sys.argv[:1] + [str(CAFE)]
sys.path.insert(0, str(Path(__file__).parent))
from chunk import unwrap  # noqa: E402

JUDGE = r'(전망한다|판단한다|전망이다|판단된다|전망된다|예상한다|예상된다|기대된다|것이다|제한적이다|확정적이다|유효하다|가능성이 높다)$'
DATE = r"’\d{2}|'\d{2}|\d[QH]\d{2}|\d{2}[EAF]\b|\d{2,4}년|\d{1,2}월|\d{1,2}일|\d{1,2}분기"
FILL = (r'(하는 것으로|것으로 보인다|라고 할 수 있|라는 점에서|하고 있는 상황|에 있어서?|의 경우|상당 부분|더욱|단순(히|한)?|또한|뿐만 아니라|'
        r'다양한|지속적으로|본격적으로|적극적으로|하게 되|되어지|에 대한|통해|통한|바탕으로|기반으로|역할을 하|작용하|모습을 보|세를 보|양상을 보|'
        r'이어가|이어질|나타나|이루어|이뤄)')
COLLOQ = r'(에선|이뤄|늘려|해줄|해주|대거|엄청|굉장히|거다|^하지만,|오히려|꽤|너무|훨씬|맡겨|먹겠|부족해|갖고)'
FLOW = {
    '완곡종결': r'(기대된다|예상된다|보인다|판단된다|전망된다)$',
    '대비': r'대비',
    '양보절': r'(더라도|에도 불구하고|[가-힣]으나,|[가-힣]이나,)',
    '수단메타': r'통해|바탕으로|기반으로|알 수 있다|서술하고자|에 대해',
    '태도부사': r'적극적|본격적',
    'AI상투어': r'다양한|효과적|혁신적|시너지|인사이트|중요한 의미|결론적으로',
    '업계서술어': r'견조|견인|수혜|가속화|기록했|전망한다|판단한다|제한적|유효',
}


def sentences(text):
    out = []
    for para in unwrap(text).split('\n'):
        for s in re.split(r'(?<=[다음함임])\.\s+|(?<=다)\.$', para):
            s = s.strip()
            if 15 <= len(s) <= 400 and re.search(r'[가-힣]', s) and re.search(r'(다|음|함|임)$', s):
                out.append(s)
    return list(dict.fromkeys(out))


def metrics(text):
    S = sentences(text)
    if len(S) < 30:
        return None
    body = ' '.join(S)
    n, chars = len(S), len(body)
    J = [s for s in S if re.search(JUDGE, s)]
    per100 = lambda pat: round(100 * sum(bool(re.search(pat, s)) for s in S) / n, 1)
    return {
        'sentences': n,
        '날카로움_판단문숫자%': round(100 * sum(bool(re.search(r'\d', re.sub(DATE, '', s))) for s in J) / len(J)) if len(J) >= 10 else None,
        '평균문장길이': round(statistics.mean(len(s) for s in S)),
        '군더더기_천자당': round(1000 * len(re.findall(FILL, body)) / chars, 2),
        '정보밀도_백자당': round(100 * len(re.findall(r'\d[\d,.]*|[A-Z][A-Za-z0-9&/.-]+', re.sub(DATE, '', body))) / chars, 2),
        '구어_천자당': round(1000 * sum(len(re.findall(COLLOQ, s)) for s in S) / chars, 2),
        '짧은문장%': round(100 * sum(len(s) < 30 for s in S) / n, 1),
        **{k + '_백문장당': per100(p) for k, p in FLOW.items()},
    }


def main():
    docs = [json.loads(l) for l in gzip.open(CAFE / 'parsed' / 'docs.jsonl.gz', 'rt')]
    best = {}
    for d in docs:
        if d['doc_type'] not in ('company', 'industry') or 'duplicate_of' in d or d['chars'] < 8000:
            continue
        k = d['subject']
        if k not in best or (d['ext'] == '.pdf' and best[k]['ext'] != '.pdf'):
            best[k] = d
    rows = []
    for d in best.values():
        m = metrics(d['text'])
        if m:
            rows.append({'doc_id': d['doc_id'], 'subject': d['subject'], 'doc_type': d['doc_type'], 'ext': d['ext'], **m})
    with open(CAFE / 'eval' / 'style_metrics.jsonl', 'w') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    keys = [k for k in rows[0] if k not in ('doc_id', 'subject', 'doc_type', 'ext', 'sentences')]
    summary = {'reports': len(rows), 'quantiles': {}, 'exemplars': {}}
    for k in keys:
        v = sorted(r[k] for r in rows if r[k] is not None)
        summary['quantiles'][k] = {'p25': v[len(v) // 4], 'median': statistics.median(v), 'p75': v[3 * len(v) // 4]}
    for r in rows:
        if re.search(r'TORM|삼양식품_SOHKA', r['subject']):
            summary['exemplars'][r['subject']] = {k: r[k] for k in keys}
    (CAFE / 'eval' / 'style_metrics_summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1))
    print(json.dumps(summary, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
