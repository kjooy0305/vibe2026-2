'use strict';
window.Pages = window.Pages || {};
window.Pages.tower = {
  _container: null,
  _towerId: null,
  _bundleStart: null,   // null = auto-pick first bundle
  _expandedFloor: null,
  BUNDLE_SIZE: 10,

  init: async function(container, options) {
    options = options || {};
    this._container = container;
    const wid = AppStore.getCurrentWorldId();
    const world = AppStore.getState().currentWorld;

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

    if (options.towerId) this._towerId = options.towerId;
    const towers = await DB.getAll('towers', wid);

    if (this._towerId) {
      const t = towers.find(x => x.id === this._towerId);
      if (t) { this._renderTower(container, t, wid, world); return; }
    }

    this._renderTowerList(container, towers, wid, world);
  },

  destroy: function() {
    this._container = null;
    this._towerId = null;
    this._bundleStart = null;
    this._expandedFloor = null;
  },

  // ── TOWER LIST ──────────────────────────────────────────────
  _renderTowerList: function(container, towers, wid, world) {
    this._towerId = null;
    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">탑 관리</h2>
          <button class="btn btn-primary btn-sm" id="btnAddTower">+ 탑 추가</button>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${towers.length}개의 탑
        </p>
      </div>
      <div id="towerList" class="item-list">
        ${towers.length === 0 ? `
          <div class="empty-state" style="padding:48px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🗼</div>
            <div style="font-weight:700;font-size:16px;margin-bottom:4px;">탑이 없습니다</div>
            <div style="font-size:13px;color:var(--color-text-muted);">+ 탑 추가 버튼으로 첫 탑을 등록하세요</div>
          </div>
        ` : towers.map(t => this._towerCard(t)).join('')}
      </div>
    </div>`;

    document.getElementById('btnAddTower')?.addEventListener('click', () => {
      this._openTowerForm(null, wid, container, world);
    });

    container.querySelectorAll('.tower-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-tower') || e.target.closest('.btn-edit-tower')) return;
        const id = card.dataset.id;
        DB.getAll('towers', wid).then(all => {
          const t = all.find(x => x.id === id);
          if (t) {
            this._towerId = id;
            this._bundleStart = null;
            this._expandedFloor = null;
            this._renderTower(container, t, wid, world);
          }
        });
      });
    });

    container.querySelectorAll('.btn-edit-tower').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        DB.getAll('towers', wid).then(all => {
          const t = all.find(x => x.id === btn.dataset.id);
          if (t) this._openTowerForm(t, wid, container, world);
        });
      });
    });

    container.querySelectorAll('.btn-del-tower').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const card = container.querySelector(`.tower-card[data-id="${id}"]`);
        const name = card?.querySelector('.tower-name')?.textContent || '이 탑';
        Utils.confirmWithInput(`"${name}" 탑 삭제`, '탑의 모든 층 데이터가 삭제됩니다. 되돌릴 수 없습니다.', name, async () => {
          await DB.del('towers', id);
          Utils.toast('삭제됨', 'info');
          this.init(container);
        });
      });
    });
  },

  _towerCard: function(t) {
    const floors = t.floors || [];
    const floorCount = floors.length;
    const maxFloor = floorCount > 0 ? Math.max(...floors.map(f => f.floorNum || 0)) : 0;
    const hiddenCount = floors.filter(f => f.hidden).length;
    return `
    <div class="list-item tower-card"
      data-id="${Utils.escHtml(t.id)}"
      style="display:flex;align-items:center;gap:12px;padding:16px;background:var(--color-surface2);border-radius:12px;border:1px solid var(--color-border);margin-bottom:8px;cursor:pointer;">
      <div style="width:56px;height:56px;border-radius:10px;background:linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3));display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">🗼</div>
      <div style="flex:1;min-width:0;">
        <div class="tower-name" style="font-weight:700;font-size:16px;margin-bottom:3px;">${Utils.escHtml(t.name || '이름 없음')}</div>
        ${t.country ? `<div style="font-size:12px;color:var(--color-text-muted);">국가: ${Utils.escHtml(t.country)}</div>` : ''}
        <div style="font-size:12px;color:var(--color-text-muted);">
          ${floorCount > 0 ? `${maxFloor}층 · 총 ${floorCount}개` : '층 없음'}
          ${hiddenCount > 0 ? ` · 히든 ${hiddenCount}개` : ''}
        </div>
        ${t.description ? `<div style="font-size:12px;color:var(--color-text-dim);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(t.description)}</div>` : ''}
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;flex-direction:column;align-items:flex-end;">
        <button class="btn btn-ghost btn-sm btn-edit-tower" data-id="${Utils.escHtml(t.id)}" style="font-size:11px;">편집</button>
        <button class="btn btn-ghost btn-sm btn-del-tower" data-id="${Utils.escHtml(t.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  // ── TOWER FORM ──────────────────────────────────────────────
  _openTowerForm: async function(tower, wid, container, world) {
    const isEdit = !!tower;
    const t = tower || {};
    const allCountries = await DB.getAll('countries', wid);
    const countryOptions = allCountries.map(c => `<option value="${Utils.escHtml(c.name || '')}"></option>`).join('');
    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div class="form-group">
          <label class="form-label">탑 이름 *</label>
          <input class="input-field" id="fTowerName" value="${Utils.escHtml(t.name || '')}" placeholder="탑 이름" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">국가</label>
          <input class="input-field" id="fTowerCountry" list="towerCountryList" value="${Utils.escHtml(t.country || '')}" placeholder="국가 선택 또는 직접 입력" style="width:100%;box-sizing:border-box;" />
          <datalist id="towerCountryList">${countryOptions}</datalist>
          ${allCountries.length === 0 ? '<div style="font-size:11px;color:var(--color-text-dim);margin-top:2px;">국가 페이지에서 국가를 추가하면 목록에서 선택할 수 있습니다.</div>' : ''}
        </div>
        <div class="form-group">
          <label class="form-label">설명</label>
          <textarea class="input-field" id="fTowerDesc" rows="3"
            style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(t.description || '')}</textarea>
          ${isEdit && t.description ? `<button type="button" class="btn btn-ghost btn-sm" id="btnCopyTowerDescForm" style="margin-top:6px;font-size:11px;">설명 복사</button>` : ''}
        </div>
        ${!isEdit ? `
        <div class="form-group">
          <label class="form-label">사전 생성 층 수 (선택)</label>
          <input type="number" class="input-field" id="fTowerPreFloors" value="0" min="0" max="999" placeholder="0"
            style="width:100%;box-sizing:border-box;" />
          <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">입력한 숫자만큼 빈 층을 미리 만듭니다 (0 = 안 만들기)</div>
        </div>` : ''}
      </div>`;

    Utils.openModal(isEdit ? '탑 편집' : '새 탑 추가', body, async () => {
      const name = document.getElementById('fTowerName')?.value.trim();
      if (!name) { Utils.fieldError('fTowerName'); return false; }
      const preFloors = !isEdit ? (Number(document.getElementById('fTowerPreFloors')?.value) || 0) : 0;
      const preFloorArr = preFloors > 0
        ? Array.from({ length: preFloors }, (_, i) => ({
            floorNum: i + 1, theme: '', enemies: '', featureEntries: [], quests: '',
            hidden: false, image: null, subFloors: [], createdAt: Date.now(),
          }))
        : [];
      const data = {
        id: t.id || DB.genId(),
        worldId: wid,
        name,
        country: document.getElementById('fTowerCountry')?.value.trim() || '',
        description: document.getElementById('fTowerDesc')?.value.trim() || '',
        floors: isEdit ? (t.floors || []) : preFloorArr,
        createdAt: t.createdAt || Date.now(),
      };
      await DB.put('towers', data);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      const all = await DB.getAll('towers', wid);
      if (isEdit) {
        const updated = all.find(x => x.id === data.id);
        if (updated) this._renderTower(container, updated, wid, world);
        else this._renderTowerList(container, all, wid, world);
      } else {
        this._renderTowerList(container, all, wid, world);
      }
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      document.getElementById('btnCopyTowerDescForm')?.addEventListener('click', () => {
        const desc = document.getElementById('fTowerDesc')?.value.trim();
        if (desc) { Utils.copyText(desc); Utils.toast('복사됨', 'success'); }
      });
    }, 50);
  },

  // ── BUNDLE COMPUTATION ──────────────────────────────────────
  // Groups floors into 1~10, 11~20, 21~30, … bundles.
  // Floor 0 gets its own "0층 (입구)" bundle.
  _computeBundles: function(floors) {
    if (floors.length === 0) return [];
    const bs = this.BUNDLE_SIZE;
    const hasZero = floors.some(f => f.floorNum === 0);
    const posFloors = floors.filter(f => f.floorNum > 0);
    const bundles = [];

    if (hasZero) {
      bundles.push({ start: 0, end: 0, label: '0층 (입구)', floors: floors.filter(f => f.floorNum === 0) });
    }

    if (posFloors.length > 0) {
      const minF = Math.min(...posFloors.map(f => f.floorNum));
      const maxF = Math.max(...posFloors.map(f => f.floorNum));
      const firstB = Math.floor((minF - 1) / bs);
      const lastB  = Math.floor((maxF - 1) / bs);
      for (let b = firstB; b <= lastB; b++) {
        const s = b * bs + 1;
        const e = (b + 1) * bs;
        bundles.push({
          start: s, end: e,
          label: `${s}~${e}층`,
          floors: posFloors.filter(f => f.floorNum >= s && f.floorNum <= e),
        });
      }
    }
    return bundles;
  },

  // ── TOWER DETAIL VIEW ───────────────────────────────────────
  _renderTower: function(container, tower, wid, world) {
    const floors = (tower.floors || []).slice().sort((a, b) => (a.floorNum || 0) - (b.floorNum || 0));
    const bundles = this._computeBundles(floors);

    // Auto-select first bundle on first render
    if (this._bundleStart === null) {
      this._bundleStart = bundles.length > 0 ? bundles[0].start : 0;
    }

    const currentBundle = bundles.find(b => b.start === this._bundleStart) || bundles[0];
    const bundleFloors = currentBundle ? currentBundle.floors : [];

    const bundleNavHtml = bundles.map(b => {
      const isActive = currentBundle && b.start === currentBundle.start;
      const hasHidden = b.floors.some(f => f.hidden);
      return `<button class="btn ${isActive ? 'btn-primary' : 'btn-ghost'} btn-sm bundle-nav-btn"
        data-bundle-start="${b.start}"
        style="font-size:12px;padding:4px 10px;position:relative;">
        ${b.label}
        ${hasHidden ? '<span style="position:absolute;top:2px;right:2px;width:5px;height:5px;background:#fbbf24;border-radius:50%;display:inline-block;"></span>' : ''}
      </button>`;
    }).join('');

    const floorItemsHtml = bundleFloors.length === 0
      ? `<div style="padding:32px;text-align:center;color:var(--color-text-muted);font-size:13px;">이 구간에 등록된 층이 없습니다.<br><button class="btn btn-ghost btn-sm" id="btnAddFloorEmpty" style="margin-top:8px;">+ 층 추가</button></div>`
      : bundleFloors.map(f => this._floorCard(f, this._expandedFloor === f.floorNum)).join('');

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackTowers">← 목록</button>
          <h2 class="page-title" style="font-size:18px;">🗼 ${Utils.escHtml(tower.name || '탑')}</h2>
          ${tower.country ? `<span style="font-size:12px;color:var(--color-text-muted);">[${Utils.escHtml(tower.country)}]</span>` : ''}
        </div>
        ${tower.description ? `<p style="font-size:12px;color:var(--color-text-muted);margin-top:4px;">${Utils.escHtml(tower.description)}</p>` : ''}
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditTower">탑 편집</button>
          ${tower.description ? `<button class="btn btn-ghost btn-sm" id="btnCopyTowerDesc">설명 복사</button>` : ''}
          <button class="btn btn-primary btn-sm" id="btnAddFloor">+ 층 추가</button>
        </div>
      </div>

      <!-- Bundle navigation -->
      ${bundles.length > 0 ? `
        <div style="margin-bottom:12px;">
          <div style="font-size:10px;color:var(--color-text-muted);font-weight:700;margin-bottom:6px;letter-spacing:1px;text-transform:uppercase;">층 구간</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;" id="bundleNav">
            ${bundleNavHtml}
          </div>
        </div>` : ''}

      <div id="floorList">${floorItemsHtml}</div>

      ${bundles.length === 0 ? `
        <div class="empty-state" style="padding:32px;text-align:center;">
          <div style="font-size:40px;margin-bottom:10px;">🏗️</div>
          <div style="font-weight:700;margin-bottom:4px;">층이 없습니다</div>
          <div style="font-size:13px;color:var(--color-text-muted);">+ 층 추가 버튼으로 층을 등록하세요</div>
        </div>` : ''}
    </div>`;

    // ── Events ──
    document.getElementById('btnBackTowers')?.addEventListener('click', () => {
      this._towerId = null;
      this.init(container);
    });
    document.getElementById('btnEditTower')?.addEventListener('click', () => {
      this._openTowerForm(tower, wid, container, world);
    });
    document.getElementById('btnCopyTowerDesc')?.addEventListener('click', () => {
      Utils.copyText(tower.description || '');
      Utils.toast('설명 복사됨', 'success');
    });
    document.getElementById('btnAddFloor')?.addEventListener('click', () => {
      this._openFloorForm(null, tower, wid, container, world);
    });
    document.getElementById('btnAddFloorEmpty')?.addEventListener('click', () => {
      this._openFloorForm(null, tower, wid, container, world);
    });

    container.querySelectorAll('.bundle-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._bundleStart = parseInt(btn.dataset.bundleStart, 10);
        this._expandedFloor = null;
        DB.getAll('towers', wid).then(all => {
          const t = all.find(x => x.id === tower.id);
          if (t) this._renderTower(container, t, wid, world);
        });
      });
    });

    container.querySelectorAll('.floor-card-header').forEach(hdr => {
      hdr.addEventListener('click', e => {
        if (e.target.closest('.btn-floor-action')) return;
        const floorNum = parseInt(hdr.dataset.floorNum, 10);
        this._expandedFloor = this._expandedFloor === floorNum ? null : floorNum;
        DB.getAll('towers', wid).then(all => {
          const t = all.find(x => x.id === tower.id);
          if (t) this._renderTower(container, t, wid, world);
        });
      });
    });

    container.querySelectorAll('.btn-edit-floor').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const floorNum = parseInt(btn.dataset.floorNum, 10);
        const floor = (tower.floors || []).find(f => f.floorNum === floorNum);
        if (floor) this._openFloorForm(floor, tower, wid, container, world);
      });
    });

    container.querySelectorAll('.btn-del-floor').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const floorNum = parseInt(btn.dataset.floorNum, 10);
        Utils.confirmWithInput(`${floorNum}층 삭제`, `삭제하려면 층 번호(${floorNum})를 입력하세요. 서브층도 함께 삭제됩니다.`, String(floorNum), async () => {
          tower.floors = (tower.floors || []).filter(f => f.floorNum !== floorNum);
          await DB.put('towers', tower);
          if (this._expandedFloor === floorNum) this._expandedFloor = null;
          Utils.toast('삭제됨', 'info');
          const all = await DB.getAll('towers', wid);
          const t = all.find(x => x.id === tower.id);
          if (t) this._renderTower(container, t, wid, world);
        });
      });
    });

    container.querySelectorAll('.btn-add-subfloor').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const floorNum = parseInt(btn.dataset.floorNum, 10);
        const isHidden = btn.dataset.hidden === 'true';
        const floor = (tower.floors || []).find(f => f.floorNum === floorNum);
        if (floor) this._openSubFloorForm(null, floor, tower, wid, container, world, isHidden);
      });
    });

    container.querySelectorAll('.btn-edit-subfloor').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const floorNum = parseInt(btn.dataset.floorNum, 10);
        const subId = btn.dataset.subId;
        const floor = (tower.floors || []).find(f => f.floorNum === floorNum);
        const sub = (floor?.subFloors || []).find(s => s.subId === subId);
        if (floor && sub) this._openSubFloorForm(sub, floor, tower, wid, container, world);
      });
    });

    container.querySelectorAll('.btn-del-subfloor').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const floorNum = parseInt(btn.dataset.floorNum, 10);
        const subId = btn.dataset.subId;
        const floor = (tower.floors || []).find(f => f.floorNum === floorNum);
        const sub = (floor?.subFloors || []).find(s => s.subId === subId);
        if (!floor) return;
        Utils.confirmWithInput('서브층 삭제', '삭제하면 되돌릴 수 없습니다.', sub?.name || '서브층', async () => {
          floor.subFloors = (floor.subFloors || []).filter(s => s.subId !== subId);
          await DB.put('towers', tower);
          Utils.toast('삭제됨', 'info');
          const all = await DB.getAll('towers', wid);
          const t = all.find(x => x.id === tower.id);
          if (t) this._renderTower(container, t, wid, world);
        });
      });
    });
  },

  // ── FLOOR CARD (accordion) ──────────────────────────────────
  _floorCard: function(floor, expanded) {
    const fn = floor.floorNum;
    const isZero = fn === 0;
    const accentColor = isZero ? '#10b981' : floor.hidden ? '#f43f5e'
      : fn <= 30 ? '#60a5fa' : fn <= 60 ? '#a78bfa' : fn <= 90 ? '#f59e0b' : '#34d399';
    const bgGrad = `linear-gradient(135deg,${accentColor}18 0%,transparent 60%)`;
    const subFloorCount = (floor.subFloors || []).length;
    const subFloorsHtml = (floor.subFloors || []).map(sf => this._subFloorSection(floor, sf)).join('');
    const concepts = floor.concepts || [];

    // Concept badge colors
    const conceptMeta = { wave:'#60a5fa', exploration:'#34d399', decapitation:'#f87171', boss:'#c084fc' };
    const conceptLabels = { wave:'웨이브', exploration:'탐험', decapitation:'참수', boss:'보스전' };
    const conceptBadgesHtml = concepts.map(c => {
      const col = conceptMeta[c] || '#9ca3af';
      return `<span style="background:${col}22;color:${col};border:1px solid ${col}55;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:700;">${conceptLabels[c] || c}</span>`;
    }).join('');

    // Concept-based detail summary
    let conceptDetailHtml = '';
    if (concepts.length > 0) {
      if (concepts.includes('wave') && floor.waveConfig) {
        const wc = floor.waveConfig;
        const waveCount = (wc.waves || []).length;
        let enemyKindSet = new Set();
        (wc.waves || []).forEach(w => (w.enemies || []).forEach(e => enemyKindSet.add(e.name)));
        conceptDetailHtml += `<div style="font-size:12px;margin-bottom:4px;">🌊 웨이브: ${waveCount}웨이브, 총 적 ${enemyKindSet.size}종</div>`;
      }
      if (concepts.includes('boss') && floor.bossConfig) {
        const bc = floor.bossConfig;
        const bossNames = (bc.enemies || []).map(e => Utils.escHtml(e.name)).join(', ');
        const phaseCount = (bc.phases || []).length;
        conceptDetailHtml += `<div style="font-size:12px;margin-bottom:4px;">👑 보스: ${bossNames || '?'}, ${phaseCount}페이즈</div>`;
      }
      if (concepts.includes('decapitation') && floor.decapitationConfig) {
        const names = (floor.decapitationConfig.targets || []).map(t => Utils.escHtml(t.name)).join(', ');
        conceptDetailHtml += `<div style="font-size:12px;margin-bottom:4px;">⚔️ 제거 대상: ${names || '없음'}</div>`;
      }
      if (concepts.includes('exploration') && floor.explorationConfig) {
        const ex = floor.explorationConfig;
        const tgtName = ex.target?.name || '';
        conceptDetailHtml += `<div style="font-size:12px;margin-bottom:4px;">🔍 탐험 목표: ${Utils.escHtml(tgtName) || '?'}</div>`;
      }
    }

    const detailHtml = expanded ? `
      <div style="padding:14px 16px 16px;border-top:1px solid var(--color-border);">
        ${floor.theme ? `
          <div style="margin-bottom:10px;">
            <span style="font-size:11px;color:var(--color-text-muted);font-weight:600;">테마</span>
            <span style="font-size:13px;margin-left:8px;">${Utils.escHtml(floor.theme)}</span>
          </div>` : ''}
        ${concepts.length > 0 ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">ㅣ[컨셉]</div>
            <div style="padding-left:8px;">${conceptDetailHtml || '<span style="font-size:12px;color:var(--color-text-dim);">-</span>'}</div>
          </div>` : ''}
        ${(!concepts.length && floor.enemies) ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">ㅣ[적]</div>
            ${floor.enemies.split('\n').map(e => e.trim()).filter(Boolean).map(e =>
              `<div style="font-size:13px;padding:1px 0 1px 8px;">ㄴ${Utils.escHtml(e)}</div>`).join('')}
          </div>` : ''}
        ${(() => {
            const featureEntries = floor.featureEntries || [];
            if (featureEntries.length > 0) {
              const REF_ICONS_D = { monster: '👾', stat: '📊', skill: '✨', '': '📝' };
              const listHtml = featureEntries.map((e, i) => {
                const refBadge = e.refType ? `<span style="font-size:11px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:4px;padding:1px 5px;margin-right:4px;">${REF_ICONS_D[e.refType] || '📝'} ${Utils.escHtml(e.refName)}</span>` : '';
                return `<div style="font-size:13px;padding:1px 0 1px 8px;line-height:1.7;">ㄴ ${refBadge}${Utils.escHtml(e.text)}</div>`;
              }).join('');
              return `<div style="margin-bottom:10px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">ㅣ[특징]</div>${listHtml}</div>`;
            } else if (floor.features) {
              return `<div style="margin-bottom:10px;"><div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">ㅣ[특징]</div>${floor.features.split('\n').map(l => l.trim()).filter(Boolean).map(l => `<div style="font-size:13px;padding:1px 0 1px 8px;line-height:1.7;">ㄴ${Utils.escHtml(l)}</div>`).join('')}</div>`;
            }
            return '';
          })()}
        ${floor.quests ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">ㅣ[퀘스트]</div>
            <div style="font-size:13px;white-space:pre-wrap;padding-left:8px;line-height:1.7;word-break:break-word;overflow-wrap:break-word;">${Utils.nl2br(Utils.escHtml(floor.quests))}</div>
          </div>` : ''}
        ${floor.image ? `<div style="margin-bottom:10px;"><img src="${floor.image}" style="max-width:100%;border-radius:8px;" loading="lazy" /></div>` : ''}

        ${subFloorsHtml ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--color-border);">
            <div style="font-size:11px;color:#fbbf24;font-weight:700;margin-bottom:8px;letter-spacing:0.5px;">히든 서브층 (${subFloorCount}개)</div>
            ${subFloorsHtml}
          </div>` : ''}

        <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm btn-add-subfloor btn-floor-action" data-floor-num="${fn}" data-hidden="false"
            style="font-size:12px;border:1px dashed rgba(99,102,241,0.4);color:#a5b4fc;">+ 서브층 추가</button>
          <button class="btn btn-ghost btn-sm btn-add-subfloor btn-floor-action" data-floor-num="${fn}" data-hidden="true"
            style="font-size:12px;border:1px dashed rgba(251,191,36,0.5);color:#fbbf24;">🔒 히든층 추가</button>
        </div>
      </div>` : '';

    const compositeLabel = floor.isComposite && floor.compositeRange ? floor.compositeRange : null;

    return `
    <div class="floor-card" data-floor-num="${fn}"
      style="background:var(--color-surface2);border-radius:10px;border:1px solid ${accentColor}44;margin-bottom:8px;overflow:hidden;">
      <div class="floor-card-header" data-floor-num="${fn}"
        style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:${bgGrad};cursor:pointer;user-select:none;">
        <div style="min-width:52px;text-align:center;flex-shrink:0;">
          ${compositeLabel
            ? `<div style="font-weight:900;font-size:14px;line-height:1.2;color:${accentColor};">${Utils.escHtml(compositeLabel)}</div>`
            : `<div style="font-weight:900;font-size:22px;line-height:1;color:${accentColor};">${fn}</div>`}
          <div style="font-size:10px;color:var(--color-text-muted);">${isZero ? '0층' : '층'}</div>
        </div>
        <div style="flex:1;min-width:0;">
          ${floor.theme ? `<div style="font-weight:600;font-size:13px;margin-bottom:2px;">${Utils.escHtml(floor.theme)}</div>` : ''}
          <div style="font-size:11px;color:var(--color-text-muted);display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            ${conceptBadgesHtml}
            ${(!concepts.length && floor.enemies) ? `<span>${Utils.escHtml(floor.enemies.split('\n')[0]).substring(0, 30)}${floor.enemies.split('\n')[0].length > 30 ? '…' : ''}</span>` : ''}
            ${floor.isComposite ? `<span style="background:rgba(16,185,129,0.12);color:#10b981;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:700;">🔀 통합${floor.compositeRange ? ' ' + Utils.escHtml(floor.compositeRange) : ''}</span>` : ''}
            ${subFloorCount > 0 ? `<span style="background:rgba(139,92,246,0.15);color:#a78bfa;padding:1px 5px;border-radius:4px;font-size:10px;">서브 ${subFloorCount}개</span>` : ''}
            ${floor.hidden ? `<span style="background:rgba(251,191,36,0.12);color:#fbbf24;padding:1px 5px;border-radius:4px;font-size:10px;">히든</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;align-items:center;">
          <button class="btn btn-ghost btn-sm btn-floor-action btn-edit-floor" data-floor-num="${fn}" style="font-size:11px;padding:3px 7px;">편집</button>
          <button class="btn btn-ghost btn-sm btn-floor-action btn-del-floor" data-floor-num="${fn}" style="color:var(--color-danger);font-size:11px;padding:3px 7px;">삭제</button>
          <span style="font-size:12px;color:var(--color-text-muted);margin-left:2px;">${expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      ${detailHtml}
    </div>`;
  },

  // ── SUB-FLOOR CARD ──────────────────────────────────────────
  _subFloorSection: function(parentFloor, sf) {
    const label = sf.name || `${parentFloor.floorNum}-서브`;
    const isHidden = !!sf.hidden;
    const accentColor = isHidden ? '#fbbf24' : '#a5b4fc';
    const borderColor = isHidden ? 'rgba(251,191,36,0.45)' : 'rgba(99,102,241,0.35)';
    const ACCESS_LABEL = { quest: '퀘스트', item: '아이템', stat: '스텟', skill: '스킬', level: '레벨', hidden: '히든조건' };
    const accessChips = (sf.accessTypes || []).map(id =>
      `<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(99,102,241,0.15);color:#a5b4fc;border:1px solid rgba(99,102,241,0.3);">${ACCESS_LABEL[id] || id}</span>`
    ).join('');
    return `
    <div style="border-left:2px solid ${borderColor};padding-left:12px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <div style="font-weight:700;font-size:13px;color:${accentColor};display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
          ${Utils.escHtml(label)}
          ${sf.theme ? `<span style="font-size:11px;color:var(--color-text-muted);font-weight:400;">· ${Utils.escHtml(sf.theme)}</span>` : ''}
          ${isHidden ? '<span style="font-size:10px;background:rgba(251,191,36,0.12);color:#fbbf24;padding:1px 5px;border-radius:4px;">🔒 히든</span>' : ''}
        </div>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm btn-edit-subfloor btn-floor-action" data-floor-num="${parentFloor.floorNum}" data-sub-id="${Utils.escHtml(sf.subId)}" style="font-size:11px;padding:2px 6px;">편집</button>
          <button class="btn btn-ghost btn-sm btn-del-subfloor btn-floor-action" data-floor-num="${parentFloor.floorNum}" data-sub-id="${Utils.escHtml(sf.subId)}" style="color:var(--color-danger);font-size:11px;padding:2px 6px;">삭제</button>
        </div>
      </div>
      ${accessChips || sf.accessDesc ? `
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:4px;padding-left:4px;">
          ${accessChips}
          ${sf.accessDesc ? `<span style="font-size:11px;color:var(--color-text-muted);">${Utils.escHtml(sf.accessDesc)}</span>` : ''}
        </div>` : ''}
      ${sf.enemies ? `
        <div style="font-size:12px;margin-bottom:3px;">
          ${sf.enemies.split('\n').filter(Boolean).map(e => `<div style="padding-left:4px;">ㄴ적: ${Utils.escHtml(e.trim())}</div>`).join('')}
        </div>` : ''}
      ${sf.features ? `<div style="font-size:12px;white-space:pre-wrap;padding-left:4px;line-height:1.7;margin-bottom:3px;word-break:break-word;overflow-wrap:break-word;">${sf.features.split('\n').map(l => l.trim()).filter(Boolean).map(l => `ㄴ${Utils.escHtml(l)}`).join('<br>')}</div>` : ''}
      ${sf.quests ? `<div style="font-size:12px;padding-left:4px;margin-bottom:3px;">ㄴ퀘스트: ${Utils.escHtml(sf.quests)}</div>` : ''}
      ${sf.image ? `<div style="margin-top:6px;"><img src="${sf.image}" style="max-width:100%;max-height:120px;border-radius:6px;" loading="lazy" /></div>` : ''}
    </div>`;
  },
};
