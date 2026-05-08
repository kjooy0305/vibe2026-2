'use strict';
window.Pages = window.Pages || {};
window.Pages.novelView = {
  _container: null,
  _saveTimer: null,
  _autoSaveTimer: null,
  _wid: null,
  _questionsExpanded: false,

  THEMATIC_QUESTIONS: [
    '회귀자의 먼치킨 능력이 어떤 고통을 가지고 행동한것인지 모르는 사람이 많음. 그래서 그 과정을 써보고 싶음.',
    '탄생과 죽음을 더 생각해보게 함.',
    '과연 선이 선할까?',
    '죽음에 의해 닳고 닳은 사람은 어떻게 될까?',
    '기나긴 삶은 아주 정신이 튼튼한 사람조차 미치게 만들 수 있을까?',
    '빛과 어둠. 과연 뭐가 먼저일까? / 빛이 있기에 어둠이 정의되었다. / 어둠 사이에서 빛이 생기며 어둠과 빛이 생겨났다.',
    '과연 가장 큰 재능은 노력일까?',
    '인과에는 앞뒤가 없다. 그것은 이미 일어난 선택이다.',
    '끝을 모르는 자는 없다. 그것을 무시할 뿐이다.',
    '잘못된 희생은 피해를 야기한다.',
  ],

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
    const draft = await DB.getSetting('novelDraft_' + wid, '');
    const chars = await DB.getAll('characters', wid);

    this._renderPage(container, draft, chars, wid);
  },

  _renderPage: function(container, draft, chars, wid) {
    const self = this;
    const charCount = this._countChars(draft);
    const lineCount = draft ? draft.split('\n').length : 0;
    const expanded = this._questionsExpanded;

    container.innerHTML = `
    <div class="page active" style="display:flex;flex-direction:column;">
      <div class="page-header" style="flex-shrink:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <h2 class="page-title">소설 작성</h2>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" id="btnInsertStatus" style="font-size:11px;">상태창 삽입</button>
            <button class="btn btn-ghost btn-sm" id="btnCopyDraft" style="font-size:11px;">전체 복사</button>
            <button class="btn btn-ghost btn-sm" id="btnExportNovel" style="font-size:11px;">TXT 내보내기</button>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:6px;font-size:12px;flex-wrap:wrap;">
          <span id="charCountDisplay" style="color:var(--color-text-muted);">${charCount.toLocaleString()}자</span>
          <span style="color:var(--color-text-dim);">|</span>
          <span style="color:var(--color-text-dim);">${lineCount.toLocaleString()}줄</span>
          <span id="saveStatusDisplay" style="color:var(--color-text-dim);font-size:11px;">저장됨</span>
        </div>
      </div>

      <!-- Toolbar -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;padding:0 16px 8px;flex-shrink:0;">
        <button class="btn btn-primary btn-sm" id="btnSaveNow" style="font-size:12px;">저장</button>
        <button class="btn btn-ghost btn-sm" id="btnClearDraft" style="font-size:12px;color:var(--color-danger);">초기화</button>
      </div>

      <!-- Writing area — fills available space, keyboard-safe -->
      <div style="flex:1;min-height:0;padding:0 16px 8px;display:flex;flex-direction:column;">
        <textarea id="novelTextarea"
          style="flex:1;min-height:320px;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:12px;padding:16px;font-size:14px;line-height:1.9;color:var(--color-text);resize:none;font-family:'Noto Serif KR',Georgia,'Malgun Gothic',serif;box-sizing:border-box;outline:none;"
          placeholder="여기에 소설을 작성하세요...&#10;&#10;상태창 삽입 버튼으로 캐릭터 상태창을 불러올 수 있습니다.&#10;30초마다 자동 저장됩니다."
        >${Utils.escHtml(draft)}</textarea>
      </div>

      <!-- Thematic questions panel (expandable) -->
      <div style="padding:0 16px 16px;flex-shrink:0;">
        <div style="background:var(--color-surface2);border-radius:12px;border:1px solid var(--color-border);overflow:hidden;">
          <button id="btnToggleQuestions"
            style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:none;border:none;cursor:pointer;color:var(--color-text);font-size:13px;font-weight:700;text-align:left;">
            <span style="color:var(--color-primary);">주제 질문들 (창작 참고)</span>
            <span id="questionsChevron" style="font-size:11px;color:var(--color-text-dim);transition:transform 0.2s;">${expanded ? '▲' : '▼'}</span>
          </button>
          <div id="questionsPanel" style="display:${expanded ? 'block' : 'none'};border-top:1px solid var(--color-border);padding:12px 16px 16px;">
            <ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:10px;">
              ${self.THEMATIC_QUESTIONS.map((q, i) => `
                <li style="font-size:13px;line-height:1.65;color:var(--color-text-muted);">
                  <span style="color:var(--color-text);">${Utils.escHtml(q)}</span>
                </li>`).join('')}
            </ol>
          </div>
        </div>
      </div>
    </div>`;

    const textarea = document.getElementById('novelTextarea');
    const charCountEl = document.getElementById('charCountDisplay');
    const saveStatusEl = document.getElementById('saveStatusDisplay');

    // Prevent keyboard from covering textarea on mobile
    if ('visualViewport' in window) {
      const vvHandler = () => {
        const vv = window.visualViewport;
        if (textarea && document.activeElement === textarea) {
          const offset = window.innerHeight - vv.height;
          textarea.style.marginBottom = offset > 0 ? offset + 'px' : '0';
        } else {
          if (textarea) textarea.style.marginBottom = '0';
        }
      };
      window.visualViewport.addEventListener('resize', vvHandler);
      window.visualViewport.addEventListener('scroll', vvHandler);
      // Store cleanup reference
      self._vvHandler = vvHandler;
    }

    const updateCount = (text) => {
      const cc = self._countChars(text);
      const lc = text ? text.split('\n').length : 0;
      if (charCountEl) charCountEl.textContent = cc.toLocaleString() + '자';
    };

    const markDirty = () => {
      if (saveStatusEl) { saveStatusEl.textContent = '편집 중...'; saveStatusEl.style.color = 'var(--color-warning)'; }
    };
    const markSaved = (msg) => {
      if (saveStatusEl) { saveStatusEl.textContent = msg || '저장됨'; saveStatusEl.style.color = 'var(--color-text-dim)'; }
    };

    // Auto-save every 30 seconds
    self._autoSaveTimer = setInterval(async () => {
      if (!textarea) return;
      const text = textarea.value;
      await DB.setSetting('novelDraft_' + wid, text);
      markSaved('자동 저장됨 (' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) + ')');
    }, 30000);

    // Live count + debounced save indicator on input
    textarea?.addEventListener('input', () => {
      const text = textarea.value;
      updateCount(text);
      markDirty();

      clearTimeout(self._saveTimer);
      self._saveTimer = setTimeout(async () => {
        await DB.setSetting('novelDraft_' + wid, text);
        await AppStore.updateStreak();
        markSaved('저장됨');
      }, 1500);
    });

    // Manual save
    document.getElementById('btnSaveNow')?.addEventListener('click', async () => {
      clearTimeout(self._saveTimer);
      const text = textarea?.value || '';
      await DB.setSetting('novelDraft_' + wid, text);
      await AppStore.updateStreak();
      markSaved('저장됨');
      Utils.toast('저장됨', 'success');
    });

    // Clear draft
    document.getElementById('btnClearDraft')?.addEventListener('click', () => {
      Utils.confirm('초기화', '작성 중인 내용을 모두 지우시겠습니까?', async () => {
        clearTimeout(self._saveTimer);
        await DB.setSetting('novelDraft_' + wid, '');
        if (textarea) { textarea.value = ''; textarea.dispatchEvent(new Event('input')); }
        Utils.toast('초기화됨', 'info');
      });
    });

    // Copy all draft text
    document.getElementById('btnCopyDraft')?.addEventListener('click', () => {
      const text = textarea?.value || '';
      if (!text.trim()) { Utils.toast('내용이 없습니다', 'error'); return; }
      Utils.copyText(text);
    });

    // Insert status window at cursor
    document.getElementById('btnInsertStatus')?.addEventListener('click', () => {
      if (chars.length === 0) { Utils.toast('캐릭터가 없습니다', 'error'); return; }
      const body = `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div class="form-group">
            <label class="form-label">캐릭터 선택</label>
            <select class="select-input" id="insertCharSelect" style="width:100%;">
              ${chars.map(c => `<option value="${Utils.escHtml(c.id)}">${Utils.escHtml(c.name)}${c.level !== undefined && c.level !== '' ? ' (Lv.' + c.level + ')' : ''}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">뷰 모드</label>
            <select class="select-input" id="insertViewMode" style="width:100%;">
              <option value="novel">소설 뷰 (독자 시점 — 작가 전용 항목 숨김)</option>
              <option value="author">작가 뷰 (모든 항목 표시)</option>
            </select>
          </div>
        </div>`;

      Utils.openModal('상태창 삽입', body, () => {
        const charId = document.getElementById('insertCharSelect')?.value;
        const viewMode = document.getElementById('insertViewMode')?.value;
        const char = chars.find(c => c.id === charId);
        if (!char) return false;

        const novelView = viewMode === 'novel';
        const statusText = self._buildStatusText(char, novelView);
        if (!textarea) return false;

        const cursorPos = textarea.selectionStart;
        const before = textarea.value.substring(0, cursorPos);
        const after = textarea.value.substring(cursorPos);
        const insert = (before.length > 0 && !before.endsWith('\n') ? '\n' : '') + statusText + '\n';
        textarea.value = before + insert + after;
        textarea.selectionStart = textarea.selectionEnd = cursorPos + insert.length;
        textarea.dispatchEvent(new Event('input'));
        textarea.focus();
        Utils.toast('상태창 삽입됨', 'success');
        return true;
      }, '삽입');
    });

    // Export as .txt download
    document.getElementById('btnExportNovel')?.addEventListener('click', () => {
      const text = textarea?.value || '';
      if (!text.trim()) { Utils.toast('내용이 없습니다', 'error'); return; }
      const world = AppStore.getState().currentWorld;
      const d = new Date();
      const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const filename = `novel_${(world?.name || 'draft').replace(/[^\w가-힣]/g, '_')}_${dateStr}.txt`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Utils.toast('TXT 파일 내보내기 완료', 'success');
    });

    // Expandable questions panel
    document.getElementById('btnToggleQuestions')?.addEventListener('click', () => {
      self._questionsExpanded = !self._questionsExpanded;
      const panel = document.getElementById('questionsPanel');
      const chevron = document.getElementById('questionsChevron');
      if (panel) panel.style.display = self._questionsExpanded ? 'block' : 'none';
      if (chevron) chevron.textContent = self._questionsExpanded ? '▲' : '▼';
    });
  },

  // Korean: count non-whitespace characters
  _countChars: function(text) {
    if (!text) return 0;
    return text.replace(/\s/g, '').length;
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

    const achievements = char.achievements || [];
    if (achievements.length > 0) {
      lines.push('ㅣ[업적]');
      achievements.forEach(a => {
        const name = typeof a === 'string' ? a : (a.name || '');
        const grade = typeof a === 'object' && a.grade ? `(${a.grade})` : '';
        lines.push(`ㄴ${name}${grade}`);
      });
    }

    const stats = char.stats || {};
    const statKeys = Object.keys(stats).filter(k => stats[k] !== '' && stats[k] !== undefined && stats[k] !== null);
    if (statKeys.length > 0) {
      lines.push('ㅣ[스텟]');
      statKeys.forEach(k => lines.push(`ㄴ${k}:${stats[k]}`));
    }

    const skills = char.skills || [];
    const visibleSkills = novelView ? skills.filter(s => !s.hidden && !s.authorOnly) : skills;
    if (visibleSkills.length > 0) {
      lines.push('ㅣ[스킬]');
      visibleSkills.forEach(s => {
        const name = typeof s === 'string' ? s : (s.name || '');
        const grade = typeof s === 'object' && s.grade ? `(${s.grade})` : '';
        lines.push(`ㄴ${name}${grade}`);
      });
    }

    if (!novelView && char.authorNotes) {
      lines.push('ㅣ[작가 메모]');
      char.authorNotes.split('\n').forEach(l => lines.push(`ㄴ${l}`));
    }

    lines.push(bar);
    return lines.join('\n');
  },

  destroy: function() {
    clearTimeout(this._saveTimer);
    clearInterval(this._autoSaveTimer);
    this._saveTimer = null;
    this._autoSaveTimer = null;
    this._container = null;
    this._wid = null;
    // Clean up visual viewport listener
    if (this._vvHandler && 'visualViewport' in window) {
      window.visualViewport.removeEventListener('resize', this._vvHandler);
      window.visualViewport.removeEventListener('scroll', this._vvHandler);
      this._vvHandler = null;
    }
  }
};
