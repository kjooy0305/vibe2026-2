'use strict';
// constellations-form.js — form methods for window.Pages.constellations
Object.assign(window.Pages.constellations, {
  _openForm: async function(constellation, wid, container) {
    const isEdit = !!constellation;
    const c = constellation || {};
    const self = this;

    const [charsRaw, skillsRaw] = await Promise.all([
      DB.getAll('characters', wid),
      DB.getAll('skills', wid),
    ]);

    // Sort chars: main first, sub second, rest alphabetical
    const chars = charsRaw.slice().sort((a, b) => {
      const imp = { main: 0, sub: 1, '': 2 };
      const ia = imp[a.importance || ''] ?? 2;
      const ib = imp[b.importance || ''] ?? 2;
      if (ia !== ib) return ia - ib;
      return (a.name || '').localeCompare(b.name || '', 'ko');
    });
    const skills = skillsRaw.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));

    let selectedIcon = c.icon || '⭐';
    const iconPool = (await DB.getSetting('iconList_const', null)) || this._C?.iconPresets || [];
    const allSeries = this._C.constellationSeries;
    const allTiers = this._C.constellationTiers;

    // Contractor state (chip-based picker)
    let contractorIds = new Set(c.contractors || []);
    let provisionalIds = new Set(c.provisionalContractors || []);
    let linkedSkillIds = new Set(c.linkedSkillIds || []);

    const seriesOpts = ['', ...allSeries, '__custom__'].map(s => {
      if (s === '__custom__') return `<option value="__custom__">기타 (직접 입력)...</option>`;
      return `<option value="${Utils.escHtml(s)}" ${(c.series || '') === s ? 'selected' : ''}>${s || '선택 안 함'}</option>`;
    }).join('');
    const tierOpts = ['', ...allTiers, '__custom__'].map(t => {
      if (t === '__custom__') return `<option value="__custom__">기타 (직접 입력)...</option>`;
      return `<option value="${Utils.escHtml(t)}" ${(c.tier || '') === t ? 'selected' : ''}>${t || '선택 안 함'}</option>`;
    }).join('');

    const renderCharChips = (ids, type) => {
      const set = type === 'contractor' ? contractorIds : provisionalIds;
      return [...set].map(id => {
        const ch = chars.find(x => x.id === id);
        if (!ch) return '';
        return `<span class="char-chip" data-type="${type}" data-chid="${Utils.escHtml(id)}"
          style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:var(--color-surface3,#2a2a3a);border:1px solid var(--color-border);font-size:12px;cursor:pointer;"
          title="클릭하여 제거">
          ${ch.importance === 'main' ? '<span style="color:#fbbf24;">★</span>' : ''}
          ${Utils.escHtml(ch.name)} ✕
        </span>`;
      }).join('');
    };

    const renderSkillChips = () => [...linkedSkillIds].map(id => {
      const s = skills.find(x => x.id === id);
      if (!s) return '';
      return `<span class="skill-chip" data-sid="${Utils.escHtml(id)}"
        style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:rgba(0,188,212,0.1);border:1px solid rgba(0,188,212,0.3);font-size:12px;cursor:pointer;"
        title="클릭하여 제거">
        ⚡ ${Utils.escHtml(s.name)} ✕
      </span>`;
    }).join('');

    const charSearchSection = (typeKey, label, color) => {
      const currentSet = typeKey === 'contractor' ? contractorIds : provisionalIds;
      return `
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;color:${color};font-weight:600;margin-bottom:5px;">${label}</div>
          <div class="char-chip-list" id="chipList_${typeKey}" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;margin-bottom:5px;">
            ${[...currentSet].map(id => {
              const ch = chars.find(x => x.id === id);
              if (!ch) return '';
              return `<span class="char-chip" data-type="${typeKey}" data-chid="${Utils.escHtml(id)}"
                style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:var(--color-surface3,#2a2a3a);border:1px solid var(--color-border);font-size:12px;cursor:pointer;"
                title="클릭하여 제거">
                ${ch.importance === 'main' ? '<span style="color:#fbbf24;">★</span>' : ''}
                ${Utils.escHtml(ch.name)} ✕
              </span>`;
            }).join('')}
          </div>
          <div style="position:relative;">
            <input class="input-field const-char-search" data-type="${typeKey}" placeholder="이름 검색하여 추가..." style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div class="char-search-result" data-type="${typeKey}"
              style="display:none;position:absolute;top:100%;left:0;right:0;z-index:100;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:140px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.3);"></div>
          </div>
        </div>`;
    };

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
        <!-- 이름 -->
        <div class="form-group">
          <label class="form-label">이름 *</label>
          <input class="input-field" id="fCsName" value="${Utils.escHtml(c.name || '')}" placeholder="성좌 이름" style="width:100%;box-sizing:border-box;" />
        </div>

        <!-- 아이콘 -->
        <div class="form-group">
          <label class="form-label">아이콘</label>
          <div style="font-size:30px;text-align:center;margin-bottom:6px;" id="constIconPreview">${Utils.escHtml(selectedIcon)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;" id="constIconPicker">
            ${iconPool.map(ic => `<button type="button" class="icon-pick-btn" data-icon="${ic}" style="font-size:20px;padding:5px;border-radius:7px;border:2px solid ${ic===selectedIcon?'var(--color-primary)':'transparent'};background:var(--color-bg);cursor:pointer;line-height:1.2;">${ic}</button>`).join('')}
          </div>
        </div>

        <!-- 계열/등급 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label" style="margin:0;font-size:13px;font-weight:600;">계열</label>
            <select class="select-input" id="fCsSeries" style="width:100%;margin-top:4px;">${seriesOpts}</select>
            <input class="input-field" id="fCsSeriesCustom" placeholder="직접 입력..." style="width:100%;box-sizing:border-box;margin-top:4px;display:none;" />
          </div>
          <div class="form-group">
            <label class="form-label" style="margin:0;font-size:13px;font-weight:600;">등급</label>
            <select class="select-input" id="fCsTier" style="width:100%;margin-top:4px;">${tierOpts}</select>
            <input class="input-field" id="fCsTierCustom" placeholder="직접 입력..." style="width:100%;box-sizing:border-box;margin-top:4px;display:none;" />
          </div>
        </div>

        <!-- 위계/담당 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">위계</label>
            <input class="input-field" id="fCsHierarchy" value="${Utils.escHtml(c.hierarchy !== undefined ? String(c.hierarchy) : '')}" placeholder="예: 1위" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">관할 영역</label>
            <input class="input-field" id="fCsDomain" value="${Utils.escHtml(c.domain || '')}" placeholder="예: 불, 마나" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>

        <!-- 성운/은하 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">🌌 은하</label>
            <input class="input-field" id="fCsGalaxy" value="${Utils.escHtml(c.galaxy || '')}" placeholder="소속 은하명" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">🌟 성단</label>
            <input class="input-field" id="fCsCluster" value="${Utils.escHtml(c.cluster || c.nebula || '')}" placeholder="소속 성단명" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">외형</label>
          <textarea class="textarea-field" id="fCsAppearance" rows="2" style="width:100%;box-sizing:border-box;">${Utils.escHtml(c.appearance || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">특징</label>
          <textarea class="textarea-field" id="fCsFeatures" rows="3" style="width:100%;box-sizing:border-box;">${Utils.escHtml(c.features || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">능력</label>
          <textarea class="textarea-field" id="fCsAbilities" rows="3" style="width:100%;box-sizing:border-box;">${Utils.escHtml(c.abilities || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">약점</label>
          <textarea class="textarea-field" id="fCsWeaknesses" rows="2" style="width:100%;box-sizing:border-box;">${Utils.escHtml(c.weaknesses || '')}</textarea>
        </div>

        <!-- 연계 스킬 -->
        ${skills.length > 0 ? `
        <div class="form-group">
          <label class="form-label">연계 스킬</label>
          <div id="skillChipList" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;margin-bottom:5px;">${renderSkillChips()}</div>
          <div style="position:relative;">
            <input id="constSkillSearch" class="input-field" placeholder="스킬 이름 검색하여 추가..." style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="skillSearchResult" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:100;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:140px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.3);"></div>
          </div>
        </div>` : ''}

        <!-- 계약자 (이름 검색 방식) -->
        ${chars.length > 0 ? `
        <div class="form-group">
          <label class="form-label">계약자 / 가계약자</label>
          <div style="font-size:11px;color:var(--color-text-dim);margin-bottom:6px;">이름을 입력하여 캐릭터 검색 후 추가. ★ = 주요 캐릭터</div>
          ${charSearchSection('contractor', '계약자', '#00bcd4')}
          ${charSearchSection('provisional', '가계약자', '#f97316')}
        </div>` : ''}

        <div class="form-group">
          <label class="form-label">작가 메모 <span style="font-size:11px;color:var(--color-text-dim);">(소설에 미표시)</span></label>
          <textarea class="textarea-field" id="fCsAuthor" rows="2" style="width:100%;box-sizing:border-box;">${Utils.escHtml(c.authorNotes || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '성좌 편집' : '새 성좌', body, async () => {
      const name = document.getElementById('fCsName')?.value.trim();
      if (!name) { Utils.fieldError('fCsName'); return false; }

      let series = document.getElementById('fCsSeries')?.value || '';
      if (series === '__custom__') {
        series = document.getElementById('fCsSeriesCustom')?.value.trim() || '';
      }
      let tier = document.getElementById('fCsTier')?.value || '';
      if (tier === '__custom__') {
        tier = document.getElementById('fCsTierCustom')?.value.trim() || '';
      }

      const record = {
        ...(c || {}),
        worldId: wid,
        name,
        icon: selectedIcon,
        series,
        tier,
        hierarchy: document.getElementById('fCsHierarchy')?.value.trim() || '',
        domain: document.getElementById('fCsDomain')?.value.trim() || '',
        galaxy: document.getElementById('fCsGalaxy')?.value.trim() || '',
        cluster: document.getElementById('fCsCluster')?.value.trim() || '',
        appearance: document.getElementById('fCsAppearance')?.value.trim() || '',
        features: document.getElementById('fCsFeatures')?.value.trim() || '',
        abilities: document.getElementById('fCsAbilities')?.value.trim() || '',
        weaknesses: document.getElementById('fCsWeaknesses')?.value.trim() || '',
        contractors: [...contractorIds],
        provisionalContractors: [...provisionalIds],
        linkedSkillIds: [...linkedSkillIds],
        authorNotes: document.getElementById('fCsAuthor')?.value.trim() || '',
        id: c.id || DB.genId(),
        createdAt: c.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await DB.put('constellations', record);
      await AppStore.updateStreak();
      await AppStore.recordActivity('constellations', !isEdit);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      self._currentId = record.id;
      const updated = await DB.get('constellations', record.id);
      if (updated) self._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    // ── Post-render wiring ─────────────────────────────────────
    setTimeout(() => {
      // Icon picker
      const constPicker = document.getElementById('constIconPicker');
      const constPreview = document.getElementById('constIconPreview');
      constPicker?.querySelectorAll('.icon-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedIcon = btn.dataset.icon;
          constPicker.querySelectorAll('.icon-pick-btn').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = 'var(--color-primary)';
          if (constPreview) constPreview.textContent = selectedIcon;
        });
      });

      // Series/tier custom select toggle
      document.getElementById('fCsSeries')?.addEventListener('change', function() {
        const el = document.getElementById('fCsSeriesCustom');
        if (el) el.style.display = this.value === '__custom__' ? 'block' : 'none';
      });
      document.getElementById('fCsTier')?.addEventListener('change', function() {
        const el = document.getElementById('fCsTierCustom');
        if (el) el.style.display = this.value === '__custom__' ? 'block' : 'none';
      });

      // Contractor chip removal
      document.getElementById('globalModalBody')?.addEventListener('click', e => {
        const chip = e.target.closest('.char-chip');
        if (chip) {
          const type = chip.dataset.type;
          const set = type === 'contractor' ? contractorIds : provisionalIds;
          set.delete(chip.dataset.chid);
          const listEl = document.getElementById('chipList_' + type);
          if (listEl) chip.remove();
        }
        const skillChip = e.target.closest('.skill-chip');
        if (skillChip) {
          linkedSkillIds.delete(skillChip.dataset.sid);
          skillChip.remove();
        }
      });

      // Character search inputs
      document.querySelectorAll('#globalModalBody .const-char-search').forEach(input => {
        const type = input.dataset.type;
        const resultEl = input.parentElement.querySelector('.char-search-result');
        input.addEventListener('input', () => {
          const q = input.value.toLowerCase().trim();
          if (!q) { resultEl.style.display = 'none'; return; }
          const set = type === 'contractor' ? contractorIds : provisionalIds;
          const matches = chars.filter(ch => (ch.name || '').toLowerCase().includes(q) && !set.has(ch.id)).slice(0, 8);
          if (!matches.length) { resultEl.style.display = 'none'; return; }
          resultEl.style.display = 'block';
          resultEl.innerHTML = matches.map(ch => `
            <div class="char-search-row" data-chid="${Utils.escHtml(ch.id)}" data-type="${type}"
              style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">
              ${ch.importance === 'main' ? '<span style="color:#fbbf24;">★</span> ' : ''}${Utils.escHtml(ch.name)}
              <span style="color:var(--color-text-muted);font-size:11px;"> Lv.${ch.level || 0}</span>
            </div>`).join('');
          resultEl.querySelectorAll('.char-search-row').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              const set2 = type === 'contractor' ? contractorIds : provisionalIds;
              set2.add(row.dataset.chid);
              const ch = chars.find(x => x.id === row.dataset.chid);
              const chipListEl = document.getElementById('chipList_' + type);
              if (chipListEl && ch) {
                const span = document.createElement('span');
                span.className = 'char-chip';
                span.dataset.type = type;
                span.dataset.chid = row.dataset.chid;
                span.title = '클릭하여 제거';
                span.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:var(--color-surface3,#2a2a3a);border:1px solid var(--color-border);font-size:12px;cursor:pointer;';
                span.innerHTML = `${ch.importance === 'main' ? '<span style="color:#fbbf24;">★</span>' : ''}${Utils.escHtml(ch.name)} ✕`;
                chipListEl.appendChild(span);
              }
              input.value = '';
              resultEl.style.display = 'none';
            });
          });
        });
        input.addEventListener('blur', () => { setTimeout(() => { resultEl.style.display = 'none'; }, 200); });
      });

      // Skill search
      const skillSearchEl = document.getElementById('constSkillSearch');
      const skillResultEl = document.getElementById('skillSearchResult');
      skillSearchEl?.addEventListener('input', () => {
        const q = skillSearchEl.value.toLowerCase().trim();
        if (!q) { skillResultEl.style.display = 'none'; return; }
        const matches = skills.filter(s => (s.name || '').toLowerCase().includes(q) && !linkedSkillIds.has(s.id)).slice(0, 8);
        if (!matches.length) { skillResultEl.style.display = 'none'; return; }
        skillResultEl.style.display = 'block';
        skillResultEl.innerHTML = matches.map(s => `
          <div class="skill-search-row" data-sid="${Utils.escHtml(s.id)}"
            style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">
            ⚡ ${Utils.escHtml(s.name)}${s.grade ? ` <span style="color:var(--color-text-muted);font-size:11px;">(${s.grade})</span>` : ''}
          </div>`).join('');
        skillResultEl.querySelectorAll('.skill-search-row').forEach(row => {
          row.addEventListener('mousedown', e => {
            e.preventDefault();
            linkedSkillIds.add(row.dataset.sid);
            const sk = skills.find(x => x.id === row.dataset.sid);
            const chipListEl = document.getElementById('skillChipList');
            if (chipListEl && sk) {
              const span = document.createElement('span');
              span.className = 'skill-chip';
              span.dataset.sid = row.dataset.sid;
              span.title = '클릭하여 제거';
              span.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:rgba(0,188,212,0.1);border:1px solid rgba(0,188,212,0.3);font-size:12px;cursor:pointer;';
              span.textContent = `⚡ ${sk.name} ✕`;
              chipListEl.appendChild(span);
            }
            skillSearchEl.value = '';
            skillResultEl.style.display = 'none';
          });
        });
      });
      skillSearchEl?.addEventListener('blur', () => { setTimeout(() => { if (skillResultEl) skillResultEl.style.display = 'none'; }, 200); });

    }, 50);
  },
});
