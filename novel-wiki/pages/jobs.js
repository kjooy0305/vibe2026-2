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

};
