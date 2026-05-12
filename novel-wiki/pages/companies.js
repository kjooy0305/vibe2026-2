'use strict';
window.Pages = window.Pages || {};
window.Pages.companies = {
  _container: null,
  _currentId: null,
  _listScrollY: 0,

  INDUSTRIES: ['무기 제조','방어구 제조','마법 연구','게이트 관리','의약/치유','정보/첩보','건설/토목','금융/은행','교통/물류','식품/농업','교육/학술','통신/미디어','방위산업','마석 가공','길드 지원','기타'],
  SCALES: ['초소기업','소기업','중소기업','중기업','대기업','초대형','다국적','독점적'],
  ICONS: ['🏢','💼','🏭','⚔️','🛡️','💊','🔬','🏦','🚀','🌐','💎','🔮','⚙️','🗡️','🌿','🔱','🏰','🎯','📡','💰'],

  init: async function(container, options) {
    options = options || {};
    this._container = container;
    const wid = AppStore.getCurrentWorldId();
    if (!wid) {
      container.innerHTML = `
        <div class="empty-state" style="padding:48px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">🏢</div>
          <div style="font-weight:700;font-size:16px;margin-bottom:4px;">세계를 먼저 선택하세요</div>
          <div style="font-size:13px;color:var(--color-text-muted);">홈에서 세계를 선택하거나 새로 만드세요</div>
          <button class="btn btn-primary" style="margin-top:16px;" onclick="AppRouter.navigate('world')">세계 관리</button>
        </div>`;
      return;
    }
    const all = await DB.getAll('companies', wid);
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

    // Sort by rank if present, else by name
    const sorted = [...all].sort((a, b) => {
      const ra = parseInt(a.rank) || 9999;
      const rb = parseInt(b.rank) || 9999;
      if (ra !== rb) return ra - rb;
      return (a.name || '').localeCompare(b.name || '', 'ko');
    });

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">기업</h2>
          <button class="btn btn-primary btn-sm" id="btnAddCompany">+ 기업 추가</button>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          소설 세계의 기업, 규모, 주요 상품/서비스를 기록합니다.
        </p>
      </div>
      ${sorted.length === 0
        ? `<div class="empty-state" style="padding:48px;text-align:center;">
             <div style="font-size:48px;margin-bottom:12px;">🏢</div>
             <div style="font-weight:700;font-size:16px;margin-bottom:4px;">등록된 기업이 없습니다</div>
             <div style="font-size:13px;color:var(--color-text-muted);">+ 버튼으로 첫 번째 기업을 추가하세요</div>
           </div>`
        : `<div style="display:flex;flex-direction:column;gap:8px;">
             ${sorted.map((c, idx) => `
               <button class="card card--interactive company-item" data-id="${Utils.escHtml(c.id)}"
                 style="display:flex;align-items:center;gap:12px;padding:14px 16px;text-align:left;">
                 <div style="font-size:26px;min-width:36px;text-align:center;">${Utils.escHtml(c.icon || '🏢')}</div>
                 <div style="flex:1;min-width:0;">
                   <div style="display:flex;align-items:center;gap:6px;">
                     ${c.rank ? `<span style="font-size:11px;font-weight:800;color:var(--color-secondary);background:rgba(99,102,241,0.15);border-radius:5px;padding:1px 6px;">${Utils.escHtml(c.rank)}위</span>` : ''}
                     <span style="font-weight:700;font-size:15px;color:var(--color-text);">${Utils.escHtml(c.name || '이름 없음')}</span>
                   </div>
                   <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">
                     ${[c.industry, c.scale].filter(Boolean).map(v => Utils.escHtml(v)).join(' · ')}
                   </div>
                 </div>
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:16px;height:16px;color:var(--color-text-muted);flex-shrink:0;">
                   <path d="M9 18l6-6-6-6"/>
                 </svg>
               </button>`).join('')}
           </div>`}
    </div>`;

    setTimeout(() => { container.scrollTop = self._listScrollY || 0; }, 0);

    container.querySelector('#btnAddCompany')?.addEventListener('click', () => {
      self._listScrollY = container.scrollTop;
      self._openForm(container, null, wid, all);
    });
    container.querySelectorAll('.company-item').forEach(btn => {
      btn.addEventListener('click', () => {
        self._listScrollY = container.scrollTop;
        const item = all.find(c => c.id === btn.dataset.id);
        if (item) { self._currentId = item.id; self._renderDetail(container, item, wid, all); }
      });
    });
  },

  _renderDetail: async function(container, item, wid, all) {
    const self = this;
    const products = (item.products || '').trim();
    const desc = (item.desc || '').trim();
    const special = (item.special || '').trim();
    const history = (item.history || '').trim();
    const notes = (item.notes || '').trim();

    container.innerHTML = `
    <div class="page active">
      <div class="page-header" style="padding-bottom:0;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="font-size:48px;">${Utils.escHtml(item.icon || '🏢')}</div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;">
              ${item.rank ? `<span style="font-size:13px;font-weight:800;color:var(--color-secondary);background:rgba(99,102,241,0.15);border-radius:7px;padding:2px 8px;">${Utils.escHtml(item.rank)}위</span>` : ''}
              <h2 style="font-size:20px;font-weight:800;color:var(--color-text);margin:0;">${Utils.escHtml(item.name || '이름 없음')}</h2>
            </div>
            <div style="font-size:13px;color:var(--color-secondary);margin-top:3px;">
              ${[item.industry, item.scale].filter(Boolean).map(v => `<span style="background:rgba(99,102,241,0.15);border-radius:6px;padding:2px 8px;margin-right:4px;">${Utils.escHtml(v)}</span>`).join('')}
            </div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" id="btnEditCompany">편집</button>
            <button class="btn btn-ghost btn-sm" id="btnDelCompany" style="color:var(--color-danger);">삭제</button>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
        ${self._statCell('대표/CEO', item.ceo)}
        ${self._statCell('본사', item.hq)}
        ${self._statCell('창립', item.founded)}
        ${self._statCell('직원 수', item.employees)}
        ${self._statCell('연매출', item.revenue)}
        ${self._statCell('소속 국가', item.country)}
      </div>

      ${products ? self._section('📦 주요 상품/서비스', products) : ''}
      ${desc ? self._section('📋 기업 설명', desc) : ''}
      ${special ? self._section('⭐ 특이사항', special) : ''}
      ${history ? self._section('📜 기업 역사', history) : ''}
      ${notes ? self._section('📝 메모', notes) : ''}

      ${!products && !desc && !special && !history && !notes
        ? `<div class="empty-state" style="padding:32px;text-align:center;">
             <div style="font-size:36px;margin-bottom:8px;">✏️</div>
             <div style="font-size:13px;color:var(--color-text-muted);">편집 버튼을 눌러 상세 내용을 작성하세요</div>
           </div>` : ''}

      <div style="height:32px;"></div>
    </div>`;

    container.querySelector('#btnEditCompany')?.addEventListener('click', () => {
      self._openForm(container, item, wid, all);
    });
    container.querySelector('#btnDelCompany')?.addEventListener('click', () => {
      Utils.confirm(`"${item.name}" 기업을 삭제하시겠습니까?`, '이 작업은 되돌릴 수 없습니다.', async () => {
        await DB.del('companies', item.id);
        await AppStore.updateStreak();
        await AppStore.recordActivity('companies', false);
        self._currentId = null;
        const updated = await DB.getAll('companies', wid);
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
    const currentIcon = item?.icon || '🏢';

    let customIcons = (await DB.getSetting('companyCustomIcons', [])) || [];

    const indOpts = this.INDUSTRIES.map(v =>
      `<option value="${Utils.escHtml(v)}" ${item?.industry === v ? 'selected' : ''}>${Utils.escHtml(v)}</option>`).join('');
    const scaleOpts = this.SCALES.map(v =>
      `<option value="${Utils.escHtml(v)}" ${item?.scale === v ? 'selected' : ''}>${Utils.escHtml(v)}</option>`).join('');

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
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">기업명 *</label>
          <input class="form-input" id="fName" value="${Utils.escHtml(item?.name||'')}" placeholder="기업명을 입력하세요"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">업종</label>
            <select class="form-input" id="fIndustry"><option value="">선택</option>${indOpts}</select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">규모</label>
            <select class="form-input" id="fScale"><option value="">선택</option>${scaleOpts}</select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">기업 순위</label>
            <input class="form-input" id="fRank" type="number" min="1" value="${Utils.escHtml(item?.rank||'')}" placeholder="예: 1"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">대표/CEO</label>
            <input class="form-input" id="fCeo" value="${Utils.escHtml(item?.ceo||'')}" placeholder="대표자 이름"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">본사 위치</label>
            <input class="form-input" id="fHq" value="${Utils.escHtml(item?.hq||'')}" placeholder="본사 국가/도시"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">창립</label>
            <input class="form-input" id="fFounded" value="${Utils.escHtml(item?.founded||'')}" placeholder="예: 게이트 출현 이후 5년"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">직원 수</label>
            <input class="form-input" id="fEmployees" value="${Utils.escHtml(item?.employees||'')}" placeholder="예: 약 5만 명"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">연매출</label>
            <input class="form-input" id="fRevenue" value="${Utils.escHtml(item?.revenue||'')}" placeholder="예: 조 단위"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">소속 국가</label>
            <input class="form-input" id="fCountry" value="${Utils.escHtml(item?.country||'')}" placeholder="소속 국가"/>
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">📦 주요 상품/서비스</label>
          <textarea class="form-input" id="fProducts" rows="3" placeholder="주력 상품, 서비스, 독점 기술 등...">${Utils.escHtml(item?.products||'')}</textarea>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">📋 기업 설명</label>
          <textarea class="form-input" id="fDesc" rows="3" placeholder="기업 개요, 목표, 특징...">${Utils.escHtml(item?.desc||'')}</textarea>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">⭐ 특이사항</label>
          <textarea class="form-input" id="fSpecial" rows="2" placeholder="숨겨진 사업, 비밀 연구, 정치적 영향력 등...">${Utils.escHtml(item?.special||'')}</textarea>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">📜 기업 역사</label>
          <textarea class="form-input" id="fHistory" rows="2" placeholder="창립 배경, 주요 사건, 성장 과정...">${Utils.escHtml(item?.history||'')}</textarea>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">📝 메모</label>
          <textarea class="form-input" id="fNotes" rows="2" placeholder="기타 메모...">${Utils.escHtml(item?.notes||'')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '기업 편집' : '기업 추가', body, async () => {
      const name = document.getElementById('fName')?.value.trim();
      if (!name) { Utils.toast('기업명을 입력하세요.'); return false; }

      const icon = document.querySelector('#iconDisplay')?.dataset.icon || item?.icon || '🏢';
      const payload = {
        id: item?.id,
        worldId: wid,
        name,
        icon,
        industry: document.getElementById('fIndustry')?.value || '',
        scale: document.getElementById('fScale')?.value || '',
        rank: document.getElementById('fRank')?.value.trim() || '',
        ceo: document.getElementById('fCeo')?.value.trim() || '',
        hq: document.getElementById('fHq')?.value.trim() || '',
        founded: document.getElementById('fFounded')?.value.trim() || '',
        employees: document.getElementById('fEmployees')?.value.trim() || '',
        revenue: document.getElementById('fRevenue')?.value.trim() || '',
        country: document.getElementById('fCountry')?.value.trim() || '',
        products: document.getElementById('fProducts')?.value.trim() || '',
        desc: document.getElementById('fDesc')?.value.trim() || '',
        special: document.getElementById('fSpecial')?.value.trim() || '',
        history: document.getElementById('fHistory')?.value.trim() || '',
        notes: document.getElementById('fNotes')?.value.trim() || '',
      };

      const saved = await DB.put('companies', payload);
      await AppStore.updateStreak();
      await AppStore.recordActivity('companies', !isEdit);
      self._currentId = saved.id;
      const updated = await DB.getAll('companies', wid);
      Utils.toast(isEdit ? '수정되었습니다.' : '기업이 추가되었습니다.');
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
            await DB.setSetting('companyCustomIcons', customIcons);
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
          await DB.setSetting('companyCustomIcons', customIcons);
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
