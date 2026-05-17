window.Pages = window.Pages || {};
window.Pages.trpg = (function(){
'use strict';

// ─── CSS ─────────────────────────────────────────────────────────────────────
const STYLE_ID='trpg-page-style';
function injectStyle(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;
  s.textContent=`
.tpg{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;
  --tg:var(--color-accent);--tg2:var(--color-warning);}
.tpg-hdr{display:flex;align-items:center;gap:6px;padding:6px 12px;
  background:var(--color-surface);border-bottom:2px solid var(--tg);flex-shrink:0;flex-wrap:wrap;}
.tpg-hdr h2{font-size:15px;color:var(--tg);margin-right:auto;letter-spacing:1px;font-weight:700;}
.tpg-body{flex:1;overflow-y:auto;padding:14px;}
/* cards */
.tpg-card{background:var(--color-card);border:1px solid var(--color-border);
  border-radius:10px;padding:14px;margin-bottom:10px;}
.tpg-card__title{font-size:15px;font-weight:700;margin-bottom:5px;color:var(--color-text);}
.tpg-card__meta{font-size:11px;color:var(--color-text-muted);margin-bottom:10px;}
.tpg-card__btns{display:flex;gap:6px;flex-wrap:wrap;}
/* play layout */
.tpg-play{flex:1;min-height:0;display:flex;overflow:hidden;}
.tpg-pmain{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;padding:12px 16px;gap:8px;}
.tpg-scid{font-size:11px;color:var(--color-text-muted);font-family:monospace;flex-shrink:0;}
.tpg-ptxt{flex:1;min-height:0;overflow-y:auto;font-size:14px;line-height:1.9;white-space:pre-wrap;
  padding:12px 14px;background:var(--color-surface);border:1px solid var(--color-border);
  border-radius:8px;color:var(--color-text);}
.tpg-choices{max-height:200px;overflow-y:auto;flex-shrink:0;}
.tpg-cbtn{display:block;width:100%;padding:9px 14px;margin-bottom:5px;
  background:var(--color-surface);border:1px solid var(--color-border);
  color:var(--color-text);text-align:left;cursor:pointer;border-radius:7px;
  font-size:13px;font-family:inherit;transition:all .2s;}
.tpg-cbtn::before{content:'▸ ';color:var(--tg);}
.tpg-cbtn:hover:not(.tpg-off){background:var(--color-card);border-color:var(--tg);
  color:var(--tg);padding-left:20px;}
.tpg-off{opacity:.4;cursor:not-allowed;}
.tpg-ctag{font-size:10px;color:var(--color-text-muted);display:block;margin-top:1px;}
.tpg-gameover{text-align:center;padding:20px;font-size:16px;color:var(--tg);}
/* side panel */
.tpg-side{width:200px;flex-shrink:0;background:var(--color-surface);
  border-left:1px solid var(--color-border);overflow-y:auto;}
.tpg-rsec{border-bottom:1px solid var(--color-border);}
.tpg-rsec-t{padding:6px 10px;font-size:10px;font-weight:700;color:var(--tg);letter-spacing:1px;
  background:var(--color-bg);border-bottom:1px solid var(--color-border);cursor:pointer;
  user-select:none;display:flex;justify-content:space-between;align-items:center;}
.tpg-rsec-b{padding:8px 10px;}
.tpg-svrow{display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;
  padding-bottom:3px;border-bottom:1px dashed var(--color-border);}
.tpg-svn{color:var(--color-text-muted);}
.tpg-svv{font-weight:700;font-family:monospace;}
.tpg-dgrid{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:5px;}
.tpg-die{padding:4px 8px;background:var(--color-card);border:1px solid var(--color-border);
  color:var(--color-text);cursor:pointer;border-radius:4px;font-size:11px;font-weight:700;
  font-family:monospace;transition:all .15s;}
.tpg-die:hover{background:var(--tg);color:#000;border-color:var(--tg);}
.tpg-dres{font-size:24px;font-weight:900;color:var(--tg2);text-align:center;
  font-family:monospace;min-height:28px;margin-bottom:3px;}
.tpg-dlog{font-size:10px;color:var(--color-text-muted);font-family:monospace;
  max-height:55px;overflow-y:auto;}
.tpg-memo{width:100%;background:var(--color-bg);border:1px solid var(--color-border);
  color:var(--color-text);border-radius:4px;padding:5px 7px;font-size:12px;
  font-family:inherit;resize:none;outline:none;height:65px;}
.tpg-memo:focus{border-color:var(--tg);}
.tpg-hlog{font-size:10px;color:var(--color-text-muted);max-height:95px;overflow-y:auto;font-family:monospace;}
.tpg-hitem{padding:2px 0;border-bottom:1px solid var(--color-border);}
.tpg-hsc{color:var(--color-secondary);}
/* editor layout */
.tpg-editlay{flex:1;min-height:0;display:flex;overflow:hidden;}
.tpg-lpanel{width:180px;flex-shrink:0;background:var(--color-surface);
  border-right:1px solid var(--color-border);display:flex;flex-direction:column;overflow:hidden;}
.tpg-lhdr{padding:6px 9px;border-bottom:1px solid var(--color-border);font-size:10px;
  font-weight:700;color:var(--tg);display:flex;align-items:center;justify-content:space-between;}
.tpg-slist{flex:1;overflow-y:auto;padding:3px;}
.tpg-sli{padding:5px 8px;cursor:pointer;border-radius:4px;font-size:11px;
  color:var(--color-text-muted);border:1px solid transparent;margin-bottom:2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.tpg-sli:hover,.tpg-sli.on{background:var(--color-card);color:var(--tg);border-color:var(--color-border);}
.tpg-ectr{flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;padding:10px;gap:6px;}
.tpg-lb{font-size:10px;font-weight:700;color:var(--tg);letter-spacing:1px;display:block;margin-bottom:2px;}
.tpg-inp{width:100%;background:var(--color-bg);border:1px solid var(--color-border);
  color:var(--color-text);border-radius:4px;padding:5px 8px;font-family:inherit;
  font-size:13px;outline:none;transition:border-color .2s;}
.tpg-inp:focus{border-color:var(--tg);}
.tpg-ta{flex:1;resize:none;min-height:60px;}
.tpg-crow{display:flex;gap:3px;margin-bottom:4px;align-items:center;}
.tpg-crow input{background:var(--color-bg);border:1px solid var(--color-border);
  color:var(--color-text);border-radius:4px;padding:3px 6px;font-size:11px;font-family:inherit;outline:none;}
.tpg-crow input:focus{border-color:var(--tg);}
.tpg-ci-t{flex:2;}.tpg-ci-c{flex:1;}.tpg-ci-e{flex:1;}.tpg-ci-g{width:50px;font-family:monospace;}
.tpg-xbtn{background:none;border:1px solid rgba(239,68,68,.3);color:var(--color-danger);
  cursor:pointer;border-radius:4px;padding:2px 6px;font-size:12px;flex-shrink:0;}
@media(max-width:700px){.tpg-side{display:none;}.tpg-lpanel{display:none;}}
`;
  document.head.appendChild(s);
}

// ─── STATE ────────────────────────────────────────────────────────────────────
let _el=null, _savedSt={}, _stories=[], _story=null;
let _P={sceneId:'1',vars:{},hist:[],dlog:[],scenes:{},order:[],initVars:''};
let _E={scenes:{},order:[],editId:null,initVars:'',title:''};

// ─── PARSER ───────────────────────────────────────────────────────────────────
function parseTxt(txt){
  const scenes={},order=[];
  txt.split(/(?=^#\w+#[ \t]*$)/m).filter(b=>b.trim()).forEach(block=>{
    const lines=block.split('\n');
    const hm=lines[0].trim().match(/^#(\w+)#$/);if(!hm)return;
    const id=hm[1],choices=[],body=[];let iv={};
    for(let i=1;i<lines.length;i++){
      const t=lines[i].trim();
      if(!t){body.push('');continue;}
      if(t.startsWith('@vars:')){
        t.slice(6).split(',').forEach(kv=>{
          const p=kv.trim().split('=');
          if(p.length>=2){const k=p[0].trim(),v=p.slice(1).join('=').trim();iv[k]=isNaN(v)?v:+v;}
        });continue;
      }
      if(t.startsWith('- ')){const c=pCh(t.slice(2));if(c)choices.push(c);continue;}
      body.push(lines[i]);
    }
    scenes[id]={id,text:body.join('\n').trim(),choices,initVars:iv};order.push(id);
  });
  return{scenes,order};
}

function pCh(raw){
  let rest=raw.trim(),cond=null,tgt=null,eff='';
  const cm=rest.match(/^\[([^\]]+)\]\s*/);if(cm){cond=cm[1].trim();rest=rest.slice(cm[0].length);}
  const am=rest.match(/\s*->\s*#(\w+)#\s*$/);if(am){tgt=am[1];rest=rest.slice(0,rest.length-am[0].length);}
  const em=rest.match(/\{([^}]+)\}\s*$/);if(em){eff=em[1].trim();rest=rest.slice(0,rest.length-em[0].length);}
  const text=rest.trim();if(!text)return null;
  return{text,cond,eff,tgt};
}

function toTxt(scenes,order,ivText){
  let out='';
  const ids=order.length?order:Object.keys(scenes).sort((a,b)=>(+a||0)-(+b||0)||a.localeCompare(b));
  ids.forEach((id,i)=>{
    const s=scenes[id];if(!s)return;
    out+=`#${id}#\n`;
    if(i===0&&ivText&&ivText.trim()){
      const vl=ivText.trim().split('\n').map(l=>l.trim().replace(/\s*=\s*/,'=')).filter(Boolean).join(', ');
      if(vl)out+=`@vars: ${vl}\n`;
    }
    if(s.text)out+=s.text+'\n';
    (s.choices||[]).forEach(c=>{
      let ln='- ';
      if(c.cond)ln+=`[${c.cond}] `;
      ln+=c.text;if(c.eff)ln+=` {${c.eff}}`;if(c.tgt)ln+=` -> #${c.tgt}#`;
      out+=ln+'\n';
    });
    out+='\n';
  });
  return out.trim();
}

// ─── ENGINE ───────────────────────────────────────────────────────────────────
function mkVars(ivText,scenes,order){
  const v={};
  (ivText||'').split('\n').forEach(l=>{const m=l.trim().match(/^(\w+)\s*=\s*(.+)$/);if(m){const k=m[1],val=m[2].trim();v[k]=isNaN(val)?val:+val;}});
  const first=scenes&&order&&scenes[order[0]];
  if(first&&first.initVars)Object.assign(v,first.initVars);
  return v;
}

function evalCond(expr,vars){
  if(!expr)return true;
  const s=expr.trim();
  if(/^!?\w+$/.test(s)){const neg=s[0]==='!',vn=neg?s.slice(1):s,val=vars[vn];const t=val!==undefined&&val!==0&&val!==false&&val!=='';return neg?!t:t;}
  const m=s.match(/^(\w+)\s*(>=|<=|==|!=|>|<)\s*(.+)$/);if(!m)return true;
  const lhs=vars[m[1]]!==undefined?+vars[m[1]]:0,rhs=isNaN(m[3].trim())?m[3].trim():+m[3];
  switch(m[2]){case'>=':return lhs>=rhs;case'<=':return lhs<=rhs;case'==':return lhs==rhs;case'!=':return lhs!=rhs;case'>':return lhs>rhs;case'<':return lhs<rhs;}
  return true;
}

function applyEff(eff,vars){
  if(!eff)return vars;const v={...vars};
  eff.split(/[,;]/).forEach(p=>{
    const m=p.trim().match(/^(\w+)\s*(\+=|-=|\*=|\/=|=)\s*(.+)$/);if(!m)return;
    const vn=m[1],op=m[2],rhs=isNaN(m[3].trim())?m[3].trim():+m[3],cur=+v[vn]||0;
    switch(op){case'=':v[vn]=rhs;break;case'+=':v[vn]=cur+(+rhs||0);break;case'-=':v[vn]=cur-(+rhs||0);break;case'*=':v[vn]=cur*(+rhs||1);break;case'/=':v[vn]=rhs?cur/+rhs:cur;break;}
  });
  return v;
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const esc=s=>!s?'':String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const eA=s=>esc(s).replace(/'/g,'&#39;');
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2);
const tst=msg=>{if(window.Utils&&Utils.toast)Utils.toast(msg,'info');};
const saveStories=()=>DB.setSetting('trpgStories',_stories);

// ─── LIST VIEW ────────────────────────────────────────────────────────────────
function showList(){
  _story=null;
  _el.innerHTML=`
<div class="tpg">
  <div class="tpg-hdr">
    <h2>🎲 TRPG 게임북</h2>
    <button class="btn btn-ghost btn-sm" id="tpgSample">예제 불러오기</button>
    <button class="btn btn-primary btn-sm" id="tpgNew">+ 새 이야기</button>
  </div>
  <div class="tpg-body" id="tpgListBody"></div>
</div>`;
  refreshList();
  document.getElementById('tpgNew').onclick=()=>showEdit(null);
  document.getElementById('tpgSample').onclick=loadSample;
}

function refreshList(){
  const body=document.getElementById('tpgListBody');if(!body)return;
  if(!_stories.length){
    body.innerHTML=`<div class="empty-state"><div class="empty-state__icon">🎲</div>
      <div class="empty-state__title">이야기가 없습니다</div>
      <div class="empty-state__desc">새 이야기를 만들거나 예제를 불러오세요</div></div>`;
    return;
  }
  body.innerHTML=_stories.map(s=>{
    const cnt=parseTxt(s.content||'').order.length;
    const d=s.updatedAt?new Date(s.updatedAt).toLocaleDateString('ko-KR'):'';
    return`<div class="tpg-card">
      <div class="tpg-card__title">🎲 ${esc(s.title)}</div>
      <div class="tpg-card__meta">씬 ${cnt}개${d?' · '+d:''}</div>
      <div class="tpg-card__btns">
        <button class="btn btn-primary btn-sm" data-act="play" data-id="${eA(s.id)}">▶ 플레이</button>
        <button class="btn btn-ghost btn-sm" data-act="edit" data-id="${eA(s.id)}">✏ 편집</button>
        <button class="btn btn-ghost btn-sm" data-act="del" data-id="${eA(s.id)}" style="color:var(--color-danger);">🗑</button>
      </div>
    </div>`;
  }).join('');
  body.querySelectorAll('[data-act]').forEach(btn=>{
    btn.onclick=()=>{
      const s=_stories.find(x=>x.id===btn.dataset.id);if(!s)return;
      if(btn.dataset.act==='play')showPlay(s);
      else if(btn.dataset.act==='edit')showEdit(s);
      else if(btn.dataset.act==='del')delStory(s.id);
    };
  });
}

async function delStory(id){
  if(!confirm('이 이야기를 삭제하시겠습니까?'))return;
  _stories=_stories.filter(s=>s.id!==id);
  await saveStories();refreshList();tst('삭제되었습니다.');
}

async function loadSample(){
  if(_stories.find(s=>s.title==='예제: 숲의 모험')){tst('예제가 이미 있습니다.');return;}
  const s={id:uid(),title:'예제: 숲의 모험',content:SAMPLE,
    initVars:'hp = 100\ngold = 30\nsword = 0\npotion = 0\nkey = 0',
    createdAt:Date.now(),updatedAt:Date.now()};
  _stories.push(s);await saveStories();refreshList();tst('✅ 예제 시나리오가 추가되었습니다.');
}

// ─── PLAY VIEW ────────────────────────────────────────────────────────────────
function showPlay(story){
  _story=story;
  const{scenes,order}=parseTxt(story.content||'');
  Object.assign(_P,{scenes,order,initVars:story.initVars||'',hist:[],dlog:[],sceneId:order[0]||'1'});
  _P.vars=mkVars(story.initVars||'',scenes,order);

  _el.innerHTML=`
<div class="tpg">
  <div class="tpg-hdr">
    <button class="btn btn-ghost btn-sm" id="pBack">← 목록</button>
    <h2 style="font-size:13px;">${esc(story.title)}</h2>
    <button class="btn btn-ghost btn-sm" id="pRestart">↺ 재시작</button>
    <button class="btn btn-ghost btn-sm" id="pSave">💾 저장</button>
    <button class="btn btn-ghost btn-sm" id="pLoad">⏮ 이어하기</button>
    <button class="btn btn-ghost btn-sm" id="pEdit">✏ 편집</button>
  </div>
  <div class="tpg-play">
    <div class="tpg-pmain">
      <div class="tpg-scid" id="pScid"></div>
      <div class="tpg-ptxt" id="pTxt"></div>
      <div class="tpg-choices" id="pChoices"></div>
      <div id="pGameover" style="display:none;"></div>
    </div>
    <div class="tpg-side">
      <div class="tpg-rsec">
        <div class="tpg-rsec-t" data-body="pStatB">⚔ 상태 <span>▲</span></div>
        <div class="tpg-rsec-b" id="pStatB"><div id="pVars"></div></div>
      </div>
      <div class="tpg-rsec">
        <div class="tpg-rsec-t" data-body="pDiceB">🎲 주사위 <span>▲</span></div>
        <div class="tpg-rsec-b" id="pDiceB">
          <div class="tpg-dgrid">${[4,6,8,10,12,20,100].map(n=>`<button class="tpg-die" data-n="${n}">d${n}</button>`).join('')}</div>
          <div class="tpg-dres" id="pDres">-</div>
          <div class="tpg-dlog" id="pDlog"></div>
        </div>
      </div>
      <div class="tpg-rsec">
        <div class="tpg-rsec-t">📝 메모</div>
        <div class="tpg-rsec-b"><textarea class="tpg-memo" id="pMemo" placeholder="메모..."></textarea></div>
      </div>
      <div class="tpg-rsec">
        <div class="tpg-rsec-t" data-body="pHistB">📜 히스토리 <span>▲</span></div>
        <div class="tpg-rsec-b" id="pHistB">
          <button class="btn btn-ghost btn-sm" id="pClrHist" style="width:100%;font-size:10px;margin-bottom:4px;">기록 지우기</button>
          <div class="tpg-hlog" id="pHlog"></div>
        </div>
      </div>
    </div>
  </div>
</div>`;

  // header buttons
  document.getElementById('pBack').onclick=()=>showList();
  document.getElementById('pEdit').onclick=()=>showEdit(story);
  document.getElementById('pRestart').onclick=()=>{
    Object.assign(_P,{vars:mkVars(_P.initVars,_P.scenes,_P.order),hist:[],sceneId:_P.order[0]||'1'});
    renderScene(_P.sceneId);uStats();uHist();tst('재시작합니다.');
  };
  document.getElementById('pSave').onclick=()=>{
    try{
      localStorage.setItem('trpg_s_'+story.id,JSON.stringify({sceneId:_P.sceneId,vars:_P.vars,hist:_P.hist}));
      const m=document.getElementById('pMemo');if(m)localStorage.setItem('trpg_m_'+story.id,m.value);
    }catch(e){}
    tst('💾 저장되었습니다.');
  };
  document.getElementById('pLoad').onclick=()=>{
    try{
      const raw=localStorage.getItem('trpg_s_'+story.id);
      if(raw){const d=JSON.parse(raw);_P.sceneId=d.sceneId||_P.order[0];_P.vars=d.vars||{};_P.hist=d.hist||[];}
      const mv=localStorage.getItem('trpg_m_'+story.id);
      const m=document.getElementById('pMemo');if(m&&mv)m.value=mv;
    }catch(e){}
    renderScene(_P.sceneId);uStats();uHist();tst('⏮ 이어하기 완료.');
  };
  document.getElementById('pClrHist').onclick=()=>{_P.hist=[];uHist();};

  // section toggles
  document.querySelectorAll('.tpg-rsec-t[data-body]').forEach(t=>{
    t.onclick=()=>{
      const b=document.getElementById(t.dataset.body),sp=t.querySelector('span');if(!b)return;
      const h=b.style.display==='none';b.style.display=h?'block':'none';if(sp)sp.textContent=h?'▲':'▼';
    };
  });

  // dice
  document.querySelectorAll('.tpg-die').forEach(d=>{
    d.onclick=()=>{
      const n=+d.dataset.n,r=Math.floor(Math.random()*n)+1;
      const res=document.getElementById('pDres');if(res)res.textContent=r;
      _P.dlog.unshift(`d${n}: ${r}`);if(_P.dlog.length>20)_P.dlog.pop();
      const dl=document.getElementById('pDlog');if(dl)dl.innerHTML=_P.dlog.slice(0,8).map(l=>`<div>${esc(l)}</div>`).join('');
    };
  });

  // memo
  const memo=document.getElementById('pMemo');
  const savedMemo=localStorage.getItem('trpg_m_'+story.id);
  if(memo&&savedMemo)memo.value=savedMemo;
  if(memo)memo.oninput=e=>localStorage.setItem('trpg_m_'+story.id,e.target.value);

  renderScene(_P.sceneId);uStats();uHist();
}

function renderScene(id){
  const sc=_P.scenes[id];_P.sceneId=id;
  const scidEl=document.getElementById('pScid');
  const txtEl=document.getElementById('pTxt');
  const choEl=document.getElementById('pChoices');
  const goEl=document.getElementById('pGameover');
  if(!scidEl||!txtEl||!choEl||!goEl)return;
  goEl.style.display='none';choEl.innerHTML='';
  scidEl.textContent=`#${id}#${sc?.title?' — '+sc.title:''}`;
  txtEl.textContent=sc?sc.text:'❌ 씬을 찾을 수 없습니다: #'+id+'#';
  if(!sc)return;
  const chs=sc.choices||[];
  if(!chs.length){
    goEl.style.display='block';goEl.className='tpg-gameover';
    goEl.innerHTML=`<div style="font-size:28px;margin-bottom:8px;">⚜</div>
      <div>— 이야기가 끝났습니다 —</div><br>
      <button class="btn btn-ghost btn-sm" id="pRestEnd">↺ 다시 시작</button>`;
    setTimeout(()=>{
      const b=document.getElementById('pRestEnd');
      if(b)b.onclick=()=>{Object.assign(_P,{vars:mkVars(_P.initVars,_P.scenes,_P.order),hist:[],sceneId:_P.order[0]||'1'});renderScene(_P.sceneId);uStats();uHist();};
    },0);
    return;
  }
  chs.forEach(ch=>{
    const ok=evalCond(ch.cond,_P.vars);
    const btn=document.createElement('button');
    btn.className='tpg-cbtn'+(ok?'':' tpg-off');
    let html=esc(ch.text);
    if(ch.cond)html+=`<span class="tpg-ctag">[${esc(ch.cond)}] ${ok?'✓':'✗ 조건 미충족'}</span>`;
    btn.innerHTML=html;
    if(ok)btn.onclick=()=>{
      if(ch.eff)_P.vars=applyEff(ch.eff,_P.vars);
      _P.hist.unshift({from:id,txt:ch.text});uStats();uHist();
      if(ch.tgt){renderScene(ch.tgt);txtEl.scrollTop=0;}
      else{txtEl.textContent='⚠️ 이동할 씬 ID가 없습니다.';choEl.innerHTML='';}
    };
    choEl.appendChild(btn);
  });
}

function uStats(){
  const el=document.getElementById('pVars');if(!el)return;
  const v=_P.vars;
  if(!v||!Object.keys(v).length){el.innerHTML='<div style="font-size:11px;color:var(--color-text-muted);">변수 없음</div>';return;}
  el.innerHTML=Object.entries(v).map(([k,val])=>{
    let col='var(--color-warning)';
    if(k==='hp'){const n=+val;col=n>60?'var(--color-success)':n>20?'var(--color-warning)':'var(--color-danger)';}
    return`<div class="tpg-svrow"><span class="tpg-svn">${esc(k.toUpperCase())}</span>
      <span class="tpg-svv" style="color:${col};">${esc(String(val))}</span></div>`;
  }).join('');
}

function uHist(){
  const el=document.getElementById('pHlog');if(!el)return;
  el.innerHTML=_P.hist.length
    ?_P.hist.slice(0,25).map(h=>`<div class="tpg-hitem"><span class="tpg-hsc">#${esc(h.from)}#</span> → ${esc(h.txt)}</div>`).join('')
    :'<div style="color:var(--color-text-muted);">기록 없음</div>';
}

// ─── EDIT VIEW ────────────────────────────────────────────────────────────────
function showEdit(story){
  _story=story;
  if(story){
    const{scenes,order}=parseTxt(story.content||'');
    Object.assign(_E,{scenes,order,editId:null,initVars:story.initVars||'',title:story.title||''});
  }else{
    Object.assign(_E,{scenes:{},order:[],editId:null,initVars:'hp = 100\ngold = 30\nsword = 0',title:''});
  }

  _el.innerHTML=`
<div class="tpg">
  <div class="tpg-hdr">
    <button class="btn btn-ghost btn-sm" id="eBack">← 목록</button>
    <input class="tpg-inp" id="eTitle" placeholder="이야기 제목" value="${eA(_E.title)}"
      style="flex:1;max-width:260px;font-size:14px;font-weight:700;"/>
    <button class="btn btn-primary btn-sm" id="eSaveSt">💾 저장</button>
    <button class="btn btn-ghost btn-sm" id="ePlay">▶ 테스트</button>
    <button class="btn btn-ghost btn-sm" id="eExport">📄 내보내기</button>
    <button class="btn btn-ghost btn-sm" id="eImport">📂 불러오기</button>
    <input type="file" id="eFileIn" accept=".txt" style="display:none;"/>
  </div>
  <div class="tpg-editlay">
    <div class="tpg-lpanel">
      <div class="tpg-lhdr">씬 목록
        <button class="btn btn-ghost btn-sm" id="eNewSc" style="padding:2px 8px;font-size:10px;">+</button>
      </div>
      <div class="tpg-slist" id="eScList"></div>
    </div>
    <div class="tpg-ectr">
      <div style="display:flex;gap:6px;align-items:flex-end;flex-shrink:0;">
        <div><label class="tpg-lb">씬 ID</label>
          <input class="tpg-inp" id="eId" style="width:65px;" placeholder="1"/></div>
        <div style="flex:1;"><label class="tpg-lb">씬 제목 (선택)</label>
          <input class="tpg-inp" id="eScTitle" placeholder="제목"/></div>
      </div>
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;">
        <label class="tpg-lb">본문 텍스트</label>
        <textarea class="tpg-inp tpg-ta" id="eText" placeholder="이 장면의 이야기..."></textarea>
      </div>
      <div style="flex-shrink:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <label class="tpg-lb" style="margin:0;">선택지</label>
          <button class="btn btn-ghost btn-sm" id="eAddCh" style="padding:2px 8px;font-size:10px;">+ 추가</button>
        </div>
        <div style="font-size:10px;color:var(--color-text-muted);margin-bottom:3px;">텍스트 | 조건(hp>=5) | 효과(hp-=5) | 이동씬ID</div>
        <div id="eCed" style="max-height:140px;overflow-y:auto;"></div>
      </div>
      <div style="display:flex;gap:5px;flex-shrink:0;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" id="eSaveSc">💾 씬 저장</button>
        <button class="btn btn-ghost btn-sm" id="eDelSc" style="color:var(--color-danger);">🗑 삭제</button>
      </div>
    </div>
    <div class="tpg-side">
      <div class="tpg-rsec">
        <div class="tpg-rsec-t">📐 초기 변수</div>
        <div class="tpg-rsec-b">
          <div style="font-size:10px;color:var(--color-text-muted);margin-bottom:4px;line-height:1.5;">
            한 줄에 변수 하나<br>예) hp = 100
          </div>
          <textarea class="tpg-inp" id="eIVars" rows="5"
            style="resize:none;font-family:monospace;font-size:11px;"
            placeholder="hp = 100&#10;gold = 30">${eA(_E.initVars)}</textarea>
        </div>
      </div>
      <div class="tpg-rsec">
        <div class="tpg-rsec-t">📋 TXT 문법</div>
        <div class="tpg-rsec-b" style="font-size:10px;color:var(--color-text-muted);line-height:1.7;">
          <code style="color:var(--tg);">#씬ID#</code> — 씬 구분<br>
          <code style="color:var(--tg);">- 텍스트 -> #씬ID#</code><br>
          <code style="color:var(--tg);">- [조건] 텍스트 {효과} -> #씬ID#</code><br><br>
          <b>조건:</b> hp&gt;=5, gold&lt;10, sword==1<br>
          <b>효과:</b> hp-=10, gold+=5, key=1
        </div>
      </div>
    </div>
  </div>
</div>`;

  document.getElementById('eBack').onclick=()=>{if(confirm('목록으로 돌아가시겠습니까? 저장하지 않은 변경은 사라집니다.'))showList();};
  document.getElementById('eSaveSt').onclick=saveStory;
  document.getElementById('eNewSc').onclick=newSc;
  document.getElementById('eSaveSc').onclick=saveSc;
  document.getElementById('eDelSc').onclick=delSc;
  document.getElementById('ePlay').onclick=()=>{
    saveSc();
    const iv=document.getElementById('eIVars').value;
    showPlay({id:_story?.id||'_test',title:document.getElementById('eTitle').value||'테스트',
      content:toTxt(_E.scenes,_E.order,iv),initVars:iv});
  };
  document.getElementById('eExport').onclick=()=>{
    const iv=document.getElementById('eIVars').value;
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([toTxt(_E.scenes,_E.order,iv)],{type:'text/plain;charset=utf-8'}));
    a.download=(document.getElementById('eTitle').value||'scenario')+'.txt';
    a.click();URL.revokeObjectURL(a.href);tst('📄 내보내기 완료.');
  };
  document.getElementById('eImport').onclick=()=>document.getElementById('eFileIn').click();
  document.getElementById('eFileIn').onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      const{scenes,order}=parseTxt(ev.target.result);
      if(!order.length){tst('파싱 실패. 형식을 확인하세요.');return;}
      _E.scenes=scenes;_E.order=order;
      const fi=scenes[order[0]];
      if(fi?.initVars&&Object.keys(fi.initVars).length){
        const iv=Object.entries(fi.initVars).map(([k,v])=>`${k} = ${v}`).join('\n');
        _E.initVars=iv;const el=document.getElementById('eIVars');if(el)el.value=iv;
      }
      buildScList();tst('✅ '+order.length+'개 씬 불러오기 완료.');
    };
    r.readAsText(f,'utf-8');e.target.value='';
  };
  document.getElementById('eAddCh').onclick=()=>{
    const r=document.createElement('div');r.className='tpg-crow';
    r.innerHTML=`<input class="tpg-ci-t" placeholder="선택지 텍스트"/>
      <input class="tpg-ci-c" placeholder="조건"/><input class="tpg-ci-e" placeholder="효과"/>
      <input class="tpg-ci-g" placeholder="이동ID"/>
      <button class="tpg-xbtn" onclick="this.closest('.tpg-crow').remove()">✕</button>`;
    document.getElementById('eCed').appendChild(r);
  };
  document.getElementById('eIVars').oninput=e=>{_E.initVars=e.target.value;};

  buildScList();
  if(_E.order.length)loadSc(_E.order[0]);
}

function buildScList(){
  const el=document.getElementById('eScList');if(!el)return;
  el.innerHTML=_E.order.map(id=>{
    const s=_E.scenes[id];
    const lbl=`#${id}# ${s.title||s.text?.slice(0,14)||''}`.trim();
    return`<div class="tpg-sli${_E.editId===id?' on':''}" data-id="${eA(id)}">${esc(lbl)}</div>`;
  }).join('');
  el.querySelectorAll('.tpg-sli').forEach(d=>d.onclick=()=>loadSc(d.dataset.id));
}

function loadSc(id){
  const s=_E.scenes[id];if(!s)return;
  _E.editId=id;
  const set=(elId,val)=>{const el=document.getElementById(elId);if(el)el.value=val;};
  set('eId',id);set('eScTitle',s.title||'');set('eText',s.text||'');
  const ced=document.getElementById('eCed');
  if(ced)ced.innerHTML=(s.choices||[]).map(c=>`
    <div class="tpg-crow">
      <input class="tpg-ci-t" value="${eA(c.text||'')}" placeholder="텍스트"/>
      <input class="tpg-ci-c" value="${eA(c.cond||'')}" placeholder="조건"/>
      <input class="tpg-ci-e" value="${eA(c.eff||'')}" placeholder="효과"/>
      <input class="tpg-ci-g" value="${eA(c.tgt||'')}" placeholder="이동ID"/>
      <button class="tpg-xbtn" onclick="this.closest('.tpg-crow').remove()">✕</button>
    </div>`).join('');
  buildScList();
}

function getChs(){
  return[...(document.getElementById('eCed')?.querySelectorAll('.tpg-crow')||[])].map(r=>({
    text:r.querySelector('.tpg-ci-t').value.trim(),
    cond:r.querySelector('.tpg-ci-c').value.trim(),
    eff:r.querySelector('.tpg-ci-e').value.trim(),
    tgt:r.querySelector('.tpg-ci-g').value.trim(),
  })).filter(c=>c.text);
}

function saveSc(){
  const id=document.getElementById('eId')?.value.trim();if(!id)return;
  const s={id,title:document.getElementById('eScTitle').value.trim(),
    text:document.getElementById('eText').value.trim(),
    choices:getChs(),initVars:_E.scenes[id]?.initVars||{}};
  if(_E.editId&&_E.editId!==id){
    delete _E.scenes[_E.editId];
    const i=_E.order.indexOf(_E.editId);if(i>=0)_E.order[i]=id;else _E.order.push(id);
  }else if(!_E.scenes[id])_E.order.push(id);
  _E.scenes[id]=s;_E.editId=id;buildScList();tst('씬 저장됨.');
}

function delSc(){
  if(!_E.editId||!confirm(`씬 #${_E.editId}#을 삭제하시겠습니까?`))return;
  delete _E.scenes[_E.editId];_E.order=_E.order.filter(i=>i!==_E.editId);_E.editId=null;
  ['eId','eScTitle','eText'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const c=document.getElementById('eCed');if(c)c.innerHTML='';
  buildScList();tst('삭제되었습니다.');
}

function newSc(){
  const nums=_E.order.map(id=>+id).filter(n=>!isNaN(n));
  const nextId=nums.length?String(Math.max(...nums)+1):'1';
  _E.editId=null;
  const set=(elId,val)=>{const el=document.getElementById(elId);if(el)el.value=val;};
  set('eId',nextId);set('eScTitle','');set('eText','');
  const c=document.getElementById('eCed');if(c)c.innerHTML='';
  buildScList();
}

async function saveStory(){
  const title=document.getElementById('eTitle')?.value.trim();
  if(!title){tst('이야기 제목을 입력하세요.');return;}
  saveSc();
  const iv=document.getElementById('eIVars')?.value||'';
  const content=toTxt(_E.scenes,_E.order,iv);
  const now=Date.now();
  if(_story&&_stories.find(s=>s.id===_story.id)){
    const idx=_stories.findIndex(s=>s.id===_story.id);
    _stories[idx]={..._stories[idx],title,content,initVars:iv,updatedAt:now};
    _story=_stories[idx];
  }else{
    const ns={id:uid(),title,content,initVars:iv,createdAt:now,updatedAt:now};
    _stories.push(ns);_story=ns;
  }
  await saveStories();tst('✅ 저장되었습니다.');
}

// ─── SAMPLE SCENARIO ─────────────────────────────────────────────────────────
const SAMPLE=`#1#
@vars: hp=100, gold=30, sword=0, potion=0, key=0
안개 낀 숲길 어귀에 서 있습니다. 등 뒤로는 험난한 산길, 앞에는 낡은 목책으로 둘러싸인 작은 마을이 보입니다.

허리춤엔 낡은 단검 하나, 주머니엔 금화 30냥이 전부입니다.
- 마을 문으로 들어간다 -> #2#
- 숲 속을 탐험한다 -> #3#
- 산길 위쪽으로 올라간다 -> #10#

#2#
마을에 들어서자 퀴퀴한 냄새가 납니다. 광장 중앙엔 우물이, 북쪽엔 대장간, 서쪽엔 여관이 보입니다.
- 대장간에 간다 -> #4#
- 여관에 들어간다 -> #5#
- 우물을 살펴본다 -> #6#
- 마을을 떠난다 -> #1#

#3#
숲 속 깊이 들어가자 고블린 두 마리가 나타납니다!
- [hp >= 50] 고블린과 싸운다 {hp -= 25, gold += 15} -> #7#
- [potion >= 1] 포션을 마시고 싸운다 {hp += 20, potion -= 1, hp -= 10, gold += 15} -> #7#
- 도망친다 {hp -= 5} -> #1#

#4#
대장간 노인이 쇠를 두드리고 있습니다. "검 하나에 금화 20냥, 포션은 10냥이오."
- [gold >= 20] 검을 구입한다 {gold -= 20, sword = 1} -> #8#
- [gold >= 10] 포션을 구입한다 {gold -= 10, potion += 1} -> #2#
- 그냥 나간다 -> #2#

#5#
여관 안은 따뜻합니다. 벽의 지도에 동쪽 폐허에 던전이 있다고 표시되어 있습니다.
- [gold >= 5] 방을 빌린다 {gold -= 5, hp += 30} -> #2#
- 주인장에게 던전 정보를 묻는다 -> #9#
- 나간다 -> #2#

#6#
우물 안을 들여다보니 녹슨 열쇠가 보입니다.
- 열쇠를 꺼낸다 {key = 1} -> #2#
- 그냥 지나친다 -> #2#

#7#
고블린들을 물리쳤습니다! 금화를 주웠습니다.
- [sword == 1] 검을 들고 던전으로 향한다 -> #11#
- 마을로 돌아간다 -> #2#

#8#
노인이 건네준 검은 묵직하면서도 균형이 잘 잡혀 있습니다. ⚔️ 검 획득!
- 던전을 향해 떠난다 -> #11#
- 마을을 더 둘러본다 -> #2#

#9#
"동쪽 폐허 지하에 던전이 있소. 열쇠가 있어야 들어갈 수 있다더군..."
- 던전을 탐험하러 간다 -> #11#
- 더 준비하러 간다 -> #2#

#10#
산길 위에 낡은 수도원이 있습니다. 문은 굳게 잠혀 있습니다.
- [key == 1] 열쇠로 문을 열어본다 -> #12#
- 돌아간다 -> #1#

#11#
동쪽 폐허에 도착했습니다. 거대한 돌문 앞에서 목소리가 울립니다.
- [sword == 1] 검을 들고 당당히 들어선다 -> #13#
- [key == 1] 열쇠로 옆문을 열어 들어간다 -> #13#
- 도망친다 -> #2#

#12#
열쇠가 맞습니다! 수도원 문이 열리며 황금빛이 쏟아집니다. 🏆 보물 발견!
- 보물을 가지고 마을로 돌아간다 {gold += 100} -> #14#

#13#
던전 안에서 강력한 오우거가 나타납니다!
- [hp >= 70] 정면으로 싸운다 {hp -= 40} -> #15#
- [sword == 1] 검으로 빠르게 공격한다 {hp -= 20} -> #15#
- 도망친다 {hp -= 10} -> #2#

#14#
축하합니다! 마을로 돌아왔습니다. 🎉 행복한 결말.
- 처음부터 다시 시작한다 -> #1#

#15#
오우거를 물리쳤습니다! 🏆 던전 정복!
- 보물을 들고 마을로 돌아간다 {gold += 80} -> #14#
`;

// ─── INIT / DESTROY ───────────────────────────────────────────────────────────
let _savedStyles={};

return{
  init:async function(el,opts){
    _el=el;injectStyle();
    _savedStyles={padding:el.style.padding,overflowY:el.style.overflowY,
      display:el.style.display,flexDirection:el.style.flexDirection};
    el.style.padding='0';el.style.overflowY='hidden';
    el.style.display='flex';el.style.flexDirection='column';
    _stories=await DB.getSetting('trpgStories',[]);
    showList();
  },
  destroy:function(){
    if(_el)Object.assign(_el.style,_savedStyles);
    _el=null;
  }
};
})();
