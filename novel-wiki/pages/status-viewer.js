'use strict';
window.Pages = window.Pages || {};
window.Pages.statusViewer = {
  _container: null,
  _currentCharId: null,
  _viewMode: 'author', // 'author' | 'revealed' | 'hidden'
  _editOverrides: {},
  _communityLocked: true,
  _guildLocked: true,

  _VIEW_LABELS: {
    author:   '작가용',
    revealed: '소설(히든공개)',
    hidden:   '소설(히든가림)',
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

    if (options.charId) this._currentCharId = options.charId;

    this._communityLocked = AppFlags.get('communityLockedDefault', true);
    this._guildLocked = AppFlags.get('communityLockedDefault', true);
    const defaultMode = AppFlags.get('novelViewDefault', false) ? 'hidden' : 'author';
    if (!options.keepMode) this._viewMode = defaultMode;

    const chars = await DB.getAll('characters', wid);
    if (chars.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:48px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">👤</div>
          <div style="font-weight:700;font-size:16px;margin-bottom:4px;">캐릭터가 없습니다</div>
          <div style="font-size:13px;color:var(--color-text-muted);">캐릭터를 먼저 추가하세요</div>
          <button class="btn btn-primary" style="margin-top:16px;" onclick="AppRouter.navigate('characters')">캐릭터 관리</button>
        </div>`;
      return;
    }

    if (!this._currentCharId) this._currentCharId = chars[0].id;
    const char = chars.find(c => c.id === this._currentCharId) || chars[0];
    this._currentCharId = char.id;

    this._renderPage(container, chars, char, wid);
  },

  _applyOverrides: function(char) {
    const merged = Object.assign({}, char);
    const ov = this._editOverrides;
    if (ov.level !== undefined) merged.level = ov.level;
    if (ov.title !== undefined) merged.title = ov.title;
    if (ov.name !== undefined) merged.name = ov.name;
    if (ov.nation !== undefined) merged.nation = ov.nation;
    if (ov.guild !== undefined) merged.guild = ov.guild;
    if (ov.race !== undefined) merged.race = ov.race;
    if (ov.age !== undefined) merged.age = ov.age;
    if (ov.gender !== undefined) merged.gender = ov.gender;
    if (ov.stats !== undefined) merged.stats = ov.stats;
    if (ov.skills !== undefined) merged.skills = ov.skills;
    return merged;
  },

  _renderPage: async function(container, chars, char, wid) {
    const self = this;
    const viewMode = this._viewMode;
    const displayChar = this._applyOverrides(char);

    const [allAchievements, allConstellations, allItems] = await Promise.all([
      DB.getAll('achievements', wid),
      DB.getAll('constellations', wid),
      DB.getAll('items', wid),
    ]);

    const charAchievementIds = Array.isArray(char.achievementIds) ? char.achievementIds : [];
    const effectiveAchIds = this._editOverrides.achievementIds !== undefined
      ? this._editOverrides.achievementIds
      : charAchievementIds;
    const linkedAchievements = effectiveAchIds.map(id => allAchievements.find(a => a.id === id)).filter(Boolean);

    const linkedConstellations = allConstellations.filter(c =>
      (c.contractors || []).includes(char.id) ||
      (c.provisionalContractors || []).includes(char.id)
    );

    const effectiveItemIds = this._editOverrides.itemIds !== undefined
      ? this._editOverrides.itemIds
      : (char.itemIds || []);
    const linkedItems = effectiveItemIds.map(id => allItems.find(it => it.id === id)).filter(Boolean);

    const statusText = this._buildStatusText(displayChar, viewMode, linkedAchievements, linkedConstellations, linkedItems);
    const cl = this._communityLocked;
    const gl = this._guildLocked;

    const mkLockContent = (locked, placeholderText) => locked
      ? `<span style="color:rgba(107,157,232,0.3);letter-spacing:0.05em;">[&gt;[잠금]&lt;]</span>`
      : `<span style="color:rgba(107,157,232,0.5);">${placeholderText}</span>`;

    const modeBtnStyle = (m) => viewMode === m
      ? 'background:var(--color-primary);color:#000;border:1px solid var(--color-primary);'
      : 'background:var(--color-surface3);color:var(--color-text-muted);border:1px solid var(--color-border);';

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <h2 class="page-title">상태창 뷰어</h2>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" id="btnEditStats" style="font-size:11px;">수동 편집</button>
            <button class="btn btn-primary btn-sm" id="btnCopyStatus" style="font-size:11px;">텍스트 복사</button>
          </div>
        </div>

        <!-- View mode selector -->
        <div style="display:flex;gap:4px;margin-top:10px;flex-wrap:wrap;">
          ${['author','revealed','hidden'].map(m => `
            <button class="btn btn-sm" id="btnMode_${m}"
              style="font-size:11px;border-radius:6px;padding:4px 10px;${modeBtnStyle(m)}">
              ${self._VIEW_LABELS[m]}
            </button>
          `).join('')}
        </div>

        <p style="margin-top:6px;font-size:11px;color:var(--color-text-muted);">
          ${viewMode === 'author' ? '작가 전용 — 히든 스킬 🔒 표시, 아이템/메모 포함'
          : viewMode === 'revealed' ? '소설용 — 모든 스킬 표시, 히든 스킬도 공개 상태'
          : '소설용 — 히든 스킬 미표시, 독자 시점'}
        </p>
      </div>

      <!-- 캐릭터 선택 -->
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">캐릭터 선택</label>
        <select id="charSelect" class="select-input" style="width:100%;">
          ${chars.map(c => `<option value="${Utils.escHtml(c.id)}" ${c.id === char.id ? 'selected' : ''}>${Utils.escHtml(c.name)}${c.level !== undefined && c.level !== '' ? ' (Lv.' + c.level + ')' : ''}</option>`).join('')}
        </select>
      </div>

      ${Object.keys(this._editOverrides).length > 0
        ? '<div style="font-size:11px;padding:4px 10px;border-radius:4px;background:#8b5cf622;color:#8b5cf6;border:1px solid #8b5cf644;display:inline-block;margin-bottom:10px;">수동 편집 중</div>'
        : ''}

      <!-- Status window -->
      <div style="
        background:rgba(8,20,48,0.92);
        border:1px solid rgba(96,165,250,0.45);
        border-radius:12px;
        padding:20px 22px;
        font-family:'Courier New',Consolas,monospace;
        backdrop-filter:blur(10px);
        box-shadow:0 0 32px rgba(59,130,246,0.18),0 0 8px rgba(59,130,246,0.10),inset 0 0 16px rgba(59,130,246,0.04);
        margin-bottom:14px;
        overflow-x:auto;
      ">
        <pre id="statusPre" style="margin:0;white-space:pre;font-size:13px;line-height:1.85;color:#c8daff;font-family:inherit;letter-spacing:0.02em;">${Utils.escHtml(statusText)}</pre>
      </div>

      <!-- Community panels -->
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        <div style="background:rgba(8,20,48,0.7);border:1px solid rgba(96,165,250,0.2);border-radius:8px;padding:10px 12px;">
          <div style="font-size:12px;color:#6b9de8;">[알림 기록실]</div>
          <div style="font-size:11px;color:rgba(107,157,232,0.5);margin-top:4px;">새로운 알림이 없습니다</div>
        </div>
        <div style="background:rgba(8,20,48,0.7);border:1px solid rgba(96,165,250,${cl ? '0.2' : '0.45'});border-radius:8px;padding:10px 12px;transition:border-color .2s;" id="communityPanel">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:12px;color:#6b9de8;">${cl ? '(잠금)' : '[커뮤니티]'}</span>
            <button id="btnToggleCommunity" title="${cl ? '잠금 해제' : '잠금'}" style="background:none;border:none;cursor:pointer;font-size:13px;color:#6b9de8;padding:0 2px;line-height:1;">${cl ? '🔒' : '🔓'}</button>
          </div>
          ${cl ? '' : `<div id="communityContent" style="font-size:11px;margin-top:4px;">${mkLockContent(cl, '새로운 글이 없습니다')}</div>`}
        </div>
        <div style="background:rgba(8,20,48,0.7);border:1px solid rgba(96,165,250,${gl ? '0.2' : '0.45'});border-radius:8px;padding:10px 12px;transition:border-color .2s;" id="guildPanel">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:12px;color:#6b9de8;">${gl ? '(잠금)' : '[길드 커뮤니티]'}</span>
            <button id="btnToggleGuild" title="${gl ? '잠금 해제' : '잠금'}" style="background:none;border:none;cursor:pointer;font-size:13px;color:#6b9de8;padding:0 2px;line-height:1;">${gl ? '🔒' : '🔓'}</button>
          </div>
          ${gl ? '' : `<div id="guildContent" style="font-size:11px;margin-top:4px;">${mkLockContent(gl, '새로운 길드 공지가 없습니다')}</div>`}
        </div>
      </div>

      <!-- Raw text output -->
      <div style="background:var(--color-surface2);border-radius:8px;padding:12px 14px;margin-bottom:16px;border:1px solid var(--color-border);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:12px;font-weight:600;color:var(--color-text-muted);">텍스트 출력</div>
          <button class="btn btn-ghost btn-sm" id="btnCopyRaw" style="font-size:11px;">복사</button>
        </div>
        <pre id="statusRawPre" style="margin:0;white-space:pre-wrap;font-size:11px;line-height:1.6;color:var(--color-text-dim);max-height:180px;overflow-y:auto;word-break:break-all;">${Utils.escHtml(statusText)}</pre>
      </div>
    </div>`;

    // View mode buttons
    ['author', 'revealed', 'hidden'].forEach(m => {
      document.getElementById('btnMode_' + m)?.addEventListener('click', async () => {
        self._viewMode = m;
        const updatedChars = await DB.getAll('characters', wid);
        const updatedChar = updatedChars.find(c => c.id === self._currentCharId) || updatedChars[0];
        if (updatedChar) self._renderPage(container, updatedChars, updatedChar, wid);
      });
    });

    // Char select
    document.getElementById('charSelect')?.addEventListener('change', async e => {
      self._currentCharId = e.target.value;
      self._editOverrides = {};
      const updatedChars = await DB.getAll('characters', wid);
      const newChar = updatedChars.find(c => c.id === self._currentCharId) || updatedChars[0];
      if (newChar) self._renderPage(container, updatedChars, newChar, wid);
    });

    // Copy
    const doCopy = () => Utils.copyText(statusText);
    document.getElementById('btnCopyStatus')?.addEventListener('click', doCopy);
    document.getElementById('btnCopyRaw')?.addEventListener('click', doCopy);

    // Community lock toggles
    document.getElementById('btnToggleCommunity')?.addEventListener('click', () => {
      self._communityLocked = !self._communityLocked;
      const locked = self._communityLocked;
      const btn = document.getElementById('btnToggleCommunity');
      const panel = document.getElementById('communityPanel');
      if (btn) { btn.textContent = locked ? '🔒' : '🔓'; btn.title = locked ? '잠금 해제' : '잠금'; }
      if (panel) {
        panel.style.borderColor = locked ? 'rgba(96,165,250,0.2)' : 'rgba(96,165,250,0.45)';
        const titleEl = panel.querySelector('span');
        if (titleEl) titleEl.textContent = locked ? '(잠금)' : '[커뮤니티]';
        let contentEl = panel.querySelector('#communityContent');
        if (locked && contentEl) { contentEl.remove(); }
        else if (!locked && !contentEl) {
          contentEl = document.createElement('div');
          contentEl.id = 'communityContent';
          contentEl.style.cssText = 'font-size:11px;margin-top:4px;';
          contentEl.innerHTML = '<span style="color:rgba(107,157,232,0.5);">새로운 글이 없습니다</span>';
          panel.appendChild(contentEl);
        }
      }
      self._refreshStatusText(displayChar, linkedAchievements, linkedConstellations, linkedItems);
    });

    document.getElementById('btnToggleGuild')?.addEventListener('click', () => {
      self._guildLocked = !self._guildLocked;
      const locked = self._guildLocked;
      const btn = document.getElementById('btnToggleGuild');
      const panel = document.getElementById('guildPanel');
      if (btn) { btn.textContent = locked ? '🔒' : '🔓'; btn.title = locked ? '잠금 해제' : '잠금'; }
      if (panel) {
        panel.style.borderColor = locked ? 'rgba(96,165,250,0.2)' : 'rgba(96,165,250,0.45)';
        const titleEl = panel.querySelector('span');
        if (titleEl) titleEl.textContent = locked ? '(잠금)' : '[길드 커뮤니티]';
        let contentEl = panel.querySelector('#guildContent');
        if (locked && contentEl) { contentEl.remove(); }
        else if (!locked && !contentEl) {
          contentEl = document.createElement('div');
          contentEl.id = 'guildContent';
          contentEl.style.cssText = 'font-size:11px;margin-top:4px;';
          contentEl.innerHTML = '<span style="color:rgba(107,157,232,0.5);">새로운 길드 공지가 없습니다</span>';
          panel.appendChild(contentEl);
        }
      }
      self._refreshStatusText(displayChar, linkedAchievements, linkedConstellations, linkedItems);
    });

    // Manual edit overlay
    document.getElementById('btnEditStats')?.addEventListener('click', () => {
      self._openEditOverlay(char, wid, chars, container, linkedAchievements, allAchievements, linkedItems, allItems);
    });
  },

  _refreshStatusText: function(char, linkedAchievements, linkedConstellations, linkedItems) {
    const text = this._buildStatusText(char, this._viewMode, linkedAchievements, linkedConstellations, linkedItems);
    const pre = document.getElementById('statusPre');
    const rawPre = document.getElementById('statusRawPre');
    if (pre) pre.textContent = text;
    if (rawPre) rawPre.textContent = text;
  },

  _openEditOverlay: function(char, wid, chars, container, linkedAchievements, allAchievements, linkedItems, allItems) {
    const self = this;
    const ov = this._editOverrides;
    linkedAchievements = linkedAchievements || [];
    allAchievements = allAchievements || [];
    allItems = allItems || [];

    const effectiveStats = ov.stats !== undefined ? ov.stats : (char.stats || {});
    const effectiveSkills = ov.skills !== undefined ? ov.skills : (char.skills || []);
    const effectiveAchIds = ov.achievementIds !== undefined ? ov.achievementIds : (char.achievementIds || []);
    const effectiveItemIds = ov.itemIds !== undefined ? ov.itemIds : (char.itemIds || []);

    const state = {
      skills: effectiveSkills.map(s => typeof s === 'string' ? { id: '', name: s, grade: '', hidden: false } : Object.assign({}, s)),
      achIds: [...effectiveAchIds],
      achs: effectiveAchIds.map(id => allAchievements.find(a => a.id === id)).filter(Boolean),
      statEntries: Object.entries(effectiveStats).map(([k, v]) => ({ k, v: String(v) })),
      itemIds: [...effectiveItemIds],
      items: effectiveItemIds.map(id => allItems.find(it => it.id === id)).filter(Boolean),
    };

    const chipStyle = 'display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:var(--color-surface3);border-radius:12px;font-size:12px;border:1px solid var(--color-border);';
    const dropItemStyle = 'padding:6px 10px;cursor:pointer;font-size:12px;';
    const dropStyle = 'display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface3);border:1px solid var(--color-border);border-radius:6px;max-height:140px;overflow-y:auto;z-index:200;';

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="font-size:12px;color:var(--color-text-muted);padding:8px;background:rgba(245,158,11,0.08);border-radius:6px;border-left:3px solid var(--color-warning);">
          미리보기 전용 편집입니다. 실제 캐릭터 데이터는 변경되지 않습니다.
        </div>

        <div style="font-size:11px;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.05em;padding-bottom:2px;border-bottom:1px solid var(--color-border);">기본 정보</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">레벨</label>
            <input class="input-field" id="ovLevel" type="number" value="${Utils.escHtml(String(ov.level !== undefined ? ov.level : (char.level || 0)))}" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">이름</label>
            <input class="input-field" id="ovName" value="${Utils.escHtml(ov.name !== undefined ? ov.name : (char.name || ''))}" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">나이</label>
            <input class="input-field" id="ovAge" value="${Utils.escHtml(String(ov.age !== undefined ? ov.age : (char.age || '')))}" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">성별</label>
            <input class="input-field" id="ovGender" value="${Utils.escHtml(ov.gender !== undefined ? ov.gender : (char.gender || ''))}" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>

        <div style="font-size:11px;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.05em;padding-bottom:2px;border-bottom:1px solid var(--color-border);">소속</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">국가</label>
            <input class="input-field" id="ovNation" value="${Utils.escHtml(ov.nation !== undefined ? ov.nation : (char.nation || ''))}" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">길드</label>
            <input class="input-field" id="ovGuild" value="${Utils.escHtml(ov.guild !== undefined ? ov.guild : (char.guild || ''))}" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">종족</label>
            <input class="input-field" id="ovRace" value="${Utils.escHtml(ov.race !== undefined ? ov.race : (char.race || ''))}" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>

        <div style="font-size:11px;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.05em;padding-bottom:2px;border-bottom:1px solid var(--color-border);">칭호</div>
        <div class="form-group">
          <label class="form-label">핵심칭호</label>
          <input class="input-field" id="ovTitle" value="${Utils.escHtml(ov.title !== undefined ? ov.title : (char.title || ''))}" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">보유칭호 (업적 DB 검색)</label>
          <div id="achChips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;min-height:24px;"></div>
          <div style="position:relative;">
            <input id="achSearch" class="input-field" placeholder="업적 이름 검색..." style="width:100%;box-sizing:border-box;" autocomplete="off" />
            <div id="achDropdown" style="${dropStyle}"></div>
          </div>
        </div>

        <div style="font-size:11px;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.05em;padding-bottom:2px;border-bottom:1px solid var(--color-border);">능력</div>
        <div class="form-group">
          <label class="form-label">스텟</label>
          <div id="statRowsWrap" style="display:flex;flex-direction:column;gap:4px;margin-bottom:6px;"></div>
          <button type="button" id="btnAddStatRow" class="btn btn-ghost btn-sm">+ 스텟 추가</button>
        </div>
        <div class="form-group">
          <label class="form-label">스킬 (스킬 DB 검색)</label>
          <div id="skillChips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;min-height:24px;"></div>
          <div style="position:relative;">
            <input id="skillSearch" class="input-field" placeholder="스킬 이름 검색..." style="width:100%;box-sizing:border-box;" autocomplete="off" />
            <div id="skillDropdown" style="${dropStyle}"></div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">보유 아이템 (아이템 DB 검색)</label>
          <div id="itemChips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;min-height:24px;"></div>
          <div style="position:relative;">
            <input id="itemSearch" class="input-field" placeholder="아이템 이름 검색..." style="width:100%;box-sizing:border-box;" autocomplete="off" />
            <div id="itemDropdown" style="${dropStyle}"></div>
          </div>
        </div>

        <button class="btn btn-ghost btn-sm" id="btnClearOverrides" style="color:var(--color-warning);align-self:flex-start;">수정 초기화 (원본 복원)</button>
      </div>`;

    Utils.openModal('상태창 수동 편집 (미리보기)', body, async () => {
      const statsObj = {};
      document.querySelectorAll('.ov-stat-row').forEach(row => {
        const k = row.querySelector('.ov-stat-key')?.value.trim();
        const v = row.querySelector('.ov-stat-val')?.value.trim();
        if (k) statsObj[k] = v;
      });
      self._editOverrides = {
        level:  document.getElementById('ovLevel')?.value.trim(),
        title:  document.getElementById('ovTitle')?.value.trim(),
        name:   document.getElementById('ovName')?.value.trim(),
        nation: document.getElementById('ovNation')?.value.trim(),
        guild:  document.getElementById('ovGuild')?.value.trim(),
        race:   document.getElementById('ovRace')?.value.trim(),
        age:    document.getElementById('ovAge')?.value.trim(),
        gender: document.getElementById('ovGender')?.value.trim(),
        stats:  statsObj,
        skills: state.skills,
        achievementIds: state.achIds,
        itemIds: state.itemIds,
      };
      const updatedChars = await DB.getAll('characters', wid);
      const updatedChar = updatedChars.find(c => c.id === self._currentCharId) || updatedChars[0];
      if (updatedChar) self._renderPage(container, updatedChars, updatedChar, wid);
      return true;
    }, '적용');

    setTimeout(async () => {
      // ── Stat rows ────────────────────────────────────────────────
      const statRowsWrap = document.getElementById('statRowsWrap');
      function renderStatRows() {
        if (!statRowsWrap) return;
        statRowsWrap.innerHTML = state.statEntries.map((e, i) => `
          <div class="ov-stat-row" style="display:flex;gap:4px;align-items:center;">
            <input class="input-field ov-stat-key" value="${Utils.escHtml(e.k)}" placeholder="스텟명" style="flex:1;box-sizing:border-box;" />
            <input class="input-field ov-stat-val" value="${Utils.escHtml(e.v)}" placeholder="값" style="width:80px;box-sizing:border-box;" />
            <button type="button" class="btn btn-ghost btn-sm btn-del-stat" data-idx="${i}" style="color:var(--color-danger);padding:2px 6px;flex-shrink:0;">×</button>
          </div>`).join('');
        statRowsWrap.querySelectorAll('.btn-del-stat').forEach(btn => {
          btn.addEventListener('click', () => {
            state.statEntries.splice(Number(btn.dataset.idx), 1);
            renderStatRows();
          });
        });
      }
      renderStatRows();
      document.getElementById('btnAddStatRow')?.addEventListener('click', () => {
        state.statEntries.push({ k: '', v: '' });
        renderStatRows();
      });

      // ── Achievement chips ─────────────────────────────────────────
      const achChipsEl = document.getElementById('achChips');
      const achSearchEl = document.getElementById('achSearch');
      const achDropdownEl = document.getElementById('achDropdown');

      function renderAchChips() {
        if (!achChipsEl) return;
        achChipsEl.innerHTML = state.achs.map(a =>
          `<span style="${chipStyle}">
            ${Utils.escHtml(a.name)}${a.grade ? `(${Utils.escHtml(a.grade)})` : ''}
            <button type="button" data-aid="${Utils.escHtml(a.id)}"
              style="background:none;border:none;cursor:pointer;color:var(--color-text-muted);padding:0;font-size:14px;line-height:1;">×</button>
          </span>`
        ).join('');
        achChipsEl.querySelectorAll('button[data-aid]').forEach(btn => {
          btn.addEventListener('click', () => {
            const aid = btn.dataset.aid;
            state.achIds = state.achIds.filter(id => id !== aid);
            state.achs = state.achs.filter(a => a.id !== aid);
            renderAchChips();
          });
        });
      }
      renderAchChips();

      if (achSearchEl) {
        achSearchEl.addEventListener('input', () => {
          const q = achSearchEl.value.trim();
          const filtered = allAchievements.filter(a =>
            !state.achIds.includes(a.id) &&
            Utils.matchesQuery((a.name || '') + ' ' + (a.description || ''), q)
          ).slice(0, 10);
          if (!achDropdownEl) return;
          if (!q) { achDropdownEl.style.display = 'none'; return; }
          achDropdownEl.innerHTML = filtered.length === 0
            ? `<div style="${dropItemStyle}color:var(--color-text-muted);">결과 없음</div>`
            : filtered.map(a =>
                `<div class="ach-drop-item" data-aid="${Utils.escHtml(a.id)}" data-aname="${Utils.escHtml(a.name)}" data-agrade="${Utils.escHtml(a.grade || '')}"
                  style="${dropItemStyle}">${Utils.escHtml(a.name)}${a.grade ? ` (${Utils.escHtml(a.grade)})` : ''}</div>`
              ).join('');
          achDropdownEl.style.display = 'block';
          achDropdownEl.querySelectorAll('.ach-drop-item').forEach(item => {
            item.addEventListener('mousedown', e => {
              e.preventDefault();
              state.achIds.push(item.dataset.aid);
              state.achs.push({ id: item.dataset.aid, name: item.dataset.aname, grade: item.dataset.agrade });
              renderAchChips();
              achSearchEl.value = '';
              achDropdownEl.style.display = 'none';
            });
          });
        });
        achSearchEl.addEventListener('blur', () => {
          setTimeout(() => { if (achDropdownEl) achDropdownEl.style.display = 'none'; }, 150);
        });
      }

      // ── Skill chips ───────────────────────────────────────────────
      const skillChipsEl = document.getElementById('skillChips');
      const skillSearchEl = document.getElementById('skillSearch');
      const skillDropdownEl = document.getElementById('skillDropdown');
      const allSkills = await DB.getAll('skills', wid);

      function renderSkillChips() {
        if (!skillChipsEl) return;
        skillChipsEl.innerHTML = state.skills.map((s, i) => {
          const hiddenMark = s.hidden ? ' 🔒' : '';
          return `<span style="${chipStyle}${s.hidden ? 'border-color:#fbbf2466;' : ''}">
            ${Utils.escHtml(s.name)}${s.grade ? `(${Utils.escHtml(s.grade)})` : ''}${hiddenMark}
            <button type="button" data-idx="${i}"
              style="background:none;border:none;cursor:pointer;color:var(--color-text-muted);padding:0;font-size:14px;line-height:1;">×</button>
          </span>`;
        }).join('');
        skillChipsEl.querySelectorAll('button[data-idx]').forEach(btn => {
          btn.addEventListener('click', () => {
            state.skills.splice(Number(btn.dataset.idx), 1);
            renderSkillChips();
          });
        });
      }
      renderSkillChips();

      if (skillSearchEl) {
        skillSearchEl.addEventListener('input', () => {
          const q = skillSearchEl.value.trim();
          const filtered = allSkills.filter(s =>
            !state.skills.find(sel => sel.id && sel.id === s.id) &&
            Utils.matchesQuery((s.name || '') + ' ' + (s.description || ''), q)
          ).slice(0, 10);
          if (!skillDropdownEl) return;
          if (!q) { skillDropdownEl.style.display = 'none'; return; }
          skillDropdownEl.innerHTML = filtered.length === 0
            ? `<div style="${dropItemStyle}color:var(--color-text-muted);">결과 없음</div>`
            : filtered.map(s =>
                `<div class="skill-drop-item" data-sid="${Utils.escHtml(s.id)}" data-sname="${Utils.escHtml(s.name)}"
                  data-sgrade="${Utils.escHtml(s.grade || '')}" data-shidden="${s.hidden ? '1' : '0'}"
                  style="${dropItemStyle}">${s.hidden ? '🔒 ' : ''}${Utils.escHtml(s.name)}${s.grade ? ` (${Utils.escHtml(s.grade)})` : ''}</div>`
              ).join('');
          skillDropdownEl.style.display = 'block';
          skillDropdownEl.querySelectorAll('.skill-drop-item').forEach(item => {
            item.addEventListener('mousedown', e => {
              e.preventDefault();
              state.skills.push({ id: item.dataset.sid, name: item.dataset.sname, grade: item.dataset.sgrade, hidden: item.dataset.shidden === '1' });
              renderSkillChips();
              skillSearchEl.value = '';
              skillDropdownEl.style.display = 'none';
            });
          });
        });
        skillSearchEl.addEventListener('blur', () => {
          setTimeout(() => { if (skillDropdownEl) skillDropdownEl.style.display = 'none'; }, 150);
        });
      }

      // ── Item chips ────────────────────────────────────────────────
      const itemChipsEl = document.getElementById('itemChips');
      const itemSearchEl = document.getElementById('itemSearch');
      const itemDropdownEl = document.getElementById('itemDropdown');

      function renderItemChips() {
        if (!itemChipsEl) return;
        itemChipsEl.innerHTML = state.items.map((it, i) =>
          `<span style="${chipStyle}border-color:#06b6d444;">
            💎 ${Utils.escHtml(it.name)}${it.grade ? `(${Utils.escHtml(it.grade)})` : ''}
            <button type="button" data-idx="${i}"
              style="background:none;border:none;cursor:pointer;color:var(--color-text-muted);padding:0;font-size:14px;line-height:1;">×</button>
          </span>`
        ).join('');
        itemChipsEl.querySelectorAll('button[data-idx]').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.idx);
            state.itemIds.splice(idx, 1);
            state.items.splice(idx, 1);
            renderItemChips();
          });
        });
      }
      renderItemChips();

      if (itemSearchEl) {
        itemSearchEl.addEventListener('input', () => {
          const q = itemSearchEl.value.trim();
          const filtered = allItems.filter(it =>
            !state.itemIds.includes(it.id) &&
            Utils.matchesQuery((it.name || '') + ' ' + (it.description || ''), q)
          ).slice(0, 10);
          if (!itemDropdownEl) return;
          if (!q) { itemDropdownEl.style.display = 'none'; return; }
          itemDropdownEl.innerHTML = filtered.length === 0
            ? `<div style="${dropItemStyle}color:var(--color-text-muted);">결과 없음</div>`
            : filtered.map(it =>
                `<div class="item-drop-item" data-iid="${Utils.escHtml(it.id)}" data-iname="${Utils.escHtml(it.name)}"
                  data-igrade="${Utils.escHtml(it.grade || '')}"
                  style="${dropItemStyle}">💎 ${Utils.escHtml(it.name)}${it.grade ? ` (${Utils.escHtml(it.grade)})` : ''}</div>`
              ).join('');
          itemDropdownEl.style.display = 'block';
          itemDropdownEl.querySelectorAll('.item-drop-item').forEach(item => {
            item.addEventListener('mousedown', e => {
              e.preventDefault();
              state.itemIds.push(item.dataset.iid);
              state.items.push({ id: item.dataset.iid, name: item.dataset.iname, grade: item.dataset.igrade });
              renderItemChips();
              itemSearchEl.value = '';
              itemDropdownEl.style.display = 'none';
            });
          });
        });
        itemSearchEl.addEventListener('blur', () => {
          setTimeout(() => { if (itemDropdownEl) itemDropdownEl.style.display = 'none'; }, 150);
        });
      }

      // Clear overrides
      document.getElementById('btnClearOverrides')?.addEventListener('click', async () => {
        self._editOverrides = {};
        Utils.closeModal();
        const updatedChars = await DB.getAll('characters', wid);
        const updatedChar = updatedChars.find(c => c.id === self._currentCharId) || updatedChars[0];
        if (updatedChar) self._renderPage(container, updatedChars, updatedChar, wid);
      });
    }, 50);
  },

  _buildStatusText: function(char, viewMode, linkedAchievements, linkedConstellations, linkedItems) {
    linkedAchievements = linkedAchievements || [];
    linkedConstellations = linkedConstellations || [];
    linkedItems = linkedItems || [];
    const isAuthor   = viewMode === 'author';
    const showHidden = viewMode !== 'hidden'; // author + revealed both show hidden skills

    const bar = 'ㅡ'.repeat(8);
    const lines = [bar];

    lines.push(`ㅣ레벨:${char.level !== undefined && char.level !== '' ? char.level : 0}`);
    lines.push(`ㅣ이름:${char.name || ''}`);
    if (char.age !== undefined && char.age !== '') lines.push(`ㅣ나이:${char.age}`);
    if (char.gender !== undefined && char.gender !== '') lines.push(`ㅣ성별:${char.gender}`);

    // 소속
    const hasAffil = char.nation || char.guild || char.race;
    if (hasAffil) {
      lines.push('ㅣ[소속]');
      if (char.nation) lines.push(`ㄴ국가:${char.nation}`);
      if (char.guild)  lines.push(`ㄴ길드:${char.guild}`);
      if (char.race)   lines.push(`ㄴ종족:${char.race}`);
    }

    // 핵심칭호
    if (char.title) {
      lines.push('ㅣ[핵심칭호]');
      lines.push(`ㄴ${char.title}`);
    }

    // 보유칭호
    const achievementList = linkedAchievements.length > 0 ? linkedAchievements : (char.achievements || []);
    lines.push('ㅣ[보유칭호]');
    if (achievementList.length === 0) {
      lines.push('ㄴ(없음)');
    } else {
      achievementList.forEach(a => {
        const name  = typeof a === 'string' ? a : (a.name || '');
        const grade = typeof a === 'object' && a.grade ? `(${a.grade})` : '';
        lines.push(`ㄴ${name}${grade}`);
      });
    }

    // 스텟
    const stats = char.stats || {};
    const baseStats = ['힘', '민첩', '체력'];
    const allStatKeys = [...new Set([...baseStats, ...Object.keys(stats)])];
    const filteredStatKeys = allStatKeys.filter(k => stats[k] !== undefined && stats[k] !== '' && stats[k] !== null);
    lines.push('ㅣ[스텟]');
    if (filteredStatKeys.length === 0) {
      lines.push('ㄴ(없음)');
    } else {
      filteredStatKeys.forEach(k => lines.push(`ㄴ${k}:${stats[k]}`));
    }

    // 스킬
    const skills = char.skills || [];
    let visibleSkills;
    if (isAuthor) {
      visibleSkills = skills;
    } else if (showHidden) {
      // revealed: show all skills but not authorOnly
      visibleSkills = skills.filter(s => !s.authorOnly);
    } else {
      // hidden: don't show hidden or authorOnly
      visibleSkills = skills.filter(s => !s.hidden && !s.authorOnly);
    }

    lines.push('ㅣ[스킬]');
    if (visibleSkills.length === 0) {
      lines.push('ㄴ(없음)');
    } else {
      visibleSkills.forEach(s => {
        const name  = typeof s === 'string' ? s : (s.name || '');
        const grade = typeof s === 'object' && s.grade ? `(${s.grade})` : '';
        const hiddenMark = isAuthor && s.hidden ? ' 🔒' : '';
        lines.push(`ㄴ${name}${grade}${hiddenMark}`);
      });
    }

    // 아이템 (작가용 only)
    if (isAuthor && linkedItems.length > 0) {
      lines.push('ㅣ[보유 아이템]');
      linkedItems.forEach(it => {
        const grade = it.grade ? `(${it.grade})` : '';
        lines.push(`ㄴ${it.name || ''}${grade}`);
      });
    }

    // 성좌 계약
    if (linkedConstellations.length > 0 && AppFlags.get('showConstellationsInStatus', true)) {
      lines.push('ㅣ[성좌 계약]');
      linkedConstellations.forEach(c => {
        const isContractor = (c.contractors || []).includes(char.id);
        const isProvisional = (c.provisionalContractors || []).includes(char.id);
        const status = isContractor ? '계약' : isProvisional ? '가계약' : '연관';
        const tier   = c.tier ? `[${c.tier}]` : '';
        lines.push(`ㄴ${c.name || ''}${tier} (${status})`);
      });
    }

    lines.push(bar);

    // 하단 패널
    lines.push('[알림 기록실]');
    lines.push(this._communityLocked ? '[커뮤니티] [>[잠금]<]' : '[커뮤니티] 🔓');
    lines.push(this._guildLocked ? '[길드 커뮤니티] [>[잠금]<]' : '[길드 커뮤니티] 🔓');

    // 작가 메모 (작가용 only)
    if (isAuthor) {
      const notes = char.authorNotes || char.notes || '';
      if (notes) {
        lines.push('');
        lines.push('[작가 메모]');
        lines.push(notes);
      }
    }

    return lines.join('\n');
  },

  destroy: function() {
    this._container = null;
    this._currentCharId = null;
    this._editOverrides = {};
    this._communityLocked = true;
    this._guildLocked = true;
  }
};
