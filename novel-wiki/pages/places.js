'use strict';
window.Pages = window.Pages || {};
window.Pages.places = {
  _currentId: null,
  _container: null,

  // ── INIT ──────────────────────────────────────────────────────────────────────
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

    const places = await DB.getAll('places', wid);
    if (options.highlightId) this._currentId = options.highlightId;

    if (this._currentId) {
      const place = places.find(x => x.id === this._currentId);
      if (place) { this._renderDetail(container, place, wid); return; }
    }

    this._renderList(container, places, wid);
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  },

  // ── LIST ──────────────────────────────────────────────────────────────────────
  _renderList: async function(container, places, wid) {
    this._currentId = null;
    const world = AppStore.getState().currentWorld;

    const [countries, gates, towers, companies] = await Promise.all([
      DB.getAll('countries', wid),
      DB.getAll('gates', wid),
      DB.getAll('towers', wid),
      DB.getAll('companies', wid),
    ]);

    // Flatten cities from countries
    const allCities = [];
    countries.forEach(c => {
      (c.cities || []).forEach(city => {
        allCities.push({ id: city.id, name: city.name, parentId: c.id, parentName: c.name });
      });
    });

    // Filter state
    let filterType = '';
    let filterId = '';

    // Helper: get sub-items for a given filter type
    const subItems = {
      country:  countries.map(c  => ({ id: c.id,    name: c.name,    icon: '🌍' })),
      city:     allCities.map(ci => ({ id: ci.id,   name: `${ci.name} (${ci.parentName})`, icon: '🏙️' })),
      gate:     gates.map(g    => ({ id: g.id,    name: g.name,    icon: '🌀' })),
      tower:    towers.map(t   => ({ id: t.id,    name: t.name,    icon: '🗼' })),
      company:  companies.map(co => ({ id: co.id,  name: co.name,   icon: '🏢' })),
    };

    const hasAny = countries.length > 0 || allCities.length > 0 || gates.length > 0 || towers.length > 0 || companies.length > 0;

    const typeTabStyle = (active) =>
      `padding:4px 10px;border-radius:5px;border:1px solid var(--color-border);cursor:pointer;font-size:12px;font-weight:${active ? '700' : '400'};` +
      `background:${active ? 'var(--color-primary)' : 'var(--color-surface2)'};color:${active ? '#000' : 'var(--color-text-muted)'};`;

    const typeFilterHtml = hasAny ? `
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px;" id="filterTypeTabs">
        <button class="ftype-tab active" data-ftype="" style="${typeTabStyle(true)}">전체</button>
        ${countries.length > 0 ? `<button class="ftype-tab" data-ftype="country" style="${typeTabStyle(false)}">🌍 국가</button>` : ''}
        ${allCities.length > 0 ? `<button class="ftype-tab" data-ftype="city" style="${typeTabStyle(false)}">🏙️ 도시</button>` : ''}
        ${gates.length > 0 ? `<button class="ftype-tab" data-ftype="gate" style="${typeTabStyle(false)}">🌀 게이트</button>` : ''}
        ${towers.length > 0 ? `<button class="ftype-tab" data-ftype="tower" style="${typeTabStyle(false)}">🗼 탑</button>` : ''}
        ${companies.length > 0 ? `<button class="ftype-tab" data-ftype="company" style="${typeTabStyle(false)}">🏢 기업</button>` : ''}
      </div>
      <div id="filterSubRow" style="display:none;gap:4px;flex-wrap:wrap;margin-top:6px;"></div>` : '';

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">장소</h2>
          <button class="btn btn-primary btn-sm" id="btnAddPlace">+ 추가</button>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${places.length}개
        </p>
        <input class="input-field" id="placeSearch" placeholder="장소 이름, 구성, 사건 키워드로 검색..."
          style="margin-top:8px;width:100%;box-sizing:border-box;" />
        ${typeFilterHtml}
      </div>

      <div id="placeList" class="item-list">
        ${places.length === 0
          ? `<div class="empty-state" style="padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">📍</div>
               <div style="font-weight:700;font-size:16px;margin-bottom:4px;">등록된 장소가 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 장소를 등록하세요</div>
             </div>`
          : places.map(pl => this._placeCard(pl)).join('')}
      </div>
    </div>`;

    // Search
    const searchInput = document.getElementById('placeSearch');
    searchInput?.addEventListener('input', () => {
      this._applyFilter(container, searchInput.value, filterType, filterId);
    });

    // Type tab filter
    const subRow = document.getElementById('filterSubRow');
    container.querySelectorAll('.ftype-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.ftype-tab').forEach(b => {
          b.style.background = 'var(--color-surface2)';
          b.style.color = 'var(--color-text-muted)';
          b.style.fontWeight = '400';
        });
        btn.style.background = 'var(--color-primary)';
        btn.style.color = '#000';
        btn.style.fontWeight = '700';
        filterType = btn.dataset.ftype;
        filterId = '';

        if (!filterType || !subRow) {
          if (subRow) { subRow.style.display = 'none'; subRow.innerHTML = ''; }
        } else {
          const items = subItems[filterType] || [];
          subRow.innerHTML = `
            <button class="fsub-chip active" data-fid=""
              style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface2);color:var(--color-text);font-size:11px;cursor:pointer;">전체 ${btn.textContent.trim()}</button>
            ${items.map(it => `<button class="fsub-chip" data-fid="${Utils.escHtml(it.id)}"
              style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);font-size:11px;cursor:pointer;">${it.icon} ${Utils.escHtml(it.name)}</button>`).join('')}`;
          subRow.style.display = 'flex';

          subRow.querySelectorAll('.fsub-chip').forEach(chip => {
            chip.addEventListener('click', () => {
              subRow.querySelectorAll('.fsub-chip').forEach(c => {
                c.style.background = 'transparent'; c.style.color = 'var(--color-text-muted)';
              });
              chip.style.background = 'var(--color-surface2)'; chip.style.color = 'var(--color-text)';
              filterId = chip.dataset.fid;
              this._applyFilter(container, searchInput?.value || '', filterType, filterId);
            });
          });
        }

        this._applyFilter(container, searchInput?.value || '', filterType, filterId);
      });
    });

    // Add button
    document.getElementById('btnAddPlace')?.addEventListener('click', () => {
      this._openForm(null, wid, container);
    });

    // Card click
    container.querySelectorAll('.place-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-place')) return;
        const id = card.dataset.id;
        DB.getAll('places', wid).then(all => {
          const pl = all.find(x => x.id === id);
          if (pl) { this._currentId = pl.id; this._renderDetail(container, pl, wid); }
        });
      });
    });

    // Delete button
    container.querySelectorAll('.btn-del-place').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const pl = places.find(x => x.id === btn.dataset.id);
        Utils.confirmWithInput('장소 삭제', '삭제하면 되돌릴 수 없습니다.', pl?.name || '이 장소', async () => {
          await DB.del('places', btn.dataset.id);
          Utils.toast('삭제됨', 'info');
          this.init(container);
        });
      });
    });
  },

  _applyFilter: function(container, query, filterType, filterId) {
    container.querySelectorAll('.place-card').forEach(card => {
      const text = card.dataset.searchText || '';
      const rpTypes = (card.dataset.rpTypes || '').split(',').filter(Boolean);
      const rpIds   = (card.dataset.rpIds   || '').split(',').filter(Boolean);

      const textOk = Utils.matchesQuery(text, query);
      let filterOk = true;
      if (filterType) {
        const typeMatch = rpTypes.some(t => t === filterType);
        if (!typeMatch) { filterOk = false; }
        else if (filterId) {
          filterOk = rpTypes.some((t, i) => t === filterType && rpIds[i] === filterId);
        }
      }
      card.style.display = textOk && filterOk ? '' : 'none';
    });
  },

  _placeCard: function(pl) {
    const rp = pl.relatedPlaces || [];
    const re = pl.relatedEvents || [];
    const pc = pl.postChanges || [];
    const rpTypes = rp.map(r => r.type).join(',');
    const rpIds   = rp.map(r => r.id).join(',');

    const rpBadges = rp.slice(0, 4).map(r => {
      const icon = { country:'🌍', city:'🏙️', gate:'🌀', tower:'🗼', company:'🏢' }[r.type] || '📍';
      return `<span style="font-size:11px;padding:1px 6px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:3px;color:#a5b4fc;">${icon} ${Utils.escHtml(r.name)}</span>`;
    }).join('') + (rp.length > 4 ? `<span style="font-size:11px;color:var(--color-text-dim);"> +${rp.length - 4}개</span>` : '');

    const searchText = [
      pl.name, pl.composition,
      ...rp.map(r => r.name),
      ...re.map(r => r.name),
      ...pc,
    ].filter(Boolean).join(' ').toLowerCase();

    return `
    <div class="place-card list-item"
      data-id="${Utils.escHtml(pl.id)}"
      data-rp-types="${Utils.escHtml(rpTypes)}"
      data-rp-ids="${Utils.escHtml(rpIds)}"
      data-search-text="${Utils.escHtml(searchText)}"
      style="cursor:pointer;display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--color-surface2);border-radius:10px;border:1px solid var(--color-border);border-left:3px solid #6366f1;margin-bottom:8px;">
      <div style="width:44px;height:44px;border-radius:8px;background:rgba(99,102,241,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:22px;">📍</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
          <span style="font-weight:700;font-size:14px;">${Utils.escHtml(pl.name || '이름 없음')}</span>
          ${re.length > 0 ? `<span style="font-size:11px;padding:1px 6px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:3px;color:#34d399;">사건 ${re.length}개</span>` : ''}
          ${pc.filter(Boolean).length > 0 ? `<span style="font-size:11px;padding:1px 6px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:3px;color:#fbbf24;">변화 ${pc.filter(Boolean).length}개</span>` : ''}
        </div>
        ${rp.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">${rpBadges}</div>` : ''}
        ${pl.composition ? `<div style="font-size:12px;color:var(--color-text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(pl.composition)}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm btn-del-place" data-id="${Utils.escHtml(pl.id)}"
        style="color:var(--color-danger);font-size:11px;flex-shrink:0;">삭제</button>
    </div>`;
  },

  // ── DETAIL ────────────────────────────────────────────────────────────────────
  _renderDetail: function(container, pl, wid) {
    const rp = pl.relatedPlaces || [];
    const re = pl.relatedEvents || [];
    const pc = (pl.postChanges || []).filter(Boolean);

    const rpIcon = { country:'🌍', city:'🏙️', gate:'🌀', tower:'🗼', company:'🏢' };
    const rpPage = { country:'countries', city:'countries', gate:'gates', tower:'tower', company:'companies' };

    const relatedPlacesHtml = rp.length > 0 ? `
      <div style="margin-bottom:14px;">
        <div style="font-size:11px;color:var(--color-text-muted);font-weight:700;margin-bottom:8px;letter-spacing:0.5px;">연관 장소</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${rp.map(r => {
            const icon = rpIcon[r.type] || '📍';
            const page = rpPage[r.type] || '';
            const label = r.type === 'city' && r.parentName ? `${r.name} (${r.parentName})` : r.name;
            return page
              ? `<button class="btn btn-ghost btn-sm" onclick="AppRouter.navigate('${page}')" style="font-size:12px;gap:4px;">${icon} ${Utils.escHtml(label)}</button>`
              : `<span style="font-size:12px;padding:3px 8px;background:var(--color-surface3);border-radius:5px;">${icon} ${Utils.escHtml(label)}</span>`;
          }).join('')}
        </div>
      </div>` : '';

    const relatedEventsHtml = re.length > 0 ? `
      <div style="margin-bottom:14px;">
        <div style="font-size:11px;color:var(--color-text-muted);font-weight:700;margin-bottom:8px;letter-spacing:0.5px;">연관 사건</div>
        <div style="display:flex;flex-direction:column;gap:5px;">
          ${re.map(ev => `
            <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);border-radius:7px;">
              <span style="font-size:14px;">📌</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;">${Utils.escHtml(ev.name || '')}</div>
                ${ev.date ? `<div style="font-size:11px;color:var(--color-text-muted);">${Utils.escHtml(ev.date)}</div>` : ''}
              </div>
              <button class="btn btn-ghost btn-sm" onclick="AppRouter.navigate('event-graph')" style="font-size:11px;">그래프</button>
            </div>`).join('')}
        </div>
      </div>` : '';

    const postChangesHtml = pc.length > 0 ? `
      <div style="margin-bottom:14px;">
        <div style="font-size:11px;color:var(--color-text-muted);font-weight:700;margin-bottom:8px;letter-spacing:0.5px;">사건 이후 장소의 변화</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${pc.map((ch, i) => `
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:7px;">
              <div style="min-width:24px;height:24px;background:var(--color-warning);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#000;flex-shrink:0;">${i + 1}</div>
              <div style="font-size:13px;white-space:pre-wrap;line-height:1.7;flex:1;">${Utils.nl2br(Utils.escHtml(ch))}</div>
            </div>`).join('')}
        </div>
      </div>` : '';

    container.innerHTML = `
    <div class="page active">
      <div class="page-header" style="border-left:4px solid #6366f1;padding-left:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackPlaces">← 목록</button>
          <h2 class="page-title" style="margin:0;font-size:18px;">📍 ${Utils.escHtml(pl.name || '이름 없음')}</h2>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditPlace">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnDelPlace" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      <div style="background:var(--color-surface2);border-radius:12px;padding:14px 16px;margin-bottom:16px;">
        ${pl.composition ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:700;margin-bottom:6px;letter-spacing:0.5px;">장소 구성</div>
            <div style="font-size:13px;white-space:pre-wrap;line-height:1.8;">${Utils.nl2br(Utils.escHtml(pl.composition))}</div>
          </div>` : ''}
        ${relatedPlacesHtml}
        ${relatedEventsHtml}
        ${postChangesHtml}
        ${pl.authorNotes ? `
          <div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:10px 14px;margin-top:4px;">
            <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:4px;">작가 메모</div>
            <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(pl.authorNotes))}</div>
          </div>` : ''}
        <div style="font-size:11px;color:var(--color-text-dim);text-align:right;margin-top:12px;padding-top:10px;border-top:1px solid var(--color-border);">
          수정: ${Utils.formatDate(pl.updatedAt)} · 생성: ${Utils.formatDate(pl.createdAt)}
        </div>
      </div>
    </div>`;

    document.getElementById('btnBackPlaces')?.addEventListener('click', () => { this._currentId = null; this.init(container); });
    document.getElementById('btnEditPlace')?.addEventListener('click', () => this._openForm(pl, wid, container));
    document.getElementById('btnDelPlace')?.addEventListener('click', () => {
      Utils.confirmWithInput('장소 삭제', '삭제하면 되돌릴 수 없습니다.', pl.name, async () => {
        await DB.del('places', pl.id);
        Utils.toast('삭제됨', 'info');
        this._currentId = null;
        this.init(container);
      });
    });
  },

  // ── FORM ──────────────────────────────────────────────────────────────────────
};
