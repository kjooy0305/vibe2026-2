'use strict';
// tower-subfloor-form.js — _openSubFloorForm for window.Pages.tower
Object.assign(window.Pages.tower, {
  _openSubFloorForm: async function(sub, parentFloor, tower, wid, container, world) {
    const isEdit = !!sub;
    const s = sub || {};
    const nextIdx = (parentFloor.subFloors || []).length + 1;
    const defaultName = s.name || `${parentFloor.floorNum}-${nextIdx}층`;
    let newSubImage = s.image || null;

    const allMonsters = await DB.getAll('monsters', wid);

    const ta = (id, label, val, rows, placeholder) => `
      <div class="form-group">
        <label class="form-label">${label}</label>
        <textarea class="input-field" id="${id}" rows="${rows || 3}" placeholder="${placeholder || ''}"
          style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(val || '')}</textarea>
      </div>`;

    const imgHtml = newSubImage
      ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
           <img src="${newSubImage}" style="max-width:100px;max-height:80px;border-radius:8px;object-fit:cover;" />
           <button type="button" id="btnDeleteSubImg" class="btn btn-ghost btn-sm"
             style="color:var(--color-danger);font-size:11px;">🗑 사진 삭제</button>
         </div>`
      : '';

    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;padding-right:4px;overflow-x:hidden;min-width:0;">
        <div class="form-group">
          <label class="form-label">서브층 이름</label>
          <input class="input-field" id="fSubName" value="${Utils.escHtml(s.name || defaultName)}"
            placeholder="예: 1-1층" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">테마</label>
          <input class="input-field" id="fSubTheme" value="${Utils.escHtml(s.theme || '')}"
            placeholder="예: 히든 보스 구간" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <label class="form-label" style="margin:0;">적 (줄바꿈으로 구분)</label>
            ${allMonsters.length > 0
              ? `<button type="button" class="btn btn-ghost btn-sm" id="btnPickSubMonsters" style="font-size:11px;">👾 몬스터에서 추가</button>`
              : ''}
          </div>
          <textarea class="input-field" id="fSubEnemies" rows="2"
            placeholder="예: 보스 슬라임(S급) - 1명"
            style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(s.enemies || '')}</textarea>
        </div>
        ${ta('fSubFeatures', '특징', s.features, 3, '특징 설명')}
        ${ta('fSubQuests', '퀘스트', s.quests, 2, '퀘스트 조건')}
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
            <input type="checkbox" id="fSubHidden" ${s.hidden ? 'checked' : ''} />
            히든 서브층
          </label>
        </div>
        <div class="form-group">
          <label class="form-label">이미지</label>
          <div id="subImgPreview">${imgHtml}</div>
          <input type="file" id="subFloorImageFile" accept="image/*" style="font-size:13px;" />
        </div>
      </div>`;

    Utils.openModal(isEdit ? '서브층 편집' : '서브층 추가', body, async () => {
      const imgFile = document.getElementById('subFloorImageFile')?.files?.[0];
      if (imgFile) newSubImage = await Utils.imageToBase64(imgFile);

      const subData = {
        subId:    s.subId || DB.genId(),
        name:     document.getElementById('fSubName')?.value.trim()     || defaultName,
        theme:    document.getElementById('fSubTheme')?.value.trim()    || '',
        enemies:  document.getElementById('fSubEnemies')?.value.trim()  || '',
        features: document.getElementById('fSubFeatures')?.value.trim() || '',
        quests:   document.getElementById('fSubQuests')?.value.trim()   || '',
        hidden:   document.getElementById('fSubHidden')?.checked        || false,
        image:    newSubImage,
      };

      const subFloors = (parentFloor.subFloors || []).filter(sf => sf.subId !== subData.subId);
      subFloors.push(subData);
      parentFloor.subFloors = subFloors;

      await DB.put('towers', tower);
      Utils.toast(isEdit ? '서브층 저장됨' : '서브층 추가됨', 'success');
      this._expandedFloor = parentFloor.floorNum;

      const all = await DB.getAll('towers', wid);
      const t = all.find(x => x.id === tower.id);
      if (t) this._renderTower(container, t, wid, world);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      // Sub-floor image upload
      document.getElementById('subFloorImageFile')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        newSubImage = await Utils.imageToBase64(file);
        const prev = document.getElementById('subImgPreview');
        if (prev) prev.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <img src="${newSubImage}" style="max-width:100px;max-height:80px;border-radius:8px;object-fit:cover;" />
            <button type="button" id="btnDeleteSubImg" class="btn btn-ghost btn-sm"
              style="color:var(--color-danger);font-size:11px;">🗑 사진 삭제</button>
          </div>`;
        document.getElementById('btnDeleteSubImg')?.addEventListener('click', () => {
          newSubImage = null;
          const p = document.getElementById('subImgPreview');
          if (p) p.innerHTML = '';
        });
      });

      // Sub-floor image delete (existing)
      document.getElementById('btnDeleteSubImg')?.addEventListener('click', () => {
        newSubImage = null;
        const prev = document.getElementById('subImgPreview');
        if (prev) prev.innerHTML = '';
      });

      // Sub-floor monster picker
      document.getElementById('btnPickSubMonsters')?.addEventListener('click', () => {
        this._openSubMonsterPicker(allMonsters);
      });
    }, 50);
  },

  // Monster picker for sub-floor (writes to fSubEnemies)
  _openSubMonsterPicker: function(monsters) {
    const body = `
      <div style="display:flex;flex-direction:column;gap:8px;max-height:60vh;">
        <input class="input-field" id="subMonPickSearch" placeholder="몬스터 검색..."
          style="width:100%;box-sizing:border-box;" />
        <div id="subMonPickList" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:4px;-webkit-overflow-scrolling:touch;">
          ${monsters.map((m, i) => `
            <div class="sub-mon-row" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--color-surface2);border-radius:8px;border:1px solid var(--color-border);"
              data-name="${Utils.escHtml(m.name || '')}" data-grade="${Utils.escHtml(m.grade || '')}">
              <input type="checkbox" class="sub-mon-cb" id="smpc_${i}"
                data-name="${Utils.escHtml(m.name || '')}" data-grade="${Utils.escHtml(m.grade || '')}" />
              <label for="smpc_${i}" style="flex:1;min-width:0;cursor:pointer;">
                <div style="font-size:13px;font-weight:600;">${Utils.escHtml(m.name || '이름 없음')}</div>
                ${m.grade ? `<div style="font-size:11px;color:var(--color-text-muted);">등급: ${Utils.escHtml(m.grade)}</div>` : ''}
              </label>
              <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">
                <input type="number" class="sub-mon-count" min="1" value="1"
                  style="width:48px;padding:3px 5px;border-radius:5px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font-size:12px;text-align:center;" />
                <span style="font-size:11px;color:var(--color-text-muted);">명</span>
              </div>
            </div>`).join('')}
        </div>
      </div>`;

    Utils.openModal('몬스터 추가', body, () => {
      const checked = document.querySelectorAll('#globalModalBody .sub-mon-cb:checked');
      if (checked.length === 0) { Utils.toast('몬스터를 선택하세요', 'error'); return false; }
      const ta = document.getElementById('fSubEnemies');
      if (!ta) return false;
      const toAdd = Array.from(checked).map(cb => {
        const name = cb.dataset.name;
        const grade = cb.dataset.grade;
        const row = cb.closest('.sub-mon-row');
        const count = parseInt(row?.querySelector('.sub-mon-count')?.value || '1', 10) || 1;
        return grade ? `${name}(${grade}급) - ${count}명` : `${name} - ${count}명`;
      }).join('\n');
      const existing = ta.value.trim();
      ta.value = existing ? existing + '\n' + toAdd : toAdd;
      return true;
    }, '추가');

    setTimeout(() => {
      document.getElementById('subMonPickSearch')?.addEventListener('input', e => {
        const q = e.target.value;
        document.querySelectorAll('#globalModalBody .sub-mon-row').forEach(row => {
          const txt = [(row.dataset.name||''), (row.dataset.grade||'')].join(' ');
          row.style.display = Utils.matchesQuery(txt, q) ? '' : 'none';
        });
      });
      document.querySelectorAll('#globalModalBody .sub-mon-count').forEach(inp => {
        inp.addEventListener('click', e => e.stopPropagation());
      });
    }, 50);
  },
});
