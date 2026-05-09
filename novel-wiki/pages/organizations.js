'use strict';
window.Pages = window.Pages || {};
window.Pages.organizations = {
  _container: null,
  _currentId: null,

  ORG_TYPES: ['길드', '국가', '정부기관', '비밀조직', '기업', '군사조직', '학술단체', '종교단체', '범죄조직', '기타'],

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

    const orgs = await DB.getAll('organizations', wid);
    if (options.highlightId) this._currentId = options.highlightId;

    if (this._currentId) {
      const org = orgs.find(o => o.id === this._currentId);
      if (org) { await this._renderDetail(container, org, wid); return; }
    }

    this._renderList(container, orgs, wid);
  },

  _renderList: function(container, orgs, wid) {
    this._currentId = null;
    const world = AppStore.getState().currentWorld;

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">조직/단체</h2>
          <button class="btn btn-primary btn-sm" id="btnAddOrg">+ 추가</button>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${orgs.length}개
        </p>
        <input class="input-field" id="orgFilter" placeholder="이름, 타입 검색..." style="margin-top:8px;" />
      </div>

      <div id="orgList" class="item-list">
        ${orgs.length === 0 ? `
          <div class="empty-state" style="padding:48px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🏛️</div>
            <div style="font-weight:700;font-size:16px;margin-bottom:4px;">조직이 없습니다</div>
            <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 첫 번째 조직을 만드세요</div>
          </div>
        ` : orgs.map(o => `
          <div class="list-item list-item--full org-card"
            data-id="${Utils.escHtml(o.id)}"
            data-search="${Utils.escHtml((o.name + ' ' + (o.type || '')).toLowerCase())}"
            style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--color-surface2);border-radius:12px;border:1px solid var(--color-border);margin-bottom:8px;cursor:pointer;">
            <div style="font-size:28px;flex-shrink:0;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:var(--color-surface3,#2a2a3a);border-radius:10px;">
              ${Utils.escHtml(o.icon || '🏛️')}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(o.name)}</div>
              <div style="font-size:12px;color:var(--color-text-muted);">${Utils.escHtml(o.type || '기타')} · 구성원 ${(o.members || []).length}명</div>
              ${o.description ? `<div style="font-size:12px;color:var(--color-text-dim);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(o.description)}</div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end;">
              <button class="btn btn-ghost btn-sm btn-copy-org" data-id="${Utils.escHtml(o.id)}" title="복사" style="font-size:11px;">복사</button>
              <button class="btn btn-ghost btn-sm btn-del-org" data-id="${Utils.escHtml(o.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`;

    document.getElementById('orgFilter')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.org-card').forEach(card => {
        card.style.display = (card.dataset.search || '').includes(q) ? '' : 'none';
      });
    });

    document.getElementById('btnAddOrg')?.addEventListener('click', () => {
      this._openForm(null, wid, container);
    });

    container.querySelectorAll('.org-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-org') || e.target.closest('.btn-copy-org')) return;
        const id = card.dataset.id;
        const org = orgs.find(o => o.id === id);
        if (org) { this._currentId = id; this._renderDetail(container, org, wid); }
      });
    });

    container.querySelectorAll('.btn-copy-org').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const org = orgs.find(o => o.id === id);
        if (!org) return;
        // Copy to clipboard as text
        const text = Utils.toTextExport(`조직: ${org.name}`, [
          ['타입', org.type],
          ['설명', org.description],
          ['특징', org.features],
          ['비밀', org.secret],
          ['구성원 수', (org.members || []).length],
        ]);
        Utils.copyText(text);
        Utils.toast('클립보드에 복사됨', 'success');
      });
    });

    container.querySelectorAll('.btn-del-org').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const org = orgs.find(o => o.id === btn.dataset.id);
        Utils.confirm(
          `"${org?.name || '이 조직'}" 삭제`,
          '조직을 삭제하시겠습니까? 되돌릴 수 없습니다.',
          async () => {
            await DB.del('organizations', btn.dataset.id);
            Utils.toast('삭제됨', 'info');
            this.init(container);
          }
        );
      });
    });
  },

  _renderDetail: async function(container, org, wid) {
    const chars = await DB.getAll('characters', wid);
    const members = (org.members || []).map(mid => chars.find(c => c.id === mid)).filter(Boolean);

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="btn btn-ghost btn-sm" id="btnBackOrg">← 목록</button>
          <div style="font-size:28px;">${Utils.escHtml(org.icon || '🏛️')}</div>
          <h2 class="page-title" style="font-size:18px;">${Utils.escHtml(org.name)}</h2>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditOrg">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnExportOrg">텍스트 복사</button>
        </div>
      </div>

      <!-- Detail info -->
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:2px;">타입</div>
            <div style="font-weight:600;font-size:14px;">${Utils.escHtml(org.type || '기타')}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:2px;">구성원</div>
            <div style="font-weight:600;font-size:14px;">${members.length}명</div>
          </div>
        </div>
        ${org.description ? `
          <div style="margin-top:8px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:2px;">설명</div>
            <div style="font-size:13px;line-height:1.7;white-space:pre-wrap;">${Utils.escHtml(org.description)}</div>
          </div>` : ''}
        ${org.features ? `
          <div style="margin-top:8px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:2px;">특징</div>
            <div style="font-size:13px;line-height:1.7;white-space:pre-wrap;">${Utils.escHtml(org.features)}</div>
          </div>` : ''}
        ${org.secret ? `
          <div style="margin-top:8px;background:rgba(255,100,100,0.08);border-radius:6px;padding:8px;">
            <div style="font-size:11px;color:var(--color-danger);margin-bottom:2px;">비밀 (작가 전용)</div>
            <div style="font-size:13px;line-height:1.7;white-space:pre-wrap;">${Utils.escHtml(org.secret)}</div>
          </div>` : ''}
      </div>

      <!-- Member list -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-weight:700;font-size:14px;color:var(--color-text-muted);">구성원 (${members.length}명)</div>
        <button class="btn btn-ghost btn-sm" id="btnManageMembers">구성원 관리</button>
      </div>
      <div id="memberList" class="item-list">
        ${members.length === 0
          ? `<div style="padding:24px;text-align:center;color:var(--color-text-muted);font-size:13px;">구성원 없음 — "구성원 관리"에서 추가하세요</div>`
          : members.map(c => `
              <button class="list-item"
                onclick="AppRouter.navigate('characters', {highlightId:'${Utils.escHtml(c.id)}'})"
                style="width:100%;display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--color-surface2);border-radius:10px;border:1px solid var(--color-border);margin-bottom:8px;cursor:pointer;text-align:left;">
                ${c.image
                  ? `<img src="${c.image}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;" />`
                  : `<div style="width:40px;height:40px;border-radius:50%;background:var(--color-surface3,#2a2a3a);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">👤</div>`}
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:600;font-size:14px;">${Utils.escHtml(c.name)}</div>
                  <div style="font-size:12px;color:var(--color-text-muted);">Lv.${c.level || 0} · ${Utils.escHtml(c.race || '인간')}${c.title ? ` · [${Utils.escHtml(c.title)}]` : ''}</div>
                </div>
                <span style="font-size:16px;color:var(--color-text-muted);">›</span>
              </button>`).join('')}
      </div>
    </div>`;

    document.getElementById('btnBackOrg')?.addEventListener('click', () => { this._currentId = null; this.init(container); });

    document.getElementById('btnEditOrg')?.addEventListener('click', () => {
      this._openForm(org, wid, container);
    });

    document.getElementById('btnExportOrg')?.addEventListener('click', () => {
      const text = Utils.toTextExport(`조직: ${org.name}`, [
        ['타입', org.type],
        ['구성원', members.map(c => c.name).join(', ')],
        ['설명', org.description],
        ['특징', org.features],
        ['비밀', org.secret],
      ]);
      Utils.copyText(text);
      Utils.toast('클립보드에 복사됨', 'success');
    });

    document.getElementById('btnManageMembers')?.addEventListener('click', () => {
      const memberIds = new Set(org.members || []);

      const checkboxes = chars.length === 0
        ? '<div style="color:var(--color-text-muted);">이 세계에 캐릭터가 없습니다. 먼저 캐릭터를 추가하세요.</div>'
        : chars.map(c => `
            <label style="display:flex;align-items:center;gap:10px;padding:10px 0;cursor:pointer;border-bottom:1px solid var(--color-border);">
              <input type="checkbox" data-cid="${Utils.escHtml(c.id)}" ${memberIds.has(c.id) ? 'checked' : ''} style="width:18px;height:18px;" />
              ${c.image
                ? `<img src="${c.image}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />`
                : `<span style="font-size:18px;">👤</span>`}
              <span style="font-size:13px;">${Utils.escHtml(c.name)} <span style="color:var(--color-text-muted);">Lv.${c.level || 0} · ${Utils.escHtml(c.race || '인간')}</span></span>
            </label>`).join('');

      Utils.openModal('구성원 관리', `<div style="max-height:60vh;overflow-y:auto;">${checkboxes}</div>`, async () => {
        const selected = [...document.querySelectorAll('input[data-cid]:checked')].map(cb => cb.dataset.cid);
        org.members = selected;
        org.updatedAt = Date.now();
        await DB.put('organizations', org);

        // Update character.organizations back-links
        for (const c of chars) {
          const orgRef = { id: org.id, name: org.name };
          let cOrgs = (c.organizations || []).filter(o => (o.id || o) !== org.id);
          if (selected.includes(c.id)) cOrgs.push(orgRef);
          if (JSON.stringify(cOrgs) !== JSON.stringify(c.organizations || [])) {
            c.organizations = cOrgs;
            c.updatedAt = Date.now();
            await DB.put('characters', c);
          }
        }

        Utils.toast('구성원 저장됨', 'success');
        this._renderDetail(container, org, wid);
        return true;
      }, '저장');
    });
  },

  _openForm: function(org, wid, container) {
    const isEdit = !!org;
    const ICONS = ['🏛️', '⚔️', '🔮', '🌑', '💼', '🛡️', '📚', '⛪', '🗡️', '🎭', '🌟', '🔱', '☠️', '🦅', '🐉'];
    let selectedIcon = org?.icon || '🏛️';

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">조직명 *</label>
          <input class="input-field" id="fOrgName" value="${Utils.escHtml(org?.name || '')}"
            placeholder="예: 아헨 헌터 길드" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">타입</label>
          <select class="select-input" id="fOrgType" style="width:100%;">
            ${this.ORG_TYPES.map(t => `<option ${(org?.type || '기타') === t ? 'selected' : ''}>${Utils.escHtml(t)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">아이콘</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;" id="orgIconPicker">
            ${ICONS.map(ic => `
              <button type="button" class="icon-pick-btn" data-icon="${ic}"
                style="font-size:22px;padding:6px;border:2px solid ${selectedIcon === ic ? 'var(--color-primary)' : 'transparent'};border-radius:8px;background:none;cursor:pointer;">
                ${ic}
              </button>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">설명</label>
          <textarea class="textarea-field" id="fOrgDesc" rows="3"
            placeholder="조직 소개..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(org?.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">특징</label>
          <textarea class="textarea-field" id="fOrgFeatures" rows="2"
            placeholder="조직의 특이한 특징, 규칙..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(org?.features || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">비밀 (작가 전용)</label>
          <textarea class="textarea-field" id="fOrgSecret" rows="2"
            placeholder="독자에게 숨겨진 비밀, 진실..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(org?.secret || '')}</textarea>
        </div>
      </div>
    `;

    Utils.openModal(isEdit ? '조직 편집' : '새 조직', body, async () => {
      const name = document.getElementById('fOrgName')?.value.trim();
      if (!name) { Utils.toast('조직명을 입력하세요', 'error'); return false; }

      const item = {
        ...(org || {}),
        worldId: wid,
        name,
        icon: selectedIcon,
        type: document.getElementById('fOrgType')?.value,
        description: document.getElementById('fOrgDesc')?.value.trim(),
        features: document.getElementById('fOrgFeatures')?.value.trim(),
        secret: document.getElementById('fOrgSecret')?.value.trim(),
        members: org?.members || [],
        updatedAt: Date.now(),
        createdAt: org?.createdAt || Date.now(),
        id: org?.id || DB.genId(),
      };

      await DB.put('organizations', item);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      this._currentId = item.id;
      const orgs = await DB.getAll('organizations', wid);
      const updated = orgs.find(o => o.id === item.id);
      if (updated) this._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    // Icon picker interaction (after modal is in DOM)
    setTimeout(() => {
      document.getElementById('orgIconPicker')?.addEventListener('click', e => {
        const btn = e.target.closest('.icon-pick-btn');
        if (!btn) return;
        selectedIcon = btn.dataset.icon;
        document.querySelectorAll('#orgIconPicker .icon-pick-btn').forEach(b => {
          b.style.borderColor = b === btn ? 'var(--color-primary)' : 'transparent';
        });
      });
    }, 50);
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  }
};
