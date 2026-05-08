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
      btn.addEventListener('click', () => AppRouter.navigate(btn.dataset.page));
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

  async function boot() {
    try {
      await DB.open();
      await AppStore.init();

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
      ];

      pageModules.forEach(([id, mod]) => {
        if (mod) AppRouter.register(id, mod);
        else AppRouter.register(id, { init: (el) => { el.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🚧</div><div class="empty-state__title">${id} 페이지 준비 중</div></div>`; }, destroy: () => {} });
      });

      setupDrawer();
      SearchEngine.init();

      // Remove loader
      document.getElementById('initialLoader')?.remove();

      // Navigate to home
      AppRouter.navigate('home');

      // Show streak notification
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
      console.error('[App] Boot error:', e);
      document.getElementById('initialLoader').innerHTML = `<div style="color:#ef4444;padding:24px;text-align:center;">앱 초기화 오류<br><small>${e.message}</small></div>`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
