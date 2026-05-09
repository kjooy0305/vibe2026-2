'use strict';
window.Pages = window.Pages || {};
window.Pages.home = {
  _unsub: null,

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

  DEFAULT_PROMPTS: [
    '오늘 새로운 캐릭터의 과거를 한 줄 작성해보세요!',
    '아직 이름 없는 스킬을 완성해보세요.',
    '세계관 규칙을 한 줄 더 추가해보세요.',
    '성좌의 약점을 설정해보세요.',
    '게이트 히든 클리어 조건을 생각해보세요.',
    '탑의 다음 층 설정을 작성해보세요.',
    '오늘 사건 하나를 그래프에 추가해보세요.',
    '캐릭터의 숨겨진 스텟을 채워보세요.',
    '조직의 비밀을 설정해보세요.',
    '아이템에 이미지를 추가해보세요.',
    '주인공의 회귀 전 기억을 한 장면 써보세요.',
    '빌런의 동기를 더 구체적으로 만들어보세요.',
    '두 캐릭터 사이의 관계를 가계도에 추가해보세요.',
    '오늘 소설 100자 이상 작성해보세요.',
    '업적 하나를 완성된 형태로 만들어보세요.',
  ],

  init: async function(container) {
    const state = AppStore.getState();
    const worlds = state.worlds;

    const wid = AppStore.getCurrentWorldId();
    const [chars, skills, items, events, monsters, orgs, constellations, gates] = await Promise.all([
      DB.getAll('characters', wid), DB.getAll('skills', wid),
      DB.getAll('items', wid), DB.getAll('events', wid),
      DB.getAll('monsters', wid), DB.getAll('organizations', wid),
      DB.getAll('constellations', wid), DB.getAll('gates', wid),
    ]);

    const streak = state.streak || { count: 0 };
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 (${['일','월','화','수','목','금','토'][today.getDay()]}요일)`;

    // Get quote of the day
    const quoteIdx = Math.floor(Date.now() / 86400000) % this.QUOTES.length;
    const quote = this.QUOTES[quoteIdx];

    // Get prompts (user-customizable)
    const customPrompts = await DB.getSetting('customPrompts', null);
    const prompts = (customPrompts && customPrompts.length > 0) ? customPrompts : this.DEFAULT_PROMPTS;
    const promptIdx = today.getDate() % prompts.length;
    const prompt = prompts[promptIdx];

    const currentWorld = AppStore.getState().currentWorld;
    const worldName = currentWorld ? Utils.escHtml(currentWorld.name) : '세계 없음';

    container.innerHTML = `
    <div class="page active" id="page-home">
      <div class="page-header" style="padding-bottom:12px;">
        <!-- Quote banner -->
        <div style="background:linear-gradient(135deg,rgba(0,188,212,0.12),rgba(124,58,237,0.12));border:1px solid rgba(0,188,212,0.25);border-radius:12px;padding:14px 16px;margin-bottom:14px;">
          <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:4px;letter-spacing:0.5px;">✦ 오늘의 명언</div>
          <div style="font-size:14px;font-weight:600;color:var(--color-text);line-height:1.6;font-style:italic;">"${Utils.escHtml(quote)}"</div>
        </div>

        <!-- Date + streak -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div>
            <p class="page-desc" style="font-size:12px;color:var(--color-text-muted);">${dateStr}</p>
          </div>
          <div class="streak-badge" title="${streak.count}일 연속"
            style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 14px;background:var(--color-surface2);border-radius:12px;border:1px solid ${streak.count > 0 ? 'rgba(249,115,22,0.4)' : 'var(--color-border)'};">
            <span style="font-size:20px;">🔥</span>
            <span style="font-size:18px;font-weight:700;color:${streak.count > 0 ? '#f97316' : 'var(--color-text-muted)'};">${streak.count}</span>
            <span style="font-size:10px;color:var(--color-text-muted);">일 연속</span>
          </div>
        </div>

        <!-- World selector -->
        <div class="world-selector-bar" style="margin-top:10px;">
          <div style="display:flex;gap:8px;align-items:center;">
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
      </div>

      <!-- Streak reminder -->
      <div id="streakNotif" style="display:none;background:linear-gradient(135deg,rgba(249,115,22,0.15),rgba(239,68,68,0.15));border:1px solid rgba(249,115,22,0.3);border-radius:8px;padding:12px 16px;margin-bottom:14px;">
        <div style="font-weight:700;font-size:13px;color:#f97316;">🔥 오늘 아직 작성하지 않으셨습니다!</div>
        <div style="font-size:12px;color:var(--color-text-muted);margin-top:3px;">소설 작성 또는 항목 편집 시 연속 기록이 갱신됩니다.</div>
      </div>

      <!-- Daily prompt -->
      <div style="background:var(--color-surface2);border-left:3px solid var(--color-primary);border-radius:8px;padding:12px 16px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;">📝 오늘의 작성 과제</div>
          <button class="btn btn-ghost btn-sm" id="btnEditPrompts" style="font-size:10px;padding:2px 6px;">편집</button>
        </div>
        <div style="font-weight:600;color:var(--color-text);font-size:13px;">${Utils.escHtml(prompt)}</div>
        <div style="font-size:11px;color:var(--color-text-dim);margin-top:4px;">매일 아이디어를 조금씩 채워나가세요</div>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px;">
        <div onclick="AppRouter.navigate('characters')" style="cursor:pointer;background:var(--color-surface2);border-radius:12px;padding:14px;text-align:center;border:1px solid var(--color-border);">
          <div style="font-size:11px;color:var(--color-text-muted);">캐릭터</div>
          <div style="font-size:28px;font-weight:800;color:var(--color-primary);">${chars.length}</div>
          <div style="font-size:10px;color:var(--color-text-dim);">명</div>
        </div>
        <div onclick="AppRouter.navigate('skills')" style="cursor:pointer;background:var(--color-surface2);border-radius:12px;padding:14px;text-align:center;border:1px solid var(--color-border);">
          <div style="font-size:11px;color:var(--color-text-muted);">스킬</div>
          <div style="font-size:28px;font-weight:800;color:var(--color-secondary);">${skills.length}</div>
          <div style="font-size:10px;color:var(--color-text-dim);">개</div>
        </div>
        <div onclick="AppRouter.navigate('items')" style="cursor:pointer;background:var(--color-surface2);border-radius:12px;padding:14px;text-align:center;border:1px solid var(--color-border);">
          <div style="font-size:11px;color:var(--color-text-muted);">아이템</div>
          <div style="font-size:28px;font-weight:800;color:var(--color-accent);">${items.length}</div>
          <div style="font-size:10px;color:var(--color-text-dim);">개</div>
        </div>
        <div onclick="AppRouter.navigate('monsters')" style="cursor:pointer;background:var(--color-surface2);border-radius:12px;padding:14px;text-align:center;border:1px solid var(--color-border);">
          <div style="font-size:11px;color:var(--color-text-muted);">몬스터</div>
          <div style="font-size:28px;font-weight:800;color:var(--color-warning);">${monsters.length}</div>
          <div style="font-size:10px;color:var(--color-text-dim);">개</div>
        </div>
        <div onclick="AppRouter.navigate('organizations')" style="cursor:pointer;background:var(--color-surface2);border-radius:12px;padding:14px;text-align:center;border:1px solid var(--color-border);">
          <div style="font-size:11px;color:var(--color-text-muted);">조직</div>
          <div style="font-size:28px;font-weight:800;color:#10b981;">${orgs.length}</div>
          <div style="font-size:10px;color:var(--color-text-dim);">개</div>
        </div>
        <div onclick="AppRouter.navigate('gates')" style="cursor:pointer;background:var(--color-surface2);border-radius:12px;padding:14px;text-align:center;border:1px solid var(--color-border);">
          <div style="font-size:11px;color:var(--color-text-muted);">게이트</div>
          <div style="font-size:28px;font-weight:800;color:#8b5cf6;">${gates.length}</div>
          <div style="font-size:10px;color:var(--color-text-dim);">개</div>
        </div>
      </div>

      <!-- Quick access -->
      <div style="font-weight:700;font-size:13px;color:var(--color-text-muted);margin-bottom:8px;">빠른 접근</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
        ${[
          ['novel-view', '✍️', '소설 작성'],
          ['characters', '👤', '캐릭터'],
          ['skills', '⚡', '스킬'],
          ['gates', '🌀', '게이트'],
          ['tower', '🏰', '탑 관리'],
          ['timeline', '📅', '타임라인'],
          ['event-graph', '🕸️', '사건 그래프'],
          ['constellations', '⭐', '성좌'],
          ['world-rules', '📜', '세계관 규칙'],
          ['organizations', '🏛️', '조직'],
          ['items', '📦', '아이템'],
          ['world', '🌍', '세계 관리'],
        ].map(([page, icon, name]) => `
          <button onclick="AppRouter.navigate('${page}')"
            style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:12px;padding:12px 6px;cursor:pointer;transition:background 0.15s;min-height:70px;">
            <div style="font-size:22px;">${icon}</div>
            <div style="font-size:11px;font-weight:700;color:var(--color-text);">${name}</div>
          </button>
        `).join('')}
      </div>

      <!-- Recent items -->
      <div style="font-weight:700;font-size:13px;color:var(--color-text-muted);margin-bottom:8px;">최근 수정</div>
      <div id="recentItemsList"></div>
    </div>`;

    // World selector event
    document.getElementById('worldSelect')?.addEventListener('change', async e => {
      await AppStore.setCurrentWorld(e.target.value);
      Utils.toast('세계 변경됨', 'success');
      this.init(container);
    });

    // Edit prompts
    document.getElementById('btnEditPrompts')?.addEventListener('click', () => this._openPromptsEditor(prompts, container));

    // Recent items
    this._loadRecent(chars, skills, items, events);

    // Streak notification
    const streakState = AppStore.getState().streak || {};
    const todayKey = new Date().toISOString().slice(0, 10);
    if (streakState.lastDate !== todayKey) {
      const notif = document.getElementById('streakNotif');
      if (notif) notif.style.display = 'block';
    }

    await AppStore.updateStreak();
  },

  _openPromptsEditor: async function(prompts, container) {
    let list = [...prompts];
    const renderItems = () => list.map((p, i) => `
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
        <span style="min-width:22px;color:var(--color-text-muted);font-size:12px;">${i+1}.</span>
        <input class="input-field prompt-input" value="${Utils.escHtml(p)}"
          style="flex:1;padding:6px 10px;font-size:13px;" data-idx="${i}" />
        <button class="btn btn-ghost btn-sm btn-del-prompt" data-idx="${i}"
          style="color:var(--color-danger);font-size:11px;padding:4px 8px;">✕</button>
      </div>`).join('');

    const body = `
      <div>
        <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:10px;">매일 날짜에 맞춰 순환 표시됩니다. 추가/삭제 가능합니다.</div>
        <div id="promptsList">${renderItems()}</div>
        <button class="btn btn-ghost btn-sm" id="btnAddPromptItem" style="width:100%;margin-top:8px;">+ 과제 추가</button>
      </div>`;

    Utils.openModal('작성 과제 편집', body, async () => {
      const inputs = [...document.querySelectorAll('#globalModalBody .prompt-input')];
      const saved = inputs.map(inp => inp.value.trim()).filter(Boolean);
      if (saved.length === 0) { Utils.toast('과제가 없습니다', 'error'); return false; }
      await DB.setSetting('customPrompts', saved);
      Utils.toast('과제 목록 저장됨', 'success');
      this.init(container);
      return true;
    }, '저장');

    setTimeout(() => {
      const listEl = document.getElementById('promptsList');
      document.getElementById('btnAddPromptItem')?.addEventListener('click', () => {
        list.push('');
        if (listEl) listEl.innerHTML = renderItems();
        this._bindPromptsEditorEvents(list, listEl, renderItems);
      });
      this._bindPromptsEditorEvents(list, listEl, renderItems);
    }, 60);
  },

  _bindPromptsEditorEvents: function(list, listEl, renderItems) {
    if (!listEl) return;
    listEl.querySelectorAll('.btn-del-prompt').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        // Save current input values first
        listEl.querySelectorAll('.prompt-input').forEach((inp, i) => { if (list[i] !== undefined) list[i] = inp.value; });
        list.splice(idx, 1);
        listEl.innerHTML = renderItems();
        this._bindPromptsEditorEvents(list, listEl, renderItems);
      };
    });
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
        <div class="empty-state" style="padding:24px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">📝</div>
          <div style="font-weight:700;margin-bottom:4px;">아직 항목이 없습니다</div>
          <div style="font-size:12px;color:var(--color-text-muted);">캐릭터, 스킬, 아이템 등을 추가하면 표시됩니다</div>
        </div>`;
      return;
    }

    el.innerHTML = all.map(item => `
      <button onclick="AppRouter.navigate('${item._page}', {highlightId:'${Utils.escHtml(item.id)}'})"
        style="width:100%;display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--color-surface2);border-radius:10px;border:1px solid var(--color-border);margin-bottom:6px;cursor:pointer;text-align:left;">
        <span style="font-size:18px;">${item._icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(item.name || '(이름 없음)')}</div>
          <div style="font-size:11px;color:var(--color-text-muted);">${item._type} · ${Utils.formatDate(item.updatedAt)}</div>
        </div>
        <span style="font-size:16px;color:var(--color-text-muted);">›</span>
      </button>
    `).join('');
  },

  destroy: function() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }
};
