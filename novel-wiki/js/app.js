'use strict';
(function() {

  function setupDrawer() {
    const drawer = document.getElementById('appDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const openBtn = document.getElementById('btnOpenDrawer');
    const closeBtn = document.getElementById('btnCloseDrawer');

    function openDrawer() {
      drawer.classList.add('open');
      overlay.classList.add('open');
      openBtn.setAttribute('aria-expanded', 'true');
    }
    function closeDrawer() {
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      openBtn.setAttribute('aria-expanded', 'false');
    }

    openBtn?.addEventListener('click', openDrawer);
    closeBtn?.addEventListener('click', closeDrawer);
    overlay?.addEventListener('click', closeDrawer);

    document.querySelectorAll('.drawer__item[data-page]').forEach(btn => {
      btn.addEventListener('click', () => { closeDrawer(); AppRouter.navigate(btn.dataset.page); });
    });
    document.querySelectorAll('.bottom-nav__item[data-page]').forEach(btn => {
      btn.addEventListener('click', () => AppRouter.navigate(btn.dataset.page));
    });
    document.querySelectorAll('[data-page]').forEach(btn => {
      if (!btn.classList.contains('drawer__item') && !btn.classList.contains('bottom-nav__item')) {
        btn.addEventListener('click', () => AppRouter.navigate(btn.dataset.page));
      }
    });
  }

  function setupHeaderMore() {
    const btn = document.getElementById('btnHeaderMore');
    if (!btn) return;

    const menu = document.createElement('div');
    menu.id = 'headerMoreMenu';
    menu.style.cssText = `
      position:fixed;top:56px;right:8px;
      background:var(--color-surface);border:1px solid var(--color-border);
      border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.5);
      min-width:180px;z-index:500;display:none;
      overflow:hidden;`;
    const items = [
      { icon: '🌍', label: '세계/차원 관리', page: 'world' },
      { icon: '⚙️', label: '설정', page: 'settings' },
      { icon: '📝', label: '기본 설정 관리', page: 'templates' },
      { icon: '📖', label: '상태창 뷰어', page: 'status-viewer' },
    ];
    menu.innerHTML = `
      <div style="padding:10px 14px;border-bottom:1px solid var(--color-border);font-size:12px;color:var(--color-text-muted);font-weight:700;">빠른 이동</div>
      ${items.map(item => `
        <button data-page="${item.page}"
          style="width:100%;display:flex;align-items:center;gap:10px;padding:12px 14px;background:none;border:none;color:var(--color-text);font-size:13px;cursor:pointer;text-align:left;border-bottom:1px solid rgba(45,55,72,0.3);">
          <span>${item.icon}</span><span>${item.label}</span>
        </button>`).join('')}
      <div style="padding:10px 14px;border-top:1px solid var(--color-border);">
        <div style="font-size:11px;color:var(--color-text-dim);">소설 창작 위키 v1.0</div>
        <div style="font-size:10px;color:var(--color-text-dim);margin-top:2px;">오프라인 저장 · IndexedDB</div>
      </div>`;
    document.body.appendChild(menu);

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = menu.style.display === 'block';
      menu.style.display = isOpen ? 'none' : 'block';
    });

    menu.querySelectorAll('button[data-page]').forEach(b => {
      b.addEventListener('click', () => {
        menu.style.display = 'none';
        AppRouter.navigate(b.dataset.page);
      });
    });

    document.addEventListener('click', () => { menu.style.display = 'none'; });
  }

  async function boot() {
    // Mobile: show reload button if loading hangs > 12s
    const loaderTimeout = setTimeout(() => {
      const loader = document.getElementById('initialLoader');
      if (loader) {
        loader.innerHTML = `
          <div style="text-align:center;padding:32px 24px;">
            <div style="font-size:40px;margin-bottom:12px;">⏱️</div>
            <div style="font-size:15px;font-weight:700;margin-bottom:8px;">로딩이 지연되고 있습니다</div>
            <div style="font-size:12px;color:#aaa;margin-bottom:20px;">캐시 문제일 수 있습니다</div>
            <button onclick="location.reload(true)"
              style="padding:10px 24px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">
              🔄 새로고침
            </button>
          </div>`;
      }
    }, 12000);

    try {
      await DB.open();
      await AppStore.init();

      clearTimeout(loaderTimeout);

      // Register all pages
      const pageModules = [
        ['home', window.Pages?.home],
        ['world', window.Pages?.world],
        ['characters', window.Pages?.characters],
        ['organizations', window.Pages?.organizations],
        ['skills', window.Pages?.skills],
        ['achievements', window.Pages?.achievements],
        ['constellations', window.Pages?.constellations],
        ['gates', window.Pages?.gates],
        ['monsters', window.Pages?.monsters],
        ['tower', window.Pages?.tower],
        ['timeline', window.Pages?.timeline],
        ['event-graph', window.Pages?.eventGraph],
        ['family-tree', window.Pages?.familyTree],
        ['world-rules', window.Pages?.worldRules],
        ['items', window.Pages?.items],
        ['jobs', window.Pages?.jobs],
        ['templates', window.Pages?.templates],
        ['status-viewer', window.Pages?.statusViewer],
        ['novel-view', window.Pages?.novelView],
        ['settings', window.Pages?.settings],
        ['countries', window.Pages?.countries],
        ['companies', window.Pages?.companies],
        ['reminders', window.Pages?.reminders],
        ['keywords', window.Pages?.keywords],
        ['stat-defs', window.Pages?.statDefs],
        ['traps', window.Pages?.traps],
        ['places', window.Pages?.places],
        ['gods', window.Pages?.gods],
        ['races', window.Pages?.races],
        ['quests', window.Pages?.quests],
        ['shortcuts', window.Pages?.shortcuts],
      ];

      pageModules.forEach(([id, mod]) => {
        if (mod) AppRouter.register(id, mod);
        else AppRouter.register(id, { init: (el) => { el.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🚧</div><div class="empty-state__title">${id} 페이지 준비 중</div></div>`; }, destroy: () => {} });
      });

      setupDrawer();
      setupHeaderMore();
      SearchEngine.init();

      if (window.ReminderEngine) ReminderEngine.init();

      document.getElementById('initialLoader')?.remove();
      AppRouter.navigate('home');

      const { streak } = AppStore.getState();
      if (streak && streak.count > 0) {
        const today = new Date().toDateString();
        const shownKey = 'streakShown_' + today;
        if (!sessionStorage.getItem(shownKey)) {
          sessionStorage.setItem(shownKey, '1');
          setTimeout(() => {
            Utils.toast(`🔥 ${streak.count}일 연속 작성 중!`, 'success', 3000);
          }, 1000);
        }
      }

    } catch(e) {
      clearTimeout(loaderTimeout);
      console.error('[App] Boot error:', e);
      const loader = document.getElementById('initialLoader');
      if (loader) loader.innerHTML = `
        <div style="text-align:center;padding:32px 24px;">
          <div style="font-size:40px;margin-bottom:12px;">❌</div>
          <div style="font-size:14px;font-weight:700;color:#ef4444;margin-bottom:8px;">앱 초기화 오류</div>
          <div style="font-size:12px;color:#aaa;margin-bottom:20px;">${e.message}</div>
          <button onclick="location.reload(true)"
            style="padding:10px 24px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;">
            🔄 새로고침
          </button>
        </div>`;
    }
  }

  // Global auto-resize for all textareas
  document.addEventListener('input', e => {
    if (e.target.tagName === 'TEXTAREA') {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 500) + 'px';
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
