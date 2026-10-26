/* 가입 신청과 승인.
 * RFSJoin.open({ sb })  : 로그인 화면의 '회원가입'. 아이디·비밀번호·이름·닉네임·이메일·생년월일·블로그·기수 + 개인정보 수집·이용 동의.
 *                         Supabase 함수 member-signup이 '정지된' 계정을 만든다 → 승인 전에는 로그인이 안 된다.
 * RFSJoin.admin({ sb }) : 관리자(member-admin의 MEMBER_ADMINS)가 AGORA에서 여는 승인 화면. 승인하면 로그인 가능, 거절하면 즉시 삭제.
 * RFSJoin.isAdmin(sb)   : 관리자면 대기 건수, 아니면 null (화면에 '회원가입 승인' 메뉴를 보일지 정할 때). */
(function () {
  var CSS = '\
.jn{position:fixed;inset:0;z-index:3600;background:rgba(2,5,12,.78);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:56px 16px 40px;font-family:"Pretendard Variable",Pretendard,sans-serif;color:#F7F6F3;opacity:0;transition:opacity .35s ease}\
.jn.show{opacity:1}\
.jn-in{position:relative;width:min(520px,100%);background:#0B1424;border:1px solid rgba(170,205,255,.22);padding:36px 32px 30px;box-shadow:0 30px 80px rgba(0,0,0,.5)}\
@media (max-width:599px){.jn{padding:0}.jn-in{min-height:100%;border:0;padding:56px 20px 32px}}\
.jn-x{position:absolute;top:10px;right:10px;width:44px;height:44px;border:0;background:none;color:rgba(247,246,243,.7);font-size:22px;cursor:pointer}\
.jn small.k{display:block;font-size:11px;letter-spacing:.24em;color:rgba(247,246,243,.6)}\
.jn h2{margin:4px 0 0;font:400 26px "Noto Serif KR",serif;letter-spacing:-.02em;color:#F7F6F3}\
.jn .lead{margin:10px 0 0;font-size:13.5px;line-height:1.7;color:rgba(247,246,243,.72)}\
.jn form{margin-top:22px;display:grid;grid-template-columns:1fr 1fr;gap:12px 12px}\
.jn label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:rgba(247,246,243,.7)}\
.jn label.w{grid-column:1/-1}\
.jn label b{font-weight:500;color:#F7F6F3}.jn label i{font-style:normal;color:rgba(247,246,243,.5)}\
.jn input[type=text],.jn input[type=password],.jn input[type=email],.jn input[type=url],.jn input[inputmode]{height:44px;padding:0 12px;border:1px solid rgba(247,246,243,.28);background:rgba(247,246,243,.05);color:#F7F6F3;font:inherit;font-size:15px;border-radius:0;outline:none;width:100%;box-sizing:border-box}\
.jn input:focus{border-color:rgba(247,246,243,.7)}\
.jn .hint{grid-column:1/-1;margin:-4px 0 0;font-size:11.5px;color:rgba(247,246,243,.5)}\
.jn .agree{grid-column:1/-1;margin-top:8px;border-top:1px solid rgba(247,246,243,.16);padding-top:16px}\
.jn .agree h3{margin:0;font-size:13px;font-weight:600;color:#F7F6F3}\
.jn table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px;line-height:1.6}\
.jn th,.jn td{border:1px solid rgba(247,246,243,.16);padding:8px 10px;text-align:left;vertical-align:top}\
.jn th{width:76px;font-weight:500;color:rgba(247,246,243,.75);background:rgba(247,246,243,.04)}\
.jn td{color:rgba(247,246,243,.8)}\
.jn .agree p{margin:10px 0 0;font-size:12px;line-height:1.6;color:rgba(247,246,243,.6)}.jn .agree a{color:#F7F6F3}\
.jn .chk{flex-direction:row;align-items:center;gap:10px;margin-top:12px;font-size:13.5px;color:#F7F6F3;cursor:pointer}\
.jn .chk input{width:18px;height:18px;margin:0;accent-color:#F7F6F3}\
.jn .er{grid-column:1/-1;margin:0;font-size:12.5px;color:#E8A9A9}.jn .er:empty{display:none}\
.jn button.go{grid-column:1/-1;height:50px;margin-top:6px;border:0;background:#F7F6F3;color:#0F1B2E;font:inherit;font-size:12px;font-weight:600;letter-spacing:.16em;cursor:pointer}\
.jn button.go:disabled{opacity:.55;cursor:default}\
.jn-in.s{width:min(400px,100%);text-align:center}.jn-in.s h2{font:400 30px "Source Serif 4",serif;letter-spacing:.14em}\
.jn form.sm{display:flex;flex-direction:column;gap:8px;margin-top:22px;text-align:left}\
.jn form.sm input[type=text],.jn form.sm input[type=password],.jn form.sm input[type=email],.jn form.sm input[type=url]{height:46px;padding:0 14px;border:1px solid rgba(247,246,243,.26);background:rgba(247,246,243,.05);color:#F7F6F3;font:inherit;font-size:15px;border-radius:0;outline:none;width:100%;box-sizing:border-box}\
.jn form.sm input::placeholder{color:rgba(247,246,243,.45)}\
.jn form.sm input:focus{border-color:rgba(247,246,243,.7)}\
.jn .pol{margin-top:10px;height:120px;overflow-y:auto;padding:12px 14px;border:1px solid rgba(247,246,243,.18);font-size:12px;line-height:1.7;color:rgba(247,246,243,.65)}\
.jn .pol b{display:block;color:#F7F6F3;font-weight:600;margin-bottom:4px}.jn .pol p{margin:4px 0 0}.jn .pol a{color:#F7F6F3}\
.jn form.sm .chk{margin-top:6px}\
.jn form.sm .go{margin-top:8px}\
.jn .done{margin-top:22px;font-size:14px;line-height:1.8;color:rgba(247,246,243,.8)}\
.jn .row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;padding:16px 0;border-top:1px solid rgba(247,246,243,.14)}\
.jn .row:first-of-type{margin-top:18px}\
.jn .row .nm{font-size:15px}.jn .row .nm em{font-style:normal;color:rgba(247,246,243,.55);font-size:12.5px;margin-left:6px}\
.jn .row .meta{margin-top:4px;font-size:12px;line-height:1.7;color:rgba(247,246,243,.6);word-break:break-all}\
.jn .row .bt{display:flex;gap:6px}\
.jn .row .bt button{height:36px;padding:0 14px;border:1px solid rgba(247,246,243,.35);background:none;color:#F7F6F3;font:inherit;font-size:12.5px;cursor:pointer}\
.jn .row .bt button.ok{background:#F7F6F3;color:#0F1B2E;border-color:#F7F6F3}\
.jn .row .bt button:disabled{opacity:.5;cursor:default}\
.jn .empty{margin-top:20px;font-size:13.5px;color:rgba(247,246,243,.6)}\
';
  var MSG = {
    agree: '개인정보 수집·이용에 동의해 주세요.', id: '아이디는 영문 소문자로 시작하는 4~20자(영문·숫자·._-)로 정해 주세요. 쓸 수 없는 아이디일 수도 있어요.',
    password: '비밀번호는 8자 이상으로 정해 주세요.', name: '이름과 닉네임을 입력해 주세요.', email: '이메일 주소를 확인해 주세요.',
    birth: '생년월일을 8자리 숫자로 입력해 주세요 (예: 20030315).', age: '만 14세 미만은 가입할 수 없어요.', blog: '블로그 주소는 https://로 시작하게 입력해 주세요.',
    taken: '이미 쓰고 있는 아이디예요. 다른 아이디로 해 주세요.', limit: '같은 곳에서 신청이 너무 많아요. 내일 다시 시도해 주세요.', busy: '승인 대기 중인 신청이 많아요. 잠시 후 다시 시도해 주세요.'
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var cur = null;

  function shell(html, cls) {
    if (!document.getElementById('jn-css')) { var c = document.createElement('style'); c.id = 'jn-css'; c.textContent = CSS; document.head.appendChild(c); }
    close();
    var el = document.createElement('div');
    el.className = 'jn'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="jn-in' + (cls ? ' ' + cls : '') + '"><button class="jn-x" type="button" aria-label="닫기">×</button>' + html + '</div>';
    document.body.appendChild(el);
    el.querySelector('.jn-x').onclick = close;
    el.addEventListener('click', function (e) { if (e.target === el) close(); });
    cur = { el: el, key: function (e) { if (e.key === 'Escape') close(); } };
    document.addEventListener('keydown', cur.key);
    requestAnimationFrame(function () { el.classList.add('show'); });
    return el;
  }
  function close() {
    if (!cur) return;
    document.removeEventListener('keydown', cur.key);
    var el = cur.el; cur = null; el.classList.remove('show'); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 350);
  }
  // functions.invoke 오류에서 서버가 준 error 코드를 꺼낸다
  function call(sb, name, body) {
    return sb.functions.invoke(name, { body: body }).then(function (r) {
      if (!r.error) return r.data || { ok: true };
      var ctx = r.error.context;
      if (ctx && ctx.status === 404) return { error: 'not_deployed' };
      return ctx && ctx.json ? ctx.json().then(function (j) { return { error: (j && j.error) || 'fail' }; }, function () { return { error: 'fail' }; }) : { error: 'fail' };
    }, function () { return { error: 'fail' }; });
  }

  function open(o) {
    var inp = function (name, ph, type, extra) { return '<input name="' + name + '" type="' + (type || 'text') + '" placeholder="' + ph + '" aria-label="' + ph + '"' + (extra || '') + '>'; };
    var el = shell('<h2>JOIN</h2><form class="sm" novalidate>' +
      inp('login', '아이디', 'text', ' autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20"') +
      inp('pw', '비밀번호 (8자 이상)', 'password', ' autocomplete="new-password" maxlength="72"') +
      inp('pw2', '비밀번호 확인', 'password', ' autocomplete="new-password" maxlength="72"') +
      inp('realname', '이름', 'text', ' autocomplete="name" maxlength="30"') +
      inp('nickname', '닉네임', 'text', ' maxlength="30"') +
      inp('email', '이메일', 'email', ' autocomplete="email" maxlength="120"') +
      inp('birth', '생년월일 (숫자 8자리)', 'text', ' inputmode="numeric" maxlength="8"') +
      inp('cohort', '기수 (학회원만)', 'text', ' inputmode="numeric" maxlength="3"') +
      inp('blog', '블로그 (선택)', 'url', ' maxlength="200"') +
      '<div class="pol" tabindex="0"><b>개인정보 수집·이용 동의 (필수)</b>' +
      '<p>수집 항목: 아이디, 비밀번호, 이름, 닉네임, 이메일, 생년월일 (선택: 기수, 블로그)</p>' +
      '<p>목적: 학회원 확인과 가입 승인, 로그인, 학회원 전용 서비스, 운영 공지</p>' +
      '<p>보유 기간: 탈퇴할 때까지. 승인하지 않은 신청은 즉시 파기</p>' +
      '<p>정보는 Supabase(미국) 클라우드에 저장됩니다. 동의하지 않을 수 있으나 이 경우 가입할 수 없습니다. 만 14세 미만은 가입할 수 없습니다.</p>' +
      '<p><a href="/privacy/" target="_blank" rel="noopener">개인정보처리방침 전문</a></p></div>' +
      '<label class="chk"><input type="checkbox" name="agree">개인정보 수집·이용에 동의합니다</label>' +
      '<p class="er" aria-live="polite"></p><button class="go" type="submit">JOIN</button></form>', 's');
    var f = el.querySelector('form'), er = el.querySelector('.er'), go = el.querySelector('.go');
    setTimeout(function () { try { f.login.focus({ preventScroll: true }); } catch (e) {} }, 200);
    f.birth.oninput = function () { f.birth.value = f.birth.value.replace(/\D/g, '').slice(0, 8); };
    f.cohort.oninput = function () { f.cohort.value = f.cohort.value.replace(/\D/g, '').slice(0, 3); };
    f.onsubmit = function (e) {
      e.preventDefault();
      if (go.disabled) return;
      var v = function (n) { return f[n].value.trim(); };
      var fail = function (m) { er.textContent = m; };
      if (!/^[a-z][a-z0-9._-]{3,19}$/.test(v('login').toLowerCase())) return fail(MSG.id);
      if (f.pw.value.length < 8) return fail(MSG.password);
      if (f.pw.value !== f.pw2.value) return fail('비밀번호 확인이 맞지 않아요.');
      if (!v('realname') || !v('nickname')) return fail(MSG.name);
      if (!/^\d{8}$/.test(v('birth'))) return fail(MSG.birth);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) return fail(MSG.email);
      if (v('blog') && !/^https?:\/\/\S+$/i.test(v('blog'))) return fail(MSG.blog);
      if (!f.agree.checked) return fail(MSG.agree);
      er.textContent = ''; go.disabled = true; go.textContent = '보내는 중';
      call(o.sb, 'member-signup', { id: v('login').toLowerCase(), password: f.pw.value, name: v('realname'), nickname: v('nickname'), email: v('email'), birth: v('birth'), cohort: v('cohort'), blog: v('blog'), agree: true }).then(function (r) {
        if (r && r.ok) {
          el.querySelector('.jn-in').innerHTML = '<button class="jn-x" type="button" aria-label="닫기">×</button><h2>신청했어요</h2>' +
            '<p class="done">운영진이 확인하고 승인하면 <b>' + esc(v('login').toLowerCase()) + '</b>(으)로 로그인할 수 있어요.<br>승인 전에 로그인하면 \'승인 대기 중\'으로 나와요.</p>' +
            '<button class="go" type="button" style="width:100%;margin-top:22px">확인</button>';
          el.querySelector('.jn-x').onclick = close; el.querySelector('.go').onclick = close;
          return;
        }
        go.disabled = false; go.textContent = '신청하기';
        fail(MSG[r && r.error] || (r && r.error === 'not_deployed' ? '회원가입을 준비하고 있어요. contact@caurfs.kr로 문의해 주세요.' : '신청을 보내지 못했어요. 잠시 후 다시 시도해 주세요.'));
      });
    };
  }

  function isAdmin(sb) {
    return call(sb, 'member-admin', { action: 'list' }).then(function (r) { return r && r.ok ? (r.list || []).length : null; });
  }

  function admin(o) {
    var el = shell('<small class="k">ADMIN</small><h2>회원가입 승인</h2><p class="lead">승인하면 바로 로그인할 수 있어요. 거절하면 신청 정보가 바로 지워져요.</p><div class="ls"><p class="empty">불러오는 중…</p></div>');
    var ls = el.querySelector('.ls');
    var load = function () {
      call(o.sb, 'member-admin', { action: 'list' }).then(function (r) {
        if (!r || !r.ok) { ls.innerHTML = '<p class="empty">목록을 불러오지 못했어요.</p>'; return; }
        if (!r.list.length) { ls.innerHTML = '<p class="empty">대기 중인 신청이 없어요.</p>'; if (o.onChange) o.onChange(0); return; }
        if (o.onChange) o.onChange(r.list.length);
        ls.innerHTML = r.list.map(function (a) {
          var b = String(a.birth || ''), when = String(a.applied_at || '').slice(0, 16).replace('T', ' ');
          return '<div class="row" data-uid="' + esc(a.uid) + '"><div><div class="nm">' + esc(a.name) + '<em>' + (a.cohort ? esc(a.cohort) + '기' : '외부') + ' · ' + esc(a.nickname) + '</em></div>' +
            '<div class="meta">아이디 ' + esc(a.id) + ' · ' + esc(b.slice(0, 4) + '.' + b.slice(4, 6) + '.' + b.slice(6, 8)) + '<br>' + esc(a.email) + (a.blog ? '<br>' + esc(a.blog) : '') + '<br>신청 ' + esc(when) + ' (UTC)</div></div>' +
            '<div class="bt"><button class="no" type="button">거절</button><button class="ok" type="button">승인</button></div></div>';
        }).join('');
        ls.querySelectorAll('.row').forEach(function (row) {
          var uid = row.getAttribute('data-uid'), bs = row.querySelectorAll('button');
          var act = function (action) {
            if (action === 'reject' && !window.confirm('거절하면 이 신청 정보가 바로 지워져요. 거절할까요?')) return;
            bs.forEach(function (x) { x.disabled = true; });
            call(o.sb, 'member-admin', { action: action, uid: uid }).then(function (r2) {
              if (r2 && r2.ok) load(); else { bs.forEach(function (x) { x.disabled = false; }); window.alert('처리하지 못했어요. 다시 시도해 주세요.'); }
            });
          };
          row.querySelector('.ok').onclick = function () { act('approve'); };
          row.querySelector('.no').onclick = function () { act('reject'); };
        });
      });
    };
    load();
  }

  window.RFSJoin = { open: open, admin: admin, isAdmin: isAdmin, close: close };
})();
