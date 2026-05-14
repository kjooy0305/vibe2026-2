'use strict';
window.Pages = window.Pages || {};
window.Pages.keywords = {
  _currentFolderId: null,
  _currentKeywordId: null,
  _container: null,

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

    if (options.highlightId) {
      // highlightId could be keyword id — find its folder
      const kw = await DB.get('keywords', options.highlightId);
      if (kw) {
        this._currentFolderId = kw.folderId;
        this._currentKeywordId = kw.id;
      }
    }

    if (this._currentKeywordId) {
      const kw = await DB.get('keywords', this._currentKeywordId);
      if (kw) { this._renderKeywordDetail(container, kw, wid); return; }
    }
    if (this._currentFolderId) {
      const folder = await DB.get('keywordFolders', this._currentFolderId);
      if (folder) { this._renderKeywordList(container, folder, wid); return; }
    }
    this._renderFolderList(container, wid);
  },

  destroy: function() {
    this._currentFolderId = null;
    this._currentKeywordId = null;
    this._container = null;
  },

  // ── FOLDER LIST ───────────────────────────────────────────────────────────
  _renderFolderList: async function(container, wid) {
    this._currentFolderId = null;
    this._currentKeywordId = null;
    const world = AppStore.getState().currentWorld;
    const folders = await DB.getAll('keywordFolders', wid);
    const allKeywords = await DB.getAll('keywords', wid);

    const countMap = {};
    allKeywords.forEach(k => { countMap[k.folderId] = (countMap[k.folderId] || 0) + 1; });

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">키워드 메모장</h2>
          <button class="btn btn-primary btn-sm" id="btnAddFolder">+ 폴더 추가</button>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · 폴더 ${folders.length}개 · 키워드 ${allKeywords.length}개
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
          : folders.map(f => this._folderCard(f, countMap[f.id] || 0)).join('')}
      </div>
    </div>`;

    document.getElementById('btnAddFolder')?.addEventListener('click', () => {
      this._openFolderForm(null, wid, container);
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
          if (f) { this._currentFolderId = f.id; this._renderKeywordList(container, f, wid); }
        });
      });
    });

    container.querySelectorAll('.btn-edit-folder').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const f = await DB.get('keywordFolders', btn.dataset.id);
        if (f) this._openFolderForm(f, wid, container);
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
            const kws = await DB.getAll('keywords', wid);
            await Promise.all(kws.filter(k => k.folderId === btn.dataset.id).map(k => DB.del('keywords', k.id)));
            await DB.del('keywordFolders', btn.dataset.id);
            Utils.toast('삭제됨', 'info');
            this._renderFolderList(container, wid);
          }, '삭제'
        );
      });
    });
  },

  _folderCard: function(f, count) {
    const color = f.color || 'var(--color-primary)';
    const borderStyle = f.color ? `3px solid ${f.color}` : '3px solid var(--color-primary)';
    return `
    <div class="kw-folder-card"
      data-id="${Utils.escHtml(f.id)}"
      data-name="${Utils.escHtml(f.name || '')}"
      style="cursor:pointer;background:var(--color-surface2);border:1px solid var(--color-border);border-left:${borderStyle};border-radius:10px;padding:14px 12px;position:relative;min-height:90px;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <div style="font-size:24px;margin-bottom:6px;">${Utils.escHtml(f.icon || '📁')}</div>
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
  _openFolderForm: function(folder, wid, container) {
    const isEdit = !!folder;
    const f = folder || {};
    const colorOpts = this._COLORS.map(c => `
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:4px 0;">
        <input type="radio" name="fFolderColor" value="${c.value}" ${(f.color || '') === c.value ? 'checked' : ''} />
        <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c.value || 'var(--color-primary)'};border:1px solid var(--color-border);"></span>
        <span style="font-size:12px;">${c.label}</span>
      </label>`).join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;max-height:72vh;overflow-y:auto;padding-right:4px;">
        <div class="form-group">
          <label class="form-label">폴더 이름 *</label>
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
        <div class="form-group">
          <label class="form-label">설명 (선택)</label>
          <input class="input-field" id="fFolderDesc" value="${Utils.escHtml(f.description || '')}" placeholder="이 폴더에 대한 설명" style="width:100%;box-sizing:border-box;" />
        </div>
      </div>`;

    Utils.openModal(isEdit ? '폴더 편집' : '새 폴더', body, async () => {
      const name = document.getElementById('fFolderName')?.value.trim();
      if (!name) { Utils.toast('폴더 이름을 입력하세요', 'error'); return false; }
      const color = document.querySelector('input[name="fFolderColor"]:checked')?.value || '';
      const record = {
        ...(f || {}),
        worldId: wid,
        name,
        icon: document.getElementById('fFolderIcon')?.value.trim() || '📁',
        color,
        description: document.getElementById('fFolderDesc')?.value.trim() || '',
        id: f.id || DB.genId(),
        createdAt: f.createdAt || Date.now(),
      };
      await DB.put('keywordFolders', record);
      Utils.toast(isEdit ? '저장됨' : '폴더 추가됨', 'success');
      this._renderFolderList(container, wid);
      return true;
    }, isEdit ? '저장' : '추가');
  },

  // ── KEYWORD LIST ──────────────────────────────────────────────────────────
  _renderKeywordList: async function(container, folder, wid) {
    this._currentFolderId = folder.id;
    this._currentKeywordId = null;
    const keywords = await DB.getAll('keywords', wid);
    const folderKws = keywords.filter(k => k.folderId === folder.id);
    const color = folder.color || 'var(--color-primary)';

    container.innerHTML = `
    <div class="page active">
      <div class="page-header" style="border-left:4px solid ${folder.color || 'var(--color-primary)'};padding-left:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <button class="btn btn-ghost btn-sm" id="btnBackFolders">← 폴더</button>
            <span style="font-size:20px;">${Utils.escHtml(folder.icon || '📁')}</span>
            <h2 class="page-title" style="margin:0;font-size:17px;">${Utils.escHtml(folder.name)}</h2>
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
      this._renderFolderList(container, wid);
    });

    document.getElementById('btnAddKeyword')?.addEventListener('click', () => {
      this._openKeywordForm(null, folder, wid, container);
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
          if (kw) { this._currentKeywordId = kw.id; this._renderKeywordDetail(container, kw, wid); }
        });
      });
    });

    container.querySelectorAll('.btn-edit-kw').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const kw = await DB.get('keywords', btn.dataset.id);
        if (kw) this._openKeywordForm(kw, folder, wid, container);
      });
    });

    container.querySelectorAll('.btn-del-kw').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const kw = folderKws.find(x => x.id === btn.dataset.id);
        Utils.confirm('키워드 삭제', `"${kw?.name || '키워드'}"를 삭제합니다.`, async () => {
          await DB.del('keywords', btn.dataset.id);
          Utils.toast('삭제됨', 'info');
          this._renderKeywordList(container, folder, wid);
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
  _renderKeywordDetail: async function(container, kw, wid) {
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
        this._renderKeywordList(container, folder, wid);
      } else {
        this._renderFolderList(container, wid);
      }
    });

    document.getElementById('btnEditKw')?.addEventListener('click', () => {
      if (folder) this._openKeywordForm(kw, folder, wid, container);
    });

    document.getElementById('btnDelKwDetail')?.addEventListener('click', () => {
      Utils.confirm('키워드 삭제', `"${kw.name}"를 삭제합니다.`, async () => {
        await DB.del('keywords', kw.id);
        Utils.toast('삭제됨', 'info');
        this._currentKeywordId = null;
        if (folder) this._renderKeywordList(container, folder, wid);
        else this._renderFolderList(container, wid);
      }, '삭제');
    });

    document.getElementById('btnCopyKwText')?.addEventListener('click', () => {
      Utils.copyText(this._exportText(kw, folder));
      Utils.toast('복사됨', 'success');
    });
  },

  // ── KEYWORD FORM ──────────────────────────────────────────────────────────
  _openKeywordForm: function(kw, folder, wid, container) {
    const isEdit = !!kw;
    const k = kw || {};
    const tagsVal = Array.isArray(k.tags) ? k.tags.join(', ') : '';

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;max-height:72vh;overflow-y:auto;padding-right:4px;">
        <div class="form-group">
          <label class="form-label">키워드 이름 *</label>
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
      if (!name) { Utils.toast('키워드 이름을 입력하세요', 'error'); return false; }
      const tagsRaw = document.getElementById('fKwTags')?.value || '';
      const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
      const record = {
        ...(k || {}),
        worldId: wid,
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
      if (updated) this._renderKeywordDetail(container, updated, wid);
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
