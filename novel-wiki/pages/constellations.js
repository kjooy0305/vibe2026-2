'use strict';
window.Pages = window.Pages || {};
window.Pages.constellations = {
  _currentId: null,
  _container: null,
  _listScrollY: 0,
  _C: null,

  SERIES_COLORS: {
    '멸망성좌': '#ef4444', '타락성좌': '#f97316', '일반성좌': '#3b82f6',
    '성운성좌': '#8b5cf6', '은하성좌': '#fbbf24',
  },
  TIER_COLORS: {
    '절대신(개념신)': '#fbbf24', '최상급(업적신)': '#f43f5e',
    '중급(숭배신)': '#a855f7', '하급(반신)': '#3b82f6',
  },
  EXTRA_COLORS: ['#10b981','#06b6d4','#ec4899','#84cc16','#6366f1','#f59e0b','#14b8a6','#e879f9'],

  NINE_GREAT_DOMAINS: ['불','물','바람','땅','희(기쁨)','노(분노)','애(슬픔)','락(즐거움)','마나'],

  // ── Init ──────────────────────────────────────────────────────────────────────

  _seriesColor: function(s) {
    if (this.SERIES_COLORS[s]) return this.SERIES_COLORS[s];
    const idx = this._C.constellationSeries.indexOf(s);
    return idx >= 0 ? this.EXTRA_COLORS[idx % this.EXTRA_COLORS.length] : '#94a3b8';
  },
  _tierColor: function(t) {
    if (this.TIER_COLORS[t]) return this.TIER_COLORS[t];
    const idx = this._C.constellationTiers.indexOf(t);
    return idx >= 0 ? this.EXTRA_COLORS[(idx + 4) % this.EXTRA_COLORS.length] : '#94a3b8';
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
    const [constellations] = await Promise.all([
      DB.getAll('constellations', wid),
      AppConstants.load().then(c => { this._C = c; }),
    ]);

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

  // ── LIST ──────────────────────────────────────────────────────────────────────

  _renderList: function(container, constellations, wid) {
    this._currentId = null;
    const world = AppStore.getState().currentWorld;
    const self = this;

    const allSeries = this._C.constellationSeries;

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
        <div style="display:flex;gap:6px;align-items:center;margin-top:8px;">
          <input class="input-field" id="constFilter" placeholder="이름, 계열, 등급, 성단, 은하, 담당 영역 검색..." style="flex:1;" />
          <button id="btnGroupView" class="btn btn-ghost btn-sm" style="font-size:11px;white-space:nowrap;">성단/은하</button>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;" id="seriesFilters">
          <button class="const-series-chip active" data-series="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-primary);color:#000;font-size:11px;cursor:pointer;">전체</button>
          ${allSeries.map(s => {
            const col = self._seriesColor(s);
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

    let activeFilter = '';
    let groupByNebulaGalaxy = false;

    const refresh = () => {
      self._renderGroupedList(container, constellations, wid,
        document.getElementById('constFilter')?.value || '', activeFilter, groupByNebulaGalaxy);
    };

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
        refresh();
      });
    });

    document.getElementById('constFilter')?.addEventListener('input', refresh);

    document.getElementById('btnGroupView')?.addEventListener('click', () => {
      groupByNebulaGalaxy = !groupByNebulaGalaxy;
      const btn = document.getElementById('btnGroupView');
      if (btn) {
        btn.style.background = groupByNebulaGalaxy ? 'var(--color-primary)' : '';
        btn.style.color = groupByNebulaGalaxy ? '#000' : '';
        btn.textContent = groupByNebulaGalaxy ? '성단/은하 ✓' : '성단/은하';
      }
      refresh();
    });

    document.getElementById('btnAddConst')?.addEventListener('click', () => {
      self._openForm(null, wid, container);
    });

    refresh();
  },

  _renderGroupedList: function(container, constellations, wid, query, seriesFilter, groupByNebGal) {
    const self = this;
    const listEl = document.getElementById('constList');
    if (!listEl) return;

    let filtered = constellations.filter(c => {
      const txt = [c.name, c.series, c.tier, c.domain, c.features, c.cluster, c.nebula, c.galaxy].filter(Boolean).join(' ');
      return Utils.matchesQuery(txt, query) && (!seriesFilter || c.series === seriesFilter);
    });

    if (!filtered.length) {
      listEl.innerHTML = `<div class="empty-state" style="padding:48px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">⭐</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:4px;">성좌가 없습니다</div>
        <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 첫 성좌를 등록하세요</div>
      </div>`;
      return;
    }

    let html = '';

    if (groupByNebGal) {
      // Group by galaxy → nebula
      const galaxyMap = {};
      filtered.forEach(c => {
        const gk = c.galaxy || '(은하 미지정)';
        const nk = c.cluster || c.nebula || '(성단 미지정)';
        if (!galaxyMap[gk]) galaxyMap[gk] = {};
        if (!galaxyMap[gk][nk]) galaxyMap[gk][nk] = [];
        galaxyMap[gk][nk].push(c);
      });
      Object.keys(galaxyMap).sort().forEach(gk => {
        html += `<div style="font-size:12px;font-weight:800;color:#fbbf24;padding:8px 4px 4px;border-bottom:1px solid #fbbf2444;margin-bottom:10px;letter-spacing:0.5px;">🌌 ${Utils.escHtml(gk)}</div>`;
        Object.keys(galaxyMap[gk]).sort().forEach(nk => {
          html += `<div style="margin-left:10px;margin-bottom:10px;">
            <div style="font-size:11px;font-weight:700;color:#8b5cf6;padding:4px 2px 4px;letter-spacing:0.5px;">🌟 ${Utils.escHtml(nk)}</div>
            ${galaxyMap[gk][nk].map(c => self._constCard(c)).join('')}
          </div>`;
        });
      });
    } else {
      // Group by series
      const groups = {};
      const ORDER = ['은하성좌', '성운성좌', '일반성좌', '타락성좌', '멸망성좌'];
      // add custom series
      this._C.constellationSeries.forEach(s => { if (!ORDER.includes(s)) ORDER.push(s); });
      ORDER.push('');
      filtered.forEach(c => {
        const key = c.series || '';
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
      });
      ORDER.forEach(key => {
        if (!groups[key]) return;
        const col = key ? self._seriesColor(key) : '#94a3b8';
        html += `<div style="margin-bottom:4px;">
          ${key ? `<div style="font-size:11px;font-weight:700;color:${col};padding:6px 4px 4px;border-bottom:1px solid ${col}44;margin-bottom:8px;">${Utils.escHtml(key)} (${groups[key].length})</div>` : ''}
          ${groups[key].map(c => self._constCard(c)).join('')}
        </div>`;
      });
    }

    listEl.innerHTML = html;

    listEl.querySelectorAll('.const-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-const') || e.target.closest('.btn-copy-const')) return;
        const id = card.dataset.id;
        self._listScrollY = container.scrollTop || window.scrollY || 0;
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
        Utils.confirmWithInput('성좌 삭제', '삭제하려면 성좌 이름을 입력하세요.', c?.name || '이 성좌', async () => {
          await DB.del('constellations', id);
          Utils.toast('삭제됨', 'info');
          self.init(container);
        });
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
        ${((c.cluster || c.nebula) || c.galaxy) ? `<div style="font-size:11px;color:var(--color-text-dim);">${c.galaxy ? '🌌 ' + Utils.escHtml(c.galaxy) : ''}${c.galaxy && (c.cluster || c.nebula) ? ' · ' : ''}${(c.cluster || c.nebula) ? '🌟 ' + Utils.escHtml(c.cluster || c.nebula) : ''}</div>` : ''}
        ${c.features ? `<div style="font-size:12px;color:var(--color-text-dim);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(c.features)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end;">
        <button class="btn btn-ghost btn-sm btn-copy-const" data-id="${Utils.escHtml(c.id)}" style="font-size:11px;">복사</button>
        <button class="btn btn-ghost btn-sm btn-del-const" data-id="${Utils.escHtml(c.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  // ── DETAIL ────────────────────────────────────────────────────────────────────

  _renderDetail: async function(container, c, wid) {
    const sc = this._seriesColor(c.series || '');
    const tc = this._tierColor(c.tier || '');
    const chars = await DB.getAll('characters', wid);
    const skills = await DB.getAll('skills', wid);

    const renderContractorSection = (ids, label, color) => {
      if (!ids || !ids.length) return '';
      // Sort: main first, then sub, then others
      const linked = ids.map(id => chars.find(ch => ch.id === id)).filter(Boolean)
        .sort((a, b) => {
          const imp = { main: 0, sub: 1, '': 2 };
          return (imp[a.importance || ''] ?? 2) - (imp[b.importance || ''] ?? 2);
        });
      if (!linked.length) return '';
      return `<div style="margin-bottom:10px;">
        <div style="font-size:11px;color:${color};font-weight:600;margin-bottom:6px;">${label} (${linked.length}명)</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${linked.map(ch => `
            <button class="const-char-nav" data-chid="${Utils.escHtml(ch.id)}"
              style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:8px;background:var(--color-surface3,#2a2a3a);border:1px solid var(--color-border);cursor:pointer;font-size:12px;color:var(--color-text);">
              ${ch.image ? `<img src="${ch.image}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" />` : (ch.importance === 'main' ? '★' : '👤')}
              ${Utils.escHtml(ch.name)}${ch.level ? ` <span style="font-size:10px;color:var(--color-text-muted);">Lv.${ch.level}</span>` : ''}
              ${ch.importance === 'main' ? '<span style="color:#fbbf24;font-size:10px;">★</span>' : ''}
            </button>`).join('')}
        </div>
      </div>`;
    };

    const linkedSkills = (c.linkedSkillIds || []).map(id => skills.find(s => s.id === id)).filter(Boolean);

    container.innerHTML = `
    <div class="page active" style="overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;">
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
          ${c.galaxy ? `<span style="padding:2px 10px;border-radius:4px;font-size:12px;background:rgba(251,191,36,0.1);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);">🌌 ${Utils.escHtml(c.galaxy)}</span>` : ''}
          ${(c.cluster || c.nebula) ? `<span style="padding:2px 10px;border-radius:4px;font-size:12px;background:rgba(139,92,246,0.1);color:#8b5cf6;border:1px solid rgba(139,92,246,0.3);">🌟 ${Utils.escHtml(c.cluster || c.nebula)}</span>` : ''}
        </div>
        ${c.appearance ? `<div style="margin-bottom:12px;"><div style="font-size:11px;color:var(--color-text-muted);margin-bottom:3px;">외형</div><div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.appearance))}</div></div>` : ''}
        ${c.features ? `<div><div style="font-size:11px;color:var(--color-text-muted);margin-bottom:3px;">특징</div><div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.features))}</div></div>` : ''}
      </div>

      ${c.abilities ? `<div style="background:rgba(0,188,212,0.05);border:1px solid rgba(0,188,212,0.2);border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:6px;">능력</div>
        <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.abilities))}</div>
      </div>` : ''}

      ${c.weaknesses ? `<div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="font-size:11px;color:var(--color-danger);font-weight:700;margin-bottom:6px;">약점</div>
        <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.weaknesses))}</div>
      </div>` : ''}

      ${linkedSkills.length > 0 ? `
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:8px;">연계 스킬</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${linkedSkills.map(s => {
            const col = Utils.gradeColor ? Utils.gradeColor(s.grade) : '#3b82f6';
            const isGrad = col && col.startsWith('linear');
            return `<span style="padding:4px 10px;border-radius:6px;font-size:12px;background:${isGrad ? col : col + '22'};color:${isGrad ? '#fff' : col};border:1px solid ${isGrad ? 'transparent' : col + '55'};">
              ⚡ ${Utils.escHtml(s.name)}${s.grade ? ` (${s.grade})` : ''}
            </span>`;
          }).join('')}
        </div>
      </div>` : ''}

      ${(c.contractors?.length || c.provisionalContractors?.length) ? `
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="font-size:11px;color:var(--color-text-muted);font-weight:700;margin-bottom:8px;">계약자</div>
        ${renderContractorSection(c.contractors, '계약자', '#00bcd4')}
        ${renderContractorSection(c.provisionalContractors, '가계약자', '#f97316')}
      </div>` : ''}

      ${c.authorNotes ? `<div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:16px;">
        <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:4px;">작가 전용 메모</div>
        <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(c.authorNotes))}</div>
      </div>` : ''}

      <div style="font-size:11px;color:var(--color-text-dim);text-align:right;padding-bottom:16px;">
        수정: ${Utils.formatDate(c.updatedAt)} · 생성: ${Utils.formatDate(c.createdAt)}
      </div>
    </div>`;

    document.getElementById('btnBackConst')?.addEventListener('click', async () => {
      const scrollY = this._listScrollY || 0;
      this._currentId = null;
      await this.init(container);
      requestAnimationFrame(() => {
        container.scrollTop = scrollY;
        if (scrollY > 0) window.scrollTo(0, scrollY);
      });
    });

    document.getElementById('btnEditConst')?.addEventListener('click', () => this._openForm(c, wid, container));

    document.getElementById('btnDelConstDetail')?.addEventListener('click', () => {
      Utils.confirmWithInput('성좌 삭제', '삭제하려면 성좌 이름을 입력하세요.', c.name, async () => {
        await DB.del('constellations', c.id);
        Utils.toast('삭제됨', 'info');
        this._currentId = null;
        this.init(container);
      });
    });

    document.getElementById('btnCopyConstText')?.addEventListener('click', () => {
      const text = Utils.toTextExport(`성좌: ${c.name}`, [
        ['계열', c.series], ['등급', c.tier], ['위계', c.hierarchy],
        ['은하', c.galaxy], ['성단', c.cluster || c.nebula],
        ['담당 영역', c.domain], ['외형', c.appearance],
        ['특징', c.features], ['능력', c.abilities], ['약점', c.weaknesses],
      ]);
      Utils.copyText(text);
      Utils.toast('복사됨', 'success');
    });

    // Contractor/member navigation with org referrer pattern
    container.querySelectorAll('.const-char-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        sessionStorage.setItem('orgReferrer', JSON.stringify({ page: 'constellations', id: c.id }));
        AppRouter.navigate('characters', { highlightId: btn.dataset.chid });
      });
    });
  },

  // ── FORM ──────────────────────────────────────────────────────────────────────

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
            <label class="form-label">담당 영역</label>
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
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }

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
};
