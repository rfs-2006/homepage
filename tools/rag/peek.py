"""검색만 돌려서 챗봇이 받을 자료를 그대로 보여준다. Claude API는 부르지 않는다.

  python3 -I tools/rag/peek.py /home/user/rfs-cafe-data "DCF 어케 해?" "DCF 가이드북" "WACC 산정" [--top 10]
  (질문 뒤의 인자는 검색어. 없으면 질문으로만 찾는다)

용도: 프롬프트를 고칠 때 API 비용 없이 Claude Code 세션이 답을 직접 써 본다 (14절).
- 검색은 서버와 같다: 질문 + 검색어마다 하이브리드 → RRF로 합침 → 질문으로 리랭크 (Voyage 필요).
- 검색어 재작성(서버에서는 Haiku)은 세션이 대신 정해서 인자로 준다.
- 출력은 answer.py가 search_result로 넣는 것과 같은 제목(등급 포함)·출처·본문이다.
- 원문이 나오므로 출력은 터미널에서만 보고 공개 저장소에 저장하지 않는다.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from answer import GRADE, OPEN_PREFETCH  # noqa: E402
from retriever import Retriever, rrf  # noqa: E402


def main():
    args = sys.argv[1:]
    top = OPEN_PREFETCH
    if '--top' in args:
        k = args.index('--top')
        top = int(args[k + 1])
        del args[k:k + 2]
    cafe, question, queries = args[0], args[1], args[2:]
    r = Retriever(cafe)
    r.embed_queries([question] + queries)
    found = r.rerank(question, rrf(*[r.hybrid(q) for q in [question] + queries]), top=100)[:top]
    for n, i in enumerate(found, 1):
        c = r.chunks[i]
        page = f" p.{c['page_start']}" if c.get('page_start') else ''
        print(f"=== [{n}] {c['header']} [{GRADE[c['grade']]}] ({c['chunk_id']}{page})")
        print(c['text'].strip())
        print()


if __name__ == '__main__':
    main()
