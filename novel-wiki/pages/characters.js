'use strict';
window.Pages = window.Pages || {};
window.Pages.characters = {
  _currentId: null,
  _view: 'list', // 'list' | 'detail'
  _container: null,

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
        <input class="input-field" id="charFilter" placeholder="이름, 종족, 국가, 길드 검색..." style="margin-top:8px;" />
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

    document.getElementById('charFilter')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      container.querySelectorAll('.char-card').forEach(card => {
        const text = card.dataset.searchText || '';
        card.style.display = text.includes(q) ? '' : 'none';
      });
    });

    container.querySelectorAll('.char-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-char') || e.target.closest('.btn-copy-char')) return;
        const id = card.dataset.id;
        this._currentId = id;
        DB.getAll('characters', wid).then(chars => {
          const char = chars.find(c => c.id === id);
          if (char) this._renderDetail(container, char, wid);
        });
      });
    });

    container.querySelectorAll('.btn-del-char').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const card = container.querySelector(`.char-card[data-id="${id}"]`);
        const name = card?.querySelector('.char-name')?.textContent || '이 캐릭터';
        Utils.confirm(
          `"${name}"을(를) 삭제하시겠습니까?`,
          '되돌릴 수 없습니다.',
          async () => {
            await DB.del('characters', id);
            Utils.toast('삭제됨', 'info');
            this.init(container);
          }
        );
      });
    });

    container.querySelectorAll('.btn-copy-char').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const char = chars.find(c => c.id === id);
        if (!char) return;
        const worlds = AppStore.getState().worlds.filter(w => w.id !== wid);
        if (!worlds.length) { Utils.toast('다른 세계가 없습니다', 'error'); return; }
        const body = `
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">복사할 세계 선택</label>
            <select class="select-input" id="copyToWorld" style="width:100%;">
              ${worlds.map(w => `<option value="${Utils.escHtml(w.id)}">${Utils.escHtml(w.name)}</option>`).join('')}
            </select>
          </div>`;
        Utils.openModal('다른 세계로 복사', body, async () => {
          const targetId = document.getElementById('copyToWorld')?.value;
          if (!targetId) return false;
          const copy = {
            ...char,
            id: DB.genId(),
            worldId: targetId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await DB.put('characters', copy);
          Utils.toast('복사됨', 'success');
          return true;
        }, '복사');
      });
    });
  },

  _charCard: function(c) {
    const searchText = [c.name || '', c.race || '', c.country || '', c.guild || '', c.title || ''].join(' ').toLowerCase();
    return `
    <div class="list-item list-item--full char-card"
      data-id="${Utils.escHtml(c.id)}"
      data-search-text="${Utils.escHtml(searchText)}"
      style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--color-surface2);border-radius:12px;border:1px solid var(--color-border);margin-bottom:8px;cursor:pointer;">
      ${c.image
        ? `<img src="${c.image}" style="width:48px;height:48px;border-radius:10px;object-fit:cover;flex-shrink:0;" />`
        : `<div style="width:48px;height:48px;border-radius:10px;background:var(--color-surface3,#2a2a3a);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">👤</div>`}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <span class="char-name" style="font-weight:700;font-size:15px;">${Utils.escHtml(c.name || '이름 없음')}</span>
          ${c.level ? `<span class="badge" style="font-size:11px;padding:2px 6px;background:var(--color-primary);color:#fff;border-radius:4px;">Lv.${c.level}</span>` : ''}
          ${c.title ? `<span style="font-size:11px;color:var(--color-text-muted);">[${Utils.escHtml(c.title)}]</span>` : ''}
        </div>
        <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">
          ${Utils.escHtml(c.race || '인간')}${c.country ? ' · ' + Utils.escHtml(c.country) : ''}${c.age ? ' · ' + c.age + '세' : ''}${c.gender && c.gender !== '미지정' ? ' · ' + Utils.escHtml(c.gender) : ''}
        </div>
        ${c.guild ? `<div style="font-size:11px;color:var(--color-text-dim);">🏰 ${Utils.escHtml(c.guild)}</div>` : ''}
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;flex-direction:column;align-items:flex-end;">
        <button class="btn btn-ghost btn-sm btn-copy-char" data-id="${Utils.escHtml(c.id)}" title="다른 세계로 복사" style="font-size:11px;">복사</button>
        <button class="btn btn-ghost btn-sm btn-del-char" data-id="${Utils.escHtml(c.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  _renderDetail: function(container, char, wid) {
    const allStats = {};
    if (char.stats) Object.assign(allStats, char.stats);

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

    const skillsList = (char.skills || []).map(sk => {
      const name = sk.name || sk;
      const grade = sk.grade ? `(${sk.grade})` : '';
      const locked = sk.locked ? ' <span style="color:var(--color-text-dim);">???</span>' : '';
      return `<div class="status-row" style="padding:2px 0;font-size:13px;">ㄴ${Utils.escHtml(name)} ${grade}${locked}</div>`;
    }).join('');

    const achieveList = (char.achievements || []).map(a =>
      `<div class="status-row" style="padding:2px 0;font-size:13px;">ㄴ${Utils.escHtml(a.name || a)}</div>`
    ).join('');

    container.innerHTML = `
    <div class="page active">
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
        ${char.guild ? `<div class="status-row">ㅣ길드: ${Utils.escHtml(char.guild)}</div>` : ''}
        <div class="status-row">ㅣ종족: ${Utils.escHtml(char.race || '인간')}</div>
        ${char.age ? `<div class="status-row">ㅣ나이: ${char.age}</div>` : ''}
        ${char.gender && char.gender !== '미지정' ? `<div class="status-row">ㅣ성별: ${Utils.escHtml(char.gender)}</div>` : ''}
        ${char.cycle !== null && char.cycle !== undefined ? `<div class="status-row">ㅣ회귀 회차: ${char.cycle}회차</div>` : ''}
        <div style="color:rgba(100,150,255,0.5);margin:6px 0;">────────────</div>
        <div class="status-row" style="color:rgba(200,220,255,0.9);">ㅣ[업적]</div>
        ${achieveList || '<div class="status-row" style="color:rgba(150,170,200,0.6);">ㄴ(없음)</div>'}
        <div style="color:rgba(100,150,255,0.5);margin:6px 0;">────────────</div>
        <div class="status-row" style="color:rgba(200,220,255,0.9);">ㅣ[스텟]</div>
        ${baseStatRows}
        ${hiddenStatRows ? `
          <div style="color:rgba(100,150,255,0.5);margin:6px 0;">────────────</div>
          <div class="status-row" style="color:rgba(200,220,255,0.9);">ㅣ[히든 스텟]</div>
          ${hiddenStatRows}` : ''}
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
        ${char.title ? `<div>ㅣ칭호: <em style="color:#80ffcc;">${Utils.escHtml(char.title)}</em></div>` : ''}
        <div>ㅣ이름: ${Utils.escHtml(char.name || '')}</div>
        ${char.race ? `<div>ㅣ종족: ${Utils.escHtml(char.race)}</div>` : ''}
        ${achieveList ? `<div style="margin-top:8px;color:#aaccff;">ㅣ[업적]</div>${achieveList}` : ''}
        <div style="margin-top:8px;color:#aaccff;">ㅣ[스텟]</div>
        ${baseStatRows}
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

    document.getElementById('btnBackChars')?.addEventListener('click', () => this.init(container));
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
      const allSkills = await DB.getAll('skills', wid);
      const charSkillIds = new Set((char.skills || []).map(s => s.id || s));
      const skillCheckboxes = allSkills.length === 0
        ? '<div style="color:var(--color-text-muted);">스킬 라이브러리가 비어 있습니다. 먼저 스킬을 추가하세요.</div>'
        : allSkills.map(sk => `
            <label style="display:flex;align-items:center;gap:8px;padding:8px 0;cursor:pointer;border-bottom:1px solid var(--color-border);">
              <input type="checkbox" data-skid="${Utils.escHtml(sk.id)}" ${charSkillIds.has(sk.id) ? 'checked' : ''} />
              <span>⚡ ${Utils.escHtml(sk.name)} ${sk.grade ? `(${sk.grade})` : ''}</span>
            </label>`).join('');

      Utils.openModal('스킬 관리', `<div style="max-height:60vh;overflow-y:auto;">${skillCheckboxes}</div>`, async () => {
        const selected = [...document.querySelectorAll('input[data-skid]:checked')]
          .map(cb => {
            const sk = allSkills.find(s => s.id === cb.dataset.skid);
            return sk ? { id: sk.id, name: sk.name, grade: sk.grade || '' } : null;
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

  _statusWindowText: function(char) {
    const stats = char.stats || {};
    let text = 'ㅡ'.repeat(16) + '\n';
    text += `ㅣ레벨:${char.level || 0}\n`;
    if (char.title) text += `ㅣ칭호:${char.title}\n`;
    text += `ㅣ이름:${char.name || ''}\n`;
    if (char.country) text += `ㅣ국가:${char.country}\n`;
    if (char.guild) text += `ㅣ길드:${char.guild}\n`;
    text += `ㅣ종족:${char.race || '인간'}\n`;
    if (char.age) text += `ㅣ나이:${char.age}\n`;
    if (char.gender && char.gender !== '미지정') text += `ㅣ성별:${char.gender}\n`;
    if (char.cycle !== null && char.cycle !== undefined) text += `ㅣ회귀 회차:${char.cycle}회차\n`;
    text += `ㅣ[업적]\n`;
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

  _openForm: function(char, wid, container) {
    const isEdit = !!char;
    const stats = char?.stats || {};

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
      <div style="display:flex;flex-direction:column;gap:12px;">
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
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">국가</label>
            <input class="input-field" id="fCharCountry" value="${Utils.escHtml(char?.country || '')}" placeholder="국가" style="width:100%;box-sizing:border-box;" />
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">길드</label>
            <input class="input-field" id="fCharGuild" value="${Utils.escHtml(char?.guild || '')}" style="width:100%;box-sizing:border-box;" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">종족</label>
            <input class="input-field" id="fCharRace" value="${Utils.escHtml(char?.race || '인간')}" style="width:100%;box-sizing:border-box;" />
          </div>
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
        <details style="border:1px solid var(--color-border);border-radius:8px;padding:8px 12px;">
          <summary style="cursor:pointer;font-weight:600;font-size:13px;padding:4px 0;list-style:none;">히든 스텟 (클릭하여 펼치기)</summary>
          <div style="margin-top:12px;">${hiddenStatInputs}</div>
        </details>
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

      const newStats = {};
      document.querySelectorAll('.stat-input').forEach(inp => {
        if (inp.value !== '' && inp.value !== null) {
          newStats[inp.dataset.stat] = Number(inp.value);
        }
      });

      const cycleVal = document.getElementById('fCharCycle')?.value;
      const ageVal = document.getElementById('fCharAge')?.value;

      const item = {
        ...(char || {}),
        worldId: wid,
        name,
        level: Number(document.getElementById('fCharLevel')?.value || 0),
        title: document.getElementById('fCharTitle')?.value.trim() || '',
        country: document.getElementById('fCharCountry')?.value.trim() || '',
        race: document.getElementById('fCharRace')?.value.trim() || '인간',
        age: ageVal ? Number(ageVal) : null,
        gender: document.getElementById('fCharGender')?.value || '미지정',
        guild: document.getElementById('fCharGuild')?.value.trim() || '',
        cycle: cycleVal !== '' && cycleVal !== null && cycleVal !== undefined ? Number(cycleVal) : null,
        stats: newStats,
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
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      this._currentId = item.id;
      await AppStore.updateStreak();
      const chars = await DB.getAll('characters', wid);
      const updated = chars.find(c => c.id === item.id);
      if (updated) this._renderDetail(container, updated, wid);
      return true;
    }, isEdit ? '저장' : '추가');

    // Image upload handler (after modal renders)
    setTimeout(() => {
      document.getElementById('charImageFile')?.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        newImage = await Utils.imageToBase64(file);
        const preview = document.getElementById('charImgPreview');
        if (preview) preview.innerHTML = `<img src="${newImage}" style="max-width:120px;border-radius:8px;margin-bottom:6px;" />`;
      });
    }, 50);
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  }
};
