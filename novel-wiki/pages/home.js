'use strict';
window.Pages = window.Pages || {};
window.Pages.home = {
  _unsub: null,

  init: async function(container) {
    const state = AppStore.getState();
    const worlds = state.worlds;

    // Count stats
    const wid = AppStore.getCurrentWorldId();
    const [chars, skills, items, events] = await Promise.all([
      DB.getAll('characters', wid), DB.getAll('skills', wid),
      DB.getAll('items', wid), DB.getAll('events', wid),
    ]);

    const streak = state.streak || { count: 0 };
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    const prompts = [
      '오늘 새로운 캐릭터를 추가해보세요!',
      '아직 이름 없는 스킬이 있나요?',
      '세계관 규칙을 한 줄 더 추가해보세요.',
      '성좌의 약점을 설정해보세요.',
      '게이트 히든 클리어 조건을 생각해보세요.',
      '탑의 다음 층 설정을 작성해보세요.',
      '오늘 사건 하나를 그래프에 추가해보세요.',
      '캐릭터의 숨겨진 스텟을 채워보세요.',
      '조직의 비밀을 설정해보세요.',
      '아이템에 이미지를 추가해보세요.',
    ];
    const prompt = prompts[today.getDate() % prompts.length];

    const currentWorld = AppStore.getState().currentWorld;
    const worldName = currentWorld ? Utils.escHtml(currentWorld.name) : '세계 없음';

    container.innerHTML = `
    <div class="page active" id="page-home">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div>
            <h2 class="page-title">대시보드</h2>
            <p class="page-desc">${dateStr}</p>
          </div>
          <div class="streak-badge" title="${streak.count}일 연속" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 12px;background:var(--color-surface2);border-radius:12px;">
            <span style="font-size:20px;">🔥</span>
            <span style="font-size:18px;font-weight:700;color:var(--color-secondary);">${streak.count}</span>
            <span style="font-size:11px;color:var(--color-text-muted);">일 연속</span>
          </div>
        </div>

        <!-- World selector -->
        <div class="world-selector-bar" style="margin-top:12px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">현재 세계</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <select id="worldSelect" class="select-input" style="flex:1;">
              ${worlds.length === 0
                ? '<option value="">세계 없음 — 세계/차원에서 추가하세요</option>'
                : worlds.map(w =>
                    `<option value="${Utils.escHtml(w.id)}" ${w.id === wid ? 'selected' : ''}>${Utils.escHtml(w.name)}</option>`
                  ).join('')}
            </select>
            <button class="btn btn-ghost btn-sm" onclick="AppRouter.navigate('world')">관리</button>
          </div>
        </div>
      </div>

      <!-- Daily prompt -->
      <div class="daily-prompt-card" style="background:var(--color-surface2);border-left:3px solid var(--color-primary);border-radius:8px;padding:12px 16px;margin-bottom:16px;">
        <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">오늘의 작성 과제</div>
        <div style="font-weight:600;color:var(--color-text);">${Utils.escHtml(prompt)}</div>
        <div style="font-size:11px;color:var(--color-text-dim);margin-top:4px;">매일 아이디어를 조금씩 채워나가세요</div>
      </div>

      <!-- Streak notification -->
      <div id="streakNotif" style="display:none;background:linear-gradient(135deg,#f97316,#ef4444);border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#fff;">
        <div style="font-weight:700;font-size:14px;">🔥 연속 작성 리마인더</div>
        <div style="font-size:12px;margin-top:4px;">오늘 아직 작성하지 않으셨습니다! 연속 기록을 이어가세요.</div>
      </div>

      <!-- Stats -->
      <div class="stat-grid mb-4" style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px;">
        <div class="stat-box" onclick="AppRouter.navigate('characters')" style="cursor:pointer;background:var(--color-surface2);border-radius:12px;padding:16px;text-align:center;">
          <div class="stat-box__label" style="font-size:12px;color:var(--color-text-muted);">캐릭터</div>
          <div class="stat-box__value" style="font-size:32px;font-weight:800;color:var(--color-primary);">${chars.length}</div>
          <div class="stat-box__sub" style="font-size:11px;color:var(--color-text-dim);">명</div>
        </div>
        <div class="stat-box" onclick="AppRouter.navigate('skills')" style="cursor:pointer;background:var(--color-surface2);border-radius:12px;padding:16px;text-align:center;">
          <div class="stat-box__label" style="font-size:12px;color:var(--color-text-muted);">스킬</div>
          <div class="stat-box__value" style="font-size:32px;font-weight:800;color:var(--color-secondary);">${skills.length}</div>
          <div class="stat-box__sub" style="font-size:11px;color:var(--color-text-dim);">개</div>
        </div>
        <div class="stat-box" onclick="AppRouter.navigate('items')" style="cursor:pointer;background:var(--color-surface2);border-radius:12px;padding:16px;text-align:center;">
          <div class="stat-box__label" style="font-size:12px;color:var(--color-text-muted);">아이템</div>
          <div class="stat-box__value" style="font-size:32px;font-weight:800;color:var(--color-accent);">${items.length}</div>
          <div class="stat-box__sub" style="font-size:11px;color:var(--color-text-dim);">개</div>
        </div>
        <div class="stat-box" onclick="AppRouter.navigate('event-graph')" style="cursor:pointer;background:var(--color-surface2);border-radius:12px;padding:16px;text-align:center;">
          <div class="stat-box__label" style="font-size:12px;color:var(--color-text-muted);">사건</div>
          <div class="stat-box__value" style="font-size:32px;font-weight:800;color:var(--color-warning);">${events.length}</div>
          <div class="stat-box__sub" style="font-size:11px;color:var(--color-text-dim);">개</div>
        </div>
      </div>

      <!-- Quick access -->
      <div class="section-header" style="display:flex;align-items:center;margin-bottom:10px;">
        <div class="section-title" style="font-weight:700;font-size:14px;color:var(--color-text-muted);">빠른 접근</div>
      </div>
      <div class="quick-grid mb-4" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
        ${[
          ['characters', '👤', '캐릭터', '인물 관리'],
          ['skills', '⚡', '스킬', '능력 관리'],
          ['gates', '🌀', '게이트', '던전 관리'],
          ['tower', '🏰', '탑 관리', '층별 정보'],
          ['timeline', '📅', '타임라인', '회귀별 사건'],
          ['event-graph', '🕸️', '사건 그래프', '인과 관계'],
          ['constellations', '⭐', '성좌', '신격 관리'],
          ['monsters', '👾', '몬스터', '몬스터 도감'],
          ['world-rules', '📜', '세계관 규칙', '절대 규칙'],
          ['organizations', '🏛️', '조직', '단체 관리'],
          ['items', '📦', '아이템', '아이템 관리'],
          ['world', '🌍', '세계 관리', '차원 설정'],
        ].map(([page, icon, name, desc]) => `
          <button class="quick-card" onclick="AppRouter.navigate('${page}')" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:12px;padding:14px 8px;cursor:pointer;transition:background 0.15s;">
            <div class="quick-card__icon" style="font-size:24px;">${icon}</div>
            <div class="quick-card__name" style="font-size:12px;font-weight:700;color:var(--color-text);">${name}</div>
            <div class="quick-card__desc" style="font-size:10px;color:var(--color-text-muted);">${desc}</div>
          </button>
        `).join('')}
      </div>

      <!-- Recent items -->
      <div class="section-header" style="display:flex;align-items:center;margin-bottom:10px;">
        <div class="section-title" style="font-weight:700;font-size:14px;color:var(--color-text-muted);">최근 수정</div>
      </div>
      <div id="recentItemsList"></div>
    </div>`;

    // World selector event
    document.getElementById('worldSelect')?.addEventListener('change', async e => {
      await AppStore.setCurrentWorld(e.target.value);
      Utils.toast('세계 변경됨', 'success');
      this.init(container);
    });

    // Recent items
    this._loadRecent(chars, skills, items, events);

    // Streak notification: show if today not yet logged
    const streakState = AppStore.getState().streak || {};
    const todayKey = new Date().toISOString().slice(0, 10);
    if (streakState.lastDate !== todayKey) {
      const notif = document.getElementById('streakNotif');
      if (notif) notif.style.display = 'block';
    }

    // Update streak
    await AppStore.updateStreak();
  },

  _loadRecent: function(chars, skills, items, events) {
    const all = [
      ...chars.map(x => ({ ...x, _type: '캐릭터', _page: 'characters', _icon: '👤' })),
      ...skills.map(x => ({ ...x, _type: '스킬', _page: 'skills', _icon: '⚡' })),
      ...items.map(x => ({ ...x, _type: '아이템', _page: 'items', _icon: '📦' })),
      ...events.map(x => ({ ...x, _type: '사건', _page: 'event-graph', _icon: '📌' })),
    ].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 10);

    const el = document.getElementById('recentItemsList');
    if (!el) return;

    if (!all.length) {
      el.innerHTML = `
        <div class="empty-state" style="padding:32px;text-align:center;">
          <div class="empty-state__icon" style="font-size:40px;margin-bottom:8px;">📝</div>
          <div class="empty-state__title" style="font-weight:700;margin-bottom:4px;">아직 항목이 없습니다</div>
          <div class="empty-state__desc" style="font-size:13px;color:var(--color-text-muted);">캐릭터, 스킬, 아이템 등을 추가하면 여기에 표시됩니다</div>
        </div>`;
      return;
    }

    el.innerHTML = all.map(item => `
      <button class="list-item"
        onclick="AppRouter.navigate('${item._page}', {highlightId:'${Utils.escHtml(item.id)}'})"
        style="width:100%;display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--color-surface2);border-radius:10px;border:1px solid var(--color-border);margin-bottom:8px;cursor:pointer;text-align:left;">
        <span style="font-size:20px;">${item._icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(item.name || '(이름 없음)')}</div>
          <div style="font-size:12px;color:var(--color-text-muted);">${item._type} · ${Utils.formatDate(item.updatedAt)}</div>
        </div>
        <span style="font-size:16px;color:var(--color-text-muted);">›</span>
      </button>
    `).join('');
  },

  destroy: function() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }
};
