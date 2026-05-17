'use strict';
window.Pages = window.Pages || {};
window.Pages.tutorial = {
  _container: null,
  _tab: 'missions',

  MISSIONS: [
    {
      group: '🌍 첫 시작',
      color: '#60a5fa',
      items: [
        { id: 'world_create', title: '세계/차원 만들기', desc: '소설의 배경이 될 세계를 처음 만들어보세요. 여러 세계를 독립적으로 관리할 수 있습니다.', hint: '홈 또는 세계/차원 메뉴 → + 새 세계', page: 'world', check: async () => { const w = await DB.getAll('worlds'); return w.length > 0; } },
        { id: 'world_select', title: '세계 활성화하기', desc: '홈 화면에서 만든 세계를 선택해 현재 세계로 설정하세요. 모든 데이터는 선택된 세계에 귀속됩니다.', hint: '홈 → 세계 카드를 탭해서 선택', page: 'home', check: async () => !!AppStore.getCurrentWorldId() },
      ],
    },
    {
      group: '🗺️ 세계관 구성',
      color: '#34d399',
      items: [
        { id: 'worldrule', title: '세계관 규칙 작성', desc: '이 세계의 마법 체계, 각성 방식, 게이트 시스템 등 기본 규칙을 기록하세요.', hint: '세계 설정 → 세계관 규칙 → + 추가', page: 'world-rules', check: async (wid) => { if (!wid) return false; return (await DB.getAll('worldRules', wid)).length > 0; } },
        { id: 'tower_create', title: '탑 만들기', desc: '탑 등반물의 핵심인 탑을 만드세요. 층수를 사전 생성하고 각 층에 보스와 이벤트를 추가할 수 있습니다.', hint: '세계 설정 → 탑 관리 → + 새 탑', page: 'tower', check: async (wid) => { if (!wid) return false; return (await DB.getAll('towers', wid)).length > 0; } },
        { id: 'gate_create', title: '게이트 만들기', desc: '던전 역할을 하는 게이트를 만드세요. 웨이브·보스·컨셉 등을 상세히 설정할 수 있습니다.', hint: '세계 구성 → 게이트 → + 추가', page: 'gates', check: async (wid) => { if (!wid) return false; return (await DB.getAll('gates', wid)).length > 0; } },
        { id: 'country_create', title: '국가 만들기', desc: '세계 내 국가를 등록하세요. 캐릭터와 조직의 소속 국가로 연결됩니다.', hint: '세계 구성 → 국가 → + 추가', page: 'countries', check: async (wid) => { if (!wid) return false; return (await DB.getAll('countries', wid)).length > 0; } },
        { id: 'company_create', title: '기업/길드 만들기', desc: '헌터 길드, 기업, 협회 등을 등록하세요. 조직/단체와 연동됩니다.', hint: '세계 구성 → 기업 → + 추가', page: 'companies', check: async (wid) => { if (!wid) return false; return (await DB.getAll('companies', wid)).length > 0; } },
        { id: 'place_create', title: '장소 만들기', desc: '도시, 던전 입구, 유적 등 특정 장소를 등록하세요. 게이트 탐험 조건에서 연결할 수 있습니다.', hint: '세계 구성 → 장소 → + 추가', page: 'places', check: async (wid) => { if (!wid) return false; return (await DB.getAll('places', wid)).length > 0; } },
      ],
    },
    {
      group: '🦎 생명체',
      color: '#f87171',
      items: [
        { id: 'race_create', title: '종족 만들기', desc: '인간, 각성자, 마인 등 세계에 존재하는 종족을 등록하세요.', hint: '생명체 → 종족 → + 추가', page: 'races', check: async (wid) => { if (!wid) return false; return (await DB.getAll('races', wid)).length > 0; } },
        { id: 'monster_create', title: '몬스터 만들기', desc: '게이트에 출현하는 몬스터를 만드세요. 등급·서식지·스킬·죽음 유형을 설정할 수 있습니다.', hint: '생명체 → 몬스터 → + 추가', page: 'monsters', check: async (wid) => { if (!wid) return false; return (await DB.getAll('monsters', wid)).length > 0; } },
      ],
    },
    {
      group: '👤 인물',
      color: '#a78bfa',
      items: [
        { id: 'character_create', title: '캐릭터 만들기', desc: '주인공이나 등장인물을 만드세요. 스텟·스킬·소속·외형 등 다양한 정보를 기록합니다.', hint: '인물 → 캐릭터 → + 추가', page: 'characters', check: async (wid) => { if (!wid) return false; return (await DB.getAll('characters', wid)).length > 0; } },
        { id: 'org_create', title: '조직/단체 만들기', desc: '헌터 팀, 레이드 파티, 협회 지부 등을 등록하세요.', hint: '인물 → 조직/단체 → + 추가', page: 'organizations', check: async (wid) => { if (!wid) return false; return (await DB.getAll('organizations', wid)).length > 0; } },
        { id: 'const_create', title: '성좌 만들기', desc: '9대 성좌, 관할 영역, 후원 캐릭터를 설정하세요.', hint: '인물 → 성좌 → + 추가', page: 'constellations', check: async (wid) => { if (!wid) return false; return (await DB.getAll('constellations', wid)).length > 0; } },
        { id: 'god_create', title: '신 만들기', desc: '세계의 신들을 관리하세요. 신격 체계와 관할 영역을 기록합니다.', hint: '인물 → 신 → + 추가', page: 'gods', check: async (wid) => { if (!wid) return false; return (await DB.getAll('gods', wid)).length > 0; } },
      ],
    },
    {
      group: '⚡ 능력 & 아이템',
      color: '#fbbf24',
      items: [
        { id: 'statdef_create', title: '스텟 정의 추가', desc: 'STR, AGI, VIT 등 세계에서 쓰는 스텟을 정의하세요. 캐릭터 입력 시 자동완성으로 사용됩니다.', hint: '능력 & 아이템 → 스텟 정의 → 기본 스텟 초기화 또는 + 추가', page: 'stat-defs', check: async (wid) => { if (!wid) return false; return (await DB.getAll('statDefs', wid)).length > 0; } },
        { id: 'skill_create', title: '스킬 만들기', desc: '캐릭터나 몬스터가 사용하는 스킬을 만드세요.', hint: '능력 & 아이템 → 스킬 → + 추가', page: 'skills', check: async (wid) => { if (!wid) return false; return (await DB.getAll('skills', wid)).length > 0; } },
        { id: 'item_create', title: '아이템 만들기', desc: '장비, 소비 아이템, 유물 등을 등록하세요.', hint: '능력 & 아이템 → 아이템 → + 추가', page: 'items', check: async (wid) => { if (!wid) return false; return (await DB.getAll('items', wid)).length > 0; } },
        { id: 'job_create', title: '직업 만들기', desc: '전사, 마법사, 궁수 등 직업·클래스를 등록하세요.', hint: '능력 & 아이템 → 직업 → + 추가', page: 'jobs', check: async (wid) => { if (!wid) return false; return (await DB.getAll('jobs', wid)).length > 0; } },
        { id: 'achievement_create', title: '업적 만들기', desc: '시스템 업적을 등록하세요. 칭호와 보상을 설정할 수 있습니다.', hint: '능력 & 아이템 → 업적 → + 추가', page: 'achievements', check: async (wid) => { if (!wid) return false; return (await DB.getAll('achievements', wid)).length > 0; } },
        { id: 'trap_create', title: '함정 만들기', desc: '게이트에 등장하는 함정 종류를 등록하세요.', hint: '능력 & 아이템 → 함정 종류 → + 추가', page: 'traps', check: async (wid) => { if (!wid) return false; return (await DB.getAll('traps', wid)).length > 0; } },
      ],
    },
    {
      group: '📖 스토리',
      color: '#fb923c',
      items: [
        { id: 'quest_create', title: '퀘스트 만들기', desc: '캐릭터가 수행하는 퀘스트를 만드세요. 게이트·웨이브와 연동됩니다.', hint: '스토리 → 퀘스트 → + 추가', page: 'quests', check: async (wid) => { if (!wid) return false; return (await DB.getAll('quests', wid)).length > 0; } },
        { id: 'timeline_create', title: '타임라인 이벤트 추가', desc: '소설의 사건을 시간순으로 정리하세요.', hint: '스토리 → 타임라인 → + 이벤트 추가', page: 'timeline', check: async (wid) => { if (!wid) return false; return (await DB.getAll('events', wid)).length > 0; } },
      ],
    },
    {
      group: '🛠️ 도구',
      color: '#94a3b8',
      items: [
        { id: 'keyword_create', title: '키워드 메모장 사용', desc: '특수 용어, 설정 메모를 폴더별로 관리하세요.', hint: '도구 → 키워드 메모장 → + 추가', page: 'keywords', check: async (wid) => { if (!wid) return false; return (await DB.getAll('keywords', wid)).length > 0; } },
        { id: 'reminder_create', title: '리마인더 추가', desc: '글 쓸 때 잊으면 안 되는 내용을 알림으로 등록하세요. 앱 실행 시 표시됩니다.', hint: '도구 → 리마인더 → + 추가', page: 'reminders', check: async () => { const r = await DB.getSetting('reminders', []); return Array.isArray(r) && r.length > 0; } },
      ],
    },
  ],

  GUIDE_SECTIONS: [
    {
      icon: '🌍', title: '세계/차원',
      content: '소설의 배경이 될 세계를 관리합니다. 여러 세계/차원을 만들어 각각의 설정을 독립적으로 관리할 수 있습니다.\n• 세계 카드를 탭하면 해당 세계가 현재 활성 세계가 됩니다\n• 이후 모든 데이터(캐릭터·스킬·게이트 등)는 선택된 세계에 귀속됩니다\n• 세계 간 데이터 복사 기능도 지원합니다',
    },
    {
      icon: '🏰', title: '탑 관리',
      content: '헌터물의 핵심인 탑을 관리합니다.\n• 탑 생성 시 사전 생성 층 수를 입력하면 빈 층을 미리 만들어줍니다\n• 각 층에 제목·이벤트·보스·함정을 설정합니다\n• 서브층 기능으로 한 층 안에 여러 구역을 만들 수 있습니다\n• 탑+층(isComposite) 기능으로 탑 이름과 층 번호를 통합 표시합니다',
    },
    {
      icon: '🗡️', title: '게이트',
      content: '던전 역할을 하는 게이트를 관리합니다.\n• 등급(F~S+), 종류(직업·스킬 게이트 등), 브레이크 유형을 설정합니다\n• 웨이브: 각 웨이브마다 적·함정·클리어 조건(적 처치/탐험/참수/보스전/직접입력)을 설정합니다\n• 컨셉: 탐험·참수·보스전·방어전·공성전·스피드런·생존 컨셉별로 별도 웨이브를 구성합니다\n• 퀘스트를 게이트·웨이브와 연동할 수 있습니다\n• 클리어 조건에서 처치 대상 몬스터, 탐험할 장소·아이템, 참수/보스 대상을 직접 지정할 수 있습니다',
    },
    {
      icon: '📋', title: '세계관 규칙',
      content: '이 세계의 기본 규칙을 기록합니다.\n• 마법 체계, 각성 방식, 랭킹 시스템 등을 자유롭게 작성합니다\n• 카테고리를 지정해 분류할 수 있습니다',
    },
    {
      icon: '🌐', title: '국가',
      content: '세계 내 국가들을 관리합니다.\n• 국력, 수도, 정치 체제, 특징 등을 기록합니다\n• 캐릭터와 조직의 소속 국가로 연결됩니다',
    },
    {
      icon: '🏢', title: '기업/길드',
      content: '헌터 길드, 기업, 협회, 기관 등을 관리합니다.\n• 설립 배경, 규모, 특징 등을 기록합니다\n• 조직/단체와 연동됩니다',
    },
    {
      icon: '📍', title: '장소',
      content: '특정 장소를 관리합니다.\n• 도시, 던전 입구, 협회 본부, 유적 등을 등록합니다\n• 게이트 탐험 웨이브에서 장소와 연결할 수 있습니다',
    },
    {
      icon: '🧬', title: '종족',
      content: '세계에 존재하는 종족들을 관리합니다.\n• 인간, 각성자, 마인, 엘프 등을 등록합니다\n• 캐릭터의 종족으로 연결할 수 있습니다\n• 종족별 특성, 외형, 능력치 경향 등을 기록합니다',
    },
    {
      icon: '👾', title: '몬스터',
      content: '게이트에 출현하는 몬스터를 관리합니다.\n• 등급(F~S+), 서식지, 특징, 강점, 약점, 전리품을 기록합니다\n• 죽음 유형: 자폭/소멸/복귀/죽음으로 분류합니다\n• 몬스터에 스킬을 직접 등록할 수 있습니다\n• 수명 범위(최소~최대 년)를 설정할 수 있습니다\n• 아이콘(이모지)을 선택해 목록에서 구분할 수 있습니다\n• 작가 전용 메모(소설에 미표시)를 작성할 수 있습니다',
    },
    {
      icon: '👤', title: '캐릭터',
      content: '소설의 등장인물을 관리합니다.\n• 기본 정보: 이름, 나이, 성별, 종족, 직업, 소속 등\n• 스텟: 정의된 스텟 항목을 자동완성으로 입력합니다\n• 스킬: 보유 스킬을 검색해서 연결합니다\n• 외형·성격·배경·관계 등 다양한 정보를 기록합니다\n• 상태창 뷰어에서 캐릭터의 스텟창을 미리볼 수 있습니다',
    },
    {
      icon: '🏛️', title: '조직/단체',
      content: '헌터 팀, 레이드 파티, 협회 지부 등 단체를 관리합니다.\n• 구성원 캐릭터를 연결하고 직책을 지정합니다\n• 소속 국가, 기업과 연동됩니다',
    },
    {
      icon: '⭐', title: '성좌',
      content: '시스템의 성좌 엔티티를 관리합니다.\n• 9대 성좌, 관할 영역, 레벨, 신도 수 등을 기록합니다\n• 후원 캐릭터를 연결할 수 있습니다\n• 성좌 간 관계(라이벌·연합 등)를 설정합니다',
    },
    {
      icon: '✨', title: '신',
      content: '세계의 신들을 관리합니다.\n• 신격 체계, 관할 영역, 신도를 기록합니다\n• 신 간 관계와 판테온 구조를 설정합니다\n• 랭크 시스템으로 신의 등급을 구분합니다',
    },
    {
      icon: '🌳', title: '가계도',
      content: '캐릭터들 사이의 가족 관계를 시각적으로 관리합니다.\n• 부모-자식, 형제, 배우자 관계를 그래프로 표시합니다\n• 캐릭터를 클릭해 관계를 추가/편집합니다',
    },
    {
      icon: '⚡', title: '스킬',
      content: '캐릭터나 몬스터가 사용하는 스킬을 관리합니다.\n• 등급, 효과, 쿨타임, 마나 소비 등을 기록합니다\n• 스킬 조건(선행 스킬, 각성 조건 등)을 설정합니다\n• 게이트 공격 패턴에서 스킬을 연결할 수 있습니다',
    },
    {
      icon: '🎒', title: '아이템',
      content: '장비, 소비 아이템, 유물 등을 관리합니다.\n• 등급, 효과, 획득 경로, 설명을 기록합니다\n• 게이트 탐험 웨이브에서 아이템과 연결할 수 있습니다',
    },
    {
      icon: '🏷️', title: '직업',
      content: '캐릭터의 직업·클래스를 관리합니다.\n• 직업별 특징, 관련 스킬, 조건 등을 기록합니다\n• 캐릭터와 연동됩니다',
    },
    {
      icon: '🏆', title: '업적',
      content: '시스템 업적을 관리합니다.\n• 달성 조건, 보상, 칭호를 설정합니다\n• 달성 난이도(등급)를 지정합니다',
    },
    {
      icon: '📊', title: '스텟 정의',
      content: '세계에서 사용하는 스텟 종류를 정의합니다.\n• STR, AGI, VIT 등 스텟 이름과 약칭, 분류를 등록합니다\n• 등록된 스텟은 캐릭터·스킬·게이트 입력 시 자동완성으로 사용됩니다\n• 기본 설정 관리 → 스텟 분류 탭에서 카테고리(색상 포함)를 커스터마이즈할 수 있습니다',
    },
    {
      icon: '🪤', title: '함정',
      content: '게이트에 등장하는 함정 종류를 관리합니다.\n• 함정의 작동 방식, 위험도, 효과를 기록합니다\n• 게이트 웨이브에서 함정을 연결할 수 있습니다',
    },
    {
      icon: '📋', title: '퀘스트',
      content: '캐릭터가 수행하는 퀘스트를 관리합니다.\n• 퀘스트 목표, 조건, 보상, 기간을 설정합니다\n• 게이트 및 웨이브와 연동되어 클리어 조건으로 활용됩니다',
    },
    {
      icon: '⏱️', title: '타임라인',
      content: '소설의 사건을 시간순으로 관리합니다.\n• 날짜·시간 기반으로 이벤트를 정렬합니다\n• 이벤트 간 인과관계를 기록합니다',
    },
    {
      icon: '🕸️', title: '사건 그래프',
      content: '사건들 사이의 관계를 시각적 그래프로 관리합니다.\n• 노드를 추가하고 화살표로 인과관계를 연결합니다\n• 노드 색상과 엣지 레이블을 커스터마이즈합니다',
    },
    {
      icon: '📺', title: '상태창 뷰어',
      content: '캐릭터의 상태창(스텟·스킬·칭호 등)을 미리봅니다.\n• 게임 UI 스타일의 상태창을 생성합니다\n• 테마·색상·폰트를 커스터마이즈합니다\n• 이미지로 저장할 수 있습니다',
    },
    {
      icon: '🏷️', title: '키워드 메모장',
      content: '소설에 등장하는 특수 용어나 설정 메모를 관리합니다.\n• 폴더별로 분류해서 관리합니다\n• 검색 기능으로 빠르게 찾을 수 있습니다',
    },
    {
      icon: '🔔', title: '리마인더',
      content: '글 쓸 때 잊지 말아야 할 내용을 알림으로 설정합니다.\n• 앱 실행 시 리마인더가 알림으로 표시됩니다\n• 카테고리·우선순위를 설정할 수 있습니다',
    },
    {
      icon: '✍️', title: '소설 쓰기',
      content: '챕터별로 소설 원고를 직접 작성하고 관리합니다.\n• 폴더/챕터 구조로 원고를 정리합니다\n• 작성된 설정(캐릭터·스킬·아이템 등)을 참고하며 집필합니다',
    },
    {
      icon: '⚙️', title: '기본 설정 관리',
      content: '앱의 기본 설정을 커스터마이즈합니다.\n• 등급 목록, 성좌 관할 영역 양식을 설정합니다\n• 스텟 분류(카테고리·색상)를 정의합니다\n• 게이트 템플릿(미리 만들어진 게이트 구성)을 관리합니다\n• 변경 사항은 전체 앱에 즉시 반영됩니다',
    },
    {
      icon: '▶', title: '바로가기',
      content: '자주 사용하는 페이지를 빠르게 열 수 있는 바로가기를 설정합니다.\n• 하단 탭의 + 버튼으로 바로가기 추가/편집 화면에 접근합니다\n• 캐릭터·스킬·아이템·게이트 등 상세 페이지로 바로 이동할 수 있습니다',
    },
    {
      icon: '🔍', title: '전체 검색',
      content: '앱 내 모든 데이터를 통합 검색합니다.\n• 상단 돋보기 아이콘 또는 Ctrl+K 단축키로 열립니다\n• 캐릭터·스킬·게이트·아이템 등을 이름으로 빠르게 찾습니다',
    },
    {
      icon: '📤', title: '데이터 백업/복원',
      content: '데이터를 백업하고 다른 기기로 이전합니다.\n• 설정 → 데이터 내보내기/가져오기에서 전체 데이터를 JSON 파일로 백업합니다\n• 기기 변경 시에도 데이터를 안전하게 이전할 수 있습니다',
    },
  ],

  init: async function(container, options) {
    this._container = container;
    if (options && options.tab) this._tab = options.tab;
    const wid = AppStore.getCurrentWorldId();
    await this._render(container, wid);
  },

  _render: async function(container, wid) {
    const self = this;
    const tab = this._tab;

    let total = 0, completed = 0;
    const results = {};
    for (const group of this.MISSIONS) {
      for (const m of group.items) {
        total++;
        try { results[m.id] = await m.check(wid); } catch (e) { results[m.id] = false; }
        if (results[m.id]) completed++;
      }
    }
    const pct = total > 0 ? Math.round(completed / total * 100) : 0;

    const missionsHtml = this.MISSIONS.map(group => {
      const groupDone = group.items.filter(m => results[m.id]).length;
      const items = group.items.map(m => {
        const done = results[m.id];
        return `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;margin-bottom:6px;">
            <div style="font-size:18px;line-height:1;margin-top:2px;flex-shrink:0;">${done ? '✅' : '⬜'}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:13px;margin-bottom:2px;${done ? 'text-decoration:line-through;color:var(--color-text-muted);' : ''}">${Utils.escHtml(m.title)}</div>
              <div style="font-size:12px;color:var(--color-text-muted);line-height:1.5;margin-bottom:5px;">${Utils.escHtml(m.desc)}</div>
              <div style="font-size:11px;color:${group.color};background:${group.color}18;border:1px solid ${group.color}33;border-radius:4px;padding:2px 7px;display:inline-block;">💡 ${Utils.escHtml(m.hint)}</div>
            </div>
            <button class="btn btn-ghost btn-sm tut-goto-btn" data-page="${Utils.escHtml(m.page)}" style="flex-shrink:0;font-size:11px;white-space:nowrap;">${done ? '보기' : '이동 →'}</button>
          </div>`;
      }).join('');

      return `
        <div style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="font-size:14px;font-weight:700;color:${group.color};">${Utils.escHtml(group.group)}</div>
            <div style="font-size:11px;color:var(--color-text-muted);">${groupDone}/${group.items.length}</div>
          </div>
          ${items}
        </div>`;
    }).join('');

    const guideHtml = this.GUIDE_SECTIONS.map(s => `
      <div style="margin-bottom:12px;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:10px;padding:14px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:8px;">${Utils.escHtml(s.icon)} ${Utils.escHtml(s.title)}</div>
        <div style="font-size:13px;color:var(--color-text-muted);line-height:1.8;white-space:pre-wrap;">${Utils.escHtml(s.content)}</div>
      </div>`).join('');

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <h2 class="page-title">튜토리얼 &amp; 기능 설명</h2>
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn ${tab === 'missions' ? 'btn-primary' : 'btn-ghost'} btn-sm" id="tabMissions">📋 튜토리얼 미션</button>
          <button class="btn ${tab === 'guide' ? 'btn-primary' : 'btn-ghost'} btn-sm" id="tabGuide">📚 기능 설명</button>
        </div>
      </div>

      <div id="panelMissions" style="display:${tab === 'missions' ? 'block' : 'none'};padding-bottom:80px;">
        <div style="background:var(--color-surface2);border:1px solid var(--color-border);border-radius:10px;padding:14px;margin-bottom:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="font-weight:700;font-size:14px;">전체 진행도</div>
            <div style="font-size:15px;font-weight:700;color:var(--color-primary);">${completed}/${total}</div>
          </div>
          <div style="background:var(--color-surface3,#2a2a3a);border-radius:100px;height:10px;overflow:hidden;">
            <div style="background:linear-gradient(90deg,#6366f1,#a78bfa);height:100%;width:${pct}%;border-radius:100px;"></div>
          </div>
          <div style="font-size:12px;color:var(--color-text-muted);margin-top:6px;text-align:right;">${pct}% 달성${pct === 100 ? ' 🎉' : ''}</div>
        </div>
        ${missionsHtml}
      </div>

      <div id="panelGuide" style="display:${tab === 'guide' ? 'block' : 'none'};padding-bottom:80px;">
        <p style="font-size:13px;color:var(--color-text-muted);margin-bottom:16px;line-height:1.6;">앱의 모든 기능에 대한 설명입니다. 각 메뉴를 처음 사용할 때 참고하세요.</p>
        ${guideHtml}
      </div>
    </div>`;

    container.querySelector('#tabMissions')?.addEventListener('click', () => {
      self._tab = 'missions';
      document.getElementById('panelMissions').style.display = 'block';
      document.getElementById('panelGuide').style.display = 'none';
      document.getElementById('tabMissions').className = 'btn btn-primary btn-sm';
      document.getElementById('tabGuide').className = 'btn btn-ghost btn-sm';
    });
    container.querySelector('#tabGuide')?.addEventListener('click', () => {
      self._tab = 'guide';
      document.getElementById('panelMissions').style.display = 'none';
      document.getElementById('panelGuide').style.display = 'block';
      document.getElementById('tabMissions').className = 'btn btn-ghost btn-sm';
      document.getElementById('tabGuide').className = 'btn btn-primary btn-sm';
    });
    container.querySelectorAll('.tut-goto-btn').forEach(btn => {
      btn.addEventListener('click', () => AppRouter.navigate(btn.dataset.page));
    });
  },

  destroy: function() {
    this._container = null;
  },
};
