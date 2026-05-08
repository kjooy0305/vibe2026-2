'use strict';
const AppRouter = (function() {
  let currentPage = null;
  let currentPageId = null;
  const pageMap = {};

  const PAGE_TITLES = {
    home: '대시보드',
    world: '세계/차원',
    characters: '캐릭터',
    organizations: '조직/단체',
    skills: '스킬',
    achievements: '업적',
    constellations: '성좌',
    gates: '게이트',
    monsters: '몬스터',
    tower: '탑 관리',
    timeline: '타임라인',
    'event-graph': '사건 그래프',
    'family-tree': '가계도',
    'world-rules': '세계관 규칙',
    items: '아이템',
    jobs: '직업',
    templates: '템플릿 설정',
    'status-viewer': '상태창 뷰어',
    'novel-view': '소설 보기',
    settings: '설정',
  };

  function register(pageId, module) {
    pageMap[pageId] = module;
  }

  function navigate(pageId, options = {}) {
    if (!pageMap[pageId]) {
      console.warn('[Router] Page not found:', pageId);
      return;
    }

    if (currentPage && currentPage.destroy) currentPage.destroy();

    const app = document.getElementById('app');
    app.innerHTML = '';

    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
      const title = PAGE_TITLES[pageId] || pageId;
      titleEl.innerHTML = `소설 <span>${title}</span>`;
    }

    // Update drawer active state
    document.querySelectorAll('.drawer__item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    document.querySelectorAll('.bottom-nav__item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });

    currentPageId = pageId;
    currentPage = pageMap[pageId];
    currentPage.init(app, options);

    // Close drawer if open
    document.getElementById('appDrawer')?.classList.remove('open');
    document.getElementById('drawerOverlay')?.classList.remove('open');
    document.getElementById('btnOpenDrawer')?.setAttribute('aria-expanded', 'false');
  }

  function handleBack() {
    // Simple back: go to home if not already there
    if (currentPageId !== 'home') navigate('home');
  }

  function getCurrentPage() { return currentPageId; }

  return { register, navigate, handleBack, getCurrentPage };
})();
window.AppRouter = AppRouter;
