'use strict';
window.Pages = window.Pages || {};
window.Pages.races = {
  _currentId: null,
  _container: null,
  _listScrollY: 0,

  ICON_POOL: ['🧝','👤','👁️','🐉','🦋','🦊','🐺','🦅','🐦','🌿','🍄','💀','🔮','⚡','🌊','🔥','❄️','🌑','☀️','🌙','⭐','💫','✨','🌟','🗡️','🛡️','⚓','🌸','🌺','🏛️'],

  init: async function(container, options) {
    options = options || {};
    this._container = container;
    const wid = AppStore.getCurrentWorldId();
    if (!wid) {
      container.innerHTML = `<div class="empty-state" style="padding:48px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">🌍</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:4px;">세계를 먼저 선택하세요</div>
        <div style="font-size:13px;color:var(--color-text-muted);">홈에서 세계를 선택하거나 새로 만드세요</div>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="AppRouter.navigate('world')">세계 관리</button>
      </div>`;
      return;
    }
    if (options.highlightId) this._currentId = options.highlightId;
    const races = await DB.getAll('races', wid);
    if (this._currentId) {
      const r = races.find(x => x.id === this._currentId);
      if (r) { this._renderDetail(container, r, wid); return; }
    }
    this._renderList(container, races, wid);
  },

  destroy: function() { this._currentId = null; this._container = null; },

  // ── LIST ─────────────────────────────────────────────────────────────────────

  _renderList: function(container, races, wid) {
    this._currentId = null;
    const self = this;
    const world = AppStore.getState().currentWorld;

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">🧝 종족</h2>
          <button class="btn btn-primary btn-sm" id="btnAddRace">+ 추가</button>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">${Utils.escHtml(world?.name||'현재 세계')} · ${races.length}종족</p>
        <input class="input-field" id="raceFilter" placeholder="종족 이름, 특징 검색..." style="margin-top:8px;width:100%;box-sizing:border-box;" />
      </div>
      <div id="raceList" style="padding:4px 0;">
        ${races.length === 0 ? `<div class="empty-state" style="padding:48px;text-align:center;"><div style="font-size:48px;margin-bottom:12px;">🧝</div><div style="font-weight:700;font-size:16px;margin-bottom:4px;">종족이 없습니다</div><div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 첫 종족을 등록하세요</div></div>` : races.map(r => self._raceCard(r)).join('')}
      </div>
    </div>`;

    container.querySelector('#btnAddRace')?.addEventListener('click', () => self._openForm(null, wid, container));

    container.querySelector('#raceFilter')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.race-card').forEach(card => {
        card.style.display = Utils.matchesQuery(card.dataset.searchText || '', q) ? '' : 'none';
      });
    });

    container.querySelectorAll('.race-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-race') || e.target.closest('.btn-edit-race')) return;
        const id = card.dataset.id;
        self._listScrollY = container.scrollTop || 0;
        DB.getAll('races', wid).then(all => {
          const r = all.find(x => x.id === id);
          if (r) { self._currentId = id; self._renderDetail(container, r, wid); }
        });
      });
    });
    container.querySelectorAll('.btn-edit-race').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        DB.getAll('races', wid).then(all => {
          const r = all.find(x => x.id === btn.dataset.id);
          if (r) self._openForm(r, wid, container);
        });
      });
    });
    container.querySelectorAll('.btn-del-race').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const r = races.find(x => x.id === btn.dataset.id);
        Utils.confirmWithInput('종족 삭제', '삭제하려면 종족 이름을 입력하세요.', r?.name || '이 종족', async () => {
          await DB.del('races', btn.dataset.id);
          Utils.toast('삭제됨', 'info');
          self.init(container);
        });
      });
    });
  },

  _raceCard: function(race) {
    const searchText = [race.name||'', race.description||'', (race.subRaces||[]).map(s=>s.name||'').join(' ')].join(' ').toLowerCase();
    const subCount = (race.subRaces||[]).length;
    return `
    <div class="race-card list-item" data-id="${Utils.escHtml(race.id)}" data-search-text="${Utils.escHtml(searchText)}"
      style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--color-surface2);border-radius:12px;border:1px solid var(--color-border);margin-bottom:8px;cursor:pointer;">
      <div style="width:46px;height:46px;border-radius:10px;background:var(--color-surface3,#2a2a3a);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">
        ${race.icon ? Utils.escHtml(race.icon) : '🧝'}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:15px;margin-bottom:2px;">${Utils.escHtml(race.name||'이름 없음')}</div>
        ${race.maxLifespan ? `<div style="font-size:11px;color:var(--color-text-muted);">수명: ${Utils.escHtml(race.maxLifespan)}</div>` : ''}
        ${race.description ? `<div style="font-size:12px;color:var(--color-text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(race.description.substring(0,60))}${race.description.length>60?'…':''}</div>` : ''}
        ${subCount ? `<div style="font-size:11px;color:var(--color-text-dim);">세부 종류 ${subCount}가지</div>` : ''}
      </div>
      <div style="display:flex;gap:4px;flex-direction:column;align-items:flex-end;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm btn-edit-race" data-id="${Utils.escHtml(race.id)}" style="font-size:11px;">편집</button>
        <button class="btn btn-ghost btn-sm btn-del-race" data-id="${Utils.escHtml(race.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  // ── DETAIL ───────────────────────────────────────────────────────────────────

  _renderDetail: async function(container, race, wid) {
    const self = this;
    const allSkills = await DB.getAll('skills', wid);
    const linkedSkills = (race.raceSkills||[]).map(rs => {
      const sk = allSkills.find(s => s.id === rs.id);
      return sk ? { ...sk, ...rs } : rs;
    });

    const field = (label, value, multi) => {
      if (!value && value !== 0) return '';
      return `<div style="margin-bottom:10px;">
        <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:2px;">${label}</div>
        ${multi ? `<div style="font-size:13px;white-space:pre-wrap;line-height:1.7;">${Utils.nl2br(Utils.escHtml(value))}</div>`
                : `<div style="font-size:13px;">${Utils.escHtml(String(value))}</div>`}
      </div>`;
    };

    const avgStatsHtml = (race.avgStats||[]).length ? `
      <div style="margin-bottom:10px;">
        <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:6px;">평균 기본 스탯</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px;">
          ${(race.avgStats||[]).map(s => `
            <div style="background:var(--color-bg,#0a0e1a);border:1px solid var(--color-border);border-radius:6px;padding:6px 10px;">
              <div style="font-size:11px;color:var(--color-text-muted);">${Utils.escHtml(s.name||'')}</div>
              <div style="font-weight:700;font-size:13px;">${Utils.escHtml(String(s.min||0))} ~ ${Utils.escHtml(String(s.max||0))}</div>
            </div>`).join('')}
        </div>
      </div>` : '';

    const ranksHtml = (race.ranks||[]).length ? `
      <div style="margin-bottom:10px;">
        <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:6px;">계급 체계</div>
        ${(race.ranks||[]).map(r => `
          <div style="background:var(--color-bg,#0a0e1a);border:1px solid var(--color-border);border-radius:6px;padding:8px 12px;margin-bottom:4px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:${r.description?'4px':'0'};">${Utils.escHtml(r.name||'')}</div>
            ${r.description ? `<div style="font-size:12px;color:var(--color-text-muted);white-space:pre-wrap;">${Utils.nl2br(Utils.escHtml(r.description))}</div>` : ''}
          </div>`).join('')}
      </div>` : '';

    const skillsHtml = linkedSkills.length ? `
      <div style="margin-bottom:10px;">
        <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:6px;">종족 스킬</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${linkedSkills.map(sk => `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:6px;padding:3px 10px;font-size:12px;">⚡ ${Utils.escHtml(sk.name||'')}${sk.grade ? ` (${Utils.escHtml(sk.grade)})` : ''}</span>`).join('')}
        </div>
      </div>` : '';

    const subRacesHtml = (race.subRaces||[]).length ? `
      <div style="margin-bottom:10px;">
        <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:6px;">세부 종류</div>
        ${(race.subRaces||[]).map(sr => `
          <div style="background:var(--color-bg,#0a0e1a);border:1px solid var(--color-border);border-radius:6px;padding:8px 12px;margin-bottom:4px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-weight:700;font-size:13px;">${Utils.escHtml(sr.name||'')}</span>
              ${sr.ratio ? `<span style="font-size:11px;color:var(--color-text-muted);background:var(--color-surface3,#2a2a3a);border-radius:4px;padding:1px 6px;">비율 ${Utils.escHtml(sr.ratio)}</span>` : ''}
            </div>
            ${sr.description ? `<div style="font-size:12px;color:var(--color-text-muted);margin-top:4px;white-space:pre-wrap;">${Utils.nl2br(Utils.escHtml(sr.description))}</div>` : ''}
          </div>`).join('')}
      </div>` : '';

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackRaces">← 목록</button>
          <span style="font-size:28px;">${race.icon ? Utils.escHtml(race.icon) : '🧝'}</span>
          <h2 class="page-title" style="margin:0;font-size:18px;">${Utils.escHtml(race.name||'종족')}</h2>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditRace">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnDelRaceDetail" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      <div style="background:var(--color-surface2);border-radius:10px;padding:16px;margin-bottom:10px;">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:12px;letter-spacing:1px;">기본 정보</div>
        ${field('특징', race.description, true)}
        ${field('평균 최대 수명', race.maxLifespan)}
        ${field('성별', race.genders)}
        ${field('번식 방법', race.reproduction, true)}
        ${avgStatsHtml}
      </div>

      ${ranksHtml || (race.ranks||[]).length===0 ? '' : ''}
      ${(race.ranks||[]).length ? `<div style="background:var(--color-surface2);border-radius:10px;padding:16px;margin-bottom:10px;">${ranksHtml}</div>` : ''}

      ${(race.raceSkills||[]).length ? `<div style="background:var(--color-surface2);border-radius:10px;padding:16px;margin-bottom:10px;">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:12px;letter-spacing:1px;">종족 스킬</div>
        ${skillsHtml}
      </div>` : ''}

      ${race.deathReaction ? `<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:16px;margin-bottom:10px;">
        <div style="font-size:11px;color:#ef4444;font-weight:700;margin-bottom:8px;letter-spacing:1px;">사망 반응</div>
        <div style="font-size:13px;white-space:pre-wrap;line-height:1.7;">${Utils.nl2br(Utils.escHtml(race.deathReaction))}</div>
      </div>` : ''}

      ${(race.subRaces||[]).length ? `<div style="background:var(--color-surface2);border-radius:10px;padding:16px;margin-bottom:10px;">
        <div style="font-size:11px;color:var(--color-primary);font-weight:700;margin-bottom:12px;letter-spacing:1px;">세부 종류</div>
        ${subRacesHtml}
      </div>` : ''}

      ${race.authorNotes ? `<div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:16px;">
        <div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:4px;">작가 전용 메모</div>
        <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(race.authorNotes))}</div>
      </div>` : ''}

      <div style="font-size:11px;color:var(--color-text-dim);text-align:right;padding-bottom:16px;">
        수정: ${Utils.formatDate(race.updatedAt)} · 생성: ${Utils.formatDate(race.createdAt)}
      </div>
    </div>`;

    document.getElementById('btnBackRaces')?.addEventListener('click', async () => {
      const scrollY = self._listScrollY || 0;
      self._currentId = null;
      await self.init(container);
      requestAnimationFrame(() => { container.scrollTop = scrollY; });
    });
    document.getElementById('btnEditRace')?.addEventListener('click', () => self._openForm(race, wid, container));
    document.getElementById('btnDelRaceDetail')?.addEventListener('click', () => {
      Utils.confirmWithInput('종족 삭제', '삭제하려면 종족 이름을 입력하세요.', race.name, async () => {
        await DB.del('races', race.id);
        Utils.toast('삭제됨', 'info');
        self._currentId = null;
        self.init(container);
      });
    });
  },

  // ── FORM ─────────────────────────────────────────────────────────────────────

  _openForm: async function(race, wid, container) {
    const self = this;
    const isEdit = !!race;
    const r = race || {};

    const allSkills = await DB.getAll('skills', wid);

    let selectedIcon = r.icon || '🧝';
    let formRanks = (r.ranks||[]).map(x => ({ id: x.id||DB.genId(), name: x.name||'', description: x.description||'' }));
    let formSubRaces = (r.subRaces||[]).map(x => ({ id: x.id||DB.genId(), name: x.name||'', description: x.description||'', ratio: x.ratio||'' }));
    let formAvgStats = (r.avgStats||[]).map(x => ({ name: x.name||'', min: x.min||0, max: x.max||0 }));
    let formRaceSkills = [...(r.raceSkills||[])];

    const syncFromDOM = () => {
      // Ranks
      document.querySelectorAll('#raceRankRows .rrank-row').forEach(el => {
        const i = parseInt(el.dataset.idx, 10);
        if (formRanks[i]) {
          formRanks[i].name = el.querySelector('.rrank-name')?.value || '';
          formRanks[i].description = el.querySelector('.rrank-desc')?.value || '';
        }
      });
      // SubRaces
      document.querySelectorAll('#raceSubRows .rsub-row').forEach(el => {
        const i = parseInt(el.dataset.idx, 10);
        if (formSubRaces[i]) {
          formSubRaces[i].name = el.querySelector('.rsub-name')?.value || '';
          formSubRaces[i].description = el.querySelector('.rsub-desc')?.value || '';
          formSubRaces[i].ratio = el.querySelector('.rsub-ratio')?.value || '';
        }
      });
      // AvgStats
      document.querySelectorAll('#raceStatRows .rstat-row').forEach(el => {
        const i = parseInt(el.dataset.idx, 10);
        if (formAvgStats[i]) {
          formAvgStats[i].name = el.querySelector('.rstat-name')?.value || '';
          formAvgStats[i].min = Number(el.querySelector('.rstat-min')?.value || 0);
          formAvgStats[i].max = Number(el.querySelector('.rstat-max')?.value || 0);
        }
      });
    };

    const renderRankRows = () => formRanks.map((rk, i) => `
      <div class="rrank-row" data-idx="${i}" style="border:1px solid var(--color-border);border-radius:7px;padding:8px;margin-bottom:6px;background:var(--color-bg,#0a0e1a);">
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:5px;">
          <input class="input-field rrank-name" value="${Utils.escHtml(rk.name)}" placeholder="계급명 (예: 제사장, 원로원)" style="flex:1;box-sizing:border-box;font-size:13px;" />
          <button type="button" class="rrank-del btn btn-ghost btn-sm" data-idx="${i}" style="color:var(--color-danger);font-size:11px;flex-shrink:0;">✕</button>
        </div>
        <textarea class="input-field rrank-desc" rows="2" placeholder="계급 설명, 역할, 조건 등..." style="width:100%;box-sizing:border-box;font-size:12px;">${Utils.escHtml(rk.description)}</textarea>
      </div>`).join('') || '<div style="font-size:12px;color:var(--color-text-dim);text-align:center;padding:6px;">계급 없음</div>';

    const renderSubRaceRows = () => formSubRaces.map((sr, i) => `
      <div class="rsub-row" data-idx="${i}" style="border:1px solid var(--color-border);border-radius:7px;padding:8px;margin-bottom:6px;background:var(--color-bg,#0a0e1a);">
        <div style="display:grid;grid-template-columns:1fr auto auto;gap:5px;align-items:center;margin-bottom:5px;">
          <input class="input-field rsub-name" value="${Utils.escHtml(sr.name)}" placeholder="세부 종류명 (예: 하이엘프)" style="box-sizing:border-box;font-size:13px;" />
          <input class="input-field rsub-ratio" value="${Utils.escHtml(sr.ratio)}" placeholder="비율 (예: 10%)" style="width:70px;box-sizing:border-box;font-size:12px;" />
          <button type="button" class="rsub-del btn btn-ghost btn-sm" data-idx="${i}" style="color:var(--color-danger);font-size:11px;">✕</button>
        </div>
        <textarea class="input-field rsub-desc" rows="2" placeholder="세부 종류 설명..." style="width:100%;box-sizing:border-box;font-size:12px;">${Utils.escHtml(sr.description)}</textarea>
      </div>`).join('') || '<div style="font-size:12px;color:var(--color-text-dim);text-align:center;padding:6px;">세부 종류 없음</div>';

    const renderStatRows = () => formAvgStats.map((st, i) => `
      <div class="rstat-row" data-idx="${i}" style="display:grid;grid-template-columns:1fr 70px 70px auto;gap:4px;align-items:center;margin-bottom:5px;">
        <input class="input-field rstat-name" value="${Utils.escHtml(st.name)}" placeholder="스탯명 (예: 힘)" style="box-sizing:border-box;font-size:13px;" />
        <input type="number" class="input-field rstat-min" value="${st.min}" placeholder="최소" style="box-sizing:border-box;font-size:12px;" />
        <input type="number" class="input-field rstat-max" value="${st.max}" placeholder="최대" style="box-sizing:border-box;font-size:12px;" />
        <button type="button" class="rstat-del btn btn-ghost btn-sm" data-idx="${i}" style="color:var(--color-danger);font-size:11px;">✕</button>
      </div>`).join('') || '<div style="font-size:12px;color:var(--color-text-dim);text-align:center;padding:4px;">스탯 없음</div>';

    const skillChipsHtml = () => formRaceSkills.map(sk => `
      <span class="rskill-chip" data-skid="${Utils.escHtml(sk.id)}"
        style="display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:6px;padding:3px 8px;font-size:12px;">
        ⚡ ${Utils.escHtml(sk.name||'')}${sk.grade ? ` (${Utils.escHtml(sk.grade)})` : ''}
        <button class="rskill-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:12px;padding:0 2px;">✕</button>
      </span>`).join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:12px;padding-right:4px;">

        <!-- 이름 & 아이콘 -->
        <div class="form-group">
          <label class="form-label">이름 *</label>
          <input class="input-field" id="fRaceName" value="${Utils.escHtml(r.name||'')}" placeholder="종족 이름 (예: 엘프, 인간, 드래곤)" style="width:100%;box-sizing:border-box;" />
        </div>
        <div class="form-group">
          <label class="form-label">아이콘</label>
          <div style="font-size:28px;text-align:center;margin-bottom:6px;" id="raceIconPreview">${Utils.escHtml(selectedIcon)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;" id="raceIconPicker">
            ${self.ICON_POOL.map(ic => `<button type="button" class="race-icon-btn" data-icon="${ic}" style="font-size:20px;padding:4px;border-radius:6px;border:2px solid ${ic===selectedIcon?'var(--color-primary)':'transparent'};background:var(--color-bg);cursor:pointer;line-height:1.2;">${ic}</button>`).join('')}
          </div>
        </div>

        <!-- 기본 정보 -->
        <div class="form-group">
          <label class="form-label">특징 / 설명</label>
          <textarea class="input-field" id="fRaceDesc" rows="3" placeholder="종족의 특징, 외모, 성질 등..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(r.description||'')}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="form-group">
            <label class="form-label">평균 최대 수명</label>
            <input class="input-field" id="fRaceLifespan" value="${Utils.escHtml(r.maxLifespan||'')}" placeholder="예: 300년, 불멸" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label">성별</label>
            <input class="input-field" id="fRaceGenders" value="${Utils.escHtml(r.genders||'')}" placeholder="예: 남/여/무성" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">번식 방법</label>
          <textarea class="input-field" id="fRaceReproduction" rows="2" placeholder="번식·탄생 방식 설명..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(r.reproduction||'')}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">사망 반응 (사후 처리)</label>
          <textarea class="input-field" id="fRaceDeathReaction" rows="3" placeholder="죽었을 때 시체가 남는지, 소멸하는지, 사후 세계로 가는지 등..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(r.deathReaction||'')}</textarea>
        </div>

        <!-- 평균 기본 스탯 -->
        <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <label class="form-label" style="margin:0;">평균 기본 스탯 (범위)</label>
            <button type="button" id="btnAddRaceStat" class="btn btn-ghost btn-sm" style="font-size:11px;">+ 추가</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 70px 70px auto;gap:4px;margin-bottom:4px;">
            <span style="font-size:10px;color:var(--color-text-dim);">스탯명</span>
            <span style="font-size:10px;color:var(--color-text-dim);">최소</span>
            <span style="font-size:10px;color:var(--color-text-dim);">최대</span>
            <span></span>
          </div>
          <div id="raceStatRows">${renderStatRows()}</div>
        </div>

        <!-- 계급 체계 -->
        <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <label class="form-label" style="margin:0;">계급 체계</label>
            <button type="button" id="btnAddRaceRank" class="btn btn-ghost btn-sm" style="font-size:11px;">+ 추가</button>
          </div>
          <div id="raceRankRows">${renderRankRows()}</div>
        </div>

        <!-- 종족 스킬 -->
        <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
          <label class="form-label" style="margin-bottom:8px;display:block;">종족 스킬</label>
          <div id="raceSkillChips" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;margin-bottom:6px;">${skillChipsHtml()}</div>
          <div style="position:relative;">
            <input class="input-field" id="raceSkillSearch" placeholder="스킬 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="raceSkillResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:150px;overflow-y:auto;top:100%;left:0;"></div>
          </div>
        </div>

        <!-- 세부 종류 -->
        <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <label class="form-label" style="margin:0;">세부 종류</label>
            <button type="button" id="btnAddSubRace" class="btn btn-ghost btn-sm" style="font-size:11px;">+ 추가</button>
          </div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">예: 하이엘프, 하프엘프, 쿼터엘프 등</div>
          <div id="raceSubRows">${renderSubRaceRows()}</div>
        </div>

        <div class="form-group">
          <label class="form-label">작가 메모</label>
          <textarea class="input-field" id="fRaceAuthorNotes" rows="2" placeholder="작가만 보는 메모..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(r.authorNotes||'')}</textarea>
        </div>
      </div>`;

    Utils.openModal(isEdit ? '종족 편집' : '새 종족', body, async () => {
      const name = document.getElementById('fRaceName')?.value.trim();
      if (!name) { Utils.toast('이름을 입력하세요', 'error'); return false; }
      syncFromDOM();

      const record = {
        id: r.id || DB.genId(),
        worldId: wid,
        name,
        icon: selectedIcon,
        description: document.getElementById('fRaceDesc')?.value.trim() || '',
        maxLifespan: document.getElementById('fRaceLifespan')?.value.trim() || '',
        genders: document.getElementById('fRaceGenders')?.value.trim() || '',
        reproduction: document.getElementById('fRaceReproduction')?.value.trim() || '',
        deathReaction: document.getElementById('fRaceDeathReaction')?.value.trim() || '',
        avgStats: formAvgStats.filter(s => s.name.trim()),
        ranks: formRanks.filter(rk => rk.name.trim()),
        raceSkills: formRaceSkills,
        subRaces: formSubRaces.filter(sr => sr.name.trim()),
        authorNotes: document.getElementById('fRaceAuthorNotes')?.value.trim() || '',
        createdAt: r.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      await DB.put('races', record);
      await AppStore.updateStreak();
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      self._currentId = record.id;
      const all = await DB.getAll('races', wid);
      const updated = all.find(x => x.id === record.id);
      if (updated) self._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      // Icon picker
      const picker = document.getElementById('raceIconPicker');
      const preview = document.getElementById('raceIconPreview');
      picker?.querySelectorAll('.race-icon-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedIcon = btn.dataset.icon;
          picker.querySelectorAll('.race-icon-btn').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = 'var(--color-primary)';
          if (preview) preview.textContent = selectedIcon;
        });
      });

      // Dynamic row rebind
      const rebindAll = () => {
        // Rank deletes
        document.querySelectorAll('#raceRankRows .rrank-del').forEach(btn => {
          btn.addEventListener('click', () => {
            syncFromDOM();
            formRanks.splice(parseInt(btn.dataset.idx, 10), 1);
            document.getElementById('raceRankRows').innerHTML = renderRankRows();
            rebindAll();
          });
        });
        // SubRace deletes
        document.querySelectorAll('#raceSubRows .rsub-del').forEach(btn => {
          btn.addEventListener('click', () => {
            syncFromDOM();
            formSubRaces.splice(parseInt(btn.dataset.idx, 10), 1);
            document.getElementById('raceSubRows').innerHTML = renderSubRaceRows();
            rebindAll();
          });
        });
        // Stat deletes
        document.querySelectorAll('#raceStatRows .rstat-del').forEach(btn => {
          btn.addEventListener('click', () => {
            syncFromDOM();
            formAvgStats.splice(parseInt(btn.dataset.idx, 10), 1);
            document.getElementById('raceStatRows').innerHTML = renderStatRows();
            rebindAll();
          });
        });
        // Skill chip deletes
        document.querySelectorAll('#raceSkillChips .rskill-del').forEach(btn => {
          btn.addEventListener('click', () => {
            const chip = btn.closest('.rskill-chip');
            const skid = chip?.dataset.skid;
            if (skid) formRaceSkills = formRaceSkills.filter(s => s.id !== skid);
            chip?.remove();
          });
        });
      };
      rebindAll();

      // Add buttons
      document.getElementById('btnAddRaceRank')?.addEventListener('click', () => {
        syncFromDOM();
        formRanks.push({ id: DB.genId(), name: '', description: '' });
        document.getElementById('raceRankRows').innerHTML = renderRankRows();
        rebindAll();
      });
      document.getElementById('btnAddSubRace')?.addEventListener('click', () => {
        syncFromDOM();
        formSubRaces.push({ id: DB.genId(), name: '', description: '', ratio: '' });
        document.getElementById('raceSubRows').innerHTML = renderSubRaceRows();
        rebindAll();
      });
      document.getElementById('btnAddRaceStat')?.addEventListener('click', () => {
        syncFromDOM();
        formAvgStats.push({ name: '', min: 0, max: 0 });
        document.getElementById('raceStatRows').innerHTML = renderStatRows();
        rebindAll();
      });

      // Skill search
      const skInp = document.getElementById('raceSkillSearch');
      const skRes = document.getElementById('raceSkillResults');
      if (skInp && skRes) {
        skInp.addEventListener('input', () => {
          const q = skInp.value.trim();
          if (!q) { skRes.style.display = 'none'; skRes.innerHTML = ''; return; }
          const matches = allSkills.filter(s => Utils.matchesQuery((s.name||'') + ' ' + (s.grade||''), q)).slice(0, 20);
          if (!matches.length) { skRes.style.display = 'none'; return; }
          skRes.innerHTML = matches.map(s => `
            <div class="rsk-row" data-id="${Utils.escHtml(s.id)}" data-name="${Utils.escHtml(s.name||'')}" data-grade="${Utils.escHtml(s.grade||'')}"
              style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);"
              onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">
              ⚡ ${Utils.escHtml(s.name||'')}${s.grade ? ` (${Utils.escHtml(s.grade)})` : ''}
            </div>`).join('');
          skRes.style.display = 'block';
          skRes.querySelectorAll('.rsk-row').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              if (formRaceSkills.some(s => s.id === row.dataset.id)) { skInp.value = ''; skRes.style.display = 'none'; return; }
              formRaceSkills.push({ id: row.dataset.id, name: row.dataset.name, grade: row.dataset.grade });
              const chips = document.getElementById('raceSkillChips');
              if (chips) { chips.innerHTML = skillChipsHtml(); rebindAll(); }
              skInp.value = '';
              skRes.style.display = 'none';
            });
          });
        });
        skInp.addEventListener('blur', () => setTimeout(() => { skRes.style.display = 'none'; }, 200));
      }
    }, 50);
  },
};
