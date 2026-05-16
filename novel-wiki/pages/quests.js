'use strict';
window.Pages = window.Pages || {};
window.Pages.quests = {
  _container: null,
  _currentId: null,
  _listScrollY: 0,

  ICONS: ['📋','⚔️','🛡️','🗡️','💎','🌟','🔥','❄️','⚡','🌊','🏆','🎯','👑','🔮','📜','🎁','💰','🗺️','🌺','⚓'],
  STATUS_COLORS: { '미시작': '#9ca3af', '진행 중': '#60a5fa', '완료': '#10b981', '실패': '#ef4444', '숨김': '#fbbf24' },
  STATUSES: ['미시작', '진행 중', '완료', '실패', '숨김'],

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
    if (options.highlightId) this._currentId = options.highlightId;
    const all = await DB.getAll('quests', wid);
    if (this._currentId) {
      const item = all.find(q => q.id === this._currentId);
      if (item) { await this._renderDetail(container, item, wid, all); return; }
    }
    this._renderList(container, all, wid);
  },

  destroy: function() {
    this._container = null;
    this._currentId = null;
  },

  // ── LIST ──────────────────────────────────────────────────────────────────
  _renderList: function(container, all, wid) {
    this._currentId = null;
    const self = this;
    all = [...all].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const world = AppStore.getState().currentWorld;

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">퀘스트</h2>
          <button class="btn btn-primary btn-sm" id="btnAddQuest">+ 추가</button>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${all.length}개
        </p>
        <input class="input-field" id="questFilter" placeholder="퀘스트명 검색..." style="margin-top:8px;width:100%;box-sizing:border-box;" />
      </div>
      ${all.length === 0
        ? `<div class="empty-state" style="padding:48px;text-align:center;">
             <div style="font-size:48px;margin-bottom:12px;">📋</div>
             <div style="font-weight:700;font-size:16px;margin-bottom:4px;">등록된 퀘스트가 없습니다</div>
             <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 첫 퀘스트를 등록하세요</div>
           </div>`
        : `<div style="display:flex;flex-direction:column;gap:8px;" id="questList">
             ${all.map(q => this._questCard(q)).join('')}
           </div>`}
    </div>`;

    setTimeout(() => { container.scrollTop = self._listScrollY || 0; }, 0);

    document.getElementById('questFilter')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.quest-item').forEach(btn => {
        btn.style.display = (btn.dataset.name || '').includes(q) ? '' : 'none';
      });
    });

    document.getElementById('btnAddQuest')?.addEventListener('click', () => {
      self._listScrollY = container.scrollTop;
      self._openForm(container, null, wid, all);
    });

    container.querySelectorAll('.quest-item').forEach(btn => {
      btn.addEventListener('click', e => {
        if (e.target.closest('.btn-quest-edit') || e.target.closest('.btn-quest-del')) return;
        self._listScrollY = container.scrollTop;
        const item = all.find(q => q.id === btn.dataset.id);
        if (item) { self._currentId = item.id; self._renderDetail(container, item, wid, all); }
      });
    });

    container.querySelectorAll('.btn-quest-edit').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const item = all.find(q => q.id === btn.dataset.id);
        if (item) self._openForm(container, item, wid, all);
      });
    });

    container.querySelectorAll('.btn-quest-del').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const item = all.find(q => q.id === btn.dataset.id);
        Utils.confirm(`"${item?.name || '퀘스트'}"를 삭제하시겠습니까?`, '이 작업은 되돌릴 수 없습니다.', async () => {
          await DB.del('quests', btn.dataset.id);
          await AppStore.updateStreak();
          await AppStore.recordActivity('quests', false);
          self._currentId = null;
          const updated = await DB.getAll('quests', wid);
          self._renderList(container, updated, wid);
          Utils.toast('삭제되었습니다.', 'info');
        });
      });
    });
  },

  _questCard: function(q) {
    const statusColor = this.STATUS_COLORS[q.status] || '#9ca3af';
    return `
    <button class="card card--interactive quest-item"
      data-id="${Utils.escHtml(q.id)}"
      data-name="${Utils.escHtml((q.name || '').toLowerCase())}"
      style="display:flex;align-items:center;gap:12px;padding:14px 16px;text-align:left;">
      <div style="font-size:28px;min-width:36px;text-align:center;">${Utils.escHtml(q.icon || '📋')}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
          <span style="font-weight:700;font-size:15px;color:var(--color-text);">${Utils.escHtml(q.name || '이름 없음')}</span>
          ${q.status ? `<span style="font-size:11px;padding:1px 7px;border-radius:10px;font-weight:700;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}55;">${Utils.escHtml(q.status)}</span>` : ''}
        </div>
        <div style="font-size:12px;color:var(--color-text-muted);">
          ${q.level ? `레벨 제한: ${Utils.escHtml(q.level)}` : ''}
          ${q.location?.name || q.location?.desc ? ` · 장소: ${Utils.escHtml(q.location.name || q.location.desc)}` : ''}
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;flex-direction:column;align-items:flex-end;">
        <button class="btn btn-ghost btn-sm btn-quest-edit" data-id="${Utils.escHtml(q.id)}" style="font-size:11px;">편집</button>
        <button class="btn btn-ghost btn-sm btn-quest-del" data-id="${Utils.escHtml(q.id)}" style="font-size:11px;color:var(--color-danger);">삭제</button>
      </div>
    </button>`;
  },

  // ── DETAIL ────────────────────────────────────────────────────────────────
  _renderDetail: async function(container, item, wid, all) {
    const self = this;
    const statusColor = this.STATUS_COLORS[item.status] || '#9ca3af';

    const field = (label, value, multiline) => {
      if (!value && value !== 0) return '';
      const content = multiline
        ? `<div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(value))}</div>`
        : `<div style="font-size:13px;">${Utils.escHtml(String(value))}</div>`;
      return `<div style="margin-bottom:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:2px;">${label}</div>${content}</div>`;
    };

    const chipListHtml = (arr, icon) => {
      if (!arr || arr.length === 0) return '';
      return arr.map(x => `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);padding:2px 8px;border-radius:10px;font-size:12px;">${icon} ${Utils.escHtml(x.name || '')}${x.count ? ` ×${Utils.escHtml(String(x.count))}` : ''}${x.grade ? ` (${Utils.escHtml(x.grade)})` : ''}</span>`).join('');
    };

    const reqItems = item.reqItems || [];
    const reqChars = item.reqChars || [];
    const rewardItems = item.rewardItems || [];
    const rewardSkills = item.rewardSkills || [];
    const triggerItems = item.triggerRefs?.items || [];
    const triggerChars = item.triggerRefs?.chars || [];

    container.innerHTML = `
    <div class="page active" style="overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;">
      <div class="page-header" style="padding-bottom:0;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackQuests">← 목록</button>
          <div style="font-size:36px;">${Utils.escHtml(item.icon || '📋')}</div>
          <div style="flex:1;min-width:0;">
            <h2 style="font-size:20px;font-weight:800;color:var(--color-text);margin:0;">${Utils.escHtml(item.name || '이름 없음')}</h2>
            <div style="margin-top:4px;">
              ${item.status ? `<span style="font-size:12px;padding:2px 10px;border-radius:10px;font-weight:700;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}55;">${Utils.escHtml(item.status)}</span>` : ''}
              ${item.difficulty ? `<span style="font-size:12px;margin-left:6px;padding:2px 8px;border-radius:8px;background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.3);">난이도: ${Utils.escHtml(item.difficulty)}</span>` : ''}
              ${item.level ? `<span style="font-size:12px;margin-left:6px;color:var(--color-text-muted);">Lv. ${Utils.escHtml(item.level)}</span>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="btn btn-ghost btn-sm" id="btnEditQuest">편집</button>
            <button class="btn btn-ghost btn-sm" id="btnDelQuest" style="color:var(--color-danger);">삭제</button>
          </div>
        </div>
      </div>

      ${item.description ? `
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:8px;letter-spacing:1px;">퀘스트 내용</div>
        <div style="font-size:13px;white-space:pre-wrap;line-height:1.8;">${Utils.escHtml(item.description)}</div>
      </div>` : ''}

      ${item.clearMethod ? `
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
        <div style="font-size:11px;color:#10b981;font-weight:700;margin-bottom:8px;letter-spacing:1px;">✅ 클리어 방법</div>
        <div style="font-size:13px;white-space:pre-wrap;line-height:1.8;">${Utils.escHtml(item.clearMethod)}</div>
      </div>` : ''}

      ${(reqItems.length || reqChars.length || item.level || item.reqOthers) ? `
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:8px;letter-spacing:1px;">⚙️ 요구 조건</div>
        ${field('레벨 제한', item.level)}
        ${reqItems.length ? `<div style="margin-bottom:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">요구 아이템</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${chipListHtml(reqItems, '📦')}</div></div>` : ''}
        ${reqChars.length ? `<div style="margin-bottom:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">요구 캐릭터</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${chipListHtml(reqChars, '👤')}</div></div>` : ''}
        ${field('기타 요구 조건', item.reqOthers, true)}
      </div>` : ''}

      ${(rewardItems.length || rewardSkills.length || item.rewardOthers) ? `
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:8px;letter-spacing:1px;">🎁 보상</div>
        ${rewardItems.length ? `<div style="margin-bottom:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">보상 아이템</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${chipListHtml(rewardItems, '📦')}</div></div>` : ''}
        ${rewardSkills.length ? `<div style="margin-bottom:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">보상 스킬</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${chipListHtml(rewardSkills, '✨')}</div></div>` : ''}
        ${field('기타 보상', item.rewardOthers, true)}
      </div>` : ''}

      ${item.failPenalty ? `
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
        <div style="font-size:11px;color:#ef4444;font-weight:700;margin-bottom:8px;letter-spacing:1px;">💀 실패 패널티</div>
        <div style="font-size:13px;white-space:pre-wrap;line-height:1.8;">${Utils.escHtml(item.failPenalty)}</div>
      </div>` : ''}

      ${(item.linkedGates && item.linkedGates.length) ? `
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
        <div style="font-size:11px;color:#8b5cf6;font-weight:700;margin-bottom:8px;letter-spacing:1px;">🌀 연관 게이트</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${item.linkedGates.map(g2 => `<button class="detail-gate-link btn btn-ghost btn-sm" data-gid="${Utils.escHtml(g2.id)}"
            style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;font-size:12px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.4);cursor:pointer;">
            🌀 ${Utils.escHtml(g2.name||'?')}</button>`).join('')}
        </div>
      </div>` : ''}

      ${item.constraints ? `
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:8px;letter-spacing:1px;">🚫 퀘스트 제약</div>
        <div style="font-size:13px;white-space:pre-wrap;line-height:1.8;">${Utils.escHtml(item.constraints)}</div>
      </div>` : ''}

      ${(item.location?.name || item.location?.desc || item.trigger || triggerItems.length || triggerChars.length) ? `
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:8px;letter-spacing:1px;">📍 발생 정보</div>
        ${(item.location?.name || item.location?.desc) ? `<div style="margin-bottom:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:2px;">발생 장소</div><div style="font-size:13px;">${Utils.escHtml(item.location.name || item.location.desc)}</div></div>` : ''}
        ${field('발생 트리거', item.trigger, true)}
        ${triggerItems.length ? `<div style="margin-bottom:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">트리거 아이템</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${chipListHtml(triggerItems, '📦')}</div></div>` : ''}
        ${triggerChars.length ? `<div style="margin-bottom:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">트리거 캐릭터</div><div style="display:flex;flex-wrap:wrap;gap:5px;">${chipListHtml(triggerChars, '👤')}</div></div>` : ''}
      </div>` : ''}

      ${item.notes ? `
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:8px;letter-spacing:1px;">📝 메모</div>
        <div style="font-size:13px;white-space:pre-wrap;line-height:1.8;">${Utils.escHtml(item.notes)}</div>
      </div>` : ''}

      <div style="height:48px;"></div>
    </div>`;

    container.querySelector('#btnBackQuests')?.addEventListener('click', async () => {
      self._currentId = null;
      const updated = await DB.getAll('quests', wid);
      self._renderList(container, updated, wid);
    });
    container.querySelector('#btnEditQuest')?.addEventListener('click', () => {
      self._openForm(container, item, wid, all);
    });
    container.querySelector('#btnDelQuest')?.addEventListener('click', () => {
      Utils.confirm(`"${item.name}" 퀘스트를 삭제하시겠습니까?`, '이 작업은 되돌릴 수 없습니다.', async () => {
        await DB.del('quests', item.id);
        await AppStore.updateStreak();
        await AppStore.recordActivity('quests', false);
        self._currentId = null;
        const updated = await DB.getAll('quests', wid);
        self._renderList(container, updated, wid);
        Utils.toast('삭제되었습니다.', 'info');
      });
    });
    container.querySelectorAll('.detail-gate-link').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.gid && window.AppRouter) {
          AppRouter.navigate('gates', { highlightId: btn.dataset.gid });
        }
      });
    });
  },

  // ── FORM ──────────────────────────────────────────────────────────────────
  _openForm: async function(container, item, wid, all) {
    const self = this;
    const isEdit = !!item;
    const q = item || {};
    const currentIcon = q.icon || '📋';

    const [allItems, allChars, allSkills, allPlaces, allGates] = await Promise.all([
      DB.getAll('items', wid),
      DB.getAll('characters', wid),
      DB.getAll('skills', wid),
      DB.getAll('places', wid),
      DB.getAll('gates', wid),
    ]);

    // Chip state
    let reqItems = [...(q.reqItems || [])];
    let reqChars = [...(q.reqChars || [])];
    let rewardItems = [...(q.rewardItems || [])];
    let rewardSkills = [...(q.rewardSkills || [])];
    let triggerItems = [...((q.triggerRefs?.items) || [])];
    let triggerChars = [...((q.triggerRefs?.chars) || [])];
    let linkedGates = [...(q.linkedGates || [])];

    // Location state
    let locationRef = { type: q.location?.type || 'text', id: q.location?.id || '', name: q.location?.name || '', desc: q.location?.desc || '' };

    const statusOpts = this.STATUSES.map(s =>
      `<option value="${s}" ${q.status === s ? 'selected' : ''}>${s}</option>`).join('');

    const icons = this.ICONS;

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
        <!-- 기본 정보 -->
        <div>
          <label class="form-label">아이콘</label>
          <div id="qIconDisplay" style="font-size:36px;text-align:center;margin-bottom:8px;" data-icon="${currentIcon}">${currentIcon}</div>
          <div id="qIconGrid" style="display:flex;flex-wrap:wrap;gap:6px;">
            ${icons.map(ic => `<button type="button" class="q-icon-btn" data-icon="${ic}" style="font-size:22px;padding:5px;border-radius:8px;border:2px solid ${ic===currentIcon?'var(--color-primary)':'transparent'};background:var(--color-bg);cursor:pointer;line-height:1.2;">${ic}</button>`).join('')}
          </div>
        </div>
        <div>
          <label class="form-label">퀘스트명 (필수)</label>
          <input class="input-field" id="fQuestName" value="${Utils.escHtml(q.name || '')}" placeholder="퀘스트 이름" style="width:100%;box-sizing:border-box;" />
        </div>
        <div>
          <label class="form-label">난이도 등급</label>
          <input class="input-field" id="fQuestDifficulty" value="${Utils.escHtml(q.difficulty || '')}"
            placeholder="예: F, E, D, C, B, A, S, SS, 보스급" style="width:100%;box-sizing:border-box;" />
        </div>
        <div>
          <label class="form-label">상태</label>
          <select class="select-input" id="fQuestStatus" style="width:100%;">
            <option value="">선택 안 함</option>${statusOpts}
          </select>
        </div>

        <!-- 요구 조건 -->
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:var(--color-primary);margin-bottom:8px;">⚙️ 요구 조건</div>
          <div class="form-group">
            <label class="form-label">레벨 제한</label>
            <input class="input-field" id="fQuestLevel" value="${Utils.escHtml(q.level || '')}" placeholder="예: 50, E급 이상" style="width:100%;box-sizing:border-box;" />
          </div>
          <div style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;margin-bottom:8px;">
            <label class="form-label" style="display:block;margin-bottom:6px;">요구 아이템</label>
            <div id="reqItemChips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:24px;margin-bottom:6px;"></div>
            <div style="position:relative;">
              <input class="input-field" id="reqItemSearch" placeholder="아이템 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="reqItemResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:140px;overflow-y:auto;"></div>
            </div>
          </div>
          <div style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;margin-bottom:8px;">
            <label class="form-label" style="display:block;margin-bottom:6px;">요구 캐릭터</label>
            <div id="reqCharChips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:24px;margin-bottom:6px;"></div>
            <div style="position:relative;">
              <input class="input-field" id="reqCharSearch" placeholder="캐릭터 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="reqCharResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:140px;overflow-y:auto;"></div>
            </div>
          </div>
          <div>
            <label class="form-label">기타 요구 조건</label>
            <textarea class="input-field" id="fQuestReqOthers" rows="2" placeholder="기타 조건 설명..." style="width:100%;box-sizing:border-box;resize:vertical;">${Utils.escHtml(q.reqOthers || '')}</textarea>
          </div>
        </div>

        <!-- 클리어 방법 -->
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#10b981;margin-bottom:8px;">✅ 클리어 방법</div>
          <textarea class="input-field" id="fQuestClearMethod" rows="3"
            placeholder="퀘스트를 클리어하는 방법, 조건, 절차..."
            style="width:100%;box-sizing:border-box;resize:vertical;">${Utils.escHtml(q.clearMethod || '')}</textarea>
        </div>

        <!-- 보상 -->
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:var(--color-primary);margin-bottom:8px;">🎁 보상</div>
          <div style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;margin-bottom:8px;">
            <label class="form-label" style="display:block;margin-bottom:6px;">보상 아이템</label>
            <div id="rewardItemChips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:24px;margin-bottom:6px;"></div>
            <div style="position:relative;">
              <input class="input-field" id="rewardItemSearch" placeholder="아이템 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="rewardItemResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:140px;overflow-y:auto;"></div>
            </div>
          </div>
          <div style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;margin-bottom:8px;">
            <label class="form-label" style="display:block;margin-bottom:6px;">보상 스킬</label>
            <div id="rewardSkillChips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:24px;margin-bottom:6px;"></div>
            <div style="position:relative;">
              <input class="input-field" id="rewardSkillSearch" placeholder="스킬 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="rewardSkillResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:140px;overflow-y:auto;"></div>
            </div>
          </div>
          <div>
            <label class="form-label">기타 보상</label>
            <textarea class="input-field" id="fQuestRewardOthers" rows="2" placeholder="기타 보상 설명..." style="width:100%;box-sizing:border-box;resize:vertical;">${Utils.escHtml(q.rewardOthers || '')}</textarea>
          </div>
        </div>

        <!-- 실패 패널티 -->
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#ef4444;margin-bottom:8px;">💀 실패 패널티</div>
          <textarea class="input-field" id="fQuestFailPenalty" rows="2"
            placeholder="퀘스트 실패 시 결과, 패널티, 영향..."
            style="width:100%;box-sizing:border-box;resize:vertical;">${Utils.escHtml(q.failPenalty || '')}</textarea>
        </div>

        <!-- 퀘스트 내용 -->
        <div>
          <label class="form-label">퀘스트 내용</label>
          <textarea class="input-field" id="fQuestDesc" rows="4" placeholder="퀘스트 설명, 배경, 스토리..." style="width:100%;box-sizing:border-box;resize:vertical;">${Utils.escHtml(q.description || '')}</textarea>
        </div>

        <!-- 제약 -->
        <div>
          <label class="form-label">퀘스트 제약</label>
          <textarea class="input-field" id="fQuestConstraints" rows="2" placeholder="퀘스트 진행 중 제한 사항..." style="width:100%;box-sizing:border-box;resize:vertical;">${Utils.escHtml(q.constraints || '')}</textarea>
        </div>

        <!-- 발생 장소 -->
        <div style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
          <label class="form-label" style="display:block;margin-bottom:6px;">📍 발생 장소</label>
          <div style="display:flex;gap:12px;margin-bottom:4px;">
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
              <input type="radio" name="qLocType" value="text" ${locationRef.type !== 'ref' ? 'checked' : ''} /> 텍스트 입력
            </label>
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
              <input type="radio" name="qLocType" value="ref" ${locationRef.type === 'ref' ? 'checked' : ''} /> 장소에서 선택
            </label>
          </div>
          <div id="qLocTextDiv" style="display:${locationRef.type !== 'ref' ? 'block' : 'none'};">
            <input class="input-field" id="qLocText" value="${Utils.escHtml(locationRef.desc || '')}" placeholder="장소 설명 입력" style="width:100%;box-sizing:border-box;font-size:12px;" />
          </div>
          <div id="qLocRefDiv" style="display:${locationRef.type === 'ref' ? 'block' : 'none'};position:relative;">
            <input class="input-field" id="qLocSearch" placeholder="장소 검색..." value="${Utils.escHtml(locationRef.name || '')}" style="width:100%;box-sizing:border-box;font-size:12px;" autocomplete="off" />
            <div id="qLocResults" style="display:none;position:absolute;z-index:20;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;max-height:140px;overflow-y:auto;top:100%;left:0;"></div>
            <input type="hidden" id="qLocId" value="${Utils.escHtml(locationRef.id || '')}" />
          </div>
        </div>

        <!-- 트리거 -->
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:var(--color-primary);margin-bottom:8px;">⚡ 발생 트리거</div>
          <div>
            <label class="form-label">트리거 설명</label>
            <textarea class="input-field" id="fQuestTrigger" rows="3" placeholder="퀘스트 발생 조건, 이벤트, NPC 대화 등..." style="width:100%;box-sizing:border-box;resize:vertical;">${Utils.escHtml(q.trigger || '')}</textarea>
          </div>
          <div style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;margin-top:8px;">
            <label class="form-label" style="display:block;margin-bottom:6px;">트리거 아이템</label>
            <div id="trigItemChips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:24px;margin-bottom:6px;"></div>
            <div style="position:relative;">
              <input class="input-field" id="trigItemSearch" placeholder="아이템 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="trigItemResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:140px;overflow-y:auto;"></div>
            </div>
          </div>
          <div style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;margin-top:8px;">
            <label class="form-label" style="display:block;margin-bottom:6px;">트리거 캐릭터</label>
            <div id="trigCharChips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:24px;margin-bottom:6px;"></div>
            <div style="position:relative;">
              <input class="input-field" id="trigCharSearch" placeholder="캐릭터 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="trigCharResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:140px;overflow-y:auto;"></div>
            </div>
          </div>
        </div>

        <!-- 게이트 연동 -->
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#8b5cf6;margin-bottom:8px;">🌀 연관 게이트</div>
          <div id="linkedGateChips" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;margin-bottom:6px;">
            ${linkedGates.map(g2 => `<span class="linked-gate-chip" data-gid="${Utils.escHtml(g2.id)}" data-gname="${Utils.escHtml(g2.name||'')}"
              style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;font-size:12px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.4);">
              🌀 ${Utils.escHtml(g2.name||'?')}
              <button class="lg-chip-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:10px;padding:0 2px;">✕</button>
            </span>`).join('')}
          </div>
          <div style="position:relative;">
            <input class="input-field" id="linkedGateSearch" placeholder="게이트 검색..." autocomplete="off"
              style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="linkedGateResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:30;max-height:140px;overflow-y:auto;"></div>
          </div>
        </div>

        <!-- 메모 -->
        <div>
          <label class="form-label">메모</label>
          <textarea class="input-field" id="fQuestNotes" rows="2" placeholder="기타 메모..." style="width:100%;box-sizing:border-box;resize:vertical;">${Utils.escHtml(q.notes || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '퀘스트 편집' : '퀘스트 추가', body, async () => {
      const name = document.getElementById('fQuestName')?.value.trim();
      if (!name) { Utils.fieldError('fQuestName'); return false; }

      const icon = document.getElementById('qIconDisplay')?.dataset.icon || currentIcon;
      const locType = document.querySelector('[name="qLocType"]:checked')?.value || 'text';
      const savedLocation = locType === 'ref'
        ? { type: 'ref', id: document.getElementById('qLocId')?.value || '', name: document.getElementById('qLocSearch')?.value || '', desc: '' }
        : { type: 'text', id: '', name: '', desc: document.getElementById('qLocText')?.value.trim() || '' };

      const payload = {
        id: q.id || DB.genId(),
        worldId: wid,
        name,
        icon,
        status: document.getElementById('fQuestStatus')?.value || '',
        difficulty: document.getElementById('fQuestDifficulty')?.value.trim() || '',
        level: document.getElementById('fQuestLevel')?.value.trim() || '',
        reqItems,
        reqChars,
        reqOthers: document.getElementById('fQuestReqOthers')?.value.trim() || '',
        clearMethod: document.getElementById('fQuestClearMethod')?.value.trim() || '',
        rewardItems,
        rewardSkills,
        rewardOthers: document.getElementById('fQuestRewardOthers')?.value.trim() || '',
        failPenalty: document.getElementById('fQuestFailPenalty')?.value.trim() || '',
        description: document.getElementById('fQuestDesc')?.value.trim() || '',
        constraints: document.getElementById('fQuestConstraints')?.value.trim() || '',
        location: savedLocation,
        trigger: document.getElementById('fQuestTrigger')?.value.trim() || '',
        triggerRefs: { items: triggerItems, chars: triggerChars },
        linkedGates: [...document.querySelectorAll('#globalModalBody .linked-gate-chip')].map(el => ({id: el.dataset.gid, name: el.dataset.gname})),
        notes: document.getElementById('fQuestNotes')?.value.trim() || '',
        createdAt: q.createdAt || Date.now(),
      };

      const saved = await DB.put('quests', payload);
      await AppStore.updateStreak();
      await AppStore.recordActivity('quests', !isEdit);
      self._currentId = saved.id;
      const updated = await DB.getAll('quests', wid);
      Utils.toast(isEdit ? '수정되었습니다.' : '퀘스트가 추가되었습니다.');
      const found = updated.find(x => x.id === saved.id);
      if (found) self._renderDetail(container, found, wid, updated);
      else self._renderList(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      Utils.autoResizeTextareas(document.getElementById('globalModalBody'));

      // Icon picker
      const display = document.getElementById('qIconDisplay');
      const grid = document.getElementById('qIconGrid');
      if (display) display.dataset.icon = currentIcon;
      grid?.querySelectorAll('.q-icon-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (display) { display.textContent = btn.dataset.icon; display.dataset.icon = btn.dataset.icon; }
          grid.querySelectorAll('.q-icon-btn').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = 'var(--color-primary)';
        });
      });

      // Location type radio
      document.querySelectorAll('[name="qLocType"]').forEach(r => {
        r.addEventListener('change', () => {
          const tDiv = document.getElementById('qLocTextDiv');
          const rDiv = document.getElementById('qLocRefDiv');
          if (tDiv) tDiv.style.display = r.value === 'text' ? 'block' : 'none';
          if (rDiv) rDiv.style.display = r.value === 'ref' ? 'block' : 'none';
        });
      });
      // Location place search
      const locIn = document.getElementById('qLocSearch');
      const locRs = document.getElementById('qLocResults');
      if (locIn && locRs) {
        locIn.addEventListener('input', () => {
          const q2 = locIn.value.trim().toLowerCase();
          if (!q2) { locRs.style.display = 'none'; return; }
          const hits = allPlaces.filter(p => (p.name || '').toLowerCase().includes(q2)).slice(0, 8);
          locRs.innerHTML = hits.map(p => `<div class="qloc-result" data-pid="${Utils.escHtml(p.id)}" data-pname="${Utils.escHtml(p.name || '')}" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">${Utils.escHtml(p.name || '')}</div>`).join('');
          locRs.style.display = hits.length ? 'block' : 'none';
          locRs.querySelectorAll('.qloc-result').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              const idEl = document.getElementById('qLocId');
              if (idEl) idEl.value = row.dataset.pid;
              locIn.value = row.dataset.pname;
              locRs.style.display = 'none';
              locationRef.id = row.dataset.pid; locationRef.name = row.dataset.pname;
            });
          });
        });
        locIn.addEventListener('blur', () => setTimeout(() => { locRs.style.display = 'none'; }, 150));
      }

      // Generic chip helpers
      const makeChip = (x, icon, onDel) => {
        const span = document.createElement('span');
        span.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);padding:2px 8px;border-radius:10px;font-size:12px;';
        span.innerHTML = `${icon} ${Utils.escHtml(x.name || '')}${x.grade ? ` (${Utils.escHtml(x.grade)})` : ''} <span style="cursor:pointer;color:var(--color-danger);margin-left:2px;" class="chip-del-btn">✕</span>`;
        span.querySelector('.chip-del-btn').addEventListener('click', onDel);
        return span;
      };

      const wireChipSearch = (containerId, inputId, resultsId, dataArr, icon, stateArr, extraProp) => {
        const renderChips = () => {
          const el = document.getElementById(containerId);
          if (!el) return;
          el.innerHTML = '';
          stateArr.forEach((x, idx) => {
            const chip = makeChip(x, icon, () => { stateArr.splice(idx, 1); renderChips(); });
            el.appendChild(chip);
          });
        };
        renderChips();
        const inp = document.getElementById(inputId);
        const res = document.getElementById(resultsId);
        if (!inp || !res) return;
        inp.addEventListener('input', () => {
          const q2 = inp.value.trim().toLowerCase();
          if (!q2) { res.style.display = 'none'; return; }
          const hits = dataArr.filter(x => (x.name || '').toLowerCase().includes(q2) && !stateArr.some(s => s.id === x.id)).slice(0, 8);
          res.innerHTML = hits.map(x => `<div class="chip-search-result" data-id="${Utils.escHtml(x.id)}" data-name="${Utils.escHtml(x.name || '')}" data-grade="${Utils.escHtml(x.grade || '')}" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">${Utils.escHtml(x.name || '')}${x.grade ? ` (${Utils.escHtml(x.grade)})` : ''}</div>`).join('');
          res.style.display = hits.length ? 'block' : 'none';
          res.querySelectorAll('.chip-search-result').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              const entry = { id: row.dataset.id, name: row.dataset.name, grade: row.dataset.grade };
              if (extraProp) entry[extraProp] = 1;
              stateArr.push(entry);
              inp.value = ''; res.style.display = 'none';
              renderChips();
            });
          });
        });
        inp.addEventListener('blur', () => setTimeout(() => { res.style.display = 'none'; }, 150));
      };

      wireChipSearch('reqItemChips', 'reqItemSearch', 'reqItemResults', allItems, '📦', reqItems, 'count');
      wireChipSearch('reqCharChips', 'reqCharSearch', 'reqCharResults', allChars, '👤', reqChars, null);
      wireChipSearch('rewardItemChips', 'rewardItemSearch', 'rewardItemResults', allItems, '📦', rewardItems, 'count');
      wireChipSearch('rewardSkillChips', 'rewardSkillSearch', 'rewardSkillResults', allSkills, '✨', rewardSkills, null);
      wireChipSearch('trigItemChips', 'trigItemSearch', 'trigItemResults', allItems, '📦', triggerItems, null);
      wireChipSearch('trigCharChips', 'trigCharSearch', 'trigCharResults', allChars, '👤', triggerChars, null);

      // Gate linkage
      let lgList = [...linkedGates];
      const renderLinkedGateChips = () => {
        const wrap = document.getElementById('linkedGateChips');
        if (!wrap) return;
        wrap.innerHTML = lgList.map((g2, i) => `<span class="linked-gate-chip" data-gid="${Utils.escHtml(g2.id)}" data-gname="${Utils.escHtml(g2.name||'')}"
          style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;font-size:12px;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.4);">
          🌀 ${Utils.escHtml(g2.name||'?')}
          <button class="lg-chip-del" data-idx="${i}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:10px;padding:0 2px;">✕</button>
        </span>`).join('');
        wrap.querySelectorAll('.lg-chip-del').forEach(btn => {
          btn.addEventListener('click', () => { lgList.splice(parseInt(btn.dataset.idx, 10), 1); renderLinkedGateChips(); });
        });
      };
      renderLinkedGateChips();
      const lgInput = document.getElementById('linkedGateSearch');
      const lgResults = document.getElementById('linkedGateResults');
      if (lgInput && lgResults) {
        lgInput.addEventListener('input', () => {
          const q2 = lgInput.value.trim().toLowerCase();
          if (!q2) { lgResults.style.display = 'none'; return; }
          const hits = allGates.filter(gate => (gate.name||'').toLowerCase().includes(q2)).slice(0, 8);
          lgResults.innerHTML = hits.map(gate => `<div class="lg-result" data-gid="${Utils.escHtml(gate.id)}" data-gname="${Utils.escHtml(gate.name||'')}"
            style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">🌀 ${Utils.escHtml(gate.name||'?')}</div>`).join('');
          lgResults.style.display = hits.length ? 'block' : 'none';
          lgResults.querySelectorAll('.lg-result').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              if (!lgList.find(g2 => g2.id === row.dataset.gid)) {
                lgList.push({ id: row.dataset.gid, name: row.dataset.gname });
                renderLinkedGateChips();
              }
              lgInput.value = '';
              lgResults.style.display = 'none';
            });
          });
        });
        lgInput.addEventListener('blur', () => setTimeout(() => { lgResults.style.display = 'none'; }, 150));
      }
    }, 60);
  },
};
