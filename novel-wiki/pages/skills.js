'use strict';
window.Pages = window.Pages || {};
window.Pages.skills = {
  _currentId: null,
  _container: null,
  GRADES: ['F','E','D','C','B','A','S','SS','SSS','G','GG','GGG','EX'],
  TYPES: ['패시브','액티브'],
  PASSIVE_SUBTYPES: ['강화-스텟','강화-스킬','자동반사','억제-광역','억제-단일','반격'],
  ACTIVE_SUBTYPES: ['변형','일반-공격','일반-방어','일반-서포트','캐스팅-즉발','캐스팅-필요'],
  SUBTYPES: ['상급','하급','응용','진화','융합'],
  ATTRIBUTES: ['없음','화염','물','땅','바람','뇨','성화','청화','백화','빙화','빙','흑뢰','적뢰','공간','이능','신성','타락'],
  SERIES: ['없음','공격','방어','치료','계약-처벌','계약-심판','계약-처행'],

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
    const skills = await DB.getAll('skills', wid);
    if (options.highlightId) this._currentId = options.highlightId;
    if (this._currentId) {
      const s = skills.find(x => x.id === this._currentId);
      if (s) { this._renderDetail(container, s, wid); return; }
    }
    this._renderList(container, skills, wid);
  },

  _renderList: function(container, skills, wid) {
    this._currentId = null;
    const world = AppStore.getState().currentWorld;
    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">스킬 라이브러리</h2>
          <button class="btn btn-primary btn-sm" id="btnAddSkill">+ 추가</button>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${skills.length}개 · 캐릭터/몬스터에서 참조됩니다
        </p>
        <input class="input-field" id="skillFilter" placeholder="이름, 등급, 속성, 계열 검색..." style="margin-top:8px;width:100%;box-sizing:border-box;" />
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;" id="gradeFilters">
          <button class="filter-chip active" data-grade="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-primary);color:#000;font-size:11px;cursor:pointer;">전체</button>
          ${this.GRADES.map(g => `<button class="filter-chip" data-grade="${g}" style="padding:3px 8px;border-radius:4px;border:1px solid ${Utils.gradeColor(g)}66;background:transparent;color:${Utils.gradeColor(g)};font-size:11px;cursor:pointer;">${g}</button>`).join('')}
        </div>
      </div>
      <div id="skillList" class="item-list">
        ${skills.length === 0
          ? `<div class="empty-state" style="padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">⚡</div>
               <div style="font-weight:700;font-size:16px;margin-bottom:4px;">스킬이 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 스킬 라이브러리를 채우세요.<br>캐릭터/몬스터에서 이 라이브러리를 참조합니다.</div>
             </div>`
          : skills.map(s => this._skillCard(s)).join('')}
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
        const q = document.getElementById('skillFilter')?.value || '';
        this._applyFilter(container, q, activeGrade);
      });
    });

    document.getElementById('skillFilter')?.addEventListener('input', e => {
      this._applyFilter(container, e.target.value, activeGrade);
    });

    document.getElementById('btnAddSkill')?.addEventListener('click', () => {
      this._openForm(null, wid, container);
    });

    container.querySelectorAll('.skill-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-skill') || e.target.closest('.btn-copy-skill')) return;
        const id = card.dataset.id;
        DB.getAll('skills', wid).then(all => {
          const s = all.find(x => x.id === id);
          if (s) { this._currentId = s.id; this._renderDetail(container, s, wid); }
        });
      });
    });

    container.querySelectorAll('.btn-del-skill').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const s = skills.find(x => x.id === id);
        Utils.confirm(
          `"${s?.name || '이 스킬'}" 삭제`,
          '삭제하면 캐릭터/몬스터에서 참조가 끊어집니다. 계속하시겠습니까?',
          async () => {
            await DB.del('skills', id);
            Utils.toast('삭제됨', 'info');
            this.init(container);
          }
        );
      });
    });

    container.querySelectorAll('.btn-copy-skill').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const s = skills.find(x => x.id === btn.dataset.id);
        if (!s) return;
        const worlds = AppStore.getState().worlds.filter(w => w.id !== wid);
        if (!worlds.length) { Utils.toast('다른 세계가 없습니다', 'error'); return; }
        const body = `
          <div class="form-group">
            <label class="form-label">복사할 세계 선택</label>
            <select class="select-input" id="copySkillWorld" style="width:100%;">
              ${worlds.map(w => `<option value="${Utils.escHtml(w.id)}">${Utils.escHtml(w.name)}</option>`).join('')}
            </select>
          </div>`;
        Utils.openModal('다른 세계로 복사', body, async () => {
          const tid = document.getElementById('copySkillWorld')?.value;
          if (!tid) return false;
          const copy = { ...s, id: DB.genId(), worldId: tid, createdAt: Date.now(), updatedAt: Date.now() };
          await DB.put('skills', copy);
          Utils.toast('복사됨', 'success');
          return true;
        }, '복사');
      });
    });
  },

  _applyFilter: function(container, query, grade) {
    const q = (query || '').toLowerCase();
    container.querySelectorAll('.skill-card').forEach(card => {
      const text = (card.dataset.searchText || '').toLowerCase();
      const cardGrade = card.dataset.grade || '';
      const gradeOk = !grade || cardGrade === grade;
      const textOk = !q || text.includes(q);
      card.style.display = gradeOk && textOk ? '' : 'none';
    });
  },

  _skillCard: function(s) {
    const gc = Utils.gradeColor(s.grade || 'F');
    const hasWarning = !s.effects || !s.name;
    const typeLabel = [s.type, s.activeSubtype || s.passiveSubtype].filter(Boolean).join(' · ');
    return `
    <div class="skill-card list-item list-item--full"
      data-id="${Utils.escHtml(s.id)}"
      data-grade="${Utils.escHtml(s.grade || '')}"
      data-search-text="${Utils.escHtml([s.name, s.grade, s.attribute, s.series, s.type, s.effects].filter(Boolean).join(' ').toLowerCase())}"
      style="cursor:pointer;border-left:3px solid ${gc};display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--color-surface2,#1a2535);border-radius:10px;border-top:1px solid var(--color-border);border-right:1px solid var(--color-border);border-bottom:1px solid var(--color-border);margin-bottom:8px;">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${Utils.gradeBadge(s.grade || 'F')}
          <span style="font-weight:700;font-size:14px;">${Utils.escHtml(s.name || '이름 없음')}</span>
          ${hasWarning ? '<span title="누락된 필드 있음" style="color:var(--color-warning);font-size:13px;">⚠️</span>' : ''}
          ${s.subType ? `<span style="font-size:11px;padding:1px 5px;background:var(--color-border);border-radius:3px;color:var(--color-text-muted);">${Utils.escHtml(s.subType)}</span>` : ''}
        </div>
        <div style="font-size:12px;color:var(--color-text-muted);margin-top:3px;">
          ${Utils.escHtml(typeLabel)}${s.attribute && s.attribute !== '없음' ? ' · ' + Utils.escHtml(s.attribute) : ''}${s.series && s.series !== '없음' ? ' · ' + Utils.escHtml(s.series) + ' 계열' : ''}
        </div>
        ${s.manaCost !== undefined && s.manaCost !== '' && s.manaCost !== 0
          ? `<div style="font-size:11px;color:var(--color-info);margin-top:2px;">마나 ${s.manaCost}${s.cooldown ? ' · 쿨타임 ' + Utils.escHtml(s.cooldown) : ''}</div>`
          : (s.cooldown ? `<div style="font-size:11px;color:var(--color-info);margin-top:2px;">쿨타임 ${Utils.escHtml(s.cooldown)}</div>` : '')}
        ${s.effects ? `<div style="font-size:12px;color:var(--color-text-dim);margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;">${Utils.escHtml(s.effects)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end;">
        <button class="btn btn-ghost btn-sm btn-copy-skill" data-id="${Utils.escHtml(s.id)}" style="font-size:11px;">복사</button>
        <button class="btn btn-ghost btn-sm btn-del-skill" data-id="${Utils.escHtml(s.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  _renderDetail: function(container, s, wid) {
    const gc = Utils.gradeColor(s.grade || 'F');
    const isGradient = gc.startsWith('linear');
    const borderColor = isGradient ? '#fbbf24' : gc;
    container.innerHTML = `
    <div class="page active">
      <div class="page-header" style="border-left:4px solid ${borderColor};padding-left:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackSkills">← 목록</button>
          ${Utils.gradeBadge(s.grade || 'F')}
          <h2 class="page-title" style="margin:0;font-size:18px;">${Utils.escHtml(s.name || '이름 없음')}</h2>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditSkill">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnCopySkillText">텍스트 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnDelSkillDetail" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      <!-- Skill box (novel-style) -->
      <div style="border:1px solid ${borderColor}44;border-radius:12px;padding:16px;background:${borderColor}0a;margin-bottom:16px;">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
          ${Utils.gradeBadge(s.grade || 'F')}
          ${s.type ? `<span style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:12px;">${Utils.escHtml(s.type)}</span>` : ''}
          ${s.activeSubtype ? `<span style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:12px;">${Utils.escHtml(s.activeSubtype)}</span>` : ''}
          ${s.passiveSubtype ? `<span style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:12px;">${Utils.escHtml(s.passiveSubtype)}</span>` : ''}
          ${s.subType ? `<span style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:12px;">${Utils.escHtml(s.subType)}</span>` : ''}
          ${s.attribute && s.attribute !== '없음' ? `<span style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:12px;color:var(--color-accent);">${Utils.escHtml(s.attribute)}</span>` : ''}
          ${s.series && s.series !== '없음' ? `<span style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:12px;">${Utils.escHtml(s.series)} 계열</span>` : ''}
          ${s.grade === 'EX' && s.exLevel !== undefined && s.exLevel !== '' ? `<span style="padding:2px 8px;border-radius:4px;border:1px solid gold;font-size:12px;color:gold;">EX Lv.${s.exLevel}</span>` : ''}
        </div>
        ${s.manaCost !== undefined && s.manaCost !== '' ? `
          <div style="display:flex;gap:8px;margin-bottom:6px;">
            <span style="font-size:12px;color:var(--color-text-muted);min-width:80px;">소모 마나</span>
            <span style="font-size:12px;font-weight:600;color:var(--color-info);">${Utils.escHtml(String(s.manaCost))}</span>
          </div>` : ''}
        ${s.cooldown ? `
          <div style="display:flex;gap:8px;margin-bottom:6px;">
            <span style="font-size:12px;color:var(--color-text-muted);min-width:80px;">쿨타임</span>
            <span style="font-size:12px;font-weight:600;">${Utils.escHtml(s.cooldown)}</span>
          </div>` : ''}
        <div style="margin-top:12px;">
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">효과</div>
          <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(s.effects || '(없음)')}</div>
        </div>
        <div style="margin-top:12px;">
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">설명</div>
          <div style="white-space:pre-wrap;font-size:13px;font-style:italic;color:var(--color-text-muted);line-height:1.7;">${Utils.nl2br(s.description || '(없음)')}</div>
        </div>
      </div>

      ${s.authorNotes ? `
        <div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:16px;">
          <div style="font-size:11px;color:var(--color-warning);margin-bottom:4px;font-weight:700;">작가 전용 메모 (소설에 미표시)</div>
          <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(s.authorNotes)}</div>
        </div>` : ''}

      <div style="font-size:11px;color:var(--color-text-dim);text-align:right;">
        수정: ${Utils.formatDate(s.updatedAt)} · 생성: ${Utils.formatDate(s.createdAt)}
      </div>
    </div>`;

    document.getElementById('btnBackSkills')?.addEventListener('click', () => {
      this._currentId = null;
      this.init(container);
    });
    document.getElementById('btnEditSkill')?.addEventListener('click', () => this._openForm(s, wid, container));
    document.getElementById('btnDelSkillDetail')?.addEventListener('click', () => {
      Utils.confirm(`"${s.name}" 삭제`, '삭제하면 캐릭터/몬스터에서 참조가 끊어집니다.', async () => {
        await DB.del('skills', s.id);
        Utils.toast('삭제됨', 'info');
        this._currentId = null;
        this.init(container);
      });
    });
    document.getElementById('btnCopySkillText')?.addEventListener('click', () => {
      const typeStr = [s.type, s.activeSubtype || s.passiveSubtype].filter(Boolean).join('/');
      const text = [
        'ㅡ'.repeat(4),
        `ㅣ이름: ${s.name || ''}`,
        `ㅣ등급: ${s.grade || ''}`,
        `ㅣ소모 마나: ${s.manaCost !== undefined ? s.manaCost : 0} (${typeStr || '패시브'})`,
        s.cooldown ? `ㅣ쿨타임: ${s.cooldown}` : null,
        s.attribute && s.attribute !== '없음' ? `ㅣ속성: ${s.attribute}` : null,
        s.series && s.series !== '없음' ? `ㅣ계열: ${s.series}` : null,
        `ㅣ효과:`,
        s.effects || '',
        `ㅣ설명: ${s.description || ''}`,
        'ㅡ'.repeat(4),
      ].filter(x => x !== null).join('\n');
      Utils.copyText(text);
    });
  },

  _openForm: function(skill, wid, container) {
    const isEdit = !!skill;
    const allSubtypes = [...this.PASSIVE_SUBTYPES, ...this.ACTIVE_SUBTYPES];

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label class="form-label">이름 *</label>
          <input class="input-field" id="fSkName" value="${Utils.escHtml(skill?.name || '')}" placeholder="스킬 이름" style="width:100%;box-sizing:border-box;" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">등급</label>
            <select class="select-input" id="fSkGrade" style="width:100%;">
              ${this.GRADES.map(g => `<option value="${g}" ${(skill?.grade || 'F') === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">타입</label>
            <select class="select-input" id="fSkType" style="width:100%;">
              ${this.TYPES.map(t => `<option value="${t}" ${(skill?.type || '패시브') === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">패시브 세부</label>
            <select class="select-input" id="fSkPassiveSub" style="width:100%;">
              <option value="">없음</option>
              ${this.PASSIVE_SUBTYPES.map(t => `<option value="${t}" ${skill?.passiveSubtype === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">액티브 세부</label>
            <select class="select-input" id="fSkActiveSub" style="width:100%;">
              <option value="">없음</option>
              ${this.ACTIVE_SUBTYPES.map(t => `<option value="${t}" ${skill?.activeSubtype === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">속성</label>
            <select class="select-input" id="fSkAttr" style="width:100%;">
              ${this.ATTRIBUTES.map(a => `<option value="${a}" ${(skill?.attribute || '없음') === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">계열</label>
            <select class="select-input" id="fSkSeries" style="width:100%;">
              ${this.SERIES.map(s => `<option value="${s}" ${(skill?.series || '없음') === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">세부 유형 (상급/응용 등)</label>
            <select class="select-input" id="fSkSubType" style="width:100%;">
              <option value="">없음</option>
              ${this.SUBTYPES.map(t => `<option value="${t}" ${skill?.subType === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">소모 마나</label>
            <input type="number" class="input-field" id="fSkMana" value="${skill?.manaCost !== undefined ? skill.manaCost : 0}" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">쿨타임</label>
            <input class="input-field" id="fSkCooldown" value="${Utils.escHtml(skill?.cooldown || '')}" placeholder="예: 20초, 즉발" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group" id="exLevelGroup" style="display:${(skill?.grade || 'F') === 'EX' ? 'block' : 'none'};">
            <label class="form-label">EX 레벨</label>
            <input type="number" class="input-field" id="fSkExLevel" value="${skill?.exLevel !== undefined ? skill.exLevel : ''}" placeholder="-" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">효과 * <span style="color:var(--color-warning);font-size:11px;">(누락 시 ⚠️ 표시)</span></label>
          <textarea class="textarea-field" id="fSkEffects" rows="4" placeholder="스킬 효과 상세 설명..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(skill?.effects || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">소설 내 설명</label>
          <textarea class="textarea-field" id="fSkDesc" rows="3" placeholder="소설에 표시될 설명 (독자가 읽는 텍스트)..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(skill?.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">작가 메모 <span style="font-size:11px;color:var(--color-text-dim);">(소설에 미표시)</span></label>
          <textarea class="textarea-field" id="fSkAuthor" rows="2" placeholder="설계 의도, 밸런스 참고..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(skill?.authorNotes || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '스킬 편집' : '새 스킬', body, async () => {
      const name = document.getElementById('fSkName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }
      const effects = document.getElementById('fSkEffects')?.value.trim();
      if (!effects) { Utils.toast('효과를 입력하세요 ⚠️', 'error'); return false; }
      const exLevelEl = document.getElementById('fSkExLevel');
      const exLevelVal = exLevelEl?.value.trim();

      const item = {
        ...(skill || {}),
        worldId: wid,
        name,
        grade: document.getElementById('fSkGrade')?.value || 'F',
        type: document.getElementById('fSkType')?.value || '패시브',
        passiveSubtype: document.getElementById('fSkPassiveSub')?.value || '',
        activeSubtype: document.getElementById('fSkActiveSub')?.value || '',
        subType: document.getElementById('fSkSubType')?.value || '',
        attribute: document.getElementById('fSkAttr')?.value || '없음',
        series: document.getElementById('fSkSeries')?.value || '없음',
        manaCost: Number(document.getElementById('fSkMana')?.value) || 0,
        cooldown: document.getElementById('fSkCooldown')?.value.trim() || '',
        exLevel: exLevelVal !== '' ? Number(exLevelVal) : undefined,
        effects,
        description: document.getElementById('fSkDesc')?.value.trim() || '',
        authorNotes: document.getElementById('fSkAuthor')?.value.trim() || '',
        id: skill?.id || DB.genId(),
        createdAt: skill?.createdAt || Date.now(),
      };

      await DB.put('skills', item);
      await AppStore.updateStreak();
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      this._currentId = item.id;
      const updated = await DB.get('skills', item.id);
      if (updated) this._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    // Show/hide EX level field based on grade
    setTimeout(() => {
      const gradeEl = document.getElementById('fSkGrade');
      const exGroup = document.getElementById('exLevelGroup');
      gradeEl?.addEventListener('change', () => {
        if (exGroup) exGroup.style.display = gradeEl.value === 'EX' ? 'block' : 'none';
      });
    }, 60);
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  }
};
