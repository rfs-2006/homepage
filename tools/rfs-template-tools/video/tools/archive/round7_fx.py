import io,re
p='compositions/body.html'; s=io.open(p,encoding='utf-8').read()
a=s.index('        function place(f) {'); b=s.index('        // mode "sel"')
s=s[:a]+'''        // 변형(카메라·등장 애니메이션)을 잠깐 걷어내고 원래 레이아웃 자리를 잰다 — 재는 시점과 상관없이 같은 값
        function place(f) {
          const saved = [];
          function strip(el, prop, val) { saved.push([el, prop, el.style[prop]]); el.style[prop] = val; }
          [W, f.host].forEach(function (el) { strip(el, "transform", "none"); });
          f.els.forEach(function (el) {
            for (let n = el; n && n !== f.host; n = n.parentElement) strip(n, "transform", "none");
            if (f.fw) strip(el, "fontWeight", f.fw);
          });
          const pr = f.host.getBoundingClientRect();
          let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          f.els.forEach(function (el) {
            // 글자가 있으면 글자 범위만 (블록 폭 전체가 아니라)
            let r = el.getBoundingClientRect();
            if (el.textContent.trim() && !el.querySelector("svg, table, .area")) {
              const rg = document.createRange(); rg.selectNodeContents(el);
              const rr = rg.getBoundingClientRect(); if (rr.width > 0) r = rr;
            }
            x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
          });
          saved.reverse().forEach(function (v) { v[0].style[v[1]] = v[2]; });
          const P = f.pad == null ? 3 : f.pad;
          f.box.style.left = (x0 - pr.left - P) + "px";
          f.box.style.top = (y0 - pr.top - P) + "px";
          f.box.style.width = (x1 - x0 + 2 * P) + "px";
          f.box.style.height = (y1 - y0 + 2 * P) + "px";
          f.cx = (x0 + x1) / 2 - pr.left; f.cy = (y0 + y1) / 2 - pr.top;
        }
'''+s[b:]
o='const f = { els: els, host: host, box: box, pad: opt.pad };'; assert o in s
s=s.replace(o,'const f = { els: els, host: host, box: box, pad: opt.pad, fw: opt.fw };')
# 이벤트 수정
R=[('fx("#em1", 30.6, "sel");          fx("#em3", 32.2, "sel");          fx("#em2", 33.8, "sel");',
    'fx("#em1", 30.6, "sel", { fw: 700 });  fx("#em3", 32.2, "sel", { fw: 700 });  fx("#em2", 33.8, "sel", { fw: 700 });'),
   ('fx("#mv1", 70.6, "sel");','fx("#mv1", 70.6, "sel", { fw: 700 });'),
   ('fx("#fg1 .fcap, #fg2 .fcap, #fg3 .fcap", 80.0, "sel", { pad: 2, punch: 1.03 });',
    'fx("#fg1 .fcap", 80.0, "sel", { pad: 2, punch: 1.03 });  fx("#fg2 .col1:first-child .fcap", 80.0, "sel", { pad: 2, punch: false });'),
   ('fx("#tocNew1, #tocNew2, #tocNew3", 88.9, "pop", { host: "#tocPage" });','fx("#tocNew1, #tocNew2, #tocNew3", 89.5, "pop", { host: "#tocPage" });'),
   ('fx("#annTxt", 49.8, "pop", { pad: 2 });','fx("#annTxt", 49.8, "pop", { pad: 3 });'),
   ('fx("#annNote", 60.9, "pop", { pad: 2, punch: false });','fx("#annNote", 60.9, "pop", { pad: 3, punch: false });'),
]
for a_,b_ in R:
    assert a_ in s,a_; s=s.replace(a_,b_)
# 주석 배치 — 매크로 실물 스타일, 서로 겹치지 않게 차트 위에 한 번에 읽히도록
a=s.index('      #annTxt {'); b=s.index('      #bodyp .hl {') if '#bodyp .hl {' in s else s.index('      #bodyp .fx {')
s=s[:a]+'''      #annTxt { left: 21.5%; top: 18.5%; font-size: 8px; font-weight: 700; color: #c00000; white-space: nowrap; }
      #annArrow { left: 36.8%; top: 23.5%; width: 12%; height: 13.5%; }
      #annArrow svg { width: 100%; height: 100%; overflow: visible; }
      #annBox { left: 76.4%; top: 21%; width: 7.4%; height: 31%; background: rgba(192,0,0,0.10); }
      #annDash { left: 2.6%; top: 46%; width: 14.5%; height: 31%; border: 1.4px dashed #c00000; }
      #annCircle { left: 47.3%; top: 28.6%; width: 5%; height: 18.6%; border: 1.5px dotted #c00000; border-radius: 50%; }
      #annBand { left: 48%; top: 16%; width: 13%; height: 61%; background: rgba(180,199,231,0.5); }
      #annNote { left: 49%; top: 17.6%; font-size: 7px; font-weight: 700; color: #203864; white-space: nowrap; }

'''+s[b:]
o=re.search(r'<svg[^>]*viewBox="0 0 60 60">.*?</svg>',s,re.S).group(0)
s=s.replace(o,'<svg viewBox="0 0 82 25" preserveAspectRatio="none"><defs><marker id="ah" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L6 3 L0 6 z" fill="#c00000" /></marker></defs><path d="M1 2 L78 22" stroke="#c00000" stroke-width="0.9" fill="none" marker-end="url(#ah)" /></svg>')
s=re.sub(r'(id="annNote">)[^<]*<','\1’26.11, 증설 발표<',s)
io.open(p,'w',encoding='utf-8',newline='\n').write(s); print('ok')
