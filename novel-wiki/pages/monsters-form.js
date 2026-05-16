'use strict';
// monsters-form.js — form methods for window.Pages.monsters
Object.assign(window.Pages.monsters, {
  _openSkillPicker: async function(m, wid, container) {
    const allSkills = await DB.getAll('skills', wid);
    if (!allSkills.length) { Utils.toast('스킬 라이브러리가 비어 있습니다', 'error'); return; }

    const currentIds = new Set((m.skills || []).map(s => s.id));
    const allSkillsSorted = allSkills.slice().sort((a, b) => (a.name||'').localeCompare(b.name||'', 'ko'));
    const rows = allSkillsSorted.map(sk => {
      const col = Utils.gradeColor(sk.grade || 'F');
      const searchVal = [sk.name||'', sk.grade||'', sk.series||''].join(' ').toLowerCase();
      return `
        <div class="skill-pick-row" data-search="${Utils.escHtml(searchVal)}">
          <label style="display:flex;align-items:center;gap:10px;padding:8px 4px;cursor:pointer;border-bottom:1px solid var(--color-border);">
            <input type="checkbox" data-skid="${Utils.escHtml(sk.id)}" ${currentIds.has(sk.id) ? 'checked' : ''} style="width:16px;height:16px;flex-shrink:0;" />
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span style="font-weight:600;font-size:13px;">⚡ ${Utils.escHtml(sk.name || '')}</span>
                ${sk.grade ? `<span style="font-size:11px;padding:1px 5px;border-radius:3px;background:${col}22;color:${col};border:1px solid ${col}55;">${Utils.escHtml(sk.grade)}</span>` : ''}
                ${sk.series ? `<span style="font-size:11px;color:var(--color-text-dim);">${Utils.escHtml(sk.series)}</span>` : ''}
              </div>
              ${sk.cooldown ? `<div style="font-size:11px;color:var(--color-text-muted);">쿨타임: ${Utils.escHtml(sk.cooldown)}</div>` : ''}
            </div>
          </label>
        </div>`;
    }).join('');

    Utils.openModal('스킬 선택', `
      <div style="margin-bottom:8px;">
        <input class="input-field" id="skillPickSearch" placeholder="스킬 이름, 등급, 계열 검색..." autocomplete="off"
          style="width:100%;box-sizing:border-box;" />
      </div>
      <div id="skillPickList">${rows}</div>`, async () => {
      const selected = [...document.querySelectorAll('#skillPickList input[data-skid]:checked')]
        .map(cb => {
          const sk = allSkillsSorted.find(s => s.id === cb.dataset.skid);
          return sk ? { id: sk.id, name: sk.name, grade: sk.grade || '', effects: sk.effects || '', cooldown: sk.cooldown || '' } : null;
        }).filter(Boolean);
      m.skills = selected;
      m.updatedAt = Date.now();
      await DB.put('monsters', m);
      Utils.toast('스킬 저장됨', 'success');
      this._renderDetail(container, m, wid);
      return true;
    }, '저장');

    setTimeout(() => {
      document.getElementById('skillPickSearch')?.addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        document.querySelectorAll('#skillPickList .skill-pick-row').forEach(row => {
          row.style.display = !q || (row.dataset.search || '').includes(q) ? '' : 'none';
        });
      });
    }, 50);
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
      <div style="display:flex;flex-direction:column;gap:10px;padding-right:4px;">
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
      if (!name) { Utils.fieldError('fMName'); return false; }

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
});
