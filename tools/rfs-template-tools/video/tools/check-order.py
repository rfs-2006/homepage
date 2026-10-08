# 막 순서 자가 점검 — 렌더 전에 항상 돌린다.
#   python tools/check-order.py
# 리본에서 버튼을 누른 시각과, 페이지에서 무언가 나타나는 시각을 하나의 전역 타임라인으로 합쳐 출력한다.
# 목적: "누르지 않은 버튼의 결과가 먼저 보이는" 사고를 렌더 전에 잡는다.
import io, re, sys, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
idx = io.open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

# 각 서브컴포지션이 전역 몇 초에 시작하는지
offsets = {}
for m in re.finditer(r'data-composition-id="([^"]+)"[^>]*data-start="([\d.]+)"[^>]*data-composition-src="compositions/([^"]+)"', idx, re.S):
    offsets[m.group(3)] = (m.group(1), float(m.group(2)))

events = []

# 1) 리본 — press / focusOn / focusOff (chrome 은 전역 0초 시작)
chrome = io.open(os.path.join(ROOT, "compositions", "chrome.html"), encoding="utf-8").read()
for m in re.finditer(r'press\("([^"]+)",\s*([\d.]+)', chrome):
    events.append((float(m.group(2)), "PRESS", "[%s] 버튼 누름" % m.group(1)))
for m in re.finditer(r'focus(On|Off)\(\[([^\]]+)\],\s*([\d.]+)', chrome):
    kind = "FOCUS+" if m.group(1) == "On" else "FOCUS-"
    events.append((float(m.group(3)), kind, m.group(2).replace('"', '')))

# 2) 페이지 — 타임라인 위치값이 붙은 트윈
for fname, (cid, off) in offsets.items():
    if fname == "chrome.html":
        continue
    src = io.open(os.path.join(ROOT, "compositions", fname), encoding="utf-8").read()
    for line in src.splitlines():
        if not re.search(r'\btl\.(from)?[Tt]o', line):
            continue
        m = re.search(r',\s*([\d.]+)\s*\);\s*$', line.strip())
        if not m:
            continue
        local = float(m.group(1))
        tgt = re.search(r'(?:one|q)\("([^"]+)"\)', line)
        label = tgt.group(1) if tgt else line.strip()[:44]
        events.append((off + local, "reveal", "%s  %s" % (cid, label)))

events.sort(key=lambda e: e[0])
print("=== 전역 타임라인 (초) ===")
for t, kind, label in events:
    mark = "  <<<" if kind == "PRESS" else ""
    print(f"{t:7.2f}  {kind:<8} {label}{mark}")

print("\n=== 점검 ===")
presses = [(t, l) for t, k, l in events if k == "PRESS"]
print(f"버튼 누름 {len(presses)}회")
print("아래 규칙을 눈으로 확인할 것:")
print("  1. 누르지 않은 버튼의 결과물이 화면에 먼저 보이지 않는가")
print("  2. 각 PRESS 직후(0.1~0.5초)에 대응하는 reveal 이 오는가")
print("  3. 자막이 해당 PRESS 와 같은 구간에 떠 있는가")
