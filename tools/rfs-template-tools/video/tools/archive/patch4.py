import io
p='compositions/chrome.html'; s=io.open(p,encoding='utf-8').read()
s=s.replace("filter: drop-shadow(0 18px 44px rgba(0,0,0,0.55)); outline: 3px solid #ff00aa; background: rgba(255,0,170,0.25); }",
            "filter: drop-shadow(0 18px 44px rgba(0,0,0,0.55)); }")
anchor = '      #chrome #conn { position: absolute;'
assert anchor in s
if '#chrome .zpanel {' not in s:
    css = ('      /* 돋보기 — 리본 그룹을 종이 옆으로 크게 뽑아온다 */\n'
           '      #chrome .zpanel { position: absolute; left: 1372px; top: 560px; transform-origin: top left;\n'
           '        opacity: 0; filter: drop-shadow(0 20px 46px rgba(0,0,0,0.6)); }\n'
           '      #chrome .zpanel .group { border-left: 0; }\n\n')
    s = s.replace(anchor, css + anchor)
    print('zpanel CSS inserted')
else:
    print('already present')
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
