import io
p = 'compositions/chrome.html'
s = io.open(p, encoding='utf-8').read()
blk = io.open('tools/act-block.js', encoding='utf-8').read()
a = s.index('        // \u2500\u2500 \ub9c9\ub9c8\ub2e4 \ub9ac\ubcf8\uc744 \uc9da\ub294 \ud5ec\ud37c \u2500\u2500')
b = s.index('        window.__timelines["chrome"] = tl;')
s = s[:a] + blk + s[b:]
css_anchor = '      #chrome #conn { position: absolute;'
zcss = ('      /* \ub3cb\ubcf4\uae30 \u2014 \ub9ac\ubcf8 \uadf8\ub8f9\uc744 \uc885\uc774 \uc606\uc73c\ub85c \ud06c\uac8c \ubf51\uc544\uc628\ub2e4 */\n'
        '      #chrome .zpanel { position: absolute; left: 1372px; top: 560px; transform-origin: top left; opacity: 0;\n'
        '        filter: drop-shadow(0 18px 44px rgba(0,0,0,0.55)); }\n'
        '      #chrome .zpanel .group { border-left: 0; }\n\n')
if '.zpanel' not in s:
    s = s.replace(css_anchor, zcss + css_anchor)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('spliced ok')
