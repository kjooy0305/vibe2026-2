'use strict';
window.Pages = window.Pages || {};
window.Pages.characters = {
  _currentId: null,
  _view: 'list',
  _container: null,
  _listScrollY: 0,

  BASE_STATS: ['힘', '민첩', '체력'],
  HIDDEN_STATS: [
    { group: '힘 특화', stats: ['근력', '각력', '악력', '폭력'] },
    { group: '민첩 특화', stats: ['신속', '반응', '회피'] },
    { group: '체력 특화', stats: ['인내', '노력', '내구', '방어'] },
    { group: '마나 계열', stats: ['마나', '마력', '마기', '신성력', '신력', '카오스', '균형'] },
    { group: '정신 계열', stats: ['투지', '정신력', '집중력'] },
    { group: '기타', stats: ['재능', '잠재력', '행운', '감각', '혈류', '신앙'] },
  ],

  init: async function(container, options) {
    options = options || {};
    this._container = container;
    const wid = AppStore.getCurrentWorldId();
    const world = AppStore.getState().currentWorld;

    if (!wid) {
      container.innerHTML = `
        <div class="empty-state" style="padding:48px;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">🌍</div>
          <div style="font-weight:700;font-size:16px;margin-bottom:4px;">세계를 먼저 선택하세요</div>
          <div style="font-size:13px;color:var(--color-text-muted);">홈에서 세계를 선택하거나 새로 만드세요</div>
          <button class="btn btn-primary" style="margin-top:16px;" onclick="AppRouter.navigate('world')">세계 관리</button>
        </div>`;
      return;
    }

    const chars = await DB.getAll('characters', wid);
    if (options.highlightId) this._currentId = options.highlightId;

    if (this._currentId) {
      const char = chars.find(c => c.id === this._currentId);
      if (char) { this._renderDetail(container, char, wid); return; }
    }

    this._renderList(container, chars, wid, world);
  },

  _renderList: function(container, chars, wid, world) {
    this._currentId = null;
    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">캐릭터</h2>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-primary btn-sm" id="btnAddChar">+ 추가</button>
          </div>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          ${Utils.escHtml(world?.name || '현재 세계')} · ${chars.length}명
        </p>
        <div style="display:flex;gap:6px;align-items:center;margin-top:8px;flex-wrap:wrap;">
          <input class="input-field" id="charFilter" placeholder="이름, 종족, 국가, 지역, 길드 검색..." style="flex:1;min-width:0;" />
          <select class="select-input" id="charSort" style="width:auto;font-size:12px;padding:6px 8px;">
            <option value="created">등록순</option>
            <option value="name">이름순</option>
            <option value="level">레벨순</option>
            <option value="importance">중요도순</option>
          </select>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;">
          <button class="char-imp-chip active" data-imp="" style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:11px;cursor:pointer;background:var(--color-primary);color:#000;">전체</button>
          <button class="char-imp-chip" data-imp="main" style="padding:2px 8px;border-radius:4px;border:1px solid #fbbf24;color:#fbbf24;font-size:11px;cursor:pointer;background:transparent;">★ 주요</button>
          <button class="char-imp-chip" data-imp="sub" style="padding:2px 8px;border-radius:4px;border:1px solid #94a3b8;color:#94a3b8;font-size:11px;cursor:pointer;background:transparent;">☆ 서브</button>
          <span style="color:var(--color-border);font-size:11px;align-self:center;">|</span>
          <button class="char-gender-chip active" data-gender="" style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:11px;cursor:pointer;background:transparent;color:var(--color-text-muted);">성별전체</button>
          <button class="char-gender-chip" data-gender="남" style="padding:2px 8px;border-radius:4px;border:1px solid #60a5fa;color:#60a5fa;font-size:11px;cursor:pointer;background:transparent;">남</button>
          <button class="char-gender-chip" data-gender="여" style="padding:2px 8px;border-radius:4px;border:1px solid #f472b6;color:#f472b6;font-size:11px;cursor:pointer;background:transparent;">여</button>
        </div>
        <div id="searchHistoryDropdown" style="display:none;position:relative;z-index:10;"></div>
      </div>

      <div id="charList" class="item-list">
        ${chars.length === 0 ? `
          <div class="empty-state" style="padding:48px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">👤</div>
            <div style="font-weight:700;font-size:16px;margin-bottom:4px;">캐릭터가 없습니다</div>
            <div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 첫 캐릭터를 등록하세요</div>
          </div>
        ` : chars.map(c => this._charCard(c)).join('')}
      </div>
    </div>`;

    document.getElementById('btnAddChar')?.addEventListener('click', () => {
      this._openForm(null, wid, container);
    });

    const self = this;
    let activeImp = '';
    let activeGender = '';

    // ── Search history ─────────────────────────────────────────
    const HIST_KEY = 'charSearchHistory_' + wid;
    const getHist = () => { try { return JSON.parse(sessionStorage.getItem(HIST_KEY) || '[]'); } catch { return []; } };
    const saveHist = (q) => {
      if (!q.trim()) return;
      const h = [q.trim(), ...getHist().filter(x => x !== q.trim())].slice(0, 6);
      sessionStorage.setItem(HIST_KEY, JSON.stringify(h));
    };
    const showHistDropdown = () => {
      const hist = getHist();
      const drop = document.getElementById('searchHistoryDropdown');
      if (!drop) return;
      if (!hist.length) { drop.style.display = 'none'; return; }
      drop.style.display = 'block';
      drop.innerHTML = `
        <div style="background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;padding:6px;margin-top:4px;">
          <div style="font-size:10px;color:var(--color-text-dim);margin-bottom:4px;padding:0 4px;">최근 검색</div>
          ${hist.map(h => `
            <div class="hist-chip" style="padding:4px 8px;border-radius:4px;font-size:12px;cursor:pointer;color:var(--color-text-muted);"
              data-hist="${Utils.escHtml(h)}">${Utils.escHtml(h)}</div>`).join('')}
        </div>`;
      drop.querySelectorAll('.hist-chip').forEach(chip => {
        chip.addEventListener('mousedown', e => {
          e.preventDefault();
          const filterEl = document.getElementById('charFilter');
          if (filterEl) { filterEl.value = chip.dataset.hist; filterEl.dispatchEvent(new Event('input')); }
          drop.style.display = 'none';
        });
      });
    };

    const applySort = () => {
      const sort = document.getElementById('charSort')?.value || 'name';
      const q = (document.getElementById('charFilter')?.value || '').toLowerCase();
      const listEl = document.getElementById('charList');
      if (!listEl) return;
      let sorted = [...chars];
      if (sort === 'name') sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
      else if (sort === 'level') sorted.sort((a, b) => (b.level || 0) - (a.level || 0));
      else if (sort === 'importance') sorted.sort((a, b) => {
        const imp = { main: 0, sub: 1, '': 2 };
        return (imp[a.importance || ''] ?? 2) - (imp[b.importance || ''] ?? 2);
      });
      listEl.innerHTML = sorted.length === 0
        ? '<div class="empty-state" style="padding:48px;text-align:center;"><div style="font-size:48px;">👤</div><div>캐릭터가 없습니다</div></div>'
        : sorted.map(c => self._charCard(c)).join('');
      listEl.querySelectorAll('.char-card').forEach(card => {
        const text = card.dataset.searchText || '';
        const ch = chars.find(c => c.id === card.dataset.id);
        const impOk = !activeImp || ch?.importance === activeImp;
        const genderOk = !activeGender || ch?.gender === activeGender;
        card.style.display = (Utils.matchesQuery(text, q) && impOk && genderOk) ? '' : 'none';
        card.addEventListener('click', e => {
          if (e.target.closest('.btn-del-char') || e.target.closest('.btn-copy-char')) return;
          const id = card.dataset.id;
          self._listScrollY = container.scrollTop || window.scrollY || 0;
          self._currentId = id;
          DB.getAll('characters', wid).then(allChars => {
            const found = allChars.find(c => c.id === id);
            if (found) self._renderDetail(container, found, wid);
          });
        });
        card.querySelector('.btn-del-char')?.addEventListener('click', e => {
          e.stopPropagation();
          const id = card.dataset.id;
          const name = card.querySelector('.char-name')?.textContent || '이 캐릭터';
          Utils.confirmWithInput(
            '캐릭터 삭제',
            `삭제하려면 캐릭터 이름을 정확히 입력하세요.\n삭제 후 되돌릴 수 없습니다.`,
            name,
            async () => {
              await DB.del('characters', id);
              Utils.toast('삭제됨', 'info');
              self.init(container);
            }
          );
        });
        card.querySelector('.btn-copy-char')?.addEventListener('click', async e => {
          e.stopPropagation();
          const char = chars.find(c => c.id === card.dataset.id);
          if (!char) return;
          const worlds = AppStore.getState().worlds.filter(w => w.id !== wid);
          if (!worlds.length) { Utils.toast('다른 세계가 없습니다', 'error'); return; }
          const body = `<div class="form-group"><label class="form-label">복사할 세계 선택</label>
            <select class="select-input" id="copyToWorld" style="width:100%;">
              ${worlds.map(w => `<option value="${Utils.escHtml(w.id)}">${Utils.escHtml(w.name)}</option>`).join('')}
            </select></div>`;
          Utils.openModal('다른 세계로 복사', body, async () => {
            const targetId = document.getElementById('copyToWorld')?.value;
            if (!targetId) return false;
            await DB.put('characters', { ...char, id: DB.genId(), worldId: targetId, createdAt: Date.now(), updatedAt: Date.now() });
            Utils.toast('복사됨', 'success');
            return true;
          }, '복사');
        });
      });
    };

    const filterEl = document.getElementById('charFilter');
    filterEl?.addEventListener('input', () => { applySort(); showHistDropdown(); });
    filterEl?.addEventListener('focus', showHistDropdown);
    filterEl?.addEventListener('blur', () => setTimeout(() => {
      const drop = document.getElementById('searchHistoryDropdown');
      if (drop) drop.style.display = 'none';
    }, 200));
    filterEl?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { saveHist(filterEl.value); showHistDropdown(); }
    });

    document.getElementById('charSort')?.addEventListener('change', applySort);

    container.querySelectorAll('.char-imp-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.char-imp-chip').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = b.dataset.imp === 'main' ? '#fbbf24' : b.dataset.imp === 'sub' ? '#94a3b8' : 'var(--color-text-muted)';
        });
        btn.classList.add('active');
        btn.style.background = btn.dataset.imp === 'main' ? '#fbbf24' : btn.dataset.imp === 'sub' ? '#94a3b8' : 'var(--color-primary)';
        btn.style.color = '#000';
        activeImp = btn.dataset.imp;
        applySort();
      });
    });

    container.querySelectorAll('.char-gender-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.char-gender-chip').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
        });
        btn.classList.add('active');
        btn.style.background = btn.dataset.gender === '남' ? '#60a5fa' : btn.dataset.gender === '여' ? '#f472b6' : 'var(--color-primary)';
        btn.style.color = '#000';
        activeGender = btn.dataset.gender;
        applySort();
      });
    });

    // Default sort: alphabetical by name
    document.getElementById('charSort').value = 'name';
    applySort();
  },

  _charCard: function(c) {
    const searchText = [c.name || '', c.race || '', c.country || '', c.region || '', c.guild || '', c.title || ''].join(' ').toLowerCase();
    const isTemplate = c.charType === 'template';
    const countBadge = '';
    return `
    <div class="list-item list-item--full char-card"
      data-id="${Utils.escHtml(c.id)}"
      data-search-text="${Utils.escHtml(searchText)}"
      style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--color-surface2);border-radius:12px;border:1px solid var(--color-border);${c.importance === 'main' ? 'border-left:3px solid #fbbf24;' : isTemplate ? 'border-left:3px solid #a78bfa;' : ''}margin-bottom:8px;cursor:pointer;">
      ${c.image
        ? `<img src="${c.image}" style="width:48px;height:48px;border-radius:10px;object-fit:cover;flex-shrink:0;" />`
        : `<div style="width:48px;height:48px;border-radius:10px;background:var(--color-surface3,#2a2a3a);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${isTemplate ? '👥' : '👤'}</div>`}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          ${c.importance === 'main' ? `<span style="color:#fbbf24;font-size:14px;">★</span>` : c.importance === 'sub' ? `<span style="color:#94a3b8;font-size:12px;">☆</span>` : ''}
          ${isTemplate ? `<span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(167,139,250,0.2);color:#a78bfa;border:1px solid rgba(167,139,250,0.3);">약식</span>` : ''}
          <span class="char-name" style="font-weight:700;font-size:15px;">${Utils.escHtml(c.name || '이름 없음')}${Utils.escHtml(countBadge)}</span>
          ${c.level ? `<span class="badge" style="font-size:11px;padding:2px 6px;background:var(--color-primary);color:#fff;border-radius:4px;">Lv.${c.level}</span>` : ''}
          ${c.title ? `<span style="font-size:11px;color:var(--color-text-muted);">[${Utils.escHtml(c.title)}]</span>` : ''}
        </div>
        <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">
          ${Utils.escHtml(c.race || '인간')}${c.country ? ' · ' + Utils.escHtml(c.country) : ''}${c.region ? ' · ' + Utils.escHtml(c.region) : ''}${c.age ? ' · ' + c.age + '세' : ''}${c.gender && c.gender !== '미지정' ? ' · ' + Utils.escHtml(c.gender) : ''}
        </div>
        ${c.guild ? `<div style="font-size:11px;color:var(--color-text-dim);">🏰 ${Utils.escHtml(c.guild)}</div>` : ''}
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;flex-direction:column;align-items:flex-end;">
        <button class="btn btn-ghost btn-sm btn-copy-char" data-id="${Utils.escHtml(c.id)}" title="다른 세계로 복사" style="font-size:11px;">복사</button>
        <button class="btn btn-ghost btn-sm btn-del-char" data-id="${Utils.escHtml(c.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  _renderDetail: async function(container, char, wid) {
    // ── 약식 캐릭터 전용 상세 화면 ──────────────────────────────
    if (char.charType === 'template') {
      this._renderTemplateDetail(container, char, wid);
      return;
    }

    const allStats = {};
    if (char.stats) Object.assign(allStats, char.stats);

    // Load linked constellations
    const allConstellations = await DB.getAll('constellations', wid);
    const linkedConstellations = allConstellations.filter(c =>
      (c.contractors || []).includes(char.id) ||
      (c.provisionalContractors || []).includes(char.id)
    );

    const baseStatRows = this.BASE_STATS.map(s => `
      <div class="stat-row" style="display:flex;justify-content:space-between;padding:2px 0;">
        <span class="stat-label" style="color:var(--color-text-muted);">ㄴ${s}</span>
        <span class="stat-val" style="font-weight:600;">${allStats[s] !== undefined ? allStats[s] : '-'}</span>
      </div>`).join('');

    const hiddenStatRows = this.HIDDEN_STATS.map(group => {
      const hasAny = group.stats.some(s => allStats[s] !== undefined);
      if (!hasAny) return '';
      return `
        <div style="margin-top:8px;">
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">[${group.group}]</div>
          ${group.stats.filter(s => allStats[s] !== undefined).map(s => `
            <div class="stat-row" style="display:flex;justify-content:space-between;padding:2px 0;">
              <span class="stat-label" style="color:var(--color-text-muted);">ㄴ${s}</span>
              <span class="stat-val" style="font-weight:600;">${allStats[s]}</span>
            </div>`).join('')}
        </div>`;
    }).join('');

    const skillRow = (sk) => {
      const name = sk.name || sk;
      const grade = sk.grade ? `(${sk.grade})` : '';
      const locked = sk.locked ? ' <span style="color:var(--color-text-dim);">???</span>' : '';
      return `<div class="status-row" style="padding:2px 0;font-size:13px;">ㄴ${Utils.escHtml(name)} ${grade}${locked}</div>`;
    };
    const allSkillsList = char.skills || [];
    const activeSkills = allSkillsList.filter(sk => (sk.type || '').includes('액티브'));
    const passiveSkills = allSkillsList.filter(sk => (sk.type || '').includes('패시브'));
    const otherSkills = allSkillsList.filter(sk => !(sk.type || '').includes('액티브') && !(sk.type || '').includes('패시브'));
    const skillsList = (activeSkills.length || passiveSkills.length || otherSkills.length)
      ? [
          activeSkills.length ? `<div class="status-row" style="font-size:12px;color:rgba(100,180,255,0.7);padding-top:2px;">[액티브]</div>${activeSkills.map(skillRow).join('')}` : '',
          passiveSkills.length ? `<div class="status-row" style="font-size:12px;color:rgba(150,255,180,0.7);padding-top:2px;">[패시브]</div>${passiveSkills.map(skillRow).join('')}` : '',
          otherSkills.length ? otherSkills.map(skillRow).join('') : '',
        ].filter(Boolean).join('')
      : '';

    const achieveList = (char.achievements || []).map(a =>
      `<div class="status-row" style="padding:2px 0;font-size:13px;">ㄴ${Utils.escHtml(a.name || a)}</div>`
    ).join('');

    const customStatRows = (char.customStats || []).map(cs =>
      `<div style="display:flex;justify-content:space-between;padding:2px 0;gap:8px;">
        <span style="color:var(--color-text-muted);">ㄴ${Utils.escHtml(cs.name||'')}</span>
        <span style="font-weight:600;white-space:nowrap;">${Utils.escHtml(String(cs.value||''))}${cs.desc ? ` <span style="font-size:11px;font-weight:400;color:rgba(150,170,200,0.7);">(${Utils.escHtml(cs.desc)})</span>` : ''}</span>
      </div>`
    ).join('');

    const conditionalStatRows = (char.conditionalStats || []).map(cs =>
      `<div style="display:flex;align-items:baseline;padding:2px 0;gap:6px;">
        <span style="color:#fb923c;font-size:11px;flex-shrink:0;">📌</span>
        <span style="color:var(--color-text-muted);font-size:12px;">${Utils.escHtml(cs.condition||'')}${cs.condition?' →':''}</span>
        <span style="font-weight:600;white-space:nowrap;">${Utils.escHtml(cs.stat||'')} ${Number(cs.value)>0?'+':''}${Utils.escHtml(String(cs.value||''))}</span>
      </div>`
    ).join('');

    container.innerHTML = `
    <div class="page active" style="overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;">
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:12px;">
          <button class="btn btn-ghost btn-sm" id="btnBackChars">← 목록</button>
          <h2 class="page-title" style="font-size:18px;">${Utils.escHtml(char.name || '캐릭터')}</h2>
          ${char.level ? `<span class="badge" style="font-size:12px;padding:3px 8px;background:var(--color-primary);color:#fff;border-radius:6px;">Lv.${char.level}</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditChar">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnCopyCharText">상태창 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnExportChar">텍스트 내보내기</button>
          <button class="btn btn-ghost btn-sm" id="btnViewToggle">소설 뷰</button>
        </div>
      </div>

      <!-- Character image -->
      ${char.image ? `
        <div style="text-align:center;margin-bottom:16px;">
          <img src="${char.image}" style="max-width:180px;max-height:200px;border-radius:12px;object-fit:cover;" />
        </div>` : ''}

      <!-- Status window (author view) -->
      <div class="status-window" id="statusWindowAuthor"
        style="background:rgba(30,40,80,0.85);border:1px solid rgba(100,150,255,0.4);border-radius:8px;padding:16px;font-family:monospace;font-size:13px;line-height:1.8;color:#c8d8ff;margin-bottom:16px;">
        <div style="text-align:center;color:rgba(100,150,255,0.7);font-size:11px;margin-bottom:8px;">${'ㅡ'.repeat(16)}</div>
        <div class="status-row">ㅣ레벨: <strong>${char.level || 0}</strong></div>
        ${char.title ? `<div class="status-row">ㅣ칭호: ${Utils.escHtml(char.title)}</div>` : ''}
        <div class="status-row">ㅣ이름: <strong>${Utils.escHtml(char.name || '')}</strong></div>
        ${char.country ? `<div class="status-row">ㅣ국가: ${Utils.escHtml(char.country)}</div>` : ''}
        ${char.region ? `<div class="status-row">ㅣ지역: ${Utils.escHtml(char.region)}</div>` : ''}
        ${char.guild ? `<div class="status-row">ㅣ길드: ${Utils.escHtml(char.guild)}</div>` : ''}
        <div class="status-row">ㅣ종족: ${Utils.escHtml(char.race || '인간')}</div>
        ${char.age ? `<div class="status-row">ㅣ나이: ${char.age}</div>` : ''}
        ${char.gender && char.gender !== '미지정' ? `<div class="status-row">ㅣ성별: ${Utils.escHtml(char.gender)}</div>` : ''}
        ${char.cycle !== null && char.cycle !== undefined && AppFlags.get('useRegression',true) ? `<div class="status-row">ㅣ회귀 회차: ${char.cycle}회차</div>` : ''}
        <div style="color:rgba(100,150,255,0.5);margin:6px 0;">────────────</div>
        ${char.title ? `<div class="status-row" style="color:rgba(200,220,255,0.9);">ㅣ[핵심칭호]</div><div class="status-row">ㄴ${Utils.escHtml(char.title)}</div>` : ''}
        <div class="status-row" style="color:rgba(200,220,255,0.9);">ㅣ[보유칭호]</div>
        ${achieveList || '<div class="status-row" style="color:rgba(150,170,200,0.6);">ㄴ(없음)</div>'}
        ${linkedConstellations.length > 0 ? `
          <div style="color:rgba(100,150,255,0.5);margin:6px 0;">────────────</div>
          <div class="status-row" style="color:rgba(200,220,255,0.9);">ㅣ[성좌 계약]</div>
          ${linkedConstellations.map(c => {
            const isContractor = (c.contractors || []).includes(char.id);
            const status = isContractor ? '계약' : '가계약';
            return `<div class="status-row">ㄴ${Utils.escHtml(c.name || '')} (${status})</div>`;
          }).join('')}` : ''}
        <div style="color:rgba(100,150,255,0.5);margin:6px 0;">────────────</div>
        <div class="status-row" style="color:rgba(200,220,255,0.9);">ㅣ[스텟]</div>
        ${baseStatRows}
        ${hiddenStatRows ? `
          <div style="color:rgba(100,150,255,0.5);margin:6px 0;">────────────</div>
          <div class="status-row" style="color:rgba(200,220,255,0.9);">ㅣ[히든 스텟]</div>
          ${hiddenStatRows}` : ''}
        ${customStatRows ? `
          <div style="color:rgba(100,150,255,0.5);margin:6px 0;">────────────</div>
          <div class="status-row" style="color:rgba(200,220,255,0.9);">ㅣ[커스텀 스텟]</div>
          ${customStatRows}` : ''}
        ${conditionalStatRows ? `
          <div style="color:rgba(100,150,255,0.5);margin:6px 0;">────────────</div>
          <div class="status-row" style="color:rgba(200,220,255,0.9);">ㅣ[조건부 스텟]</div>
          ${conditionalStatRows}` : ''}
        <div style="color:rgba(100,150,255,0.5);margin:6px 0;">────────────</div>
        <div class="status-row" style="color:rgba(200,220,255,0.9);">ㅣ[스킬]</div>
        ${skillsList || '<div class="status-row" style="color:rgba(150,170,200,0.6);">ㄴ(없음)</div>'}
        <div style="text-align:center;color:rgba(100,150,255,0.7);font-size:11px;margin-top:8px;">${'ㅡ'.repeat(16)}</div>
      </div>

      <!-- Hidden (novel view) -->
      <div id="statusWindowNovel" style="display:none;background:linear-gradient(135deg,rgba(20,30,60,0.95),rgba(10,20,50,0.95));border:2px solid rgba(80,120,255,0.6);border-radius:10px;padding:20px;font-size:14px;line-height:2;color:#ddeeff;margin-bottom:16px;box-shadow:0 0 20px rgba(80,120,255,0.2);">
        <div style="text-align:center;font-size:12px;color:rgba(120,160,255,0.6);letter-spacing:4px;margin-bottom:12px;">${'ㅡ'.repeat(14)}</div>
        <div style="text-align:center;font-size:16px;font-weight:700;color:#aaccff;margin-bottom:12px;">[${Utils.escHtml(char.name || '')}의 상태창]</div>
        <div>ㅣ레벨: <strong style="color:#ffe080;">${char.level || 0}</strong></div>
        <div>ㅣ이름: ${Utils.escHtml(char.name || '')}</div>
        ${char.race ? `<div>ㅣ종족: ${Utils.escHtml(char.race)}</div>` : ''}
        ${char.title ? `<div style="margin-top:8px;color:#aaccff;">ㅣ[핵심칭호]</div><div>ㄴ<em style="color:#80ffcc;">${Utils.escHtml(char.title)}</em></div>` : ''}
        ${achieveList ? `<div style="margin-top:8px;color:#aaccff;">ㅣ[보유칭호]</div>${achieveList}` : ''}
        ${linkedConstellations.length > 0 ? `<div style="margin-top:8px;color:#aaccff;">ㅣ[성좌 계약]</div>${linkedConstellations.map(c => `<div>ㄴ${Utils.escHtml(c.name || '')} (${(c.contractors||[]).includes(char.id)?'계약':'가계약'})</div>`).join('')}` : ''}
        <div style="margin-top:8px;color:#aaccff;">ㅣ[스텟]</div>
        ${baseStatRows}
        ${customStatRows ? `<div style="margin-top:8px;color:#aaccff;">ㅣ[커스텀 스텟]</div>${customStatRows}` : ''}
        ${conditionalStatRows ? `<div style="margin-top:8px;color:#aaccff;">ㅣ[조건부 스텟]</div>${conditionalStatRows}` : ''}
        ${skillsList ? `<div style="margin-top:8px;color:#aaccff;">ㅣ[스킬]</div>${skillsList}` : ''}
        <div style="text-align:center;font-size:12px;color:rgba(120,160,255,0.6);letter-spacing:4px;margin-top:12px;">${'ㅡ'.repeat(14)}</div>
      </div>

      <!-- Author memo -->
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px;margin-bottom:12px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:var(--color-text-muted);">작가 메모</div>
        ${char.authorNotes
          ? `<div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(char.authorNotes))}</div>`
          : '<div style="color:var(--color-text-muted);font-size:13px;">메모 없음</div>'}
      </div>

      <!-- Organizations -->
      ${(char.organizations || []).length ? `
        <div style="background:var(--color-surface2);border-radius:10px;padding:14px;margin-bottom:12px;">
          <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:var(--color-text-muted);">소속 단체</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${(char.organizations || []).map(o => `
              <span class="badge" style="background:var(--color-primary);color:#fff;padding:4px 10px;border-radius:8px;font-size:12px;cursor:pointer;"
                onclick="AppRouter.navigate('organizations', {highlightId:'${Utils.escHtml(o.id || '')}'})">${Utils.escHtml(o.name || o)}</span>`).join('')}
          </div>
        </div>` : ''}

      <!-- Skill management -->
      <div style="background:var(--color-surface2);border-radius:10px;padding:14px;margin-bottom:12px;">
        ${(char.mainJob || (char.subJobs || []).length > 0) ? `
        <div style="margin-bottom:12px;">
          <div style="font-weight:700;font-size:13px;color:var(--color-text-muted);margin-bottom:6px;">직업</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${char.mainJob ? `<span style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600;color:#6ee7b7;">⚔️ ${Utils.escHtml(char.mainJob.name || '')} <span style="font-size:10px;opacity:0.7;">(메인)</span></span>` : ''}
            ${(char.subJobs || []).map(sj => `<span style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);padding:4px 10px;border-radius:8px;font-size:12px;color:#6ee7b7;">${Utils.escHtml(sj.name || '')} <span style="font-size:10px;opacity:0.7;">(서브)</span></span>`).join('')}
          </div>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-weight:700;font-size:13px;color:var(--color-text-muted);">스킬 관리</div>
          <button class="btn btn-ghost btn-sm" id="btnManageSkills">편집</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;" id="charSkillBadges">
          ${(char.skills || []).length === 0
            ? '<span style="font-size:13px;color:var(--color-text-muted);">스킬 없음</span>'
            : (char.skills || []).map(sk => `
                <span style="background:var(--color-surface3,#2a2a3a);border:1px solid var(--color-border);padding:4px 10px;border-radius:8px;font-size:12px;">
                  ⚡ ${Utils.escHtml(sk.name || sk)}${sk.grade ? ` (${sk.grade})` : ''}
                </span>`).join('')}
        </div>
      </div>
    </div>`;

    document.getElementById('btnBackChars')?.addEventListener('click', async () => {
      // If navigated here from another page (e.g. org member link), go back there
      const refRaw = sessionStorage.getItem('orgReferrer');
      if (refRaw) {
        sessionStorage.removeItem('orgReferrer');
        try {
          const ref = JSON.parse(refRaw);
          AppRouter.navigate(ref.page, { highlightId: ref.id });
          return;
        } catch {}
      }
      const scrollY = this._listScrollY || 0;
      this._currentId = null;
      await this.init(container);
      requestAnimationFrame(() => {
        container.scrollTop = scrollY;
        if (scrollY > 0) window.scrollTo(0, scrollY);
      });
    });
    document.getElementById('btnEditChar')?.addEventListener('click', () => this._openForm(char, wid, container));

    document.getElementById('btnCopyCharText')?.addEventListener('click', () => {
      const text = this._statusWindowText(char);
      Utils.copyText(text);
      Utils.toast('상태창 복사됨', 'success');
    });

    document.getElementById('btnExportChar')?.addEventListener('click', () => {
      const text = this._exportChar(char);
      Utils.copyText(text);
      Utils.toast('내보내기 복사됨', 'success');
    });

    let novelView = false;
    document.getElementById('btnViewToggle')?.addEventListener('click', () => {
      novelView = !novelView;
      document.getElementById('statusWindowAuthor').style.display = novelView ? 'none' : 'block';
      document.getElementById('statusWindowNovel').style.display = novelView ? 'block' : 'none';
      document.getElementById('btnViewToggle').textContent = novelView ? '작가 뷰' : '소설 뷰';
    });

    document.getElementById('btnManageSkills')?.addEventListener('click', async () => {
      const allSkillsRaw = await DB.getAll('skills', wid);
      const allSkills = allSkillsRaw.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
      const charSkillIds = new Set((char.skills || []).map(s => s.id || s));
      const skillCheckboxes = allSkills.length === 0
        ? '<div style="color:var(--color-text-muted);">스킬 라이브러리가 비어 있습니다. 먼저 스킬을 추가하세요.</div>'
        : allSkills.map(sk => `
            <label style="display:flex;align-items:center;gap:8px;padding:8px 0;cursor:pointer;border-bottom:1px solid var(--color-border);">
              <input type="checkbox" data-skid="${Utils.escHtml(sk.id)}" ${charSkillIds.has(sk.id) ? 'checked' : ''} />
              <span>⚡ ${Utils.escHtml(sk.name)} ${sk.grade ? `(${sk.grade})` : ''}</span>
            </label>`).join('');

      Utils.openModal('스킬 관리', `<div style="">${skillCheckboxes}</div>`, async () => {
        const selected = [...document.querySelectorAll('input[data-skid]:checked')]
          .map(cb => {
            const sk = allSkills.find(s => s.id === cb.dataset.skid);
            return sk ? { id: sk.id, name: sk.name, grade: sk.grade || '', type: sk.type || '' } : null;
          }).filter(Boolean);
        char.skills = selected;
        char.updatedAt = Date.now();
        await DB.put('characters', char);
        Utils.toast('스킬 저장됨', 'success');
        this._renderDetail(container, char, wid);
        return true;
      }, '저장');
    });
  },

  // ── 약식 캐릭터 상세 ─────────────────────────────────────────────────────────
  _renderTemplateDetail: function(container, char, wid) {
    const self = this;
    const td = char.templateData || {};
    const statRanges = td.statRanges || [];
    const fixedSkills = td.fixedSkills || [];
    const variableSkills = td.variableSkills || [];

    const statRangeRows = statRanges.map(s =>
      `<div style="display:flex;justify-content:space-between;padding:2px 0;">
        <span style="color:rgba(200,210,255,0.7);">ㄴ${Utils.escHtml(s.name||'')}</span>
        <span style="font-weight:600;">${Utils.escHtml(String(s.min||0))} ~ ${Utils.escHtml(String(s.max||0))}</span>
      </div>`
    ).join('');

    const fixedSkillRows = fixedSkills.map(sk =>
      `<div style="padding:2px 0;font-size:13px;">ㄴ⚡ ${Utils.escHtml(sk.name||'')}${sk.grade ? ` (${Utils.escHtml(sk.grade)})` : ''}</div>`
    ).join('');

    const varSkillRows = variableSkills.map(sk =>
      `<div style="padding:2px 0;font-size:13px;">ㄴ🔀 ${Utils.escHtml(sk.name||'')}${sk.grade ? ` (${Utils.escHtml(sk.grade)})` : ''}</div>`
    ).join('');

    container.innerHTML = `
    <div class="page active" style="overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;">
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackChars">← 목록</button>
          <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(167,139,250,0.2);color:#a78bfa;border:1px solid rgba(167,139,250,0.3);">약식</span>
          <h2 class="page-title" style="font-size:18px;">${Utils.escHtml(char.name||'캐릭터')}</h2>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditChar">편집</button>
        </div>
      </div>

      ${char.image ? `<div style="text-align:center;margin-bottom:16px;"><img src="${char.image}" style="max-width:180px;max-height:200px;border-radius:12px;object-fit:cover;" /></div>` : ''}

      <div class="status-window" style="background:rgba(40,30,70,0.85);border:1px solid rgba(167,139,250,0.4);border-radius:8px;padding:16px;font-family:monospace;font-size:13px;line-height:1.8;color:#e0d4ff;margin-bottom:16px;">
        <div style="text-align:center;color:rgba(167,139,250,0.7);font-size:11px;margin-bottom:8px;">${'ㅡ'.repeat(16)}</div>
        ${char.title ? `<div>ㅣ칭호: ${Utils.escHtml(char.title)}</div>` : ''}
        <div>ㅣ이름: <strong>${Utils.escHtml(char.name||'')}</strong></div>
        ${char.country ? `<div>ㅣ국가: ${Utils.escHtml(char.country)}</div>` : ''}
        ${char.guild ? `<div>ㅣ길드: ${Utils.escHtml(char.guild)}</div>` : ''}
        <div>ㅣ종족: ${Utils.escHtml(char.race||'인간')}</div>
        ${char.gender && char.gender !== '미지정' ? `<div>ㅣ성별: ${Utils.escHtml(char.gender)}</div>` : ''}
        <div style="color:rgba(167,139,250,0.5);margin:6px 0;">────────────</div>
        <div style="color:rgba(200,210,255,0.9);">ㅣ[스탯 범위]</div>
        ${statRangeRows || '<div style="color:rgba(150,170,200,0.6);">ㄴ(없음)</div>'}
        <div style="color:rgba(167,139,250,0.5);margin:6px 0;">────────────</div>
        <div style="color:rgba(200,210,255,0.9);">ㅣ[고정 스킬 (필수)]</div>
        ${fixedSkillRows || '<div style="color:rgba(150,170,200,0.6);">ㄴ(없음)</div>'}
        <div style="color:rgba(167,139,250,0.5);margin:6px 0;">────────────</div>
        <div style="color:rgba(200,210,255,0.9);">ㅣ[가변 스킬 (개성)]</div>
        ${varSkillRows || '<div style="color:rgba(150,170,200,0.6);">ㄴ(없음)</div>'}
        <div style="text-align:center;color:rgba(167,139,250,0.7);font-size:11px;margin-top:8px;">${'ㅡ'.repeat(16)}</div>
      </div>

      ${char.authorNotes ? `<div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:16px;">
        <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:4px;">작가 전용 메모</div>
        <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(char.authorNotes))}</div>
      </div>` : ''}
    </div>`;

    document.getElementById('btnBackChars')?.addEventListener('click', async () => {
      const scrollY = self._listScrollY || 0;
      self._currentId = null;
      await self.init(container);
      requestAnimationFrame(() => { container.scrollTop = scrollY; if (scrollY > 0) window.scrollTo(0, scrollY); });
    });
    document.getElementById('btnEditChar')?.addEventListener('click', () => self._openForm(char, wid, container));
  },

  _statusWindowText: function(char) {
    const stats = char.stats || {};
    let text = 'ㅡ'.repeat(16) + '\n';
    text += `ㅣ레벨:${char.level || 0}\n`;
    text += `ㅣ이름:${char.name || ''}\n`;
    if (char.country) text += `ㅣ국가:${char.country}\n`;
    if (char.guild) text += `ㅣ길드:${char.guild}\n`;
    text += `ㅣ종족:${char.race || '인간'}\n`;
    if (char.age) text += `ㅣ나이:${char.age}\n`;
    if (char.gender && char.gender !== '미지정') text += `ㅣ성별:${char.gender}\n`;
    if (char.cycle !== null && char.cycle !== undefined) text += `ㅣ회귀 회차:${char.cycle}회차\n`;
    if (char.title) { text += `ㅣ[핵심칭호]\n`; text += `ㄴ${char.title}\n`; }
    text += `ㅣ[보유칭호]\n`;
    (char.achievements || []).forEach(a => { text += `ㄴ${a.name || a}\n`; });
    text += `ㅣ[스텟]\n`;
    this.BASE_STATS.forEach(s => { if (stats[s] !== undefined) text += `ㄴ${s}:${stats[s]}\n`; });
    const hasHidden = this.HIDDEN_STATS.some(g => g.stats.some(s => stats[s] !== undefined));
    if (hasHidden) {
      text += `ㅣ[히든 스텟]\n`;
      this.HIDDEN_STATS.forEach(group => {
        group.stats.forEach(s => { if (stats[s] !== undefined) text += `ㄴ${s}:${stats[s]}\n`; });
      });
    }
    if ((char.customStats || []).length > 0) {
      text += `ㅣ[커스텀 스텟]\n`;
      char.customStats.forEach(cs => {
        text += `ㄴ${cs.name}:${cs.value}${cs.desc ? ` (${cs.desc})` : ''}\n`;
      });
    }
    if ((char.conditionalStats || []).length > 0) {
      text += `ㅣ[조건부 스텟]\n`;
      char.conditionalStats.forEach(cs => {
        text += `ㄴ${cs.condition?cs.condition+' → ':''}${cs.stat} ${Number(cs.value)>0?'+':''}${cs.value}\n`;
      });
    }
    text += `ㅣ[스킬]\n`;
    (char.skills || []).forEach(sk => { text += `ㄴ${sk.name || sk}${sk.grade ? `(${sk.grade})` : ''}\n`; });
    text += 'ㅡ'.repeat(16);
    return text;
  },

  _exportChar: function(char) {
    const stats = char.stats || {};
    return Utils.toTextExport(`캐릭터: ${char.name}`, [
      ['레벨', char.level],
      ['칭호', char.title],
      ['이름', char.name],
      ['국가', char.country],
      ['종족', char.race],
      ['나이', char.age],
      ['성별', char.gender],
      ['길드', char.guild],
      ['회귀 회차', char.cycle !== null && char.cycle !== undefined ? `${char.cycle}회차` : ''],
      ['스텟', Object.entries(stats).map(([k, v]) => `${k}:${v}`).join(', ')],
      ['스킬', (char.skills || []).map(s => s.name || s).join(', ')],
      ['업적', (char.achievements || []).map(a => a.name || a).join(', ')],
      ['소속', (char.organizations || []).map(o => o.name || o).join(', ')],
      ['작가 메모', char.authorNotes],
    ]);
  },

};
