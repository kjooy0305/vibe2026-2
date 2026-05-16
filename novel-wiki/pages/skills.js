'use strict';
window.Pages = window.Pages || {};
window.Pages.skills = {
  _currentId: null,
  _container: null,
  _listScrollY: 0,
  _C: null,

  init: async function(container, options) {
    options = options || {};
    this._container = container;
    const wid = AppStore.getCurrentWorldId();
    if (!wid) {
      container.innerHTML = `<div class="empty-state" style="padding:48px;text-align:center;"><div style="font-size:48px;margin-bottom:12px;">🌍</div><div style="font-weight:700;font-size:16px;">세계를 먼저 선택하세요</div><button class="btn btn-primary" style="margin-top:16px;" onclick="AppRouter.navigate('world')">세계 관리</button></div>`;
      return;
    }
    this._C = await AppConstants.load();
    const skills = await DB.getAll('skills', wid);
    if (options.highlightId) this._currentId = options.highlightId;
    if (this._currentId) {
      const s = skills.find(x => x.id === this._currentId);
      if (s) { this._renderDetail(container, s, wid, skills); return; }
    }
    this._renderList(container, skills, wid);
  },

  _renderList: function(container, skills, wid) {
    this._currentId = null;
    const self = this;
    const world = AppStore.getState().currentWorld;
    const allAttrs  = this._C.attributes.filter(a => a !== '없음');
    const allSeries = this._C.skillSeries.filter(s => s !== '없음');

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">스킬 라이브러리</h2>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-ghost btn-sm" id="btnSkillEvoTree">테크트리</button>
            <button class="btn btn-primary btn-sm" id="btnAddSkill">+ 추가</button>
          </div>
        </div>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">${Utils.escHtml(world?.name||'현재 세계')} · ${skills.length}개</p>

        <input class="input-field" id="skillFilter" placeholder="이름·효과·설명 텍스트 검색..." style="margin-top:8px;width:100%;box-sizing:border-box;" />

        <!-- 조건 필터 드롭다운 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">
          <select class="select-input" id="preFilterGrade" style="font-size:12px;">
            <option value="">-- 등급 전체 --</option>
            ${this._C.grades.map(g => `<option value="${g}">${g} 등급</option>`).join('')}
          </select>
          <select class="select-input" id="preFilterType" style="font-size:12px;">
            <option value="">-- 타입 전체 --</option>
            <option value="패시브">패시브 (자동 발동)</option>
            <option value="액티브">액티브 (직접 사용)</option>
          </select>
          <select class="select-input" id="preFilterAttr" style="font-size:12px;">
            <option value="">-- 속성 전체 --</option>
            ${allAttrs.map(a => `<option value="${a}">${a}</option>`).join('')}
          </select>
          <select class="select-input" id="preFilterSeries" style="font-size:12px;">
            <option value="">-- 계열 전체 --</option>
            ${allSeries.map(s => `<option value="${s}">${s} 계열</option>`).join('')}
          </select>
        </div>

        <!-- 등급 칩 -->
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;" id="gradeFilters">
          <button class="filter-chip active" data-grade="" style="padding:3px 8px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-primary);color:#000;font-size:11px;cursor:pointer;">전체</button>
          ${this._C.grades.map(g => `<button class="filter-chip" data-grade="${g}" style="padding:3px 8px;border-radius:4px;border:1px solid ${Utils.gradeColor(g)}66;background:transparent;color:${Utils.gradeColor(g)};font-size:11px;cursor:pointer;">${g}</button>`).join('')}
        </div>
      </div>

      <div id="skillList" class="item-list">
        ${skills.length === 0
          ? `<div class="empty-state" style="padding:48px;text-align:center;"><div style="font-size:48px;margin-bottom:12px;">⚡</div><div style="font-weight:700;font-size:16px;">스킬이 없습니다</div><div style="font-size:13px;color:var(--color-text-muted);">+ 추가 버튼으로 스킬 라이브러리를 채우세요</div></div>`
          : skills.map(s => this._skillCard(s)).join('')}
      </div>
    </div>`;

    let activeGrade = '';
    const applyAll = () => {
      const q      = (document.getElementById('skillFilter')?.value    || '').toLowerCase();
      const pGrade = document.getElementById('preFilterGrade')?.value  || '';
      const pType  = document.getElementById('preFilterType')?.value   || '';
      const pAttr  = document.getElementById('preFilterAttr')?.value   || '';
      const pSer   = document.getElementById('preFilterSeries')?.value || '';
      container.querySelectorAll('.skill-card').forEach(card => {
        const ok = (Utils.matchesQuery(card.dataset.searchText||'', q))
                && (!activeGrade || card.dataset.grade   === activeGrade)
                && (!pGrade      || card.dataset.grade   === pGrade)
                && (!pType       || card.dataset.type    === pType)
                && (!pAttr       || card.dataset.attr    === pAttr)
                && (!pSer        || card.dataset.series  === pSer);
        card.style.display = ok ? '' : 'none';
      });
    };

    document.getElementById('skillFilter')?.addEventListener('input', applyAll);
    ['preFilterGrade','preFilterType','preFilterAttr','preFilterSeries'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', applyAll);
    });

    container.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.filter-chip').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = b.dataset.grade ? Utils.gradeColor(b.dataset.grade) : 'var(--color-text-muted)';
        });
        btn.style.background = btn.dataset.grade ? Utils.gradeColor(btn.dataset.grade) : 'var(--color-primary)';
        btn.style.color = '#000';
        activeGrade = btn.dataset.grade;
        applyAll();
      });
    });

    document.getElementById('btnAddSkill')?.addEventListener('click', () => self._openForm(null, wid, container));
    document.getElementById('btnSkillEvoTree')?.addEventListener('click', () => self._openEvoTree(skills));

    container.querySelectorAll('.skill-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-del-skill') || e.target.closest('.btn-copy-skill')) return;
        self._listScrollY = container.scrollTop || window.scrollY || 0;
        const id = card.dataset.id;
        DB.getAll('skills', wid).then(all => {
          const s = all.find(x => x.id === id);
          if (s) { self._currentId = s.id; self._renderDetail(container, s, wid, all); }
        });
      });
    });

    container.querySelectorAll('.btn-del-skill').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const s = skills.find(x => x.id === btn.dataset.id);
        Utils.confirmWithInput('스킬 삭제', '삭제하려면 스킬 이름을 정확히 입력하세요.', s?.name || '', async () => {
          await DB.del('skills', s.id);
          Utils.toast('삭제됨', 'info');
          self.init(container);
        });
      });
    });

    container.querySelectorAll('.btn-copy-skill').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        const s = skills.find(x => x.id === btn.dataset.id);
        if (!s) return;
        const worlds = AppStore.getState().worlds.filter(w => w.id !== wid);
        if (!worlds.length) { Utils.toast('다른 세계가 없습니다', 'error'); return; }
        Utils.openModal('다른 세계로 복사',
          `<div class="form-group"><label class="form-label">복사할 세계를 선택하세요</label><select class="select-input" id="copySkillWorld" style="width:100%;">${worlds.map(w => `<option value="${Utils.escHtml(w.id)}">${Utils.escHtml(w.name)}</option>`).join('')}</select></div>`,
          async () => {
            const tid = document.getElementById('copySkillWorld')?.value;
            if (!tid) return false;
            await DB.put('skills', { ...s, id: DB.genId(), worldId: tid, createdAt: Date.now(), updatedAt: Date.now() });
            Utils.toast('복사됨', 'success'); return true;
          }, '복사');
      });
    });
  },

  _skillCard: function(s) {
    const gc = Utils.gradeColor(s.grade || 'F');
    const sub = s.type === '패시브' ? s.passiveSubtype : s.activeSubtype;
    const typeStr = [s.type, sub].filter(Boolean).join(' · ');
    return `
    <div class="skill-card list-item list-item--full"
      data-id="${Utils.escHtml(s.id)}"
      data-grade="${Utils.escHtml(s.grade||'')}"
      data-type="${Utils.escHtml(s.type||'')}"
      data-attr="${Utils.escHtml(s.attribute && s.attribute!=='없음' ? s.attribute : '')}"
      data-series="${Utils.escHtml(s.series && s.series!=='없음' ? s.series : '')}"
      data-search-text="${Utils.escHtml([s.name,s.grade,s.attribute,s.series,s.type,s.effects,s.description].filter(Boolean).join(' ').toLowerCase())}"
      style="cursor:pointer;border-left:3px solid ${gc};display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--color-surface2);border-radius:10px;border:1px solid var(--color-border);border-left-width:3px;margin-bottom:8px;">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${Utils.gradeBadge(s.grade||'F')}
          <span style="font-weight:700;font-size:14px;">${Utils.escHtml(s.name||'이름 없음')}</span>
          ${!s.effects ? '<span style="color:var(--color-warning);font-size:12px;" title="효과가 비어 있음">⚠️</span>' : ''}
          ${s.evolvedFromId ? '<span style="font-size:10px;color:var(--color-text-dim);padding:1px 5px;border:1px solid var(--color-border);border-radius:3px;">진화형</span>' : ''}
          ${s.grade==='EX' && s.exLevel!==undefined && s.exLevel!=='' ? `<span style="font-size:10px;color:gold;padding:1px 5px;border:1px solid gold44;border-radius:3px;">EX Lv.${s.exLevel}</span>` : ''}
        </div>
        <div style="font-size:12px;color:var(--color-text-muted);margin-top:3px;">
          ${Utils.escHtml(typeStr)}${s.attribute&&s.attribute!=='없음'?' · '+Utils.escHtml(s.attribute):''}${s.series&&s.series!=='없음'?' · '+Utils.escHtml(s.series)+' 계열':''}
        </div>
        ${s.manaCost?`<div style="font-size:11px;color:#60a5fa;margin-top:2px;">마나 ${s.manaCost}${s.cooldown?' · 쿨타임 '+Utils.escHtml(s.cooldown):''}</div>`:s.cooldown?`<div style="font-size:11px;color:#60a5fa;margin-top:2px;">쿨타임 ${Utils.escHtml(s.cooldown)}</div>`:''}
        ${s.effects?`<div style="font-size:12px;color:var(--color-text-dim);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${Utils.escHtml(s.effects)}</div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm btn-copy-skill" data-id="${Utils.escHtml(s.id)}" style="font-size:11px;">복사</button>
        <button class="btn btn-ghost btn-sm btn-del-skill" data-id="${Utils.escHtml(s.id)}" style="color:var(--color-danger);font-size:11px;">삭제</button>
      </div>
    </div>`;
  },

  _renderDetail: function(container, s, wid, allSkills) {
    const gc = Utils.gradeColor(s.grade||'F');
    const border = gc.startsWith('linear') ? '#fbbf24' : gc;
    const sub = s.type==='패시브' ? s.passiveSubtype : s.activeSubtype;
    const self = this;
    const evoHtml = this._buildEvoChainHtml(s, allSkills||[]);

    container.innerHTML = `
    <div class="page active" style="overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;">
      <div class="page-header" style="border-left:4px solid ${border};padding-left:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnBackSkills">← 목록</button>
          ${Utils.gradeBadge(s.grade||'F')}
          <h2 class="page-title" style="margin:0;font-size:18px;">${Utils.escHtml(s.name||'이름 없음')}</h2>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btnEditSkill">편집</button>
          <button class="btn btn-ghost btn-sm" id="btnCopySkillText">텍스트 복사</button>
          <button class="btn btn-ghost btn-sm" id="btnDelSkillDetail" style="color:var(--color-danger);">삭제</button>
        </div>
      </div>

      <div style="border:1px solid ${border}44;border-radius:12px;padding:16px;background:${border}0a;margin-bottom:16px;">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
          ${Utils.gradeBadge(s.grade||'F')}
          ${s.grade==='EX'&&s.exLevel!==undefined&&s.exLevel!==''?`<span style="padding:2px 8px;border-radius:4px;border:1px solid gold;font-size:12px;color:gold;">EX 레벨 ${s.exLevel}</span>`:''}
          ${s.type?`<span style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:12px;">${Utils.escHtml(s.type)}</span>`:''}
          ${sub?`<span style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:12px;">${Utils.escHtml(sub)}</span>`:''}
          ${s.subType?`<span style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:12px;">${Utils.escHtml(s.subType)}</span>`:''}
          ${s.attribute&&s.attribute!=='없음'?`<span style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:12px;color:var(--color-accent);">${Utils.escHtml(s.attribute)}</span>`:''}
          ${s.series&&s.series!=='없음'?`<span style="padding:2px 8px;border-radius:4px;border:1px solid var(--color-border);font-size:12px;">${Utils.escHtml(s.series)} 계열</span>`:''}
        </div>
        ${s.manaCost!==undefined&&s.manaCost!==''&&s.manaCost!==0?`<div style="display:flex;gap:8px;margin-bottom:6px;"><span style="font-size:12px;color:var(--color-text-muted);min-width:80px;">소모 마나</span><span style="font-size:12px;font-weight:600;color:#60a5fa;">${Utils.escHtml(String(s.manaCost))}</span></div>`:''}
        ${s.cooldown?`<div style="display:flex;gap:8px;margin-bottom:6px;"><span style="font-size:12px;color:var(--color-text-muted);min-width:80px;">쿨타임</span><span style="font-size:12px;font-weight:600;">${Utils.escHtml(s.cooldown)}</span></div>`:''}
        <div style="margin-top:12px;">
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">효과</div>
          <div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(s.effects||'(없음)'))}</div>
        </div>
        ${(s.conditionalEffects||[]).length?`<div style="margin-top:12px;"><div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">조건부 효과</div>${(s.conditionalEffects||[]).map(ce=>`<div style="display:flex;flex-direction:column;gap:2px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:6px;padding:8px 10px;margin-bottom:6px;"><div style="font-size:11px;color:#818cf8;font-weight:600;">📌 ${Utils.escHtml(ce.condition||'')}</div><div style="white-space:pre-wrap;font-size:13px;line-height:1.6;">${Utils.nl2br(Utils.escHtml(ce.effect||''))}</div></div>`).join('')}</div>`:''}
        ${s.description?`<div style="margin-top:12px;"><div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">소설 내 설명</div><div style="white-space:pre-wrap;font-size:13px;font-style:italic;color:var(--color-text-muted);line-height:1.7;">${Utils.nl2br(Utils.escHtml(s.description))}</div></div>`:''}
      </div>

      ${evoHtml}

      ${s.authorNotes?`<div style="background:rgba(245,158,11,0.08);border-left:3px solid var(--color-warning);border-radius:6px;padding:12px 14px;margin-bottom:16px;"><div style="font-size:11px;color:var(--color-warning);font-weight:700;margin-bottom:4px;">작가 전용 메모 (소설 미표시)</div><div style="white-space:pre-wrap;font-size:13px;line-height:1.7;">${Utils.nl2br(Utils.escHtml(s.authorNotes))}</div></div>`:''}
      <div style="font-size:11px;color:var(--color-text-dim);text-align:right;margin-bottom:8px;">수정: ${Utils.formatDate(s.updatedAt)} · 생성: ${Utils.formatDate(s.createdAt)}</div>
    </div>`;

    document.getElementById('btnBackSkills')?.addEventListener('click', async () => {
      const y = self._listScrollY || 0;
      self._currentId = null;
      await self.init(container);
      requestAnimationFrame(() => { container.scrollTop = y; if (y > 0) window.scrollTo(0, y); });
    });
    document.getElementById('btnEditSkill')?.addEventListener('click', () => self._openForm(s, wid, container));
    document.getElementById('btnDelSkillDetail')?.addEventListener('click', () => {
      Utils.confirmWithInput('스킬 삭제', '삭제하려면 스킬 이름을 정확히 입력하세요.', s.name||'', async () => {
        await DB.del('skills', s.id);
        Utils.toast('삭제됨', 'info');
        self._currentId = null; self.init(container);
      });
    });
    document.getElementById('btnCopySkillText')?.addEventListener('click', () => {
      const typeStr = [s.type, sub].filter(Boolean).join('/');
      const lines = [
        'ㅡ'.repeat(4),
        `ㅣ이름: ${s.name||''}`,
        `ㅣ등급: ${s.grade||''}${s.grade==='EX'&&s.exLevel!==undefined?' (EX 레벨 '+s.exLevel+')':''}`,
        `ㅣ분류: ${typeStr||'패시브'}`,
        s.manaCost ? `ㅣ소모 마나: ${s.manaCost}` : null,
        s.cooldown  ? `ㅣ쿨타임: ${s.cooldown}`   : null,
        s.attribute && s.attribute!=='없음' ? `ㅣ속성: ${s.attribute}` : null,
        s.series    && s.series   !=='없음' ? `ㅣ계열: ${s.series}`    : null,
        `ㅣ효과:`, s.effects||'',
        s.description ? `ㅣ설명: ${s.description}` : null,
        'ㅡ'.repeat(4),
      ].filter(x => x !== null).join('\n');
      Utils.copyText(lines);
      Utils.toast('복사됨', 'success');
    });
  },

  _buildEvoChainHtml: function(current, allSkills) {
    const map = Object.fromEntries(allSkills.map(s => [s.id, s]));
    const ancestors = [];
    let cur = current;
    for (let i = 0; i < 10; i++) {
      if (!cur.evolvedFromId || !map[cur.evolvedFromId]) break;
      ancestors.unshift(map[cur.evolvedFromId]);
      cur = map[cur.evolvedFromId];
    }
    const getChildren = (id, depth) => {
      if (depth > 8) return [];
      return allSkills.filter(s => s.evolvedFromId === id).map(c => ({ s: c, children: getChildren(c.id, depth+1) }));
    };
    const descendants = getChildren(current.id, 0);
    if (!ancestors.length && !descendants.length) return '';

    const box = (sk, active) => {
      const c = Utils.gradeColor(sk.grade||'F'); const col = c.startsWith('linear')?'#fbbf24':c;
      return `<div onclick="AppRouter.navigate('skills',{highlightId:'${Utils.escHtml(sk.id)}'})" style="display:inline-flex;flex-direction:column;align-items:center;padding:6px 10px;background:${active?col+'22':'var(--color-surface2)'};border:2px solid ${active?col:'var(--color-border)'};border-radius:8px;cursor:pointer;flex-shrink:0;min-width:72px;max-width:100px;">
        <div style="font-size:10px;color:${col};font-weight:700;">${Utils.escHtml(sk.grade||'')}</div>
        <div style="font-size:11px;font-weight:600;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:84px;">${Utils.escHtml(sk.name||'')}</div>
      </div>`;
    };
    const arr = `<div style="align-self:center;color:var(--color-text-muted);margin:0 4px;flex-shrink:0;">→</div>`;

    let chainHtml = ancestors.map(a => box(a,false)+arr).join('') + box(current,true);

    const renderDesc = (node, depth) => {
      let h = `<div style="display:flex;align-items:center;margin-top:6px;padding-left:${depth*16}px;">
        <span style="color:var(--color-text-muted);margin-right:6px;font-size:12px;">${depth>0?'└':'→'}</span>${box(node.s,false)}</div>`;
      node.children.forEach(c => { h += renderDesc(c, depth+1); });
      return h;
    };

    return `<div style="background:var(--color-surface2);border-radius:10px;padding:14px;margin-bottom:16px;">
      <div style="font-weight:700;font-size:13px;color:var(--color-text-muted);margin-bottom:10px;">진화 테크트리</div>
      <div style="overflow-x:auto;"><div style="display:flex;align-items:center;flex-wrap:nowrap;padding-bottom:4px;">${chainHtml}</div>
      ${descendants.length?`<div style="margin-top:8px;border-top:1px solid var(--color-border);padding-top:8px;">${descendants.map(d=>renderDesc(d,0)).join('')}</div>`:''}
      </div></div>`;
  },

  _openEvoTree: function(skills) {
    if (!skills.some(s => s.evolvedFromId)) {
      Utils.toast('진화 연결이 없습니다. 스킬 편집에서 "이전 단계 스킬"을 설정하세요.', 'info'); return;
    }
    const map = Object.fromEntries(skills.map(s => [s.id, s]));
    const roots = skills.filter(s => !s.evolvedFromId || !map[s.evolvedFromId]);
    const nW = 120, nH = 46, spX = 140, spY = 90;
    const positions = {};
    const colCount = {};
    const assignPos = (id, gen) => {
      const col = colCount[gen] || 0;
      positions[id] = { x: 40 + col * spX, y: 40 + gen * spY };
      colCount[gen] = col + 1;
      skills.filter(s => s.evolvedFromId === id).forEach(c => assignPos(c.id, gen+1));
    };
    roots.forEach(r => assignPos(r.id, 0));

    const maxX = Math.max(...Object.values(positions).map(p=>p.x)) + nW + 40;
    const maxY = Math.max(...Object.values(positions).map(p=>p.y)) + nH + 30;

    let edges = '', nodes = '';
    skills.forEach(s => {
      if (s.evolvedFromId && positions[s.id] && positions[s.evolvedFromId]) {
        const fp = positions[s.evolvedFromId], tp = positions[s.id];
        edges += `<line x1="${fp.x+nW/2}" y1="${fp.y+nH}" x2="${tp.x+nW/2}" y2="${tp.y}" stroke="#475569" stroke-width="1.5" marker-end="url(#earr)"/>`;
      }
    });
    skills.forEach(s => {
      if (!positions[s.id]) return;
      const {x,y} = positions[s.id];
      const gc = Utils.gradeColor(s.grade||'F'), col = gc.startsWith('linear')?'#fbbf24':gc;
      const nm = (s.name||'').length>9?(s.name||'').slice(0,8)+'…':(s.name||'');
      nodes += `<g onclick="AppRouter.navigate('skills',{highlightId:'${Utils.escHtml(s.id)}'})" style="cursor:pointer;">
        <rect x="${x}" y="${y}" width="${nW}" height="${nH}" rx="6" fill="${col}18" stroke="${col}88" stroke-width="1.5"/>
        <text x="${x+nW/2}" y="${y+16}" text-anchor="middle" fill="${col}" font-size="10" font-weight="bold" font-family="sans-serif">${Utils.escHtml(s.grade||'')}</text>
        <text x="${x+nW/2}" y="${y+34}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-family="sans-serif">${Utils.escHtml(nm)}</text>
      </g>`;
    });

    const body = `<div style="overflow:auto;max-height:65vh;"><svg width="${maxX}" height="${maxY}" style="min-width:${maxX}px;">
      <defs><marker id="earr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#475569"/></marker></defs>
      ${edges}${nodes}</svg></div>`;
    Utils.openModal('스킬 진화 테크트리', body, async () => true, '닫기');
  },

};
