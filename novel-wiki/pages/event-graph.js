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
  _lastTouch: null,
  _selectedNode: null,
  _filterCycle: 'all',
  _viewMode: 'graph',
  _resizeObs: null,
  _animFrame: null,
  _customColors: [],

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
        <div id="cycleFilterWrap" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;overflow-x:auto;padding-bottom:4px;">
          <button class="filter-chip ${this._filterCycle === 'all' ? 'active' : ''}" data-cycle="all">전체</button>
          ${cycles.map(c => `<button class="filter-chip ${this._filterCycle === c ? 'active' : ''}" data-cycle="${c}">${c}회차</button>`).join('')}
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
        <div id="emptyGraphMsg" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:var(--color-text-muted);pointer-events:none;${this._events.length > 0 ? 'display:none;' : ''}">
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
    const area = document.getElementById('graphArea');
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      const w = area.offsetWidth;
      const h = area.offsetHeight;
      if (w === 0 || h === 0) return;
      const dpr = devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      self._draw();
    };

    // Fix height: after DOM settles, set graphArea height to fill remaining viewport
    const fixHeight = () => {
      const header = document.getElementById('egPageHeader');
      if (!header || !area) return;
      const headerBottom = header.getBoundingClientRect().bottom;
      const bottomNavH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bottom-nav-h')) || 56;
      const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) || 0;
      const availH = (window.visualViewport ? window.visualViewport.height : window.innerHeight) - headerBottom - bottomNavH - safeBottom - 4;
      area.style.height = Math.max(200, availH) + 'px';
      area.style.flex = 'none';
      resizeCanvas();
    };

    requestAnimationFrame(() => { fixHeight(); resizeCanvas(); });
    window.addEventListener('resize', fixHeight);

    this._resizeObs = new ResizeObserver(() => { fixHeight(); resizeCanvas(); });
    this._resizeObs.observe(area);

    this._setupCanvasEvents(canvas);
    this._setupControls(container);
  },

  _filteredEvents: function() {
    if (this._filterCycle === 'all') return this._events;
    return this._events.filter(e => (e.regressionCycle ?? 0) === this._filterCycle);
  },

  _draw: function() {
    const canvas = this._canvas;
    const ctx = this._ctx;
    if (!canvas || !ctx) return;

    const dpr = devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(this._offsetX, this._offsetY);
    ctx.scale(this._scale, this._scale);

    const events = this._filteredEvents();
    const eventMap = {};
    events.forEach(e => eventMap[e.id] = e);

    // Draw edges first
    events.forEach(ev => {
      (ev.outcomes || []).forEach(out => {
        const target = eventMap[out.targetId];
        if (!target) return;
        this._drawEdge(ctx, ev, target, out);
      });
    });

    // Draw nodes
    events.forEach(ev => this._drawNode(ctx, ev, ev.id === this._selectedNode?.id));

    ctx.restore();
  },

  _drawNode: function(ctx, ev, selected) {
    const x = ev.x || 100;
    const y = ev.y || 100;
    const w = 140, h = 52, r = 10;

    const colors = { major: '#3b82f6', minor: '#6b7280', hidden: '#f59e0b' };
    const col = ev.color || colors[ev.importance || 'minor'] || '#6b7280';

    if (selected) {
      ctx.shadowColor = col;
      ctx.shadowBlur = 16;
    }

    ctx.fillStyle = col + '22';
    ctx.strokeStyle = selected ? col : col + '88';
    ctx.lineWidth = selected ? 2.5 : 1.5;
    this._roundRect(ctx, x - w/2, y - h/2, w, h, r);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    const cycle = ev.regressionCycle ?? 0;
    ctx.fillStyle = col;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${cycle}회차`, x - w/2 + 6, y - h/2 + 14);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const name = ev.name || '이름 없음';
    ctx.fillText(name.length > 12 ? name.slice(0,11)+'…' : name, x, y + 2);

    if (ev.date) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText(ev.date, x, y + 18);
    }
  },

  _drawEdge: function(ctx, from, to, out) {
    const fx = from.x || 100, fy = from.y || 100;
    const tx = to.x || 200, ty = to.y || 200;

    const edgeColors = {
      '야기함': '#ef4444', '필연적': '#f59e0b',
      '선택적': '#3b82f6', '동시발생': '#10b981',
      '대립': '#ec4899', '연관': '#a855f7'
    };
    const col = out.edgeColor || edgeColors[out.type || '야기함'] || '#6b7280';

    ctx.strokeStyle = col + 'aa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash(out.type === '선택적' ? [6,4] : []);
    ctx.beginPath();
    ctx.moveTo(fx, fy);

    const mx = (fx + tx) / 2;
    const my = (fy + ty) / 2 - 30;
    ctx.quadraticCurveTo(mx, my, tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);

    const angle = Math.atan2(ty - my, tx - mx);
    ctx.fillStyle = col + 'aa';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - 10*Math.cos(angle-0.3), ty - 10*Math.sin(angle-0.3));
    ctx.lineTo(tx - 10*Math.cos(angle+0.3), ty - 10*Math.sin(angle+0.3));
    ctx.closePath();
    ctx.fill();

    if (out.type || out.label) {
      ctx.fillStyle = col;
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(out.label || out.type || '', mx, my - 4);
    }
  },

  _roundRect: function(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r);
    ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h);
    ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r);
    ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath();
  },

  _canvasToWorld: function(cx, cy) {
    return {
      x: (cx - this._offsetX) / this._scale,
      y: (cy - this._offsetY) / this._scale,
    };
  },

  _hitTest: function(cx, cy) {
    const w = 140, h = 52;
    const {x, y} = this._canvasToWorld(cx, cy);
    return this._filteredEvents().find(ev => {
      const ex = ev.x || 100, ey = ev.y || 100;
      return x >= ex-w/2 && x <= ex+w/2 && y >= ey-h/2 && y <= ey+h/2;
    });
  },

  _setupCanvasEvents: function(canvas) {
    const self = this;
    let startX, startY, startOffX, startOffY;
    let touchStartDist = null;
    let startScale;
    let longPressTimer = null;
    let isDraggingNode = false;
    let isDraggingCanvas = false;

    const getPos = e => {
      const rect = canvas.getBoundingClientRect();
      if (e.touches) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onStart = e => {
      e.preventDefault();
      const pos = getPos(e);
      startX = pos.x; startY = pos.y;
      startOffX = self._offsetX; startOffY = self._offsetY;

      if (e.touches && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.hypot(dx, dy);
        startScale = self._scale;
        return;
      }

      const hit = self._hitTest(pos.x, pos.y);
      if (hit) {
        self._draggingNode = hit;
        isDraggingNode = false;
        longPressTimer = setTimeout(() => {
          if (!isDraggingNode) self._showSheet(hit);
        }, 500);
      } else {
        self._draggingCanvas = true;
        isDraggingCanvas = true;
      }
    };

    const onMove = e => {
      e.preventDefault();

      if (e.touches && e.touches.length === 2 && touchStartDist) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        self._scale = Math.max(0.3, Math.min(3, startScale * dist / touchStartDist));
        const zl = document.getElementById('zoomLabel');
        if (zl) zl.textContent = Math.round(self._scale*100)+'%';
        self._draw();
        return;
      }

      const pos = getPos(e);
      const dx = pos.x - startX, dy = pos.y - startY;

      if (self._draggingNode && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        isDraggingNode = true;
        clearTimeout(longPressTimer);
        const {x, y} = self._canvasToWorld(pos.x, pos.y);
        self._draggingNode.x = x;
        self._draggingNode.y = y;
        self._draw();
      } else if (isDraggingCanvas) {
        self._offsetX = startOffX + dx;
        self._offsetY = startOffY + dy;
        self._draw();
      }
    };

    const onEnd = async e => {
      clearTimeout(longPressTimer);
      touchStartDist = null;

      if (self._draggingNode && isDraggingNode) {
        await DB.put('events', self._draggingNode);
      } else if (self._draggingNode && !isDraggingNode) {
        self._selectedNode = self._draggingNode;
        self._showSheet(self._draggingNode);
        self._draw();
      }

      self._draggingNode = null;
      isDraggingNode = false;
      isDraggingCanvas = false;
      self._draggingCanvas = false;
    };

    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });
    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);

    canvas.addEventListener('dblclick', e => {
      const rect = canvas.getBoundingClientRect();
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const {x, y} = self._canvasToWorld(pos.x, pos.y);
      self._openForm(null, self._wid, x, y);
    });

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      self._scale = Math.max(0.3, Math.min(3, self._scale * factor));
      const zl = document.getElementById('zoomLabel');
      if (zl) zl.textContent = Math.round(self._scale*100)+'%';
      self._draw();
    }, { passive: false });
  },

  _refreshCycleChips: function() {
    const cycles = [...new Set(this._events.map(e => e.regressionCycle ?? 0))].sort((a,b)=>a-b);
    const wrap = document.getElementById('cycleFilterWrap');
    if (!wrap) return;
    wrap.innerHTML = `
      <button class="filter-chip ${this._filterCycle === 'all' ? 'active' : ''}" data-cycle="all">전체</button>
      ${cycles.map(c => `<button class="filter-chip ${this._filterCycle === c ? 'active' : ''}" data-cycle="${c}">${c}회차</button>`).join('')}`;
    this._bindCycleChips(wrap);
  },

  _bindCycleChips: function(container) {
    const self = this;
    (container || document).querySelectorAll('.filter-chip[data-cycle]').forEach(btn => {
      btn.addEventListener('click', () => {
        (container || document).querySelectorAll('.filter-chip[data-cycle]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset.cycle;
        self._filterCycle = val === 'all' ? 'all' : Number(val);
        const cl = document.getElementById('eventsCountLabel');
        if (cl) cl.textContent = `사건 ${self._filteredEvents().length}개`;
        self._draw();
        const emptyMsg = document.getElementById('emptyGraphMsg');
        if (emptyMsg) emptyMsg.style.display = self._filteredEvents().length === 0 ? '' : 'none';
      });
    });
  },

  _setupControls: function(container) {
    const self = this;

    document.getElementById('btnZoomIn')?.addEventListener('click', () => {
      self._scale = Math.min(3, self._scale * 1.2);
      const zl = document.getElementById('zoomLabel');
      if (zl) zl.textContent = Math.round(self._scale*100)+'%';
      self._draw();
    });
    document.getElementById('btnZoomOut')?.addEventListener('click', () => {
      self._scale = Math.max(0.3, self._scale / 1.2);
      const zl = document.getElementById('zoomLabel');
      if (zl) zl.textContent = Math.round(self._scale*100)+'%';
      self._draw();
    });
    document.getElementById('btnZoomReset')?.addEventListener('click', () => {
      self._scale = 1; self._offsetX = 0; self._offsetY = 0;
      const zl = document.getElementById('zoomLabel');
      if (zl) zl.textContent = '100%';
      self._draw();
    });

    document.getElementById('btnAddEvent')?.addEventListener('click', () => {
      const cx = (self._canvas?.width / (devicePixelRatio||1) / 2 - self._offsetX) / self._scale;
      const cy = (self._canvas?.height / (devicePixelRatio||1) / 2 - self._offsetY) / self._scale;
      self._openForm(null, self._wid, cx + Math.random()*80-40, cy + Math.random()*80-40);
    });

    document.getElementById('btnToggleView')?.addEventListener('click', () => {
      self._viewMode = self._viewMode === 'graph' ? 'list' : 'graph';
      const graphArea = document.getElementById('graphArea');
      const listView = document.getElementById('listView');
      const btn = document.getElementById('btnToggleView');
      if (self._viewMode === 'list') {
        graphArea.style.display = 'none';
        listView.style.display = 'block';
        btn.textContent = '🕸️ 그래프';
        self._renderListView(listView);
      } else {
        graphArea.style.display = 'block';
        listView.style.display = 'none';
        btn.textContent = '📋 목록';
        requestAnimationFrame(() => self._draw());
      }
    });

    document.getElementById('btnExportEvents')?.addEventListener('click', () => {
      const sorted = [...self._filteredEvents()].sort((a,b) => (a.date||'').localeCompare(b.date||''));
      const text = sorted.map(e => Utils.toTextExport(`사건: ${e.name}`, [
        ['날짜', e.date], ['회차', e.regressionCycle !== undefined ? e.regressionCycle+'회차' : ''],
        ['설명', e.description],
        ['관련 인물', (e.involvedCharacters||[]).map(c=>c.name).join(', ')],
        ['연결', (e.outcomes||[]).map(o=>o.label||o.type).join(', ')],
      ])).join('\n\n');
      Utils.copyText(text);
    });

    this._bindCycleChips(document.getElementById('cycleFilterWrap'));
  },

  _showSheet: function(ev) {
    const sheet = document.getElementById('eventSheet');
    const content = document.getElementById('eventSheetContent');
    if (!sheet || !content) return;

    const self = this;
    const eventMap = {};
    this._events.forEach(e => eventMap[e.id] = e);
    const outCount = (ev.outcomes||[]).length;
    const inCount = this._events.filter(e => (e.outcomes||[]).some(o => o.targetId === ev.id)).length;

    content.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <div>
          <div style="font-size:11px;color:var(--color-text-muted);">${(ev.regressionCycle??0)}회차 · ${ev.date||'날짜 미정'}</div>
          <div style="font-weight:700;font-size:18px;">${Utils.escHtml(ev.name)}</div>
          <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">연결: 나가는 ${outCount}개 / 들어오는 ${inCount}개</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" id="btnEditEvent">편집</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--color-danger);" id="btnDelEvent">삭제</button>
          <button class="btn btn-ghost btn-sm" id="btnCloseSheet">✕</button>
        </div>
      </div>

      ${ev.description ? `<div style="white-space:pre-wrap;font-size:13px;margin-bottom:12px;">${Utils.nl2br(ev.description)}</div>` : ''}

      ${(ev.involvedCharacters||[]).length ? `
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;">관련 인물</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${(ev.involvedCharacters||[]).map(c => `
              <button class="btn btn-ghost btn-sm" onclick="AppRouter.navigate('characters',{highlightId:'${Utils.escHtml(c.id)}'});document.getElementById('eventSheet').style.transform='translateY(100%)';">
                👤 ${Utils.escHtml(c.name)}
              </button>`).join('')}
          </div>
        </div>` : ''}

      ${outCount ? `
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;">연결된 사건 (${outCount}개)</div>
          ${(ev.outcomes||[]).map((o, idx) => {
            const target = eventMap[o.targetId];
            const edgeColors = {'야기함':'#ef4444','필연적':'#f59e0b','선택적':'#3b82f6','동시발생':'#10b981','대립':'#ec4899','연관':'#a855f7'};
            const col = o.edgeColor || edgeColors[o.type] || '#6b7280';
            return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--color-border);">
              <span style="color:${col};font-size:11px;min-width:50px;">${o.type||'야기함'}</span>
              <button class="btn-outcome-nav" data-target-id="${Utils.escHtml(o.targetId)}" style="font-size:13px;font-weight:600;background:none;border:none;color:var(--color-primary);cursor:pointer;text-align:left;flex:1;">
                ${target ? Utils.escHtml(target.name) : '(알 수 없는 사건)'}
              </button>
              ${o.label ? `<span style="font-size:11px;color:var(--color-text-muted);">${Utils.escHtml(o.label)}</span>` : ''}
            </div>`;
          }).join('')}
        </div>` : ''}

      ${inCount ? `
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;">이 사건으로 연결된 사건 (${inCount}개)</div>
          ${this._events.filter(e => (e.outcomes||[]).some(o => o.targetId === ev.id)).map(src => `
            <div style="padding:4px 0;border-bottom:1px solid var(--color-border);">
              <button class="btn-outcome-nav" data-target-id="${Utils.escHtml(src.id)}" style="font-size:13px;background:none;border:none;color:var(--color-secondary);cursor:pointer;text-align:left;">
                ← ${Utils.escHtml(src.name)}
              </button>
            </div>`).join('')}
        </div>` : ''}

      ${ev.authorNotes ? `<div style="background:var(--color-surface2);border-radius:8px;padding:10px;font-size:12px;color:var(--color-text-muted);">📝 ${Utils.nl2br(ev.authorNotes)}</div>` : ''}
    `;

    sheet.style.transform = 'translateY(0)';

    content.querySelectorAll('.btn-outcome-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = self._events.find(e => e.id === btn.dataset.targetId);
        if (target) { self._selectedNode = target; self._showSheet(target); self._draw(); }
      });
    });

    document.getElementById('btnCloseSheet')?.addEventListener('click', () => {
      sheet.style.transform = 'translateY(100%)';
      self._selectedNode = null;
      self._draw();
    });
    document.getElementById('btnEditEvent')?.addEventListener('click', () => {
      sheet.style.transform = 'translateY(100%)';
      self._openForm(ev, self._wid, ev.x, ev.y);
    });
    document.getElementById('btnDelEvent')?.addEventListener('click', () => {
      sheet.style.transform = 'translateY(100%)';
      Utils.confirm(`"${ev.name}" 삭제`, '되돌릴 수 없습니다.', async () => {
        await DB.del('events', ev.id);
        self._events = await DB.getAll('events', self._wid);
        self._selectedNode = null;
        self._refreshCycleChips();
        self._draw();
        const cl = document.getElementById('eventsCountLabel');
        if (cl) cl.textContent = `사건 ${self._filteredEvents().length}개`;
        const emptyMsg = document.getElementById('emptyGraphMsg');
        if (emptyMsg) emptyMsg.style.display = self._events.length === 0 ? '' : 'none';
        Utils.toast('삭제됨', 'info');
      });
    });
  },

  _renderListView: function(listEl) {
    const self = this;
    const sorted = [...this._filteredEvents()].sort((a,b) => (a.date||'').localeCompare(b.date||''));
    if (!sorted.length) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-state__icon">📌</div><div class="empty-state__title">사건이 없습니다</div></div>';
      return;
    }
    listEl.innerHTML = sorted.map(ev => `
      <div class="list-item list-item--full" data-ev-id="${Utils.escHtml(ev.id)}" style="cursor:pointer;border-left:3px solid ${ev.color||'#3b82f6'};">
        <div style="flex:1;">
          <div style="font-size:11px;color:var(--color-text-muted);">${(ev.regressionCycle??0)}회차 · ${ev.date||''}</div>
          <div style="font-weight:700;">${Utils.escHtml(ev.name)}</div>
          ${ev.description ? `<div style="font-size:12px;color:var(--color-text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(ev.description)}</div>` : ''}
        </div>
        <div style="font-size:12px;color:var(--color-text-muted);">→${(ev.outcomes||[]).length}</div>
      </div>`).join('');

    listEl.querySelectorAll('[data-ev-id]').forEach(el => {
      el.addEventListener('click', () => {
        const evData = self._events.find(e => e.id === el.dataset.evId);
        if (evData) self._showSheet(evData);
      });
    });
  },

  _openForm: async function(ev, wid, defaultX = 200, defaultY = 200) {
    const self = this;
    const isEdit = !!ev;
    const chars = await DB.getAll('characters', wid);
    const allEvents = await DB.getAll('events', wid);

    const involvedIds = new Set((ev?.involvedCharacters||[]).map(c=>c.id));
    const EDGE_TYPES = ['야기함','필연적','선택적','동시발생','대립','연관'];
    const BASE_COLORS = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#6b7280','#ec4899','#06b6d4','#f97316','#14b8a6'];
    const allColors = [...BASE_COLORS, ...self._customColors];

    let selectedColor = ev?.color || '#3b82f6';
    let currentOutcomes = (ev?.outcomes||[]).map(o => ({...o}));

    const renderColorPicker = () => `
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
        ${allColors.map(c => `<button type="button" data-color="${c}" class="color-pick-btn" style="width:26px;height:26px;border-radius:50%;background:${c};border:3px solid ${selectedColor===c?'white':'transparent'};cursor:pointer;flex-shrink:0;"></button>`).join('')}
        <input type="color" id="customColorPicker" value="${selectedColor}" style="width:26px;height:26px;padding:0;border:none;border-radius:50%;cursor:pointer;background:none;" title="직접 선택">
        <button type="button" id="btnAddCustomColor" class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 6px;">+저장</button>
      </div>`;

    const outcomesHTML = () => currentOutcomes.map((o, i) => {
      const target = allEvents.find(e => e.id === o.targetId);
      const edgeCols = {'야기함':'#ef4444','필연적':'#f59e0b','선택적':'#3b82f6','동시발생':'#10b981','대립':'#ec4899','연관':'#a855f7'};
      const col = o.edgeColor || edgeCols[o.type] || '#6b7280';
      return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:6px;background:var(--color-surface2);border-radius:6px;">
        <span style="color:${col};font-size:12px;flex:1;">${target ? Utils.escHtml(target.name) : '?'} <span style="color:var(--color-text-muted)">(${o.type}${o.label ? ' · '+o.label : ''})</span></span>
        <button type="button" class="btn btn-ghost btn-sm btn-del-outcome" data-i="${i}" style="color:var(--color-danger);">✕</button>
      </div>`;
    }).join('') || '<div style="color:var(--color-text-muted);font-size:12px;padding:4px 0;">연결된 사건 없음</div>';

    const bindOutcomeButtons = () => {
      document.querySelectorAll('#globalModalBody .btn-del-outcome').forEach(btn => {
        btn.addEventListener('click', () => {
          currentOutcomes.splice(Number(btn.dataset.i), 1);
          const ol = document.getElementById('outcomesList');
          if (ol) ol.innerHTML = outcomesHTML();
          bindOutcomeButtons();
        });
      });
    };

    const charSearch = chars.length > 6 ? `
      <input class="input-field" id="charSearchInput" placeholder="캐릭터 검색..." style="margin-bottom:6px;font-size:12px;" />` : '';

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group"><label class="form-label">사건명 *</label>
          <input class="input-field" id="fEvName" value="${Utils.escHtml(ev?.name||'')}" /></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group"><label class="form-label">날짜</label>
            <input class="input-field" id="fEvDate" value="${Utils.escHtml(ev?.date||'')}" placeholder="2024.01.01" /></div>
          <div class="form-group"><label class="form-label">회귀 회차</label>
            <input type="number" class="input-field" id="fEvCycle" value="${ev?.regressionCycle??0}" min="0" /></div>
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
          <textarea class="textarea-field" id="fEvDesc" rows="4">${Utils.escHtml(ev?.description||'')}</textarea></div>

        <div class="form-group"><label class="form-label">관련 인물</label>
          ${charSearch}
          <div id="charCheckList" style="display:flex;flex-direction:column;gap:4px;max-height:160px;overflow-y:auto;">
            ${chars.map(c => `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;" data-char-name="${Utils.escHtml(c.name.toLowerCase())}">
              <input type="checkbox" data-char-id="${Utils.escHtml(c.id)}" data-char-name="${Utils.escHtml(c.name)}" ${involvedIds.has(c.id)?'checked':''} />
              <span>${Utils.escHtml(c.name)}</span>
            </label>`).join('')}
          </div></div>

        <div class="form-group">
          <label class="form-label">연결 사건 (인과관계)</label>
          <div id="outcomesList">${outcomesHTML()}</div>
          <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;align-items:center;">
            <select class="select-input" id="outcomeTarget" style="flex:1;min-width:0;">
              <option value="">사건 선택...</option>
              ${allEvents.filter(e => !ev || e.id !== ev.id).map(e => `<option value="${Utils.escHtml(e.id)}">${Utils.escHtml(e.name)}</option>`).join('')}
            </select>
            <select class="select-input" id="outcomeType" style="width:80px;">
              ${EDGE_TYPES.map(t => `<option>${t}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;align-items:center;">
            <input class="input-field" id="outcomeLabel" placeholder="설명 (선택)" style="flex:1;" />
            <button type="button" id="btnAddOutcome" class="btn btn-primary btn-sm">+ 연결 추가</button>
          </div>
        </div>

        <div class="form-group"><label class="form-label">작가 메모</label>
          <textarea class="textarea-field" id="fEvAuthor" rows="2">${Utils.escHtml(ev?.authorNotes||'')}</textarea></div>
      </div>`;

    Utils.openModal(isEdit ? '사건 편집' : '새 사건', body, async () => {
      const name = document.getElementById('fEvName')?.value.trim();
      if (!name) { Utils.toast('이름 필요', 'error'); return false; }

      const involvedChars = [...document.querySelectorAll('#globalModalBody input[data-char-id]:checked')].map(cb => ({
        id: cb.dataset.charId, name: cb.dataset.charName
      }));

      const item = {
        ...(ev||{}),
        worldId: wid, name,
        date: document.getElementById('fEvDate')?.value.trim(),
        regressionCycle: Number(document.getElementById('fEvCycle')?.value || 0),
        importance: document.getElementById('fEvImportance')?.value || 'minor',
        color: selectedColor,
        description: document.getElementById('fEvDesc')?.value.trim(),
        involvedCharacters: involvedChars,
        outcomes: currentOutcomes,
        authorNotes: document.getElementById('fEvAuthor')?.value.trim(),
        x: ev?.x ?? defaultX,
        y: ev?.y ?? defaultY,
      };

      await DB.put('events', item);
      await AppStore.updateStreak();
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      self._events = await DB.getAll('events', wid);
      self._refreshCycleChips();
      const cl = document.getElementById('eventsCountLabel');
      if (cl) cl.textContent = `사건 ${self._filteredEvents().length}개`;
      self._draw();
      const emptyMsg = document.getElementById('emptyGraphMsg');
      if (emptyMsg) emptyMsg.style.display = self._events.length === 0 ? '' : 'none';
      return true;
    }, isEdit ? '저장' : '추가');

    // Color picker binding
    const rebindColorPicker = () => {
      document.querySelectorAll('#globalModalBody .color-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedColor = btn.dataset.color;
          document.querySelectorAll('#globalModalBody .color-pick-btn').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = 'white';
          const picker = document.getElementById('customColorPicker');
          if (picker) picker.value = selectedColor;
        });
      });
      document.getElementById('customColorPicker')?.addEventListener('input', e => {
        selectedColor = e.target.value;
        document.querySelectorAll('#globalModalBody .color-pick-btn').forEach(b => b.style.borderColor = 'transparent');
      });
      document.getElementById('btnAddCustomColor')?.addEventListener('click', async () => {
        const picker = document.getElementById('customColorPicker');
        const newColor = picker ? picker.value : selectedColor;
        if (!self._customColors.includes(newColor)) {
          self._customColors.push(newColor);
          await DB.setSetting('eventColors', JSON.stringify(self._customColors));
        }
        const wrap = document.getElementById('colorPickerWrap');
        if (wrap) { wrap.innerHTML = renderColorPicker(); rebindColorPicker(); }
      });
    };
    rebindColorPicker();

    // Outcome add
    document.getElementById('btnAddOutcome')?.addEventListener('click', () => {
      const targetId = document.getElementById('outcomeTarget')?.value;
      if (!targetId) { Utils.toast('사건을 선택하세요', 'error'); return; }
      const type = document.getElementById('outcomeType')?.value || '야기함';
      const label = document.getElementById('outcomeLabel')?.value.trim() || '';
      currentOutcomes.push({ targetId, type, label });
      const ol = document.getElementById('outcomesList');
      if (ol) ol.innerHTML = outcomesHTML();
      bindOutcomeButtons();
      const labelInput = document.getElementById('outcomeLabel');
      if (labelInput) labelInput.value = '';
    });

    bindOutcomeButtons();

    // Character search
    if (chars.length > 6) {
      document.getElementById('charSearchInput')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('#charCheckList label').forEach(lbl => {
          const name = lbl.dataset.charName || '';
          lbl.style.display = name.includes(q) ? '' : 'none';
        });
      });
    }
  },

  destroy: function() {
    if (this._resizeObs) this._resizeObs.disconnect();
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    window.removeEventListener('resize', this._fixHeight);
    this._canvas = null;
    this._ctx = null;
  }
};
