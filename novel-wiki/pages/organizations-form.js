'use strict';
// organizations-form.js — form methods for window.Pages.organizations
Object.assign(window.Pages.organizations, {
  _openForm: async function(org, wid, container, orgs) {
    const isEdit = !!org;
    const self = this;
    let selectedIcon = org?.icon || '🏛️';
    const iconPool = (await DB.getSetting('iconList_org', null)) || this.ICONS;
    const allTypes = this._getAllTypes();
    const otherOrgs = (orgs || []).filter(o => o.id !== org?.id);

    const typeOptions = [...allTypes, '__custom__'].map(t => {
      if (t === '__custom__') return `<option value="__custom__">기타 (직접 입력)...</option>`;
      return `<option value="${Utils.escHtml(t)}" ${(org?.type || '기타') === t ? 'selected' : ''}>${Utils.escHtml(t)}</option>`;
    }).join('');

    const alignOptions = this.ALIGNMENTS.map(a =>
      `<option value="${Utils.escHtml(a)}" ${(org?.alignment || '') === a ? 'selected' : ''}>${a || '없음'}</option>`
    ).join('');

    const parentOptions = [
      `<option value="">없음</option>`,
      ...otherOrgs.map(o =>
        `<option value="${Utils.escHtml(o.id)}" ${org?.parentOrgId === o.id ? 'selected' : ''}>${Utils.escHtml(o.icon || '🏛️')} ${Utils.escHtml(o.name)}</option>`)
    ].join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">조직명 *</label>
          <input class="input-field" id="fOrgName" value="${Utils.escHtml(org?.name || '')}"
            placeholder="예: 아헨 헌터 길드" style="width:100%;box-sizing:border-box;" />
        </div>

        <!-- 타입 + 관리 -->
        <div class="form-group">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <label class="form-label" style="font-size:13px;font-weight:600;margin:0;">타입</label>
            <button type="button" id="btnToggleOrgTypeList" class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 7px;">목록 관리</button>
          </div>
          <select class="select-input" id="fOrgType" style="width:100%;">${typeOptions}</select>
          <input class="input-field" id="fOrgTypeCustom" placeholder="타입 직접 입력..." style="width:100%;box-sizing:border-box;margin-top:4px;display:none;" />
          <div id="orgTypeListPanel" style="display:none;margin-top:6px;padding:8px;background:var(--color-surface3,#1e2030);border-radius:8px;border:1px solid var(--color-border);">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">타입 목록 (사용자 추가 항목 삭제 가능)</div>
            <div id="orgTypeItems">
              ${(this._customTypes || []).length === 0
                ? '<div style="font-size:11px;color:var(--color-text-dim);">추가한 타입 없음</div>'
                : (this._customTypes || []).map(t => `
                  <div class="org-type-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);">
                    <span style="font-size:12px;">${Utils.escHtml(t)}</span>
                    <button type="button" class="btn-del-org-type" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button>
                  </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- 성향 -->
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">성향</label>
          <select class="select-input" id="fOrgAlignment" style="width:100%;">${alignOptions}</select>
        </div>

        <!-- 상위 단체 -->
        ${otherOrgs.length > 0 ? `
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">상위 단체</label>
          <select class="select-input" id="fOrgParent" style="width:100%;">${parentOptions}</select>
        </div>` : ''}

        <!-- 아이콘 -->
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">아이콘</label>
          <div style="font-size:32px;text-align:center;margin-bottom:6px;" id="orgIconPreview">${Utils.escHtml(selectedIcon)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;" id="orgIconPicker">
            ${iconPool.map(ic => `<button type="button" class="icon-pick-btn" data-icon="${ic}" style="font-size:22px;padding:5px;border-radius:8px;border:2px solid ${ic===selectedIcon?'var(--color-primary)':'transparent'};background:var(--color-bg);cursor:pointer;line-height:1.2;">${ic}</button>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">설명</label>
          <textarea class="textarea-field" id="fOrgDesc" rows="3"
            placeholder="조직 소개..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(org?.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">특징</label>
          <textarea class="textarea-field" id="fOrgFeatures" rows="2"
            placeholder="조직의 특이한 특징, 규칙..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(org?.features || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">비밀 (작가 전용)</label>
          <textarea class="textarea-field" id="fOrgSecret" rows="2"
            placeholder="독자에게 숨겨진 비밀, 진실..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(org?.secret || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '조직 편집' : '새 조직', body, async () => {
      const name = document.getElementById('fOrgName')?.value.trim();
      if (!name) { Utils.fieldError('fOrgName'); return false; }

      let type = document.getElementById('fOrgType')?.value || '기타';
      if (type === '__custom__') {
        type = document.getElementById('fOrgTypeCustom')?.value.trim() || '기타';
        if (type && type !== '기타' && !self._getAllTypes().includes(type)) {
          self._customTypes = [...(self._customTypes || []), type];
          await DB.setSetting('orgCustomTypes_' + wid, self._customTypes);
        }
      }

      const item = {
        ...(org || {}),
        worldId: wid,
        name,
        icon: selectedIcon,
        type,
        alignment: document.getElementById('fOrgAlignment')?.value || '',
        parentOrgId: document.getElementById('fOrgParent')?.value || null,
        description: document.getElementById('fOrgDesc')?.value.trim() || '',
        features: document.getElementById('fOrgFeatures')?.value.trim() || '',
        secret: document.getElementById('fOrgSecret')?.value.trim() || '',
        members: org?.members || [],
        updatedAt: Date.now(),
        createdAt: org?.createdAt || Date.now(),
        id: org?.id || DB.genId(),
      };

      await DB.put('organizations', item);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      this._currentId = item.id;
      const updatedOrgs = await DB.getAll('organizations', wid);
      const updated = updatedOrgs.find(o => o.id === item.id);
      if (updated) this._renderDetail(container, updated, wid, updatedOrgs);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      // Icon picker
      const orgPicker = document.getElementById('orgIconPicker');
      const orgPreview = document.getElementById('orgIconPreview');
      orgPicker?.querySelectorAll('.icon-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedIcon = btn.dataset.icon;
          orgPicker.querySelectorAll('.icon-pick-btn').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = 'var(--color-primary)';
          if (orgPreview) orgPreview.textContent = selectedIcon;
        });
      });

      // Type toggle
      document.getElementById('fOrgType')?.addEventListener('change', function() {
        const customInput = document.getElementById('fOrgTypeCustom');
        if (customInput) customInput.style.display = this.value === '__custom__' ? 'block' : 'none';
      });

      // Type list manage toggle
      document.getElementById('btnToggleOrgTypeList')?.addEventListener('click', () => {
        const panel = document.getElementById('orgTypeListPanel');
        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });

      // Delete custom type
      document.getElementById('orgTypeItems')?.addEventListener('click', async e => {
        const btn = e.target.closest('.btn-del-org-type');
        if (!btn) return;
        const val = btn.dataset.val;
        self._customTypes = (self._customTypes || []).filter(t => t !== val);
        await DB.setSetting('orgCustomTypes_' + wid, self._customTypes);
        // Rebuild select
        const allT = self._getAllTypes();
        const typeSelectEl = document.getElementById('fOrgType');
        if (typeSelectEl) {
          const cur = typeSelectEl.value;
          typeSelectEl.innerHTML = [...allT, '__custom__'].map(t => {
            if (t === '__custom__') return `<option value="__custom__">기타 (직접 입력)...</option>`;
            return `<option value="${Utils.escHtml(t)}"${cur === t ? ' selected' : ''}>${Utils.escHtml(t)}</option>`;
          }).join('');
        }
        // Rebuild items list
        const itemsEl = document.getElementById('orgTypeItems');
        if (itemsEl) {
          itemsEl.innerHTML = self._customTypes.length === 0
            ? '<div style="font-size:11px;color:var(--color-text-dim);">추가한 타입 없음</div>'
            : self._customTypes.map(t => `
              <div class="org-type-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);">
                <span style="font-size:12px;">${Utils.escHtml(t)}</span>
                <button type="button" class="btn-del-org-type" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button>
              </div>`).join('');
        }
      });
    }, 50);
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  }
});
