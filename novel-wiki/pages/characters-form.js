'use strict';
// characters-form.js — form methods for window.Pages.characters
Object.assign(window.Pages.characters, {
  _openForm: async function(char, wid, container) {
    const isEdit = !!char;
    const stats = char?.stats || {};
    const isTemplate = char?.charType === 'template';

    // Load constellations, stat definitions, skills, achievements, jobs
    const [allConsts, allStatDefs, allSkillsRaw, allAchievementsRaw, allJobsRaw] = await Promise.all([
      DB.getAll('constellations', wid),
      DB.getAll('statDefs', wid),
      DB.getAll('skills', wid),
      DB.getAll('achievements', wid),
      DB.getAll('jobs', wid),
    ]);
    const sortedAchievements = allAchievementsRaw.slice().sort((a, b) => (a.name||'').localeCompare(b.name||'', 'ko'));
    const linkedAchievementIds = new Set((char?.achievements || []).map(a => typeof a === 'string' ? a : a.id).filter(Boolean));
    const sortedJobs = allJobsRaw.slice().sort((a, b) => (a.name||'').localeCompare(b.name||'', 'ko'));
    let mainJobId = char?.mainJob?.id || null;
    const subJobIds = new Set((char?.subJobs || []).map(j => j.id));

    if (allStatDefs.length === 0) {
      const catMap = { '힘 특화': '전투스텟', '민첩 특화': '전투스텟', '체력 특화': '전투스텟', '마나 계열': '마나계열', '정신 계열': '정신계열', '기타': '기타' };
      this.HIDDEN_STATS.forEach(group => {
        const cat = catMap[group.group] || '기타';
        group.stats.forEach(name => allStatDefs.push({ id: DB.genId(), worldId: wid, name, shortName: '', category: cat, description: '', createdAt: Date.now() }));
      });
      await Promise.all(allStatDefs.map(d => DB.put('statDefs', d)));
    }

    const statNames = allStatDefs.map(d => d.name);
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
        <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:8px;">수량은 게이트·타워 등 배치 시 해당 칩에서 설정합니다.</div>
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
        <!-- 일반 캐릭터 전용 스텟 (약식 모드에서 숨김) -->
        <div id="normalStatsSection" style="${isTemplate ? 'display:none;' : ''}">
          <div class="form-group">
            <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:8px;display:block;">기본 스텟</label>
            ${statInputs(this.BASE_STATS)}
          </div>
          <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <label class="form-label" style="font-size:13px;font-weight:600;margin:0;">커스텀 스텟</label>
              <button type="button" id="btnAddCustomStat" class="btn btn-ghost btn-sm" style="font-size:11px;">+ 직접 추가</button>
            </div>
            <div style="position:relative;margin-bottom:8px;">
              <input class="input-field" id="statDefSearch" placeholder="스텟 이름 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="statDefSearchResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:150px;overflow-y:auto;top:100%;left:0;"></div>
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
        </div>

        <!-- 직업 연동 -->
        ${sortedJobs.length > 0 ? `
        <div class="form-group" style="border:1px solid rgba(16,185,129,0.3);border-radius:8px;padding:10px 12px;">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:8px;display:block;">⚔️ 직업 연동</label>
          <div style="margin-bottom:10px;">
            <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:5px;">메인 직업 (1개)</div>
            <div id="mainJobChip" style="min-height:24px;margin-bottom:5px;">
              ${mainJobId ? (() => { const mj = sortedJobs.find(x=>x.id===mainJobId); return mj ? `<span class="main-job-chip" data-jid="${Utils.escHtml(mj.id)}" style="display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);padding:2px 8px;border-radius:12px;font-size:12px;cursor:pointer;" title="클릭하여 제거">${Utils.escHtml(mj.name)} ✕</span>` : ''; })() : ''}
            </div>
            <div style="position:relative;">
              <input class="input-field" id="mainJobSearch" placeholder="메인 직업 검색..." style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="mainJobResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:150px;overflow-y:auto;"></div>
            </div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:5px;">서브 직업 (복수)</div>
            <div id="subJobChips" style="display:flex;flex-wrap:wrap;gap:5px;min-height:24px;margin-bottom:5px;">
              ${[...subJobIds].map(jid => { const sj = sortedJobs.find(x=>x.id===jid); if(!sj) return ''; return \`<span class="sub-job-chip" data-jid="\${Utils.escHtml(jid)}" style="display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);padding:2px 8px;border-radius:12px;font-size:12px;cursor:pointer;" title="클릭하여 제거">\${Utils.escHtml(sj.name)} ✕</span>\`; }).filter(Boolean).join('')}
            </div>
            <div style="position:relative;">
              <input class="input-field" id="subJobSearch" placeholder="서브 직업 검색..." style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="subJobResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:150px;overflow-y:auto;"></div>
            </div>
          </div>
        </div>` : ''}

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
        ${sortedAchievements.length > 0 ? `
        <div class="form-group" style="border:1px solid rgba(251,191,36,0.3);border-radius:8px;padding:10px 12px;">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:8px;display:block;">🏆 보유 업적</label>
          <div id="linkedAchChips" style="display:flex;flex-wrap:wrap;gap:5px;min-height:24px;margin-bottom:6px;">
            ${[...linkedAchievementIds].map(aid => {
              const a = sortedAchievements.find(x => x.id === aid);
              if (!a) return '';
              return `<span class="ach-chip" data-aid="${Utils.escHtml(aid)}"
                style="display:inline-flex;align-items:center;gap:4px;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);padding:2px 8px;border-radius:12px;font-size:12px;cursor:pointer;"
                title="클릭하여 제거">${Utils.escHtml(a.name||'')} ✕</span>`;
            }).filter(Boolean).join('')}
          </div>
          <div style="position:relative;">
            <input class="input-field" id="achSearch" placeholder="업적 이름 검색..." autocomplete="off"
              style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="achResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:150px;overflow-y:auto;"></div>
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
      if (!name) { Utils.fieldError('fCharName'); return false; }

      const selectedCharType = document.querySelector('[name="charTypeSel"]:checked')?.value || 'normal';
      const isTpl = selectedCharType === 'template';

      // 약식 캐릭터 data 수집
      let templateData = null;
      if (isTpl) {
        syncTplStatsFromDOM();
        templateData = {
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
        achievements: [...linkedAchievementIds].map(aid => {
          const a = sortedAchievements.find(x => x.id === aid);
          return a ? { id: a.id, name: a.name || '' } : null;
        }).filter(Boolean),
        mainJob: mainJobId ? (() => { const mj = sortedJobs.find(x => x.id === mainJobId); return mj ? { id: mj.id, name: mj.name || '' } : null; })() : null,
        subJobs: [...subJobIds].map(jid => { const sj = sortedJobs.find(x => x.id === jid); return sj ? { id: sj.id, name: sj.name || '' } : null; }).filter(Boolean),
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

      const statDefSearch = document.getElementById('statDefSearch');
      const statDefResults = document.getElementById('statDefSearchResults');
      if (statDefSearch && statDefResults) {
        statDefSearch.addEventListener('input', () => {
          const q = statDefSearch.value.trim().toLowerCase();
          if (!q) { statDefResults.style.display = 'none'; return; }
          const existingNames = new Set([...document.querySelectorAll('#customStatRows .cs-name')].map(i => i.value.trim()).filter(Boolean));
          const matches = allStatDefs.filter(d => (d.name||'').toLowerCase().includes(q)).slice(0, 12);
          if (!matches.length) { statDefResults.style.display = 'none'; return; }
          statDefResults.style.display = 'block';
          statDefResults.innerHTML = matches.map(d => `
            <div class="stat-def-result-row" data-statname="${Utils.escHtml(d.name)}"
              style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);display:flex;align-items:center;justify-content:space-between;">
              <span>${Utils.escHtml(d.name)}${d.shortName ? ` <span style="font-size:11px;color:var(--color-text-dim);">(${Utils.escHtml(d.shortName)})</span>` : ''}${d.category ? ` <span style="font-size:10px;color:var(--color-text-dim);margin-left:4px;">[${Utils.escHtml(d.category)}]</span>` : ''}</span>
              ${existingNames.has(d.name) ? '<span style="font-size:11px;color:var(--color-text-dim);">이미 추가됨</span>' : ''}
            </div>`).join('');
          statDefResults.querySelectorAll('.stat-def-result-row').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              const name = row.dataset.statname;
              const existing2 = new Set([...document.querySelectorAll('#customStatRows .cs-name')].map(i => i.value.trim()).filter(Boolean));
              if (!existing2.has(name)) addCSRow(name, '', '');
              statDefSearch.value = '';
              statDefResults.style.display = 'none';
              const valueInput = document.querySelector('#customStatRows .cs-row:last-child .cs-value');
              if (valueInput) valueInput.focus();
            });
          });
        });
        statDefSearch.addEventListener('blur', () => setTimeout(() => { statDefResults.style.display = 'none'; }, 150));
      }

      document.getElementById('btnAddCustomStat')?.addEventListener('click', () => addCSRow('', '', ''));

      document.getElementById('customStatRows')?.addEventListener('click', e => {
        if (e.target.closest('.btn-del-cs')) e.target.closest('.cs-row')?.remove();
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

      // ── Achievement linking search ─────────────────────────────
      const achInput = document.getElementById('achSearch');
      const achResults = document.getElementById('achResults');
      const achChipsEl = document.getElementById('linkedAchChips');
      if (achInput && achResults && achChipsEl) {
        const renderAchChips = () => {
          achChipsEl.innerHTML = [...linkedAchievementIds].map(aid => {
            const a = sortedAchievements.find(x => x.id === aid);
            if (!a) return '';
            return `<span class="ach-chip" data-aid="${Utils.escHtml(aid)}"
              style="display:inline-flex;align-items:center;gap:4px;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);padding:2px 8px;border-radius:12px;font-size:12px;cursor:pointer;"
              title="클릭하여 제거">${Utils.escHtml(a.name||'')} ✕</span>`;
          }).filter(Boolean).join('');
          achChipsEl.querySelectorAll('.ach-chip').forEach(chip => {
            chip.addEventListener('click', () => {
              linkedAchievementIds.delete(chip.dataset.aid);
              renderAchChips();
            });
          });
        };
        renderAchChips();
        achInput.addEventListener('input', () => {
          const q = achInput.value.trim().toLowerCase();
          if (!q) { achResults.style.display = 'none'; return; }
          const matches = sortedAchievements.filter(a => !linkedAchievementIds.has(a.id) && (a.name||'').toLowerCase().includes(q)).slice(0, 10);
          if (!matches.length) { achResults.style.display = 'none'; return; }
          achResults.style.display = 'block';
          achResults.innerHTML = matches.map(a => `
            <div class="ach-result-row" data-aid="${Utils.escHtml(a.id)}"
              style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">
              ${Utils.escHtml(a.name||'')}${a.grade ? `<span style="font-size:11px;color:var(--color-text-dim);margin-left:6px;">${Utils.escHtml(a.grade)}</span>` : ''}
            </div>`).join('');
          achResults.querySelectorAll('.ach-result-row').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              linkedAchievementIds.add(row.dataset.aid);
              achInput.value = '';
              achResults.style.display = 'none';
              renderAchChips();
            });
          });
        });
        achInput.addEventListener('blur', () => setTimeout(() => { achResults.style.display = 'none'; }, 150));
      }

      // ── Template character UI ──────────────────────────────────
      document.querySelectorAll('[name="charTypeSel"]').forEach(r => {
        r.addEventListener('change', () => {
          const isTplMode = r.value === 'template';
          const tpl = document.getElementById('tplSection');
          if (tpl) tpl.style.display = isTplMode ? 'block' : 'none';
          const normalStats = document.getElementById('normalStatsSection');
          if (normalStats) normalStats.style.display = isTplMode ? 'none' : '';
        });
      });

      // ── 직업 검색 wiring ──────────────────────────────────────
      const wireJobSearch = (inputId, resultsId, chipContainerId, isSingle) => {
        const inp = document.getElementById(inputId);
        const res = document.getElementById(resultsId);
        const chips = document.getElementById(chipContainerId);
        if (!inp || !res || !chips) return;

        const renderMainChip = () => {
          chips.innerHTML = mainJobId ? (() => {
            const mj = sortedJobs.find(x => x.id === mainJobId);
            return mj ? `<span class="main-job-chip" data-jid="${Utils.escHtml(mj.id)}"
              style="display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);padding:2px 8px;border-radius:12px;font-size:12px;cursor:pointer;"
              title="클릭하여 제거">${Utils.escHtml(mj.name)} ✕</span>` : '';
          })() : '';
          chips.querySelectorAll('.main-job-chip').forEach(c => {
            c.addEventListener('click', () => { mainJobId = null; renderMainChip(); });
          });
        };

        const renderSubChips = () => {
          chips.innerHTML = [...subJobIds].map(jid => {
            const sj = sortedJobs.find(x => x.id === jid);
            if (!sj) return '';
            return `<span class="sub-job-chip" data-jid="${Utils.escHtml(jid)}"
              style="display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);padding:2px 8px;border-radius:12px;font-size:12px;cursor:pointer;"
              title="클릭하여 제거">${Utils.escHtml(sj.name)} ✕</span>`;
          }).filter(Boolean).join('');
          chips.querySelectorAll('.sub-job-chip').forEach(c => {
            c.addEventListener('click', () => { subJobIds.delete(c.dataset.jid); renderSubChips(); });
          });
        };

        if (isSingle) renderMainChip(); else renderSubChips();

        inp.addEventListener('input', () => {
          const q = inp.value.trim().toLowerCase();
          if (!q) { res.style.display = 'none'; return; }
          const matches = sortedJobs.filter(j => {
            if (isSingle) return j.name.toLowerCase().includes(q);
            return !subJobIds.has(j.id) && j.name.toLowerCase().includes(q);
          }).slice(0, 10);
          if (!matches.length) { res.style.display = 'none'; return; }
          res.style.display = 'block';
          res.innerHTML = matches.map(j => `
            <div class="job-result-row" data-jid="${Utils.escHtml(j.id)}"
              style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">
              ${Utils.escHtml(j.name)}${j.grade ? ` <span style="font-size:11px;color:var(--color-text-dim);">${Utils.escHtml(j.grade)}</span>` : ''}
            </div>`).join('');
          res.querySelectorAll('.job-result-row').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              if (isSingle) { mainJobId = row.dataset.jid; inp.value = ''; res.style.display = 'none'; renderMainChip(); }
              else { subJobIds.add(row.dataset.jid); inp.value = ''; res.style.display = 'none'; renderSubChips(); }
            });
          });
        });
        inp.addEventListener('blur', () => setTimeout(() => { res.style.display = 'none'; }, 150));
      };

      wireJobSearch('mainJobSearch', 'mainJobResults', 'mainJobChip', true);
      wireJobSearch('subJobSearch',  'subJobResults',  'subJobChips', false);

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
});
