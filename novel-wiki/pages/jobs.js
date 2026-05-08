'use strict';
window.Pages = window.Pages || {};
window.Pages.jobs = {
  _currentId: null,
  _container: null,

  GRADES: ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS', 'G', 'GG', 'GGG', 'EX'],
  TYPES: ['전사계', '마법사계', '성직자계', '도적계', '궁수계', '특수계', '하이브리드', '기타'],
  STAT_KEYS: ['힘', '민첩', '체력', '마나', '마력', '재능', '잠재력', '행운', '신성력', '정신력', '투지', '집중력'],

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

    const jobs = await DB.getAll('jobs', wid);
    if (options.highlightId) this._currentId = options.highlightId;

    if (this._currentId) {
      const job = jobs.find(x => x.id === this._currentId);
      if (job) { this._renderDetail(container, job, wid); return; }
    }

    this._renderList(container, jobs, wid);
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  },

  // ── LIST ────────────────────────────────────────────────────────────────────

  _renderList: function(container, jobs, wid) {
    this._currentId = null;
    const world = AppStore.getState().currentWorld;

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">직업/클래스</h2>
          <button class="btn btn-primary btn-sm" id="btnAddJob">+ 추가</button>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${jobs.length}개
        </p>
        <input class="input-field" id="jobFilter" placeholder="이름, 등급, 계열 검색..." style="margin-top:8px;width:100%;box-sizing:border-box;" />
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;" id="gradeFilters">
          <button class="filter-chip active" data-grade="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-primary);color:#000;font-size:11px;cursor:pointer;">전체</button>
          ${this.GRADES.map(g => `<button class="filter-chip" data-grade="${g}" style="padding:3px 8px;border-radius:4px;border:1px solid ${Utils.gradeColor(g)}66;background:transparent;color:${Utils.gradeColor(g)};font-size:11px;cursor:pointer;">${g}</button>`).join('')}
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;" id="typeFilters">
          <button class="filter-chip-type" data-type="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface2);color:var(--color-text);font-size:11px;cursor:pointer;">전체 계열</button>
          ${this.TYPES.map(t => `<button class="filter-chip-type" data-type="${t}" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);font-size:11px;cursor:pointer;">${t}</button>`).join('')}
        </div>
      </div>

      <div id="jobList" class="item-list">
        ${jobs.length === 0
          ? `<div class="empty-state" style="padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">⚔️</div>
               <div style="font-weight:700;font-size:16px;margin-bottom:4px;">직업이 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 직업을 등록하세요</div>
             </div>`
          : jobs.map(j => this._jobCard(j)).join('')}
      </div>
    </div>`;

    let activeGrade = '';
    let activeType = '';

    container.querySelectorAll('.filter-chip[data-grade]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-chip[data-grade]').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = b.dataset.grade ? Utils.gradeColor(b.dataset.grade) : 'var(--color-text-muted)';
        });
        btn.style.background = btn.dataset.grade ? Utils.gradeColor(btn.dataset.grade) : 'var(--color-primary)';
        btn.style.color = '#000';
        activeGrade = btn.dataset.grade;
        this._applyFilter(container, document.getElementById('jobFilter')?.value || '', activeGrade, activeType);
      });
    });

    container.querySelectorAll('.filter-chip-type[data-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-chip-type[data-type]').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = 'var(--color-text-muted)';
        });
        btn.style.background = 'var(--color-surface2)';
        btn.style.color = 'var(--color-text)';
        activeType = btn.dataset.type;
        this._applyFilter(container, document.getElementById('jobFilter')?.value || '', activeGrade, activeType);
      });
    });

    document.getElementById('jobFilter')?.addEventListener('input', e => {
      this._applyFilter(container, e.target.value, activeGrade, activeType);
    });

    document.getElementById('btnAddJob')?.addEventListener('click', () => {
      this._openForm(null, wid, container);
    });

    container.querySelectorAll('.job-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-job')) return;
        const id = card.dataset.id;
        DB.getAll('jobs', wid).then(all => {
          const j = all.find(x => x.id === id);
          if (j) { this._currentId = j.id; this._renderDetail(container, j, wid); }
        });
      });
    });

    container.querySelectorAll('.btn-del-job').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const j = jobs.find(x => x.id === btn.dataset.id);
        Utils.confirm(`"${j?.name || '이 직업'}" 삭제`, '삭제하시겠습니까?', async () => {
          await DB.del('jobs', btn.dataset.id);
          Utils.toast('삭제됨', 'info');
          this.init(container);
        });
      });
    });
  },

  _applyFilter: function(container, query, grade, type) {
    const q = (query || '').toLowerCase();
    container.querySelectorAll('.job-card').forEach(card => {
      const text = (card.dataset.searchText || '').toLowerCase();
      const cardGrade = card.dataset.grade || '';
      const cardType = card.dataset.type || '';
      const gradeOk = !grade || cardGrade === grade;
      const typeOk = !type || cardType === type;
      const textOk = !q || text.includes(q);
      card.style.display = gradeOk && typeOk && textOk ? '' : 'none';
    });
  },

  _jobCard: function(j) {
    const gc = Utils.gradeColor(j.grade || 'F');
    const skillCount = (j.skills || []).length;
    const searchText = [j.name, j.grade, j.type, j.effects, j.description].filter(Boolean).join(' ').toLowerCase();
    return `
    <div class="job-card list-item"
      data-id="${Utils.escHtml(j.id)}"
      data-grade="${Utils.escHtml(j.grade || '')}"
      data-type="${Utils.escHtml(j.type || '')}"
      data-search-text="${Utils.escHtml(searchText)}"
      style="cursor:pointer;border-left:3px solid ${gc};display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--color-surface2);border-radius:10px;border:1px solid var(--color-border);margin-bottom:8px;">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${Utils.gradeBadge(j.grade || 'F')}
          <span style="font-weight:700;font-size:14px;">${Utils.escHtml(j.name || '이름 없음')}</span>
          ${j.type ? `<span style="font-size:11px;padding:1px 6px;background:var(--color-border);border-radius:3px;color:var(--color-text-muted);">${Utils.escHtml(j.type)}</span>` : ''}
          ${skillCount > 0 ? `<span style="font-size:11px;color:var(--color-accent);">⚡${skillCount}개 스킬</span>` : ''}
        </div>
        ${j.effects ? `<div style="font-size:12px;color:var(--color-text-dim);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(j.effects)}</div>` : ''}
        ${j.description ? `<div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:italic;">${Utils.escHtml(j.description)}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm btn-del-job" data-id="${Utils.escHtml(j.id)}" style="color:var(--color-danger);font-size:11px;flex-shrink:0;">삭제</button>
    </div>`;
  },

  // ── DETAIL ──────────────────────────────────────────────────────────────────

  _renderDetail: function(container, j, wid) {
    const gc = Utils.gradeColor(j.grade || 'F');
    const isGradient = gc.startsWith('linear');
    const borderColor = isGradient ? '#fbbf24' : gc;
    const statEffects = j.statEffects || {};
    const statLines = Object.entries(statEffects).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== 0);
    const skills = j.skills || [];

    container.innerHTML = `
    <div class="page active">
      <div class="page-header" style="border-left:4px solid ${borderColor};padding-left:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackJobs">← 목록</button>
          ${Utils.gradeBadge(j.grade || 'F')}
          <h2 class="page-title" style="margin:0;font-size:18px;">${Utils.escHtml(j.name || '이름 없음')}</h2>
          ${j.type ? `<span style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:12px;">${Utils.escHtml(j.type)}</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditJob">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnCopyJobText">텍스트 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnDelJobDetail" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      <div style="border:1px solid ${borderColor}44;border-radius:12px;padding:16px;background:${borderColor}08;margin-bottom:16px;">

        <!-- 직업 효과 (effects text field) -->
        ${j.effects ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">직업 효과</div>
            <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(j.effects))}</div>
          </div>` : ''}

        <!-- 스탯 보너스 -->
        ${statLines.length ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">스탯 보너스</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${statLines.map(([k, v]) => `
                <span style="padding:3px 10px;background:var(--color-border);border-radius:4px;font-size:12px;font-weight:600;">
                  ${Utils.escHtml(k)}: ${Number(v) > 0 ? '+' : ''}${Utils.escHtml(String(v))}
                </span>`).join('')}
            </div>
          </div>` : ''}

        <!-- 스킬 badges with click-through -->
        ${skills.length ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">직업 스킬 (${skills.length}개)</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${skills.map(s => `
                <span class="job-skill-badge" data-skill-id="${Utils.escHtml(s.id)}"
                  style="cursor:pointer;padding:4px 10px;border-radius:8px;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);font-size:12px;display:inline-flex;align-items:center;gap:5px;transition:background .15s;"
                  title="클릭하여 스킬 상세로 이동">
                  ⚡ ${Utils.escHtml(s.name || '')}
                  ${s.grade ? Utils.gradeBadge(s.grade) : ''}
                </span>`).join('')}
            </div>
          </div>` : ''}

        <!-- 설명 -->
        ${j.description ? `
          <div style="margin-top:12px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">설명</div>
            <div style="white-space:pre-wrap;font-size:13px;font-style:italic;color:var(--color-text-muted);line-height:1.7;">${Utils.nl2br(Utils.escHtml(j.description))}</div>
          </div>` : ''}
      </div>

      <!-- 작가 메모 -->
      ${j.authorNotes ? `
        <div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:16px;">
          <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:4px;">작가 전용 메모 (소설에 미표시)</div>
          <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(j.authorNotes))}</div>
        </div>` : ''}

      <div style="font-size:11px;color:var(--color-text-dim);text-align:right;">
        수정: ${Utils.formatDate(j.updatedAt)} · 생성: ${Utils.formatDate(j.createdAt)}
      </div>
    </div>`;

    document.getElementById('btnBackJobs')?.addEventListener('click', () => this.init(container));
    document.getElementById('btnEditJob')?.addEventListener('click', () => this._openForm(j, wid, container));
    document.getElementById('btnDelJobDetail')?.addEventListener('click', () => {
      Utils.confirm(`"${j.name}" 삭제`, '삭제하시겠습니까?', async () => {
        await DB.del('jobs', j.id);
        Utils.toast('삭제됨', 'info');
        this._currentId = null;
        this.init(container);
      });
    });
    document.getElementById('btnCopyJobText')?.addEventListener('click', () => {
      Utils.copyText(this._exportText(j));
      Utils.toast('복사됨', 'success');
    });

    // Skill badge click-through
    container.querySelectorAll('.job-skill-badge').forEach(badge => {
      badge.addEventListener('click', () => {
        const skillId = badge.dataset.skillId;
        if (skillId) AppRouter.navigate('skills', { highlightId: skillId });
      });
      badge.addEventListener('mouseenter', () => { badge.style.background = 'rgba(139,92,246,0.22)'; });
      badge.addEventListener('mouseleave', () => { badge.style.background = 'rgba(139,92,246,0.12)'; });
    });
  },

  // ── FORM ────────────────────────────────────────────────────────────────────

  _openForm: async function(job, wid, container) {
    const isEdit = !!job;
    const self = this;
    const j = job || {};
    const allSkills = await DB.getAll('skills', wid);
    const statEffects = j.statEffects || {};
    const selectedSkillIds = new Set((j.skills || []).map(s => s.id));

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;max-height:72vh;overflow-y:auto;padding-right:4px;">
        <div class="form-group">
          <label class="form-label">이름 *</label>
          <input class="input-field" id="fJobName" value="${Utils.escHtml(j.name || '')}" placeholder="직업 이름" style="width:100%;box-sizing:border-box;" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">등급</label>
            <select class="select-input" id="fJobGrade" style="width:100%;">
              ${this.GRADES.map(g => `<option value="${g}" ${(j.grade || 'F') === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">계열</label>
            <select class="select-input" id="fJobType" style="width:100%;">
              <option value="">선택 안 함</option>
              ${this.TYPES.map(t => `<option value="${t}" ${(j.type || '') === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">직업 효과 <span style="font-size:11px;color:var(--color-text-dim);">(부여되는 능력/보너스 서술)</span></label>
          <textarea class="textarea-field" id="fJobEffects" rows="3" style="width:100%;box-sizing:border-box;">${Utils.escHtml(j.effects || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">스탯 보너스</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            ${this.STAT_KEYS.map(k => `
              <div style="display:flex;gap:6px;align-items:center;">
                <label style="font-size:12px;min-width:52px;color:var(--color-text-muted);">${k}</label>
                <input type="number" class="input-field stat-bonus-input" data-stat="${Utils.escHtml(k)}"
                  value="${statEffects[k] !== undefined ? statEffects[k] : ''}" placeholder="0"
                  style="width:100%;box-sizing:border-box;padding:6px 8px;" />
              </div>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">직업 스킬 <span style="font-size:11px;color:var(--color-text-muted);">(스킬 라이브러리에서 선택)</span></label>
          ${allSkills.length === 0
            ? `<div style="font-size:12px;color:var(--color-text-muted);padding:8px;border:1px solid var(--color-border);border-radius:8px;">스킬 라이브러리가 비어 있습니다. 먼저 스킬을 추가하세요.</div>`
            : `<div style="max-height:180px;overflow-y:auto;border:1px solid var(--color-border);border-radius:8px;padding:8px;">
                ${allSkills.map(sk => `
                  <label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;border-bottom:1px solid var(--color-border);">
                    <input type="checkbox" class="job-skill-check"
                      data-skill-id="${Utils.escHtml(sk.id)}"
                      data-skill-name="${Utils.escHtml(sk.name || '')}"
                      data-skill-grade="${Utils.escHtml(sk.grade || '')}"
                      ${selectedSkillIds.has(sk.id) ? 'checked' : ''} />
                    <span style="flex:1;font-size:13px;">${Utils.gradeBadge(sk.grade || 'F')} ${Utils.escHtml(sk.name || '')}</span>
                  </label>`).join('')}
               </div>`}
        </div>
        <div class="form-group">
          <label class="form-label">설명 (소설 표시용)</label>
          <textarea class="textarea-field" id="fJobDesc" rows="3" style="width:100%;box-sizing:border-box;">${Utils.escHtml(j.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">작가 메모 <span style="font-size:11px;color:var(--color-text-dim);">(소설에 미표시)</span></label>
          <textarea class="textarea-field" id="fJobAuthor" rows="2" style="width:100%;box-sizing:border-box;">${Utils.escHtml(j.authorNotes || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '직업 편집' : '새 직업', body, async () => {
      const name = document.getElementById('fJobName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }

      // Collect stat bonuses
      const statEffectsOut = {};
      document.querySelectorAll('#globalModalBody .stat-bonus-input').forEach(inp => {
        const val = inp.value.trim();
        if (val !== '' && val !== '0' && !isNaN(Number(val))) {
          statEffectsOut[inp.dataset.stat] = Number(val);
        }
      });

      // Collect picked skills
      const pickedSkills = [];
      document.querySelectorAll('#globalModalBody .job-skill-check:checked').forEach(chk => {
        pickedSkills.push({ id: chk.dataset.skillId, name: chk.dataset.skillName, grade: chk.dataset.skillGrade });
      });

      const record = {
        ...(j || {}),
        worldId: wid,
        name,
        grade: document.getElementById('fJobGrade')?.value || 'F',
        type: document.getElementById('fJobType')?.value || '',
        effects: document.getElementById('fJobEffects')?.value.trim() || '',
        statEffects: statEffectsOut,
        skills: pickedSkills,
        description: document.getElementById('fJobDesc')?.value.trim() || '',
        authorNotes: document.getElementById('fJobAuthor')?.value.trim() || '',
        id: j.id || DB.genId(),
        createdAt: j.createdAt || Date.now(),
      };

      await DB.put('jobs', record);
      await AppStore.updateStreak();
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      self._currentId = record.id;
      const updated = await DB.get('jobs', record.id);
      if (updated) self._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');
  },

  // ── EXPORT ──────────────────────────────────────────────────────────────────

  _exportText: function(j) {
    const statEffects = j.statEffects || {};
    const statLines = Object.entries(statEffects).filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== 0)
      .map(([k, v]) => `${k}: ${Number(v) > 0 ? '+' : ''}${v}`).join(', ');
    return Utils.toTextExport(`직업: ${j.name}`, [
      ['등급', j.grade],
      ['계열', j.type],
      ['효과', j.effects],
      ['스탯 보너스', statLines || null],
      ['스킬', (j.skills || []).map(s => s.name).join(', ')],
      ['설명', j.description],
    ]);
  },
};
