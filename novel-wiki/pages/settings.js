'use strict';
window.Pages = window.Pages || {};
window.Pages.settings = {
  _container: null,

  APP_VERSION: 'v1.0',

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

  FEATURE_FLAGS: [
    { key: 'gradeColors',              group: '표시', default: true,
      label: '등급 색상 배지',
      desc: 'F~EX 등급을 색상으로 구분해 표시합니다. 비활성 시 단색 배지를 사용합니다.' },
    { key: 'showAuthorBadge',          group: '표시', default: true,
      label: '작가 전용 배지 표시',
      desc: '작가 메모·히든 정보에 「작가전용」 배지를 표시합니다.' },
    { key: 'novelViewDefault',         group: '표시', default: false,
      label: '상태창 기본 소설 뷰',
      desc: '상태창 뷰어 진입 시 소설 뷰를 기본으로 사용합니다.' },
    { key: 'communityLockedDefault',   group: '표시', default: true,
      label: '커뮤니티 패널 기본 잠금',
      desc: '상태창 뷰어의 커뮤니티·길드 커뮤니티 패널이 기본 잠금 상태로 시작합니다.' },
    { key: 'showConstellationsInStatus', group: '표시', default: true,
      label: '상태창 성좌 계약 섹션',
      desc: '상태창 뷰어에서 성좌 계약 정보 섹션을 표시합니다.' },
    { key: 'deleteConfirmInput',       group: '조작', default: true,
      label: '삭제 시 이름 확인 입력',
      desc: '항목 삭제 전 이름을 직접 입력해 확인합니다. 비활성 시 버튼 클릭만으로 삭제됩니다.' },
    { key: 'listScrollMemory',         group: '조작', default: true,
      label: '목록 스크롤 위치 기억',
      desc: '상세보기 후 목록으로 돌아올 때 이전 스크롤 위치를 복원합니다.' },
    { key: 'autoResetFilters',         group: '조작', default: false,
      label: '검색 시 필터 자동 초기화',
      desc: '검색어 입력 시 활성화된 등급·타입 필터를 자동으로 해제합니다.' },
    { key: 'searchScope',              group: '검색', default: 'world',
      label: '검색 범위',
      desc: '(아래 버튼으로 변경하세요)',
      isScope: true },
  ],

  // Unified icon list config per category
  ICON_CATS: [
    {
      key: 'world',   label: '세계관', emoji: '🌍',
      dbKey: 'iconList_world',
      legacyKey: 'worldCustomIcons',
      defaults: ['🌍','🌙','👁️','🪞','💫','🏰','⚡','🌀','🌟','🔮','☀️','🌊'],
    },
    {
      key: 'const',   label: '성좌',   emoji: '✨',
      dbKey: 'iconList_const',
      legacyKey: 'constCustomIcons',
      defaults: null, // pulled from AppConstants at runtime
    },
    {
      key: 'org',     label: '조직',   emoji: '⚔️',
      dbKey: 'iconList_org',
      legacyKey: 'orgCustomIcons',
      defaults: ['🏛️','⚔️','🔮','🌑','💼','🛡️','📚','⛪','🗡️','🎭','🌟','🔱','☠️','🦅','🐉','🏢','🏰','🌹','🗺️','⚡','🕵️','🌊','🔥','❄️','🌿'],
    },
    {
      key: 'country', label: '국가',   emoji: '🗺️',
      dbKey: 'iconList_country',
      legacyKey: 'countryCustomIcons',
      defaults: ['🏳️','🌍','🌏','🌎','🏛️','⚔️','🏰','🌸','🌿','🔥','❄️','⚡','🌊','🏔️','🌋','🌅','🦅','🐉','👑','🗡️','🛡️','⚓','🌹','🌑','☀️'],
    },
    {
      key: 'company', label: '기업',   emoji: '🏢',
      dbKey: 'iconList_company',
      legacyKey: 'companyCustomIcons',
      defaults: ['🏢','💼','🏭','⚔️','🛡️','💊','🔬','🏦','🚀','🌐','💎','🔮','⚙️','🗡️','🌿','🔱','🏰','🎯','📡','💰'],
    },
  ],

  init: async function(container, options) {
    options = options || {};
    this._container = container;
    await this._renderPage(container);
  },

  // Load a category's full icon list from DB (migrate legacy customs on first load)
  _loadCatIcons: async function(cat) {
    let stored = await DB.getSetting(cat.dbKey, null);
    if (stored !== null) return stored;
    // First access: merge built-in defaults + any legacy custom icons
    const defaults = cat.key === 'const'
      ? ((await DB.getSetting('const_iconPresets', null)) || AppConstants.DEFAULTS.iconPresets || [])
      : (cat.defaults || []);
    const legacy = (await DB.getSetting(cat.legacyKey, [])) || [];
    const merged = [...defaults];
    legacy.forEach(ic => { if (!merged.includes(ic)) merged.push(ic); });
    return merged;
  },

  _renderPage: async function(container) {
    const self = this;
    const state = AppStore.getState();
    const streak = state.streak || { count: 0 };
    const currentWorld = state.currentWorld;

    const flagValues = {};
    await Promise.all(this.FEATURE_FLAGS.map(async f => {
      const dbVal = await DB.getSetting('flag_' + f.key, null);
      const val = dbVal !== null ? dbVal : AppFlags.get(f.key, f.default);
      flagValues[f.key] = val;
      AppFlags.set(f.key, val);
    }));

    // Load full icon list per category
    const catIcons = {};
    await Promise.all(this.ICON_CATS.map(async cat => {
      catIcons[cat.key] = await self._loadCatIcons(cat);
    }));

    const toggleHtml = (key, val) => `
      <button class="feat-toggle" data-key="${Utils.escHtml(key)}" aria-label="토글" style="
        position:relative;width:44px;height:26px;border-radius:13px;border:none;cursor:pointer;
        padding:0;flex-shrink:0;transition:background .2s;outline:none;
        background:${val ? 'var(--color-primary)' : '#4b5563'};">
        <div style="position:absolute;top:3px;left:${val ? '21px' : '3px'};
          width:20px;height:20px;border-radius:10px;background:#fff;
          transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.3);"></div>
      </button>`;

    const groups = {};
    this.FEATURE_FLAGS.filter(f => !f.isScope).forEach(f => {
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    });

    const searchScope = flagValues['searchScope'] || 'world';
    const secStyle = 'background:var(--color-surface2);border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid var(--color-border);';
    const secLabel = 'font-weight:700;font-size:11px;color:var(--color-text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.8px;';
    const rowDivider = 'border-bottom:1px solid var(--color-border);';

    // Render icon chip for settings grid (with hover-delete)
    const chipHtml = (ic, catKey, j) =>
      `<button class="settings-icon-chip" data-cat="${catKey}" data-idx="${j}"
        title="${Utils.escHtml(ic)} — 클릭하여 삭제"
        style="font-size:22px;padding:4px 6px;border-radius:8px;border:1px solid var(--color-border);
          background:var(--color-bg);cursor:pointer;line-height:1.2;position:relative;"
        onmouseover="this.style.background='rgba(239,68,68,0.12)';this.style.borderColor='var(--color-danger)'"
        onmouseout="this.style.background='var(--color-bg)';this.style.borderColor='var(--color-border)'">
        ${Utils.escHtml(ic)}
      </button>`;

    const tabsHtml = this.ICON_CATS.map((cat, i) => `
      <button class="icon-cat-tab${i === 0 ? ' _active' : ''}" data-cat="${cat.key}"
        style="padding:5px 11px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;
          border:1px solid ${i === 0 ? 'var(--color-primary)' : 'var(--color-border)'};
          background:${i === 0 ? 'var(--color-primary)' : 'var(--color-surface2)'};
          color:${i === 0 ? '#000' : 'var(--color-text)'};">
        ${cat.emoji} ${cat.label} <span class="cat-tab-count" style="font-size:10px;opacity:.8;">(${catIcons[cat.key].length})</span>
      </button>`).join('');

    const panelsHtml = this.ICON_CATS.map((cat, i) => {
      const icons = catIcons[cat.key];
      const gridHtml = icons.length === 0
        ? `<span style="font-size:12px;color:var(--color-text-dim);">아이콘이 없습니다</span>`
        : icons.map((ic, j) => chipHtml(ic, cat.key, j)).join('');
      return `
        <div class="icon-cat-panel" data-cat="${cat.key}" style="display:${i === 0 ? 'block' : 'none'};">
          <div id="catGrid_${cat.key}" style="display:flex;flex-wrap:wrap;gap:6px;min-height:32px;margin-bottom:10px;">
            ${gridHtml}
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            <input class="input-field cat-icon-input" data-cat="${cat.key}"
              placeholder="이모지 추가 (예: 🦋)" style="width:120px;text-align:center;font-size:18px;" maxlength="8"/>
            <button class="btn btn-ghost btn-sm btn-add-cat-icon" data-cat="${cat.key}">+ 추가</button>
            <button class="btn btn-ghost btn-sm btn-reset-cat" data-cat="${cat.key}"
              style="font-size:11px;color:var(--color-warning);">기본값 복원</button>
            <span id="catCount_${cat.key}" style="font-size:11px;color:var(--color-text-dim);">${icons.length}개</span>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <h2 class="page-title">설정</h2>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">앱 환경설정 및 데이터 관리</p>
      </div>

      <!-- ① 앱 정보 -->
      <div style="${secStyle}">
        <div style="${secLabel}">앱 정보</div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;${rowDivider}">
          <span style="font-size:13px;">버전</span>
          <span style="font-size:13px;color:var(--color-text-muted);">${Utils.escHtml(this.APP_VERSION)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;${rowDivider}">
          <span style="font-size:13px;">현재 세계</span>
          <span style="font-size:13px;color:var(--color-text-muted);">${Utils.escHtml(currentWorld ? currentWorld.name : '(없음)')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;">
          <span style="font-size:13px;">연속 작성 스트릭</span>
          <span style="font-size:13px;color:#f97316;font-weight:700;">🔥 ${streak.count || 0}일</span>
        </div>
      </div>

      <!-- ② 카테고리별 아이콘 관리 -->
      <div style="${secStyle}">
        <div style="${secLabel}">🎨 카테고리별 아이콘 관리</div>
        <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:12px;">
          기본 아이콘과 추가 아이콘을 한 곳에서 관리합니다. 아이콘을 클릭하면 삭제됩니다.
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">
          ${tabsHtml}
        </div>
        <div id="iconCatPanels">
          ${panelsHtml}
        </div>
      </div>

      <!-- ③ 기능 설정 -->
      <div style="${secStyle}">
        <div style="${secLabel}">⚙️ 기능 설정</div>
        <div style="font-size:11px;color:var(--color-text-dim);margin-bottom:12px;">비활성화해도 기존 데이터는 유지됩니다.</div>
        ${Object.entries(groups).map(([groupName, flags]) => `
          <div style="margin-bottom:14px;">
            <div style="font-size:10px;color:var(--color-text-dim);letter-spacing:0.6px;text-transform:uppercase;margin-bottom:8px;">${Utils.escHtml(groupName)}</div>
            ${flags.map((f, fi) => `
              <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;${fi < flags.length - 1 ? rowDivider : ''}">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:600;margin-bottom:2px;">${Utils.escHtml(f.label)}</div>
                  <div style="font-size:11px;color:var(--color-text-muted);line-height:1.5;">${Utils.escHtml(f.desc)}</div>
                </div>
                ${toggleHtml(f.key, flagValues[f.key])}
              </div>`).join('')}
          </div>`).join('')}
      </div>

      <!-- ④ 검색 범위 -->
      <div style="${secStyle}">
        <div style="${secLabel}">검색 범위</div>
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <button class="scope-btn" data-scope="world"
            style="flex:1;padding:9px 12px;border-radius:8px;border:1px solid ${searchScope==='world'?'var(--color-primary)':'var(--color-border)'};cursor:pointer;font-size:13px;font-weight:${searchScope==='world'?'700':'400'};background:${searchScope==='world'?'var(--color-primary)':'var(--color-surface2)'};color:${searchScope==='world'?'#000':'var(--color-text)'};transition:all .15s;">
            현재 세계만
          </button>
          <button class="scope-btn" data-scope="all"
            style="flex:1;padding:9px 12px;border-radius:8px;border:1px solid ${searchScope==='all'?'var(--color-primary)':'var(--color-border)'};cursor:pointer;font-size:13px;font-weight:${searchScope==='all'?'700':'400'};background:${searchScope==='all'?'var(--color-primary)':'var(--color-surface2)'};color:${searchScope==='all'?'#000':'var(--color-text)'};transition:all .15s;">
            전체 세계
          </button>
        </div>
        <div style="font-size:11px;color:var(--color-text-dim);">현재: <strong>${searchScope === 'all' ? '전체 세계' : '현재 세계만'}</strong></div>
      </div>

      <!-- ⑤ 데이터 관리 -->
      <div style="${secStyle}">
        <div style="${secLabel}">데이터 관리</div>
        <button id="btnExportData" style="width:100%;display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-bg);cursor:pointer;color:var(--color-text);font-size:13px;margin-bottom:8px;text-align:left;">
          <span style="font-size:16px;">📤</span>
          <div><div style="font-weight:600;">내보내기 (Export)</div><div style="font-size:11px;color:var(--color-text-muted);margin-top:1px;">모든 데이터를 JSON 파일로 백업합니다</div></div>
        </button>
        <button id="btnImportData" style="width:100%;display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-bg);cursor:pointer;color:var(--color-text);font-size:13px;margin-bottom:8px;text-align:left;">
          <span style="font-size:16px;">📥</span>
          <div><div style="font-weight:600;">가져오기 (Import)</div><div style="font-size:11px;color:var(--color-text-muted);margin-top:1px;">JSON 백업 파일을 불러와 기존 데이터를 교체합니다</div></div>
        </button>
        <input type="file" id="importFileInput" accept=".json" style="display:none;" />
        <button id="btnResetAll" style="width:100%;display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.06);cursor:pointer;color:var(--color-danger);font-size:13px;text-align:left;">
          <span style="font-size:16px;">🗑️</span>
          <div><div style="font-weight:600;">초기화 (Reset)</div><div style="font-size:11px;color:rgba(239,68,68,0.7);margin-top:1px;">모든 데이터를 영구 삭제합니다. 되돌릴 수 없습니다.</div></div>
        </button>
      </div>

      <!-- ⑥ 소설 주제 질문들 -->
      <div style="${secStyle}border-left:3px solid var(--color-primary);">
        <div style="font-weight:700;font-size:13px;color:var(--color-primary);margin-bottom:12px;">소설 주제 질문들</div>
        <ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:9px;">
          ${this.THEMATIC_QUESTIONS.map(q => `<li style="font-size:12px;line-height:1.65;color:var(--color-text-muted);">${Utils.escHtml(q)}</li>`).join('')}
        </ol>
      </div>

      <!-- ⑦ 앱 소개 -->
      <div style="${secStyle}margin-bottom:80px;">
        <div style="${secLabel}">앱 소개</div>
        <p style="font-size:13px;color:var(--color-text-muted);line-height:1.7;margin:0;">
          소설 창작 위키 ${Utils.escHtml(this.APP_VERSION)} — 오프라인 우선 PWA<br>
          IndexedDB 기반 로컬 저장. 인터넷 없이도 완전히 동작합니다.
        </p>
      </div>
    </div>`;

    // ── Category icon tab switching ────────────────────────────────────────
    container.querySelectorAll('.icon-cat-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const cat = tab.dataset.cat;
        container.querySelectorAll('.icon-cat-tab').forEach(t => {
          t.style.background = 'var(--color-surface2)';
          t.style.color = 'var(--color-text)';
          t.style.borderColor = 'var(--color-border)';
        });
        tab.style.background = 'var(--color-primary)';
        tab.style.color = '#000';
        tab.style.borderColor = 'var(--color-primary)';
        container.querySelectorAll('.icon-cat-panel').forEach(p => {
          p.style.display = p.dataset.cat === cat ? 'block' : 'none';
        });
      });
    });

    // ── Re-render a category grid and rebind click handlers ────────────────
    const renderGrid = (catKey, icons) => {
      const grid = container.querySelector(`#catGrid_${catKey}`);
      const countEl = container.querySelector(`#catCount_${catKey}`);
      const tabCountEl = container.querySelector(`.icon-cat-tab[data-cat="${catKey}"] .cat-tab-count`);
      if (!grid) return;

      grid.innerHTML = icons.length === 0
        ? `<span style="font-size:12px;color:var(--color-text-dim);">아이콘이 없습니다</span>`
        : icons.map((ic, j) =>
            `<button class="settings-icon-chip" data-cat="${catKey}" data-idx="${j}"
              title="${Utils.escHtml(ic)} — 클릭하여 삭제"
              style="font-size:22px;padding:4px 6px;border-radius:8px;border:1px solid var(--color-border);
                background:var(--color-bg);cursor:pointer;line-height:1.2;"
              onmouseover="this.style.background='rgba(239,68,68,0.12)';this.style.borderColor='var(--color-danger)'"
              onmouseout="this.style.background='var(--color-bg)';this.style.borderColor='var(--color-border)'">
              ${Utils.escHtml(ic)}
            </button>`).join('');

      if (countEl) countEl.textContent = icons.length + '개';
      if (tabCountEl) tabCountEl.textContent = `(${icons.length})`;

      grid.querySelectorAll('.settings-icon-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.cat;
          const idx = parseInt(btn.dataset.idx);
          const ic = catIcons[key][idx];
          const catDef = self.ICON_CATS.find(d => d.key === key);
          if (!catDef) return;
          Utils.confirm('아이콘 삭제', `${ic} 아이콘을 삭제하시겠습니까?`, async () => {
            catIcons[key].splice(idx, 1);
            await DB.setSetting(catDef.dbKey, catIcons[key]);
            renderGrid(key, catIcons[key]);
            await self._syncLegacy(catDef, catIcons[key]);
          }, '삭제');
        });
      });
    };

    // Init all grids
    this.ICON_CATS.forEach(cat => renderGrid(cat.key, catIcons[cat.key]));

    // ── Add icon per category ──────────────────────────────────────────────
    container.querySelectorAll('.btn-add-cat-icon').forEach(btn => {
      btn.addEventListener('click', async () => {
        const catKey = btn.dataset.cat;
        const input = container.querySelector(`.cat-icon-input[data-cat="${catKey}"]`);
        const val = input?.value.trim();
        if (!val) return;
        if (catIcons[catKey].includes(val)) { Utils.toast('이미 있는 아이콘입니다', 'error'); return; }
        const catDef = self.ICON_CATS.find(d => d.key === catKey);
        if (!catDef) return;
        catIcons[catKey] = [...catIcons[catKey], val];
        await DB.setSetting(catDef.dbKey, catIcons[catKey]);
        await self._syncLegacy(catDef, catIcons[catKey]);
        renderGrid(catKey, catIcons[catKey]);
        if (input) input.value = '';
      });
    });

    container.querySelectorAll('.cat-icon-input').forEach(input => {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter')
          container.querySelector(`.btn-add-cat-icon[data-cat="${input.dataset.cat}"]`)?.click();
      });
    });

    // ── Reset to defaults per category ────────────────────────────────────
    container.querySelectorAll('.btn-reset-cat').forEach(btn => {
      btn.addEventListener('click', async () => {
        const catKey = btn.dataset.cat;
        const catDef = self.ICON_CATS.find(d => d.key === catKey);
        if (!catDef) return;
        Utils.confirm(`${catDef.emoji} ${catDef.label} 기본값 복원`,
          '아이콘 목록을 기본값으로 되돌리시겠습니까? 추가한 아이콘이 모두 사라집니다.', async () => {
          const defaults = catKey === 'const'
            ? ((await DB.getSetting('const_iconPresets', null)) || AppConstants.DEFAULTS.iconPresets || [])
            : (catDef.defaults || []);
          catIcons[catKey] = [...defaults];
          await DB.setSetting(catDef.dbKey, catIcons[catKey]);
          await self._syncLegacy(catDef, catIcons[catKey]);
          renderGrid(catKey, catIcons[catKey]);
          Utils.toast('기본값으로 복원됐습니다', 'info');
        }, '복원');
      });
    });

    // ── Feature toggles ────────────────────────────────────────────────────
    container.querySelectorAll('.feat-toggle[data-key]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;
        const flagDef = self.FEATURE_FLAGS.find(f => f.key === key);
        const current = flagValues[key] !== undefined ? flagValues[key] : (flagDef?.default ?? true);
        const newVal = !current;
        flagValues[key] = newVal;
        btn.style.background = newVal ? 'var(--color-primary)' : '#4b5563';
        const knob = btn.querySelector('div');
        if (knob) knob.style.left = newVal ? '21px' : '3px';
        AppFlags.set(key, newVal);
        await DB.setSetting('flag_' + key, newVal);
        Utils.toast(`'${Utils.escHtml(flagDef?.label || key)}' ${newVal ? '활성화' : '비활성화'}`, 'info', 1500);
      });
    });

    // ── Search scope ───────────────────────────────────────────────────────
    container.querySelectorAll('.scope-btn[data-scope]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const scope = btn.dataset.scope;
        flagValues['searchScope'] = scope;
        AppFlags.set('searchScope', scope);
        await DB.setSetting('flag_searchScope', scope);
        await DB.setSetting('searchScope', scope);
        AppStore.setState({ searchScope: scope });
        Utils.toast(scope === 'all' ? '전체 세계 검색으로 변경됨' : '현재 세계만 검색으로 변경됨', 'success');
        await self._renderPage(container);
      });
    });

    // ── Export ────────────────────────────────────────────────────────────
    container.querySelector('#btnExportData')?.addEventListener('click', async () => {
      try {
        const data = await DB.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const d = new Date();
        a.download = `novel-wiki-backup-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Utils.toast('내보내기 완료', 'success');
      } catch (err) {
        Utils.toast('내보내기 오류: ' + err.message, 'error');
      }
    });

    // ── Import ────────────────────────────────────────────────────────────
    container.querySelector('#btnImportData')?.addEventListener('click', () => {
      container.querySelector('#importFileInput')?.click();
    });
    container.querySelector('#importFileInput')?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';
      Utils.confirm('데이터 가져오기',
        `"${file.name}" 파일을 불러옵니다. 기존의 모든 데이터가 교체됩니다. 계속하시겠습니까?`,
        async () => {
          try {
            const text = await file.text();
            let data;
            try { data = JSON.parse(text); } catch (_) {
              Utils.toast('JSON 파싱 오류: 올바른 백업 파일인지 확인하세요', 'error'); return;
            }
            await DB.importAll(data);
            Utils.toast('가져오기 완료! 앱을 다시 시작합니다.', 'success');
            setTimeout(() => window.location.reload(), 1800);
          } catch (err) {
            Utils.toast('가져오기 오류: ' + err.message, 'error');
          }
        }, '가져오기');
    });

    // ── Reset all ─────────────────────────────────────────────────────────
    container.querySelector('#btnResetAll')?.addEventListener('click', () => {
      Utils.confirmWithInput('전체 초기화',
        '모든 세계, 캐릭터, 스킬, 아이템, 업적 등 저장된 모든 데이터가 영구 삭제됩니다. 백업 후 진행하세요.',
        '초기화',
        async () => {
          try {
            const emptyData = {
              worlds: [], characters: [], skills: [], achievements: [],
              organizations: [], constellations: [], gates: [], monsters: [],
              towers: [], items: [], jobs: [], events: [], worldRules: [],
              templates: [], folders: [], settings: [], streak: [],
            };
            await DB.importAll(emptyData);
            localStorage.removeItem('appFlags');
            Utils.toast('초기화 완료. 앱을 다시 시작합니다.', 'info');
            setTimeout(() => window.location.reload(), 1800);
          } catch (err) {
            Utils.toast('초기화 오류: ' + err.message, 'error');
          }
        }, '초기화');
    });
  },

  // Sync unified list back to legacy keys so existing form pickers still work
  _syncLegacy: async function(catDef, icons) {
    if (catDef.key === 'const') {
      // Update const_iconPresets to the full list (constellations.js reads this)
      await DB.setSetting('const_iconPresets', icons);
      AppConstants.invalidate();
      // Clear constCustomIcons since it's now merged
      await DB.setSetting('constCustomIcons', []);
    } else {
      // For other pages: store full list in legacyKey so _openForm can read it
      await DB.setSetting(catDef.legacyKey, icons);
    }
  },

  destroy: function() {
    this._container = null;
  }
};
