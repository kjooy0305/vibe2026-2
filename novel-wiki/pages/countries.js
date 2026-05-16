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
};
