// 밸리 자동 넣기 북마클릿 원본. /valley/ 페이지가 이 파일을 읽어 javascript: 링크로 만든다.
// 동작: 이미지 여러 장을 고른 뒤 에디터의 이미지 버튼을 한 번 누르면, 파일 창 대신 1번 파일을 넣고
// 업로드가 끝나면(에디터 안 이미지 수가 늘면) 같은 버튼을 다시 눌러 다음 파일을 넣는다. 파일 이름 순.
// 에디터 내부 구조에 기대지 않도록 파일 입력(input.click, label, showOpenFilePicker)만 가로챈다.
(() => {
  if (window.__valleyFill) { window.__valleyFill.panel.style.display = 'block'; return; }
  const S = { files: [], i: 0, btn: null, running: false, waiting: false, stop: false };
  window.__valleyFill = S;

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:280px;padding:14px 16px;background:#0F1B2E;color:#fff;font:14px/1.5 sans-serif;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.3)';
  panel.innerHTML = '<b style="display:block;margin-bottom:6px">밸리 자동 넣기</b><div id="vf-msg">넣을 이미지를 고르세요.</div>'
    + '<div style="display:flex;gap:8px;margin-top:10px"><button id="vf-pick">이미지 고르기</button><button id="vf-stop">닫기</button></div>';
  panel.querySelectorAll('button').forEach(b => b.style.cssText = 'font:inherit;border:0;border-radius:6px;padding:6px 10px;background:#fff;color:#0F1B2E;cursor:pointer');
  document.body.appendChild(panel);
  S.panel = panel;
  const msg = (t) => { panel.querySelector('#vf-msg').textContent = t; };

  const imgCount = () => {
    let n = 0;
    document.querySelectorAll('[contenteditable="true"]').forEach(e => { n += e.querySelectorAll('img').length; });
    return n;
  };

  // 다음 파일을 파일 입력에 넣는다
  const feed = (input) => {
    if (!S.btn) S.btn = S.cand;
    const f = S.files[S.i];
    const dt = new DataTransfer(); dt.items.add(f);
    input.files = dt.files;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    afterFeed();
  };
  const afterFeed = () => {
    S.i++; S.waiting = true;
    msg(`${S.i} / ${S.files.length} 넣는 중…`);
    const before = imgCount(), t0 = Date.now();
    const tick = () => {
      if (S.stop) return;
      const done = imgCount() > before;
      if (!done && Date.now() - t0 < 30000) return setTimeout(tick, 300);
      if (!done) { msg(`${S.i}번째 이미지가 30초 안에 안 들어갔어요. 멈춥니다.`); S.running = false; restore(); return; }
      S.waiting = false;
      if (S.i >= S.files.length) { msg(`완료: ${S.files.length}장`); S.running = false; restore(); return; }
      setTimeout(() => S.btn && S.btn.click(), 600);
    };
    setTimeout(tick, 300);
  };
  const active = () => S.running && !S.stop && S.i < S.files.length && !S.waiting;

  // 1) 에디터가 숨은 input을 만들어 .click() 하는 경우
  const origClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file' && active()) { feed(this); return; }
    return origClick.call(this);
  };
  // 2) File System Access API를 쓰는 경우
  const origPicker = window.showOpenFilePicker;
  if (origPicker) window.showOpenFilePicker = function (...a) {
    if (!active()) return origPicker.apply(this, a);
    if (!S.btn) S.btn = S.cand;
    const f = S.files[S.i]; afterFeed();
    return Promise.resolve([{ kind: 'file', name: f.name, getFile: async () => f }]);
  };
  // 3) 버튼이 <label> 또는 input 자체인 경우 + 사용자가 처음 누른 버튼 기억
  const onClick = (e) => {
    if (panel.contains(e.target) || !S.running || S.stop) return;
    // 파일 입력으로 이어진 클릭의 버튼을 기억해 두고 다음 장마다 다시 누른다
    if (e.isTrusted && !S.btn) S.cand = e.target.closest('button,[role="button"],label') || e.target;
    const label = e.target.closest && e.target.closest('label');
    const input = (e.target.tagName === 'INPUT' && e.target.type === 'file') ? e.target
      : (label && label.control && label.control.type === 'file') ? label.control : null;
    if (input && active()) { e.preventDefault(); e.stopPropagation(); feed(input); }
  };
  document.addEventListener('click', onClick, true);
  const restore = () => {
    HTMLInputElement.prototype.click = origClick;
    if (origPicker) window.showOpenFilePicker = origPicker;
    document.removeEventListener('click', onClick, true);
  };

  panel.querySelector('#vf-pick').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true; inp.accept = 'image/*';
    inp.onchange = () => {
      S.files = [...inp.files].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
      if (!S.files.length) return;
      S.i = 0; S.btn = null; S.running = true; S.stop = false;
      msg(`${S.files.length}장 준비됨. 본문 맨 끝에 커서를 두고, 툴바의 이미지 버튼을 한 번 누르세요.`);
    };
    origClick.call(inp);
  };
  panel.querySelector('#vf-stop').onclick = () => { S.stop = true; S.running = false; restore(); panel.remove(); delete window.__valleyFill; };
})();
