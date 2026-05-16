'use strict';
window.Pages = window.Pages || {};
window.Pages.traps = {
  _currentId: null,
  _container: null,

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

    const traps = await DB.getAll('traps', wid);
    if (options.highlightId) this._currentId = options.highlightId;

    if (this._currentId) {
      const trap = traps.find(x => x.id === this._currentId);
      if (trap) { this._renderDetail(container, trap, wid); return; }
    }

    this._renderList(container, traps, wid);
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  },

  _getOrigins: function(trap) {
    return (trap.origins && trap.origins.length > 0) ? trap.origins : [];
  },

  // ── LIST ──────────────────────────────────────────────────────────────────────

  _renderList: async function(container, traps, wid) {
    this._currentId = null;
    const world = AppStore.getState().currentWorld;
    let activeOrigin = '';

    const [towers, gates] = await Promise.all([
      DB.getAll('towers', wid),
      DB.getAll('gates', wid),
    ]);
    const towerMap = {};
    towers.forEach(t => { towerMap[t.id] = t.name; });
    const gateMap = {};
    gates.forEach(g => { gateMap[g.id] = g.name; });

    const originFilterHtml = (towers.length > 0 || gates.length > 0) ? `
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;" id="originFilters">
        <button class="filter-chip-origin active" data-origin=""
          style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface2);color:var(--color-text);font-size:11px;cursor:pointer;">전체</button>
        ${towers.map(t => `<button class="filter-chip-origin" data-origin="${Utils.escHtml(t.id)}"
          style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);font-size:11px;cursor:pointer;">🗼 ${Utils.escHtml(t.name)}</button>`).join('')}
        ${gates.map(g => `<button class="filter-chip-origin" data-origin="${Utils.escHtml(g.id)}"
          style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);font-size:11px;cursor:pointer;">🌀 ${Utils.escHtml(g.name)}</button>`).join('')}
      </div>` : '';

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">함정 종류</h2>
          <button class="btn btn-primary btn-sm" id="btnAddTrap">+ 추가</button>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${traps.length}개
        </p>
        <input class="input-field" id="trapFilter" placeholder="이름, 트리거, 효과, 해체 방법 검색..."
          style="margin-top:8px;width:100%;box-sizing:border-box;" />
        ${originFilterHtml}
      </div>

      <div id="trapList" class="item-list">
        ${traps.length === 0
          ? `<div class="empty-state" style="padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">🪤</div>
               <div style="font-weight:700;font-size:16px;margin-bottom:4px;">함정이 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 함정을 등록하세요</div>
             </div>`
          : traps.map(tr => this._trapCard(tr, towerMap, gateMap)).join('')}
      </div>
    </div>`;

    container.querySelectorAll('.filter-chip-origin[data-origin]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-chip-origin[data-origin]').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = 'var(--color-text-muted)';
        });
        btn.style.background = 'var(--color-surface2)';
        btn.style.color = 'var(--color-text)';
        activeOrigin = btn.dataset.origin;
        this._applyFilter(container, document.getElementById('trapFilter')?.value || '', activeOrigin);
      });
    });

    document.getElementById('trapFilter')?.addEventListener('input', e => {
      this._applyFilter(container, e.target.value, activeOrigin);
    });

    document.getElementById('btnAddTrap')?.addEventListener('click', () => {
      this._openForm(null, wid, container);
    });

    container.querySelectorAll('.trap-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-trap')) return;
        const id = card.dataset.id;
        DB.getAll('traps', wid).then(all => {
          const tr = all.find(x => x.id === id);
          if (tr) { this._currentId = tr.id; this._renderDetail(container, tr, wid); }
        });
      });
    });

    container.querySelectorAll('.btn-del-trap').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const tr = traps.find(x => x.id === btn.dataset.id);
        Utils.confirmWithInput('함정 삭제', '삭제하면 되돌릴 수 없습니다.', tr?.name || '이 함정', async () => {
          await DB.del('traps', btn.dataset.id);
          Utils.toast('삭제됨', 'info');
          this.init(container);
        });
      });
    });
  },

  _applyFilter: function(container, query, originId) {
    container.querySelectorAll('.trap-card').forEach(card => {
      const text = card.dataset.searchText || '';
      const originIds = (card.dataset.originIds || '').split(',').filter(Boolean);
      const originOk = !originId || originIds.includes(originId);
      const textOk = Utils.matchesQuery(text, query);
      card.style.display = originOk && textOk ? '' : 'none';
    });
  },

  _trapCard: function(trap, towerMap, gateMap) {
    const origins = this._getOrigins(trap);
    const originIds = origins.map(o => o.id).join(',');
    const originBadges = origins.map(o => {
      const name = o.type === 'tower' ? towerMap[o.id] : gateMap[o.id];
      if (!name) return '';
      const icon = o.type === 'tower' ? '🗼' : '🌀';
      return `<span style="font-size:11px;padding:1px 6px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);border-radius:3px;color:#60a5fa;">${icon} ${Utils.escHtml(name)}</span>`;
    }).filter(Boolean).join('');

    const searchText = [
      trap.name, trap.craftCondition, trap.trigger, trap.effect, trap.disarmMethod, trap.craftProcess,
      ...origins.map(o => (o.type === 'tower' ? towerMap[o.id] : gateMap[o.id]) || ''),
    ].filter(Boolean).join(' ').toLowerCase();

    return `
    <div class="trap-card list-item"
      data-id="${Utils.escHtml(trap.id)}"
      data-origin-ids="${Utils.escHtml(originIds)}"
      data-search-text="${Utils.escHtml(searchText)}"
      style="cursor:pointer;display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--color-surface2);border-radius:10px;border:1px solid var(--color-border);border-left:3px solid var(--color-warning);margin-bottom:8px;">
      <div style="width:44px;height:44px;border-radius:8px;background:rgba(245,158,11,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:22px;">${Utils.escHtml(trap.icon || '🪤')}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
          <span style="font-weight:700;font-size:14px;">${Utils.escHtml(trap.name || '이름 없음')}</span>
          ${trap.craftCondition ? `<span style="font-size:11px;padding:1px 6px;background:var(--color-surface3);border-radius:3px;color:var(--color-text-muted);">${Utils.escHtml(trap.craftCondition)}</span>` : ''}
          ${originBadges}
        </div>
        ${trap.trigger ? `<div style="font-size:12px;color:var(--color-text-dim);margin-bottom:2px;">트리거: ${Utils.escHtml(trap.trigger.substring(0, 60))}${trap.trigger.length > 60 ? '…' : ''}</div>` : ''}
        ${trap.effect ? `<div style="font-size:12px;color:var(--color-text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">효과: ${Utils.escHtml(trap.effect)}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm btn-del-trap" data-id="${Utils.escHtml(trap.id)}"
        style="color:var(--color-danger);font-size:11px;flex-shrink:0;">삭제</button>
    </div>`;
  },

  // ── DETAIL ────────────────────────────────────────────────────────────────────

  _renderDetail: async function(container, trap, wid) {
    const [towers, gates] = await Promise.all([
      DB.getAll('towers', wid),
      DB.getAll('gates', wid),
    ]);
    const towerMap = {};
    towers.forEach(t => { towerMap[t.id] = t.name; });
    const gateMap = {};
    gates.forEach(g => { gateMap[g.id] = g.name; });

    const origins = this._getOrigins(trap);
    const originsHtml = origins.length > 0 ? `
      <div style="padding:10px 0;border-bottom:1px solid var(--color-border);">
        <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;" id="originsToggle">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;">사용되는 탑 / 게이트 (${origins.length})</div>
          <span id="originsChevron" style="font-size:12px;color:var(--color-text-muted);transition:transform .2s;">▼</span>
        </div>
        <div id="originsBody" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
          ${origins.map(o => {
            const name = o.type === 'tower' ? towerMap[o.id] : gateMap[o.id];
            if (!name) return '';
            const page = o.type === 'tower' ? 'tower' : 'gates';
            const icon = o.type === 'tower' ? '🗼' : '🌀';
            return `<button class="btn btn-ghost btn-sm" onclick="AppRouter.navigate('${page}')" style="font-size:12px;">${icon} ${Utils.escHtml(name)}</button>`;
          }).filter(Boolean).join('')}
        </div>
      </div>` : '';

    const row = (label, val) => val ? `
      <div style="padding:10px 0;border-bottom:1px solid var(--color-border);">
        <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">${label}</div>
        <div style="font-size:13px;white-space:pre-wrap;line-height:1.7;">${Utils.nl2br(Utils.escHtml(val))}</div>
      </div>` : '';

    container.innerHTML = `
    <div class="page active">
      <div class="page-header" style="border-left:4px solid var(--color-warning);padding-left:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackTraps">← 목록</button>
          <h2 class="page-title" style="margin:0;font-size:18px;">${Utils.escHtml(trap.icon || '🪤')} ${Utils.escHtml(trap.name || '이름 없음')}</h2>
          ${trap.craftCondition ? `<span style="font-size:12px;padding:2px 8px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);border-radius:5px;color:#fbbf24;">${Utils.escHtml(trap.craftCondition)}</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditTrap">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnDelTrap" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      <div style="background:var(--color-surface2);border-radius:12px;padding:0 16px 16px;margin-bottom:16px;">
        ${row('작동 트리거', trap.trigger)}
        ${row('작동 효과', trap.effect)}
        ${row('해체 방법', trap.disarmMethod)}
        ${row('제작 과정', trap.craftProcess)}
        ${(trap.linkedSkills || []).length ? `
          <div style="padding:10px 0;border-bottom:1px solid var(--color-border);">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:6px;">연동 스킬</div>
            <div style="display:flex;flex-wrap:wrap;gap:5px;">
              ${(trap.linkedSkills || []).map(sk => `<span style="font-size:12px;padding:2px 8px;border-radius:10px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);">✨ ${Utils.escHtml(sk.name)}</span>`).join('')}
            </div>
          </div>` : ''}
        ${originsHtml}
        ${trap.authorNotes ? `
          <div style="margin-top:12px;background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:10px 14px;">
            <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:4px;">작가 메모</div>
            <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(trap.authorNotes))}</div>
          </div>` : ''}
        <div style="font-size:11px;color:var(--color-text-dim);text-align:right;margin-top:12px;">
          수정: ${Utils.formatDate(trap.updatedAt)} · 생성: ${Utils.formatDate(trap.createdAt)}
        </div>
      </div>
    </div>`;

    document.getElementById('btnBackTraps')?.addEventListener('click', () => { this._currentId = null; this.init(container); });
    document.getElementById('btnEditTrap')?.addEventListener('click', () => this._openForm(trap, wid, container));

    const originsToggle = document.getElementById('originsToggle');
    if (originsToggle) {
      originsToggle.addEventListener('click', () => {
        const body = document.getElementById('originsBody');
        const chevron = document.getElementById('originsChevron');
        if (!body) return;
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : 'flex';
        if (chevron) chevron.style.transform = isOpen ? 'rotate(-90deg)' : '';
      });
    }
    document.getElementById('btnDelTrap')?.addEventListener('click', () => {
      Utils.confirmWithInput('함정 삭제', '삭제하면 되돌릴 수 없습니다.', trap.name, async () => {
        await DB.del('traps', trap.id);
        Utils.toast('삭제됨', 'info');
        this._currentId = null;
        this.init(container);
      });
    });
  },

  // ── FORM ──────────────────────────────────────────────────────────────────────

  _openForm: async function(trap, wid, container) {
    const isEdit = !!trap;
    const tr = trap || {};
    const self = this;

    const [towers, gates, allSkills] = await Promise.all([
      DB.getAll('towers', wid),
      DB.getAll('gates', wid),
      DB.getAll('skills', wid),
    ]);
    const sortedSkills = allSkills.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
    let linkedSkillIds = new Set((tr.linkedSkills || []).map(s => s.id));

    const currentOrigins = this._getOrigins(tr);

    const originsFormHtml = (towers.length > 0 || gates.length > 0) ? `
      <div class="form-group">
        <label class="form-label">사용되는 탑 / 게이트 <span style="font-size:11px;color:var(--color-text-dim);">(복수 선택 가능)</span></label>
        <div style="display:flex;flex-direction:column;gap:2px;max-height:160px;overflow-y:auto;padding:8px;background:var(--color-bg);border:1px solid var(--color-border);border-radius:6px;">
          ${towers.length > 0 ? `<div style="font-size:10px;color:var(--color-text-dim);font-weight:700;letter-spacing:0.5px;padding:2px 0 4px;">🗼 탑</div>` : ''}
          ${towers.map(t => `
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:4px 6px;border-radius:4px;">
              <input type="checkbox" class="origin-check" data-type="tower" data-id="${Utils.escHtml(t.id)}"
                ${currentOrigins.some(o => o.type === 'tower' && o.id === t.id) ? 'checked' : ''} />
              <span>${Utils.escHtml(t.name)}</span>
            </label>`).join('')}
          ${gates.length > 0 ? `<div style="font-size:10px;color:var(--color-text-dim);font-weight:700;letter-spacing:0.5px;padding:4px 0 4px;margin-top:2px;">🌀 게이트</div>` : ''}
          ${gates.map(g => `
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:4px 6px;border-radius:4px;">
              <input type="checkbox" class="origin-check" data-type="gate" data-id="${Utils.escHtml(g.id)}"
                ${currentOrigins.some(o => o.type === 'gate' && o.id === g.id) ? 'checked' : ''} />
              <span>${Utils.escHtml(g.name)}</span>
            </label>`).join('')}
        </div>
      </div>` : '';

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
        <div style="display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:end;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">아이콘</label>
            <div style="display:flex;flex-direction:column;gap:3px;">
              <input class="input-field" id="fTrIcon" value="${Utils.escHtml(tr.icon || '🪤')}"
                placeholder="🪤" style="width:56px;text-align:center;font-size:22px;" maxlength="4" />
              <button type="button" id="btnOpenTrapIconPicker" class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 4px;">목록</button>
            </div>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">함정 이름 *</label>
            <input class="input-field" id="fTrName" value="${Utils.escHtml(tr.name || '')}"
              placeholder="함정 이름" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">제작 조건</label>
          <input class="input-field" id="fTrLevel" value="${Utils.escHtml(tr.craftCondition || tr.craftLevel || '')}"
            placeholder="예: S급 이상 장인, 마기 조작 스킬 보유" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">작동 트리거</label>
          <textarea class="input-field" id="fTrTrigger" rows="2"
            placeholder="예: 밟으면 작동, 마기 감지 시 발동..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(tr.trigger || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">작동 효과</label>
          <textarea class="input-field" id="fTrEffect" rows="3"
            placeholder="예: 독 상태이상 부여 (10분), 즉사, 슬로우 50%..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(tr.effect || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">해체 방법</label>
          <textarea class="input-field" id="fTrDisarm" rows="2"
            placeholder="예: 마기 차단, 함정 해체 스킬 사용, 특정 아이템 필요..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(tr.disarmMethod || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">제작 과정</label>
          <textarea class="input-field" id="fTrCraft" rows="3"
            placeholder="재료, 제작법, 제작 시간, 필요 스킬 등..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(tr.craftProcess || '')}</textarea>
        </div>
        ${originsFormHtml}
        <div class="form-group" style="border:1px solid rgba(99,102,241,0.3);border-radius:8px;padding:10px 12px;">
          <label class="form-label" style="display:block;margin-bottom:6px;">✨ 연동 스킬 <span style="font-size:11px;font-weight:400;color:var(--color-text-muted);">(이 함정에 관련된 스킬)</span></label>
          <div id="trapSkillChips" style="display:flex;flex-wrap:wrap;gap:5px;min-height:24px;margin-bottom:8px;"></div>
          ${sortedSkills.length > 0 ? `
          <div style="position:relative;">
            <input class="input-field" id="trapSkillSearch" placeholder="스킬 이름 검색..." style="width:100%;box-sizing:border-box;font-size:12px;"/>
            <div id="trapSkillResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:160px;overflow-y:auto;"></div>
          </div>` : `<div style="font-size:12px;color:var(--color-text-muted);">이 세계에 스킬이 없습니다</div>`}
        </div>
        <div class="form-group">
          <label class="form-label">작가 메모 <span style="font-size:11px;color:var(--color-text-dim);">(소설에 미표시)</span></label>
          <textarea class="input-field" id="fTrNotes" rows="2"
            placeholder="설계 의도, 등장 시점 등..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(tr.authorNotes || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '함정 편집' : '새 함정 추가', body, async () => {
      const name = document.getElementById('fTrName')?.value.trim();
      if (!name) { Utils.fieldError('fTrName'); return false; }

      const origins = Array.from(
        document.querySelectorAll('#globalModalBody .origin-check:checked')
      ).map(cb => ({ type: cb.dataset.type, id: cb.dataset.id }));

      const record = {
        ...(tr || {}),
        worldId: wid,
        name,
        icon:         document.getElementById('fTrIcon')?.value.trim()     || '🪤',
        craftCondition: document.getElementById('fTrLevel')?.value.trim()  || '',
        trigger:      document.getElementById('fTrTrigger')?.value.trim()  || '',
        effect:       document.getElementById('fTrEffect')?.value.trim()   || '',
        disarmMethod: document.getElementById('fTrDisarm')?.value.trim()   || '',
        craftProcess: document.getElementById('fTrCraft')?.value.trim()    || '',
        origins,
        linkedSkills: [...linkedSkillIds].map(sid => { const sk = sortedSkills.find(x => x.id === sid); return sk ? { id: sk.id, name: sk.name || '' } : null; }).filter(Boolean),
        authorNotes:  document.getElementById('fTrNotes')?.value.trim()   || '',
        id: tr.id || DB.genId(),
        createdAt: tr.createdAt || Date.now(),
      };

      await DB.put('traps', record);
      await AppStore.updateStreak();
      await AppStore.recordActivity('traps', !isEdit);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      self._currentId = record.id;
      const updated = await DB.get('traps', record.id);
      if (updated) self._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(async () => {
      // Skill chips
      const renderSkillChips = () => {
        const el = document.getElementById('trapSkillChips'); if (!el) return;
        el.innerHTML = [...linkedSkillIds].map(sid => {
          const sk = sortedSkills.find(x => x.id === sid);
          if (!sk) return '';
          return `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);padding:2px 8px;border-radius:12px;font-size:12px;">✨ ${Utils.escHtml(sk.name)}<span class="trap-skill-del" data-sid="${Utils.escHtml(sid)}" style="cursor:pointer;color:var(--color-danger);padding:0 2px;">✕</span></span>`;
        }).join('');
        el.querySelectorAll('.trap-skill-del').forEach(btn => {
          btn.addEventListener('click', () => { linkedSkillIds.delete(btn.dataset.sid); renderSkillChips(); });
        });
      };
      renderSkillChips();

      const skillIn = document.getElementById('trapSkillSearch');
      const skillRs = document.getElementById('trapSkillResults');
      if (skillIn && skillRs) {
        skillIn.addEventListener('input', () => {
          const q = skillIn.value.trim().toLowerCase();
          if (!q) { skillRs.style.display = 'none'; return; }
          const hits = sortedSkills.filter(s => !linkedSkillIds.has(s.id) && (s.name || '').toLowerCase().includes(q)).slice(0, 8);
          if (!hits.length) { skillRs.style.display = 'none'; return; }
          skillRs.style.display = 'block';
          skillRs.innerHTML = hits.map(s => `<div class="skill-res" data-sid="${Utils.escHtml(s.id)}" data-sname="${Utils.escHtml(s.name)}" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">✨ ${Utils.escHtml(s.name)}</div>`).join('');
          skillRs.querySelectorAll('.skill-res').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              linkedSkillIds.add(row.dataset.sid);
              skillIn.value = ''; skillRs.style.display = 'none';
              renderSkillChips();
            });
          });
        });
        skillIn.addEventListener('blur', () => setTimeout(() => { skillRs.style.display = 'none'; }, 150));
      }

      const trapIcons = await DB.getSetting('iconList_trap', null) || ['🪤','⚙️','💣','🔩','🧨','⛏️','🗡️','☠️','🔥','❄️','⚡','💀','🕷️','🌀','🧲','🔮','🪝','🔒','⚰️','🧪'];
      const pickerEl = document.createElement('div');
      pickerEl.id = 'trapIconPickerPanel';
      pickerEl.style.cssText = 'display:none;flex-wrap:wrap;gap:4px;margin-top:4px;padding:6px;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;max-width:200px;position:absolute;z-index:100;';
      pickerEl.innerHTML = trapIcons.map(ic =>
        `<button type="button" class="trap-icon-pick" data-ic="${Utils.escHtml(ic)}"
          style="font-size:18px;padding:3px 5px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-bg);cursor:pointer;line-height:1.2;">${Utils.escHtml(ic)}</button>`
      ).join('');
      const iconInputEl = document.getElementById('fTrIcon');
      iconInputEl?.parentElement?.parentElement?.style && (iconInputEl.parentElement.parentElement.style.position = 'relative');
      iconInputEl?.parentElement?.appendChild(pickerEl);

      document.getElementById('btnOpenTrapIconPicker')?.addEventListener('click', (e) => {
        e.stopPropagation();
        pickerEl.style.display = pickerEl.style.display === 'none' ? 'flex' : 'none';
      });
      pickerEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.trap-icon-pick');
        if (!btn) return;
        const iconInput = document.getElementById('fTrIcon');
        if (iconInput) iconInput.value = btn.dataset.ic;
        pickerEl.style.display = 'none';
      });
      document.addEventListener('click', () => { pickerEl.style.display = 'none'; }, { once: false });
    }, 50);
  },
};
