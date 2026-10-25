"""실제 대화 사례로 서버 답을 확인한다: 질문 유형·축이 맞게 갈리는지 보고, 답을 파일로 남겨 읽어 본다.

  python3 -I tools/rag/eval_cases.py /home/user/rfs-cafe-data https://api.caurfs.kr <tag> [id,...]
  MODE=v2 CASES=cases_v4 python3 -I ...   (서버의 v1/v2를 골라 부른다. 나란히 비교용, NOTES 16절)
사례는 비공개 저장소 eval/<CASES>.jsonl, 기본 cases_v3 ({id, turns: [질문...], expect: [{kind, axes}...], note}).
v2는 유형을 정하지 않으니 '거를 것(종목·인사)을 거르고 나머지는 안 걸렀나'만 맞춰 보고, 답은 파일로 읽는다.
결과는 eval/cases_run_<tag>.jsonl. 서버를 그대로 부르니 하루 질문 수 제한(ANON_DAILY)에 걸리지 않게 해 두고 돌린다.
"""
import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


MODE = os.environ.get('MODE', '')


def post(api, body):
    # curl을 쓴다: 이 환경은 프록시·인증서 설정이 curl에 맞춰져 있다
    r = subprocess.run(['curl', '-sS', '-m', '240', '-X', 'POST', '-H', 'Origin: https://caurfs.kr', '-H', 'Content-Type: application/json',
                        '--data-binary', json.dumps(body, ensure_ascii=False), api.rstrip('/') + '/chat'], capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except ValueError:
        return {'error': (r.stdout or r.stderr)[:300]}


def run(api, case):
    cid, turns = None, []
    for q, exp in zip(case['turns'], case['expect']):
        t = time.time()
        res = post(api, {'conversation_id': cid, 'message': q, **({'mode': MODE} if MODE else {})})
        cid = res.get('conversation_id', cid)
        kind, axes = res.get('kind', 'error'), res.get('axes', [])
        if MODE == 'v2':   # 종목·인사만 거른다 (뜻 불명·너무 넓음은 답 모델이 직접 받는다)
            ok = (kind == 'decline') == (exp['kind'] == 'decline' and case['id'] in ('stock', 'hello'))
        else:
            ok = kind == exp['kind'] and set(exp.get('axes', [])) <= set(axes)
        turns.append({'q': q, 'kind': kind, 'axes': axes, 'section': res.get('section', ''), 'ok': ok, 'sec': round(time.time() - t),
                      'answer': res.get('answer') or res.get('error'), 'timing': res.get('timing'), 'options': res.get('options', []),
                      'sources': [s.get('title') for s in res.get('sources', [])], 'files': res.get('files', []),
                      'tools': res.get('tools', []), 'expect': exp})
    return {'id': case['id'], 'note': case['note'], 'turns': turns}


def main():
    cafe, api, tag = sys.argv[1], sys.argv[2], sys.argv[3]
    cases = [json.loads(l) for l in open(Path(cafe) / 'eval' / (os.environ.get('CASES', 'cases_v3') + '.jsonl'))]
    if len(sys.argv) > 4:
        cases = [c for c in cases if c['id'] in sys.argv[4].split(',')]
    with ThreadPoolExecutor(4) as ex:
        rows = list(ex.map(lambda c: run(api, c), cases))
    out = Path(cafe) / 'eval' / f'cases_run_{tag}.jsonl'
    out.write_text(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows))
    for r in rows:
        for t in r['turns']:
            mark = 'O' if t['ok'] else 'X'
            print(f"{mark} {r['id']:20} {t['kind']:9} {','.join(t['axes'] or t['tools']) or '-':24} {t['sec']:>3}초 {len(t['answer'] or ''):>5}자  기대 {t['expect']}")
    print('맞음', sum(t['ok'] for r in rows for t in r['turns']), '/', sum(len(r['turns']) for r in rows), '→', out)


if __name__ == '__main__':
    main()
