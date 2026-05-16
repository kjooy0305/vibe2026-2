'use strict';
window.Pages = window.Pages || {};
window.Pages.templates = {
  _container: null,
  _selectedType: null,
  _activeTab: 'fields',
  _selectedConstKey: 'grades',

  ENTITY_TYPES: [
    { key: '스킬',      label: '스킬',              icon: '⚡', group: '월드' },
    { key: '아이템',    label: '아이템',            icon: '📦', group: '월드' },
    { key: '직업',      label: '직업',              icon: '⚔️', group: '월드' },
    { key: '업적',      label: '업적',              icon: '🏆', group: '월드' },
    { key: '게이트',    label: '게이트',            icon: '🌀', group: '월드' },
    { key: '몬스터',    label: '몬스터',            icon: '👾', group: '월드' },
    { key: '성좌',      label: '성좌',              icon: '✨', group: '월드' },
    { key: '감정',      label: '감정 (소설 내부)',   icon: '💜', group: '소설내부' },
    { key: '직업_소설', label: '직업 (소설 내부)',   icon: '📖', group: '소설내부' },
    { key: '던전_소설', label: '던전 (소설 내부)',   icon: '🏰', group: '소설내부' },
    { key: '상태창',    label: '상태창',            icon: '📊', group: '시스템' },
  ],

  FIELD_TYPES: [
    { value: 'text',     label: '텍스트 (한 줄)' },
    { value: 'textarea', label: '텍스트 (여러 줄)' },
    { value: 'number',   label: '숫자' },
    { value: 'select',   label: '선택 (드롭다운)' },
    { value: 'boolean',  label: '참/거짓 토글' },
  ],

  // ── Global constants ────────────────────────────────────────────────────────
  CONST_DEFS: [
    { key: 'grades',              label: '공통 등급',        icon: '⭐',
      desc: '스킬·아이템·업적·게이트·몬스터·직업에서 사용하는 등급 목록' },
    { key: 'attributes',          label: '속성',             icon: '🔥',
      desc: '스킬과 성좌에서 사용하는 속성 목록' },
    { key: 'skillSeries',         label: '스킬 계열',        icon: '⚡',
      desc: '스킬 계열 목록 (필터·폼에 사용)' },
    { key: 'skillTypes',          label: '스킬 타입',        icon: '🎯',
      desc: '패시브/액티브 등 스킬 발동 방식 분류' },
    { key: 'passiveSubtypes',     label: '패시브 세부분류',  icon: '💤',
      desc: '패시브 스킬의 구체적 동작 방식' },
    { key: 'activeSubtypes',      label: '액티브 세부분류',  icon: '🗡️',
      desc: '액티브 스킬의 구체적 동작 방식' },
    { key: 'skillSubtypes',       label: '스킬 서브타입',    icon: '🔀',
      desc: '스킬 계층·진화 분류 (상급/하급/응용/진화/융합)' },
    { key: 'itemTypes',           label: '아이템 타입',      icon: '📦',
      desc: '아이템 분류 (무기·방어구·소비 등)' },
    { key: 'jobSeries',           label: '직업 계열',        icon: '⚔️',
      desc: '직업 분류 (근접·원거리·서포트 등)' },
    { key: 'constellationSeries', label: '성좌 계열',        icon: '✨',
      desc: '성좌 계열 분류 (멸망성좌·타락성좌 등)' },
    { key: 'constellationTiers',  label: '성좌 티어',        icon: '👑',
      desc: '성좌 위계/티어 목록' },
    { key: 'govTypes',            label: '국가 정치체계',    icon: '🏛️',
      desc: '국가 정치체계 목록 (민주주의·군주제 등)' },
    { key: 'econTypes',           label: '국가 경제체계',    icon: '💰',
      desc: '국가 경제체계 목록 (자본주의·사회주의 등)' },
    { key: 'militaryLevels',      label: '군사력 등급',      icon: '⚔️',
      desc: '국가 군사력 등급 목록 (최강·강·중·약 등)' },
  ],

  // ── Default field templates ─────────────────────────────────────────────────
  DEFAULT_TEMPLATES: {
    '스킬': [
      { key: 'name',        label: '이름',     type: 'text',     required: true,  novelHidden: false },
      { key: 'grade',       label: '등급',     type: 'select',   required: true,  novelHidden: false, options: ['F','E','D','C','B','A','S','SS','SSS','G','GG','GGG','EX'] },
      { key: 'type',        label: '타입',     type: 'select',   required: false, novelHidden: false, options: ['패시브','액티브'] },
      { key: 'attribute',   label: '속성',     type: 'select',   required: false, novelHidden: false, options: ['없음','화염','물','땅','바람','뇨','성화','청화','백화','빙화','빙','흑뢰','적뢰','공간','이능','신성','타락'] },
      { key: 'series',      label: '계열',     type: 'select',   required: false, novelHidden: false, options: ['없음','공격','방어','치료','계약-처벌','계약-심판','계약-처행'] },
      { key: 'manaCost',    label: '소모마나', type: 'number',   required: false, novelHidden: false },
      { key: 'cooldown',    label: '쿨타임',   type: 'text',     required: false, novelHidden: false },
      { key: 'effects',     label: '효과',     type: 'textarea', required: true,  novelHidden: false },
      { key: 'description', label: '설명',     type: 'textarea', required: false, novelHidden: false },
      { key: 'authorNotes', label: '작가메모', type: 'textarea', required: false, novelHidden: true  },
    ],
    '아이템': [
      { key: 'name',        label: '이름',     type: 'text',     required: true,  novelHidden: false },
      { key: 'grade',       label: '등급',     type: 'select',   required: true,  novelHidden: false, options: ['F','E','D','C','B','A','S','SS','SSS','G','GG','GGG','EX'] },
      { key: 'type',        label: '타입',     type: 'select',   required: false, novelHidden: false, options: ['무기','방어구','소비','재료','특수','탑전용','장신구','기타'] },
      { key: 'effects',     label: '효과',     type: 'textarea', required: true,  novelHidden: false },
      { key: 'description', label: '설명',     type: 'textarea', required: false, novelHidden: false },
      { key: 'source',      label: '획득처',   type: 'textarea', required: false, novelHidden: false },
      { key: 'authorNotes', label: '작가메모', type: 'textarea', required: false, novelHidden: true  },
    ],
    '직업': [
      { key: 'name',        label: '이름',     type: 'text',     required: true,  novelHidden: false },
      { key: 'grade',       label: '등급',     type: 'select',   required: true,  novelHidden: false, options: ['F','E','D','C','B','A','S','SS','SSS','G','GG','GGG','EX'] },
      { key: 'type',        label: '계열',     type: 'select',   required: false, novelHidden: false, options: ['근접','원거리','서포트','후방 지원','전략','올라운더'] },
      { key: 'effects',     label: '효과',     type: 'textarea', required: true,  novelHidden: false },
      { key: 'skillList',   label: '스킬목록', type: 'textarea', required: false, novelHidden: false },
      { key: 'description', label: '설명',     type: 'textarea', required: false, novelHidden: false },
      { key: 'authorNotes', label: '작가메모', type: 'textarea', required: false, novelHidden: true  },
    ],
    '업적': [
      { key: 'name',        label: '이름',     type: 'text',     required: true,  novelHidden: false },
      { key: 'grade',       label: '등급',     type: 'select',   required: true,  novelHidden: false, options: ['F','E','D','C','B','A','S','SS','SSS','G','GG','GGG','EX'] },
      { key: 'condition',   label: '달성조건', type: 'textarea', required: false, novelHidden: false },
      { key: 'reward',      label: '보상',     type: 'textarea', required: false, novelHidden: false },
      { key: 'description', label: '설명',     type: 'textarea', required: false, novelHidden: false },
      { key: 'authorNotes', label: '작가메모', type: 'textarea', required: false, novelHidden: true  },
    ],
    '게이트': [
      { key: 'name',           label: '이름',           type: 'text',     required: true,  novelHidden: false },
      { key: 'trueName',       label: '진명',           type: 'text',     required: false, novelHidden: false },
      { key: 'grade',          label: '등급',           type: 'select',   required: true,  novelHidden: false, options: ['F','E','D','C','B','A','S','SS','SSS','G','EX'] },
      { key: 'kind',           label: '종류',           type: 'text',     required: false, novelHidden: false },
      { key: 'motif',          label: '모티브',         type: 'text',     required: false, novelHidden: false },
      { key: 'levelLimit',     label: '레벨제한',       type: 'number',   required: false, novelHidden: false },
      { key: 'maxMembers',     label: '최대인원',       type: 'number',   required: false, novelHidden: false },
      { key: 'enemies',        label: '적',             type: 'textarea', required: false, novelHidden: false },
      { key: 'features',       label: '특징',           type: 'textarea', required: false, novelHidden: false },
      { key: 'clearCondition', label: '클리어조건',     type: 'textarea', required: false, novelHidden: false },
      { key: 'failPenalty',    label: '실패패널티',     type: 'textarea', required: false, novelHidden: false },
      { key: 'reward',         label: '보상',           type: 'textarea', required: false, novelHidden: false },
      { key: 'hiddenClear',    label: '히든클리어조건', type: 'textarea', required: false, novelHidden: true  },
      { key: 'hiddenReward',   label: '히든보상',       type: 'textarea', required: false, novelHidden: true  },
      { key: 'breakType',      label: '브레이크유형',   type: 'text',     required: false, novelHidden: false },
      { key: 'authorNotes',    label: '작가메모',       type: 'textarea', required: false, novelHidden: true  },
    ],
    '몬스터': [
      { key: 'name',        label: '이름',     type: 'text',     required: true,  novelHidden: false },
      { key: 'grade',       label: '등급',     type: 'select',   required: true,  novelHidden: false, options: ['F','E','D','C','B','A','S','SS','SSS','G'] },
      { key: 'lifespan',    label: '수명',     type: 'text',     required: false, novelHidden: false },
      { key: 'features',    label: '특징',     type: 'textarea', required: false, novelHidden: false },
      { key: 'strengths',   label: '강점',     type: 'textarea', required: false, novelHidden: false },
      { key: 'weaknesses',  label: '약점',     type: 'textarea', required: false, novelHidden: false },
      { key: 'habitat',     label: '서식지역', type: 'textarea', required: false, novelHidden: false },
      { key: 'loot',        label: '전리품',   type: 'textarea', required: false, novelHidden: false },
      { key: 'skillList',   label: '스킬목록', type: 'textarea', required: false, novelHidden: false },
      { key: 'deathType',   label: '죽음유형', type: 'text',     required: false, novelHidden: false },
      { key: 'authorNotes', label: '작가메모', type: 'textarea', required: false, novelHidden: true  },
    ],
    '성좌': [
      { key: 'name',        label: '이름',     type: 'text',     required: true,  novelHidden: false },
      { key: 'series',      label: '계열',     type: 'text',     required: false, novelHidden: false },
      { key: 'grade',       label: '등급',     type: 'select',   required: true,  novelHidden: false, options: ['하급','중급','상급','최상급','신급'] },
      { key: 'attribute',   label: '속성',     type: 'select',   required: false, novelHidden: false, options: ['없음','화염','물','땅','바람','뇨','성화','청화','백화','빙화','빙','흑뢰','적뢰','공간','이능','신성','타락'] },
      { key: 'hierarchy',   label: '위계',     type: 'text',     required: false, novelHidden: false },
      { key: 'domain',      label: '담당영역', type: 'textarea', required: false, novelHidden: false },
      { key: 'appearance',  label: '외형',     type: 'textarea', required: false, novelHidden: false },
      { key: 'features',    label: '특징',     type: 'textarea', required: false, novelHidden: false },
      { key: 'abilities',   label: '능력',     type: 'textarea', required: false, novelHidden: false },
      { key: 'weaknesses',  label: '약점',     type: 'textarea', required: false, novelHidden: true  },
      { key: 'authorNotes', label: '작가메모', type: 'textarea', required: false, novelHidden: true  },
    ],
    '감정': [
      { key: 'name',        label: '이름',     type: 'text',     required: true,  novelHidden: false },
      { key: 'grade',       label: '등급',     type: 'select',   required: false, novelHidden: false, options: ['F','E','D','C','B','A','S','SS','SSS','EX'] },
      { key: 'form',        label: '형태',     type: 'text',     required: false, novelHidden: false },
      { key: 'effects',     label: '효과',     type: 'textarea', required: false, novelHidden: false },
      { key: 'description', label: '설명',     type: 'textarea', required: false, novelHidden: false },
    ],
    '직업_소설': [
      { key: 'name',        label: '이름',     type: 'text',     required: true,  novelHidden: false },
      { key: 'grade',       label: '등급',     type: 'select',   required: false, novelHidden: false, options: ['F','E','D','C','B','A','S','SS','SSS','EX'] },
      { key: 'effects',     label: '효과',     type: 'textarea', required: false, novelHidden: false },
      { key: 'description', label: '설명',     type: 'textarea', required: false, novelHidden: false },
    ],
    '던전_소설': [
      { key: 'name',        label: '이름',     type: 'text',     required: true,  novelHidden: false },
      { key: 'grade',       label: '등급',     type: 'select',   required: false, novelHidden: false, options: ['F','E','D','C','B','A','S','SS','SSS','EX'] },
      { key: 'levelLimit',  label: '레벨제한', type: 'number',   required: false, novelHidden: false },
      { key: 'maxMembers',  label: '최대인원', type: 'number',   required: false, novelHidden: false },
      { key: 'scale',       label: '규모',     type: 'text',     required: false, novelHidden: false },
      { key: 'strategy',    label: '공략방법', type: 'textarea', required: false, novelHidden: false },
      { key: 'interior',    label: '내부구성', type: 'textarea', required: false, novelHidden: false },
      { key: 'details',     label: '세부사항', type: 'textarea', required: false, novelHidden: false },
      { key: 'description', label: '설명',     type: 'textarea', required: false, novelHidden: false },
    ],
    '상태창': [
      { key: 'level',           label: '레벨',     type: 'number',   required: false, novelHidden: false },
      { key: 'title',           label: '핵심칭호', type: 'text',     required: false, novelHidden: false },
      { key: 'name',            label: '이름',     type: 'text',     required: true,  novelHidden: false },
      { key: 'nation',          label: '국가',     type: 'text',     required: false, novelHidden: false },
      { key: 'guild',           label: '길드',     type: 'text',     required: false, novelHidden: false },
      { key: 'race',            label: '종족',     type: 'text',     required: false, novelHidden: false },
      { key: 'age',             label: '나이',     type: 'number',   required: false, novelHidden: false },
      { key: 'gender',          label: '성별',     type: 'text',     required: false, novelHidden: false },
      { key: 'achievementList', label: '보유칭호', type: 'textarea', required: false, novelHidden: false },
      { key: 'statList',        label: '스텟목록', type: 'textarea', required: false, novelHidden: false },
      { key: 'skillList',       label: '스킬목록', type: 'textarea', required: false, novelHidden: false },
    ],
  },

  // ── Init ────────────────────────────────────────────────────────────────────
  init: async function(container, options) {
    options = options || {};
    this._container = container;
    const [savedType, savedTab, savedConstKey] = await Promise.all([
      DB.getSetting('template_lastSelectedType', null),
      DB.getSetting('template_lastTab', 'fields'),
      DB.getSetting('template_lastConstKey', 'grades'),
    ]);
    this._selectedType = savedType || this.ENTITY_TYPES[0].key;
    this._activeTab = savedTab;
    this._selectedConstKey = savedConstKey;
    await this._render(container);
  },

  _render: async function(container) {
    const self = this;
    const tabBtnStyle = (active) =>
      `padding:7px 16px;border-radius:6px;border:none;cursor:pointer;font-size:13px;font-weight:${active ? '700' : '400'};` +
      `background:${active ? 'var(--color-primary)' : 'var(--color-surface2)'};` +
      `color:${active ? '#000' : 'var(--color-text-muted)'};transition:background .15s;`;

    const tabHeader = `
      <div style="display:flex;gap:6px;margin-bottom:16px;position:sticky;top:0;z-index:20;background:var(--color-bg);padding:12px 0 4px;">
        <button id="tabFieldsBtn" style="${tabBtnStyle(this._activeTab === 'fields')}">📋 항목 입력 양식</button>
        <button id="tabConstBtn"  style="${tabBtnStyle(this._activeTab === 'constants')}">⚙️ 선택지/목록 관리</button>
        <button id="tabGateBtn"   style="${tabBtnStyle(this._activeTab === 'gate')}">🌀 게이트 목록</button>
      </div>`;

    container.innerHTML = `<div class="page active"><div class="page-header"><h2 class="page-title">기본 설정 관리</h2></div>${tabHeader}<div id="tabContent"></div></div>`;

    container.querySelector('#tabFieldsBtn')?.addEventListener('click', async () => {
      self._activeTab = 'fields';
      await DB.setSetting('template_lastTab', 'fields');
      await self._render(container);
    });
    container.querySelector('#tabConstBtn')?.addEventListener('click', async () => {
      self._activeTab = 'constants';
      await DB.setSetting('template_lastTab', 'constants');
      await self._render(container);
    });
    container.querySelector('#tabGateBtn')?.addEventListener('click', async () => {
      self._activeTab = 'gate';
      await DB.setSetting('template_lastTab', 'gate');
      await self._render(container);
    });

    const tabContent = container.querySelector('#tabContent');
    if (this._activeTab === 'fields') {
      await this._renderFieldsTab(tabContent, container);
    } else if (this._activeTab === 'gate') {
      await this._renderGateListTab(tabContent, container);
    } else {
      await this._renderConstantsTab(tabContent, container);
    }
  },

  // ── Fields tab ──────────────────────────────────────────────────────────────
  _renderFieldsTab: async function(tabContent, container) {
    const self = this;
    const selType = this._selectedType;
    const entityInfo = this.ENTITY_TYPES.find(e => e.key === selType);
    const defaultFields = this.DEFAULT_TEMPLATES[selType] || [];
    const savedFields = await DB.getSetting('template_' + selType, null);
    const fields = savedFields ? JSON.parse(JSON.stringify(savedFields)) : JSON.parse(JSON.stringify(defaultFields));

    const groups = {};
    this.ENTITY_TYPES.forEach(et => {
      if (!groups[et.group]) groups[et.group] = [];
      groups[et.group].push(et);
    });

    tabContent.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:12px;">
        <button class="btn btn-primary btn-sm" id="btnSaveTemplate">저장</button>
      </div>

      <div style="margin-bottom:16px;">
        ${Object.entries(groups).map(([groupName, types]) => `
          <div style="margin-bottom:8px;">
            <div style="font-size:10px;color:var(--color-text-dim);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:5px;padding-left:2px;">${Utils.escHtml(groupName)}</div>
            <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;-webkit-overflow-scrolling:touch;">
              ${types.map(et => `
                <button class="filter-chip" data-etype="${Utils.escHtml(et.key)}"
                  style="display:flex;align-items:center;gap:4px;padding:6px 12px;border-radius:8px;border:1px solid var(--color-border);cursor:pointer;font-size:12px;flex-shrink:0;transition:background .15s;${et.key === selType ? 'background:var(--color-primary);color:#000;border-color:var(--color-primary);' : 'background:var(--color-surface2);color:var(--color-text);'}">
                  <span>${et.icon}</span><span>${Utils.escHtml(et.label)}</span>
                </button>`).join('')}
            </div>
          </div>`).join('')}
      </div>

      <div style="background:var(--color-surface2);border-radius:12px;padding:16px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <div style="font-weight:700;font-size:14px;">${entityInfo ? entityInfo.icon + ' ' + entityInfo.label : ''} 필드 목록</div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" id="btnAddField">+ 필드 추가</button>
            <button class="btn btn-ghost btn-sm" id="btnResetTemplate" style="color:var(--color-warning);">기본값 복원</button>
          </div>
        </div>
        <div id="fieldList">
          ${fields.length === 0
            ? `<div style="text-align:center;padding:24px;color:var(--color-text-muted);font-size:13px;">필드가 없습니다.</div>`
            : fields.map((f, i) => self._fieldRow(f, i, fields.length)).join('')}
        </div>
      </div>

      <div style="padding:12px 14px;background:rgba(59,130,246,0.08);border-left:3px solid var(--color-primary);border-radius:6px;font-size:12px;color:var(--color-text-muted);line-height:1.7;margin-bottom:80px;">
        <strong style="color:var(--color-primary);">템플릿 안내</strong><br>
        · <strong>필수</strong>: 비어 있으면 목록에 ⚠️ 표시됩니다.<br>
        · <strong>소설 뷰 숨김</strong>: 소설 뷰에서 숨겨집니다 (작가메모 등).<br>
        · 템플릿 변경은 기존 저장 데이터를 삭제하지 않습니다.
      </div>`;

    tabContent.querySelectorAll('.filter-chip[data-etype]').forEach(btn => {
      btn.addEventListener('click', async () => {
        self._selectedType = btn.dataset.etype;
        await DB.setSetting('template_lastSelectedType', self._selectedType);
        await self._renderFieldsTab(tabContent, container);
      });
    });

    tabContent.querySelector('#btnAddField')?.addEventListener('click', () => {
      self._openFieldForm(null, fields, selType, tabContent, container);
    });
    tabContent.querySelector('#btnSaveTemplate')?.addEventListener('click', async () => {
      await DB.setSetting('template_' + selType, fields);
      Utils.toast('템플릿 저장됨', 'success');
    });
    tabContent.querySelector('#btnResetTemplate')?.addEventListener('click', () => {
      Utils.confirm('기본값으로 복원', '현재 템플릿 설정을 기본값으로 되돌리시겠습니까?', async () => {
        await DB.setSetting('template_' + selType, null);
        Utils.toast('기본값으로 복원됨', 'info');
        await self._renderFieldsTab(tabContent, container);
      }, '복원');
    });

    tabContent.querySelectorAll('.btn-edit-field').forEach(btn => {
      btn.addEventListener('click', () => {
        self._openFieldForm(Number(btn.dataset.fi), fields, selType, tabContent, container);
      });
    });
    tabContent.querySelectorAll('.btn-del-field').forEach(btn => {
      btn.addEventListener('click', async () => {
        fields.splice(Number(btn.dataset.fi), 1);
        await DB.setSetting('template_' + selType, fields);
        await self._renderFieldsTab(tabContent, container);
        Utils.toast('필드 삭제됨', 'info');
      });
    });
    tabContent.querySelectorAll('.btn-move-up').forEach(btn => {
      btn.addEventListener('click', async () => {
        const i = Number(btn.dataset.fi);
        if (i === 0) return;
        [fields[i - 1], fields[i]] = [fields[i], fields[i - 1]];
        await DB.setSetting('template_' + selType, fields);
        await self._renderFieldsTab(tabContent, container);
      });
    });
    tabContent.querySelectorAll('.btn-move-down').forEach(btn => {
      btn.addEventListener('click', async () => {
        const i = Number(btn.dataset.fi);
        if (i >= fields.length - 1) return;
        [fields[i], fields[i + 1]] = [fields[i + 1], fields[i]];
        await DB.setSetting('template_' + selType, fields);
        await self._renderFieldsTab(tabContent, container);
      });
    });
    tabContent.querySelectorAll('.toggle-required').forEach(cb => {
      cb.addEventListener('change', () => { fields[Number(cb.dataset.fi)].required = cb.checked; });
    });
    tabContent.querySelectorAll('.toggle-novel-hidden').forEach(cb => {
      cb.addEventListener('change', () => { fields[Number(cb.dataset.fi)].novelHidden = cb.checked; });
    });
  },

  // ── Constants tab ────────────────────────────────────────────────────────────
  _renderConstantsTab: async function(tabContent, container) {
    const self = this;
    const selKey = this._selectedConstKey;
    const constDef = this.CONST_DEFS.find(c => c.key === selKey);
    const defaultValues = AppConstants.DEFAULTS[selKey] || [];
    const savedValues = await DB.getSetting('const_' + selKey, null);
    const values = savedValues ? [...savedValues] : [...defaultValues];

    tabContent.innerHTML = `
      <!-- Constant selector chips -->
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
        ${this.CONST_DEFS.map(cd => `
          <button class="const-sel-chip" data-ckey="${Utils.escHtml(cd.key)}"
            style="display:flex;align-items:center;gap:4px;padding:5px 10px;border-radius:8px;border:1px solid var(--color-border);cursor:pointer;font-size:12px;flex-shrink:0;transition:background .15s;${cd.key === selKey ? 'background:var(--color-primary);color:#000;border-color:var(--color-primary);' : 'background:var(--color-surface2);color:var(--color-text);'}">
            <span>${cd.icon}</span><span>${Utils.escHtml(cd.label)}</span>
          </button>`).join('')}
      </div>

      <!-- Editor panel -->
      <div style="background:var(--color-surface2);border-radius:12px;padding:16px;margin-bottom:16px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px;flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-weight:700;font-size:14px;">${constDef ? constDef.icon + ' ' + constDef.label : selKey}</div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">${Utils.escHtml(constDef?.desc || '')}</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" id="btnResetConst" style="color:var(--color-warning);">기본값 복원</button>
            <button class="btn btn-primary btn-sm" id="btnSaveConst">저장</button>
          </div>
        </div>

        <div style="font-size:11px;color:var(--color-text-dim);margin-bottom:12px;padding:6px 10px;background:rgba(245,158,11,0.08);border-radius:5px;border-left:3px solid var(--color-warning);">
          저장하면 모든 페이지의 필터·폼에 즉시 반영됩니다. (기존 데이터 값은 유지됩니다.)
        </div>

        <!-- Value rows -->
        <div id="constValList" style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px;"></div>

        <!-- Add new value -->
        <div style="display:flex;gap:6px;align-items:center;">
          <input id="constNewVal" class="input-field" placeholder="새 값 입력..." style="flex:1;box-sizing:border-box;" />
          <button class="btn btn-ghost btn-sm" id="btnAddConstVal">+ 추가</button>
        </div>
      </div>

      <div style="padding:12px 14px;background:rgba(59,130,246,0.08);border-left:3px solid var(--color-primary);border-radius:6px;font-size:12px;color:var(--color-text-muted);line-height:1.7;margin-bottom:80px;">
        <strong style="color:var(--color-primary);">전역 상수 안내</strong><br>
        · 여기서 설정한 값들은 각 페이지의 필터 칩, 등급 선택, 계열 선택 등에 사용됩니다.<br>
        · 기존에 저장된 데이터의 값은 바뀌지 않습니다 (필터에서 안 보일 수 있음).<br>
        · 순서를 조정하면 드롭다운 표시 순서도 바뀝니다.
      </div>`;

    // Render value rows
    const listEl = tabContent.querySelector('#constValList');
    function renderRows() {
      if (!listEl) return;
      listEl.innerHTML = values.map((v, i) => `
        <div class="const-val-row" data-idx="${i}"
          style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--color-bg);border-radius:6px;border:1px solid var(--color-border);">
          <div style="display:flex;flex-direction:column;gap:2px;">
            <button class="btn btn-ghost const-up" data-idx="${i}" style="padding:1px 5px;font-size:10px;line-height:1.4;" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn btn-ghost const-down" data-idx="${i}" style="padding:1px 5px;font-size:10px;line-height:1.4;" ${i === values.length - 1 ? 'disabled' : ''}>↓</button>
          </div>
          <input class="input-field const-val-input" data-idx="${i}" value="${Utils.escHtml(v)}"
            style="flex:1;box-sizing:border-box;font-size:13px;" />
          <button class="btn btn-ghost const-del" data-idx="${i}" style="color:var(--color-danger);padding:4px 8px;font-size:13px;">×</button>
        </div>`).join('');

      listEl.querySelectorAll('.const-up').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = Number(btn.dataset.idx);
          if (i === 0) return;
          [values[i - 1], values[i]] = [values[i], values[i - 1]];
          renderRows();
        });
      });
      listEl.querySelectorAll('.const-down').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = Number(btn.dataset.idx);
          if (i >= values.length - 1) return;
          [values[i], values[i + 1]] = [values[i + 1], values[i]];
          renderRows();
        });
      });
      listEl.querySelectorAll('.const-del').forEach(btn => {
        btn.addEventListener('click', () => {
          values.splice(Number(btn.dataset.idx), 1);
          renderRows();
        });
      });
      listEl.querySelectorAll('.const-val-input').forEach(inp => {
        inp.addEventListener('input', () => {
          values[Number(inp.dataset.idx)] = inp.value;
        });
      });
    }
    renderRows();

    // Const selector chips
    tabContent.querySelectorAll('.const-sel-chip').forEach(btn => {
      btn.addEventListener('click', async () => {
        self._selectedConstKey = btn.dataset.ckey;
        await DB.setSetting('template_lastConstKey', self._selectedConstKey);
        await self._renderConstantsTab(tabContent, container);
      });
    });

    // Add value
    tabContent.querySelector('#btnAddConstVal')?.addEventListener('click', () => {
      const inp = tabContent.querySelector('#constNewVal');
      const val = inp?.value.trim();
      if (!val) return;
      if (values.includes(val)) { Utils.toast('이미 존재하는 값입니다', 'error'); return; }
      values.push(val);
      renderRows();
      if (inp) inp.value = '';
    });
    tabContent.querySelector('#constNewVal')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { tabContent.querySelector('#btnAddConstVal')?.click(); }
    });

    // Save
    tabContent.querySelector('#btnSaveConst')?.addEventListener('click', async () => {
      const currentValues = values.map((_, i) => {
        const inp = listEl?.querySelector(`.const-val-input[data-idx="${i}"]`);
        return inp ? inp.value.trim() : values[i];
      }).filter(Boolean);
      await DB.setSetting('const_' + selKey, currentValues);
      AppConstants.invalidate();
      values.length = 0;
      currentValues.forEach(v => values.push(v));
      Utils.toast('저장됨 — 페이지 재방문 시 적용됩니다', 'success');
    });

    // Reset
    tabContent.querySelector('#btnResetConst')?.addEventListener('click', () => {
      Utils.confirm('기본값으로 복원', `'${constDef?.label || selKey}'을(를) 기본값으로 되돌리시겠습니까?`, async () => {
        await DB.setSetting('const_' + selKey, null);
        AppConstants.invalidate();
        Utils.toast('기본값으로 복원됨', 'info');
        await self._renderConstantsTab(tabContent, container);
      }, '복원');
    });
  },

  // ── Field row render helper ─────────────────────────────────────────────────
  _fieldRow: function(f, i, total) {
    const isFirst = i === 0;
    const isLast = i === total - 1;
    const typeBadgeColor = {
      'text': '#3b82f6', 'textarea': '#8b5cf6', 'number': '#10b981',
      'select': '#f59e0b', 'boolean': '#ec4899'
    }[f.type] || '#6b7280';

    return `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:var(--color-bg);border-radius:8px;margin-bottom:6px;border:1px solid var(--color-border);">
      <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0;padding-top:2px;">
        <button class="btn btn-ghost btn-move-up"   data-fi="${i}" style="padding:2px 6px;font-size:11px;line-height:1.4;" ${isFirst ? 'disabled' : ''}>↑</button>
        <button class="btn btn-ghost btn-move-down" data-fi="${i}" style="padding:2px 6px;font-size:11px;line-height:1.4;" ${isLast  ? 'disabled' : ''}>↓</button>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
          <span style="font-weight:600;font-size:13px;">${Utils.escHtml(f.label || f.key)}</span>
          <span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${typeBadgeColor}22;color:${typeBadgeColor};border:1px solid ${typeBadgeColor}44;">${f.type}</span>
          ${f.required    ? '<span style="font-size:10px;padding:1px 5px;background:#ef444422;color:#ef4444;border-radius:3px;border:1px solid #ef444444;">필수</span>' : ''}
          ${f.novelHidden ? '<span style="font-size:10px;padding:1px 5px;background:#6b728022;color:#9ca3af;border-radius:3px;border:1px solid #6b728044;">소설숨김</span>' : ''}
        </div>
        <div style="font-size:11px;color:var(--color-text-dim);">
          key: <code>${Utils.escHtml(f.key)}</code>
          ${f.options && f.options.length ? ' · 옵션: ' + f.options.slice(0, 5).map(Utils.escHtml).join(', ') + (f.options.length > 5 ? '...' : '') : ''}
        </div>
        <div style="display:flex;gap:12px;margin-top:6px;">
          <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;">
            <input type="checkbox" class="toggle-required"     data-fi="${i}" ${f.required    ? 'checked' : ''} /> 필수
          </label>
          <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;">
            <input type="checkbox" class="toggle-novel-hidden" data-fi="${i}" ${f.novelHidden ? 'checked' : ''} /> 소설 뷰 숨김
          </label>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm btn-edit-field" data-fi="${i}" style="font-size:11px;">편집</button>
        <button class="btn btn-ghost btn-sm btn-del-field"  data-fi="${i}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  // ── Field form modal ─────────────────────────────────────────────────────────
  _openFieldForm: function(editIndex, fields, selType, tabContent, container) {
    const self = this;
    const isEdit = editIndex !== null && editIndex !== undefined;
    const existing = isEdit ? fields[editIndex] : null;

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label class="form-label">필드 키 (영문) *</label>
          <input class="input-field" id="fFKey" value="${Utils.escHtml(existing?.key || '')}"
            placeholder="예: effects, damage, range" style="width:100%;box-sizing:border-box;font-family:monospace;" ${isEdit ? 'readonly' : ''} />
          <div style="font-size:11px;color:var(--color-text-dim);margin-top:3px;">데이터 저장 키. 영문/숫자만, 기존 키 변경 불가.</div>
        </div>
        <div class="form-group">
          <label class="form-label">표시 레이블 *</label>
          <input class="input-field" id="fFLabel" value="${Utils.escHtml(existing?.label || '')}"
            placeholder="예: 효과, 피해량, 사거리" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">필드 타입</label>
          <select class="select-input" id="fFType" style="width:100%;">
            ${this.FIELD_TYPES.map(t => `<option value="${t.value}" ${(existing?.type || 'text') === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">select 옵션 (쉼표 구분, select 타입에서만)</label>
          <input class="input-field" id="fFOptions" value="${Utils.escHtml((existing?.options || []).join(', '))}"
            placeholder="예: F, E, D, C, B, A, S" style="width:100%;box-sizing:border-box;" />
        </div>
        <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
            <input type="checkbox" id="fFRequired"    ${existing?.required    ? 'checked' : ''} /> 필수 항목
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
            <input type="checkbox" id="fFNovelHidden" ${existing?.novelHidden ? 'checked' : ''} /> 소설 뷰 숨김
          </label>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '필드 편집' : '필드 추가', body, async () => {
      const key   = document.getElementById('fFKey')?.value.trim();
      const label = document.getElementById('fFLabel')?.value.trim();
      if (!key || !label) { Utils.fieldError('fFKey', 'fFLabel'); return false; }
      if (!isEdit && fields.some(f => f.key === key)) { Utils.toast('이미 존재하는 키입니다', 'error'); return false; }

      const optStr  = document.getElementById('fFOptions')?.value.trim();
      const options = optStr ? optStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;

      const fieldObj = {
        key, label,
        type:        document.getElementById('fFType')?.value        || 'text',
        required:    document.getElementById('fFRequired')?.checked  || false,
        novelHidden: document.getElementById('fFNovelHidden')?.checked || false,
      };
      if (options && options.length) fieldObj.options = options;

      if (isEdit) { fields[editIndex] = fieldObj; } else { fields.push(fieldObj); }

      await DB.setSetting('template_' + selType, fields);
      Utils.toast(isEdit ? '필드 저장됨' : '필드 추가됨', 'success');
      await self._renderFieldsTab(tabContent, container);
      return true;
    }, isEdit ? '저장' : '추가');
  },

  // Public helper
  getTemplate: async function(entityType) {
    const stored = await DB.getSetting('template_' + entityType, null);
    return stored || this.DEFAULT_TEMPLATES[entityType] || [];
  },

  // ── Gate list tab ─────────────────────────────────────────────────────────────
  _renderGateListTab: async function(tabContent, container) {
    const self = this;
    const wid = AppStore.getCurrentWorldId();
    if (!wid) {
      tabContent.innerHTML = '<div style="padding:24px;text-align:center;color:var(--color-text-muted);">세계를 먼저 선택하세요</div>';
      return;
    }

    // Base types from gates.js
    const BASE_TYPES = ['섬멸형','토벌형','스토리형(개입)','스토리형(빙의)','타임어택형','퍼즐형','루프형','폐쇄형','보스형'];
    const BASE_BREAK = ['방출형','침식형','자폭형','소멸형'];

    const [savedCustomTypes, savedCustomBreak] = await Promise.all([
      DB.getSetting('gateCustomTypes_' + wid).then(v => v || []),
      DB.getSetting('gateCustomBreakTypes_' + wid).then(v => v || []),
    ]);

    // Merged lists (base + custom, base are read-only marked)
    let customTypes = [...savedCustomTypes];
    let customBreak = [...savedCustomBreak];

    const renderSection = (containerId, baseList, customList, label, color) => {
      const el = tabContent.querySelector('#' + containerId);
      if (!el) return;
      el.innerHTML = [
        ...baseList.map(v => `
          <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--color-bg);border-radius:6px;border:1px solid var(--color-border);margin-bottom:4px;">
            <span style="flex:1;font-size:13px;">${Utils.escHtml(v)}</span>
            <span style="font-size:10px;color:var(--color-text-dim);padding:1px 6px;border-radius:4px;background:var(--color-surface3);">기본</span>
          </div>`),
        ...customList.map((v, i) => `
          <div class="gate-custom-row" data-list="${containerId}" data-idx="${i}" style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--color-bg);border-radius:6px;border:1px solid var(--color-border);margin-bottom:4px;">
            <input class="input-field gate-custom-input" data-idx="${i}" data-list="${containerId}" value="${Utils.escHtml(v)}"
              style="flex:1;font-size:13px;box-sizing:border-box;" />
            <button class="btn-del-gate-custom btn btn-ghost btn-sm" data-idx="${i}" data-list="${containerId}"
              style="color:var(--color-danger);font-size:13px;padding:2px 6px;flex-shrink:0;">✕</button>
          </div>`),
      ].join('');

      el.querySelectorAll('.gate-custom-input').forEach(inp => {
        inp.addEventListener('input', () => {
          if (containerId === 'gateTypeList') customTypes[parseInt(inp.dataset.idx,10)] = inp.value;
          else customBreak[parseInt(inp.dataset.idx,10)] = inp.value;
        });
      });
      el.querySelectorAll('.btn-del-gate-custom').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = parseInt(btn.dataset.idx, 10);
          if (containerId === 'gateTypeList') customTypes.splice(i, 1);
          else customBreak.splice(i, 1);
          renderSection('gateTypeList', BASE_TYPES, customTypes, '게이트 종류', '#8b5cf6');
          renderSection('gateBreakList', BASE_BREAK, customBreak, '브레이크 유형', '#ef4444');
        });
      });
    };

    tabContent.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-size:12px;color:var(--color-text-muted);">커스텀 종류는 현재 세계에만 적용됩니다.</div>
        <button class="btn btn-primary btn-sm" id="btnSaveGateLists">저장</button>
      </div>

      <div style="background:var(--color-surface2);border-radius:12px;padding:14px 16px;margin-bottom:12px;">
        <div style="font-weight:700;font-size:13px;color:#8b5cf6;margin-bottom:10px;">🌀 게이트 종류</div>
        <div id="gateTypeList" style="margin-bottom:8px;"></div>
        <div style="display:flex;gap:6px;">
          <input id="newGateType" class="input-field" placeholder="새 종류 입력..." style="flex:1;box-sizing:border-box;" />
          <button class="btn btn-ghost btn-sm" id="btnAddGateType">+ 추가</button>
        </div>
      </div>

      <div style="background:var(--color-surface2);border-radius:12px;padding:14px 16px;margin-bottom:80px;">
        <div style="font-weight:700;font-size:13px;color:#ef4444;margin-bottom:10px;">💥 브레이크 유형</div>
        <div id="gateBreakList" style="margin-bottom:8px;"></div>
        <div style="display:flex;gap:6px;">
          <input id="newGateBreak" class="input-field" placeholder="새 유형 입력..." style="flex:1;box-sizing:border-box;" />
          <button class="btn btn-ghost btn-sm" id="btnAddGateBreak">+ 추가</button>
        </div>
      </div>`;

    renderSection('gateTypeList', BASE_TYPES, customTypes, '게이트 종류', '#8b5cf6');
    renderSection('gateBreakList', BASE_BREAK, customBreak, '브레이크 유형', '#ef4444');

    tabContent.querySelector('#btnAddGateType')?.addEventListener('click', () => {
      const inp = tabContent.querySelector('#newGateType');
      const val = inp?.value.trim();
      if (!val) return;
      if ([...BASE_TYPES, ...customTypes].includes(val)) { Utils.toast('이미 존재합니다', 'error'); return; }
      customTypes.push(val);
      renderSection('gateTypeList', BASE_TYPES, customTypes, '게이트 종류', '#8b5cf6');
      if (inp) inp.value = '';
    });
    tabContent.querySelector('#newGateType')?.addEventListener('keydown', e => { if (e.key === 'Enter') tabContent.querySelector('#btnAddGateType')?.click(); });

    tabContent.querySelector('#btnAddGateBreak')?.addEventListener('click', () => {
      const inp = tabContent.querySelector('#newGateBreak');
      const val = inp?.value.trim();
      if (!val) return;
      if ([...BASE_BREAK, ...customBreak].includes(val)) { Utils.toast('이미 존재합니다', 'error'); return; }
      customBreak.push(val);
      renderSection('gateBreakList', BASE_BREAK, customBreak, '브레이크 유형', '#ef4444');
      if (inp) inp.value = '';
    });
    tabContent.querySelector('#newGateBreak')?.addEventListener('keydown', e => { if (e.key === 'Enter') tabContent.querySelector('#btnAddGateBreak')?.click(); });

    tabContent.querySelector('#btnSaveGateLists')?.addEventListener('click', async () => {
      // Read current values from inputs
      const typeInputs = tabContent.querySelectorAll('#gateTypeList .gate-custom-input');
      const breakInputs = tabContent.querySelectorAll('#gateBreakList .gate-custom-input');
      const finalTypes = [...typeInputs].map(inp => inp.value.trim()).filter(Boolean);
      const finalBreak = [...breakInputs].map(inp => inp.value.trim()).filter(Boolean);
      await Promise.all([
        DB.setSetting('gateCustomTypes_' + wid, finalTypes),
        DB.setSetting('gateCustomBreakTypes_' + wid, finalBreak),
      ]);
      customTypes = finalTypes;
      customBreak = finalBreak;
      // Reload gates page custom lists if active
      if (window.Pages?.gates) {
        window.Pages.gates._customTypes = finalTypes;
        window.Pages.gates._customBreakTypes = finalBreak;
      }
      Utils.toast('게이트 목록 저장됨', 'success');
    });
  },

  destroy: function() {
    this._container = null;
    this._selectedType = null;
  }
};
