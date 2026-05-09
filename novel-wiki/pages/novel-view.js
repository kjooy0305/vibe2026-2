'use strict';
window.Pages = window.Pages || {};
window.Pages.novelView = {
  _container: null,
  _saveTimer: null,
  _autoSaveTimer: null,
  _wid: null,
  _questionsExpanded: false,
  _fontSize: 13,

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
    const [draft, chars, skills, towers, gates, savedFontSize, customQuestions] = await Promise.all([
      DB.getSetting('novelDraft_' + wid, ''),
      DB.getAll('characters', wid),
      DB.getAll('skills', wid),
      DB.getAll('tower', wid),
      DB.getAll('gates', wid),
      DB.getSetting('novelFontSize', 13),
      DB.getSetting('novelQuestions', null),
    ]);
    this._fontSize = savedFontSize || 13;
    const questions = (customQuestions && customQuestions.length > 0) ? customQuestions : this.THEMATIC_QUESTIONS;

    this._renderPage(container, draft, chars, skills, towers, gates, wid, questions);
  },

  _renderPage: function(container, draft, chars, skills, towers, gates, wid, questions) {
    const self = this;
    const charCount = this._countChars(draft);
    const lineCount = draft ? draft.split('\n').length : 0;
    const expanded = this._questionsExpanded;
    const fs = this._fontSize;

    container.innerHTML = `
    <div class="page active">
      <!-- Header -->
      <div class="page-header" style="flex-shrink:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <h2 class="page-title">소설 작성</h2>
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" id="btnInsert" style="font-size:11px;">삽입 ▼</button>
            <button class="btn btn-ghost btn-sm" id="btnCopyDraft" style="font-size:11px;">전체복사</button>
            <button class="btn btn-ghost btn-sm" id="btnExportNovel" style="font-size:11px;">TXT</button>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:6px;font-size:12px;flex-wrap:wrap;">
          <span id="charCountDisplay" style="color:var(--color-text-muted);">${charCount.toLocaleString()}자</span>
          <span style="color:var(--color-text-dim);">|</span>
          <span style="color:var(--color-text-dim);">${lineCount.toLocaleString()}줄</span>
          <span id="saveStatusDisplay" style="color:var(--color-text-dim);font-size:11px;">저장됨</span>
        </div>
      </div>

      <!-- Toolbar -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;padding:0 16px 8px;flex-shrink:0;align-items:center;">
        <button class="btn btn-primary btn-sm" id="btnSaveNow">저장</button>
        <button class="btn btn-ghost btn-sm" id="btnClearDraft" style="color:var(--color-danger);">비우기</button>
        <div style="display:flex;align-items:center;gap:4px;margin-left:auto;background:var(--color-surface2);border-radius:8px;padding:4px 10px;border:1px solid var(--color-border);">
          <span style="font-size:10px;color:var(--color-text-dim);user-select:none;">글씨크기</span>
          <button id="btnFontSmaller"
            style="width:28px;height:28px;border-radius:5px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);cursor:pointer;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;">A-</button>
          <span id="fontSizeDisplay"
            style="font-size:11px;color:var(--color-primary);font-weight:700;min-width:32px;text-align:center;">${fs}px</span>
          <button id="btnFontLarger"
            style="width:28px;height:28px;border-radius:5px;background:var(--color-surface);border:1px solid var(--color-border);color:var(--color-text);cursor:pointer;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;">A+</button>
        </div>
      </div>

      <!-- Writing area -->
      <div style="padding:0 16px 12px;">
        <textarea id="novelTextarea"
          style="width:100%;min-height:55vh;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:12px;padding:16px;font-size:${fs}px;line-height:1.9;color:var(--color-text);resize:vertical;font-family:'Noto Serif KR',Georgia,'Malgun Gothic',serif;box-sizing:border-box;outline:none;-webkit-overflow-scrolling:touch;"
          placeholder="여기에 소설을 작성하세요...&#10;&#10;[삽입 ▼] 버튼으로 상태창·스킬 설명·탑 정보를 바로 삽입할 수 있습니다.&#10;30초마다 자동 저장됩니다."
        >${Utils.escHtml(draft)}</textarea>
      </div>

      <!-- Thematic questions panel -->
      <div style="padding:0 16px 16px;">
        <div style="background:var(--color-surface2);border-radius:12px;border:1px solid var(--color-border);overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid ${expanded ? 'var(--color-border)' : 'transparent'};">
            <button id="btnToggleQuestions"
              style="flex:1;display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:var(--color-primary);font-size:13px;font-weight:700;text-align:left;padding:0;">
              <span>주제 질문들 (창작 참고)</span>
              <span id="questionsChevron" style="font-size:11px;">${expanded ? '▲' : '▼'}</span>
            </button>
            <div style="display:flex;gap:4px;flex-shrink:0;">
              <button class="btn btn-ghost btn-sm" id="btnAddQuestion"
                style="font-size:10px;padding:2px 8px;color:var(--color-primary);">+ 추가</button>
              <button class="btn btn-ghost btn-sm" id="btnEditQuestions"
                style="font-size:10px;padding:2px 8px;">전체편집</button>
            </div>
          </div>
          <div id="questionsPanel" style="display:${expanded ? 'block' : 'none'};padding:10px 14px 14px;">
            <ol style="margin:0;padding-left:16px;display:flex;flex-direction:column;gap:8px;">
              ${questions.map((q, i) => self._questionItem(q, i)).join('')}
            </ol>
          </div>
        </div>
      </div>
    </div>`;

    const textarea = document.getElementById('novelTextarea');
    const charCountEl = document.getElementById('charCountDisplay');
    const saveStatusEl = document.getElementById('saveStatusDisplay');
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');

    // Save helper to run before page re-renders (preserves unsaved edits)
    const saveBeforeReload = async () => {
      if (textarea && self._wid) {
        clearTimeout(self._saveTimer);
        await DB.setSetting('novelDraft_' + self._wid, textarea.value);
      }
    };

    // ── Font size ──────────────────────────────────────────────
    document.getElementById('btnFontLarger')?.addEventListener('click', async () => {
      self._fontSize = Math.min(22, self._fontSize + 1);
      if (textarea) textarea.style.fontSize = self._fontSize + 'px';
      if (fontSizeDisplay) fontSizeDisplay.textContent = self._fontSize + 'px';
      await DB.setSetting('novelFontSize', self._fontSize);
    });
    document.getElementById('btnFontSmaller')?.addEventListener('click', async () => {
      self._fontSize = Math.max(9, self._fontSize - 1);
      if (textarea) textarea.style.fontSize = self._fontSize + 'px';
      if (fontSizeDisplay) fontSizeDisplay.textContent = self._fontSize + 'px';
      await DB.setSetting('novelFontSize', self._fontSize);
    });

    // ── Char count & autosave ──────────────────────────────────
    const markDirty = () => {
      if (saveStatusEl) { saveStatusEl.textContent = '편집 중...'; saveStatusEl.style.color = 'var(--color-warning)'; }
    };
    const markSaved = (msg) => {
      if (saveStatusEl) { saveStatusEl.textContent = msg || '저장됨'; saveStatusEl.style.color = 'var(--color-text-dim)'; }
    };

    self._autoSaveTimer = setInterval(async () => {
      if (!textarea) return;
      await DB.setSetting('novelDraft_' + wid, textarea.value);
      markSaved('자동저장됨 (' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) + ')');
    }, 30000);

    textarea?.addEventListener('input', () => {
      if (charCountEl) charCountEl.textContent = self._countChars(textarea.value).toLocaleString() + '자';
      markDirty();
      clearTimeout(self._saveTimer);
      self._saveTimer = setTimeout(async () => {
        await DB.setSetting('novelDraft_' + wid, textarea.value);
        await AppStore.updateStreak();
        markSaved('저장됨');
      }, 1500);
    });

    document.getElementById('btnSaveNow')?.addEventListener('click', async () => {
      clearTimeout(self._saveTimer);
      await DB.setSetting('novelDraft_' + wid, textarea?.value || '');
      await AppStore.updateStreak();
      markSaved('저장됨');
      Utils.toast('저장됨', 'success');
    });

    document.getElementById('btnClearDraft')?.addEventListener('click', () => {
      Utils.confirm('내용 비우기', '작성 중인 내용을 모두 지우시겠습니까?', async () => {
        clearTimeout(self._saveTimer);
        await DB.setSetting('novelDraft_' + wid, '');
        if (textarea) { textarea.value = ''; textarea.dispatchEvent(new Event('input')); }
        Utils.toast('비워짐', 'info');
      }, '비우기');
    });

    document.getElementById('btnCopyDraft')?.addEventListener('click', () => {
      const text = textarea?.value || '';
      if (!text.trim()) { Utils.toast('내용이 없습니다', 'error'); return; }
      Utils.copyText(text);
    });

    // ── Export TXT ─────────────────────────────────────────────
    document.getElementById('btnExportNovel')?.addEventListener('click', () => {
      const text = textarea?.value || '';
      if (!text.trim()) { Utils.toast('내용이 없습니다', 'error'); return; }
      const world = AppStore.getState().currentWorld;
      const d = new Date();
      const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
      const filename = `novel_${(world?.name || 'draft').replace(/[^\w가-힣]/g, '_')}_${dateStr}.txt`;
      const blob = new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      Utils.toast('TXT 내보내기 완료', 'success');
    });

    // ── Insert modal (상태창 / 스킬 / 탑) ──────────────────────
    document.getElementById('btnInsert')?.addEventListener('click', () => {
      self._openInsertModal(chars, skills, towers, gates, textarea);
    });

    // ── Questions panel toggle ─────────────────────────────────
    document.getElementById('btnToggleQuestions')?.addEventListener('click', () => {
      self._questionsExpanded = !self._questionsExpanded;
      const panel = document.getElementById('questionsPanel');
      const chevron = document.getElementById('questionsChevron');
      if (panel) panel.style.display = self._questionsExpanded ? 'block' : 'none';
      if (chevron) chevron.textContent = self._questionsExpanded ? '▲' : '▼';
    });

    // ── Questions: per-item edit ───────────────────────────────
    container.querySelectorAll('.btn-q-edit').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const qs = (await DB.getSetting('novelQuestions', null)) || [...self.THEMATIC_QUESTIONS];
        const body = `
          <div>
            <label class="form-label" style="display:block;margin-bottom:6px;">질문 내용 수정</label>
            <textarea class="textarea-field" id="fEditQuestion" rows="5"
              style="width:100%;box-sizing:border-box;font-size:13px;line-height:1.65;">${Utils.escHtml(qs[idx] || '')}</textarea>
          </div>`;
        Utils.openModal('질문 편집', body, async () => {
          const newQ = document.getElementById('fEditQuestion')?.value.trim();
          if (!newQ) { Utils.toast('내용을 입력하세요', 'error'); return false; }
          qs[idx] = newQ;
          await DB.setSetting('novelQuestions', qs);
          Utils.toast('저장됨', 'success');
          await saveBeforeReload();
          self.init(self._container);
          return true;
        }, '저장');
      });
    });

    // ── Questions: per-item delete ─────────────────────────────
    container.querySelectorAll('.btn-q-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const qs = (await DB.getSetting('novelQuestions', null)) || [...self.THEMATIC_QUESTIONS];
        Utils.confirm('질문 삭제', '이 질문을 삭제하시겠습니까?', async () => {
          qs.splice(idx, 1);
          await DB.setSetting('novelQuestions', qs);
          Utils.toast('삭제됨', 'info');
          await saveBeforeReload();
          self.init(self._container);
        }, '삭제');
      });
    });

    // ── Questions: add single ──────────────────────────────────
    document.getElementById('btnAddQuestion')?.addEventListener('click', async () => {
      const body = `
        <div>
          <label class="form-label" style="display:block;margin-bottom:6px;">새 질문 내용</label>
          <textarea class="textarea-field" id="fNewQuestion" rows="4"
            style="width:100%;box-sizing:border-box;font-size:13px;line-height:1.65;"
            placeholder="새로운 주제 질문을 입력하세요"></textarea>
        </div>`;
      Utils.openModal('질문 추가', body, async () => {
        const newQ = document.getElementById('fNewQuestion')?.value.trim();
        if (!newQ) { Utils.toast('내용을 입력하세요', 'error'); return false; }
        const qs = (await DB.getSetting('novelQuestions', null)) || [...self.THEMATIC_QUESTIONS];
        qs.push(newQ);
        await DB.setSetting('novelQuestions', qs);
        Utils.toast('추가됨', 'success');
        await saveBeforeReload();
        self.init(self._container);
        return true;
      }, '추가');
    });

    // ── Questions: bulk edit ───────────────────────────────────
    document.getElementById('btnEditQuestions')?.addEventListener('click', async () => {
      const qs = (await DB.getSetting('novelQuestions', null)) || this.THEMATIC_QUESTIONS;
      const body = `
        <div>
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:8px;">각 줄에 하나씩 입력하세요</div>
          <textarea class="textarea-field" id="fQuestionsList" rows="14"
            style="width:100%;box-sizing:border-box;font-size:12px;line-height:1.65;">${qs.join('\n')}</textarea>
        </div>`;
      Utils.openModal('주제 질문 전체편집', body, async () => {
        const lines = document.getElementById('fQuestionsList')?.value.split('\n').map(l => l.trim()).filter(Boolean) || [];
        if (!lines.length) { Utils.toast('질문이 없습니다', 'error'); return false; }
        await DB.setSetting('novelQuestions', lines);
        Utils.toast('저장됨', 'success');
        await saveBeforeReload();
        self.init(self._container);
        return true;
      }, '저장');
    });

    // ── Visual viewport (mobile keyboard) ─────────────────────
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
      self._vvHandler = vvHandler;
    }
  },

  // ── Question list item HTML ────────────────────────────────────
  _questionItem: function(q, i) {
    return `
      <li style="font-size:12px;line-height:1.7;color:var(--color-text-muted);display:flex;align-items:flex-start;gap:6px;">
        <span style="flex:1;word-break:keep-all;">${Utils.escHtml(q)}</span>
        <div style="display:flex;gap:2px;flex-shrink:0;margin-top:2px;">
          <button class="btn-q-edit" data-idx="${i}"
            style="background:none;border:1px solid var(--color-border);cursor:pointer;color:var(--color-text-muted);font-size:11px;padding:2px 5px;border-radius:4px;line-height:1;" title="편집">편집</button>
          <button class="btn-q-del" data-idx="${i}"
            style="background:none;border:1px solid rgba(239,68,68,0.3);cursor:pointer;color:var(--color-danger);font-size:11px;padding:2px 5px;border-radius:4px;line-height:1;" title="삭제">✕</button>
        </div>
      </li>`;
  },

  // ── Insert modal (탭: 상태창 / 스킬 / 탑 / 게이트) ────────────
  _openInsertModal: function(chars, skills, towers, gates, textarea) {
    const self = this;
    const insertState = { tab: 'status', selectedSkillId: null };

    const charOpts = chars.map(c =>
      `<option value="${Utils.escHtml(c.id)}">${Utils.escHtml(c.name)}${c.level !== undefined && c.level !== '' ? ' (Lv.' + c.level + ')' : ''}</option>`
    ).join('');

    const skillItems = skills.map(s =>
      `<div class="skill-pick-item" data-skill-id="${Utils.escHtml(s.id)}"
        style="padding:8px 10px;border-radius:6px;border:1px solid var(--color-border);cursor:pointer;transition:border-color 0.1s,background 0.1s;">
        <div style="font-size:13px;font-weight:600;">${Utils.escHtml(s.name || '이름없음')}</div>
        <div style="font-size:11px;color:var(--color-text-muted);">${Utils.escHtml(s.grade || 'F')}${s.type ? ' · ' + Utils.escHtml(s.type) : ''}${s.attribute && s.attribute !== '없음' ? ' · ' + Utils.escHtml(s.attribute) : ''}</div>
      </div>`
    ).join('');

    const towerOpts = towers.map(t =>
      `<option value="${Utils.escHtml(t.id)}">${Utils.escHtml(t.name || '이름없음')}</option>`
    ).join('');

    const tabBtn = (id, label, active) =>
      `<button class="ins-tab-btn" id="${id}" data-tab="${id.replace('tabBtn', '').toLowerCase()}"
        style="flex:1;padding:7px 4px;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:700;transition:all 0.15s;
          background:${active ? 'var(--color-primary)' : 'transparent'};
          color:${active ? '#000' : 'var(--color-text-muted)'};">${label}</button>`;

    const body = `
      <div>
        <!-- Tab bar -->
        <div style="display:flex;gap:2px;margin-bottom:14px;background:var(--color-surface2);border-radius:8px;padding:3px;">
          ${tabBtn('tabBtnstatus', '상태창', true)}
          ${tabBtn('tabBtnskill', '스킬 설명', false)}
          ${tabBtn('tabBtntower', '탑 정보', false)}
          ${tabBtn('tabBtngate', '게이트', false)}
        </div>

        <!-- Tab: 상태창 -->
        <div id="tabPanestatus" style="display:block;">
          ${chars.length === 0
            ? '<div style="text-align:center;padding:24px;color:var(--color-text-muted);">캐릭터가 없습니다</div>'
            : `<div style="display:flex;flex-direction:column;gap:12px;">
                <div class="form-group">
                  <label class="form-label">캐릭터 선택</label>
                  <select class="select-input" id="insertCharSelect" style="width:100%;">${charOpts}</select>
                </div>
                <div class="form-group">
                  <label class="form-label">뷰 모드</label>
                  <select class="select-input" id="insertViewMode" style="width:100%;">
                    <option value="novel">소설 뷰 (독자 시점)</option>
                    <option value="author">작가 뷰 (전체 표시)</option>
                  </select>
                </div>
              </div>`}
        </div>

        <!-- Tab: 스킬 -->
        <div id="tabPaneskill" style="display:none;">
          ${skills.length === 0
            ? '<div style="text-align:center;padding:24px;color:var(--color-text-muted);">등록된 스킬이 없습니다</div>'
            : `<div style="display:flex;flex-direction:column;gap:8px;">
                <input id="skillSearchInput" class="input-field"
                  placeholder="스킬 이름 검색..."
                  style="width:100%;box-sizing:border-box;font-size:13px;padding:8px 12px;border-radius:8px;background:var(--color-surface2);border:1px solid var(--color-border);color:var(--color-text);outline:none;" />
                <div id="skillPickList"
                  style="display:flex;flex-direction:column;gap:4px;max-height:220px;overflow-y:auto;-webkit-overflow-scrolling:touch;">
                  ${skillItems}
                </div>
                <div id="selectedSkillInfo"
                  style="font-size:12px;color:var(--color-primary);padding:4px 2px;min-height:18px;"></div>
              </div>`}
        </div>

        <!-- Tab: 탑 -->
        <div id="tabPanetower" style="display:none;">
          ${towers.length === 0
            ? '<div style="text-align:center;padding:24px;color:var(--color-text-muted);">등록된 탑이 없습니다</div>'
            : `<div style="display:flex;flex-direction:column;gap:12px;">
                <div class="form-group">
                  <label class="form-label">탑 선택</label>
                  <select class="select-input" id="towerPickSelect" style="width:100%;">${towerOpts}</select>
                </div>
                <div class="form-group">
                  <label class="form-label">층 선택</label>
                  <select class="select-input" id="floorPickSelect" style="width:100%;"></select>
                </div>
              </div>`}
        </div>

        <!-- Tab: 게이트 -->
        <div id="tabPanegate" style="display:none;">
          ${gates.length === 0
            ? '<div style="text-align:center;padding:24px;color:var(--color-text-muted);">등록된 게이트가 없습니다</div>'
            : `<div style="display:flex;flex-direction:column;gap:10px;">
                <div class="form-group">
                  <label class="form-label">게이트 선택</label>
                  <select class="select-input" id="gatePickSelect" style="width:100%;">
                    ${gates.map(gg => `<option value="${Utils.escHtml(gg.id)}">${Utils.escHtml(gg.name || '이름없음')}${gg.grade ? ' (' + Utils.escHtml(gg.grade) + ')' : ''}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" style="font-size:12px;margin-bottom:4px;display:block;">복사할 항목 선택</label>
                  <div id="gateFieldChecks" style="display:flex;flex-direction:column;gap:4px;max-height:180px;overflow-y:auto;">
                  </div>
                </div>
              </div>`}
        </div>
      </div>`;

    Utils.openModal('삽입', body, () => {
      let text = '';

      if (insertState.tab === 'status') {
        const charId = document.getElementById('insertCharSelect')?.value;
        const viewMode = document.getElementById('insertViewMode')?.value;
        const char = chars.find(c => c.id === charId);
        if (!char) { Utils.toast('캐릭터를 선택하세요', 'error'); return false; }
        text = self._buildStatusText(char, viewMode === 'novel');

      } else if (insertState.tab === 'skill') {
        const skill = skills.find(s => s.id === insertState.selectedSkillId);
        if (!skill) { Utils.toast('스킬을 선택하세요', 'error'); return false; }
        text = self._buildSkillText(skill);

      } else if (insertState.tab === 'tower') {
        const towerId = document.getElementById('towerPickSelect')?.value;
        const tower = towers.find(t => t.id === towerId);
        const floorNumVal = document.getElementById('floorPickSelect')?.value;
        const floor = tower?.floors?.find(f => String(f.floorNum) === floorNumVal);
        if (!floor) { Utils.toast('층을 선택하세요', 'error'); return false; }
        text = self._buildFloorText(tower, floor);

      } else if (insertState.tab === 'gate') {
        const gateId = document.getElementById('gatePickSelect')?.value;
        const gate = gates.find(gg => gg.id === gateId);
        if (!gate) { Utils.toast('게이트를 선택하세요', 'error'); return false; }
        const checked = [...document.querySelectorAll('#globalModalBody .gate-field-chk:checked')].map(cb => cb.dataset.field);
        if (!checked.length) { Utils.toast('항목을 선택하세요', 'error'); return false; }
        text = self._buildGateText(gate, checked);
      }

      if (!text) return false;

      const cursorPos = textarea.selectionStart;
      const before = textarea.value.substring(0, cursorPos);
      const after = textarea.value.substring(cursorPos);
      const insert = (before.length > 0 && !before.endsWith('\n') ? '\n' : '') + text + '\n';
      textarea.value = before + insert + after;
      textarea.selectionStart = textarea.selectionEnd = cursorPos + insert.length;
      textarea.dispatchEvent(new Event('input'));
      textarea.focus();
      Utils.toast('삽입됨', 'success');
      return true;
    }, '삽입');

    // Tab switching
    document.querySelectorAll('.ins-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        insertState.tab = tab;
        document.querySelectorAll('.ins-tab-btn').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = 'var(--color-text-muted)';
        });
        btn.style.background = 'var(--color-primary)';
        btn.style.color = '#000';
        ['status', 'skill', 'tower', 'gate'].forEach(t => {
          const pane = document.getElementById('tabPane' + t);
          if (pane) pane.style.display = t === tab ? 'block' : 'none';
        });
        if (tab === 'gate') updateGateFields();
      });
    });

    // Skill search
    document.getElementById('skillSearchInput')?.addEventListener('input', function() {
      const q = this.value.toLowerCase();
      document.querySelectorAll('.skill-pick-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });

    // Skill item selection
    document.querySelectorAll('.skill-pick-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.skill-pick-item').forEach(i => {
          i.style.borderColor = 'var(--color-border)';
          i.style.background = '';
        });
        item.style.borderColor = 'var(--color-primary)';
        item.style.background = 'rgba(0,188,212,0.08)';
        insertState.selectedSkillId = item.dataset.skillId;
        const skill = skills.find(s => s.id === insertState.selectedSkillId);
        const infoEl = document.getElementById('selectedSkillInfo');
        if (infoEl && skill) infoEl.textContent = `선택: ${skill.name} (${skill.grade || 'F'})`;
      });
    });

    // Tower floor list update
    const updateFloors = () => {
      const towerId = document.getElementById('towerPickSelect')?.value;
      const tower = towers.find(t => t.id === towerId);
      const sel = document.getElementById('floorPickSelect');
      if (!tower || !sel) return;
      const floors = (tower.floors || []).slice().sort((a, b) => (a.floorNum || 0) - (b.floorNum || 0));
      sel.innerHTML = floors.length === 0
        ? '<option value="">층이 없습니다</option>'
        : floors.map(f =>
            `<option value="${f.floorNum}">${f.floorNum}층${f.theme ? ' - ' + Utils.escHtml(f.theme) : ''}${f.hidden ? ' [히든]' : ''}</option>`
          ).join('');
    };
    document.getElementById('towerPickSelect')?.addEventListener('change', updateFloors);
    if (towers.length > 0) updateFloors();

    // Gate field checkboxes
    const GATE_FIELDS = [
      { key: 'grade', label: '등급' }, { key: 'type', label: '종류' },
      { key: 'breakType', label: '브레이크 유형' }, { key: 'motif', label: '모티브' },
      { key: 'levelLimit', label: '레벨 제한' }, { key: 'maxPlayers', label: '최대 인원수' },
      { key: 'scale', label: '규모' }, { key: 'enemies', label: '적' },
      { key: 'features', label: '특징' }, { key: 'internalStructure', label: '내부 구성' },
      { key: 'strategy', label: '공략 방법' }, { key: 'clearCondition', label: '클리어 조건' },
      { key: 'rewards', label: '보상' }, { key: 'failPenalty', label: '실패시 패널티' },
    ];
    const updateGateFields = () => {
      const gateId = document.getElementById('gatePickSelect')?.value;
      const gate = gates.find(gg => gg.id === gateId);
      const el = document.getElementById('gateFieldChecks');
      if (!el || !gate) return;
      const available = GATE_FIELDS.filter(f => gate[f.key]);
      el.innerHTML = available.length === 0
        ? '<div style="font-size:12px;color:var(--color-text-dim);">내용이 없습니다</div>'
        : available.map(f => `
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:3px 0;">
            <input type="checkbox" class="gate-field-chk" data-field="${f.key}" checked />
            ${f.label}
          </label>`).join('');
    };
    document.getElementById('gatePickSelect')?.addEventListener('change', updateGateFields);
    if (gates.length > 0) updateGateFields();
  },

  // ── Text builders ──────────────────────────────────────────────
  _buildStatusText: function(char, novelView) {
    const bar = 'ㅡ'.repeat(8);
    const lines = [bar];
    lines.push(`ㅣ레벨:${char.level !== undefined && char.level !== '' ? char.level : 0}`);
    if (char.title !== undefined) lines.push(`ㅣ칭호:${char.title || ''}`);
    lines.push(`ㅣ이름:${char.name || ''}`);
    if (char.nation !== undefined && char.nation !== '') lines.push(`ㅣ국가:${char.nation}`);
    if (char.country !== undefined && char.country !== '') lines.push(`ㅣ국가:${char.country}`);
    if (char.guild !== undefined) lines.push(`ㅣ길드:${char.guild || ''}`);
    if (char.race !== undefined && char.race !== '') lines.push(`ㅣ종족:${char.race}`);
    if (char.age !== undefined && char.age !== '') lines.push(`ㅣ나이:${char.age}`);
    if (char.gender !== undefined && char.gender !== '' && char.gender !== '미지정') lines.push(`ㅣ성별:${char.gender}`);

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

  _buildSkillText: function(s) {
    const bar = 'ㅡ'.repeat(4);
    const typeStr = [s.type, s.activeSubtype || s.passiveSubtype].filter(Boolean).join('/');
    return [
      bar,
      `ㅣ이름: ${s.name || ''}`,
      `ㅣ등급: ${s.grade || ''}`,
      `ㅣ소모 마나: ${s.manaCost !== undefined ? s.manaCost : 0} (${typeStr || '패시브'})`,
      s.cooldown ? `ㅣ쿨타임: ${s.cooldown}` : null,
      s.attribute && s.attribute !== '없음' ? `ㅣ속성: ${s.attribute}` : null,
      s.series && s.series !== '없음' ? `ㅣ계열: ${s.series}` : null,
      `ㅣ효과:`,
      s.effects || '',
      s.description ? `ㅣ설명: ${s.description}` : null,
      bar,
    ].filter(x => x !== null).join('\n');
  },

  _buildFloorText: function(tower, floor) {
    const bar = 'ㅡ'.repeat(8);
    const lines = [bar];
    lines.push(`ㅣ탑: ${tower.name || ''}`);
    lines.push(`ㅣ층: ${floor.floorNum}층${floor.hidden ? ' [히든]' : ''}`);
    if (floor.theme) lines.push(`ㅣ테마: ${floor.theme}`);
    if (floor.enemies) {
      lines.push('ㅣ[적]');
      floor.enemies.split('\n').map(e => e.trim()).filter(Boolean).forEach(e => lines.push(`ㄴ${e}`));
    }
    if (floor.features) {
      lines.push('ㅣ[특징]');
      floor.features.split('\n').map(f => f.trim()).filter(Boolean).forEach(f => lines.push(`ㄴ${f}`));
    }
    if (floor.quests) {
      lines.push('ㅣ[퀘스트]');
      floor.quests.split('\n').map(q => q.trim()).filter(Boolean).forEach(q => lines.push(`ㄴ${q}`));
    }
    if (floor.rewards) {
      lines.push('ㅣ[보상]');
      floor.rewards.split('\n').map(r => r.trim()).filter(Boolean).forEach(r => lines.push(`ㄴ${r}`));
    }
    // Sub-floors
    if (floor.subFloors && floor.subFloors.length > 0) {
      floor.subFloors.forEach(sf => {
        lines.push(`ㅣ[서브층: ${sf.name || floor.floorNum + '-서브'}]${sf.hidden ? ' [히든]' : ''}`);
        if (sf.enemies) lines.push(`ㄴ적: ${sf.enemies}`);
        if (sf.features) sf.features.split('\n').filter(Boolean).forEach(f => lines.push(`ㄴ${f.trim()}`));
        if (sf.rewards) lines.push(`ㄴ보상: ${sf.rewards}`);
      });
    }
    lines.push(bar);
    return lines.join('\n');
  },

  _buildGateText: function(g, fields) {
    const bar = 'ㅡ'.repeat(8);
    const lines = [bar, `ㅣ[던전 정보: ${g.name || ''}]`];
    const multiline = ['enemies', 'features', 'internalStructure', 'strategy', 'clearCondition', 'failPenalty'];
    const labels = {
      grade: '등급', type: '종류', breakType: '브레이크 유형', motif: '모티브',
      levelLimit: '레벨 제한', maxPlayers: '최대 인원수', scale: '규모',
      enemies: '적', features: '특징', internalStructure: '내부 구성',
      strategy: '공략 방법', clearCondition: '클리어 조건', rewards: '보상',
      failPenalty: '실패시 패널티',
    };
    fields.forEach(key => {
      const val = g[key];
      if (!val) return;
      if (multiline.includes(key)) {
        lines.push(`ㅣ[${labels[key]}]`);
        String(val).split('\n').filter(Boolean).forEach(l => lines.push(`ㄴ${l.trim()}`));
      } else {
        lines.push(`ㅣ${labels[key]}: ${val}`);
      }
    });
    lines.push(bar);
    return lines.join('\n');
  },

  _countChars: function(text) {
    if (!text) return 0;
    return text.replace(/\s/g, '').length;
  },

  destroy: function() {
    clearTimeout(this._saveTimer);
    clearInterval(this._autoSaveTimer);
    this._saveTimer = null;
    this._autoSaveTimer = null;
    this._container = null;
    this._wid = null;
    if (this._vvHandler && 'visualViewport' in window) {
      window.visualViewport.removeEventListener('resize', this._vvHandler);
      window.visualViewport.removeEventListener('scroll', this._vvHandler);
      this._vvHandler = null;
    }
  },
};
