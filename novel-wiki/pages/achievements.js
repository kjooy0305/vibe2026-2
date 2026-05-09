'use strict';
window.Pages = window.Pages || {};
window.Pages.achievements = {
  _currentId: null,
  _container: null,
  GRADES: ['F','E','D','C','B','A','S','SS','SSS','G','GG','GGG','EX'],

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
    const achievements = await DB.getAll('achievements', wid);
    if (options.highlightId) this._currentId = options.highlightId;
    if (this._currentId) {
      const a = achievements.find(x => x.id === this._currentId);
      if (a) { this._renderDetail(container, a, wid); return; }
    }
    this._renderList(container, achievements, wid);
  },

  _renderList: function(container, achievements, wid) {
    this._currentId = null;
    const world = AppStore.getState().currentWorld;

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">업적</h2>
          <button class="btn btn-primary btn-sm" id="btnAddAchieve">+ 추가</button>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${achievements.length}개
        </p>
        <input class="input-field" id="achieveFilter" placeholder="이름, 등급, 조건 검색..." style="margin-top:8px;width:100%;box-sizing:border-box;" />
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;" id="gradeFilters">
          <button class="filter-chip active" data-grade="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-primary);color:#000;font-size:11px;cursor:pointer;">전체</button>
          ${this.GRADES.map(g => `<button class="filter-chip" data-grade="${g}" style="padding:3px 8px;border-radius:4px;border:1px solid ${Utils.gradeColor(g)}66;background:transparent;color:${Utils.gradeColor(g)};font-size:11px;cursor:pointer;">${g}</button>`).join('')}
        </div>
      </div>

      <div id="achieveList" class="item-list">
        ${achievements.length === 0
          ? `<div class="empty-state" style="padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">🏆</div>
               <div style="font-weight:700;font-size:16px;margin-bottom:4px;">업적이 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);">업적을 추가하면 캐릭터의 상태창에 표시됩니다</div>
             </div>`
          : achievements.map(a => this._achieveCard(a)).join('')}
      </div>
    </div>`;

    let activeGrade = '';
    container.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-chip').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = b.dataset.grade ? Utils.gradeColor(b.dataset.grade) : 'var(--color-text-muted)';
        });
        btn.style.background = btn.dataset.grade ? Utils.gradeColor(btn.dataset.grade) : 'var(--color-primary)';
        btn.style.color = '#000';
        activeGrade = btn.dataset.grade;
        const q = document.getElementById('achieveFilter')?.value || '';
        this._applyFilter(container, q, activeGrade);
      });
    });

    document.getElementById('achieveFilter')?.addEventListener('input', e => {
      this._applyFilter(container, e.target.value, activeGrade);
    });

    document.getElementById('btnAddAchieve')?.addEventListener('click', () => {
      this._openForm(null, wid, container);
    });

    container.querySelectorAll('.achieve-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-achieve') || e.target.closest('.btn-copy-achieve')) return;
        const id = card.dataset.id;
        DB.getAll('achievements', wid).then(all => {
          const a = all.find(x => x.id === id);
          if (a) { this._currentId = a.id; this._renderDetail(container, a, wid); }
        });
      });
    });

    container.querySelectorAll('.btn-del-achieve').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const a = achievements.find(x => x.id === id);
        Utils.confirm(
          `"${a?.name || '이 업적'}" 삭제`,
          '삭제하시겠습니까?',
          async () => {
            await DB.del('achievements', id);
            Utils.toast('삭제됨', 'info');
            this.init(container);
          }
        );
      });
    });

    container.querySelectorAll('.btn-copy-achieve').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const a = achievements.find(x => x.id === btn.dataset.id);
        if (!a) return;
        const worlds = AppStore.getState().worlds.filter(w => w.id !== wid);
        if (!worlds.length) { Utils.toast('다른 세계가 없습니다', 'error'); return; }
        const body = `
          <div class="form-group">
            <label class="form-label">복사할 세계 선택</label>
            <select class="select-input" id="copyAchieveWorld" style="width:100%;">
              ${worlds.map(w => `<option value="${Utils.escHtml(w.id)}">${Utils.escHtml(w.name)}</option>`).join('')}
            </select>
          </div>`;
        Utils.openModal('다른 세계로 복사', body, async () => {
          const tid = document.getElementById('copyAchieveWorld')?.value;
          if (!tid) return false;
          const copy = { ...a, id: DB.genId(), worldId: tid, createdAt: Date.now(), updatedAt: Date.now() };
          await DB.put('achievements', copy);
          Utils.toast('복사됨', 'success');
          return true;
        }, '복사');
      });
    });
  },

  _applyFilter: function(container, query, grade) {
    const q = (query || '').toLowerCase();
    container.querySelectorAll('.achieve-card').forEach(card => {
      const text = (card.dataset.searchText || '').toLowerCase();
      const cardGrade = card.dataset.grade || '';
      const gradeOk = !grade || cardGrade === grade;
      const textOk = !q || text.includes(q);
      card.style.display = gradeOk && textOk ? '' : 'none';
    });
  },

  _achieveCard: function(a) {
    const gc = Utils.gradeColor(a.grade || 'F');
    const hasWarning = !a.condition;
    return `
    <div class="achieve-card list-item list-item--full"
      data-id="${Utils.escHtml(a.id)}"
      data-grade="${Utils.escHtml(a.grade || '')}"
      data-search-text="${Utils.escHtml([a.name, a.grade, a.condition, a.reward].filter(Boolean).join(' ').toLowerCase())}"
      style="cursor:pointer;border-left:3px solid ${gc};display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--color-surface2,#1a2535);border-radius:10px;border-top:1px solid var(--color-border);border-right:1px solid var(--color-border);border-bottom:1px solid var(--color-border);margin-bottom:8px;">
      <div style="flex:1;min-width:0;">
        <!-- Status-window style display: ㅣ[업적] ㄴname -->
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${Utils.gradeBadge(a.grade || 'F')}
          <span style="font-size:11px;color:var(--color-text-muted);">ㅣ[업적]</span>
          <span style="font-weight:700;font-size:14px;">${Utils.escHtml(a.name || '이름 없음')}</span>
          ${hasWarning ? '<span title="달성 조건 없음" style="color:var(--color-warning);font-size:13px;">⚠️</span>' : ''}
        </div>
        <div style="font-size:12px;color:var(--color-text-muted);margin-top:3px;padding-left:8px;">ㄴ${Utils.escHtml(a.name || '')}</div>
        ${a.condition ? `<div style="font-size:12px;color:var(--color-text-dim);margin-top:4px;">달성 조건: ${Utils.escHtml(a.condition)}</div>` : ''}
        ${a.reward ? `<div style="font-size:12px;color:var(--color-accent);margin-top:2px;">보상: ${Utils.escHtml(a.reward)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end;">
        <button class="btn btn-ghost btn-sm btn-copy-achieve" data-id="${Utils.escHtml(a.id)}" style="font-size:11px;">복사</button>
        <button class="btn btn-ghost btn-sm btn-del-achieve" data-id="${Utils.escHtml(a.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  _renderDetail: async function(container, a, wid) {
    const gc = Utils.gradeColor(a.grade || 'F');
    const isGradient = gc.startsWith('linear');
    const borderColor = isGradient ? '#fbbf24' : gc;

    // Resolve reward links (support both old single and new multi)
    const rewardItemIds = a.rewardItemIds || (a.rewardItemId ? [a.rewardItemId] : []);
    const rewardSkillIds = a.rewardSkillIds || (a.rewardSkillId ? [a.rewardSkillId] : []);
    const rewardItems = (await Promise.all(rewardItemIds.map(id => DB.get('items', id)))).filter(Boolean);
    const rewardSkills = (await Promise.all(rewardSkillIds.map(id => DB.get('skills', id)))).filter(Boolean);

    const rewardStatEntries = Object.entries(a.rewardStats || {}).filter(([, v]) => v !== 0);
    const statRewardHTML = rewardStatEntries.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${rewardStatEntries.map(([k, v]) => `<span style="font-size:11px;padding:1px 6px;border-radius:4px;background:rgba(100,150,255,0.15);color:#c4b5fd;border:1px solid rgba(100,150,255,0.2);">${k} ${v > 0 ? '+' : ''}${v}</span>`).join('')}</div>`
      : '';
    const rewardLinkHTML = [
      ...rewardItems.map(it => `<button class="btn btn-ghost btn-sm btn-reward-item" data-item-id="${Utils.escHtml(it.id)}" style="font-size:12px;">→ 🗡 ${Utils.escHtml(it.name)}</button>`),
      ...rewardSkills.map(sk => `<button class="btn btn-ghost btn-sm btn-reward-skill" data-skill-id="${Utils.escHtml(sk.id)}" style="font-size:12px;">→ ⚡ ${Utils.escHtml(sk.name)}</button>`),
    ].join('');

    container.innerHTML = `
    <div class="page active">
      <div class="page-header" style="border-left:4px solid ${borderColor};padding-left:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackAchieve">← 목록</button>
          ${Utils.gradeBadge(a.grade || 'F')}
          <h2 class="page-title" style="margin:0;font-size:18px;">${Utils.escHtml(a.name || '업적')}</h2>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditAchieve">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnCopyAchieveText">텍스트 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnDelAchieveDetail" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      <!-- Status-window style box -->
      <div style="background:rgba(10,20,35,0.95);border:1px solid ${borderColor}66;border-radius:8px;padding:16px;font-family:var(--font-mono);font-size:13px;line-height:1.9;color:#c8d8ff;margin-bottom:16px;position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,188,212,0.04) 0%,transparent 50%,rgba(124,58,237,0.04) 100%);pointer-events:none;"></div>
        <div style="text-align:center;color:rgba(100,150,255,0.5);font-size:11px;margin-bottom:8px;letter-spacing:4px;">ㅡㅡㅡㅡ</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          ${Utils.gradeBadge(a.grade || 'F')}
          <span style="color:rgba(200,220,255,0.8);">ㅣ[업적]</span>
        </div>
        <div style="padding-left:8px;color:#e2e8f0;font-weight:700;margin-bottom:4px;">ㄴ${Utils.escHtml(a.name || '')}</div>
        ${a.condition ? `
          <div style="margin-top:8px;">
            <div style="font-size:11px;color:rgba(148,163,184,0.8);margin-bottom:2px;">달성 조건</div>
            <div style="white-space:pre-wrap;font-size:12px;color:#c8d8ff;">${Utils.nl2br(a.condition)}</div>
          </div>` : ''}
        ${(a.reward || statRewardHTML || rewardLinkHTML) ? `
          <div style="margin-top:8px;">
            <div style="font-size:11px;color:rgba(148,163,184,0.8);margin-bottom:2px;">보상</div>
            ${a.reward ? `<div style="font-size:12px;color:var(--color-accent);font-weight:600;">${Utils.escHtml(a.reward)}</div>` : ''}
            ${statRewardHTML}
            ${rewardLinkHTML ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${rewardLinkHTML}</div>` : ''}
          </div>` : ''}
        ${a.description ? `
          <div style="margin-top:10px;border-top:1px dashed rgba(100,150,255,0.2);padding-top:10px;">
            <div style="white-space:pre-wrap;font-size:12px;font-style:italic;color:rgba(200,220,255,0.7);">${Utils.nl2br(a.description)}</div>
          </div>` : ''}
        <div style="text-align:center;color:rgba(100,150,255,0.5);font-size:11px;margin-top:8px;letter-spacing:4px;">ㅡㅡㅡㅡ</div>
      </div>

      ${a.authorNotes ? `
        <div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:16px;">
          <div style="font-size:11px;color:var(--color-warning);margin-bottom:4px;font-weight:700;">작가 전용 메모 (소설에 미표시)</div>
          <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(a.authorNotes)}</div>
        </div>` : ''}

      <div style="font-size:11px;color:var(--color-text-dim);text-align:right;">
        수정: ${Utils.formatDate(a.updatedAt)} · 생성: ${Utils.formatDate(a.createdAt)}
      </div>
    </div>`;

    document.getElementById('btnBackAchieve')?.addEventListener('click', () => { this._currentId = null; this.init(container); });
    document.getElementById('btnEditAchieve')?.addEventListener('click', () => this._openForm(a, wid, container));
    document.getElementById('btnDelAchieveDetail')?.addEventListener('click', () => {
      Utils.confirm(`"${a.name}" 삭제`, '삭제하시겠습니까?', async () => {
        await DB.del('achievements', a.id);
        Utils.toast('삭제됨', 'info');
        this._currentId = null;
        this.init(container);
      });
    });
    document.getElementById('btnCopyAchieveText')?.addEventListener('click', () => {
      const text = [
        'ㅡ'.repeat(4),
        `ㅣ[업적]`,
        `ㄴ${a.name || ''}`,
        `ㅣ등급: ${a.grade || ''}`,
        a.condition ? `ㅣ달성 조건: ${a.condition}` : null,
        a.reward ? `ㅣ보상: ${a.reward}` : null,
        a.description ? `ㅣ설명: ${a.description}` : null,
        'ㅡ'.repeat(4),
      ].filter(x => x !== null).join('\n');
      Utils.copyText(text);
    });
    container.querySelectorAll('.btn-reward-item').forEach(btn => {
      btn.addEventListener('click', () => AppRouter.navigate('items', { highlightId: btn.dataset.itemId }));
    });
    container.querySelectorAll('.btn-reward-skill').forEach(btn => {
      btn.addEventListener('click', () => AppRouter.navigate('skills', { highlightId: btn.dataset.skillId }));
    });
  },

  _openForm: async function(achieve, wid, container) {
    const isEdit = !!achieve;

    // Load items and skills for reward linking
    const [items, skills] = await Promise.all([
      DB.getAll('items', wid),
      DB.getAll('skills', wid),
    ]);

    const STAT_KEYS = ['힘', '민첩', '체력', '마나', '마력', '재능', '잠재력', '행운', '신성력', '정신력', '투지', '집중력'];
    const rewardStats = achieve?.rewardStats || {};
    const rewardItemIds = new Set(achieve?.rewardItemIds || (achieve?.rewardItemId ? [achieve.rewardItemId] : []));
    const rewardSkillIds = new Set(achieve?.rewardSkillIds || (achieve?.rewardSkillId ? [achieve.rewardSkillId] : []));

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;max-height:72vh;overflow-y:auto;padding-right:4px;">
        <div class="form-group">
          <label class="form-label">이름 *</label>
          <input class="input-field" id="fAcName" value="${Utils.escHtml(achieve?.name || '')}" placeholder="업적 이름" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">등급</label>
          <select class="select-input" id="fAcGrade" style="width:100%;">
            ${this.GRADES.map(g => `<option value="${g}" ${(achieve?.grade || 'F') === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">달성 조건 <span style="color:var(--color-warning);font-size:11px;">(누락 시 ⚠️)</span></label>
          <textarea class="textarea-field" id="fAcCondition" rows="3" placeholder="업적을 달성하기 위한 조건..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(achieve?.condition || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">보상 (텍스트)</label>
          <input class="input-field" id="fAcReward" value="${Utils.escHtml(achieve?.reward || '')}" placeholder="예: 칭호 '최초의 사냥꾼'" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">스텟 보상 (수치 입력)</label>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
            ${STAT_KEYS.map(s => `<div style="display:flex;align-items:center;gap:4px;">
              <label style="font-size:11px;color:var(--color-text-muted);min-width:40px;">${s}</label>
              <input type="number" class="input-field ac-stat-reward" data-stat="${s}" value="${rewardStats[s] !== undefined ? rewardStats[s] : ''}" placeholder="0" style="flex:1;padding:4px 6px;font-size:12px;" />
            </div>`).join('')}
          </div>
        </div>
        ${items.length > 0 ? `<div class="form-group">
          <label class="form-label">보상 아이템 연결 (복수 선택 가능)</label>
          <div style="max-height:100px;overflow-y:auto;border:1px solid var(--color-border);border-radius:6px;padding:6px;">
            ${items.map(i => `<label style="display:flex;align-items:center;gap:6px;padding:2px 0;cursor:pointer;">
              <input type="checkbox" class="ac-item-cb" data-iid="${Utils.escHtml(i.id)}" ${rewardItemIds.has(i.id) ? 'checked' : ''} />
              <span style="font-size:12px;">${Utils.escHtml(i.name)}</span>
            </label>`).join('')}
          </div>
        </div>` : ''}
        ${skills.length > 0 ? `<div class="form-group">
          <label class="form-label">보상 스킬 연결 (복수 선택 가능)</label>
          <div style="max-height:100px;overflow-y:auto;border:1px solid var(--color-border);border-radius:6px;padding:6px;">
            ${skills.map(s => `<label style="display:flex;align-items:center;gap:6px;padding:2px 0;cursor:pointer;">
              <input type="checkbox" class="ac-skill-cb" data-sid="${Utils.escHtml(s.id)}" ${rewardSkillIds.has(s.id) ? 'checked' : ''} />
              <span style="font-size:12px;">⚡ ${Utils.escHtml(s.name)} (${s.grade || 'F'})</span>
            </label>`).join('')}
          </div>
        </div>` : ''}
        <div class="form-group">
          <label class="form-label">설명 (소설 표시용)</label>
          <textarea class="textarea-field" id="fAcDesc" rows="3" placeholder="독자에게 보이는 업적 설명..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(achieve?.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">작가 메모 <span style="font-size:11px;color:var(--color-text-dim);">(소설에 미표시)</span></label>
          <textarea class="textarea-field" id="fAcAuthor" rows="2" placeholder="설계 의도, 플롯 연계..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(achieve?.authorNotes || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '업적 편집' : '새 업적', body, async () => {
      const name = document.getElementById('fAcName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }

      const newRewardStats = {};
      document.querySelectorAll('#globalModalBody .ac-stat-reward').forEach(inp => {
        if (inp.value !== '' && Number(inp.value) !== 0) {
          newRewardStats[inp.dataset.stat] = Number(inp.value);
        }
      });
      const newRewardItemIds = [...document.querySelectorAll('#globalModalBody .ac-item-cb:checked')].map(cb => cb.dataset.iid);
      const newRewardSkillIds = [...document.querySelectorAll('#globalModalBody .ac-skill-cb:checked')].map(cb => cb.dataset.sid);

      const item = {
        ...(achieve || {}),
        worldId: wid,
        name,
        grade: document.getElementById('fAcGrade')?.value || 'F',
        condition: document.getElementById('fAcCondition')?.value.trim() || '',
        reward: document.getElementById('fAcReward')?.value.trim() || '',
        rewardStats: newRewardStats,
        rewardItemIds: newRewardItemIds,
        rewardSkillIds: newRewardSkillIds,
        description: document.getElementById('fAcDesc')?.value.trim() || '',
        authorNotes: document.getElementById('fAcAuthor')?.value.trim() || '',
        id: achieve?.id || DB.genId(),
        createdAt: achieve?.createdAt || Date.now(),
      };

      await DB.put('achievements', item);
      await AppStore.updateStreak();
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      this._currentId = item.id;
      const updated = await DB.get('achievements', item.id);
      if (updated) this._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  }
};
