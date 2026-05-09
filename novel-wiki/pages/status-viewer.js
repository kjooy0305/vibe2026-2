'use strict';
window.Pages = window.Pages || {};
window.Pages.statusViewer = {
  _container: null,
  _currentCharId: null,
  _novelView: false,
  // Editable override values for preview (key -> value)
  _editOverrides: {},

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
    // Merge editable overrides into a copy of char for preview
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
    if (ov.statsRaw !== undefined) {
      // parse "힘:9\n민첩:9" format
      const stats = {};
      ov.statsRaw.split('\n').forEach(line => {
        const m = line.match(/^(.+):(.+)$/);
        if (m) stats[m[1].trim()] = m[2].trim();
      });
      merged.stats = stats;
    }
    if (ov.skillsRaw !== undefined) {
      // parse "기록(F)\n???" format
      merged.skills = ov.skillsRaw.split('\n').filter(Boolean).map(line => {
        const m = line.match(/^(.+)\((.+)\)$/);
        return m ? { name: m[1].trim(), grade: m[2].trim() } : { name: line.trim() };
      });
    }
    if (ov.achievementsRaw !== undefined) {
      merged.achievements = ov.achievementsRaw.split('\n').filter(Boolean).map(line => {
        const m = line.match(/^(.+)\((.+)\)$/);
        return m ? { name: m[1].trim(), grade: m[2].trim() } : { name: line.trim() };
      });
    }
    return merged;
  },

  _renderPage: function(container, chars, char, wid) {
    const self = this;
    const novelView = this._novelView;
    const displayChar = this._applyOverrides(char);
    const statusText = this._buildStatusText(displayChar, novelView);

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <h2 class="page-title">상태창 뷰어</h2>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" id="btnEditStats" style="font-size:11px;">수동 편집</button>
            <button class="btn btn-ghost btn-sm" id="btnToggleView" style="font-size:11px;">
              ${novelView ? '작가 뷰로' : '소설 뷰로'}
            </button>
            <button class="btn btn-primary btn-sm" id="btnCopyStatus" style="font-size:11px;">텍스트 복사</button>
          </div>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          캐릭터를 선택하고 소설 스타일 상태창을 미리보기합니다
        </p>
      </div>

      <!-- Character selector -->
      <div style="margin-bottom:12px;">
        <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">캐릭터 선택</label>
        <select id="charSelect" class="select-input" style="width:100%;">
          ${chars.map(c => `<option value="${Utils.escHtml(c.id)}" ${c.id === char.id ? 'selected' : ''}>${Utils.escHtml(c.name)}${c.level !== undefined && c.level !== '' ? ' (Lv.' + c.level + ')' : ''}</option>`).join('')}
        </select>
      </div>

      <!-- View mode toggle -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        <span style="font-size:11px;padding:3px 10px;border-radius:4px;
          ${novelView
            ? 'background:#10b98122;color:#10b981;border:1px solid #10b98144;'
            : 'background:#f59e0b22;color:#f59e0b;border:1px solid #f59e0b44;'}">
          ${novelView ? '📖 소설 뷰 — 작가 전용 항목 숨김' : '작가 뷰 — 모든 항목 표시'}
        </span>
        ${Object.keys(this._editOverrides).length > 0
          ? '<span style="font-size:11px;padding:3px 8px;border-radius:4px;background:#8b5cf622;color:#8b5cf6;border:1px solid #8b5cf644;">수동 편집 중</span>'
          : ''}
      </div>

      <!-- Status window — dark blue glow panel -->
      <div style="
        background:rgba(8,20,48,0.92);
        border:1px solid rgba(96,165,250,0.45);
        border-radius:12px;
        padding:20px 22px;
        font-family:'Courier New',Consolas,monospace;
        backdrop-filter:blur(10px);
        box-shadow:
          0 0 32px rgba(59,130,246,0.18),
          0 0 8px rgba(59,130,246,0.10),
          inset 0 0 16px rgba(59,130,246,0.04);
        margin-bottom:14px;
        overflow-x:auto;
      ">
        <pre id="statusPre" style="margin:0;white-space:pre;font-size:13px;line-height:1.85;color:#c8daff;font-family:inherit;letter-spacing:0.02em;">${Utils.escHtml(statusText)}</pre>
      </div>

      <!-- Bottom UI elements (novel flavour) — community panels with lock toggle -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
        <div style="flex:1;min-width:130px;background:rgba(8,20,48,0.7);border:1px solid rgba(96,165,250,0.2);border-radius:8px;padding:10px 12px;cursor:default;">
          <div style="font-size:12px;color:#6b9de8;">[알림 기록실]</div>
          <div style="font-size:11px;color:rgba(107,157,232,0.5);margin-top:4px;">새로운 알림이 없습니다</div>
        </div>
        <button class="sv-community-panel" data-locked="true" style="flex:1;min-width:130px;background:rgba(8,20,48,0.7);border:1px solid rgba(96,165,250,0.2);border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;text-align:left;">
          <span style="font-size:12px;color:#6b9de8;">[커뮤니티]</span>
          <span class="lock-icon" style="font-size:12px;color:#6b9de8;opacity:0.7;">🔒</span>
        </button>
        <button class="sv-community-panel" data-locked="true" style="flex:1;min-width:130px;background:rgba(8,20,48,0.7);border:1px solid rgba(96,165,250,0.2);border-radius:8px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;text-align:left;">
          <span style="font-size:12px;color:#6b9de8;">[길드 커뮤니티]</span>
          <span class="lock-icon" style="font-size:12px;color:#6b9de8;opacity:0.7;">🔒</span>
        </button>
      </div>

      <!-- Raw text area for quick copy -->
      <div style="background:var(--color-surface2);border-radius:8px;padding:12px 14px;margin-bottom:16px;border:1px solid var(--color-border);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:12px;font-weight:600;color:var(--color-text-muted);">텍스트 출력</div>
          <button class="btn btn-ghost btn-sm" id="btnCopyRaw" style="font-size:11px;">복사</button>
        </div>
        <pre style="margin:0;white-space:pre-wrap;font-size:11px;line-height:1.6;color:var(--color-text-dim);max-height:180px;overflow-y:auto;word-break:break-all;">${Utils.escHtml(statusText)}</pre>
      </div>
    </div>`;

    // Character select handler
    document.getElementById('charSelect')?.addEventListener('change', async e => {
      self._currentCharId = e.target.value;
      self._editOverrides = {};
      const updatedChars = await DB.getAll('characters', wid);
      const newChar = updatedChars.find(c => c.id === self._currentCharId) || updatedChars[0];
      if (newChar) self._renderPage(container, updatedChars, newChar, wid);
    });

    // Toggle author/novel view
    document.getElementById('btnToggleView')?.addEventListener('click', async () => {
      self._novelView = !self._novelView;
      const updatedChars = await DB.getAll('characters', wid);
      const updatedChar = updatedChars.find(c => c.id === self._currentCharId) || updatedChars[0];
      if (updatedChar) self._renderPage(container, updatedChars, updatedChar, wid);
    });

    // Copy handlers
    const doCopy = () => Utils.copyText(statusText);
    document.getElementById('btnCopyStatus')?.addEventListener('click', doCopy);
    document.getElementById('btnCopyRaw')?.addEventListener('click', doCopy);

    // Community lock/unlock toggle
    container.querySelectorAll('.sv-community-panel').forEach(btn => {
      btn.addEventListener('click', () => {
        const isLocked = btn.dataset.locked === 'true';
        btn.dataset.locked = isLocked ? 'false' : 'true';
        const lockIcon = btn.querySelector('.lock-icon');
        if (lockIcon) lockIcon.textContent = isLocked ? '🔓' : '🔒';
        btn.style.borderColor = isLocked ? 'rgba(16,185,129,0.4)' : 'rgba(96,165,250,0.2)';
      });
    });

    // Manual edit overlay
    document.getElementById('btnEditStats')?.addEventListener('click', () => {
      self._openEditOverlay(char, wid, chars, container);
    });
  },

  _openEditOverlay: function(char, wid, chars, container) {
    const self = this;
    const ov = this._editOverrides;

    // Build current stats text
    const statsObj = ov.statsRaw !== undefined
      ? ov.statsRaw
      : Object.entries(char.stats || {}).map(([k, v]) => `${k}:${v}`).join('\n');

    // Build current skills text
    const skillsStr = ov.skillsRaw !== undefined
      ? ov.skillsRaw
      : (char.skills || []).map(s => typeof s === 'string' ? s : (s.grade ? `${s.name}(${s.grade})` : s.name)).join('\n');

    // Build current achievements text
    const achStr = ov.achievementsRaw !== undefined
      ? ov.achievementsRaw
      : (char.achievements || []).map(a => typeof a === 'string' ? a : (a.grade ? `${a.name}(${a.grade})` : a.name)).join('\n');

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="font-size:12px;color:var(--color-text-muted);padding:8px;background:rgba(245,158,11,0.08);border-radius:6px;border-left:3px solid var(--color-warning);">
          여기서 수정한 내용은 미리보기 전용입니다. 실제 캐릭터 데이터는 변경되지 않습니다.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">레벨</label>
            <input class="input-field" id="ovLevel" type="number" value="${Utils.escHtml(String(ov.level !== undefined ? ov.level : (char.level || 0)))}" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">칭호</label>
            <input class="input-field" id="ovTitle" value="${Utils.escHtml(ov.title !== undefined ? ov.title : (char.title || ''))}" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">이름</label>
            <input class="input-field" id="ovName" value="${Utils.escHtml(ov.name !== undefined ? ov.name : (char.name || ''))}" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">국가</label>
            <input class="input-field" id="ovNation" value="${Utils.escHtml(ov.nation !== undefined ? ov.nation : (char.nation || ''))}" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">길드</label>
            <input class="input-field" id="ovGuild" value="${Utils.escHtml(ov.guild !== undefined ? ov.guild : (char.guild || ''))}" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">종족</label>
            <input class="input-field" id="ovRace" value="${Utils.escHtml(ov.race !== undefined ? ov.race : (char.race || ''))}" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">나이</label>
            <input class="input-field" id="ovAge" value="${Utils.escHtml(String(ov.age !== undefined ? ov.age : (char.age || '')))} " style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">성별</label>
          <input class="input-field" id="ovGender" value="${Utils.escHtml(ov.gender !== undefined ? ov.gender : (char.gender || ''))}" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">업적목록 (한 줄에 하나, 형식: 이름(등급) 또는 이름)</label>
          <textarea class="textarea-field" id="ovAchievements" rows="3" style="width:100%;box-sizing:border-box;font-family:monospace;">${Utils.escHtml(achStr)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">스텟목록 (한 줄에 하나, 형식: 스텟이름:값)</label>
          <textarea class="textarea-field" id="ovStats" rows="4" style="width:100%;box-sizing:border-box;font-family:monospace;" placeholder="힘:9&#10;민첩:9&#10;체력:8">${Utils.escHtml(statsObj)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">스킬목록 (한 줄에 하나, 형식: 스킬명(등급) 또는 스킬명)</label>
          <textarea class="textarea-field" id="ovSkills" rows="4" style="width:100%;box-sizing:border-box;font-family:monospace;" placeholder="기록(F)&#10;???">${Utils.escHtml(skillsStr)}</textarea>
        </div>
        <button class="btn btn-ghost btn-sm" id="btnClearOverrides" style="color:var(--color-warning);align-self:flex-start;">수정 초기화 (원본 복원)</button>
      </div>`;

    Utils.openModal('상태창 수동 편집 (미리보기용)', body, async () => {
      self._editOverrides = {
        level: document.getElementById('ovLevel')?.value.trim(),
        title: document.getElementById('ovTitle')?.value.trim(),
        name: document.getElementById('ovName')?.value.trim(),
        nation: document.getElementById('ovNation')?.value.trim(),
        guild: document.getElementById('ovGuild')?.value.trim(),
        race: document.getElementById('ovRace')?.value.trim(),
        age: document.getElementById('ovAge')?.value.trim(),
        gender: document.getElementById('ovGender')?.value.trim(),
        statsRaw: document.getElementById('ovStats')?.value.trim(),
        skillsRaw: document.getElementById('ovSkills')?.value.trim(),
        achievementsRaw: document.getElementById('ovAchievements')?.value.trim(),
      };
      const updatedChars = await DB.getAll('characters', wid);
      const updatedChar = updatedChars.find(c => c.id === self._currentCharId) || updatedChars[0];
      if (updatedChar) self._renderPage(container, updatedChars, updatedChar, wid);
      return true;
    }, '적용');

    // Clear overrides button (inside modal body)
    setTimeout(() => {
      document.getElementById('btnClearOverrides')?.addEventListener('click', async () => {
        self._editOverrides = {};
        Utils.closeModal();
        const updatedChars = await DB.getAll('characters', wid);
        const updatedChar = updatedChars.find(c => c.id === self._currentCharId) || updatedChars[0];
        if (updatedChar) self._renderPage(container, updatedChars, updatedChar, wid);
      });
    }, 50);
  },

  _buildStatusText: function(char, novelView) {
    const bar = 'ㅡ'.repeat(8);
    const lines = [bar];

    lines.push(`ㅣ레벨:${char.level !== undefined && char.level !== '' ? char.level : 0}`);
    if (char.title !== undefined) lines.push(`ㅣ칭호:${char.title || ''}`);
    lines.push(`ㅣ이름:${char.name || ''}`);
    if (char.nation !== undefined && char.nation !== '') lines.push(`ㅣ국가:${char.nation}`);
    if (char.guild !== undefined) lines.push(`ㅣ길드:${char.guild || ''}`);
    if (char.race !== undefined && char.race !== '') lines.push(`ㅣ종족:${char.race}`);
    if (char.age !== undefined && char.age !== '') lines.push(`ㅣ나이:${char.age}`);
    if (char.gender !== undefined && char.gender !== '') lines.push(`ㅣ성별:${char.gender}`);

    // Achievements
    const achievements = char.achievements || [];
    lines.push('ㅣ[업적]');
    if (achievements.length === 0) {
      lines.push('ㄴ(없음)');
    } else {
      achievements.forEach(a => {
        const name = typeof a === 'string' ? a : (a.name || '');
        const grade = typeof a === 'object' && a.grade ? `(${a.grade})` : '';
        lines.push(`ㄴ${name}${grade}`);
      });
    }

    // Stats
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

    // Skills
    const skills = char.skills || [];
    const visibleSkills = novelView
      ? skills.filter(s => !s.hidden && !s.authorOnly)
      : skills;

    lines.push('ㅣ[스킬]');
    if (visibleSkills.length === 0) {
      lines.push('ㄴ(없음)');
    } else {
      visibleSkills.forEach(s => {
        const name = typeof s === 'string' ? s : (s.name || '');
        const grade = typeof s === 'object' && s.grade ? `(${s.grade})` : '';
        lines.push(`ㄴ${name}${grade}`);
      });
    }

    lines.push(bar);

    // Bottom menu buttons
    lines.push('[알림 기록실]');
    lines.push('[커뮤니티] 🔒');
    lines.push('[길드 커뮤니티] 🔒');

    return lines.join('\n');
  },

  destroy: function() {
    this._container = null;
    this._currentCharId = null;
    this._editOverrides = {};
  }
};
