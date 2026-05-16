'use strict';
const AppRouter = (function() {
  let currentPage = null;
  let currentPageId = null;
  const pageMap = {};
  let _history = [];
  let _navigatingBack = false;

  const PAGE_TITLES = {
    home: '홈', world: '세계/차원', characters: '캐릭터',
    organizations: '조직/단체', skills: '스킬', achievements: '업적',
    constellations: '성좌', gates: '게이트', monsters: '몬스터',
    tower: '탑 관리', timeline: '타임라인', 'event-graph': '사건 그래프',
    'family-tree': '가계도', 'world-rules': '세계관 규칙', items: '아이템',
    jobs: '직업', templates: '기본 설정 관리', 'status-viewer': '상태창 뷰어',
    'novel-view': '소설 쓰기', settings: '설정',
    countries: '국가', companies: '기업', reminders: '리마인더',
    keywords: '키워드 메모장',
    'stat-defs': '스텟 정의',
    traps: '함정 종류',
    places: '장소',
    gods: '신',
    races: '종족',
    shortcuts: '바로가기',
  };

  function register(pageId, module) {
    pageMap[pageId] = module;
  }

  function navigate(pageId, options = {}) {
    if (!pageMap[pageId]) {
      console.warn('[Router] Page not found:', pageId);
      return;
    }

    if (!_navigatingBack && currentPageId && currentPageId !== pageId) {
      _history.push({ pageId: currentPageId, options: {} });
      if (_history.length > 50) _history.shift();
    }
    _navigatingBack = false;

    if (currentPage && currentPage.destroy) currentPage.destroy();

    const app = document.getElementById('app');
    app.innerHTML = '';

    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = PAGE_TITLES[pageId] || pageId;

    document.querySelectorAll('.drawer__item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    document.querySelectorAll('.bottom-nav__item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });

    currentPageId = pageId;
    currentPage = pageMap[pageId];
    currentPage.init(app, options);

    const backBtn = document.getElementById('btnHeaderBack');
    if (backBtn) backBtn.style.display = _history.length > 0 ? 'flex' : 'none';

    document.getElementById('appDrawer')?.classList.remove('open');
    document.getElementById('drawerOverlay')?.classList.remove('open');
    document.getElementById('btnOpenDrawer')?.setAttribute('aria-expanded', 'false');
  }

  function handleBack() {
    if (_history.length > 0) {
      const prev = _history.pop();
      _navigatingBack = true;
      navigate(prev.pageId, prev.options);
    } else if (currentPageId !== 'home') {
      navigate('home');
    }
  }

  function getCurrentPage() { return currentPageId; }

  return { register, navigate, handleBack, getCurrentPage };
})();
window.AppRouter = AppRouter;
