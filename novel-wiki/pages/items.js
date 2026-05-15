'use strict';
window.Pages = window.Pages || {};
window.Pages.items = {
  _currentId: null,
  _container: null,
  _novelView: false,

  _C: null,

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

    this._C = await AppConstants.load();
    const items = await DB.getAll('items', wid);
    if (options.highlightId) this._currentId = options.highlightId;

    if (this._currentId) {
      const item = items.find(x => x.id === this._currentId);
      if (item) { this._renderDetail(container, item, wid); return; }
    }

    this._renderList(container, items, wid);
  },

  destroy: function() {
    this._currentId = null;
    this._novelView = false;
    this._container = null;
  },

  _getItemOrigins: function(it) {
    if (it.origins && it.origins.length > 0) return it.origins;
    if (it.towerId) return [{ type: 'tower', id: it.towerId }];
    return [];
  },

  // ── LIST ────────────────────────────────────────────────────────────────────

  _renderList: async function(container, items, wid) {
    this._currentId = null;
    const world = AppStore.getState().currentWorld;
    let activeGrade = '';
    let activeType = '';
    let activeOrigin = '';

    const [towers, gates] = await Promise.all([
      DB.getAll('towers', wid),
      DB.getAll('gates', wid),
    ]);
    const towerMap = {};
    towers.forEach(t => { towerMap[t.id] = t.name; });
    const gateMap = {};
    gates.forEach(g => { gateMap[g.id] = g.name; });

    const originFilterHtml = (towers.length > 0 || gates.length > 0) ? `
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;" id="originFilters">
        <button class="filter-chip-origin active" data-origin=""
          style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface2);color:var(--color-text);font-size:11px;cursor:pointer;">전체</button>
        ${towers.map(t => `<button class="filter-chip-origin" data-origin="${Utils.escHtml(t.id)}"
          style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);font-size:11px;cursor:pointer;">🗼 ${Utils.escHtml(t.name)}</button>`).join('')}
        ${gates.map(g => `<button class="filter-chip-origin" data-origin="${Utils.escHtml(g.id)}"
          style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);font-size:11px;cursor:pointer;">🌀 ${Utils.escHtml(g.name)}</button>`).join('')}
      </div>` : '';

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">아이템</h2>
          <button class="btn btn-primary btn-sm" id="btnAddItem">+ 추가</button>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${items.length}개
        </p>
        <input class="input-field" id="itemFilter" placeholder="이름, 등급, 종류, 효과 검색..." style="margin-top:8px;width:100%;box-sizing:border-box;" />
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;" id="gradeFilters">
          <button class="filter-chip active" data-grade="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-primary);color:#000;font-size:11px;cursor:pointer;">전체</button>
          ${this._C.grades.map(g => `<button class="filter-chip" data-grade="${g}" style="padding:3px 8px;border-radius:4px;border:1px solid ${Utils.gradeColor(g)}66;background:transparent;color:${Utils.gradeColor(g)};font-size:11px;cursor:pointer;">${g}</button>`).join('')}
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;" id="typeFilters">
          <button class="filter-chip-type active" data-type="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface2);color:var(--color-text);font-size:11px;cursor:pointer;">전체 종류</button>
          ${this._C.itemTypes.map(t => `<button class="filter-chip-type" data-type="${t}" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-muted);font-size:11px;cursor:pointer;">${t}</button>`).join('')}
        </div>
        ${originFilterHtml}
      </div>

      <div id="itemList" class="item-list">
        ${items.length === 0
          ? `<div class="empty-state" style="padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">📦</div>
               <div style="font-weight:700;font-size:16px;margin-bottom:4px;">아이템이 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 아이템을 등록하세요</div>
             </div>`
          : items.map(it => this._itemCard(it, towerMap, gateMap)).join('')}
      </div>
    </div>`;

    // Grade filter
    container.querySelectorAll('.filter-chip[data-grade]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-chip[data-grade]').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = b.dataset.grade ? Utils.gradeColor(b.dataset.grade) : 'var(--color-text-muted)';
        });
        btn.style.background = btn.dataset.grade ? Utils.gradeColor(btn.dataset.grade) : 'var(--color-primary)';
        btn.style.color = '#000';
        activeGrade = btn.dataset.grade;
        this._applyFilter(container, document.getElementById('itemFilter')?.value || '', activeGrade, activeType, activeTower);
      });
    });

    // Type filter
    container.querySelectorAll('.filter-chip-type[data-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-chip-type[data-type]').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = 'var(--color-text-muted)';
        });
        btn.style.background = 'var(--color-surface2)';
        btn.style.color = 'var(--color-text)';
        activeType = btn.dataset.type;
        this._applyFilter(container, document.getElementById('itemFilter')?.value || '', activeGrade, activeType, activeOrigin);
      });
    });

    // Origin (tower / gate) filter
    container.querySelectorAll('.filter-chip-origin[data-origin]').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-chip-origin[data-origin]').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = 'var(--color-text-muted)';
        });
        btn.style.background = 'var(--color-surface2)';
        btn.style.color = 'var(--color-text)';
        activeOrigin = btn.dataset.origin;
        this._applyFilter(container, document.getElementById('itemFilter')?.value || '', activeGrade, activeType, activeOrigin);
      });
    });

    document.getElementById('itemFilter')?.addEventListener('input', e => {
      this._applyFilter(container, e.target.value, activeGrade, activeType, activeOrigin);
    });

    document.getElementById('btnAddItem')?.addEventListener('click', () => {
      this._openForm(null, wid, container);
    });

    container.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-item') || e.target.closest('.btn-copy-item')) return;
        const id = card.dataset.id;
        DB.getAll('items', wid).then(all => {
          const it = all.find(x => x.id === id);
          if (it) { this._currentId = it.id; this._novelView = false; this._renderDetail(container, it, wid); }
        });
      });
    });

    container.querySelectorAll('.btn-del-item').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const it = items.find(x => x.id === btn.dataset.id);
        Utils.confirmWithInput('아이템 삭제', '삭제하면 되돌릴 수 없습니다.', it?.name || '이 아이템', async () => {
          await DB.del('items', btn.dataset.id);
          Utils.toast('삭제됨', 'info');
          this.init(container);
        });
      });
    });

    container.querySelectorAll('.btn-copy-item').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const it = items.find(x => x.id === btn.dataset.id);
        if (!it) return;
        this._openCopyToWorld(it, wid);
      });
    });
  },

  _applyFilter: function(container, query, grade, type, originId) {
    container.querySelectorAll('.item-card').forEach(card => {
      const text = card.dataset.searchText || '';
      const cardGrade = card.dataset.grade || '';
      const cardType = card.dataset.type || '';
      const originIds = (card.dataset.originIds || '').split(',').filter(Boolean);
      const gradeOk = !grade || cardGrade === grade;
      const typeOk = !type || cardType === type;
      const originOk = !originId || originIds.includes(originId);
      const textOk = Utils.matchesQuery(text, query);
      card.style.display = gradeOk && typeOk && originOk && textOk ? '' : 'none';
    });
  },

  _itemCard: function(it, towerMap, gateMap) {
    towerMap = towerMap || {};
    gateMap = gateMap || {};
    const gc = Utils.gradeColor(it.grade || 'F');
    const hasWarning = !it.effects && !it.description;
    const origins = this._getItemOrigins(it);
    const originIds = origins.map(o => o.id).join(',');
    const originBadges = origins.map(o => {
      const name = o.type === 'tower' ? towerMap[o.id] : gateMap[o.id];
      if (!name) return '';
      const icon = o.type === 'tower' ? '🗼' : '🌀';
      return `<span style="font-size:11px;padding:1px 6px;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.25);border-radius:3px;color:#60a5fa;">${icon} ${Utils.escHtml(name)}</span>`;
    }).filter(Boolean).join('');
    const searchText = [
      it.name, it.grade, it.type, it.effects, it.description, it.source,
      ...origins.map(o => (o.type === 'tower' ? towerMap[o.id] : gateMap[o.id]) || ''),
    ].filter(Boolean).join(' ').toLowerCase();
    return `
    <div class="item-card list-item"
      data-id="${Utils.escHtml(it.id)}"
      data-grade="${Utils.escHtml(it.grade || '')}"
      data-type="${Utils.escHtml(it.type || '')}"
      data-origin-ids="${Utils.escHtml(originIds)}"
      data-search-text="${Utils.escHtml(searchText)}"
      style="cursor:pointer;border-left:3px solid ${gc};display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--color-surface2);border-radius:10px;border:1px solid var(--color-border);margin-bottom:8px;">
      ${it.image
        ? `<img src="${it.image}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;" />`
        : `<div style="width:44px;height:44px;border-radius:8px;background:var(--color-border);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px;">📦</div>`}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${Utils.gradeBadge(it.grade || 'F')}
          <span style="font-weight:700;font-size:14px;">${Utils.escHtml(it.name || '이름 없음')}</span>
          ${hasWarning ? '<span title="효과/설명 누락" style="color:var(--color-warning);font-size:13px;">⚠️</span>' : ''}
          ${it.type ? `<span style="font-size:11px;padding:1px 6px;background:var(--color-border);border-radius:3px;color:var(--color-text-muted);">${Utils.escHtml(it.type)}</span>` : ''}
          ${originBadges}
        </div>
        ${it.effects ? `<div style="font-size:12px;color:var(--color-text-dim);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(it.effects)}</div>` : ''}
        ${it.source ? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">획득처: ${Utils.escHtml(it.source)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end;">
        <button class="btn btn-ghost btn-sm btn-copy-item" data-id="${Utils.escHtml(it.id)}" style="font-size:11px;">복사</button>
        <button class="btn btn-ghost btn-sm btn-del-item" data-id="${Utils.escHtml(it.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  // ── DETAIL ──────────────────────────────────────────────────────────────────

  _renderDetail: async function(container, it, wid) {
    const gc = Utils.gradeColor(it.grade || 'F');
    const isGradient = gc.startsWith('linear');
    const borderColor = isGradient ? '#fbbf24' : gc;

    const origins = this._getItemOrigins(it);
    const [towers, gates] = await Promise.all([
      DB.getAll('towers', wid),
      DB.getAll('gates', wid),
    ]);
    const towerMap = {};
    towers.forEach(t => { towerMap[t.id] = t.name; });
    const gateMap = {};
    gates.forEach(g => { gateMap[g.id] = g.name; });

    // Author view (full info)
    const authorViewHtml = `
      <div id="itemAuthorView">
        <div style="border:1px solid ${borderColor}44;border-radius:12px;padding:16px;background:${isGradient ? borderColor + '0a' : borderColor + '08'};margin-bottom:16px;">
          <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;">
            ${it.image ? `<img src="${it.image}" style="width:72px;height:72px;border-radius:10px;object-fit:cover;flex-shrink:0;" />` : ''}
            <div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
                ${Utils.gradeBadge(it.grade || 'F')}
                ${it.type ? `<span style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:12px;">${Utils.escHtml(it.type)}</span>` : ''}
              </div>
              ${it.effects ? `
                <div>
                  <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:3px;">효과</div>
                  <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(it.effects))}</div>
                </div>` : ''}
            </div>
          </div>
          ${it.description ? `
            <div style="margin-bottom:8px;">
              <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:3px;">설명</div>
              <div style="white-space:pre-wrap;font-size:13px;font-style:italic;color:var(--color-text-muted);line-height:1.7;">${Utils.nl2br(Utils.escHtml(it.description))}</div>
            </div>` : ''}
          ${it.source ? `
            <div>
              <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:3px;">획득처</div>
              <div style="font-size:13px;">${Utils.escHtml(it.source)}</div>
            </div>` : ''}
          ${origins.length > 0 ? `
            <div style="margin-top:8px;">
              <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">연결된 탑 / 게이트</div>
              <div style="display:flex;flex-wrap:wrap;gap:5px;">
                ${origins.map(o => {
                  const name = o.type === 'tower' ? towerMap[o.id] : gateMap[o.id];
                  if (!name) return '';
                  const page = o.type === 'tower' ? 'tower' : 'gates';
                  const icon = o.type === 'tower' ? '🗼' : '🌀';
                  return `<button class="btn btn-ghost btn-sm" onclick="AppRouter.navigate('${page}')" style="font-size:12px;">${icon} ${Utils.escHtml(name)}</button>`;
                }).filter(Boolean).join('')}
              </div>
            </div>` : ''}
        </div>

        ${it.relatedSkill ? `
          <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.22);border-radius:8px;padding:10px 14px;margin-bottom:12px;">
            <div style="font-size:11px;color:#a78bfa;font-weight:700;margin-bottom:4px;">연관 스킬</div>
            <button class="btn btn-ghost btn-sm" onclick="AppRouter.navigate('skills',{highlightId:'${Utils.escHtml(it.relatedSkill.id || '')}'})" style="font-size:12px;">
              ⚡ ${Utils.escHtml(it.relatedSkill.name || '')}
            </button>
          </div>` : ''}

        ${it.siegeData && (it.type === '공성병기' || it.type === '수성병기') ? `
          <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:12px 14px;margin-bottom:12px;">
            <div style="font-size:12px;color:#f87171;font-weight:700;margin-bottom:10px;">⚔️ 병기 상세 정보</div>
            ${it.siegeData.shape ? `<div style="margin-bottom:6px;"><span style="font-size:11px;color:var(--color-text-muted);">형태</span><div style="font-size:13px;margin-top:2px;">${Utils.escHtml(it.siegeData.shape)}</div></div>` : ''}
            ${it.siegeData.purpose ? `<div style="margin-bottom:6px;"><span style="font-size:11px;color:var(--color-text-muted);">사용 의도</span><div style="white-space:pre-wrap;font-size:13px;line-height:1.7;margin-top:2px;">${Utils.nl2br(Utils.escHtml(it.siegeData.purpose))}</div></div>` : ''}
            ${it.siegeData.mechanism ? `<div style="margin-bottom:6px;"><span style="font-size:11px;color:var(--color-text-muted);">작동 방법</span><div style="white-space:pre-wrap;font-size:13px;line-height:1.7;margin-top:2px;">${Utils.nl2br(Utils.escHtml(it.siegeData.mechanism))}</div></div>` : ''}
            ${it.siegeData.weakness ? `<div style="margin-bottom:6px;"><span style="font-size:11px;color:var(--color-text-muted);">약점</span><div style="white-space:pre-wrap;font-size:13px;line-height:1.7;margin-top:2px;">${Utils.nl2br(Utils.escHtml(it.siegeData.weakness))}</div></div>` : ''}
            ${it.siegeData.linkedSkills?.length ? `
              <div><span style="font-size:11px;color:var(--color-text-muted);">연계 스킬</span>
                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
                  ${it.siegeData.linkedSkills.map(sk => `
                    <button class="btn btn-ghost btn-sm" onclick="AppRouter.navigate('skills',{highlightId:'${Utils.escHtml(sk.id)}'})" style="font-size:12px;background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.3);">
                      ⚔️ ${Utils.escHtml(sk.name||'')}${sk.grade?` (${Utils.escHtml(sk.grade)})`:''}</button>`).join('')}
                </div>
              </div>` : ''}
          </div>` : ''}

        ${it.authorNotes ? `
          <div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:12px;">
            <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:4px;">작가 전용 메모 (소설에 미표시)</div>
            <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(it.authorNotes))}</div>
          </div>` : ''}

        <div style="font-size:11px;color:var(--color-text-dim);text-align:right;">
          수정: ${Utils.formatDate(it.updatedAt)} · 생성: ${Utils.formatDate(it.createdAt)}
        </div>
      </div>`;

    // Novel view (no authorNotes)
    const novelViewHtml = `
      <div id="itemNovelView" style="display:none;">
        <div style="background:linear-gradient(135deg,rgba(20,30,60,0.95),rgba(10,20,50,0.95));border:2px solid ${borderColor}66;border-radius:12px;padding:20px;font-size:14px;line-height:1.9;color:#ddeeff;box-shadow:0 0 20px ${borderColor}18;">
          <div style="text-align:center;font-size:12px;color:rgba(120,160,255,0.6);letter-spacing:4px;margin-bottom:10px;">${'ㅡ'.repeat(14)}</div>
          <div style="text-align:center;font-size:16px;font-weight:700;color:#aaccff;margin-bottom:12px;">[아이템 정보: ${Utils.escHtml(it.name || '')}]</div>
          <div>ㅣ등급: <strong style="color:${borderColor};">${Utils.escHtml(it.grade || '')}</strong></div>
          ${it.type ? `<div>ㅣ종류: ${Utils.escHtml(it.type)}</div>` : ''}
          ${it.effects ? `<div style="margin-top:6px;">ㅣ효과<br><span style="white-space:pre-wrap;padding-left:12px;">${Utils.nl2br(Utils.escHtml(it.effects))}</span></div>` : ''}
          ${it.description ? `<div style="margin-top:6px;font-style:italic;color:#aaccff;">ㅣ설명: ${Utils.escHtml(it.description)}</div>` : ''}
          ${it.source ? `<div>ㅣ획득처: ${Utils.escHtml(it.source)}</div>` : ''}
          <div style="text-align:center;font-size:12px;color:rgba(120,160,255,0.6);letter-spacing:4px;margin-top:12px;">${'ㅡ'.repeat(14)}</div>
        </div>
      </div>`;

    container.innerHTML = `
    <div class="page active">
      <div class="page-header" style="border-left:4px solid ${borderColor};padding-left:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackItems">← 목록</button>
          ${Utils.gradeBadge(it.grade || 'F')}
          <h2 class="page-title" style="margin:0;font-size:18px;">${Utils.escHtml(it.name || '이름 없음')}</h2>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditItem">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnViewToggle">소설 뷰</button>
          <button class="btn btn-ghost btn-sm" id="btnCopyItemText">텍스트 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnCopyItemToWorld">다른 세계로 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnDelItemDetail" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      ${authorViewHtml}
      ${novelViewHtml}
    </div>`;

    document.getElementById('btnBackItems')?.addEventListener('click', () => { this._currentId = null; this.init(container); });
    document.getElementById('btnEditItem')?.addEventListener('click', () => this._openForm(it, wid, container));
    document.getElementById('btnDelItemDetail')?.addEventListener('click', () => {
      Utils.confirmWithInput('아이템 삭제', '삭제하면 되돌릴 수 없습니다.', it.name, async () => {
        await DB.del('items', it.id);
        Utils.toast('삭제됨', 'info');
        this._currentId = null;
        this.init(container);
      });
    });

    // Author / novel view toggle
    document.getElementById('btnViewToggle')?.addEventListener('click', () => {
      this._novelView = !this._novelView;
      document.getElementById('itemAuthorView').style.display = this._novelView ? 'none' : 'block';
      document.getElementById('itemNovelView').style.display = this._novelView ? 'block' : 'none';
      document.getElementById('btnViewToggle').textContent = this._novelView ? '작가 뷰' : '소설 뷰';
    });

    document.getElementById('btnCopyItemText')?.addEventListener('click', () => {
      Utils.copyText(this._exportText(it));
      Utils.toast('복사됨', 'success');
    });

    document.getElementById('btnCopyItemToWorld')?.addEventListener('click', () => {
      this._openCopyToWorld(it, wid);
    });
  },

  // ── COPY TO WORLD ────────────────────────────────────────────────────────────

  _openCopyToWorld: function(it, wid) {
    const worlds = AppStore.getState().worlds.filter(w => w.id !== wid);
    if (!worlds.length) { Utils.toast('다른 세계가 없습니다', 'error'); return; }
    const body = `
      <div class="form-group">
        <label class="form-label">복사할 세계 선택</label>
        <select class="select-input" id="copyItemWorld" style="width:100%;">
          ${worlds.map(w => `<option value="${Utils.escHtml(w.id)}">${Utils.escHtml(w.name)}</option>`).join('')}
        </select>
      </div>`;
    Utils.openModal('다른 세계로 복사', body, async () => {
      const tid = document.getElementById('copyItemWorld')?.value;
      if (!tid) return false;
      const copy = { ...it, id: DB.genId(), worldId: tid, createdAt: Date.now(), updatedAt: Date.now() };
      await DB.put('items', copy);
      Utils.toast('복사됨', 'success');
      return true;
    }, '복사');
  },

  // ── FORM ────────────────────────────────────────────────────────────────────

  _openForm: async function(item, wid, container) {
    const isEdit = !!item;
    const self = this;
    const it = item || {};

    const [allSkills, allTowers, allGates] = await Promise.all([
      DB.getAll('skills', wid),
      DB.getAll('towers', wid),
      DB.getAll('gates', wid),
    ]);
    const allSkillsSorted = allSkills.slice().sort((a, b) => (a.name||'').localeCompare(b.name||'', 'ko'));
    const relSkillOpts = ['<option value="">없음</option>',
      ...allSkills.map(sk => `<option value="${Utils.escHtml(sk.id)}" ${it.relatedSkill?.id === sk.id ? 'selected' : ''}>${Utils.escHtml(sk.name)} (${sk.grade || 'F'})</option>`)
    ].join('');

    const isSiegeType = t => t === '공성병기' || t === '수성병기';
    let siegeLinkedSkills = [...(it.siegeData?.linkedSkills || [])];
    const renderSiegeChips = () => siegeLinkedSkills.map(sk => `
      <span class="siege-skill-chip" data-skid="${Utils.escHtml(sk.id)}"
        style="display:inline-flex;align-items:center;gap:4px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.35);border-radius:6px;padding:3px 8px;font-size:12px;">
        ⚔️ ${Utils.escHtml(sk.name||'')}${sk.grade?` (${Utils.escHtml(sk.grade)})`:''}<button class="siege-skill-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:12px;padding:0 2px;">✕</button>
      </span>`).join('');

    const currentOrigins = this._getItemOrigins(it);

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
        <div class="form-group">
          <label class="form-label">이름 *</label>
          <input class="input-field" id="fItName" value="${Utils.escHtml(it.name || '')}" placeholder="아이템 이름" style="width:100%;box-sizing:border-box;" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">등급</label>
            <select class="select-input" id="fItGrade" style="width:100%;">
              ${this._C.grades.map(g => `<option value="${g}" ${(it.grade || 'F') === g ? 'selected' : ''}>${g}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">종류</label>
            <select class="select-input" id="fItType" style="width:100%;">
              <option value="">선택 안 함</option>
              ${this._C.itemTypes.map(t => `<option value="${t}" ${(it.type || '') === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="siegeSection" style="${isSiegeType(it.type||'') ? '' : 'display:none;'}border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:12px;background:rgba(239,68,68,0.04);">
          <div style="font-size:12px;color:#f87171;font-weight:700;margin-bottom:8px;">⚔️ 병기 상세 정보</div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">형태</label>
            <input class="input-field" id="fSiegeShape" value="${Utils.escHtml(it.siegeData?.shape||'')}" placeholder="예: 투석기, 성벽 방어포, 대형 쇠뇌..." style="width:100%;box-sizing:border-box;font-size:13px;" />
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">사용 의도</label>
            <textarea class="textarea-field" id="fSiegePurpose" rows="2" placeholder="어떤 목적으로 사용하는가..." style="width:100%;box-sizing:border-box;font-size:13px;">${Utils.escHtml(it.siegeData?.purpose||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">작동 방법</label>
            <textarea class="textarea-field" id="fSiegeMechanism" rows="2" placeholder="어떻게 작동하는가..." style="width:100%;box-sizing:border-box;font-size:13px;">${Utils.escHtml(it.siegeData?.mechanism||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">약점</label>
            <textarea class="textarea-field" id="fSiegeWeakness" rows="2" placeholder="어떤 약점이 있는가..." style="width:100%;box-sizing:border-box;font-size:13px;">${Utils.escHtml(it.siegeData?.weakness||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">연계 스킬</label>
            <div id="siegeSkillChips" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;margin-bottom:6px;">${renderSiegeChips()}</div>
            <div style="position:relative;">
              <input class="input-field" id="siegeSkillSearch" placeholder="스킬 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="siegeSkillResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:130px;overflow-y:auto;top:100%;left:0;"></div>
            </div>
          </div>
        </div>
        ${(allTowers.length > 0 || allGates.length > 0) ? `
        <div class="form-group">
          <label class="form-label">연결된 탑 / 게이트 <span style="font-size:11px;color:var(--color-text-dim);">(복수 선택 가능)</span></label>
          <div style="display:flex;flex-direction:column;gap:2px;max-height:150px;overflow-y:auto;padding:8px;background:var(--color-bg);border:1px solid var(--color-border);border-radius:6px;">
            ${allTowers.length > 0 ? `<div style="font-size:10px;color:var(--color-text-dim);font-weight:700;letter-spacing:0.5px;padding:2px 0 4px;">🗼 탑</div>` : ''}
            ${allTowers.map(t => `
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:4px 6px;border-radius:4px;">
                <input type="checkbox" class="origin-check" data-type="tower" data-id="${Utils.escHtml(t.id)}"
                  ${currentOrigins.some(o => o.type === 'tower' && o.id === t.id) ? 'checked' : ''} />
                <span>${Utils.escHtml(t.name)}</span>
              </label>`).join('')}
            ${allGates.length > 0 ? `<div style="font-size:10px;color:var(--color-text-dim);font-weight:700;letter-spacing:0.5px;padding:4px 0 4px;margin-top:2px;">🌀 게이트</div>` : ''}
            ${allGates.map(g => `
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:4px 6px;border-radius:4px;">
                <input type="checkbox" class="origin-check" data-type="gate" data-id="${Utils.escHtml(g.id)}"
                  ${currentOrigins.some(o => o.type === 'gate' && o.id === g.id) ? 'checked' : ''} />
                <span>${Utils.escHtml(g.name)}</span>
              </label>`).join('')}
          </div>
        </div>` : ''}
        <div class="form-group">
          <label class="form-label">효과 (작가+소설 표시)</label>
          <textarea class="textarea-field" id="fItEffects" rows="3" placeholder="아이템 효과 (스탯 증가, 특수 효과 등)..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(it.effects || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">설명 (소설 표시용)</label>
          <textarea class="textarea-field" id="fItDesc" rows="3" placeholder="소설 내 표시될 설명..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(it.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">작가 메모 <span style="font-size:11px;color:var(--color-text-dim);">(소설에 미표시)</span></label>
          <textarea class="textarea-field" id="fItAuthor" rows="2" placeholder="설계 의도, 등장 시점 등..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(it.authorNotes || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">획득처 (소설 표시용)</label>
          <input class="input-field" id="fItSource" value="${Utils.escHtml(it.source || '')}" placeholder="예: 탑 50층 클리어 보상" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">연관 스킬</label>
          <select class="select-input" id="fItRelSkill" style="width:100%;">${relSkillOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label">이미지</label>
          <div id="fItImgPreview" style="margin-bottom:6px;">
            ${it.image ? `<img src="${it.image}" style="max-width:100px;border-radius:8px;" />` : ''}
          </div>
          <input type="file" id="fItImage" accept="image/*" style="font-size:13px;" />
        </div>
      </div>`;

    Utils.openModal(isEdit ? '아이템 편집' : '새 아이템', body, async () => {
      const name = document.getElementById('fItName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }

      let image = it.image || null;
      const fileEl = document.getElementById('fItImage');
      if (fileEl?.files?.length) {
        try { image = await Utils.imageToBase64(fileEl.files[0]); } catch(e) { Utils.toast('이미지 처리 오류', 'error'); }
      }

      const relSkillId = document.getElementById('fItRelSkill')?.value;
      let relatedSkill = null;
      if (relSkillId) {
        const sk = allSkills.find(s => s.id === relSkillId);
        if (sk) relatedSkill = { id: sk.id, name: sk.name, grade: sk.grade || '' };
      }

      const origins = Array.from(
        document.querySelectorAll('#globalModalBody .origin-check:checked')
      ).map(cb => ({ type: cb.dataset.type, id: cb.dataset.id }));

      const itemType = document.getElementById('fItType')?.value || '';
      let siegeData = null;
      if (isSiegeType(itemType)) {
        siegeData = {
          shape: document.getElementById('fSiegeShape')?.value.trim() || '',
          purpose: document.getElementById('fSiegePurpose')?.value.trim() || '',
          mechanism: document.getElementById('fSiegeMechanism')?.value.trim() || '',
          weakness: document.getElementById('fSiegeWeakness')?.value.trim() || '',
          linkedSkills: siegeLinkedSkills,
        };
      }

      const record = {
        ...(it || {}),
        worldId: wid,
        name,
        grade: document.getElementById('fItGrade')?.value || 'F',
        type: itemType,
        origins,
        towerId: null,
        effects: document.getElementById('fItEffects')?.value.trim() || '',
        description: document.getElementById('fItDesc')?.value.trim() || '',
        authorNotes: document.getElementById('fItAuthor')?.value.trim() || '',
        source: document.getElementById('fItSource')?.value.trim() || '',
        relatedSkill,
        siegeData,
        image,
        id: it.id || DB.genId(),
        createdAt: it.createdAt || Date.now(),
      };

      await DB.put('items', record);
      await AppStore.updateStreak();
      await AppStore.recordActivity('items', !isEdit);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      self._currentId = record.id;
      self._novelView = false;
      const updated = await DB.get('items', record.id);
      if (updated) self._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    // Image preview wiring + siege/defense weapon UI
    setTimeout(() => {
      document.getElementById('fItImage')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const b64 = await Utils.imageToBase64(file);
        const prev = document.getElementById('fItImgPreview');
        if (prev) prev.innerHTML = `<img src="${b64}" style="max-width:100px;border-radius:8px;" />`;
      });

      document.getElementById('fItType')?.addEventListener('change', e => {
        const sec = document.getElementById('siegeSection');
        if (sec) sec.style.display = isSiegeType(e.target.value) ? '' : 'none';
      });

      const rebindSiegeChips = () => {
        document.querySelectorAll('#siegeSkillChips .siege-skill-del').forEach(btn => {
          btn.addEventListener('click', () => {
            const chip = btn.closest('.siege-skill-chip');
            const skid = chip?.dataset.skid;
            siegeLinkedSkills = siegeLinkedSkills.filter(s => s.id !== skid);
            chip?.remove();
          });
        });
      };
      rebindSiegeChips();

      const siegeInput = document.getElementById('siegeSkillSearch');
      const siegeResults = document.getElementById('siegeSkillResults');
      if (siegeInput && siegeResults) {
        siegeInput.addEventListener('input', () => {
          const q = siegeInput.value.trim().toLowerCase();
          if (!q) { siegeResults.style.display = 'none'; return; }
          const alreadyIds = new Set(siegeLinkedSkills.map(s => s.id));
          const matches = allSkillsSorted.filter(s => !alreadyIds.has(s.id) && (s.name||'').toLowerCase().includes(q)).slice(0, 10);
          if (!matches.length) { siegeResults.style.display = 'none'; return; }
          siegeResults.style.display = 'block';
          siegeResults.innerHTML = matches.map(s => `
            <div class="siege-sk-row" data-skid="${Utils.escHtml(s.id)}"
              style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">
              ${Utils.escHtml(s.name||'')}${s.grade?`<span style="font-size:11px;color:var(--color-text-dim);margin-left:6px;">${Utils.escHtml(s.grade)}</span>`:''}
            </div>`).join('');
          siegeResults.querySelectorAll('.siege-sk-row').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              const sk = allSkillsSorted.find(s => s.id === row.dataset.skid);
              if (!sk) return;
              siegeLinkedSkills.push({ id: sk.id, name: sk.name, grade: sk.grade || '' });
              siegeInput.value = '';
              siegeResults.style.display = 'none';
              document.getElementById('siegeSkillChips').innerHTML = renderSiegeChips();
              rebindSiegeChips();
            });
          });
        });
        siegeInput.addEventListener('blur', () => setTimeout(() => { siegeResults.style.display = 'none'; }, 150));
      }
    }, 50);
  },

  // ── EXPORT ──────────────────────────────────────────────────────────────────

  _exportText: function(it) {
    const lines = [
      'ㅡ'.repeat(4),
      `ㅣ이름: ${it.name || ''}`,
      `ㅣ등급: ${it.grade || ''}`,
      it.type ? `ㅣ종류: ${it.type}` : null,
      it.effects ? `ㅣ효과:\n${it.effects}` : null,
      it.description ? `ㅣ설명: ${it.description}` : null,
      it.source ? `ㅣ획득처: ${it.source}` : null,
      'ㅡ'.repeat(4),
    ].filter(x => x !== null).join('\n');
    return lines;
  },
};
