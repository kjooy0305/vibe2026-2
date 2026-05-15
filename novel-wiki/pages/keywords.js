'use strict';
window.Pages = window.Pages || {};
window.Pages.keywords = {
  _currentFolderId: null,
  _currentKeywordId: null,
  _container: null,
  _viewMode: 'all', // 'all' | 'current'

  // ── FOLDER COLORS ─────────────────────────────────────────────────────────
  _COLORS: [
    { label: '기본', value: '' },
    { label: '빨강', value: '#ef4444' },
    { label: '주황', value: '#f97316' },
    { label: '노랑', value: '#eab308' },
    { label: '초록', value: '#22c55e' },
    { label: '파랑', value: '#3b82f6' },
    { label: '보라', value: '#a855f7' },
    { label: '분홍', value: '#ec4899' },
    { label: '청록', value: '#06b6d4' },
  ],

  // ── INIT ──────────────────────────────────────────────────────────────────
  init: async function(container, options) {
    options = options || {};
    this._container = container;

    if (options.highlightId) {
      const kw = await DB.get('keywords', options.highlightId);
      if (kw) {
        this._currentFolderId = kw.folderId;
        this._currentKeywordId = kw.id;
      }
    }

    if (this._currentKeywordId) {
      const kw = await DB.get('keywords', this._currentKeywordId);
      if (kw) { this._renderKeywordDetail(container, kw); return; }
    }
    if (this._currentFolderId) {
      const folder = await DB.get('keywordFolders', this._currentFolderId);
      if (folder) { this._renderKeywordList(container, folder); return; }
    }
    this._renderFolderList(container);
  },

  destroy: function() {
    this._currentFolderId = null;
    this._currentKeywordId = null;
    this._container = null;
  },

  // ── FOLDER LIST ───────────────────────────────────────────────────────────
  _renderFolderList: async function(container) {
    this._currentFolderId = null;
    this._currentKeywordId = null;
    const wid = AppStore.getCurrentWorldId();
    const world = AppStore.getState().currentWorld;
    const worlds = AppStore.getState().worlds || [];
    const worldMap = Object.fromEntries(worlds.map(w => [w.id, w]));

    // Load folders based on view mode
    let folders;
    if (this._viewMode === 'all') {
      folders = await DB.getAll('keywordFolders'); // all worlds
    } else {
      // current world + shared
      const [worldFolders, sharedFolders] = await Promise.all([
        wid ? DB.getAll('keywordFolders', wid) : Promise.resolve([]),
        DB.getAll('keywordFolders', '__shared__'),
      ]);
      folders = [...worldFolders, ...sharedFolders];
    }

    // Count keywords per folder
    const allKws = await DB.getAll('keywords');
    const countMap = {};
    allKws.forEach(k => { countMap[k.folderId] = (countMap[k.folderId] || 0) + 1; });
    const totalKws = allKws.length;

    const showWorldBadge = this._viewMode === 'all';

    // Tab HTML
    const tabStyle = (active) =>
      `padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid ${active?'var(--color-primary)':'var(--color-border)'};background:${active?'var(--color-primary)':'transparent'};color:${active?'#000':'var(--color-text-muted)'};`;

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">키워드 메모장</h2>
          <button class="btn btn-primary btn-sm" id="btnAddFolder">+ 폴더 추가</button>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
          <button class="kw-view-tab" data-mode="all" style="${tabStyle(this._viewMode==='all')}">전체</button>
          ${wid ? `<button class="kw-view-tab" data-mode="current" style="${tabStyle(this._viewMode==='current')}">현재 차원: ${Utils.escHtml(world?.name||'')}</button>` : ''}
        </div>
        <p style="margin-top:6px;font-size:12px;color:var(--color-text-muted);">
          폴더 ${folders.length}개 · 키워드 ${totalKws}개
        </p>
        <input class="input-field" id="folderSearch" placeholder="폴더 이름 검색..." style="margin-top:8px;width:100%;box-sizing:border-box;" />
      </div>

      <div id="folderGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:4px 0;">
        ${folders.length === 0
          ? `<div style="grid-column:1/-1;padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">🔖</div>
               <div style="font-weight:700;font-size:16px;margin-bottom:4px;">폴더가 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);">+ 폴더 추가로 키워드를 분류하세요</div>
             </div>`
          : folders.map(f => this._folderCard(f, countMap[f.id] || 0, worldMap, showWorldBadge)).join('')}
      </div>
    </div>`;

    // Tab switching
    container.querySelectorAll('.kw-view-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.mode === 'current' && !wid) {
          Utils.toast('먼저 세계를 선택하세요', 'error'); return;
        }
        this._viewMode = btn.dataset.mode;
        this._renderFolderList(container);
      });
    });

    document.getElementById('btnAddFolder')?.addEventListener('click', () => {
      this._openFolderForm(null, container);
    });

    document.getElementById('folderSearch')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.kw-folder-card').forEach(card => {
        card.style.display = card.dataset.name.toLowerCase().includes(q) ? '' : 'none';
      });
    });

    container.querySelectorAll('.kw-folder-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-edit-folder') || e.target.closest('.btn-del-folder')) return;
        const fid = card.dataset.id;
        DB.get('keywordFolders', fid).then(f => {
          if (f) { this._currentFolderId = f.id; this._renderKeywordList(container, f); }
        });
      });
    });

    container.querySelectorAll('.btn-edit-folder').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const f = await DB.get('keywordFolders', btn.dataset.id);
        if (f) this._openFolderForm(f, container);
      });
    });

    container.querySelectorAll('.btn-del-folder').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const f = folders.find(x => x.id === btn.dataset.id);
        const cnt = countMap[btn.dataset.id] || 0;
        Utils.confirm(
          '폴더 삭제',
          `"${f?.name || '폴더'}"${cnt > 0 ? `와 그 안의 키워드 ${cnt}개` : ''}를 삭제합니다. 되돌릴 수 없습니다.`,
          async () => {
            const kws = await DB.getAll('keywords', f.worldId);
            await Promise.all(kws.filter(k => k.folderId === btn.dataset.id).map(k => DB.del('keywords', k.id)));
            await DB.del('keywordFolders', btn.dataset.id);
            Utils.toast('삭제됨', 'info');
            this._renderFolderList(container);
          }, '삭제'
        );
      });
    });
  },

  _folderCard: function(f, count, worldMap, showWorldBadge) {
    const borderStyle = f.color ? `3px solid ${f.color}` : '3px solid var(--color-primary)';
    let worldBadge = '';
    if (showWorldBadge) {
      if (f.worldId === '__shared__') {
        worldBadge = `<span style="font-size:9px;padding:1px 5px;border-radius:8px;background:rgba(99,102,241,0.2);color:#818cf8;border:1px solid rgba(99,102,241,0.3);">🔗 공유</span>`;
      } else {
        const w = worldMap?.[f.worldId];
        if (w) worldBadge = `<span style="font-size:9px;padding:1px 5px;border-radius:8px;background:var(--color-surface2);color:var(--color-text-muted);border:1px solid var(--color-border);">${Utils.escHtml(w.name)}</span>`;
      }
    }
    return `
    <div class="kw-folder-card"
      data-id="${Utils.escHtml(f.id)}"
      data-name="${Utils.escHtml(f.name || '')}"
      style="cursor:pointer;background:var(--color-surface2);border:1px solid var(--color-border);border-left:${borderStyle};border-radius:10px;padding:14px 12px;position:relative;min-height:90px;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="font-size:22px;">${Utils.escHtml(f.icon || '📁')}</span>
          ${worldBadge}
        </div>
        <div style="font-weight:700;font-size:13px;line-height:1.3;word-break:break-all;">${Utils.escHtml(f.name || '이름 없음')}</div>
        ${f.description ? `<div style="font-size:11px;color:var(--color-text-muted);margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(f.description)}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
        <span style="font-size:11px;color:var(--color-text-dim);">키워드 ${count}개</span>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm btn-edit-folder" data-id="${Utils.escHtml(f.id)}" style="font-size:10px;padding:2px 6px;">편집</button>
          <button class="btn btn-ghost btn-sm btn-del-folder" data-id="${Utils.escHtml(f.id)}" style="font-size:10px;padding:2px 6px;color:var(--color-danger);">삭제</button>
        </div>
      </div>
    </div>`;
  },

  // ── FOLDER FORM ───────────────────────────────────────────────────────────
  _openFolderForm: function(folder, container) {
    const isEdit = !!folder;
    const f = folder || {};
    const wid = AppStore.getCurrentWorldId();
    const worlds = AppStore.getState().worlds || [];
    const currentWorld = AppStore.getState().currentWorld;

    const colorOpts = this._COLORS.map(c => `
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:4px 0;">
        <input type="radio" name="fFolderColor" value="${c.value}" ${(f.color || '') === c.value ? 'checked' : ''} />
        <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c.value || 'var(--color-primary)'};border:1px solid var(--color-border);"></span>
        <span style="font-size:12px;">${c.label}</span>
      </label>`).join('');

    // World selector (only for new folders)
    const worldSelectorHtml = isEdit
      ? (f.worldId === '__shared__'
          ? `<div style="font-size:11px;color:#818cf8;padding:6px 0;">🔗 공유 폴더 (모든 차원에서 보입니다)</div>`
          : `<div style="font-size:11px;color:var(--color-text-muted);padding:6px 0;">차원: ${Utils.escHtml(worlds.find(w=>w.id===f.worldId)?.name || f.worldId || '알 수 없음')}</div>`)
      : `<div class="form-group">
          <label class="form-label">차원 배치</label>
          <select class="select-input" id="fFolderWorldId" style="width:100%;">
            ${wid ? `<option value="${Utils.escHtml(wid)}" selected>${Utils.escHtml(currentWorld?.name || '현재 차원')}</option>` : ''}
            ${worlds.filter(w => w.id !== wid).map(w => `<option value="${Utils.escHtml(w.id)}">${Utils.escHtml(w.name)}</option>`).join('')}
            <option value="__shared__">🔗 공유 (모든 차원에서 보임)</option>
          </select>
        </div>`;

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
        <div class="form-group">
          <label class="form-label">폴더 이름 (필수)</label>
          <input class="input-field" id="fFolderName" value="${Utils.escHtml(f.name || '')}" placeholder="예: 상태이상, 개념, 용어집" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">아이콘 (이모지)</label>
          <input class="input-field" id="fFolderIcon" value="${Utils.escHtml(f.icon || '📁')}" placeholder="📁" maxlength="4" style="width:80px;" />
        </div>
        <div class="form-group">
          <label class="form-label">폴더 색상</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px 16px;">${colorOpts}</div>
        </div>
        ${worldSelectorHtml}
        <div class="form-group">
          <label class="form-label">설명 (선택)</label>
          <input class="input-field" id="fFolderDesc" value="${Utils.escHtml(f.description || '')}" placeholder="이 폴더에 대한 설명" style="width:100%;box-sizing:border-box;" />
        </div>
      </div>`;

    Utils.openModal(isEdit ? '폴더 편집' : '새 폴더', body, async () => {
      const name = document.getElementById('fFolderName')?.value.trim();
      if (!name) { Utils.fieldError('fFolderName'); return false; }
      const color = document.querySelector('input[name="fFolderColor"]:checked')?.value || '';
      const folderWorldId = isEdit
        ? f.worldId
        : (document.getElementById('fFolderWorldId')?.value || wid || '__shared__');
      const record = {
        ...(f || {}),
        worldId: folderWorldId,
        name,
        icon: document.getElementById('fFolderIcon')?.value.trim() || '📁',
        color,
        description: document.getElementById('fFolderDesc')?.value.trim() || '',
        id: f.id || DB.genId(),
        createdAt: f.createdAt || Date.now(),
      };
      await DB.put('keywordFolders', record);
      Utils.toast(isEdit ? '저장됨' : '폴더 추가됨', 'success');
      this._renderFolderList(container);
      return true;
    }, isEdit ? '저장' : '추가');
  },

  // ── KEYWORD LIST ──────────────────────────────────────────────────────────
  _renderKeywordList: async function(container, folder) {
    this._currentFolderId = folder.id;
    this._currentKeywordId = null;
    // Use folder's worldId for keyword fetching
    const keywords = await DB.getAll('keywords', folder.worldId);
    const folderKws = keywords.filter(k => k.folderId === folder.id);
    const color = folder.color || 'var(--color-primary)';

    const sharedBadge = folder.worldId === '__shared__'
      ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(99,102,241,0.2);color:#818cf8;border:1px solid rgba(99,102,241,0.3);margin-left:4px;">🔗 공유</span>`
      : '';

    container.innerHTML = `
    <div class="page active">
      <div class="page-header" style="border-left:4px solid ${folder.color || 'var(--color-primary)'};padding-left:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-ghost btn-sm" id="btnBackFolders">← 폴더</button>
            <span style="font-size:20px;">${Utils.escHtml(folder.icon || '📁')}</span>
            <h2 class="page-title" style="margin:0;font-size:17px;">${Utils.escHtml(folder.name)}${sharedBadge}</h2>
          </div>
          <button class="btn btn-primary btn-sm" id="btnAddKeyword">+ 키워드</button>
        </div>
        ${folder.description ? `<p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">${Utils.escHtml(folder.description)}</p>` : ''}
        <input class="input-field" id="kwSearch" placeholder="키워드, 정의, 태그 검색..." style="margin-top:8px;width:100%;box-sizing:border-box;" />
      </div>

      <div id="kwList">
        ${folderKws.length === 0
          ? `<div style="padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">📝</div>
               <div style="font-weight:700;font-size:15px;margin-bottom:4px;">키워드가 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);">+ 키워드 버튼으로 추가하세요</div>
             </div>`
          : folderKws.map(k => this._kwCard(k, color)).join('')}
      </div>
    </div>`;

    document.getElementById('btnBackFolders')?.addEventListener('click', () => {
      this._currentFolderId = null;
      this._renderFolderList(container);
    });

    document.getElementById('btnAddKeyword')?.addEventListener('click', () => {
      this._openKeywordForm(null, folder, container);
    });

    document.getElementById('kwSearch')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.kw-card').forEach(card => {
        card.style.display = card.dataset.search.toLowerCase().includes(q) ? '' : 'none';
      });
    });

    container.querySelectorAll('.kw-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-edit-kw') || e.target.closest('.btn-del-kw')) return;
        const id = card.dataset.id;
        DB.get('keywords', id).then(kw => {
          if (kw) { this._currentKeywordId = kw.id; this._renderKeywordDetail(container, kw); }
        });
      });
    });

    container.querySelectorAll('.btn-edit-kw').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const kw = await DB.get('keywords', btn.dataset.id);
        if (kw) this._openKeywordForm(kw, folder, container);
      });
    });

    container.querySelectorAll('.btn-del-kw').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const kw = folderKws.find(x => x.id === btn.dataset.id);
        Utils.confirm('키워드 삭제', `"${kw?.name || '키워드'}"를 삭제합니다.`, async () => {
          await DB.del('keywords', btn.dataset.id);
          Utils.toast('삭제됨', 'info');
          this._renderKeywordList(container, folder);
        }, '삭제');
      });
    });
  },

  _kwCard: function(kw, accentColor) {
    const tags = Array.isArray(kw.tags) && kw.tags.length
      ? kw.tags.map(t => `<span style="font-size:10px;padding:1px 6px;border-radius:10px;background:var(--color-border);color:var(--color-text-muted);">${Utils.escHtml(t)}</span>`).join('')
      : '';
    const searchText = [kw.name, kw.definition, kw.notes, ...(kw.tags || [])].filter(Boolean).join(' ');
    return `
    <div class="kw-card list-item"
      data-id="${Utils.escHtml(kw.id)}"
      data-search="${Utils.escHtml(searchText)}"
      style="cursor:pointer;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:10px;padding:12px 14px;margin-bottom:8px;border-left:3px solid ${accentColor};">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${Utils.escHtml(kw.name || '이름 없음')}</div>
          ${kw.definition
            ? `<div style="font-size:12px;color:var(--color-text-dim);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${Utils.escHtml(kw.definition)}</div>`
            : ''}
          ${tags ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;">${tags}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0;">
          <button class="btn btn-ghost btn-sm btn-edit-kw" data-id="${Utils.escHtml(kw.id)}" style="font-size:11px;">편집</button>
          <button class="btn btn-ghost btn-sm btn-del-kw" data-id="${Utils.escHtml(kw.id)}" style="font-size:11px;color:var(--color-danger);">삭제</button>
        </div>
      </div>
    </div>`;
  },

  // ── KEYWORD DETAIL ────────────────────────────────────────────────────────
  _renderKeywordDetail: async function(container, kw) {
    this._currentKeywordId = kw.id;
    const folder = await DB.get('keywordFolders', kw.folderId).catch(() => null);
    const accentColor = folder?.color || 'var(--color-primary)';
    const tags = Array.isArray(kw.tags) && kw.tags.length
      ? kw.tags.map(t => `<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:var(--color-border);color:var(--color-text-muted);">${Utils.escHtml(t)}</span>`).join('')
      : '';

    container.innerHTML = `
    <div class="page active">
      <div class="page-header" style="border-left:4px solid ${accentColor};padding-left:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackKwList">← ${Utils.escHtml(folder?.name || '목록')}</button>
          <h2 class="page-title" style="margin:0;font-size:17px;">${Utils.escHtml(kw.name || '이름 없음')}</h2>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditKw">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnCopyKwText">텍스트 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnDelKwDetail" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      <div style="padding:4px 0;">
        ${folder ? `
          <div style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--color-text-muted);margin-bottom:14px;padding:4px 10px;background:var(--color-surface2);border-radius:20px;border:1px solid var(--color-border);">
            <span>${Utils.escHtml(folder.icon || '📁')}</span>
            <span>${Utils.escHtml(folder.name)}</span>
            ${folder.worldId === '__shared__' ? '<span style="font-size:10px;color:#818cf8;">🔗 공유</span>' : ''}
          </div>` : ''}

        ${kw.definition ? `
          <div style="background:var(--color-surface2);border:1px solid var(--color-border);border-left:3px solid ${accentColor};border-radius:10px;padding:14px;margin-bottom:12px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">정의</div>
            <div style="white-space:pre-wrap;font-size:14px;line-height:1.8;">${Utils.nl2br(Utils.escHtml(kw.definition))}</div>
          </div>` : ''}

        ${kw.notes ? `
          <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);border-left:3px solid var(--color-warning);border-radius:10px;padding:14px;margin-bottom:12px;">
            <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:6px;">메모</div>
            <div style="white-space:pre-wrap;font-size:13px;line-height:1.8;color:var(--color-text-dim);">${Utils.nl2br(Utils.escHtml(kw.notes))}</div>
          </div>` : ''}

        ${tags ? `
          <div style="margin-bottom:12px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:700;margin-bottom:6px;">태그</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${tags}</div>
          </div>` : ''}

        <div style="font-size:11px;color:var(--color-text-dim);text-align:right;margin-top:16px;">
          수정: ${Utils.formatDate(kw.updatedAt)} · 생성: ${Utils.formatDate(kw.createdAt)}
        </div>
      </div>
    </div>`;

    document.getElementById('btnBackKwList')?.addEventListener('click', () => {
      this._currentKeywordId = null;
      if (folder) {
        this._renderKeywordList(container, folder);
      } else {
        this._renderFolderList(container);
      }
    });

    document.getElementById('btnEditKw')?.addEventListener('click', () => {
      if (folder) this._openKeywordForm(kw, folder, container);
    });

    document.getElementById('btnDelKwDetail')?.addEventListener('click', () => {
      Utils.confirm('키워드 삭제', `"${kw.name}"를 삭제합니다.`, async () => {
        await DB.del('keywords', kw.id);
        Utils.toast('삭제됨', 'info');
        this._currentKeywordId = null;
        if (folder) this._renderKeywordList(container, folder);
        else this._renderFolderList(container);
      }, '삭제');
    });

    document.getElementById('btnCopyKwText')?.addEventListener('click', () => {
      Utils.copyText(this._exportText(kw, folder));
      Utils.toast('복사됨', 'success');
    });
  },

  // ── KEYWORD FORM ──────────────────────────────────────────────────────────
  _openKeywordForm: function(kw, folder, container) {
    const isEdit = !!kw;
    const k = kw || {};
    const tagsVal = Array.isArray(k.tags) ? k.tags.join(', ') : '';

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
        <div class="form-group">
          <label class="form-label">키워드 이름 (필수)</label>
          <input class="input-field" id="fKwName" value="${Utils.escHtml(k.name || '')}" placeholder="예: 마나중독, 헌터, 게이트 폭주..." style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">정의 / 내용</label>
          <textarea class="textarea-field" id="fKwDef" rows="5" placeholder="이 키워드의 정의나 설명을 작성하세요..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(k.definition || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">메모 <span style="font-size:11px;color:var(--color-text-dim);">(아이디어, 참고사항 등)</span></label>
          <textarea class="textarea-field" id="fKwNotes" rows="3" placeholder="추가 메모나 참고사항..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(k.notes || '')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">태그 <span style="font-size:11px;color:var(--color-text-dim);">(쉼표로 구분)</span></label>
          <input class="input-field" id="fKwTags" value="${Utils.escHtml(tagsVal)}" placeholder="예: 전투, 마법, 버프" style="width:100%;box-sizing:border-box;" />
        </div>
      </div>`;

    Utils.openModal(isEdit ? '키워드 편집' : '새 키워드', body, async () => {
      const name = document.getElementById('fKwName')?.value.trim();
      if (!name) { Utils.fieldError('fKwName'); return false; }
      const tagsRaw = document.getElementById('fKwTags')?.value || '';
      const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
      const record = {
        ...(k || {}),
        worldId: folder.worldId, // inherit folder's worldId (including '__shared__')
        folderId: folder.id,
        name,
        definition: document.getElementById('fKwDef')?.value.trim() || '',
        notes: document.getElementById('fKwNotes')?.value.trim() || '',
        tags,
        id: k.id || DB.genId(),
        createdAt: k.createdAt || Date.now(),
      };
      await DB.put('keywords', record);
      await AppStore.recordActivity('keywords', !isEdit);
      Utils.toast(isEdit ? '저장됨' : '키워드 추가됨', 'success');
      this._currentKeywordId = record.id;
      const updated = await DB.get('keywords', record.id);
      if (updated) this._renderKeywordDetail(container, updated);
      return true;
    }, isEdit ? '저장' : '추가');
  },

  // ── EXPORT ────────────────────────────────────────────────────────────────
  _exportText: function(kw, folder) {
    const lines = [
      `[${folder?.name || '키워드'}] ${kw.name || ''}`,
      kw.definition ? `\n정의:\n${kw.definition}` : null,
      kw.notes ? `\n메모:\n${kw.notes}` : null,
      Array.isArray(kw.tags) && kw.tags.length ? `\n태그: ${kw.tags.join(', ')}` : null,
    ].filter(x => x !== null).join('\n');
    return lines;
  },
};
