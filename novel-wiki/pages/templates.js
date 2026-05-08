'use strict';
window.Pages = window.Pages || {};
window.Pages.templates = {
  _container: null,
  _selectedType: null,

  // Groups: 월드 = wiki world-building entities, 소설내부 = in-novel items, 시스템 = status window
  ENTITY_TYPES: [
    { key: '스킬',    label: '스킬',              icon: '⚡', group: '월드' },
    { key: '아이템',  label: '아이템',            icon: '📦', group: '월드' },
    { key: '직업',    label: '직업',              icon: '⚔️', group: '월드' },
    { key: '업적',    label: '업적',              icon: '🏆', group: '월드' },
    { key: '게이트',  label: '게이트',            icon: '🌀', group: '월드' },
    { key: '몬스터',  label: '몬스터',            icon: '👾', group: '월드' },
    { key: '성좌',    label: '성좌',              icon: '✨', group: '월드' },
    { key: '감정',    label: '감정 (소설 내부)',   icon: '💜', group: '소설내부' },
    { key: '직업_소설', label: '직업 (소설 내부)', icon: '📖', group: '소설내부' },
    { key: '던전_소설', label: '던전 (소설 내부)', icon: '🏰', group: '소설내부' },
    { key: '상태창',  label: '상태창',            icon: '📊', group: '시스템' },
  ],

  FIELD_TYPES: [
    { value: 'text',     label: '텍스트 (한 줄)' },
    { value: 'textarea', label: '텍스트 (여러 줄)' },
    { value: 'number',   label: '숫자' },
    { value: 'select',   label: '선택 (드롭다운)' },
    { value: 'boolean',  label: '참/거짓 토글' },
  ],

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
      { key: 'type',        label: '타입',     type: 'select',   required: false, novelHidden: false, options: ['무기','방어구','소비','재료','특수','탑전용','기타'] },
      { key: 'effects',     label: '효과',     type: 'textarea', required: true,  novelHidden: false },
      { key: 'description', label: '설명',     type: 'textarea', required: false, novelHidden: false },
      { key: 'source',      label: '획득처',   type: 'textarea', required: false, novelHidden: false },
      { key: 'authorNotes', label: '작가메모', type: 'textarea', required: false, novelHidden: true  },
    ],
    '직업': [
      { key: 'name',        label: '이름',     type: 'text',     required: true,  novelHidden: false },
      { key: 'grade',       label: '등급',     type: 'select',   required: true,  novelHidden: false, options: ['F','E','D','C','B','A','S','SS','SSS','G','GG','GGG','EX'] },
      { key: 'type',        label: '타입',     type: 'text',     required: false, novelHidden: false },
      { key: 'effects',     label: '효과',     type: 'textarea', required: true,  novelHidden: false },
      { key: 'skillList',   label: '스킬목록', type: 'textarea', required: false, novelHidden: false },
      { key: 'description', label: '설명',     type: 'textarea', required: false, novelHidden: false },
      { key: 'authorNotes', label: '작가메모', type: 'textarea', required: false, novelHidden: true  },
    ],
    '업적': [
      { key: 'name',        label: '이름',       type: 'text',     required: true,  novelHidden: false },
      { key: 'grade',       label: '등급',       type: 'select',   required: true,  novelHidden: false, options: ['F','E','D','C','B','A','S','SS','SSS','EX'] },
      { key: 'condition',   label: '달성조건',   type: 'textarea', required: false, novelHidden: false },
      { key: 'reward',      label: '보상',       type: 'textarea', required: false, novelHidden: false },
      { key: 'description', label: '설명',       type: 'textarea', required: false, novelHidden: false },
      { key: 'authorNotes', label: '작가메모',   type: 'textarea', required: false, novelHidden: true  },
    ],
    '게이트': [
      { key: 'name',           label: '이름',           type: 'text',     required: true,  novelHidden: false },
      { key: 'trueName',       label: '진명',           type: 'text',     required: false, novelHidden: false },
      { key: 'grade',          label: '등급',           type: 'select',   required: true,  novelHidden: false, options: ['F','E','D','C','B','A','S','SS','SSS','EX'] },
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
      { key: 'grade',       label: '등급',     type: 'select',   required: true,  novelHidden: false, options: ['F','E','D','C','B','A','S','SS','SSS','EX'] },
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
      { key: 'title',           label: '칭호',     type: 'text',     required: false, novelHidden: false },
      { key: 'name',            label: '이름',     type: 'text',     required: true,  novelHidden: false },
      { key: 'nation',          label: '국가',     type: 'text',     required: false, novelHidden: false },
      { key: 'guild',           label: '길드',     type: 'text',     required: false, novelHidden: false },
      { key: 'race',            label: '종족',     type: 'text',     required: false, novelHidden: false },
      { key: 'age',             label: '나이',     type: 'number',   required: false, novelHidden: false },
      { key: 'gender',          label: '성별',     type: 'text',     required: false, novelHidden: false },
      { key: 'achievementList', label: '업적목록', type: 'textarea', required: false, novelHidden: false },
      { key: 'statList',        label: '스텟목록', type: 'textarea', required: false, novelHidden: false },
      { key: 'skillList',       label: '스킬목록', type: 'textarea', required: false, novelHidden: false },
    ],
  },

  init: async function(container, options) {
    options = options || {};
    this._container = container;

    const savedType = await DB.getSetting('template_lastSelectedType', null);
    this._selectedType = savedType || this.ENTITY_TYPES[0].key;

    await this._render(container);
  },

  _render: async function(container) {
    const self = this;
    const selType = this._selectedType;
    const entityInfo = this.ENTITY_TYPES.find(e => e.key === selType);
    const defaultFields = this.DEFAULT_TEMPLATES[selType] || [];
    const savedFields = await DB.getSetting('template_' + selType, null);
    const fields = savedFields ? JSON.parse(JSON.stringify(savedFields)) : JSON.parse(JSON.stringify(defaultFields));

    // Group entity types by group label
    const groups = {};
    this.ENTITY_TYPES.forEach(et => {
      if (!groups[et.group]) groups[et.group] = [];
      groups[et.group].push(et);
    });

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">템플릿 관리</h2>
          <button class="btn btn-primary btn-sm" id="btnSaveTemplate">저장</button>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          각 항목 유형의 필드를 설정합니다. 필수 항목이 비어 있으면 목록에 ⚠️ 표시됩니다.
        </p>
      </div>

      <!-- Entity type selector grouped -->
      <div style="margin-bottom:16px;">
        ${Object.entries(groups).map(([groupName, types]) => `
          <div style="margin-bottom:10px;">
            <div style="font-size:10px;color:var(--color-text-dim);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:6px;padding-left:2px;">${Utils.escHtml(groupName)}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${types.map(et => `
                <button class="filter-chip" data-etype="${Utils.escHtml(et.key)}"
                  style="display:flex;align-items:center;gap:4px;padding:6px 12px;border-radius:8px;border:1px solid var(--color-border);cursor:pointer;font-size:12px;transition:background 0.15s;${et.key === selType ? 'background:var(--color-primary);color:#000;border-color:var(--color-primary);' : 'background:var(--color-surface2);color:var(--color-text);'}">
                  <span>${et.icon}</span><span>${Utils.escHtml(et.label)}</span>
                </button>`).join('')}
            </div>
          </div>`).join('')}
      </div>

      <!-- Field list -->
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
            ? `<div style="text-align:center;padding:24px;color:var(--color-text-muted);font-size:13px;">필드가 없습니다. + 필드 추가를 눌러 시작하세요.</div>`
            : fields.map((f, i) => self._fieldRow(f, i, fields.length)).join('')}
        </div>
      </div>

      <!-- Info box -->
      <div style="padding:12px 14px;background:rgba(59,130,246,0.08);border-left:3px solid var(--color-primary);border-radius:6px;font-size:12px;color:var(--color-text-muted);line-height:1.7;margin-bottom:24px;">
        <strong style="color:var(--color-primary);">템플릿 안내</strong><br>
        · <strong>필수</strong>: 비어 있으면 목록에 ⚠️ 표시됩니다.<br>
        · <strong>소설 뷰 숨김</strong>: 소설 뷰에서 숨겨집니다 (작가메모 등).<br>
        · 템플릿 변경은 기존 저장 데이터를 삭제하지 않습니다.
      </div>
    </div>`;

    // Entity type switch
    container.querySelectorAll('.filter-chip[data-etype]').forEach(btn => {
      btn.addEventListener('click', async () => {
        self._selectedType = btn.dataset.etype;
        await DB.setSetting('template_lastSelectedType', self._selectedType);
        await self._render(container);
      });
    });

    // Add field button
    document.getElementById('btnAddField')?.addEventListener('click', () => {
      self._openFieldForm(null, fields, selType, container);
    });

    // Save template
    document.getElementById('btnSaveTemplate')?.addEventListener('click', async () => {
      await DB.setSetting('template_' + selType, fields);
      Utils.toast('템플릿 저장됨', 'success');
    });

    // Reset to default
    document.getElementById('btnResetTemplate')?.addEventListener('click', () => {
      Utils.confirm('기본값으로 복원', '현재 템플릿 설정을 기본값으로 되돌리시겠습니까?', async () => {
        await DB.setSetting('template_' + selType, null);
        Utils.toast('기본값으로 복원됨', 'info');
        await self._render(container);
      }, '복원');
    });

    // Field edit
    container.querySelectorAll('.btn-edit-field').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.fi);
        self._openFieldForm(i, fields, selType, container);
      });
    });

    // Field delete
    container.querySelectorAll('.btn-del-field').forEach(btn => {
      btn.addEventListener('click', async () => {
        const i = Number(btn.dataset.fi);
        fields.splice(i, 1);
        await DB.setSetting('template_' + selType, fields);
        await self._render(container);
        Utils.toast('필드 삭제됨', 'info');
      });
    });

    // Move up
    container.querySelectorAll('.btn-move-up').forEach(btn => {
      btn.addEventListener('click', async () => {
        const i = Number(btn.dataset.fi);
        if (i === 0) return;
        [fields[i - 1], fields[i]] = [fields[i], fields[i - 1]];
        await DB.setSetting('template_' + selType, fields);
        await self._render(container);
      });
    });

    // Move down
    container.querySelectorAll('.btn-move-down').forEach(btn => {
      btn.addEventListener('click', async () => {
        const i = Number(btn.dataset.fi);
        if (i >= fields.length - 1) return;
        [fields[i], fields[i + 1]] = [fields[i + 1], fields[i]];
        await DB.setSetting('template_' + selType, fields);
        await self._render(container);
      });
    });

    // Required toggle
    container.querySelectorAll('.toggle-required').forEach(cb => {
      cb.addEventListener('change', () => {
        const i = Number(cb.dataset.fi);
        fields[i].required = cb.checked;
      });
    });

    // Novel hidden toggle
    container.querySelectorAll('.toggle-novel-hidden').forEach(cb => {
      cb.addEventListener('change', () => {
        const i = Number(cb.dataset.fi);
        fields[i].novelHidden = cb.checked;
      });
    });
  },

  _fieldRow: function(f, i, total) {
    const isFirst = i === 0;
    const isLast = i === total - 1;
    const typeBadgeColor = {
      'text': '#3b82f6', 'textarea': '#8b5cf6', 'number': '#10b981',
      'select': '#f59e0b', 'boolean': '#ec4899'
    }[f.type] || '#6b7280';

    return `
    <div class="field-row-item" data-fi="${i}"
      style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;background:var(--color-bg);border-radius:8px;margin-bottom:6px;border:1px solid var(--color-border);">
      <!-- Move buttons -->
      <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0;padding-top:2px;">
        <button class="btn btn-ghost btn-move-up" data-fi="${i}" style="padding:2px 6px;font-size:11px;line-height:1.4;" ${isFirst ? 'disabled' : ''}>↑</button>
        <button class="btn btn-ghost btn-move-down" data-fi="${i}" style="padding:2px 6px;font-size:11px;line-height:1.4;" ${isLast ? 'disabled' : ''}>↓</button>
      </div>
      <!-- Field info -->
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
          <span style="font-weight:600;font-size:13px;">${Utils.escHtml(f.label || f.key)}</span>
          <span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${typeBadgeColor}22;color:${typeBadgeColor};border:1px solid ${typeBadgeColor}44;">${f.type}</span>
          ${f.required ? '<span style="font-size:10px;padding:1px 5px;background:#ef444422;color:#ef4444;border-radius:3px;border:1px solid #ef444444;">필수</span>' : ''}
          ${f.novelHidden ? '<span style="font-size:10px;padding:1px 5px;background:#6b728022;color:#9ca3af;border-radius:3px;border:1px solid #6b728044;">소설숨김</span>' : ''}
        </div>
        <div style="font-size:11px;color:var(--color-text-dim);">
          key: <code>${Utils.escHtml(f.key)}</code>
          ${f.options && f.options.length ? ' · 옵션: ' + f.options.slice(0, 5).map(Utils.escHtml).join(', ') + (f.options.length > 5 ? '...' : '') : ''}
        </div>
        <div style="display:flex;gap:12px;margin-top:6px;">
          <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;">
            <input type="checkbox" class="toggle-required" data-fi="${i}" ${f.required ? 'checked' : ''} />
            필수
          </label>
          <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;">
            <input type="checkbox" class="toggle-novel-hidden" data-fi="${i}" ${f.novelHidden ? 'checked' : ''} />
            소설 뷰 숨김
          </label>
        </div>
      </div>
      <!-- Actions -->
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm btn-edit-field" data-fi="${i}" style="font-size:11px;">편집</button>
        <button class="btn btn-ghost btn-sm btn-del-field" data-fi="${i}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  _openFieldForm: function(editIndex, fields, selType, container) {
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
          <label class="form-label">select 옵션 (쉼표 구분, select 타입에서만 사용)</label>
          <input class="input-field" id="fFOptions" value="${Utils.escHtml((existing?.options || []).join(', '))}"
            placeholder="예: F, E, D, C, B, A, S" style="width:100%;box-sizing:border-box;" />
        </div>
        <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
            <input type="checkbox" id="fFRequired" ${existing?.required ? 'checked' : ''} />
            필수 항목
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
            <input type="checkbox" id="fFNovelHidden" ${existing?.novelHidden ? 'checked' : ''} />
            소설 뷰 숨김
          </label>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '필드 편집' : '필드 추가', body, async () => {
      const key = document.getElementById('fFKey')?.value.trim();
      const label = document.getElementById('fFLabel')?.value.trim();
      if (!key || !label) { Utils.toast('키와 레이블을 입력하세요', 'error'); return false; }
      if (!isEdit && fields.some(f => f.key === key)) { Utils.toast('이미 존재하는 키입니다', 'error'); return false; }

      const optStr = document.getElementById('fFOptions')?.value.trim();
      const options = optStr ? optStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;

      const fieldObj = {
        key,
        label,
        type: document.getElementById('fFType')?.value || 'text',
        required: document.getElementById('fFRequired')?.checked || false,
        novelHidden: document.getElementById('fFNovelHidden')?.checked || false,
      };
      if (options && options.length) fieldObj.options = options;

      if (isEdit) {
        fields[editIndex] = fieldObj;
      } else {
        fields.push(fieldObj);
      }

      await DB.setSetting('template_' + selType, fields);
      Utils.toast(isEdit ? '필드 저장됨' : '필드 추가됨', 'success');
      await self._render(container);
      return true;
    }, isEdit ? '저장' : '추가');
  },

  // Public helper: get effective template for an entity type (stored or default)
  getTemplate: async function(entityType) {
    const stored = await DB.getSetting('template_' + entityType, null);
    return stored || this.DEFAULT_TEMPLATES[entityType] || [];
  },

  destroy: function() {
    this._container = null;
    this._selectedType = null;
  }
};
