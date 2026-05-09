'use strict';
window.Pages = window.Pages || {};
window.Pages.tower = {
  _container: null,
  _towerId: null,
  _bundleStart: 0,
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
    this._bundleStart = 0;
    this._expandedFloor = null;
  },

  // ── TOWER LIST ──────────────────────────────────────────────────────────────

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
            this._bundleStart = 0;
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

  // ── TOWER FORM ──────────────────────────────────────────────────────────────

  _openTowerForm: function(tower, wid, container, world) {
    const isEdit = !!tower;
    const t = tower || {};
    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">탑 이름 *</label>
          <input class="input-field" id="fTowerName" value="${Utils.escHtml(t.name || '')}" placeholder="탑 이름" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">국가</label>
          <input class="input-field" id="fTowerCountry" value="${Utils.escHtml(t.country || '')}" placeholder="어느 나라의 탑인지" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">설명</label>
          <textarea class="input-field" id="fTowerDesc" rows="3"
            style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(t.description || '')}</textarea>
        </div>
        ${!isEdit ? `<div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">사전 생성 층 수 (선택)</label>
          <input type="number" class="input-field" id="fTowerPreFloors" value="0" min="0" max="999" placeholder="0"
            style="width:100%;box-sizing:border-box;" />
          <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">입력한 숫자만큼 빈 층을 미리 만듭니다 (0 = 안 만들기)</div>
        </div>` : ''}
      </div>`;

    Utils.openModal(isEdit ? '탑 편집' : '새 탑 추가', body, async () => {
      const name = document.getElementById('fTowerName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }
      const preFloors = !isEdit ? (Number(document.getElementById('fTowerPreFloors')?.value) || 0) : 0;
      const preFloorArr = preFloors > 0
        ? Array.from({ length: preFloors }, (_, i) => ({ floorNum: i + 1, name: `${i + 1}층`, description: '', hidden: false, createdAt: Date.now() }))
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
  },

  // ── TOWER BUNDLE VIEW ────────────────────────────────────────────────────────

  _renderTower: function(container, tower, wid, world) {
    const floors = (tower.floors || []).slice().sort((a, b) => (a.floorNum || 0) - (b.floorNum || 0));
    const maxFloor = floors.length > 0 ? Math.max(...floors.map(f => f.floorNum || 0)) : 0;
    const bundles = this._computeBundles(floors, maxFloor);

    // Find current bundle
    const currentBundle = bundles.find(b => b.start === this._bundleStart) || bundles[0];
    const bundleFloors = currentBundle ? currentBundle.floors : [];

    const bundleNavHtml = bundles.map(b => {
      const isActive = currentBundle && b.start === currentBundle.start;
      const hasHidden = b.floors.some(f => f.hidden);
      return `<button class="btn ${isActive ? 'btn-primary' : 'btn-ghost'} btn-sm bundle-nav-btn"
        data-bundle-start="${b.start}"
        style="font-size:12px;padding:4px 10px;position:relative;">
        ${b.start + 1}~${b.end}층
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

      <!-- Bundle navigation (10층 묶음) -->
      ${bundles.length > 0 ? `
        <div style="margin-bottom:12px;">
          <div style="font-size:10px;color:var(--color-text-muted);font-weight:700;margin-bottom:6px;letter-spacing:1px;text-transform:uppercase;">10층 묶음</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;" id="bundleNav">
            ${bundleNavHtml}
          </div>
        </div>` : ''}

      <!-- Floors in current bundle -->
      <div id="floorList">
        ${floorItemsHtml}
      </div>

      ${bundles.length === 0 ? `
        <div class="empty-state" style="padding:32px;text-align:center;">
          <div style="font-size:40px;margin-bottom:10px;">🏗️</div>
          <div style="font-weight:700;margin-bottom:4px;">층이 없습니다</div>
          <div style="font-size:13px;color:var(--color-text-muted);">+ 층 추가 버튼으로 층을 등록하세요</div>
        </div>` : ''}
    </div>`;

    // ── Event wiring ──

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

    // Bundle navigation
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

    // Floor card expand / collapse
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

    // Edit floor
    container.querySelectorAll('.btn-edit-floor').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const floorNum = parseInt(btn.dataset.floorNum, 10);
        const floor = (tower.floors || []).find(f => f.floorNum === floorNum);
        if (floor) this._openFloorForm(floor, tower, wid, container, world);
      });
    });

    // Delete floor (require floor number confirmation)
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

    // Add sub-floor
    container.querySelectorAll('.btn-add-subfloor').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const floorNum = parseInt(btn.dataset.floorNum, 10);
        const floor = (tower.floors || []).find(f => f.floorNum === floorNum);
        if (floor) this._openSubFloorForm(null, floor, tower, wid, container, world);
      });
    });

    // Edit sub-floor
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

    // Delete sub-floor
    container.querySelectorAll('.btn-del-subfloor').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const floorNum = parseInt(btn.dataset.floorNum, 10);
        const subId = btn.dataset.subId;
        const floor = (tower.floors || []).find(f => f.floorNum === floorNum);
        if (!floor) return;
        Utils.confirm('서브층 삭제', '삭제하시겠습니까?', async () => {
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

  _computeBundles: function(floors, maxFloor) {
    if (floors.length === 0) return [];
    const minFloor = Math.min(...floors.map(f => f.floorNum || 0));
    const bundleMin = Math.floor(minFloor / this.BUNDLE_SIZE) * this.BUNDLE_SIZE;
    const bundleMax = Math.floor(maxFloor / this.BUNDLE_SIZE) * this.BUNDLE_SIZE;
    const bundles = [];
    for (let s = bundleMin; s <= bundleMax; s += this.BUNDLE_SIZE) {
      const end = s + this.BUNDLE_SIZE - 1;
      const bundleFloors = floors.filter(f => (f.floorNum || 0) >= s && (f.floorNum || 0) <= end);
      bundles.push({ start: s, end, floors: bundleFloors });
    }
    return bundles;
  },

  // ── FLOOR CARD (accordion) ───────────────────────────────────────────────────

  _floorCard: function(floor, expanded) {
    const fn = floor.floorNum;
    const isZero = fn === 0;
    const accentColor = isZero ? '#10b981' : floor.hidden ? '#fbbf24' : '#818cf8';
    const bgGrad = `linear-gradient(135deg,${accentColor}18 0%,transparent 60%)`;
    const subFloorCount = (floor.subFloors || []).length;

    const subFloorsHtml = (floor.subFloors || []).map(sf => this._subFloorSection(floor, sf)).join('');

    const detailHtml = expanded ? `
      <div style="padding:14px 16px 16px;border-top:1px solid var(--color-border);">
        ${floor.theme ? `
          <div style="margin-bottom:10px;">
            <span style="font-size:11px;color:var(--color-text-muted);font-weight:600;">테마</span>
            <span style="font-size:13px;margin-left:8px;">${Utils.escHtml(floor.theme)}</span>
          </div>` : ''}
        ${floor.enemies ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">ㅣ[적]</div>
            ${floor.enemies.split('\n').map(e => e.trim()).filter(Boolean).map(e =>
              `<div style="font-size:13px;padding:1px 0 1px 8px;">ㄴ${Utils.escHtml(e)}</div>`).join('')}
          </div>` : ''}
        ${floor.features ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">ㅣ[특징]</div>
            ${floor.features.split('\n').map(line => line.trim()).filter(Boolean).map(line =>
              `<div style="font-size:13px;padding:1px 0 1px 8px;line-height:1.7;">ㄴ${Utils.escHtml(line)}</div>`).join('')}
          </div>` : ''}
        ${floor.quests ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">ㅣ[퀘스트]</div>
            <div style="font-size:13px;white-space:pre-wrap;padding-left:8px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(floor.quests))}</div>
          </div>` : ''}
        ${floor.rewards ? `
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">ㅣ[보상]</div>
            <div style="font-size:13px;white-space:pre-wrap;padding-left:8px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(floor.rewards))}</div>
          </div>` : ''}
        ${floor.image ? `<div style="margin-bottom:10px;"><img src="${floor.image}" style="max-width:100%;border-radius:8px;" loading="lazy" /></div>` : ''}

        <!-- Sub-floors (hidden floors) -->
        ${subFloorsHtml ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--color-border);">
            <div style="font-size:11px;color:#fbbf24;font-weight:700;margin-bottom:8px;letter-spacing:0.5px;">히든 서브층 (${subFloorCount}개)</div>
            ${subFloorsHtml}
          </div>` : ''}

        <!-- Add sub-floor button -->
        <div style="margin-top:12px;">
          <button class="btn btn-ghost btn-sm btn-add-subfloor btn-floor-action" data-floor-num="${fn}"
            style="font-size:12px;border:1px dashed var(--color-border);">+ 히든 층 추가 (${fn}-1 스타일)</button>
        </div>
      </div>` : '';

    return `
    <div class="floor-card" data-floor-num="${fn}"
      style="background:var(--color-surface2);border-radius:10px;border:1px solid ${accentColor}44;margin-bottom:8px;overflow:hidden;">
      <div class="floor-card-header" data-floor-num="${fn}"
        style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:${bgGrad};cursor:pointer;user-select:none;">
        <!-- Floor number -->
        <div style="min-width:52px;text-align:center;flex-shrink:0;">
          <div style="font-weight:900;font-size:22px;line-height:1;color:${accentColor};">${fn}</div>
          <div style="font-size:10px;color:var(--color-text-muted);">${isZero ? '0층' : '층'}</div>
        </div>
        <div style="flex:1;min-width:0;">
          ${floor.theme ? `<div style="font-weight:600;font-size:13px;margin-bottom:2px;">${Utils.escHtml(floor.theme)}</div>` : ''}
          <div style="font-size:11px;color:var(--color-text-muted);display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            ${floor.enemies ? `<span>${Utils.escHtml(floor.enemies.split('\n')[0]).substring(0, 30)}${floor.enemies.split('\n')[0].length > 30 ? '…' : ''}</span>` : ''}
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

  _subFloorSection: function(parentFloor, sf) {
    const label = sf.name || `${parentFloor.floorNum}-서브`;
    return `
    <div style="border-left:2px solid rgba(251,191,36,0.4);padding-left:12px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <div style="font-weight:700;font-size:13px;color:#fbbf24;">
          ${Utils.escHtml(label)}
          ${sf.hidden ? '<span style="font-size:10px;background:rgba(251,191,36,0.12);color:#fbbf24;padding:1px 5px;border-radius:4px;margin-left:4px;">히든</span>' : ''}
        </div>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm btn-edit-subfloor btn-floor-action" data-floor-num="${parentFloor.floorNum}" data-sub-id="${Utils.escHtml(sf.subId)}" style="font-size:11px;padding:2px 6px;">편집</button>
          <button class="btn btn-ghost btn-sm btn-del-subfloor btn-floor-action" data-floor-num="${parentFloor.floorNum}" data-sub-id="${Utils.escHtml(sf.subId)}" style="color:var(--color-danger);font-size:11px;padding:2px 6px;">삭제</button>
        </div>
      </div>
      ${sf.enemies ? `<div style="font-size:12px;padding-left:4px;">ㄴ적: ${Utils.escHtml(sf.enemies)}</div>` : ''}
      ${sf.features ? `<div style="font-size:12px;white-space:pre-wrap;padding-left:4px;line-height:1.7;">${sf.features.split('\n').map(line => line.trim()).filter(Boolean).map(l => `ㄴ${Utils.escHtml(l)}`).join('<br>')}</div>` : ''}
      ${sf.rewards ? `<div style="font-size:12px;padding-left:4px;color:var(--color-text-muted);">ㄴ보상: ${Utils.escHtml(sf.rewards)}</div>` : ''}
    </div>`;
  },

  // ── FLOOR FORM ───────────────────────────────────────────────────────────────

  _openFloorForm: async function(floor, tower, wid, container, world) {
    const isEdit = !!floor;
    const f = floor || {};
    let newImage = f.image || null;

    const allMonsters = await DB.getAll('monsters', wid);

    const ta = (id, label, val, rows, placeholder) => `
      <div class="form-group">
        <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">${label}</label>
        <textarea class="input-field" id="${id}" rows="${rows || 3}" placeholder="${placeholder || ''}"
          style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(val || '')}</textarea>
      </div>`;

    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;max-height:72vh;overflow-y:auto;padding-right:4px;">
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">층 번호 *</label>
          <input class="input-field" id="fFloorNum" type="number"
            value="${f.floorNum !== undefined ? f.floorNum : ''}" placeholder="예: 1, 50, 100"
            style="width:100%;box-sizing:border-box;" ${isEdit ? 'readonly' : ''} />
          ${isEdit ? '<div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">층 번호는 수정할 수 없습니다</div>' : ''}
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">테마</label>
          <input class="input-field" id="fFloorTheme" value="${Utils.escHtml(f.theme || '')}" placeholder="예: 슬라임 사냥터, 마의 삼림" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <label class="form-label" style="font-size:13px;font-weight:600;display:block;margin:0;">적 (줄바꿈으로 구분)</label>
            ${allMonsters.length > 0 ? `<button type="button" class="btn btn-ghost btn-sm" id="btnPickMonsters" style="font-size:11px;">👾 몬스터에서 추가</button>` : ''}
          </div>
          <textarea class="input-field" id="fFloorEnemies" rows="3" placeholder="예: 슬라임 (F급)\n오거 (E급)"
            style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(f.enemies || '')}</textarea>
        </div>
        ${ta('fFloorFeatures', '특징 (줄바꿈으로 각 항목)', f.features, 4, '예: 마기 농도 높음\n중력 2배')}
        ${ta('fFloorQuests', '퀘스트', f.quests, 2, '퀘스트 조건')}
        ${ta('fFloorRewards', '보상', f.rewards, 2, '보상 내용')}
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
            <input type="checkbox" id="fFloorHidden" ${f.hidden ? 'checked' : ''} />
            히든 층
          </label>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">이미지</label>
          <div id="floorImgPreview" style="margin-bottom:6px;">
            ${f.image ? `<img src="${f.image}" style="max-width:120px;border-radius:8px;" />` : ''}
          </div>
          <input type="file" id="floorImageFile" accept="image/*" style="font-size:13px;" />
        </div>
      </div>`;

    Utils.openModal(isEdit ? `${f.floorNum}층 편집` : '새 층 추가', body, async () => {
      const numEl = document.getElementById('fFloorNum');
      const numVal = numEl?.value;
      if (numVal === '' || numVal === null || numVal === undefined) {
        Utils.toast('층 번호를 입력하세요', 'error'); return false;
      }
      const floorNum = parseInt(numVal, 10);
      if (isNaN(floorNum)) { Utils.toast('올바른 층 번호를 입력하세요', 'error'); return false; }

      if (!isEdit) {
        const exists = (tower.floors || []).some(ff => ff.floorNum === floorNum);
        if (exists) { Utils.toast(`${floorNum}층이 이미 존재합니다`, 'error'); return false; }
      }

      const imgFile = document.getElementById('floorImageFile')?.files?.[0];
      if (imgFile) newImage = await Utils.imageToBase64(imgFile);

      const floorData = {
        floorNum,
        theme: document.getElementById('fFloorTheme')?.value.trim() || '',
        enemies: document.getElementById('fFloorEnemies')?.value.trim() || '',
        features: document.getElementById('fFloorFeatures')?.value.trim() || '',
        quests: document.getElementById('fFloorQuests')?.value.trim() || '',
        rewards: document.getElementById('fFloorRewards')?.value.trim() || '',
        hidden: document.getElementById('fFloorHidden')?.checked || false,
        image: newImage,
        subFloors: f.subFloors || [],
      };

      const floors = (tower.floors || []).filter(ff => ff.floorNum !== floorNum);
      floors.push(floorData);
      tower.floors = floors.sort((a, b) => a.floorNum - b.floorNum);

      await DB.put('towers', tower);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');

      this._bundleStart = Math.floor(floorNum / this.BUNDLE_SIZE) * this.BUNDLE_SIZE;
      this._expandedFloor = floorNum;

      const all = await DB.getAll('towers', wid);
      const t = all.find(x => x.id === tower.id);
      if (t) this._renderTower(container, t, wid, world);
      return true;
    }, isEdit ? '저장' : '추가');

    // Wire image preview and monster picker after modal renders
    setTimeout(() => {
      document.getElementById('floorImageFile')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        newImage = await Utils.imageToBase64(file);
        const prev = document.getElementById('floorImgPreview');
        if (prev) prev.innerHTML = `<img src="${newImage}" style="max-width:120px;border-radius:8px;" />`;
      });

      document.getElementById('btnPickMonsters')?.addEventListener('click', () => {
        this._openMonsterPicker(allMonsters, wid);
      });
    }, 50);
  },

  _openMonsterPicker: function(monsters, wid) {
    const body = `
      <div style="display:flex;flex-direction:column;gap:8px;max-height:60vh;">
        <input class="input-field" id="monsterPickSearch" placeholder="몬스터 검색..." style="width:100%;box-sizing:border-box;" />
        <div id="monsterPickList" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:4px;">
          ${monsters.map(m => `
            <label style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--color-surface2);border-radius:8px;border:1px solid var(--color-border);cursor:pointer;">
              <input type="checkbox" class="monster-pick-cb" data-name="${Utils.escHtml(m.name || '')}" data-grade="${Utils.escHtml(m.grade || '')}" />
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;">${Utils.escHtml(m.name || '이름 없음')}</div>
                ${m.grade ? `<div style="font-size:11px;color:var(--color-text-muted);">등급: ${Utils.escHtml(m.grade)}</div>` : ''}
              </div>
            </label>`).join('')}
        </div>
      </div>`;

    Utils.openModal('몬스터 추가', body, () => {
      const checked = document.querySelectorAll('#globalModalBody .monster-pick-cb:checked');
      if (checked.length === 0) { Utils.toast('몬스터를 선택하세요', 'error'); return false; }
      const enemyTA = document.getElementById('fFloorEnemies');
      if (!enemyTA) return false;
      const toAdd = Array.from(checked).map(cb => {
        const name = cb.dataset.name;
        const grade = cb.dataset.grade;
        return grade ? `${name} (${grade}급)` : name;
      }).join('\n');
      const existing = enemyTA.value.trim();
      enemyTA.value = existing ? existing + '\n' + toAdd : toAdd;
      return true;
    }, '추가');

    setTimeout(() => {
      document.getElementById('monsterPickSearch')?.addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('#globalModalBody .monster-pick-cb').forEach(cb => {
          const name = cb.dataset.name.toLowerCase();
          const grade = cb.dataset.grade.toLowerCase();
          const row = cb.closest('label');
          if (row) row.style.display = (name.includes(q) || grade.includes(q)) ? '' : 'none';
        });
      });
    }, 50);
  },

  // ── SUB-FLOOR FORM ──────────────────────────────────────────────────────────

  _openSubFloorForm: function(sub, parentFloor, tower, wid, container, world) {
    const isEdit = !!sub;
    const s = sub || {};
    const nextIdx = (parentFloor.subFloors || []).length + 1;
    const defaultName = s.name || `${parentFloor.floorNum}-${nextIdx}층`;

    const ta = (id, label, val, rows, placeholder) => `
      <div class="form-group">
        <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">${label}</label>
        <textarea class="input-field" id="${id}" rows="${rows || 3}" placeholder="${placeholder || ''}"
          style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(val || '')}</textarea>
      </div>`;

    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;max-height:65vh;overflow-y:auto;padding-right:4px;">
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">서브층 이름</label>
          <input class="input-field" id="fSubName" value="${Utils.escHtml(s.name || defaultName)}" placeholder="예: 1-1층, 1-2층" style="width:100%;box-sizing:border-box;" />
        </div>
        ${ta('fSubEnemies', '적', s.enemies, 2, '적 설명')}
        ${ta('fSubFeatures', '특징', s.features, 4, '특징 설명')}
        ${ta('fSubRewards', '보상', s.rewards, 2, '보상 내용')}
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
            <input type="checkbox" id="fSubHidden" ${s.hidden ? 'checked' : ''} />
            히든 서브층
          </label>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '서브층 편집' : '서브층 추가', body, async () => {
      const subData = {
        subId: s.subId || DB.genId(),
        name: document.getElementById('fSubName')?.value.trim() || defaultName,
        enemies: document.getElementById('fSubEnemies')?.value.trim() || '',
        features: document.getElementById('fSubFeatures')?.value.trim() || '',
        rewards: document.getElementById('fSubRewards')?.value.trim() || '',
        hidden: document.getElementById('fSubHidden')?.checked || false,
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
  },
};
