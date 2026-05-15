'use strict';
window.Pages = window.Pages || {};
window.Pages.gates = {
  _currentId: null,
  _container: null,
  _novelView: false,

  _C: null,
  TYPES: ['섬멸형','토벌형','스토리형(개입)','스토리형(빙의)','타임어택형','퍼즐형','루프형','폐쇄형','보스형'],
  BREAK_TYPES: ['방출형','침식형','자폭형','소멸형'],

  _customTypes: null,
  _customBreakTypes: null,
  _listScrollY: 0,

  _loadCustomLists: async function(wid) {
    const ct = await DB.getSetting('gateCustomTypes_' + wid);
    const cbt = await DB.getSetting('gateCustomBreakTypes_' + wid);
    this._customTypes = ct || [];
    this._customBreakTypes = cbt || [];
  },

  _saveCustomType: async function(wid, value) {
    if (!value || this.TYPES.includes(value) || (this._customTypes || []).includes(value)) return;
    this._customTypes = [...(this._customTypes || []), value];
    await DB.setSetting('gateCustomTypes_' + wid, this._customTypes);
  },

  _saveCustomBreakType: async function(wid, value) {
    if (!value || this.BREAK_TYPES.includes(value) || (this._customBreakTypes || []).includes(value)) return;
    this._customBreakTypes = [...(this._customBreakTypes || []), value];
    await DB.setSetting('gateCustomBreakTypes_' + wid, this._customBreakTypes);
  },

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

    this._C = await AppConstants.load();
    if (options.highlightId) this._currentId = options.highlightId;
    const [gates] = await Promise.all([
      DB.getAll('gates', wid),
      this._loadCustomLists(wid),
    ]);

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
      const q = e.target.value;
      container.querySelectorAll('.gate-card').forEach(card => {
        card.style.display = Utils.matchesQuery(card.dataset.searchText || '', q) ? '' : 'none';
      });
    });

    container.querySelectorAll('.gate-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-gate') || e.target.closest('.btn-edit-gate')) return;
        const id = card.dataset.id;
        this._listScrollY = container.scrollTop || window.scrollY || 0;
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
        Utils.confirmWithInput(
          '던전 삭제',
          `삭제하려면 던전 이름을 정확히 입력하세요.\n삭제 후 되돌릴 수 없습니다.`,
          name,
          async () => {
            await DB.del('gates', id);
            Utils.toast('삭제됨', 'info');
            this.init(container);
          }
        );
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
    const images = Array.isArray(gate.images) ? gate.images : (gate.image ? [{ url: gate.image, caption: '' }] : []);
    const imagesHtml = images.length > 0
      ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
          ${images.map(img => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
              <img src="${img.url}" style="max-width:140px;max-height:140px;border-radius:8px;object-fit:cover;border:1px solid var(--color-border);" />
              ${img.caption ? `<div style="font-size:11px;color:var(--color-text-muted);max-width:140px;text-align:center;">${Utils.escHtml(img.caption)}</div>` : ''}
            </div>`).join('')}
        </div>`
      : '';

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
        ${imagesHtml}
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
          ${(gate.enemyRefs && gate.enemyRefs.length > 0) ? `
            <div style="margin-bottom:10px;">
              <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">몬스터/캐릭터 연결</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;">
                ${gate.enemyRefs.map(e => {
                  const icon = e.type === 'character' ? '👤' : '👾';
                  const gradeStr = e.grade ? ` (${Utils.escHtml(e.grade)})` : '';
                  return `<span style="display:inline-flex;align-items:center;gap:3px;background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:6px;padding:2px 8px;font-size:12px;">${icon} ${Utils.escHtml(e.name)}${gradeStr} <span style="color:var(--color-text-muted);font-size:11px;">×${e.count || 1}${Utils.escHtml(e.unit || '')}</span></span>`;
                }).join('')}
              </div>
            </div>` : ''}
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

    document.getElementById('btnBackGates')?.addEventListener('click', async () => {
      const scrollY = this._listScrollY || 0;
      this._currentId = null;
      await this.init(container);
      requestAnimationFrame(() => {
        container.scrollTop = scrollY;
        if (scrollY > 0) window.scrollTo(0, scrollY);
      });
    });
    document.getElementById('btnEditGate')?.addEventListener('click', () => this._openForm(gate, wid, container));

    document.getElementById('btnCopyGate')?.addEventListener('click', () => {
      this._openPartialCopyModal(gate);
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

  _openForm: async function(gate, wid, container) {
    const isEdit = !!gate;
    const g = gate || {};
    const self = this;

    const [allMonsters, allChars] = await Promise.all([
      DB.getAll('monsters', wid),
      DB.getAll('characters', wid),
    ]);

    // State for enemyRefs
    let gateEnemyRefs = [...(g.enemyRefs || [])];

    const allTypes = [...this.TYPES, ...(this._customTypes || [])];
    const allBreakTypes = [...this.BREAK_TYPES, ...(this._customBreakTypes || [])];
    const existingType = g.type || '';
    const existingBreakType = g.breakType || '';
    const typeIsCustom = existingType && !allTypes.includes(existingType);
    const breakTypeIsCustom = existingBreakType && !allBreakTypes.includes(existingBreakType);
    if (typeIsCustom && !allTypes.includes(existingType)) allTypes.push(existingType);
    if (breakTypeIsCustom && !allBreakTypes.includes(existingBreakType)) allBreakTypes.push(existingBreakType);

    const gradeOptions = this._C.grades.map(gr =>
      `<option value="${gr}" ${g.grade === gr ? 'selected' : ''}>${gr}</option>`).join('');
    const typeOptions = ['', ...allTypes, '__custom__'].map(t => {
      if (t === '__custom__') return `<option value="__custom__">기타 (직접 입력)...</option>`;
      return `<option value="${t}" ${existingType === t ? 'selected' : ''}>${t || '선택 안 함'}</option>`;
    }).join('');
    const breakTypeOptions = ['', ...allBreakTypes, '__custom__'].map(bt => {
      if (bt === '__custom__') return `<option value="__custom__">기타 (직접 입력)...</option>`;
      return `<option value="${bt}" ${existingBreakType === bt ? 'selected' : ''}>${bt || '선택 안 함'}</option>`;
    }).join('');

    // Build existing images list
    const existingImages = Array.isArray(g.images) ? g.images : (g.image ? [{ url: g.image, caption: '' }] : []);

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
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <label class="form-label" style="font-size:13px;font-weight:600;margin:0;">종류</label>
            <button type="button" id="btnToggleTypeList" class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 7px;">목록 관리</button>
          </div>
          <select class="select-input" id="fGateType" style="width:100%;">${typeOptions}</select>
          <input class="input-field" id="fGateTypeCustom" placeholder="종류 직접 입력..." style="width:100%;box-sizing:border-box;margin-top:4px;display:${typeIsCustom ? 'block' : 'none'};" value="${typeIsCustom ? Utils.escHtml(existingType) : ''}" />
          <div id="customTypeList" style="display:none;margin-top:6px;padding:8px;background:var(--color-surface3,#1e2030);border-radius:8px;border:1px solid var(--color-border);">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">사용자 정의 종류</div>
            <div id="customTypeItems">
              ${(this._customTypes||[]).length === 0
                ? '<div style="font-size:11px;color:var(--color-text-dim);">없음</div>'
                : (this._customTypes||[]).map(t => `
                  <div class="custom-type-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);">
                    <span style="font-size:12px;">${Utils.escHtml(t)}</span>
                    <button type="button" class="btn-del-custom-type" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button>
                  </div>`).join('')}
            </div>
          </div>
        </div>
        <div class="form-group">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <label class="form-label" style="font-size:13px;font-weight:600;margin:0;">브레이크 유형</label>
            <button type="button" id="btnToggleBreakTypeList" class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 7px;">목록 관리</button>
          </div>
          <select class="select-input" id="fGateBreakType" style="width:100%;">${breakTypeOptions}</select>
          <input class="input-field" id="fGateBreakTypeCustom" placeholder="브레이크 유형 직접 입력..." style="width:100%;box-sizing:border-box;margin-top:4px;display:${breakTypeIsCustom ? 'block' : 'none'};" value="${breakTypeIsCustom ? Utils.escHtml(existingBreakType) : ''}" />
          <div id="customBreakTypeList" style="display:none;margin-top:6px;padding:8px;background:var(--color-surface3,#1e2030);border-radius:8px;border:1px solid var(--color-border);">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">사용자 정의 브레이크 유형</div>
            <div id="customBreakTypeItems">
              ${(this._customBreakTypes||[]).length === 0
                ? '<div style="font-size:11px;color:var(--color-text-dim);">없음</div>'
                : (this._customBreakTypes||[]).map(t => `
                  <div class="custom-bt-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);">
                    <span style="font-size:12px;">${Utils.escHtml(t)}</span>
                    <button type="button" class="btn-del-custom-bt" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button>
                  </div>`).join('')}
            </div>
          </div>
        </div>
        ${tf('fGateMotif', '모티브', g.motif, '모티브 설명')}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${tf('fGateLevelLimit', '레벨 제한', g.levelLimit, '예: 50')}
          ${tf('fGateMaxPlayers', '최대 인원수', g.maxPlayers, '예: 10')}
        </div>
        ${tf('fGateScale', '규모', g.scale, '예: 중규모')}
        ${ta('fGateEnemies', '적', g.enemies, '적 설명')}
        <div style="margin-top:4px;">
          <div style="font-size:12px;font-weight:700;color:var(--color-primary);margin-bottom:6px;">몬스터/캐릭터 연결</div>
          <div id="gateEnemyRefChips" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;margin-bottom:4px;">${gateEnemyRefs.map(e => {
            const icon = e.type === 'character' ? '👤' : '👾';
            const gradeStr = e.grade ? ` (${Utils.escHtml(e.grade)})` : '';
            return `<span class="gate-eref-chip" data-eid="${Utils.escHtml(e.id)}" data-etype="${Utils.escHtml(e.type || 'monster')}" data-ename="${Utils.escHtml(e.name || '')}" data-egrade="${Utils.escHtml(e.grade || '')}" style="display:inline-flex;align-items:center;gap:3px;background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:6px;padding:2px 5px;margin:2px;font-size:12px;">${icon} ${Utils.escHtml(e.name)}${gradeStr}<input type="number" class="eref-count" value="${e.count || 1}" min="1" style="width:36px;padding:1px 3px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font-size:11px;text-align:center;" /><input class="eref-unit" value="${Utils.escHtml(e.unit || (e.type === 'character' ? '명' : '마리'))}" style="width:28px;padding:1px 3px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font-size:11px;" /><button class="gate-eref-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:12px;padding:0 2px;">✕</button></span>`;
          }).join('')}</div>
          <div style="position:relative;">
            <input class="input-field" id="gateErefSearch" placeholder="몬스터/캐릭터 검색..." autocomplete="off"
              style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="gateErefResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:140px;overflow-y:auto;top:100%;left:0;"></div>
          </div>
        </div>
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
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;color:var(--color-primary);font-weight:700;margin-bottom:8px;">이미지</div>
          <div id="gateImgList" style="display:flex;flex-direction:column;gap:8px;">
            ${existingImages.map((img, i) => `
              <div class="gate-img-slot" data-idx="${i}" style="display:flex;flex-direction:column;gap:4px;background:var(--color-surface3,#1e2030);padding:8px;border-radius:8px;border:1px solid var(--color-border);">
                <div style="display:flex;align-items:center;gap:6px;">
                  <img src="${img.url}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;" />
                  <div style="flex:1;min-width:0;">
                    <input class="input-field gate-img-caption" data-idx="${i}" value="${Utils.escHtml(img.caption || '')}" placeholder="설명 (선택)" style="width:100%;box-sizing:border-box;font-size:12px;" />
                  </div>
                  <button class="btn btn-ghost btn-sm gate-img-del" data-idx="${i}" style="color:var(--color-danger);flex-shrink:0;">✕</button>
                </div>
                <input type="hidden" class="gate-img-url" data-idx="${i}" value="${img.url}" />
              </div>`).join('')}
          </div>
          <div style="margin-top:8px;">
            <label style="font-size:12px;color:var(--color-text-muted);margin-bottom:4px;display:block;">이미지 추가</label>
            <input type="file" id="fGateImageAdd" accept="image/*" style="font-size:12px;" />
          </div>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '던전 편집' : '새 던전 추가', body, async () => {
      const name = document.getElementById('fGateName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }

      // Resolve type
      let type = document.getElementById('fGateType')?.value || '';
      if (type === '__custom__') {
        type = document.getElementById('fGateTypeCustom')?.value.trim() || '';
        await self._saveCustomType(wid, type);
      }

      // Resolve breakType
      let breakType = document.getElementById('fGateBreakType')?.value || '';
      if (breakType === '__custom__') {
        breakType = document.getElementById('fGateBreakTypeCustom')?.value.trim() || '';
        await self._saveCustomBreakType(wid, breakType);
      }

      // Collect images from slots
      const imgSlots = document.querySelectorAll('#globalModalBody .gate-img-slot');
      const images = [];
      imgSlots.forEach(slot => {
        const url = slot.querySelector('.gate-img-url')?.value;
        const caption = slot.querySelector('.gate-img-caption')?.value.trim() || '';
        if (url) images.push({ url, caption });
      });

      // Collect enemy refs from chips
      const savedEnemyRefs = Array.from(document.querySelectorAll('#globalModalBody .gate-eref-chip')).map(chip => ({
        id: chip.dataset.eid,
        type: chip.dataset.etype || 'monster',
        name: chip.dataset.ename || '',
        grade: chip.dataset.egrade || '',
        count: parseInt(chip.querySelector('.eref-count')?.value || '1', 10) || 1,
        unit: chip.querySelector('.eref-unit')?.value || (chip.dataset.etype === 'character' ? '명' : '마리'),
      }));

      const data = {
        id: g.id || DB.genId(),
        worldId: wid,
        name,
        trueName: document.getElementById('fGateTrueName')?.value.trim() || '',
        grade: document.getElementById('fGateGrade')?.value || '',
        type,
        breakType,
        motif: document.getElementById('fGateMotif')?.value.trim() || '',
        levelLimit: document.getElementById('fGateLevelLimit')?.value.trim() || '',
        maxPlayers: document.getElementById('fGateMaxPlayers')?.value.trim() || '',
        scale: document.getElementById('fGateScale')?.value.trim() || '',
        enemies: document.getElementById('fGateEnemies')?.value.trim() || '',
        enemyRefs: savedEnemyRefs,
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
        images,
        createdAt: g.createdAt || Date.now(),
        updatedAt: Date.now(),
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

    // Wire custom type/breakType toggles and image upload — after modal renders
    setTimeout(() => {
      const typeSelect = document.getElementById('fGateType');
      const typeCustom = document.getElementById('fGateTypeCustom');
      typeSelect?.addEventListener('change', () => {
        typeCustom.style.display = typeSelect.value === '__custom__' ? 'block' : 'none';
      });

      const btSelect = document.getElementById('fGateBreakType');
      const btCustom = document.getElementById('fGateBreakTypeCustom');
      btSelect?.addEventListener('change', () => {
        btCustom.style.display = btSelect.value === '__custom__' ? 'block' : 'none';
      });

      // Enemy ref chip deletes (existing chips)
      document.getElementById('gateEnemyRefChips')?.querySelectorAll('.gate-eref-del').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.gate-eref-chip').remove());
      });

      // Enemy ref inline search
      const erefInp = document.getElementById('gateErefSearch');
      const erefRes = document.getElementById('gateErefResults');
      if (erefInp && erefRes) {
        const allMonChars = [
          ...allMonsters.map(m => ({ ...m, _etype: 'monster' })),
          ...allChars.map(c => ({ ...c, _etype: 'character' })),
        ];
        erefInp.addEventListener('input', () => {
          const q = erefInp.value.trim();
          if (!q) { erefRes.style.display = 'none'; erefRes.innerHTML = ''; return; }
          const matches = allMonChars.filter(d => Utils.matchesQuery((d.name || '') + ' ' + (d.grade || ''), q)).slice(0, 20);
          if (!matches.length) { erefRes.style.display = 'none'; return; }
          erefRes.innerHTML = matches.map(d => {
            const icon = d._etype === 'character' ? '👤' : '👾';
            const gradeStr = d.grade ? ` (${Utils.escHtml(d.grade)})` : '';
            const typeLabel = d._etype === 'character' ? '캐릭터' : '몬스터';
            return `<div class="eref-search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" data-grade="${Utils.escHtml(d.grade || '')}" data-etype="${d._etype}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${icon} ${Utils.escHtml(d.name || '')}${gradeStr} <span style="font-size:10px;color:var(--color-text-muted);">${typeLabel}</span></div>`;
          }).join('');
          erefRes.style.display = 'block';
          erefRes.querySelectorAll('.eref-search-row').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              const chipsContainer = document.getElementById('gateEnemyRefChips');
              if (!chipsContainer) return;
              // Check for duplicate
              const existingIds = Array.from(chipsContainer.querySelectorAll('.gate-eref-chip')).map(c => c.dataset.eid);
              if (existingIds.includes(row.dataset.id)) { erefInp.value = ''; erefRes.style.display = 'none'; return; }
              const icon = row.dataset.etype === 'character' ? '👤' : '👾';
              const gradeStr = row.dataset.grade ? ` (${Utils.escHtml(row.dataset.grade)})` : '';
              const defaultUnit = row.dataset.etype === 'character' ? '명' : '마리';
              const span = document.createElement('span');
              span.className = 'gate-eref-chip';
              span.dataset.eid = row.dataset.id;
              span.dataset.etype = row.dataset.etype;
              span.dataset.ename = row.dataset.name;
              span.dataset.egrade = row.dataset.grade;
              span.style.cssText = 'display:inline-flex;align-items:center;gap:3px;background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:6px;padding:2px 5px;margin:2px;font-size:12px;';
              span.innerHTML = `${icon} ${Utils.escHtml(row.dataset.name)}${gradeStr}<input type="number" class="eref-count" value="1" min="1" style="width:36px;padding:1px 3px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font-size:11px;text-align:center;" /><input class="eref-unit" value="${defaultUnit}" style="width:28px;padding:1px 3px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font-size:11px;" /><button class="gate-eref-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:12px;padding:0 2px;">✕</button>`;
              span.querySelector('.gate-eref-del').addEventListener('click', () => span.remove());
              chipsContainer.appendChild(span);
              erefInp.value = '';
              erefRes.style.display = 'none';
            });
          });
        });
        erefInp.addEventListener('blur', () => setTimeout(() => { erefRes.style.display = 'none'; }, 200));
      }

      // Delete image slot
      document.getElementById('globalModalBody')?.addEventListener('click', e => {
        const delBtn = e.target.closest('.gate-img-del');
        if (delBtn) {
          const idx = delBtn.dataset.idx;
          document.querySelector(`#globalModalBody .gate-img-slot[data-idx="${idx}"]`)?.remove();
        }
      });

      // Custom type list toggle
      document.getElementById('btnToggleTypeList')?.addEventListener('click', () => {
        const el = document.getElementById('customTypeList');
        if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
      });
      document.getElementById('btnToggleBreakTypeList')?.addEventListener('click', () => {
        const el = document.getElementById('customBreakTypeList');
        if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
      });

      // Delete custom type
      document.getElementById('customTypeItems')?.addEventListener('click', async e => {
        const btn = e.target.closest('.btn-del-custom-type');
        if (!btn) return;
        const val = btn.dataset.val;
        self._customTypes = (self._customTypes || []).filter(t => t !== val);
        await DB.setSetting('gateCustomTypes_' + wid, self._customTypes);
        // Rebuild select + list
        const allT = [...self.TYPES, ...self._customTypes];
        const typeSelectEl = document.getElementById('fGateType');
        if (typeSelectEl) {
          const cur = typeSelectEl.value;
          typeSelectEl.innerHTML = ['', ...allT, '__custom__'].map(t => {
            if (t === '__custom__') return `<option value="__custom__">기타 (직접 입력)...</option>`;
            return `<option value="${t}"${cur === t ? ' selected' : ''}>${t || '선택 안 함'}</option>`;
          }).join('');
        }
        const itemsEl = document.getElementById('customTypeItems');
        if (itemsEl) {
          itemsEl.innerHTML = self._customTypes.length === 0
            ? '<div style="font-size:11px;color:var(--color-text-dim);">없음</div>'
            : self._customTypes.map(t => `
              <div class="custom-type-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);">
                <span style="font-size:12px;">${Utils.escHtml(t)}</span>
                <button type="button" class="btn-del-custom-type" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button>
              </div>`).join('');
        }
      });

      // Delete custom break type
      document.getElementById('customBreakTypeItems')?.addEventListener('click', async e => {
        const btn = e.target.closest('.btn-del-custom-bt');
        if (!btn) return;
        const val = btn.dataset.val;
        self._customBreakTypes = (self._customBreakTypes || []).filter(t => t !== val);
        await DB.setSetting('gateCustomBreakTypes_' + wid, self._customBreakTypes);
        const allBT = [...self.BREAK_TYPES, ...self._customBreakTypes];
        const btSelectEl = document.getElementById('fGateBreakType');
        if (btSelectEl) {
          const cur = btSelectEl.value;
          btSelectEl.innerHTML = ['', ...allBT, '__custom__'].map(t => {
            if (t === '__custom__') return `<option value="__custom__">기타 (직접 입력)...</option>`;
            return `<option value="${t}"${cur === t ? ' selected' : ''}>${t || '선택 안 함'}</option>`;
          }).join('');
        }
        const itemsEl = document.getElementById('customBreakTypeItems');
        if (itemsEl) {
          itemsEl.innerHTML = self._customBreakTypes.length === 0
            ? '<div style="font-size:11px;color:var(--color-text-dim);">없음</div>'
            : self._customBreakTypes.map(t => `
              <div class="custom-bt-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);">
                <span style="font-size:12px;">${Utils.escHtml(t)}</span>
                <button type="button" class="btn-del-custom-bt" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button>
              </div>`).join('');
        }
      });

      // Add new image
      document.getElementById('fGateImageAdd')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const url = await Utils.imageToBase64(file);
          const list = document.getElementById('gateImgList');
          if (!list) return;
          const newIdx = Date.now();
          const div = document.createElement('div');
          div.className = 'gate-img-slot';
          div.dataset.idx = newIdx;
          div.style.cssText = 'display:flex;flex-direction:column;gap:4px;background:var(--color-surface3,#1e2030);padding:8px;border-radius:8px;border:1px solid var(--color-border);';
          div.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;">
              <img src="${url}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;" />
              <div style="flex:1;min-width:0;">
                <input class="input-field gate-img-caption" data-idx="${newIdx}" value="" placeholder="설명 (선택)" style="width:100%;box-sizing:border-box;font-size:12px;" />
              </div>
              <button class="btn btn-ghost btn-sm gate-img-del" data-idx="${newIdx}" style="color:var(--color-danger);flex-shrink:0;">✕</button>
            </div>
            <input type="hidden" class="gate-img-url" data-idx="${newIdx}" value="${url}" />`;
          list.appendChild(div);
          e.target.value = '';
        } catch(err) { Utils.toast('이미지 처리 오류', 'error'); }
      });
    }, 50);
  },

  // ── PARTIAL COPY ─────────────────────────────────────────────────────────────

  _openPartialCopyModal: function(g) {
    const fields = [
      { key: 'name',               label: '이름',            val: g.name },
      { key: 'grade',              label: '등급',            val: g.grade },
      { key: 'type',               label: '종류',            val: g.type },
      { key: 'breakType',          label: '브레이크 유형',   val: g.breakType },
      { key: 'motif',              label: '모티브',          val: g.motif },
      { key: 'levelLimit',         label: '레벨 제한',       val: g.levelLimit },
      { key: 'maxPlayers',         label: '최대 인원수',     val: g.maxPlayers },
      { key: 'scale',              label: '규모',            val: g.scale },
      { key: 'enemies',            label: '적',              val: g.enemies },
      { key: 'features',           label: '특징',            val: g.features },
      { key: 'internalStructure',  label: '내부 구성',       val: g.internalStructure },
      { key: 'strategy',           label: '공략 방법',       val: g.strategy },
      { key: 'clearCondition',     label: '클리어 조건',     val: g.clearCondition },
      { key: 'rewards',            label: '보상',            val: g.rewards },
      { key: 'failPenalty',        label: '실패시 패널티',   val: g.failPenalty },
      { key: 'hiddenClearCondition', label: '히든 클리어 조건', val: g.hiddenClearCondition },
      { key: 'hiddenRewards',      label: '히든 보상',       val: g.hiddenRewards },
      { key: 'details',            label: '세부사항',        val: g.details },
      { key: 'authorNotes',        label: '작가 메모',       val: g.authorNotes },
    ].filter(f => f.val);

    if (!fields.length) { Utils.toast('복사할 내용이 없습니다', 'error'); return; }

    const body = `
      <div style="display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow-y:auto;">
        <div style="display:flex;gap:8px;margin-bottom:4px;">
          <button id="pCopyAll" class="btn btn-ghost btn-sm" style="font-size:11px;">전체 선택</button>
          <button id="pCopyNone" class="btn btn-ghost btn-sm" style="font-size:11px;">전체 해제</button>
        </div>
        ${fields.map(f => `
          <label style="display:flex;align-items:flex-start;gap:8px;padding:6px 8px;border-radius:6px;background:var(--color-surface2);cursor:pointer;">
            <input type="checkbox" class="pcopy-chk" data-key="${f.key}" checked style="margin-top:2px;flex-shrink:0;" />
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--color-primary);">${f.label}</div>
              <div style="font-size:11px;color:var(--color-text-muted);white-space:pre-wrap;max-height:48px;overflow:hidden;">${Utils.escHtml(String(f.val).substring(0, 80))}${String(f.val).length > 80 ? '...' : ''}</div>
            </div>
          </label>`).join('')}
      </div>`;

    Utils.openModal('텍스트 선택 복사', body, () => {
      const checked = [...document.querySelectorAll('#globalModalBody .pcopy-chk:checked')].map(cb => cb.dataset.key);
      if (!checked.length) { Utils.toast('항목을 선택하세요', 'error'); return false; }
      const selected = fields.filter(f => checked.includes(f.key));
      const lines = [];
      selected.forEach(f => {
        const val = String(f.val);
        lines.push(val.includes('\n') ? `${f.label}:\n${val}` : `${f.label}: ${val}`);
      });
      Utils.copyText(lines.join('\n'));
      Utils.toast('복사됨', 'success');
      return true;
    }, '복사');

    setTimeout(() => {
      document.getElementById('pCopyAll')?.addEventListener('click', () => {
        document.querySelectorAll('#globalModalBody .pcopy-chk').forEach(cb => { cb.checked = true; });
      });
      document.getElementById('pCopyNone')?.addEventListener('click', () => {
        document.querySelectorAll('#globalModalBody .pcopy-chk').forEach(cb => { cb.checked = false; });
      });
    }, 30);
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
