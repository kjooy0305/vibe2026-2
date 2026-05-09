'use strict';
window.Pages = window.Pages || {};
window.Pages.constellations = {
  _currentId: null,
  _container: null,

  // 계열 (category type of constellation) - used for grouping
  SERIES: ['멸망성좌', '타락성좌', '일반성좌', '성운성좌', '은하성좌'],
  // 등급 (deity rank)
  TIERS: ['절대신(개념신)', '최상급(업적신)', '중급(숭배신)', '하급(반신)'],

  // 9대 성좌 담당 영역
  NINE_GREAT_DOMAINS: ['불', '물', '바람', '땅', '희(기쁨)', '노(분노)', '애(슬픔)', '락(즐거움)', '마나'],

  SERIES_COLORS: {
    '멸망성좌': '#ef4444',
    '타락성좌': '#f97316',
    '일반성좌': '#3b82f6',
    '성운성좌': '#8b5cf6',
    '은하성좌': '#fbbf24',
  },
  TIER_COLORS: {
    '절대신(개념신)': '#fbbf24',
    '최상급(업적신)': '#f43f5e',
    '중급(숭배신)': '#a855f7',
    '하급(반신)': '#3b82f6',
  },

  _seriesColor: function(series) {
    return this.SERIES_COLORS[series] || '#94a3b8';
  },
  _tierColor: function(tier) {
    return this.TIER_COLORS[tier] || '#94a3b8';
  },

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

    if (options.highlightId) this._currentId = options.highlightId;
    const constellations = await DB.getAll('constellations', wid);

    if (this._currentId) {
      const c = constellations.find(x => x.id === this._currentId);
      if (c) { this._renderDetail(container, c, wid); return; }
    }

    this._renderList(container, constellations, wid);
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  },

  // ── LIST ────────────────────────────────────────────────────────────────────

  _renderList: function(container, constellations, wid) {
    this._currentId = null;
    const world = AppStore.getState().currentWorld;
    const self = this;

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">성좌</h2>
          <button class="btn btn-primary btn-sm" id="btnAddConst">+ 추가</button>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${constellations.length}개
        </p>
        <input class="input-field" id="constFilter" placeholder="이름, 계열, 등급, 담당 영역 검색..." style="margin-top:8px;width:100%;box-sizing:border-box;" />
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;" id="seriesFilters">
          <button class="const-series-chip active" data-series="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-primary);color:#000;font-size:11px;cursor:pointer;">전체</button>
          ${this.SERIES.map(s => {
            const col = this._seriesColor(s);
            return `<button class="const-series-chip" data-series="${Utils.escHtml(s)}" style="padding:3px 8px;border-radius:4px;border:1px solid ${col}66;background:transparent;color:${col};font-size:11px;cursor:pointer;">${Utils.escHtml(s)}</button>`;
          }).join('')}
        </div>
      </div>

      <div style="background:linear-gradient(135deg,rgba(0,188,212,0.06),rgba(124,58,237,0.08));border:1px solid rgba(100,150,255,0.18);border-radius:10px;padding:10px 14px;margin:0 0 12px;">
        <div style="font-size:10px;color:var(--color-text-muted);font-weight:700;letter-spacing:0.5px;margin-bottom:6px;">9대 성좌 담당 영역</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">
          ${this.NINE_GREAT_DOMAINS.map((d, i) => `<span style="padding:2px 7px;border-radius:4px;background:rgba(100,150,255,0.1);border:1px solid rgba(100,150,255,0.2);font-size:11px;color:var(--color-text-muted);">${i + 1}. ${d}</span>`).join('')}
        </div>
      </div>

      <div id="constList"></div>
    </div>`;

    this._renderGroupedList(container, constellations, wid, '', '');

    let activeFilter = '';
    container.querySelectorAll('.const-series-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.const-series-chip').forEach(b => {
          b.classList.remove('active');
          const col = b.dataset.series ? self._seriesColor(b.dataset.series) : '';
          b.style.background = 'transparent';
          b.style.color = col || 'var(--color-text-muted)';
        });
        btn.classList.add('active');
        btn.style.background = btn.dataset.series ? self._seriesColor(btn.dataset.series) : 'var(--color-primary)';
        btn.style.color = '#000';
        activeFilter = btn.dataset.series;
        self._renderGroupedList(container, constellations, wid, document.getElementById('constFilter')?.value || '', activeFilter);
      });
    });

    document.getElementById('constFilter')?.addEventListener('input', e => {
      self._renderGroupedList(container, constellations, wid, e.target.value, activeFilter);
    });

    document.getElementById('btnAddConst')?.addEventListener('click', () => {
      self._openForm(null, wid, container);
    });
  },

  _renderGroupedList: function(container, constellations, wid, query, seriesFilter) {
    const self = this;
    const q = (query || '').toLowerCase();
    const listEl = document.getElementById('constList');
    if (!listEl) return;

    let filtered = constellations.filter(c => {
      const searchText = [c.name, c.series, c.tier, c.domain, c.features].filter(Boolean).join(' ').toLowerCase();
      const textOk = !q || searchText.includes(q);
      const seriesOk = !seriesFilter || c.series === seriesFilter;
      return textOk && seriesOk;
    });

    if (!filtered.length) {
      listEl.innerHTML = `<div class="empty-state" style="padding:48px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">⭐</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:4px;">성좌가 없습니다</div>
        <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 첫 성좌를 등록하세요</div>
      </div>`;
      return;
    }

    // Group by series
    const groups = {};
    const ORDER = ['은하성좌', '성운성좌', '일반성좌', '타락성좌', '멸망성좌', ''];
    filtered.forEach(c => {
      const key = c.series || '';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });

    let html = '';
    ORDER.forEach(key => {
      if (!groups[key]) return;
      const col = key ? self._seriesColor(key) : '#94a3b8';
      html += `<div style="margin-bottom:4px;">
        ${key ? `<div style="font-size:11px;font-weight:700;color:${col};padding:6px 4px 4px;border-bottom:1px solid ${col}44;margin-bottom:8px;letter-spacing:0.5px;">${key} (${groups[key].length})</div>` : ''}
        ${groups[key].map(c => self._constCard(c)).join('')}
      </div>`;
    });

    listEl.innerHTML = html;

    listEl.querySelectorAll('.const-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-const') || e.target.closest('.btn-copy-const')) return;
        const id = card.dataset.id;
        DB.getAll('constellations', wid).then(all => {
          const c = all.find(x => x.id === id);
          if (c) { self._currentId = c.id; self._renderDetail(container, c, wid); }
        });
      });
    });

    listEl.querySelectorAll('.btn-del-const').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const c = constellations.find(x => x.id === id);
        Utils.confirm(
          `"${c?.name || '이 성좌'}" 삭제`,
          '삭제하시겠습니까?',
          async () => {
            await DB.del('constellations', id);
            Utils.toast('삭제됨', 'info');
            self.init(container);
          }
        );
      });
    });

    listEl.querySelectorAll('.btn-copy-const').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const c = constellations.find(x => x.id === btn.dataset.id);
        if (!c) return;
        const worlds = AppStore.getState().worlds.filter(w => w.id !== wid);
        if (!worlds.length) { Utils.toast('다른 세계가 없습니다', 'error'); return; }
        const body = `<div class="form-group"><label class="form-label">복사할 세계 선택</label>
          <select class="select-input" id="copyConstWorld" style="width:100%;">
            ${worlds.map(w => `<option value="${Utils.escHtml(w.id)}">${Utils.escHtml(w.name)}</option>`).join('')}
          </select></div>`;
        Utils.openModal('다른 세계로 복사', body, async () => {
          const tid = document.getElementById('copyConstWorld')?.value;
          if (!tid) return false;
          await DB.put('constellations', { ...c, id: DB.genId(), worldId: tid, createdAt: Date.now(), updatedAt: Date.now() });
          Utils.toast('복사됨', 'success');
          return true;
        }, '복사');
      });
    });
  },

  _constCard: function(c) {
    const sc = this._seriesColor(c.series || '');
    const tc = this._tierColor(c.tier || '');

    return `
    <div class="const-card list-item list-item--full"
      data-id="${Utils.escHtml(c.id)}"
      style="cursor:pointer;border-left:3px solid ${sc};display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:linear-gradient(135deg,var(--color-surface2,#1a2535) 70%,${sc}0a 100%);border-radius:10px;border-top:1px solid var(--color-border);border-right:1px solid var(--color-border);border-bottom:1px solid var(--color-border);margin-bottom:8px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-10px;right:-10px;width:60px;height:60px;background:radial-gradient(circle,${sc}18 0%,transparent 70%);pointer-events:none;"></div>
      <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,rgba(0,0,0,0.3),${sc}22);border:1px solid ${sc}44;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">
        ${c.icon ? Utils.escHtml(c.icon) : '⭐'}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
          <span style="font-weight:800;font-size:14px;">${Utils.escHtml(c.name || '이름 없음')}</span>
          ${c.series ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${sc}22;color:${sc};border:1px solid ${sc}55;">${Utils.escHtml(c.series)}</span>` : ''}
          ${c.tier ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${tc}22;color:${tc};border:1px solid ${tc}44;">${Utils.escHtml(c.tier)}</span>` : ''}
        </div>
        ${c.domain ? `<div style="font-size:12px;color:var(--color-text-muted);">담당: ${Utils.escHtml(c.domain)}</div>` : ''}
        ${c.hierarchy !== undefined && c.hierarchy !== '' ? `<div style="font-size:11px;color:var(--color-text-dim);">위계: ${Utils.escHtml(String(c.hierarchy))}</div>` : ''}
        ${c.features ? `<div style="font-size:12px;color:var(--color-text-dim);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(c.features)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end;">
        <button class="btn btn-ghost btn-sm btn-copy-const" data-id="${Utils.escHtml(c.id)}" style="font-size:11px;">복사</button>
        <button class="btn btn-ghost btn-sm btn-del-const" data-id="${Utils.escHtml(c.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  // ── DETAIL ──────────────────────────────────────────────────────────────────

  _renderDetail: async function(container, c, wid) {
    const sc = this._seriesColor(c.series || '');
    const tc = this._tierColor(c.tier || '');

    const chars = await DB.getAll('characters', wid);

    const renderCharLinks = (ids, label) => {
      if (!ids || !ids.length) return '';
      const linked = ids.map(id => chars.find(ch => ch.id === id)).filter(Boolean);
      if (!linked.length) return '';
      return `<div style="margin-bottom:8px;">
        <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">${label}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${linked.map(ch => `<button class="btn btn-ghost btn-sm" onclick="AppRouter.navigate('characters',{highlightId:'${Utils.escHtml(ch.id)}'})"
            style="font-size:12px;display:inline-flex;align-items:center;gap:4px;">
            ${ch.image ? `<img src="${ch.image}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;" />` : '👤'}
            ${Utils.escHtml(ch.name)}
          </button>`).join('')}
        </div>
      </div>`;
    };

    const contractorsHTML = renderCharLinks(c.contractors || [], '계약자');
    const provisionalHTML = renderCharLinks(c.provisionalContractors || [], '가계약자');
    const linkedHTML = renderCharLinks(c.linkedCharacterIds || [], '연관 캐릭터');

    container.innerHTML = `
    <div class="page active">
      <div class="page-header" style="border-left:4px solid ${sc};padding-left:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackConst">← 목록</button>
          <h2 class="page-title" style="margin:0;font-size:18px;">${Utils.escHtml(c.name || '성좌')}</h2>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditConst">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnCopyConstText">텍스트 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnDelConstDetail" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      <div style="background:radial-gradient(ellipse at top right,${sc}14 0%,var(--color-surface2,#1a2535) 60%);border:1px solid ${sc}44;border-radius:14px;padding:20px;margin-bottom:16px;box-shadow:0 0 28px ${sc}12;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-30px;right:-30px;width:140px;height:140px;background:radial-gradient(circle,${sc}1a,transparent 70%);pointer-events:none;"></div>

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,rgba(0,0,0,0.4),${sc}28);border:1px solid ${sc}44;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">
            ${c.icon ? Utils.escHtml(c.icon) : '⭐'}
          </div>
          <div>
            <div style="font-size:20px;font-weight:800;">${Utils.escHtml(c.name || '')}</div>
            ${c.hierarchy !== undefined && c.hierarchy !== '' ? `<div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">위계: ${Utils.escHtml(String(c.hierarchy))}</div>` : ''}
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
          ${c.series ? `<span style="padding:2px 10px;border-radius:4px;font-size:12px;background:${sc}22;color:${sc};border:1px solid ${sc}55;">계열: ${Utils.escHtml(c.series)}</span>` : ''}
          ${c.tier ? `<span style="padding:2px 10px;border-radius:4px;font-size:12px;background:${tc}22;color:${tc};border:1px solid ${tc}44;">등급: ${Utils.escHtml(c.tier)}</span>` : ''}
          ${c.domain ? `<span style="padding:2px 10px;border-radius:4px;font-size:12px;background:rgba(124,58,237,0.12);color:#c4b5fd;border:1px solid rgba(124,58,237,0.25);">담당: ${Utils.escHtml(c.domain)}</span>` : ''}
        </div>

        ${c.appearance ? `<div style="margin-bottom:12px;">
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:3px;">외형</div>
          <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.appearance))}</div>
        </div>` : ''}

        ${c.features ? `<div style="margin-bottom:12px;">
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:3px;">특징</div>
          <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.features))}</div>
        </div>` : ''}
      </div>

      ${c.abilities ? `<div style="background:rgba(0,188,212,0.05);border:1px solid rgba(0,188,212,0.2);border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:6px;">능력</div>
        <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.abilities))}</div>
      </div>` : ''}

      ${c.weaknesses ? `<div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="font-size:11px;color:var(--color-danger);font-weight:700;margin-bottom:6px;">약점</div>
        <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.weaknesses))}</div>
      </div>` : ''}

      ${(contractorsHTML || provisionalHTML || linkedHTML) ? `
        <div style="background:var(--color-surface2);border-radius:10px;padding:14px;margin-bottom:12px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:700;margin-bottom:8px;">연관 캐릭터</div>
          ${contractorsHTML}
          ${provisionalHTML}
          ${linkedHTML}
        </div>` : ''}

      ${c.authorNotes ? `<div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:16px;">
        <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:4px;">작가 전용 메모</div>
        <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.authorNotes))}</div>
      </div>` : ''}

      <div style="font-size:11px;color:var(--color-text-dim);text-align:right;">
        수정: ${Utils.formatDate(c.updatedAt)} · 생성: ${Utils.formatDate(c.createdAt)}
      </div>
    </div>`;

    document.getElementById('btnBackConst')?.addEventListener('click', () => { this._currentId = null; this.init(container); });
    document.getElementById('btnEditConst')?.addEventListener('click', () => this._openForm(c, wid, container));
    document.getElementById('btnDelConstDetail')?.addEventListener('click', () => {
      Utils.confirm(`"${c.name}" 삭제`, '삭제하시겠습니까?', async () => {
        await DB.del('constellations', c.id);
        Utils.toast('삭제됨', 'info');
        this._currentId = null;
        this.init(container);
      });
    });
    document.getElementById('btnCopyConstText')?.addEventListener('click', () => {
      const text = Utils.toTextExport(`성좌: ${c.name}`, [
        ['계열', c.series],
        ['등급', c.tier],
        ['위계', c.hierarchy],
        ['담당 영역', c.domain],
        ['외형', c.appearance],
        ['특징', c.features],
        ['능력', c.abilities],
        ['약점', c.weaknesses],
      ]);
      Utils.copyText(text);
    });
  },

  // ── FORM ────────────────────────────────────────────────────────────────────

  _openForm: async function(constellation, wid, container) {
    const isEdit = !!constellation;
    const c = constellation || {};
    const self = this;

    const chars = await DB.getAll('characters', wid);
    const contractorIds = new Set(c.contractors || []);
    const provisionalIds = new Set(c.provisionalContractors || []);
    const linkedIds = new Set(c.linkedCharacterIds || []);

    const ICON_OPTIONS = ['⭐','🌟','💫','✨','🔥','❄️','⚡','🌊','🌪️','🌑','☀️','🌙','🌌','👁️','⚔️','🐉','🦋','🔱','👑','💀'];
    let selectedIcon = c.icon || '⭐';

    const seriesOpts = ['', ...this.SERIES].map(s =>
      `<option value="${Utils.escHtml(s)}" ${(c.series || '') === s ? 'selected' : ''}>${s || '선택 안 함'}</option>`).join('');
    const tierOpts = ['', ...this.TIERS].map(t =>
      `<option value="${Utils.escHtml(t)}" ${(c.tier || '') === t ? 'selected' : ''}>${t || '선택 안 함'}</option>`).join('');

    const charSearch = chars.length > 5 ? `<input class="input-field" id="constCharSearch" placeholder="캐릭터 검색..." style="margin-bottom:6px;font-size:12px;" />` : '';

    const charCheckboxes = (label, typeKey, selectedSet) => chars.length === 0
      ? ''
      : `<div style="margin-bottom:10px;">
          <div style="font-size:12px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">${label}</div>
          <div style="max-height:100px;overflow-y:auto;border:1px solid var(--color-border);border-radius:6px;padding:6px;">
            ${chars.map(ch => `<label class="const-char-label" style="display:flex;align-items:center;gap:6px;padding:3px 0;cursor:pointer;" data-charname="${Utils.escHtml(ch.name.toLowerCase())}">
              <input type="checkbox" class="const-char-cb" data-type="${typeKey}" data-chid="${Utils.escHtml(ch.id)}" ${selectedSet.has(ch.id) ? 'checked' : ''} style="flex-shrink:0;" />
              <span style="font-size:12px;">${Utils.escHtml(ch.name)}</span>
            </label>`).join('')}
          </div>
        </div>`;

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;max-height:72vh;overflow-y:auto;padding-right:4px;">
        <div class="form-group">
          <label class="form-label">이름 *</label>
          <input class="input-field" id="fCsName" value="${Utils.escHtml(c.name || '')}" placeholder="성좌 이름" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">아이콘</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;" id="constIconPicker">
            ${ICON_OPTIONS.map(ic => `<button type="button" class="const-icon-btn" data-icon="${ic}"
              style="font-size:20px;width:36px;height:36px;border:2px solid ${selectedIcon === ic ? 'var(--color-primary)' : 'transparent'};border-radius:8px;background:var(--color-surface);cursor:pointer;">${ic}</button>`).join('')}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">계열</label>
            <select class="select-input" id="fCsSeries" style="width:100%;">${seriesOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label">등급</label>
            <select class="select-input" id="fCsTier" style="width:100%;">${tierOpts}</select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">위계</label>
            <input class="input-field" id="fCsHierarchy" value="${Utils.escHtml(c.hierarchy !== undefined ? String(c.hierarchy) : '')}" placeholder="예: 1위" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">담당 영역</label>
            <input class="input-field" id="fCsDomain" value="${Utils.escHtml(c.domain || '')}" placeholder="예: 불, 마나" style="width:100%;box-sizing:border-box;" />
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
        ${chars.length > 0 ? `
        <div class="form-group">
          <label class="form-label">연관 캐릭터</label>
          ${charSearch}
          ${charCheckboxes('계약자', 'contractor', contractorIds)}
          ${charCheckboxes('가계약자', 'provisional', provisionalIds)}
          ${charCheckboxes('기타 연관', 'linked', linkedIds)}
        </div>` : ''}
        <div class="form-group">
          <label class="form-label">작가 메모 <span style="font-size:11px;color:var(--color-text-dim);">(소설에 미표시)</span></label>
          <textarea class="textarea-field" id="fCsAuthor" rows="2" style="width:100%;box-sizing:border-box;">${Utils.escHtml(c.authorNotes || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '성좌 편집' : '새 성좌', body, async () => {
      const name = document.getElementById('fCsName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }

      const contractors = [];
      const provisionalContractors = [];
      const linkedCharacterIds = [];
      document.querySelectorAll('#globalModalBody .const-char-cb:checked').forEach(cb => {
        if (cb.dataset.type === 'contractor') contractors.push(cb.dataset.chid);
        else if (cb.dataset.type === 'provisional') provisionalContractors.push(cb.dataset.chid);
        else linkedCharacterIds.push(cb.dataset.chid);
      });

      const record = {
        ...(c || {}),
        worldId: wid,
        name,
        icon: selectedIcon,
        series: document.getElementById('fCsSeries')?.value || '',
        tier: document.getElementById('fCsTier')?.value || '',
        hierarchy: document.getElementById('fCsHierarchy')?.value.trim(),
        domain: document.getElementById('fCsDomain')?.value.trim() || '',
        appearance: document.getElementById('fCsAppearance')?.value.trim() || '',
        features: document.getElementById('fCsFeatures')?.value.trim() || '',
        abilities: document.getElementById('fCsAbilities')?.value.trim() || '',
        weaknesses: document.getElementById('fCsWeaknesses')?.value.trim() || '',
        contractors,
        provisionalContractors,
        linkedCharacterIds,
        authorNotes: document.getElementById('fCsAuthor')?.value.trim() || '',
        id: c.id || DB.genId(),
        createdAt: c.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await DB.put('constellations', record);
      await AppStore.updateStreak();
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      self._currentId = record.id;
      const updated = await DB.get('constellations', record.id);
      if (updated) self._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      document.getElementById('constIconPicker')?.addEventListener('click', e => {
        const btn = e.target.closest('.const-icon-btn');
        if (!btn) return;
        selectedIcon = btn.dataset.icon;
        document.querySelectorAll('#constIconPicker .const-icon-btn').forEach(b => {
          b.style.borderColor = b === btn ? 'var(--color-primary)' : 'transparent';
        });
      });

      document.getElementById('constCharSearch')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('#globalModalBody .const-char-label').forEach(lbl => {
          lbl.style.display = (lbl.dataset.charname || '').includes(q) ? '' : 'none';
        });
      });
    }, 50);
  },
};
