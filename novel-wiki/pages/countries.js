'use strict';
window.Pages = window.Pages || {};
window.Pages.countries = {
  _container: null,
  _currentId: null,
  _listScrollY: 0,

  GOV_TYPES: ['민주주의','군주제','제정','연방제','전체주의','공화국','신정국가','과두제','기타'],
  ECON_TYPES: ['자본주의','사회주의','공산주의','혼합경제','계획경제','봉건경제','기타'],
  MILITARY_LEVELS: ['최강','강','중','약','최약','미상'],
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

  _renderList: function(container, all, wid) {
    this._currentId = null;
    const self = this;
    all = [...all].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">국가</h2>
          <button class="btn btn-primary btn-sm" id="btnAddCountry">+ 국가 추가</button>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          소설 세계의 국가별 특징, 법률, 정치 체계를 기록합니다.
        </p>
      </div>
      ${all.length === 0
        ? `<div class="empty-state" style="padding:48px;text-align:center;">
             <div style="font-size:48px;margin-bottom:12px;">🏛️</div>
             <div style="font-weight:700;font-size:16px;margin-bottom:4px;">등록된 국가가 없습니다</div>
             <div style="font-size:13px;color:var(--color-text-muted);">+ 버튼으로 첫 번째 국가를 추가하세요</div>
           </div>`
        : `<div style="display:flex;flex-direction:column;gap:8px;">
             ${all.map(c => `
               <button class="card card--interactive country-item" data-id="${Utils.escHtml(c.id)}"
                 style="display:flex;align-items:center;gap:12px;padding:14px 16px;text-align:left;">
                 <div style="font-size:28px;min-width:36px;text-align:center;">${Utils.escHtml(c.icon || '🌍')}</div>
                 <div style="flex:1;min-width:0;">
                   <div style="font-weight:700;font-size:15px;color:var(--color-text);">${Utils.escHtml(c.name || '이름 없음')}</div>
                   <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">
                     ${c.govType ? Utils.escHtml(c.govType) : ''}${c.capital ? ' · 수도: ' + Utils.escHtml(c.capital) : ''}
                   </div>
                 </div>
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;color:var(--color-text-muted);flex-shrink:0;">
                   <path d="M9 18l6-6-6-6"/>
                 </svg>
               </button>`).join('')}
           </div>`}
    </div>`;

    setTimeout(() => { container.scrollTop = self._listScrollY || 0; }, 0);

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

  _renderDetail: async function(container, item, wid, all) {
    const self = this;
    const laws = (item.laws || '').trim();
    const culture = (item.culture || '').trim();
    const features = (item.features || '').trim();
    const notes = (item.notes || '').trim();
    const relations = (item.relations || '').trim();

    container.innerHTML = `
    <div class="page active">
      <div class="page-header" style="padding-bottom:0;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="font-size:48px;">${Utils.escHtml(item.icon || '🌍')}</div>
          <div style="flex:1;">
            <h2 style="font-size:20px;font-weight:800;color:var(--color-text);margin:0;">${Utils.escHtml(item.name || '이름 없음')}</h2>
            <div style="font-size:13px;color:var(--color-secondary);margin-top:3px;">
              ${[item.govType, item.econType].filter(Boolean).map(v => `<span style="background:rgba(99,102,241,0.15);border-radius:6px;padding:2px 8px;margin-right:4px;">${Utils.escHtml(v)}</span>`).join('')}
            </div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" id="btnEditCountry">편집</button>
            <button class="btn btn-ghost btn-sm" id="btnDelCountry" style="color:var(--color-danger);">삭제</button>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
        ${self._statCell('수도', item.capital)}
        ${self._statCell('인구', item.population)}
        ${self._statCell('영토', item.territory)}
        ${self._statCell('군사력', item.militaryLevel)}
        ${self._statCell('경제체계', item.econType)}
        ${self._statCell('국가원수', item.leader)}
      </div>

      ${laws ? self._section('⚖️ 주요 법률', laws) : ''}
      ${culture ? self._section('🎭 문화 특징', culture) : ''}
      ${features ? self._section('📌 주요 특징', features) : ''}
      ${relations ? self._section('🤝 국가 관계', relations) : ''}
      ${notes ? self._section('📝 메모', notes) : ''}

      ${!laws && !culture && !features && !relations && !notes
        ? `<div class="empty-state" style="padding:32px;text-align:center;">
             <div style="font-size:36px;margin-bottom:8px;">✏️</div>
             <div style="font-size:13px;color:var(--color-text-muted);">편집 버튼을 눌러 상세 내용을 작성하세요</div>
           </div>` : ''}

      <div style="height:32px;"></div>
    </div>`;

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
  },

  _statCell: function(label, value) {
    if (!value) return '';
    return `<div style="background:var(--color-surface2);border-radius:8px;padding:10px 12px;border:1px solid var(--color-border);">
      <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:2px;">${label}</div>
      <div style="font-size:14px;font-weight:600;color:var(--color-text);">${Utils.escHtml(value)}</div>
    </div>`;
  },

  _section: function(title, content) {
    return `<div style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;margin-bottom:10px;border:1px solid var(--color-border);">
      <div style="font-weight:700;font-size:13px;color:var(--color-secondary);margin-bottom:8px;">${title}</div>
      <div style="font-size:13px;color:var(--color-text);line-height:1.8;white-space:pre-wrap;">${Utils.escHtml(content)}</div>
    </div>`;
  },

  _buildIconGrid: function(presets, customs, currentIcon) {
    const presetHtml = presets.map(ic =>
      `<button type="button" class="icon-pick-btn" data-icon="${ic}" data-custom="0"
        style="font-size:22px;padding:6px;border-radius:8px;border:2px solid ${currentIcon===ic?'var(--color-primary)':'transparent'};background:none;cursor:pointer;">${ic}</button>`
    ).join('');
    const customHtml = customs.map(ic =>
      `<span style="position:relative;display:inline-block;">
        <button type="button" class="icon-pick-btn" data-icon="${ic}" data-custom="1"
          style="font-size:22px;padding:6px;border-radius:8px;border:2px solid ${currentIcon===ic?'var(--color-primary)':'transparent'};background:none;cursor:pointer;">${ic}</button>
        <button type="button" class="icon-del-btn" data-icon="${ic}"
          style="position:absolute;top:-4px;right:-4px;font-size:10px;width:16px;height:16px;border-radius:50%;background:var(--color-danger);color:#fff;border:none;cursor:pointer;line-height:16px;text-align:center;padding:0;">×</button>
      </span>`
    ).join('');
    return presetHtml + (customHtml ? `<div style="width:100%;height:1px;background:var(--color-border);margin:6px 0;"></div>${customHtml}` : '');
  },

  _openForm: async function(container, item, wid, all) {
    const self = this;
    const isEdit = !!item;
    const currentIcon = item?.icon || '🌍';

    let customIcons = (await DB.getSetting('countryCustomIcons', [])) || [];

    const govOpts = this.GOV_TYPES.map(v =>
      `<option value="${Utils.escHtml(v)}" ${item?.govType === v ? 'selected' : ''}>${Utils.escHtml(v)}</option>`).join('');
    const econOpts = this.ECON_TYPES.map(v =>
      `<option value="${Utils.escHtml(v)}" ${item?.econType === v ? 'selected' : ''}>${Utils.escHtml(v)}</option>`).join('');
    const milOpts = this.MILITARY_LEVELS.map(v =>
      `<option value="${Utils.escHtml(v)}" ${item?.militaryLevel === v ? 'selected' : ''}>${Utils.escHtml(v)}</option>`).join('');

    const body = `
      <div style="padding:4px 0 12px;">
        <div style="margin-bottom:14px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:6px;">아이콘</label>
          <div id="iconDisplay" style="font-size:36px;text-align:center;margin-bottom:8px;">${currentIcon}</div>
          <div id="iconGrid" style="display:flex;flex-wrap:wrap;gap:4px;">${self._buildIconGrid(self.ICONS, customIcons, currentIcon)}</div>
          <div style="display:flex;gap:6px;margin-top:8px;align-items:center;">
            <input id="fCustomIcon" class="form-input" placeholder="이모지 직접 입력 후 추가" style="flex:1;font-size:18px;"/>
            <button type="button" id="btnAddIcon" class="btn btn-ghost btn-sm" style="white-space:nowrap;">+ 추가</button>
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">국가명 *</label>
          <input class="form-input" id="fName" value="${Utils.escHtml(item?.name||'')}" placeholder="국가명을 입력하세요"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">정치체계</label>
            <select class="form-input" id="fGovType"><option value="">선택</option>${govOpts}</select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">경제체계</label>
            <select class="form-input" id="fEconType"><option value="">선택</option>${econOpts}</select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">수도</label>
            <input class="form-input" id="fCapital" value="${Utils.escHtml(item?.capital||'')}" placeholder="수도"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">국가원수</label>
            <input class="form-input" id="fLeader" value="${Utils.escHtml(item?.leader||'')}" placeholder="왕/대통령 등"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">인구</label>
            <input class="form-input" id="fPopulation" value="${Utils.escHtml(item?.population||'')}" placeholder="예: 5천만 명"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">영토 크기</label>
            <input class="form-input" id="fTerritory" value="${Utils.escHtml(item?.territory||'')}" placeholder="예: 한반도 2배"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">군사력</label>
            <select class="form-input" id="fMilitary"><option value="">선택</option>${milOpts}</select>
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">⚖️ 주요 법률</label>
          <textarea class="form-input" id="fLaws" rows="3" placeholder="소설에서 언급할 만한 법률, 규제, 금지 사항 등...">${Utils.escHtml(item?.laws||'')}</textarea>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">🎭 문화 특징</label>
          <textarea class="form-input" id="fCulture" rows="3" placeholder="관습, 종교, 축제, 음식, 언어 등 문화적 특징...">${Utils.escHtml(item?.culture||'')}</textarea>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">📌 주요 특징</label>
          <textarea class="form-input" id="fFeatures" rows="3" placeholder="국가의 주요 특징, 강점, 약점, 역사적 사건 등...">${Utils.escHtml(item?.features||'')}</textarea>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">🤝 국가 관계</label>
          <textarea class="form-input" id="fRelations" rows="2" placeholder="동맹국, 적대국, 중립국 관계 등...">${Utils.escHtml(item?.relations||'')}</textarea>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">📝 메모</label>
          <textarea class="form-input" id="fNotes" rows="2" placeholder="기타 메모...">${Utils.escHtml(item?.notes||'')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '국가 편집' : '국가 추가', body, async () => {
      const name = document.getElementById('fName')?.value.trim();
      if (!name) { Utils.toast('국가명을 입력하세요.'); return false; }

      const icon = document.querySelector('#iconDisplay')?.dataset.icon || item?.icon || '🌍';
      const payload = {
        id: item?.id,
        worldId: wid,
        name,
        icon,
        govType: document.getElementById('fGovType')?.value || '',
        econType: document.getElementById('fEconType')?.value || '',
        capital: document.getElementById('fCapital')?.value.trim() || '',
        leader: document.getElementById('fLeader')?.value.trim() || '',
        population: document.getElementById('fPopulation')?.value.trim() || '',
        territory: document.getElementById('fTerritory')?.value.trim() || '',
        militaryLevel: document.getElementById('fMilitary')?.value || '',
        laws: document.getElementById('fLaws')?.value.trim() || '',
        culture: document.getElementById('fCulture')?.value.trim() || '',
        features: document.getElementById('fFeatures')?.value.trim() || '',
        relations: document.getElementById('fRelations')?.value.trim() || '',
        notes: document.getElementById('fNotes')?.value.trim() || '',
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

    // Icon picker
    setTimeout(() => {
      const display = document.getElementById('iconDisplay');
      if (display) display.dataset.icon = currentIcon;

      function bindIconEvents() {
        document.querySelectorAll('.icon-pick-btn').forEach(btn => {
          btn.onclick = () => {
            document.querySelectorAll('.icon-pick-btn').forEach(b => b.style.borderColor = 'transparent');
            btn.style.borderColor = 'var(--color-primary)';
            if (display) { display.textContent = btn.dataset.icon; display.dataset.icon = btn.dataset.icon; }
          };
        });
        document.querySelectorAll('.icon-del-btn').forEach(btn => {
          btn.onclick = async (e) => {
            e.stopPropagation();
            const ic = btn.dataset.icon;
            customIcons = customIcons.filter(x => x !== ic);
            await DB.setSetting('countryCustomIcons', customIcons);
            const grid = document.getElementById('iconGrid');
            if (grid) {
              const sel = display?.dataset.icon || currentIcon;
              grid.innerHTML = self._buildIconGrid(self.ICONS, customIcons, sel);
              bindIconEvents();
            }
          };
        });
      }
      bindIconEvents();

      document.getElementById('btnAddIcon')?.addEventListener('click', async () => {
        const val = document.getElementById('fCustomIcon')?.value.trim();
        if (!val) return;
        if (!customIcons.includes(val)) {
          customIcons = [...customIcons, val];
          await DB.setSetting('countryCustomIcons', customIcons);
        }
        const grid = document.getElementById('iconGrid');
        if (grid) {
          const sel = display?.dataset.icon || currentIcon;
          grid.innerHTML = self._buildIconGrid(self.ICONS, customIcons, sel);
          bindIconEvents();
        }
        const inp = document.getElementById('fCustomIcon');
        if (inp) inp.value = '';
      });
    }, 50);
  },

  destroy: function() {},
};
