/* 실습 시트 엔진: window.LAB(labs/mN.js)을 읽어 엑셀처럼 동작 */
(function(){
'use strict';

var L=window.LAB||{};
var COLS=L.cols, NC=COLS.length, SPEC=L.spec, NR=SPEC.length, TOTAL=L.total||[], FM=NC+1, KB=NC+2, KF=NC+3;
var cell={};
SPEC.forEach(function(s){
  var r=s[0];
  cell['A'+r]={kind:r===1?'hd':s[KB]==='sec'?'sec':'label',fmt:'txt',raw:s[1]};
  for(var i=1;i<NC;i++){
    var c=COLS[i], v=s[i+1], k=i===1?s[KB]:s[KF], a=c+r;
    if(k==='target'){
      var base=s[i+1]!=null?s[i+1]:shift(s[3],i-2,0);
      cell[a]={kind:'target',fmt:s[FM],raw:'',ans:base};
    } else cell[a]={kind:k,fmt:s[FM],raw:v==null?'':v};
  }
});
var GROUPS=L.groups||{}, IND={};
Object.keys(GROUPS).forEach(function(k){var g=GROUPS[k];for(var r=+k;r<=g.to;r++){IND[r]=1;if(L.strip)cell['A'+r].raw=String(cell['A'+r].raw).replace(L.strip,'')}});
var STEPS=L.steps, NOTE=L.notes||{};
/* ---------- 머리말 ---------- */
document.title=L.title||document.title;
(function(){var q=function(id){return document.getElementById(id)};
  q('eb').textContent=L.eyebrow||''; q('ttl').textContent=L.title||''; q('intro').textContent=L.intro||'';
  if(L.back)q('back').href=L.back; else q('back').hidden=true;
  if(L.legend){q('lgi').textContent=L.legend[0];q('lgf').textContent=L.legend[1]}
  if(L.colA)document.documentElement.style.setProperty('--colA',L.colA+'px');
})();
/* ---------- 수식 ---------- */
function shift(f,dc,dr){
  if(typeof f!=='string'||f[0]!=='=')return f;
  return f.replace(/(?<![A-Z])(\$?)([A-Z])(\$?)(\d+)/g,function(m,a,c,b,r){
    var ci=a?c.charCodeAt(0):c.charCodeAt(0)+dc, ri=b?+r:+r+dr;
    if(ci<65||ri<1)return '#REF';
    return a+String.fromCharCode(ci)+b+ri;
  });
}
function E(code){this.code=code}
function tok(s){
  var re=/\s*(?:(\d+(?:\.\d+)?%?)|(\$?[A-Z]\$?\d+)|([A-Z]+)(?=\()|([+\-*/^():,]))/y, out=[], m;
  re.lastIndex=0;
  while(re.lastIndex<s.length){
    if(/^\s*$/.test(s.slice(re.lastIndex)))break;
    m=re.exec(s); if(!m)throw new E('#수식?');
    if(m[1])out.push({t:'n',v:m[1].slice(-1)==='%'?parseFloat(m[1])/100:parseFloat(m[1])});
    else if(m[2])out.push({t:'r',v:m[2].replace(/\$/g,'')});
    else if(m[3])out.push({t:'f',v:m[3]});
    else out.push({t:'o',v:m[4]});
  }
  return out;
}
function evalF(src,get){
  var T=tok(src.toUpperCase()),i=0;
  function pk(v){return T[i]&&T[i].t==='o'&&T[i].v===v}
  function ex(){var v=tm();while(pk('+')||pk('-')){var o=T[i++].v,w=tm();v=o==='+'?v+w:v-w}return v}
  function tm(){var v=pw();while(pk('*')||pk('/')){var o=T[i++].v,w=pw();if(o==='/'&&w===0)throw new E('#DIV/0!');v=o==='*'?v*w:v/w}return v}
  function pw(){var v=un();while(pk('^')){i++;v=Math.pow(v,un())}return v}
  function un(){if(pk('-')){i++;return -un()}if(pk('+')){i++;return un()}return pr()}
  function rng(a,b){var c1=a.charCodeAt(0),c2=b.charCodeAt(0),r1=+a.slice(1),r2=+b.slice(1),o=[];
    for(var c=Math.min(c1,c2);c<=Math.max(c1,c2);c++)for(var r=Math.min(r1,r2);r<=Math.max(r1,r2);r++)o.push(get(String.fromCharCode(c)+r,true));return o}
  function pr(){
    var k=T[i++]; if(!k)throw new E('#수식?');
    if(k.t==='n')return k.v;
    if(k.t==='r')return get(k.v);
    if(k.t==='f'){
      if(!pk('('))throw new E('#수식?'); i++;
      var vals=[];
      while(!pk(')')){
        if(T[i]&&T[i].t==='r'&&T[i+1]&&T[i+1].t==='o'&&T[i+1].v===':'){var a=T[i].v;i+=2;var b=T[i++];if(!b||b.t!=='r')throw new E('#수식?');vals=vals.concat(rng(a,b.v))}
        else vals.push(ex());
        if(pk(','))i++; else if(!pk(')'))throw new E('#수식?');
      }
      i++;
      vals=vals.filter(function(x){return x!==null});
      if(k.v==='SUM')return vals.reduce(function(s,x){return s+x},0);
      if(k.v==='AVERAGE')return vals.length?vals.reduce(function(s,x){return s+x},0)/vals.length:0;
      if(k.v==='MIN')return Math.min.apply(null,vals);
      if(k.v==='MAX')return Math.max.apply(null,vals);
      if(k.v==='MEDIAN'){var q=vals.slice().sort(function(a,b){return a-b}),n=q.length;return n?(n%2?q[(n-1)/2]:(q[n/2-1]+q[n/2])/2):0}
      if(k.v==='ROUND'){var f=Math.pow(10,vals[1]||0);return Math.round(vals[0]*f)/f}
      if(k.v==='ABS')return Math.abs(vals[0]);
      throw new E('#NAME?');
    }
    if(k.t==='o'&&k.v==='('){var v=ex();if(!pk(')'))throw new E('#수식?');i++;return v}
    throw new E('#수식?');
  }
  var v=ex(); if(i<T.length)throw new E('#수식?'); return v;
}
function compute(rawOf){
  var memo={},busy={};
  function get(a,inRange){
    if(!/^[A-Z]\d+$/.test(a)||ci(a)>=NC||+a.slice(1)<1||+a.slice(1)>NR)throw new E('#REF!');
    if(a in memo){if(memo[a] instanceof E)throw memo[a];return memo[a]}
    if(busy[a])throw new E('#순환');
    busy[a]=1;
    var raw=rawOf(a),v;
    try{
      if(raw===''||raw==null)v=inRange?null:0;
      else if(typeof raw==='number')v=raw;
      else if(raw[0]==='=')v=evalF(raw.slice(1),get);
      else if(inRange)v=null;
      else throw new E('#VALUE!');
      if(typeof v==='number'&&!isFinite(v))throw new E('#NUM!');
    }catch(e){if(!(e instanceof E))e=new E('#수식?');memo[a]=e;busy[a]=0;throw e}
    busy[a]=0; if(v!==null)memo[a]=v; return v;
  }
  var out={};
  Object.keys(cell).forEach(function(a){if(a[0]==='A'||cell[a].kind==='hd')return;try{out[a]=get(a)}catch(e){out[a]=e}});
  return out;
}

/* ---------- 상태 ---------- */
var st={sel:L.start,end:L.start,step:0,editing:false,mode:'enter',hint:0,orig:null,pt:null,showF:false,clip:null};
var KEY='rfs-lab-'+L.id+'-v1';
function save(){try{var d={};Object.keys(cell).forEach(function(a){var c=cell[a];if(c.kind==='target'||c.kind==='input')d[a]=c.raw});localStorage.setItem(KEY,JSON.stringify({d:d,step:st.step}))}catch(e){}}
function load(){try{var j=JSON.parse(localStorage.getItem(KEY)||'null');if(!j)return;Object.keys(j.d).forEach(function(a){if(cell[a])cell[a].raw=j.d[a]});st.step=Math.min(j.step||0,STEPS.length-1)}catch(e){}}
var INIT={};Object.keys(cell).forEach(function(a){INIT[a]=cell[a].raw});
load();

var V={},ANS={};
function recalc(){
  V=compute(function(a){return cell[a].raw});
  ANS=compute(function(a){var c=cell[a];return c.kind==='target'?c.ans:c.raw});
}
function near(x,y){return typeof x==='number'&&typeof y==='number'&&Math.abs(x-y)<=1e-6*Math.max(1,Math.abs(y))}
function status(a){
  var c=cell[a]; if(c.kind!=='target'||c.raw==='')return '';
  var v=V[a]; if(v instanceof E)return 'bad';
  if(!near(v,ANS[a]))return 'bad';
  if(typeof c.raw==='number')return 'hard';
  return 'ok';
}
function stepDone(k){
  var s=STEPS[k];
  if(s.chk)return s.cells.every(function(a){return near(V[a],s.chk.value)})&&STEPS.slice(0,k).every(function(_,j){return stepDone(j)});
  return s.cells.every(function(a){return status(a)==='ok'});
}

/* ---------- 표시 ---------- */
var nf1=new Intl.NumberFormat('ko-KR',{minimumFractionDigits:1,maximumFractionDigits:1}),nf0=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0});
function show(a){
  var c=cell[a];
  if(c.kind==='hd'||a[0]==='A')return c.raw;
  if(c.kind==='sec')return '';
  if(c.raw===''&&c.kind!=='given')return '';
  var v=V[a];
  if(v instanceof E)return v.code;
  if(typeof v!=='number')return '';
  if(c.fmt==='pct')return nf1.format(v*100)+'%';
  if(c.fmt==='pct2')return (v*100).toFixed(2)+'%';
  if(c.fmt==='d1')return nf1.format(v)+'일';
  if(c.fmt==='x1')return nf1.format(v)+'배';
  if(c.fmt==='n2')return v.toLocaleString('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:2});
  if(c.fmt==='won')return nf0.format(v)+'원';
  if(c.fmt==='f3')return v.toFixed(3);
  if(c.fmt==='int')return String(v);
  if(c.fmt==='n0')return nf0.format(v);
  if(c.fmt==='d0')return nf1.format(v).replace(/\.0$/,'')+'일';
  return nf1.format(v);
}
var T=document.getElementById('t'),TD={};
(function build(){
  var h='<thead><tr><th class="rn"></th>'+COLS.map(function(c){return '<th>'+c+'</th>'}).join('')+'</tr></thead><tbody>';
  for(var r=1;r<=NR;r++){
    if(GROUPS[r])h+='<tr class="grp"><th class="rn"></th><td class="A gA">'+GROUPS[r].t+'</td><td colspan="'+(NC-1)+'" class="gV"></td></tr>';
    h+='<tr class="'+(r===1?'hd':'')+(TOTAL.indexOf(r)>=0?' total':'')+(cell['A'+r].kind==='sec'?' sec':'')+'"><th class="rn">'+r+'</th>';
    COLS.forEach(function(c){var a=c+r;h+='<td data-a="'+a+'" class="'+(c==='A'?'A':'v')+'"></td>'});
    h+='</tr>';
  }
  T.innerHTML=h+'</tbody>';
  T.querySelectorAll('td[data-a]').forEach(function(td){TD[td.dataset.a]=td});
})();
var fx=document.getElementById('fx'),nm=document.getElementById('nm');
function rawText(a){var c=cell[a];if(c.raw===''||c.raw==null)return '';if(typeof c.raw==='number'){return (c.fmt==='pct'||c.fmt==='pct2')?+(c.raw*100).toFixed(6)+'%':String(+c.raw.toFixed(6))}return c.raw}
function editable(a){var k=cell[a].kind;return k==='target'||k==='input'}
function refsOf(s){var o=[];if(typeof s==='string'&&s[0]==='=')(s.toUpperCase().match(/(?<![A-Z])\$?[A-Z]\$?\d+/g)||[]).forEach(function(x){o.push(x.replace(/\$/g,''))});return o}
var rng=[];
function paint(){
  var focus=STEPS[st.step].cells, txt=st.editing?fx.value:rawText(st.sel), refs=refsOf(txt), R=selRect(), multi=R.c1!==R.c2||R.r1!==R.r2;
  var PR=st.pt?rectOf(st.pt.a,st.pt.c):null, CR=st.clip?st.clip.R:null;
  function inR(a,X){return X&&ci(a)>=X.c1&&ci(a)<=X.c2&&ri(a)>=X.r1&&ri(a)<=X.r2}
  Object.keys(TD).forEach(function(a){
    var td=TD[a],c=cell[a],cls=[a[0]==='A'?'A':'v'];
    if(a[0]==='A'&&IND[ri(a)])cls.push('ind');
    if(a[0]!=='A'){cls.push(c.kind);var s=status(a);if(s==='ok')cls.push('ok');else if(s==='bad'||s==='hard')cls.push('bad');if(V[a] instanceof E&&c.raw!=='')cls.push('err');}
    if(focus.indexOf(a)>=0&&c.kind==='target')cls.push('focus');
    if(a===st.sel)cls.push('sel');
    if(st.editing&&a===st.sel)cls.push('ed');
    if(multi&&inR(a,R)&&a!==st.sel)cls.push('rng');
    if(refs.indexOf(a)>=0||inR(a,PR))cls.push('ref');
    if(rng.indexOf(a)>=0)cls.push('rng');
    if(inR(a,CR))cls.push('cp');
    td.className=cls.join(' ');
    td.textContent=(st.editing&&a===st.sel)?fx.value:(st.showF&&typeof c.raw==='string'&&c.raw[0]==='='?c.raw:show(a));
    if(!st.editing&&a===ad(R.c2,R.r2)&&a[0]!=='A'){var hd=document.createElement('span');hd.className='h';hd.setAttribute('aria-hidden','true');td.appendChild(hd)}
  });
  nm.textContent=multi?ad(R.c1,R.r1)+':'+ad(R.c2,R.r2):st.sel;
  if(!st.editing){fx.value=rawText(st.sel);fx.readOnly=!editable(st.sel)}
  document.getElementById('fill').disabled=!canFill(st.sel);
  document.getElementById('mode').textContent=st.editing?(pointable()?'참조':st.mode==='edit'?'편집':'입력'):(st.showF?'수식 보기':'');
  renderTask(); renderNote();
}
function canFill(a){var c=cell[a];return c.kind==='target'&&typeof c.raw==='string'&&c.raw[0]==='='&&ci(a)<NC-1&&cell[String.fromCharCode(a.charCodeAt(0)+1)+a.slice(1)].kind==='target'}


/* ---------- 계정 노트 ---------- */
var noteEl=document.getElementById('note'),lastNote=0;
function renderNote(){
  var r=ri(st.end||st.sel); if(r===lastNote)return; lastNote=r;
  var n=NOTE[r];
  if(!n){noteEl.innerHTML='<p class="nh">A열 계정 이름을 누르면 설명이 나와요.</p>';return}
  var L=[['뜻','d'],['어디서 찾나','w'],['모델에서','m']];
  noteEl.innerHTML='<div class="eyebrow">계정 노트 · '+r+'행</div><h3>'+n.t+'</h3>'+L.filter(function(x){return n[x[1]]}).map(function(x){return '<div class="nr'+(x[1]==='x'?' warn':'')+'"><b>'+x[0]+'</b><p>'+n[x[1]]+'</p></div>'}).join('');
}

/* ---------- 과제 카드 ---------- */
var taskEl=document.getElementById('task');
function fmtN(v){return typeof v==='number'?nf0.format(v):'-'}
function diag(){
  var s=STEPS[st.step];
  if(s.chk){
    var bad=Object.keys(cell).filter(function(a){var x=status(a);return cell[a].kind==='target'&&(x==='bad'||x==='hard')})[0];
    if(bad)return {k:'bad',m:bad+' 칸이 가정을 바꾸자 틀린 값이 됐어요. 그 칸 수식이 바뀐 가정 칸을 제대로 가리키는지 보세요.'};
    return null;
  }
  var pick=s.cells.indexOf(st.sel)>=0?st.sel:s.cells.filter(function(a){var x=status(a);return x==='bad'||x==='hard'})[0];
  if(!pick)return null;
  var x=status(pick),c=cell[pick];
  if(x==='hard')return {k:'bad',m:pick+' 값은 맞는데 숫자로 직접 쳤어요. 수식으로 넣어야 가정을 바꿀 때 따라와요.'};
  if(x!=='bad')return null;
  if(V[pick] instanceof E)return {k:'bad',m:pick+'에 '+V[pick].code+' 오류가 났어요. 괄호나 주소를 확인해 보세요.'};
  var R=String(c.raw).toUpperCase().replace(/\s/g,''), row=ri(pick), A=ANS[pick], v=V[pick];
  var hit=(L.diag||[]).filter(function(d){
    if(d.rows&&d.rows.indexOf(row)<0)return false;
    if(d.t==='mult')return typeof v==='number'&&near(v,A*d.k);
    if(d.t==='neg')return near(v,-A);
    if(d.t==='re')return new RegExp(d.re).test(R);
    if(d.t==='nore')return !new RegExp(d.re).test(R);
    return false;
  })[0];
  if(hit)return {k:'bad',m:hit.m};
  return {k:'bad',m:pick+' 값이 달라요. 힌트를 하나씩 열어 보세요.'};
}
function renderTask(){
  var s=STEPS[st.step],done=stepDone(st.step),h='';
  var nd=STEPS.filter(function(_,k){return stepDone(k)}).length;
  h+='<div class="top"><span class="eyebrow">'+(st.step+1)+' / '+STEPS.length+'</span><span class="bar"><i style="width:'+(nd/STEPS.length*100)+'%"></i></span></div><h2>'+s.t+'</h2>';
  h+='<div class="body">'+s.b.map(function(p){return '<p>'+p+'</p>'}).join('')+'</div>';
  if(!s.chk)h+='<div class="cellchips">'+s.cells.map(function(a){var x=status(a);return '<button type="button" class="chip '+(x==='ok'?'ok':x?'bad':'')+'" data-go="'+a+'">'+a+(x==='ok'?' ✓':'')+'</button>'}).join('')+'</div>';
  var fb=done?{k:'ok',m:s.d}:diag();
  if(s.chk&&done&&st.orig&&s.msg)fb={k:'ok',m:s.msg(V,st.orig,fmtN)};
  h+='<div class="fb '+(fb?fb.k:'')+'">'+(fb?fb.m:'')+'</div>';
  if(st.hint>0&&!done)h+='<div class="hint">'+s.h.slice(0,st.hint).map(function(x){return '<div>'+x+'</div>'}).join('')+'</div>';
  h+='<div class="btns">';
  if(st.step>0)h+='<button class="b" type="button" data-act="prev">이전</button>';
  if(!done&&st.hint<s.h.length)h+='<button class="b" type="button" data-act="hint">힌트'+(s.h.length>1?' '+(st.hint+1)+'/'+s.h.length:'')+'</button>';
  if(st.step<STEPS.length-1)h+='<button class="b pri" type="button" data-act="next" '+(done?'':'disabled')+'>다음</button>';
  else if(done)h+='<button class="b pri" type="button" data-act="again">다시 해보기</button>';
  h+='</div>';
  if(st.step===STEPS.length-1&&done){
    try{localStorage.setItem('rfs-lab-done-'+L.id,'1')}catch(e){}
    if(L.summary)h+='<div class="done">'+L.summary(V,fmtN)+'</div>';
    if(L.next)h+='<a class="b pri nextm" href="'+L.next.href+'">'+L.next.label+' →</a>';
  }
  taskEl.innerHTML=h;
}
taskEl.addEventListener('click',function(e){
  var b=e.target.closest('[data-act],[data-go]'); if(!b)return;
  if(b.dataset.go){select(b.dataset.go);return}
  var a=b.dataset.act;
  if(a==='hint')st.hint++;
  if(a==='next'&&st.step<STEPS.length-1){st.step++;st.hint=0;select(STEPS[st.step].cells[0]);if(STEPS[st.step].chk){st.orig={};(STEPS[st.step].keep||[]).forEach(function(x){st.orig[x]=V[x]})};save()}
  if(a==='prev'){st.step--;st.hint=0;select(STEPS[st.step].cells[0])}
  if(a==='again'){reset();return}
  paint();
});

/* ---------- 입력 ---------- */
var toastT;
function toast(m){var t=document.getElementById('toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('on')},2200)}
function ci(a){return a.charCodeAt(0)-65} function ri(a){return +a.slice(1)}
function ad(c,r){return String.fromCharCode(65+c)+r}
function clampC(c){return Math.max(0,Math.min(NC-1,c))} function clampR(r){return Math.max(1,Math.min(NR,r))}
function rectOf(a,b){return {c1:Math.min(ci(a),ci(b)),c2:Math.max(ci(a),ci(b)),r1:Math.min(ri(a),ri(b)),r2:Math.max(ri(a),ri(b))}}
function cellsOf(R){var o=[];for(var r=R.r1;r<=R.r2;r++)for(var c=R.c1;c<=R.c2;c++)o.push(ad(c,r));return o}
function selRect(){return rectOf(st.sel,st.end||st.sel)}
function filled(a){var c=cell[a];return c.raw!==''&&c.raw!=null}

// 되돌리기
var undoS=[],redoS=[];
function snap(){var d={};Object.keys(cell).forEach(function(a){if(editable(a))d[a]=cell[a].raw});return d}
function restore(d){Object.keys(d).forEach(function(a){cell[a].raw=d[a]});recalc();save()}
function hist(){undoS.push(snap());if(undoS.length>100)undoS.shift();redoS=[]}

function select(a,extend){
  if(st.editing)commit();
  if(extend)st.end=a; else{st.sel=a;st.end=a}
  paint(); TD[st.end].scrollIntoView({block:'nearest',inline:'nearest'});
}
function startEdit(init,mode){
  if(!editable(st.sel)){var k=cell[st.sel].kind;toast(k==='given'?'예시 칸이라 고칠 수 없어요. 수식줄에서 식만 볼 수 있어요.':'고정된 칸이에요.');return false}
  st.editing=true; st.mode=mode||'enter'; st.pt=null; fx.readOnly=false;
  if(init!=null)fx.value=init;
  fx.focus(); var n=fx.value.length; try{fx.setSelectionRange(n,n)}catch(e){}
  paint(); return true;
}
function parseIn(a,s){
  s=s.trim(); if(s==='')return '';
  if(s[0]==='='){var f=s.slice(1).trim().toUpperCase(),o=(f.match(/\(/g)||[]).length-(f.match(/\)/g)||[]).length;while(o-->0)f+=')';return '='+f}
  var pct=/%$/.test(s), n=parseFloat(s.replace(/[,%\s]/g,''));
  if(isNaN(n)){toast('숫자나 = 로 시작하는 수식을 넣어 주세요.');return null}
  if(pct)return n/100;
  if((cell[a].fmt==='pct'||cell[a].fmt==='pct2')&&Math.abs(n)>=1){toast(s+'을 '+s+'%로 읽었어요.');return n/100}
  return n;
}
function commit(all){
  if(!st.editing)return;
  var v=parseIn(st.sel,fx.value);
  st.editing=false; st.pt=null;
  if(v===null){paint();return}
  hist();
  cell[st.sel].raw=v;
  if(all){cellsOf(selRect()).forEach(function(a){if(a!==st.sel&&editable(a))cell[a].raw=shift(v,ci(a)-ci(st.sel),ri(a)-ri(st.sel))})}
  recalc(); save();
}
function cancel(){st.editing=false;st.pt=null;fx.blur();paint()}
function move(dc,dr,extend){
  var from=extend?(st.end||st.sel):st.sel;
  select(ad(clampC(ci(from)+dc),clampR(ri(from)+dr)),extend);
}
function edge(from,dc,dr){
  var c=ci(from),r=ri(from),nx=function(){return ad(c+dc,r+dr)},ok=function(){return c+dc>=0&&c+dc<=NC-1&&r+dr>=1&&r+dr<=NR},has=function(a){return a[0]==='A'?!!cell[a].raw:filled(a)||cell[a].kind==='hd'};
  if(!ok())return from;
  if(has(ad(c,r))&&has(nx())){while(ok()&&has(nx())){c+=dc;r+=dr}}
  else{c+=dc;r+=dr;while(ok()&&!has(ad(c,r))){c+=dc;r+=dr}}
  return ad(c,r);
}
// 참조 모드: 수식 중 연산자 뒤에서 방향키·클릭으로 칸 주소 넣기
function pointable(){
  if(!st.editing||fx.value[0]!=='=')return false;
  var p=fx.selectionStart==null?fx.value.length:fx.selectionStart;
  if(st.pt&&p===st.pt.e)return true;
  return /[=+\-*/^(,:]\s*$/.test(fx.value.slice(0,p));
}
function putRef(a,extend){
  var p=fx.selectionStart==null?fx.value.length:fx.selectionStart;
  if(!(st.pt&&p===st.pt.e))st.pt={s:p,e:p,a:a,c:a};
  if(extend)st.pt.c=a; else{st.pt.a=a;st.pt.c=a}
  var R=rectOf(st.pt.a,st.pt.c),txt=st.pt.a===st.pt.c?a:ad(R.c1,R.r1)+':'+ad(R.c2,R.r2);
  fx.value=fx.value.slice(0,st.pt.s)+txt+fx.value.slice(st.pt.e);
  st.pt.e=st.pt.s+txt.length;
  fx.focus(); try{fx.setSelectionRange(st.pt.e,st.pt.e)}catch(e){}
  paint();
}
function f4(){
  var v=fx.value,p=fx.selectionStart,re=/(?<![A-Z])(\$?)([A-Za-z])(\$?)(\d+)/g,m;
  while((m=re.exec(v))){
    if(p>=m.index&&p<=m.index+m[0].length){
      var c=m[2].toUpperCase(),r=m[4],k=(m[1]?2:0)+(m[3]?1:0);
      // A1 → $A$1 → A$1 → $A1 → A1
      var nxt=({0:'$'+c+'$'+r,3:c+'$'+r,1:'$'+c+r,2:c+r})[k];
      fx.value=v.slice(0,m.index)+nxt+v.slice(m.index+m[0].length);
      var np=m.index+nxt.length; if(st.pt&&st.pt.e===m.index+m[0].length)st.pt.e=np;
      try{fx.setSelectionRange(np,np)}catch(e){}
      paint(); return;
    }
  }
}
function fillRange(src,targets,quiet){
  var n=0;
  targets.forEach(function(a){
    if(a===src||!editable(a))return;
    if(!n)hist();
    cell[a].raw=shift(cell[src].raw,ci(a)-ci(src),ri(a)-ri(src)); n++;
  });
  if(n){recalc();save();if(!quiet)toast(n+'칸 채웠어요.')}
  return n;
}
function fillDir(dir){ // 'R' 오른쪽, 'D' 아래
  var R=selRect(),n=0;
  if(R.c1===R.c2&&R.r1===R.r2){
    var s=dir==='R'?ad(R.c1-1,R.r1):ad(R.c1,R.r1-1);
    if(R.c1-(dir==='R'?1:0)<0||R.r1-(dir==='D'?1:0)<1)return;
    n=fillRange(s,[st.sel],true);
  } else if(dir==='R'){for(var r=R.r1;r<=R.r2;r++){var t=[];for(var c=R.c1+1;c<=R.c2;c++)t.push(ad(c,r));n+=fillRange(ad(R.c1,r),t,true)}}
  else{for(var c2=R.c1;c2<=R.c2;c2++){var t2=[];for(var r2=R.r1+1;r2<=R.r2;r2++)t2.push(ad(c2,r2));n+=fillRange(ad(c2,R.r1),t2,true)}}
  if(n)toast(n+'칸 채웠어요.'); paint();
}
function copySel(){
  var R=selRect(),rows=[];
  for(var r=R.r1;r<=R.r2;r++){var row=[];for(var c=R.c1;c<=R.c2;c++)row.push(cell[ad(c,r)].raw);rows.push(row)}
  st.clip={R:R,rows:rows};
  try{navigator.clipboard&&navigator.clipboard.writeText(rows.map(function(rw,i){return rw.map(function(_,j){return show(ad(R.c1+j,R.r1+i))}).join('\t')}).join('\n')).catch(function(){})}catch(e){}
  toast('복사했어요. 붙여넣을 칸에서 Ctrl+V.'); paint();
}
function pasteSel(){
  if(!st.clip)return;
  var C=st.clip,R=selRect(),n=0,skip=0,dst=[];
  var single=C.rows.length===1&&C.rows[0].length===1;
  if(single)cellsOf(R).forEach(function(a){dst.push([a,0,0])});
  else C.rows.forEach(function(rw,i){rw.forEach(function(_,j){var c=R.c1+j,r=R.r1+i;if(c<=NC-1&&r<=NR)dst.push([ad(c,r),i,j])})});
  hist();
  dst.forEach(function(d){
    var a=d[0],raw=C.rows[d[1]][d[2]];
    if(!editable(a)){skip++;return}
    cell[a].raw=shift(raw,ci(a)-(C.R.c1+d[2]),ri(a)-(C.R.r1+d[1])); n++;
  });
  if(!n){undoS.pop();toast('붙여넣을 수 있는 칸이 없어요.');return}
  recalc(); save(); toast(n+'칸 붙여넣었어요.'+(skip?' 고정 칸 '+skip+'개는 건너뛰었어요.':'')); paint();
}
function clearSel(){
  var t=cellsOf(selRect()).filter(function(a){return editable(a)&&filled(a)});
  if(!t.length)return; hist(); t.forEach(function(a){cell[a].raw=''}); recalc(); save(); paint();
}
function undo(){if(!undoS.length){toast('되돌릴 게 없어요.');return}redoS.push(snap());restore(undoS.pop());paint()}
function redo(){if(!redoS.length)return;undoS.push(snap());restore(redoS.pop());paint()}

document.getElementById('fill').addEventListener('click',function(){
  var a=st.sel,r=ri(a),out=[];
  for(var c=ci(a)+1;c<=NC-1;c++){var b=ad(c,r);if(cell[b].kind!=='target')break;out.push(b)}
  fillRange(a,out); paint();
});
function reset(){
  hist();
  Object.keys(INIT).forEach(function(a){cell[a].raw=INIT[a]});
  st={sel:L.start,end:L.start,step:0,editing:false,mode:'enter',hint:0,orig:null,pt:null,showF:false,clip:null};
  try{localStorage.removeItem(KEY)}catch(e){}
  recalc(); paint();
}
document.getElementById('reset').addEventListener('click',reset);

// 마우스: 칸 고르기 · 끌어서 범위 · 채우기 손잡이
var drag=null,selecting=false;
T.addEventListener('pointerdown',function(e){
  if(e.button!==0)return;
  var h=e.target.closest('.h');
  if(h){e.preventDefault();var R0=selRect();if(R0.c1!==R0.c2||R0.r1!==R0.r2||!editable(st.sel)||!filled(st.sel))return;drag={src:st.sel};rng=[st.sel];return}
  var td=e.target.closest('td[data-a]'); if(!td)return;
  var a=td.dataset.a;
  if(st.editing&&(pointable()||(st.pt&&e.shiftKey))){e.preventDefault();putRef(a,e.shiftKey);selecting='pt';return}
  if(st.editing&&a===st.sel){e.preventDefault();return}
  e.preventDefault();
  if(st.editing)commit();
  select(a,e.shiftKey); selecting='sel';
});
T.addEventListener('dblclick',function(e){var td=e.target.closest('td[data-a]');if(td&&td.dataset.a===st.sel)startEdit(null,'edit')});
document.addEventListener('pointermove',function(e){
  if(!drag&&!selecting)return;
  var el=document.elementFromPoint(e.clientX,e.clientY),td=el&&el.closest&&el.closest('td[data-a]'); if(!td)return;
  var a=td.dataset.a;
  if(selecting==='sel'){if(a!==st.end){st.end=a;paint()}return}
  if(selecting==='pt'){if(st.pt&&a!==st.pt.c)putRef(a,true);return}
  var s=drag.src,out=[];
  if(ri(a)===ri(s)&&ci(a)>=ci(s)){for(var c=ci(s);c<=ci(a);c++)out.push(ad(c,ri(s)))}
  else if(ci(a)===ci(s)&&ri(a)>=ri(s)){for(var r=ri(s);r<=ri(a);r++)out.push(ad(ci(s),r))}
  else out=[s];
  rng=out; paint();
});
document.addEventListener('pointerup',function(){
  selecting=false;
  if(!drag)return; var s=drag.src; drag=null;
  fillRange(s,rng); rng=[]; paint();
});

fx.addEventListener('pointerdown',function(){if(!st.editing&&editable(st.sel)){setTimeout(function(){startEdit(null,'edit')},0)}else if(st.editing){st.mode='edit';st.pt=null;setTimeout(paint,0)}});
fx.addEventListener('input',function(){st.editing=true;st.pt=null;paint()});
var ARROW={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
fx.addEventListener('keydown',function(e){
  if(e.isComposing)return;
  var k=e.key,mod=e.ctrlKey||e.metaKey;
  if(ARROW[k]){
    var d=ARROW[k];
    if(pointable()){e.preventDefault();e.stopPropagation();var from=st.pt?st.pt.c:st.sel,to=mod?edge(from,d[0],d[1]):ad(clampC(ci(from)+d[0]),clampR(ri(from)+d[1]));putRef(to,e.shiftKey);return}
    if(st.mode==='enter'){e.preventDefault();e.stopPropagation();commit();fx.blur();move(d[0],d[1]);return}
    e.stopPropagation(); return; // 편집 모드: 커서 이동
  }
  if(k==='F4'){e.preventDefault();e.stopPropagation();f4();return}
  if(k==='F2'){e.preventDefault();e.stopPropagation();st.mode=st.mode==='edit'?'enter':'edit';st.pt=null;paint();return}
  if(k==='Enter'){e.preventDefault();e.stopPropagation();var all=mod;commit(all);fx.blur();if(!all)move(0,e.shiftKey?-1:1);else paint();return}
  if(k==='Tab'){e.preventDefault();e.stopPropagation();commit();fx.blur();move(e.shiftKey?-1:1,0);return}
  if(k==='Escape'){e.preventDefault();e.stopPropagation();cancel();return}
  if(e.altKey&&(k==='='||e.code==='Equal')){e.preventDefault();e.stopPropagation();var p=fx.selectionStart;fx.value=fx.value.slice(0,p)+'SUM('+fx.value.slice(p);try{fx.setSelectionRange(p+4,p+4)}catch(_){}st.pt=null;paint();return}
});
fx.addEventListener('blur',function(){setTimeout(function(){if(st.editing&&document.activeElement!==fx&&!selecting){commit();paint()}},150)});
document.addEventListener('keydown',function(e){
  if(document.activeElement===fx)return;
  var t=e.target;
  if(t&&t.closest&&t.closest('button,summary')&&(e.key==='Enter'||e.key===' '))return;
  if(t&&t.closest&&t.closest('button'))t.blur();
  var k=e.key,mod=e.ctrlKey||e.metaKey,K=k.length===1?k.toLowerCase():k;
  if(ARROW[k]){e.preventDefault();var d=ARROW[k];
    if(mod){var from=e.shiftKey?(st.end||st.sel):st.sel;select(edge(from,d[0],d[1]),e.shiftKey)}
    else move(d[0],d[1],e.shiftKey);
    return}
  if(mod){
    if(K==='c'||K==='x'){e.preventDefault();copySel();return}
    if(K==='v'){e.preventDefault();pasteSel();return}
    if(K==='z'&&!e.shiftKey){e.preventDefault();undo();return}
    if(K==='y'||(K==='z'&&e.shiftKey)){e.preventDefault();redo();return}
    if(K==='r'){e.preventDefault();fillDir('R');return}
    if(K==='d'){e.preventDefault();fillDir('D');return}
    if(K==='a'){e.preventDefault();st.sel='A1';st.end=ad(NC-1,NR);paint();return}
    if(k==='`'||e.code==='Backquote'){e.preventDefault();st.showF=!st.showF;toast(st.showF?'수식 보기 켰어요.':'값 보기로 돌아왔어요.');paint();return}
    if(k==='Home'){e.preventDefault();select('A1',e.shiftKey);return}
    if(k==='End'){e.preventDefault();select(ad(NC-1,NR),e.shiftKey);return}
    return;
  }
  if(e.altKey&&(k==='='||e.code==='Equal')){e.preventDefault();startEdit('=SUM(');return}
  if(k==='Home'){e.preventDefault();select(ad(0,ri(st.sel)),e.shiftKey);return}
  if(k==='Tab'){e.preventDefault();move(e.shiftKey?-1:1,0);return}
  if(k==='Enter'){e.preventDefault();move(0,e.shiftKey?-1:1);return}
  if(k==='F2'){e.preventDefault();startEdit(null,'edit');return}
  if(k==='Escape'){if(st.clip){st.clip=null;paint()}return}
  if(k==='Delete'){e.preventDefault();clearSel();return}
  if(k==='Backspace'){e.preventDefault();if(startEdit(''))fx.dispatchEvent(new Event('input'));return}
  if(k.length===1&&!e.altKey){e.preventDefault();startEdit(k)}
});

recalc(); paint();
window.__lab={cell:cell,steps:STEPS,V:function(){return V},ANS:function(){return ANS},done:stepDone,st:function(){return st},NR:NR,NC:NC,notes:NOTE};
})();
