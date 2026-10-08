import io
p='compositions/chrome.html'; s=io.open(p,encoding='utf-8').read()
old = '''          clone.style.boxSizing = "border-box";
          panel.appendChild(clone);'''
new = '''          clone.style.boxSizing = "border-box";
          // GSAP 가 원본에 구워 넣은 인라인 상태(scaleX(0) 등)를 씻어낸다
          clone.style.transform = "none";
          clone.style.opacity = "1";
          clone.style.backgroundColor = "#2a4677";
          clone.querySelectorAll(".gbody, .g-label").forEach(function (el) {
            el.style.transform = "none"; el.style.opacity = "1";
          });
          const cl = clone.querySelector(".g-label");
          if (cl) cl.style.color = "#f7f6f3";
          const fb = clone.querySelector(".focusbar");
          if (fb) fb.style.transform = "scaleX(1)";
          clone.querySelectorAll("[data-btn]").forEach(function (el) {
            el.style.transform = "none"; el.style.backgroundColor = "rgba(27,63,122,0)";
          });
          clone.querySelectorAll(".ring").forEach(function (el) {
            el.style.transform = "none"; el.style.opacity = "0";
          });
          panel.appendChild(clone);'''
assert old in s; s=s.replace(old,new)
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
print('patched')
