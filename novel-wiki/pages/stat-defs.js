'use strict';
window.Pages = window.Pages || {};
window.Pages.statDefs = {
  _container: null,

  CATEGORIES: ['기본스텟', '전투스텟', '마나계열', '정신계열', '저항', '기타'],

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

    // Group by category
    const grouped = {};
    this.CATEGORIES.forEach(c => { grouped[c] = []; });
    defs.forEach(d => {
      const cat = d.category || '기타';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(d);
    });

    const renderGroup = (cat, items) => {
      if (!items.length) return '';
      return `
        <div style="margin-bottom:16px;">
          <div style="font-size:11px;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;">${Utils.escHtml(cat)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${items.map(d => `
              <div class="stat-def-chip" data-id="${Utils.escHtml(d.id)}"
                style="display:inline-flex;align-items:center;gap:6px;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;padding:6px 10px;cursor:pointer;min-width:80px;">
                <span style="font-size:13px;font-weight:700;">${Utils.escHtml(d.name)}</span>
                ${d.shortName ? `<span style="font-size:10px;color:var(--color-text-muted);">(${Utils.escHtml(d.shortName)})</span>` : ''}
                <button class="btn-del-stat-def" data-id="${Utils.escHtml(d.id)}"
                  style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:11px;padding:0 2px;line-height:1;flex-shrink:0;" title="삭제">✕</button>
              </div>`).join('')}
          </div>
        </div>`;
    };

    const hasAny = defs.length > 0;
    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">스텟 정의</h2>
          <button class="btn btn-primary btn-sm" id="btnAddStatDef">+ 스텟 추가</button>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${defs.length}개 정의됨
        </p>
        <p style="font-size:11px;color:var(--color-text-dim);margin-top:4px;line-height:1.5;">
          여기서 정의한 스텟은 캐릭터·업적·스킬 등 모든 곳의 스텟 입력에서 자동완성으로 사용됩니다.
        </p>
      </div>

      <div style="padding:0 0 80px;">
        ${!hasAny
          ? `<div style="padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">📊</div>
               <div style="font-weight:700;font-size:15px;margin-bottom:4px;">정의된 스텟이 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);">+ 스텟 추가 버튼으로 스텟을 등록하세요</div>
             </div>`
          : this.CATEGORIES.map(cat => renderGroup(cat, grouped[cat] || [])).join('')}
      </div>
    </div>`;

    document.getElementById('btnAddStatDef')?.addEventListener('click', () => {
      this._openForm(null, wid, container);
    });

    container.querySelectorAll('.stat-def-chip').forEach(chip => {
      chip.addEventListener('click', e => {
        if (e.target.closest('.btn-del-stat-def')) return;
        const id = chip.dataset.id;
        DB.get('statDefs', id).then(d => {
          if (d) this._openForm(d, wid, container);
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
          this._renderList(container, wid);
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
      if (!name) { Utils.toast('스텟 이름을 입력하세요', 'error'); return false; }
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
