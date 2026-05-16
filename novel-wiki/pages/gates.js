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
            if (concepts.includes('defense') && gate.defenseConfig) {
              const dc = gate.defenseConfig;
              const targetNames = (dc.targets || []).map(t => Utils.escHtml(t.name)).join(', ');
              const invaderNames = (dc.invaders || []).map(e => Utils.escHtml(e.name)).join(', ');
              const defenderNames = (dc.defenders || []).map(e => Utils.escHtml(e.name)).join(', ');
              details += `<div style="font-size:12px;margin-bottom:4px;">🛡️ 방어전${targetNames ? ` — 지킬 대상: ${targetNames}` : ''}${invaderNames ? ` / 침공군: ${invaderNames}` : ''}${defenderNames ? ` / 방어군: ${defenderNames}` : ''}</div>`;
            }
            if (concepts.includes('siege') && gate.siegeConfig) {
              const sc = gate.siegeConfig;
              const targetNames = (sc.targets || []).map(t => Utils.escHtml(t.name)).join(', ');
              const defenderNames = (sc.defenders || []).map(e => Utils.escHtml(e.name)).join(', ');
              const attackerNames = (sc.attackers || []).map(e => Utils.escHtml(e.name)).join(', ');
              details += `<div style="font-size:12px;margin-bottom:4px;">⚔️ 공성전${targetNames ? ` — 공략 대상: ${targetNames}` : ''}${defenderNames ? ` / 수비군: ${defenderNames}` : ''}${attackerNames ? ` / 공격군: ${attackerNames}` : ''}</div>`;
            }
            if (concepts.includes('speedrun') && gate.speedrunConfig) {
              const src = gate.speedrunConfig;
              details += `<div style="font-size:12px;margin-bottom:4px;">🏃 스피드런 — 제한: ${Utils.escHtml(src.timeLimit || '?')}${src.scope ? ` (${Utils.escHtml(src.scope)})` : ''}</div>`;
            }
            if (concepts.includes('survival') && gate.survivalConfig) {
              const sv = gate.survivalConfig;
              const monNames = (sv.monsters || []).map(e => Utils.escHtml(e.name)).join(', ');
              const statCount = (sv.statReductions || []).length;
              details += `<div style="font-size:12px;margin-bottom:4px;">⏳ 생존 — 목표: ${Utils.escHtml(sv.duration || '?')}${monNames ? ` / 위협: ${monNames}` : ''}${statCount > 0 ? ` / 스텟감소 ${statCount}종` : ''}</div>`;
            }
            return `<div style="margin-bottom:10px;">
              <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">컨셉</div>
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">${badges}</div>
              <div>${details || '<span style="font-size:12px;color:var(--color-text-dim);">-</span>'}</div>
            </div>`;
          })()}
          ${(() => {
            const featureEntries = gate.featureEntries || [];
            if (featureEntries.length > 0) {
              const REF_ICONS_D = { monster: '👾', stat: '📊', skill: '✨', '': '📝' };
              const listHtml = featureEntries.map((e, i) => {
                const refBadge = e.refType ? `<span style="font-size:11px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:4px;padding:1px 5px;margin-right:4px;">${REF_ICONS_D[e.refType] || '📝'} ${Utils.escHtml(e.refName)}</span>` : '';
                return `<div style="margin-bottom:4px;"><span style="font-size:12px;color:var(--color-primary);font-weight:700;">${i+1}. </span>${refBadge}<span style="font-size:13px;">${Utils.escHtml(e.text)}</span></div>`;
              }).join('');
              return `<div style="margin-bottom:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">📌 특징</div>${listHtml}</div>`;
            } else if (gate.features) {
              return field('특징', gate.features, true);
            }
            return '';
          })()}
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
};
