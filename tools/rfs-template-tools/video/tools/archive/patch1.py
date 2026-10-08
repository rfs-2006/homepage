import io
p='compositions/chrome.html'; s=io.open(p,encoding='utf-8').read()

# 1) 그룹 기하를 만들면서 기록 (레이아웃 조회에 의존하지 않는다)
old = '''        const root = document.getElementById("chrome");
        const groupsEl = root.querySelector("#groups");
        const total = GROUPS.reduce(function (s, g) { return s + g.basis; }, 0);
'''
new = '''        const root = document.getElementById("chrome");
        const groupsEl = root.querySelector("#groups");
        const total = GROUPS.reduce(function (s, g) { return s + g.basis; }, 0);

        // 그룹의 전역 기하 — 리본은 left 0 / top 206, 탭 44 + 선 2 = 그룹 상단 252, 높이 150
        const GEOM = {};
        var _cum = 0;
        GROUPS.forEach(function (g) {
          var w = (g.basis / total) * 1920;
          GEOM[g.name] = { x: _cum, y: 252, w: w, h: 150 };
          _cum += w;
        });
'''
assert old in s; s=s.replace(old,new)

# 2) zoomGroup 이 GEOM 을 쓰도록
old2 = '''          const clone = g.cloneNode(true);
          clone.style.width = g.offsetWidth + "px";
          clone.style.height = g.offsetHeight + "px";
          clone.style.flex = "none";'''
new2 = '''          const gm = GEOM[name];
          const clone = g.cloneNode(true);
          clone.style.width = gm.w.toFixed(2) + "px";
          clone.style.height = gm.h + "px";
          clone.style.flex = "none";
          clone.style.boxSizing = "border-box";'''
assert old2 in s; s=s.replace(old2,new2)

old3 = '''          const gb = layoutBox(g, null);
          const dx = gb.x - PX, dy = (gb.y + RIBBON_SHIFT) - PY;'''
new3 = '''          const dx = gm.x - PX, dy = (gm.y + RIBBON_SHIFT) - PY;'''
assert old3 in s; s=s.replace(old3,new3)

# 3) 리본 버튼 좌표도 GEOM 기준으로 (그룹 x + 그룹 내 오프셋)
old4 = '''          const r = layoutBox(el, null);
          return { x: r.x, y: r.y + RIBBON_SHIFT, w: r.w, h: r.h };'''
new4 = '''          const cell = el.closest(".group");
          const gm = cell ? GEOM[cell.dataset.group] : null;
          const r = layoutBox(el, cell);
          if (gm) return { x: gm.x + r.x, y: gm.y + r.y + RIBBON_SHIFT, w: r.w, h: r.h };
          const a = layoutBox(el, null);
          return { x: a.x, y: a.y + RIBBON_SHIFT, w: a.w, h: a.h };'''
assert old4 in s; s=s.replace(old4,new4)
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
print('patched')
