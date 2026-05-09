'use strict';
window.Pages = window.Pages || {};
window.Pages.familyTree = {
  _canvas: null, _ctx: null,
  _container: null, _wid: null,
  _chars: [], _rels: [],
  _scale: 1, _offsetX: 0, _offsetY: 0,
  _draggingNode: null, _draggingCanvas: false, _isDraggingNode: false,
  _startX: 0, _startY: 0, _startOffX: 0, _startOffY: 0,
  _selectedChar: null,
  _nodePositions: {},
  _mode: 'rel',       // 'rel' | 'family'
  _focusCharId: '',
  _filterType: '',
  _resizeObs: null,
  _touchStartDist: null, _startScale: 1,

  REL_TYPES: ['부모', '자식', '형제/자매', '배우자', '연인', '친구', '적', '사제', '주종', '동료'],
  FAMILY_TYPES: ['부모', '자식', '형제/자매', '배우자'],
  REL_COLORS: {
    '부모': '#10b981', '자식': '#10b981', '형제/자매': '#3b82f6',
    '배우자': '#ec4899', '연인': '#f43f5e', '친구': '#f59e0b',
    '적': '#ef4444', '사제': '#8b5cf6', '주종': '#6366f1', '동료': '#64748b'
  },
  NODE_R: 28,

  init: async function(container, options) {
    options = options || {};
    this._container = container;
    this._wid = AppStore.getCurrentWorldId();
    if (!this._wid) {
      container.innerHTML = `<div class="empty-state" style="padding:48px;text-align:center;"><div style="font-size:48px;margin-bottom:12px;">🌍</div><div style="font-weight:700;font-size:16px;">세계를 먼저 선택하세요</div><button class="btn btn-primary" style="margin-top:16px;" onclick="AppRouter.navigate('world')">세계 관리</button></div>`;
      return;
    }
    this._chars = await DB.getAll('characters', this._wid);
    this._rels = await DB.getSetting('relationships_' + this._wid, []);
    const savedPos = await DB.getSetting('relPositions_' + this._wid, null);
    this._nodePositions = savedPos || {};
    this._initPositions();
    this._render(container);
  },

  _initPositions: function() {
    const cols = Math.max(1, Math.ceil(Math.sqrt(this._chars.length)));
    const spacing = 130;
    this._chars.forEach((c, i) => {
      if (!this._nodePositions[c.id]) {
        this._nodePositions[c.id] = {
          x: 80 + (i % cols) * spacing,
          y: 80 + Math.floor(i / cols) * spacing,
        };
      }
    });
  },

  // ── Family tree layout (hierarchical, read-only positions) ─────────────────
  _computeFamilyLayout: function() {
    const familyRels = this._rels.filter(r => this.FAMILY_TYPES.includes(r.type));
    const focusId = this._focusCharId;
    const filterType = this._filterType;

    // Collect relevant char IDs
    let relevantIds = new Set(this._chars.map(c => c.id));
    if (focusId) {
      const connected = new Set([focusId]);
      const queue = [focusId];
      while (queue.length) {
        const cur = queue.shift();
        familyRels.forEach(r => {
          const other = r.fromId === cur ? r.toId : r.toId === cur ? r.fromId : null;
          if (other && !connected.has(other)) { connected.add(other); queue.push(other); }
        });
      }
      relevantIds = connected;
    }

    const chars = this._chars.filter(c => relevantIds.has(c.id));
    if (!chars.length) return {};

    // Build parent→child adjacency
    const parentOf = {}; // parentId → [childId]
    const childOf  = {}; // childId  → [parentId]
    chars.forEach(c => { parentOf[c.id] = []; childOf[c.id] = []; });

    familyRels.forEach(r => {
      if (!relevantIds.has(r.fromId) || !relevantIds.has(r.toId)) return;
      if (r.type === '부모') {
        parentOf[r.fromId]?.push(r.toId);
        childOf[r.toId]?.push(r.fromId);
      } else if (r.type === '자식') {
        parentOf[r.toId]?.push(r.fromId);
        childOf[r.fromId]?.push(r.toId);
      }
    });

    // Assign generations via BFS from roots
    const gen = {};
    const roots = chars.filter(c => childOf[c.id].length === 0);
    if (!roots.length) roots.push(chars[0]);

    const queue = roots.map(c => { gen[c.id] = 0; return { id: c.id, g: 0 }; });
    const visited = new Set(roots.map(c => c.id));
    let qi = 0;
    while (qi < queue.length) {
      const { id, g } = queue[qi++];
      (parentOf[id] || []).forEach(childId => {
        if (!visited.has(childId)) {
          visited.add(childId);
          gen[childId] = g + 1;
          queue.push({ id: childId, g: g + 1 });
        }
      });
    }
    // Disconnected chars → gen 0
    chars.forEach(c => { if (gen[c.id] === undefined) gen[c.id] = 0; });

    // Group by gen
    const byGen = {};
    chars.forEach(c => {
      const g = gen[c.id];
      (byGen[g] = byGen[g] || []).push(c.id);
    });

    // Place in rows
    const spacingX = 130, spacingY = 150;
    const genNums = Object.keys(byGen).map(Number).sort((a, b) => a - b);
    const maxRow = Math.max(...genNums.map(g => byGen[g].length));
    const centerX = Math.max(400, maxRow * spacingX / 2 + 80);
    const positions = {};
    genNums.forEach(g => {
      const ids = byGen[g];
      const rowW = (ids.length - 1) * spacingX;
      ids.forEach((id, i) => {
        positions[id] = { x: centerX - rowW / 2 + i * spacingX, y: 80 + g * spacingY };
      });
    });
    return positions;
  },

  // ── Render shell ───────────────────────────────────────────────────────────
  _render: function(container) {
    const self = this;
    const isFamily = this._mode === 'family';
    container.innerHTML = `
    <div class="page active" style="display:flex;flex-direction:column;height:100%;overflow:hidden;">
      <div class="page-header" style="flex-shrink:0;" id="ftPageHeader">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <h2 class="page-title" style="margin:0;">관계도 / 가계도</h2>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            <button class="btn btn-sm" id="btnRelMode"
              style="background:${!isFamily?'var(--color-primary)':'var(--color-surface2)'};color:${!isFamily?'#000':'var(--color-text-muted)'};">전체 관계도</button>
            <button class="btn btn-sm" id="btnFamilyMode"
              style="background:${isFamily?'var(--color-primary)':'var(--color-surface2)'};color:${isFamily?'#000':'var(--color-text-muted)'};">가계도</button>
            <button class="btn btn-primary btn-sm" id="btnAddRel">+ 관계</button>
          </div>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;align-items:center;">
          <button class="btn btn-ghost btn-sm" id="btnZoomOut">−</button>
          <span id="zoomLabel" style="font-size:12px;min-width:40px;text-align:center;">${Math.round(this._scale * 100)}%</span>
          <button class="btn btn-ghost btn-sm" id="btnZoomIn">+</button>
          <button class="btn btn-ghost btn-sm" id="btnZoomReset">리셋</button>
          <span style="flex:1;"></span>
          <select id="focusCharSelect" class="select-input" style="font-size:12px;padding:4px 6px;max-width:110px;">
            <option value="">전체 인물</option>
            ${this._chars.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko')).map(c =>
              `<option value="${Utils.escHtml(c.id)}" ${this._focusCharId===c.id?'selected':''}>${Utils.escHtml(c.name)}</option>`).join('')}
          </select>
          <select id="filterTypeSelect" class="select-input" style="font-size:12px;padding:4px 6px;max-width:90px;">
            <option value="">유형전체</option>
            ${(isFamily ? this.FAMILY_TYPES : this.REL_TYPES).map(t =>
              `<option value="${t}" ${this._filterType===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        ${isFamily ? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:4px;">가계도: 부모·자식·형제자매·배우자 관계만 표시 · 세대별 자동 배치</div>` : `<div style="font-size:11px;color:var(--color-text-muted);margin-top:4px;">노드 드래그로 배치 조정 · 클릭하면 상세 정보</div>`}
      </div>

      <div id="graphArea" style="flex:1;position:relative;overflow:hidden;background:var(--color-bg);">
        <canvas id="relCanvas" style="display:block;touch-action:none;"></canvas>
        <div id="emptyMsg" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:var(--color-text-muted);pointer-events:none;${this._chars.length > 0 ? 'display:none;' : ''}">
          <div style="font-size:36px;opacity:0.3;">🌳</div>
          <div style="margin-top:8px;">캐릭터를 추가하고 관계를 연결하세요</div>
          <div style="font-size:12px;margin-top:4px;">위 + 관계 버튼으로 추가</div>
        </div>
        <!-- Legend -->
        <div style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.55);border-radius:8px;padding:6px 10px;font-size:10px;line-height:1.8;pointer-events:none;">
          ${Object.entries(this.REL_COLORS).filter(([t]) => isFamily ? this.FAMILY_TYPES.includes(t) : true)
            .filter(([t], i, arr) => arr.findIndex(x => x[1] === arr[i][1]) === i || true) // all
            .slice(0, isFamily ? 4 : 10)
            .map(([t, col]) => `<div style="color:${col};">● ${t}</div>`).join('')}
        </div>
      </div>

      <div id="charSheet" style="position:fixed;bottom:0;left:0;right:0;background:var(--color-surface);border-radius:16px 16px 0 0;box-shadow:0 -4px 20px rgba(0,0,0,0.4);transform:translateY(100%);transition:transform 0.3s ease;z-index:200;max-height:60vh;overflow-y:auto;padding:16px;">
        <div style="width:40px;height:4px;background:var(--color-border);border-radius:2px;margin:0 auto 12px;"></div>
        <div id="charSheetContent"></div>
      </div>
    </div>`;

    const canvas = document.getElementById('relCanvas');
    const area   = document.getElementById('graphArea');
    this._canvas = canvas;
    this._ctx    = canvas.getContext('2d');

    const resizeCanvas = () => {
      const w = area.offsetWidth, h = area.offsetHeight;
      if (!w || !h) return;
      const dpr = devicePixelRatio || 1;
      canvas.width  = w * dpr; canvas.height  = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      self._draw();
    };

    const fixHeight = () => {
      const header = document.getElementById('ftPageHeader');
      if (!header || !area) return;
      const hb = header.getBoundingClientRect().bottom;
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bottom-nav-h')) || 56;
      const safe = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) || 0;
      const avail = (window.visualViewport ? window.visualViewport.height : window.innerHeight) - hb - navH - safe - 4;
      area.style.height = Math.max(180, avail) + 'px';
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

  // ── Filtering ──────────────────────────────────────────────────────────────
  _visibleRels: function() {
    let rels = this._rels;
    if (this._mode === 'family') rels = rels.filter(r => this.FAMILY_TYPES.includes(r.type));
    if (this._filterType) rels = rels.filter(r => r.type === this._filterType);
    if (this._focusCharId) rels = rels.filter(r => r.fromId === this._focusCharId || r.toId === this._focusCharId);
    return rels;
  },

  _visibleChars: function() {
    if (!this._focusCharId) return this._chars;
    const connected = new Set([this._focusCharId]);
    this._visibleRels().forEach(r => { connected.add(r.fromId); connected.add(r.toId); });
    return this._chars.filter(c => connected.has(c.id));
  },

  _getPositions: function() {
    return this._mode === 'family' ? this._computeFamilyLayout() : this._nodePositions;
  },

  // ── Drawing ────────────────────────────────────────────────────────────────
  _draw: function() {
    const canvas = this._canvas, ctx = this._ctx;
    if (!canvas || !ctx) return;
    const dpr = devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(this._offsetX, this._offsetY);
    ctx.scale(this._scale, this._scale);

    const positions = this._getPositions();
    const chars = this._visibleChars();
    const rels  = this._visibleRels();

    // Draw edges first
    rels.forEach(r => {
      const fp = positions[r.fromId], tp = positions[r.toId];
      if (fp && tp) this._drawEdge(ctx, fp, tp, r);
    });
    // Draw nodes
    chars.forEach(c => {
      const p = positions[c.id];
      if (p) this._drawNode(ctx, c, p, this._selectedChar?.id === c.id);
    });

    ctx.restore();
  },

  _drawNode: function(ctx, c, p, selected) {
    const r = this.NODE_R;
    const col = c.importance === 'main' ? '#f59e0b' : c.importance === 'sub' ? '#818cf8' : '#3b82f6';

    if (selected) { ctx.shadowColor = col; ctx.shadowBlur = 18; }
    ctx.fillStyle = col + '33';
    ctx.strokeStyle = selected ? col : col + 'aa';
    ctx.lineWidth = selected ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Star for main char
    if (c.importance === 'main') {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', p.x, p.y - r + 11);
    }

    // Name inside circle
    const name = c.name || '?';
    const short = name.length > 4 ? name.slice(0, 4) : name;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `bold ${short.length <= 2 ? 13 : 11}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(short, p.x, p.y + (c.importance === 'main' ? 6 : 4));

    // Full name below circle
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px sans-serif';
    const label = name.length > 6 ? name.slice(0, 5) + '…' : name;
    ctx.fillText(label, p.x, p.y + r + 13);
  },

  _drawEdge: function(ctx, fp, tp, r) {
    const col = this.REL_COLORS[r.type] || '#6b7280';
    const dx = tp.x - fp.x, dy = tp.y - fp.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const R = this.NODE_R;
    const sx = fp.x + (dx / len) * R, sy = fp.y + (dy / len) * R;
    const ex = tp.x - (dx / len) * R, ey = tp.y - (dy / len) * R;
    const mx = (sx + ex) / 2, my = (sy + ey) / 2 - 22;

    ctx.strokeStyle = col + 'cc';
    ctx.lineWidth = 1.5;
    ctx.setLineDash(r.type === '친구' ? [5, 3] : r.type === '적' ? [3, 2] : []);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead
    const angle = Math.atan2(ey - my, ex - mx);
    ctx.fillStyle = col + 'cc';
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 9 * Math.cos(angle - 0.35), ey - 9 * Math.sin(angle - 0.35));
    ctx.lineTo(ex - 9 * Math.cos(angle + 0.35), ey - 9 * Math.sin(angle + 0.35));
    ctx.closePath();
    ctx.fill();

    // Edge label
    ctx.fillStyle = col;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    const lbl = r.label ? `${r.type}·${r.label}` : r.type;
    ctx.fillText(lbl.length > 9 ? lbl.slice(0, 8) + '…' : lbl, mx, my - 4);
  },

  // ── Hit testing & coordinate conversion ───────────────────────────────────
  _canvasToWorld: function(cx, cy) {
    return { x: (cx - this._offsetX) / this._scale, y: (cy - this._offsetY) / this._scale };
  },

  _hitTest: function(cx, cy) {
    const { x, y } = this._canvasToWorld(cx, cy);
    const positions = this._getPositions();
    return this._visibleChars().find(c => {
      const p = positions[c.id];
      if (!p) return false;
      return Math.hypot(x - p.x, y - p.y) <= this.NODE_R + 6;
    });
  },

  // ── Canvas events ──────────────────────────────────────────────────────────
  _setupCanvasEvents: function(canvas) {
    const self = this;
    let longPressTimer = null;

    const getPos = e => {
      const rect = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return { x: src.clientX - rect.left, y: src.clientY - rect.top };
    };

    const onStart = e => {
      e.preventDefault();
      const pos = getPos(e);
      if (e.touches && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        self._touchStartDist = Math.hypot(dx, dy);
        self._startScale = self._scale;
        return;
      }
      self._startX = pos.x; self._startY = pos.y;
      self._startOffX = self._offsetX; self._startOffY = self._offsetY;
      self._isDraggingNode = false;
      const hit = self._hitTest(pos.x, pos.y);
      if (hit) {
        self._draggingNode = hit;
        longPressTimer = setTimeout(() => {
          if (!self._isDraggingNode) self._showSheet(hit);
        }, 380);
      } else {
        self._draggingCanvas = true;
      }
    };

    const onMove = e => {
      e.preventDefault();
      if (e.touches && e.touches.length === 2 && self._touchStartDist) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        self._scale = Math.max(0.2, Math.min(3, self._startScale * Math.hypot(dx, dy) / self._touchStartDist));
        const zl = document.getElementById('zoomLabel');
        if (zl) zl.textContent = Math.round(self._scale * 100) + '%';
        self._draw(); return;
      }
      const pos = getPos(e);
      const dx = pos.x - self._startX, dy = pos.y - self._startY;
      if (self._draggingNode && self._mode === 'rel') {
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          self._isDraggingNode = true;
          clearTimeout(longPressTimer);
          const w = self._canvasToWorld(pos.x, pos.y);
          self._nodePositions[self._draggingNode.id] = { x: w.x, y: w.y };
          self._draw();
        }
      } else if (self._draggingCanvas) {
        self._offsetX = self._startOffX + dx;
        self._offsetY = self._startOffY + dy;
        self._draw();
      }
    };

    const onEnd = async e => {
      clearTimeout(longPressTimer);
      self._touchStartDist = null;
      if (self._draggingNode) {
        if (self._isDraggingNode && self._mode === 'rel') {
          await DB.setSetting('relPositions_' + self._wid, self._nodePositions);
        } else if (!self._isDraggingNode) {
          self._selectedChar = self._draggingNode;
          self._showSheet(self._draggingNode);
          self._draw();
        }
      }
      self._draggingNode = null;
      self._isDraggingNode = false;
      self._draggingCanvas = false;
    };

    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove',  onMove,  { passive: false });
    canvas.addEventListener('touchend',   onEnd,   { passive: false });
    canvas.addEventListener('mousedown',  onStart);
    canvas.addEventListener('mousemove',  onMove);
    canvas.addEventListener('mouseup',    onEnd);
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      self._scale = Math.max(0.2, Math.min(3, self._scale * (e.deltaY < 0 ? 1.1 : 0.9)));
      const zl = document.getElementById('zoomLabel');
      if (zl) zl.textContent = Math.round(self._scale * 100) + '%';
      self._draw();
    }, { passive: false });
  },

  // ── Top controls ───────────────────────────────────────────────────────────
  _setupControls: function(container) {
    const self = this;
    document.getElementById('btnZoomIn')?.addEventListener('click', () => {
      self._scale = Math.min(3, self._scale * 1.2);
      document.getElementById('zoomLabel').textContent = Math.round(self._scale * 100) + '%';
      self._draw();
    });
    document.getElementById('btnZoomOut')?.addEventListener('click', () => {
      self._scale = Math.max(0.2, self._scale / 1.2);
      document.getElementById('zoomLabel').textContent = Math.round(self._scale * 100) + '%';
      self._draw();
    });
    document.getElementById('btnZoomReset')?.addEventListener('click', () => {
      self._scale = 1; self._offsetX = 0; self._offsetY = 0;
      document.getElementById('zoomLabel').textContent = '100%';
      self._draw();
    });
    document.getElementById('btnRelMode')?.addEventListener('click', () => {
      self._mode = 'rel'; self._filterType = '';
      self._render(container);
    });
    document.getElementById('btnFamilyMode')?.addEventListener('click', () => {
      self._mode = 'family'; self._filterType = '';
      self._render(container);
    });
    document.getElementById('focusCharSelect')?.addEventListener('change', e => {
      self._focusCharId = e.target.value;
      self._draw();
    });
    document.getElementById('filterTypeSelect')?.addEventListener('change', e => {
      self._filterType = e.target.value;
      self._draw();
    });
    document.getElementById('btnAddRel')?.addEventListener('click', () => {
      if (self._chars.length < 2) { Utils.toast('캐릭터 2명 이상 필요합니다', 'error'); return; }
      self._openRelForm(null, container);
    });
  },

  // ── Bottom sheet for selected character ───────────────────────────────────
  _showSheet: function(char) {
    const sheet = document.getElementById('charSheet');
    const content = document.getElementById('charSheetContent');
    if (!sheet || !content) return;
    const self = this;
    const charMap = Object.fromEntries(this._chars.map(c => [c.id, c]));

    const myRels = this._rels.filter(r => r.fromId === char.id || r.toId === char.id);
    // Sort: family types first
    myRels.sort((a, b) => {
      const fi = this.FAMILY_TYPES.indexOf(a.type), fj = this.FAMILY_TYPES.indexOf(b.type);
      return (fi === -1 ? 99 : fi) - (fj === -1 ? 99 : fj);
    });

    content.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <div>
          ${char.importance === 'main' ? `<div style="font-size:11px;color:#f59e0b;">★ 주요 캐릭터</div>` : char.importance === 'sub' ? `<div style="font-size:11px;color:#818cf8;">☆ 서브 캐릭터</div>` : ''}
          <div style="font-weight:700;font-size:18px;">${Utils.escHtml(char.name)}</div>
          <div style="font-size:12px;color:var(--color-text-muted);">${Utils.escHtml(char.race || '')}${char.age ? ' · ' + char.age + '세' : ''}${char.gender && char.gender !== '미지정' ? ' · ' + Utils.escHtml(char.gender) : ''}</div>
          ${char.title ? `<div style="font-size:12px;color:var(--color-text-muted);">[${Utils.escHtml(char.title)}]</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" id="btnAddRelFromSheet">+ 관계</button>
          <button class="btn btn-ghost btn-sm" id="btnGoToChar">프로필 →</button>
          <button class="btn btn-ghost btn-sm" id="btnCloseSheet">✕</button>
        </div>
      </div>
      ${myRels.length === 0
        ? '<div style="color:var(--color-text-muted);font-size:13px;padding:8px 0;">관계 없음</div>'
        : `<div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">관계 ${myRels.length}개</div>
           ${myRels.map(r => {
             const otherId = r.fromId === char.id ? r.toId : r.fromId;
             const other = charMap[otherId];
             const col = this.REL_COLORS[r.type] || '#6b7280';
             const dir = r.fromId === char.id ? '→' : '←';
             const ri = this._rels.indexOf(r);
             return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--color-border);">
               <span style="min-width:56px;font-size:12px;color:${col};font-weight:600;">${r.type}</span>
               <button class="btn-focus-other" data-cid="${Utils.escHtml(otherId)}"
                 style="flex:1;font-size:13px;font-weight:600;background:none;border:none;color:var(--color-primary);cursor:pointer;text-align:left;padding:0;">
                 ${dir} ${Utils.escHtml(other?.name || '?')}
               </button>
               ${r.label ? `<span style="font-size:11px;color:var(--color-text-dim);">${Utils.escHtml(r.label)}</span>` : ''}
               <button class="btn btn-ghost btn-sm btn-edit-rel-s" data-ri="${ri}" style="font-size:11px;padding:2px 6px;">편집</button>
               <button class="btn btn-ghost btn-sm btn-del-rel-s" data-ri="${ri}" style="font-size:11px;padding:2px 6px;color:var(--color-danger);">삭제</button>
             </div>`;
           }).join('')}`}
    `;

    sheet.style.transform = 'translateY(0)';

    document.getElementById('btnCloseSheet')?.addEventListener('click', () => {
      sheet.style.transform = 'translateY(100%)';
      self._selectedChar = null; self._draw();
    });
    document.getElementById('btnGoToChar')?.addEventListener('click', () => {
      sheet.style.transform = 'translateY(100%)';
      AppRouter.navigate('characters', { highlightId: char.id });
    });
    document.getElementById('btnAddRelFromSheet')?.addEventListener('click', () => {
      sheet.style.transform = 'translateY(100%)';
      self._openRelForm(null, self._container, char.id);
    });
    content.querySelectorAll('.btn-focus-other').forEach(btn => {
      btn.addEventListener('click', () => {
        const other = self._chars.find(c => c.id === btn.dataset.cid);
        if (other) { self._selectedChar = other; self._showSheet(other); self._draw(); }
      });
    });
    content.querySelectorAll('.btn-edit-rel-s').forEach(btn => {
      btn.addEventListener('click', () => {
        sheet.style.transform = 'translateY(100%)';
        self._openRelForm(Number(btn.dataset.ri), self._container);
      });
    });
    content.querySelectorAll('.btn-del-rel-s').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.ri);
        const relName = self._rels[i]?.type || '관계';
        Utils.confirmWithInput('관계 삭제', '삭제하면 되돌릴 수 없습니다.', relName, async () => {
          self._rels.splice(i, 1);
          await DB.setSetting('relationships_' + self._wid, self._rels);
          sheet.style.transform = 'translateY(100%)';
          self._selectedChar = null; self._draw();
          Utils.toast('삭제됨', 'info');
        });
      });
    });
  },

  // ── Relationship form ──────────────────────────────────────────────────────
  _openRelForm: function(editIndex, container, presetFromId) {
    const self = this;
    const isEdit = editIndex !== null && editIndex !== undefined && editIndex >= 0;
    const existing = isEdit ? this._rels[editIndex] : null;
    const sortedChars = this._chars.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));

    const body = `
      <div class="form-group">
        <label class="form-label">출발 캐릭터 *</label>
        <select class="select-input" id="fRelFrom">
          ${sortedChars.map(c => `<option value="${Utils.escHtml(c.id)}"
            ${(existing?.fromId || presetFromId) === c.id ? 'selected' : ''}>${Utils.escHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">관계 타입 *</label>
        <select class="select-input" id="fRelType">
          ${this.REL_TYPES.map(t => `<option ${existing?.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">도착 캐릭터 *</label>
        <select class="select-input" id="fRelTo">
          ${sortedChars.map(c => `<option value="${Utils.escHtml(c.id)}"
            ${existing?.toId === c.id ? 'selected' : ''}>${Utils.escHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div style="font-size:11px;color:var(--color-text-muted);margin:-6px 0 4px;padding:0 2px;">
        예) A → 부모 → B : "A는 B의 부모다"<br>
            A → 배우자 → B : "A와 B는 배우자다"
      </div>
      <div class="form-group">
        <label class="form-label">라벨 (선택)</label>
        <input class="input-field" id="fRelLabel" placeholder="예: 아버지의 제자" value="${Utils.escHtml(existing?.label || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">설명</label>
        <textarea class="textarea-field" id="fRelDesc" rows="2" placeholder="관계 부가 설명...">${Utils.escHtml(existing?.description || '')}</textarea>
      </div>`;

    Utils.openModal(isEdit ? '관계 편집' : '관계 추가', body, async () => {
      const fromId = document.getElementById('fRelFrom')?.value;
      const toId   = document.getElementById('fRelTo')?.value;
      if (fromId === toId) { Utils.toast('같은 캐릭터는 선택 불가', 'error'); return false; }
      const item = {
        fromId, toId,
        type:        document.getElementById('fRelType')?.value,
        label:       document.getElementById('fRelLabel')?.value.trim() || '',
        description: document.getElementById('fRelDesc')?.value.trim() || '',
      };
      if (isEdit) self._rels[editIndex] = item;
      else self._rels.push(item);
      await DB.setSetting('relationships_' + self._wid, self._rels);
      Utils.toast(isEdit ? '저장됨' : '관계 추가됨', 'success');
      self._draw();
      return true;
    }, isEdit ? '저장' : '추가');
  },

  destroy: function() {
    if (this._resizeObs) this._resizeObs.disconnect();
    window.removeEventListener('resize', () => {});
    this._canvas = null;
    this._ctx = null;
  }
};
