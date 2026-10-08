import io
p='compositions/chrome.html'; s=io.open(p,encoding='utf-8').read()
old = '''          clone.querySelectorAll("[data-btn]").forEach(function (el) {
            el.style.transform = "none"; el.style.backgroundColor = "rgba(27,63,122,0)";
          });'''
new = '''          clone.querySelectorAll("[data-btn]").forEach(function (el) {
            el.style.transform = "none"; el.style.backgroundColor = "rgba(27,63,122,0)";
            const sp = el.querySelector("span");
            if (sp) sp.style.color = "rgba(247,246,243,0.95)";
          });'''
assert old in s; s=s.replace(old,new)
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
print('patched')
