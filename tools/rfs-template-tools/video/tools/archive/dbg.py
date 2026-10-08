import io
p='compositions/chrome.html'; s=io.open(p,encoding='utf-8').read()
s=s.replace("filter: drop-shadow(0 18px 44px rgba(0,0,0,0.55)); }",
            "filter: drop-shadow(0 18px 44px rgba(0,0,0,0.55)); outline: 3px solid #ff00aa; background: rgba(255,0,170,0.25); }")
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
print('debug border on')
