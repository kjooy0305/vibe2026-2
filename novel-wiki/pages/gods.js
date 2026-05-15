'use strict';
window.Pages = window.Pages || {};
window.Pages.gods = {
  _currentId: null,
  _container: null,
  _listScrollY: 0,

  RANK_COLORS: ['#fbbf24','#f43f5e','#a855f7','#3b82f6','#10b981','#f97316','#06b6d4','#ec4899'],
  ABILITY_TYPES: ['패시브','공격','방어','지원','저주','신탁','창조','파괴','기타'],
  ICON_POOL: ['⚡','✨','🌟','💫','☀️','🌙','⭐','🌠','🔱','🪄','👑','🌈','🔥','💎','🌸','🌺','🎯','⚜️','🦅','🐉','🌊','🍃','💠','👁','🕊','🏛','⚗','🌑','🌕','🌞'],

  _rankColor: function(rank, idx) {
    return rank.color || this.RANK_COLORS[idx % this.RANK_COLORS.length];
  },

  init: async function(container, options) {
    options = options || {};
    this._container = container;
    const wid = AppStore.getCurrentWorldId();
    if (!wid) {
      container.innerHTML = `<div class="empty-state" style="padding:48px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">🌍</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:4px;">세계를 먼저 선택하세요</div>
        <div style="font-size:13px;color:var(--color-text-muted);">홈에서 세계를 선택하거나 새로 만드세요</div>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="AppRouter.navigate('world')">세계 관리</button>
      </div>`;
      return;
    }
    if (options.highlightId) this._currentId = options.highlightId;
    const orgs = await DB.getAll('gods', wid);
    if (this._currentId) {
      const org = orgs.find(o => o.id === this._currentId);
      if (org) { this._renderDetail(container, org, wid); return; }
    }
    this._renderList(container, orgs, wid);
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  },

  // ── LIST ─────────────────────────────────────────────────────────────────────

  _renderList: function(container, orgs, wid) {
    this._currentId = null;
    const world = AppStore.getState().currentWorld;
    const self = this;
    const totalGods = orgs.reduce((s, o) => s + (o.ranks || []).reduce((s2, r) => s2 + (r.gods || []).length, 0), 0);

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">⚡ 신</h2>
          <button class="btn btn-primary btn-sm" id="btnAddGodOrg">+ 추가</button>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · 판테온 ${orgs.length}개 · 신 ${totalGods}명
        </p>
        <div style="margin-top:8px;">
          <input class="input-field" id="godOrgFilter" placeholder="판테온 이름, 도메인, 신 이름 검색..." style="width:100%;box-sizing:border-box;" />
        </div>
      </div>
      <div id="godOrgList"></div>
    </div>`;

    container.querySelector('#btnAddGodOrg')?.addEventListener('click', () => self._openOrgForm(null, wid, container));
    container.querySelector('#godOrgFilter')?.addEventListener('input', () => self._renderFilteredList(container, orgs, wid));
    self._renderFilteredList(container, orgs, wid);
  },

  _renderFilteredList: function(container, orgs, wid) {
    const self = this;
    const query = (document.getElementById('godOrgFilter')?.value || '').toLowerCase().trim();
    const listEl = document.getElementById('godOrgList');
    if (!listEl) return;

    const filtered = query
      ? orgs.filter(o => {
          const base = [o.name, o.domain, o.description].filter(Boolean).join(' ').toLowerCase();
          const godNames = (o.ranks || []).flatMap(r => (r.gods || []).map(g => g.name || '')).join(' ').toLowerCase();
          return base.includes(query) || godNames.includes(query);
        })
      : orgs;

    if (!filtered.length) {
      listEl.innerHTML = `<div class="empty-state" style="padding:48px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">⚡</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:4px;">신 판테온이 없습니다</div>
        <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 첫 판테온을 등록하세요</div>
      </div>`;
      return;
    }

    listEl.innerHTML = filtered.map(o => self._orgCard(o)).join('');

    listEl.querySelectorAll('.god-org-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-god-org') || e.target.closest('.btn-edit-god-org')) return;
        const id = card.dataset.id;
        self._listScrollY = container.scrollTop || 0;
        DB.getAll('gods', wid).then(all => {
          const org = all.find(o => o.id === id);
          if (org) { self._currentId = org.id; self._renderDetail(container, org, wid); }
        });
      });
    });

    listEl.querySelectorAll('.btn-edit-god-org').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        DB.getAll('gods', wid).then(all => {
          const org = all.find(o => o.id === btn.dataset.id);
          if (org) self._openOrgForm(org, wid, container);
        });
      });
    });

    listEl.querySelectorAll('.btn-del-god-org').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const org = orgs.find(o => o.id === btn.dataset.id);
        Utils.confirmWithInput('판테온 삭제', '삭제하려면 판테온 이름을 입력하세요.', org?.name || '이 판테온', async () => {
          await DB.del('gods', btn.dataset.id);
          Utils.toast('삭제됨', 'info');
          self.init(container);
        });
      });
    });
  },

  _orgCard: function(org) {
    const self = this;
    const totalGods = (org.ranks || []).reduce((s, r) => s + (r.gods || []).length, 0);
    const topColor = (org.ranks && org.ranks[0]?.color) || '#fbbf24';
    const rankBadges = (org.ranks || []).map((r, i) => {
      const col = self._rankColor(r, i);
      return `<span style="font-size:10px;padding:2px 7px;border-radius:3px;background:${col}22;color:${col};border:1px solid ${col}44;">${Utils.escHtml(r.name || '')} (${(r.gods || []).length})</span>`;
    }).join('');

    return `
    <div class="god-org-card list-item list-item--full" data-id="${Utils.escHtml(org.id)}"
      style="cursor:pointer;border-left:3px solid ${topColor};padding:12px 14px;background:linear-gradient(135deg,var(--color-surface2,#1a2535) 70%,${topColor}0a 100%);border-radius:10px;border:1px solid var(--color-border);border-left:3px solid ${topColor};margin-bottom:8px;position:relative;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,rgba(0,0,0,0.3),${topColor}22);border:1px solid ${topColor}44;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">
          ${org.icon ? Utils.escHtml(org.icon) : '⚡'}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;font-size:14px;margin-bottom:2px;">${Utils.escHtml(org.name || '이름 없음')}</div>
          ${org.domain ? `<div style="font-size:12px;color:var(--color-text-muted);">도메인: ${Utils.escHtml(org.domain)}</div>` : ''}
          <div style="font-size:11px;color:var(--color-text-dim);margin-top:2px;">계급 ${(org.ranks || []).length}개 · 신 ${totalGods}명</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
          <button class="btn btn-ghost btn-sm btn-edit-god-org" data-id="${Utils.escHtml(org.id)}" style="font-size:11px;">편집</button>
          <button class="btn btn-ghost btn-sm btn-del-god-org" data-id="${Utils.escHtml(org.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
        </div>
      </div>
      ${rankBadges ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">${rankBadges}</div>` : ''}
    </div>`;
  },

  // ── DETAIL ───────────────────────────────────────────────────────────────────

  _renderDetail: async function(container, org, wid) {
    const self = this;
    const topColor = (org.ranks && org.ranks[0]?.color) || '#fbbf24';

    const rankHtml = (org.ranks || []).map((rank, ri) => {
      const rc = self._rankColor(rank, ri);
      const godsHtml = (rank.gods || []).map(god => {
        const abHtml = (god.abilities || []).map(ab => `
          <div style="background:${rc}0a;border:1px solid ${rc}22;border-radius:6px;padding:8px 10px;margin-bottom:4px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:${ab.description ? '3px' : '0'};">
              <span style="font-weight:600;font-size:12px;">${Utils.escHtml(ab.name || '')}</span>
              ${ab.type ? `<span style="font-size:10px;padding:1px 5px;border-radius:3px;background:${rc}22;color:${rc};">${Utils.escHtml(ab.type)}</span>` : ''}
            </div>
            ${ab.description ? `<div style="font-size:12px;color:var(--color-text-dim);white-space:pre-wrap;line-height:1.6;">${Utils.nl2br(Utils.escHtml(ab.description))}</div>` : ''}
          </div>`).join('');

        return `
        <div style="background:var(--color-bg,#0a0e1a);border:1px solid var(--color-border);border-radius:8px;padding:12px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:${god.description || (god.abilities||[]).length ? '8px' : '0'};">
            <span style="font-size:20px;">${god.icon ? Utils.escHtml(god.icon) : '✨'}</span>
            <span style="font-weight:700;font-size:14px;">${Utils.escHtml(god.name || '')}</span>
            <div style="margin-left:auto;display:flex;gap:4px;">
              <button class="btn btn-ghost btn-sm btn-edit-god" data-rank-id="${Utils.escHtml(rank.id)}" data-god-id="${Utils.escHtml(god.id)}" style="font-size:11px;">편집</button>
              <button class="btn btn-ghost btn-sm btn-del-god" data-rank-id="${Utils.escHtml(rank.id)}" data-god-id="${Utils.escHtml(god.id)}" data-god-name="${Utils.escHtml(god.name||'')}" style="color:var(--color-danger);font-size:11px;">삭제</button>
            </div>
          </div>
          ${god.description ? `<div style="font-size:12px;color:var(--color-text-muted);white-space:pre-wrap;margin-bottom:8px;line-height:1.6;">${Utils.nl2br(Utils.escHtml(god.description))}</div>` : ''}
          ${(god.abilities||[]).length ? `<div><div style="font-size:10px;color:${rc};font-weight:700;margin-bottom:5px;">능력 (${god.abilities.length})</div>${abHtml}</div>` : ''}
          ${god.notes ? `<div style="margin-top:6px;font-size:11px;color:var(--color-text-dim);font-style:italic;border-top:1px solid var(--color-border);padding-top:6px;">${Utils.escHtml(god.notes)}</div>` : ''}
        </div>`;
      }).join('');

      return `
      <div style="background:${rc}08;border:1px solid ${rc}33;border-radius:12px;padding:14px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:${rank.description || rank.gods?.length ? '10px' : '0'};">
          <div style="width:10px;height:10px;border-radius:50%;background:${rc};flex-shrink:0;"></div>
          <span style="font-weight:800;font-size:15px;color:${rc};">${Utils.escHtml(rank.name || '')}</span>
          <span style="font-size:11px;color:var(--color-text-dim);">신 ${(rank.gods||[]).length}명</span>
          <button class="btn btn-ghost btn-sm btn-add-god" data-rank-id="${Utils.escHtml(rank.id)}" style="margin-left:auto;font-size:11px;">+ 신 추가</button>
        </div>
        ${rank.description ? `<div style="font-size:12px;color:var(--color-text-muted);margin-bottom:10px;">${Utils.escHtml(rank.description)}</div>` : ''}
        ${godsHtml}
      </div>`;
    }).join('');

    container.innerHTML = `
    <div class="page active" style="overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;">
      <div class="page-header" style="border-left:4px solid ${topColor};padding-left:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackGodOrg">← 목록</button>
          <h2 class="page-title" style="margin:0;font-size:18px;">${Utils.escHtml(org.name || '신 판테온')}</h2>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditGodOrg">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnDelGodOrgDetail" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      <div style="background:radial-gradient(ellipse at top right,${topColor}14 0%,var(--color-surface2,#1a2535) 60%);border:1px solid ${topColor}44;border-radius:14px;padding:16px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:${org.description ? '10px' : '0'};">
          <div style="width:52px;height:52px;border-radius:12px;background:linear-gradient(135deg,rgba(0,0,0,0.4),${topColor}28);border:1px solid ${topColor}44;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;">
            ${org.icon ? Utils.escHtml(org.icon) : '⚡'}
          </div>
          <div>
            <div style="font-size:20px;font-weight:800;">${Utils.escHtml(org.name || '')}</div>
            ${org.domain ? `<div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">도메인: ${Utils.escHtml(org.domain)}</div>` : ''}
          </div>
        </div>
        ${org.description ? `<div style="font-size:13px;line-height:1.7;white-space:pre-wrap;color:var(--color-text-muted);">${Utils.nl2br(Utils.escHtml(org.description))}</div>` : ''}
      </div>

      ${rankHtml || `<div style="text-align:center;padding:24px;color:var(--color-text-muted);font-size:13px;">계급이 없습니다. 편집하여 계급을 추가하세요.</div>`}

      ${org.authorNotes ? `<div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:16px;">
        <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:4px;">작가 전용 메모</div>
        <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(org.authorNotes))}</div>
      </div>` : ''}

      <div style="font-size:11px;color:var(--color-text-dim);text-align:right;padding-bottom:16px;">
        수정: ${Utils.formatDate(org.updatedAt)} · 생성: ${Utils.formatDate(org.createdAt)}
      </div>
    </div>`;

    document.getElementById('btnBackGodOrg')?.addEventListener('click', async () => {
      const scrollY = self._listScrollY || 0;
      self._currentId = null;
      await self.init(container);
      requestAnimationFrame(() => { container.scrollTop = scrollY; });
    });

    document.getElementById('btnEditGodOrg')?.addEventListener('click', () => self._openOrgForm(org, wid, container));

    document.getElementById('btnDelGodOrgDetail')?.addEventListener('click', () => {
      Utils.confirmWithInput('판테온 삭제', '삭제하려면 판테온 이름을 입력하세요.', org.name, async () => {
        await DB.del('gods', org.id);
        Utils.toast('삭제됨', 'info');
        self._currentId = null;
        self.init(container);
      });
    });

    container.querySelectorAll('.btn-add-god').forEach(btn => {
      btn.addEventListener('click', () => self._openGodForm(null, btn.dataset.rankId, org, wid, container));
    });

    container.querySelectorAll('.btn-edit-god').forEach(btn => {
      btn.addEventListener('click', () => {
        const rank = (org.ranks || []).find(r => r.id === btn.dataset.rankId);
        const god = (rank?.gods || []).find(g => g.id === btn.dataset.godId);
        if (god) self._openGodForm(god, btn.dataset.rankId, org, wid, container);
      });
    });

    container.querySelectorAll('.btn-del-god').forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.confirmWithInput('신 삭제', '삭제하려면 신 이름을 입력하세요.', btn.dataset.godName, async () => {
          const updated = JSON.parse(JSON.stringify(org));
          const rank = (updated.ranks || []).find(r => r.id === btn.dataset.rankId);
          if (rank) rank.gods = (rank.gods || []).filter(g => g.id !== btn.dataset.godId);
          updated.updatedAt = Date.now();
          await DB.put('gods', updated);
          Utils.toast('삭제됨', 'info');
          self._renderDetail(container, updated, wid);
        });
      });
    });
  },

  // ── ORG FORM ─────────────────────────────────────────────────────────────────

  _openOrgForm: function(org, wid, container) {
    const self = this;
    const isEdit = !!org;
    const o = org || {};

    let selectedIcon = o.icon || '⚡';
    let formRanks = (o.ranks || []).map(r => ({
      id: r.id || DB.genId(),
      name: r.name || '',
      color: r.color || self.RANK_COLORS[0],
      description: r.description || '',
      gods: r.gods || [],
    }));

    function syncRanksFromDOM() {
      document.querySelectorAll('#godRankRows .rank-row').forEach(el => {
        const idx = parseInt(el.dataset.rankIdx);
        if (formRanks[idx]) {
          formRanks[idx].name = el.querySelector('.rank-name')?.value || '';
          formRanks[idx].description = el.querySelector('.rank-desc')?.value || '';
          formRanks[idx].color = el.querySelector('.rank-color-input')?.value || self.RANK_COLORS[idx % self.RANK_COLORS.length];
        }
      });
    }

    const renderRankRows = () => {
      if (!formRanks.length) return `<div style="font-size:12px;color:var(--color-text-dim);text-align:center;padding:8px 0;">계급이 없습니다</div>`;
      return formRanks.map((r, i) => {
        const col = r.color || self.RANK_COLORS[i % self.RANK_COLORS.length];
        return `
        <div class="rank-row" data-rank-idx="${i}" style="border:1px solid ${col}55;border-radius:8px;padding:10px;margin-bottom:8px;background:${col}08;">
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
            <input class="input-field rank-name" data-rank-idx="${i}" value="${Utils.escHtml(r.name)}" placeholder="계급명 (예: 최고신)" style="flex:1;box-sizing:border-box;font-size:13px;" />
            <input type="color" class="rank-color-input" data-rank-idx="${i}" value="${col}" title="색상 선택" style="width:32px;height:32px;border:1px solid var(--color-border);border-radius:4px;cursor:pointer;padding:2px;background:none;" />
            <button type="button" class="rank-del btn btn-ghost btn-sm" data-rank-idx="${i}" style="color:var(--color-danger);font-size:11px;flex-shrink:0;">✕</button>
          </div>
          <input class="input-field rank-desc" data-rank-idx="${i}" value="${Utils.escHtml(r.description)}" placeholder="계급 설명..." style="width:100%;box-sizing:border-box;font-size:12px;" />
          <div style="margin-top:5px;font-size:11px;color:var(--color-text-dim);">소속 신: ${r.gods.length}명 (신 추가/편집은 상세 화면에서 가능)</div>
        </div>`;
      }).join('');
    };

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
        <div class="form-group">
          <label class="form-label">이름 *</label>
          <input class="input-field" id="fGOName" value="${Utils.escHtml(o.name || '')}" placeholder="판테온 이름" style="width:100%;box-sizing:border-box;" />
        </div>

        <div class="form-group">
          <label class="form-label">아이콘</label>
          <div style="font-size:28px;text-align:center;margin-bottom:6px;" id="godOrgIconPreview">${Utils.escHtml(selectedIcon)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;" id="godOrgIconPicker">
            ${self.ICON_POOL.map(ic => `<button type="button" class="icon-pick-btn" data-icon="${ic}" style="font-size:20px;padding:5px;border-radius:7px;border:2px solid ${ic===selectedIcon?'var(--color-primary)':'transparent'};background:var(--color-bg);cursor:pointer;line-height:1.2;">${ic}</button>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">도메인 (담당 영역)</label>
          <input class="input-field" id="fGODomain" value="${Utils.escHtml(o.domain || '')}" placeholder="예: 창조/파괴, 빛/어둠" style="width:100%;box-sizing:border-box;" />
        </div>

        <div class="form-group">
          <label class="form-label">설명</label>
          <textarea class="textarea-field" id="fGODesc" rows="3" style="width:100%;box-sizing:border-box;">${Utils.escHtml(o.description || '')}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" style="display:flex;align-items:center;justify-content:space-between;">
            <span>계급 목록</span>
            <button type="button" class="btn btn-ghost btn-sm" id="btnAddRank">+ 계급 추가</button>
          </label>
          <div id="godRankRows">${renderRankRows()}</div>
        </div>

        <div class="form-group">
          <label class="form-label">작가 메모</label>
          <textarea class="textarea-field" id="fGOAuthor" rows="2" style="width:100%;box-sizing:border-box;">${Utils.escHtml(o.authorNotes || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '판테온 편집' : '새 판테온', body, async () => {
      const name = document.getElementById('fGOName')?.value.trim();
      if (!name) { Utils.fieldError('fGOName'); return false; }

      syncRanksFromDOM();
      const savedRanks = formRanks.filter(r => r.name.trim());

      const record = {
        ...(o || {}),
        worldId: wid,
        name,
        icon: selectedIcon,
        domain: document.getElementById('fGODomain')?.value.trim() || '',
        description: document.getElementById('fGODesc')?.value.trim() || '',
        ranks: savedRanks,
        authorNotes: document.getElementById('fGOAuthor')?.value.trim() || '',
        id: o.id || DB.genId(),
        createdAt: o.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await DB.put('gods', record);
      await AppStore.updateStreak();
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      self._currentId = record.id;
      const updated = await DB.get('gods', record.id);
      if (updated) self._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      const picker = document.getElementById('godOrgIconPicker');
      const preview = document.getElementById('godOrgIconPreview');
      picker?.querySelectorAll('.icon-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedIcon = btn.dataset.icon;
          picker.querySelectorAll('.icon-pick-btn').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = 'var(--color-primary)';
          if (preview) preview.textContent = selectedIcon;
        });
      });

      function rebindRankEvents() {
        document.querySelectorAll('#godRankRows .rank-del').forEach(btn => {
          btn.addEventListener('click', () => {
            syncRanksFromDOM();
            formRanks.splice(parseInt(btn.dataset.rankIdx), 1);
            const el = document.getElementById('godRankRows');
            if (el) el.innerHTML = renderRankRows();
            rebindRankEvents();
          });
        });
        document.querySelectorAll('#godRankRows .rank-color-input').forEach(input => {
          input.addEventListener('input', () => {
            const idx = parseInt(input.dataset.rankIdx);
            if (formRanks[idx]) formRanks[idx].color = input.value;
            const row = input.closest('.rank-row');
            if (row) {
              row.style.borderColor = input.value + '55';
              row.style.background = input.value + '08';
            }
          });
        });
      }

      document.getElementById('btnAddRank')?.addEventListener('click', () => {
        syncRanksFromDOM();
        formRanks.push({ id: DB.genId(), name: '', color: self.RANK_COLORS[formRanks.length % self.RANK_COLORS.length], description: '', gods: [] });
        const el = document.getElementById('godRankRows');
        if (el) el.innerHTML = renderRankRows();
        rebindRankEvents();
      });

      rebindRankEvents();
    }, 50);
  },

  // ── GOD FORM ─────────────────────────────────────────────────────────────────

  _openGodForm: function(god, rankId, org, wid, container) {
    const self = this;
    const isEdit = !!god;
    const g = god || {};

    let selectedIcon = g.icon || '✨';
    let formAbilities = (g.abilities || []).map(a => ({ ...a }));

    function syncAbilitiesFromDOM() {
      document.querySelectorAll('#godAbilityRows .ability-row').forEach(el => {
        const idx = parseInt(el.dataset.abIdx);
        if (formAbilities[idx]) {
          formAbilities[idx].name = el.querySelector('.ab-name')?.value || '';
          formAbilities[idx].type = el.querySelector('.ab-type')?.value || '패시브';
          formAbilities[idx].description = el.querySelector('.ab-desc')?.value || '';
        }
      });
    }

    const renderAbilityRows = () => {
      if (!formAbilities.length) return `<div style="font-size:12px;color:var(--color-text-dim);text-align:center;padding:8px 0;">능력이 없습니다</div>`;
      return formAbilities.map((ab, i) => `
        <div class="ability-row" data-ab-idx="${i}" style="border:1px solid var(--color-border);border-radius:7px;padding:8px;margin-bottom:6px;background:var(--color-bg,#0a0e1a);">
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:5px;">
            <input class="input-field ab-name" data-ab-idx="${i}" value="${Utils.escHtml(ab.name || '')}" placeholder="능력 이름" style="flex:1;box-sizing:border-box;font-size:12px;" />
            <select class="select-input ab-type" data-ab-idx="${i}" style="width:76px;font-size:11px;">
              ${self.ABILITY_TYPES.map(t => `<option value="${t}" ${ab.type === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-ghost btn-sm ab-del" data-ab-idx="${i}" style="color:var(--color-danger);font-size:11px;flex-shrink:0;">✕</button>
          </div>
          <textarea class="textarea-field ab-desc" data-ab-idx="${i}" rows="2" placeholder="능력 설명..." style="width:100%;box-sizing:border-box;font-size:12px;">${Utils.escHtml(ab.description || '')}</textarea>
        </div>`).join('');
    };

    const rank = (org.ranks || []).find(r => r.id === rankId);
    const rankName = rank?.name || '';
    const rankColor = rank?.color || '#fbbf24';

    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;padding-right:4px;">
        ${rankName ? `<div style="font-size:12px;color:${rankColor};font-weight:700;padding:5px 10px;background:${rankColor}15;border-radius:6px;">계급: ${Utils.escHtml(rankName)}</div>` : ''}

        <div class="form-group">
          <label class="form-label">이름 *</label>
          <input class="input-field" id="fGodName" value="${Utils.escHtml(g.name || '')}" placeholder="신 이름" style="width:100%;box-sizing:border-box;" />
        </div>

        <div class="form-group">
          <label class="form-label">아이콘</label>
          <div style="font-size:26px;text-align:center;margin-bottom:5px;" id="godIconPreview">${Utils.escHtml(selectedIcon)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;" id="godIconPicker">
            ${self.ICON_POOL.map(ic => `<button type="button" class="icon-pick-btn" data-icon="${ic}" style="font-size:18px;padding:4px;border-radius:6px;border:2px solid ${ic===selectedIcon?'var(--color-primary)':'transparent'};background:var(--color-bg);cursor:pointer;line-height:1.2;">${ic}</button>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">설명</label>
          <textarea class="textarea-field" id="fGodDesc" rows="3" style="width:100%;box-sizing:border-box;">${Utils.escHtml(g.description || '')}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" style="display:flex;align-items:center;justify-content:space-between;">
            <span>능력 목록</span>
            <button type="button" class="btn btn-ghost btn-sm" id="btnAddAbility">+ 능력 추가</button>
          </label>
          <div id="godAbilityRows">${renderAbilityRows()}</div>
        </div>

        <div class="form-group">
          <label class="form-label">메모 <span style="font-size:11px;color:var(--color-text-dim);">(내부 노트)</span></label>
          <textarea class="textarea-field" id="fGodNotes" rows="2" style="width:100%;box-sizing:border-box;">${Utils.escHtml(g.notes || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '신 편집' : '신 추가', body, async () => {
      const name = document.getElementById('fGodName')?.value.trim();
      if (!name) { Utils.fieldError('fGodName'); return false; }

      syncAbilitiesFromDOM();
      const savedAbilities = formAbilities.filter(a => a.name.trim()).map(a => ({
        id: a.id || DB.genId(),
        name: a.name.trim(),
        type: a.type || '패시브',
        description: a.description.trim(),
      }));

      const newGod = {
        id: g.id || DB.genId(),
        name,
        icon: selectedIcon,
        description: document.getElementById('fGodDesc')?.value.trim() || '',
        abilities: savedAbilities,
        notes: document.getElementById('fGodNotes')?.value.trim() || '',
      };

      const updatedOrg = JSON.parse(JSON.stringify(org));
      const targetRank = (updatedOrg.ranks || []).find(r => r.id === rankId);
      if (!targetRank) { Utils.toast('계급을 찾을 수 없습니다', 'error'); return false; }
      if (!targetRank.gods) targetRank.gods = [];

      if (isEdit) {
        const idx = targetRank.gods.findIndex(gg => gg.id === g.id);
        if (idx >= 0) targetRank.gods[idx] = newGod;
        else targetRank.gods.push(newGod);
      } else {
        targetRank.gods.push(newGod);
      }

      updatedOrg.updatedAt = Date.now();
      await DB.put('gods', updatedOrg);
      await AppStore.updateStreak();
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      self._renderDetail(container, updatedOrg, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      const picker = document.getElementById('godIconPicker');
      const preview = document.getElementById('godIconPreview');
      picker?.querySelectorAll('.icon-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedIcon = btn.dataset.icon;
          picker.querySelectorAll('.icon-pick-btn').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = 'var(--color-primary)';
          if (preview) preview.textContent = selectedIcon;
        });
      });

      function rebindAbilityEvents() {
        document.querySelectorAll('#godAbilityRows .ab-del').forEach(btn => {
          btn.addEventListener('click', () => {
            syncAbilitiesFromDOM();
            formAbilities.splice(parseInt(btn.dataset.abIdx), 1);
            const el = document.getElementById('godAbilityRows');
            if (el) el.innerHTML = renderAbilityRows();
            rebindAbilityEvents();
          });
        });
      }

      document.getElementById('btnAddAbility')?.addEventListener('click', () => {
        syncAbilitiesFromDOM();
        formAbilities.push({ id: DB.genId(), name: '', type: '패시브', description: '' });
        const el = document.getElementById('godAbilityRows');
        if (el) el.innerHTML = renderAbilityRows();
        rebindAbilityEvents();
      });

      rebindAbilityEvents();
    }, 50);
  },
};
