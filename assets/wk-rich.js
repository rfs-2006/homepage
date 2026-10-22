// 위클리 글: 노션에서 통째로 복사한 글을 서식 그대로 받아 쓰고 보여 준다.
// 제목·목록·토글(접고 펴기)·콜아웃·인용·체크박스·표·코드·굵게/기울임/밑줄/취소선·링크·사진을 살리고, 나머지 태그와 스타일은 버린다.
// window.RFSWk = { clean(html) → 안전한 HTML 문자열, isRich(body), render(el, body), attach(editorEl), pick(), collect(editorEl, upload) → body, text(body), reset() }
(function () {
  var MARK = '<!--rich-->';
  var RENAME = { B: 'STRONG', I: 'EM', DEL: 'S', STRIKE: 'S', H1: 'H2', H4: 'H3', H5: 'H3', H6: 'H3' };
  var INLINE = { STRONG: 1, EM: 1, U: 1, S: 1, CODE: 1, MARK: 1, A: 1, BR: 1, SPAN: 1 };
  var DROP = { SCRIPT: 1, STYLE: 1, META: 1, LINK: 1, TITLE: 1, HEAD: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, NOSCRIPT: 1, TEMPLATE: 1, BUTTON: 1, SELECT: 1, TEXTAREA: 1, SVG: 1, CANVAS: 1, VIDEO: 1, AUDIO: 1 };
  var CONTAINER = { DIV: 1, SECTION: 1, ARTICLE: 1, MAIN: 1, HEADER: 1, FOOTER: 1, BODY: 1, HTML: 1, NAV: 1, CENTER: 1, FORM: 1, FIGCAPTION: 1, FIGURE: 1, LABEL: 1 };
  var BLOCKSEL = 'p,div,h1,h2,h3,h4,h5,h6,ul,ol,li,table,blockquote,pre,details,figure,hr,img,aside,section,article';

  function okHref(h) { h = String(h || '').trim(); if (/^\//.test(h)) h = 'https://www.notion.so' + h; return /^(https?:|mailto:)/i.test(h) ? h : ''; }
  function okSrc(s) { s = String(s || '').trim(); if (/^\//.test(s)) s = 'https://www.notion.so' + s; return /^(https?:|blob:|data:image\/(png|jpe?g|gif|webp);)/i.test(s) ? s : ''; }
  function el(t, kids) { var n = document.createElement(t); (kids || []).forEach(function (k) { n.appendChild(k); }); return n; }
  function isInline(n) { return n.nodeType === 3 || INLINE[n.nodeName] === 1; }
  function styleOf(n) { return ((n.getAttribute && n.getAttribute('style')) || '').toLowerCase(); }
  function hasText(nodes) { return nodes.some(function (k) { return k.nodeType === 3 ? /\S/.test(k.nodeValue) : k.nodeName === 'IMG' || k.nodeName === 'BR' || !!(k.textContent || '').trim() || (k.querySelector && k.querySelector('img')); }); }
  // 블록 자리: 떠도는 글·인라인 태그는 <p>로 묶는다
  function group(nodes) {
    var out = [], run = [];
    function flush() { if (run.length && hasText(run)) out.push(el('p', run)); run = []; }
    nodes.forEach(function (k) { if (isInline(k)) run.push(k); else { flush(); out.push(k); } });
    flush();
    return out;
  }
  function kids(n) { var a = []; n.childNodes.forEach(function (c) { a = a.concat(conv(c)); }); return a; }
  function checkbox(n) { var on = n.checked || n.hasAttribute('checked') || /checked|done/.test(n.className || ''); var s = el('span'); s.className = 'chk' + (on ? ' on' : ''); s.textContent = on ? '☑' : '☐'; return s; }

  function conv(n) {
    if (n.nodeType === 3) return [document.createTextNode(n.nodeValue.replace(/[\t\n\r ]+/g, ' '))];
    if (n.nodeType !== 1) return [];
    var t = n.nodeName.toUpperCase();
    if (DROP[t]) return [];
    t = RENAME[t] || t;
    var st = styleOf(n), cls = String(n.className || '');
    if (/(^|\s)checkbox(-on|-off)?(\s|$)/.test(cls) && !(n.textContent || '').trim()) return [checkbox({ checked: /checkbox-on/.test(cls), hasAttribute: function () { return false; }, className: '' })];
    if (t === 'INPUT') return /checkbox/i.test(n.type || n.getAttribute('type') || '') ? [checkbox(n)] : [];
    if (t === 'IMG') { var s = okSrc(n.getAttribute('src')); if (!s) return []; var im = el('img'); im.src = s; im.alt = ''; im.loading = 'lazy'; return [el('figure', [im])]; }
    if (t === 'HR') return [el('hr')];
    if (t === 'BR') return [el('br')];
    if (t === 'PRE') { var pr = el('pre'); pr.textContent = n.textContent.replace(/\n$/, ''); return [pr]; }
    if (t === 'A') { var h = okHref(n.getAttribute('href')); var inner = kids(n).filter(isInline); if (!h) return inner; var a = el('a', inner.length ? inner : [document.createTextNode(h)]); a.href = h; a.target = '_blank'; a.rel = 'noopener'; return [a]; }
    if (t === 'SPAN' && /(^|\s)chk(\s|$)/.test(cls)) return [checkbox({ checked: /(^|\s)on(\s|$)/.test(cls), hasAttribute: function () { return false; }, className: '' })];
    if (t === 'SPAN' || t === 'FONT' || t === 'SMALL' || t === 'SUP' || t === 'SUB' || t === 'MARK' || INLINE[t]) {
      // 노션은 굵게·기울임 등을 style로 줄 때가 있다
      var inn = kids(n);
      if (t === 'SPAN' || t === 'FONT' || t === 'SMALL' || t === 'SUP' || t === 'SUB') {
        if (/font-weight:\s*(bold|[6-9]00)/.test(st)) inn = [el('strong', inn)];
        if (/font-style:\s*italic/.test(st)) inn = [el('em', inn)];
        if (/line-through/.test(st)) inn = [el('s', inn)];
        if (/underline/.test(st)) inn = [el('u', inn)];
        if (/background(-color)?:\s*(?!transparent|rgba\(0,\s*0,\s*0,\s*0\)|inherit|initial)[a-z#(]/.test(st) && !/white|#fff/.test(st)) inn = [el('mark', inn)];
        return inn;
      }
      if (t === 'SPAN') return inn;
      return [el(t.toLowerCase(), inn)];
    }
    if (t === 'H2' || t === 'H3') {
      // 노션의 '토글 제목'은 details 안 summary에 제목이 들어온다
      var hh = el(t.toLowerCase(), kids(n).filter(isInline));
      if (n.nodeName.toUpperCase() === 'H1' || /(^|\s)h1(\s|$)/.test(cls)) hh.className = 'h1'; // 노션 페이지 제목·큰 제목은 리포트 헤드라인 후보
      return (hh.textContent || '').trim() ? [hh] : [];
    }
    if (t === 'P') { var pk = kids(n); var flat = []; pk.forEach(function (k) { if (isInline(k)) flat.push(k); }); var blocks = pk.filter(function (k) { return !isInline(k); }); return (hasText(flat) ? [el('p', flat)] : []).concat(blocks); }
    if (t === 'UL' || t === 'OL') {
      var lis = [];
      n.childNodes.forEach(function (c) { if (c.nodeType === 1 && c.nodeName === 'LI') lis.push(c); });
      // 노션 토글 목록: <ul class="toggle"><li><details>… → 점 없이 토글만
      if (lis.length && lis.every(function (li) { var f = li.firstElementChild; return f && f.nodeName === 'DETAILS'; })) return lis.reduce(function (a, li) { return a.concat(kids(li)); }, []);
      var list = el(t.toLowerCase());
      var todo = /to-do|todo|checklist/.test(cls);
      lis.forEach(function (li) {
        var it = el('li', kids(li));
        if (todo || /(^|\s)todo(\s|$)/.test(cls) || (it.firstChild && /(^|\s)chk(\s|$)/.test(it.firstChild.className || ''))) list.className = 'todo';
        if ((it.textContent || '').trim() || it.querySelector('img')) list.appendChild(it);
      });
      return list.childNodes.length ? [list] : [];
    }
    if (t === 'LI') return [el('li', kids(n))];
    if (t === 'DETAILS') {
      var sum = n.querySelector(':scope > summary');
      var d = el('details'); if (n.hasAttribute('open')) d.open = true;
      // 토글 제목(summary 안 h1~h3)은 글자만 꺼내 제목 모양으로
      var sk = []; if (sum) kids(sum).forEach(function (k) { if (isInline(k)) sk.push(k); else if (/^H[23]$/.test(k.nodeName)) sk = sk.concat(Array.prototype.slice.call(k.childNodes)); });
      var sm = el('summary', sk.length ? sk : [document.createTextNode('더 보기')]);
      if (sum && (sum.querySelector('h1,h2,h3,h4,h5,h6') || /(^|\s)h(\s|$)/.test(sum.className || ''))) sm.className = 'h';
      d.appendChild(sm);
      var body = []; n.childNodes.forEach(function (c) { if (c !== sum) body = body.concat(conv(c)); });
      group(body).forEach(function (k) { d.appendChild(k); });
      return [d];
    }
    if (t === 'SUMMARY') return kids(n).filter(isInline);
    if (t === 'BLOCKQUOTE') { var q = el('blockquote', group(kids(n))); return (q.textContent || '').trim() ? [q] : []; }
    if (t === 'TABLE') {
      var tb = el('table'), rows = n.querySelectorAll('tr');
      rows.forEach(function (tr) {
        var r = el('tr');
        tr.childNodes.forEach(function (c) { if (c.nodeType === 1 && /^T[DH]$/.test(c.nodeName)) r.appendChild(el(c.nodeName.toLowerCase(), kids(c))); });
        tb.appendChild(r);
      });
      return rows.length ? [el('div', [tb])].map(function (w) { w.className = 'tbl'; return w; }) : [];
    }
    if (t === 'ASIDE' || /callout/.test(cls)) {
      var ak = group(kids(n));
      // 노션 콜아웃 아이콘(이모지)은 첫 문단 앞에 붙인다
      if (ak.length > 1 && ak[0].nodeName === 'P' && (ak[0].textContent || '').trim().length <= 3 && ak[1].nodeName === 'P') { ak[1].insertBefore(document.createTextNode((ak[0].textContent || '').trim() + ' '), ak[1].firstChild); ak.shift(); }
      var asd = el('aside', ak);
      asd.className = 'callout';
      return (asd.textContent || '').trim() ? [asd] : [];
    }
    // 그 밖의 태그(div 등): 블록이 안 섞였으면 문단, 섞였으면 껍데기만 벗긴다
    var ch = kids(n);
    if (!CONTAINER[t] && !n.querySelector(BLOCKSEL)) return ch.filter(isInline);
    if (!n.querySelector(BLOCKSEL)) return hasText(ch) ? [el('p', ch.filter(isInline))] : [];
    return ch;
  }

  function clean(html) {
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    var out = group(kids(doc.body));
    var box = document.createElement('div');
    out.forEach(function (k) { box.appendChild(k); });
    // 빈 문단 정리
    box.querySelectorAll('p').forEach(function (p) { if (!(p.textContent || '').trim() && !p.querySelector('img,br')) p.remove(); });
    return box.innerHTML;
  }
  function textToHtml(t) {
    var box = document.createElement('div');
    String(t || '').replace(/\r/g, '').split(/\n{2,}/).forEach(function (para) {
      if (!para.trim()) return;
      var p = document.createElement('p');
      para.split('\n').forEach(function (line, i) { if (i) p.appendChild(document.createElement('br')); p.appendChild(document.createTextNode(line)); });
      box.appendChild(p);
    });
    return box.innerHTML;
  }
  function isRich(body) { return String(body || '').indexOf(MARK) === 0; }
  function render(node, body) { node.innerHTML = clean(String(body || '').slice(MARK.length)); }
  function text(body) { var d = new DOMParser().parseFromString(String(body || '').slice(MARK.length), 'text/html'); return (d.body.textContent || '').replace(/\s+/g, ' ').trim(); }


  // 리포트 양식으로 꾸미기: 글 맨 앞 큰 제목(노션 H1)은 남색 헤드라인으로 올리고(없으면 글 제목), 나머지 소제목은 [ ]로 감싸 오른쪽에 목차를 만든다
  function sheet(sh, body) {
    if (!sh || !body) return;
    var hl = sh.querySelector('.wkp-hl'), toc = sh.querySelector('.wkp-toc');
    var first = body.firstElementChild;
    if (hl) {
      if (first && first.nodeName === 'H2' && first.className === 'h1') { hl.textContent = first.textContent.trim(); first.remove(); }
      else hl.textContent = hl.getAttribute('data-t') || '';
    }
    var hs = Array.prototype.slice.call(body.querySelectorAll(':scope > h2'));
    hs.forEach(function (h) { var t = h.textContent.trim(); if (t && t.charAt(0) !== '[') h.textContent = '[' + t + ']'; });
    if (toc) {
      toc.innerHTML = '';
      if (hs.length >= 2) {
        var b = document.createElement('b'); b.textContent = 'Contents'; toc.appendChild(b);
        hs.forEach(function (h, i) {
          var a = document.createElement('a'); a.href = '#';
          var n = document.createElement('i'); n.textContent = (i + 1) + '.';
          a.appendChild(n); a.appendChild(document.createTextNode(h.textContent.replace(/^\[|\]$/g, '')));
          a.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: h.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' }); });
          toc.appendChild(a);
        });
      }
    }
  }

  // ── 편집기 ──
  var files = new Map(); // blob 주소 → File
  var draft = '';        // 화면이 다시 그려져도 쓰던 글이 남게
  var lastRange = null, cur = null, picker = null;

  function blobOf(f) { var u = URL.createObjectURL(f); files.set(u, f); return u; }
  function saveRange() { var s = window.getSelection(); if (cur && s.rangeCount && cur.contains(s.anchorNode)) lastRange = s.getRangeAt(0).cloneRange(); }
  function insertHtml(html) {
    cur.focus();
    var s = window.getSelection();
    if (lastRange && !(s.rangeCount && cur.contains(s.anchorNode))) { s.removeAllRanges(); s.addRange(lastRange); }
    if (!(s.rangeCount && cur.contains(s.anchorNode))) { var r = document.createRange(); r.selectNodeContents(cur); r.collapse(false); s.removeAllRanges(); s.addRange(r); }
    document.execCommand('insertHTML', false, html);
    sync();
  }
  function sync() { if (cur) { draft = cur.innerHTML; cur.classList.toggle('empty', !(cur.textContent || '').trim() && !cur.querySelector('img')); } }
  // 노션 사진은 주소로 받아 우리 저장소에 올릴 수 있게 파일로 바꿔 둔다. 못 받으면 '다시 올리기' 표시
  function fetchImgs() {
    cur.querySelectorAll('img:not([data-k])').forEach(function (im) {
      var src = im.getAttribute('src') || '';
      if (/^blob:/.test(src) && files.has(src)) { im.setAttribute('data-k', 'ok'); return; }
      im.setAttribute('data-k', 'wait');
      var fig = im.closest('figure'); if (fig) fig.classList.add('wait');
      var p = /^data:/.test(src) ? fetch(src) : fetch(src, { mode: 'cors', credentials: 'omit' });
      p.then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then(function (b) {
          if (!/^image\//.test(b.type)) throw new Error('type');
          var u = blobOf(new File([b], 'notion.' + (b.type.split('/')[1] || 'png').replace(/[^a-z0-9]/g, ''), { type: b.type }));
          im.src = u; im.setAttribute('data-k', 'ok'); if (fig) fig.classList.remove('wait'); sync();
        })
        .catch(function () { im.setAttribute('data-k', 'miss'); if (fig) { fig.classList.remove('wait'); fig.classList.add('miss'); fig.setAttribute('contenteditable', 'false'); } sync(); });
    });
  }
  function figFor(f) { return '<figure><img src="' + blobOf(f) + '" alt="" data-k="ok"></figure><p><br></p>'; }
  function pick(replaceImg) {
    if (!picker) { picker = document.createElement('input'); picker.type = 'file'; picker.accept = 'image/*'; picker.multiple = true; picker.style.display = 'none'; document.body.appendChild(picker); }
    picker.onchange = function () {
      var fs = Array.prototype.filter.call(picker.files || [], function (f) { return /^image\//.test(f.type); }); picker.value = '';
      if (!fs.length) return;
      if (replaceImg) { replaceImg.src = blobOf(fs[0]); replaceImg.setAttribute('data-k', 'ok'); var fg = replaceImg.closest('figure'); if (fg) { fg.classList.remove('miss'); fg.removeAttribute('contenteditable'); } sync(); return; }
      insertHtml(fs.map(figFor).join(''));
    };
    picker.click();
  }
  function attach(node) {
    if (!node || node.__wk) return;
    node.__wk = true; cur = node;
    node.setAttribute('contenteditable', 'true');
    if (draft && !node.innerHTML.trim()) node.innerHTML = draft;
    sync();
    node.addEventListener('input', sync);
    node.addEventListener('keyup', saveRange); node.addEventListener('mouseup', saveRange); node.addEventListener('blur', saveRange);
    node.addEventListener('click', function (e) { var fg = e.target.closest && e.target.closest('figure.miss'); if (fg) { e.preventDefault(); pick(fg.querySelector('img')); } });
    node.addEventListener('paste', function (e) {
      var cd = e.clipboardData; if (!cd) return;
      var html = cd.getData('text/html');
      var imgs = Array.prototype.filter.call(cd.files || [], function (f) { return /^image\//.test(f.type); });
      e.preventDefault();
      if (!html && imgs.length) { insertHtml(imgs.map(figFor).join('')); return; }
      insertHtml(html ? clean(html) : textToHtml(cd.getData('text/plain')));
      fetchImgs();
    });
    node.addEventListener('drop', function (e) {
      var fs = Array.prototype.filter.call((e.dataTransfer && e.dataTransfer.files) || [], function (f) { return /^image\//.test(f.type); });
      if (!fs.length) return;
      e.preventDefault();
      if (document.caretRangeFromPoint) { var r = document.caretRangeFromPoint(e.clientX, e.clientY); if (r) lastRange = r; }
      insertHtml(fs.map(figFor).join(''));
    });
  }
  // 올리기: 사진을 저장소에 올려 주소를 바꾸고, 정리한 HTML을 돌려준다
  function collect(node, upload) {
    var box = node.cloneNode(true);
    if (box.querySelector('img[data-k="wait"]')) return Promise.reject(new Error('노션 사진을 불러오는 중입니다. 잠시 후 다시 눌러 주세요'));
    var miss = box.querySelectorAll('img[data-k="miss"]').length;
    if (miss) return Promise.reject(new Error('노션에서 가져오지 못한 사진이 ' + miss + '장 있습니다. 빨간 칸을 눌러 사진을 다시 올려 주세요'));
    var ims = Array.prototype.slice.call(box.querySelectorAll('img'));
    return ims.reduce(function (pr, im) {
      return pr.then(function () {
        var s = im.getAttribute('src') || '';
        if (!/^blob:/.test(s)) return;
        var f = files.get(s); if (!f) { im.remove(); return; }
        return upload([f]).then(function (u) { im.setAttribute('src', u[0]); });
      });
    }, Promise.resolve()).then(function () {
      var html = clean(box.innerHTML);
      return (html.replace(/<[^>]+>/g, '').trim() || /<img/.test(html)) ? MARK + html : '';
    });
  }
  function reset() { draft = ''; lastRange = null; files.forEach(function (_, u) { URL.revokeObjectURL(u); }); files.clear(); if (cur) { cur.innerHTML = ''; sync(); } }

  window.RFSWk = { clean: clean, isRich: isRich, render: render, sheet: sheet, text: text, attach: attach, pick: function () { pick(null); }, collect: collect, reset: reset };
  if (window.__wkReady) window.__wkReady();
})();
