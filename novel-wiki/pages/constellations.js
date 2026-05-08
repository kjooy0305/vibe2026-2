'use strict';
window.Pages = window.Pages || {};
window.Pages.constellations = {
  _currentId: null,
  _container: null,

  // 계열 (series)
  SERIES: ['절대신(개념신)', '최상급(업적신)', '중급(숭배신)', '하급(반신)'],
  // 등급 (tier)
  TIERS: ['멸망성좌', '타락성좌', '일반성좌', '성운성좌', '은하성좌'],
  // 속성 (attribute)
  ATTRIBUTES: ['불', '물', '바람', '땅', '희(기쁨)', '노(분노)', '애(슬픔)', '락(즐거움)', '마나', '공간', '혼돈', '질서', '기타'],

  // 9대 성좌의 담당 영역
  NINE_GREAT_DOMAINS: ['불', '물', '바람', '땅', '희(기쁨)', '노(분노)', '애(슬픔)', '락(즐거움)', '마나'],

  // Attribute colour map
  ATTR_COLORS: {
    '불': '#ef4444',
    '물': '#38bdf8',
    '바람': '#86efac',
    '땅': '#c97b2e',
    '희(기쁨)': '#fbbf24',
    '노(분노)': '#f97316',
    '애(슬픔)': '#818cf8',
    '락(즐거움)': '#34d399',
    '마나': '#c084fc',
    '공간': '#00bcd4',
    '혼돈': '#f43f5e',
    '질서': '#e2e8f0',
    '기타': '#94a3b8',
  },

  // Series accent colour
  SERIES_COLORS: {
    '절대신(개념신)': '#fbbf24',
    '최상급(업적신)': '#f43f5e',
    '중급(숭배신)': '#a855f7',
    '하급(반신)': '#3b82f6',
  },

  _attrColor: function(attr) {
    return this.ATTR_COLORS[attr] || '#94a3b8';
  },

  _seriesColor: function(series) {
    return this.SERIES_COLORS[series] || '#94a3b8';
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
        <input class="input-field" id="constFilter" placeholder="이름, 계열, 등급, 속성, 담당 영역 검색..." style="margin-top:8px;width:100%;box-sizing:border-box;" />
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;" id="attrFilters">
          <button class="const-attr-chip" data-attr="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-primary);color:#000;font-size:11px;cursor:pointer;">전체</button>
          ${this.ATTRIBUTES.map(a => {
            const col = this._attrColor(a);
            return `<button class="const-attr-chip" data-attr="${Utils.escHtml(a)}" style="padding:3px 8px;border-radius:4px;border:1px solid ${col}66;background:transparent;color:${col};font-size:11px;cursor:pointer;">${Utils.escHtml(a)}</button>`;
          }).join('')}
        </div>
      </div>

      <!-- 9대 성좌 quick-ref banner -->
      <div style="background:linear-gradient(135deg,rgba(0,188,212,0.06),rgba(124,58,237,0.08));border:1px solid rgba(100,150,255,0.18);border-radius:10px;padding:10px 14px;margin:0 16px 12px;">
        <div style="font-size:10px;color:var(--color-text-muted);font-weight:700;letter-spacing:0.5px;margin-bottom:6px;">9대 성좌 담당 영역</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">
          ${this.NINE_GREAT_DOMAINS.map((d, i) => {
            const col = this._attrColor(d);
            return `<span style="padding:2px 7px;border-radius:4px;background:${col}18;border:1px solid ${col}44;font-size:11px;color:${col};">${i + 1}. ${d}</span>`;
          }).join('')}
        </div>
      </div>

      <div id="constList" class="item-list">
        ${constellations.length === 0
          ? `<div class="empty-state" style="padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">⭐</div>
               <div style="font-weight:700;font-size:16px;margin-bottom:4px;">성좌가 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 첫 성좌를 등록하세요</div>
             </div>`
          : constellations.map(c => this._constCard(c)).join('')}
      </div>
    </div>`;

    let activeAttr = '';
    container.querySelectorAll('.const-attr-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.const-attr-chip').forEach(b => {
          const col = b.dataset.attr ? this._attrColor(b.dataset.attr) : 'var(--color-text-muted)';
          b.style.background = 'transparent';
          b.style.color = col;
        });
        btn.style.background = btn.dataset.attr ? this._attrColor(btn.dataset.attr) : 'var(--color-primary)';
        btn.style.color = '#000';
        activeAttr = btn.dataset.attr;
        this._applyFilter(container, document.getElementById('constFilter')?.value || '', activeAttr);
      });
    });

    document.getElementById('constFilter')?.addEventListener('input', e => {
      this._applyFilter(container, e.target.value, activeAttr);
    });

    document.getElementById('btnAddConst')?.addEventListener('click', () => {
      this._openForm(null, wid, container);
    });

    container.querySelectorAll('.const-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-const') || e.target.closest('.btn-copy-const')) return;
        const id = card.dataset.id;
        DB.getAll('constellations', wid).then(all => {
          const c = all.find(x => x.id === id);
          if (c) { this._currentId = c.id; this._renderDetail(container, c, wid); }
        });
      });
    });

    container.querySelectorAll('.btn-del-const').forEach(btn => {
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
            this.init(container);
          }
        );
      });
    });

    container.querySelectorAll('.btn-copy-const').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const c = constellations.find(x => x.id === btn.dataset.id);
        if (!c) return;
        const worlds = AppStore.getState().worlds.filter(w => w.id !== wid);
        if (!worlds.length) { Utils.toast('다른 세계가 없습니다', 'error'); return; }
        const body = `
          <div class="form-group">
            <label class="form-label">복사할 세계 선택</label>
            <select class="select-input" id="copyConstWorld" style="width:100%;">
              ${worlds.map(w => `<option value="${Utils.escHtml(w.id)}">${Utils.escHtml(w.name)}</option>`).join('')}
            </select>
          </div>`;
        Utils.openModal('다른 세계로 복사', body, async () => {
          const tid = document.getElementById('copyConstWorld')?.value;
          if (!tid) return false;
          const copy = { ...c, id: DB.genId(), worldId: tid, createdAt: Date.now(), updatedAt: Date.now() };
          await DB.put('constellations', copy);
          Utils.toast('복사됨', 'success');
          return true;
        }, '복사');
      });
    });
  },

  _applyFilter: function(container, query, attr) {
    const q = (query || '').toLowerCase();
    container.querySelectorAll('.const-card').forEach(card => {
      const text = (card.dataset.searchText || '').toLowerCase();
      const cardAttr = card.dataset.attr || '';
      const attrOk = !attr || cardAttr === attr;
      const textOk = !q || text.includes(q);
      card.style.display = attrOk && textOk ? '' : 'none';
    });
  },

  _constCard: function(c) {
    const ac = this._attrColor(c.attribute || '기타');
    const sc = this._seriesColor(c.series || '');
    const searchText = [c.name, c.series, c.tier, c.attribute, c.domain, c.features].filter(Boolean).join(' ').toLowerCase();

    const seriesShort = {
      '절대신(개념신)': '절대신', '최상급(업적신)': '업적신',
      '중급(숭배신)': '숭배신', '하급(반신)': '반신',
    };

    return `
    <div class="const-card list-item list-item--full"
      data-id="${Utils.escHtml(c.id)}"
      data-attr="${Utils.escHtml(c.attribute || '')}"
      data-search-text="${Utils.escHtml(searchText)}"
      style="cursor:pointer;border-left:3px solid ${ac};display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:linear-gradient(135deg,var(--color-surface2,#1a2535) 70%,${ac}0a 100%);border-radius:10px;border-top:1px solid var(--color-border);border-right:1px solid var(--color-border);border-bottom:1px solid var(--color-border);margin-bottom:8px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-10px;right:-10px;width:60px;height:60px;background:radial-gradient(circle,${ac}18 0%,transparent 70%);pointer-events:none;"></div>
      <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,rgba(0,0,0,0.3),${ac}22);border:1px solid ${ac}44;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">
        ${c.icon ? Utils.escHtml(c.icon) : '⭐'}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
          <span style="font-weight:800;font-size:14px;">${Utils.escHtml(c.name || '이름 없음')}</span>
          ${c.series ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${sc}22;color:${sc};border:1px solid ${sc}55;">${Utils.escHtml(seriesShort[c.series] || c.series)}</span>` : ''}
          ${c.tier ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(251,191,36,0.12);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);">${Utils.escHtml(c.tier)}</span>` : ''}
          ${c.attribute ? `<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${ac}22;color:${ac};border:1px solid ${ac}44;">${Utils.escHtml(c.attribute)}</span>` : ''}
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
    const ac = this._attrColor(c.attribute || '기타');
    const sc = this._seriesColor(c.series || '');

    // Resolve linked characters
    let linkedCharsHTML = '';
    const linkedIds = c.linkedCharacterIds || [];
    if (linkedIds.length) {
      const chars = await DB.getAll('characters', wid);
      const linked = linkedIds.map(id => chars.find(ch => ch.id === id)).filter(Boolean);
      if (linked.length) {
        linkedCharsHTML = linked.map(ch => `
          <button class="btn btn-ghost btn-sm" onclick="AppRouter.navigate('characters',{highlightId:'${Utils.escHtml(ch.id)}'})"
            style="font-size:12px;display:inline-flex;align-items:center;gap:4px;">
            ${ch.image ? `<img src="${ch.image}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;" />` : '👤'}
            ${Utils.escHtml(ch.name)}
          </button>`).join('');
      }
    }

    container.innerHTML = `
    <div class="page active">
      <div class="page-header" style="border-left:4px solid ${ac};padding-left:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackConst">← 목록</button>
          <h2 class="page-title" style="margin:0;font-size:18px;">${Utils.escHtml(c.name || '성좌')}</h2>
          ${c.attribute ? `<span style="padding:2px 8px;border-radius:4px;background:${ac}22;color:${ac};border:1px solid ${ac}55;font-size:12px;">${Utils.escHtml(c.attribute)}</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditConst">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnCopyConstText">텍스트 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnDelConstDetail" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      <!-- Star glow hero card -->
      <div style="background:radial-gradient(ellipse at top right,${ac}14 0%,var(--color-surface2,#1a2535) 60%);border:1px solid ${ac}44;border-radius:14px;padding:20px;margin-bottom:16px;box-shadow:0 0 28px ${ac}12;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-30px;right:-30px;width:140px;height:140px;background:radial-gradient(circle,${ac}1a,transparent 70%);pointer-events:none;"></div>

        <!-- Icon + badges -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,rgba(0,0,0,0.4),${ac}28);border:1px solid ${ac}44;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">
            ${c.icon ? Utils.escHtml(c.icon) : '⭐'}
          </div>
          <div>
            <div style="font-size:20px;font-weight:800;">${Utils.escHtml(c.name || '')}</div>
            ${c.hierarchy !== undefined && c.hierarchy !== '' ? `<div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">위계: ${Utils.escHtml(String(c.hierarchy))}</div>` : ''}
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
          ${c.series ? `<span style="padding:2px 10px;border-radius:4px;font-size:12px;background:${sc}22;color:${sc};border:1px solid ${sc}55;">${Utils.escHtml(c.series)}</span>` : ''}
          ${c.tier ? `<span style="padding:2px 10px;border-radius:4px;font-size:12px;background:rgba(251,191,36,0.12);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);">${Utils.escHtml(c.tier)}</span>` : ''}
          ${c.attribute ? `<span style="padding:2px 10px;border-radius:4px;font-size:12px;background:${ac}22;color:${ac};border:1px solid ${ac}44;">${Utils.escHtml(c.attribute)} 속성</span>` : ''}
          ${c.domain ? `<span style="padding:2px 10px;border-radius:4px;font-size:12px;background:rgba(124,58,237,0.12);color:#c4b5fd;border:1px solid rgba(124,58,237,0.25);">담당: ${Utils.escHtml(c.domain)}</span>` : ''}
        </div>

        ${c.appearance ? `
          <div style="margin-bottom:12px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px;">외형</div>
            <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.appearance))}</div>
          </div>` : ''}

        ${c.features ? `
          <div style="margin-bottom:12px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px;">특징</div>
            <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.features))}</div>
          </div>` : ''}
      </div>

      <!-- Abilities -->
      ${c.abilities ? `
        <div style="background:rgba(0,188,212,0.05);border:1px solid rgba(0,188,212,0.2);border-radius:10px;padding:14px;margin-bottom:12px;">
          <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">능력</div>
          <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.abilities))}</div>
        </div>` : ''}

      <!-- Weaknesses -->
      ${c.weaknesses ? `
        <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px;margin-bottom:12px;">
          <div style="font-size:11px;color:var(--color-danger);font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">약점</div>
          <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.weaknesses))}</div>
        </div>` : ''}

      <!-- Linked characters -->
      ${linkedCharsHTML ? `
        <div style="background:var(--color-surface2);border-radius:10px;padding:14px;margin-bottom:12px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:700;margin-bottom:8px;">연관 캐릭터</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">${linkedCharsHTML}</div>
        </div>` : ''}

      <!-- Author notes -->
      ${c.authorNotes ? `
        <div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:16px;">
          <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:4px;">작가 전용 메모 (소설에 미표시)</div>
          <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.authorNotes))}</div>
        </div>` : ''}

      <div style="font-size:11px;color:var(--color-text-dim);text-align:right;">
        수정: ${Utils.formatDate(c.updatedAt)} · 생성: ${Utils.formatDate(c.createdAt)}
      </div>
    </div>`;

    document.getElementById('btnBackConst')?.addEventListener('click', () => this.init(container));
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
        ['속성', c.attribute],
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

    const chars = await DB.getAll('characters', wid);
    const linkedIds = new Set(c.linkedCharacterIds || []);

    const ICON_OPTIONS = ['⭐','🌟','💫','✨','🔥','❄️','⚡','🌊','🌪️','🌑','☀️','🌙','🌌','👁️','⚔️','🐉','🦋','🔱','👑','💀'];
    let selectedIcon = c.icon || '⭐';

    const seriesOpts = ['', ...this.SERIES].map(s =>
      `<option value="${Utils.escHtml(s)}" ${(c.series || '') === s ? 'selected' : ''}>${s || '선택 안 함'}</option>`).join('');
    const tierOpts = ['', ...this.TIERS].map(t =>
      `<option value="${Utils.escHtml(t)}" ${(c.tier || '') === t ? 'selected' : ''}>${t || '선택 안 함'}</option>`).join('');
    const attrOpts = ['', ...this.ATTRIBUTES].map(a =>
      `<option value="${Utils.escHtml(a)}" ${(c.attribute || '') === a ? 'selected' : ''}>${a || '선택 안 함'}</option>`).join('');

    const charCheckboxes = chars.length === 0
      ? '<div style="color:var(--color-text-muted);font-size:13px;">이 세계에 캐릭터가 없습니다</div>'
      : chars.map(ch => `
          <label style="display:flex;align-items:center;gap:8px;padding:6px 0;cursor:pointer;border-bottom:1px solid var(--color-border);">
            <input type="checkbox" data-chid="${Utils.escHtml(ch.id)}" ${linkedIds.has(ch.id) ? 'checked' : ''} />
            ${ch.image ? `<img src="${ch.image}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;" />` : '<span>👤</span>'}
            <span style="font-size:13px;">${Utils.escHtml(ch.name || '?')}</span>
          </label>`).join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;max-height:72vh;overflow-y:auto;padding-right:4px;">
        <div class="form-group">
          <label class="form-label">이름 *</label>
          <input class="input-field" id="fCsName" value="${Utils.escHtml(c.name || '')}" placeholder="성좌 이름" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">아이콘</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;" id="constIconPicker">
            ${ICON_OPTIONS.map(ic => `
              <button type="button" class="const-icon-btn" data-icon="${ic}"
                style="font-size:20px;width:36px;height:36px;border:2px solid ${selectedIcon === ic ? 'var(--color-primary)' : 'transparent'};border-radius:8px;background:var(--color-surface);cursor:pointer;">
                ${ic}
              </button>`).join('')}
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
            <label class="form-label">속성</label>
            <select class="select-input" id="fCsAttr" style="width:100%;">${attrOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label">위계</label>
            <input class="input-field" id="fCsHierarchy" value="${Utils.escHtml(c.hierarchy !== undefined ? String(c.hierarchy) : '')}" placeholder="예: 1, 3위" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">담당 영역</label>
          <input class="input-field" id="fCsDomain" value="${Utils.escHtml(c.domain || '')}" placeholder="예: 불, 마나, 희(기쁨)" style="width:100%;box-sizing:border-box;" />
          <div style="font-size:11px;color:var(--color-text-dim);margin-top:3px;">9대 성좌: 불/물/바람/땅/희/노/애/락/마나</div>
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
        <div class="form-group">
          <label class="form-label">연관 캐릭터</label>
          <div style="max-height:160px;overflow-y:auto;border:1px solid var(--color-border);border-radius:8px;padding:8px;">${charCheckboxes}</div>
        </div>
        <div class="form-group">
          <label class="form-label">작가 메모 <span style="font-size:11px;color:var(--color-text-dim);">(소설에 미표시)</span></label>
          <textarea class="textarea-field" id="fCsAuthor" rows="2" style="width:100%;box-sizing:border-box;">${Utils.escHtml(c.authorNotes || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '성좌 편집' : '새 성좌', body, async () => {
      const name = document.getElementById('fCsName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }

      const linkedCharacterIds = [...document.querySelectorAll('input[data-chid]:checked')]
        .map(cb => cb.dataset.chid);

      const hierarchyRaw = document.getElementById('fCsHierarchy')?.value.trim();

      const record = {
        ...(c || {}),
        worldId: wid,
        name,
        icon: selectedIcon,
        series: document.getElementById('fCsSeries')?.value || '',
        tier: document.getElementById('fCsTier')?.value || '',
        attribute: document.getElementById('fCsAttr')?.value || '',
        hierarchy: hierarchyRaw,
        domain: document.getElementById('fCsDomain')?.value.trim() || '',
        appearance: document.getElementById('fCsAppearance')?.value.trim() || '',
        features: document.getElementById('fCsFeatures')?.value.trim() || '',
        abilities: document.getElementById('fCsAbilities')?.value.trim() || '',
        weaknesses: document.getElementById('fCsWeaknesses')?.value.trim() || '',
        linkedCharacterIds,
        authorNotes: document.getElementById('fCsAuthor')?.value.trim() || '',
        id: c.id || DB.genId(),
        createdAt: c.createdAt || Date.now(),
      };

      await DB.put('constellations', record);
      await AppStore.updateStreak();
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      this._currentId = record.id;
      const updated = await DB.get('constellations', record.id);
      if (updated) this._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    // Icon picker
    setTimeout(() => {
      document.getElementById('constIconPicker')?.addEventListener('click', e => {
        const btn = e.target.closest('.const-icon-btn');
        if (!btn) return;
        selectedIcon = btn.dataset.icon;
        document.querySelectorAll('#constIconPicker .const-icon-btn').forEach(b => {
          b.style.borderColor = b === btn ? 'var(--color-primary)' : 'transparent';
        });
      });
    }, 50);
  },
};
