'use strict';
window.Pages = window.Pages || {};

const HOME_ALL_PAGES = [
  { page: 'novel-view',     icon: '✍️',  name: '소설 작성' },
  { page: 'characters',     icon: '👤',  name: '캐릭터' },
  { page: 'skills',         icon: '⚡',  name: '스킬' },
  { page: 'achievements',   icon: '🏆',  name: '업적' },
  { page: 'constellations', icon: '⭐',  name: '성좌' },
  { page: 'gates',          icon: '🌀',  name: '게이트' },
  { page: 'tower',          icon: '🏰',  name: '탑' },
  { page: 'monsters',       icon: '👾',  name: '몬스터' },
  { page: 'races',          icon: '🧬',  name: '종족' },
  { page: 'gods',           icon: '✨',  name: '신' },
  { page: 'timeline',       icon: '📅',  name: '타임라인' },
  { page: 'event-graph',    icon: '🕸️', name: '사건 그래프' },
  { page: 'family-tree',    icon: '🌳',  name: '가족 관계도' },
  { page: 'world-rules',    icon: '📜',  name: '세계관 규칙' },
  { page: 'organizations',  icon: '🏛️', name: '조직' },
  { page: 'countries',      icon: '🌍',  name: '국가' },
  { page: 'companies',      icon: '🏢',  name: '기업' },
  { page: 'places',         icon: '📍',  name: '장소' },
  { page: 'items',          icon: '📦',  name: '아이템' },
  { page: 'jobs',           icon: '🏷️', name: '직업' },
  { page: 'stat-defs',      icon: '📊',  name: '스텟 정의' },
  { page: 'traps',          icon: '⚙️', name: '함정 종류' },
  { page: 'quests',         icon: '📋',  name: '퀘스트' },
  { page: 'reminders',      icon: '🔔',  name: '리마인더' },
  { page: 'keywords',       icon: '🔑',  name: '키워드' },
  { page: 'status-viewer',  icon: '📖',  name: '상태창 뷰어' },
  { page: 'templates',      icon: '📝',  name: '기본 설정 관리' },
  { page: 'world',          icon: '🌐',  name: '세계 관리' },
  { page: 'settings',       icon: '⚙️', name: '설정' },
];

window.Pages.home = {
  _unsub: null,
  _missionTimer: null,

  QUOTES: [
    '모든 위대한 이야기는 첫 줄 한 줄에서 시작됩니다.',
    '오늘 쓰지 않은 이야기는 영원히 묻힙니다.',
    '완벽한 초고는 없습니다. 완성된 초고가 있을 뿐입니다.',
    '작가는 쓰지 않을 때도 쓰고 있습니다.',
    '독자는 당신의 세계로 탈출하기 위해 기다리고 있습니다.',
    '설정이 탄탄하면 이야기는 스스로 흘러갑니다.',
    '캐릭터가 살아 숨쉬면 작가는 그저 받아 적을 뿐입니다.',
    '오늘의 아이디어가 내일의 명장면이 됩니다.',
    '두려움은 가장 지루한 적입니다. 그냥 쓰세요.',
    '세계를 만드는 것은 신의 놀이입니다. 당신도 신입니다.',
    '막히면 캐릭터에게 물어보세요. 그들은 이미 알고 있습니다.',
    '독자가 울면 당신은 성공한 것입니다.',
    '이야기의 씨앗은 "만약에..."에서 싹틉니다.',
    '쓰는 것이 두렵다면, 그게 바로 써야 할 이유입니다.',
    '한 줄의 설정이 천 줄의 이야기를 만듭니다.',
    '오늘도 세계를 한 조각 더 완성하세요.',
    '머릿속 세계를 글로 꺼내는 것만이 그것을 실재하게 합니다.',
    '반전은 복선에서 탄생합니다. 지금 심어두세요.',
    '감정을 쓰면 독자가 느낍니다. 사건만 쓰면 독자는 읽을 뿐입니다.',
    '당신의 이야기는 누군가의 평생 최애가 될 수 있습니다.',
    '규칙을 만들고, 그 규칙을 깨는 순간이 클라이맥스입니다.',
    '설정의 빈틈이 플롯홀이 됩니다. 지금 채워두세요.',
    '주인공보다 빌런이 더 많이 고민해야 합니다.',
    '오늘 쓴 한 줄이 내일의 나를 구합니다.',
    '이야기는 갈등이고, 갈등은 성장이고, 성장이 이야기입니다.',
    '독자는 완벽한 주인공이 아니라 진실한 주인공을 원합니다.',
    '세계관은 이야기의 뼈대입니다. 단단하게 세우세요.',
    '쓰다 보면 길이 보입니다.',
    '지금 이 순간, 당신만이 이 이야기를 쓸 수 있습니다.',
    '연속 기록이 당신을 작가로 만듭니다.',
  ],

  _fmtCountdown: function(ms) {
    if (ms <= 0) return '곧 초기화';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `${h}시간 ${m}분 후 초기화`;
    return `${m}분 후 초기화`;
  },

  init: async function(container) {
    const state = AppStore.getState();
    const worlds = state.worlds;
    const wid = AppStore.getCurrentWorldId();

    const [chars, skills, items, events, monsters, orgs, constellations, gates,
           streak, missionState, bookmarks, editHistAll] = await Promise.all([
      DB.getAll('characters', wid), DB.getAll('skills', wid),
      DB.getAll('items', wid), DB.getAll('events', wid),
      DB.getAll('monsters', wid), DB.getAll('organizations', wid),
      DB.getAll('constellations', wid), DB.getAll('gates', wid),
      DB.get('streak', 'main').then(s => s || { id: 'main', count: 0, lastDate: null, history: [], totalCleared: 0, longestStreak: 0, shields: 0, points: 0 }),
      AppStore.getMissionState(),
      DB.getSetting('homeBookmarks').then(v => v || ['novel-view','characters','gates','tower','timeline']),
      DB.getAll('editHistory').catch(() => []),
    ]);

    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${['일','월','화','수','목','금','토'][today.getDay()]}요일)`;

    const quoteIdx = Math.floor(Date.now() / 86400000) % this.QUOTES.length;

    // Streak history → last 7 days chart
    const history = streak.history || [];
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const entry = history.find(h => h.d === iso);
      last7.push({
        iso, dayLabel: ['일','월','화','수','목','금','토'][d.getDay()],
        active: !!entry,
        cleared: entry && entry.c === 1,
      });
    }

    // Cumulative stats
    const now = Date.now();
    const clearedHist = history.filter(h => h.c === 1);
    const weekCleared  = clearedHist.filter(h => (now - new Date(h.d).getTime()) <= 7  * 86400000).length;
    const monthCleared = clearedHist.filter(h => (now - new Date(h.d).getTime()) <= 30 * 86400000).length;
    const yearCleared  = clearedHist.filter(h => (now - new Date(h.d).getTime()) <= 365* 86400000).length;
    const totalCleared = streak.totalCleared || clearedHist.length;

    // Missions
    const missionsWithDef = missionState.missions.map(m => ({
      m,
      def: AppStore.MISSION_POOL.find(mp => mp.id === m.id),
    })).filter(x => x.def);

    const msRemaining = Math.max(0, missionState.resetAt - Date.now());
    const missionResetCost = AppStore.getMissionResetCost(missionState);

    // Streak reminder message pool
    const streakCount = streak.count || 0;
    const reminders = streakCount >= 30
      ? [`🔥 ${streakCount}일 연속! 전설의 작가에 가까워지고 있습니다!`]
      : streakCount >= 7
      ? [`🔥 ${streakCount}일 연속! 이 흐름을 유지하세요!`, `📖 ${streakCount}일째 이야기를 써내려가고 있습니다!`]
      : ['✍️ 글을 쓰지 않은 날은 작가가 되지 않은 날입니다.', '🌱 오늘 한 걸음이 내일의 세계를 만듭니다.'];
    const reminderMsg = reminders[Math.floor(Date.now() / 3600000) % reminders.length];
    const todayKey = today.toISOString().slice(0, 10);
    const showReminder = streak.lastDate !== today.toDateString();

    const currentWorld = state.currentWorld;

    container.innerHTML = `
    <div class="page active" id="page-home">
      <div class="page-header" style="padding-bottom:12px;">

        <!-- Quote banner -->
        <div style="background:linear-gradient(135deg,rgba(0,188,212,0.12),rgba(124,58,237,0.12));border:1px solid rgba(0,188,212,0.25);border-radius:12px;padding:14px 16px;margin-bottom:14px;">
          <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:4px;letter-spacing:0.5px;">✦ 오늘의 명언</div>
          <div style="font-size:14px;font-weight:600;color:var(--color-text);line-height:1.6;font-style:italic;">"${Utils.escHtml(this.QUOTES[quoteIdx])}"</div>
        </div>

        <!-- Date -->
        <p class="page-desc" style="font-size:12px;color:var(--color-text-muted);margin-bottom:10px;">${dateStr}</p>

        <!-- World selector -->
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;">
          <select id="worldSelect" class="select-input" style="flex:1;">
            ${worlds.length === 0
              ? '<option value="">세계 없음 — 세계/차원에서 추가하세요</option>'
              : worlds.map(w =>
                  `<option value="${Utils.escHtml(w.id)}" ${w.id === wid ? 'selected' : ''}>${Utils.escHtml(w.icon || '🌍')} ${Utils.escHtml(w.name)}</option>`
                ).join('')}
          </select>
          <button class="btn btn-ghost btn-sm" onclick="AppRouter.navigate('world')" style="white-space:nowrap;">+ 관리</button>
        </div>
      </div>

      <!-- ── 연속 기록 ── -->
      <div style="background:var(--color-surface2);border-radius:12px;padding:14px 16px;margin-bottom:14px;border:1px solid ${streakCount > 0 ? 'rgba(249,115,22,0.3)' : 'var(--color-border)'};">
        <div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
              <span style="font-size:26px;">🔥</span>
              <div>
                <div style="font-size:22px;font-weight:800;color:#f97316;line-height:1;">${streakCount}<span style="font-size:13px;font-weight:600;margin-left:3px;">일 연속</span></div>
                <div style="font-size:10px;color:var(--color-text-muted);">최고 ${streak.longestStreak || streakCount}일</div>
              </div>
              ${(streak.shields || 0) > 0 ? `<div style="display:flex;align-items:center;gap:3px;padding:3px 8px;background:rgba(59,130,246,0.15);border-radius:6px;border:1px solid rgba(59,130,246,0.3);flex-shrink:0;">
                <span style="font-size:14px;">🛡️</span><span style="font-size:12px;font-weight:700;color:#60a5fa;">${streak.shields}</span>
              </div>` : ''}
              <div style="display:flex;align-items:center;gap:3px;padding:3px 8px;background:rgba(251,191,36,0.12);border-radius:6px;border:1px solid rgba(251,191,36,0.3);flex-shrink:0;">
                <span style="font-size:12px;">⭐</span><span style="font-size:12px;font-weight:700;color:#fbbf24;">${streak.points || 0}</span>
              </div>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <div style="font-size:11px;color:var(--color-text-muted);">총 <strong style="color:var(--color-text);">${totalCleared}</strong>회</div>
              <div style="font-size:11px;color:var(--color-text-muted);">이번주 <strong style="color:var(--color-text);">${weekCleared}</strong></div>
              <div style="font-size:11px;color:var(--color-text-muted);">이번달 <strong style="color:var(--color-text);">${monthCleared}</strong></div>
              <div style="font-size:11px;color:var(--color-text-muted);">올해 <strong style="color:var(--color-text);">${yearCleared}</strong></div>
            </div>
          </div>

          <!-- 7-day bar chart -->
          <div style="min-width:116px;">
            <div style="font-size:9px;color:var(--color-text-dim);margin-bottom:4px;text-align:center;">최근 7일</div>
            <div style="display:flex;gap:3px;align-items:flex-end;height:36px;">
              ${last7.map(d => `
                <div title="${d.iso}" style="width:14px;min-height:4px;border-radius:2px 2px 0 0;
                  background:${d.cleared ? '#f97316' : d.active ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.07)'};
                  height:${d.cleared ? '100%' : d.active ? '55%' : '18%'};"></div>
              `).join('')}
            </div>
            <div style="display:flex;gap:3px;margin-top:3px;">
              ${last7.map(d => `<div style="width:14px;text-align:center;font-size:8px;color:var(--color-text-dim);">${d.dayLabel}</div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- ── 연속 기록 리마인더 ── -->
      ${showReminder ? `
      <div style="background:linear-gradient(135deg,rgba(249,115,22,0.12),rgba(239,68,68,0.12));border:1px solid rgba(249,115,22,0.3);border-radius:8px;padding:10px 14px;margin-bottom:14px;">
        <div style="font-size:13px;font-weight:600;color:#f97316;">${Utils.escHtml(reminderMsg)}</div>
        <div style="font-size:11px;color:var(--color-text-muted);margin-top:3px;">미션을 클리어하면 기록이 갱신됩니다.</div>
      </div>` : ''}

      <!-- ── 도전 미션 ── -->
      <div style="background:var(--color-surface2);border-radius:12px;padding:14px 16px;margin-bottom:14px;border:1px solid var(--color-border);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div style="font-size:12px;font-weight:700;">⚡ 도전 미션</div>
          <div style="font-size:10px;color:var(--color-text-dim);">${this._fmtCountdown(msRemaining)}</div>
        </div>

        ${missionsWithDef.map(({ m, def }) => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--color-border);">
            <div style="width:22px;height:22px;border-radius:50%;flex-shrink:0;
              background:${m.done ? '#10b981' : 'var(--color-surface3)'};
              border:2px solid ${m.done ? '#10b981' : 'var(--color-border)'};
              display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;">
              ${m.done ? '✓' : ''}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:12px;${m.done ? 'text-decoration:line-through;color:var(--color-text-muted);' : ''}">${Utils.escHtml(def.text)}</div>
              ${!m.done && def.target > 1 ? `
                <div style="height:3px;background:var(--color-surface3);border-radius:2px;margin-top:5px;overflow:hidden;">
                  <div style="width:${Math.min(100, ((m.progress || 0) / def.target) * 100)}%;height:100%;background:var(--color-primary);border-radius:2px;transition:width 0.3s;"></div>
                </div>
                <div style="font-size:10px;color:var(--color-text-dim);margin-top:2px;">${m.progress || 0} / ${def.target}</div>
              ` : ''}
            </div>
            <div style="font-size:11px;font-weight:700;color:${m.done ? '#10b981' : '#fbbf24'};flex-shrink:0;">+${def.reward}⭐</div>
          </div>
        `).join('')}

        <!-- Point shop -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid var(--color-border);">
          <div>
            <div style="font-size:11px;color:var(--color-text-muted);">🛡️ 방패 — 연속기록 1일 보호</div>
            <div style="font-size:10px;color:var(--color-text-dim);margin-top:1px;">보유: ${streak.shields || 0}개 · 비용: ${AppStore.SHIELD_COST}⭐</div>
          </div>
          <button class="btn btn-ghost btn-sm" id="btnBuyShield"
            style="font-size:11px;${(streak.points || 0) >= AppStore.SHIELD_COST ? '' : 'opacity:0.4;pointer-events:none;'}">
            구매 (${streak.points || 0}⭐)
          </button>
        </div>

        <!-- Mission reset -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid var(--color-border);">
          <div>
            <div style="font-size:11px;color:var(--color-text-muted);">🔄 미션 초기화 (타이머 유지)</div>
            <div style="font-size:10px;color:var(--color-text-dim);margin-top:1px;">
              비용: <strong>${missionResetCost}⭐</strong>
              · 미완료 1개당 +15⭐
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" id="btnResetMissions"
            style="font-size:11px;${(streak.points || 0) >= missionResetCost ? '' : 'opacity:0.4;pointer-events:none;'}">
            초기화 (${missionResetCost}⭐)
          </button>
        </div>
      </div>

      <!-- ── 통계 ── -->
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px;">
        ${[
          ['characters', '캐릭터', chars.length, 'var(--color-primary)', '명'],
          ['skills',     '스킬',   skills.length, 'var(--color-secondary)', '개'],
          ['items',      '아이템', items.length,  'var(--color-accent)', '개'],
          ['monsters',   '몬스터', monsters.length,'var(--color-warning)', '개'],
          ['organizations','조직', orgs.length,   '#10b981', '개'],
          ['gates',      '게이트', gates.length,  '#8b5cf6', '개'],
        ].map(([page, label, count, color, unit]) => `
          <div onclick="AppRouter.navigate('${page}')" style="cursor:pointer;background:var(--color-surface2);border-radius:12px;padding:14px;text-align:center;border:1px solid var(--color-border);">
            <div style="font-size:11px;color:var(--color-text-muted);">${label}</div>
            <div style="font-size:28px;font-weight:800;color:${color};">${count}</div>
            <div style="font-size:10px;color:var(--color-text-dim);">${unit}</div>
          </div>
        `).join('')}
      </div>

      <!-- ── 바로가기 ── -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <div style="font-weight:700;font-size:13px;color:var(--color-text-muted);">바로가기</div>
        <button id="btnEditBookmarks" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--color-primary);padding:2px 6px;">편집</button>
      </div>
      <!-- 북마크 슬롯 5개 -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px;" id="bookmarkSlots">
        ${Array.from({length:5}, (_,i) => {
          const bm = bookmarks[i] ? HOME_ALL_PAGES.find(p => p.page === bookmarks[i]) : null;
          return `<button class="bookmark-slot" data-slot="${i}" data-page="${bm ? bm.page : ''}"
            onclick="${bm ? `AppRouter.navigate('${bm.page}')` : 'document.getElementById(\'btnEditBookmarks\').click()'}"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
              background:${bm ? 'var(--color-surface2)' : 'rgba(99,102,241,0.06)'};
              border:${bm ? '1px solid var(--color-border)' : '1px dashed rgba(99,102,241,0.3)'};
              border-radius:10px;padding:10px 4px;cursor:pointer;min-height:60px;">
            <div style="font-size:20px;">${bm ? bm.icon : '＋'}</div>
            <div style="font-size:10px;font-weight:600;color:${bm ? 'var(--color-text)' : 'var(--color-text-muted)'};text-align:center;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;">${bm ? bm.name : '빈 슬롯'}</div>
          </button>`;
        }).join('')}
      </div>
      <!-- 전체 페이지 그리드 -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px;">
        ${HOME_ALL_PAGES.map(({page, icon, name}) => `
          <button onclick="AppRouter.navigate('${page}')"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:10px;padding:10px 4px;cursor:pointer;min-height:60px;">
            <div style="font-size:18px;">${icon}</div>
            <div style="font-size:10px;font-weight:600;color:var(--color-text);text-align:center;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;">${name}</div>
          </button>
        `).join('')}
      </div>

      <!-- ── 최근 수정 (아이콘 버튼) ── -->
      <button id="btnShowHistory" style="width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--color-surface2);border-radius:10px;border:1px solid var(--color-border);margin-bottom:14px;cursor:pointer;text-align:left;">
        <span style="font-size:22px;">🕐</span>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:13px;">수정 기록</div>
          <div style="font-size:11px;color:var(--color-text-muted);">총 ${editHistAll.length}개 기록</div>
        </div>
        <span style="font-size:16px;color:var(--color-text-muted);">›</span>
      </button>
    </div>`;

    // World selector
    document.getElementById('worldSelect')?.addEventListener('change', async e => {
      await AppStore.setCurrentWorld(e.target.value);
      Utils.toast('세계 변경됨', 'success');
      this.init(container);
    });

    // Buy shield
    document.getElementById('btnBuyShield')?.addEventListener('click', async () => {
      const ok = await AppStore.buyShield();
      if (ok) { Utils.toast('방패를 구매했습니다! 🛡️', 'success'); this.init(container); }
      else Utils.toast('포인트가 부족합니다', 'error');
    });

    // Mission reset
    document.getElementById('btnResetMissions')?.addEventListener('click', async () => {
      const result = await AppStore.resetMissions();
      if (result.success) {
        Utils.toast(`미션 초기화! (-${result.cost}⭐)`, 'success');
        this.init(container);
      } else {
        Utils.toast(`포인트 부족 (필요: ${result.cost}⭐, 보유: ${result.points}⭐)`, 'error');
      }
    });

    // 바로가기 편집 버튼
    document.getElementById('btnEditBookmarks')?.addEventListener('click', () => {
      const curBm = [...bookmarks];
      const bmBody = `
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:4px;">5개 슬롯에 넣을 페이지를 선택하세요 (순서대로)</div>
          <div id="bmSelected" style="display:flex;flex-wrap:wrap;gap:6px;min-height:32px;padding:8px;background:var(--color-surface3,#1e2030);border-radius:8px;margin-bottom:4px;">
            ${curBm.map((pg,i) => {
              const p = HOME_ALL_PAGES.find(x => x.page === pg);
              return p ? `<span class="bm-sel-chip" data-pg="${p.page}" style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;font-size:12px;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);">${p.icon} ${p.name}<button class="bm-chip-del" data-pg="${p.page}" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--color-danger);padding:0 2px;">✕</button></span>` : '';
            }).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;">
            ${HOME_ALL_PAGES.map(p => `<button class="bm-pick-btn" data-pg="${p.page}"
              style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border-radius:8px;border:1px solid var(--color-border);background:${curBm.includes(p.page) ? 'rgba(99,102,241,0.2)' : 'var(--color-surface2)'};cursor:pointer;">
              <div style="font-size:18px;">${p.icon}</div>
              <div style="font-size:10px;font-weight:600;text-align:center;line-height:1.2;">${p.name}</div>
            </button>`).join('')}
          </div>
        </div>`;
      Utils.openModal('바로가기 편집', bmBody, async () => {
        const chips = [...document.querySelectorAll('#globalModalBody .bm-sel-chip')];
        const newBm = chips.map(c => c.dataset.pg);
        while (newBm.length < 5) newBm.push('');
        await DB.setSetting('homeBookmarks', newBm.slice(0,5));
        return true;
      }, '저장');
      setTimeout(() => {
        let sel = [...curBm];
        const renderChips = () => {
          const wrap = document.getElementById('bmSelected');
          if (!wrap) return;
          wrap.innerHTML = sel.map((pg,i) => {
            const p = HOME_ALL_PAGES.find(x => x.page === pg);
            return p ? `<span class="bm-sel-chip" data-pg="${p.page}" style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;font-size:12px;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);">${p.icon} ${p.name}<button class="bm-chip-del" data-pg="${p.page}" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--color-danger);padding:0 2px;">✕</button></span>` : '';
          }).join('');
          wrap.querySelectorAll('.bm-chip-del').forEach(btn => {
            btn.addEventListener('click', () => {
              sel = sel.filter(p => p !== btn.dataset.pg);
              renderChips();
              document.querySelectorAll('#globalModalBody .bm-pick-btn').forEach(b => {
                b.style.background = sel.includes(b.dataset.pg) ? 'rgba(99,102,241,0.2)' : 'var(--color-surface2)';
              });
            });
          });
        };
        document.querySelectorAll('#globalModalBody .bm-pick-btn').forEach(btn => {
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
            renderChips();
          });
        });
      }, 50);
    });

    // 수정 기록 버튼
    document.getElementById('btnShowHistory')?.addEventListener('click', () => {
      const sorted = [...editHistAll].sort((a,b) => b.timestamp - a.timestamp).slice(0, 100);
      if (!sorted.length) { Utils.toast('수정 기록이 없습니다', 'error'); return; }
      const STORE_LABELS = { characters:'캐릭터', skills:'스킬', items:'아이템', monsters:'몬스터', organizations:'조직', gates:'게이트', towers:'탑', countries:'국가', companies:'기업', places:'장소', races:'종족', gods:'신', quests:'퀘스트', constellations:'성좌', events:'사건', worldRules:'세계관 규칙', traps:'함정', jobs:'직업', statDefs:'스텟', keywords:'키워드', achievements:'업적' };
      const body = `
        <div style="display:flex;flex-direction:column;gap:4px;max-height:60vh;overflow-y:auto;">
          ${sorted.map(h => `
            <button class="hist-entry" data-hid="${Utils.escHtml(h.id)}"
              style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;cursor:pointer;text-align:left;width:100%;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(h.itemName || '?')}</div>
                <div style="font-size:11px;color:var(--color-text-muted);">${STORE_LABELS[h.storeName] || h.storeName} · ${Utils.formatDate(h.timestamp)}</div>
              </div>
              <span style="font-size:13px;color:var(--color-text-muted);">›</span>
            </button>`).join('')}
        </div>`;
      Utils.openModal('수정 기록', body, null, null);
      setTimeout(() => {
        document.querySelectorAll('#globalModalBody .hist-entry').forEach(btn => {
          btn.addEventListener('click', () => {
            const hid = btn.dataset.hid;
            const entry = sorted.find(h => h.id === hid);
            if (!entry) return;
            const snap = entry.snapshot;
            const fields = Object.entries(snap).filter(([k]) => !['id','worldId','createdAt','updatedAt'].includes(k));
            const preview = fields.map(([k, v]) => {
              if (typeof v === 'object' && v !== null) return `<div style="margin-bottom:6px;"><div style="font-size:10px;color:var(--color-text-muted);font-weight:700;margin-bottom:2px;">${Utils.escHtml(k)}</div><div style="font-size:12px;white-space:pre-wrap;word-break:break-all;">${Utils.escHtml(JSON.stringify(v, null, 2))}</div></div>`;
              if (!v && v !== 0) return '';
              return `<div style="margin-bottom:6px;"><div style="font-size:10px;color:var(--color-text-muted);font-weight:700;margin-bottom:2px;">${Utils.escHtml(k)}</div><div style="font-size:12px;white-space:pre-wrap;">${Utils.escHtml(String(v))}</div></div>`;
            }).filter(Boolean).join('');
            Utils.openModal(`이전 버전: ${Utils.escHtml(entry.itemName)}`, `<div style="max-height:60vh;overflow-y:auto;">${preview || '내용 없음'}</div>`, null, null);
          });
        });
      }, 50);
    });

    await AppStore.updateStreak();

    // Mission refresh timer
    this._missionTimer = setInterval(() => {
      const el = document.querySelector('#page-home');
      if (!el) { clearInterval(this._missionTimer); return; }
      const remaining = Math.max(0, missionState.resetAt - Date.now());
      const timerEls = el.querySelectorAll('.mission-timer');
      timerEls.forEach(t => { t.textContent = this._fmtCountdown(remaining); });
      if (remaining === 0) { clearInterval(this._missionTimer); this.init(container); }
    }, 30000);
  },

  destroy: function() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
    if (this._missionTimer) { clearInterval(this._missionTimer); this._missionTimer = null; }
  }
};
