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
          ${(() => {
            const concepts = gate.concepts || [];
            if (!concepts.length) {
              const enemyRefsHtml = (gate.enemyRefs && gate.enemyRefs.length > 0) ? `
                <div style="margin-bottom:10px;">
                  <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">몬스터/캐릭터 연결</div>
                  <div style="display:flex;flex-wrap:wrap;gap:4px;">
                    ${gate.enemyRefs.map(e => {
                      const icon = e.type === 'character' ? '👤' : '👾';
                      const gradeStr = e.grade ? ` (${Utils.escHtml(e.grade)})` : '';
                      return `<span style="display:inline-flex;align-items:center;gap:3px;background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:6px;padding:2px 8px;font-size:12px;">${icon} ${Utils.escHtml(e.name)}${gradeStr} <span style="color:var(--color-text-muted);font-size:11px;">×${e.count || 1}${Utils.escHtml(e.unit || '')}</span></span>`;
                    }).join('')}
                  </div>
                </div>` : '';
              return field('적', gate.enemies, true) + enemyRefsHtml;
            }
            const conceptMeta = { wave:'#60a5fa', exploration:'#34d399', decapitation:'#f87171', boss:'#c084fc' };
            const conceptLabels = { wave:'웨이브', exploration:'탐험', decapitation:'참수', boss:'보스전' };
            const badges = concepts.map(c => {
              const col = conceptMeta[c] || '#9ca3af';
              return `<span style="background:${col}22;color:${col};border:1px solid ${col}55;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;">${conceptLabels[c] || c}</span>`;
            }).join('');
            let details = '';
            if (concepts.includes('wave') && gate.waveConfig) {
              const wc = gate.waveConfig;
              const waveCount = (wc.waves || []).length;
              let enemyKinds = new Set();
              (wc.waves || []).forEach(w => (w.enemies || []).forEach(e => enemyKinds.add(e.name)));
              details += `<div style="font-size:12px;margin-bottom:4px;">🌊 웨이브: ${waveCount}웨이브, 적 ${enemyKinds.size}종</div>`;
            }
            if (concepts.includes('boss') && gate.bossConfig) {
              const bc = gate.bossConfig;
              const bossNames = (bc.enemies || []).map(e => Utils.escHtml(e.name)).join(', ');
              const phaseCount = (bc.phases || []).length;
              details += `<div style="font-size:12px;margin-bottom:4px;">👑 보스: ${bossNames || '?'}, ${phaseCount}페이즈</div>`;
            }
            if (concepts.includes('decapitation') && gate.decapitationConfig) {
              const names = (gate.decapitationConfig.targets || []).map(t => Utils.escHtml(t.name)).join(', ');
              details += `<div style="font-size:12px;margin-bottom:4px;">⚔️ 제거 대상: ${names || '없음'}</div>`;
            }
            if (concepts.includes('exploration') && gate.explorationConfig) {
              const tgt = gate.explorationConfig.target?.name || '';
              details += `<div style="font-size:12px;margin-bottom:4px;">🔍 탐험 목표: ${Utils.escHtml(tgt) || '?'}</div>`;
            }
            return `<div style="margin-bottom:10px;">
              <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">컨셉</div>
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">${badges}</div>
              <div>${details || '<span style="font-size:12px;color:var(--color-text-dim);">-</span>'}</div>
            </div>`;
          })()}
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

    const [allMonsters, allChars, allTraps, allItems, allPlaces, allSkills] = await Promise.all([
      DB.getAll('monsters', wid),
      DB.getAll('characters', wid),
      DB.getAll('traps', wid),
      DB.getAll('items', wid),
      DB.getAll('places', wid),
      DB.getAll('skills', wid),
    ]);

    // Concept state
    let formConcepts = new Set(g.concepts || []);
    let formWaves = (g.waveConfig?.waves || []).map(w => ({ ...w, enemies: [...(w.enemies || [])], traps: [...(w.traps || [])] }));
    let bossPhases = (g.bossConfig?.phases || []).map(p => ({ ...p, attacks: [...(p.attacks || [])] }));
    let bossEnemies = [...(g.bossConfig?.enemies || [])];
    let decapTargets = [...(g.decapitationConfig?.targets || [])];
    let exRef = { ...(g.explorationConfig?.target || { id: '', name: '' }) };
    const mkPlaceRef = (src) => ({ type: src?.type || 'text', id: src?.id || '', name: src?.name || '', desc: src?.desc || '' });
    let bossPlace = mkPlaceRef(g.bossConfig?.place);

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

    // ── HTML Builders ──
    const placeRefHtml = (prefix, ref) => `
      <div class="place-ref-wrap" id="${prefix}PlaceRefWrap" style="margin-top:6px;">
        <div style="display:flex;gap:12px;margin-bottom:4px;">
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
            <input type="radio" name="${prefix}PlaceType" value="text" ${ref.type === 'text' ? 'checked' : ''} /> 텍스트 입력
          </label>
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
            <input type="radio" name="${prefix}PlaceType" value="ref" ${ref.type === 'ref' ? 'checked' : ''} /> 장소창에서 선택
          </label>
        </div>
        <div id="${prefix}PlaceTextDiv" style="display:${ref.type !== 'ref' ? 'block' : 'none'};">
          <input class="input-field" id="${prefix}PlaceText" value="${Utils.escHtml(ref.desc || '')}" placeholder="장소 설명 입력" style="width:100%;box-sizing:border-box;font-size:12px;" />
        </div>
        <div id="${prefix}PlaceRefDiv" style="display:${ref.type === 'ref' ? 'block' : 'none'};position:relative;">
          <input class="input-field" id="${prefix}PlaceSearch" placeholder="장소 검색..." value="${Utils.escHtml(ref.name || '')}" style="width:100%;box-sizing:border-box;font-size:12px;" autocomplete="off" />
          <div id="${prefix}PlaceResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:140px;overflow-y:auto;top:100%;left:0;"></div>
          <input type="hidden" id="${prefix}PlaceId" value="${Utils.escHtml(ref.id || '')}" />
          ${ref.name ? `<div id="${prefix}PlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;">선택됨: ${Utils.escHtml(ref.name)}</div>` : `<div id="${prefix}PlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;display:none;"></div>`}
        </div>
      </div>`;

    const chipHtml = (e, type) => {
      const icon = type === 'char' ? '👤' : type === 'trap' ? '⚠️' : '👾';
      const gradeStr = e.grade ? ` (${Utils.escHtml(e.grade)})` : '';
      return `<span class="entity-chip" data-eid="${Utils.escHtml(e.id)}" data-etype="${type}" data-ename="${Utils.escHtml(e.name || '')}" data-egrade="${Utils.escHtml(e.grade || '')}" style="display:inline-flex;align-items:center;gap:3px;background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:6px;padding:2px 5px;margin:2px;font-size:12px;max-width:100%;box-sizing:border-box;">
        <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:1;">${icon} ${Utils.escHtml(e.name)}${gradeStr}</span>
        <input type="number" class="chip-count" value="${e.count || 1}" min="1" style="width:36px;flex-shrink:0;padding:1px 3px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font-size:11px;text-align:center;" />
        <input class="chip-unit" value="${Utils.escHtml(e.unit || (type === 'char' ? '명' : type === 'trap' ? '개' : '마리'))}" style="width:28px;flex-shrink:0;padding:1px 3px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font-size:11px;" />
        <button class="chip-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:12px;padding:0 2px;flex-shrink:0;">✕</button>
      </span>`;
    };

    const entitySearchHtml = (inputId, resultId, placeholder) => `
      <div style="position:relative;margin-top:4px;">
        <input class="input-field" id="${inputId}" placeholder="${placeholder}" autocomplete="off"
          style="width:100%;box-sizing:border-box;font-size:12px;" />
        <div id="${resultId}" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:140px;overflow-y:auto;top:100%;left:0;"></div>
      </div>`;

    const waveRowHtml = (w, idx) => {
      const enemyChips = (w.enemies || []).map(e => chipHtml(e, e.type || 'monster')).join('');
      const trapChips = (w.traps || []).map(t => chipHtml(t, 'trap')).join('');
      const clearCondType = w.clearConditionType || (w.explorationLink ? 'exploration' : (w.clearCondition ? 'custom' : 'enemies'));
      const rs = 'display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;';
      return `
      <div class="wave-row" data-widx="${idx}" style="background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:8px;padding:10px;margin-bottom:8px;width:100%;box-sizing:border-box;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-weight:700;font-size:13px;color:#60a5fa;">${idx + 1}웨이브</div>
          <button class="btn btn-ghost btn-sm wave-del-btn" data-widx="${idx}" style="color:var(--color-danger);font-size:11px;">삭제</button>
        </div>
        <div style="margin-bottom:6px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-bottom:4px;">
            <input type="checkbox" class="wave-event-cb" data-widx="${idx}" ${w.hasEvent ? 'checked' : ''} /> 사건발생
          </label>
          <div id="waveEventWrap${idx}" style="display:${w.hasEvent ? 'block' : 'none'};">
            <textarea class="input-field wave-event-desc" data-widx="${idx}" rows="2" placeholder="사건 설명"
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(w.eventDesc || '')}</textarea>
          </div>
        </div>
        <div style="margin-bottom:6px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">적</div>
          <div class="wave-enemy-chips" id="waveEnemyChips${idx}" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${enemyChips}</div>
          ${entitySearchHtml('waveEnemySearch' + idx, 'waveEnemyResults' + idx, '몬스터/캐릭터 검색...')}
        </div>
        <div style="margin-bottom:6px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">트랩</div>
          <div class="wave-trap-chips" id="waveTrapChips${idx}" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${trapChips}</div>
          ${entitySearchHtml('waveTrapSearch' + idx, 'waveTrapResults' + idx, '트랩 검색...')}
        </div>
        <div style="margin-bottom:4px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">클리어 조건</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <label style="${rs}"><input type="radio" name="waveClearType${idx}" class="wave-clear-type" value="enemies" data-widx="${idx}" ${clearCondType === 'enemies' ? 'checked' : ''} /> 적 처치 완료</label>
            <label style="${rs}"><input type="radio" name="waveClearType${idx}" class="wave-clear-type" value="exploration" data-widx="${idx}" ${clearCondType === 'exploration' ? 'checked' : ''} /> 탐험 클리어</label>
            <label style="${rs}"><input type="radio" name="waveClearType${idx}" class="wave-clear-type" value="decapitation" data-widx="${idx}" ${clearCondType === 'decapitation' ? 'checked' : ''} /> 참수 클리어</label>
            <label style="${rs}"><input type="radio" name="waveClearType${idx}" class="wave-clear-type" value="boss" data-widx="${idx}" ${clearCondType === 'boss' ? 'checked' : ''} /> 보스전 클리어</label>
            <label style="${rs}"><input type="radio" name="waveClearType${idx}" class="wave-clear-type" value="custom" data-widx="${idx}" ${clearCondType === 'custom' ? 'checked' : ''} /> 직접 입력</label>
          </div>
          <div id="waveClearCustomWrap${idx}" style="display:${clearCondType === 'custom' ? 'block' : 'none'};margin-top:4px;">
            <input class="input-field wave-clear-cond" data-widx="${idx}" value="${Utils.escHtml(w.clearCondition || '')}" placeholder="클리어 조건 내용"
              style="width:100%;box-sizing:border-box;font-size:12px;" />
          </div>
        </div>
      </div>`;
    };

    const phaseRowHtml = (p, pidx) => {
      const attacksHtml = (p.attacks || []).map((atk, aidx) => `
        <div class="atk-row" data-pidx="${pidx}" data-aidx="${aidx}" style="background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;padding:8px;margin-bottom:6px;width:100%;box-sizing:border-box;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <div style="font-size:11px;font-weight:700;color:#c084fc;">공격 ${aidx + 1}</div>
            <button class="btn btn-ghost btn-sm atk-del-btn" data-pidx="${pidx}" data-aidx="${aidx}" style="color:var(--color-danger);font-size:10px;">삭제</button>
          </div>
          <input class="input-field atk-name" data-pidx="${pidx}" data-aidx="${aidx}" value="${Utils.escHtml(atk.name || '')}" placeholder="공격 이름" style="width:100%;box-sizing:border-box;font-size:12px;margin-bottom:4px;" />
          <div style="position:relative;margin-bottom:4px;">
            <input class="input-field atk-skill-search" data-pidx="${pidx}" data-aidx="${aidx}" placeholder="스킬 검색..." value="${Utils.escHtml(atk.skillName || '')}" autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div class="atk-skill-results" data-pidx="${pidx}" data-aidx="${aidx}" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
            <input type="hidden" class="atk-skill-id" data-pidx="${pidx}" data-aidx="${aidx}" value="${Utils.escHtml(atk.skillId || '')}" />
          </div>
          <textarea class="input-field atk-desc" data-pidx="${pidx}" data-aidx="${aidx}" rows="2" placeholder="공격 설명" style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(atk.desc || '')}</textarea>
        </div>`).join('');
      return `
      <div class="phase-row" data-pidx="${pidx}" style="background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:8px;padding:10px;margin-bottom:8px;width:100%;box-sizing:border-box;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="font-weight:700;font-size:13px;color:#c084fc;">페이즈 ${pidx + 1}</div>
          <button class="btn btn-ghost btn-sm phase-del-btn" data-pidx="${pidx}" style="color:var(--color-danger);font-size:11px;">삭제</button>
        </div>
        <input class="input-field phase-cond" data-pidx="${pidx}" value="${Utils.escHtml(p.condition || '')}" placeholder="HP% 조건 (예: HP 50% 이하)" style="width:100%;box-sizing:border-box;font-size:12px;margin-bottom:4px;" />
        <textarea class="input-field phase-desc" data-pidx="${pidx}" rows="2" placeholder="페이즈 설명" style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;margin-bottom:6px;">${Utils.escHtml(p.desc || '')}</textarea>
        <div class="phase-attacks" id="phaseAttacks${pidx}">${attacksHtml}</div>
        <button class="btn btn-ghost btn-sm atk-add-btn" data-pidx="${pidx}" style="font-size:11px;border:1px dashed var(--color-border);width:100%;">+ 공격 추가</button>
      </div>`;
    };

    const exType = g.explorationConfig?.targetType || 'item';
    const exItemRef = (g.explorationConfig?.target?.type === 'item' || !g.explorationConfig) ? (g.explorationConfig?.target || {}) : {};
    const exPlaceRef = mkPlaceRef(g.explorationConfig?.target?.type === 'place' ? g.explorationConfig.target : null);

    const conceptChipsHtml = [
      { id: 'wave', label: '웨이브(wave)' },
      { id: 'exploration', label: '탐험(exploration)' },
      { id: 'decapitation', label: '참수작전(decapitation)' },
      { id: 'boss', label: '보스전(boss)' },
    ].map(c => `<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-surface3,#1e2030);cursor:pointer;font-size:12px;">
      <input type="checkbox" class="concept-cb" value="${c.id}" ${formConcepts.has(c.id) ? 'checked' : ''} /> ${c.label}
    </label>`).join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;padding-right:4px;overflow-x:hidden;min-width:0;">
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

        <!-- Concept system -->
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:var(--color-primary);margin-bottom:8px;">컨셉 선택</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">${conceptChipsHtml}</div>
        </div>

        <!-- Wave section -->
        <div id="sectionWave" style="display:${formConcepts.has('wave') ? 'block' : 'none'};border-top:1px solid #60a5fa44;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#60a5fa;margin-bottom:8px;">🌊 웨이브 설정</div>
          <div style="display:flex;gap:16px;margin-bottom:6px;">
            <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;">
              <input type="checkbox" id="waveGlobalEventFixed" ${g.waveConfig?.hasEventFixed ? 'checked' : ''} /> 전체사건고정
            </label>
          </div>
          <div id="waveGlobalEventWrap" style="display:${g.waveConfig?.hasEventFixed ? 'block' : 'none'};margin-bottom:6px;">
            <textarea class="input-field" id="waveGlobalEventDesc" rows="2" placeholder="전체 사건 설명"
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.waveConfig?.fixedEventDesc || '')}</textarea>
          </div>
          <div id="waveList">${formWaves.map((w, i) => waveRowHtml(w, i)).join('')}</div>
          <button class="btn btn-ghost btn-sm" id="btnAddWave" style="width:100%;border:1px dashed #60a5fa55;font-size:12px;color:#60a5fa;margin-top:4px;">+ 웨이브 추가</button>
        </div>

        <!-- Exploration section -->
        <div id="sectionExploration" style="display:${formConcepts.has('exploration') ? 'block' : 'none'};border-top:1px solid #34d39944;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#34d399;margin-bottom:8px;">🔍 탐험 설정</div>
          <div style="display:flex;gap:12px;margin-bottom:6px;">
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
              <input type="radio" name="exType" value="item" ${exType === 'item' ? 'checked' : ''} /> 아이템찾기
            </label>
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
              <input type="radio" name="exType" value="place" ${exType === 'place' ? 'checked' : ''} /> 장소·상황해결
            </label>
          </div>
          <div id="exItemWrap" style="display:${exType === 'item' ? 'block' : 'none'};margin-bottom:6px;position:relative;">
            <input class="input-field" id="exItemSearch" placeholder="아이템 검색..." value="${Utils.escHtml(exItemRef.name || '')}" autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="exItemResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
            <input type="hidden" id="exItemId" value="${Utils.escHtml(exItemRef.id || '')}" />
            ${exItemRef.name ? `<div id="exItemSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;">선택됨: ${Utils.escHtml(exItemRef.name)}</div>` : '<div id="exItemSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;display:none;"></div>'}
          </div>
          <div id="exPlaceWrap" style="display:${exType === 'place' ? 'block' : 'none'};margin-bottom:6px;position:relative;">
            <input class="input-field" id="exPlaceSearch" placeholder="장소 검색..." value="${Utils.escHtml(exPlaceRef.name || '')}" autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="exPlaceResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
            <input type="hidden" id="exPlaceId" value="${Utils.escHtml(exPlaceRef.id || '')}" />
            ${exPlaceRef.name ? `<div id="exPlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;">선택됨: ${Utils.escHtml(exPlaceRef.name)}</div>` : '<div id="exPlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;display:none;"></div>'}
          </div>
          <textarea class="input-field" id="exClearDesc" rows="2" placeholder="클리어 설명"
            style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.explorationConfig?.clearDesc || '')}</textarea>
        </div>

        <!-- Decapitation section -->
        <div id="sectionDecapitation" style="display:${formConcepts.has('decapitation') ? 'block' : 'none'};border-top:1px solid #f8717144;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#f87171;margin-bottom:8px;">⚔️ 참수작전 설정</div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">제거 대상</div>
          <div id="decapChips" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${decapTargets.map(t => chipHtml(t, t.type || 'monster')).join('')}</div>
          ${entitySearchHtml('decapSearch', 'decapResults', '몬스터/캐릭터 검색...')}
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-top:8px;">
            <input type="checkbox" id="decapApplyInWaves" ${g.decapitationConfig?.applyInWaves ? 'checked' : ''} /> 웨이브에서 적용
          </label>
        </div>

        <!-- Boss section -->
        <div id="sectionBoss" style="display:${formConcepts.has('boss') ? 'block' : 'none'};border-top:1px solid #c084fc44;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#c084fc;margin-bottom:8px;">👑 보스전 설정</div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">보스 위치</div>
          ${placeRefHtml('boss', bossPlace)}
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;margin-top:8px;">보스 적</div>
          <div id="bossEnemyChips" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${bossEnemies.map(e => chipHtml(e, e.type || 'monster')).join('')}</div>
          ${entitySearchHtml('bossEnemySearch', 'bossEnemyResults', '몬스터/캐릭터 검색...')}
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;margin-top:8px;">페이즈</div>
          <div id="phaseList">${bossPhases.map((p, i) => phaseRowHtml(p, i)).join('')}</div>
          <button class="btn btn-ghost btn-sm" id="btnAddPhase" style="width:100%;border:1px dashed #c084fc55;font-size:12px;color:#c084fc;margin-top:4px;">+ 페이즈 추가</button>
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

    // ── Logic helpers (used in both save callback and setTimeout) ──

    const wireSearch = (inputId, resultId, data, renderRow, onSelect) => {
      const inp = document.getElementById(inputId);
      const res = document.getElementById(resultId);
      if (!inp || !res) return;
      inp.addEventListener('input', () => {
        const q = inp.value.trim();
        if (!q) { res.style.display = 'none'; res.innerHTML = ''; return; }
        const source = typeof data === 'function' ? data() : data;
        const matches = source.filter(d => Utils.matchesQuery((d.name || '') + ' ' + (d.grade || ''), q)).slice(0, 20);
        if (!matches.length) { res.style.display = 'none'; return; }
        res.innerHTML = matches.map(d => renderRow(d)).join('');
        res.style.display = 'block';
        res.querySelectorAll('.search-row').forEach(row => {
          row.addEventListener('mousedown', e => { e.preventDefault(); onSelect(row.dataset); inp.value = ''; res.style.display = 'none'; });
        });
      });
      inp.addEventListener('blur', () => setTimeout(() => { res.style.display = 'none'; }, 200));
    };

    const entityRow = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" data-grade="${Utils.escHtml(d.grade || '')}" data-etype="${Utils.escHtml(d._etype || 'monster')}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}${d.grade ? ' (' + Utils.escHtml(d.grade) + ')' : ''} <span style="font-size:10px;color:var(--color-text-muted);">${d._etype === 'char' ? '캐릭터' : '몬스터'}</span></div>`;
    const entityRowTrap = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" data-grade="${Utils.escHtml(d.grade || '')}" data-etype="trap" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}${d.grade ? ' (' + Utils.escHtml(d.grade) + ')' : ''}</div>`;
    const itemRow = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}</div>`;
    const placeRow = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}</div>`;
    const skillRow = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}</div>`;

    const addChipToContainer = (containerId, ent, etype) => {
      const c = document.getElementById(containerId);
      if (!c) return;
      for (const chip of c.querySelectorAll('.entity-chip')) {
        if (chip.dataset.eid === ent.id) return;
      }
      const span = document.createElement('span');
      span.innerHTML = chipHtml({ id: ent.id, name: ent.name, grade: ent.grade, count: 1, unit: etype === 'char' ? '명' : etype === 'trap' ? '개' : '마리', type: etype }, etype);
      const chipEl = span.firstElementChild;
      chipEl.querySelector('.chip-del').addEventListener('click', () => chipEl.remove());
      c.appendChild(chipEl);
    };

    const readChipsFromContainer = (containerId, defaultType) => {
      const c = document.getElementById(containerId);
      if (!c) return [];
      return Array.from(c.querySelectorAll('.entity-chip')).map(chip => ({
        id: chip.dataset.eid,
        type: chip.dataset.etype || defaultType,
        name: chip.dataset.ename || '',
        grade: chip.dataset.egrade || '',
        count: parseInt(chip.querySelector('.chip-count')?.value || '1', 10) || 1,
        unit: chip.querySelector('.chip-unit')?.value || (defaultType === 'char' ? '명' : defaultType === 'trap' ? '개' : '마리'),
      }));
    };

    const wireChipDeletes = (containerId) => {
      const c = document.getElementById(containerId);
      if (!c) return;
      c.querySelectorAll('.chip-del').forEach(btn => btn.addEventListener('click', () => btn.closest('.entity-chip').remove()));
    };

    const wirePlaceRef = (prefix, refObj) => {
      const textDiv = document.getElementById(prefix + 'PlaceTextDiv');
      const refDiv = document.getElementById(prefix + 'PlaceRefDiv');
      document.querySelectorAll(`[name="${prefix}PlaceType"]`).forEach(r => {
        r.addEventListener('change', () => {
          if (textDiv) textDiv.style.display = r.value === 'text' ? 'block' : 'none';
          if (refDiv) refDiv.style.display = r.value === 'ref' ? 'block' : 'none';
        });
      });
      wireSearch(prefix + 'PlaceSearch', prefix + 'PlaceResults', allPlaces, placeRow, (ds) => {
        const idEl = document.getElementById(prefix + 'PlaceId');
        const selEl = document.getElementById(prefix + 'PlaceSelected');
        const searchEl = document.getElementById(prefix + 'PlaceSearch');
        if (idEl) idEl.value = ds.id;
        if (selEl) { selEl.textContent = '선택됨: ' + ds.name; selEl.style.display = ''; }
        if (searchEl) searchEl.value = ds.name;
        refObj.id = ds.id; refObj.name = ds.name; refObj.type = 'ref';
      });
    };

    const readPlaceRef = (prefix) => {
      let type = 'text';
      document.querySelectorAll(`[name="${prefix}PlaceType"]`).forEach(r => { if (r.checked) type = r.value; });
      if (type === 'ref') {
        return { type: 'ref', id: document.getElementById(prefix + 'PlaceId')?.value || '', name: document.getElementById(prefix + 'PlaceSearch')?.value || '', desc: '' };
      }
      return { type: 'text', id: '', name: '', desc: document.getElementById(prefix + 'PlaceText')?.value || '' };
    };

    const syncBossPhasesFromDOM = () => {
      document.querySelectorAll('#globalModalBody .phase-row').forEach(row => {
        const pidx = parseInt(row.dataset.pidx, 10);
        if (!bossPhases[pidx]) return;
        bossPhases[pidx].condition = row.querySelector('.phase-cond')?.value || '';
        bossPhases[pidx].desc = row.querySelector('.phase-desc')?.value || '';
        const attacks = [];
        row.querySelectorAll('.atk-row').forEach(ar => {
          attacks.push({ name: ar.querySelector('.atk-name')?.value || '', skillId: ar.querySelector('.atk-skill-id')?.value || '', skillName: ar.querySelector('.atk-skill-search')?.value || '', desc: ar.querySelector('.atk-desc')?.value || '' });
        });
        bossPhases[pidx].attacks = attacks;
      });
    };

    const reRenderWaveList = () => {
      const wl = document.getElementById('waveList');
      if (wl) {
        wl.innerHTML = formWaves.map((w, i) => waveRowHtml(w, i)).join('');
        wireWaveSection();
      }
    };

    const reRenderPhaseList = () => {
      const pl = document.getElementById('phaseList');
      if (pl) {
        pl.innerHTML = bossPhases.map((p, i) => phaseRowHtml(p, i)).join('');
        wireBossSection();
      }
    };

    const wireWaveSection = () => {
      const allMonChars = [
        ...allMonsters.map(m => ({ ...m, _etype: 'monster' })),
        ...allChars.map(c => ({ ...c, _etype: 'char' })),
      ];
      const getUsedEnemyIds = () => {
        const ids = new Set();
        formWaves.forEach((_, i) => { document.getElementById('waveEnemyChips' + i)?.querySelectorAll('.entity-chip').forEach(chip => ids.add(chip.dataset.eid)); });
        return ids;
      };
      const getUsedTrapIds = () => {
        const ids = new Set();
        formWaves.forEach((_, i) => { document.getElementById('waveTrapChips' + i)?.querySelectorAll('.entity-chip').forEach(chip => ids.add(chip.dataset.eid)); });
        return ids;
      };
      formWaves.forEach((w, idx) => {
        wireChipDeletes('waveEnemyChips' + idx);
        wireChipDeletes('waveTrapChips' + idx);
        wireSearch('waveEnemySearch' + idx, 'waveEnemyResults' + idx,
          () => { const used = getUsedEnemyIds(); return allMonChars.filter(m => !used.has(m.id)); },
          entityRow, (ds) => addChipToContainer('waveEnemyChips' + idx, { id: ds.id, name: ds.name, grade: ds.grade }, ds.etype)
        );
        wireSearch('waveTrapSearch' + idx, 'waveTrapResults' + idx,
          () => { const used = getUsedTrapIds(); return allTraps.filter(t => !used.has(t.id)); },
          entityRowTrap, (ds) => addChipToContainer('waveTrapChips' + idx, { id: ds.id, name: ds.name, grade: ds.grade }, 'trap')
        );
        document.querySelectorAll(`.wave-clear-type[data-widx="${idx}"]`).forEach(r => {
          r.addEventListener('change', () => {
            const wrap = document.getElementById('waveClearCustomWrap' + idx);
            if (wrap) wrap.style.display = r.value === 'custom' ? 'block' : 'none';
          });
        });
        const evCb = document.querySelector(`.wave-event-cb[data-widx="${idx}"]`);
        const evWrap = document.getElementById('waveEventWrap' + idx);
        if (evCb && evWrap) evCb.addEventListener('change', () => { evWrap.style.display = evCb.checked ? 'block' : 'none'; });
        const delBtn = document.querySelector(`.wave-del-btn[data-widx="${idx}"]`);
        if (delBtn) {
          delBtn.addEventListener('click', () => {
            document.querySelectorAll('#globalModalBody .wave-row').forEach(row => {
              const wi = parseInt(row.dataset.widx, 10);
              if (!formWaves[wi]) return;
              formWaves[wi].hasEvent = row.querySelector('.wave-event-cb')?.checked || false;
              formWaves[wi].eventDesc = row.querySelector('.wave-event-desc')?.value || '';
              const clearTypeEl = row.querySelector('.wave-clear-type:checked');
              const clearType = clearTypeEl ? clearTypeEl.value : 'enemies';
              formWaves[wi].clearConditionType = clearType;
              formWaves[wi].explorationLink = clearType === 'exploration';
              formWaves[wi].clearCondition = clearType === 'custom' ? (row.querySelector('.wave-clear-cond')?.value || '') : '';
              formWaves[wi].enemies = readChipsFromContainer('waveEnemyChips' + wi, 'monster');
              formWaves[wi].traps = readChipsFromContainer('waveTrapChips' + wi, 'trap');
            });
            formWaves.splice(idx, 1);
            reRenderWaveList();
          });
        }
      });
    };

    const wireBossSection = () => {
      wireChipDeletes('bossEnemyChips');
      const allMonChars = [
        ...allMonsters.map(m => ({ ...m, _etype: 'monster' })),
        ...allChars.map(c => ({ ...c, _etype: 'char' })),
      ];
      wireSearch('bossEnemySearch', 'bossEnemyResults', allMonChars, entityRow, (ds) => {
        addChipToContainer('bossEnemyChips', { id: ds.id, name: ds.name, grade: ds.grade }, ds.etype);
      });
      wirePlaceRef('boss', bossPlace);
      bossPhases.forEach((p, pidx) => {
        const delBtn = document.querySelector(`.phase-del-btn[data-pidx="${pidx}"]`);
        if (delBtn) {
          delBtn.addEventListener('click', () => { syncBossPhasesFromDOM(); bossPhases.splice(pidx, 1); reRenderPhaseList(); });
        }
        const addAtkBtn = document.querySelector(`.atk-add-btn[data-pidx="${pidx}"]`);
        if (addAtkBtn) {
          addAtkBtn.addEventListener('click', () => {
            syncBossPhasesFromDOM();
            if (!bossPhases[pidx].attacks) bossPhases[pidx].attacks = [];
            bossPhases[pidx].attacks.push({ name: '', skillId: '', skillName: '', desc: '' });
            reRenderPhaseList();
          });
        }
        document.querySelectorAll(`.atk-del-btn[data-pidx="${pidx}"]`).forEach(btn => {
          btn.addEventListener('click', () => { syncBossPhasesFromDOM(); bossPhases[pidx].attacks.splice(parseInt(btn.dataset.aidx, 10), 1); reRenderPhaseList(); });
        });
        document.querySelectorAll(`.atk-skill-search[data-pidx="${pidx}"]`).forEach(inp => {
          const aidx = parseInt(inp.dataset.aidx, 10);
          const resEl = document.querySelector(`.atk-skill-results[data-pidx="${pidx}"][data-aidx="${aidx}"]`);
          const idEl = document.querySelector(`.atk-skill-id[data-pidx="${pidx}"][data-aidx="${aidx}"]`);
          if (!inp || !resEl) return;
          inp.addEventListener('input', () => {
            const q = inp.value.trim();
            if (!q) { resEl.style.display = 'none'; resEl.innerHTML = ''; return; }
            const matches = allSkills.filter(s => Utils.matchesQuery(s.name || '', q)).slice(0, 20);
            if (!matches.length) { resEl.style.display = 'none'; return; }
            resEl.innerHTML = matches.map(s => skillRow(s)).join('');
            resEl.style.display = 'block';
            resEl.querySelectorAll('.search-row').forEach(row => {
              row.addEventListener('mousedown', e => { e.preventDefault(); if (idEl) idEl.value = row.dataset.id; inp.value = row.dataset.name; resEl.style.display = 'none'; });
            });
          });
          inp.addEventListener('blur', () => setTimeout(() => { resEl.style.display = 'none'; }, 200));
        });
      });
    };

    Utils.openModal(isEdit ? '던전 편집' : '새 던전 추가', body, async () => {
      const name = document.getElementById('fGateName')?.value.trim();
      if (!name) { Utils.fieldError('fGateName'); return false; }

      let type = document.getElementById('fGateType')?.value || '';
      if (type === '__custom__') { type = document.getElementById('fGateTypeCustom')?.value.trim() || ''; await self._saveCustomType(wid, type); }

      let breakType = document.getElementById('fGateBreakType')?.value || '';
      if (breakType === '__custom__') { breakType = document.getElementById('fGateBreakTypeCustom')?.value.trim() || ''; await self._saveCustomBreakType(wid, breakType); }

      const imgSlots = document.querySelectorAll('#globalModalBody .gate-img-slot');
      const images = [];
      imgSlots.forEach(slot => { const url = slot.querySelector('.gate-img-url')?.value; const caption = slot.querySelector('.gate-img-caption')?.value.trim() || ''; if (url) images.push({ url, caption }); });

      // Collect wave data
      const savedWaves = formWaves.map((w, idx) => {
        const row = document.querySelector(`.wave-row[data-widx="${idx}"]`);
        const clearTypeEl = row ? row.querySelector('.wave-clear-type:checked') : null;
        const clearType = clearTypeEl ? clearTypeEl.value : (w.clearConditionType || 'enemies');
        return {
          hasEvent: row ? (row.querySelector('.wave-event-cb')?.checked || false) : (w.hasEvent || false),
          eventDesc: row ? (row.querySelector('.wave-event-desc')?.value || '') : (w.eventDesc || ''),
          enemies: readChipsFromContainer('waveEnemyChips' + idx, 'monster'),
          traps: readChipsFromContainer('waveTrapChips' + idx, 'trap'),
          clearConditionType: clearType,
          explorationLink: clearType === 'exploration',
          clearCondition: clearType === 'custom' ? (row ? (row.querySelector('.wave-clear-cond')?.value || '') : (w.clearCondition || '')) : '',
        };
      });

      syncBossPhasesFromDOM();
      const savedBossEnemies = readChipsFromContainer('bossEnemyChips', 'monster');
      const savedBossPlace = readPlaceRef('boss');
      const savedDecapTargets = readChipsFromContainer('decapChips', 'monster');

      const exTypeVal = document.querySelector('[name="exType"]:checked')?.value || 'item';
      const savedExRef = exTypeVal === 'item'
        ? { type: 'item', id: document.getElementById('exItemId')?.value || '', name: document.getElementById('exItemSearch')?.value || '' }
        : { type: 'place', id: document.getElementById('exPlaceId')?.value || '', name: document.getElementById('exPlaceSearch')?.value || '' };

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
        concepts: [...formConcepts],
        waveConfig: formConcepts.has('wave') ? {
          hasEventFixed: document.getElementById('waveGlobalEventFixed')?.checked || false,
          fixedEventDesc: document.getElementById('waveGlobalEventDesc')?.value || '',
          waves: savedWaves,
        } : null,
        explorationConfig: formConcepts.has('exploration') ? {
          targetType: exTypeVal, target: savedExRef,
          clearDesc: document.getElementById('exClearDesc')?.value || '',
        } : null,
        decapitationConfig: formConcepts.has('decapitation') ? {
          targets: savedDecapTargets,
          applyInWaves: document.getElementById('decapApplyInWaves')?.checked || false,
        } : null,
        bossConfig: formConcepts.has('boss') ? {
          place: savedBossPlace, enemies: savedBossEnemies, phases: bossPhases.map(p => ({ ...p })),
        } : null,
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

    setTimeout(() => {
      // Type/breakType custom toggles
      const typeSelect = document.getElementById('fGateType');
      const typeCustom = document.getElementById('fGateTypeCustom');
      typeSelect?.addEventListener('change', () => { typeCustom.style.display = typeSelect.value === '__custom__' ? 'block' : 'none'; });

      const btSelect = document.getElementById('fGateBreakType');
      const btCustom = document.getElementById('fGateBreakTypeCustom');
      btSelect?.addEventListener('change', () => { btCustom.style.display = btSelect.value === '__custom__' ? 'block' : 'none'; });

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
        self._customTypes = (self._customTypes || []).filter(t => t !== btn.dataset.val);
        await DB.setSetting('gateCustomTypes_' + wid, self._customTypes);
        const allT = [...self.TYPES, ...self._customTypes];
        const typeSelectEl = document.getElementById('fGateType');
        if (typeSelectEl) {
          const cur = typeSelectEl.value;
          typeSelectEl.innerHTML = ['', ...allT, '__custom__'].map(t => t === '__custom__' ? `<option value="__custom__">기타 (직접 입력)...</option>` : `<option value="${t}"${cur === t ? ' selected' : ''}>${t || '선택 안 함'}</option>`).join('');
        }
        const itemsEl = document.getElementById('customTypeItems');
        if (itemsEl) itemsEl.innerHTML = self._customTypes.length === 0 ? '<div style="font-size:11px;color:var(--color-text-dim);">없음</div>' : self._customTypes.map(t => `<div class="custom-type-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);"><span style="font-size:12px;">${Utils.escHtml(t)}</span><button type="button" class="btn-del-custom-type" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button></div>`).join('');
      });

      // Delete custom break type
      document.getElementById('customBreakTypeItems')?.addEventListener('click', async e => {
        const btn = e.target.closest('.btn-del-custom-bt');
        if (!btn) return;
        self._customBreakTypes = (self._customBreakTypes || []).filter(t => t !== btn.dataset.val);
        await DB.setSetting('gateCustomBreakTypes_' + wid, self._customBreakTypes);
        const allBT = [...self.BREAK_TYPES, ...self._customBreakTypes];
        const btSelectEl = document.getElementById('fGateBreakType');
        if (btSelectEl) {
          const cur = btSelectEl.value;
          btSelectEl.innerHTML = ['', ...allBT, '__custom__'].map(t => t === '__custom__' ? `<option value="__custom__">기타 (직접 입력)...</option>` : `<option value="${t}"${cur === t ? ' selected' : ''}>${t || '선택 안 함'}</option>`).join('');
        }
        const itemsEl = document.getElementById('customBreakTypeItems');
        if (itemsEl) itemsEl.innerHTML = self._customBreakTypes.length === 0 ? '<div style="font-size:11px;color:var(--color-text-dim);">없음</div>' : self._customBreakTypes.map(t => `<div class="custom-bt-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);"><span style="font-size:12px;">${Utils.escHtml(t)}</span><button type="button" class="btn-del-custom-bt" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button></div>`).join('');
      });

      // Delete image slot
      document.getElementById('globalModalBody')?.addEventListener('click', e => {
        const delBtn = e.target.closest('.gate-img-del');
        if (delBtn) document.querySelector(`#globalModalBody .gate-img-slot[data-idx="${delBtn.dataset.idx}"]`)?.remove();
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
          div.innerHTML = `<div style="display:flex;align-items:center;gap:6px;"><img src="${url}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;" /><div style="flex:1;min-width:0;"><input class="input-field gate-img-caption" data-idx="${newIdx}" value="" placeholder="설명 (선택)" style="width:100%;box-sizing:border-box;font-size:12px;" /></div><button class="btn btn-ghost btn-sm gate-img-del" data-idx="${newIdx}" style="color:var(--color-danger);flex-shrink:0;">✕</button></div><input type="hidden" class="gate-img-url" data-idx="${newIdx}" value="${url}" />`;
          list.appendChild(div);
          e.target.value = '';
        } catch(err) { Utils.toast('이미지 처리 오류', 'error'); }
      });

      // Concept chip toggles
      document.querySelectorAll('.concept-cb').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) formConcepts.add(cb.value); else formConcepts.delete(cb.value);
          const sectionId = 'section' + cb.value.charAt(0).toUpperCase() + cb.value.slice(1);
          const sec = document.getElementById(sectionId);
          if (sec) sec.style.display = cb.checked ? 'block' : 'none';
        });
      });

      // Wave global controls
      document.getElementById('waveGlobalEventFixed')?.addEventListener('change', e => {
        const wrap = document.getElementById('waveGlobalEventWrap');
        if (wrap) wrap.style.display = e.target.checked ? 'block' : 'none';
      });

      wireWaveSection();

      document.getElementById('btnAddWave')?.addEventListener('click', () => {
        document.querySelectorAll('#globalModalBody .wave-row').forEach(row => {
          const wi = parseInt(row.dataset.widx, 10);
          if (!formWaves[wi]) return;
          formWaves[wi].hasEvent = row.querySelector('.wave-event-cb')?.checked || false;
          formWaves[wi].eventDesc = row.querySelector('.wave-event-desc')?.value || '';
          const clearTypeEl = row.querySelector('.wave-clear-type:checked');
          const clearType = clearTypeEl ? clearTypeEl.value : 'enemies';
          formWaves[wi].clearConditionType = clearType;
          formWaves[wi].explorationLink = clearType === 'exploration';
          formWaves[wi].clearCondition = clearType === 'custom' ? (row.querySelector('.wave-clear-cond')?.value || '') : '';
          formWaves[wi].enemies = readChipsFromContainer('waveEnemyChips' + wi, 'monster');
          formWaves[wi].traps = readChipsFromContainer('waveTrapChips' + wi, 'trap');
        });
        formWaves.push({ hasEvent: false, eventDesc: '', enemies: [], traps: [], clearCondition: '', explorationLink: false });
        reRenderWaveList();
      });

      // Exploration section
      const exItemWrap = document.getElementById('exItemWrap');
      const exPlaceWrap = document.getElementById('exPlaceWrap');
      document.querySelectorAll('[name="exType"]').forEach(r => {
        r.addEventListener('change', () => {
          if (exItemWrap) exItemWrap.style.display = r.value === 'item' ? 'block' : 'none';
          if (exPlaceWrap) exPlaceWrap.style.display = r.value === 'place' ? 'block' : 'none';
        });
      });
      wireSearch('exItemSearch', 'exItemResults', allItems, itemRow, (ds) => {
        const idEl = document.getElementById('exItemId');
        const selEl = document.getElementById('exItemSelected');
        const inp = document.getElementById('exItemSearch');
        if (idEl) idEl.value = ds.id;
        if (selEl) { selEl.textContent = '선택됨: ' + ds.name; selEl.style.display = ''; }
        if (inp) inp.value = ds.name;
        exRef.id = ds.id; exRef.name = ds.name;
      });
      wireSearch('exPlaceSearch', 'exPlaceResults', allPlaces, placeRow, (ds) => {
        const idEl = document.getElementById('exPlaceId');
        const selEl = document.getElementById('exPlaceSelected');
        const inp = document.getElementById('exPlaceSearch');
        if (idEl) idEl.value = ds.id;
        if (selEl) { selEl.textContent = '선택됨: ' + ds.name; selEl.style.display = ''; }
        if (inp) inp.value = ds.name;
        exRef.id = ds.id; exRef.name = ds.name;
      });

      // Decapitation section
      const allMonCharsForDecap = [
        ...allMonsters.map(m => ({ ...m, _etype: 'monster' })),
        ...allChars.map(c => ({ ...c, _etype: 'char' })),
      ];
      wireChipDeletes('decapChips');
      wireSearch('decapSearch', 'decapResults', allMonCharsForDecap, entityRow, (ds) => {
        addChipToContainer('decapChips', { id: ds.id, name: ds.name, grade: ds.grade }, ds.etype);
      });

      // Boss section
      wireBossSection();
      document.getElementById('btnAddPhase')?.addEventListener('click', () => {
        syncBossPhasesFromDOM();
        bossPhases.push({ condition: '', desc: '', attacks: [] });
        reRenderPhaseList();
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
      <div style="display:flex;flex-direction:column;gap:6px;">
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
