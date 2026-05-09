'use strict';
window.Pages = window.Pages || {};
window.Pages.monsters = {
  _currentId: null,
  _container: null,
  _listScrollY: 0,

  _C: null,
  DEATH_TYPES: ['자폭', '소멸', '복귀', '죽음'],
  DEATH_TYPE_DESC: {
    '자폭': '죽을때 주위에 피해 (폭발/독 분사)',
    '소멸': '회색 가루가 발끝부터 머리까지, 엄청난 고통',
    '복귀': '죽음을 일으킨 부위부터 회색가루, 고통 없음',
    '죽음': '시체 남음',
  },
  MODIFIERS: [
    '다친', '어지러운', '힘든', '감염된',
    '마기에 잠식된', '마기에 지배된', '마기에 오염된', '마기에 감염된',
    '신성에 지배된', '신성에 잠식된',
    '광분한', '슬픈', '강인한', '약화된', '강화된',
    '민첩한', '날렵한', '강력한', '단단한',
  ],

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
    const monsters = await DB.getAll('monsters', wid);

    if (this._currentId) {
      const m = monsters.find(x => x.id === this._currentId);
      if (m) { this._renderDetail(container, m, wid); return; }
    }

    this._renderList(container, monsters, wid, world);
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
    this._listScrollY = 0;
  },

  // ── LIST ────────────────────────────────────────────────────────────────────

  _renderList: function(container, monsters, wid, world) {
    this._currentId = null;
    const self = this;

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">몬스터</h2>
          <button class="btn btn-primary btn-sm" id="btnAddMonster">+ 추가</button>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${monsters.length}마리
        </p>
        <input class="input-field" id="monsterFilter" placeholder="이름, 등급, 서식지 검색... (-제외어 가능)" style="margin-top:8px;width:100%;box-sizing:border-box;" />
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;" id="gradeFilters">
          <button class="monster-grade-chip" data-grade="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-primary);color:#000;font-size:11px;cursor:pointer;">전체</button>
          ${this._C.grades.map(g => {
            const col = Utils.gradeColor(g);
            return `<button class="monster-grade-chip" data-grade="${g}" style="padding:3px 8px;border-radius:4px;border:1px solid ${col}66;background:transparent;color:${col};font-size:11px;cursor:pointer;">${g}</button>`;
          }).join('')}
        </div>
      </div>
      <div id="monsterList" class="item-list">
        ${monsters.length === 0
          ? `<div class="empty-state" style="padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">👾</div>
               <div style="font-weight:700;font-size:16px;margin-bottom:4px;">몬스터가 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 첫 몬스터를 등록하세요</div>
             </div>`
          : monsters.map(m => this._monsterCard(m)).join('')}
      </div>
    </div>`;

    let activeGrade = '';
    container.querySelectorAll('.monster-grade-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.monster-grade-chip').forEach(b => {
          const col = b.dataset.grade ? Utils.gradeColor(b.dataset.grade) : 'var(--color-text-muted)';
          b.style.background = 'transparent'; b.style.color = col;
        });
        btn.style.background = btn.dataset.grade ? Utils.gradeColor(btn.dataset.grade) : 'var(--color-primary)';
        btn.style.color = '#000';
        activeGrade = btn.dataset.grade;
        self._applyFilter(container, document.getElementById('monsterFilter')?.value || '', activeGrade);
      });
    });

    document.getElementById('monsterFilter')?.addEventListener('input', e => {
      self._applyFilter(container, e.target.value, activeGrade);
    });

    document.getElementById('btnAddMonster')?.addEventListener('click', () => {
      self._openForm(null, wid, container);
    });

    container.querySelectorAll('.monster-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-monster') || e.target.closest('.btn-edit-monster')) return;
        self._listScrollY = container.scrollTop || window.scrollY || 0;
        const id = card.dataset.id;
        DB.getAll('monsters', wid).then(all => {
          const m = all.find(x => x.id === id);
          if (m) { self._currentId = id; self._renderDetail(container, m, wid); }
        });
      });
    });

    container.querySelectorAll('.btn-edit-monster').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        DB.getAll('monsters', wid).then(all => {
          const m = all.find(x => x.id === btn.dataset.id);
          if (m) self._openForm(m, wid, container);
        });
      });
    });

    container.querySelectorAll('.btn-del-monster').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const m = monsters.find(x => x.id === id);
        Utils.confirmWithInput('몬스터 삭제', '삭제하려면 몬스터 이름을 정확히 입력하세요.', m?.name || '', async () => {
          await DB.del('monsters', id);
          Utils.toast('삭제됨', 'info');
          self.init(container);
        });
      });
    });
  },

  _applyFilter: function(container, query, grade) {
    container.querySelectorAll('.monster-card').forEach(card => {
      const cardGrade = card.dataset.grade || '';
      const gradeOk = !grade || cardGrade === grade;
      const textOk = Utils.matchesQuery(card.dataset.searchText || '', query);
      card.style.display = gradeOk && textOk ? '' : 'none';
    });
  },

  _monsterCard: function(m) {
    const gc = Utils.gradeColor(m.grade || 'F');
    const isGrad = gc.startsWith('linear');
    const badgeStyle = isGrad
      ? `background:${gc};color:#fff;`
      : `background:${gc}22;color:${gc};border:1px solid ${gc}66;`;
    const lifespanStr = this._lifespanStr(m);
    const searchText = [m.name, m.grade, m.habitat, m.deathType].filter(Boolean).join(' ').toLowerCase();

    return `
    <div class="monster-card list-item"
      data-id="${Utils.escHtml(m.id)}"
      data-grade="${Utils.escHtml(m.grade || '')}"
      data-search-text="${Utils.escHtml(searchText)}"
      style="cursor:pointer;border-left:3px solid ${isGrad ? '#fbbf24' : gc};display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--color-surface2);border-radius:12px;border:1px solid var(--color-border);margin-bottom:8px;">
      ${m.image
        ? `<img src="${m.image}" style="width:52px;height:52px;border-radius:10px;object-fit:cover;flex-shrink:0;" />`
        : `<div style="width:52px;height:52px;border-radius:10px;background:var(--color-surface3,#2a2a3a);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">👾</div>`}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
          <span class="monster-name" style="font-weight:700;font-size:15px;">${Utils.escHtml(m.name || '이름 없음')}</span>
          ${m.grade ? `<span style="font-size:11px;padding:2px 7px;border-radius:4px;font-weight:700;${badgeStyle}">${Utils.escHtml(m.grade)}</span>` : ''}
          ${m.deathType ? `<span style="font-size:11px;padding:2px 7px;border-radius:4px;background:var(--color-border);color:var(--color-text-muted);">${Utils.escHtml(m.deathType)}</span>` : ''}
        </div>
        ${lifespanStr ? `<div style="font-size:12px;color:var(--color-text-muted);">수명: ${Utils.escHtml(lifespanStr)}</div>` : ''}
        ${m.habitat ? `<div style="font-size:12px;color:var(--color-text-muted);">서식지: ${Utils.escHtml(m.habitat)}</div>` : ''}
        ${(m.skills || []).length > 0 ? `
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
            ${(m.skills || []).map(sk => `<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3);">⚡ ${Utils.escHtml(sk.name || '')}</span>`).join('')}
          </div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end;">
        <button class="btn btn-ghost btn-sm btn-edit-monster" data-id="${Utils.escHtml(m.id)}" style="font-size:11px;">편집</button>
        <button class="btn btn-ghost btn-sm btn-del-monster" data-id="${Utils.escHtml(m.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  _lifespanStr: function(m) {
    if (m.lifespanMin !== null && m.lifespanMin !== undefined &&
        m.lifespanMax !== null && m.lifespanMax !== undefined) {
      return `${m.lifespanMin}~${m.lifespanMax}년`;
    }
    if (m.lifespanMin !== null && m.lifespanMin !== undefined) return `${m.lifespanMin}년~`;
    if (m.lifespanMax !== null && m.lifespanMax !== undefined) return `~${m.lifespanMax}년`;
    return m.lifespan || '';
  },

  // ── DETAIL ──────────────────────────────────────────────────────────────────

  _renderDetail: function(container, m, wid) {
    const gc = Utils.gradeColor(m.grade || 'F');
    const isGrad = gc.startsWith('linear');
    const borderColor = isGrad ? '#fbbf24' : gc;
    const badgeStyle = isGrad
      ? `background:${gc};color:#fff;`
      : `background:${gc}22;color:${gc};border:1px solid ${gc}66;`;
    const self = this;

    const field = (label, value, multiline) => {
      if (!value && value !== 0) return '';
      const content = multiline
        ? `<div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(value))}</div>`
        : `<div style="font-size:13px;">${Utils.escHtml(String(value))}</div>`;
      return `
        <div style="margin-bottom:10px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:2px;">${Utils.escHtml(label)}</div>
          ${content}
        </div>`;
    };

    const modifiers = (m.modifier || '').split(',').map(s => s.trim()).filter(Boolean);
    const deathDesc = this.DEATH_TYPE_DESC[m.deathType] || '';
    const lifespanStr = this._lifespanStr(m);

    const skillsHtml = (m.skills || []).length === 0
      ? '<div style="font-size:13px;color:var(--color-text-muted);">스킬 없음</div>'
      : (m.skills || []).map(sk => `
          <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.22);border-radius:8px;padding:10px;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="font-weight:700;font-size:13px;">ㄴ이름: [${Utils.escHtml(sk.name || '')}]</span>
              ${sk.grade ? `<span style="font-size:11px;padding:1px 6px;border-radius:4px;background:rgba(139,92,246,0.2);color:#a78bfa;">${Utils.escHtml(sk.grade)}</span>` : ''}
            </div>
            ${sk.effects ? `<div style="font-size:12px;color:var(--color-text-muted);">ㄴㄴ효과: ${Utils.nl2br(Utils.escHtml(sk.effects))}</div>` : ''}
            ${sk.cooldown ? `<div style="font-size:12px;color:var(--color-text-muted);">ㄴㄴ쿨타임: ${Utils.escHtml(sk.cooldown)}</div>` : ''}
          </div>`).join('');

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackMonsters">← 목록</button>
          <h2 class="page-title" style="font-size:18px;">${Utils.escHtml(m.name || '몬스터')}</h2>
          ${m.grade ? `<span style="font-size:12px;padding:3px 9px;border-radius:6px;font-weight:700;${badgeStyle}">${Utils.escHtml(m.grade)}</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditMonster">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnCopyMonsterText">텍스트 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnPickSkills">스킬 관리</button>
          <button class="btn btn-ghost btn-sm" id="btnCopyToWorld">다른 세계로 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnDelMonsterDetail" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      ${m.image ? `<div style="text-align:center;margin-bottom:16px;"><img src="${m.image}" style="max-width:200px;max-height:220px;border-radius:12px;object-fit:cover;" /></div>` : ''}

      <div style="background:var(--color-surface2);border-radius:10px;padding:16px;margin-bottom:10px;">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:12px;letter-spacing:1px;">기본 정보</div>
        ${field('이름', m.name)}
        ${field('등급', m.grade)}
        ${lifespanStr ? field('수명', lifespanStr) : ''}
        ${field('서식 지역', m.habitat)}
        ${m.deathType ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:2px;">죽음 유형</div>
            <div style="font-size:13px;">${Utils.escHtml(m.deathType)}${deathDesc ? ` <span style="color:var(--color-text-muted);font-size:12px;">— ${Utils.escHtml(deathDesc)}</span>` : ''}</div>
          </div>` : ''}
      </div>

      <div style="background:var(--color-surface2);border-radius:10px;padding:16px;margin-bottom:10px;">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:12px;letter-spacing:1px;">특성</div>
        ${field('특징', m.features, true)}
        ${field('강점', m.strengths, true)}
        ${field('약점', m.weaknesses, true)}
      </div>

      <div style="background:var(--color-surface2);border-radius:10px;padding:16px;margin-bottom:10px;">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:10px;letter-spacing:1px;">스킬</div>
        ${skillsHtml}
      </div>

      ${m.loot ? `
        <div style="background:var(--color-surface2);border-radius:10px;padding:16px;margin-bottom:10px;">
          <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:10px;letter-spacing:1px;">전리품</div>
          <div style="font-size:13px;white-space:pre-wrap;line-height:1.7;">${Utils.nl2br(Utils.escHtml(m.loot))}</div>
        </div>` : ''}

      ${(m.authorNotes || modifiers.length) ? `
        <div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:12px;">
          <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:8px;">작가 메모 (소설에 미표시)</div>
          ${modifiers.length ? `
            <div style="margin-bottom:8px;">
              <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">수식언 <span style="color:var(--color-text-dim);">(이름 앞 부착 가능)</span></div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;">
                ${modifiers.map(mod => `<span style="font-size:12px;padding:2px 8px;border-radius:6px;background:rgba(251,191,36,0.08);color:#fbbf24;border:1px solid rgba(251,191,36,0.25);">
                  ${Utils.escHtml(mod)} ${Utils.escHtml(m.name || '')}
                </span>`).join('')}
              </div>
            </div>` : ''}
          ${m.authorNotes ? `<div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(m.authorNotes))}</div>` : ''}
        </div>` : ''}

      <div style="font-size:11px;color:var(--color-text-dim);text-align:right;">
        수정: ${Utils.formatDate(m.updatedAt)} · 생성: ${Utils.formatDate(m.createdAt)}
      </div>
    </div>`;

    document.getElementById('btnBackMonsters')?.addEventListener('click', async () => {
      const y = self._listScrollY || 0;
      self._currentId = null;
      await self.init(container);
      requestAnimationFrame(() => { container.scrollTop = y; if (y > 0) window.scrollTo(0, y); });
    });
    document.getElementById('btnEditMonster')?.addEventListener('click', () => self._openForm(m, wid, container));
    document.getElementById('btnDelMonsterDetail')?.addEventListener('click', () => {
      Utils.confirmWithInput('몬스터 삭제', '삭제하려면 몬스터 이름을 정확히 입력하세요.', m.name || '', async () => {
        await DB.del('monsters', m.id);
        Utils.toast('삭제됨', 'info');
        self._currentId = null;
        self.init(container);
      });
    });
    document.getElementById('btnCopyMonsterText')?.addEventListener('click', () => {
      Utils.copyText(self._exportText(m));
      Utils.toast('복사됨', 'success');
    });
    document.getElementById('btnPickSkills')?.addEventListener('click', () => {
      self._openSkillPicker(m, wid, container);
    });
    document.getElementById('btnCopyToWorld')?.addEventListener('click', () => {
      self._openCopyToWorld(m, wid);
    });
  },

  // ── SKILL PICKER ────────────────────────────────────────────────────────────

  _openSkillPicker: async function(m, wid, container) {
    const allSkills = await DB.getAll('skills', wid);
    if (!allSkills.length) { Utils.toast('스킬 라이브러리가 비어 있습니다', 'error'); return; }

    const currentIds = new Set((m.skills || []).map(s => s.id));
    const rows = allSkills.map(sk => {
      const col = Utils.gradeColor(sk.grade || 'F');
      return `
        <label style="display:flex;align-items:center;gap:10px;padding:8px 4px;cursor:pointer;border-bottom:1px solid var(--color-border);">
          <input type="checkbox" data-skid="${Utils.escHtml(sk.id)}" ${currentIds.has(sk.id) ? 'checked' : ''} style="width:16px;height:16px;flex-shrink:0;" />
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-weight:600;font-size:13px;">⚡ ${Utils.escHtml(sk.name || '')}</span>
              ${sk.grade ? `<span style="font-size:11px;padding:1px 5px;border-radius:3px;background:${col}22;color:${col};border:1px solid ${col}55;">${Utils.escHtml(sk.grade)}</span>` : ''}
            </div>
            ${sk.cooldown ? `<div style="font-size:11px;color:var(--color-text-muted);">쿨타임: ${Utils.escHtml(sk.cooldown)}</div>` : ''}
          </div>
        </label>`;
    }).join('');

    Utils.openModal('스킬 선택', `<div style="max-height:60vh;overflow-y:auto;">${rows}</div>`, async () => {
      const selected = [...document.querySelectorAll('input[data-skid]:checked')]
        .map(cb => {
          const sk = allSkills.find(s => s.id === cb.dataset.skid);
          return sk ? { id: sk.id, name: sk.name, grade: sk.grade || '', effects: sk.effects || '', cooldown: sk.cooldown || '' } : null;
        }).filter(Boolean);
      m.skills = selected;
      m.updatedAt = Date.now();
      await DB.put('monsters', m);
      Utils.toast('스킬 저장됨', 'success');
      this._renderDetail(container, m, wid);
      return true;
    }, '저장');
  },

  // ── COPY TO WORLD ────────────────────────────────────────────────────────────

  _openCopyToWorld: function(m, wid) {
    const worlds = AppStore.getState().worlds.filter(w => w.id !== wid);
    if (!worlds.length) { Utils.toast('다른 세계가 없습니다', 'error'); return; }
    Utils.openModal('다른 세계로 복사', `
      <div class="form-group">
        <label class="form-label">복사할 세계 선택</label>
        <select class="select-input" id="copyMonsterWorld" style="width:100%;">
          ${worlds.map(w => `<option value="${Utils.escHtml(w.id)}">${Utils.escHtml(w.name)}</option>`).join('')}
        </select>
      </div>`, async () => {
      const tid = document.getElementById('copyMonsterWorld')?.value;
      if (!tid) return false;
      await DB.put('monsters', { ...m, id: DB.genId(), worldId: tid, createdAt: Date.now(), updatedAt: Date.now() });
      Utils.toast('복사됨', 'success');
      return true;
    }, '복사');
  },

  // ── FORM ────────────────────────────────────────────────────────────────────

  _openForm: function(monster, wid, container) {
    const isEdit = !!monster;
    const self = this;
    const m = monster || {};
    let newImage = m.image || null;

    const gradeOpts = ['', ...this._C.grades].map(g =>
      `<option value="${g}" ${(m.grade || '') === g ? 'selected' : ''}>${g || '선택 안 함'}</option>`).join('');
    const deathOpts = ['', ...this.DEATH_TYPES].map(d =>
      `<option value="${d}" ${(m.deathType || '') === d ? 'selected' : ''}>${d || '선택 안 함'}</option>`).join('');

    const currentMods = new Set((m.modifier || '').split(',').map(s => s.trim()).filter(Boolean));
    const modCheckboxes = this.MODIFIERS.map(mod => `
      <label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;margin:2px 4px;cursor:pointer;white-space:nowrap;">
        <input type="checkbox" class="mod-check" data-mod="${Utils.escHtml(mod)}" ${currentMods.has(mod) ? 'checked' : ''} />
        ${Utils.escHtml(mod)}
      </label>`).join('');

    const tf = (id, label, val, placeholder) => `
      <div class="form-group">
        <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">${label}</label>
        <input class="input-field" id="${id}" value="${Utils.escHtml(val || '')}" placeholder="${placeholder || ''}" style="width:100%;box-sizing:border-box;" />
      </div>`;

    const ta = (id, label, val, rows) => `
      <div class="form-group">
        <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">${label}</label>
        <textarea class="input-field" id="${id}" rows="${rows || 3}" style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(val || '')}</textarea>
      </div>`;

    const lifespanMinVal = m.lifespanMin !== null && m.lifespanMin !== undefined ? String(m.lifespanMin) : '';
    const lifespanMaxVal = m.lifespanMax !== null && m.lifespanMax !== undefined ? String(m.lifespanMax) : '';

    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;max-height:72vh;overflow-y:auto;padding-right:4px;">
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">이미지</label>
          <div id="monsterImgPreview" style="margin-bottom:6px;">
            ${m.image ? `<img src="${m.image}" style="max-width:120px;border-radius:8px;" />` : ''}
          </div>
          <input type="file" id="monsterImageFile" accept="image/*" style="font-size:13px;" />
        </div>
        ${tf('fMName', '이름 *', m.name, '몬스터 이름')}
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">등급</label>
          <select class="select-input" id="fMGrade" style="width:100%;">${gradeOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">수명 (년)</label>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="number" class="input-field" id="fMLifespanMin" value="${Utils.escHtml(lifespanMinVal)}"
              placeholder="최소 (0~1999)" min="0" max="1999" style="flex:1;box-sizing:border-box;" />
            <span style="color:var(--color-text-muted);flex-shrink:0;">~</span>
            <input type="number" class="input-field" id="fMLifespanMax" value="${Utils.escHtml(lifespanMaxVal)}"
              placeholder="최대 (0~1999)" min="0" max="1999" style="flex:1;box-sizing:border-box;" />
          </div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">정수만 입력 · 예: 0 ~ 1999</div>
        </div>
        ${ta('fMFeatures', '특징', m.features, 3)}
        ${ta('fMStrengths', '강점', m.strengths, 2)}
        ${ta('fMWeaknesses', '약점', m.weaknesses, 2)}
        ${tf('fMHabitat', '서식 지역', m.habitat, '서식 지역')}
        ${ta('fMLoot', '전리품', m.loot, 2)}
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">죽음 유형</label>
          <select class="select-input" id="fMDeathType" style="width:100%;">${deathOpts}</select>
          <div id="deathTypeDesc" style="font-size:11px;color:var(--color-text-muted);margin-top:4px;min-height:14px;"></div>
        </div>

        <!-- 작가 전용 영역 -->
        <div style="border-top:1px dashed var(--color-border);padding-top:10px;">
          <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:8px;">작가 전용 (소설에 미표시)</div>
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:6px;display:block;">
              수식언 <span style="font-size:11px;font-weight:400;color:var(--color-text-muted);">(이름 앞에 붙을 수 있는 상태 접두어)</span>
            </label>
            <div style="background:var(--color-surface3,#2a2a3a);border:1px solid var(--color-border);border-radius:8px;padding:8px;display:flex;flex-wrap:wrap;">
              ${modCheckboxes}
            </div>
          </div>
          ${ta('fMAuthorNotes', '작가 메모', m.authorNotes, 2)}
        </div>
      </div>`;

    Utils.openModal(isEdit ? '몬스터 편집' : '새 몬스터', body, async () => {
      const name = document.getElementById('fMName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }

      const imgFile = document.getElementById('monsterImageFile')?.files?.[0];
      if (imgFile) newImage = await Utils.imageToBase64(imgFile);

      const modifier = [...document.querySelectorAll('.mod-check:checked')]
        .map(cb => cb.dataset.mod).filter(Boolean).join(', ');

      const minRaw = document.getElementById('fMLifespanMin')?.value;
      const maxRaw = document.getElementById('fMLifespanMax')?.value;

      const data = {
        id: m.id || DB.genId(),
        worldId: wid,
        name,
        grade:        document.getElementById('fMGrade')?.value || '',
        lifespanMin:  minRaw !== '' && minRaw !== undefined ? Number(minRaw) : null,
        lifespanMax:  maxRaw !== '' && maxRaw !== undefined ? Number(maxRaw) : null,
        features:     document.getElementById('fMFeatures')?.value.trim() || '',
        strengths:    document.getElementById('fMStrengths')?.value.trim() || '',
        weaknesses:   document.getElementById('fMWeaknesses')?.value.trim() || '',
        habitat:      document.getElementById('fMHabitat')?.value.trim() || '',
        loot:         document.getElementById('fMLoot')?.value.trim() || '',
        skills:       m.skills || [],
        deathType:    document.getElementById('fMDeathType')?.value || '',
        modifier,
        authorNotes:  document.getElementById('fMAuthorNotes')?.value.trim() || '',
        image:        newImage,
        createdAt:    m.createdAt || Date.now(),
        updatedAt:    Date.now(),
      };

      await DB.put('monsters', data);
      await AppStore.updateStreak();
      await AppStore.recordActivity('monsters', !isEdit);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      self._currentId = data.id;
      const updated = await DB.get('monsters', data.id);
      if (updated) self._renderDetail(container, updated, wid);
      else self.init(container);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      const dtSel  = document.getElementById('fMDeathType');
      const dtDesc = document.getElementById('deathTypeDesc');
      if (dtSel && dtDesc) {
        const updateDesc = () => { dtDesc.textContent = self.DEATH_TYPE_DESC[dtSel.value] || ''; };
        dtSel.addEventListener('change', updateDesc);
        updateDesc();
      }
      document.getElementById('monsterImageFile')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        newImage = await Utils.imageToBase64(file);
        const prev = document.getElementById('monsterImgPreview');
        if (prev) prev.innerHTML = `<img src="${newImage}" style="max-width:120px;border-radius:8px;" />`;
      });
    }, 50);
  },

  // ── EXPORT ──────────────────────────────────────────────────────────────────

  _exportText: function(m) {
    const lines = [];
    const add = (label, val) => { if (val || val === 0) lines.push(`${label}: ${val}`); };
    add('이름', m.name);
    const ls = this._lifespanStr(m);
    if (ls) add('수명', ls);
    if (m.features)  lines.push(`특징: ${m.features}`);
    if (m.strengths) lines.push(`강점: ${m.strengths}`);
    if (m.weaknesses)lines.push(`약점: ${m.weaknesses}`);
    add('서식 지역', m.habitat);
    if (m.loot) lines.push(`전리품: ${m.loot}`);
    if ((m.skills || []).length > 0) {
      lines.push('ㅣ스킬');
      (m.skills || []).forEach(sk => {
        lines.push(`ㄴ이름: [${sk.name || ''}]`);
        if (sk.effects) lines.push(`ㄴㄴ효과: ${sk.effects}`);
        if (sk.cooldown) lines.push(`ㄴㄴ쿨타임: ${sk.cooldown}`);
      });
    }
    add('죽음 유형', m.deathType);
    return lines.join('\n');
  },
};
