'use strict';
window.Pages = window.Pages || {};
window.Pages.achievements = {
  _currentId: null,
  _container: null,
  _listScrollY: 0,

  _C: null,
  BASE_STATS: ['힘', '민첩', '체력'],

  init: async function(container, options) {
    options = options || {};
    this._container = container;
    const wid = AppStore.getCurrentWorldId();
    if (!wid) {
      container.innerHTML = `<div class="empty-state" style="padding:48px;text-align:center;"><div style="font-size:48px;margin-bottom:12px;">🌍</div><div style="font-weight:700;font-size:16px;">세계를 먼저 선택하세요</div><button class="btn btn-primary" style="margin-top:16px;" onclick="AppRouter.navigate('world')">세계 관리</button></div>`;
      return;
    }
    this._C = await AppConstants.load();
    const titles = await DB.getAll('achievements', wid);
    if (options.highlightId) this._currentId = options.highlightId;
    if (this._currentId) {
      const a = titles.find(x => x.id === this._currentId);
      if (a) { this._renderDetail(container, a, wid); return; }
    }
    this._renderList(container, titles, wid);
  },

  _renderList: function(container, titles, wid) {
    this._currentId = null;
    const self = this;
    const world = AppStore.getState().currentWorld;

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">칭호</h2>
          <button class="btn btn-primary btn-sm" id="btnAddTitle">+ 추가</button>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name||'현재 세계')} · ${titles.length}개 · 캐릭터 상태창에 표시됩니다
        </p>
        <input class="input-field" id="titleFilter" placeholder="이름, 등급, 획득 조건 검색..." style="margin-top:8px;width:100%;box-sizing:border-box;" />
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;" id="gradeFilters">
          <button class="filter-chip active" data-grade="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-primary);color:#000;font-size:11px;cursor:pointer;">전체</button>
          ${this._C.grades.map(g=>`<button class="filter-chip" data-grade="${g}" style="padding:3px 8px;border-radius:4px;border:1px solid ${Utils.gradeColor(g)}66;background:transparent;color:${Utils.gradeColor(g)};font-size:11px;cursor:pointer;">${g}</button>`).join('')}
        </div>
      </div>
      <div id="titleList" class="item-list">
        ${titles.length === 0
          ? `<div class="empty-state" style="padding:48px;text-align:center;"><div style="font-size:48px;margin-bottom:12px;">🏅</div><div style="font-weight:700;font-size:16px;">칭호가 없습니다</div><div style="font-size:13px;color:var(--color-text-muted);">칭호를 추가하면 캐릭터 상태창에 표시됩니다</div></div>`
          : titles.map(a=>this._titleCard(a)).join('')}
      </div>
    </div>`;

    let activeGrade = '';
    const applyFilter = () => {
      const q = document.getElementById('titleFilter')?.value || '';
      container.querySelectorAll('.title-card').forEach(card => {
        const ok = Utils.matchesQuery(card.dataset.searchText||'', q)
                && (!activeGrade || card.dataset.grade === activeGrade);
        card.style.display = ok ? '' : 'none';
      });
    };

    container.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-chip').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = b.dataset.grade ? Utils.gradeColor(b.dataset.grade) : 'var(--color-text-muted)';
        });
        btn.style.background = btn.dataset.grade ? Utils.gradeColor(btn.dataset.grade) : 'var(--color-primary)';
        btn.style.color = '#000';
        activeGrade = btn.dataset.grade;
        applyFilter();
      });
    });
    document.getElementById('titleFilter')?.addEventListener('input', applyFilter);
    document.getElementById('btnAddTitle')?.addEventListener('click', () => self._openForm(null, wid, container));

    container.querySelectorAll('.title-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-title') || e.target.closest('.btn-copy-title')) return;
        self._listScrollY = container.scrollTop || window.scrollY || 0;
        const id = card.dataset.id;
        DB.getAll('achievements', wid).then(all => {
          const a = all.find(x => x.id === id);
          if (a) { self._currentId = a.id; self._renderDetail(container, a, wid); }
        });
      });
    });

    container.querySelectorAll('.btn-del-title').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const a = titles.find(x => x.id === btn.dataset.id);
        Utils.confirmWithInput('칭호 삭제', '삭제하려면 칭호 이름을 정확히 입력하세요.', a?.name||'', async () => {
          await DB.del('achievements', a.id);
          Utils.toast('삭제됨', 'info');
          self.init(container);
        });
      });
    });

    container.querySelectorAll('.btn-copy-title').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const a = titles.find(x => x.id === btn.dataset.id);
        if (!a) return;
        const worlds = AppStore.getState().worlds.filter(w => w.id !== wid);
        if (!worlds.length) { Utils.toast('다른 세계가 없습니다', 'error'); return; }
        Utils.openModal('다른 세계로 복사',
          `<div class="form-group"><label class="form-label">복사할 세계를 선택하세요</label><select class="select-input" id="copyTitleWorld" style="width:100%;">${worlds.map(w=>`<option value="${Utils.escHtml(w.id)}">${Utils.escHtml(w.name)}</option>`).join('')}</select></div>`,
          async () => {
            const tid = document.getElementById('copyTitleWorld')?.value;
            if (!tid) return false;
            await DB.put('achievements', { ...a, id: DB.genId(), worldId: tid, createdAt: Date.now(), updatedAt: Date.now() });
            Utils.toast('복사됨', 'success'); return true;
          }, '복사');
      });
    });
  },

  _titleCard: function(a) {
    const gc = Utils.gradeColor(a.grade||'F');
    return `
    <div class="title-card list-item list-item--full"
      data-id="${Utils.escHtml(a.id)}"
      data-grade="${Utils.escHtml(a.grade||'')}"
      data-search-text="${Utils.escHtml([a.name,a.grade,a.condition,a.reward].filter(Boolean).join(' ').toLowerCase())}"
      style="cursor:pointer;border-left:3px solid ${gc};display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--color-surface2);border-radius:10px;border:1px solid var(--color-border);border-left-width:3px;margin-bottom:8px;">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${Utils.gradeBadge(a.grade||'F')}
          <span style="font-size:11px;color:var(--color-text-muted);">ㅣ[칭호]</span>
          <span style="font-weight:700;font-size:14px;">${Utils.escHtml(a.name||'이름 없음')}</span>
          ${!a.condition ? '<span title="획득 조건 없음" style="color:var(--color-warning);font-size:12px;">⚠️</span>' : ''}
        </div>
        ${a.condition ? `<div style="font-size:12px;color:var(--color-text-muted);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">획득 조건: ${Utils.escHtml(a.condition)}</div>` : ''}
        ${a.reward ? `<div style="font-size:12px;color:var(--color-accent);margin-top:2px;">보상: ${Utils.escHtml(a.reward)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm btn-copy-title" data-id="${Utils.escHtml(a.id)}" style="font-size:11px;">복사</button>
        <button class="btn btn-ghost btn-sm btn-del-title" data-id="${Utils.escHtml(a.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  _renderDetail: async function(container, a, wid) {
    const gc = Utils.gradeColor(a.grade||'F');
    const border = gc.startsWith('linear') ? '#fbbf24' : gc;
    const self = this;

    // Resolve linked items (new format: rewardItems [{id,qty}], old: rewardItemIds [string])
    const rewardItemLinks = a.rewardItems || (a.rewardItemIds||[]).map(id=>({id, qty:1}));
    const rewardSkillIds  = a.rewardSkillIds || (a.rewardSkillId ? [a.rewardSkillId] : []);
    const [linkedItems, linkedSkills] = await Promise.all([
      Promise.all(rewardItemLinks.map(async r => {
        const it = await DB.get('items', r.id); return it ? { ...it, qty: r.qty||1 } : null;
      })),
      Promise.all(rewardSkillIds.map(id => DB.get('skills', id))),
    ]);
    const validItems  = linkedItems.filter(Boolean);
    const validSkills = linkedSkills.filter(Boolean);

    const baseStatEntries = Object.entries(a.rewardStats||{}).filter(([,v])=>v!==0);
    const customStatEntries = a.rewardCustomStats||[];

    container.innerHTML = `
    <div class="page active" style="overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;">
      <div class="page-header" style="border-left:4px solid ${border};padding-left:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackTitle">← 목록</button>
          ${Utils.gradeBadge(a.grade||'F')}
          <h2 class="page-title" style="margin:0;font-size:18px;">${Utils.escHtml(a.name||'칭호')}</h2>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditTitle">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnCopyTitleText">텍스트 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnDelTitleDetail" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      <!-- 칭호 표시 박스 -->
      <div style="background:rgba(10,20,35,0.95);border:1px solid ${border}66;border-radius:8px;padding:16px;font-family:var(--font-mono);font-size:13px;line-height:1.9;color:#c8d8ff;margin-bottom:16px;">
        <div style="text-align:center;color:rgba(100,150,255,0.5);font-size:11px;margin-bottom:8px;letter-spacing:4px;">ㅡㅡㅡㅡ</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          ${Utils.gradeBadge(a.grade||'F')}
          <span style="color:rgba(200,220,255,0.8);">ㅣ[칭호]</span>
        </div>
        <div style="padding-left:8px;color:#e2e8f0;font-weight:700;margin-bottom:4px;">ㄴ${Utils.escHtml(a.name||'')}</div>
        ${a.condition ? `<div style="margin-top:10px;"><div style="font-size:11px;color:rgba(148,163,184,0.8);margin-bottom:2px;">획득 조건</div><div style="white-space:pre-wrap;font-size:12px;color:#c8d8ff;">${Utils.nl2br(Utils.escHtml(a.condition))}</div></div>` : ''}
        ${(a.reward||baseStatEntries.length||customStatEntries.length||validItems.length||validSkills.length) ? `
          <div style="margin-top:10px;">
            <div style="font-size:11px;color:rgba(148,163,184,0.8);margin-bottom:4px;">보상</div>
            ${a.reward ? `<div style="font-size:12px;color:var(--color-accent);font-weight:600;margin-bottom:4px;">${Utils.escHtml(a.reward)}</div>` : ''}
            ${baseStatEntries.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">${baseStatEntries.map(([k,v])=>`<span style="font-size:11px;padding:1px 6px;border-radius:4px;background:rgba(100,150,255,0.15);color:#c4b5fd;border:1px solid rgba(100,150,255,0.2);">${k} ${v>0?'+':''}${v}</span>`).join('')}</div>` : ''}
            ${customStatEntries.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">${customStatEntries.map(cs=>`<span style="font-size:11px;padding:1px 6px;border-radius:4px;background:rgba(100,200,150,0.15);color:#86efac;border:1px solid rgba(100,200,150,0.2);">${Utils.escHtml(cs.name)} ${Number(cs.value)>0?'+':''}${Utils.escHtml(String(cs.value))}</span>`).join('')}</div>` : ''}
            ${validItems.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">${validItems.map(it=>`<button class="btn btn-ghost btn-sm btn-link-item" data-iid="${Utils.escHtml(it.id)}" style="font-size:12px;">🗡 ${Utils.escHtml(it.name)}${it.type==='소비'&&it.qty>1?' ×'+it.qty:''}</button>`).join('')}</div>` : ''}
            ${validSkills.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;">${validSkills.map(sk=>`<button class="btn btn-ghost btn-sm btn-link-skill" data-sid="${Utils.escHtml(sk.id)}" style="font-size:12px;">⚡ ${Utils.escHtml(sk.name)} (${sk.grade||'F'})</button>`).join('')}</div>` : ''}
          </div>` : ''}
        ${a.description ? `<div style="margin-top:10px;border-top:1px dashed rgba(100,150,255,0.2);padding-top:10px;"><div style="white-space:pre-wrap;font-size:12px;font-style:italic;color:rgba(200,220,255,0.7);">${Utils.nl2br(Utils.escHtml(a.description))}</div></div>` : ''}
        <div style="text-align:center;color:rgba(100,150,255,0.5);font-size:11px;margin-top:8px;letter-spacing:4px;">ㅡㅡㅡㅡ</div>
      </div>

      ${a.authorNotes ? `<div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:16px;"><div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:4px;">작가 전용 메모 (소설 미표시)</div><div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(a.authorNotes))}</div></div>` : ''}
      <div style="font-size:11px;color:var(--color-text-dim);text-align:right;margin-bottom:8px;">수정: ${Utils.formatDate(a.updatedAt)} · 생성: ${Utils.formatDate(a.createdAt)}</div>
    </div>`;

    document.getElementById('btnBackTitle')?.addEventListener('click', async () => {
      const y = self._listScrollY||0;
      self._currentId = null;
      await self.init(container);
      requestAnimationFrame(() => { container.scrollTop = y; if (y>0) window.scrollTo(0,y); });
    });
    document.getElementById('btnEditTitle')?.addEventListener('click', () => self._openForm(a, wid, container));
    document.getElementById('btnDelTitleDetail')?.addEventListener('click', () => {
      Utils.confirmWithInput('칭호 삭제', '삭제하려면 칭호 이름을 정확히 입력하세요.', a.name||'', async () => {
        await DB.del('achievements', a.id);
        Utils.toast('삭제됨', 'info');
        self._currentId = null; self.init(container);
      });
    });
    document.getElementById('btnCopyTitleText')?.addEventListener('click', () => {
      const statsStr = [...baseStatEntries.map(([k,v])=>`${k}${v>0?'+':''}${v}`), ...customStatEntries.map(cs=>`${cs.name}${Number(cs.value)>0?'+':''}${cs.value}`)].join(', ');
      const lines = [
        'ㅡ'.repeat(4), `ㅣ[칭호]`, `ㄴ${a.name||''}`,
        `ㅣ등급: ${a.grade||''}`,
        a.condition ? `ㅣ획득 조건: ${a.condition}` : null,
        a.reward    ? `ㅣ보상: ${a.reward}`           : null,
        statsStr    ? `ㅣ스텟 보상: ${statsStr}`       : null,
        validItems.length  ? `ㅣ아이템: ${validItems.map(it=>it.name+(it.type==='소비'&&it.qty>1?' ×'+it.qty:'')).join(', ')}` : null,
        validSkills.length ? `ㅣ스킬: ${validSkills.map(sk=>sk.name).join(', ')}` : null,
        a.description ? `ㅣ설명: ${a.description}` : null,
        'ㅡ'.repeat(4),
      ].filter(x=>x!==null).join('\n');
      Utils.copyText(lines); Utils.toast('복사됨', 'success');
    });
    container.querySelectorAll('.btn-link-item').forEach(btn => {
      btn.addEventListener('click', () => AppRouter.navigate('items', { highlightId: btn.dataset.iid }));
    });
    container.querySelectorAll('.btn-link-skill').forEach(btn => {
      btn.addEventListener('click', () => AppRouter.navigate('skills', { highlightId: btn.dataset.sid }));
    });
  },

  _openForm: async function(achieve, wid, container) {
    const isEdit = !!achieve;
    const self = this;

    const [allItems, allSkills] = await Promise.all([
      DB.getAll('items', wid),
      DB.getAll('skills', wid),
    ]);
    const sortedItems  = allItems.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko'));
    const sortedSkills = allSkills.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'','ko'));

    // Migrate old format → new
    const existingItemLinks = achieve?.rewardItems
      || (achieve?.rewardItemIds||[]).map(id=>({id, qty:1}));
    const existingSkillIds = achieve?.rewardSkillIds
      || (achieve?.rewardSkillId ? [achieve.rewardSkillId] : []);
    const rewardStats = achieve?.rewardStats || {};

    // Mutable state in closure
    let itemLinks   = existingItemLinks.map(r=>({...r})); // [{id, qty}]
    let skillIds    = [...existingSkillIds];

    const body = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div class="form-group">
        <label class="form-label">칭호 이름 *</label>
        <input class="input-field" id="fAcName" value="${Utils.escHtml(achieve?.name||'')}" placeholder="칭호 이름을 입력하세요" style="width:100%;box-sizing:border-box;"/>
      </div>
      <div class="form-group">
        <label class="form-label">등급 (강도: F가 최하 → EX가 최상)</label>
        <select class="select-input" id="fAcGrade" style="width:100%;">
          ${this._C.grades.map(g=>`<option value="${g}" ${(achieve?.grade||'F')===g?'selected':''}>${g} 등급</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">획득 조건 <span style="color:var(--color-warning);font-size:11px;">(비어있으면 ⚠️ 표시)</span></label>
        <textarea class="textarea-field" id="fAcCondition" rows="3" placeholder="이 칭호를 얻기 위한 조건이나 업적을 입력하세요..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(achieve?.condition||'')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">보상 설명 (텍스트로 자유 입력)</label>
        <input class="input-field" id="fAcReward" value="${Utils.escHtml(achieve?.reward||'')}" placeholder="예: 특수 능력 해금, 칭호 효과 설명..." style="width:100%;box-sizing:border-box;"/>
      </div>

      <!-- 기본 스텟 보상 -->
      <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
        <label class="form-label" style="display:block;margin-bottom:8px;">기본 스텟 보상 (힘·민첩·체력)</label>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          ${this.BASE_STATS.map(s=>`<div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:12px;color:var(--color-text-muted);">${s}</label>
            <input type="number" class="input-field ac-base-stat" data-stat="${s}" value="${rewardStats[s]!==undefined?rewardStats[s]:''}" placeholder="0" style="padding:5px 8px;font-size:12px;"/>
          </div>`).join('')}
        </div>
      </div>

      <!-- 커스텀 스텟 보상 -->
      <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <label class="form-label" style="margin:0;">커스텀 스텟 보상 (자유 입력)</label>
          <button type="button" id="btnAddCustomStatReward" class="btn btn-ghost btn-sm" style="font-size:11px;">+ 추가</button>
        </div>
        <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">기본 스텟 외에 추가할 스텟을 자유롭게 입력하세요</div>
        <div id="customStatRewardRows">
          ${(achieve?.rewardCustomStats||[]).map(cs=>`
            <div class="cs-reward-row" style="display:grid;grid-template-columns:1fr 80px auto;gap:6px;margin-bottom:6px;align-items:center;">
              <input class="input-field csr-name" value="${Utils.escHtml(cs.name||'')}" placeholder="스텟명 (예: 마나, 재능...)" style="font-size:12px;padding:5px 8px;"/>
              <input type="number" class="input-field csr-value" value="${Utils.escHtml(String(cs.value||''))}" placeholder="수치" style="font-size:12px;padding:5px 8px;"/>
              <button type="button" class="btn-del-csr" style="background:none;border:1px solid var(--color-border);border-radius:4px;cursor:pointer;color:var(--color-danger);font-size:13px;padding:2px 7px;">✕</button>
            </div>`).join('')}
        </div>
      </div>

      <!-- 아이템 연결 -->
      <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
        <label class="form-label" style="display:block;margin-bottom:6px;">보상 아이템 연결 (여러 개 추가 가능)</label>
        <div id="rewardItemChips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:28px;margin-bottom:8px;"></div>
        ${sortedItems.length > 0 ? `<div style="position:relative;">
          <input class="input-field" id="itemLinkSearch" placeholder="아이템 이름으로 검색하여 추가..." style="width:100%;box-sizing:border-box;font-size:12px;"/>
          <div id="itemLinkResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:160px;overflow-y:auto;"></div>
        </div>` : `<div style="font-size:12px;color:var(--color-text-muted);">이 세계에 아이템이 없습니다</div>`}
      </div>

      <!-- 스킬 연결 -->
      <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
        <label class="form-label" style="display:block;margin-bottom:6px;">보상 스킬 연결 (여러 개 추가 가능)</label>
        <div id="rewardSkillChips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:28px;margin-bottom:8px;"></div>
        ${sortedSkills.length > 0 ? `<div style="position:relative;">
          <input class="input-field" id="skillLinkSearch" placeholder="스킬 이름으로 검색하여 추가..." style="width:100%;box-sizing:border-box;font-size:12px;"/>
          <div id="skillLinkResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:160px;overflow-y:auto;"></div>
        </div>` : `<div style="font-size:12px;color:var(--color-text-muted);">이 세계에 스킬이 없습니다</div>`}
      </div>

      <div class="form-group">
        <label class="form-label">설명 (소설 표시용)</label>
        <textarea class="textarea-field" id="fAcDesc" rows="3" placeholder="독자에게 보이는 칭호 설명..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(achieve?.description||'')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">작가 메모 <span style="font-size:11px;color:var(--color-text-dim);">(소설에 미표시)</span></label>
        <textarea class="textarea-field" id="fAcAuthor" rows="2" style="width:100%;box-sizing:border-box;">${Utils.escHtml(achieve?.authorNotes||'')}</textarea>
      </div>
    </div>`;

    Utils.openModal(isEdit?'칭호 편집':'새 칭호', body, async () => {
      const name = document.getElementById('fAcName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }

      const newBaseStats = {};
      document.querySelectorAll('#globalModalBody .ac-base-stat').forEach(inp => {
        if (inp.value!==''&&Number(inp.value)!==0) newBaseStats[inp.dataset.stat] = Number(inp.value);
      });
      const newCustomStats = [];
      document.querySelectorAll('#globalModalBody .cs-reward-row').forEach(row => {
        const nm = row.querySelector('.csr-name')?.value.trim();
        const vl = row.querySelector('.csr-value')?.value.trim();
        if (nm) newCustomStats.push({ name: nm, value: vl||'0' });
      });

      const item = {
        ...(achieve||{}), worldId: wid, name,
        grade:       document.getElementById('fAcGrade')?.value     ||'F',
        condition:   document.getElementById('fAcCondition')?.value.trim()||'',
        reward:      document.getElementById('fAcReward')?.value.trim()   ||'',
        rewardStats:       newBaseStats,
        rewardCustomStats: newCustomStats,
        rewardItems:  itemLinks,
        rewardSkillIds: skillIds,
        description: document.getElementById('fAcDesc')?.value.trim()  ||'',
        authorNotes: document.getElementById('fAcAuthor')?.value.trim()||'',
        id:        achieve?.id||DB.genId(),
        createdAt: achieve?.createdAt||Date.now(),
        updatedAt: Date.now(),
      };
      await DB.put('achievements', item);
      await AppStore.updateStreak();
      await AppStore.recordActivity('achievements', !isEdit);
      Utils.toast(isEdit?'저장됨':'추가됨', 'success');
      self._currentId = item.id;
      const updated = await DB.get('achievements', item.id);
      if (updated) self._renderDetail(container, updated, wid);
      return true;
    }, isEdit?'저장':'추가');

    setTimeout(() => {
      // ── 커스텀 스텟 보상 행 추가/삭제 ──────────────────────────
      const addCsrRow = () => {
        const rows = document.getElementById('customStatRewardRows'); if (!rows) return;
        const div = document.createElement('div');
        div.className = 'cs-reward-row';
        div.style.cssText = 'display:grid;grid-template-columns:1fr 80px auto;gap:6px;margin-bottom:6px;align-items:center;';
        div.innerHTML = `
          <input class="input-field csr-name" placeholder="스텟명 (예: 마나, 재능...)" style="font-size:12px;padding:5px 8px;"/>
          <input type="number" class="input-field csr-value" placeholder="수치" style="font-size:12px;padding:5px 8px;"/>
          <button type="button" class="btn-del-csr" style="background:none;border:1px solid var(--color-border);border-radius:4px;cursor:pointer;color:var(--color-danger);font-size:13px;padding:2px 7px;">✕</button>`;
        rows.appendChild(div);
      };
      document.getElementById('btnAddCustomStatReward')?.addEventListener('click', addCsrRow);
      document.getElementById('customStatRewardRows')?.addEventListener('click', e => {
        if (e.target.closest('.btn-del-csr')) e.target.closest('.cs-reward-row')?.remove();
      });

      // ── 아이템 칩 UI ──────────────────────────────────────────
      const renderItemChips = () => {
        const el = document.getElementById('rewardItemChips'); if (!el) return;
        el.innerHTML = itemLinks.map((r, idx) => {
          const it = sortedItems.find(x=>x.id===r.id);
          if (!it) return '';
          const isConsumable = it.type === '소비';
          return `<span class="item-reward-chip" data-idx="${idx}"
            style="display:inline-flex;align-items:center;gap:4px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);padding:2px 8px;border-radius:12px;font-size:12px;">
            🗡 ${Utils.escHtml(it.name)}
            ${isConsumable ? `<input type="number" class="item-chip-qty" data-idx="${idx}" value="${r.qty||1}" min="1"
              style="width:38px;padding:1px 4px;font-size:11px;border:1px solid rgba(245,158,11,0.3);border-radius:3px;background:transparent;color:inherit;" title="개수"/>` : ''}
            <span class="item-chip-del" data-idx="${idx}" style="cursor:pointer;color:var(--color-danger);padding:0 2px;font-size:12px;" title="제거">✕</span>
          </span>`;
        }).filter(Boolean).join('');
        // wire chip qty change
        el.querySelectorAll('.item-chip-qty').forEach(inp => {
          inp.addEventListener('input', () => {
            const i = Number(inp.dataset.idx);
            if (itemLinks[i]) itemLinks[i].qty = Math.max(1, Number(inp.value)||1);
          });
        });
        // wire chip delete
        el.querySelectorAll('.item-chip-del').forEach(del => {
          del.addEventListener('click', () => {
            itemLinks.splice(Number(del.dataset.idx), 1);
            renderItemChips();
          });
        });
      };
      renderItemChips();

      const itemIn = document.getElementById('itemLinkSearch');
      const itemRs = document.getElementById('itemLinkResults');
      if (itemIn && itemRs) {
        itemIn.addEventListener('input', () => {
          const q = itemIn.value.trim().toLowerCase();
          if (!q) { itemRs.style.display='none'; return; }
          const hits = sortedItems.filter(it => !itemLinks.some(r=>r.id===it.id) && (it.name||'').toLowerCase().includes(q)).slice(0,8);
          if (!hits.length) { itemRs.style.display='none'; return; }
          itemRs.style.display='block';
          itemRs.innerHTML = hits.map(it=>`<div class="item-result" data-iid="${Utils.escHtml(it.id)}"
            style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);display:flex;justify-content:space-between;">
            <span>${Utils.escHtml(it.name)}</span>
            <span style="font-size:11px;color:var(--color-text-muted);">${Utils.escHtml(it.type||'')}${it.type==='소비'?' · 소비(개수 설정 가능)':''}</span>
          </div>`).join('');
          itemRs.querySelectorAll('.item-result').forEach(row=>{
            row.addEventListener('mousedown', e=>{
              e.preventDefault();
              itemLinks.push({ id: row.dataset.iid, qty: 1 });
              itemIn.value=''; itemRs.style.display='none';
              renderItemChips();
            });
          });
        });
        itemIn.addEventListener('blur', ()=>setTimeout(()=>{ itemRs.style.display='none'; },150));
      }

      // ── 스킬 칩 UI ────────────────────────────────────────────
      const renderSkillChips = () => {
        const el = document.getElementById('rewardSkillChips'); if (!el) return;
        el.innerHTML = skillIds.map((sid, idx) => {
          const sk = sortedSkills.find(x=>x.id===sid);
          if (!sk) return '';
          return `<span class="skill-reward-chip" data-idx="${idx}"
            style="display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);padding:2px 8px;border-radius:12px;font-size:12px;cursor:pointer;" title="클릭하여 제거">
            ⚡ ${Utils.escHtml(sk.name)} (${sk.grade||'F'})
            <span class="skill-chip-del" data-idx="${idx}" style="color:var(--color-danger);padding:0 2px;">✕</span>
          </span>`;
        }).filter(Boolean).join('');
        el.querySelectorAll('.skill-chip-del').forEach(del=>{
          del.addEventListener('click', ()=>{
            skillIds.splice(Number(del.dataset.idx), 1);
            renderSkillChips();
          });
        });
      };
      renderSkillChips();

      const skillIn = document.getElementById('skillLinkSearch');
      const skillRs = document.getElementById('skillLinkResults');
      if (skillIn && skillRs) {
        skillIn.addEventListener('input', () => {
          const q = skillIn.value.trim().toLowerCase();
          if (!q) { skillRs.style.display='none'; return; }
          const hits = sortedSkills.filter(sk=>!skillIds.includes(sk.id)&&(sk.name||'').toLowerCase().includes(q)).slice(0,8);
          if (!hits.length) { skillRs.style.display='none'; return; }
          skillRs.style.display='block';
          skillRs.innerHTML = hits.map(sk=>`<div class="skill-result" data-sid="${Utils.escHtml(sk.id)}"
            style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">
            ⚡ ${Utils.escHtml(sk.name)} <span style="font-size:11px;color:${Utils.gradeColor(sk.grade||'F')};">(${sk.grade||'F'})</span>
          </div>`).join('');
          skillRs.querySelectorAll('.skill-result').forEach(row=>{
            row.addEventListener('mousedown', e=>{
              e.preventDefault();
              skillIds.push(row.dataset.sid);
              skillIn.value=''; skillRs.style.display='none';
              renderSkillChips();
            });
          });
        });
        skillIn.addEventListener('blur', ()=>setTimeout(()=>{ skillRs.style.display='none'; },150));
      }
    }, 60);
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  }
};
