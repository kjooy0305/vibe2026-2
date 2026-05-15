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
    const countBadge = isTemplate && c.templateData?.count ? ` ×${c.templateData.count}` : '';
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
        ${char.cycle !== null && char.cycle !== undefined ? `<div class="status-row">ㅣ회귀 회차: ${char.cycle}회차</div>` : ''}
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
          ${td.count ? `<span class="badge" style="font-size:12px;padding:3px 8px;background:#a78bfa;color:#fff;border-radius:6px;">×${td.count}</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditChar">편집</button>
        </div>
      </div>

      ${char.image ? `<div style="text-align:center;margin-bottom:16px;"><img src="${char.image}" style="max-width:180px;max-height:200px;border-radius:12px;object-fit:cover;" /></div>` : ''}

      <div class="status-window" style="background:rgba(40,30,70,0.85);border:1px solid rgba(167,139,250,0.4);border-radius:8px;padding:16px;font-family:monospace;font-size:13px;line-height:1.8;color:#e0d4ff;margin-bottom:16px;">
        <div style="text-align:center;color:rgba(167,139,250,0.7);font-size:11px;margin-bottom:8px;">${'ㅡ'.repeat(16)}</div>
        ${char.title ? `<div>ㅣ칭호: ${Utils.escHtml(char.title)}</div>` : ''}
        <div>ㅣ이름: <strong>${Utils.escHtml(char.name||'')}</strong>${td.count ? ` (${td.count}명)` : ''}</div>
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

  _openForm: async function(char, wid, container) {
    const isEdit = !!char;
    const stats = char?.stats || {};
    const isTemplate = char?.charType === 'template';

    // Load constellations, stat definitions, and skills
    const [allConsts, statNames, allSkillsRaw] = await Promise.all([
      DB.getAll('constellations', wid),
      window.StatDefs ? window.StatDefs.loadNames(wid) : Promise.resolve([]),
      DB.getAll('skills', wid),
    ]);
    const allSkillsSorted = allSkillsRaw.slice().sort((a, b) => (a.name||'').localeCompare(b.name||'', 'ko'));

    // ── 약식 캐릭터 전용 state ──
    const td = char?.templateData || {};
    let tplStatRanges = (td.statRanges || []).map(s => ({ ...s }));
    let tplFixedSkills = [...(td.fixedSkills || [])];
    let tplVarSkills = [...(td.variableSkills || [])];

    const syncTplStatsFromDOM = () => {
      document.querySelectorAll('#tplStatRows .tstat-row').forEach(el => {
        const i = parseInt(el.dataset.idx, 10);
        if (tplStatRanges[i]) {
          tplStatRanges[i].name = el.querySelector('.tstat-name')?.value || '';
          tplStatRanges[i].min = Number(el.querySelector('.tstat-min')?.value || 0);
          tplStatRanges[i].max = Number(el.querySelector('.tstat-max')?.value || 0);
        }
      });
    };
    const renderTplStatRows = () => tplStatRanges.map((s, i) => `
      <div class="tstat-row" data-idx="${i}" style="display:grid;grid-template-columns:1fr 70px 70px auto;gap:4px;align-items:center;margin-bottom:4px;">
        <input class="input-field tstat-name" value="${Utils.escHtml(s.name||'')}" placeholder="스탯명" style="box-sizing:border-box;font-size:13px;" />
        <input type="number" class="input-field tstat-min" value="${s.min||0}" placeholder="최소" style="box-sizing:border-box;font-size:12px;" />
        <input type="number" class="input-field tstat-max" value="${s.max||0}" placeholder="최대" style="box-sizing:border-box;font-size:12px;" />
        <button type="button" class="tstat-del btn btn-ghost btn-sm" data-idx="${i}" style="color:var(--color-danger);font-size:11px;">✕</button>
      </div>`).join('') || '<div style="font-size:12px;color:var(--color-text-dim);text-align:center;padding:4px;">스탯 없음</div>';

    const skillChipHtml = (sk, listId) => `
      <span class="tskill-chip" data-skid="${Utils.escHtml(sk.id)}" data-list="${listId}"
        style="display:inline-flex;align-items:center;gap:4px;background:${listId==='fixed'?'rgba(99,102,241,0.15)':'rgba(251,146,60,0.15)'};border:1px solid ${listId==='fixed'?'rgba(99,102,241,0.35)':'rgba(251,146,60,0.35)'};border-radius:6px;padding:3px 8px;font-size:12px;">
        ${listId==='fixed'?'⚡':'🔀'} ${Utils.escHtml(sk.name||'')}${sk.grade?` (${Utils.escHtml(sk.grade)})`:''}<button class="tskill-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:12px;padding:0 2px;">✕</button>
      </span>`;

    const renderSkillChips = (listId) => (listId === 'fixed' ? tplFixedSkills : tplVarSkills).map(sk => skillChipHtml(sk, listId)).join('');

    const templateSection = `
      <div id="tplSection" style="${isTemplate?'':'display:none;'}">
        <div style="font-size:12px;color:#a78bfa;font-weight:700;padding:6px 10px;background:rgba(167,139,250,0.1);border-radius:6px;margin-bottom:8px;">약식 캐릭터 설정</div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">수량</label>
          <input type="number" class="input-field" id="fTplCount" value="${td.count || ''}" placeholder="몇 명인지 (예: 10)" style="width:140px;box-sizing:border-box;" />
        </div>
        <div class="form-group" style="border:1px solid rgba(167,139,250,0.3);border-radius:8px;padding:10px 12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <label class="form-label" style="margin:0;font-size:13px;font-weight:600;">스탯 범위</label>
            <button type="button" id="btnAddTplStat" class="btn btn-ghost btn-sm" style="font-size:11px;">+ 추가</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 70px 70px auto;gap:4px;margin-bottom:4px;">
            <span style="font-size:10px;color:var(--color-text-dim);">스탯명</span>
            <span style="font-size:10px;color:var(--color-text-dim);">최소</span>
            <span style="font-size:10px;color:var(--color-text-dim);">최대</span>
            <span></span>
          </div>
          <div id="tplStatRows">${renderTplStatRows()}</div>
        </div>
        <div class="form-group" style="border:1px solid rgba(99,102,241,0.3);border-radius:8px;padding:10px 12px;">
          <label class="form-label" style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;">⚡ 고정 스킬 <span style="font-weight:400;font-size:11px;color:var(--color-text-muted);">(필수 보유)</span></label>
          <div id="tplFixedChips" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;margin-bottom:6px;">${renderSkillChips('fixed')}</div>
          <div style="position:relative;">
            <input class="input-field" id="tplFixedSearch" placeholder="스킬 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="tplFixedResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:140px;overflow-y:auto;top:100%;left:0;"></div>
          </div>
        </div>
        <div class="form-group" style="border:1px solid rgba(251,146,60,0.3);border-radius:8px;padding:10px 12px;">
          <label class="form-label" style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;">🔀 가변 스킬 <span style="font-weight:400;font-size:11px;color:var(--color-text-muted);">(개성/선택)</span></label>
          <div id="tplVarChips" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;margin-bottom:6px;">${renderSkillChips('var')}</div>
          <div style="position:relative;">
            <input class="input-field" id="tplVarSearch" placeholder="스킬 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="tplVarResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:140px;overflow-y:auto;top:100%;left:0;"></div>
          </div>
        </div>
      </div>`;

    // Load constellations and stat definitions for linking
    const charStatDatalist = statNames.length
      ? `<datalist id="charStatDatalist">${statNames.map(n=>`<option value="${Utils.escHtml(n)}">`).join('')}</datalist>`
      : '';
    const sortedConsts = allConsts.sort((a, b) => (a.name||'').localeCompare(b.name||'', 'ko'));
    let contractorConstIds = new Set(
      allConsts.filter(c => (c.contractors||[]).includes(char?.id||'')).map(c => c.id)
    );
    let provisionalConstIds = new Set(
      allConsts.filter(c => (c.provisionalContractors||[]).includes(char?.id||'')).map(c => c.id)
    );

    const statInputs = (statList) => statList.map(s => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <label style="width:72px;font-size:13px;flex-shrink:0;color:var(--color-text-muted);">${s}</label>
        <input type="number" class="input-field stat-input" data-stat="${Utils.escHtml(s)}"
          value="${stats[s] !== undefined ? stats[s] : ''}"
          placeholder="-"
          style="flex:1;padding:6px 8px;max-width:120px;" />
      </div>`).join('');

    const hiddenStatInputs = this.HIDDEN_STATS.map(group => `
      <div style="margin-top:12px;">
        <div style="font-size:12px;color:var(--color-text-muted);font-weight:600;margin-bottom:6px;">${group.group}</div>
        ${statInputs(group.stats)}
      </div>`).join('');

    let newImage = char?.image || null;

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">
        <!-- 캐릭터 유형 선택 -->
        <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:8px;display:block;">캐릭터 유형</label>
          <div style="display:flex;gap:12px;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;">
              <input type="radio" name="charTypeSel" value="normal" ${!isTemplate?'checked':''} /> 일반 캐릭터
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:#a78bfa;">
              <input type="radio" name="charTypeSel" value="template" ${isTemplate?'checked':''} /> 약식 캐릭터
            </label>
          </div>
          <div style="font-size:11px;color:var(--color-text-dim);margin-top:6px;">약식: 스탯을 범위로 입력하고 고정/가변 스킬을 지정합니다.</div>
        </div>
        ${templateSection}
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">이미지</label>
          <div id="charImgPreview" style="margin-bottom:6px;">
            ${char?.image ? `<img src="${char.image}" style="max-width:120px;border-radius:8px;" />` : ''}
          </div>
          <input type="file" id="charImageFile" accept="image/*" style="font-size:13px;" />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">이름 *</label>
          <input class="input-field" id="fCharName" value="${Utils.escHtml(char?.name || '')}" placeholder="이름" style="width:100%;box-sizing:border-box;" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">레벨</label>
            <input type="number" class="input-field" id="fCharLevel" value="${char?.level || 0}" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">회귀 회차</label>
            <input type="number" class="input-field" id="fCharCycle" value="${char?.cycle !== null && char?.cycle !== undefined ? char.cycle : ''}" placeholder="0" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">칭호</label>
          <input class="input-field" id="fCharTitle" value="${Utils.escHtml(char?.title || '')}" placeholder="칭호" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">중요도</label>
          <select class="select-input" id="fCharImportance" style="width:100%;">
            <option value="" ${!char?.importance ? 'selected' : ''}>일반</option>
            <option value="main" ${char?.importance === 'main' ? 'selected' : ''}>★ 주요 캐릭터</option>
            <option value="sub" ${char?.importance === 'sub' ? 'selected' : ''}>☆ 서브 캐릭터</option>
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">국가</label>
            <input class="input-field" id="fCharCountry" value="${Utils.escHtml(char?.country || '')}" placeholder="국가" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">지역</label>
            <input class="input-field" id="fCharRegion" value="${Utils.escHtml(char?.region || '')}" placeholder="지역/도시" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">길드</label>
            <input class="input-field" id="fCharGuild" value="${Utils.escHtml(char?.guild || '')}" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">종족</label>
            <input class="input-field" id="fCharRace" value="${Utils.escHtml(char?.race || '인간')}" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">나이</label>
            <input type="number" class="input-field" id="fCharAge" value="${char?.age || ''}" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">성별</label>
            <select class="select-input" id="fCharGender" style="width:100%;">
              <option ${!char?.gender || char?.gender === '미지정' ? 'selected' : ''}>미지정</option>
              <option ${char?.gender === '남' ? 'selected' : ''}>남</option>
              <option ${char?.gender === '여' ? 'selected' : ''}>여</option>
              <option ${char?.gender === '기타' ? 'selected' : ''}>기타</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:8px;display:block;">기본 스텟</label>
          ${statInputs(this.BASE_STATS)}
        </div>
        <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <label class="form-label" style="font-size:13px;font-weight:600;margin:0;">커스텀 스텟</label>
            <button type="button" id="btnAddCustomStat" class="btn btn-ghost btn-sm" style="font-size:11px;">+ 추가</button>
          </div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:8px;">스텟명·수치·보조설명 자유 입력</div>
          <div style="display:grid;grid-template-columns:auto 1fr 1fr auto;gap:4px;margin-bottom:4px;padding:0 2px;">
            <span></span>
            <span style="font-size:10px;color:var(--color-text-dim);">스텟명</span>
            <span style="font-size:10px;color:var(--color-text-dim);">수치</span>
            <span></span>
          </div>
          ${charStatDatalist}
          <div id="customStatRows">
            ${(char?.customStats || []).map((cs, i) => `
              <div class="cs-row" style="display:grid;grid-template-columns:1fr 80px 1fr auto;gap:4px;margin-bottom:6px;align-items:center;">
                <input class="input-field cs-name" list="charStatDatalist" value="${Utils.escHtml(cs.name||'')}" placeholder="스텟명" style="font-size:12px;padding:5px 8px;" />
                <input class="input-field cs-value" value="${Utils.escHtml(String(cs.value||''))}" placeholder="수치" style="font-size:12px;padding:5px 8px;" />
                <input class="input-field cs-desc" value="${Utils.escHtml(cs.desc||'')}" placeholder="보조 설명(선택)" style="font-size:12px;padding:5px 8px;" />
                <button type="button" class="btn-del-cs" style="background:none;border:1px solid var(--color-border);border-radius:4px;cursor:pointer;color:var(--color-danger);font-size:13px;padding:2px 7px;">✕</button>
              </div>`).join('')}
          </div>
        </div>

        <!-- 조건부 스텟 -->
        <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <label class="form-label" style="margin:0;">조건부 스텟</label>
            <button type="button" id="btnAddCondStat" class="btn btn-ghost btn-sm" style="font-size:11px;">+ 추가</button>
          </div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">예: 하늘을 날 때 이속 +50 / 전투 중 힘 +30</div>
          <div id="condStatRows">
            ${(char?.conditionalStats || []).map(cs => `
              <div class="cond-stat-char-row" style="display:grid;grid-template-columns:1fr 1fr 80px auto;gap:4px;margin-bottom:6px;align-items:center;">
                <input class="input-field csc-cond" value="${Utils.escHtml(cs.condition||'')}" placeholder="조건 (예: 전투 중)" style="font-size:12px;padding:5px 8px;" />
                <input class="input-field csc-name" list="charStatDatalist" value="${Utils.escHtml(cs.stat||'')}" placeholder="스텟명" style="font-size:12px;padding:5px 8px;" />
                <input type="number" class="input-field csc-value" value="${Utils.escHtml(String(cs.value||''))}" placeholder="수치" style="font-size:12px;padding:5px 8px;" />
                <button type="button" class="btn-del-csc" style="background:none;border:1px solid var(--color-border);border-radius:4px;cursor:pointer;color:var(--color-danger);font-size:13px;padding:2px 7px;">✕</button>
              </div>`).join('')}
          </div>
        </div>
        <details style="border:1px solid var(--color-border);border-radius:8px;padding:8px 12px;">
          <summary style="cursor:pointer;font-weight:600;font-size:13px;padding:4px 0;list-style:none;">세부 히든 스텟 (클릭하여 펼치기)</summary>
          <div style="margin-top:12px;">${hiddenStatInputs}</div>
        </details>
        ${sortedConsts.length > 0 ? `
        <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:8px;display:block;">성좌 계약</label>
          <div style="margin-bottom:12px;">
            <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:5px;">계약자</div>
            <div id="contractorConstChips" style="display:flex;flex-wrap:wrap;gap:5px;min-height:24px;margin-bottom:5px;">
              ${[...contractorConstIds].map(cid => {
                const c = allConsts.find(x => x.id === cid);
                if (!c) return '';
                return `<span class="const-chip contractor" data-cid="${Utils.escHtml(cid)}"
                  style="display:inline-flex;align-items:center;gap:4px;background:rgba(100,80,200,0.2);border:1px solid rgba(100,80,200,0.5);padding:2px 8px;border-radius:12px;font-size:12px;cursor:pointer;"
                  title="클릭하여 제거">${Utils.escHtml(c.name||'')} ✕</span>`;
              }).join('')}
            </div>
            <div style="position:relative;">
              <input class="input-field" id="contractorConstSearch" placeholder="성좌 이름 검색..." style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="contractorConstResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:150px;overflow-y:auto;"></div>
            </div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:5px;">가계약자</div>
            <div id="provisionalConstChips" style="display:flex;flex-wrap:wrap;gap:5px;min-height:24px;margin-bottom:5px;">
              ${[...provisionalConstIds].map(cid => {
                const c = allConsts.find(x => x.id === cid);
                if (!c) return '';
                return `<span class="const-chip provisional" data-cid="${Utils.escHtml(cid)}"
                  style="display:inline-flex;align-items:center;gap:4px;background:rgba(80,160,200,0.2);border:1px solid rgba(80,160,200,0.5);padding:2px 8px;border-radius:12px;font-size:12px;cursor:pointer;"
                  title="클릭하여 제거">${Utils.escHtml(c.name||'')} ✕</span>`;
              }).join('')}
            </div>
            <div style="position:relative;">
              <input class="input-field" id="provisionalConstSearch" placeholder="성좌 이름 검색..." style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="provisionalConstResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:150px;overflow-y:auto;"></div>
            </div>
          </div>
        </div>` : ''}
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">작가 메모 (작가 뷰에만 표시)</label>
          <textarea class="textarea-field" id="fCharAuthorNotes" rows="3"
            placeholder="히든 스텟 힌트, 복선, 비밀..."
            style="width:100%;box-sizing:border-box;">${Utils.escHtml(char?.authorNotes || '')}</textarea>
        </div>
      </div>
    `;

    Utils.openModal(isEdit ? '캐릭터 편집' : '새 캐릭터', body, async () => {
      const name = document.getElementById('fCharName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }

      const selectedCharType = document.querySelector('[name="charTypeSel"]:checked')?.value || 'normal';
      const isTpl = selectedCharType === 'template';

      // 약식 캐릭터 data 수집
      let templateData = null;
      if (isTpl) {
        syncTplStatsFromDOM();
        const countVal = document.getElementById('fTplCount')?.value;
        templateData = {
          count: countVal ? Number(countVal) : null,
          statRanges: tplStatRanges.filter(s => s.name.trim()),
          fixedSkills: tplFixedSkills,
          variableSkills: tplVarSkills,
        };
      }

      const newStats = {};
      document.querySelectorAll('.stat-input').forEach(inp => {
        if (inp.value !== '' && inp.value !== null) {
          newStats[inp.dataset.stat] = Number(inp.value);
        }
      });

      const cycleVal = document.getElementById('fCharCycle')?.value;
      const ageVal = document.getElementById('fCharAge')?.value;

      // Collect custom stats
      const customStats = [];
      document.querySelectorAll('#globalModalBody .cs-row').forEach(row => {
        const name2 = row.querySelector('.cs-name')?.value.trim();
        const value = row.querySelector('.cs-value')?.value.trim();
        const desc = row.querySelector('.cs-desc')?.value.trim() || '';
        if (name2) customStats.push({ name: name2, value: value || '', desc });
      });

      // Collect conditional stats
      const conditionalStats = [];
      document.querySelectorAll('#globalModalBody .cond-stat-char-row').forEach(row => {
        const cond  = row.querySelector('.csc-cond')?.value.trim();
        const stat  = row.querySelector('.csc-name')?.value.trim();
        const value = row.querySelector('.csc-value')?.value.trim();
        if (stat) conditionalStats.push({ condition: cond||'', stat, value: value||'0' });
      });

      const item = {
        ...(char || {}),
        worldId: wid,
        name,
        charType: isTpl ? 'template' : '',
        templateData: isTpl ? templateData : null,
        level: Number(document.getElementById('fCharLevel')?.value || 0),
        title: document.getElementById('fCharTitle')?.value.trim() || '',
        country: document.getElementById('fCharCountry')?.value.trim() || '',
        region: document.getElementById('fCharRegion')?.value.trim() || '',
        race: document.getElementById('fCharRace')?.value.trim() || '인간',
        age: ageVal ? Number(ageVal) : null,
        gender: document.getElementById('fCharGender')?.value || '미지정',
        guild: document.getElementById('fCharGuild')?.value.trim() || '',
        importance: document.getElementById('fCharImportance')?.value || '',
        cycle: cycleVal !== '' && cycleVal !== null && cycleVal !== undefined ? Number(cycleVal) : null,
        stats: newStats,
        customStats,
        conditionalStats,
        authorNotes: document.getElementById('fCharAuthorNotes')?.value.trim() || '',
        image: newImage,
        skills: char?.skills || [],
        achievements: char?.achievements || [],
        organizations: char?.organizations || [],
        updatedAt: Date.now(),
        createdAt: char?.createdAt || Date.now(),
        id: char?.id || DB.genId(),
      };

      await DB.put('characters', item);

      // Sync constellation contractor/provisional links
      if (sortedConsts.length > 0) {
        const allConstsNow = await DB.getAll('constellations', wid);
        for (const c of allConstsNow) {
          const wasContractor = (c.contractors||[]).includes(item.id);
          const wasProvisional = (c.provisionalContractors||[]).includes(item.id);
          const isNowContractor = contractorConstIds.has(c.id);
          const isNowProvisional = provisionalConstIds.has(c.id);
          if (wasContractor !== isNowContractor || wasProvisional !== isNowProvisional) {
            await DB.put('constellations', {
              ...c,
              contractors: isNowContractor
                ? [...new Set([...(c.contractors||[]), item.id])]
                : (c.contractors||[]).filter(id => id !== item.id),
              provisionalContractors: isNowProvisional
                ? [...new Set([...(c.provisionalContractors||[]), item.id])]
                : (c.provisionalContractors||[]).filter(id => id !== item.id),
              updatedAt: Date.now(),
            });
          }
        }
      }

      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      this._currentId = item.id;
      await AppStore.updateStreak();
      await AppStore.recordActivity('characters', !isEdit);
      const chars = await DB.getAll('characters', wid);
      const updated = chars.find(c => c.id === item.id);
      if (updated) this._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    // Image upload + custom stat editor
    setTimeout(() => {
      document.getElementById('charImageFile')?.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        newImage = await Utils.imageToBase64(file);
        const preview = document.getElementById('charImgPreview');
        if (preview) preview.innerHTML = `<img src="${newImage}" style="max-width:120px;border-radius:8px;margin-bottom:6px;" />`;
      });

      const addCSRow = (name, value, desc) => {
        const rows = document.getElementById('customStatRows');
        if (!rows) return;
        const div = document.createElement('div');
        div.className = 'cs-row';
        div.style.cssText = 'display:grid;grid-template-columns:1fr 80px 1fr auto;gap:4px;margin-bottom:6px;align-items:center;';
        div.innerHTML = `
          <input class="input-field cs-name" list="charStatDatalist" value="${Utils.escHtml(name||'')}" placeholder="스텟명" style="font-size:12px;padding:5px 8px;" />
          <input class="input-field cs-value" value="${Utils.escHtml(String(value||''))}" placeholder="수치" style="font-size:12px;padding:5px 8px;" />
          <input class="input-field cs-desc" value="${Utils.escHtml(desc||'')}" placeholder="보조 설명(선택)" style="font-size:12px;padding:5px 8px;" />
          <button type="button" class="btn-del-cs" style="background:none;border:1px solid var(--color-border);border-radius:4px;cursor:pointer;color:var(--color-danger);font-size:13px;padding:2px 7px;">✕</button>`;
        rows.appendChild(div);
      };

      document.getElementById('btnAddCustomStat')?.addEventListener('click', () => addCSRow('', '', ''));

      document.getElementById('customStatRows')?.addEventListener('click', e => {
        if (e.target.closest('.btn-del-cs')) {
          e.target.closest('.cs-row')?.remove();
        }
      });

      const addCondStatRow = () => {
        const rows = document.getElementById('condStatRows');
        if (!rows) return;
        const div = document.createElement('div');
        div.className = 'cond-stat-char-row';
        div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 80px auto;gap:4px;margin-bottom:6px;align-items:center;';
        div.innerHTML = `
          <input class="input-field csc-cond" placeholder="조건 (예: 전투 중)" style="font-size:12px;padding:5px 8px;" />
          <input class="input-field csc-name" list="charStatDatalist" placeholder="스텟명" style="font-size:12px;padding:5px 8px;" />
          <input type="number" class="input-field csc-value" placeholder="수치" style="font-size:12px;padding:5px 8px;" />
          <button type="button" class="btn-del-csc" style="background:none;border:1px solid var(--color-border);border-radius:4px;cursor:pointer;color:var(--color-danger);font-size:13px;padding:2px 7px;">✕</button>`;
        rows.appendChild(div);
      };
      document.getElementById('btnAddCondStat')?.addEventListener('click', addCondStatRow);
      document.getElementById('condStatRows')?.addEventListener('click', e => {
        if (e.target.closest('.btn-del-csc')) e.target.closest('.cond-stat-char-row')?.remove();
      });

      // ── Constellation linking chip UI ──────────────────────────
      const wireConstSearch = (inputId, resultsId, chipsId, idSet, chipColor) => {
        const input = document.getElementById(inputId);
        const results = document.getElementById(resultsId);
        const chipsEl = document.getElementById(chipsId);
        if (!input || !results || !chipsEl) return;

        const renderChips = () => {
          chipsEl.innerHTML = [...idSet].map(cid => {
            const c = sortedConsts.find(x => x.id === cid);
            if (!c) return '';
            return `<span class="const-chip" data-cid="${Utils.escHtml(cid)}"
              style="display:inline-flex;align-items:center;gap:4px;background:${chipColor.bg};border:1px solid ${chipColor.border};padding:2px 8px;border-radius:12px;font-size:12px;cursor:pointer;"
              title="클릭하여 제거">${Utils.escHtml(c.name||'')} ✕</span>`;
          }).filter(Boolean).join('');
          chipsEl.querySelectorAll('.const-chip').forEach(chip => {
            chip.addEventListener('click', () => {
              idSet.delete(chip.dataset.cid);
              renderChips();
            });
          });
        };
        renderChips();

        input.addEventListener('input', () => {
          const q = input.value.trim().toLowerCase();
          if (!q) { results.style.display = 'none'; return; }
          const matches = sortedConsts.filter(c => !idSet.has(c.id) && (c.name||'').toLowerCase().includes(q)).slice(0, 10);
          if (!matches.length) { results.style.display = 'none'; return; }
          results.style.display = 'block';
          results.innerHTML = matches.map(c => `
            <div class="const-result-row" data-cid="${Utils.escHtml(c.id)}"
              style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">
              ${Utils.escHtml(c.name||'')}${c.series ? `<span style="font-size:11px;color:var(--color-text-dim);margin-left:6px;">${Utils.escHtml(c.series)}</span>` : ''}
            </div>`).join('');
          results.querySelectorAll('.const-result-row').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              idSet.add(row.dataset.cid);
              input.value = '';
              results.style.display = 'none';
              renderChips();
            });
          });
        });
        input.addEventListener('blur', () => setTimeout(() => { results.style.display = 'none'; }, 150));
      };

      wireConstSearch(
        'contractorConstSearch', 'contractorConstResults', 'contractorConstChips',
        contractorConstIds,
        { bg: 'rgba(100,80,200,0.2)', border: 'rgba(100,80,200,0.5)' }
      );
      wireConstSearch(
        'provisionalConstSearch', 'provisionalConstResults', 'provisionalConstChips',
        provisionalConstIds,
        { bg: 'rgba(80,160,200,0.2)', border: 'rgba(80,160,200,0.5)' }
      );

      // ── Template character UI ──────────────────────────────────
      document.querySelectorAll('[name="charTypeSel"]').forEach(r => {
        r.addEventListener('change', () => {
          const tpl = document.getElementById('tplSection');
          if (tpl) tpl.style.display = r.value === 'template' ? 'block' : 'none';
        });
      });

      const rebindTplAll = () => {
        document.querySelectorAll('#tplStatRows .tstat-del').forEach(btn => {
          btn.addEventListener('click', () => {
            syncTplStatsFromDOM();
            tplStatRanges.splice(parseInt(btn.dataset.idx, 10), 1);
            document.getElementById('tplStatRows').innerHTML = renderTplStatRows();
            rebindTplAll();
          });
        });
        document.querySelectorAll('#tplFixedChips .tskill-del, #tplVarChips .tskill-del').forEach(btn => {
          btn.addEventListener('click', () => {
            const chip = btn.closest('.tskill-chip');
            const skid = chip?.dataset.skid;
            const list = chip?.dataset.list;
            if (list === 'fixed') tplFixedSkills = tplFixedSkills.filter(s => s.id !== skid);
            else tplVarSkills = tplVarSkills.filter(s => s.id !== skid);
            chip?.remove();
          });
        });
      };

      document.getElementById('btnAddTplStat')?.addEventListener('click', () => {
        syncTplStatsFromDOM();
        tplStatRanges.push({ name: '', min: 0, max: 0 });
        document.getElementById('tplStatRows').innerHTML = renderTplStatRows();
        rebindTplAll();
      });

      const wireTplSkillSearch = (inputId, resultsId, targetList, chipsId) => {
        const input = document.getElementById(inputId);
        const results = document.getElementById(resultsId);
        if (!input || !results) return;
        input.addEventListener('input', () => {
          const q = input.value.trim().toLowerCase();
          if (!q) { results.style.display = 'none'; return; }
          const alreadyIds = new Set(targetList.map(s => s.id));
          const matches = allSkillsSorted.filter(s => !alreadyIds.has(s.id) && (s.name||'').toLowerCase().includes(q)).slice(0, 10);
          if (!matches.length) { results.style.display = 'none'; return; }
          results.style.display = 'block';
          results.innerHTML = matches.map(s => `
            <div class="tskill-result-row" data-skid="${Utils.escHtml(s.id)}"
              style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">
              ${Utils.escHtml(s.name||'')}${s.grade?`<span style="font-size:11px;color:var(--color-text-dim);margin-left:6px;">${Utils.escHtml(s.grade)}</span>`:''}
            </div>`).join('');
          results.querySelectorAll('.tskill-result-row').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              const sk = allSkillsSorted.find(s => s.id === row.dataset.skid);
              if (!sk) return;
              targetList.push({ id: sk.id, name: sk.name, grade: sk.grade || '' });
              input.value = '';
              results.style.display = 'none';
              const listId = targetList === tplFixedSkills ? 'fixed' : 'var';
              document.getElementById(chipsId).innerHTML = renderSkillChips(listId);
              rebindTplAll();
            });
          });
        });
        input.addEventListener('blur', () => setTimeout(() => { results.style.display = 'none'; }, 150));
      };

      wireTplSkillSearch('tplFixedSearch', 'tplFixedResults', tplFixedSkills, 'tplFixedChips');
      wireTplSkillSearch('tplVarSearch', 'tplVarResults', tplVarSkills, 'tplVarChips');
      rebindTplAll();
    }, 50);
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  }
};
