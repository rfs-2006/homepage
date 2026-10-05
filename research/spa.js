// 리포트 개별 페이지(/research/<id>/)에서 홈의 리포트 화면을 그대로 띄운다.
// 이 페이지의 정적 HTML은 검색엔진용으로 남겨 두고, 브라우저에서는 메인(/)의 HTML을 받아
// 이 페이지의 제목·설명·canonical·구조화 데이터로 머리말을 바꿔 끼운 뒤 문서를 통째로 교체한다.
// 메인 앱은 주소(/research/<id>/)를 읽어 해당 리포트 화면을 연다. 실패하면 정적 페이지를 그대로 보여 준다.
(function () {
  var root = document.documentElement;
  root.style.visibility = 'hidden';
  var show = function () { root.style.visibility = ''; };
  var timer = setTimeout(show, 4000);
  // 이 페이지의 검색용 머리말 태그를 모은다
  var keep = [].slice.call(document.head.querySelectorAll(
    'title, meta[name="description"], meta[name="keywords"], link[rel="canonical"], meta[property^="og:"], meta[property^="article:"], meta[name^="twitter:"], script[type="application/ld+json"]'
  )).map(function (el) { return el.outerHTML; }).join('\n');
  fetch('/', { credentials: 'same-origin' }).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.text();
  }).then(function (html) {
    var head = html.indexOf('<head>');
    if (head < 0) throw new Error('no head');
    // 메인의 같은 종류 태그는 빼고 이 페이지 것을 넣는다. 상대 경로는 사이트 루트 기준으로
    html = html
      .replace(/<title>[\s\S]*?<\/title>\s*/, '')
      .replace(/<meta (name="(description|keywords)"|property="og:[^"]*"|property="article:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/g, '')
      .replace(/<link rel="canonical"[^>]*>\s*/g, '')
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');
    head = html.indexOf('<head>') + 6;
    html = html.slice(0, head) + '\n<base href="/">\n' + keep + '\n' + html.slice(head);
    clearTimeout(timer);
    document.open();
    document.write(html);
    document.close();
  }).catch(function () { clearTimeout(timer); show(); });
})();
