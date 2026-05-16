'use strict';
window.Pages = window.Pages || {};
window.Pages.countries = {
  _container: null,
  _currentId: null,
  _listScrollY: 0,
  _collapsedSections: {}, // section key → boolean (true = collapsed)

  ICONS: ['🏳️','🌍','🌏','🌎','🏛️','⚔️','🏰','🌸','🌿','🔥','❄️','⚡','🌊','🏔️','🌋','🌅','🦅','🐉','👑','🗡️','🛡️','⚓','🌹','🌑','☀️'],

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
    const all = await DB.getAll('countries', wid);
    if (options.highlightId) this._currentId = options.highlightId;
    if (this._currentId) {
      const item = all.find(c => c.id === this._currentId);
      if (item) { await this._renderDetail(container, item, wid, all); return; }
    }
    this._renderList(container, all, wid);
  },

  // ── LIST ──────────────────────────────────────────────────────────────────
  _renderList: function(container, all, wid) {
    this._currentId = null;
    const self = this;
    all = [...all].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
    const world = AppStore.getState().currentWorld;
    const hierarchy = (world?.regionHierarchy && world.regionHierarchy.length >= 1)
      ? world.regionHierarchy : ['국가', '도시'];
    const topLabel = hierarchy[0] || '국가';
    const cityLabel = hierarchy[1] || '도시';

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">${Utils.escHtml(topLabel)}</h2>
          <button class="btn btn-primary btn-sm" id="btnAddCountry">+ ${Utils.escHtml(topLabel)} 추가</button>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${all.length}개
          ${hierarchy.length > 1 ? `<span style="opacity:0.6;"> (${hierarchy.join(' › ')})</span>` : ''}
        </p>
        <input class="input-field" id="countryFilter" placeholder="${Utils.escHtml(topLabel)}명 검색..." style="margin-top:8px;width:100%;box-sizing:border-box;" />
      </div>
      ${all.length === 0
        ? `<div class="empty-state" style="padding:48px;text-align:center;">
             <div style="font-size:48px;margin-bottom:12px;">🏛️</div>
             <div style="font-weight:700;font-size:16px;margin-bottom:4px;">등록된 ${Utils.escHtml(topLabel)}이(가) 없습니다</div>
             <div style="font-size:13px;color:var(--color-text-muted);">+ 버튼으로 첫 번째 ${Utils.escHtml(topLabel)}을(를) 추가하세요</div>
           </div>`
        : `<div style="display:flex;flex-direction:column;gap:8px;" id="countryList">
             ${all.map(c => `
               <button class="card card--interactive country-item" data-id="${Utils.escHtml(c.id)}"
                 data-name="${Utils.escHtml((c.name||'').toLowerCase())}"
                 style="display:flex;align-items:center;gap:12px;padding:14px 16px;text-align:left;">
                 <div style="font-size:28px;min-width:36px;text-align:center;">${Utils.escHtml(c.icon || '🌍')}</div>
                 <div style="flex:1;min-width:0;">
                   <div style="font-weight:700;font-size:15px;color:var(--color-text);">${Utils.escHtml(c.name || '이름 없음')}</div>
                   <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">
                     ${[c.govType, c.econType, c.militaryLevel ? '군사력: ' + c.militaryLevel : ''].filter(Boolean).join(' · ')}
                   </div>
                   ${(c.cities || []).length > 0 ? `<div style="font-size:11px;color:var(--color-text-dim);margin-top:2px;">🏙️ ${Utils.escHtml(cityLabel)} ${c.cities.length}개</div>` : ''}
                 </div>
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;color:var(--color-text-muted);flex-shrink:0;">
                   <path d="M9 18l6-6-6-6"/>
                 </svg>
               </button>`).join('')}
           </div>`}
    </div>`;

    setTimeout(() => { container.scrollTop = self._listScrollY || 0; }, 0);

    document.getElementById('countryFilter')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.country-item').forEach(btn => {
        btn.style.display = btn.dataset.name.includes(q) ? '' : 'none';
      });
    });

    container.querySelector('#btnAddCountry')?.addEventListener('click', () => {
      self._listScrollY = container.scrollTop;
      self._openForm(container, null, wid, all);
    });
    container.querySelectorAll('.country-item').forEach(btn => {
      btn.addEventListener('click', () => {
        self._listScrollY = container.scrollTop;
        const item = all.find(c => c.id === btn.dataset.id);
        if (item) { self._currentId = item.id; self._renderDetail(container, item, wid, all); }
      });
    });
  },

  // ── DETAIL ────────────────────────────────────────────────────────────────
  _renderDetail: async function(container, item, wid, all) {
    const self = this;
    const [allChars, allCompanies, C] = await Promise.all([
      DB.getAll('characters', wid),
      DB.getAll('companies', wid),
      AppConstants.load(),
    ]);
    const world = AppStore.getState().currentWorld;
    const hierarchy = (world?.regionHierarchy && world.regionHierarchy.length >= 2)
      ? world.regionHierarchy : ['국가', '도시'];
    const cityLabel = hierarchy[1] || '도시';

    const makeSectionHtml = (key, icon, title, content) => {
      if (!content) return '';
      const collapsed = self._collapsedSections[key];
      return `
        <div class="country-section" data-section="${Utils.escHtml(key)}" style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
          <button class="section-toggle" data-section="${Utils.escHtml(key)}"
            style="width:100%;display:flex;align-items:center;justify-content:space-between;background:none;border:none;cursor:pointer;padding:0;color:var(--color-text);">
            <span style="font-weight:700;font-size:13px;color:var(--color-secondary);">${icon} ${title}</span>
            <span class="section-chevron" style="font-size:12px;color:var(--color-text-muted);transition:transform .2s;">${collapsed ? '▶' : '▼'}</span>
          </button>
          <div class="section-body" style="margin-top:${collapsed ? '0' : '8px'};display:${collapsed ? 'none' : 'block'};">
            <div style="font-size:13px;color:var(--color-text);line-height:1.8;white-space:pre-wrap;">${Utils.escHtml(content)}</div>
          </div>
        </div>`;
    };

    // Relations HTML
    const relItems = item.relationRefs || [];
    const relSectionCollapsed = self._collapsedSections['relations'];
    const TYPE_COLORS = { '동맹':'#10b981','우호':'#60a5fa','중립':'#9ca3af','교역':'#fbbf24','경쟁':'#f97316','적대':'#ef4444','종속':'#a78bfa','보호국':'#a78bfa','전쟁':'#dc2626' };
    let relationsSectionHtml;
    if (relItems.length > 0) {
      const relBodyHtml = relItems.map(rel => {
        const col = TYPE_COLORS[rel.type] || '#6b7280';
        const linkedCountry = rel.countryId ? all.find(c => c.id === rel.countryId) : null;
        return `<div style="border-left:3px solid ${col};border-radius:0 6px 6px 0;padding:10px 12px;margin-bottom:8px;background:${col}1a;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:${rel.desc ? '6px' : '0'};flex-wrap:wrap;">
            <span style="font-size:14px;font-weight:700;">${Utils.escHtml(linkedCountry?.icon || '🌍')} ${Utils.escHtml(rel.countryName || '')}</span>
            ${rel.type ? `<span style="background:${col}33;color:${col};border:1px solid ${col}66;padding:1px 7px;border-radius:4px;font-size:11px;font-weight:700;">${Utils.escHtml(rel.type)}</span>` : ''}
            ${linkedCountry ? `<button class="btn btn-ghost btn-sm btn-rel-nav" data-cid="${Utils.escHtml(linkedCountry.id)}" style="font-size:11px;padding:2px 6px;">→ 이동</button>` : ''}
          </div>
          ${rel.desc ? `<div style="font-size:13px;color:var(--color-text);line-height:1.7;white-space:pre-wrap;">${Utils.escHtml(rel.desc)}</div>` : ''}
        </div>`;
      }).join('');
      relationsSectionHtml = `
        <div class="country-section" data-section="relations" style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
          <button class="section-toggle" data-section="relations"
            style="width:100%;display:flex;align-items:center;justify-content:space-between;background:none;border:none;cursor:pointer;padding:0;color:var(--color-text);">
            <span style="font-weight:700;font-size:13px;color:var(--color-secondary);">🤝 국가 관계 (${relItems.length})</span>
            <span class="section-chevron" style="font-size:12px;color:var(--color-text-muted);transition:transform .2s;">${relSectionCollapsed ? '▶' : '▼'}</span>
          </button>
          <div class="section-body" style="margin-top:${relSectionCollapsed ? '0' : '8px'};display:${relSectionCollapsed ? 'none' : 'block'};">
            ${relBodyHtml}
          </div>
        </div>`;
    } else {
      relationsSectionHtml = makeSectionHtml('relations', '🤝', '국가 관계', item.relations);
    }

    // Cities HTML
    const cities = item.cities || [];
    const citySectionCollapsed = self._collapsedSections['cities'];
    const cityListHtml = cities.length === 0
      ? `<div style="font-size:13px;color:var(--color-text-muted);padding:8px 0;">등록된 ${cityLabel}이(가) 없습니다.</div>`
      : cities.map(city => {
          const chars = (city.charIds || []).map(id => allChars.find(c => c.id === id)).filter(Boolean);
          const comps = (city.companyIds || []).map(id => allCompanies.find(c => c.id === id)).filter(Boolean);
          const cityCollapsed = self._collapsedSections['city_' + city.id];
          return `
          <div class="city-card" data-city-id="${Utils.escHtml(city.id)}"
            style="border:1px solid var(--color-border);border-radius:8px;padding:12px 14px;margin-bottom:8px;background:var(--color-bg);">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
              <button class="city-collapse-btn" data-city="${Utils.escHtml(city.id)}"
                style="display:flex;align-items:center;gap:8px;background:none;border:none;cursor:pointer;flex:1;text-align:left;padding:0;">
                <span style="font-size:15px;font-weight:700;">🏙️ ${Utils.escHtml(city.name || '이름 없음')}</span>
                <span style="font-size:11px;color:var(--color-text-muted);">${cityCollapsed ? '▶' : '▼'}</span>
              </button>
              <div style="display:flex;gap:4px;flex-shrink:0;">
                <button class="btn btn-ghost btn-sm btn-edit-city" data-city="${Utils.escHtml(city.id)}" style="font-size:11px;">편집</button>
                <button class="btn btn-ghost btn-sm btn-del-city" data-city="${Utils.escHtml(city.id)}" style="font-size:11px;color:var(--color-danger);">삭제</button>
              </div>
            </div>
            <div class="city-detail-body" style="display:${cityCollapsed ? 'none' : 'block'};">
              ${city.finance ? `<div style="margin-top:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">💰 재정 상태</div><div style="font-size:13px;white-space:pre-wrap;line-height:1.7;">${Utils.escHtml(city.finance)}</div></div>` : ''}
              ${city.buildings ? `<div style="margin-top:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">🏛️ 주요 건축물</div><div style="font-size:13px;white-space:pre-wrap;line-height:1.7;">${Utils.escHtml(city.buildings)}</div></div>` : ''}
              ${chars.length ? `<div style="margin-top:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">👤 주요 인물</div><div style="display:flex;flex-wrap:wrap;gap:6px;">${chars.map(c => `<button class="btn btn-ghost btn-sm city-link-char" data-id="${Utils.escHtml(c.id)}" style="font-size:12px;">👤 ${Utils.escHtml(c.name || '')}</button>`).join('')}</div></div>` : ''}
              ${comps.length ? `<div style="margin-top:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">🏢 주요 기업</div><div style="display:flex;flex-wrap:wrap;gap:6px;">${comps.map(co => `<button class="btn btn-ghost btn-sm city-link-comp" data-id="${Utils.escHtml(co.id)}" style="font-size:12px;">🏢 ${Utils.escHtml(co.name || '')}</button>`).join('')}</div></div>` : ''}
              ${city.notes ? `<div style="margin-top:8px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">📝 메모</div><div style="font-size:13px;white-space:pre-wrap;line-height:1.7;">${Utils.escHtml(city.notes)}</div></div>` : ''}
            </div>
          </div>`;
        }).join('');

    container.innerHTML = `
    <div class="page active" style="overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;">
      <div class="page-header" style="padding-bottom:0;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackCountries">← 목록</button>
          <div style="font-size:40px;">${Utils.escHtml(item.icon || '🌍')}</div>
          <div style="flex:1;min-width:0;">
            <h2 style="font-size:20px;font-weight:800;color:var(--color-text);margin:0;">${Utils.escHtml(item.name || '이름 없음')}</h2>
            <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;">
              ${[item.govType, item.econType, item.militaryLevel ? '⚔️ ' + item.militaryLevel : ''].filter(Boolean).map(v => `<span style="background:rgba(99,102,241,0.15);border-radius:6px;padding:2px 8px;font-size:11px;">${Utils.escHtml(v)}</span>`).join('')}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button class="btn btn-ghost btn-sm" id="btnEditCountry">편집</button>
            <button class="btn btn-ghost btn-sm" id="btnDelCountry" style="color:var(--color-danger);">삭제</button>
          </div>
        </div>
      </div>

      <!-- 기본 정보 그리드 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
        ${self._statCell('정치체계', item.govType)}
        ${self._statCell('경제체계', item.econType)}
        ${self._statCell('군사력', item.militaryLevel)}
        ${self._statCell('국가원수', item.leader)}
        ${self._statCell('인구', item.population)}
        ${self._statCell('영토', item.territory)}
      </div>

      <!-- 국가 역사 -->
      ${makeSectionHtml('history', '📜', '국가 역사', item.history)}

      <!-- 주요 법률 -->
      ${makeSectionHtml('laws', '⚖️', '주요 법률', item.laws)}

      <!-- 문화 특징 -->
      ${makeSectionHtml('culture', '🎭', '문화 특징', item.culture)}

      <!-- 주요 특징 -->
      ${makeSectionHtml('features', '📌', '주요 특징', item.features)}

      <!-- 국가 관계 -->
      ${relationsSectionHtml}

      <!-- 도시/하위 단위 관리 -->
      <div class="country-section" data-section="cities" style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${citySectionCollapsed ? '0' : '10px'};">
          <button class="section-toggle" data-section="cities"
            style="display:flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;padding:0;color:var(--color-text);">
            <span style="font-weight:700;font-size:13px;color:var(--color-secondary);">🏙️ ${Utils.escHtml(cityLabel)} 관리 (${cities.length})</span>
            <span class="section-chevron" style="font-size:12px;color:var(--color-text-muted);">${citySectionCollapsed ? '▶' : '▼'}</span>
          </button>
          <button class="btn btn-primary btn-sm" id="btnAddCity" style="font-size:11px;">+ ${Utils.escHtml(cityLabel)} 추가</button>
        </div>
        <div class="section-body" style="display:${citySectionCollapsed ? 'none' : 'block'};">
          ${cityListHtml}
        </div>
      </div>

      <!-- 메모 -->
      ${makeSectionHtml('notes', '📝', '메모', item.notes)}

      ${!item.history && !item.laws && !item.culture && !item.features && !relItems.length && !item.relations && !item.notes && cities.length === 0
        ? `<div class="empty-state" style="padding:32px;text-align:center;">
             <div style="font-size:36px;margin-bottom:8px;">✏️</div>
             <div style="font-size:13px;color:var(--color-text-muted);">편집 버튼을 눌러 상세 내용을 작성하세요</div>
           </div>` : ''}

      <div style="height:48px;"></div>
    </div>`;

    // ── Section collapse/expand ────────────────────────────────────────────
    container.querySelectorAll('.section-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.section;
        self._collapsedSections[key] = !self._collapsedSections[key];
        const section = container.querySelector(`.country-section[data-section="${key}"]`);
        if (!section) return;
        const body = section.querySelector('.section-body');
        const chevron = section.querySelector('.section-chevron');
        const collapsed = self._collapsedSections[key];
        if (body) body.style.display = collapsed ? 'none' : 'block';
        if (chevron) chevron.textContent = collapsed ? '▶' : '▼';
        // For city section, also adjust bottom margin
        const cityAddBtn = section.querySelector('#btnAddCity');
        if (cityAddBtn) {
          section.querySelector('.section-toggle')?.closest('div')?.style && (section.firstElementChild.style.marginBottom = collapsed ? '0' : '10px');
        }
      });
    });

    // City collapse
    container.querySelectorAll('.city-collapse-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cityId = btn.dataset.city;
        const key = 'city_' + cityId;
        self._collapsedSections[key] = !self._collapsedSections[key];
        const card = container.querySelector(`.city-card[data-city-id="${cityId}"]`);
        if (!card) return;
        const body = card.querySelector('.city-detail-body');
        const chevron = btn.querySelector('span:last-child');
        const collapsed = self._collapsedSections[key];
        if (body) body.style.display = collapsed ? 'none' : 'block';
        if (chevron) chevron.textContent = collapsed ? '▶' : '▼';
      });
    });

    // ── Navigation ────────────────────────────────────────────────────────
    container.querySelector('#btnBackCountries')?.addEventListener('click', async () => {
      self._currentId = null;
      const updated = await DB.getAll('countries', wid);
      self._renderList(container, updated, wid);
    });
    container.querySelector('#btnEditCountry')?.addEventListener('click', () => {
      self._openForm(container, item, wid, all);
    });
    container.querySelector('#btnDelCountry')?.addEventListener('click', () => {
      Utils.confirm(`"${item.name}" 국가를 삭제하시겠습니까?`, '이 작업은 되돌릴 수 없습니다.', async () => {
        await DB.del('countries', item.id);
        await AppStore.updateStreak();
        await AppStore.recordActivity('countries', false);
        self._currentId = null;
        const updated = await DB.getAll('countries', wid);
        self._renderList(container, updated, wid);
        Utils.toast('삭제되었습니다.');
      });
    });

    // ── Relation navigation ───────────────────────────────────────────────
    container.querySelectorAll('.btn-rel-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = btn.dataset.cid;
        self._currentId = cid;
        const target = all.find(c => c.id === cid);
        if (target) self._renderDetail(container, target, wid, all);
      });
    });

    // ── Character / company links ─────────────────────────────────────────
    container.querySelectorAll('.city-link-char').forEach(btn => {
      btn.addEventListener('click', () => AppRouter.navigate('characters', { highlightId: btn.dataset.id }));
    });
    container.querySelectorAll('.city-link-comp').forEach(btn => {
      btn.addEventListener('click', () => AppRouter.navigate('companies', { highlightId: btn.dataset.id }));
    });

    // ── City add/edit/delete ──────────────────────────────────────────────
    container.querySelector('#btnAddCity')?.addEventListener('click', () => {
      self._openCityForm(container, item, null, wid, allChars, allCompanies, cityLabel);
    });
    container.querySelectorAll('.btn-edit-city').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const city = cities.find(c => c.id === btn.dataset.city);
        if (city) self._openCityForm(container, item, city, wid, allChars, allCompanies, cityLabel);
      });
    });
    container.querySelectorAll('.btn-del-city').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const city = cities.find(c => c.id === btn.dataset.city);
        Utils.confirm(`${cityLabel} 삭제`, `"${city?.name || cityLabel}"를 삭제합니다.`, async () => {
          const updated = { ...item, cities: (item.cities || []).filter(c => c.id !== btn.dataset.city) };
          await DB.put('countries', updated);
          const all2 = await DB.getAll('countries', wid);
          const fresh = all2.find(c => c.id === item.id);
          if (fresh) self._renderDetail(container, fresh, wid, all2);
          Utils.toast('삭제됨', 'info');
        }, '삭제');
      });
    });
  },

  _statCell: function(label, value) {
    if (!value) return '';
    return `<div style="background:var(--color-surface2);border-radius:8px;padding:10px 12px;border:1px solid var(--color-border);">
      <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:2px;">${label}</div>
      <div style="font-size:14px;font-weight:600;color:var(--color-text);">${Utils.escHtml(value)}</div>
    </div>`;
  },

  // ── CITY FORM ─────────────────────────────────────────────────────────────
};
