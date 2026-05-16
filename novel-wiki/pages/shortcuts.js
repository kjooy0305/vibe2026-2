'use strict';
window.Pages = window.Pages || {};
window.Pages.shortcuts = {
  init: async function(container) {
    const DEFAULT_BOOKMARKS = ['novel-view', 'characters', 'gates', 'tower', 'timeline'];
    let bookmarks = (await DB.getSetting('homeBookmarks')) || DEFAULT_BOOKMARKS;
    // Ensure exactly 5 slots (fill with empty strings if needed)
    while (bookmarks.length < 5) bookmarks.push('');
    bookmarks = bookmarks.slice(0, 5);

    this._render(container, bookmarks);
  },

  destroy: function() {},

  _render: function(container, bookmarks) {
    const bookmarkSlotsHtml = Array.from({ length: 5 }, (_, i) => {
      const bm = bookmarks[i] ? HOME_ALL_PAGES.find(p => p.page === bookmarks[i]) : null;
      return `<button class="shortcut-bm-slot" data-slot="${i}" data-page="${bm ? bm.page : ''}"
        onclick="${bm ? `AppRouter.navigate('${bm.page}')` : `document.getElementById('btnEditShortcuts').click()`}"
        style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
          background:${bm ? 'var(--color-surface2)' : 'rgba(99,102,241,0.06)'};
          border:${bm ? '1px solid var(--color-border)' : '1px dashed rgba(99,102,241,0.3)'};
          border-radius:10px;padding:10px 4px;cursor:pointer;min-height:60px;width:100%;">
        <div style="font-size:20px;">${bm ? bm.icon : '＋'}</div>
        <div style="font-size:10px;font-weight:600;color:${bm ? 'var(--color-text)' : 'var(--color-text-muted)'};text-align:center;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;">${bm ? bm.name : '빈 슬롯'}</div>
      </button>`;
    }).join('');

    const allPagesGridHtml = HOME_ALL_PAGES.map(({ page, icon, name }) => `
      <button onclick="AppRouter.navigate('${page}')"
        style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:10px;padding:10px 4px;cursor:pointer;min-height:60px;width:100%;">
        <div style="font-size:18px;">${icon}</div>
        <div style="font-size:10px;font-weight:600;color:var(--color-text);text-align:center;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;">${name}</div>
      </button>
    `).join('');

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">바로가기</h2>
          <button id="btnEditShortcuts" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--color-primary);padding:4px 8px;border-radius:6px;border:1px solid rgba(99,102,241,0.3);">편집</button>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">즐겨찾는 페이지와 전체 페이지를 모아봅니다</p>
      </div>

      <!-- 즐겨찾기 슬롯 -->
      <div style="margin-bottom:20px;">
        <div style="font-weight:700;font-size:13px;color:var(--color-text-muted);margin-bottom:8px;">즐겨찾기</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;" id="shortcutBookmarkSlots">
          ${bookmarkSlotsHtml}
        </div>
      </div>

      <!-- 전체 페이지 바로가기 -->
      <div>
        <div style="font-weight:700;font-size:13px;color:var(--color-text-muted);margin-bottom:8px;">전체 페이지 바로가기</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px;">
          ${allPagesGridHtml}
        </div>
      </div>
    </div>`;

    // 편집 버튼 이벤트
    document.getElementById('btnEditShortcuts')?.addEventListener('click', () => {
      this._openBookmarkEditor(container, bookmarks);
    });
  },

  _openBookmarkEditor: function(container, currentBookmarks) {
    let sel = [...currentBookmarks].filter(Boolean);

    const renderModalChips = () => {
      const wrap = document.getElementById('scBmSelected');
      if (!wrap) return;
      wrap.innerHTML = sel.map(pg => {
        const p = HOME_ALL_PAGES.find(x => x.page === pg);
        if (!p) return '';
        return `<span class="sc-bm-chip" data-pg="${p.page}"
          style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;font-size:12px;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);">
          ${p.icon} ${p.name}
          <button class="sc-chip-del" data-pg="${p.page}" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--color-danger);padding:0 2px;">✕</button>
        </span>`;
      }).join('');

      wrap.querySelectorAll('.sc-chip-del').forEach(btn => {
        btn.addEventListener('click', () => {
          sel = sel.filter(p => p !== btn.dataset.pg);
          renderModalChips();
          document.querySelectorAll('#globalModalBody .sc-pick-btn').forEach(b => {
            b.style.background = sel.includes(b.dataset.pg) ? 'rgba(99,102,241,0.2)' : 'var(--color-surface2)';
          });
        });
      });
    };

    const bmBody = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:4px;">5개 슬롯에 넣을 페이지를 선택하세요 (순서대로)</div>
        <div id="scBmSelected" style="display:flex;flex-wrap:wrap;gap:6px;min-height:32px;padding:8px;background:var(--color-surface3,#1e2030);border-radius:8px;margin-bottom:4px;">
          ${sel.map(pg => {
            const p = HOME_ALL_PAGES.find(x => x.page === pg);
            return p
              ? `<span class="sc-bm-chip" data-pg="${p.page}"
                  style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;font-size:12px;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);">
                  ${p.icon} ${p.name}
                  <button class="sc-chip-del" data-pg="${p.page}" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--color-danger);padding:0 2px;">✕</button>
                </span>`
              : '';
          }).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;">
          ${HOME_ALL_PAGES.map(p => `
            <button class="sc-pick-btn" data-pg="${p.page}"
              style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border-radius:8px;border:1px solid var(--color-border);background:${sel.includes(p.page) ? 'rgba(99,102,241,0.2)' : 'var(--color-surface2)'};cursor:pointer;width:100%;">
              <div style="font-size:18px;">${p.icon}</div>
              <div style="font-size:10px;font-weight:600;text-align:center;line-height:1.2;">${p.name}</div>
            </button>
          `).join('')}
        </div>
      </div>`;

    Utils.openModal('즐겨찾기 편집', bmBody, async () => {
      const chips = [...document.querySelectorAll('#globalModalBody .sc-bm-chip')];
      const newBm = chips.map(c => c.dataset.pg).filter(Boolean);
      while (newBm.length < 5) newBm.push('');
      const saved = newBm.slice(0, 5);
      await DB.setSetting('homeBookmarks', saved);
      // Re-render the page with updated bookmarks
      this._render(container, saved);
      return true;
    }, '저장');

    setTimeout(() => {
      renderModalChips();

      document.querySelectorAll('#globalModalBody .sc-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const pg = btn.dataset.pg;
          if (sel.includes(pg)) {
            sel = sel.filter(p => p !== pg);
            btn.style.background = 'var(--color-surface2)';
          } else if (sel.length < 5) {
            sel.push(pg);
            btn.style.background = 'rgba(99,102,241,0.2)';
          } else {
            Utils.toast('최대 5개까지 선택 가능합니다', 'error');
          }
          renderModalChips();
        });
      });
    }, 50);
  },
};
