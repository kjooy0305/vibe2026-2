'use strict';
window.Pages = window.Pages || {};
window.Pages.gates = {
  _currentId: null,
  _container: null,
  _novelView: false,

  GRADES: ['F','E','D','C','B','A','S','SS','SSS','G','EX'],
  TYPES: ['섬멸형','토벌형','스토리형(개입)','스토리형(빙의)','타임어택형','퍼즐형','루프형','폐쇄형','보스형'],
  BREAK_TYPES: ['방출형','침식형','자폭형','소멸형'],

  init: async function(container, options) {
    options = options || {};
    this._container = container;
    const wid = AppStore.getCurrentWorldId();
    const world = AppStore.getState().currentWorld;

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
    const gates = await DB.getAll('gates', wid);

    if (this._currentId) {
      const gate = gates.find(g => g.id === this._currentId);
      if (gate) { this._renderDetail(container, gate, wid); return; }
    }

    this._renderList(container, gates, wid, world);
  },

  destroy: function() {
    this._currentId = null;
    this._novelView = false;
    this._container = null;
  },

  // ── LIST ────────────────────────────────────────────────────────────────────

  _renderList: function(container, gates, wid, world) {
    this._currentId = null;
    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">던전 (게이트)</h2>
          <button class="btn btn-primary btn-sm" id="btnAddGate">+ 추가</button>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} &middot; ${gates.length}개
        </p>
        <input class="input-field" id="gateFilter" placeholder="이름, 등급, 종류 검색..." style="margin-top:8px;" />
      </div>
      <div id="gateList" class="item-list">
        ${gates.length === 0 ? `
          <div class="empty-state" style="padding:48px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🚪</div>
            <div style="font-weight:700;font-size:16px;margin-bottom:4px;">던전이 없습니다</div>
            <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 첫 던전을 등록하세요</div>
          </div>
        ` : gates.map(g => this._gateCard(g)).join('')}
      </div>
    </div>`;

    document.getElementById('btnAddGate')?.addEventListener('click', () => {
      this._openForm(null, wid, container);
    });

    document.getElementById('gateFilter')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.gate-card').forEach(card => {
        const text = card.dataset.searchText || '';
        card.style.display = text.includes(q) ? '' : 'none';
      });
    });

    container.querySelectorAll('.gate-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-gate') || e.target.closest('.btn-edit-gate')) return;
        const id = card.dataset.id;
        DB.getAll('gates', wid).then(all => {
          const gate = all.find(g => g.id === id);
          if (gate) { this._currentId = id; this._renderDetail(container, gate, wid); }
        });
      });
    });

    container.querySelectorAll('.btn-edit-gate').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        DB.getAll('gates', wid).then(all => {
          const gate = all.find(g => g.id === id);
          if (gate) this._openForm(gate, wid, container);
        });
      });
    });

    container.querySelectorAll('.btn-del-gate').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const card = container.querySelector(`.gate-card[data-id="${id}"]`);
        const name = card?.querySelector('.gate-name')?.textContent || '이 던전';
        Utils.confirm(`"${name}"을(를) 삭제하시겠습니까?`, '되돌릴 수 없습니다.', async () => {
          await DB.del('gates', id);
          Utils.toast('삭제됨', 'info');
          this.init(container);
        });
      });
    });
  },

  _gateCard: function(g) {
    const searchText = [g.name || '', g.grade || '', g.type || '', g.breakType || ''].join(' ').toLowerCase();
    const gradeColor = Utils.gradeColor ? Utils.gradeColor(g.grade) : '#9ca3af';
    const isGradient = gradeColor && gradeColor.startsWith('linear');
    const gradeBadgeStyle = isGradient
      ? `background:${gradeColor};color:#fff;`
      : `background:${gradeColor}22;color:${gradeColor};border:1px solid ${gradeColor}66;`;

    return `
    <div class="list-item gate-card"
      data-id="${Utils.escHtml(g.id)}"
      data-search-text="${Utils.escHtml(searchText)}"
      style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--color-surface2);border-radius:12px;border:1px solid var(--color-border);margin-bottom:8px;cursor:pointer;">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
          <span class="gate-name" style="font-weight:700;font-size:15px;">${Utils.escHtml(g.name || '이름 없음')}</span>
          ${g.grade ? `<span style="font-size:11px;padding:2px 7px;border-radius:4px;font-weight:700;${gradeBadgeStyle}">${Utils.escHtml(g.grade)}</span>` : ''}
          ${g.type ? `<span style="font-size:11px;padding:2px 7px;border-radius:4px;background:var(--color-surface3,#2a2a3a);color:var(--color-text-muted);border:1px solid var(--color-border);">${Utils.escHtml(g.type)}</span>` : ''}
          ${g.breakType ? `<span style="font-size:11px;padding:2px 7px;border-radius:4px;background:#ff444422;color:#ff8888;border:1px solid #ff444444;">${Utils.escHtml(g.breakType)}</span>` : ''}
        </div>
        ${g.motif ? `<div style="font-size:12px;color:var(--color-text-muted);">모티브: ${Utils.escHtml(g.motif)}</div>` : ''}
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;flex-direction:column;align-items:flex-end;">
        <button class="btn btn-ghost btn-sm btn-edit-gate" data-id="${Utils.escHtml(g.id)}" style="font-size:11px;">편집</button>
        <button class="btn btn-ghost btn-sm btn-del-gate" data-id="${Utils.escHtml(g.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  // ── DETAIL ──────────────────────────────────────────────────────────────────

  _renderDetail: function(container, gate, wid) {
    this._novelView = false;
    const gradeColor = Utils.gradeColor ? Utils.gradeColor(gate.grade) : '#9ca3af';
    const isGradient = gradeColor && gradeColor.startsWith('linear');
    const gradeBadgeStyle = isGradient
      ? `background:${gradeColor};color:#fff;`
      : `background:${gradeColor}22;color:${gradeColor};border:1px solid ${gradeColor}66;`;

    const field = (label, value, multiline) => {
      if (!value && value !== 0) return '';
      const content = multiline
        ? `<div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(value))}</div>`
        : `<div style="font-size:13px;">${Utils.escHtml(String(value))}</div>`;
      return `
        <div style="margin-bottom:10px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:2px;">${label}</div>
          ${content}
        </div>`;
    };

    const rewardsHtml = this._renderRewardsHtml(gate.rewards || '', wid);
    const hiddenRewardsHtml = this._renderRewardsHtml(gate.hiddenRewards || '', wid);

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackGates">← 목록</button>
          <h2 class="page-title" style="font-size:18px;">${Utils.escHtml(gate.name || '던전')}</h2>
          ${gate.grade ? `<span style="font-size:12px;padding:3px 9px;border-radius:6px;font-weight:700;${gradeBadgeStyle}">${Utils.escHtml(gate.grade)}</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditGate">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnCopyGate">텍스트 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnViewToggle">소설 뷰</button>
        </div>
      </div>

      <!-- AUTHOR VIEW -->
      <div id="gateAuthorView">
        <div style="background:var(--color-surface2);border-radius:10px;padding:16px;margin-bottom:10px;">
          <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:12px;letter-spacing:1px;">기본 정보</div>
          ${field('이름', gate.name)}
          ${field('진명', gate.trueName)}
          ${field('등급', gate.grade)}
          ${field('종류', gate.type)}
          ${field('브레이크 유형', gate.breakType)}
          ${field('모티브', gate.motif)}
          ${field('레벨 제한', gate.levelLimit)}
          ${field('최대 인원수', gate.maxPlayers)}
          ${field('규모', gate.scale)}
        </div>

        <div style="background:var(--color-surface2);border-radius:10px;padding:16px;margin-bottom:10px;">
          <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:12px;letter-spacing:1px;">내부 정보</div>
          ${field('적', gate.enemies, true)}
          ${field('특징', gate.features, true)}
          ${field('내부 구성', gate.internalStructure, true)}
          ${field('공략 방법', gate.strategy, true)}
        </div>

        <div style="background:var(--color-surface2);border-radius:10px;padding:16px;margin-bottom:10px;">
          <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:12px;letter-spacing:1px;">클리어 조건 &amp; 보상</div>
          ${field('클리어 조건', gate.clearCondition, true)}
          ${gate.rewards ? `
            <div style="margin-bottom:10px;">
              <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">보상</div>
              ${rewardsHtml}
            </div>` : ''}
          ${field('실패시 패널티', gate.failPenalty, true)}
        </div>

        <div style="background:rgba(255,200,50,0.08);border:1px solid rgba(255,200,50,0.25);border-radius:10px;padding:16px;margin-bottom:10px;">
          <div style="font-size:11px;color:#fbbf24;font-weight:700;margin-bottom:12px;letter-spacing:1px;">히든 정보 (작가 전용)</div>
          ${field('히든 클리어 조건', gate.hiddenClearCondition, true)}
          ${gate.hiddenRewards ? `
            <div style="margin-bottom:10px;">
              <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">히든 보상</div>
              ${hiddenRewardsHtml}
            </div>` : ''}
          ${field('세부사항', gate.details, true)}
          ${field('작가 메모', gate.authorNotes, true)}
        </div>
      </div>

      <!-- NOVEL VIEW -->
      <div id="gateNovelView" style="display:none;">
        <div style="background:rgba(20,30,70,0.9);border:2px solid rgba(80,120,255,0.5);border-radius:12px;padding:20px;font-size:14px;line-height:1.9;color:#ddeeff;">
          <div style="text-align:center;font-size:11px;color:rgba(120,160,255,0.6);letter-spacing:4px;margin-bottom:12px;">${'ㅡ'.repeat(14)}</div>
          <div style="text-align:center;font-size:16px;font-weight:700;color:#aaccff;margin-bottom:14px;">[던전 정보: ${Utils.escHtml(gate.name || '')}]</div>
          ${gate.grade ? `<div>ㅣ등급: <strong style="color:#ffe080;">${Utils.escHtml(gate.grade)}</strong></div>` : ''}
          ${gate.type ? `<div>ㅣ종류: ${Utils.escHtml(gate.type)}</div>` : ''}
          ${gate.breakType ? `<div>ㅣ브레이크 유형: ${Utils.escHtml(gate.breakType)}</div>` : ''}
          ${gate.motif ? `<div>ㅣ모티브: ${Utils.escHtml(gate.motif)}</div>` : ''}
          ${gate.levelLimit ? `<div>ㅣ레벨 제한: ${Utils.escHtml(String(gate.levelLimit))}</div>` : ''}
          ${gate.maxPlayers ? `<div>ㅣ최대 인원수: ${Utils.escHtml(String(gate.maxPlayers))}</div>` : ''}
          ${gate.scale ? `<div>ㅣ규모: ${Utils.escHtml(gate.scale)}</div>` : ''}
          ${gate.enemies ? `<div style="margin-top:8px;">ㅣ적<br><span style="white-space:pre-wrap;padding-left:12px;">${Utils.nl2br(Utils.escHtml(gate.enemies))}</span></div>` : ''}
          ${gate.features ? `<div style="margin-top:8px;">ㅣ특징<br><span style="white-space:pre-wrap;padding-left:12px;">${Utils.nl2br(Utils.escHtml(gate.features))}</span></div>` : ''}
          ${gate.clearCondition ? `<div style="margin-top:8px;">ㅣ클리어 조건<br><span style="white-space:pre-wrap;padding-left:12px;">${Utils.nl2br(Utils.escHtml(gate.clearCondition))}</span></div>` : ''}
          ${gate.rewards ? `<div style="margin-top:8px;">ㅣ보상: ${Utils.escHtml(gate.rewards)}</div>` : ''}
          ${gate.failPenalty ? `<div style="margin-top:8px;">ㅣ실패시 패널티<br><span style="white-space:pre-wrap;padding-left:12px;">${Utils.nl2br(Utils.escHtml(gate.failPenalty))}</span></div>` : ''}
          <div style="text-align:center;font-size:11px;color:rgba(120,160,255,0.6);letter-spacing:4px;margin-top:12px;">${'ㅡ'.repeat(14)}</div>
        </div>
      </div>
    </div>`;

    document.getElementById('btnBackGates')?.addEventListener('click', () => this.init(container));
    document.getElementById('btnEditGate')?.addEventListener('click', () => this._openForm(gate, wid, container));

    document.getElementById('btnCopyGate')?.addEventListener('click', () => {
      const text = this._exportText(gate);
      Utils.copyText(text);
      Utils.toast('복사됨', 'success');
    });

    document.getElementById('btnViewToggle')?.addEventListener('click', () => {
      this._novelView = !this._novelView;
      document.getElementById('gateAuthorView').style.display = this._novelView ? 'none' : 'block';
      document.getElementById('gateNovelView').style.display = this._novelView ? 'block' : 'none';
      document.getElementById('btnViewToggle').textContent = this._novelView ? '작가 뷰' : '소설 뷰';
    });

    // Item link clicks inside rewards
    container.querySelectorAll('.reward-item-link').forEach(link => {
      link.addEventListener('click', e => {
        const itemId = e.currentTarget.dataset.itemId;
        if (itemId) AppRouter.navigate('items', { highlightId: itemId });
      });
    });
  },

  _renderRewardsHtml: function(rewardText, wid) {
    if (!rewardText) return '';
    return `<div style="font-size:13px;white-space:pre-wrap;line-height:1.7;">${Utils.nl2br(Utils.escHtml(rewardText))}</div>`;
  },

  // ── FORM ────────────────────────────────────────────────────────────────────

  _openForm: function(gate, wid, container) {
    const isEdit = !!gate;
    const g = gate || {};

    const gradeOptions = this.GRADES.map(gr =>
      `<option value="${gr}" ${g.grade === gr ? 'selected' : ''}>${gr}</option>`).join('');
    const typeOptions = ['', ...this.TYPES].map(t =>
      `<option value="${t}" ${(g.type || '') === t ? 'selected' : ''}>${t || '선택 안 함'}</option>`).join('');
    const breakTypeOptions = ['', ...this.BREAK_TYPES].map(bt =>
      `<option value="${bt}" ${(g.breakType || '') === bt ? 'selected' : ''}>${bt || '선택 안 함'}</option>`).join('');

    const tf = (id, label, val, placeholder) => `
      <div class="form-group">
        <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">${label}</label>
        <input class="input-field" id="${id}" value="${Utils.escHtml(val || '')}" placeholder="${placeholder || ''}" style="width:100%;box-sizing:border-box;" />
      </div>`;

    const ta = (id, label, val, placeholder, rows) => `
      <div class="form-group">
        <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">${label}</label>
        <textarea class="input-field" id="${id}" rows="${rows || 3}" placeholder="${placeholder || ''}"
          style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(val || '')}</textarea>
      </div>`;

    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;max-height:70vh;overflow-y:auto;padding-right:4px;">
        ${tf('fGateName', '이름 *', g.name, '던전 이름')}
        ${tf('fGateTrueName', '진명 (소설 뷰에서 숨김)', g.trueName, '진명')}
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">등급</label>
          <select class="select-input" id="fGateGrade" style="width:100%;">${gradeOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">종류</label>
          <select class="select-input" id="fGateType" style="width:100%;">${typeOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">브레이크 유형</label>
          <select class="select-input" id="fGateBreakType" style="width:100%;">${breakTypeOptions}</select>
        </div>
        ${tf('fGateMotif', '모티브', g.motif, '모티브 설명')}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${tf('fGateLevelLimit', '레벨 제한', g.levelLimit, '예: 50')}
          ${tf('fGateMaxPlayers', '최대 인원수', g.maxPlayers, '예: 10')}
        </div>
        ${tf('fGateScale', '규모', g.scale, '예: 중규모')}
        ${ta('fGateEnemies', '적', g.enemies, '적 설명')}
        ${ta('fGateFeatures', '특징', g.features, '특징 설명', 4)}
        ${ta('fGateInternalStructure', '내부 구성', g.internalStructure, '내부 구성 설명', 3)}
        ${ta('fGateStrategy', '공략 방법', g.strategy, '공략 방법', 3)}
        ${ta('fGateClearCondition', '클리어 조건', g.clearCondition, '클리어 조건', 2)}
        ${ta('fGateRewards', '보상', g.rewards, '보상 내용 (아이템명 등)', 2)}
        ${ta('fGateFailPenalty', '실패시 패널티', g.failPenalty, '패널티 설명', 2)}
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;color:#fbbf24;font-weight:700;margin-bottom:8px;">히든 정보 (작가 전용)</div>
          ${ta('fGateHiddenClearCondition', '히든 클리어 조건', g.hiddenClearCondition, '히든 클리어 조건', 2)}
          ${ta('fGateHiddenRewards', '히든 보상', g.hiddenRewards, '히든 보상 내용', 2)}
          ${ta('fGateDetails', '세부사항', g.details, '추가 세부사항', 3)}
          ${ta('fGateAuthorNotes', '작가 메모', g.authorNotes, '작가만 보는 메모', 3)}
        </div>
      </div>`;

    Utils.openModal(isEdit ? '던전 편집' : '새 던전 추가', body, async () => {
      const name = document.getElementById('fGateName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }
      const data = {
        id: g.id || DB.genId(),
        worldId: wid,
        name,
        trueName: document.getElementById('fGateTrueName')?.value.trim() || '',
        grade: document.getElementById('fGateGrade')?.value || '',
        type: document.getElementById('fGateType')?.value || '',
        breakType: document.getElementById('fGateBreakType')?.value || '',
        motif: document.getElementById('fGateMotif')?.value.trim() || '',
        levelLimit: document.getElementById('fGateLevelLimit')?.value.trim() || '',
        maxPlayers: document.getElementById('fGateMaxPlayers')?.value.trim() || '',
        scale: document.getElementById('fGateScale')?.value.trim() || '',
        enemies: document.getElementById('fGateEnemies')?.value.trim() || '',
        features: document.getElementById('fGateFeatures')?.value.trim() || '',
        internalStructure: document.getElementById('fGateInternalStructure')?.value.trim() || '',
        strategy: document.getElementById('fGateStrategy')?.value.trim() || '',
        clearCondition: document.getElementById('fGateClearCondition')?.value.trim() || '',
        rewards: document.getElementById('fGateRewards')?.value.trim() || '',
        failPenalty: document.getElementById('fGateFailPenalty')?.value.trim() || '',
        hiddenClearCondition: document.getElementById('fGateHiddenClearCondition')?.value.trim() || '',
        hiddenRewards: document.getElementById('fGateHiddenRewards')?.value.trim() || '',
        details: document.getElementById('fGateDetails')?.value.trim() || '',
        authorNotes: document.getElementById('fGateAuthorNotes')?.value.trim() || '',
      };
      await DB.put('gates', data);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      this._currentId = data.id;
      const all = await DB.getAll('gates', wid);
      const updated = all.find(gg => gg.id === data.id);
      if (updated) this._renderDetail(container, updated, wid);
      else this.init(container);
      return true;
    }, isEdit ? '저장' : '추가');
  },

  // ── EXPORT ──────────────────────────────────────────────────────────────────

  _exportText: function(g) {
    const lines = [];
    const add = (label, val) => { if (val) lines.push(`${label}: ${val}`); };
    add('이름', g.name);
    if (g.trueName) lines.push(`진명: ${g.trueName}`);
    add('등급', g.grade);
    add('종류', g.type);
    add('브레이크 유형', g.breakType);
    add('모티브', g.motif);
    add('레벨 제한', g.levelLimit);
    add('최대 인원수', g.maxPlayers);
    add('규모', g.scale);
    if (g.enemies) lines.push(`적:\n${g.enemies}`);
    if (g.features) lines.push(`특징:\n${g.features}`);
    if (g.internalStructure) lines.push(`내부 구성:\n${g.internalStructure}`);
    if (g.strategy) lines.push(`공략 방법:\n${g.strategy}`);
    if (g.clearCondition) lines.push(`클리어 조건:\n${g.clearCondition}`);
    add('보상', g.rewards);
    if (g.failPenalty) lines.push(`실패시 패널티:\n${g.failPenalty}`);
    if (g.hiddenClearCondition) lines.push(`히든 클리어 조건:\n${g.hiddenClearCondition}`);
    add('히든 보상', g.hiddenRewards);
    if (g.details) lines.push(`세부사항:\n${g.details}`);
    if (g.authorNotes) lines.push(`작가 메모:\n${g.authorNotes}`);
    return lines.join('\n');
  },
};
