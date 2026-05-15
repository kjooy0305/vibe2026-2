'use strict';
window.Pages = window.Pages || {};
window.Pages.eventGraph = {
  _canvas: null,
  _ctx: null,
  _events: [],
  _container: null,
  _wid: null,
  _scale: 1,
  _offsetX: 0,
  _offsetY: 0,
  _draggingNode: null,
  _draggingCanvas: false,
  _selectedNode: null,
  _filterCycle: 'all',
  _viewMode: 'graph',
  _resizeObs: null,
  _customColors: [],
  _focusEventId: null,
  _focusDepth: 2,

  EDGE_TYPES: ['야기함','필연적','선택적','동시발생','대립','연관','예방','촉발','전제','암시'],
  EDGE_COLORS: {
    '야기함':'#ef4444','필연적':'#f59e0b','선택적':'#3b82f6',
    '동시발생':'#10b981','대립':'#ec4899','연관':'#a855f7',
    '예방':'#06b6d4','촉발':'#f97316','전제':'#84cc16','암시':'#94a3b8',
  },

  init: async function(container, options = {}) {
    this._container = container;
    this._wid = AppStore.getCurrentWorldId();
    if (!this._wid) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">🌍</div><div class="empty-state__title">세계를 먼저 선택하세요</div></div>';
      return;
    }
    this._events = await DB.getAll('events', this._wid);
    const saved = await DB.getSetting('eventColors', null);
    this._customColors = saved ? JSON.parse(saved) : [];
    this._render(container);
  },

  _render: function(container) {
    const cycles = [...new Set(this._events.map(e => e.regressionCycle ?? 0))].sort((a,b)=>a-b);
    const self = this;

    container.innerHTML = `
    <div class="page active" style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
      <div class="page-header" style="flex-shrink:0;" id="egPageHeader">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <h2 class="page-title" style="margin:0;">사건 그래프</h2>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" id="btnToggleView">📋 목록</button>
            <button class="btn btn-ghost btn-sm" id="btnExportEvents">내보내기</button>
            <button class="btn btn-primary btn-sm" id="btnAddEvent">+ 추가</button>
          </div>
        </div>
        <div id="cycleFilterWrap" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;overflow-x:auto;padding-bottom:2px;">
          <button class="filter-chip ${this._filterCycle==='all'?'active':''}" data-cycle="all">전체</button>
          ${cycles.map(c=>`<button class="filter-chip ${this._filterCycle===c?'active':''}" data-cycle="${c}">${c}회차</button>`).join('')}
        </div>
        <div id="focusFilterRow" style="display:flex;gap:6px;margin-top:6px;align-items:center;flex-wrap:wrap;">
          <span style="font-size:11px;color:var(--color-text-muted);white-space:nowrap;">기준 사건:</span>
          <select id="focusEventSelect" style="flex:1;min-width:80px;font-size:12px;padding:3px 8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-surface2);color:var(--color-text);">
            <option value="">전체 표시</option>
            ${this._events.map(e=>`<option value="${Utils.escHtml(e.id)}" ${this._focusEventId===e.id?'selected':''}>${Utils.escHtml(e.name)}</option>`).join('')}
          </select>
          <span style="font-size:11px;color:var(--color-text-muted);white-space:nowrap;">깊이:</span>
          <input type="number" id="focusDepthInput" value="${this._focusDepth}" min="1" max="20"
            style="width:46px;padding:3px 6px;font-size:12px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-surface2);color:var(--color-text);" />
          <button id="btnApplyFocus" class="btn btn-ghost btn-sm" style="font-size:11px;">적용</button>
          <button id="btnClearFocus" class="btn btn-ghost btn-sm" style="font-size:11px;color:var(--color-danger);display:${this._focusEventId?'':'none'};">초기화</button>
        </div>
        <div style="display:flex;gap:6px;margin-top:6px;align-items:center;">
          <button class="btn btn-ghost btn-sm" id="btnZoomOut">−</button>
          <span id="zoomLabel" style="font-size:12px;min-width:40px;text-align:center;">${Math.round(this._scale*100)}%</span>
          <button class="btn btn-ghost btn-sm" id="btnZoomIn">+</button>
          <button class="btn btn-ghost btn-sm" id="btnZoomReset">리셋</button>
          <span style="flex:1;"></span>
          <span id="eventsCountLabel" style="font-size:11px;color:var(--color-text-muted);">사건 ${this._filteredEvents().length}개</span>
        </div>
      </div>

      <div id="graphArea" style="flex:1;position:relative;overflow:hidden;background:var(--color-bg);">
        <canvas id="eventCanvas" style="display:block;touch-action:none;"></canvas>
        <div id="emptyGraphMsg" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:var(--color-text-muted);pointer-events:none;${this._filteredEvents().length>0?'display:none;':''}">
          <div style="font-size:32px;opacity:0.3;">🕸️</div>
          <div>+ 추가 버튼으로 사건을 추가하세요</div>
          <div style="font-size:12px;">더블클릭으로 추가, 드래그로 이동, 핀치로 확대/축소</div>
        </div>
      </div>

      <div id="listView" style="display:none;flex:1;overflow-y:auto;padding:0 4px 8px;"></div>

      <div id="eventSheet" style="position:fixed;bottom:0;left:0;right:0;background:var(--color-surface);border-radius:16px 16px 0 0;box-shadow:0 -4px 20px rgba(0,0,0,0.4);transform:translateY(100%);transition:transform 0.3s ease;z-index:200;max-height:65vh;overflow-y:auto;padding:16px;">
        <div style="width:40px;height:4px;background:var(--color-border);border-radius:2px;margin:0 auto 16px;"></div>
        <div id="eventSheetContent"></div>
      </div>
    </div>`;

    const canvas = document.getElementById('eventCanvas');
    const area   = document.getElementById('graphArea');
    this._canvas = canvas;
    this._ctx    = canvas.getContext('2d');

    const resizeCanvas = () => {
      const w = area.offsetWidth, h = area.offsetHeight;
      if (!w || !h) return;
      const dpr = devicePixelRatio || 1;
      canvas.width  = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w+'px'; canvas.style.height = h+'px';
      self._draw();
    };
    const fixHeight = () => {
      const header = document.getElementById('egPageHeader');
      if (!header || !area) return;
      const hb = header.getBoundingClientRect().bottom;
      const bnH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bottom-nav-h'))||56;
      const sb  = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0;
      const avH = (window.visualViewport?.height||window.innerHeight) - hb - bnH - sb - 4;
      area.style.height = Math.max(200, avH)+'px';
      area.style.flex   = 'none';
      resizeCanvas();
    };

    requestAnimationFrame(()=>{ fixHeight(); resizeCanvas(); });
    window.addEventListener('resize', fixHeight);
    this._resizeObs = new ResizeObserver(()=>{ fixHeight(); resizeCanvas(); });
    this._resizeObs.observe(area);

    this._setupCanvasEvents(canvas);
    this._setupControls(container);
  },

  // ── Filtering ──────────────────────────────────────────────────────────────

  _filteredEvents: function() {
    let evs = this._filterCycle === 'all'
      ? this._events
      : this._events.filter(e => (e.regressionCycle ?? 0) === this._filterCycle);
    if (this._focusEventId) {
      const ids = this._depthIds(this._focusEventId, this._focusDepth);
      evs = evs.filter(e => ids.has(e.id));
    }
    return evs;
  },

  _depthIds: function(focusId, depth) {
    const adj = {};
    this._events.forEach(e => {
      if (!adj[e.id]) adj[e.id] = new Set();
      (e.outcomes||[]).forEach(o => {
        if (!adj[o.targetId]) adj[o.targetId] = new Set();
        adj[e.id].add(o.targetId);
        adj[o.targetId].add(e.id);
      });
    });
    const visited = new Set([focusId]);
    let frontier = [focusId];
    for (let d = 0; d < depth; d++) {
      const next = [];
      frontier.forEach(id => {
        (adj[id]||new Set()).forEach(nid => { if (!visited.has(nid)) { visited.add(nid); next.push(nid); } });
      });
      frontier = next;
      if (!frontier.length) break;
    }
    return visited;
  },

  // ── Draw ───────────────────────────────────────────────────────────────────

  _draw: function() {
    const canvas = this._canvas, ctx = this._ctx;
    if (!canvas || !ctx) return;
    const dpr = devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(this._offsetX, this._offsetY);
    ctx.scale(this._scale, this._scale);

    const events = this._filteredEvents();
    const eMap = {};
    events.forEach(e => { eMap[e.id] = e; });

    events.forEach(ev => {
      (ev.outcomes||[]).forEach(out => {
        const tgt = eMap[out.targetId];
        if (tgt) this._drawEdge(ctx, ev, tgt, out);
      });
    });
    events.forEach(ev => this._drawNode(ctx, ev, ev.id === this._selectedNode?.id));
    ctx.restore();
  },

  _drawNode: function(ctx, ev, selected) {
    const x = ev.x||100, y = ev.y||100, w = 140, h = 52, r = 10;
    const nc = { major:'#3b82f6', minor:'#6b7280', hidden:'#f59e0b' };
    const col = ev.color || nc[ev.importance||'minor'] || '#6b7280';
    if (selected) { ctx.shadowColor = col; ctx.shadowBlur = 16; }
    ctx.fillStyle = col+'22';
    ctx.strokeStyle = selected ? col : col+'88';
    ctx.lineWidth = selected ? 2.5 : 1.5;
    this._roundRect(ctx, x-w/2, y-h/2, w, h, r);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = col; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`${ev.regressionCycle??0}회차`, x-w/2+6, y-h/2+14);
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    const nm = ev.name||'이름 없음';
    ctx.fillText(nm.length>12?nm.slice(0,11)+'…':nm, x, y+2);
    if (ev.date) { ctx.fillStyle = '#94a3b8'; ctx.font = '10px sans-serif'; ctx.fillText(ev.date, x, y+18); }
  },

  _drawEdge: function(ctx, from, to, out) {
    const fx = from.x||100, fy = from.y||100, tx = to.x||200, ty = to.y||200;
    const col = out.edgeColor || this.EDGE_COLORS[out.type||'야기함'] || '#6b7280';
    ctx.strokeStyle = col+'aa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash(out.type==='선택적'||out.type==='암시'?[6,4]:[]);
    ctx.beginPath(); ctx.moveTo(fx, fy);
    const mx = (fx+tx)/2, my = (fy+ty)/2-30;
    ctx.quadraticCurveTo(mx, my, tx, ty);
    ctx.stroke(); ctx.setLineDash([]);
    const ang = Math.atan2(ty-my, tx-mx);
    ctx.fillStyle = col+'aa'; ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx-10*Math.cos(ang-0.3), ty-10*Math.sin(ang-0.3));
    ctx.lineTo(tx-10*Math.cos(ang+0.3), ty-10*Math.sin(ang+0.3));
    ctx.closePath(); ctx.fill();
    if (out.type||out.label) {
      ctx.fillStyle = col; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(out.label||out.type||'', mx, my-4);
    }
  },

  _roundRect: function(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  },

  _canvasToWorld: function(cx, cy) {
    return { x:(cx-this._offsetX)/this._scale, y:(cy-this._offsetY)/this._scale };
  },

  _hitTest: function(cx, cy) {
    const w=140,h=52, {x,y}=this._canvasToWorld(cx,cy);
    return this._filteredEvents().find(ev=>{
      const ex=ev.x||100,ey=ev.y||100;
      return x>=ex-w/2&&x<=ex+w/2&&y>=ey-h/2&&y<=ey+h/2;
    });
  },

  // ── Canvas events ──────────────────────────────────────────────────────────

  _setupCanvasEvents: function(canvas) {
    const self = this;
    let startX, startY, startOffX, startOffY;
    let touchStartDist = null, startScale;
    let longPressTimer = null, isDraggingNode = false, isDraggingCanvas = false;

    const getPos = e => {
      const r = canvas.getBoundingClientRect();
      return e.touches
        ? { x: e.touches[0].clientX-r.left, y: e.touches[0].clientY-r.top }
        : { x: e.clientX-r.left, y: e.clientY-r.top };
    };

    const onStart = e => {
      e.preventDefault();
      const pos = getPos(e);
      startX=pos.x; startY=pos.y; startOffX=self._offsetX; startOffY=self._offsetY;
      if (e.touches && e.touches.length===2) {
        const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
        touchStartDist=Math.hypot(dx,dy); startScale=self._scale; return;
      }
      const hit = self._hitTest(pos.x, pos.y);
      if (hit) {
        self._draggingNode=hit; isDraggingNode=false;
        longPressTimer=setTimeout(()=>{ if(!isDraggingNode) self._showSheet(hit); },500);
      } else { self._draggingCanvas=true; isDraggingCanvas=true; }
    };

    const onMove = e => {
      e.preventDefault();
      if (e.touches && e.touches.length===2 && touchStartDist) {
        const dx=e.touches[0].clientX-e.touches[1].clientX, dy=e.touches[0].clientY-e.touches[1].clientY;
        self._scale=Math.max(0.3,Math.min(3,startScale*Math.hypot(dx,dy)/touchStartDist));
        const zl=document.getElementById('zoomLabel'); if(zl) zl.textContent=Math.round(self._scale*100)+'%';
        self._draw(); return;
      }
      const pos=getPos(e); const dx=pos.x-startX, dy=pos.y-startY;
      if (self._draggingNode && (Math.abs(dx)>5||Math.abs(dy)>5)) {
        isDraggingNode=true; clearTimeout(longPressTimer);
        const {x,y}=self._canvasToWorld(pos.x,pos.y);
        self._draggingNode.x=x; self._draggingNode.y=y; self._draw();
      } else if (isDraggingCanvas) {
        self._offsetX=startOffX+dx; self._offsetY=startOffY+dy; self._draw();
      }
    };

    const onEnd = async e => {
      clearTimeout(longPressTimer); touchStartDist=null;
      if (self._draggingNode && isDraggingNode) {
        await DB.put('events', self._draggingNode);
      } else if (self._draggingNode && !isDraggingNode) {
        self._selectedNode=self._draggingNode; self._showSheet(self._draggingNode); self._draw();
      }
      self._draggingNode=null; isDraggingNode=false; isDraggingCanvas=false; self._draggingCanvas=false;
    };

    canvas.addEventListener('touchstart', onStart, {passive:false});
    canvas.addEventListener('touchmove',  onMove,  {passive:false});
    canvas.addEventListener('touchend',   onEnd,   {passive:false});
    canvas.addEventListener('mousedown',  onStart);
    canvas.addEventListener('mousemove',  onMove);
    canvas.addEventListener('mouseup',    onEnd);
    canvas.addEventListener('dblclick', e => {
      const r=canvas.getBoundingClientRect();
      const {x,y}=self._canvasToWorld(e.clientX-r.left, e.clientY-r.top);
      self._openForm(null, self._wid, x, y);
    });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      self._scale=Math.max(0.3,Math.min(3,self._scale*(e.deltaY<0?1.1:0.9)));
      const zl=document.getElementById('zoomLabel'); if(zl) zl.textContent=Math.round(self._scale*100)+'%';
      self._draw();
    }, {passive:false});
  },

  // ── Controls ───────────────────────────────────────────────────────────────

  _refreshCycleChips: function() {
    const cycles=[...new Set(this._events.map(e=>e.regressionCycle??0))].sort((a,b)=>a-b);
    const wrap=document.getElementById('cycleFilterWrap'); if(!wrap) return;
    wrap.innerHTML=`<button class="filter-chip ${this._filterCycle==='all'?'active':''}" data-cycle="all">전체</button>`
      +cycles.map(c=>`<button class="filter-chip ${this._filterCycle===c?'active':''}" data-cycle="${c}">${c}회차</button>`).join('');
    this._bindCycleChips(wrap);
    this._refreshFocusSelect();
  },

  _refreshFocusSelect: function() {
    const sel=document.getElementById('focusEventSelect'); if(!sel) return;
    const cur=sel.value;
    sel.innerHTML=`<option value="">전체 표시</option>`
      +this._events.map(e=>`<option value="${Utils.escHtml(e.id)}" ${cur===e.id?'selected':''}>${Utils.escHtml(e.name)}</option>`).join('');
  },

  _bindCycleChips: function(container) {
    const self=this;
    (container||document).querySelectorAll('.filter-chip[data-cycle]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        (container||document).querySelectorAll('.filter-chip[data-cycle]').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const val=btn.dataset.cycle;
        self._filterCycle=val==='all'?'all':Number(val);
        self._updateFilterState();
      });
    });
  },

  _updateFilterState: function() {
    const cl=document.getElementById('eventsCountLabel');
    if(cl) cl.textContent=`사건 ${this._filteredEvents().length}개`;
    this._draw();
    const em=document.getElementById('emptyGraphMsg');
    if(em) em.style.display=this._filteredEvents().length===0?'':'none';
    const cb=document.getElementById('btnClearFocus');
    if(cb) cb.style.display=this._focusEventId?'':'none';
  },

  _setupControls: function(container) {
    const self=this;

    document.getElementById('btnZoomIn')?.addEventListener('click',()=>{
      self._scale=Math.min(3,self._scale*1.2);
      const zl=document.getElementById('zoomLabel'); if(zl) zl.textContent=Math.round(self._scale*100)+'%';
      self._draw();
    });
    document.getElementById('btnZoomOut')?.addEventListener('click',()=>{
      self._scale=Math.max(0.3,self._scale/1.2);
      const zl=document.getElementById('zoomLabel'); if(zl) zl.textContent=Math.round(self._scale*100)+'%';
      self._draw();
    });
    document.getElementById('btnZoomReset')?.addEventListener('click',()=>{
      self._scale=1; self._offsetX=0; self._offsetY=0;
      const zl=document.getElementById('zoomLabel'); if(zl) zl.textContent='100%';
      self._draw();
    });

    document.getElementById('btnApplyFocus')?.addEventListener('click', ()=>{
      const focusId=document.getElementById('focusEventSelect')?.value||null;
      const depth=Number(document.getElementById('focusDepthInput')?.value||2);
      self._focusEventId=focusId||null;
      self._focusDepth=Math.max(1,depth);
      self._updateFilterState();
    });
    document.getElementById('btnClearFocus')?.addEventListener('click', ()=>{
      self._focusEventId=null; self._focusDepth=2;
      const di=document.getElementById('focusDepthInput'); if(di) di.value='2';
      const fs=document.getElementById('focusEventSelect'); if(fs) fs.value='';
      self._updateFilterState();
    });

    document.getElementById('btnAddEvent')?.addEventListener('click', ()=>{
      const cx=(self._canvas?.width/(devicePixelRatio||1)/2-self._offsetX)/self._scale;
      const cy=(self._canvas?.height/(devicePixelRatio||1)/2-self._offsetY)/self._scale;
      self._openForm(null, self._wid, cx+Math.random()*80-40, cy+Math.random()*80-40);
    });

    document.getElementById('btnToggleView')?.addEventListener('click', ()=>{
      self._viewMode=self._viewMode==='graph'?'list':'graph';
      const ga=document.getElementById('graphArea');
      const lv=document.getElementById('listView');
      const btn=document.getElementById('btnToggleView');
      if (self._viewMode==='list') {
        ga.style.display='none'; lv.style.display='block';
        btn.textContent='🕸️ 그래프'; self._renderListView(lv);
      } else {
        ga.style.display='block'; lv.style.display='none';
        btn.textContent='📋 목록';
        requestAnimationFrame(()=>self._draw());
      }
    });

    document.getElementById('btnExportEvents')?.addEventListener('click', ()=>{
      const sorted=[...self._filteredEvents()].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
      const text=sorted.map(e=>Utils.toTextExport(`사건: ${e.name}`,[
        ['날짜',e.date],['회차',e.regressionCycle!==undefined?e.regressionCycle+'회차':''],
        ['설명',e.description],
        ['관련 인물',(e.involvedCharacters||[]).map(c=>c.name).join(', ')],
        ['연결',(e.outcomes||[]).map(o=>o.label||o.type).join(', ')],
      ])).join('\n\n');
      Utils.copyText(text); Utils.toast('클립보드에 복사됨','success');
    });

    this._bindCycleChips(document.getElementById('cycleFilterWrap'));
  },

  // ── Sheet ──────────────────────────────────────────────────────────────────

  _showSheet: function(ev) {
    const sheet=document.getElementById('eventSheet');
    const content=document.getElementById('eventSheetContent');
    if(!sheet||!content) return;
    const self=this;
    const eMap={}; this._events.forEach(e=>{ eMap[e.id]=e; });
    const outCount=(ev.outcomes||[]).length;
    const inEvents=this._events.filter(e=>(e.outcomes||[]).some(o=>o.targetId===ev.id));

    content.innerHTML=`
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <div>
          <div style="font-size:11px;color:var(--color-text-muted);">${ev.regressionCycle??0}회차 · ${ev.date||'날짜 미정'}</div>
          <div style="font-weight:700;font-size:18px;">${Utils.escHtml(ev.name)}</div>
          <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">연결: 나가는 ${outCount}개 / 들어오는 ${inEvents.length}개</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" id="btnEditEvent">편집</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);" id="btnDelEvent">삭제</button>
          <button class="btn btn-ghost btn-sm" id="btnCloseSheet">✕</button>
        </div>
      </div>

      ${ev.description?`<div style="white-space:pre-wrap;font-size:13px;margin-bottom:12px;">${Utils.nl2br(Utils.escHtml(ev.description))}</div>`:''}

      ${(ev.involvedCharacters||[]).length?`
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;">관련 인물</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${(ev.involvedCharacters||[]).map(c=>`
              <button class="btn btn-ghost btn-sm" onclick="AppRouter.navigate('characters',{highlightId:'${Utils.escHtml(c.id)}'});document.getElementById('eventSheet').style.transform='translateY(100%)';">
                👤 ${Utils.escHtml(c.name)}
              </button>`).join('')}
          </div>
        </div>` : ''}

      ${outCount?`
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;">이 사건에서 연결 (${outCount}개)</div>
          ${(ev.outcomes||[]).map(o=>{
            const tgt=eMap[o.targetId];
            const col=o.edgeColor||this.EDGE_COLORS[o.type]||'#6b7280';
            return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--color-border);">
              <span style="width:10px;height:10px;border-radius:50%;background:${col};flex-shrink:0;"></span>
              <span style="color:${col};font-size:11px;min-width:52px;">${o.type||'야기함'}</span>
              <button class="btn-outcome-nav" data-target-id="${Utils.escHtml(o.targetId)}"
                style="font-size:13px;font-weight:600;background:none;border:none;color:var(--color-primary);cursor:pointer;text-align:left;flex:1;">
                ${tgt?Utils.escHtml(tgt.name):'(알 수 없는 사건)'}
              </button>
              ${o.label?`<span style="font-size:11px;color:var(--color-text-muted);">${Utils.escHtml(o.label)}</span>`:''}
            </div>`;
          }).join('')}
        </div>` : ''}

      ${inEvents.length?`
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;">이 사건으로 들어오는 연결 (${inEvents.length}개)</div>
          ${inEvents.map(src=>{
            const out=(src.outcomes||[]).find(o=>o.targetId===ev.id);
            const col=out?.edgeColor||this.EDGE_COLORS[out?.type]||'#6b7280';
            return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--color-border);">
              <span style="width:10px;height:10px;border-radius:50%;background:${col};flex-shrink:0;"></span>
              <span style="color:${col};font-size:11px;min-width:52px;">${out?.type||''}</span>
              <button class="btn-outcome-nav" data-target-id="${Utils.escHtml(src.id)}"
                style="font-size:13px;background:none;border:none;color:var(--color-secondary);cursor:pointer;text-align:left;flex:1;">
                ← ${Utils.escHtml(src.name)}
              </button>
            </div>`;
          }).join('')}
        </div>` : ''}

      ${ev.authorNotes?`<div style="background:var(--color-surface2);border-radius:8px;padding:10px;font-size:12px;color:var(--color-text-muted);">📝 ${Utils.nl2br(Utils.escHtml(ev.authorNotes))}</div>`:''}`;

    sheet.style.transform='translateY(0)';

    content.querySelectorAll('.btn-outcome-nav').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const tgt=self._events.find(e=>e.id===btn.dataset.targetId);
        if(tgt){ self._selectedNode=tgt; self._showSheet(tgt); self._draw(); }
      });
    });
    document.getElementById('btnCloseSheet')?.addEventListener('click',()=>{
      sheet.style.transform='translateY(100%)'; self._selectedNode=null; self._draw();
    });
    document.getElementById('btnEditEvent')?.addEventListener('click',()=>{
      sheet.style.transform='translateY(100%)'; self._openForm(ev,self._wid,ev.x,ev.y);
    });
    document.getElementById('btnDelEvent')?.addEventListener('click',()=>{
      sheet.style.transform='translateY(100%)';
      Utils.confirmWithInput('이벤트 삭제','삭제하면 되돌릴 수 없습니다.',ev.name,async()=>{
        await DB.del('events',ev.id);
        self._events=await DB.getAll('events',self._wid);
        self._selectedNode=null; self._refreshCycleChips(); self._updateFilterState();
        Utils.toast('삭제됨','info');
      });
    });
  },

  // ── List view ──────────────────────────────────────────────────────────────

  _renderListView: function(listEl) {
    const self=this;
    const sorted=[...this._filteredEvents()].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    if(!sorted.length){
      listEl.innerHTML='<div class="empty-state"><div class="empty-state__icon">📌</div><div class="empty-state__title">사건이 없습니다</div></div>';
      return;
    }
    const eMap={}; this._events.forEach(e=>{ eMap[e.id]=e; });
    listEl.innerHTML=sorted.map(ev=>{
      const inCount=this._events.filter(e=>(e.outcomes||[]).some(o=>o.targetId===ev.id)).length;
      return `<div class="list-item list-item--full" data-ev-id="${Utils.escHtml(ev.id)}" style="cursor:pointer;border-left:3px solid ${ev.color||'#3b82f6'};">
        <div style="flex:1;">
          <div style="font-size:11px;color:var(--color-text-muted);">${ev.regressionCycle??0}회차 · ${ev.date||''}</div>
          <div style="font-weight:700;">${Utils.escHtml(ev.name)}</div>
          ${ev.description?`<div style="font-size:12px;color:var(--color-text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(ev.description)}</div>`:''}
        </div>
        <div style="font-size:12px;color:var(--color-text-muted);text-align:right;">
          <div>→ ${(ev.outcomes||[]).length}개</div>
          ${inCount?`<div style="color:var(--color-secondary);">← ${inCount}개</div>`:''}
        </div>
      </div>`;
    }).join('');
    listEl.querySelectorAll('[data-ev-id]').forEach(el=>{
      el.addEventListener('click',()=>{
        const evData=self._events.find(e=>e.id===el.dataset.evId);
        if(evData) self._showSheet(evData);
      });
    });
  },

  // ── Form ───────────────────────────────────────────────────────────────────

  _openForm: async function(ev, wid, defaultX=200, defaultY=200) {
    const self=this;
    const isEdit=!!ev;
    const chars=await DB.getAll('characters', wid);
    const allEvents=await DB.getAll('events', wid);

    const BASE_COLORS=['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#6b7280','#ec4899','#06b6d4','#f97316','#14b8a6'];
    const allColors=[...BASE_COLORS,...self._customColors];

    let selectedColor=ev?.color||'#3b82f6';
    let currentOutcomes=(ev?.outcomes||[]).map(o=>({...o}));
    let involvedChars=(ev?.involvedCharacters||[]).map(c=>({...c})); // [{id,name}]

    // Incoming connections (read-only info)
    const incomingEvs = isEdit
      ? allEvents.filter(e => e.id!==ev.id && (e.outcomes||[]).some(o=>o.targetId===ev.id))
      : [];

    const sortedChars=chars.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko'));

    const edgeColors=this.EDGE_COLORS;

    // ── Color picker HTML ────────────────────────────────────────────────────
    const renderColorPicker=()=>`
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
        ${allColors.map(c=>`<button type="button" data-color="${c}" class="color-pick-btn"
          style="width:26px;height:26px;border-radius:50%;background:${c};border:3px solid ${selectedColor===c?'white':'transparent'};cursor:pointer;flex-shrink:0;"></button>`).join('')}
        <input type="color" id="customColorPicker" value="${selectedColor}" style="width:26px;height:26px;padding:0;border:none;border-radius:50%;cursor:pointer;background:none;" title="직접 선택"/>
        <button type="button" id="btnAddCustomColor" class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 6px;">+저장</button>
      </div>`;

    // ── Outcomes list HTML ───────────────────────────────────────────────────
    const outcomesHTML=()=>currentOutcomes.map((o,i)=>{
      const tgt=allEvents.find(e=>e.id===o.targetId);
      const col=o.edgeColor||edgeColors[o.type]||'#6b7280';
      return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:6px 8px;background:var(--color-surface2);border-radius:6px;">
        <input type="color" class="outcome-color-inp" data-i="${i}" value="${col}"
          style="width:22px;height:22px;padding:0;border:none;border-radius:50%;cursor:pointer;flex-shrink:0;" title="연결선 색 변경"/>
        <span style="font-size:11px;padding:1px 6px;border-radius:4px;background:${col}22;color:${col};border:1px solid ${col}55;white-space:nowrap;">${o.type||'야기함'}</span>
        <span style="flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${tgt?Utils.escHtml(tgt.name):'(삭제된 사건)'}
          ${o.label?`<span style="color:var(--color-text-muted);font-size:11px;"> · ${Utils.escHtml(o.label)}</span>`:''}
        </span>
        <button type="button" class="btn btn-ghost btn-sm btn-del-outcome" data-i="${i}" style="color:var(--color-danger);padding:2px 6px;flex-shrink:0;">✕</button>
      </div>`;
    }).join('')||'<div style="color:var(--color-text-muted);font-size:12px;padding:4px 0;">연결된 사건 없음</div>';

    const otherEvents=allEvents.filter(e=>!ev||e.id!==ev.id);

    const body=`
    <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
      <div class="form-group"><label class="form-label">사건명 *</label>
        <input class="input-field" id="fEvName" value="${Utils.escHtml(ev?.name||'')}" style="width:100%;box-sizing:border-box;"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="form-group"><label class="form-label">날짜</label>
          <input class="input-field" id="fEvDate" value="${Utils.escHtml(ev?.date||'')}" placeholder="2024.01.01"/></div>
        <div class="form-group"><label class="form-label">회귀 회차</label>
          <input type="number" class="input-field" id="fEvCycle" value="${ev?.regressionCycle??0}" min="0"/></div>
      </div>
      <div class="form-group"><label class="form-label">중요도</label>
        <select class="select-input" id="fEvImportance">
          <option value="major" ${(ev?.importance||'minor')==='major'?'selected':''}>주요 사건</option>
          <option value="minor" ${(ev?.importance||'minor')==='minor'?'selected':''}>일반 사건</option>
          <option value="hidden" ${ev?.importance==='hidden'?'selected':''}>히든 사건</option>
        </select></div>
      <div class="form-group"><label class="form-label">노드 색상</label>
        <div id="colorPickerWrap">${renderColorPicker()}</div></div>
      <div class="form-group"><label class="form-label">설명</label>
        <textarea class="textarea-field" id="fEvDesc" rows="3" style="width:100%;box-sizing:border-box;">${Utils.escHtml(ev?.description||'')}</textarea></div>

      <!-- 관련 인물: 검색 칩 UI -->
      <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
        <label class="form-label" style="display:block;margin-bottom:6px;">관련 인물</label>
        <div id="charChips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:28px;margin-bottom:8px;"></div>
        ${sortedChars.length>0?`<div style="position:relative;">
          <input class="input-field" id="charSearchInput" placeholder="캐릭터 이름으로 검색하여 추가..." style="width:100%;box-sizing:border-box;font-size:12px;"/>
          <div id="charSearchResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:160px;overflow-y:auto;"></div>
        </div>`:`<div style="font-size:12px;color:var(--color-text-muted);">이 세계에 캐릭터가 없습니다</div>`}
      </div>

      <!-- 연결 사건 -->
      <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
        <label class="form-label" style="display:block;margin-bottom:6px;">연결 사건 (인과관계) <span style="font-size:11px;color:var(--color-text-muted);">여러 개 추가 가능</span></label>
        <div id="outcomesList">${outcomesHTML()}</div>
        <div style="border-top:1px dashed var(--color-border);margin-top:8px;padding-top:8px;">
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">새 연결 추가</div>
          <input class="input-field" id="outcomeTargetFilter" placeholder="사건 이름 필터..." style="width:100%;box-sizing:border-box;font-size:12px;margin-bottom:4px;"/>
          <select class="select-input" id="outcomeTarget" style="width:100%;margin-bottom:6px;">
            <option value="">사건 선택...</option>
            ${otherEvents.map(e=>`<option value="${Utils.escHtml(e.id)}">${Utils.escHtml(e.name)}</option>`).join('')}
          </select>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            <select class="select-input" id="outcomeType" style="flex:1;min-width:80px;">
              ${this.EDGE_TYPES.map(t=>`<option value="${t}">${t}</option>`).join('')}
            </select>
            <input type="color" id="outcomeEdgeColor" value="#ef4444"
              style="width:32px;height:32px;padding:2px;border-radius:6px;border:1px solid var(--color-border);cursor:pointer;flex-shrink:0;" title="연결선 색상 (기본: 유형별 색상)"/>
            <button type="button" id="btnResetEdgeColor" class="btn btn-ghost btn-sm" style="font-size:10px;white-space:nowrap;">유형색</button>
          </div>
          <div style="display:flex;gap:6px;margin-top:6px;">
            <input class="input-field" id="outcomeLabel" placeholder="설명 (선택)" style="flex:1;"/>
            <button type="button" id="btnAddOutcome" class="btn btn-primary btn-sm">+ 추가</button>
          </div>
        </div>
      </div>

      ${incomingEvs.length?`
      <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;background:rgba(99,102,241,0.04);">
        <label class="form-label" style="display:block;margin-bottom:6px;color:var(--color-secondary);">이 사건으로 들어오는 연결 (읽기 전용)</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${incomingEvs.map(src=>{
            const out=(src.outcomes||[]).find(o=>o.targetId===ev?.id);
            const col=out?.edgeColor||edgeColors[out?.type]||'#6b7280';
            return `<span style="font-size:12px;padding:2px 8px;border-radius:6px;background:${col}22;color:${col};border:1px solid ${col}55;">
              ← ${Utils.escHtml(src.name)} (${out?.type||''})
            </span>`;
          }).join('')}
        </div>
      </div>` : ''}

      <div class="form-group"><label class="form-label">작가 메모</label>
        <textarea class="textarea-field" id="fEvAuthor" rows="2" style="width:100%;box-sizing:border-box;">${Utils.escHtml(ev?.authorNotes||'')}</textarea></div>
    </div>`;

    Utils.openModal(isEdit?'사건 편집':'새 사건', body, async()=>{
      const name=document.getElementById('fEvName')?.value.trim();
      if(!name){ Utils.fieldError('fEvName'); return false; }

      const item={
        ...(ev||{}), worldId:wid, name,
        date:        document.getElementById('fEvDate')?.value.trim(),
        regressionCycle: Number(document.getElementById('fEvCycle')?.value||0),
        importance:  document.getElementById('fEvImportance')?.value||'minor',
        color:       selectedColor,
        description: document.getElementById('fEvDesc')?.value.trim(),
        involvedCharacters: involvedChars,
        outcomes:    currentOutcomes,
        authorNotes: document.getElementById('fEvAuthor')?.value.trim(),
        x: ev?.x??defaultX, y: ev?.y??defaultY,
      };

      await DB.put('events', item);
      await AppStore.updateStreak();
      await AppStore.recordActivity('events', !isEdit);
      Utils.toast(isEdit?'저장됨':'추가됨','success');
      self._events=await DB.getAll('events',wid);
      self._refreshCycleChips(); self._updateFilterState();
      return true;
    }, isEdit?'저장':'추가');

    // ── Wire after DOM ──────────────────────────────────────────────────────
    setTimeout(()=>{

      // Node color picker
      const rebindColorPicker=()=>{
        document.querySelectorAll('#globalModalBody .color-pick-btn').forEach(btn=>{
          btn.addEventListener('click',()=>{
            selectedColor=btn.dataset.color;
            document.querySelectorAll('#globalModalBody .color-pick-btn').forEach(b=>b.style.borderColor='transparent');
            btn.style.borderColor='white';
            const cp=document.getElementById('customColorPicker'); if(cp) cp.value=selectedColor;
          });
        });
        document.getElementById('customColorPicker')?.addEventListener('input',e=>{
          selectedColor=e.target.value;
          document.querySelectorAll('#globalModalBody .color-pick-btn').forEach(b=>b.style.borderColor='transparent');
        });
        document.getElementById('btnAddCustomColor')?.addEventListener('click',async()=>{
          const cp=document.getElementById('customColorPicker');
          const nc=cp?cp.value:selectedColor;
          if(!self._customColors.includes(nc)){
            self._customColors.push(nc);
            await DB.setSetting('eventColors',JSON.stringify(self._customColors));
          }
          const w=document.getElementById('colorPickerWrap'); if(w){ w.innerHTML=renderColorPicker(); rebindColorPicker(); }
        });
      };
      rebindColorPicker();

      // Outcome color inputs
      const bindOutcomeRows=()=>{
        document.querySelectorAll('#globalModalBody .btn-del-outcome').forEach(btn=>{
          btn.addEventListener('click',()=>{
            currentOutcomes.splice(Number(btn.dataset.i),1);
            const ol=document.getElementById('outcomesList'); if(ol){ ol.innerHTML=outcomesHTML(); bindOutcomeRows(); }
          });
        });
        document.querySelectorAll('#globalModalBody .outcome-color-inp').forEach(inp=>{
          inp.addEventListener('input',()=>{
            const i=Number(inp.dataset.i);
            if(currentOutcomes[i]) currentOutcomes[i].edgeColor=inp.value;
          });
        });
      };
      bindOutcomeRows();

      // Outcome type → update edge color default
      const typeEl=document.getElementById('outcomeType');
      const ecEl=document.getElementById('outcomeEdgeColor');
      typeEl?.addEventListener('change',()=>{
        if(ecEl) ecEl.value=edgeColors[typeEl.value]||'#6b7280';
      });
      document.getElementById('btnResetEdgeColor')?.addEventListener('click',()=>{
        if(typeEl&&ecEl) ecEl.value=edgeColors[typeEl.value]||'#6b7280';
      });
      if(ecEl&&typeEl) ecEl.value=edgeColors[typeEl.value]||'#ef4444';

      // Outcome target filter
      document.getElementById('outcomeTargetFilter')?.addEventListener('input',e=>{
        const q=e.target.value.toLowerCase();
        const sel=document.getElementById('outcomeTarget'); if(!sel) return;
        [...sel.options].forEach(opt=>{
          if(!opt.value){ opt.style.display=''; return; }
          opt.style.display=opt.textContent.toLowerCase().includes(q)?'':'none';
        });
      });

      // Add outcome
      document.getElementById('btnAddOutcome')?.addEventListener('click',()=>{
        const targetId=document.getElementById('outcomeTarget')?.value;
        if(!targetId){ Utils.toast('사건을 선택하세요','error'); return; }
        const type=document.getElementById('outcomeType')?.value||'야기함';
        const label=document.getElementById('outcomeLabel')?.value.trim()||'';
        const ec=document.getElementById('outcomeEdgeColor')?.value||'';
        const defCol=edgeColors[type]||'#6b7280';
        currentOutcomes.push({ targetId, type, label, edgeColor: ec!==defCol?ec:'' });
        const ol=document.getElementById('outcomesList'); if(ol){ ol.innerHTML=outcomesHTML(); bindOutcomeRows(); }
        const li=document.getElementById('outcomeLabel'); if(li) li.value='';
      });

      // Character chip UI
      const renderCharChips=()=>{
        const el=document.getElementById('charChips'); if(!el) return;
        el.innerHTML=involvedChars.map((c,idx)=>`
          <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.4);padding:2px 8px;border-radius:12px;font-size:12px;">
            👤 ${Utils.escHtml(c.name)}
            <span class="char-chip-del" data-idx="${idx}" style="cursor:pointer;color:var(--color-danger);padding:0 2px;">✕</span>
          </span>`).join('');
        el.querySelectorAll('.char-chip-del').forEach(del=>{
          del.addEventListener('click',()=>{ involvedChars.splice(Number(del.dataset.idx),1); renderCharChips(); });
        });
      };
      renderCharChips();

      const charIn=document.getElementById('charSearchInput');
      const charRs=document.getElementById('charSearchResults');
      if(charIn&&charRs){
        charIn.addEventListener('input',()=>{
          const q=charIn.value.trim().toLowerCase();
          if(!q){ charRs.style.display='none'; return; }
          const hits=sortedChars.filter(c=>!involvedChars.some(ic=>ic.id===c.id)&&(c.name||'').toLowerCase().includes(q)).slice(0,8);
          if(!hits.length){ charRs.style.display='none'; return; }
          charRs.style.display='block';
          charRs.innerHTML=hits.map(c=>`<div class="char-result" data-cid="${Utils.escHtml(c.id)}" data-cname="${Utils.escHtml(c.name)}"
            style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">
            👤 ${Utils.escHtml(c.name)}
          </div>`).join('');
          charRs.querySelectorAll('.char-result').forEach(row=>{
            row.addEventListener('mousedown',e=>{
              e.preventDefault();
              involvedChars.push({ id:row.dataset.cid, name:row.dataset.cname });
              charIn.value=''; charRs.style.display='none';
              renderCharChips();
            });
          });
        });
        charIn.addEventListener('blur',()=>setTimeout(()=>{ charRs.style.display='none'; },150));
      }

    }, 60);
  },

  destroy: function() {
    if(this._resizeObs) this._resizeObs.disconnect();
    window.removeEventListener('resize', this._fixHeight);
    this._canvas=null; this._ctx=null;
  },
};
