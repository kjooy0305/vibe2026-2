'use strict';
window.Pages = window.Pages || {};
window.Pages.organizations = {
  _container: null,
  _currentId: null,
  _listScrollY: 0,
  _customTypes: null,

  DEFAULT_TYPES: ['길드', '국가', '정부기관', '비밀조직', '기업', '군사조직', '학술단체', '종교단체', '범죄조직', '기타'],
  ICONS: ['🏛️','⚔️','🔮','🌑','💼','🛡️','📚','⛪','🗡️','🎭','🌟','🔱','☠️','🦅','🐉','🏢','🏰','🌹','🗺️','⚡','🕵️','🌊','🔥','❄️','🌿'],
  ALIGNMENTS: ['', '선', '악', '중립', '혼돈선', '혼돈악', '중립선', '중립악'],

  _loadCustomTypes: async function(wid) {
    const ct = await DB.getSetting('orgCustomTypes_' + wid);
    this._customTypes = ct || [];
  },

  _getAllTypes: function() {
    return [...this.DEFAULT_TYPES, ...(this._customTypes || [])];
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

    const [orgs] = await Promise.all([
      DB.getAll('organizations', wid),
      this._loadCustomTypes(wid),
    ]);
    if (options.highlightId) this._currentId = options.highlightId;

    if (this._currentId) {
      const org = orgs.find(o => o.id === this._currentId);
      if (org) { await this._renderDetail(container, org, wid, orgs); return; }
    }

    this._renderList(container, orgs, wid);
  },

  // ── LIST ─────────────────────────────────────────────────────────────────────

  _renderList: function(container, orgs, wid) {
    this._currentId = null;
    const world = AppStore.getState().currentWorld;
    const self = this;

    // Build parent lookup
    const orgMap = {};
    orgs.forEach(o => { orgMap[o.id] = o; });

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">조직/단체</h2>
          <button class="btn btn-primary btn-sm" id="btnAddOrg">+ 추가</button>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${orgs.length}개
        </p>
        <div style="display:flex;gap:6px;align-items:center;margin-top:8px;">
          <input class="input-field" id="orgFilter" placeholder="이름, 타입, 성향, 상위 단체 검색..." style="flex:1;min-width:0;" />
          <button id="btnGroupToggle" class="btn btn-ghost btn-sm" style="font-size:11px;white-space:nowrap;">그룹보기</button>
        </div>
      </div>

      <div id="orgList" class="item-list"></div>
    </div>`;

    let groupMode = false;

    const renderOrgList = (q) => {
      const listEl = document.getElementById('orgList');
      if (!listEl) return;

      let filtered = orgs.filter(o => {
        const parentName = o.parentOrgId ? (orgMap[o.parentOrgId]?.name || '') : '';
        const txt = [o.name, o.type, o.alignment, parentName].filter(Boolean).join(' ');
        return Utils.matchesQuery(txt, q);
      });

      if (filtered.length === 0) {
        listEl.innerHTML = `<div class="empty-state" style="padding:48px;text-align:center;"><div style="font-size:48px;">🏛️</div><div>조직이 없습니다</div></div>`;
        return;
      }

      if (groupMode) {
        // Group top-level orgs first, then their children
        const topLevel = filtered.filter(o => !o.parentOrgId || !orgMap[o.parentOrgId]);
        const children = filtered.filter(o => o.parentOrgId && orgMap[o.parentOrgId]);

        let html = '';
        // top-level orgs
        topLevel.forEach(o => {
          html += self._orgCardHtml(o, null, false);
          // sub-orgs under this parent
          children.filter(c => c.parentOrgId === o.id).forEach(c => {
            html += self._orgCardHtml(c, o, true);
          });
        });
        // orphan children (parent filtered out)
        children.filter(c => !topLevel.find(p => p.id === c.parentOrgId)).forEach(o => {
          html += self._orgCardHtml(o, orgMap[o.parentOrgId], true);
        });
        listEl.innerHTML = html;
      } else {
        listEl.innerHTML = filtered.map(o => self._orgCardHtml(o, o.parentOrgId ? orgMap[o.parentOrgId] : null, false)).join('');
      }

      // Wire card events
      listEl.querySelectorAll('.org-card').forEach(card => {
        card.addEventListener('click', e => {
          if (e.target.closest('.btn-del-org') || e.target.closest('.btn-copy-org')) return;
          const id = card.dataset.id;
          const org = orgs.find(o => o.id === id);
          if (org) {
            self._listScrollY = container.scrollTop || window.scrollY || 0;
            self._currentId = id;
            self._renderDetail(container, org, wid, orgs);
          }
        });
      });

      listEl.querySelectorAll('.btn-copy-org').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          const org = orgs.find(o => o.id === btn.dataset.id);
          if (!org) return;
          const text = Utils.toTextExport(`조직: ${org.name}`, [
            ['타입', org.type], ['성향', org.alignment],
            ['설명', org.description], ['특징', org.features],
          ]);
          Utils.copyText(text);
          Utils.toast('복사됨', 'success');
        });
      });

      listEl.querySelectorAll('.btn-del-org').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const org = orgs.find(o => o.id === btn.dataset.id);
          Utils.confirmWithInput(
            '조직 삭제',
            `삭제하려면 조직명을 정확히 입력하세요.`,
            org?.name || '이 조직',
            async () => {
              await DB.del('organizations', btn.dataset.id);
              Utils.toast('삭제됨', 'info');
              self.init(container);
            }
          );
        });
      });
    };

    document.getElementById('btnAddOrg')?.addEventListener('click', () => {
      this._openForm(null, wid, container, orgs);
    });

    document.getElementById('orgFilter')?.addEventListener('input', e => renderOrgList(e.target.value));

    document.getElementById('btnGroupToggle')?.addEventListener('click', () => {
      groupMode = !groupMode;
      const btn = document.getElementById('btnGroupToggle');
      if (btn) {
        btn.style.background = groupMode ? 'var(--color-primary)' : '';
        btn.style.color = groupMode ? '#000' : '';
        btn.textContent = groupMode ? '그룹보기 ✓' : '그룹보기';
      }
      renderOrgList(document.getElementById('orgFilter')?.value || '');
    });

    renderOrgList('');
  },

  _orgCardHtml: function(o, parentOrg, indented) {
    return `
    <div class="list-item list-item--full org-card"
      data-id="${Utils.escHtml(o.id)}"
      style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--color-surface2);border-radius:12px;border:1px solid var(--color-border);margin-bottom:8px;cursor:pointer;${indented ? 'margin-left:16px;border-left:3px solid var(--color-border);' : ''}">
      <div style="font-size:24px;flex-shrink:0;width:42px;height:42px;display:flex;align-items:center;justify-content:center;background:var(--color-surface3,#2a2a3a);border-radius:10px;">
        ${Utils.escHtml(o.icon || '🏛️')}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(o.name)}</div>
        <div style="font-size:12px;color:var(--color-text-muted);margin-top:1px;">
          ${Utils.escHtml(o.type || '기타')}${o.alignment ? ' · ' + Utils.escHtml(o.alignment) : ''} · 구성원 ${(o.members || []).length}명
        </div>
        ${parentOrg ? `<div style="font-size:11px;color:var(--color-text-dim);">↑ ${Utils.escHtml(parentOrg.name)}</div>` : ''}
        ${o.description ? `<div style="font-size:12px;color:var(--color-text-dim);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(o.description)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end;">
        <button class="btn btn-ghost btn-sm btn-copy-org" data-id="${Utils.escHtml(o.id)}" style="font-size:11px;">복사</button>
        <button class="btn btn-ghost btn-sm btn-del-org" data-id="${Utils.escHtml(o.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  // ── DETAIL ────────────────────────────────────────────────────────────────────

  _renderDetail: async function(container, org, wid, orgs) {
    const chars = await DB.getAll('characters', wid);
    if (!orgs) orgs = await DB.getAll('organizations', wid);
    const members = (org.members || []).map(mid => chars.find(c => c.id === mid)).filter(Boolean);
    const parentOrg = org.parentOrgId ? orgs.find(o => o.id === org.parentOrgId) : null;
    const subOrgs = orgs.filter(o => o.parentOrgId === org.id);

    container.innerHTML = `
    <div class="page active" style="overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;">
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackOrg">← 목록</button>
          <div style="font-size:26px;">${Utils.escHtml(org.icon || '🏛️')}</div>
          <h2 class="page-title" style="font-size:18px;">${Utils.escHtml(org.name)}</h2>
          ${org.alignment ? `<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:var(--color-surface3,#2a2a3a);border:1px solid var(--color-border);color:var(--color-text-muted);">${Utils.escHtml(org.alignment)}</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditOrg">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnExportOrg">텍스트 복사</button>
        </div>
      </div>

      <!-- Info -->
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
          <div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:2px;">타입</div>
            <div style="font-weight:600;font-size:14px;">${Utils.escHtml(org.type || '기타')}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:2px;">구성원</div>
            <div style="font-weight:600;font-size:14px;">${members.length}명</div>
          </div>
          ${org.alignment ? `
          <div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:2px;">성향</div>
            <div style="font-weight:600;font-size:14px;">${Utils.escHtml(org.alignment)}</div>
          </div>` : ''}
          ${parentOrg ? `
          <div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:2px;">상위 단체</div>
            <div class="parent-org-link" data-id="${Utils.escHtml(parentOrg.id)}" style="font-weight:600;font-size:14px;color:var(--color-primary);cursor:pointer;">${Utils.escHtml(parentOrg.icon || '🏛️')} ${Utils.escHtml(parentOrg.name)}</div>
          </div>` : ''}
        </div>
        ${org.description ? `
          <div style="margin-top:8px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:2px;">설명</div>
            <div style="font-size:13px;line-height:1.7;white-space:pre-wrap;">${Utils.nl2br(Utils.escHtml(org.description))}</div>
          </div>` : ''}
        ${org.features ? `
          <div style="margin-top:8px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:2px;">특징</div>
            <div style="font-size:13px;line-height:1.7;white-space:pre-wrap;">${Utils.nl2br(Utils.escHtml(org.features))}</div>
          </div>` : ''}
        ${org.secret ? `
          <div style="margin-top:8px;background:rgba(255,100,100,0.08);border-radius:6px;padding:8px;">
            <div style="font-size:11px;color:var(--color-danger);margin-bottom:2px;">비밀 (작가 전용)</div>
            <div style="font-size:13px;line-height:1.7;white-space:pre-wrap;">${Utils.nl2br(Utils.escHtml(org.secret))}</div>
          </div>` : ''}
      </div>

      <!-- Sub-orgs -->
      ${subOrgs.length > 0 ? `
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="font-weight:700;font-size:13px;color:var(--color-text-muted);margin-bottom:8px;">하위 단체 (${subOrgs.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${subOrgs.map(so => `
            <button class="sub-org-link" data-id="${Utils.escHtml(so.id)}"
              style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;background:var(--color-surface3,#2a2a3a);border:1px solid var(--color-border);cursor:pointer;color:var(--color-text);font-size:13px;">
              ${Utils.escHtml(so.icon || '🏛️')} ${Utils.escHtml(so.name)}
            </button>`).join('')}
        </div>
      </div>` : ''}

      <!-- Members -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-weight:700;font-size:14px;color:var(--color-text-muted);">구성원 (${members.length}명)</div>
        <button class="btn btn-ghost btn-sm" id="btnManageMembers">구성원 관리</button>
      </div>
      <div id="memberList">
        ${members.length === 0
          ? `<div style="padding:24px;text-align:center;color:var(--color-text-muted);font-size:13px;">구성원 없음 — "구성원 관리"에서 추가하세요</div>`
          : members.map(c => `
              <button class="member-link" data-cid="${Utils.escHtml(c.id)}"
                style="width:100%;display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--color-surface2);border-radius:10px;border:1px solid var(--color-border);margin-bottom:8px;cursor:pointer;text-align:left;">
                ${c.image
                  ? `<img src="${c.image}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;" />`
                  : `<div style="width:40px;height:40px;border-radius:50%;background:var(--color-surface3,#2a2a3a);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">👤</div>`}
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:600;font-size:14px;">${Utils.escHtml(c.name)}</div>
                  <div style="font-size:12px;color:var(--color-text-muted);">Lv.${c.level || 0} · ${Utils.escHtml(c.race || '인간')}${c.title ? ` · [${Utils.escHtml(c.title)}]` : ''}</div>
                </div>
                <span style="font-size:16px;color:var(--color-text-muted);">›</span>
              </button>`).join('')}
      </div>
    </div>`;

    // Back to list
    document.getElementById('btnBackOrg')?.addEventListener('click', async () => {
      const scrollY = this._listScrollY || 0;
      this._currentId = null;
      await this.init(container);
      requestAnimationFrame(() => {
        container.scrollTop = scrollY;
        if (scrollY > 0) window.scrollTo(0, scrollY);
      });
    });

    document.getElementById('btnEditOrg')?.addEventListener('click', () => {
      this._openForm(org, wid, container, orgs);
    });

    document.getElementById('btnExportOrg')?.addEventListener('click', () => {
      const text = Utils.toTextExport(`조직: ${org.name}`, [
        ['타입', org.type],
        ['성향', org.alignment],
        ['상위 단체', parentOrg?.name || ''],
        ['구성원', members.map(c => c.name).join(', ')],
        ['설명', org.description],
        ['특징', org.features],
        ['비밀', org.secret],
      ]);
      Utils.copyText(text);
      Utils.toast('복사됨', 'success');
    });

    // Member click → char detail, with org referrer for back nav
    container.querySelectorAll('.member-link').forEach(btn => {
      btn.addEventListener('click', () => {
        sessionStorage.setItem('orgReferrer', JSON.stringify({ page: 'organizations', id: org.id }));
        AppRouter.navigate('characters', { highlightId: btn.dataset.cid });
      });
    });

    // Parent org link
    container.querySelectorAll('.parent-org-link').forEach(link => {
      link.addEventListener('click', () => {
        const target = orgs.find(o => o.id === link.dataset.id);
        if (target) { this._currentId = target.id; this._renderDetail(container, target, wid, orgs); }
      });
    });

    // Sub-org link
    container.querySelectorAll('.sub-org-link').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = orgs.find(o => o.id === btn.dataset.id);
        if (target) { this._currentId = target.id; this._renderDetail(container, target, wid, orgs); }
      });
    });

    document.getElementById('btnManageMembers')?.addEventListener('click', () => {
      const memberIds = new Set(org.members || []);
      const checkboxes = chars.length === 0
        ? '<div style="color:var(--color-text-muted);">이 세계에 캐릭터가 없습니다.</div>'
        : chars.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko')).map(c => `
            <label style="display:flex;align-items:center;gap:10px;padding:10px 0;cursor:pointer;border-bottom:1px solid var(--color-border);">
              <input type="checkbox" data-cid="${Utils.escHtml(c.id)}" ${memberIds.has(c.id) ? 'checked' : ''} style="width:18px;height:18px;" />
              ${c.image ? `<img src="${c.image}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />` : `<span style="font-size:18px;">👤</span>`}
              <span style="font-size:13px;">${Utils.escHtml(c.name)} <span style="color:var(--color-text-muted);">Lv.${c.level || 0} · ${Utils.escHtml(c.race || '인간')}</span></span>
            </label>`).join('');

      Utils.openModal('구성원 관리', `<div style="">${checkboxes}</div>`, async () => {
        const selected = [...document.querySelectorAll('input[data-cid]:checked')].map(cb => cb.dataset.cid);
        org.members = selected;
        org.updatedAt = Date.now();
        await DB.put('organizations', org);

        for (const c of chars) {
          const orgRef = { id: org.id, name: org.name };
          let cOrgs = (c.organizations || []).filter(o => (o.id || o) !== org.id);
          if (selected.includes(c.id)) cOrgs.push(orgRef);
          if (JSON.stringify(cOrgs) !== JSON.stringify(c.organizations || [])) {
            c.organizations = cOrgs;
            c.updatedAt = Date.now();
            await DB.put('characters', c);
          }
        }
        Utils.toast('저장됨', 'success');
        this._renderDetail(container, org, wid, orgs);
        return true;
      }, '저장');
    });
  },

  // ── FORM ──────────────────────────────────────────────────────────────────────

  _openForm: async function(org, wid, container, orgs) {
    const isEdit = !!org;
    const self = this;
    let selectedIcon = org?.icon || '🏛️';
    const iconPool = (await DB.getSetting('iconList_org', null)) || this.ICONS;
    const allTypes = this._getAllTypes();
    const otherOrgs = (orgs || []).filter(o => o.id !== org?.id);

    const typeOptions = [...allTypes, '__custom__'].map(t => {
      if (t === '__custom__') return `<option value="__custom__">기타 (직접 입력)...</option>`;
      return `<option value="${Utils.escHtml(t)}" ${(org?.type || '기타') === t ? 'selected' : ''}>${Utils.escHtml(t)}</option>`;
    }).join('');

    const alignOptions = this.ALIGNMENTS.map(a =>
      `<option value="${Utils.escHtml(a)}" ${(org?.alignment || '') === a ? 'selected' : ''}>${a || '없음'}</option>`
    ).join('');

    const parentOptions = [
      `<option value="">없음</option>`,
      ...otherOrgs.map(o =>
        `<option value="${Utils.escHtml(o.id)}" ${org?.parentOrgId === o.id ? 'selected' : ''}>${Utils.escHtml(o.icon || '🏛️')} ${Utils.escHtml(o.name)}</option>`)
    ].join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">조직명 *</label>
          <input class="input-field" id="fOrgName" value="${Utils.escHtml(org?.name || '')}"
            placeholder="예: 아헨 헌터 길드" style="width:100%;box-sizing:border-box;" />
        </div>

        <!-- 타입 + 관리 -->
        <div class="form-group">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <label class="form-label" style="font-size:13px;font-weight:600;margin:0;">타입</label>
            <button type="button" id="btnToggleOrgTypeList" class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 7px;">목록 관리</button>
          </div>
          <select class="select-input" id="fOrgType" style="width:100%;">${typeOptions}</select>
          <input class="input-field" id="fOrgTypeCustom" placeholder="타입 직접 입력..." style="width:100%;box-sizing:border-box;margin-top:4px;display:none;" />
          <div id="orgTypeListPanel" style="display:none;margin-top:6px;padding:8px;background:var(--color-surface3,#1e2030);border-radius:8px;border:1px solid var(--color-border);">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">타입 목록 (사용자 추가 항목 삭제 가능)</div>
            <div id="orgTypeItems">
              ${(this._customTypes || []).length === 0
                ? '<div style="font-size:11px;color:var(--color-text-dim);">추가한 타입 없음</div>'
                : (this._customTypes || []).map(t => `
                  <div class="org-type-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);">
                    <span style="font-size:12px;">${Utils.escHtml(t)}</span>
                    <button type="button" class="btn-del-org-type" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button>
                  </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- 성향 -->
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">성향</label>
          <select class="select-input" id="fOrgAlignment" style="width:100%;">${alignOptions}</select>
        </div>

        <!-- 상위 단체 -->
        ${otherOrgs.length > 0 ? `
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">상위 단체</label>
          <select class="select-input" id="fOrgParent" style="width:100%;">${parentOptions}</select>
        </div>` : ''}

        <!-- 아이콘 -->
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">아이콘</label>
          <div style="font-size:32px;text-align:center;margin-bottom:6px;" id="orgIconPreview">${Utils.escHtml(selectedIcon)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;" id="orgIconPicker">
            ${iconPool.map(ic => `<button type="button" class="icon-pick-btn" data-icon="${ic}" style="font-size:22px;padding:5px;border-radius:8px;border:2px solid ${ic===selectedIcon?'var(--color-primary)':'transparent'};background:var(--color-bg);cursor:pointer;line-height:1.2;">${ic}</button>`).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">설명</label>
          <textarea class="textarea-field" id="fOrgDesc" rows="3"
            placeholder="조직 소개..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(org?.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">특징</label>
          <textarea class="textarea-field" id="fOrgFeatures" rows="2"
            placeholder="조직의 특이한 특징, 규칙..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(org?.features || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">비밀 (작가 전용)</label>
          <textarea class="textarea-field" id="fOrgSecret" rows="2"
            placeholder="독자에게 숨겨진 비밀, 진실..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(org?.secret || '')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '조직 편집' : '새 조직', body, async () => {
      const name = document.getElementById('fOrgName')?.value.trim();
      if (!name) { Utils.toast('조직명을 입력하세요', 'error'); return false; }

      let type = document.getElementById('fOrgType')?.value || '기타';
      if (type === '__custom__') {
        type = document.getElementById('fOrgTypeCustom')?.value.trim() || '기타';
        if (type && type !== '기타' && !self._getAllTypes().includes(type)) {
          self._customTypes = [...(self._customTypes || []), type];
          await DB.setSetting('orgCustomTypes_' + wid, self._customTypes);
        }
      }

      const item = {
        ...(org || {}),
        worldId: wid,
        name,
        icon: selectedIcon,
        type,
        alignment: document.getElementById('fOrgAlignment')?.value || '',
        parentOrgId: document.getElementById('fOrgParent')?.value || null,
        description: document.getElementById('fOrgDesc')?.value.trim() || '',
        features: document.getElementById('fOrgFeatures')?.value.trim() || '',
        secret: document.getElementById('fOrgSecret')?.value.trim() || '',
        members: org?.members || [],
        updatedAt: Date.now(),
        createdAt: org?.createdAt || Date.now(),
        id: org?.id || DB.genId(),
      };

      await DB.put('organizations', item);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      this._currentId = item.id;
      const updatedOrgs = await DB.getAll('organizations', wid);
      const updated = updatedOrgs.find(o => o.id === item.id);
      if (updated) this._renderDetail(container, updated, wid, updatedOrgs);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      // Icon picker
      const orgPicker = document.getElementById('orgIconPicker');
      const orgPreview = document.getElementById('orgIconPreview');
      orgPicker?.querySelectorAll('.icon-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedIcon = btn.dataset.icon;
          orgPicker.querySelectorAll('.icon-pick-btn').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = 'var(--color-primary)';
          if (orgPreview) orgPreview.textContent = selectedIcon;
        });
      });

      // Type toggle
      document.getElementById('fOrgType')?.addEventListener('change', function() {
        const customInput = document.getElementById('fOrgTypeCustom');
        if (customInput) customInput.style.display = this.value === '__custom__' ? 'block' : 'none';
      });

      // Type list manage toggle
      document.getElementById('btnToggleOrgTypeList')?.addEventListener('click', () => {
        const panel = document.getElementById('orgTypeListPanel');
        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });

      // Delete custom type
      document.getElementById('orgTypeItems')?.addEventListener('click', async e => {
        const btn = e.target.closest('.btn-del-org-type');
        if (!btn) return;
        const val = btn.dataset.val;
        self._customTypes = (self._customTypes || []).filter(t => t !== val);
        await DB.setSetting('orgCustomTypes_' + wid, self._customTypes);
        // Rebuild select
        const allT = self._getAllTypes();
        const typeSelectEl = document.getElementById('fOrgType');
        if (typeSelectEl) {
          const cur = typeSelectEl.value;
          typeSelectEl.innerHTML = [...allT, '__custom__'].map(t => {
            if (t === '__custom__') return `<option value="__custom__">기타 (직접 입력)...</option>`;
            return `<option value="${Utils.escHtml(t)}"${cur === t ? ' selected' : ''}>${Utils.escHtml(t)}</option>`;
          }).join('');
        }
        // Rebuild items list
        const itemsEl = document.getElementById('orgTypeItems');
        if (itemsEl) {
          itemsEl.innerHTML = self._customTypes.length === 0
            ? '<div style="font-size:11px;color:var(--color-text-dim);">추가한 타입 없음</div>'
            : self._customTypes.map(t => `
              <div class="org-type-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);">
                <span style="font-size:12px;">${Utils.escHtml(t)}</span>
                <button type="button" class="btn-del-org-type" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button>
              </div>`).join('');
        }
      });
    }, 50);
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  }
};
