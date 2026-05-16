'use strict';
// items-form.js — form methods for window.Pages.items
Object.assign(window.Pages.items, {
  _openForm: async function(item, wid, container) {
    const isEdit = !!item;
    const self = this;
    const it = item || {};

    const [allSkills, allTowers, allGates] = await Promise.all([
      DB.getAll('skills', wid),
      DB.getAll('towers', wid),
      DB.getAll('gates', wid),
    ]);
    const allSkillsSorted = allSkills.slice().sort((a, b) => (a.name||'').localeCompare(b.name||'', 'ko'));
    const relSkillOpts = ['<option value="">없음</option>',
      ...allSkills.map(sk => `<option value="${Utils.escHtml(sk.id)}" ${it.relatedSkill?.id === sk.id ? 'selected' : ''}>${Utils.escHtml(sk.name)} (${sk.grade || 'F'})</option>`)
    ].join('');

    const isSiegeType = t => t === '공성병기' || t === '수성병기';
    let siegeLinkedSkills = [...(it.siegeData?.linkedSkills || [])];
    const renderSiegeChips = () => siegeLinkedSkills.map(sk => `
      <span class="siege-skill-chip" data-skid="${Utils.escHtml(sk.id)}"
        style="display:inline-flex;align-items:center;gap:4px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.35);border-radius:6px;padding:3px 8px;font-size:12px;">
        ⚔️ ${Utils.escHtml(sk.name||'')}${sk.grade?` (${Utils.escHtml(sk.grade)})`:''}<button class="siege-skill-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:12px;padding:0 2px;">✕</button>
      </span>`).join('');

    const currentOrigins = this._getItemOrigins(it);

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
        <div class="form-group">
          <label class="form-label">이름 *</label>
          <input class="input-field" id="fItName" value="${Utils.escHtml(it.name || '')}" placeholder="아이템 이름" style="width:100%;box-sizing:border-box;" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">등급</label>
            <select class="select-input" id="fItGrade" style="width:100%;">
              ${this._C.grades.map(g => `<option value="${g}" ${(it.grade || 'F') === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">종류</label>
            <select class="select-input" id="fItType" style="width:100%;">
              <option value="">선택 안 함</option>
              ${this._C.itemTypes.map(t => `<option value="${t}" ${(it.type || '') === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="siegeSection" style="${isSiegeType(it.type||'') ? '' : 'display:none;'}border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:12px;background:rgba(239,68,68,0.04);">
          <div style="font-size:12px;color:#f87171;font-weight:700;margin-bottom:8px;">⚔️ 병기 상세 정보</div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">형태</label>
            <input class="input-field" id="fSiegeShape" value="${Utils.escHtml(it.siegeData?.shape||'')}" placeholder="예: 투석기, 성벽 방어포, 대형 쇠뇌..." style="width:100%;box-sizing:border-box;font-size:13px;" />
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">사용 의도</label>
            <textarea class="textarea-field" id="fSiegePurpose" rows="2" placeholder="어떤 목적으로 사용하는가..." style="width:100%;box-sizing:border-box;font-size:13px;">${Utils.escHtml(it.siegeData?.purpose||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">작동 방법</label>
            <textarea class="textarea-field" id="fSiegeMechanism" rows="2" placeholder="어떻게 작동하는가..." style="width:100%;box-sizing:border-box;font-size:13px;">${Utils.escHtml(it.siegeData?.mechanism||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">약점</label>
            <textarea class="textarea-field" id="fSiegeWeakness" rows="2" placeholder="어떤 약점이 있는가..." style="width:100%;box-sizing:border-box;font-size:13px;">${Utils.escHtml(it.siegeData?.weakness||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">연계 스킬</label>
            <div id="siegeSkillChips" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;margin-bottom:6px;">${renderSiegeChips()}</div>
            <div style="position:relative;">
              <input class="input-field" id="siegeSkillSearch" placeholder="스킬 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="siegeSkillResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:130px;overflow-y:auto;top:100%;left:0;"></div>
            </div>
          </div>
        </div>
        ${(allTowers.length > 0 || allGates.length > 0) ? `
        <div class="form-group">
          <label class="form-label">연결된 탑 / 게이트 <span style="font-size:11px;color:var(--color-text-dim);">(복수 선택 가능)</span></label>
          <div style="display:flex;flex-direction:column;gap:2px;max-height:150px;overflow-y:auto;padding:8px;background:var(--color-bg);border:1px solid var(--color-border);border-radius:6px;">
            ${allTowers.length > 0 ? `<div style="font-size:10px;color:var(--color-text-dim);font-weight:700;letter-spacing:0.5px;padding:2px 0 4px;">🗼 탑</div>` : ''}
            ${allTowers.map(t => `
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:4px 6px;border-radius:4px;">
                <input type="checkbox" class="origin-check" data-type="tower" data-id="${Utils.escHtml(t.id)}"
                  ${currentOrigins.some(o => o.type === 'tower' && o.id === t.id) ? 'checked' : ''} />
                <span>${Utils.escHtml(t.name)}</span>
              </label>`).join('')}
            ${allGates.length > 0 ? `<div style="font-size:10px;color:var(--color-text-dim);font-weight:700;letter-spacing:0.5px;padding:4px 0 4px;margin-top:2px;">🌀 게이트</div>` : ''}
            ${allGates.map(g => `
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:4px 6px;border-radius:4px;">
                <input type="checkbox" class="origin-check" data-type="gate" data-id="${Utils.escHtml(g.id)}"
                  ${currentOrigins.some(o => o.type === 'gate' && o.id === g.id) ? 'checked' : ''} />
                <span>${Utils.escHtml(g.name)}</span>
              </label>`).join('')}
          </div>
        </div>` : ''}
        <div class="form-group">
          <label class="form-label">효과 (작가+소설 표시)</label>
          <textarea class="textarea-field" id="fItEffects" rows="3" placeholder="아이템 효과 (스탯 증가, 특수 효과 등)..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(it.effects || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">설명 (소설 표시용)</label>
          <textarea class="textarea-field" id="fItDesc" rows="3" placeholder="소설 내 표시될 설명..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(it.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">작가 메모 <span style="font-size:11px;color:var(--color-text-dim);">(소설에 미표시)</span></label>
          <textarea class="textarea-field" id="fItAuthor" rows="2" placeholder="설계 의도, 등장 시점 등..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(it.authorNotes || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">획득처 (소설 표시용)</label>
          <input class="input-field" id="fItSource" value="${Utils.escHtml(it.source || '')}" placeholder="예: 탑 50층 클리어 보상" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">연관 스킬</label>
          <select class="select-input" id="fItRelSkill" style="width:100%;">${relSkillOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label">이미지</label>
          <div id="fItImgPreview" style="margin-bottom:6px;">
            ${it.image ? `<img src="${it.image}" style="max-width:100px;border-radius:8px;" />` : ''}
          </div>
          <input type="file" id="fItImage" accept="image/*" style="font-size:13px;" />
        </div>
      </div>`;

    Utils.openModal(isEdit ? '아이템 편집' : '새 아이템', body, async () => {
      const name = document.getElementById('fItName')?.value.trim();
      if (!name) { Utils.fieldError('fItName'); return false; }

      let image = it.image || null;
      const fileEl = document.getElementById('fItImage');
      if (fileEl?.files?.length) {
        try { image = await Utils.imageToBase64(fileEl.files[0]); } catch(e) { Utils.toast('이미지 처리 오류', 'error'); }
      }

      const relSkillId = document.getElementById('fItRelSkill')?.value;
      let relatedSkill = null;
      if (relSkillId) {
        const sk = allSkills.find(s => s.id === relSkillId);
        if (sk) relatedSkill = { id: sk.id, name: sk.name, grade: sk.grade || '' };
      }

      const origins = Array.from(
        document.querySelectorAll('#globalModalBody .origin-check:checked')
      ).map(cb => ({ type: cb.dataset.type, id: cb.dataset.id }));

      const itemType = document.getElementById('fItType')?.value || '';
      let siegeData = null;
      if (isSiegeType(itemType)) {
        siegeData = {
          shape: document.getElementById('fSiegeShape')?.value.trim() || '',
          purpose: document.getElementById('fSiegePurpose')?.value.trim() || '',
          mechanism: document.getElementById('fSiegeMechanism')?.value.trim() || '',
          weakness: document.getElementById('fSiegeWeakness')?.value.trim() || '',
          linkedSkills: siegeLinkedSkills,
        };
      }

      const record = {
        ...(it || {}),
        worldId: wid,
        name,
        grade: document.getElementById('fItGrade')?.value || 'F',
        type: itemType,
        origins,
        towerId: null,
        effects: document.getElementById('fItEffects')?.value.trim() || '',
        description: document.getElementById('fItDesc')?.value.trim() || '',
        authorNotes: document.getElementById('fItAuthor')?.value.trim() || '',
        source: document.getElementById('fItSource')?.value.trim() || '',
        relatedSkill,
        siegeData,
        image,
        id: it.id || DB.genId(),
        createdAt: it.createdAt || Date.now(),
      };

      await DB.put('items', record);
      await AppStore.updateStreak();
      await AppStore.recordActivity('items', !isEdit);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      self._currentId = record.id;
      self._novelView = false;
      const updated = await DB.get('items', record.id);
      if (updated) self._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    // Image preview wiring + siege/defense weapon UI
    setTimeout(() => {
      document.getElementById('fItImage')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const b64 = await Utils.imageToBase64(file);
        const prev = document.getElementById('fItImgPreview');
        if (prev) prev.innerHTML = `<img src="${b64}" style="max-width:100px;border-radius:8px;" />`;
      });

      document.getElementById('fItType')?.addEventListener('change', e => {
        const sec = document.getElementById('siegeSection');
        if (sec) sec.style.display = isSiegeType(e.target.value) ? '' : 'none';
      });

      const rebindSiegeChips = () => {
        document.querySelectorAll('#siegeSkillChips .siege-skill-del').forEach(btn => {
          btn.addEventListener('click', () => {
            const chip = btn.closest('.siege-skill-chip');
            const skid = chip?.dataset.skid;
            siegeLinkedSkills = siegeLinkedSkills.filter(s => s.id !== skid);
            chip?.remove();
          });
        });
      };
      rebindSiegeChips();

      const siegeInput = document.getElementById('siegeSkillSearch');
      const siegeResults = document.getElementById('siegeSkillResults');
      if (siegeInput && siegeResults) {
        siegeInput.addEventListener('input', () => {
          const q = siegeInput.value.trim().toLowerCase();
          if (!q) { siegeResults.style.display = 'none'; return; }
          const alreadyIds = new Set(siegeLinkedSkills.map(s => s.id));
          const matches = allSkillsSorted.filter(s => !alreadyIds.has(s.id) && (s.name||'').toLowerCase().includes(q)).slice(0, 10);
          if (!matches.length) { siegeResults.style.display = 'none'; return; }
          siegeResults.style.display = 'block';
          siegeResults.innerHTML = matches.map(s => `
            <div class="siege-sk-row" data-skid="${Utils.escHtml(s.id)}"
              style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">
              ${Utils.escHtml(s.name||'')}${s.grade?`<span style="font-size:11px;color:var(--color-text-dim);margin-left:6px;">${Utils.escHtml(s.grade)}</span>`:''}
            </div>`).join('');
          siegeResults.querySelectorAll('.siege-sk-row').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              const sk = allSkillsSorted.find(s => s.id === row.dataset.skid);
              if (!sk) return;
              siegeLinkedSkills.push({ id: sk.id, name: sk.name, grade: sk.grade || '' });
              siegeInput.value = '';
              siegeResults.style.display = 'none';
              document.getElementById('siegeSkillChips').innerHTML = renderSiegeChips();
              rebindSiegeChips();
            });
          });
        });
        siegeInput.addEventListener('blur', () => setTimeout(() => { siegeResults.style.display = 'none'; }, 150));
      }
    }, 50);
  },

  // ── EXPORT ──────────────────────────────────────────────────────────────────

  _exportText: function(it) {
    const lines = [
      'ㅡ'.repeat(4),
      `ㅣ이름: ${it.name || ''}`,
      `ㅣ등급: ${it.grade || ''}`,
      it.type ? `ㅣ종류: ${it.type}` : null,
      it.effects ? `ㅣ효과:\n${it.effects}` : null,
      it.description ? `ㅣ설명: ${it.description}` : null,
      it.source ? `ㅣ획득처: ${it.source}` : null,
      'ㅡ'.repeat(4),
    ].filter(x => x !== null).join('\n');
    return lines;
  },
});
