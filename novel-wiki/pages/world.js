'use strict';
window.Pages = window.Pages || {};
window.Pages.world = {
  _container: null,

  init: async function(container) {
    this._container = container;
    const worlds = await DB.getAll('worlds');
    container.innerHTML = this._render(worlds);
    this._bind(container, worlds);
  },

  _render: function(worlds) {
    const wid = AppStore.getCurrentWorldId();
    return `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">세계/차원 관리</h2>
          <button class="btn btn-primary btn-sm" id="btnAddWorld">+ 추가</button>
        </div>
        <p class="page-desc" style="margin-top:6px;font-size:12px;color:var(--color-text-muted);">
          각 세계는 독립된 검색 범위를 가집니다. 캐릭터·아이템을 다른 세계로 복사하려면 항목에서 "복사" 기능을 사용하세요.
        </p>
        <input class="input-field" id="worldFilter" placeholder="세계 이름 검색..." style="margin-top:8px;" />
      </div>

      ${worlds.length === 0 ? `
        <div class="empty-state" style="padding:48px;text-align:center;">
          <div class="empty-state__icon" style="font-size:48px;margin-bottom:12px;">🌍</div>
          <div class="empty-state__title" style="font-weight:700;font-size:16px;margin-bottom:4px;">세계가 없습니다</div>
          <div class="empty-state__desc" style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 첫 번째 세계를 만드세요</div>
        </div>
      ` : `
        <div class="item-list" id="worldList">
          ${worlds.map(w => `
            <div class="list-item list-item--full world-card"
              data-id="${Utils.escHtml(w.id)}"
              data-search="${Utils.escHtml((w.name + ' ' + (w.type || '')).toLowerCase())}"
              style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--color-surface2);border-radius:12px;border:1px solid var(--color-border);margin-bottom:8px;${w.id === wid ? 'border-color:var(--color-primary);' : ''}">
              <div style="background:${Utils.escHtml(w.color || '#3b82f6')}22;color:${Utils.escHtml(w.color || '#3b82f6')};font-size:22px;width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${Utils.escHtml(w.icon || '🌍')}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(w.name)}</div>
                <div style="font-size:12px;color:var(--color-text-muted);">${Utils.escHtml(w.type || '커스텀')}${w.id === wid ? ' · <strong style="color:var(--color-primary);">현재 세계</strong>' : ''}</div>
                ${w.description ? `<div style="font-size:12px;color:var(--color-text-dim);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(w.description)}</div>` : ''}
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;align-items:flex-end;">
                ${w.id !== wid
                  ? `<button class="btn btn-ghost btn-sm btn-set-world" data-id="${Utils.escHtml(w.id)}">선택</button>`
                  : `<span class="badge" style="background:var(--color-primary);color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;">현재</span>`}
                <div style="display:flex;gap:4px;">
                  <button class="btn btn-ghost btn-sm btn-edit-world" data-id="${Utils.escHtml(w.id)}">편집</button>
                  <button class="btn btn-ghost btn-sm btn-del-world" data-id="${Utils.escHtml(w.id)}" style="color:var(--color-danger);">삭제</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>`;
  },

  _openForm: function(world, onSave) {
    const TYPES = ['지구(메인)', '천계', '마계', '이면세계', '거울세계', '몽환세계', '탑내부', '커스텀'];
    const ICONS = ['🌍', '🌙', '👁️', '🪞', '💫', '🏰', '⚡', '🌀', '🌟', '🔮', '☀️', '🌊'];
    const isEdit = !!world;
    let selectedIcon = world?.icon || '🌍';

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">세계 이름 *</label>
          <input class="input-field" id="fWorldName" value="${Utils.escHtml(world?.name || '')}" placeholder="예: 지구, 천계, 마계" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">타입</label>
          <select class="select-input" id="fWorldType" style="width:100%;">
            ${TYPES.map(t => `<option ${(world?.type || '커스텀') === t ? 'selected' : ''}>${Utils.escHtml(t)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">아이콘</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;" id="iconPicker">
            ${ICONS.map(ic => `
              <button type="button" class="icon-pick-btn" data-icon="${ic}"
                style="font-size:24px;padding:6px;border:2px solid ${selectedIcon === ic ? 'var(--color-primary)' : 'transparent'};border-radius:8px;background:none;cursor:pointer;">
                ${ic}
              </button>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">대표 색상</label>
          <input type="color" id="fWorldColor" value="${world?.color || '#3b82f6'}"
            style="width:100%;height:44px;border-radius:8px;border:1px solid var(--color-border);cursor:pointer;padding:2px;" />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">설명</label>
          <textarea class="textarea-field" id="fWorldDesc" rows="3"
            placeholder="세계 배경 설명..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(world?.description || '')}</textarea>
        </div>
      </div>
    `;

    Utils.openModal(isEdit ? '세계 편집' : '새 세계 추가', body, async () => {
      const name = document.getElementById('fWorldName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }
      const item = {
        ...(world || {}),
        name,
        type: document.getElementById('fWorldType')?.value,
        icon: selectedIcon,
        color: document.getElementById('fWorldColor')?.value || '#3b82f6',
        description: document.getElementById('fWorldDesc')?.value.trim(),
        updatedAt: Date.now(),
        createdAt: world?.createdAt || Date.now(),
      };
      await onSave(item);
      return true;
    }, isEdit ? '저장' : '추가');

    // Icon picker interaction (runs after modal DOM is inserted)
    setTimeout(() => {
      document.getElementById('iconPicker')?.addEventListener('click', e => {
        const btn = e.target.closest('.icon-pick-btn');
        if (!btn) return;
        selectedIcon = btn.dataset.icon;
        document.querySelectorAll('#iconPicker .icon-pick-btn').forEach(b => {
          b.style.borderColor = b === btn ? 'var(--color-primary)' : 'transparent';
        });
      });
    }, 50);
  },

  _bind: function(container, worlds) {
    // Search filter
    document.getElementById('worldFilter')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.world-card').forEach(card => {
        card.style.display = (card.dataset.search || '').includes(q) ? '' : 'none';
      });
    });

    // Add world
    document.getElementById('btnAddWorld')?.addEventListener('click', () => {
      this._openForm(null, async item => {
        item.id = item.id || DB.genId();
        await DB.put('worlds', item);
        await AppStore.refreshWorlds();
        if (!AppStore.getCurrentWorldId()) await AppStore.setCurrentWorld(item.id);
        Utils.toast('세계 추가됨', 'success');
        this.init(container);
      });
    });

    // Edit world
    container.querySelectorAll('.btn-edit-world').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const w = worlds.find(x => x.id === btn.dataset.id);
        if (!w) return;
        this._openForm(w, async item => {
          await DB.put('worlds', item);
          await AppStore.refreshWorlds();
          Utils.toast('저장됨', 'success');
          this.init(container);
        });
      });
    });

    // Set current world
    container.querySelectorAll('.btn-set-world').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        await AppStore.setCurrentWorld(btn.dataset.id);
        Utils.toast('세계 변경됨', 'success');
        this.init(container);
      });
    });

    // Delete world
    container.querySelectorAll('.btn-del-world').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const w = worlds.find(x => x.id === btn.dataset.id);
        Utils.confirm(
          `"${w?.name || '이 세계'}" 세계를 삭제하시겠습니까?`,
          '이 세계의 모든 데이터가 삭제됩니다. 되돌릴 수 없습니다.',
          async () => {
            await DB.del('worlds', btn.dataset.id);
            // If deleted world was the current one, clear current world
            if (AppStore.getCurrentWorldId() === btn.dataset.id) {
              const remaining = worlds.filter(x => x.id !== btn.dataset.id);
              await AppStore.setCurrentWorld(remaining[0]?.id || null);
            }
            await AppStore.refreshWorlds();
            Utils.toast('삭제됨', 'info');
            this.init(container);
          }
        );
      });
    });
  },

  destroy: function() {
    this._container = null;
  }
};
