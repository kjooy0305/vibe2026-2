'use strict';
window.Pages = window.Pages || {};
window.Pages.world = {
  _container: null,

  DEFAULT_TYPES: ['지구(메인)', '천계', '마계', '이면세계', '거울세계', '몽환세계', '탑내부', '커스텀'],
  DEFAULT_ICONS: ['🌍', '🌙', '👁️', '🪞', '💫', '🏰', '⚡', '🌀', '🌟', '🔮', '☀️', '🌊'],

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
          각 세계는 독립된 검색 범위를 가집니다.
        </p>
        <input class="input-field" id="worldFilter" placeholder="세계 이름 검색..." style="margin-top:8px;" />
      </div>

      ${worlds.length === 0 ? `
        <div class="empty-state" style="padding:48px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">🌍</div>
          <div style="font-weight:700;font-size:16px;margin-bottom:4px;">세계가 없습니다</div>
          <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 첫 번째 세계를 만드세요</div>
        </div>
      ` : `
        <div class="item-list" id="worldList">
          ${worlds.map(w => {
            const col = w.color || '#3b82f6';
            const isActive = w.id === wid;
            return `
            <div class="list-item list-item--full world-card"
              data-id="${Utils.escHtml(w.id)}"
              data-search="${Utils.escHtml((w.name + ' ' + (w.type || '')).toLowerCase())}"
              style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--color-surface2);border-radius:12px;border:2px solid ${isActive ? col : 'var(--color-border)'};margin-bottom:8px;">
              <div style="background:${col}33;color:${col};font-size:22px;width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                ${Utils.escHtml(w.icon || '🌍')}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(w.name)}</div>
                <div style="font-size:12px;color:var(--color-text-muted);">
                  ${Utils.escHtml(w.type || '커스텀')}
                  ${isActive ? ` · <strong style="color:${col};">현재 세계</strong>` : ''}
                </div>
                ${w.description ? `<div style="font-size:12px;color:var(--color-text-dim);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(w.description)}</div>` : ''}
                <!-- Color preview bar -->
                <div style="height:3px;background:${col};border-radius:2px;margin-top:6px;width:60%;opacity:0.8;"></div>
              </div>
              <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;align-items:flex-end;">
                ${!isActive ? `<button class="btn btn-ghost btn-sm btn-set-world" data-id="${Utils.escHtml(w.id)}" style="font-size:11px;border-color:${col}66;color:${col};">선택</button>` : ''}
                <div style="display:flex;gap:4px;">
                  <button class="btn btn-ghost btn-sm btn-edit-world" data-id="${Utils.escHtml(w.id)}" style="font-size:11px;">편집</button>
                  <button class="btn btn-ghost btn-sm btn-clone-world" data-id="${Utils.escHtml(w.id)}" style="font-size:11px;">복사</button>
                  <button class="btn btn-ghost btn-sm btn-del-world" data-id="${Utils.escHtml(w.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      `}
    </div>`;
  },

  _openForm: async function(world, onSave) {
    const customTypes = await DB.getSetting('worldTypes', null) || this.DEFAULT_TYPES;
    const customIcons = await DB.getSetting('worldIcons', null) || this.DEFAULT_ICONS;
    const isEdit = !!world;
    let selectedIcon = world?.icon || '🌍';
    let currentColor = world?.color || '#3b82f6';

    const typeOptions = customTypes.map(t =>
      `<option ${(world?.type || '커스텀') === t ? 'selected' : ''}>${Utils.escHtml(t)}</option>`).join('');

    const iconButtons = () => customIcons.map(ic => `
      <button type="button" class="icon-pick-btn" data-icon="${Utils.escHtml(ic)}"
        style="font-size:22px;padding:6px;border:2px solid ${selectedIcon === ic ? 'var(--color-primary)' : 'transparent'};border-radius:8px;background:var(--color-surface2);cursor:pointer;min-width:40px;">
        ${ic}
      </button>`).join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label class="form-label">세계 이름 *</label>
          <input class="input-field" id="fWorldName" value="${Utils.escHtml(world?.name || '')}" placeholder="예: 지구, 천계, 마계" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">타입</label>
          <div style="display:flex;gap:6px;">
            <select class="select-input" id="fWorldType" style="flex:1;">${typeOptions}</select>
            <button type="button" class="btn btn-ghost btn-sm" id="btnEditTypes" style="font-size:11px;white-space:nowrap;">목록 편집</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">아이콘</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;" id="iconPicker">
            ${iconButtons()}
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <input class="input-field" id="fCustomIcon" placeholder="직접 입력 (이모지 또는 텍스트)"
              style="flex:1;font-size:16px;" />
            <button type="button" class="btn btn-ghost btn-sm" id="btnAddCustomIcon">추가</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">대표 색상</label>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <input type="color" id="fWorldColorPicker" value="${Utils.escHtml(currentColor)}"
              style="width:56px;height:44px;border-radius:8px;border:1px solid var(--color-border);cursor:pointer;padding:2px;flex-shrink:0;" />
            <input class="input-field" id="fWorldColorHex" value="${Utils.escHtml(currentColor)}"
              placeholder="#hex" maxlength="7"
              style="width:100px;font-family:monospace;flex-shrink:0;" />
            <div id="colorPreviewBox"
              style="width:44px;height:44px;border-radius:8px;background:${currentColor};border:1px solid var(--color-border);flex-shrink:0;"></div>
          </div>
          <!-- HSL Presets -->
          <div style="margin-top:8px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">빠른 색상 선택</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${[
                '#ef4444','#f97316','#f59e0b','#84cc16','#22c55e','#10b981',
                '#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899',
                '#ffffff','#94a3b8','#475569','#1e293b',
              ].map(c => `
                <button type="button" class="color-preset-btn" data-color="${c}"
                  style="width:28px;height:28px;border-radius:6px;background:${c};border:2px solid ${c === currentColor ? '#fff' : 'transparent'};cursor:pointer;"></button>`
              ).join('')}
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">설명</label>
          <textarea class="textarea-field" id="fWorldDesc" rows="3"
            placeholder="세계 배경 설명..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(world?.description || '')}</textarea>
        </div>
      </div>
    `;

    Utils.openModal(isEdit ? '세계 편집' : '새 세계 추가', body, async () => {
      const name = document.getElementById('fWorldName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }
      const finalColor = document.getElementById('fWorldColorHex')?.value.trim() || currentColor;
      const item = {
        ...(world || {}),
        name,
        type: document.getElementById('fWorldType')?.value,
        icon: selectedIcon,
        color: /^#[0-9a-fA-F]{6}$/.test(finalColor) ? finalColor : (currentColor || '#3b82f6'),
        description: document.getElementById('fWorldDesc')?.value.trim(),
        updatedAt: Date.now(),
        createdAt: world?.createdAt || Date.now(),
      };
      await onSave(item);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      // Icon picker
      const iconPickerEl = document.getElementById('iconPicker');
      const updateIconSelection = (newIcon) => {
        selectedIcon = newIcon;
        if (iconPickerEl) {
          iconPickerEl.querySelectorAll('.icon-pick-btn').forEach(b => {
            b.style.borderColor = b.dataset.icon === newIcon ? 'var(--color-primary)' : 'transparent';
          });
        }
      };
      iconPickerEl?.addEventListener('click', e => {
        const btn = e.target.closest('.icon-pick-btn');
        if (btn) updateIconSelection(btn.dataset.icon);
      });

      // Add custom icon
      document.getElementById('btnAddCustomIcon')?.addEventListener('click', async () => {
        const val = document.getElementById('fCustomIcon')?.value.trim();
        if (!val) return;
        // Save to custom icons
        const icons = await DB.getSetting('worldIcons', null) || this.DEFAULT_ICONS;
        if (!icons.includes(val)) {
          icons.push(val);
          await DB.setSetting('worldIcons', icons);
        }
        selectedIcon = val;
        if (iconPickerEl) {
          iconPickerEl.innerHTML = icons.map(ic => `
            <button type="button" class="icon-pick-btn" data-icon="${Utils.escHtml(ic)}"
              style="font-size:22px;padding:6px;border:2px solid ${selectedIcon === ic ? 'var(--color-primary)' : 'transparent'};border-radius:8px;background:var(--color-surface2);cursor:pointer;min-width:40px;">
              ${ic}
            </button>`).join('');
          iconPickerEl.addEventListener('click', e => {
            const btn = e.target.closest('.icon-pick-btn');
            if (btn) updateIconSelection(btn.dataset.icon);
          });
        }
        Utils.toast(`아이콘 "${val}" 추가됨`, 'success');
      });

      // Edit types
      document.getElementById('btnEditTypes')?.addEventListener('click', async () => {
        const types = await DB.getSetting('worldTypes', null) || this.DEFAULT_TYPES;
        const typeBody = `
          <div>
            <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:8px;">각 줄에 하나씩 입력하세요</div>
            <textarea class="textarea-field" id="fTypesList" rows="10" style="width:100%;box-sizing:border-box;font-size:13px;">${types.join('\n')}</textarea>
          </div>`;
        Utils.openModal('타입 목록 편집', typeBody, async () => {
          const lines = document.getElementById('fTypesList')?.value.split('\n').map(l => l.trim()).filter(Boolean) || [];
          if (!lines.length) { Utils.toast('타입이 없습니다', 'error'); return false; }
          await DB.setSetting('worldTypes', lines);
          Utils.toast('저장됨', 'success');
          return true;
        }, '저장');
      });

      // Color sync between picker and hex input
      const pickerEl = document.getElementById('fWorldColorPicker');
      const hexEl = document.getElementById('fWorldColorHex');
      const previewEl = document.getElementById('colorPreviewBox');

      const syncColor = (color) => {
        currentColor = color;
        if (pickerEl) pickerEl.value = color;
        if (hexEl) hexEl.value = color;
        if (previewEl) previewEl.style.background = color;
        document.querySelectorAll('#globalModalBody .color-preset-btn').forEach(b => {
          b.style.borderColor = b.dataset.color === color ? '#fff' : 'transparent';
        });
      };

      pickerEl?.addEventListener('input', e => syncColor(e.target.value));
      hexEl?.addEventListener('input', e => {
        const v = e.target.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) syncColor(v);
      });
      document.querySelectorAll('#globalModalBody .color-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => syncColor(btn.dataset.color));
      });
    }, 60);
  },

  _bind: function(container, worlds) {
    document.getElementById('worldFilter')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.world-card').forEach(card => {
        card.style.display = (card.dataset.search || '').includes(q) ? '' : 'none';
      });
    });

    document.getElementById('btnAddWorld')?.addEventListener('click', () => {
      this._openForm(null, async item => {
        item.id = DB.genId();
        await DB.put('worlds', item);
        await AppStore.refreshWorlds();
        if (!AppStore.getCurrentWorldId()) await AppStore.setCurrentWorld(item.id);
        Utils.toast('세계 추가됨', 'success');
        this.init(container);
      });
    });

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

    container.querySelectorAll('.btn-set-world').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        await AppStore.setCurrentWorld(btn.dataset.id);
        Utils.toast('세계 변경됨', 'success');
        this.init(container);
      });
    });

    // Clone world
    container.querySelectorAll('.btn-clone-world').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const w = worlds.find(x => x.id === btn.dataset.id);
        if (!w) return;
        const newId = DB.genId();
        const clone = { ...w, id: newId, name: w.name + ' (복사)', createdAt: Date.now(), updatedAt: Date.now() };
        await DB.put('worlds', clone);
        // Copy all data from original world to new world
        const STORES = ['characters','skills','items','events','constellations','organizations','gates','monsters','towers','worldRules','achievements','jobs','templates'];
        for (const store of STORES) {
          try {
            const all = await DB.getAll(store, w.id);
            for (const rec of all) {
              await DB.put(store, { ...rec, id: DB.genId(), worldId: newId, createdAt: Date.now(), updatedAt: Date.now() });
            }
          } catch(e2) {}
        }
        await AppStore.refreshWorlds();
        Utils.toast(`"${w.name}" 복사됨`, 'success');
        this.init(container);
      });
    });

    // Delete world with name confirmation
    container.querySelectorAll('.btn-del-world').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const w = worlds.find(x => x.id === btn.dataset.id);
        if (!w) return;
        Utils.confirmWithInput(
          `"${w.name}" 세계 삭제`,
          '이 세계의 모든 데이터가 삭제됩니다. 되돌릴 수 없습니다.',
          w.name,
          async () => {
            await DB.del('worlds', btn.dataset.id);
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
