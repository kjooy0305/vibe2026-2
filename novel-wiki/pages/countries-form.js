'use strict';
// countries-form.js — form methods for window.Pages.countries
Object.assign(window.Pages.countries, {
  _openCityForm: function(container, country, city, wid, allChars, allCompanies, cityLabel) {
    cityLabel = cityLabel || '도시';
    const isEdit = !!city;
    const c = city || {};
    const self = this;

    let charIds = [...(c.charIds || [])];
    let companyIds = [...(c.companyIds || [])];

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
        <div class="form-group">
          <label class="form-label">${Utils.escHtml(cityLabel)} 이름 (필수)</label>
          <input class="input-field" id="fCityName" value="${Utils.escHtml(c.name || '')}" placeholder="${Utils.escHtml(cityLabel)} 이름" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">💰 재정 상태</label>
          <textarea class="textarea-field" id="fCityFinance" rows="2" placeholder="예: 무역 중심지, 재정 적자, 농업 기반..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(c.finance || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">🏛️ 주요 건축물</label>
          <textarea class="textarea-field" id="fCityBuildings" rows="3" placeholder="예: 왕궁, 중앙 시장, 마법 탑..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(c.buildings || '')}</textarea>
        </div>
        <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
          <label class="form-label" style="display:block;margin-bottom:6px;">👤 주요 인물 연결</label>
          <div id="cityCharChips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:24px;margin-bottom:8px;"></div>
          ${allChars.length ? `<div style="position:relative;">
            <input class="input-field" id="cityCharSearch" placeholder="캐릭터 이름으로 검색..." style="width:100%;box-sizing:border-box;font-size:12px;"/>
            <div id="cityCharResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:140px;overflow-y:auto;"></div>
          </div>` : `<div style="font-size:12px;color:var(--color-text-muted);">등록된 캐릭터가 없습니다</div>`}
        </div>
        <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
          <label class="form-label" style="display:block;margin-bottom:6px;">🏢 주요 기업 연결</label>
          <div id="cityCompChips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:24px;margin-bottom:8px;"></div>
          ${allCompanies.length ? `<div style="position:relative;">
            <input class="input-field" id="cityCompSearch" placeholder="기업 이름으로 검색..." style="width:100%;box-sizing:border-box;font-size:12px;"/>
            <div id="cityCompResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:140px;overflow-y:auto;"></div>
          </div>` : `<div style="font-size:12px;color:var(--color-text-muted);">등록된 기업이 없습니다</div>`}
        </div>
        <div class="form-group">
          <label class="form-label">📝 메모</label>
          <textarea class="textarea-field" id="fCityNotes" rows="2" placeholder="기타 메모..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(c.notes || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? `${cityLabel} 편집` : `${cityLabel} 추가`, body, async () => {
      const name = document.getElementById('fCityName')?.value.trim();
      if (!name) { Utils.fieldError('fCityName'); return false; }
      const cityRecord = {
        ...(c || {}),
        id: c.id || DB.genId(),
        name,
        finance:   document.getElementById('fCityFinance')?.value.trim() || '',
        buildings: document.getElementById('fCityBuildings')?.value.trim() || '',
        charIds,
        companyIds,
        notes: document.getElementById('fCityNotes')?.value.trim() || '',
      };
      const existingCities = country.cities || [];
      const updatedCities = isEdit
        ? existingCities.map(x => x.id === cityRecord.id ? cityRecord : x)
        : [...existingCities, cityRecord];
      const updatedCountry = { ...country, cities: updatedCities };
      await DB.put('countries', updatedCountry);
      Utils.toast(isEdit ? '저장됨' : '도시 추가됨', 'success');
      const all2 = await DB.getAll('countries', wid);
      const fresh = all2.find(co => co.id === country.id);
      if (fresh) self._renderDetail(container, fresh, wid, all2);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      Utils.autoResizeTextareas(document.getElementById('globalModalBody'));

      // Char chips
      const renderCharChips = () => {
        const el = document.getElementById('cityCharChips'); if (!el) return;
        el.innerHTML = charIds.map((id, idx) => {
          const ch = allChars.find(x => x.id === id); if (!ch) return '';
          return `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);padding:2px 8px;border-radius:12px;font-size:12px;">
            👤 ${Utils.escHtml(ch.name||'')}
            <span class="char-chip-del" data-idx="${idx}" style="cursor:pointer;color:var(--color-danger);">✕</span>
          </span>`;
        }).filter(Boolean).join('');
        el.querySelectorAll('.char-chip-del').forEach(btn => {
          btn.addEventListener('click', () => { charIds.splice(Number(btn.dataset.idx), 1); renderCharChips(); });
        });
      };
      renderCharChips();

      const charIn = document.getElementById('cityCharSearch');
      const charRs = document.getElementById('cityCharResults');
      if (charIn && charRs) {
        charIn.addEventListener('input', () => {
          const q = charIn.value.trim().toLowerCase();
          if (!q) { charRs.style.display = 'none'; return; }
          const hits = allChars.filter(c => !charIds.includes(c.id) && (c.name||'').toLowerCase().includes(q)).slice(0, 8);
          if (!hits.length) { charRs.style.display = 'none'; return; }
          charRs.style.display = 'block';
          charRs.innerHTML = hits.map(c => `<div class="char-result" data-cid="${Utils.escHtml(c.id)}" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">👤 ${Utils.escHtml(c.name||'')}</div>`).join('');
          charRs.querySelectorAll('.char-result').forEach(row => {
            row.addEventListener('mousedown', e => { e.preventDefault(); charIds.push(row.dataset.cid); charIn.value = ''; charRs.style.display = 'none'; renderCharChips(); });
          });
        });
        charIn.addEventListener('blur', () => setTimeout(() => { charRs.style.display = 'none'; }, 150));
      }

      // Company chips
      const renderCompChips = () => {
        const el = document.getElementById('cityCompChips'); if (!el) return;
        el.innerHTML = companyIds.map((id, idx) => {
          const co = allCompanies.find(x => x.id === id); if (!co) return '';
          return `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);padding:2px 8px;border-radius:12px;font-size:12px;">
            🏢 ${Utils.escHtml(co.name||'')}
            <span class="comp-chip-del" data-idx="${idx}" style="cursor:pointer;color:var(--color-danger);">✕</span>
          </span>`;
        }).filter(Boolean).join('');
        el.querySelectorAll('.comp-chip-del').forEach(btn => {
          btn.addEventListener('click', () => { companyIds.splice(Number(btn.dataset.idx), 1); renderCompChips(); });
        });
      };
      renderCompChips();

      const compIn = document.getElementById('cityCompSearch');
      const compRs = document.getElementById('cityCompResults');
      if (compIn && compRs) {
        compIn.addEventListener('input', () => {
          const q = compIn.value.trim().toLowerCase();
          if (!q) { compRs.style.display = 'none'; return; }
          const hits = allCompanies.filter(c => !companyIds.includes(c.id) && (c.name||'').toLowerCase().includes(q)).slice(0, 8);
          if (!hits.length) { compRs.style.display = 'none'; return; }
          compRs.style.display = 'block';
          compRs.innerHTML = hits.map(c => `<div class="comp-result" data-coid="${Utils.escHtml(c.id)}" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">🏢 ${Utils.escHtml(c.name||'')}</div>`).join('');
          compRs.querySelectorAll('.comp-result').forEach(row => {
            row.addEventListener('mousedown', e => { e.preventDefault(); companyIds.push(row.dataset.coid); compIn.value = ''; compRs.style.display = 'none'; renderCompChips(); });
          });
        });
        compIn.addEventListener('blur', () => setTimeout(() => { compRs.style.display = 'none'; }, 150));
      }
    }, 60);
  },

  // ── COUNTRY FORM ──────────────────────────────────────────────────────────
  _openForm: async function(container, item, wid, all) {
    const self = this;
    const isEdit = !!item;
    const currentIcon = item?.icon || '🌍';
    const REL_TYPES = ['동맹', '우호', '중립', '교역', '경쟁', '적대', '종속', '보호국', '전쟁', '기타'];
    let formRelations = (item?.relationRefs || []).map(r => ({
      id: r.id || DB.genId(), countryId: r.countryId || '',
      countryName: r.countryName || '', type: r.type || '', desc: r.desc || '',
    }));

    const [iconPool, C] = await Promise.all([
      DB.getSetting('iconList_country', null),
      AppConstants.load(),
    ]);
    const icons = iconPool || this.ICONS;

    const govOpts = (C.govTypes || []).map(v =>
      `<option value="${Utils.escHtml(v)}" ${item?.govType === v ? 'selected' : ''}>${Utils.escHtml(v)}</option>`).join('');
    const econOpts = (C.econTypes || []).map(v =>
      `<option value="${Utils.escHtml(v)}" ${item?.econType === v ? 'selected' : ''}>${Utils.escHtml(v)}</option>`).join('');
    const milOpts = (C.militaryLevels || []).map(v =>
      `<option value="${Utils.escHtml(v)}" ${item?.militaryLevel === v ? 'selected' : ''}>${Utils.escHtml(v)}</option>`).join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
        <!-- 아이콘 -->
        <div>
          <label class="form-label">아이콘</label>
          <div id="iconDisplay" style="font-size:36px;text-align:center;margin-bottom:8px;">${currentIcon}</div>
          <div id="iconGrid" style="display:flex;flex-wrap:wrap;gap:6px;">
            ${icons.map(ic => `<button type="button" class="icon-pick-btn" data-icon="${ic}" style="font-size:22px;padding:5px;border-radius:8px;border:2px solid ${ic===currentIcon?'var(--color-primary)':'transparent'};background:var(--color-bg);cursor:pointer;line-height:1.2;">${ic}</button>`).join('')}
          </div>
        </div>
        <!-- 기본 정보 -->
        <div>
          <label class="form-label">국가명 (필수)</label>
          <input class="input-field" id="fName" value="${Utils.escHtml(item?.name||'')}" placeholder="국가명을 입력하세요" style="width:100%;box-sizing:border-box;"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label class="form-label">정치체계</label>
            <select class="select-input" id="fGovType" style="width:100%;"><option value="">선택</option>${govOpts}</select>
          </div>
          <div>
            <label class="form-label">경제체계</label>
            <select class="select-input" id="fEconType" style="width:100%;"><option value="">선택</option>${econOpts}</select>
          </div>
          <div>
            <label class="form-label">군사력</label>
            <select class="select-input" id="fMilitary" style="width:100%;"><option value="">선택</option>${milOpts}</select>
          </div>
          <div>
            <label class="form-label">국가원수</label>
            <input class="input-field" id="fLeader" value="${Utils.escHtml(item?.leader||'')}" placeholder="왕/대통령 등" style="width:100%;box-sizing:border-box;"/>
          </div>
          <div>
            <label class="form-label">인구</label>
            <input class="input-field" id="fPopulation" value="${Utils.escHtml(item?.population||'')}" placeholder="예: 5천만 명" style="width:100%;box-sizing:border-box;"/>
          </div>
          <div>
            <label class="form-label">영토 크기</label>
            <input class="input-field" id="fTerritory" value="${Utils.escHtml(item?.territory||'')}" placeholder="예: 한반도 2배" style="width:100%;box-sizing:border-box;"/>
          </div>
        </div>
        <!-- 상세 내용 -->
        <div>
          <label class="form-label">📜 국가 역사</label>
          <textarea class="textarea-field" id="fHistory" rows="3" placeholder="국가의 역사적 배경, 건국 과정, 주요 사건..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(item?.history||'')}</textarea>
        </div>
        <div>
          <label class="form-label">⚖️ 주요 법률</label>
          <textarea class="textarea-field" id="fLaws" rows="3" placeholder="소설에서 언급할 만한 법률, 규제, 금지 사항 등..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(item?.laws||'')}</textarea>
        </div>
        <div>
          <label class="form-label">🎭 문화 특징</label>
          <textarea class="textarea-field" id="fCulture" rows="3" placeholder="관습, 종교, 축제, 음식, 언어 등 문화적 특징..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(item?.culture||'')}</textarea>
        </div>
        <div>
          <label class="form-label">📌 주요 특징</label>
          <textarea class="textarea-field" id="fFeatures" rows="3" placeholder="국가의 주요 특징, 강점, 약점, 역사적 사건 등..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(item?.features||'')}</textarea>
        </div>
        <div style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
          <label class="form-label" style="display:block;margin-bottom:8px;">🤝 국가 관계</label>
          <div id="relsList" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;"></div>
          <div style="position:relative;">
            <input class="input-field" id="relsSearch" placeholder="국가 검색해서 추가..." autocomplete="off"
              style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="relsResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:160px;overflow-y:auto;"></div>
          </div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-top:4px;">없는 국가명은 검색창에 입력 후 "직접 추가"</div>
        </div>
        <div>
          <label class="form-label">📝 메모</label>
          <textarea class="textarea-field" id="fNotes" rows="2" placeholder="기타 메모..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(item?.notes||'')}</textarea>
        </div>
      </div>`;

    const saveRelsFromDOM = () => {
      document.querySelectorAll('#globalModalBody .rel-row').forEach(row => {
        const idx = parseInt(row.dataset.ridx, 10);
        if (formRelations[idx] === undefined) return;
        formRelations[idx].type = row.querySelector('.rel-type')?.value || '';
        formRelations[idx].desc = row.querySelector('.rel-desc')?.value.trim() || '';
      });
    };

    const renderRelsList = () => {
      const el = document.getElementById('relsList');
      if (!el) return;
      el.innerHTML = formRelations.map((rel, idx) => {
        const typeOpts = REL_TYPES.map(t => `<option value="${t}" ${rel.type === t ? 'selected' : ''}>${t}</option>`).join('');
        const linkedCountry = rel.countryId ? all.find(c => c.id === rel.countryId) : null;
        const icon = linkedCountry?.icon || '🌍';
        return `
          <div class="rel-row" data-ridx="${idx}" style="background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:8px;padding:10px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <span style="font-weight:700;font-size:13px;">${icon} ${Utils.escHtml(rel.countryName)}</span>
              <button class="btn btn-ghost btn-sm rel-del-btn" data-ridx="${idx}" style="color:var(--color-danger);font-size:11px;">삭제</button>
            </div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap;">
              <label style="font-size:12px;color:var(--color-text-muted);white-space:nowrap;flex-shrink:0;">관계 유형</label>
              <select class="select-input rel-type" data-ridx="${idx}" style="flex:1;min-width:80px;font-size:12px;padding:4px 8px;">
                <option value="">선택</option>${typeOpts}
              </select>
            </div>
            <textarea class="input-field rel-desc" data-ridx="${idx}" rows="2" placeholder="관계 설명..."
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(rel.desc || '')}</textarea>
          </div>`;
      }).join('');
      el.querySelectorAll('.rel-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          saveRelsFromDOM();
          formRelations.splice(parseInt(btn.dataset.ridx, 10), 1);
          renderRelsList();
        });
      });
    };

    Utils.openModal(isEdit ? '국가 편집' : '국가 추가', body, async () => {
      const name = document.getElementById('fName')?.value.trim();
      if (!name) { Utils.fieldError('fName'); return false; }

      const icon = document.querySelector('#iconDisplay')?.dataset.icon || item?.icon || '🌍';
      saveRelsFromDOM();
      const savedRelRefs = formRelations.map(r => ({
        id: r.id, countryId: r.countryId || '', countryName: r.countryName || '',
        type: r.type || '', desc: r.desc || '',
      })).filter(r => r.countryName.trim());
      const payload = {
        id: item?.id,
        worldId: wid,
        name,
        icon,
        govType:       document.getElementById('fGovType')?.value || '',
        econType:      document.getElementById('fEconType')?.value || '',
        militaryLevel: document.getElementById('fMilitary')?.value || '',
        leader:        document.getElementById('fLeader')?.value.trim() || '',
        population:    document.getElementById('fPopulation')?.value.trim() || '',
        territory:     document.getElementById('fTerritory')?.value.trim() || '',
        history:       document.getElementById('fHistory')?.value.trim() || '',
        laws:          document.getElementById('fLaws')?.value.trim() || '',
        culture:       document.getElementById('fCulture')?.value.trim() || '',
        features:      document.getElementById('fFeatures')?.value.trim() || '',
        relationRefs:  savedRelRefs,
        notes:         document.getElementById('fNotes')?.value.trim() || '',
        cities:        item?.cities || [],
      };

      const saved = await DB.put('countries', payload);
      await AppStore.updateStreak();
      await AppStore.recordActivity('countries', !isEdit);
      self._currentId = saved.id;
      const updated = await DB.getAll('countries', wid);
      Utils.toast(isEdit ? '수정되었습니다.' : '국가가 추가되었습니다.');
      const found = updated.find(c => c.id === saved.id);
      if (found) self._renderDetail(container, found, wid, updated);
      else self._renderList(container, updated, wid);
    });

    // Icon picker + auto-resize + relations wiring
    setTimeout(() => {
      Utils.autoResizeTextareas(document.getElementById('globalModalBody'));

      const display = document.getElementById('iconDisplay');
      const grid = document.getElementById('iconGrid');
      let sel = currentIcon;
      if (display) display.dataset.icon = sel;
      grid?.querySelectorAll('.icon-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          sel = btn.dataset.icon;
          if (display) { display.textContent = sel; display.dataset.icon = sel; }
          grid.querySelectorAll('.icon-pick-btn').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = 'var(--color-primary)';
        });
      });

      renderRelsList();
      const relsIn = document.getElementById('relsSearch');
      const relsRs = document.getElementById('relsResults');
      if (relsIn && relsRs) {
        const otherCountries = all.filter(c => c.id !== item?.id);
        relsIn.addEventListener('input', () => {
          const q = relsIn.value.trim();
          if (!q) { relsRs.style.display = 'none'; return; }
          const ql = q.toLowerCase();
          const hits = otherCountries.filter(c =>
            !formRelations.some(r => r.countryId === c.id) &&
            (c.name || '').toLowerCase().includes(ql)
          ).slice(0, 8);
          relsRs.innerHTML = hits.map(c => `
            <div class="rels-result" data-cid="${Utils.escHtml(c.id)}" data-cname="${Utils.escHtml(c.name || '')}"
              style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);display:flex;align-items:center;gap:6px;">
              ${Utils.escHtml(c.icon || '🌍')} ${Utils.escHtml(c.name || '')}
            </div>`).join('') +
            `<div class="rels-result-custom" data-cname="${Utils.escHtml(q)}"
              style="padding:8px 12px;cursor:pointer;font-size:13px;color:var(--color-primary);">
              + "${Utils.escHtml(q)}" 직접 추가
            </div>`;
          relsRs.style.display = 'block';
          relsRs.querySelectorAll('.rels-result').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              saveRelsFromDOM();
              formRelations.push({ id: DB.genId(), countryId: row.dataset.cid, countryName: row.dataset.cname, type: '', desc: '' });
              relsIn.value = ''; relsRs.style.display = 'none';
              renderRelsList();
            });
          });
          relsRs.querySelector('.rels-result-custom')?.addEventListener('mousedown', e => {
            e.preventDefault();
            saveRelsFromDOM();
            formRelations.push({ id: DB.genId(), countryId: '', countryName: q, type: '', desc: '' });
            relsIn.value = ''; relsRs.style.display = 'none';
            renderRelsList();
          });
        });
        relsIn.addEventListener('blur', () => setTimeout(() => { relsRs.style.display = 'none'; }, 150));
      }
    }, 50);
  },

  destroy: function() {
    this._container = null;
    this._currentId = null;
  },
});
