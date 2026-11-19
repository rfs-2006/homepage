#!/usr/bin/env python3
"""학기 넘기기: 새 기수가 활동을 시작할 때 사이트 곳곳의 기수·알럼나이 수·임원 이름을 한 번에 바꾼다.

  python3 tools/new-term.py --term 27-1 --alumni 640 --chair 홍길동 --vice 김철수 --t1 … --t2 … --t3 … --t4 … --am …
  python3 tools/new-term.py --term 27-1 --dry        # 바뀔 곳만 보여 주기

  --term     새로 시작하는 학기 (예: 27-1). 기수는 지금 기수 + 1 (--cohort로 직접 줄 수 있다)
  --alumni   알럼나이 수 (보통 지금 수 + 활동을 마친 기수 인원). 비우면 그대로
  --chair --vice --t1 --t2 --t3 --t4 --am   새 임원 이름. 비운 칸은 그대로
  --next     다음 모집 안내 (예: '27-2학기, 2027년 7월'). 비우면 학기로 정한다
임원 사진은 따로: assets/officers/president.webp·vice.webp·team1~4.webp·am.webp (세로 3:4)를 같은 이름으로 바꿔 올린다.
GitHub에서는 Actions → 학기 넘기기(new-term.yml) → Run workflow에 입력하면 이걸 돌리고 PR을 연다.
바꾸는 곳: assets/app.js(숫자 카드·연혁·모집 마감 문구·임원), index.html(소개 문구·메타), tools/seo-config.js(ALUMNI), assets/cert.js(수료증 기본 회장·부회장)
FUND_TEAM(운용팀 명단)·학회원 명부·홈 히어로 사진은 손으로 본다.
"""
import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
FOUNDED = 2006


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--term', required=True)
    ap.add_argument('--cohort', type=int)
    ap.add_argument('--alumni', type=int)
    ap.add_argument('--next', dest='nxt', default='')
    for k in ('chair', 'vice', 't1', 't2', 't3', 't4', 'am'):
        ap.add_argument('--' + k, default='')
    ap.add_argument('--dry', action='store_true')
    a = ap.parse_args()
    if not re.fullmatch(r'\d\d-[12]', a.term):
        raise SystemExit('--term은 27-1 같은 꼴')

    app = open(P('assets', 'app.js'), encoding='utf-8').read()
    old_c = int(re.search(r"\{ target: (\d+), suffix: '기',[^}]*key: 'Cohort'", app).group(1))
    old_a = int(re.search(r"\{ target: (\d+), suffix: '명',[^}]*key: 'Alumni'", app).group(1))
    c, al = a.cohort or old_c + 1, a.alumni or old_a
    yy, h = int(a.term[:2]), int(a.term[3])
    year = 2000 + yy
    age = year - FOUNDED
    nxt = a.nxt or (f'{yy}-2학기, {year}년 7월' if h == 1 else f'{yy + 1}-1학기, {year + 1}년 1월')
    alu = f'{al:,}'
    print(f'기수 {old_c} → {c}, 알럼나이 {old_a} → {al}, 학기 {a.term} ({year}년 {h}학기), 창립 {age}년, 다음 모집 {nxt}')

    changes = []

    def sub(src, pat, rep, name, count=0, need=1):
        new, n = re.subn(pat, rep, src, count=count)
        if n < need:
            raise SystemExit(f'못 찾음: {name} ({pat})')
        changes.append(f'{name}: {n}곳')
        return new

    # ---------- assets/app.js ----------
    s = app
    s = sub(s, r"\{ target: \d+, suffix: '기', shown: s\.counted \? '\d+' : '0', key: 'Cohort', note: '[^']*' \}",
            f"{{ target: {c}, suffix: '기', shown: s.counted ? '{c}' : '0', key: 'Cohort', note: '{a.term}학기 활동 중' }}", '숫자 카드 기수')
    s = sub(s, r"\{ target: \d+, suffix: '명', shown: s\.counted \? '\d+' : '0', key: 'Alumni'",
            f"{{ target: {al}, suffix: '명', shown: s.counted ? '{al}' : '0', key: 'Alumni'", '숫자 카드 알럼나이')
    s = sub(s, r"note: '창립 \d+년'", f"note: '창립 {age}년'", '창립 n년')
    s = sub(s, r"\{ val:'\d+기', key:'Cohort', k:'활동 기수', s:'[^']*' \}", f"{{ val:'{c}기', key:'Cohort', k:'활동 기수', s:'{year}년 {h}학기' }}", '소개 기수')
    s = sub(s, r"\{ val:'[\d,]+명', key:'Alumni'", f"{{ val:'{alu}명', key:'Alumni'", '알럼나이 카드', need=2)
    s = sub(s, r"\{ val:'\d+기', key:'Cohorts', k:'기수', s:'현재 \d+기 활동' \}", f"{{ val:'{c}기', key:'Cohorts', k:'기수', s:'현재 {c}기 활동' }}", '사람들 기수')
    s = sub(s, r"\{ val:'\d+년', key:'Since 2006'", f"{{ val:'{age}년', key:'Since 2006'", '역사 n년')
    s = sub(s, r"big:'\d+기', label:'2006년 창립, \d+번째 기수가 활동 중'", f"big:'{c}기', label:'2006년 창립, {c}번째 기수가 활동 중'", '홈 숫자 기수')
    s = sub(s, r"\d+년째 기수가 끊기지 않고", f"{age}년째 기수가 끊기지 않고", '홈 n년째')
    s = sub(s, r"big:'[\d,]+', label:'0기부터 \d+기까지 거쳐간 알럼나이'", f"big:'{al}', label:'0기부터 {c - 1}기까지 거쳐간 알럼나이'", '홈 숫자 알럼나이')
    s = sub(s, r"\{ year:'\d{4}', eyebrow:'Today',([^}]*?)title:'\d+기 활동 중', text:'알럼나이 [\d,]+명 · ",
            lambda m: f"{{ year:'{year}', eyebrow:'Today',{m.group(1)}title:'{c}기 활동 중', text:'알럼나이 {al}명 · ", '연혁 Today')
    s = sub(s, r"total: \d+, names: GATE_NAMES", f"total: {al}, names: GATE_NAMES", 'AGORA 별 개수')
    s = sub(s, r"closedNote: '\d+기 신입 모집은 마감되었습니다\.'", f"closedNote: '{c}기 신입 모집은 마감되었습니다.'", '모집 마감 문구')
    s = sub(s, r"this\.props\.nextRecruit \?\? '[^']*'", f"this.props.nextRecruit ?? '{nxt}'", '다음 모집')
    for k in ('chair', 'vice', 't1', 't2', 't3', 't4', 'am'):
        name = getattr(a, k).strip()
        if name:
            if not re.fullmatch(r"[^'\\<>]{1,20}", name):
                raise SystemExit(f'이름 확인: {name}')
            s = sub(s, rf"(\{{ id:'{k}', photo:'[^']*', name:)'[^']*'", rf"\g<1>'{name}'", f'임원 {k}', need=2)
    files = {P('assets', 'app.js'): (app, s)}

    # ---------- index.html (화면 틀의 소개 문구·메타) ----------
    h0 = open(P('index.html'), encoding='utf-8').read()
    t = h0
    t = sub(t, r'\d+기 활동 중\.', f'{c}기 활동 중.', 'index 메타 기수')
    t = sub(t, r'현재 \d+기가 활동 중', f'현재 {c}기가 활동 중', 'index 소개 기수')
    t = sub(t, r'총 \d+기, [\d,]+명의 학회원', f'총 {c}기, {alu}명의 학회원', 'index 배출')
    t = sub(t, r'[\d,]+명의 알럼나이 네트워크', f'{alu}명의 알럼나이 네트워크', 'index 알럼나이')
    t = sub(t, r'(\d+년의 역사, )[\d,]+명의 네트워크', rf'\g<1>{alu}명의 네트워크', 'index 네트워크')
    t = sub(t, r'\d+년의 역사, ', f'{age}년의 역사, ', 'index n년의 역사')
    files[P('index.html')] = (h0, t)

    # ---------- tools/seo-config.js, assets/cert.js ----------
    c0 = open(P('tools', 'seo-config.js'), encoding='utf-8').read()
    files[P('tools', 'seo-config.js')] = (c0, sub(c0, r'const ALUMNI = \d+;', f'const ALUMNI = {al};', 'seo ALUMNI'))
    if a.chair.strip() or a.vice.strip():
        k0 = open(P('assets', 'cert.js'), encoding='utf-8').read()
        m = re.search(r"var DEFAULT_NAMES = \{ chair: '([^']*)', vice: '([^']*)' \};", k0)
        files[P('assets', 'cert.js')] = (k0, k0.replace(m.group(0), f"var DEFAULT_NAMES = {{ chair: '{a.chair.strip() or m.group(1)}', vice: '{a.vice.strip() or m.group(2)}' }};"))
        changes.append('수료증 기본 회장·부회장')

    print('\n'.join(changes))
    if a.dry:
        return
    for p, (old, new) in files.items():
        if old != new:
            open(p, 'w', encoding='utf-8').write(new)
    print('바꿈. 이어서: node tools/build-site.js && node tools/build-pages.js')


if __name__ == '__main__':
    main()
