'use strict';
window.Pages = window.Pages || {};
window.Pages.familyTree = {
  _relData: [],
  _wid: null,
  _container: null,

  REL_TYPES: ['부모', '자식', '형제/자매', '배우자', '연인', '친구', '적', '사제', '주종', '동료'],
  REL_COLORS: {
    '부모': '#10b981', '자식': '#10b981', '형제/자매': '#3b82f6',
    '배우자': '#ec4899', '연인': '#f43f5e', '친구': '#f59e0b',
    '적': '#ef4444', '사제': '#8b5cf6', '주종': '#6366f1', '동료': '#64748b'
  },

  init: async function(container, options) {
    options = options || {};
    this._container = container;
    const wid = AppStore.getCurrentWorldId();

    if (!wid) {
      container.innerHTML = `
        <div class="empty-state" style="padding:48px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">🌍</div>
          <div style="font-weight:700;font-size:16px;margin-bottom:4px;">세계를 먼저 선택하세요</div>
          <div style="font-size:13px;color:var(--color-text-muted);">홈에서 세계를 선택하거나 새로 만드세요</div>
          <button class="btn btn-primary" style="margin-top:16px;" onclick="AppRouter.navigate('world')">세계 관리</button>
        </div>`;
      return;
    }

    this._wid = wid;
    const chars = await DB.getAll('characters', wid);
    const relData = await DB.getSetting('relationships_' + wid, []);
    this._relData = relData;

    window._ftPage = this;
    this._renderPage(container, chars, relData, wid);
  },

  _renderPage: function(container, chars, relData, wid) {
    const self = this;
    const REL_COLORS = this.REL_COLORS;
    const REL_TYPES = this.REL_TYPES;

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">관계도</h2>
          <button class="btn btn-primary btn-sm" id="btnAddRel">+ 관계 추가</button>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          캐릭터를 클릭하면 상세 페이지로 이동합니다 · ${relData.length}개 관계
        </p>
      </div>

      ${chars.length < 2 ? `
        <div class="empty-state" style="padding:48px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">🌳</div>
          <div style="font-weight:700;font-size:16px;margin-bottom:4px;">캐릭터 2명 이상 필요</div>
          <div style="font-size:13px;color:var(--color-text-muted);">캐릭터를 먼저 추가하세요</div>
          <button class="btn btn-primary" style="margin-top:16px;" onclick="AppRouter.navigate('characters')">캐릭터 관리</button>
        </div>
      ` : `
        <!-- Relationship List -->
        <div id="relList" class="item-list" style="margin-bottom:16px;">
          ${relData.length === 0
            ? `<div class="empty-state" style="padding:24px;text-align:center;">
                 <div style="font-size:13px;color:var(--color-text-muted);">관계가 없습니다. 위 버튼으로 추가하세요.</div>
               </div>`
            : relData.map((r, i) => {
                const from = chars.find(c => c.id === r.fromId);
                const to = chars.find(c => c.id === r.toId);
                if (!from || !to) return '';
                const col = REL_COLORS[r.type] || '#6b7280';
                return `
                <div class="list-item" style="border-left:3px solid ${col};background:var(--color-surface2);border-radius:10px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
                  <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:14px;">
                      ${Utils.escHtml(from.name)} <span style="color:${col};">→</span> ${Utils.escHtml(to.name)}
                    </div>
                    <div style="font-size:12px;color:${col};margin-top:2px;">${Utils.escHtml(r.type)}${r.label ? ' · ' + Utils.escHtml(r.label) : ''}</div>
                    ${r.description ? `<div style="font-size:12px;color:var(--color-text-dim);margin-top:2px;">${Utils.escHtml(r.description)}</div>` : ''}
                  </div>
                  <div style="display:flex;gap:4px;flex-shrink:0;">
                    <button class="btn btn-ghost btn-sm btn-edit-rel" data-ri="${i}">편집</button>
                    <button class="btn btn-ghost btn-sm btn-del-rel" data-ri="${i}" style="color:var(--color-danger);">삭제</button>
                  </div>
                </div>`;
              }).join('')}
        </div>

        <!-- SVG Visualization -->
        <div style="background:var(--color-surface2);border-radius:12px;padding:16px;overflow:auto;-webkit-overflow-scrolling:touch;">
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:12px;font-weight:600;">관계 시각화</div>
          ${this._renderSVG(chars, relData, REL_COLORS)}
        </div>
      `}
    </div>`;

    if (chars.length < 2) {
      document.getElementById('btnAddRel')?.addEventListener('click', () => {
        Utils.toast('캐릭터 2명 이상 필요합니다', 'error');
      });
      return;
    }

    // Add relationship button
    document.getElementById('btnAddRel')?.addEventListener('click', () => {
      self._openRelForm(null, chars, relData, wid, container);
    });

    // Edit rel buttons
    container.querySelectorAll('.btn-edit-rel').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.ri);
        self._openRelForm(i, chars, relData, wid, container);
      });
    });

    // Delete rel buttons
    container.querySelectorAll('.btn-del-rel').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.ri);
        Utils.confirm('관계 삭제', '이 관계를 삭제하시겠습니까?', async () => {
          relData.splice(i, 1);
          await DB.setSetting('relationships_' + wid, relData);
          Utils.toast('삭제됨', 'info');
          self.init(container);
        });
      });
    });
  },

  _openRelForm: function(editIndex, chars, relData, wid, container) {
    const self = this;
    const isEdit = editIndex !== null && editIndex !== undefined;
    const existing = isEdit ? relData[editIndex] : null;

    const body = `
      <div class="form-group">
        <label class="form-label">출발 캐릭터 *</label>
        <select class="select-input" id="fRelFrom">
          ${chars.map(c => `<option value="${Utils.escHtml(c.id)}" ${existing && existing.fromId === c.id ? 'selected' : ''}>${Utils.escHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">관계 타입 *</label>
        <select class="select-input" id="fRelType">
          ${this.REL_TYPES.map(t => `<option ${existing && existing.type === t ? 'selected' : ''}>${Utils.escHtml(t)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">도착 캐릭터 *</label>
        <select class="select-input" id="fRelTo">
          ${chars.map(c => `<option value="${Utils.escHtml(c.id)}" ${existing && existing.toId === c.id ? 'selected' : ''}>${Utils.escHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">라벨 (선택)</label>
        <input class="input-field" id="fRelLabel" placeholder="예: 아버지의 제자" value="${Utils.escHtml(existing?.label || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label">설명</label>
        <textarea class="textarea-field" id="fRelDesc" rows="2" placeholder="관계에 대한 부가 설명...">${Utils.escHtml(existing?.description || '')}</textarea>
      </div>`;

    Utils.openModal(isEdit ? '관계 편집' : '관계 추가', body, async () => {
      const fromId = document.getElementById('fRelFrom')?.value;
      const toId = document.getElementById('fRelTo')?.value;
      if (fromId === toId) { Utils.toast('같은 캐릭터는 선택 불가', 'error'); return false; }
      const relItem = {
        fromId,
        toId,
        type: document.getElementById('fRelType')?.value,
        label: document.getElementById('fRelLabel')?.value.trim(),
        description: document.getElementById('fRelDesc')?.value.trim(),
      };
      if (isEdit) {
        relData[editIndex] = relItem;
      } else {
        relData.push(relItem);
      }
      await DB.setSetting('relationships_' + wid, relData);
      Utils.toast(isEdit ? '저장됨' : '관계 추가됨', 'success');
      self.init(container);
      return true;
    }, isEdit ? '저장' : '추가');
  },

  _renderSVG: function(chars, rels, colors) {
    if (!chars.length) return '<div style="text-align:center;color:var(--color-text-muted);padding:24px;">캐릭터 없음</div>';

    const cols = Math.ceil(Math.sqrt(chars.length));
    const nodeW = 120;
    const nodeH = 100;
    const W = Math.max(500, cols * nodeW + 80);
    const rows = Math.ceil(chars.length / cols);
    const H = Math.max(250, rows * nodeH + 80);

    const positions = {};
    chars.forEach((c, i) => {
      positions[c.id] = {
        x: 60 + (i % cols) * nodeW,
        y: 60 + Math.floor(i / cols) * nodeH,
      };
    });

    let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="min-width:${W}px;display:block;">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#6b7280" />
      </marker>
    </defs>`;

    // Draw edges first
    rels.forEach(r => {
      const f = positions[r.fromId];
      const t = positions[r.toId];
      if (!f || !t) return;
      const col = colors[r.type] || '#6b7280';
      // shorten line to not overlap nodes
      const dx = t.x - f.x;
      const dy = t.y - f.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return;
      const r2 = 32;
      const sx = f.x + (dx / len) * r2;
      const sy = f.y + (dy / len) * r2;
      const ex = t.x - (dx / len) * r2;
      const ey = t.y - (dy / len) * r2;
      const mx = (sx + ex) / 2;
      const my = (sy + ey) / 2;
      svg += `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="${col}" stroke-width="2" stroke-opacity="0.7" marker-end="url(#arrow)" />`;
      svg += `<text x="${mx.toFixed(1)}" y="${(my - 5).toFixed(1)}" text-anchor="middle" fill="${col}" font-size="10" font-family="sans-serif">${Utils.escHtml(r.type)}</text>`;
    });

    // Draw nodes
    chars.forEach(c => {
      const p = positions[c.id];
      const nameShort = c.name.length > 4 ? c.name.slice(0, 4) : c.name;
      svg += `
      <g onclick="AppRouter.navigate('characters',{highlightId:'${Utils.escHtml(c.id)}'})" style="cursor:pointer;" title="${Utils.escHtml(c.name)}">
        <circle cx="${p.x}" cy="${p.y}" r="30" fill="#1e2a3a" stroke="#3b82f6" stroke-width="2" />
        <text x="${p.x}" y="${p.y + 5}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="bold" font-family="sans-serif">${Utils.escHtml(nameShort)}</text>
        <text x="${p.x}" y="${p.y + 44}" text-anchor="middle" fill="#94a3b8" font-size="10" font-family="sans-serif">${Utils.escHtml(c.name)}</text>
        ${c.level ? `<text x="${p.x}" y="${p.y - 36}" text-anchor="middle" fill="#64748b" font-size="9" font-family="sans-serif">Lv.${Utils.escHtml(String(c.level))}</text>` : ''}
      </g>`;
    });

    svg += '</svg>';
    return svg;
  },

  destroy: function() {
    window._ftPage = null;
  }
};
