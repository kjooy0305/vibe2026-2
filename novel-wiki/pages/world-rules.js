'use strict';
window.Pages = window.Pages || {};
window.Pages.worldRules = {
  _container: null,
  _wid: null,
  _dragSrc: null,

  JAMO: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'],

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
    const all = await DB.getAll('worldRules', wid);
    const rules = all.filter(r => !r.ruleType).sort((a, b) => (a.order || 0) - (b.order || 0));
    this._render(container, rules, wid);
  },

  _render: function(container, rules, wid) {
    const self = this;
    const JAMO = this.JAMO;

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">세계관 규칙</h2>
          <button class="btn btn-primary btn-sm" id="btnAddRule">+ 규칙 추가</button>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          소설 세계의 절대적인 규칙들. 언제든 추가·수정 가능합니다.
        </p>
      </div>

      <div id="rulesList">
        ${rules.length === 0
          ? `<div class="empty-state" style="padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">📜</div>
               <div style="font-weight:700;font-size:16px;margin-bottom:4px;">규칙이 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);">+ 버튼으로 첫 번째 규칙을 추가하세요</div>
             </div>`
          : rules.map((rule, i) => `
            <div class="rule-card" data-id="${Utils.escHtml(rule.id)}" draggable="true"
              style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
              <div style="display:flex;align-items:flex-start;gap:10px;">
                <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0;">
                  <span style="font-weight:800;color:var(--color-primary);font-size:16px;min-width:28px;text-align:center;">${i + 1}.</span>
                  <span class="drag-handle" title="드래그하여 순서 변경" style="cursor:grab;font-size:16px;color:var(--color-text-muted);user-select:none;">≡</span>
                </div>
                <div style="flex:1;">
                  <div style="white-space:pre-wrap;font-size:14px;line-height:1.7;color:var(--color-text);">${Utils.nl2br(rule.content)}</div>
                  ${(rule.subRules || []).length ? `
                    <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--color-border);">
                      ${(rule.subRules || []).map((sub, j) => `
                        <div style="display:flex;gap:8px;margin-bottom:5px;align-items:flex-start;">
                          <span style="color:var(--color-secondary);font-weight:600;min-width:22px;font-size:13px;">${JAMO[j] || 'ㅎ'}.</span>
                          <span style="font-size:13px;color:var(--color-text);line-height:1.6;">${Utils.nl2br(sub)}</span>
                        </div>`).join('')}
                    </div>` : ''}
                </div>
                <div style="display:flex;gap:4px;flex-shrink:0;">
                  <button class="btn btn-ghost btn-sm btn-edit-rule" data-id="${Utils.escHtml(rule.id)}">편집</button>
                  <button class="btn btn-ghost btn-sm btn-del-rule" data-id="${Utils.escHtml(rule.id)}" style="color:var(--color-danger);">삭제</button>
                </div>
              </div>
            </div>
          `).join('')}
      </div>

      <button class="btn btn-ghost" style="width:100%;margin-top:8px;" id="btnAddRuleBottom">+ 규칙 추가</button>
    </div>`;

    const openForm = (rule) => {
      const isEdit = !!rule;
      const subs = rule ? (rule.subRules || []) : [];
      let subCount = Math.max(1, subs.length);

      const renderSubInputs = () => Array.from({ length: subCount }, (_, j) =>
        `<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center;">
          <span style="min-width:22px;color:var(--color-text-muted);font-size:13px;">${JAMO[j] || 'ㅎ'}.</span>
          <input class="input-field sub-rule-input" value="${Utils.escHtml(subs[j] || '')}" placeholder="하위 규칙 내용..." style="flex:1;" />
        </div>`
      ).join('');

      const body = `
        <div class="form-group">
          <label class="form-label">규칙 내용 *</label>
          <textarea class="textarea-field" id="fRuleContent" rows="4" placeholder="규칙 내용을 입력하세요...">${Utils.escHtml(rule ? rule.content : '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">하위 규칙 (ㄱ, ㄴ, ㄷ...)</label>
          <div id="subRulesList">${renderSubInputs()}</div>
          <button type="button" id="btnAddSub" class="btn btn-ghost btn-sm" style="margin-top:6px;">+ 하위 규칙 추가</button>
        </div>`;

      Utils.openModal(isEdit ? '규칙 편집' : '새 규칙', body, async () => {
        const content = document.getElementById('fRuleContent')?.value.trim();
        if (!content) { Utils.toast('내용을 입력하세요', 'error'); return false; }
        const subRules = [...document.querySelectorAll('#globalModalBody .sub-rule-input')]
          .map(i => i.value.trim()).filter(Boolean);
        const item = {
          ...(rule || {}),
          worldId: wid,
          content,
          subRules,
          order: rule ? rule.order : ((rules.length * 10) + 10),
        };
        await DB.put('worldRules', item);
        Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
        self._refreshRules(container, wid);
        return true;
      }, isEdit ? '저장' : '추가');

      document.getElementById('btnAddSub')?.addEventListener('click', () => {
        if (subCount >= JAMO.length) { Utils.toast('하위 규칙은 최대 ' + JAMO.length + '개', 'error'); return; }
        subCount++;
        const listEl = document.getElementById('subRulesList');
        if (listEl) listEl.innerHTML = renderSubInputs();
      });
    };

    document.getElementById('btnAddRule')?.addEventListener('click', () => openForm(null));
    document.getElementById('btnAddRuleBottom')?.addEventListener('click', () => openForm(null));

    container.querySelectorAll('.btn-edit-rule').forEach(btn => {
      btn.addEventListener('click', () => {
        const rule = rules.find(r => r.id === btn.dataset.id);
        if (rule) openForm(rule);
      });
    });

    container.querySelectorAll('.btn-del-rule').forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.confirmWithInput(
          '세계관 규칙 삭제',
          '이 규칙을 삭제하시겠습니까? 되돌릴 수 없습니다.',
          '세계관 규칙',
          async () => {
            await DB.del('worldRules', btn.dataset.id);
            Utils.toast('삭제됨', 'info');
            self._refreshRules(container, wid);
          }
        );
      });
    });

    // Drag to reorder
    this._initDrag(container, rules, wid);
  },

  _refreshRules: async function(container, wid) {
    const all = await DB.getAll('worldRules', wid);
    const rules = all.filter(r => !r.ruleType).sort((a, b) => (a.order || 0) - (b.order || 0));
    this._render(container, rules, wid);
  },

  _initDrag: function(container, rules, wid) {
    const self = this;
    const cards = container.querySelectorAll('.rule-card[draggable]');

    cards.forEach(card => {
      card.addEventListener('dragstart', e => {
        self._dragSrc = card.dataset.id;
        e.dataTransfer.effectAllowed = 'move';
        card.style.opacity = '0.5';
      });
      card.addEventListener('dragend', () => {
        card.style.opacity = '';
      });
      card.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        card.style.outline = '2px dashed var(--color-primary)';
      });
      card.addEventListener('dragleave', () => {
        card.style.outline = '';
      });
      card.addEventListener('drop', async e => {
        e.preventDefault();
        card.style.outline = '';
        const srcId = self._dragSrc;
        const destId = card.dataset.id;
        if (!srcId || srcId === destId) return;

        // Swap orders
        const src = rules.find(r => r.id === srcId);
        const dest = rules.find(r => r.id === destId);
        if (!src || !dest) return;
        const tmpOrder = src.order;
        src.order = dest.order;
        dest.order = tmpOrder;
        await Promise.all([DB.put('worldRules', src), DB.put('worldRules', dest)]);
        self._refreshRules(container, wid);
      });
    });
  },

  destroy: function() {}
};
