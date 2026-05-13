'use strict';

// ── Quest pool ────────────────────────────────────────────────────────────────
const QUEST_POOL = [
  {
    id: 'add_character', store: 'characters', isNew: true,
    texts: [
      '오늘 새 캐릭터를 창조해보세요!',
      '이야기를 이끌 새 인물을 탄생시키세요.',
      '세계에 숨어있던 누군가를 불러내보세요.',
      '주인공의 동료(혹은 적)를 한 명 더 등장시키세요.',
      '기억에 남을 인물 하나를 세계에 추가해보세요.',
    ],
    cleared: [
      '새 인물이 세계에 등장했습니다! ✨',
      '캐릭터가 탄생했습니다. 오늘의 과제 완료! 🎉',
      '작가가 창조자의 이름을 얻었습니다! 🌟',
      '이야기에 새 바람이 불어왔습니다! 🎊',
    ],
    hint: '캐릭터 페이지에서 새 캐릭터를 추가하면 클리어됩니다.',
  },
  {
    id: 'edit_character', store: 'characters', isNew: false,
    texts: [
      '캐릭터 설정을 한층 더 깊게 만들어보세요.',
      '오늘 캐릭터 한 명의 이야기를 더 채워보세요.',
      '캐릭터의 숨겨진 과거를 설정해보세요.',
      '빌런의 동기를 더 구체적으로 만들어보세요.',
      '주인공의 성격에 새 측면을 추가해보세요.',
    ],
    cleared: [
      '캐릭터가 더욱 입체적으로 살아났습니다! ✨',
      '설정이 채워질수록 이야기는 깊어집니다! 📖',
      '캐릭터 편집 완료! 훌륭한 작가입니다 🎉',
      '인물이 살아 숨쉬기 시작합니다! 🌟',
    ],
    hint: '기존 캐릭터를 편집하고 저장하면 클리어됩니다.',
  },
  {
    id: 'add_skill', store: 'skills', isNew: true,
    texts: [
      '오늘 새 스킬을 세계에 추가해보세요!',
      '아직 이름 없는 스킬을 완성해보세요.',
      '독창적인 스킬로 전투 시스템을 풍성하게 만드세요.',
      '주인공의 새 각성 스킬을 설계해보세요.',
      '상상 속의 능력을 현실로 꺼내보세요.',
    ],
    cleared: [
      '스킬이 세계에 각인되었습니다! ⚡',
      '새 능력이 탄생했습니다! 이야기가 풍성해집니다 🎉',
      '전투 시스템이 한 단계 업그레이드! ✨',
      '새로운 힘이 세계에 깃들었습니다! 🌟',
    ],
    hint: '스킬 페이지에서 새 스킬을 추가하면 클리어됩니다.',
  },
  {
    id: 'edit_skill', store: 'skills', isNew: false,
    texts: [
      '스킬 설명을 더 구체적으로 다듬어보세요.',
      '스킬의 조건과 효과를 정밀하게 설정해보세요.',
      '스킬 등급 체계를 재검토해보세요.',
      '스킬의 한계와 약점도 설정해보세요.',
    ],
    cleared: [
      '스킬이 더 강력하게 다듬어졌습니다! ⚡',
      '세밀한 스킬 설계 완료! 🎉',
      '능력의 윤곽이 선명해집니다! ✨',
    ],
    hint: '기존 스킬을 편집하고 저장하면 클리어됩니다.',
  },
  {
    id: 'add_achievement', store: 'achievements', isNew: true,
    texts: [
      '새 업적을 시스템에 등록해보세요!',
      '숨겨진 업적 시스템을 더 채워보세요.',
      '주인공이 아직 얻지 못한 칭호를 설계해보세요.',
      '도전적인 업적 하나를 만들어보세요.',
    ],
    cleared: [
      '업적이 시스템에 등록됐습니다! 🏆',
      '새 업적 해금! 세계가 한층 현실적이 됩니다 ✨',
      '칭호 체계가 더욱 풍부해졌습니다! 🎉',
    ],
    hint: '업적 페이지에서 새 업적을 추가하면 클리어됩니다.',
  },
  {
    id: 'add_item', store: 'items', isNew: true,
    texts: [
      '새 아이템을 세계에 등록해보세요!',
      '전설의 아이템 한 개를 설계해보세요.',
      '탑에서 드롭되는 특별 아이템을 추가해보세요.',
      '주인공이 탐낼 만한 아이템을 만들어보세요.',
    ],
    cleared: [
      '새 아이템이 세계에 등장했습니다! 💎',
      '아이템 설계 완료! 세계가 더 풍부해집니다 🎉',
      '헌터들이 눈독 들일 아이템이 탄생했습니다! ✨',
    ],
    hint: '아이템 페이지에서 새 아이템을 추가하면 클리어됩니다.',
  },
  {
    id: 'edit_item', store: 'items', isNew: false,
    texts: [
      '아이템 설명을 더 흥미롭게 만들어보세요.',
      '아이템의 획득 조건이나 가격을 설정해보세요.',
      '아이템에 이미지를 추가해보세요.',
    ],
    cleared: [
      '아이템이 더 특별해졌습니다! 💎',
      '아이템 설정 완료! ✨',
      '수집욕을 자극하는 아이템으로 완성됐습니다! 🎉',
    ],
    hint: '기존 아이템을 편집하고 저장하면 클리어됩니다.',
  },
  {
    id: 'add_monster', store: 'monsters', isNew: true,
    texts: [
      '오늘 새 몬스터를 설계해보세요!',
      '헌터들이 두려워할 강적을 만들어보세요.',
      '게이트에 배치할 새 보스를 설계해보세요.',
      '독특한 능력을 가진 몬스터를 창조해보세요.',
    ],
    cleared: [
      '위험한 존재가 세계에 출현했습니다! 👹',
      '몬스터 설계 완료! 세계가 더 위험해집니다 🎉',
      '새로운 공포가 세계를 배회합니다! ✨',
    ],
    hint: '몬스터 페이지에서 새 몬스터를 추가하면 클리어됩니다.',
  },
  {
    id: 'edit_monster', store: 'monsters', isNew: false,
    texts: [
      '몬스터의 스킬과 드롭을 설정해보세요.',
      '몬스터의 생태와 특성을 더 구체화하세요.',
      '보스의 공격 패턴을 정교하게 만들어보세요.',
    ],
    cleared: [
      '몬스터가 더 무서워졌습니다! 👹',
      '몬스터 설정 완료! ✨',
      '이제 진짜 두려운 적이 완성됐습니다! 🎉',
    ],
    hint: '기존 몬스터를 편집하고 저장하면 클리어됩니다.',
  },
  {
    id: 'add_constellation', store: 'constellations', isNew: true,
    texts: [
      '새 성좌를 밤하늘에 새겨보세요!',
      '계약자를 기다리는 성좌를 만들어보세요.',
      '타락성좌의 음모를 설계해보세요.',
      '상위 성좌의 위계와 담당 영역을 설정해보세요.',
    ],
    cleared: [
      '새 성좌가 하늘에 등장했습니다! ⭐',
      '성좌가 세계를 내려다보기 시작합니다 🌌',
      '새 신격이 탄생했습니다! 🎉',
    ],
    hint: '성좌 페이지에서 새 성좌를 추가하면 클리어됩니다.',
  },
  {
    id: 'add_event', store: 'events', isNew: true,
    texts: [
      '오늘 사건 하나를 그래프에 추가해보세요.',
      '이야기의 중요한 순간을 기록하세요.',
      '복선이 될 사건을 하나 심어두세요.',
      '반전 포인트가 될 사건을 만들어보세요.',
    ],
    cleared: [
      '사건이 역사에 기록됐습니다! 📌',
      '타임라인이 더 풍부해졌습니다! 🎉',
      '이야기의 씨앗이 심어졌습니다! ✨',
    ],
    hint: '사건 그래프에서 새 사건을 추가하면 클리어됩니다.',
  },
  {
    id: 'add_organization', store: 'organizations', isNew: true,
    texts: [
      '새 조직이나 단체를 등록해보세요.',
      '길드, 국가, 비밀 조직... 세계의 세력을 구체화하세요.',
      '적대 세력이나 숨겨진 조직을 하나 추가해보세요.',
    ],
    cleared: [
      '새 세력이 세계에 등장했습니다! 🏛️',
      '조직 등록 완료! 세계의 구도가 더 명확해집니다 🎉',
      '세계의 판이 더 커졌습니다! ✨',
    ],
    hint: '조직 페이지에서 새 조직을 추가하면 클리어됩니다.',
  },
  {
    id: 'add_gate', store: 'gates', isNew: true,
    texts: [
      '새 게이트를 세계에 열어보세요!',
      '던전 공략의 핵심이 될 게이트를 설정해보세요.',
      '히든 클리어 조건이 있는 게이트를 만들어보세요.',
    ],
    cleared: [
      '새 게이트가 출현했습니다! 🌀',
      '게이트 등록 완료! ✨',
      '위험하고 매혹적인 던전이 열렸습니다! 🎉',
    ],
    hint: '게이트 페이지에서 새 게이트를 추가하면 클리어됩니다.',
  },
  {
    id: 'add_job', store: 'jobs', isNew: true,
    texts: [
      '새 직업이나 클래스를 설계해보세요!',
      '캐릭터의 각성 직업을 만들어보세요.',
      '숨겨진 희귀 직업을 하나 설정해보세요.',
    ],
    cleared: [
      '새 직업이 세계에 등장했습니다! ⚔️',
      '직업 설계 완료! 🎉',
      '새로운 길이 열렸습니다! ✨',
    ],
    hint: '직업 페이지에서 새 직업을 추가하면 클리어됩니다.',
  },
];

// ── Mission pool ──────────────────────────────────────────────────────────────
const MISSION_POOL = [
  { id: 'mc_char_add',   text: '캐릭터 1명 추가',       store: 'characters',    isNew: true,  target: 1, reward: 20 },
  { id: 'mc_skill_add',  text: '스킬 1개 추가',         store: 'skills',        isNew: true,  target: 1, reward: 15 },
  { id: 'mc_skill_any3', text: '스킬 3개 편집/추가',    store: 'skills',        isNew: null,  target: 3, reward: 30 },
  { id: 'mc_item_add',   text: '아이템 1개 추가',       store: 'items',         isNew: true,  target: 1, reward: 15 },
  { id: 'mc_monster_add',text: '몬스터 1마리 추가',     store: 'monsters',      isNew: true,  target: 1, reward: 15 },
  { id: 'mc_ach_add',    text: '업적 1개 추가',         store: 'achievements',  isNew: true,  target: 1, reward: 15 },
  { id: 'mc_event_add',  text: '사건 1개 추가',         store: 'events',        isNew: true,  target: 1, reward: 15 },
  { id: 'mc_const_any',  text: '성좌 편집/추가',        store: 'constellations',isNew: null,  target: 1, reward: 20 },
  { id: 'mc_any3',          text: '무언가 3번 편집/추가',  store: '__any__',       isNew: null,  target: 3, reward: 25 },
  { id: 'mc_quest',         text: '오늘의 과제 클리어',    store: '__quest__',     isNew: null,  target: 1, reward: 30 },
  { id: 'mc_country_add',   text: '국가 1개 추가',          store: 'countries',     isNew: true,  target: 1, reward: 20 },
  { id: 'mc_country_any',   text: '국가 편집/추가',          store: 'countries',     isNew: null,  target: 1, reward: 15 },
  { id: 'mc_company_add',   text: '기업 1개 추가',          store: 'companies',     isNew: true,  target: 1, reward: 20 },
  { id: 'mc_company_any',   text: '기업 편집/추가',          store: 'companies',     isNew: null,  target: 1, reward: 15 },
];

const SHIELD_COST = 100;

// ── AppStore ──────────────────────────────────────────────────────────────────
const AppStore = (function() {
  let state = {
    currentWorldId: null,
    currentWorld: null,
    worlds: [],
    regressionCycle: 0,
    searchScope: 'world',
    streak: { count: 0, lastDate: null },
  };
  const listeners = {};

  function emit(event, data) {
    (listeners[event] || []).forEach(fn => fn(data));
  }

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
    return () => { listeners[event] = listeners[event].filter(f => f !== fn); };
  }

  function getState() { return state; }

  function setState(partial) {
    state = Object.assign({}, state, partial);
    emit('state-change', state);
  }

  async function init() {
    const worldId = await DB.getSetting('currentWorldId', null);
    const worlds = await DB.getAll('worlds');
    const cycle = await DB.getSetting('regressionCycle', 0);

    let streakData = await DB.get('streak', 'main') || { id: 'main', count: 0, lastDate: null };
    // Migrate old data: ensure new fields exist
    if (!streakData.history) streakData.history = [];
    if (!streakData.totalCleared) streakData.totalCleared = 0;
    if (!streakData.longestStreak) streakData.longestStreak = 0;
    if (!streakData.shields) streakData.shields = 0;
    if (!streakData.points) streakData.points = 0;

    let currentWorld = null;
    if (worldId) currentWorld = worlds.find(w => w.id === worldId) || null;
    if (!currentWorld && worlds.length) currentWorld = worlds[0];

    setState({
      worlds,
      currentWorldId: currentWorld ? currentWorld.id : null,
      currentWorld,
      regressionCycle: cycle,
      streak: streakData,
    });

    emit('ready', state);
  }

  async function setCurrentWorld(worldId) {
    const worlds = await DB.getAll('worlds');
    const world = worlds.find(w => w.id === worldId) || null;
    await DB.setSetting('currentWorldId', worldId);
    setState({ currentWorldId: worldId, currentWorld: world, worlds });
    emit('world-changed', world);
  }

  async function refreshWorlds() {
    const worlds = await DB.getAll('worlds');
    setState({ worlds });
    return worlds;
  }

  function getCurrentWorldId() {
    return state.currentWorldId;
  }

  // Streak advances ONLY when daily quest is cleared (_onQuestDone).
  // This function only handles new-day detection and resets streak if previous day's quest wasn't done.
  async function updateStreak() {
    const today = new Date().toDateString();
    const todayIso = new Date().toISOString().slice(0, 10);
    let sd = await DB.get('streak', 'main') || { id: 'main', count: 0, lastDate: null, history: [], totalCleared: 0, longestStreak: 0, shields: 0, points: 0 };

    if (sd.lastDate === today) return sd;

    const hist = sd.history || [];

    if (sd.lastDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayIso = yesterday.toISOString().slice(0, 10);
      const lastD = new Date(sd.lastDate);
      const diffDays = Math.round((new Date(today) - lastD) / 86400000);

      if (diffDays === 1) {
        // Check if yesterday's quest was cleared (c === 1)
        const yHist = hist.find(h => h.d === yesterdayIso);
        if (!yHist || yHist.c !== 1) {
          if ((sd.shields || 0) > 0) {
            sd.shields--;
          } else {
            sd.count = 0;
          }
        }
        // If quest was cleared, count was already advanced in _onQuestDone — keep it
      } else if (diffDays === 2 && (sd.shields || 0) > 0) {
        sd.shields--;
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const tdaIso = twoDaysAgo.toISOString().slice(0, 10);
        const tdaHist = hist.find(h => h.d === tdaIso);
        if (!tdaHist || tdaHist.c !== 1) sd.count = 0;
      } else {
        sd.count = 0;
      }
    }

    sd.lastDate = today;

    if (!hist.find(h => h.d === todayIso)) {
      hist.push({ d: todayIso, c: 0 });
      if (hist.length > 366) hist.shift();
    }
    sd.history = hist;

    await DB.put('streak', sd);
    setState({ streak: sd });
    return sd;
  }

  // Determine today's quest (deterministic by date)
  function getTodayQuest() {
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return QUEST_POOL[seed % QUEST_POOL.length];
  }

  // Get today's varied text index (changes every 6 hours)
  function getTodayTextIdx(arr) {
    return Math.floor(Date.now() / (6 * 3600000)) % arr.length;
  }

  // Get/create mission state (resets every 8 hours)
  async function getMissionState() {
    const now = Date.now();
    const RESET_MS = 8 * 60 * 60 * 1000;
    let ms = await DB.getSetting('missionState', null);
    if (!ms || now >= ms.resetAt) {
      const seed = Math.floor(now / RESET_MS);
      const indices = _pickMissions(seed);
      ms = {
        missions: indices.map(i => ({ id: MISSION_POOL[i].id, progress: 0, done: false })),
        resetAt: (Math.floor(now / RESET_MS) + 1) * RESET_MS,
      };
      await DB.setSetting('missionState', ms);
    }
    return ms;
  }

  function _pickMissions(seed) {
    const n = MISSION_POOL.length;
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.abs((seed * 1103515245 + i * 22695477) >>> 0) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 3);
  }

  // Called from pages after saving an item
  async function recordActivity(storeName, isNew) {
    const today = new Date().toDateString();
    const todayIso = new Date().toISOString().slice(0, 10);

    let ta = await DB.getSetting('todayActivity', null);
    if (!ta || ta.date !== today) ta = { date: today, stores: {}, questDone: false };

    if (!ta.stores[storeName]) ta.stores[storeName] = { added: 0, edited: 0 };
    if (isNew) ta.stores[storeName].added++;
    else ta.stores[storeName].edited++;

    if (!ta.stores.__any__) ta.stores.__any__ = { added: 0, edited: 0 };
    if (isNew) ta.stores.__any__.added++;
    else ta.stores.__any__.edited++;

    // Check today's quest
    let questJustDone = false;
    if (!ta.questDone) {
      const q = getTodayQuest();
      const matches = q.store === storeName &&
        (q.isNew === null || q.isNew === undefined || q.isNew === isNew);
      if (matches) {
        ta.questDone = true;
        questJustDone = true;
      }
    }

    await DB.setSetting('todayActivity', ta);

    if (questJustDone) {
      await _onQuestDone(todayIso);
    }

    await _updateMissions(storeName, isNew, ta.questDone);
  }

  async function _onQuestDone(todayIso) {
    let sd = await DB.get('streak', 'main') || { id: 'main', count: 0, lastDate: null, history: [], totalCleared: 0, longestStreak: 0, shields: 0, points: 0 };
    sd.totalCleared = (sd.totalCleared || 0) + 1;
    sd.points = (sd.points || 0) + 50;

    // Streak advances here — quest cleared = counts as a writing day
    sd.count = (sd.count || 0) + 1;
    sd.longestStreak = Math.max(sd.longestStreak || 0, sd.count);

    const hist = sd.history || [];
    const existing = hist.find(h => h.d === todayIso);
    if (existing) {
      existing.c = 1;
    } else {
      hist.push({ d: todayIso, c: 1 });
      if (hist.length > 366) hist.shift();
    }
    sd.history = hist;

    await DB.put('streak', sd);
    setState({ streak: sd });
    emit('quest-complete', sd);
  }

  async function _updateMissions(storeName, isNew, questDone) {
    let ms = await DB.getSetting('missionState', null);
    if (!ms) return;

    let anyProgress = false;
    let earnedPoints = 0;

    ms.missions.forEach(m => {
      if (m.done) return;
      const def = MISSION_POOL.find(mp => mp.id === m.id);
      if (!def) return;

      let triggered = false;
      if (def.store === '__quest__' && questDone) triggered = true;
      else if (def.store === '__any__') triggered = true;
      else if (def.store === storeName) {
        if (def.isNew === null || def.isNew === undefined) triggered = true;
        else if (def.isNew === isNew) triggered = true;
      }

      if (triggered) {
        m.progress = (m.progress || 0) + 1;
        anyProgress = true;
        if (m.progress >= def.target) {
          m.done = true;
          earnedPoints += def.reward;
        }
      }
    });

    if (anyProgress) {
      await DB.setSetting('missionState', ms);
      if (earnedPoints > 0) {
        let sd = await DB.get('streak', 'main') || { id: 'main' };
        sd.points = (sd.points || 0) + earnedPoints;
        await DB.put('streak', sd);
        setState({ streak: sd });
      }
    }
  }

  async function getTodayActivity() {
    const today = new Date().toDateString();
    const ta = await DB.getSetting('todayActivity', null);
    if (!ta || ta.date !== today) return { date: today, stores: {}, questDone: false };
    return ta;
  }

  async function buyShield() {
    let sd = await DB.get('streak', 'main') || { id: 'main', count: 0 };
    if ((sd.points || 0) < SHIELD_COST) return false;
    sd.points -= SHIELD_COST;
    sd.shields = (sd.shields || 0) + 1;
    await DB.put('streak', sd);
    setState({ streak: sd });
    return true;
  }

  return {
    init, on, emit, getState, setState,
    setCurrentWorld, refreshWorlds, getCurrentWorldId,
    updateStreak, recordActivity, getMissionState, buyShield,
    getTodayQuest, getTodayActivity, getTodayTextIdx,
    QUEST_POOL, MISSION_POOL, SHIELD_COST,
  };
})();
window.AppStore = AppStore;
