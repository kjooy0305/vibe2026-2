'use strict';
// jobs-form.js — form methods for window.Pages.jobs
Object.assign(window.Pages.jobs, {
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

      <div class="form-group" style="border:1px solid rgba(167,139,250,0.3);border-radius:8px;padding:10px 12px;${AppFlags.get('useRegression',true)?'':'display:none;'}">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
          <input type="checkbox" id="fJobRegressable" ${j.isRegressable ? 'checked' : ''} />
          회귀 가능 직업 <span style="font-size:11px;font-weight:400;color:var(--color-text-muted);">(회귀 후에도 유지·재획득 가능)</span>
        </label>
        <div id="regressSection" style="${j.isRegressable ? '' : 'display:none;'}margin-top:10px;display:flex;flex-direction:column;gap:8px;">
          <div class="form-group">
            <label class="form-label">첫 획득 가능 회차</label>
            <input type="number" class="input-field" id="fJobRegressFrom" min="0"
              value="${j.regressFromCycle !== undefined ? j.regressFromCycle : ''}"
              placeholder="예: 2 (2회차부터 획득 가능)" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">회귀 조건 메모</label>
            <input class="input-field" id="fJobRegressNote"
              value="${Utils.escHtml(j.regressNote || '')}"
              placeholder="예: 전생 기억 보유 시, 회귀 전 SS급 도달 필요" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
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

      const isRegressable = document.getElementById('fJobRegressable')?.checked || false;
      const regressFromVal = document.getElementById('fJobRegressFrom')?.value.trim();
      const record = {
        ...(j || {}),
        worldId:          wid,
        name,
        grade:            document.getElementById('fJobGrade')?.value || 'F',
        type:             document.getElementById('fJobType')?.value || '',
        effects:          document.getElementById('fJobEffects')?.value.trim() || '',
        statEffects:      newStatEffects,
        statCustom:       newStatCustom,
        itemLinks,
        skills:           pickedSkills,
        isRegressable,
        regressFromCycle: isRegressable && regressFromVal !== '' ? Number(regressFromVal) : undefined,
        regressNote:      isRegressable ? (document.getElementById('fJobRegressNote')?.value.trim() || '') : '',
        description:      document.getElementById('fJobDesc')?.value.trim() || '',
        authorNotes:      document.getElementById('fJobAuthor')?.value.trim() || '',
        id:               j.id || DB.genId(),
        createdAt:        j.createdAt || Date.now(),
        updatedAt:        Date.now(),
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
      // ── 회귀 여부 토글 ────────────────────────────────────────
      document.getElementById('fJobRegressable')?.addEventListener('change', e => {
        const sec = document.getElementById('regressSection');
        if (sec) sec.style.display = e.target.checked ? '' : 'none';
      });

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
});
