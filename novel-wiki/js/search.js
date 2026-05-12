'use strict';
const SearchEngine = (function() {

  const SEARCH_STORES = [
    { name: 'characters', label: '캐릭터', page: 'characters', icon: '👤' },
    { name: 'skills', label: '스킬', page: 'skills', icon: '⚡' },
    { name: 'achievements', label: '업적', page: 'achievements', icon: '🏅' },
    { name: 'items', label: '아이템', page: 'items', icon: '📦' },
    { name: 'monsters', label: '몬스터', page: 'monsters', icon: '👾' },
    { name: 'constellations', label: '성좌', page: 'constellations', icon: '⭐' },
    { name: 'gates', label: '게이트', page: 'gates', icon: '🌀' },
    { name: 'organizations', label: '조직', page: 'organizations', icon: '🏛️' },
    { name: 'events', label: '사건', page: 'event-graph', icon: '📌' },
    { name: 'jobs', label: '직업', page: 'jobs', icon: '🏷️' },
    { name: 'countries', label: '국가', page: 'countries', icon: '🌍' },
    { name: 'companies', label: '기업', page: 'companies', icon: '🏢' },
  ];

  function getSearchableText(item, storeName) {
    const parts = [item.name || '', item.description || '', item.notes || ''];
    if (item.grade) parts.push(item.grade);
    if (item.effects) parts.push(item.effects);
    if (item.features) parts.push(item.features);
    if (item.title) parts.push(item.title);
    // Countries
    if (item.capital) parts.push(item.capital);
    if (item.laws) parts.push(item.laws);
    if (item.culture) parts.push(item.culture);
    if (item.leader) parts.push(item.leader);
    // Companies
    if (item.products) parts.push(item.products);
    if (item.desc) parts.push(item.desc);
    if (item.special) parts.push(item.special);
    if (item.ceo) parts.push(item.ceo);
    if (item.hq) parts.push(item.hq);
    return parts.join(' ').toLowerCase();
  }

  async function search(query, worldId, scopeAll = false) {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase();
    const results = [];

    for (const store of SEARCH_STORES) {
      try {
        const items = scopeAll ? await DB.getAll(store.name) : await DB.getAll(store.name, worldId);
        items.forEach(item => {
          const text = getSearchableText(item, store.name);
          if (text.includes(q)) {
            results.push({
              type: store.name,
              label: store.label,
              page: store.page,
              icon: store.icon,
              item,
              id: item.id,
              name: item.name || '(이름 없음)',
              grade: item.grade || '',
            });
          }
        });
      } catch(e) { /* ignore */ }
    }

    return results;
  }

  function renderResults(results) {
    if (!results.length) {
      return '<div class="search-empty"><div style="font-size:32px;opacity:0.3;">🔍</div><div>결과 없음</div></div>';
    }

    const grouped = {};
    results.forEach(r => {
      if (!grouped[r.label]) grouped[r.label] = [];
      grouped[r.label].push(r);
    });

    let html = '';
    Object.entries(grouped).forEach(([label, items]) => {
      html += `<div class="search-group-label">${label} (${items.length})</div>`;
      items.slice(0, 20).forEach(r => {
        html += `<button class="search-result-item" data-page="${Utils.escHtml(r.page)}" data-id="${Utils.escHtml(r.id)}">
          <span class="search-result-icon">${r.icon}</span>
          <div class="search-result-info">
            <div class="search-result-name">${Utils.escHtml(r.name)}</div>
            <div class="search-result-meta">${label}${r.grade ? ' · ' + r.grade : ''}</div>
          </div>
        </button>`;
      });
    });
    return html;
  }

  function init() {
    const overlay = document.getElementById('searchOverlay');
    const input = document.getElementById('searchInput');
    const resultsEl = document.getElementById('searchResults');
    const clearBtn = document.getElementById('btnClearSearch');
    const openBtn = document.getElementById('btnOpenSearch');
    const closeBtn = document.getElementById('btnCloseSearch');

    openBtn?.addEventListener('click', () => {
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      setTimeout(() => input?.focus(), 100);
    });

    closeBtn?.addEventListener('click', () => {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      input.value = '';
      resultsEl.innerHTML = '<div class="search-empty"><div style="font-size:32px;margin-bottom:12px;opacity:0.3;">🔍</div><div>검색어를 입력하세요</div></div>';
    });

    let debounceTimer;
    input?.addEventListener('input', () => {
      const q = input.value.trim();
      clearBtn.style.display = q ? 'flex' : 'none';
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (!q) {
          resultsEl.innerHTML = '<div class="search-empty"><div style="font-size:32px;opacity:0.3;">🔍</div><div>검색어를 입력하세요</div></div>';
          return;
        }
        const worldId = AppStore.getCurrentWorldId();
        const scopeAll = AppStore.getState().searchScope === 'all';
        const results = await search(q, worldId, scopeAll);
        resultsEl.innerHTML = renderResults(results);

        resultsEl.querySelectorAll('.search-result-item').forEach(btn => {
          btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            const id = btn.dataset.id;
            closeBtn.click();
            if (window.AppRouter) AppRouter.navigate(page, { highlightId: id });
          });
        });
      }, 250);
    });

    clearBtn?.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      input.focus();
      resultsEl.innerHTML = '<div class="search-empty"><div style="font-size:32px;opacity:0.3;">🔍</div><div>검색어를 입력하세요</div></div>';
    });
  }

  return { init, search };
})();
window.SearchEngine = SearchEngine;
