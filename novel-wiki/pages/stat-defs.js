'use strict';
window.Pages = window.Pages || {};
window.Pages.statDefs = {
  _container: null,

  CATEGORIES: ['기본스텟', '전투스텟', '마나계열', '정신계열', '저항', '기타'],
  _catColors: { '기본스텟': '#60a5fa', '전투스텟': '#f87171', '마나계열': '#a78bfa', '정신계열': '#34d399', '저항': '#fbbf24', '기타': '#94a3b8' },

  DEFAULT_STATS: [
    { name: '근력',   shortName: 'STR', category: '전투스텟' },
    { name: '민첩',   shortName: 'AGI', category: '전투스텟' },
    { name: '체력',   shortName: 'VIT', category: '전투스텟' },
    { name: '지능',   shortName: 'INT', category: '마나계열' },
    { name: '마나',   shortName: 'MP',  category: '마나계열' },
    { name: '정신력', shortName: 'MEN', category: '정신계열' },
    { name: '행운',   shortName: 'LUK', category: '기타' },
    { name: '재능',   shortName: '',    category: '기타' },
    { name: '감각',   shortName: '',    category: '기타' },
  ],

  // ── Utility: load all stat names for a world (used by other pages) ────────
  loadNames: async function(wid) {
    const defs = await DB.getAll('statDefs', wid);
    return defs.map(d => d.name);
  },

  // ── Utility: build a <datalist> HTML string ───────────────────────────────
  buildDatalist: function(statNames, listId) {
    return `<datalist id="${Utils.escHtml(listId)}">${statNames.map(n => `<option value="${Utils.escHtml(n)}">`).join('')}</datalist>`;
  },

  init: async function(container, options) {
    options = options || {};
    this._container = container;

    // Load stat categories from settings (falls back to hardcoded defaults)
    const savedCats = await DB.getSetting('const_statCategories', null);
    if (savedCats && savedCats.length) {
      this.CATEGORIES = savedCats.map(c => c.name);
      this._catColors = {};
      savedCats.forEach(c => { this._catColors[c.name] = c.color; });
    }

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
    this._renderList(container, wid);
  },

  _renderList: async function(container, wid) {
    const world = AppStore.getState().currentWorld;
    const defs = await DB.getAll('statDefs', wid);
    const self = this;

    // Group by category
    const grouped = {};
    this.CATEGORIES.forEach(c => { grouped[c] = []; });
    defs.forEach(d => {
      const cat = d.category || '기타';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(d);
    });

    const catColors = this._catColors || {};
    // Collect any extra categories from data not in the defined list
    const extraCats = Object.keys(grouped).filter(c => !this.CATEGORIES.includes(c) && grouped[c].length > 0);
    const allCatsToRender = [...this.CATEGORIES, ...extraCats];

    const renderGroup = (cat, items) => {
      if (!items.length) return '';
      const color = catColors[cat] || '#94a3b8';
      return `
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;padding-left:2px;">${Utils.escHtml(cat)}</div>
          ${items.map(d => `
            <div class="stat-def-row" data-id="${Utils.escHtml(d.id)}"
              style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--color-surface2);border:1px solid var(--color-border);border-left:3px solid ${color};border-radius:8px;cursor:pointer;margin-bottom:5px;">
              <div style="flex:1;min-width:0;">
                <span style="font-size:13px;font-weight:700;">${Utils.escHtml(d.name)}</span>
                ${d.shortName ? `<span style="font-size:11px;color:var(--color-text-muted);margin-left:6px;">(${Utils.escHtml(d.shortName)})</span>` : ''}
                ${d.description ? `<div style="font-size:11px;color:var(--color-text-dim);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(d.description)}</div>` : ''}
              </div>
              <button class="btn-del-stat-def" data-id="${Utils.escHtml(d.id)}"
                style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:12px;padding:2px 6px;flex-shrink:0;border-radius:4px;">삭제</button>
            </div>`).join('')}
        </div>`;
    };

    const hasAny = defs.length > 0;
    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <h2 class="page-title">스텟 정의</h2>
          <div style="display:flex;gap:6px;">
            ${!hasAny ? `<button class="btn btn-ghost btn-sm" id="btnInitDefaultStats" style="font-size:11px;color:var(--color-primary);">기본 스텟 초기화</button>` : ''}
            <button class="btn btn-primary btn-sm" id="btnAddStatDef">+ 추가</button>
          </div>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${defs.length}개 정의됨
        </p>
        <p style="font-size:11px;color:var(--color-text-dim);margin-top:4px;line-height:1.5;">
          캐릭터·스킬·게이트 등 모든 스텟 입력에서 자동완성으로 사용됩니다.
        </p>
      </div>

      <div style="padding:0 0 80px;">
        ${!hasAny
          ? `<div style="padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">📊</div>
               <div style="font-weight:700;font-size:15px;margin-bottom:4px;">정의된 스텟이 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);margin-bottom:16px;">+ 추가 버튼 또는 기본 스텟 초기화 버튼으로 등록하세요</div>
             </div>`
          : allCatsToRender.map(cat => renderGroup(cat, grouped[cat] || [])).join('')}
      </div>
    </div>`;

    document.getElementById('btnAddStatDef')?.addEventListener('click', () => {
      this._openForm(null, wid, container);
    });

    document.getElementById('btnInitDefaultStats')?.addEventListener('click', async () => {
      for (const s of self.DEFAULT_STATS) {
        await DB.put('statDefs', { id: DB.genId(), worldId: wid, name: s.name, shortName: s.shortName || '', category: s.category, description: '', createdAt: Date.now() });
      }
      Utils.toast('기본 스텟이 추가되었습니다', 'success');
      self._renderList(container, wid);
    });

    container.querySelectorAll('.stat-def-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('.btn-del-stat-def')) return;
        const id = row.dataset.id;
        DB.get('statDefs', id).then(d => {
          if (d) self._openForm(d, wid, container);
        });
      });
    });

    container.querySelectorAll('.btn-del-stat-def').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const def = defs.find(d => d.id === id);
        Utils.confirm('스텟 삭제', `"${def?.name || '스텟'}"을 삭제합니다.`, async () => {
          await DB.del('statDefs', id);
          Utils.toast('삭제됨', 'info');
          self._renderList(container, wid);
        }, '삭제');
      });
    });
  },

  _openForm: function(def, wid, container) {
    const isEdit = !!def;
    const d = def || {};
    const catOpts = this.CATEGORIES.map(c =>
      `<option value="${c}" ${(d.category || '기타') === c ? 'selected' : ''}>${c}</option>`
    ).join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label class="form-label">스텟 이름 (필수)</label>
          <input class="input-field" id="fSdName" value="${Utils.escHtml(d.name || '')}"
            placeholder="예: 힘, 민첩, 재능, 마나..." style="width:100%;box-sizing:border-box;" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">약칭 (선택)</label>
            <input class="input-field" id="fSdShort" value="${Utils.escHtml(d.shortName || '')}"
              placeholder="예: STR, AGI" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">분류</label>
            <select class="select-input" id="fSdCat" style="width:100%;">${catOpts}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">설명 (선택)</label>
          <textarea class="textarea-field" id="fSdDesc" rows="2"
            placeholder="이 스텟이 어떤 능력을 나타내는지..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(d.description || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '스텟 편집' : '스텟 추가', body, async () => {
      const name = document.getElementById('fSdName')?.value.trim();
      if (!name) { Utils.fieldError('fSdName'); return false; }
      const record = {
        ...(d || {}),
        worldId: wid,
        name,
        shortName: document.getElementById('fSdShort')?.value.trim() || '',
        category: document.getElementById('fSdCat')?.value || '기타',
        description: document.getElementById('fSdDesc')?.value.trim() || '',
        id: d.id || DB.genId(),
        createdAt: d.createdAt || Date.now(),
      };
      await DB.put('statDefs', record);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      this._renderList(container, wid);
      return true;
    }, isEdit ? '저장' : '추가');
  },

  destroy: function() {
    this._container = null;
  },
};
window.StatDefs = window.Pages.statDefs;
