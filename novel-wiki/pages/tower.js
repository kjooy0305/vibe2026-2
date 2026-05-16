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
          ${floorCount > 0 ? `최고 ${maxFloor}층 · ${floorCount}개 층 등록` : '층 없음'}
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
            floorNum: i + 1, theme: '', enemies: '', features: '', quests: '',
            rewards: '', hidden: false, image: null, subFloors: [], createdAt: Date.now(),
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
        const floor = (tower.floors || []).find(f => f.floorNum === floorNum);
        if (floor) this._openSubFloorForm(null, floor, tower, wid, container, world);
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
    const accentColor = isZero ? '#10b981' : floor.hidden ? '#fbbf24' : '#818cf8';
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
        ${floor.features ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">ㅣ[특징]</div>
            ${floor.features.split('\n').map(l => l.trim()).filter(Boolean).map(l =>
              `<div style="font-size:13px;padding:1px 0 1px 8px;line-height:1.7;">ㄴ${Utils.escHtml(l)}</div>`).join('')}
          </div>` : ''}
        ${floor.quests ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">ㅣ[퀘스트]</div>
            <div style="font-size:13px;white-space:pre-wrap;padding-left:8px;line-height:1.7;word-break:break-word;overflow-wrap:break-word;">${Utils.nl2br(Utils.escHtml(floor.quests))}</div>
          </div>` : ''}
        ${floor.rewards ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">ㅣ[보상]</div>
            <div style="font-size:13px;white-space:pre-wrap;padding-left:8px;line-height:1.7;word-break:break-word;overflow-wrap:break-word;">${Utils.nl2br(Utils.escHtml(floor.rewards))}</div>
          </div>` : ''}
        ${floor.image ? `<div style="margin-bottom:10px;"><img src="${floor.image}" style="max-width:100%;border-radius:8px;" loading="lazy" /></div>` : ''}

        ${subFloorsHtml ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--color-border);">
            <div style="font-size:11px;color:#fbbf24;font-weight:700;margin-bottom:8px;letter-spacing:0.5px;">히든 서브층 (${subFloorCount}개)</div>
            ${subFloorsHtml}
          </div>` : ''}

        <div style="margin-top:12px;">
          <button class="btn btn-ghost btn-sm btn-add-subfloor btn-floor-action" data-floor-num="${fn}"
            style="font-size:12px;border:1px dashed var(--color-border);">+ 히든 층 추가</button>
        </div>
      </div>` : '';

    return `
    <div class="floor-card" data-floor-num="${fn}"
      style="background:var(--color-surface2);border-radius:10px;border:1px solid ${accentColor}44;margin-bottom:8px;overflow:hidden;">
      <div class="floor-card-header" data-floor-num="${fn}"
        style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:${bgGrad};cursor:pointer;user-select:none;">
        <div style="min-width:52px;text-align:center;flex-shrink:0;">
          <div style="font-weight:900;font-size:22px;line-height:1;color:${accentColor};">${fn}</div>
          <div style="font-size:10px;color:var(--color-text-muted);">${isZero ? '0층' : '층'}</div>
        </div>
        <div style="flex:1;min-width:0;">
          ${floor.theme ? `<div style="font-weight:600;font-size:13px;margin-bottom:2px;">${Utils.escHtml(floor.theme)}</div>` : ''}
          <div style="font-size:11px;color:var(--color-text-muted);display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            ${conceptBadgesHtml}
            ${(!concepts.length && floor.enemies) ? `<span>${Utils.escHtml(floor.enemies.split('\n')[0]).substring(0, 30)}${floor.enemies.split('\n')[0].length > 30 ? '…' : ''}</span>` : ''}
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
    return `
    <div style="border-left:2px solid rgba(251,191,36,0.4);padding-left:12px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <div style="font-weight:700;font-size:13px;color:#fbbf24;">
          ${Utils.escHtml(label)}
          ${sf.theme ? `<span style="font-size:11px;color:var(--color-text-muted);font-weight:400;margin-left:6px;">· ${Utils.escHtml(sf.theme)}</span>` : ''}
          ${sf.hidden ? '<span style="font-size:10px;background:rgba(251,191,36,0.12);color:#fbbf24;padding:1px 5px;border-radius:4px;margin-left:4px;">히든</span>' : ''}
        </div>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm btn-edit-subfloor btn-floor-action" data-floor-num="${parentFloor.floorNum}" data-sub-id="${Utils.escHtml(sf.subId)}" style="font-size:11px;padding:2px 6px;">편집</button>
          <button class="btn btn-ghost btn-sm btn-del-subfloor btn-floor-action" data-floor-num="${parentFloor.floorNum}" data-sub-id="${Utils.escHtml(sf.subId)}" style="color:var(--color-danger);font-size:11px;padding:2px 6px;">삭제</button>
        </div>
      </div>
      ${sf.enemies ? `
        <div style="font-size:12px;margin-bottom:3px;">
          ${sf.enemies.split('\n').filter(Boolean).map(e => `<div style="padding-left:4px;">ㄴ적: ${Utils.escHtml(e.trim())}</div>`).join('')}
        </div>` : ''}
      ${sf.features ? `<div style="font-size:12px;white-space:pre-wrap;padding-left:4px;line-height:1.7;margin-bottom:3px;word-break:break-word;overflow-wrap:break-word;">${sf.features.split('\n').map(l => l.trim()).filter(Boolean).map(l => `ㄴ${Utils.escHtml(l)}`).join('<br>')}</div>` : ''}
      ${sf.quests ? `<div style="font-size:12px;padding-left:4px;margin-bottom:3px;">ㄴ퀘스트: ${Utils.escHtml(sf.quests)}</div>` : ''}
      ${sf.rewards ? `<div style="font-size:12px;padding-left:4px;color:var(--color-text-muted);">ㄴ보상: ${Utils.escHtml(sf.rewards)}</div>` : ''}
      ${sf.image ? `<div style="margin-top:6px;"><img src="${sf.image}" style="max-width:100%;max-height:120px;border-radius:6px;" loading="lazy" /></div>` : ''}
    </div>`;
  },

  // ── FLOOR FORM ──────────────────────────────────────────────
  _openFloorForm: async function(floor, tower, wid, container, world) {
    const isEdit = !!floor;
    const f = floor || {};
    let newImage = f.image || null;

    const existingFloors = tower.floors || [];
    const defaultFloorNum = !isEdit
      ? (existingFloors.length > 0 ? Math.max(...existingFloors.map(ff => ff.floorNum || 0)) + 1 : 1)
      : undefined;

    // Load all required data
    const [allMonsters, allChars, allTraps, allItems, allPlaces, allSkills] = await Promise.all([
      DB.getAll('monsters', wid),
      DB.getAll('characters', wid),
      DB.getAll('traps', wid),
      DB.getAll('items', wid),
      DB.getAll('places', wid),
      DB.getAll('skills', wid),
    ]);

    // State
    let formConcepts = new Set(f.concepts || []);
    let formWaves = (f.waveConfig?.waves || []).map(w => ({
      ...w,
      enemies: [...(w.enemies || [])],
      traps: [...(w.traps || [])],
    }));
    let bossPhases = (f.bossConfig?.phases || []).map(p => ({
      ...p,
      attacks: [...(p.attacks || [])],
    }));
    let bossEnemies = [...(f.bossConfig?.enemies || [])];
    let decapTargets = [...(f.decapitationConfig?.targets || [])];
    let exRef = { ...(f.explorationConfig?.target || { id: '', name: '' }) };

    // Place ref helpers
    const mkPlaceRef = (src) => ({ type: src?.type || 'text', id: src?.id || '', name: src?.name || '', desc: src?.desc || '' });
    let waveGlobalFixedPlace = mkPlaceRef(f.waveConfig?.fixedPlace);
    let bossPlace = mkPlaceRef(f.bossConfig?.place);

    // ── HTML Builders ──

    const placeRefHtml = (prefix, ref) => `
      <div class="place-ref-wrap" id="${prefix}PlaceRefWrap" style="margin-top:6px;">
        <div style="display:flex;gap:12px;margin-bottom:4px;">
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
            <input type="radio" name="${prefix}PlaceType" value="text" ${ref.type === 'text' ? 'checked' : ''} /> 텍스트 입력
          </label>
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
            <input type="radio" name="${prefix}PlaceType" value="ref" ${ref.type === 'ref' ? 'checked' : ''} /> 장소창에서 선택
          </label>
        </div>
        <div id="${prefix}PlaceTextDiv" style="display:${ref.type !== 'ref' ? 'block' : 'none'};">
          <input class="input-field" id="${prefix}PlaceText" value="${Utils.escHtml(ref.desc || '')}" placeholder="장소 설명 입력" style="width:100%;box-sizing:border-box;font-size:12px;" />
        </div>
        <div id="${prefix}PlaceRefDiv" style="display:${ref.type === 'ref' ? 'block' : 'none'};position:relative;">
          <input class="input-field" id="${prefix}PlaceSearch" placeholder="장소 검색..." value="${Utils.escHtml(ref.name || '')}" style="width:100%;box-sizing:border-box;font-size:12px;" autocomplete="off" />
          <div id="${prefix}PlaceResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:140px;overflow-y:auto;top:100%;left:0;"></div>
          <input type="hidden" id="${prefix}PlaceId" value="${Utils.escHtml(ref.id || '')}" />
          ${ref.name ? `<div id="${prefix}PlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;">선택됨: ${Utils.escHtml(ref.name)}</div>` : `<div id="${prefix}PlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;display:none;"></div>`}
        </div>
      </div>`;

    const chipHtml = (e, type) => {
      const icon = type === 'char' ? '👤' : type === 'trap' ? '⚠️' : type === 'item' ? '📦' : '👾';
      const gradeStr = e.grade ? ` (${Utils.escHtml(e.grade)})` : '';
      return `<span class="entity-chip" data-eid="${Utils.escHtml(e.id)}" data-etype="${type}" data-ename="${Utils.escHtml(e.name || '')}" data-egrade="${Utils.escHtml(e.grade || '')}" style="display:inline-flex;align-items:center;gap:3px;background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:6px;padding:2px 5px;margin:2px;font-size:12px;max-width:100%;box-sizing:border-box;">
        <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:1;">${icon} ${Utils.escHtml(e.name)}${gradeStr}</span>
        <input type="number" class="chip-count" value="${e.count || 1}" min="1" style="width:36px;flex-shrink:0;padding:1px 3px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font-size:11px;text-align:center;" />
        <input class="chip-unit" value="${Utils.escHtml(e.unit || (type === 'char' ? '명' : type === 'trap' ? '개' : '마리'))}" style="width:28px;flex-shrink:0;padding:1px 3px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font-size:11px;" />
        <button class="chip-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:12px;padding:0 2px;flex-shrink:0;">✕</button>
      </span>`;
    };

    const entitySearchHtml = (inputId, resultId, placeholder) => `
      <div style="position:relative;margin-top:4px;">
        <input class="input-field" id="${inputId}" placeholder="${placeholder}" autocomplete="off"
          style="width:100%;box-sizing:border-box;font-size:12px;" />
        <div id="${resultId}" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:140px;overflow-y:auto;top:100%;left:0;"></div>
      </div>`;

    const waveRowHtml = (w, idx) => {
      const locationFixed = w.locationFixed || 'move';
      const wavePlace = mkPlaceRef(w.place);
      const enemyChips = (w.enemies || []).map(e => chipHtml(e, e.type || 'monster')).join('');
      const trapChips = (w.traps || []).map(t => chipHtml(t, 'trap')).join('');
      const clearCondType = w.clearConditionType || (w.explorationLink ? 'exploration' : (w.clearCondition ? 'custom' : 'enemies'));
      const radioStyle = 'display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;';
      return `
      <div class="wave-row" data-widx="${idx}" style="background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:8px;padding:10px;margin-bottom:8px;width:100%;box-sizing:border-box;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-weight:700;font-size:13px;color:#60a5fa;">${idx + 1}웨이브</div>
          <button class="btn btn-ghost btn-sm wave-del-btn" data-widx="${idx}" style="color:var(--color-danger);font-size:11px;">삭제</button>
        </div>
        <div class="wave-location-wrap" style="margin-bottom:6px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">이동 유형</div>
          <div style="display:flex;gap:10px;">
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
              <input type="radio" name="waveLoc${idx}" class="wave-loc-radio" value="fixed" ${locationFixed === 'fixed' ? 'checked' : ''} data-widx="${idx}" /> 장소고정
            </label>
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
              <input type="radio" name="waveLoc${idx}" class="wave-loc-radio" value="move" ${locationFixed === 'move' ? 'checked' : ''} data-widx="${idx}" /> 이동
            </label>
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
              <input type="radio" name="waveLoc${idx}" class="wave-loc-radio" value="puzzle" ${locationFixed === 'puzzle' ? 'checked' : ''} data-widx="${idx}" /> 퍼즐
            </label>
          </div>
          <div class="wave-place-ref-wrap" id="wavePlaceRef${idx}" style="margin-top:4px;display:${locationFixed === 'fixed' ? 'block' : 'none'};">
            ${placeRefHtml('waveP' + idx, wavePlace)}
          </div>
        </div>
        <div style="margin-bottom:6px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-bottom:4px;">
            <input type="checkbox" class="wave-event-cb" data-widx="${idx}" ${w.hasEvent ? 'checked' : ''} /> 사건발생
          </label>
          <div class="wave-event-wrap" id="waveEventWrap${idx}" style="display:${w.hasEvent ? 'block' : 'none'};">
            <textarea class="input-field wave-event-desc" data-widx="${idx}" rows="2" placeholder="사건 설명"
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(w.eventDesc || '')}</textarea>
          </div>
        </div>
        <div style="margin-bottom:6px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">적</div>
          <div class="wave-enemy-chips" id="waveEnemyChips${idx}" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${enemyChips}</div>
          ${entitySearchHtml('waveEnemySearch' + idx, 'waveEnemyResults' + idx, '몬스터/캐릭터 검색...')}
        </div>
        <div style="margin-bottom:6px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">트랩</div>
          <div class="wave-trap-chips" id="waveTrapChips${idx}" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${trapChips}</div>
          ${entitySearchHtml('waveTrapSearch' + idx, 'waveTrapResults' + idx, '트랩 검색...')}
        </div>
        <div class="form-group" style="margin-bottom:4px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">클리어 조건</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <label style="${radioStyle}">
              <input type="radio" name="waveClearType${idx}" class="wave-clear-type" value="enemies" data-widx="${idx}" ${clearCondType === 'enemies' ? 'checked' : ''} /> 적 처치 완료
            </label>
            <label style="${radioStyle}">
              <input type="radio" name="waveClearType${idx}" class="wave-clear-type" value="exploration" data-widx="${idx}" ${clearCondType === 'exploration' ? 'checked' : ''} /> 탐험 클리어
            </label>
            <label style="${radioStyle}">
              <input type="radio" name="waveClearType${idx}" class="wave-clear-type" value="decapitation" data-widx="${idx}" ${clearCondType === 'decapitation' ? 'checked' : ''} /> 참수 클리어
            </label>
            <label style="${radioStyle}">
              <input type="radio" name="waveClearType${idx}" class="wave-clear-type" value="boss" data-widx="${idx}" ${clearCondType === 'boss' ? 'checked' : ''} /> 보스전 클리어
            </label>
            <label style="${radioStyle}">
              <input type="radio" name="waveClearType${idx}" class="wave-clear-type" value="custom" data-widx="${idx}" ${clearCondType === 'custom' ? 'checked' : ''} /> 직접 입력
            </label>
          </div>
          <div id="waveClearCustomWrap${idx}" style="display:${clearCondType === 'custom' ? 'block' : 'none'};margin-top:4px;">
            <input class="input-field wave-clear-cond" data-widx="${idx}" value="${Utils.escHtml(w.clearCondition || '')}" placeholder="클리어 조건 내용"
              style="width:100%;box-sizing:border-box;font-size:12px;" />
          </div>
        </div>
      </div>`;
    };

    const phaseRowHtml = (p, pidx) => {
      const attacksHtml = (p.attacks || []).map((atk, aidx) => `
        <div class="atk-row" data-pidx="${pidx}" data-aidx="${aidx}" style="background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;padding:8px;margin-bottom:6px;width:100%;box-sizing:border-box;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <div style="font-size:11px;font-weight:700;color:#c084fc;">공격 ${aidx + 1}</div>
            <button class="btn btn-ghost btn-sm atk-del-btn" data-pidx="${pidx}" data-aidx="${aidx}" style="color:var(--color-danger);font-size:10px;">삭제</button>
          </div>
          <input class="input-field atk-name" data-pidx="${pidx}" data-aidx="${aidx}" value="${Utils.escHtml(atk.name || '')}" placeholder="공격 이름"
            style="width:100%;box-sizing:border-box;font-size:12px;margin-bottom:4px;" />
          <div style="position:relative;margin-bottom:4px;">
            <input class="input-field atk-skill-search" data-pidx="${pidx}" data-aidx="${aidx}" placeholder="스킬 검색..." value="${Utils.escHtml(atk.skillName || '')}"
              autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div class="atk-skill-results" data-pidx="${pidx}" data-aidx="${aidx}" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
            <input type="hidden" class="atk-skill-id" data-pidx="${pidx}" data-aidx="${aidx}" value="${Utils.escHtml(atk.skillId || '')}" />
          </div>
          <textarea class="input-field atk-desc" data-pidx="${pidx}" data-aidx="${aidx}" rows="2" placeholder="공격 설명"
            style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(atk.desc || '')}</textarea>
        </div>`).join('');
      return `
      <div class="phase-row" data-pidx="${pidx}" style="background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:8px;padding:10px;margin-bottom:8px;width:100%;box-sizing:border-box;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="font-weight:700;font-size:13px;color:#c084fc;">페이즈 ${pidx + 1}</div>
          <button class="btn btn-ghost btn-sm phase-del-btn" data-pidx="${pidx}" style="color:var(--color-danger);font-size:11px;">삭제</button>
        </div>
        <input class="input-field phase-cond" data-pidx="${pidx}" value="${Utils.escHtml(p.condition || '')}" placeholder="HP% 조건 (예: HP 50% 이하)"
          style="width:100%;box-sizing:border-box;font-size:12px;margin-bottom:4px;" />
        <textarea class="input-field phase-desc" data-pidx="${pidx}" rows="2" placeholder="페이즈 설명"
          style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;margin-bottom:6px;">${Utils.escHtml(p.desc || '')}</textarea>
        <div class="phase-attacks" id="phaseAttacks${pidx}">${attacksHtml}</div>
        <button class="btn btn-ghost btn-sm atk-add-btn" data-pidx="${pidx}" style="font-size:11px;border:1px dashed var(--color-border);width:100%;">+ 공격 추가</button>
      </div>`;
    };

    const imgHtml = newImage
      ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
           <img src="${newImage}" style="max-width:100px;max-height:80px;border-radius:8px;object-fit:cover;" />
           <button type="button" id="btnDeleteFloorImg" class="btn btn-ghost btn-sm"
             style="color:var(--color-danger);font-size:11px;">🗑 사진 삭제</button>
         </div>`
      : '';

    const CONCEPT_DEFS = [
      { id: 'wave', label: '웨이브(wave)', disabled: false },
      { id: 'exploration', label: '탐험(exploration)', disabled: false },
      { id: 'decapitation', label: '참수작전(decapitation)', disabled: false },
      { id: 'boss', label: '보스전(boss)', disabled: false },
      { id: 'defense', label: '방어전', disabled: true },
      { id: 'siege', label: '공성전', disabled: true },
      { id: 'speedrun', label: '스피드런', disabled: true },
      { id: 'survival', label: '생존', disabled: true },
    ];

    const conceptChipsHtml = CONCEPT_DEFS.map(c => {
      const checked = formConcepts.has(c.id) && !c.disabled;
      if (c.disabled) {
        return `<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-surface3,#1e2030);cursor:not-allowed;opacity:0.45;font-size:12px;">
          <input type="checkbox" disabled />
          ${c.label} <span style="font-size:10px;color:var(--color-text-dim);">(준비 중)</span>
        </label>`;
      }
      return `<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-surface3,#1e2030);cursor:pointer;font-size:12px;" class="concept-chip-label">
        <input type="checkbox" class="concept-cb" value="${c.id}" ${checked ? 'checked' : ''} />
        ${c.label}
      </label>`;
    }).join('');

    const exType = f.explorationConfig?.targetType || 'item';
    const exItemRef = f.explorationConfig?.target?.type === 'item' || !f.explorationConfig ? (f.explorationConfig?.target || {}) : {};
    const exPlaceRef = mkPlaceRef(f.explorationConfig?.target?.type === 'place' ? f.explorationConfig.target : null);

    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;padding-right:4px;overflow-x:hidden;min-width:0;">

        <!-- Basic info -->
        <div class="form-group">
          <label class="form-label">층 번호 *</label>
          <input class="input-field" id="fFloorNum" type="number"
            value="${f.floorNum !== undefined ? f.floorNum : (defaultFloorNum !== undefined ? defaultFloorNum : '')}" placeholder="예: 1, 50, 100"
            style="width:100%;box-sizing:border-box;" ${isEdit ? 'readonly' : ''} />
          ${isEdit ? '<div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">층 번호는 수정할 수 없습니다</div>' : '<div id="fFloorNumHint" style="font-size:11px;color:var(--color-text-dim);margin-top:2px;"></div>'}
        </div>
        <div class="form-group">
          <label class="form-label">테마</label>
          <input class="input-field" id="fFloorTheme" value="${Utils.escHtml(f.theme || '')}"
            placeholder="예: 슬라임 사냥터, 마의 삼림" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">특징</label>
          <textarea class="input-field" id="fFloorFeatures" rows="3" placeholder="예: 마기 농도 높음&#10;중력 2배"
            style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(f.features || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">퀘스트</label>
          <textarea class="input-field" id="fFloorQuests" rows="2" placeholder="퀘스트 조건"
            style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(f.quests || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">보상</label>
          <textarea class="input-field" id="fFloorRewards" rows="2" placeholder="보상 내용"
            style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(f.rewards || '')}</textarea>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
            <input type="checkbox" id="fFloorHidden" ${f.hidden ? 'checked' : ''} />
            히든 층
          </label>
        </div>
        <div class="form-group">
          <label class="form-label">이미지</label>
          <div id="floorImgPreview">${imgHtml}</div>
          <input type="file" id="floorImageFile" accept="image/*" style="font-size:13px;" />
        </div>

        <!-- Concept chips -->
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:var(--color-primary);margin-bottom:8px;">컨셉 선택</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;" id="conceptChipArea">
            ${conceptChipsHtml}
          </div>
        </div>

        <!-- Wave section -->
        <div id="sectionWave" style="display:${formConcepts.has('wave') ? 'block' : 'none'};border-top:1px solid #60a5fa44;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#60a5fa;margin-bottom:8px;">🌊 웨이브 설정</div>
          <div style="display:flex;gap:16px;margin-bottom:6px;">
            <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;">
              <input type="checkbox" id="waveGlobalLocFixed" ${f.waveConfig?.locationFixed ? 'checked' : ''} /> 전체위치고정
            </label>
            <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;">
              <input type="checkbox" id="waveGlobalEventFixed" ${f.waveConfig?.hasEventFixed ? 'checked' : ''} /> 전체사건고정
            </label>
          </div>
          <div id="waveGlobalLocWrap" style="display:${f.waveConfig?.locationFixed ? 'block' : 'none'};margin-bottom:6px;padding:8px;background:var(--color-surface3,#1e2030);border-radius:6px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">전체 위치 지정</div>
            ${placeRefHtml('globalWave', waveGlobalFixedPlace)}
          </div>
          <div id="waveGlobalEventWrap" style="display:${f.waveConfig?.hasEventFixed ? 'block' : 'none'};margin-bottom:6px;">
            <textarea class="input-field" id="waveGlobalEventDesc" rows="2" placeholder="전체 사건 설명"
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(f.waveConfig?.fixedEventDesc || '')}</textarea>
          </div>
          <div id="waveList">${formWaves.map((w, i) => waveRowHtml(w, i)).join('')}</div>
          <button class="btn btn-ghost btn-sm" id="btnAddWave" style="width:100%;border:1px dashed #60a5fa55;font-size:12px;color:#60a5fa;margin-top:4px;">+ 웨이브 추가</button>
        </div>

        <!-- Exploration section -->
        <div id="sectionExploration" style="display:${formConcepts.has('exploration') ? 'block' : 'none'};border-top:1px solid #34d39944;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#34d399;margin-bottom:8px;">🔍 탐험 설정</div>
          <div style="margin-bottom:6px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">클리어 유형</div>
            <div style="display:flex;gap:12px;">
              <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
                <input type="radio" name="exType" id="exTypeItem" value="item" ${exType === 'item' ? 'checked' : ''} /> 아이템찾기
              </label>
              <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
                <input type="radio" name="exType" id="exTypePlace" value="place" ${exType === 'place' ? 'checked' : ''} /> 장소·상황해결
              </label>
            </div>
          </div>
          <div id="exItemWrap" style="display:${exType === 'item' ? 'block' : 'none'};margin-bottom:6px;position:relative;">
            <input class="input-field" id="exItemSearch" placeholder="아이템 검색..." value="${Utils.escHtml(exItemRef.name || '')}"
              autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="exItemResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
            <input type="hidden" id="exItemId" value="${Utils.escHtml(exItemRef.id || '')}" />
            ${exItemRef.name ? `<div id="exItemSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;">선택됨: ${Utils.escHtml(exItemRef.name)}</div>` : '<div id="exItemSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;display:none;"></div>'}
          </div>
          <div id="exPlaceWrap" style="display:${exType === 'place' ? 'block' : 'none'};margin-bottom:6px;position:relative;">
            <input class="input-field" id="exPlaceSearch" placeholder="장소 검색..." value="${Utils.escHtml(exPlaceRef.name || '')}"
              autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="exPlaceResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
            <input type="hidden" id="exPlaceId" value="${Utils.escHtml(exPlaceRef.id || '')}" />
            ${exPlaceRef.name ? `<div id="exPlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;">선택됨: ${Utils.escHtml(exPlaceRef.name)}</div>` : '<div id="exPlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;display:none;"></div>'}
          </div>
          <textarea class="input-field" id="exClearDesc" rows="2" placeholder="클리어 설명"
            style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(f.explorationConfig?.clearDesc || '')}</textarea>
        </div>

        <!-- Decapitation section -->
        <div id="sectionDecapitation" style="display:${formConcepts.has('decapitation') ? 'block' : 'none'};border-top:1px solid #f8717144;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#f87171;margin-bottom:8px;">⚔️ 참수작전 설정</div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">제거 대상</div>
          <div id="decapChips" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${decapTargets.map(t => chipHtml(t, t.type || 'monster')).join('')}</div>
          ${entitySearchHtml('decapSearch', 'decapResults', '몬스터/캐릭터 검색...')}
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-top:8px;">
            <input type="checkbox" id="decapApplyInWaves" ${f.decapitationConfig?.applyInWaves ? 'checked' : ''} /> 웨이브에서적용
          </label>
        </div>

        <!-- Boss section -->
        <div id="sectionBoss" style="display:${formConcepts.has('boss') ? 'block' : 'none'};border-top:1px solid #c084fc44;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#c084fc;margin-bottom:8px;">👑 보스전 설정</div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">보스 위치</div>
          ${placeRefHtml('boss', bossPlace)}
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;margin-top:8px;">보스 적</div>
          <div id="bossEnemyChips" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${bossEnemies.map(e => chipHtml(e, e.type || 'monster')).join('')}</div>
          ${entitySearchHtml('bossEnemySearch', 'bossEnemyResults', '몬스터/캐릭터 검색...')}
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;margin-top:8px;">페이즈</div>
          <div id="phaseList">${bossPhases.map((p, i) => phaseRowHtml(p, i)).join('')}</div>
          <button class="btn btn-ghost btn-sm" id="btnAddPhase" style="width:100%;border:1px dashed #c084fc55;font-size:12px;color:#c084fc;margin-top:4px;">+ 페이즈 추가</button>
        </div>

      </div>`;

    // ── wireSearch helper (runs after modal renders) ──
    // data can be an array or a function () => array for dynamic filtering
    const wireSearch = (inputId, resultId, data, renderRow, onSelect) => {
      const inp = document.getElementById(inputId);
      const res = document.getElementById(resultId);
      if (!inp || !res) return;
      inp.addEventListener('input', () => {
        const q = inp.value.trim();
        if (!q) { res.style.display = 'none'; res.innerHTML = ''; return; }
        const source = typeof data === 'function' ? data() : data;
        const matches = source.filter(d => Utils.matchesQuery((d.name || '') + ' ' + (d.grade || ''), q)).slice(0, 20);
        if (!matches.length) { res.style.display = 'none'; return; }
        res.innerHTML = matches.map(d => renderRow(d)).join('');
        res.style.display = 'block';
        res.querySelectorAll('.search-row').forEach(row => {
          row.addEventListener('mousedown', e => {
            e.preventDefault();
            onSelect(row.dataset);
            inp.value = '';
            res.style.display = 'none';
          });
        });
      });
      inp.addEventListener('blur', () => setTimeout(() => { res.style.display = 'none'; }, 200));
    };

    const entityRow = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" data-grade="${Utils.escHtml(d.grade || '')}" data-etype="${Utils.escHtml(d._etype || 'monster')}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}${d.grade ? ' (' + Utils.escHtml(d.grade) + ')' : ''} <span style="font-size:10px;color:var(--color-text-muted);">${d._etype === 'char' ? '캐릭터' : '몬스터'}</span></div>`;
    const entityRowTrap = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" data-grade="${Utils.escHtml(d.grade || '')}" data-etype="trap" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}${d.grade ? ' (' + Utils.escHtml(d.grade) + ')' : ''}</div>`;
    const itemRow = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}</div>`;
    const placeRow = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}</div>`;
    const skillRow = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}</div>`;

    const addChipToContainer = (containerId, ent, etype) => {
      const c = document.getElementById(containerId);
      if (!c) return;
      const existing = c.querySelectorAll('.entity-chip');
      for (const chip of existing) {
        if (chip.dataset.eid === ent.id) return; // already added
      }
      const span = document.createElement('span');
      span.innerHTML = chipHtml({ id: ent.id, name: ent.name, grade: ent.grade, count: 1, unit: etype === 'char' ? '명' : etype === 'trap' ? '개' : '마리', type: etype }, etype);
      const chipEl = span.firstElementChild;
      chipEl.querySelector('.chip-del').addEventListener('click', () => chipEl.remove());
      c.appendChild(chipEl);
    };

    const readChipsFromContainer = (containerId, defaultType) => {
      const c = document.getElementById(containerId);
      if (!c) return [];
      return Array.from(c.querySelectorAll('.entity-chip')).map(chip => ({
        id: chip.dataset.eid,
        type: chip.dataset.etype || defaultType,
        name: chip.dataset.ename || '',
        grade: chip.dataset.egrade || '',
        count: parseInt(chip.querySelector('.chip-count')?.value || '1', 10) || 1,
        unit: chip.querySelector('.chip-unit')?.value || (defaultType === 'char' ? '명' : defaultType === 'trap' ? '개' : '마리'),
      }));
    };

    const wireChipDeletes = (containerId) => {
      const c = document.getElementById(containerId);
      if (!c) return;
      c.querySelectorAll('.chip-del').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.entity-chip').remove());
      });
    };

    const wirePlaceRef = (prefix, refObj) => {
      const textDiv = document.getElementById(prefix + 'PlaceTextDiv');
      const refDiv = document.getElementById(prefix + 'PlaceRefDiv');
      const radios = document.querySelectorAll(`[name="${prefix}PlaceType"]`);
      radios.forEach(r => {
        r.addEventListener('change', () => {
          if (r.value === 'text') {
            if (textDiv) textDiv.style.display = 'block';
            if (refDiv) refDiv.style.display = 'none';
          } else {
            if (textDiv) textDiv.style.display = 'none';
            if (refDiv) refDiv.style.display = 'block';
          }
        });
      });
      wireSearch(prefix + 'PlaceSearch', prefix + 'PlaceResults', allPlaces, placeRow, (ds) => {
        const idEl = document.getElementById(prefix + 'PlaceId');
        const selEl = document.getElementById(prefix + 'PlaceSelected');
        const searchEl = document.getElementById(prefix + 'PlaceSearch');
        if (idEl) idEl.value = ds.id;
        if (selEl) { selEl.textContent = '선택됨: ' + ds.name; selEl.style.display = ''; }
        if (searchEl) searchEl.value = ds.name;
        refObj.id = ds.id; refObj.name = ds.name; refObj.type = 'ref';
      });
    };

    const readPlaceRef = (prefix) => {
      const radios = document.querySelectorAll(`[name="${prefix}PlaceType"]`);
      let type = 'text';
      radios.forEach(r => { if (r.checked) type = r.value; });
      if (type === 'ref') {
        return {
          type: 'ref',
          id: document.getElementById(prefix + 'PlaceId')?.value || '',
          name: document.getElementById(prefix + 'PlaceSearch')?.value || '',
          desc: '',
        };
      }
      return { type: 'text', id: '', name: '', desc: document.getElementById(prefix + 'PlaceText')?.value || '' };
    };

    const syncBossPhasesFromDOM = () => {
      document.querySelectorAll('#globalModalBody .phase-row').forEach(row => {
        const pidx = parseInt(row.dataset.pidx, 10);
        if (!bossPhases[pidx]) return;
        bossPhases[pidx].condition = row.querySelector('.phase-cond')?.value || '';
        bossPhases[pidx].desc = row.querySelector('.phase-desc')?.value || '';
        const attackRows = row.querySelectorAll('.atk-row');
        const attacks = [];
        attackRows.forEach(ar => {
          const aidx = parseInt(ar.dataset.aidx, 10);
          attacks.push({
            name: ar.querySelector('.atk-name')?.value || '',
            skillId: ar.querySelector('.atk-skill-id')?.value || '',
            skillName: ar.querySelector('.atk-skill-search')?.value || '',
            desc: ar.querySelector('.atk-desc')?.value || '',
          });
        });
        bossPhases[pidx].attacks = attacks;
      });
    };

    const applyGlobalLocFixed = (isFixed) => {
      document.querySelectorAll('#globalModalBody .wave-loc-radio[value="fixed"]').forEach(radio => {
        const label = radio.closest('label');
        if (label) label.style.display = isFixed ? 'none' : '';
        if (isFixed && radio.checked) {
          const moveRadio = document.querySelector(`input[name="${radio.name}"][value="move"]`);
          if (moveRadio) moveRadio.checked = true;
          const placeRef = document.getElementById('wavePlaceRef' + radio.dataset.widx);
          if (placeRef) placeRef.style.display = 'none';
        }
      });
    };

    const reRenderWaveList = () => {
      const wl = document.getElementById('waveList');
      if (wl) {
        wl.innerHTML = formWaves.map((w, i) => waveRowHtml(w, i)).join('');
        wireWaveSection();
        applyGlobalLocFixed(document.getElementById('waveGlobalLocFixed')?.checked || false);
      }
    };

    const reRenderPhaseList = () => {
      const pl = document.getElementById('phaseList');
      if (pl) {
        pl.innerHTML = bossPhases.map((p, i) => phaseRowHtml(p, i)).join('');
        wireBossSection();
      }
    };

    const wireWaveSection = () => {
      const allMonChars = [
        ...allMonsters.map(m => ({ ...m, _etype: 'monster' })),
        ...allChars.map(c => ({ ...c, _etype: 'char' })),
      ];

      // Returns entity IDs already used across ALL wave enemy/trap containers
      const getUsedEnemyIds = () => {
        const ids = new Set();
        formWaves.forEach((_, i) => {
          document.getElementById('waveEnemyChips' + i)
            ?.querySelectorAll('.entity-chip')
            .forEach(chip => ids.add(chip.dataset.eid));
        });
        return ids;
      };
      const getUsedTrapIds = () => {
        const ids = new Set();
        formWaves.forEach((_, i) => {
          document.getElementById('waveTrapChips' + i)
            ?.querySelectorAll('.entity-chip')
            .forEach(chip => ids.add(chip.dataset.eid));
        });
        return ids;
      };

      // Wire per-wave enemy/trap search
      formWaves.forEach((w, idx) => {
        wireChipDeletes('waveEnemyChips' + idx);
        wireChipDeletes('waveTrapChips' + idx);
        wireSearch('waveEnemySearch' + idx, 'waveEnemyResults' + idx,
          () => {
            const used = getUsedEnemyIds();
            return allMonChars.filter(m => !used.has(m.id));
          },
          entityRow, (ds) => {
            addChipToContainer('waveEnemyChips' + idx, { id: ds.id, name: ds.name, grade: ds.grade }, ds.etype);
          }
        );
        wireSearch('waveTrapSearch' + idx, 'waveTrapResults' + idx,
          () => {
            const used = getUsedTrapIds();
            return allTraps.filter(t => !used.has(t.id));
          },
          entityRowTrap, (ds) => {
            addChipToContainer('waveTrapChips' + idx, { id: ds.id, name: ds.name, grade: ds.grade }, 'trap');
          }
        );
        // Location radio toggle
        const locRadios = document.querySelectorAll(`.wave-loc-radio[data-widx="${idx}"]`);
        locRadios.forEach(r => {
          r.addEventListener('change', () => {
            const placeWrap = document.getElementById('wavePlaceRef' + idx);
            if (placeWrap) placeWrap.style.display = r.value === 'fixed' ? 'block' : 'none';
          });
        });
        wirePlaceRef('waveP' + idx, w.place ? mkPlaceRef(w.place) : { type: 'text', id: '', name: '', desc: '' });
        // Clear condition type radio toggle
        document.querySelectorAll(`.wave-clear-type[data-widx="${idx}"]`).forEach(r => {
          r.addEventListener('change', () => {
            const wrap = document.getElementById('waveClearCustomWrap' + idx);
            if (wrap) wrap.style.display = r.value === 'custom' ? 'block' : 'none';
          });
        });
        // Event checkbox
        const evCb = document.querySelector(`.wave-event-cb[data-widx="${idx}"]`);
        const evWrap = document.getElementById('waveEventWrap' + idx);
        if (evCb && evWrap) {
          evCb.addEventListener('change', () => {
            evWrap.style.display = evCb.checked ? 'block' : 'none';
          });
        }
        // Delete wave
        const delBtn = document.querySelector(`.wave-del-btn[data-widx="${idx}"]`);
        if (delBtn) {
          delBtn.addEventListener('click', () => {
            // Save current state from DOM before removing
            document.querySelectorAll('#globalModalBody .wave-row').forEach(row => {
              const wi = parseInt(row.dataset.widx, 10);
              if (!formWaves[wi]) return;
              const locRadioEl = row.querySelector('.wave-loc-radio:checked');
              formWaves[wi].locationFixed = locRadioEl ? locRadioEl.value : 'move';
              formWaves[wi].hasEvent = row.querySelector('.wave-event-cb')?.checked || false;
              formWaves[wi].eventDesc = row.querySelector('.wave-event-desc')?.value || '';
              const clearTypeEl = row.querySelector('.wave-clear-type:checked');
              const clearType = clearTypeEl ? clearTypeEl.value : 'enemies';
              formWaves[wi].clearConditionType = clearType;
              formWaves[wi].explorationLink = clearType === 'exploration';
              formWaves[wi].clearCondition = clearType === 'custom' ? (row.querySelector('.wave-clear-cond')?.value || '') : '';
              formWaves[wi].enemies = readChipsFromContainer('waveEnemyChips' + wi, 'monster');
              formWaves[wi].traps = readChipsFromContainer('waveTrapChips' + wi, 'trap');
            });
            formWaves.splice(idx, 1);
            reRenderWaveList();
          });
        }
      });
    };

    const wireBossSection = () => {
      wireChipDeletes('bossEnemyChips');
      const allMonChars = [
        ...allMonsters.map(m => ({ ...m, _etype: 'monster' })),
        ...allChars.map(c => ({ ...c, _etype: 'char' })),
      ];
      wireSearch('bossEnemySearch', 'bossEnemyResults', allMonChars, entityRow, (ds) => {
        addChipToContainer('bossEnemyChips', { id: ds.id, name: ds.name, grade: ds.grade }, ds.etype);
      });
      wirePlaceRef('boss', bossPlace);

      // Phase controls
      bossPhases.forEach((p, pidx) => {
        const delBtn = document.querySelector(`.phase-del-btn[data-pidx="${pidx}"]`);
        if (delBtn) {
          delBtn.addEventListener('click', () => {
            syncBossPhasesFromDOM();
            bossPhases.splice(pidx, 1);
            reRenderPhaseList();
          });
        }
        const addAtkBtn = document.querySelector(`.atk-add-btn[data-pidx="${pidx}"]`);
        if (addAtkBtn) {
          addAtkBtn.addEventListener('click', () => {
            syncBossPhasesFromDOM();
            if (!bossPhases[pidx].attacks) bossPhases[pidx].attacks = [];
            bossPhases[pidx].attacks.push({ name: '', skillId: '', skillName: '', desc: '' });
            reRenderPhaseList();
          });
        }
        // Attack deletes
        document.querySelectorAll(`.atk-del-btn[data-pidx="${pidx}"]`).forEach(btn => {
          btn.addEventListener('click', () => {
            syncBossPhasesFromDOM();
            const aidx = parseInt(btn.dataset.aidx, 10);
            bossPhases[pidx].attacks.splice(aidx, 1);
            reRenderPhaseList();
          });
        });
        // Skill search for each attack
        document.querySelectorAll(`.atk-skill-search[data-pidx="${pidx}"]`).forEach(inp => {
          const aidx = parseInt(inp.dataset.aidx, 10);
          const resEl = document.querySelector(`.atk-skill-results[data-pidx="${pidx}"][data-aidx="${aidx}"]`);
          const idEl = document.querySelector(`.atk-skill-id[data-pidx="${pidx}"][data-aidx="${aidx}"]`);
          if (!inp || !resEl) return;
          inp.addEventListener('input', () => {
            const q = inp.value.trim();
            if (!q) { resEl.style.display = 'none'; resEl.innerHTML = ''; return; }
            const matches = allSkills.filter(s => Utils.matchesQuery(s.name || '', q)).slice(0, 20);
            if (!matches.length) { resEl.style.display = 'none'; return; }
            resEl.innerHTML = matches.map(s => skillRow(s)).join('');
            resEl.style.display = 'block';
            resEl.querySelectorAll('.search-row').forEach(row => {
              row.addEventListener('mousedown', e => {
                e.preventDefault();
                if (idEl) idEl.value = row.dataset.id;
                inp.value = row.dataset.name;
                resEl.style.display = 'none';
              });
            });
          });
          inp.addEventListener('blur', () => setTimeout(() => { resEl.style.display = 'none'; }, 200));
        });
      });
    };

    // ── Save callback ──
    Utils.openModal(isEdit ? `${f.floorNum}층 편집` : '새 층 추가', body, async () => {
      const numVal = document.getElementById('fFloorNum')?.value;
      if (numVal === '' || numVal === null || numVal === undefined) {
        Utils.fieldError('fFloorNum'); return false;
      }
      const floorNum = parseInt(numVal, 10);
      if (isNaN(floorNum)) { Utils.fieldError('fFloorNum'); return false; }
      if (!isEdit) {
        const exists = (tower.floors || []).some(ff => ff.floorNum === floorNum);
        if (exists) { Utils.toast(`${floorNum}층이 이미 존재합니다`, 'error'); return false; }
      }

      const imgFile = document.getElementById('floorImageFile')?.files?.[0];
      if (imgFile) newImage = await Utils.imageToBase64(imgFile);

      // Collect wave data from DOM
      const savedWaves = formWaves.map((w, idx) => {
        const row = document.querySelector(`.wave-row[data-widx="${idx}"]`);
        const locRadioEl = row ? row.querySelector('.wave-loc-radio:checked') : null;
        const locType = locRadioEl ? locRadioEl.value : (w.locationFixed || 'move');
        return {
          locationFixed: locType,
          place: locType === 'fixed' ? readPlaceRef('waveP' + idx) : null,
          hasEvent: row ? (row.querySelector('.wave-event-cb')?.checked || false) : (w.hasEvent || false),
          eventDesc: row ? (row.querySelector('.wave-event-desc')?.value || '') : (w.eventDesc || ''),
          enemies: readChipsFromContainer('waveEnemyChips' + idx, 'monster'),
          traps: readChipsFromContainer('waveTrapChips' + idx, 'trap'),
          ...(() => {
            const clearTypeEl = row ? row.querySelector('.wave-clear-type:checked') : null;
            const clearType = clearTypeEl ? clearTypeEl.value : (w.clearConditionType || (w.explorationLink ? 'exploration' : (w.clearCondition ? 'custom' : 'enemies')));
            return {
              clearConditionType: clearType,
              explorationLink: clearType === 'exploration',
              clearCondition: clearType === 'custom' ? (row ? (row.querySelector('.wave-clear-cond')?.value || '') : (w.clearCondition || '')) : '',
            };
          })(),
        };
      });

      // Collect decap targets
      const savedDecapTargets = readChipsFromContainer('decapChips', 'monster');

      // Collect boss data
      syncBossPhasesFromDOM();
      const savedBossEnemies = readChipsFromContainer('bossEnemyChips', 'monster');
      const savedBossPlace = readPlaceRef('boss');
      const savedPhases = bossPhases.map(p => ({ ...p }));

      // Exploration
      const exTypeVal = document.querySelector('[name="exType"]:checked')?.value || 'item';
      let savedExRef;
      if (exTypeVal === 'item') {
        savedExRef = { type: 'item', id: document.getElementById('exItemId')?.value || '', name: document.getElementById('exItemSearch')?.value || '' };
      } else {
        savedExRef = { type: 'place', id: document.getElementById('exPlaceId')?.value || '', name: document.getElementById('exPlaceSearch')?.value || '' };
      }

      const floorData = {
        floorNum,
        theme:    document.getElementById('fFloorTheme')?.value.trim()    || '',
        features: document.getElementById('fFloorFeatures')?.value.trim() || '',
        quests:   document.getElementById('fFloorQuests')?.value.trim()   || '',
        rewards:  document.getElementById('fFloorRewards')?.value.trim()  || '',
        hidden:   document.getElementById('fFloorHidden')?.checked        || false,
        image:    newImage,
        subFloors: f.subFloors || [],
        concepts: [...formConcepts],
        waveConfig: formConcepts.has('wave') ? {
          locationFixed: document.getElementById('waveGlobalLocFixed')?.checked || false,
          hasEventFixed: document.getElementById('waveGlobalEventFixed')?.checked || false,
          fixedPlace: readPlaceRef('globalWave'),
          fixedEventDesc: document.getElementById('waveGlobalEventDesc')?.value || '',
          waves: savedWaves,
        } : null,
        explorationConfig: formConcepts.has('exploration') ? {
          targetType: exTypeVal,
          target: savedExRef,
          clearDesc: document.getElementById('exClearDesc')?.value || '',
        } : null,
        decapitationConfig: formConcepts.has('decapitation') ? {
          targets: savedDecapTargets,
          applyInWaves: document.getElementById('decapApplyInWaves')?.checked || false,
        } : null,
        bossConfig: formConcepts.has('boss') ? {
          place: savedBossPlace,
          enemies: savedBossEnemies,
          phases: savedPhases,
        } : null,
      };

      const floors = (tower.floors || []).filter(ff => ff.floorNum !== floorNum);
      floors.push(floorData);
      tower.floors = floors.sort((a, b) => a.floorNum - b.floorNum);

      await DB.put('towers', tower);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');

      this._bundleStart = floorNum === 0 ? 0 : (Math.floor((floorNum - 1) / this.BUNDLE_SIZE) * this.BUNDLE_SIZE + 1);
      this._expandedFloor = floorNum;

      const all = await DB.getAll('towers', wid);
      const t = all.find(x => x.id === tower.id);
      if (t) this._renderTower(container, t, wid, world);
      return true;
    }, isEdit ? '저장' : '추가');

    // ── Wire all interactions after modal renders ──
    setTimeout(() => {
      // Duplicate floor number detection
      const floorNumInput = document.getElementById('fFloorNum');
      if (floorNumInput && !isEdit) {
        floorNumInput.addEventListener('input', () => {
          const val = parseInt(floorNumInput.value, 10);
          const isDup = !isNaN(val) && existingFloors.some(ff => ff.floorNum === val);
          floorNumInput.style.borderColor = isDup ? 'var(--color-danger)' : '';
          const hint = document.getElementById('fFloorNumHint');
          if (hint) hint.textContent = isDup ? `${val}층이 이미 존재합니다` : '';
          if (hint) hint.style.color = isDup ? 'var(--color-danger)' : 'var(--color-text-dim)';
        });
      }

      // Image upload preview
      document.getElementById('floorImageFile')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        newImage = await Utils.imageToBase64(file);
        const prev = document.getElementById('floorImgPreview');
        if (prev) prev.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <img src="${newImage}" style="max-width:100px;max-height:80px;border-radius:8px;object-fit:cover;" />
            <button type="button" id="btnDeleteFloorImg" class="btn btn-ghost btn-sm"
              style="color:var(--color-danger);font-size:11px;">🗑 사진 삭제</button>
          </div>`;
        document.getElementById('btnDeleteFloorImg')?.addEventListener('click', () => {
          newImage = null;
          const p = document.getElementById('floorImgPreview');
          if (p) p.innerHTML = '';
        });
      });
      document.getElementById('btnDeleteFloorImg')?.addEventListener('click', () => {
        newImage = null;
        const prev = document.getElementById('floorImgPreview');
        if (prev) prev.innerHTML = '';
      });

      // Concept chip toggles
      document.querySelectorAll('.concept-cb').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) formConcepts.add(cb.value);
          else formConcepts.delete(cb.value);
          const sectionId = 'section' + cb.value.charAt(0).toUpperCase() + cb.value.slice(1);
          const sec = document.getElementById(sectionId);
          if (sec) sec.style.display = cb.checked ? 'block' : 'none';
        });
      });

      // Wave section global controls
      document.getElementById('waveGlobalLocFixed')?.addEventListener('change', e => {
        const wrap = document.getElementById('waveGlobalLocWrap');
        if (wrap) wrap.style.display = e.target.checked ? 'block' : 'none';
        applyGlobalLocFixed(e.target.checked);
      });
      document.getElementById('waveGlobalEventFixed')?.addEventListener('change', e => {
        const wrap = document.getElementById('waveGlobalEventWrap');
        if (wrap) wrap.style.display = e.target.checked ? 'block' : 'none';
      });

      // Wire global place ref
      wirePlaceRef('globalWave', waveGlobalFixedPlace);

      // Wire wave list
      wireWaveSection();
      applyGlobalLocFixed(document.getElementById('waveGlobalLocFixed')?.checked || false);

      // Add wave button
      document.getElementById('btnAddWave')?.addEventListener('click', () => {
        // Save current wave DOM state
        document.querySelectorAll('#globalModalBody .wave-row').forEach(row => {
          const wi = parseInt(row.dataset.widx, 10);
          if (!formWaves[wi]) return;
          const locRadioEl = row.querySelector('.wave-loc-radio:checked');
          formWaves[wi].locationFixed = locRadioEl ? locRadioEl.value : 'move';
          formWaves[wi].hasEvent = row.querySelector('.wave-event-cb')?.checked || false;
          formWaves[wi].eventDesc = row.querySelector('.wave-event-desc')?.value || '';
          const clearTypeEl = row.querySelector('.wave-clear-type:checked');
          const clearType = clearTypeEl ? clearTypeEl.value : 'enemies';
          formWaves[wi].clearConditionType = clearType;
          formWaves[wi].explorationLink = clearType === 'exploration';
          formWaves[wi].clearCondition = clearType === 'custom' ? (row.querySelector('.wave-clear-cond')?.value || '') : '';
          formWaves[wi].enemies = readChipsFromContainer('waveEnemyChips' + wi, 'monster');
          formWaves[wi].traps = readChipsFromContainer('waveTrapChips' + wi, 'trap');
        });
        formWaves.push({ locationFixed: 'move', hasEvent: false, eventDesc: '', enemies: [], traps: [], clearCondition: '', explorationLink: false });
        reRenderWaveList();
      });

      // Wire exploration section
      const exItemWrap = document.getElementById('exItemWrap');
      const exPlaceWrap = document.getElementById('exPlaceWrap');
      document.querySelectorAll('[name="exType"]').forEach(r => {
        r.addEventListener('change', () => {
          if (exItemWrap) exItemWrap.style.display = r.value === 'item' ? 'block' : 'none';
          if (exPlaceWrap) exPlaceWrap.style.display = r.value === 'place' ? 'block' : 'none';
        });
      });
      wireSearch('exItemSearch', 'exItemResults', allItems, itemRow, (ds) => {
        const idEl = document.getElementById('exItemId');
        const selEl = document.getElementById('exItemSelected');
        const inp = document.getElementById('exItemSearch');
        if (idEl) idEl.value = ds.id;
        if (selEl) { selEl.textContent = '선택됨: ' + ds.name; selEl.style.display = ''; }
        if (inp) inp.value = ds.name;
        exRef.id = ds.id; exRef.name = ds.name;
      });
      wireSearch('exPlaceSearch', 'exPlaceResults', allPlaces, placeRow, (ds) => {
        const idEl = document.getElementById('exPlaceId');
        const selEl = document.getElementById('exPlaceSelected');
        const inp = document.getElementById('exPlaceSearch');
        if (idEl) idEl.value = ds.id;
        if (selEl) { selEl.textContent = '선택됨: ' + ds.name; selEl.style.display = ''; }
        if (inp) inp.value = ds.name;
        exRef.id = ds.id; exRef.name = ds.name;
      });

      // Wire decapitation section
      const allMonChars = [
        ...allMonsters.map(m => ({ ...m, _etype: 'monster' })),
        ...allChars.map(c => ({ ...c, _etype: 'char' })),
      ];
      wireChipDeletes('decapChips');
      wireSearch('decapSearch', 'decapResults', allMonChars, entityRow, (ds) => {
        addChipToContainer('decapChips', { id: ds.id, name: ds.name, grade: ds.grade }, ds.etype);
      });

      // Wire boss section
      wireBossSection();
      document.getElementById('btnAddPhase')?.addEventListener('click', () => {
        syncBossPhasesFromDOM();
        bossPhases.push({ condition: '', desc: '', attacks: [] });
        reRenderPhaseList();
      });

    }, 50);
  },

  // ── SUB-FLOOR FORM (same fields as main floor) ──────────────
  _openSubFloorForm: async function(sub, parentFloor, tower, wid, container, world) {
    const isEdit = !!sub;
    const s = sub || {};
    const nextIdx = (parentFloor.subFloors || []).length + 1;
    const defaultName = s.name || `${parentFloor.floorNum}-${nextIdx}층`;
    let newSubImage = s.image || null;

    const allMonsters = await DB.getAll('monsters', wid);

    const ta = (id, label, val, rows, placeholder) => `
      <div class="form-group">
        <label class="form-label">${label}</label>
        <textarea class="input-field" id="${id}" rows="${rows || 3}" placeholder="${placeholder || ''}"
          style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(val || '')}</textarea>
      </div>`;

    const imgHtml = newSubImage
      ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
           <img src="${newSubImage}" style="max-width:100px;max-height:80px;border-radius:8px;object-fit:cover;" />
           <button type="button" id="btnDeleteSubImg" class="btn btn-ghost btn-sm"
             style="color:var(--color-danger);font-size:11px;">🗑 사진 삭제</button>
         </div>`
      : '';

    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;padding-right:4px;overflow-x:hidden;min-width:0;">
        <div class="form-group">
          <label class="form-label">서브층 이름</label>
          <input class="input-field" id="fSubName" value="${Utils.escHtml(s.name || defaultName)}"
            placeholder="예: 1-1층" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">테마</label>
          <input class="input-field" id="fSubTheme" value="${Utils.escHtml(s.theme || '')}"
            placeholder="예: 히든 보스 구간" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <label class="form-label" style="margin:0;">적 (줄바꿈으로 구분)</label>
            ${allMonsters.length > 0
              ? `<button type="button" class="btn btn-ghost btn-sm" id="btnPickSubMonsters" style="font-size:11px;">👾 몬스터에서 추가</button>`
              : ''}
          </div>
          <textarea class="input-field" id="fSubEnemies" rows="2"
            placeholder="예: 보스 슬라임(S급) - 1명"
            style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(s.enemies || '')}</textarea>
        </div>
        ${ta('fSubFeatures', '특징', s.features, 3, '특징 설명')}
        ${ta('fSubQuests', '퀘스트', s.quests, 2, '퀘스트 조건')}
        ${ta('fSubRewards', '보상', s.rewards, 2, '보상 내용')}
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
            <input type="checkbox" id="fSubHidden" ${s.hidden ? 'checked' : ''} />
            히든 서브층
          </label>
        </div>
        <div class="form-group">
          <label class="form-label">이미지</label>
          <div id="subImgPreview">${imgHtml}</div>
          <input type="file" id="subFloorImageFile" accept="image/*" style="font-size:13px;" />
        </div>
      </div>`;

    Utils.openModal(isEdit ? '서브층 편집' : '서브층 추가', body, async () => {
      const imgFile = document.getElementById('subFloorImageFile')?.files?.[0];
      if (imgFile) newSubImage = await Utils.imageToBase64(imgFile);

      const subData = {
        subId:    s.subId || DB.genId(),
        name:     document.getElementById('fSubName')?.value.trim()     || defaultName,
        theme:    document.getElementById('fSubTheme')?.value.trim()    || '',
        enemies:  document.getElementById('fSubEnemies')?.value.trim()  || '',
        features: document.getElementById('fSubFeatures')?.value.trim() || '',
        quests:   document.getElementById('fSubQuests')?.value.trim()   || '',
        rewards:  document.getElementById('fSubRewards')?.value.trim()  || '',
        hidden:   document.getElementById('fSubHidden')?.checked        || false,
        image:    newSubImage,
      };

      const subFloors = (parentFloor.subFloors || []).filter(sf => sf.subId !== subData.subId);
      subFloors.push(subData);
      parentFloor.subFloors = subFloors;

      await DB.put('towers', tower);
      Utils.toast(isEdit ? '서브층 저장됨' : '서브층 추가됨', 'success');
      this._expandedFloor = parentFloor.floorNum;

      const all = await DB.getAll('towers', wid);
      const t = all.find(x => x.id === tower.id);
      if (t) this._renderTower(container, t, wid, world);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      // Sub-floor image upload
      document.getElementById('subFloorImageFile')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        newSubImage = await Utils.imageToBase64(file);
        const prev = document.getElementById('subImgPreview');
        if (prev) prev.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <img src="${newSubImage}" style="max-width:100px;max-height:80px;border-radius:8px;object-fit:cover;" />
            <button type="button" id="btnDeleteSubImg" class="btn btn-ghost btn-sm"
              style="color:var(--color-danger);font-size:11px;">🗑 사진 삭제</button>
          </div>`;
        document.getElementById('btnDeleteSubImg')?.addEventListener('click', () => {
          newSubImage = null;
          const p = document.getElementById('subImgPreview');
          if (p) p.innerHTML = '';
        });
      });

      // Sub-floor image delete (existing)
      document.getElementById('btnDeleteSubImg')?.addEventListener('click', () => {
        newSubImage = null;
        const prev = document.getElementById('subImgPreview');
        if (prev) prev.innerHTML = '';
      });

      // Sub-floor monster picker
      document.getElementById('btnPickSubMonsters')?.addEventListener('click', () => {
        this._openSubMonsterPicker(allMonsters);
      });
    }, 50);
  },

  // Monster picker for sub-floor (writes to fSubEnemies)
  _openSubMonsterPicker: function(monsters) {
    const body = `
      <div style="display:flex;flex-direction:column;gap:8px;max-height:60vh;">
        <input class="input-field" id="subMonPickSearch" placeholder="몬스터 검색..."
          style="width:100%;box-sizing:border-box;" />
        <div id="subMonPickList" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:4px;-webkit-overflow-scrolling:touch;">
          ${monsters.map((m, i) => `
            <div class="sub-mon-row" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--color-surface2);border-radius:8px;border:1px solid var(--color-border);"
              data-name="${Utils.escHtml(m.name || '')}" data-grade="${Utils.escHtml(m.grade || '')}">
              <input type="checkbox" class="sub-mon-cb" id="smpc_${i}"
                data-name="${Utils.escHtml(m.name || '')}" data-grade="${Utils.escHtml(m.grade || '')}" />
              <label for="smpc_${i}" style="flex:1;min-width:0;cursor:pointer;">
                <div style="font-size:13px;font-weight:600;">${Utils.escHtml(m.name || '이름 없음')}</div>
                ${m.grade ? `<div style="font-size:11px;color:var(--color-text-muted);">등급: ${Utils.escHtml(m.grade)}</div>` : ''}
              </label>
              <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">
                <input type="number" class="sub-mon-count" min="1" value="1"
                  style="width:48px;padding:3px 5px;border-radius:5px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font-size:12px;text-align:center;" />
                <span style="font-size:11px;color:var(--color-text-muted);">명</span>
              </div>
            </div>`).join('')}
        </div>
      </div>`;

    Utils.openModal('몬스터 추가', body, () => {
      const checked = document.querySelectorAll('#globalModalBody .sub-mon-cb:checked');
      if (checked.length === 0) { Utils.toast('몬스터를 선택하세요', 'error'); return false; }
      const ta = document.getElementById('fSubEnemies');
      if (!ta) return false;
      const toAdd = Array.from(checked).map(cb => {
        const name = cb.dataset.name;
        const grade = cb.dataset.grade;
        const row = cb.closest('.sub-mon-row');
        const count = parseInt(row?.querySelector('.sub-mon-count')?.value || '1', 10) || 1;
        return grade ? `${name}(${grade}급) - ${count}명` : `${name} - ${count}명`;
      }).join('\n');
      const existing = ta.value.trim();
      ta.value = existing ? existing + '\n' + toAdd : toAdd;
      return true;
    }, '추가');

    setTimeout(() => {
      document.getElementById('subMonPickSearch')?.addEventListener('input', e => {
        const q = e.target.value;
        document.querySelectorAll('#globalModalBody .sub-mon-row').forEach(row => {
          const txt = [(row.dataset.name||''), (row.dataset.grade||'')].join(' ');
          row.style.display = Utils.matchesQuery(txt, q) ? '' : 'none';
        });
      });
      document.querySelectorAll('#globalModalBody .sub-mon-count').forEach(inp => {
        inp.addEventListener('click', e => e.stopPropagation());
      });
    }, 50);
  },
};
