'use strict';
window.Pages = window.Pages || {};
window.Pages.world = {
  _container: null,

  DEFAULT_TYPES: ['천국', '지옥', '현재 세계', '커스텀'],
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
                  ${(w.regionHierarchy || []).length > 0 ? ` · <span style="opacity:0.7;">${w.regionHierarchy.join(' › ')}</span>` : ''}
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

  DEFAULT_REGION_HIERARCHY: ['국가', '도시'],

  _openForm: async function(world, onSave) {
    const customTypes = await DB.getSetting('worldTypes', null) || this.DEFAULT_TYPES;
    const iconPool = (await DB.getSetting('iconList_world', null)) || this.DEFAULT_ICONS;
    const isEdit = !!world;
    let selectedIcon = world?.icon || '🌍';
    let currentColor = world?.color || '#3b82f6';
    const self = this;
    let regionHierarchy = [...(world?.regionHierarchy || this.DEFAULT_REGION_HIERARCHY)];

    const typeOptions = customTypes.map(t =>
      `<option ${(world?.type || '커스텀') === t ? 'selected' : ''}>${Utils.escHtml(t)}</option>`).join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label class="form-label">세계 이름 *</label>
          <input class="input-field" id="fWorldName" value="${Utils.escHtml(world?.name || '')}" placeholder="예: 지구, 천계, 마계" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">타입</label>
          <select class="select-input" id="fWorldType" style="width:100%;margin-bottom:6px;">${typeOptions}</select>
          <div style="border:1px solid var(--color-border);border-radius:8px;overflow:hidden;">
            <button type="button" id="btnToggleTypePanel"
              style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:7px 12px;background:var(--color-surface);border:none;cursor:pointer;font-size:11px;color:var(--color-text-muted);">
              <span>타입 목록 관리</span><span id="typeChevron">▼</span>
            </button>
            <div id="typeManagePanel" style="display:none;padding:8px 10px 10px;background:var(--color-surface2);">
              <div id="typeItemList" style="display:flex;flex-direction:column;margin-bottom:8px;"></div>
              <div style="display:flex;gap:6px;">
                <input class="input-field" id="fNewTypeName" placeholder="새 타입 이름..."
                  style="flex:1;font-size:12px;padding:5px 8px;" />
                <button type="button" class="btn btn-primary btn-sm" id="btnAddNewType"
                  style="white-space:nowrap;">+ 추가</button>
              </div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">아이콘</label>
          <div style="font-size:32px;text-align:center;margin-bottom:6px;" id="worldIconPreview">${Utils.escHtml(selectedIcon)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;max-height:160px;overflow-y:auto;" id="iconPicker">
            ${iconPool.map(ic => `<button type="button" class="icon-pick-btn" data-icon="${ic}" style="font-size:22px;padding:5px;border-radius:8px;border:2px solid ${ic===selectedIcon?'var(--color-primary)':'transparent'};background:var(--color-bg);cursor:pointer;line-height:1.2;">${ic}</button>`).join('')}
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
          <label class="form-label">지역 단위 계층</label>
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">위에 있을수록 큰 단위 (기본: 국가 → 도시). 첫 번째가 국가 페이지의 기본 단위입니다.</div>
          <div id="regionHierarchyList" style="border:1px solid var(--color-border);border-radius:8px;padding:8px;min-height:40px;margin-bottom:6px;"></div>
          <div style="display:flex;gap:6px;">
            <input class="input-field" id="fNewRegionLevel" placeholder="새 지역 단위 추가 (예: 지역, 마을)..."
              style="flex:1;font-size:12px;padding:5px 8px;" />
            <button type="button" class="btn btn-ghost btn-sm" id="btnAddRegionLevel" style="white-space:nowrap;">+ 추가</button>
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
        regionHierarchy: regionHierarchy.length > 0 ? regionHierarchy : self.DEFAULT_REGION_HIERARCHY,
        updatedAt: Date.now(),
        createdAt: world?.createdAt || Date.now(),
      };
      await onSave(item);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      // Icon picker
      const iconPickerEl = document.getElementById('iconPicker');
      const worldPreview = document.getElementById('worldIconPreview');
      iconPickerEl?.querySelectorAll('.icon-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedIcon = btn.dataset.icon;
          iconPickerEl.querySelectorAll('.icon-pick-btn').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = 'var(--color-primary)';
          if (worldPreview) worldPreview.textContent = selectedIcon;
        });
      });

      // ── Region hierarchy management ─────────────────────────
      const renderRegionList = (arr) => {
        const list = document.getElementById('regionHierarchyList');
        if (!list) return;
        if (arr.length === 0) {
          list.innerHTML = `<div style="font-size:12px;color:var(--color-text-muted);padding:4px;">단위 없음 — 추가하세요</div>`;
          return;
        }
        list.innerHTML = arr.map((lv, i) => `
          <div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--color-border)33;">
            <span style="font-size:11px;color:var(--color-text-muted);width:16px;text-align:center;flex-shrink:0;">${i + 1}</span>
            <span style="flex:1;font-size:13px;font-weight:600;">${Utils.escHtml(lv)}</span>
            <div style="display:flex;gap:2px;flex-shrink:0;">
              <button type="button" class="rh-up btn btn-ghost btn-sm" data-idx="${i}" style="font-size:10px;padding:2px 5px;" ${i === 0 ? 'disabled style="opacity:0.3;"' : ''}>▲</button>
              <button type="button" class="rh-dn btn btn-ghost btn-sm" data-idx="${i}" style="font-size:10px;padding:2px 5px;" ${i === arr.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>▼</button>
              <button type="button" class="rh-del btn btn-ghost btn-sm" data-idx="${i}" style="font-size:10px;padding:2px 5px;color:var(--color-danger);" ${arr.length <= 1 ? 'disabled style="opacity:0.3;"' : ''}>✕</button>
            </div>
          </div>`).join('');
        list.querySelectorAll('.rh-up').forEach(btn => {
          btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.idx);
            if (i <= 0) return;
            [regionHierarchy[i - 1], regionHierarchy[i]] = [regionHierarchy[i], regionHierarchy[i - 1]];
            renderRegionList(regionHierarchy);
          });
        });
        list.querySelectorAll('.rh-dn').forEach(btn => {
          btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.idx);
            if (i >= regionHierarchy.length - 1) return;
            [regionHierarchy[i], regionHierarchy[i + 1]] = [regionHierarchy[i + 1], regionHierarchy[i]];
            renderRegionList(regionHierarchy);
          });
        });
        list.querySelectorAll('.rh-del').forEach(btn => {
          btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.idx);
            if (regionHierarchy.length <= 1) return;
            regionHierarchy.splice(i, 1);
            renderRegionList(regionHierarchy);
          });
        });
      };
      renderRegionList(regionHierarchy);

      document.getElementById('btnAddRegionLevel')?.addEventListener('click', () => {
        const val = document.getElementById('fNewRegionLevel')?.value.trim();
        if (!val) return;
        if (regionHierarchy.includes(val)) { Utils.toast('이미 있는 단위입니다', 'error'); return; }
        regionHierarchy.push(val);
        renderRegionList(regionHierarchy);
        const inp = document.getElementById('fNewRegionLevel');
        if (inp) inp.value = '';
      });
      document.getElementById('fNewRegionLevel')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btnAddRegionLevel')?.click(); }
      });

      // ── Inline type management ──────────────────────────────
      let managedTypes = [...customTypes];

      const updateTypeSelect = (types) => {
        const sel = document.getElementById('fWorldType');
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = types.map(t =>
          `<option ${cur === t || (!cur && t === (world?.type || '커스텀')) ? 'selected' : ''}>${Utils.escHtml(t)}</option>`
        ).join('');
      };

      const renderTypeItems = (types) => {
        const list = document.getElementById('typeItemList');
        if (!list) return;
        list.innerHTML = types.map((t, i) => `
          <div class="type-manage-row" data-idx="${i}"
            style="display:flex;align-items:center;gap:4px;padding:5px 0;border-bottom:1px solid var(--color-border)33;">
            <span class="type-label" style="flex:1;font-size:12px;">${Utils.escHtml(t)}</span>
            <input class="type-input input-field" value="${Utils.escHtml(t)}"
              style="display:none;flex:1;font-size:12px;padding:3px 6px;height:28px;" />
            <button class="btn-te btn btn-ghost btn-sm" data-action="edit" data-idx="${i}"
              style="font-size:10px;padding:2px 6px;flex-shrink:0;">편집</button>
            <button class="btn-te btn btn-primary btn-sm" data-action="save" data-idx="${i}"
              style="display:none;font-size:10px;padding:2px 6px;flex-shrink:0;">✓</button>
            <button class="btn-te btn btn-ghost btn-sm" data-action="cancel" data-idx="${i}"
              style="display:none;font-size:10px;padding:2px 5px;flex-shrink:0;">✕</button>
            <button class="btn-te btn btn-ghost btn-sm" data-action="del" data-idx="${i}"
              style="font-size:10px;padding:2px 6px;color:var(--color-danger);flex-shrink:0;">삭제</button>
          </div>`).join('');
        attachTypeListeners(types);
      };

      const attachTypeListeners = (types) => {
        const list = document.getElementById('typeItemList');
        list?.querySelectorAll('.btn-te').forEach(btn => {
          btn.addEventListener('click', async () => {
            const idx = parseInt(btn.dataset.idx, 10);
            const action = btn.dataset.action;
            const row = list.querySelector(`.type-manage-row[data-idx="${idx}"]`);
            if (!row) return;

            if (action === 'edit') {
              row.querySelector('.type-label').style.display = 'none';
              row.querySelector('.type-input').style.display = '';
              row.querySelector('[data-action="edit"]').style.display = 'none';
              row.querySelector('[data-action="save"]').style.display = '';
              row.querySelector('[data-action="cancel"]').style.display = '';
              row.querySelector('[data-action="del"]').style.display = 'none';
              row.querySelector('.type-input').focus();

            } else if (action === 'save') {
              const newVal = row.querySelector('.type-input')?.value.trim();
              if (!newVal) { Utils.toast('이름을 입력하세요', 'error'); return; }
              types[idx] = newVal;
              managedTypes = types;
              await DB.setSetting('worldTypes', types);
              updateTypeSelect(types);
              renderTypeItems(types);
              Utils.toast('수정됨', 'success');

            } else if (action === 'cancel') {
              row.querySelector('.type-label').style.display = '';
              row.querySelector('.type-input').style.display = 'none';
              row.querySelector('[data-action="edit"]').style.display = '';
              row.querySelector('[data-action="save"]').style.display = 'none';
              row.querySelector('[data-action="cancel"]').style.display = 'none';
              row.querySelector('[data-action="del"]').style.display = '';

            } else if (action === 'del') {
              if (types.length <= 1) { Utils.toast('최소 1개 필요', 'error'); return; }
              types.splice(idx, 1);
              managedTypes = types;
              await DB.setSetting('worldTypes', types);
              updateTypeSelect(types);
              renderTypeItems(types);
              Utils.toast('삭제됨', 'info');
            }
          });
        });

        list?.querySelectorAll('.type-input').forEach(input => {
          input.addEventListener('keydown', e => {
            const idx = parseInt(input.closest('.type-manage-row')?.dataset.idx, 10);
            if (e.key === 'Enter') list.querySelector(`[data-action="save"][data-idx="${idx}"]`)?.click();
            if (e.key === 'Escape') list.querySelector(`[data-action="cancel"][data-idx="${idx}"]`)?.click();
          });
        });
      };

      let typePanelOpen = false;
      document.getElementById('btnToggleTypePanel')?.addEventListener('click', () => {
        typePanelOpen = !typePanelOpen;
        const panel = document.getElementById('typeManagePanel');
        const chevron = document.getElementById('typeChevron');
        if (panel) panel.style.display = typePanelOpen ? 'block' : 'none';
        if (chevron) chevron.textContent = typePanelOpen ? '▲' : '▼';
        if (typePanelOpen) renderTypeItems(managedTypes);
      });

      document.getElementById('btnAddNewType')?.addEventListener('click', async () => {
        const val = document.getElementById('fNewTypeName')?.value.trim();
        if (!val) return;
        managedTypes.push(val);
        await DB.setSetting('worldTypes', managedTypes);
        updateTypeSelect(managedTypes);
        renderTypeItems(managedTypes);
        const inp = document.getElementById('fNewTypeName');
        if (inp) inp.value = '';
        Utils.toast(`"${val}" 추가됨`, 'success');
      });
      document.getElementById('fNewTypeName')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btnAddNewType')?.click();
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
