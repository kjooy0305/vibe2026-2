'use strict';
window.Pages = window.Pages || {};
window.Pages.trpg = (function(){

// ─── CSS ─────────────────────────────────────────────────────────────────────
const STYLE_ID = 'trpg-style';
function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
/* TRPG overlay covers space between header and bottom-nav */
.trpg-overlay {
  position: fixed;
  top: calc(var(--header-h, 56px) + var(--safe-top, 0px));
  bottom: calc(var(--bottom-nav-h, 56px) + var(--safe-bottom, 0px));
  left: 0; right: 0;
  background: var(--color-bg, #0a0e1a);
  z-index: 200;
  display: flex; flex-direction: column;
  overflow: hidden;
  --tg: var(--color-accent, #f59e0b);
  --tg2: var(--color-warning, #f59e0b);
  --tpur: var(--color-secondary, #7c3aed);
}
/* header bar */
.trpg-hdr {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px;
  background: var(--color-surface);
  border-bottom: 2px solid var(--tg);
  flex-shrink: 0; flex-wrap: wrap;
}
.trpg-hdr h2 {
  font-size: 14px; font-weight: 700;
  color: var(--tg); letter-spacing: 1px; margin-right: auto;
}
/* ── PLAY ────────────────────────────────────────────────── */
.trpg-play-body {
  flex: 1; min-height: 0; display: flex; overflow: hidden;
}
.trpg-play-main {
  flex: 1; min-width: 0; display: flex; flex-direction: column;
  overflow: hidden; padding: 10px 14px; gap: 8px;
}
.trpg-scid { font-size: 11px; color: var(--color-text-muted); font-family: monospace; flex-shrink: 0; }
.trpg-ptxt {
  flex: 1; min-height: 0; overflow-y: auto;
  font-size: 14px; line-height: 1.9; white-space: pre-wrap;
  padding: 12px 14px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 8px; color: var(--color-text);
}
.trpg-choices { max-height: 210px; overflow-y: auto; flex-shrink: 0; }
.trpg-cbtn {
  display: block; width: 100%; padding: 9px 14px; margin-bottom: 5px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  color: var(--color-text); text-align: left; cursor: pointer;
  border-radius: 7px; font-size: 13px; font-family: inherit; transition: all .2s;
}
.trpg-cbtn::before { content: '▸ '; color: var(--tg); }
.trpg-cbtn:hover:not(.trpg-off) {
  background: var(--color-card, #1a2535); border-color: var(--tg); color: var(--tg); padding-left: 20px;
}
.trpg-off { opacity: .4; cursor: not-allowed; }
.trpg-ctag { font-size: 10px; color: var(--color-text-muted); display: block; margin-top: 1px; }
.trpg-gameover { text-align: center; padding: 20px; font-size: 16px; color: var(--tg); }
/* ── SIDE PANEL ──────────────────────────────────────────── */
.trpg-side {
  width: 200px; flex-shrink: 0;
  background: var(--color-surface); border-left: 1px solid var(--color-border);
  overflow-y: auto; display: flex; flex-direction: column;
}
.trpg-rsec { border-bottom: 1px solid var(--color-border); }
.trpg-rtitle {
  padding: 6px 10px; font-size: 10px; font-weight: 700;
  color: var(--tg); letter-spacing: 1px;
  background: var(--color-bg); border-bottom: 1px solid var(--color-border);
  cursor: pointer; user-select: none;
  display: flex; justify-content: space-between; align-items: center;
}
.trpg-rbody { padding: 8px 10px; }
.trpg-svrow {
  display: flex; justify-content: space-between; font-size: 12px;
  margin-bottom: 3px; padding-bottom: 3px;
  border-bottom: 1px dashed var(--color-border);
}
.trpg-svn { color: var(--color-text-muted); }
.trpg-svv { font-weight: 700; font-family: monospace; }
.trpg-dgrid { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 5px; }
.trpg-die {
  padding: 4px 8px; background: var(--color-card, #1a2535);
  border: 1px solid var(--color-border); color: var(--color-text);
  cursor: pointer; border-radius: 4px; font-size: 11px; font-weight: 700;
  font-family: monospace; transition: all .15s;
}
.trpg-die:hover { background: var(--tg); color: #000; border-color: var(--tg); }
.trpg-dres {
  font-size: 24px; font-weight: 900; color: var(--tg2);
  text-align: center; font-family: monospace; min-height: 30px; margin-bottom: 3px;
}
.trpg-dlog { font-size: 10px; color: var(--color-text-muted); font-family: monospace; max-height: 55px; overflow-y: auto; }
.trpg-memo {
  width: 100%; background: var(--color-bg); border: 1px solid var(--color-border);
  color: var(--color-text); border-radius: 4px; padding: 5px 7px;
  font-size: 12px; font-family: inherit; resize: none; outline: none; height: 65px;
}
.trpg-memo:focus { border-color: var(--tg); }
.trpg-hlog { font-size: 10px; color: var(--color-text-muted); max-height: 95px; overflow-y: auto; font-family: monospace; }
.trpg-hitem { padding: 2px 0; border-bottom: 1px solid var(--color-border); }
.trpg-hsc { color: var(--tpur); }
/* ── EDITOR ──────────────────────────────────────────────── */
.trpg-edit-body {
  flex: 1; min-height: 0; display: flex; overflow: hidden;
}
.trpg-lpanel {
  width: 180px; flex-shrink: 0;
  background: var(--color-surface); border-right: 1px solid var(--color-border);
  display: flex; flex-direction: column; overflow: hidden;
}
.trpg-lhdr {
  padding: 6px 9px; border-bottom: 1px solid var(--color-border);
  font-size: 10px; font-weight: 700; color: var(--tg);
  display: flex; align-items: center; justify-content: space-between;
}
.trpg-slist { flex: 1; overflow-y: auto; padding: 3px; }
.trpg-sli {
  padding: 5px 8px; cursor: pointer; border-radius: 4px; font-size: 11px;
  color: var(--color-text-muted); border: 1px solid transparent;
  margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.trpg-sli:hover, .trpg-sli.on {
  background: var(--color-card, #1a2535); color: var(--tg); border-color: var(--color-border);
}
.trpg-ecenter {
  flex: 1; min-width: 0; display: flex; flex-direction: column;
  overflow: hidden; padding: 10px; gap: 6px;
}
.trpg-elabel { font-size: 10px; font-weight: 700; color: var(--tg); letter-spacing: 1px; display: block; margin-bottom: 2px; }
.trpg-einput {
  width: 100%; background: var(--color-bg); border: 1px solid var(--color-border);
  color: var(--color-text); border-radius: 4px; padding: 5px 8px;
  font-family: inherit; font-size: 13px; outline: none; transition: border-color .2s;
}
.trpg-einput:focus { border-color: var(--tg); }
.trpg-etextarea { flex: 1; resize: none; min-height: 60px; }
.trpg-crow { display: flex; gap: 3px; margin-bottom: 4px; align-items: center; }
.trpg-crow input {
  background: var(--color-bg); border: 1px solid var(--color-border);
  color: var(--color-text); border-radius: 4px; padding: 3px 6px;
  font-size: 11px; font-family: inherit; outline: none;
}
.trpg-crow input:focus { border-color: var(--tg); }
.trpg-ci-t { flex: 2; } .trpg-ci-c { flex: 1; } .trpg-ci-e { flex: 1; } .trpg-ci-g { width: 50px; font-family: monospace; }
.trpg-xbtn {
  background: none; border: 1px solid rgba(239,68,68,.3); color: var(--color-danger);
  cursor: pointer; border-radius: 4px; padding: 2px 6px; font-size: 12px; flex-shrink: 0;
}
.trpg-eside {
  width: 195px; flex-shrink: 0;
  background: var(--color-surface); border-left: 1px solid var(--color-border);
  overflow-y: auto;
}
/* ── MOBILE TABS (editor) ────────────────────────────────── */
.trpg-tabs { display: none; }
.trpg-tab-btn {
  flex: 1; padding: 7px 4px; background: var(--color-surface); border: none;
  border-bottom: 2px solid var(--color-border); color: var(--color-text-muted);
  cursor: pointer; font-size: 12px; font-family: inherit; font-weight: 600;
}
.trpg-tab-btn.on { border-bottom-color: var(--tg); color: var(--tg); }
.trpg-tab-panel { display: none; flex: 1; min-height: 0; overflow: hidden; flex-direction: column; }
.trpg-tab-panel.on { display: flex; }
/* ── CHARACTER CARD ──────────────────────────────────────── */
.trpg-char-card {
  margin-bottom: 4px; padding: 5px 7px;
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 4px;
}
.trpg-char-name { font-size: 12px; font-weight: 700; color: var(--color-text); }
.trpg-char-role { font-size: 10px; color: var(--color-text-muted); margin-top: 1px; }
.trpg-gmnote {
  font-size: 11px; color: var(--color-text-muted); white-space: pre-wrap;
  background: rgba(245,158,11,.06); border: 1px solid rgba(245,158,11,.2);
  border-radius: 4px; padding: 5px 7px; line-height: 1.5; min-height: 18px;
}
/* ── LIST ────────────────────────────────────────────────── */
.trpg-list-wrap { flex: 1; overflow-y: auto; padding: 14px; }
.trpg-card {
  background: var(--color-card, #1a2535); border: 1px solid var(--color-border);
  border-radius: 10px; padding: 14px; margin-bottom: 10px;
}
.trpg-card__title { font-size: 15px; font-weight: 700; margin-bottom: 5px; color: var(--color-text); }
.trpg-card__meta { font-size: 11px; color: var(--color-text-muted); margin-bottom: 10px; }
.trpg-card__btns { display: flex; gap: 6px; flex-wrap: wrap; }

@media (max-width: 700px) {
  .trpg-side { display: none; }
  .trpg-lpanel { display: none; }
  .trpg-eside { display: none; }
  .trpg-tabs { display: flex; flex-shrink: 0; }
  .trpg-tab-panel.trpg-tab-mobile { display: none; }
  .trpg-tab-panel.trpg-tab-mobile.on { display: flex; }
}
`;
  document.head.appendChild(el);
}

// ─── STATE ───────────────────────────────────────────────────────────────────
let _el = null, _stories = [], _story = null;
let _P = { sceneId:'1', vars:{}, hist:[], dlog:[], scenes:{}, order:[], initVars:'' };
let _E = { scenes:{}, order:[], editId:null, initVars:'', title:'', gmNotes:{}, rulebook:'', scenarioNotes:'', characters:[] };

// ─── PARSER ──────────────────────────────────────────────────────────────────
function parseTxt(txt) {
  const scenes = {}, order = [];
  const blocks = txt.split(/(?=^#\w+#[ \t]*$)/m).filter(b => b.trim());
  for (const block of blocks) {
    const lines = block.split('\n');
    const hm = lines[0].trim().match(/^#(\w+)#$/);
    if (!hm) continue;
    const id = hm[1], choices = [], body = [];
    let iv = {};
    for (let i = 1; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) { body.push(''); continue; }
      if (t.startsWith('@vars:')) {
        t.slice(6).split(',').forEach(kv => {
          const p = kv.trim().split('=');
          if (p.length >= 2) { const k=p[0].trim(), v=p.slice(1).join('=').trim(); iv[k]=isNaN(v)?v:+v; }
        }); continue;
      }
      if (t.startsWith('- ')) { const c = parseCh(t.slice(2)); if (c) choices.push(c); continue; }
      body.push(lines[i]);
    }
    scenes[id] = { id, title:'', text: body.join('\n').trim(), choices, initVars: iv };
    order.push(id);
  }
  return { scenes, order };
}

function parseCh(raw) {
  let rest = raw.trim(), cond = null, tgt = null, eff = '';
  const cm = rest.match(/^\[([^\]]+)\]\s*/); if (cm) { cond=cm[1].trim(); rest=rest.slice(cm[0].length); }
  const am = rest.match(/\s*->\s*#(\w+)#\s*$/); if (am) { tgt=am[1]; rest=rest.slice(0, rest.length-am[0].length); }
  const em = rest.match(/\{([^}]+)\}\s*$/); if (em) { eff=em[1].trim(); rest=rest.slice(0, rest.length-em[0].length); }
  const text = rest.trim(); if (!text) return null;
  return { text, cond, eff, tgt };
}

function toTxt(scenes, order, ivText) {
  let out = '';
  const ids = order.length ? order : Object.keys(scenes).sort((a,b)=>(+a||0)-(+b||0)||a.localeCompare(b));
  ids.forEach((id, i) => {
    const s = scenes[id]; if (!s) return;
    out += `#${id}#\n`;
    if (i===0 && ivText && ivText.trim()) {
      const vl = ivText.trim().split('\n').map(l=>l.trim().replace(/\s*=\s*/,'=')).filter(Boolean).join(', ');
      if (vl) out += `@vars: ${vl}\n`;
    }
    if (s.text) out += s.text + '\n';
    (s.choices||[]).forEach(c => {
      let ln = '- ';
      if (c.cond) ln += `[${c.cond}] `;
      ln += c.text;
      if (c.eff) ln += ` {${c.eff}}`;
      if (c.tgt) ln += ` -> #${c.tgt}#`;
      out += ln + '\n';
    });
    out += '\n';
  });
  return out.trim();
}

// ─── ENGINE ──────────────────────────────────────────────────────────────────
function mkVars(ivText, scenes, order) {
  const v = {};
  (ivText||'').split('\n').forEach(l => {
    const m = l.trim().match(/^(\w+)\s*=\s*(.+)$/);
    if (m) { const k=m[1], val=m[2].trim(); v[k]=isNaN(val)?val:+val; }
  });
  const first = scenes && order && scenes[order[0]];
  if (first && first.initVars) Object.assign(v, first.initVars);
  return v;
}

function evalCond(expr, vars) {
  if (!expr) return true;
  const s = expr.trim();
  if (/^!?\w+$/.test(s)) {
    const neg = s[0]==='!', vn = neg?s.slice(1):s, val = vars[vn];
    const t = val!==undefined && val!==0 && val!==false && val!=='';
    return neg ? !t : t;
  }
  const m = s.match(/^(\w+)\s*(>=|<=|==|!=|>|<)\s*(.+)$/);
  if (!m) return true;
  const lhs = vars[m[1]]!==undefined ? +vars[m[1]] : 0;
  const rhs = isNaN(m[3].trim()) ? m[3].trim() : +m[3];
  switch(m[2]) { case'>=':return lhs>=rhs; case'<=':return lhs<=rhs; case'==':return lhs==rhs; case'!=':return lhs!=rhs; case'>':return lhs>rhs; case'<':return lhs<rhs; }
  return true;
}

function applyEff(eff, vars) {
  if (!eff) return vars;
  const v = {...vars};
  eff.split(/[,;]/).forEach(p => {
    const m = p.trim().match(/^(\w+)\s*(\+=|-=|\*=|\/=|=)\s*(.+)$/);
    if (!m) return;
    const vn=m[1], op=m[2], rhs=isNaN(m[3].trim())?m[3].trim():+m[3], cur=+v[vn]||0;
    switch(op) { case'=':v[vn]=rhs;break; case'+=':v[vn]=cur+(+rhs||0);break; case'-=':v[vn]=cur-(+rhs||0);break; case'*=':v[vn]=cur*(+rhs||1);break; case'/=':v[vn]=rhs?cur/+rhs:cur;break; }
  });
  return v;
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function esc(s) { return !s?'':String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function eA(s) { return esc(s).replace(/'/g,'&#39;'); }
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }
function tst(msg) { if(window.Utils&&Utils.toast) Utils.toast(msg,'info'); }
function saveStories() { return DB.setSetting('trpgStories', _stories); }

// ─── LIST VIEW ───────────────────────────────────────────────────────────────
function showList() {
  _story = null;
  _el.innerHTML = `
<div class="trpg-overlay">
  <div class="trpg-hdr">
    <h2>🎲 TRPG 게임북</h2>
    <button class="btn btn-ghost btn-sm" id="tpgSample">📖 예제 불러오기</button>
    <button class="btn btn-primary btn-sm" id="tpgNew">+ 새 이야기</button>
  </div>
  <div class="trpg-list-wrap" id="tpgListBody"></div>
</div>`;
  renderCards();
  document.getElementById('tpgNew').onclick = () => showEdit(null);
  document.getElementById('tpgSample').onclick = doLoadSample;
}

function renderCards() {
  const body = document.getElementById('tpgListBody');
  if (!body) return;
  if (!_stories.length) {
    body.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon">🎲</div>
      <div class="empty-state__title">이야기가 없습니다</div>
      <div class="empty-state__desc">+ 새 이야기를 눌러 만들거나, 예제를 불러오세요</div>
    </div>`;
    return;
  }
  body.innerHTML = _stories.map(s => {
    const cnt = parseTxt(s.content||'').order.length;
    const d = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString('ko-KR') : '';
    let saveInfo = '';
    try {
      const raw = localStorage.getItem('trpg_s_'+s.id);
      if (raw) { const sv = JSON.parse(raw); saveInfo = sv.sceneId ? ` (씬 #${sv.sceneId})` : ''; }
    } catch(e) {}
    const hasSave = saveInfo !== '';
    return `<div class="trpg-card">
      <div class="trpg-card__title">🎲 ${esc(s.title)}</div>
      <div class="trpg-card__meta">씬 ${cnt}개${d?' · '+d:''}${hasSave?` · 저장됨${saveInfo}`:''}</div>
      <div class="trpg-card__btns">
        <button class="btn btn-primary btn-sm" data-act="play" data-id="${eA(s.id)}">▶ 처음부터</button>
        ${hasSave?`<button class="btn btn-ghost btn-sm" data-act="continue" data-id="${eA(s.id)}" style="color:var(--color-success,#10b981);">⏮ 이어하기</button>`:''}
        <button class="btn btn-ghost btn-sm" data-act="edit" data-id="${eA(s.id)}">✏ 편집</button>
        <button class="btn btn-ghost btn-sm" data-act="del" data-id="${eA(s.id)}" style="color:var(--color-danger);">🗑</button>
      </div>
    </div>`;
  }).join('');
  body.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = _stories.find(x => x.id === btn.dataset.id);
      if (!s) return;
      const act = btn.dataset.act;
      if (act==='play') showPlay(s, false);
      else if (act==='continue') showPlay(s, true);
      else if (act==='edit') showEdit(s);
      else if (act==='del') doDelStory(s.id);
    });
  });
}

async function doDelStory(id) {
  if (!confirm('이 이야기를 삭제하시겠습니까?')) return;
  _stories = _stories.filter(s => s.id !== id);
  await saveStories();
  renderCards();
  tst('삭제되었습니다.');
}

async function doLoadSample() {
  if (_stories.find(s => s.title==='예제: 숲의 모험')) { tst('예제가 이미 있습니다.'); return; }
  const s = { id:uid(), title:'예제: 숲의 모험', content:SAMPLE,
    initVars:'hp = 100\ngold = 30\nsword = 0\npotion = 0\nkey = 0',
    createdAt:Date.now(), updatedAt:Date.now() };
  _stories.push(s);
  await saveStories();
  renderCards();
  tst('✅ 예제 시나리오가 추가되었습니다.');
}

// ─── PLAY VIEW ───────────────────────────────────────────────────────────────
function showPlay(story, autoLoad = false) {
  _story = story;
  const { scenes, order } = parseTxt(story.content||'');
  _P = { scenes, order, initVars:story.initVars||'', hist:[], dlog:[],
         sceneId:order[0]||'1', vars:{}, gmNotes:story.gmNotes||{} };
  _P.vars = mkVars(story.initVars||'', scenes, order);

  _el.innerHTML = `
<div class="trpg-overlay">
  <div class="trpg-hdr">
    <button class="btn btn-ghost btn-sm" id="pBack">← 목록</button>
    <h2 style="font-size:13px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(story.title)}</h2>
    <button class="btn btn-ghost btn-sm" id="pEdit">✏ 편집</button>
    <button class="btn btn-ghost btn-sm" id="pRestart">↺ 처음부터</button>
    <button class="btn btn-ghost btn-sm" id="pSave" title="수동 저장">💾 저장</button>
    <button class="btn btn-ghost btn-sm" id="pLoad" style="color:var(--color-success,#10b981);" title="이어하기">⏮ 이어하기</button>
  </div>
  <div class="trpg-play-body">
    <div class="trpg-play-main">
      <div class="trpg-scid" id="pScid"></div>
      <div class="trpg-ptxt" id="pTxt"></div>
      <div class="trpg-choices" id="pChoices"></div>
      <div id="pGameover" style="display:none;"></div>
    </div>
    <div class="trpg-side">
      <div class="trpg-rsec">
        <div class="trpg-rtitle" data-body="pStatB">⚔ 상태 <span id="pStTog">▲</span></div>
        <div class="trpg-rbody" id="pStatB"><div id="pVars"></div></div>
      </div>
      <div class="trpg-rsec">
        <div class="trpg-rtitle" data-body="pDiceB">🎲 주사위 <span id="pDTog">▲</span></div>
        <div class="trpg-rbody" id="pDiceB">
          <div class="trpg-dgrid">
            ${[4,6,8,10,12,20,100].map(n=>`<button class="trpg-die" data-n="${n}">d${n}</button>`).join('')}
          </div>
          <div class="trpg-dres" id="pDres">-</div>
          <div class="trpg-dlog" id="pDlog"></div>
        </div>
      </div>
      <div class="trpg-rsec">
        <div class="trpg-rtitle">📝 메모</div>
        <div class="trpg-rbody">
          <textarea class="trpg-memo" id="pMemo" placeholder="단서, 메모..."></textarea>
        </div>
      </div>
      <div class="trpg-rsec">
        <div class="trpg-rtitle" data-body="pHistB">📜 히스토리 <span id="pHTog">▲</span></div>
        <div class="trpg-rbody" id="pHistB">
          <button class="btn btn-ghost btn-sm" id="pClrHist" style="width:100%;font-size:10px;margin-bottom:4px;">기록 지우기</button>
          <div class="trpg-hlog" id="pHlog"></div>
        </div>
      </div>
      ${story.rulebook ? `
      <div class="trpg-rsec">
        <div class="trpg-rtitle" data-body="pRulB">📖 룰북 <span>▼</span></div>
        <div class="trpg-rbody" id="pRulB" style="display:none;">
          <div style="font-size:11px;white-space:pre-wrap;color:var(--color-text);line-height:1.6;">${esc(story.rulebook)}</div>
        </div>
      </div>` : ''}
      ${(story.characters||[]).length ? `
      <div class="trpg-rsec">
        <div class="trpg-rtitle" data-body="pCharB">👤 캐릭터 <span>▼</span></div>
        <div class="trpg-rbody" id="pCharB" style="display:none;">
          ${(story.characters||[]).map(c => `
            <div style="margin-bottom:7px;padding-bottom:7px;border-bottom:1px dashed var(--color-border);">
              <div style="font-size:12px;font-weight:700;color:var(--tg);">${esc(c.name)}</div>
              ${c.desc ? `<div style="font-size:10px;color:var(--color-text-muted);">${esc(c.desc)}</div>` : ''}
              ${Object.keys(c.stats||{}).length ? Object.entries(c.stats).map(([k,v])=>`
                <div class="trpg-svrow"><span class="trpg-svn">${esc(k)}</span><span class="trpg-svv">${esc(String(v))}</span></div>`).join('') : ''}
              ${c.items ? `<div style="font-size:10px;color:var(--color-text-muted);margin-top:2px;">${esc(c.items)}</div>` : ''}
            </div>`).join('')}
        </div>
      </div>` : ''}
      ${Object.values(story.gmNotes||{}).some(v=>v) ? `
      <div class="trpg-rsec">
        <div class="trpg-rtitle" data-body="pGmNB">🔒 GM 노트 <span>▼</span></div>
        <div class="trpg-rbody" id="pGmNB" style="display:none;">
          <div class="trpg-gmnote" id="pGmNote"></div>
        </div>
      </div>` : ''}
    </div>
  </div>
</div>`;

  // wire header
  document.getElementById('pBack').onclick = showList;
  document.getElementById('pEdit').onclick = () => showEdit(story);
  document.getElementById('pRestart').onclick = () => {
    _P.vars = mkVars(_P.initVars, _P.scenes, _P.order);
    _P.hist = []; _P.sceneId = _P.order[0]||'1';
    renderScene(_P.sceneId); updateStats(); updateHist(); tst('재시작합니다.');
  };
  document.getElementById('pSave').onclick = () => {
    try {
      localStorage.setItem('trpg_s_'+story.id, JSON.stringify({sceneId:_P.sceneId,vars:_P.vars,hist:_P.hist}));
      const m = document.getElementById('pMemo'); if(m) localStorage.setItem('trpg_m_'+story.id, m.value);
    } catch(e) {}
    tst('💾 저장되었습니다.');
  };
  document.getElementById('pLoad').onclick = () => {
    try {
      const raw = localStorage.getItem('trpg_s_'+story.id);
      if (raw) { const d=JSON.parse(raw); _P.sceneId=d.sceneId||_P.order[0]; _P.vars=d.vars||{}; _P.hist=d.hist||[]; }
      const mv = localStorage.getItem('trpg_m_'+story.id);
      const m = document.getElementById('pMemo'); if(m&&mv) m.value=mv;
    } catch(e) {}
    renderScene(_P.sceneId); updateStats(); updateHist(); tst('⏮ 이어하기 완료.');
  };
  document.getElementById('pClrHist').onclick = () => { _P.hist=[]; updateHist(); };

  // section toggles
  document.querySelectorAll('.trpg-rtitle[data-body]').forEach(t => {
    t.addEventListener('click', () => {
      const b = document.getElementById(t.dataset.body);
      const sp = t.querySelector('span');
      if (!b) return;
      const hidden = b.style.display==='none';
      b.style.display = hidden ? 'block' : 'none';
      if (sp) sp.textContent = hidden ? '▲' : '▼';
    });
  });

  // dice
  document.querySelectorAll('.trpg-die').forEach(d => {
    d.addEventListener('click', () => {
      const n = +d.dataset.n, r = Math.floor(Math.random()*n)+1;
      const res = document.getElementById('pDres'); if(res) res.textContent = r;
      _P.dlog.unshift(`d${n}: ${r}`); if(_P.dlog.length>20) _P.dlog.pop();
      const dl = document.getElementById('pDlog');
      if(dl) dl.innerHTML = _P.dlog.slice(0,8).map(l=>`<div>${esc(l)}</div>`).join('');
    });
  });

  // memo autosave
  const memo = document.getElementById('pMemo');
  const savedMemo = localStorage.getItem('trpg_m_'+story.id);
  if (memo && savedMemo) memo.value = savedMemo;
  if (memo) memo.addEventListener('input', e => localStorage.setItem('trpg_m_'+story.id, e.target.value));

  renderScene(_P.sceneId);
  updateStats();
  updateHist();

  // 이어하기 자동 로드
  if (autoLoad) {
    try {
      const raw = localStorage.getItem('trpg_s_'+story.id);
      if (raw) {
        const d = JSON.parse(raw);
        _P.sceneId = d.sceneId || _P.order[0];
        _P.vars = d.vars || {};
        _P.hist = d.hist || [];
        const mv = localStorage.getItem('trpg_m_'+story.id);
        const m = document.getElementById('pMemo'); if (m && mv) m.value = mv;
        renderScene(_P.sceneId); updateStats(); updateHist();
        tst('⏮ 이어하기 완료. (씬 #'+_P.sceneId+'#)');
      } else {
        tst('저장된 진행이 없습니다. 처음부터 시작합니다.');
      }
    } catch(e) {}
  }
}

function autoSave() {
  if (!_story?.id || _story.id === '_test') return;
  try {
    localStorage.setItem('trpg_s_'+_story.id,
      JSON.stringify({ sceneId:_P.sceneId, vars:_P.vars, hist:_P.hist }));
  } catch(e) {}
}

function renderScene(id) {
  const sc = _P.scenes[id];
  _P.sceneId = id;
  const scidEl = document.getElementById('pScid');
  const txtEl  = document.getElementById('pTxt');
  const choEl  = document.getElementById('pChoices');
  const goEl   = document.getElementById('pGameover');
  if (!scidEl||!txtEl||!choEl||!goEl) return;

  goEl.style.display = 'none';
  choEl.innerHTML = '';
  scidEl.textContent = `#${id}#${sc?.title?' — '+sc.title:''}`;
  txtEl.textContent = sc ? sc.text : '❌ 씬을 찾을 수 없습니다: #'+id+'#';
  const gnEl = document.getElementById('pGmNote');
  if (gnEl) gnEl.textContent = _P.gmNotes[id] || '(이 씬에 GM 노트 없음)';
  if (!sc) return;

  const chs = sc.choices||[];
  if (!chs.length) {
    goEl.style.display = 'block';
    goEl.className = 'trpg-gameover';
    goEl.innerHTML = `<div style="font-size:28px;margin-bottom:8px;">⚜</div>
      <div>— 이야기가 끝났습니다 —</div><br>
      <button class="btn btn-ghost btn-sm" id="pRestEnd">↺ 다시 시작</button>`;
    setTimeout(() => {
      const b = document.getElementById('pRestEnd');
      if (b) b.onclick = () => {
        _P.vars=mkVars(_P.initVars,_P.scenes,_P.order); _P.hist=[]; _P.sceneId=_P.order[0]||'1';
        renderScene(_P.sceneId); updateStats(); updateHist();
      };
    }, 0);
    return;
  }

  chs.forEach(ch => {
    const ok = evalCond(ch.cond, _P.vars);
    const btn = document.createElement('button');
    btn.className = 'trpg-cbtn' + (ok?'':' trpg-off');
    let html = esc(ch.text);
    if (ch.cond) html += `<span class="trpg-ctag">[${esc(ch.cond)}] ${ok?'✓':'✗ 조건 미충족'}</span>`;
    btn.innerHTML = html;
    if (ok) btn.addEventListener('click', () => {
      if (ch.eff) _P.vars = applyEff(ch.eff, _P.vars);
      _P.hist.unshift({ from:id, txt:ch.text });
      if (ch.tgt) _P.sceneId = ch.tgt;
      updateStats(); updateHist();
      autoSave();
      if (ch.tgt) { renderScene(ch.tgt); txtEl.scrollTop=0; }
      else { txtEl.textContent='⚠️ 이동할 씬 ID가 없습니다.'; choEl.innerHTML=''; }
    });
    choEl.appendChild(btn);
  });
}

function updateStats() {
  const el = document.getElementById('pVars'); if(!el) return;
  const v = _P.vars;
  if (!v||!Object.keys(v).length) { el.innerHTML='<div style="font-size:11px;color:var(--color-text-muted);">변수 없음</div>'; return; }
  el.innerHTML = Object.entries(v).map(([k,val]) => {
    let col = 'var(--color-warning)';
    if (k==='hp') { const n=+val; col=n>60?'var(--color-success)':n>20?'var(--color-warning)':'var(--color-danger)'; }
    return `<div class="trpg-svrow">
      <span class="trpg-svn">${esc(k.toUpperCase())}</span>
      <span class="trpg-svv" style="color:${col};">${esc(String(val))}</span>
    </div>`;
  }).join('');
}

function updateHist() {
  const el = document.getElementById('pHlog'); if(!el) return;
  el.innerHTML = _P.hist.length
    ? _P.hist.slice(0,25).map(h=>`<div class="trpg-hitem"><span class="trpg-hsc">#${esc(h.from)}#</span> → ${esc(h.txt)}</div>`).join('')
    : '<div style="color:var(--color-text-muted);">기록 없음</div>';
}

// ─── EDIT VIEW ───────────────────────────────────────────────────────────────
function showEdit(story) {
  _story = story;
  if (story) {
    const { scenes, order } = parseTxt(story.content||'');
    _E = { scenes, order, editId:null, initVars:story.initVars||'', title:story.title||'',
           gmNotes:story.gmNotes||{}, rulebook:story.rulebook||'',
           scenarioNotes:story.scenarioNotes||'', characters:story.characters||[] };
  } else {
    _E = { scenes:{}, order:[], editId:null, initVars:'hp = 100\ngold = 30\nsword = 0', title:'',
           gmNotes:{}, rulebook:'', scenarioNotes:'', characters:[] };
  }

  _el.innerHTML = `
<div class="trpg-overlay">
  <div class="trpg-hdr">
    <button class="btn btn-ghost btn-sm" id="eBack">← 목록</button>
    <input class="trpg-einput" id="eTitle" placeholder="이야기 제목 (필수)"
      value="${eA(_E.title)}" style="flex:1;max-width:240px;font-size:14px;font-weight:700;"/>
    <button class="btn btn-primary btn-sm" id="eSaveSt">💾 저장</button>
    <button class="btn btn-ghost btn-sm" id="ePlay">▶ 테스트</button>
    <button class="btn btn-ghost btn-sm" id="eExport">📄 내보내기</button>
    <button class="btn btn-ghost btn-sm" id="eImport">📂 불러오기</button>
    <input type="file" id="eFileIn" accept=".txt" style="display:none;"/>
  </div>

  <!-- Mobile tabs -->
  <div class="trpg-tabs" id="eTabs">
    <button class="trpg-tab-btn on" data-tab="eTabList">씬 목록</button>
    <button class="trpg-tab-btn" data-tab="eTabEdit">씬 편집</button>
    <button class="trpg-tab-btn" data-tab="eTabVars">설정/룰북</button>
  </div>

  <div class="trpg-edit-body">
    <!-- Scene ID datalist for choice autocomplete -->
    <datalist id="trpg-sid-list"></datalist>
    <!-- LEFT: Scene list -->
    <div class="trpg-lpanel trpg-tab-panel trpg-tab-mobile on" id="eTabList">
      <div class="trpg-lhdr">
        씬 목록
        <button class="btn btn-ghost btn-sm" id="eNewSc" style="padding:2px 8px;font-size:11px;">+ 새 씬</button>
      </div>
      <div id="eScLinkHint" style="padding:3px 7px 3px;font-size:9px;color:var(--tpur,#7c3aed);display:none;border-bottom:1px solid var(--color-border);">
        📌 클릭하면 이동ID 자동 입력
      </div>
      <div class="trpg-slist" id="eScList"></div>
    </div>

    <!-- CENTER: Scene editor -->
    <div class="trpg-ecenter trpg-tab-panel trpg-tab-mobile" id="eTabEdit">
      <div style="display:flex;gap:6px;align-items:flex-end;flex-shrink:0;">
        <div>
          <label class="trpg-elabel">씬 ID</label>
          <input class="trpg-einput" id="eId" style="width:65px;" placeholder="1"/>
        </div>
        <div style="flex:1;">
          <label class="trpg-elabel">씬 제목 (선택)</label>
          <input class="trpg-einput" id="eScTitle" placeholder="제목"/>
        </div>
      </div>
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;">
        <label class="trpg-elabel">본문 텍스트</label>
        <textarea class="trpg-einput trpg-etextarea" id="eText" placeholder="이 장면의 이야기를 써주세요..."></textarea>
      </div>
      <div style="flex-shrink:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <label class="trpg-elabel" style="margin:0;">선택지</label>
          <button class="btn btn-ghost btn-sm" id="eAddCh" style="padding:2px 8px;font-size:10px;">+ 추가</button>
        </div>
        <div style="font-size:10px;color:var(--color-text-muted);margin-bottom:3px;">텍스트 | 조건(hp>=5) | 효과(hp-=5) | 이동씬ID</div>
        <div id="eCed" style="max-height:120px;overflow-y:auto;"></div>
      </div>
      <div style="flex-shrink:0;">
        <label class="trpg-elabel">🔒 GM 노트 (플레이 시 비공개)</label>
        <textarea class="trpg-einput" id="eGmNote" rows="2"
          style="resize:none;font-size:11px;font-family:monospace;"
          placeholder="이 씬의 GM 전용 메모 (복선, 힌트, 숨겨진 정보 등)"></textarea>
      </div>
      <div style="display:flex;gap:5px;flex-shrink:0;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" id="eSaveSc">💾 씬 저장</button>
        <button class="btn btn-ghost btn-sm" id="eDelSc" style="color:var(--color-danger);">🗑 씬 삭제</button>
        <button class="btn btn-ghost btn-sm" id="eToList" style="display:none;">← 씬 목록</button>
      </div>
    </div>

    <!-- RIGHT: Vars + Rulebook + Characters -->
    <div class="trpg-eside trpg-tab-panel trpg-tab-mobile" id="eTabVars">
      <div class="trpg-rsec">
        <div class="trpg-rtitle">📐 초기 변수</div>
        <div class="trpg-rbody">
          <div style="font-size:10px;color:var(--color-text-muted);margin-bottom:4px;line-height:1.5;">한 줄에 변수 하나<br>예) hp = 100</div>
          <textarea class="trpg-einput" id="eIVars" rows="4"
            style="resize:none;font-family:monospace;font-size:11px;"
            placeholder="hp = 100&#10;gold = 30">${eA(_E.initVars)}</textarea>
        </div>
      </div>
      <div class="trpg-rsec">
        <div class="trpg-rtitle">📖 룰북</div>
        <div class="trpg-rbody">
          <div style="font-size:10px;color:var(--color-text-muted);margin-bottom:4px;line-height:1.5;">세계관·전투·판정 규칙을 자유롭게 작성</div>
          <textarea class="trpg-einput" id="eRulebook" rows="6"
            style="resize:none;font-size:11px;font-family:monospace;"
            placeholder="예) 판정: d20 + 능력치&#10;20이상 대성공, 1이하 치명실패&#10;전투: 이니셔티브 → 공격 → 방어">${eA(_E.rulebook)}</textarea>
        </div>
      </div>
      <div class="trpg-rsec">
        <div class="trpg-rtitle">📝 시나리오 노트</div>
        <div class="trpg-rbody">
          <div style="font-size:10px;color:var(--color-text-muted);margin-bottom:4px;line-height:1.5;">주요 NPC, 사건 개요, GM 힌트</div>
          <textarea class="trpg-einput" id="eScenNotes" rows="4"
            style="resize:none;font-size:11px;"
            placeholder="사건의 발단, 핵심 단서, NPC 동기...">${eA(_E.scenarioNotes)}</textarea>
        </div>
      </div>
      <div class="trpg-rsec">
        <div class="trpg-rtitle" style="cursor:default;">
          👤 캐릭터 시트
          <button class="btn btn-ghost btn-sm" id="eAddChar" style="padding:1px 6px;font-size:10px;">+</button>
        </div>
        <div class="trpg-rbody" id="eCharList"></div>
      </div>
      <div class="trpg-rsec">
        <div class="trpg-rtitle">📋 TXT 문법</div>
        <div class="trpg-rbody" style="font-size:10px;color:var(--color-text-muted);line-height:1.7;">
          <code style="color:var(--tg,#f59e0b);">#씬ID#</code> — 씬 구분<br>
          <code style="color:var(--tg,#f59e0b);">- 텍스트 -> #씬ID#</code><br>
          <code style="color:var(--tg,#f59e0b);">- [조건] 텍스트 {효과} -> #씬ID#</code><br><br>
          <b>조건:</b> hp>=5, gold&lt;10, sword==1<br>
          <b>효과:</b> hp-=10, gold+=5, key=1<br>
          <b>플래그:</b> flag=1 설정 후 [flag] 조건 사용
        </div>
      </div>
    </div>
  </div>
</div>`;

  // Mobile tab switching
  document.querySelectorAll('#eTabs .trpg-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#eTabs .trpg-tab-btn').forEach(b => b.classList.remove('on'));
      document.querySelectorAll('.trpg-tab-mobile').forEach(p => p.classList.remove('on'));
      btn.classList.add('on');
      document.getElementById(btn.dataset.tab)?.classList.add('on');
    });
  });

  // ← 씬 목록 button (mobile only, shown after editing)
  document.getElementById('eToList').addEventListener('click', () => {
    document.querySelectorAll('#eTabs .trpg-tab-btn').forEach((b,i) => b.classList.toggle('on', i===0));
    document.querySelectorAll('.trpg-tab-mobile').forEach((p,i) => p.classList.toggle('on', i===0));
  });

  // wire buttons
  document.getElementById('eBack').addEventListener('click', () => {
    if (confirm('목록으로 돌아가시겠습니까? 저장하지 않은 변경은 사라집니다.')) showList();
  });
  document.getElementById('eSaveSt').addEventListener('click', doSaveStory);
  document.getElementById('eNewSc').addEventListener('click', doNewSc);
  document.getElementById('eSaveSc').addEventListener('click', doSaveSc);
  document.getElementById('eDelSc').addEventListener('click', doDelSc);
  document.getElementById('ePlay').addEventListener('click', () => {
    doSaveSc();
    const iv = document.getElementById('eIVars').value;
    const title = document.getElementById('eTitle').value || '테스트';
    showPlay({ id:_story?.id||'_test', title, content:toTxt(_E.scenes,_E.order,iv), initVars:iv,
               rulebook:_E.rulebook, scenarioNotes:_E.scenarioNotes,
               characters:_E.characters, gmNotes:_E.gmNotes });
  });
  document.getElementById('eExport').addEventListener('click', () => {
    const iv = document.getElementById('eIVars').value;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([toTxt(_E.scenes,_E.order,iv)], {type:'text/plain;charset=utf-8'}));
    a.download = (document.getElementById('eTitle').value||'scenario') + '.txt';
    a.click(); URL.revokeObjectURL(a.href); tst('📄 내보내기 완료.');
  });
  document.getElementById('eImport').addEventListener('click', () => document.getElementById('eFileIn').click());
  document.getElementById('eFileIn').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      const { scenes, order } = parseTxt(ev.target.result);
      if (!order.length) { tst('파싱 실패. 형식을 확인하세요.'); return; }
      _E.scenes = scenes; _E.order = order;
      const fi = scenes[order[0]];
      if (fi?.initVars && Object.keys(fi.initVars).length) {
        const iv = Object.entries(fi.initVars).map(([k,v])=>`${k} = ${v}`).join('\n');
        _E.initVars = iv;
        const ivEl = document.getElementById('eIVars'); if(ivEl) ivEl.value = iv;
      }
      buildSceneList(); tst('✅ '+order.length+'개 씬 불러오기 완료.');
    };
    r.readAsText(f, 'utf-8'); e.target.value = '';
  });
  document.getElementById('eAddCh').addEventListener('click', () => {
    const r = document.createElement('div'); r.className = 'trpg-crow';
    r.innerHTML = `<input class="trpg-ci-t" placeholder="선택지 텍스트"/>
      <input class="trpg-ci-c" placeholder="조건"/>
      <input class="trpg-ci-e" placeholder="효과"/>
      <input class="trpg-ci-g" placeholder="이동ID" list="trpg-sid-list"/>
      <button class="trpg-xbtn" type="button">✕</button>`;
    r.querySelector('.trpg-xbtn').onclick = () => r.remove();
    document.getElementById('eCed').appendChild(r);
    updateSceneDatalist();
  });
  document.getElementById('eIVars').addEventListener('input', e => { _E.initVars = e.target.value; });
  document.getElementById('eRulebook').addEventListener('input', e => { _E.rulebook = e.target.value; });
  document.getElementById('eScenNotes').addEventListener('input', e => { _E.scenarioNotes = e.target.value; });
  document.getElementById('eAddChar').addEventListener('click', () => doEditChar(null));

  buildSceneList();
  renderCharList();
  if (_E.order.length) loadSceneToEditor(_E.order[0]);
}

function buildSceneList() {
  const el = document.getElementById('eScList'); if (!el) return;
  if (!_E.order.length) {
    el.innerHTML = '<div style="padding:8px;font-size:11px;color:var(--color-text-muted);">씬이 없습니다.<br>+ 새 씬을 클릭하세요.</div>';
    updateSceneDatalist();
    return;
  }
  el.innerHTML = _E.order.map(id => {
    const s = _E.scenes[id];
    if (!s) return '';
    const lbl = `#${id}# ${s.title||s.text?.slice(0,14)||''}`.trim();
    const tgts = [...new Set((s.choices||[]).map(c=>c.tgt).filter(Boolean))];
    const tgtHtml = tgts.length
      ? `<div style="font-size:9px;color:var(--tpur,#7c3aed);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">→ ${tgts.map(t=>`#${esc(t)}#`).join(' ')}</div>`
      : '';
    return `<div class="trpg-sli${_E.editId===id?' on':''}" data-id="${eA(id)}">${esc(lbl)}${tgtHtml}</div>`;
  }).join('');
  el.querySelectorAll('.trpg-sli').forEach(d => {
    d.addEventListener('click', () => {
      // 이동ID 입력란이 포커스된 상태면 해당 씬 ID를 채워줌
      const focused = document.activeElement;
      if (focused && focused.classList.contains('trpg-ci-g')) {
        focused.value = d.dataset.id;
        focused.dispatchEvent(new Event('change'));
        return;
      }
      loadSceneToEditor(d.dataset.id);
      const editBtn = document.querySelector('#eTabs .trpg-tab-btn[data-tab="eTabEdit"]');
      if (editBtn && editBtn.offsetParent !== null) editBtn.click();
    });
  });
  updateSceneDatalist();
}

function updateSceneDatalist() {
  const dl = document.getElementById('trpg-sid-list'); if (!dl) return;
  dl.innerHTML = _E.order.map(id => {
    const s = _E.scenes[id];
    const label = s?.title ? ` — ${s.title}` : (s?.text ? ` — ${s.text.slice(0,20)}` : '');
    return `<option value="${eA(id)}">${esc(id)}${esc(label)}</option>`;
  }).join('');
}

function loadSceneToEditor(id) {
  const s = _E.scenes[id]; if (!s) return;
  _E.editId = id;
  const set = (elId, val) => { const e=document.getElementById(elId); if(e) e.value=val; };
  set('eId', id); set('eScTitle', s.title||''); set('eText', s.text||'');
  set('eGmNote', _E.gmNotes[id]||'');
  const ced = document.getElementById('eCed');
  if (ced) ced.innerHTML = (s.choices||[]).map(c => `
    <div class="trpg-crow">
      <input class="trpg-ci-t" value="${eA(c.text||'')}" placeholder="텍스트"/>
      <input class="trpg-ci-c" value="${eA(c.cond||'')}" placeholder="조건"/>
      <input class="trpg-ci-e" value="${eA(c.eff||'')}" placeholder="효과"/>
      <input class="trpg-ci-g" value="${eA(c.tgt||'')}" placeholder="이동ID" list="trpg-sid-list"/>
      <button class="trpg-xbtn" type="button">✕</button>
    </div>`).join('');
  ced?.querySelectorAll('.trpg-xbtn').forEach(b => b.onclick=()=>b.closest('.trpg-crow').remove());
  // 이동ID 입력 포커스 시 씬 목록 힌트 표시
  ced?.addEventListener('focusin', e => {
    const hint = document.getElementById('eScLinkHint');
    if (hint) hint.style.display = e.target.classList.contains('trpg-ci-g') ? 'block' : 'none';
  }, true);
  ced?.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!document.activeElement?.classList.contains('trpg-ci-g')) {
        const hint = document.getElementById('eScLinkHint');
        if (hint) hint.style.display = 'none';
      }
    }, 150);
  }, true);
  buildSceneList();
}

function getChoices() {
  return [...(document.getElementById('eCed')?.querySelectorAll('.trpg-crow')||[])].map(r => ({
    text: r.querySelector('.trpg-ci-t').value.trim(),
    cond: r.querySelector('.trpg-ci-c').value.trim(),
    eff:  r.querySelector('.trpg-ci-e').value.trim(),
    tgt:  r.querySelector('.trpg-ci-g').value.trim(),
  })).filter(c => c.text);
}

function doSaveSc() {
  const id = document.getElementById('eId')?.value.trim();
  if (!id) { tst('씬 ID를 입력하세요.'); return; }
  const gmNote = document.getElementById('eGmNote')?.value || '';
  const s = {
    id,
    title: document.getElementById('eScTitle').value.trim(),
    text: document.getElementById('eText').value.trim(),
    choices: getChoices(),
    initVars: _E.scenes[id]?.initVars || {},
  };
  if (_E.editId && _E.editId !== id) {
    delete _E.scenes[_E.editId];
    // GM 노트도 새 ID로 이전
    if (_E.gmNotes[_E.editId] !== undefined) {
      _E.gmNotes[id] = _E.gmNotes[_E.editId];
      delete _E.gmNotes[_E.editId];
    }
    const i = _E.order.indexOf(_E.editId); if(i>=0) _E.order[i]=id; else _E.order.push(id);
  } else if (!_E.scenes[id]) {
    _E.order.push(id);
  }
  _E.gmNotes[id] = gmNote;
  _E.scenes[id] = s; _E.editId = id;
  buildSceneList(); tst('씬 저장됨.');
}

function doDelSc() {
  if (!_E.editId || !confirm(`씬 #${_E.editId}#을 삭제하시겠습니까?`)) return;
  delete _E.scenes[_E.editId];
  delete _E.gmNotes[_E.editId];
  _E.order = _E.order.filter(i => i!==_E.editId);
  _E.editId = null;
  ['eId','eScTitle','eText','eGmNote'].forEach(id => { const e=document.getElementById(id); if(e) e.value=''; });
  const ced = document.getElementById('eCed'); if(ced) ced.innerHTML='';
  buildSceneList(); tst('삭제되었습니다.');
}

function doNewSc() {
  // 현재 편집 중인 씬이 있으면 먼저 저장
  if (_E.editId && _E.scenes[_E.editId]) {
    const curId = document.getElementById('eId')?.value.trim();
    if (curId) doSaveSc();
  }
  // 이미 존재하지 않는 ID 찾기
  const nums = _E.order.map(id=>+id).filter(n=>!isNaN(n));
  let nextNum = nums.length ? Math.max(...nums)+1 : 1;
  let nextId = String(nextNum);
  while (_E.scenes[nextId]) { nextNum++; nextId = String(nextNum); }
  _E.scenes[nextId] = { id: nextId, title: '', text: '', choices: [], initVars: {} };
  _E.order.push(nextId);
  loadSceneToEditor(nextId);
  // On mobile: switch to edit tab
  const editBtn = document.querySelector('#eTabs .trpg-tab-btn[data-tab="eTabEdit"]');
  if (editBtn && editBtn.offsetParent !== null) editBtn.click();
  tst('새 씬 #' + nextId + '# 생성됨.');
}

async function doSaveStory() {
  const title = document.getElementById('eTitle')?.value.trim();
  if (!title) { tst('이야기 제목을 입력하세요.'); return; }
  const id = document.getElementById('eId')?.value.trim();
  if (id) doSaveSc();
  const iv = document.getElementById('eIVars')?.value || '';
  const content = toTxt(_E.scenes, _E.order, iv);
  const extra = { rulebook:_E.rulebook, scenarioNotes:_E.scenarioNotes,
                  characters:_E.characters, gmNotes:_E.gmNotes };
  const now = Date.now();
  if (_story && _stories.find(s=>s.id===_story.id)) {
    const idx = _stories.findIndex(s=>s.id===_story.id);
    _stories[idx] = { ..._stories[idx], title, content, initVars:iv, ...extra, updatedAt:now };
    _story = _stories[idx];
  } else {
    const ns = { id:uid(), title, content, initVars:iv, ...extra, createdAt:now, updatedAt:now };
    _stories.push(ns); _story = ns;
  }
  await saveStories(); tst('✅ 저장되었습니다.');
}

// ─── CHARACTER SHEET ─────────────────────────────────────────────────────────
function renderCharList() {
  const el = document.getElementById('eCharList'); if (!el) return;
  if (!_E.characters.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--color-text-muted);">캐릭터가 없습니다.<br>+ 버튼으로 추가하세요.</div>';
    return;
  }
  el.innerHTML = _E.characters.map(c => `
    <div class="trpg-char-card">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="trpg-char-name">${esc(c.name||'이름 없음')}</span>
        <div style="display:flex;gap:2px;">
          <button class="trpg-xbtn" style="border-color:rgba(99,102,241,.4);color:var(--tpur,#7c3aed);"
            data-ced="${eA(c.id)}">편집</button>
          <button class="trpg-xbtn" data-cdel="${eA(c.id)}">✕</button>
        </div>
      </div>
      ${c.desc ? `<div class="trpg-char-role">${esc(c.desc)}</div>` : ''}
      ${Object.keys(c.stats||{}).length ? `<div style="margin-top:3px;">${Object.entries(c.stats).slice(0,3).map(([k,v])=>`<span style="font-size:10px;font-family:monospace;color:var(--color-text-muted);margin-right:6px;">${esc(k)}:${esc(String(v))}</span>`).join('')}</div>` : ''}
    </div>`).join('');
  el.querySelectorAll('[data-ced]').forEach(b => b.addEventListener('click', () => doEditChar(b.dataset.ced)));
  el.querySelectorAll('[data-cdel]').forEach(b => b.addEventListener('click', () => doDelChar(b.dataset.cdel)));
}

function doEditChar(id) {
  const isNew = !id;
  const orig = id ? _E.characters.find(x => x.id === id) : null;
  const c = orig || { id: uid(), name:'', desc:'', stats:{}, items:'' };
  const statsText = Object.entries(c.stats||{}).map(([k,v]) => `${k} = ${v}`).join('\n');

  const body = `<div style="display:flex;flex-direction:column;gap:10px;padding:2px 0;">
    <div>
      <label style="font-size:11px;font-weight:700;color:var(--color-accent,#f59e0b);display:block;margin-bottom:3px;">이름 *</label>
      <input class="trpg-einput" id="ceditName" value="${eA(c.name)}" placeholder="캐릭터 이름"/>
    </div>
    <div>
      <label style="font-size:11px;font-weight:700;color:var(--color-accent,#f59e0b);display:block;margin-bottom:3px;">역할 / 설명</label>
      <input class="trpg-einput" id="ceditDesc" value="${eA(c.desc)}" placeholder="전사 PC, 상인 NPC 등"/>
    </div>
    <div>
      <label style="font-size:11px;font-weight:700;color:var(--color-accent,#f59e0b);display:block;margin-bottom:3px;">스탯 (줄당 하나, 예: hp = 100)</label>
      <textarea class="trpg-einput" id="ceditStats" rows="5"
        style="resize:none;font-family:monospace;font-size:11px;"
        placeholder="hp = 100&#10;str = 16&#10;dex = 12&#10;int = 10">${eA(statsText)}</textarea>
    </div>
    <div>
      <label style="font-size:11px;font-weight:700;color:var(--color-accent,#f59e0b);display:block;margin-bottom:3px;">소지품 / 메모</label>
      <textarea class="trpg-einput" id="ceditItems" rows="2"
        style="resize:none;font-size:11px;"
        placeholder="검, 방패, 포션 x3, 열쇠...">${eA(c.items||'')}</textarea>
    </div>
  </div>`;

  Utils.openModal(isNew ? '캐릭터 추가' : '캐릭터 편집', body, () => {
    const name = document.getElementById('ceditName')?.value.trim();
    if (!name) { tst('이름을 입력하세요.'); return false; }
    const stats = {};
    (document.getElementById('ceditStats')?.value || '').split('\n').forEach(l => {
      const m = l.trim().match(/^(\w+)\s*=\s*(.+)$/);
      if (m) { const v = m[2].trim(); stats[m[1]] = isNaN(v) ? v : +v; }
    });
    const updated = { ...c, name, desc: document.getElementById('ceditDesc')?.value.trim()||'',
                      stats, items: document.getElementById('ceditItems')?.value.trim()||'' };
    if (isNew) {
      _E.characters.push(updated);
    } else {
      const idx = _E.characters.findIndex(x => x.id === id);
      if (idx >= 0) _E.characters[idx] = updated;
    }
    renderCharList();
  }, isNew ? '추가' : '저장');
}

function doDelChar(id) {
  if (!confirm('캐릭터를 삭제하시겠습니까?')) return;
  _E.characters = _E.characters.filter(c => c.id !== id);
  renderCharList();
}

// ─── SAMPLE SCENARIO ─────────────────────────────────────────────────────────
const SAMPLE = `#1#
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
- [gold >= 5] 방을 빌린다 (HP+30) {gold -= 5, hp += 30} -> #2#
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
주인장이 목소리를 낮춥니다. "동쪽 폐허 지하에 던전이 있소. 열쇠가 있어야 들어갈 수 있다더군..."
- 던전을 탐험하러 간다 -> #11#
- 더 준비하러 간다 -> #2#

#10#
산길 위에 낡은 수도원이 있습니다. 문은 굳게 잠혀 있습니다.
- [key == 1] 열쇠로 문을 열어본다 -> #12#
- 돌아간다 -> #1#

#11#
동쪽 폐허에 도착했습니다. 거대한 돌문 앞에서 목소리가 울립니다. "인간이여... 시험을 통과해야 한다."
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
축하합니다! 마을로 돌아왔습니다. 마을 사람들이 환호합니다. 🎉 행복한 결말.
- 처음부터 다시 시작한다 -> #1#

#15#
오우거를 물리쳤습니다! 보물 창고에서 엄청난 금화를 발견했습니다. 🏆 던전 정복!
- 보물을 들고 마을로 돌아간다 {gold += 80} -> #14#
`;

// ─── INIT / DESTROY ──────────────────────────────────────────────────────────
return {
  init: async function(el, opts) {
    _el = el;
    injectStyle();
    _stories = await DB.getSetting('trpgStories', []);
    showList();
  },
  destroy: function() {
    // Remove the fixed overlay if it exists
    _el?.querySelector('.trpg-overlay')?.remove();
    _el = null;
  }
};

})();
