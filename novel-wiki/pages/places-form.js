'use strict';
// places-form.js — form methods for window.Pages.places
Object.assign(window.Pages.places, {
  _openForm: async function(place, wid, container) {
    const isEdit = !!place;
    const p = place || {};
    const self = this;

    const [countries, gates, towers, companies, events] = await Promise.all([
      DB.getAll('countries', wid),
      DB.getAll('gates', wid),
      DB.getAll('towers', wid),
      DB.getAll('companies', wid),
      DB.getAll('events', wid),
    ]);

    const allCities = [];
    countries.forEach(c => {
      (c.cities || []).forEach(city => {
        allCities.push({ id: city.id, name: city.name, parentId: c.id, parentName: c.name });
      });
    });

    // Mutable form state (closures)
    let formRelatedPlaces = JSON.parse(JSON.stringify(p.relatedPlaces || []));
    let formRelatedEvents = JSON.parse(JSON.stringify(p.relatedEvents || []));
    let formPostChanges   = [...(p.postChanges || []).filter(Boolean)];

    const hasRefData = countries.length > 0 || allCities.length > 0 || gates.length > 0 || towers.length > 0 || companies.length > 0;

    const body = `
      <div style="display:flex;flex-direction:column;gap:14px;padding-right:4px;">

        <!-- 이름 -->
        <div class="form-group">
          <label class="form-label">장소 이름 *</label>
          <input class="input-field" id="fPlName" value="${Utils.escHtml(p.name || '')}"
            placeholder="장소 이름" style="width:100%;box-sizing:border-box;" />
        </div>

        <!-- 장소 구성 -->
        <div class="form-group">
          <label class="form-label">장소 구성</label>
          <textarea class="input-field" id="fPlComp" rows="4"
            placeholder="이 장소의 구성 요소, 지형, 규모, 분위기 등..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(p.composition || '')}</textarea>
        </div>

        <!-- 연관 장소 -->
        ${hasRefData ? `
        <div class="form-group">
          <label class="form-label">연관 장소 <span style="font-size:11px;color:var(--color-text-dim);">(국가·도시·게이트·탑·기업)</span></label>
          <div style="display:flex;gap:6px;margin-bottom:6px;">
            <select class="select-input" id="rpTypeSelect" style="width:90px;flex-shrink:0;">
              ${countries.length > 0  ? '<option value="country">🌍 국가</option>' : ''}
              ${allCities.length > 0  ? '<option value="city">🏙️ 도시</option>' : ''}
              ${gates.length > 0      ? '<option value="gate">🌀 게이트</option>' : ''}
              ${towers.length > 0     ? '<option value="tower">🗼 탑</option>' : ''}
              ${companies.length > 0  ? '<option value="company">🏢 기업</option>' : ''}
            </select>
            <select class="select-input" id="rpItemSelect" style="flex:1;min-width:0;">
              <option value="">선택...</option>
            </select>
            <button class="btn btn-ghost btn-sm" id="rpAddBtn" style="flex-shrink:0;">추가</button>
          </div>
          <div id="rpList"></div>
        </div>` : ''}

        <!-- 연관 사건 -->
        ${events.length > 0 ? `
        <div class="form-group">
          <label class="form-label">연관 사건</label>
          <input class="input-field" id="evSearchInput" placeholder="사건 검색..."
            style="width:100%;box-sizing:border-box;margin-bottom:6px;" />
          <div id="evPickList"
            style="max-height:140px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;border:1px solid var(--color-border);border-radius:6px;padding:4px;background:var(--color-bg);"></div>
          <div style="margin-top:6px;" id="evSelectedList"></div>
        </div>` : ''}

        <!-- 사건 이후 변화 -->
        <div class="form-group">
          <label class="form-label">사건 이후 장소의 변화 <span style="font-size:11px;color:var(--color-text-dim);">(번호 순서)</span></label>
          <div id="postChangesList"></div>
          <button class="btn btn-ghost btn-sm" id="btnAddPostChange"
            style="margin-top:6px;border:1px dashed var(--color-border);width:100%;">+ 변화 추가</button>
        </div>

        <!-- 작가 메모 -->
        <div class="form-group">
          <label class="form-label">작가 메모 <span style="font-size:11px;color:var(--color-text-dim);">(소설에 미표시)</span></label>
          <textarea class="input-field" id="fPlNotes" rows="2"
            placeholder="설계 의도, 등장 시점 등..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(p.authorNotes || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '장소 편집' : '새 장소 추가', body, async () => {
      const name = document.getElementById('fPlName')?.value.trim();
      if (!name) { Utils.fieldError('fPlName'); return false; }

      // Read current textarea values for postChanges
      document.querySelectorAll('#globalModalBody .post-change-ta').forEach(ta => {
        formPostChanges[Number(ta.dataset.idx)] = ta.value;
      });
      const finalPostChanges = formPostChanges.filter(s => s.trim());

      const record = {
        ...(p || {}),
        worldId: wid,
        name,
        composition:    document.getElementById('fPlComp')?.value.trim()  || '',
        relatedPlaces:  formRelatedPlaces,
        relatedEvents:  formRelatedEvents,
        postChanges:    finalPostChanges,
        authorNotes:    document.getElementById('fPlNotes')?.value.trim() || '',
        id: p.id || DB.genId(),
        createdAt: p.createdAt || Date.now(),
      };

      await DB.put('places', record);
      await AppStore.updateStreak();
      await AppStore.recordActivity('places', !isEdit);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      self._currentId = record.id;
      const updated = await DB.get('places', record.id);
      if (updated) self._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    // ── Wire up interactive form elements ──
    setTimeout(() => {
      // ── Related places ──────────────────────────────────────────
      const typeSelect = document.getElementById('rpTypeSelect');
      const itemSelect = document.getElementById('rpItemSelect');

      function buildItemOptions(type) {
        const map = {
          country: countries.map(c   => ({ id: c.id,  label: c.name, extra: {} })),
          city:    allCities.map(ci  => ({ id: ci.id, label: `${ci.name} (${ci.parentName})`, extra: { parentId: ci.parentId, parentName: ci.parentName, pureName: ci.name } })),
          gate:    gates.map(g       => ({ id: g.id,  label: g.name, extra: {} })),
          tower:   towers.map(t      => ({ id: t.id,  label: t.name, extra: {} })),
          company: companies.map(co  => ({ id: co.id, label: co.name, extra: {} })),
        };
        const items = map[type] || [];
        if (!itemSelect) return;
        itemSelect.innerHTML = '<option value="">선택...</option>' +
          items.map(it => `<option value="${Utils.escHtml(it.id)}"
            data-parent-id="${Utils.escHtml(it.extra.parentId || '')}"
            data-parent-name="${Utils.escHtml(it.extra.parentName || '')}"
            data-pure-name="${Utils.escHtml(it.extra.pureName || it.label)}"
            >${Utils.escHtml(it.label)}</option>`).join('');
      }

      function renderRpList() {
        const el = document.getElementById('rpList');
        if (!el) return;
        if (formRelatedPlaces.length === 0) {
          el.innerHTML = '<div style="font-size:12px;color:var(--color-text-dim);padding:4px 0;">연결된 장소 없음</div>';
          return;
        }
        const iconMap = { country:'🌍', city:'🏙️', gate:'🌀', tower:'🗼', company:'🏢' };
        el.innerHTML = formRelatedPlaces.map((rp, i) => {
          const icon = iconMap[rp.type] || '📍';
          const label = rp.type === 'city' && rp.parentName ? `${rp.name} (${rp.parentName})` : rp.name;
          return `<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:5px;margin-bottom:3px;">
            <span style="font-size:14px;">${icon}</span>
            <span style="flex:1;font-size:13px;">${Utils.escHtml(label)}</span>
            <button class="rp-remove" data-idx="${i}"
              style="background:none;border:none;color:var(--color-danger);cursor:pointer;font-size:16px;padding:0 2px;line-height:1;">×</button>
          </div>`;
        }).join('');
        el.querySelectorAll('.rp-remove').forEach(btn => {
          btn.addEventListener('click', () => {
            formRelatedPlaces.splice(Number(btn.dataset.idx), 1);
            renderRpList();
          });
        });
      }

      if (typeSelect) {
        typeSelect.addEventListener('change', () => buildItemOptions(typeSelect.value));
        buildItemOptions(typeSelect.value);
      }
      renderRpList();

      document.getElementById('rpAddBtn')?.addEventListener('click', () => {
        const type = typeSelect?.value;
        const sel = itemSelect;
        const id = sel?.value;
        if (!type || !id) { Utils.toast('타입과 항목을 선택하세요', 'error'); return; }
        if (formRelatedPlaces.some(rp => rp.type === type && rp.id === id)) {
          Utils.toast('이미 추가된 항목입니다', 'error'); return;
        }
        const opt = sel.options[sel.selectedIndex];
        const pureName = opt?.dataset.pureName || opt?.text || '';
        const parentId = opt?.dataset.parentId || undefined;
        const parentName = opt?.dataset.parentName || undefined;
        const entry = { type, id, name: pureName };
        if (parentId) { entry.parentId = parentId; entry.parentName = parentName; }
        formRelatedPlaces.push(entry);
        renderRpList();
      });

      // ── Post-changes ─────────────────────────────────────────────
      function renderPostChanges() {
        const el = document.getElementById('postChangesList');
        if (!el) return;
        if (formPostChanges.length === 0) {
          el.innerHTML = '<div style="font-size:12px;color:var(--color-text-dim);padding:4px 0;">변화 항목 없음</div>';
          return;
        }
        el.innerHTML = formPostChanges.map((ch, i) => `
          <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:6px;">
            <div style="min-width:24px;height:24px;background:var(--color-warning);border-radius:50%;
              display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#000;flex-shrink:0;margin-top:5px;">${i + 1}</div>
            <textarea class="input-field post-change-ta" data-idx="${i}" rows="2"
              style="flex:1;box-sizing:border-box;resize:vertical;">${Utils.escHtml(ch)}</textarea>
            <button class="pc-remove" data-idx="${i}"
              style="background:none;border:none;color:var(--color-danger);cursor:pointer;font-size:20px;padding:0 2px;flex-shrink:0;line-height:1;margin-top:3px;">×</button>
          </div>`).join('');
        el.querySelectorAll('.post-change-ta').forEach(ta => {
          ta.addEventListener('input', () => { formPostChanges[Number(ta.dataset.idx)] = ta.value; });
        });
        el.querySelectorAll('.pc-remove').forEach(btn => {
          btn.addEventListener('click', () => {
            document.querySelectorAll('#globalModalBody .post-change-ta').forEach(ta => {
              formPostChanges[Number(ta.dataset.idx)] = ta.value;
            });
            formPostChanges.splice(Number(btn.dataset.idx), 1);
            renderPostChanges();
          });
        });
      }
      renderPostChanges();

      document.getElementById('btnAddPostChange')?.addEventListener('click', () => {
        document.querySelectorAll('#globalModalBody .post-change-ta').forEach(ta => {
          formPostChanges[Number(ta.dataset.idx)] = ta.value;
        });
        formPostChanges.push('');
        renderPostChanges();
        // Scroll to new entry
        setTimeout(() => {
          const tas = document.querySelectorAll('#globalModalBody .post-change-ta');
          tas[tas.length - 1]?.focus();
        }, 50);
      });

      // ── Related events ────────────────────────────────────────────
      const evSearchEl = document.getElementById('evSearchInput');
      if (!evSearchEl) return;

      function renderEvList(query) {
        const listEl = document.getElementById('evPickList');
        if (!listEl) return;
        const q = (query || '').toLowerCase();
        const filtered = q
          ? events.filter(e => Utils.matchesQuery((e.name || '') + ' ' + (e.date || ''), q))
          : events;
        const shown = filtered.slice(0, 30);
        listEl.innerHTML = shown.map(e => {
          const sel = formRelatedEvents.some(re => re.id === e.id);
          return `<div class="ev-pick-row" data-ev-id="${Utils.escHtml(e.id)}"
            style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:5px;cursor:pointer;
              background:${sel ? 'rgba(0,188,212,0.08)' : 'transparent'};
              border:1px solid ${sel ? 'rgba(0,188,212,0.3)' : 'transparent'};">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:${sel ? '700' : '400'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(e.name || '이름 없음')}</div>
              ${e.date ? `<div style="font-size:10px;color:var(--color-text-muted);">${Utils.escHtml(e.date)}</div>` : ''}
            </div>
            <span style="font-size:16px;color:${sel ? 'var(--color-primary)' : 'var(--color-text-dim)'};">${sel ? '✓' : '+'}</span>
          </div>`;
        }).join('') || '<div style="font-size:12px;color:var(--color-text-dim);padding:6px;">검색 결과 없음</div>';

        listEl.querySelectorAll('.ev-pick-row').forEach(row => {
          row.addEventListener('click', () => {
            const evId = row.dataset.evId;
            const ev = events.find(e => e.id === evId);
            if (!ev) return;
            const idx = formRelatedEvents.findIndex(re => re.id === evId);
            if (idx >= 0) formRelatedEvents.splice(idx, 1);
            else formRelatedEvents.push({ id: ev.id, name: ev.name || '', date: ev.date || '' });
            renderEvList(evSearchEl?.value || '');
            renderEvSelected();
          });
        });
      }

      function renderEvSelected() {
        const el = document.getElementById('evSelectedList');
        if (!el) return;
        if (formRelatedEvents.length === 0) {
          el.innerHTML = '';
          return;
        }
        el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">` +
          formRelatedEvents.map((re, i) => `
            <div style="display:flex;align-items:center;gap:4px;padding:3px 8px;
              background:rgba(0,188,212,0.08);border:1px solid rgba(0,188,212,0.25);border-radius:5px;">
              <span style="font-size:12px;">📌 ${Utils.escHtml(re.name)}</span>
              <button class="ev-remove" data-idx="${i}"
                style="background:none;border:none;color:var(--color-danger);cursor:pointer;font-size:14px;padding:0;line-height:1;">×</button>
            </div>`).join('') + '</div>';
        el.querySelectorAll('.ev-remove').forEach(btn => {
          btn.addEventListener('click', () => {
            formRelatedEvents.splice(Number(btn.dataset.idx), 1);
            renderEvList(evSearchEl?.value || '');
            renderEvSelected();
          });
        });
      }

      renderEvList('');
      renderEvSelected();
      evSearchEl.addEventListener('input', e => renderEvList(e.target.value));

    }, 50);
  },
});
