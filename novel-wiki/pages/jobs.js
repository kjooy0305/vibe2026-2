'use strict';
window.Pages = window.Pages || {};
window.Pages.jobs = {
  _currentId: null,
  _container: null,
  _listScrollY: 0,

  _C: null,

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

    this._C = await AppConstants.load();
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
    this._listScrollY = 0;
  },

  // ── LIST ────────────────────────────────────────────────────────────────────

  _renderList: function(container, jobs, wid) {
    this._currentId = null;
    const self = this;
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
        <input class="input-field" id="jobFilter" placeholder="이름, 등급, 계열, 효과 검색... (-제외어 가능)" style="margin-top:8px;width:100%;box-sizing:border-box;" />
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;" id="gradeFilters">
          <button class="filter-chip active" data-grade="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-primary);color:#000;font-size:11px;cursor:pointer;">전체</button>
          ${this._C.grades.map(g => `<button class="filter-chip" data-grade="${g}" style="padding:3px 8px;border-radius:4px;border:1px solid ${Utils.gradeColor(g)}66;background:transparent;color:${Utils.gradeColor(g)};font-size:11px;cursor:pointer;">${g}</button>`).join('')}
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;" id="typeFilters">
          <button class="filter-chip-type active" data-type="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface2);color:var(--color-text);font-size:11px;cursor:pointer;">전체 계열</button>
          ${this._C.jobSeries.map(t => `<button class="filter-chip-type" data-type="${t}" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);font-size:11px;cursor:pointer;">${t}</button>`).join('')}
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
        self._listScrollY = container.scrollTop || window.scrollY || 0;
        const id = card.dataset.id;
        DB.getAll('jobs', wid).then(all => {
          const j = all.find(x => x.id === id);
          if (j) { self._currentId = j.id; self._renderDetail(container, j, wid); }
        });
      });
    });

    container.querySelectorAll('.btn-del-job').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const j = jobs.find(x => x.id === btn.dataset.id);
        Utils.confirmWithInput('직업 삭제', '삭제하려면 직업 이름을 정확히 입력하세요.', j?.name || '', async () => {
          await DB.del('jobs', btn.dataset.id);
          Utils.toast('삭제됨', 'info');
          self.init(container);
        });
      });
    });
  },

  _applyFilter: function(container, query, grade, type) {
    container.querySelectorAll('.job-card').forEach(card => {
      const cardGrade = card.dataset.grade || '';
      const cardType  = card.dataset.type  || '';
      const gradeOk = !grade || cardGrade === grade;
      const typeOk  = !type  || cardType  === type;
      const textOk  = Utils.matchesQuery(card.dataset.searchText || '', query);
      card.style.display = gradeOk && typeOk && textOk ? '' : 'none';
    });
  },

  _jobCard: function(j) {
    const gc = Utils.gradeColor(j.grade || 'F');
    const skillCount = (j.skills || []).length;
    const itemCount  = (j.itemLinks || []).length;
    const searchText = [
      j.name, j.grade, j.type, j.effects, j.description,
      ...(j.skills || []).map(s => s.name),
    ].filter(Boolean).join(' ').toLowerCase();
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
          ${skillCount > 0 ? `<span style="font-size:11px;color:var(--color-accent);">⚡${skillCount}개</span>` : ''}
          ${itemCount  > 0 ? `<span style="font-size:11px;color:rgba(245,158,11,0.85);">🗡${itemCount}개</span>` : ''}
        </div>
        ${j.effects ? `<div style="font-size:12px;color:var(--color-text-dim);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(j.effects)}</div>` : ''}
        ${j.description ? `<div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-style:italic;">${Utils.escHtml(j.description)}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm btn-del-job" data-id="${Utils.escHtml(j.id)}" style="color:var(--color-danger);font-size:11px;flex-shrink:0;">삭제</button>
    </div>`;
  },

  // ── DETAIL ──────────────────────────────────────────────────────────────────

  _renderDetail: async function(container, j, wid) {
    const gc = Utils.gradeColor(j.grade || 'F');
    const isGradient = gc.startsWith('linear');
    const borderColor = isGradient ? '#fbbf24' : gc;
    const self = this;

    const baseStatEntries  = Object.entries(j.statEffects || {}).filter(([, v]) => v !== 0 && v !== '' && v !== undefined && v !== null);
    const customStatEntries = j.statCustom || [];
    const itemLinksRaw = j.itemLinks || [];

    const linkedItems = (await Promise.all(
      itemLinksRaw.map(async r => {
        const it = await DB.get('items', r.id);
        return it ? { ...it, qty: r.qty || 1 } : null;
      })
    )).filter(Boolean);

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

        ${j.effects ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">직업 효과</div>
            <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(j.effects))}</div>
          </div>` : ''}

        ${(baseStatEntries.length || customStatEntries.length) ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:8px;">스텟 보너스</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${baseStatEntries.map(([k, v]) => `
                <span style="padding:3px 10px;background:var(--color-border);border-radius:4px;font-size:12px;font-weight:600;">
                  ${Utils.escHtml(k)}: ${Number(v) > 0 ? '+' : ''}${Utils.escHtml(String(v))}
                </span>`).join('')}
              ${customStatEntries.map(cs => `
                <span style="padding:3px 10px;background:rgba(100,200,150,0.12);border:1px solid rgba(100,200,150,0.25);border-radius:4px;font-size:12px;font-weight:600;color:#86efac;">
                  ${Utils.escHtml(cs.name)}: ${Number(cs.value) > 0 ? '+' : ''}${Utils.escHtml(String(cs.value))}
                </span>`).join('')}
            </div>
          </div>` : ''}

        ${linkedItems.length ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:8px;">전용 아이템</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${linkedItems.map(it => `
                <button class="btn btn-ghost btn-sm btn-link-item" data-iid="${Utils.escHtml(it.id)}"
                  style="font-size:12px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);">
                  🗡 ${Utils.escHtml(it.name)}${it.type === '소비' && it.qty > 1 ? ' ×' + it.qty : ''}
                </button>`).join('')}
            </div>
          </div>` : ''}

        ${(j.skills || []).length ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:8px;">직업 스킬 (${j.skills.length}개)</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${j.skills.map(s => `
                <span class="job-skill-badge" data-skill-id="${Utils.escHtml(s.id)}"
                  style="cursor:pointer;padding:4px 10px;border-radius:8px;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);font-size:12px;display:inline-flex;align-items:center;gap:5px;">
                  ⚡ ${Utils.escHtml(s.name || '')} ${s.grade ? Utils.gradeBadge(s.grade) : ''}
                </span>`).join('')}
            </div>
          </div>` : ''}

        ${j.description ? `
          <div style="margin-top:12px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">설명</div>
            <div style="white-space:pre-wrap;font-size:13px;font-style:italic;color:var(--color-text-muted);line-height:1.7;">${Utils.nl2br(Utils.escHtml(j.description))}</div>
          </div>` : ''}
      </div>

      ${j.authorNotes ? `
        <div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:16px;">
          <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:4px;">작가 전용 메모 (소설에 미표시)</div>
          <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(j.authorNotes))}</div>
        </div>` : ''}

      <div style="font-size:11px;color:var(--color-text-dim);text-align:right;">
        수정: ${Utils.formatDate(j.updatedAt)} · 생성: ${Utils.formatDate(j.createdAt)}
      </div>
    </div>`;

    document.getElementById('btnBackJobs')?.addEventListener('click', async () => {
      const y = self._listScrollY || 0;
      self._currentId = null;
      await self.init(container);
      requestAnimationFrame(() => { container.scrollTop = y; if (y > 0) window.scrollTo(0, y); });
    });
    document.getElementById('btnEditJob')?.addEventListener('click', () => self._openForm(j, wid, container));
    document.getElementById('btnDelJobDetail')?.addEventListener('click', () => {
      Utils.confirmWithInput('직업 삭제', '삭제하려면 직업 이름을 정확히 입력하세요.', j.name || '', async () => {
        await DB.del('jobs', j.id);
        Utils.toast('삭제됨', 'info');
        self._currentId = null;
        self.init(container);
      });
    });
    document.getElementById('btnCopyJobText')?.addEventListener('click', () => {
      Utils.copyText(self._exportText(j, linkedItems));
      Utils.toast('복사됨', 'success');
    });
    container.querySelectorAll('.btn-link-item').forEach(btn => {
      btn.addEventListener('click', () => AppRouter.navigate('items', { highlightId: btn.dataset.iid }));
    });
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

    const [allItems, allSkills] = await Promise.all([
      DB.getAll('items', wid),
      DB.getAll('skills', wid),
    ]);
    const sortedItems  = allItems.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
    const sortedSkills = allSkills.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));

    const statEffects = j.statEffects || {};
    let itemLinks = (j.itemLinks || []).map(r => ({ ...r }));
    let skillIds  = (j.skills || []).map(s => s.id);

    const body = `
    <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
      <div class="form-group">
        <label class="form-label">이름 *</label>
        <input class="input-field" id="fJobName" value="${Utils.escHtml(j.name || '')}" placeholder="직업 이름" style="width:100%;box-sizing:border-box;" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="form-group">
          <label class="form-label">등급</label>
          <select class="select-input" id="fJobGrade" style="width:100%;">
            ${this._C.grades.map(g => `<option value="${g}" ${(j.grade || 'F') === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">계열</label>
          <select class="select-input" id="fJobType" style="width:100%;">
            <option value="">선택 안 함</option>
            ${this._C.jobSeries.map(t => `<option value="${t}" ${(j.type || '') === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">직업 효과 <span style="font-size:11px;color:var(--color-text-dim);">(부여되는 능력/보너스 서술)</span></label>
        <textarea class="textarea-field" id="fJobEffects" rows="3" style="width:100%;box-sizing:border-box;">${Utils.escHtml(j.effects || '')}</textarea>
      </div>

      <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
        <label class="form-label" style="display:block;margin-bottom:8px;">기본 스텟 보너스 (힘·민첩·체력)</label>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          ${this._C.baseStats.map(s => `
            <div style="display:flex;flex-direction:column;gap:4px;">
              <label style="font-size:12px;color:var(--color-text-muted);">${s}</label>
              <input type="number" class="input-field job-base-stat" data-stat="${s}"
                value="${statEffects[s] !== undefined ? statEffects[s] : ''}" placeholder="0"
                style="padding:5px 8px;font-size:12px;"/>
            </div>`).join('')}
        </div>
      </div>

      <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <label class="form-label" style="margin:0;">커스텀 스텟 보너스 <span style="font-size:11px;color:var(--color-text-muted);">(자유 입력)</span></label>
          <button type="button" id="btnAddJobCustomStat" class="btn btn-ghost btn-sm" style="font-size:11px;">+ 추가</button>
        </div>
        <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">기본 스텟 외에 추가할 스텟을 자유롭게 입력하세요</div>
        <div id="jobCustomStatRows">
          ${(j.statCustom || []).map(cs => `
            <div class="jcs-row" style="display:grid;grid-template-columns:1fr 80px auto;gap:6px;margin-bottom:6px;align-items:center;">
              <input class="input-field jcs-name" value="${Utils.escHtml(cs.name || '')}" placeholder="스텟명 (예: 마나, 재능...)" style="font-size:12px;padding:5px 8px;"/>
              <input type="number" class="input-field jcs-value" value="${Utils.escHtml(String(cs.value || ''))}" placeholder="수치" style="font-size:12px;padding:5px 8px;"/>
              <button type="button" class="btn-del-jcs" style="background:none;border:1px solid var(--color-border);border-radius:4px;cursor:pointer;color:var(--color-danger);font-size:13px;padding:2px 7px;">✕</button>
            </div>`).join('')}
        </div>
      </div>

      <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
        <label class="form-label" style="display:block;margin-bottom:6px;">전용 아이템 연결 <span style="font-size:11px;color:var(--color-text-muted);">(여러 개 추가 가능)</span></label>
        <div id="jobItemChips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:28px;margin-bottom:8px;"></div>
        ${sortedItems.length > 0
          ? `<div style="position:relative;">
              <input class="input-field" id="jobItemSearch" placeholder="아이템 이름으로 검색하여 추가..." style="width:100%;box-sizing:border-box;font-size:12px;"/>
              <div id="jobItemResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:160px;overflow-y:auto;"></div>
             </div>`
          : `<div style="font-size:12px;color:var(--color-text-muted);">이 세계에 아이템이 없습니다</div>`}
      </div>

      <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
        <label class="form-label" style="display:block;margin-bottom:6px;">직업 스킬 연결 <span style="font-size:11px;color:var(--color-text-muted);">(여러 개 추가 가능)</span></label>
        <div id="jobSkillChips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:28px;margin-bottom:8px;"></div>
        ${sortedSkills.length > 0
          ? `<div style="position:relative;">
              <input class="input-field" id="jobSkillSearch" placeholder="스킬 이름으로 검색하여 추가..." style="width:100%;box-sizing:border-box;font-size:12px;"/>
              <div id="jobSkillResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:160px;overflow-y:auto;"></div>
             </div>`
          : `<div style="font-size:12px;color:var(--color-text-muted);">이 세계에 스킬이 없습니다</div>`}
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
      if (!name) { Utils.fieldError('fJobName'); return false; }

      const newStatEffects = {};
      document.querySelectorAll('#globalModalBody .job-base-stat').forEach(inp => {
        if (inp.value !== '' && Number(inp.value) !== 0 && !isNaN(Number(inp.value))) {
          newStatEffects[inp.dataset.stat] = Number(inp.value);
        }
      });

      const newStatCustom = [];
      document.querySelectorAll('#globalModalBody .jcs-row').forEach(row => {
        const nm = row.querySelector('.jcs-name')?.value.trim();
        const vl = row.querySelector('.jcs-value')?.value.trim();
        if (nm) newStatCustom.push({ name: nm, value: vl || '0' });
      });

      const pickedSkills = skillIds.map(id => {
        const sk = sortedSkills.find(s => s.id === id);
        return sk ? { id: sk.id, name: sk.name, grade: sk.grade || '' } : null;
      }).filter(Boolean);

      const record = {
        ...(j || {}),
        worldId:     wid,
        name,
        grade:       document.getElementById('fJobGrade')?.value || 'F',
        type:        document.getElementById('fJobType')?.value || '',
        effects:     document.getElementById('fJobEffects')?.value.trim() || '',
        statEffects: newStatEffects,
        statCustom:  newStatCustom,
        itemLinks,
        skills:      pickedSkills,
        description: document.getElementById('fJobDesc')?.value.trim() || '',
        authorNotes: document.getElementById('fJobAuthor')?.value.trim() || '',
        id:          j.id || DB.genId(),
        createdAt:   j.createdAt || Date.now(),
        updatedAt:   Date.now(),
      };

      await DB.put('jobs', record);
      await AppStore.updateStreak();
      await AppStore.recordActivity('jobs', !isEdit);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      self._currentId = record.id;
      const updated = await DB.get('jobs', record.id);
      if (updated) self._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      // ── 커스텀 스텟 행 ───────────────────────────────────────
      const addJcsRow = () => {
        const rows = document.getElementById('jobCustomStatRows');
        if (!rows) return;
        const div = document.createElement('div');
        div.className = 'jcs-row';
        div.style.cssText = 'display:grid;grid-template-columns:1fr 80px auto;gap:6px;margin-bottom:6px;align-items:center;';
        div.innerHTML = `
          <input class="input-field jcs-name" placeholder="스텟명 (예: 마나, 재능...)" style="font-size:12px;padding:5px 8px;"/>
          <input type="number" class="input-field jcs-value" placeholder="수치" style="font-size:12px;padding:5px 8px;"/>
          <button type="button" class="btn-del-jcs" style="background:none;border:1px solid var(--color-border);border-radius:4px;cursor:pointer;color:var(--color-danger);font-size:13px;padding:2px 7px;">✕</button>`;
        rows.appendChild(div);
      };
      document.getElementById('btnAddJobCustomStat')?.addEventListener('click', addJcsRow);
      document.getElementById('jobCustomStatRows')?.addEventListener('click', e => {
        if (e.target.closest('.btn-del-jcs')) e.target.closest('.jcs-row')?.remove();
      });

      // ── 아이템 칩 UI ─────────────────────────────────────────
      const renderItemChips = () => {
        const el = document.getElementById('jobItemChips');
        if (!el) return;
        el.innerHTML = itemLinks.map((r, idx) => {
          const it = sortedItems.find(x => x.id === r.id);
          if (!it) return '';
          const isConsumable = it.type === '소비';
          return `<span class="job-item-chip"
            style="display:inline-flex;align-items:center;gap:4px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);padding:2px 8px;border-radius:12px;font-size:12px;">
            🗡 ${Utils.escHtml(it.name)}
            ${isConsumable ? `<input type="number" class="item-chip-qty" data-idx="${idx}" value="${r.qty || 1}" min="1"
              style="width:38px;padding:1px 4px;font-size:11px;border:1px solid rgba(245,158,11,0.3);border-radius:3px;background:transparent;color:inherit;" title="개수"/>` : ''}
            <span class="item-chip-del" data-idx="${idx}" style="cursor:pointer;color:var(--color-danger);padding:0 2px;font-size:12px;">✕</span>
          </span>`;
        }).filter(Boolean).join('');
        el.querySelectorAll('.item-chip-qty').forEach(inp => {
          inp.addEventListener('input', () => {
            const i = Number(inp.dataset.idx);
            if (itemLinks[i]) itemLinks[i].qty = Math.max(1, Number(inp.value) || 1);
          });
        });
        el.querySelectorAll('.item-chip-del').forEach(del => {
          del.addEventListener('click', () => {
            itemLinks.splice(Number(del.dataset.idx), 1);
            renderItemChips();
          });
        });
      };
      renderItemChips();

      const itemIn = document.getElementById('jobItemSearch');
      const itemRs = document.getElementById('jobItemResults');
      if (itemIn && itemRs) {
        itemIn.addEventListener('input', () => {
          const q = itemIn.value.trim().toLowerCase();
          if (!q) { itemRs.style.display = 'none'; return; }
          const hits = sortedItems.filter(it => !itemLinks.some(r => r.id === it.id) && (it.name || '').toLowerCase().includes(q)).slice(0, 8);
          if (!hits.length) { itemRs.style.display = 'none'; return; }
          itemRs.style.display = 'block';
          itemRs.innerHTML = hits.map(it => `<div class="job-item-result" data-iid="${Utils.escHtml(it.id)}"
            style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;">
            <span>${Utils.escHtml(it.name)}</span>
            <span style="font-size:11px;color:var(--color-text-muted);">${Utils.escHtml(it.type || '')}${it.type === '소비' ? ' · 소비' : ''}</span>
          </div>`).join('');
          itemRs.querySelectorAll('.job-item-result').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              itemLinks.push({ id: row.dataset.iid, qty: 1 });
              itemIn.value = '';
              itemRs.style.display = 'none';
              renderItemChips();
            });
          });
        });
        itemIn.addEventListener('blur', () => setTimeout(() => { itemRs.style.display = 'none'; }, 150));
      }

      // ── 스킬 칩 UI ───────────────────────────────────────────
      const renderSkillChips = () => {
        const el = document.getElementById('jobSkillChips');
        if (!el) return;
        el.innerHTML = skillIds.map((sid, idx) => {
          const sk = sortedSkills.find(x => x.id === sid);
          if (!sk) return '';
          return `<span class="job-skill-chip"
            style="display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);padding:2px 8px;border-radius:12px;font-size:12px;">
            ⚡ ${Utils.escHtml(sk.name)} (${sk.grade || 'F'})
            <span class="skill-chip-del" data-idx="${idx}" style="cursor:pointer;color:var(--color-danger);padding:0 2px;">✕</span>
          </span>`;
        }).filter(Boolean).join('');
        el.querySelectorAll('.skill-chip-del').forEach(del => {
          del.addEventListener('click', () => {
            skillIds.splice(Number(del.dataset.idx), 1);
            renderSkillChips();
          });
        });
      };
      renderSkillChips();

      const skillIn = document.getElementById('jobSkillSearch');
      const skillRs = document.getElementById('jobSkillResults');
      if (skillIn && skillRs) {
        skillIn.addEventListener('input', () => {
          const q = skillIn.value.trim().toLowerCase();
          if (!q) { skillRs.style.display = 'none'; return; }
          const hits = sortedSkills.filter(sk => !skillIds.includes(sk.id) && (sk.name || '').toLowerCase().includes(q)).slice(0, 8);
          if (!hits.length) { skillRs.style.display = 'none'; return; }
          skillRs.style.display = 'block';
          skillRs.innerHTML = hits.map(sk => `<div class="job-skill-result" data-sid="${Utils.escHtml(sk.id)}"
            style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">
            ⚡ ${Utils.escHtml(sk.name)} <span style="font-size:11px;color:${Utils.gradeColor(sk.grade || 'F')};">(${sk.grade || 'F'})</span>
          </div>`).join('');
          skillRs.querySelectorAll('.job-skill-result').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              skillIds.push(row.dataset.sid);
              skillIn.value = '';
              skillRs.style.display = 'none';
              renderSkillChips();
            });
          });
        });
        skillIn.addEventListener('blur', () => setTimeout(() => { skillRs.style.display = 'none'; }, 150));
      }
    }, 60);
  },

  // ── EXPORT ──────────────────────────────────────────────────────────────────

  _exportText: function(j, linkedItems) {
    const baseStats   = Object.entries(j.statEffects || {})
      .filter(([, v]) => v !== 0 && v !== '' && v !== undefined && v !== null)
      .map(([k, v]) => `${k}: ${Number(v) > 0 ? '+' : ''}${v}`).join(', ');
    const customStats = (j.statCustom || [])
      .map(cs => `${cs.name}: ${Number(cs.value) > 0 ? '+' : ''}${cs.value}`).join(', ');
    const statsStr = [baseStats, customStats].filter(Boolean).join(', ');
    const itemsStr = (linkedItems || [])
      .map(it => it.name + (it.type === '소비' && it.qty > 1 ? ' ×' + it.qty : '')).join(', ');
    return Utils.toTextExport(`직업: ${j.name}`, [
      ['등급', j.grade],
      ['계열', j.type],
      ['효과', j.effects],
      ['스텟 보너스', statsStr || null],
      ['전용 아이템', itemsStr || null],
      ['스킬', (j.skills || []).map(s => s.name).join(', ')],
      ['설명', j.description],
    ]);
  },
};
