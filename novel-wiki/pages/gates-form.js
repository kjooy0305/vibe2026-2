'use strict';
// gates-form.js — _openForm & _exportText for window.Pages.gates
// Loaded after gates.js
Object.assign(window.Pages.gates, {
  _openForm: async function(gate, wid, container) {
    const isEdit = !!gate;
    const g = gate || {};
    const self = this;

    const [allMonsters, allChars, allTraps, allItems, allPlaces, allSkills, allStatDefs] = await Promise.all([
      DB.getAll('monsters', wid),
      DB.getAll('characters', wid),
      DB.getAll('traps', wid),
      DB.getAll('items', wid),
      DB.getAll('places', wid),
      DB.getAll('skills', wid),
      DB.getAll('statDefs', wid),
    ]);

    let formFeatureEntries = (() => {
      if (Array.isArray(g.featureEntries)) {
        return g.featureEntries.map(e => ({...e}));
      }
      const old = g.features || '';
      if (typeof old === 'string' && old.trim()) {
        return old.split('\n').filter(l => l.trim()).map(l => ({
          id: DB.genId(), refType: '', refId: '', refName: '', text: l.trim(),
        }));
      }
      return [];
    })();

    // Concept state
    let formConcepts = new Set(g.concepts || []);
    let formWaves = (g.waveConfig?.waves || []).map(w => ({ ...w, enemies: [...(w.enemies || [])], traps: [...(w.traps || [])] }));
    let bossPhases = (g.bossConfig?.phases || []).map(p => ({ ...p, attacks: [...(p.attacks || [])] }));
    let bossEnemies = [...(g.bossConfig?.enemies || [])];
    let decapTargets = [...(g.decapitationConfig?.targets || [])];
    let exRef = { ...(g.explorationConfig?.target || { id: '', name: '' }) };
    const mkPlaceRef = (src) => ({ type: src?.type || 'text', id: src?.id || '', name: src?.name || '', desc: src?.desc || '' });
    let bossPlace = mkPlaceRef(g.bossConfig?.place);

    // Defense state
    let defInvaders   = [...(g.defenseConfig?.invaders   || [])];
    let defDefenders  = [...(g.defenseConfig?.defenders  || [])];
    let defTargets    = [...(g.defenseConfig?.targets    || [])]; // [{type:'text'|'place', id?, name, desc?}]
    let defLocPlace   = mkPlaceRef(g.defenseConfig?.location);
    // Siege state
    let siegeDefenders = [...(g.siegeConfig?.defenders || [])];
    let siegeAttackers = [...(g.siegeConfig?.attackers || [])];
    let siegeTargets   = [...(g.siegeConfig?.targets   || [])];
    let siegeLocPlace  = mkPlaceRef(g.siegeConfig?.location);
    // Survival state
    let svMonsters        = [...(g.survivalConfig?.monsters       || [])];
    let svStatReductions  = (g.survivalConfig?.statReductions || []).map(r => ({...r}));

    const allTypes = [...this.TYPES, ...(this._customTypes || [])];
    const allBreakTypes = [...this.BREAK_TYPES, ...(this._customBreakTypes || [])];
    const existingType = g.type || '';
    const existingBreakType = g.breakType || '';
    const typeIsCustom = existingType && !allTypes.includes(existingType);
    const breakTypeIsCustom = existingBreakType && !allBreakTypes.includes(existingBreakType);
    if (typeIsCustom && !allTypes.includes(existingType)) allTypes.push(existingType);
    if (breakTypeIsCustom && !allBreakTypes.includes(existingBreakType)) allBreakTypes.push(existingBreakType);

    const gradeOptions = this._C.grades.map(gr =>
      `<option value="${gr}" ${g.grade === gr ? 'selected' : ''}>${gr}</option>`).join('');
    const typeOptions = ['', ...allTypes, '__custom__'].map(t => {
      if (t === '__custom__') return `<option value="__custom__">기타 (직접 입력)...</option>`;
      return `<option value="${t}" ${existingType === t ? 'selected' : ''}>${t || '선택 안 함'}</option>`;
    }).join('');
    const breakTypeOptions = ['', ...allBreakTypes, '__custom__'].map(bt => {
      if (bt === '__custom__') return `<option value="__custom__">기타 (직접 입력)...</option>`;
      return `<option value="${bt}" ${existingBreakType === bt ? 'selected' : ''}>${bt || '선택 안 함'}</option>`;
    }).join('');

    // Build existing images list
    const existingImages = Array.isArray(g.images) ? g.images : (g.image ? [{ url: g.image, caption: '' }] : []);

    const tf = (id, label, val, placeholder) => `
      <div class="form-group">
        <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">${label}</label>
        <input class="input-field" id="${id}" value="${Utils.escHtml(val || '')}" placeholder="${placeholder || ''}" style="width:100%;box-sizing:border-box;" />
      </div>`;

    const ta = (id, label, val, placeholder, rows) => `
      <div class="form-group">
        <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">${label}</label>
        <textarea class="input-field" id="${id}" rows="${rows || 3}" placeholder="${placeholder || ''}"
          style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(val || '')}</textarea>
      </div>`;

    // ── HTML Builders ──
    const placeRefHtml = (prefix, ref) => `
      <div class="place-ref-wrap" id="${prefix}PlaceRefWrap" style="margin-top:6px;">
        <div style="display:flex;gap:12px;margin-bottom:4px;">
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
            <input type="radio" name="${prefix}PlaceType" value="text" ${ref.type === 'text' ? 'checked' : ''} /> 텍스트 입력
          </label>
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
            <input type="radio" name="${prefix}PlaceType" value="ref" ${ref.type === 'ref' ? 'checked' : ''} /> 장소창에서 선택
          </label>
        </div>
        <div id="${prefix}PlaceTextDiv" style="display:${ref.type !== 'ref' ? 'block' : 'none'};">
          <input class="input-field" id="${prefix}PlaceText" value="${Utils.escHtml(ref.desc || '')}" placeholder="장소 설명 입력" style="width:100%;box-sizing:border-box;font-size:12px;" />
        </div>
        <div id="${prefix}PlaceRefDiv" style="display:${ref.type === 'ref' ? 'block' : 'none'};position:relative;">
          <input class="input-field" id="${prefix}PlaceSearch" placeholder="장소 검색..." value="${Utils.escHtml(ref.name || '')}" style="width:100%;box-sizing:border-box;font-size:12px;" autocomplete="off" />
          <div id="${prefix}PlaceResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:140px;overflow-y:auto;top:100%;left:0;"></div>
          <input type="hidden" id="${prefix}PlaceId" value="${Utils.escHtml(ref.id || '')}" />
          ${ref.name ? `<div id="${prefix}PlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;">선택됨: ${Utils.escHtml(ref.name)}</div>` : `<div id="${prefix}PlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;display:none;"></div>`}
        </div>
      </div>`;

    const chipHtml = (e, type) => {
      const icon = type === 'char' ? '👤' : type === 'trap' ? '⚠️' : '👾';
      const gradeStr = e.grade ? ` (${Utils.escHtml(e.grade)})` : '';
      return `<span class="entity-chip" data-eid="${Utils.escHtml(e.id)}" data-etype="${type}" data-ename="${Utils.escHtml(e.name || '')}" data-egrade="${Utils.escHtml(e.grade || '')}" style="display:inline-flex;align-items:center;gap:3px;background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:6px;padding:2px 5px;margin:2px;font-size:12px;max-width:100%;box-sizing:border-box;">
        <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:1;">${icon} ${Utils.escHtml(e.name)}${gradeStr}</span>
        <input type="number" class="chip-count" value="${e.count || 1}" min="1" style="width:36px;flex-shrink:0;padding:1px 3px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font-size:11px;text-align:center;" />
        <input class="chip-unit" value="${Utils.escHtml(e.unit || (type === 'char' ? '명' : type === 'trap' ? '개' : '마리'))}" style="width:28px;flex-shrink:0;padding:1px 3px;border-radius:4px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font-size:11px;" />
        <button class="chip-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:12px;padding:0 2px;flex-shrink:0;">✕</button>
      </span>`;
    };

    const entitySearchHtml = (inputId, resultId, placeholder) => `
      <div style="position:relative;margin-top:4px;">
        <input class="input-field" id="${inputId}" placeholder="${placeholder}" autocomplete="off"
          style="width:100%;box-sizing:border-box;font-size:12px;" />
        <div id="${resultId}" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:140px;overflow-y:auto;top:100%;left:0;"></div>
      </div>`;

    const waveRowHtml = (w, idx) => {
      const enemyChips = (w.enemies || []).map(e => chipHtml(e, e.type || 'monster')).join('');
      const trapChips = (w.traps || []).map(t => chipHtml(t, 'trap')).join('');
      const clearTypes = w.clearConditionTypes || (w.clearConditionType ? [w.clearConditionType] : ['enemies']);
      const rs = 'display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;';
      const clearCondHtml = [
        ['enemies', '적 처치 완료'],
        ['exploration', '탐험 클리어'],
        ['decapitation', '참수 클리어'],
        ['boss', '보스전 클리어'],
        ['custom', '직접 입력'],
      ].map(([val, label]) =>
        `<label style="${rs}"><input type="checkbox" class="wave-clear-type" value="${val}" data-widx="${idx}" ${clearTypes.includes(val) ? 'checked' : ''} /> ${label}</label>`
      ).join('');
      return `
      <div class="wave-row" data-widx="${idx}" style="background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:8px;padding:10px;margin-bottom:8px;width:100%;box-sizing:border-box;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-weight:700;font-size:13px;color:#60a5fa;">${idx + 1}웨이브</div>
          <button class="btn btn-ghost btn-sm wave-del-btn" data-widx="${idx}" style="color:var(--color-danger);font-size:11px;">삭제</button>
        </div>
        <div style="margin-bottom:6px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-bottom:4px;">
            <input type="checkbox" class="wave-event-cb" data-widx="${idx}" ${w.hasEvent ? 'checked' : ''} /> 사건발생
          </label>
          <div id="waveEventWrap${idx}" style="display:${w.hasEvent ? 'block' : 'none'};">
            <textarea class="input-field wave-event-desc" data-widx="${idx}" rows="2" placeholder="사건 설명"
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(w.eventDesc || '')}</textarea>
          </div>
        </div>
        <div style="margin-bottom:6px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">적</div>
          <div class="wave-enemy-chips" id="waveEnemyChips${idx}" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${enemyChips}</div>
          ${entitySearchHtml('waveEnemySearch' + idx, 'waveEnemyResults' + idx, '몬스터/캐릭터 검색...')}
        </div>
        <div style="margin-bottom:6px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">트랩</div>
          <div class="wave-trap-chips" id="waveTrapChips${idx}" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${trapChips}</div>
          ${entitySearchHtml('waveTrapSearch' + idx, 'waveTrapResults' + idx, '트랩 검색...')}
        </div>
        <div style="margin-bottom:6px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">클리어 조건 (중복 선택 가능)</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">${clearCondHtml}</div>
          <div id="waveClearCustomWrap${idx}" style="display:${clearTypes.includes('custom') ? 'block' : 'none'};margin-top:4px;">
            <input class="input-field wave-clear-cond" data-widx="${idx}" value="${Utils.escHtml(w.clearCondition || '')}" placeholder="직접 입력 조건 내용" style="width:100%;box-sizing:border-box;font-size:12px;" />
          </div>
          <textarea class="input-field wave-clear-comment" data-widx="${idx}" rows="2" placeholder="클리어 조건 코멘트..." style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;margin-top:6px;">${Utils.escHtml(w.clearConditionComment || '')}</textarea>
        </div>
        <div style="margin-bottom:4px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">기타 메모</div>
          <textarea class="input-field wave-notes" data-widx="${idx}" rows="2" placeholder="기타 메모..." style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(w.waveNotes || '')}</textarea>
        </div>
      </div>`;
    };

    const phaseRowHtml = (p, pidx) => {
      const attacksHtml = (p.attacks || []).map((atk, aidx) => `
        <div class="atk-row" data-pidx="${pidx}" data-aidx="${aidx}" style="background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;padding:8px;margin-bottom:6px;width:100%;box-sizing:border-box;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <div style="font-size:11px;font-weight:700;color:#c084fc;">공격 ${aidx + 1}</div>
            <button class="btn btn-ghost btn-sm atk-del-btn" data-pidx="${pidx}" data-aidx="${aidx}" style="color:var(--color-danger);font-size:10px;">삭제</button>
          </div>
          <input class="input-field atk-name" data-pidx="${pidx}" data-aidx="${aidx}" value="${Utils.escHtml(atk.name || '')}" placeholder="공격 이름" style="width:100%;box-sizing:border-box;font-size:12px;margin-bottom:4px;" />
          <div style="position:relative;margin-bottom:4px;">
            <input class="input-field atk-skill-search" data-pidx="${pidx}" data-aidx="${aidx}" placeholder="스킬 검색..." value="${Utils.escHtml(atk.skillName || '')}" autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div class="atk-skill-results" data-pidx="${pidx}" data-aidx="${aidx}" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
            <input type="hidden" class="atk-skill-id" data-pidx="${pidx}" data-aidx="${aidx}" value="${Utils.escHtml(atk.skillId || '')}" />
          </div>
          <textarea class="input-field atk-desc" data-pidx="${pidx}" data-aidx="${aidx}" rows="2" placeholder="공격 설명" style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(atk.desc || '')}</textarea>
        </div>`).join('');
      return `
      <div class="phase-row" data-pidx="${pidx}" style="background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:8px;padding:10px;margin-bottom:8px;width:100%;box-sizing:border-box;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="font-weight:700;font-size:13px;color:#c084fc;">페이즈 ${pidx + 1}</div>
          <button class="btn btn-ghost btn-sm phase-del-btn" data-pidx="${pidx}" style="color:var(--color-danger);font-size:11px;">삭제</button>
        </div>
        <input class="input-field phase-cond" data-pidx="${pidx}" value="${Utils.escHtml(p.condition || '')}" placeholder="HP% 조건 (예: HP 50% 이하)" style="width:100%;box-sizing:border-box;font-size:12px;margin-bottom:4px;" />
        <textarea class="input-field phase-desc" data-pidx="${pidx}" rows="2" placeholder="페이즈 설명" style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;margin-bottom:6px;">${Utils.escHtml(p.desc || '')}</textarea>
        <div class="phase-attacks" id="phaseAttacks${pidx}">${attacksHtml}</div>
        <button class="btn btn-ghost btn-sm atk-add-btn" data-pidx="${pidx}" style="font-size:11px;border:1px dashed var(--color-border);width:100%;">+ 공격 추가</button>
      </div>`;
    };

    const exType = g.explorationConfig?.targetType || 'item';
    const exItemRef = (g.explorationConfig?.target?.type === 'item' || !g.explorationConfig) ? (g.explorationConfig?.target || {}) : {};
    const exPlaceRef = mkPlaceRef(g.explorationConfig?.target?.type === 'place' ? g.explorationConfig.target : null);

    const conceptChipsHtml = [
      { id: 'wave',        label: '웨이브(wave)' },
      { id: 'exploration', label: '탐험(exploration)' },
      { id: 'decapitation',label: '참수작전(decapitation)' },
      { id: 'boss',        label: '보스전(boss)' },
      { id: 'defense',     label: '🛡️ 방어전' },
      { id: 'siege',       label: '⚔️ 공성전' },
      { id: 'speedrun',    label: '🏃 스피드런' },
      { id: 'survival',    label: '⏳ 생존' },
    ].map(c => `<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-surface3,#1e2030);cursor:pointer;font-size:12px;">
      <input type="checkbox" class="concept-cb" value="${c.id}" ${formConcepts.has(c.id) ? 'checked' : ''} /> ${c.label}
    </label>`).join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;padding-right:4px;overflow-x:hidden;min-width:0;">
        ${tf('fGateName', '이름 *', g.name, '던전 이름')}
        ${tf('fGateTrueName', '진명 (소설 뷰에서 숨김)', g.trueName, '진명')}
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">등급</label>
          <select class="select-input" id="fGateGrade" style="width:100%;">${gradeOptions}</select>
        </div>
        <div class="form-group">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <label class="form-label" style="font-size:13px;font-weight:600;margin:0;">종류</label>
            <button type="button" id="btnToggleTypeList" class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 7px;">목록 관리</button>
          </div>
          <select class="select-input" id="fGateType" style="width:100%;">${typeOptions}</select>
          <input class="input-field" id="fGateTypeCustom" placeholder="종류 직접 입력..." style="width:100%;box-sizing:border-box;margin-top:4px;display:${typeIsCustom ? 'block' : 'none'};" value="${typeIsCustom ? Utils.escHtml(existingType) : ''}" />
          <div id="customTypeList" style="display:none;margin-top:6px;padding:8px;background:var(--color-surface3,#1e2030);border-radius:8px;border:1px solid var(--color-border);">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">사용자 정의 종류</div>
            <div id="customTypeItems">
              ${(this._customTypes||[]).length === 0
                ? '<div style="font-size:11px;color:var(--color-text-dim);">없음</div>'
                : (this._customTypes||[]).map(t => `
                  <div class="custom-type-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);">
                    <span style="font-size:12px;">${Utils.escHtml(t)}</span>
                    <button type="button" class="btn-del-custom-type" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button>
                  </div>`).join('')}
            </div>
          </div>
        </div>
        <div class="form-group">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <label class="form-label" style="font-size:13px;font-weight:600;margin:0;">브레이크 유형</label>
            <button type="button" id="btnToggleBreakTypeList" class="btn btn-ghost btn-sm" style="font-size:10px;padding:2px 7px;">목록 관리</button>
          </div>
          <select class="select-input" id="fGateBreakType" style="width:100%;">${breakTypeOptions}</select>
          <input class="input-field" id="fGateBreakTypeCustom" placeholder="브레이크 유형 직접 입력..." style="width:100%;box-sizing:border-box;margin-top:4px;display:${breakTypeIsCustom ? 'block' : 'none'};" value="${breakTypeIsCustom ? Utils.escHtml(existingBreakType) : ''}" />
          <div id="customBreakTypeList" style="display:none;margin-top:6px;padding:8px;background:var(--color-surface3,#1e2030);border-radius:8px;border:1px solid var(--color-border);">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">사용자 정의 브레이크 유형</div>
            <div id="customBreakTypeItems">
              ${(this._customBreakTypes||[]).length === 0
                ? '<div style="font-size:11px;color:var(--color-text-dim);">없음</div>'
                : (this._customBreakTypes||[]).map(t => `
                  <div class="custom-bt-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);">
                    <span style="font-size:12px;">${Utils.escHtml(t)}</span>
                    <button type="button" class="btn-del-custom-bt" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button>
                  </div>`).join('')}
            </div>
          </div>
        </div>
        ${tf('fGateMotif', '모티브', g.motif, '모티브 설명')}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${tf('fGateLevelLimit', '레벨 제한', g.levelLimit, '예: 50')}
          ${tf('fGateMaxPlayers', '최대 인원수', g.maxPlayers, '예: 10')}
        </div>
        ${tf('fGateScale', '규모', g.scale, '예: 중규모')}

        <!-- Concept system -->
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:var(--color-primary);margin-bottom:8px;">컨셉 선택</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">${conceptChipsHtml}</div>
        </div>

        <!-- Wave section -->
        <div id="sectionWave" style="display:${formConcepts.has('wave') ? 'block' : 'none'};border-top:1px solid #60a5fa44;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#60a5fa;margin-bottom:8px;">🌊 웨이브 설정</div>
          <div style="display:flex;gap:16px;margin-bottom:6px;">
            <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;">
              <input type="checkbox" id="waveGlobalEventFixed" ${g.waveConfig?.hasEventFixed ? 'checked' : ''} /> 전체사건고정
            </label>
          </div>
          <div id="waveGlobalEventWrap" style="display:${g.waveConfig?.hasEventFixed ? 'block' : 'none'};margin-bottom:6px;">
            <textarea class="input-field" id="waveGlobalEventDesc" rows="2" placeholder="전체 사건 설명"
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.waveConfig?.fixedEventDesc || '')}</textarea>
          </div>
          <div id="waveList">${formWaves.map((w, i) => waveRowHtml(w, i)).join('')}</div>
          <button class="btn btn-ghost btn-sm" id="btnAddWave" style="width:100%;border:1px dashed #60a5fa55;font-size:12px;color:#60a5fa;margin-top:4px;">+ 웨이브 추가</button>
        </div>

        <!-- Exploration section -->
        <div id="sectionExploration" style="display:${formConcepts.has('exploration') ? 'block' : 'none'};border-top:1px solid #34d39944;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#34d399;margin-bottom:8px;">🔍 탐험 설정</div>
          <div style="display:flex;gap:12px;margin-bottom:6px;">
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
              <input type="radio" name="exType" value="item" ${exType === 'item' ? 'checked' : ''} /> 아이템찾기
            </label>
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
              <input type="radio" name="exType" value="place" ${exType === 'place' ? 'checked' : ''} /> 장소·상황해결
            </label>
          </div>
          <div id="exItemWrap" style="display:${exType === 'item' ? 'block' : 'none'};margin-bottom:6px;position:relative;">
            <input class="input-field" id="exItemSearch" placeholder="아이템 검색..." value="${Utils.escHtml(exItemRef.name || '')}" autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="exItemResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
            <input type="hidden" id="exItemId" value="${Utils.escHtml(exItemRef.id || '')}" />
            ${exItemRef.name ? `<div id="exItemSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;">선택됨: ${Utils.escHtml(exItemRef.name)}</div>` : '<div id="exItemSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;display:none;"></div>'}
          </div>
          <div id="exPlaceWrap" style="display:${exType === 'place' ? 'block' : 'none'};margin-bottom:6px;position:relative;">
            <input class="input-field" id="exPlaceSearch" placeholder="장소 검색..." value="${Utils.escHtml(exPlaceRef.name || '')}" autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="exPlaceResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
            <input type="hidden" id="exPlaceId" value="${Utils.escHtml(exPlaceRef.id || '')}" />
            ${exPlaceRef.name ? `<div id="exPlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;">선택됨: ${Utils.escHtml(exPlaceRef.name)}</div>` : '<div id="exPlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;display:none;"></div>'}
          </div>
          <textarea class="input-field" id="exClearDesc" rows="2" placeholder="클리어 설명"
            style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.explorationConfig?.clearDesc || '')}</textarea>
        </div>

        <!-- Decapitation section -->
        <div id="sectionDecapitation" style="display:${formConcepts.has('decapitation') ? 'block' : 'none'};border-top:1px solid #f8717144;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#f87171;margin-bottom:8px;">⚔️ 참수작전 설정</div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">제거 대상</div>
          <div id="decapChips" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${decapTargets.map(t => chipHtml(t, t.type || 'monster')).join('')}</div>
          ${entitySearchHtml('decapSearch', 'decapResults', '몬스터/캐릭터 검색...')}
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-top:8px;">
            <input type="checkbox" id="decapApplyInWaves" ${g.decapitationConfig?.applyInWaves ? 'checked' : ''} /> 웨이브에서 적용
          </label>
        </div>

        <!-- Boss section -->
        <div id="sectionBoss" style="display:${formConcepts.has('boss') ? 'block' : 'none'};border-top:1px solid #c084fc44;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#c084fc;margin-bottom:8px;">👑 보스전 설정</div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">보스 위치</div>
          ${placeRefHtml('boss', bossPlace)}
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;margin-top:8px;">보스 적</div>
          <div id="bossEnemyChips" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${bossEnemies.map(e => chipHtml(e, e.type || 'monster')).join('')}</div>
          ${entitySearchHtml('bossEnemySearch', 'bossEnemyResults', '몬스터/캐릭터 검색...')}
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;margin-top:8px;">페이즈</div>
          <div id="phaseList">${bossPhases.map((p, i) => phaseRowHtml(p, i)).join('')}</div>
          <button class="btn btn-ghost btn-sm" id="btnAddPhase" style="width:100%;border:1px dashed #c084fc55;font-size:12px;color:#c084fc;margin-top:4px;">+ 페이즈 추가</button>
        </div>

        <!-- Defense section -->
        <div id="sectionDefense" style="display:${formConcepts.has('defense') ? 'block' : 'none'};border-top:1px solid #f59e0b44;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#f59e0b;margin-bottom:8px;">🛡️ 방어전 설정</div>

          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">전장 위치</div>
          ${placeRefHtml('defLoc', defLocPlace)}

          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;margin-top:8px;">지킬 대상 (물건 또는 장소)</div>
          <div id="defTargetChips" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;margin-bottom:4px;">${defTargets.map(t =>
            `<span class="def-target-chip" data-dtype="${Utils.escHtml(t.type||'text')}" data-did="${Utils.escHtml(t.id||'')}" data-dname="${Utils.escHtml(t.name||'')}"
              style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:11px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);">
              ${t.type === 'place' ? '📍' : '📦'} ${Utils.escHtml(t.name||'')}
              <button class="def-target-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:10px;padding:0 2px;">✕</button>
            </span>`).join('')}</div>
          <div style="display:flex;gap:6px;margin-bottom:4px;">
            <input class="input-field" id="defTargetTextInput" placeholder="물건/항목 이름 직접 입력" style="flex:1;font-size:12px;" />
            <button type="button" class="btn btn-ghost btn-sm" id="btnAddDefTargetText" style="font-size:11px;flex-shrink:0;">+ 텍스트</button>
          </div>
          <div style="position:relative;">
            <input class="input-field" id="defTargetPlaceSearch" placeholder="장소창에서 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="defTargetPlaceResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
          </div>

          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;margin-top:8px;">침공군 (몬스터 / 약식 캐릭터)</div>
          <div id="defInvaderChips" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${defInvaders.map(e => chipHtml(e, e.type || 'monster')).join('')}</div>
          ${entitySearchHtml('defInvaderSearch', 'defInvaderResults', '몬스터/캐릭터 검색...')}

          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;margin-top:8px;">방어군 (캐릭터)</div>
          <div id="defDefenderChips" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${defDefenders.map(e => chipHtml(e, 'char')).join('')}</div>
          ${entitySearchHtml('defDefenderSearch', 'defDefenderResults', '캐릭터 검색...')}

          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-top:8px;">
            <input type="checkbox" id="defLinkWave" ${g.defenseConfig?.linkWave ? 'checked' : ''} /> 웨이브 연계
          </label>
          <div class="form-group" style="margin-top:8px;">
            <label class="form-label" style="font-size:12px;">메모</label>
            <textarea class="input-field" id="defNotes" rows="2" placeholder="방어전 관련 메모..."
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.defenseConfig?.notes || '')}</textarea>
          </div>
        </div>

        <!-- Siege section -->
        <div id="sectionSiege" style="display:${formConcepts.has('siege') ? 'block' : 'none'};border-top:1px solid #ef444444;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#ef4444;margin-bottom:8px;">⚔️ 공성전 설정</div>

          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">전장 위치</div>
          ${placeRefHtml('siegeLoc', siegeLocPlace)}

          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;margin-top:8px;">공략 대상 (장소 또는 물건)</div>
          <div id="siegeTargetChips" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;margin-bottom:4px;">${siegeTargets.map(t =>
            `<span class="siege-target-chip" data-stype="${Utils.escHtml(t.type||'text')}" data-sid="${Utils.escHtml(t.id||'')}" data-sname="${Utils.escHtml(t.name||'')}"
              style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:11px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);">
              ${t.type === 'place' ? '📍' : '🎯'} ${Utils.escHtml(t.name||'')}
              <button class="siege-target-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:10px;padding:0 2px;">✕</button>
            </span>`).join('')}</div>
          <div style="display:flex;gap:6px;margin-bottom:4px;">
            <input class="input-field" id="siegeTargetTextInput" placeholder="공략 대상 이름 직접 입력" style="flex:1;font-size:12px;" />
            <button type="button" class="btn btn-ghost btn-sm" id="btnAddSiegeTargetText" style="font-size:11px;flex-shrink:0;">+ 텍스트</button>
          </div>
          <div style="position:relative;">
            <input class="input-field" id="siegeTargetPlaceSearch" placeholder="장소창에서 검색..." autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="siegeTargetPlaceResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
          </div>

          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;margin-top:8px;">수비군 (몬스터 / 적 캐릭터)</div>
          <div id="siegeDefenderChips" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${siegeDefenders.map(e => chipHtml(e, e.type || 'monster')).join('')}</div>
          ${entitySearchHtml('siegeDefenderSearch', 'siegeDefenderResults', '몬스터/캐릭터 검색...')}

          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;margin-top:8px;">공격군 (아군 캐릭터)</div>
          <div id="siegeAttackerChips" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${siegeAttackers.map(e => chipHtml(e, 'char')).join('')}</div>
          ${entitySearchHtml('siegeAttackerSearch', 'siegeAttackerResults', '캐릭터 검색...')}

          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-top:8px;">
            <input type="checkbox" id="siegeLinkWave" ${g.siegeConfig?.linkWave ? 'checked' : ''} /> 웨이브 연계
          </label>
          <div class="form-group" style="margin-top:8px;">
            <label class="form-label" style="font-size:12px;">메모</label>
            <textarea class="input-field" id="siegeNotes" rows="2" placeholder="공성전 관련 메모..."
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.siegeConfig?.notes || '')}</textarea>
          </div>
        </div>

        <!-- Speedrun section -->
        <div id="sectionSpeedrun" style="display:${formConcepts.has('speedrun') ? 'block' : 'none'};border-top:1px solid #22d3ee44;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#22d3ee;margin-bottom:8px;">🏃 스피드런 설정</div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">제한 시간</label>
            <input class="input-field" id="srTimeLimit" value="${Utils.escHtml(g.speedrunConfig?.timeLimit || '')}"
              placeholder="예: 30분, 2시간" style="width:100%;box-sizing:border-box;font-size:12px;" />
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">적용 범위 (어떤 구간/조건에 적용되는지)</label>
            <textarea class="input-field" id="srScope" rows="2" placeholder="예: 전체, 웨이브 1-3, 보스전"
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.speedrunConfig?.scope || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">성공 시 보상 / 이득</label>
            <textarea class="input-field" id="srSuccessRewards" rows="2" placeholder="성공 보상 내용..."
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.speedrunConfig?.successRewards || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">실패 시 패널티 / 손해</label>
            <textarea class="input-field" id="srFailPenalties" rows="2" placeholder="실패 패널티 내용..."
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.speedrunConfig?.failPenalties || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">기타 메모</label>
            <textarea class="input-field" id="srNotes" rows="2" placeholder="스피드런 관련 기타 내용..."
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.speedrunConfig?.notes || '')}</textarea>
          </div>
        </div>

        <!-- Survival section -->
        <div id="sectionSurvival" style="display:${formConcepts.has('survival') ? 'block' : 'none'};border-top:1px solid #a78bfa44;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#a78bfa;margin-bottom:8px;">⏳ 생존 설정</div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">생존 목표 시간</label>
            <input class="input-field" id="svDuration" value="${Utils.escHtml(g.survivalConfig?.duration || '')}"
              placeholder="예: 72시간, 1주일, 72시간 이상" style="width:100%;box-sizing:border-box;font-size:12px;" />
          </div>

          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">위협 요소 — 몬스터</div>
          <div id="svMonChips" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${svMonsters.map(e => chipHtml(e, e.type || 'monster')).join('')}</div>
          ${entitySearchHtml('svMonSearch', 'svMonResults', '몬스터/캐릭터 검색...')}

          <div class="form-group" style="margin-top:8px;">
            <label class="form-label" style="font-size:12px;">위협 요소 — 환경 / 기타</label>
            <textarea class="input-field" id="svEnvThreat" rows="2"
              placeholder="예: 극한 온도, 독가스, 공허, 시간 압박..."
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.survivalConfig?.envThreat || '')}</textarea>
          </div>

          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;margin-top:4px;">스텟 감소 목록</div>
          <div id="svStatList" style="display:flex;flex-direction:column;gap:6px;"></div>
          <button type="button" class="btn btn-ghost btn-sm" id="btnAddSvStat"
            style="width:100%;border:1px dashed #a78bfa55;font-size:12px;color:#a78bfa;margin-top:4px;">+ 스텟 감소 추가</button>

          <div class="form-group" style="margin-top:8px;">
            <label class="form-label" style="font-size:12px;">기타 위험 상황</label>
            <textarea class="input-field" id="svOtherHazards" rows="2"
              placeholder="독이 넘쳐나는 상황, 식량 부족, 동료 전투불능 등..."
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.survivalConfig?.otherHazards || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-size:12px;">메모</label>
            <textarea class="input-field" id="svNotes" rows="2" placeholder="생존전 관련 기타 메모..."
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.survivalConfig?.notes || '')}</textarea>
          </div>
        </div>

        <div style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
          <label class="form-label" style="display:block;margin-bottom:8px;">📌 특징</label>
          <div id="featList" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;"></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <div style="position:relative;flex:1;min-width:120px;">
              <input class="input-field" id="featSearch" placeholder="몬스터/스탯/스킬 검색 후 추가..." autocomplete="off"
                style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="featResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:160px;overflow-y:auto;"></div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" id="btnAddCustomFeat" style="font-size:11px;flex-shrink:0;">+ 직접 입력</button>
          </div>
        </div>
        ${ta('fGateInternalStructure', '내부 구성', g.internalStructure, '내부 구성 설명', 3)}
        ${ta('fGateStrategy', '공략 방법', g.strategy, '공략 방법', 3)}
        ${ta('fGateClearCondition', '클리어 조건', g.clearCondition, '클리어 조건', 2)}
        ${ta('fGateRewards', '보상', g.rewards, '보상 내용 (아이템명 등)', 2)}
        ${ta('fGateFailPenalty', '실패시 패널티', g.failPenalty, '패널티 설명', 2)}
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;color:#fbbf24;font-weight:700;margin-bottom:8px;">히든 정보 (작가 전용)</div>
          ${ta('fGateHiddenClearCondition', '히든 클리어 조건', g.hiddenClearCondition, '히든 클리어 조건', 2)}
          ${ta('fGateHiddenRewards', '히든 보상', g.hiddenRewards, '히든 보상 내용', 2)}
          ${ta('fGateDetails', '세부사항', g.details, '추가 세부사항', 3)}
          ${ta('fGateAuthorNotes', '작가 메모', g.authorNotes, '작가만 보는 메모', 3)}
        </div>
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;color:var(--color-primary);font-weight:700;margin-bottom:8px;">이미지</div>
          <div id="gateImgList" style="display:flex;flex-direction:column;gap:8px;">
            ${existingImages.map((img, i) => `
              <div class="gate-img-slot" data-idx="${i}" style="display:flex;flex-direction:column;gap:4px;background:var(--color-surface3,#1e2030);padding:8px;border-radius:8px;border:1px solid var(--color-border);">
                <div style="display:flex;align-items:center;gap:6px;">
                  <img src="${img.url}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;" />
                  <div style="flex:1;min-width:0;">
                    <input class="input-field gate-img-caption" data-idx="${i}" value="${Utils.escHtml(img.caption || '')}" placeholder="설명 (선택)" style="width:100%;box-sizing:border-box;font-size:12px;" />
                  </div>
                  <button class="btn btn-ghost btn-sm gate-img-del" data-idx="${i}" style="color:var(--color-danger);flex-shrink:0;">✕</button>
                </div>
                <input type="hidden" class="gate-img-url" data-idx="${i}" value="${img.url}" />
              </div>`).join('')}
          </div>
          <div style="margin-top:8px;">
            <label style="font-size:12px;color:var(--color-text-muted);margin-bottom:4px;display:block;">이미지 추가</label>
            <input type="file" id="fGateImageAdd" accept="image/*" style="font-size:12px;" />
          </div>
        </div>
      </div>`;

    // ── Logic helpers (used in both save callback and setTimeout) ──

    const wireSearch = (inputId, resultId, data, renderRow, onSelect) => {
      const inp = document.getElementById(inputId);
      const res = document.getElementById(resultId);
      if (!inp || !res) return;
      inp.addEventListener('input', () => {
        const q = inp.value.trim();
        if (!q) { res.style.display = 'none'; res.innerHTML = ''; return; }
        const source = typeof data === 'function' ? data() : data;
        const matches = source.filter(d => Utils.matchesQuery((d.name || '') + ' ' + (d.grade || ''), q)).slice(0, 20);
        if (!matches.length) { res.style.display = 'none'; return; }
        res.innerHTML = matches.map(d => renderRow(d)).join('');
        res.style.display = 'block';
        res.querySelectorAll('.search-row').forEach(row => {
          row.addEventListener('mousedown', e => { e.preventDefault(); onSelect(row.dataset); inp.value = ''; res.style.display = 'none'; });
        });
      });
      inp.addEventListener('blur', () => setTimeout(() => { res.style.display = 'none'; }, 200));
    };

    const entityRow = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" data-grade="${Utils.escHtml(d.grade || '')}" data-etype="${Utils.escHtml(d._etype || 'monster')}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}${d.grade ? ' (' + Utils.escHtml(d.grade) + ')' : ''} <span style="font-size:10px;color:var(--color-text-muted);">${d._etype === 'char' ? '캐릭터' : '몬스터'}</span></div>`;
    const entityRowTrap = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" data-grade="${Utils.escHtml(d.grade || '')}" data-etype="trap" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}${d.grade ? ' (' + Utils.escHtml(d.grade) + ')' : ''}</div>`;
    const itemRow = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}</div>`;
    const placeRow = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}</div>`;
    const skillRow = (d) => `<div class="search-row" data-id="${Utils.escHtml(d.id)}" data-name="${Utils.escHtml(d.name || '')}" style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);" onmouseover="this.style.background='var(--color-surface3)'" onmouseout="this.style.background=''">${Utils.escHtml(d.name || '')}</div>`;

    const addChipToContainer = (containerId, ent, etype) => {
      const c = document.getElementById(containerId);
      if (!c) return;
      for (const chip of c.querySelectorAll('.entity-chip')) {
        if (chip.dataset.eid === ent.id) return;
      }
      const span = document.createElement('span');
      span.innerHTML = chipHtml({ id: ent.id, name: ent.name, grade: ent.grade, count: 1, unit: etype === 'char' ? '명' : etype === 'trap' ? '개' : '마리', type: etype }, etype);
      const chipEl = span.firstElementChild;
      chipEl.querySelector('.chip-del').addEventListener('click', () => chipEl.remove());
      c.appendChild(chipEl);
    };

    const readChipsFromContainer = (containerId, defaultType) => {
      const c = document.getElementById(containerId);
      if (!c) return [];
      return Array.from(c.querySelectorAll('.entity-chip')).map(chip => ({
        id: chip.dataset.eid,
        type: chip.dataset.etype || defaultType,
        name: chip.dataset.ename || '',
        grade: chip.dataset.egrade || '',
        count: parseInt(chip.querySelector('.chip-count')?.value || '1', 10) || 1,
        unit: chip.querySelector('.chip-unit')?.value || (defaultType === 'char' ? '명' : defaultType === 'trap' ? '개' : '마리'),
      }));
    };

    const wireChipDeletes = (containerId) => {
      const c = document.getElementById(containerId);
      if (!c) return;
      c.querySelectorAll('.chip-del').forEach(btn => btn.addEventListener('click', () => btn.closest('.entity-chip').remove()));
    };

    const wirePlaceRef = (prefix, refObj) => {
      const textDiv = document.getElementById(prefix + 'PlaceTextDiv');
      const refDiv = document.getElementById(prefix + 'PlaceRefDiv');
      document.querySelectorAll(`[name="${prefix}PlaceType"]`).forEach(r => {
        r.addEventListener('change', () => {
          if (textDiv) textDiv.style.display = r.value === 'text' ? 'block' : 'none';
          if (refDiv) refDiv.style.display = r.value === 'ref' ? 'block' : 'none';
        });
      });
      wireSearch(prefix + 'PlaceSearch', prefix + 'PlaceResults', allPlaces, placeRow, (ds) => {
        const idEl = document.getElementById(prefix + 'PlaceId');
        const selEl = document.getElementById(prefix + 'PlaceSelected');
        const searchEl = document.getElementById(prefix + 'PlaceSearch');
        if (idEl) idEl.value = ds.id;
        if (selEl) { selEl.textContent = '선택됨: ' + ds.name; selEl.style.display = ''; }
        if (searchEl) searchEl.value = ds.name;
        refObj.id = ds.id; refObj.name = ds.name; refObj.type = 'ref';
      });
    };

    const readPlaceRef = (prefix) => {
      let type = 'text';
      document.querySelectorAll(`[name="${prefix}PlaceType"]`).forEach(r => { if (r.checked) type = r.value; });
      if (type === 'ref') {
        return { type: 'ref', id: document.getElementById(prefix + 'PlaceId')?.value || '', name: document.getElementById(prefix + 'PlaceSearch')?.value || '', desc: '' };
      }
      return { type: 'text', id: '', name: '', desc: document.getElementById(prefix + 'PlaceText')?.value || '' };
    };

    const syncBossPhasesFromDOM = () => {
      document.querySelectorAll('#globalModalBody .phase-row').forEach(row => {
        const pidx = parseInt(row.dataset.pidx, 10);
        if (!bossPhases[pidx]) return;
        bossPhases[pidx].condition = row.querySelector('.phase-cond')?.value || '';
        bossPhases[pidx].desc = row.querySelector('.phase-desc')?.value || '';
        const attacks = [];
        row.querySelectorAll('.atk-row').forEach(ar => {
          attacks.push({ name: ar.querySelector('.atk-name')?.value || '', skillId: ar.querySelector('.atk-skill-id')?.value || '', skillName: ar.querySelector('.atk-skill-search')?.value || '', desc: ar.querySelector('.atk-desc')?.value || '' });
        });
        bossPhases[pidx].attacks = attacks;
      });
    };

    const reRenderWaveList = () => {
      const wl = document.getElementById('waveList');
      if (wl) {
        wl.innerHTML = formWaves.map((w, i) => waveRowHtml(w, i)).join('');
        wireWaveSection();
      }
    };

    const reRenderPhaseList = () => {
      const pl = document.getElementById('phaseList');
      if (pl) {
        pl.innerHTML = bossPhases.map((p, i) => phaseRowHtml(p, i)).join('');
        wireBossSection();
      }
    };

    const wireWaveSection = () => {
      const allMonChars = [
        ...allMonsters.map(m => ({ ...m, _etype: 'monster' })),
        ...allChars.map(c => ({ ...c, _etype: 'char' })),
      ];
      const getUsedEnemyIds = () => {
        const ids = new Set();
        formWaves.forEach((_, i) => { document.getElementById('waveEnemyChips' + i)?.querySelectorAll('.entity-chip').forEach(chip => ids.add(chip.dataset.eid)); });
        return ids;
      };
      const getUsedTrapIds = () => {
        const ids = new Set();
        formWaves.forEach((_, i) => { document.getElementById('waveTrapChips' + i)?.querySelectorAll('.entity-chip').forEach(chip => ids.add(chip.dataset.eid)); });
        return ids;
      };
      formWaves.forEach((w, idx) => {
        wireChipDeletes('waveEnemyChips' + idx);
        wireChipDeletes('waveTrapChips' + idx);
        wireSearch('waveEnemySearch' + idx, 'waveEnemyResults' + idx,
          () => { const used = getUsedEnemyIds(); return allMonChars.filter(m => !used.has(m.id)); },
          entityRow, (ds) => addChipToContainer('waveEnemyChips' + idx, { id: ds.id, name: ds.name, grade: ds.grade }, ds.etype)
        );
        wireSearch('waveTrapSearch' + idx, 'waveTrapResults' + idx,
          () => { const used = getUsedTrapIds(); return allTraps.filter(t => !used.has(t.id)); },
          entityRowTrap, (ds) => addChipToContainer('waveTrapChips' + idx, { id: ds.id, name: ds.name, grade: ds.grade }, 'trap')
        );
        document.querySelectorAll(`.wave-clear-type[data-widx="${idx}"]`).forEach(cb => {
          cb.addEventListener('change', () => {
            const customWrap = document.getElementById('waveClearCustomWrap' + idx);
            if (customWrap) {
              const hasCustom = [...document.querySelectorAll(`.wave-clear-type[data-widx="${idx}"]`)].some(c => c.value === 'custom' && c.checked);
              customWrap.style.display = hasCustom ? 'block' : 'none';
            }
          });
        });
        const evCb = document.querySelector(`.wave-event-cb[data-widx="${idx}"]`);
        const evWrap = document.getElementById('waveEventWrap' + idx);
        if (evCb && evWrap) evCb.addEventListener('change', () => { evWrap.style.display = evCb.checked ? 'block' : 'none'; });
        const delBtn = document.querySelector(`.wave-del-btn[data-widx="${idx}"]`);
        if (delBtn) {
          delBtn.addEventListener('click', () => {
            document.querySelectorAll('#globalModalBody .wave-row').forEach(row => {
              const wi = parseInt(row.dataset.widx, 10);
              if (!formWaves[wi]) return;
              formWaves[wi].hasEvent = row.querySelector('.wave-event-cb')?.checked || false;
              formWaves[wi].eventDesc = row.querySelector('.wave-event-desc')?.value || '';
              const checkedEls = [...row.querySelectorAll('.wave-clear-type:checked')];
              const clearTypes2 = checkedEls.length > 0 ? checkedEls.map(el => el.value) : (formWaves[wi].clearConditionTypes || ['enemies']);
              formWaves[wi].clearConditionTypes = clearTypes2;
              formWaves[wi].explorationLink = clearTypes2.includes('exploration');
              formWaves[wi].clearCondition = clearTypes2.includes('custom') ? (row.querySelector('.wave-clear-cond')?.value || '') : '';
              formWaves[wi].clearConditionComment = row.querySelector('.wave-clear-comment')?.value || '';
              formWaves[wi].waveNotes = row.querySelector('.wave-notes')?.value || '';
              formWaves[wi].enemies = readChipsFromContainer('waveEnemyChips' + wi, 'monster');
              formWaves[wi].traps = readChipsFromContainer('waveTrapChips' + wi, 'trap');
            });
            formWaves.splice(idx, 1);
            reRenderWaveList();
          });
        }
      });
    };

    const wireBossSection = () => {
      wireChipDeletes('bossEnemyChips');
      const allMonChars = [
        ...allMonsters.map(m => ({ ...m, _etype: 'monster' })),
        ...allChars.map(c => ({ ...c, _etype: 'char' })),
      ];
      wireSearch('bossEnemySearch', 'bossEnemyResults', allMonChars, entityRow, (ds) => {
        addChipToContainer('bossEnemyChips', { id: ds.id, name: ds.name, grade: ds.grade }, ds.etype);
      });
      wirePlaceRef('boss', bossPlace);
      bossPhases.forEach((p, pidx) => {
        const delBtn = document.querySelector(`.phase-del-btn[data-pidx="${pidx}"]`);
        if (delBtn) {
          delBtn.addEventListener('click', () => { syncBossPhasesFromDOM(); bossPhases.splice(pidx, 1); reRenderPhaseList(); });
        }
        const addAtkBtn = document.querySelector(`.atk-add-btn[data-pidx="${pidx}"]`);
        if (addAtkBtn) {
          addAtkBtn.addEventListener('click', () => {
            syncBossPhasesFromDOM();
            if (!bossPhases[pidx].attacks) bossPhases[pidx].attacks = [];
            bossPhases[pidx].attacks.push({ name: '', skillId: '', skillName: '', desc: '' });
            reRenderPhaseList();
          });
        }
        document.querySelectorAll(`.atk-del-btn[data-pidx="${pidx}"]`).forEach(btn => {
          btn.addEventListener('click', () => { syncBossPhasesFromDOM(); bossPhases[pidx].attacks.splice(parseInt(btn.dataset.aidx, 10), 1); reRenderPhaseList(); });
        });
        document.querySelectorAll(`.atk-skill-search[data-pidx="${pidx}"]`).forEach(inp => {
          const aidx = parseInt(inp.dataset.aidx, 10);
          const resEl = document.querySelector(`.atk-skill-results[data-pidx="${pidx}"][data-aidx="${aidx}"]`);
          const idEl = document.querySelector(`.atk-skill-id[data-pidx="${pidx}"][data-aidx="${aidx}"]`);
          if (!inp || !resEl) return;
          inp.addEventListener('input', () => {
            const q = inp.value.trim();
            if (!q) { resEl.style.display = 'none'; resEl.innerHTML = ''; return; }
            const matches = allSkills.filter(s => Utils.matchesQuery(s.name || '', q)).slice(0, 20);
            if (!matches.length) { resEl.style.display = 'none'; return; }
            resEl.innerHTML = matches.map(s => skillRow(s)).join('');
            resEl.style.display = 'block';
            resEl.querySelectorAll('.search-row').forEach(row => {
              row.addEventListener('mousedown', e => { e.preventDefault(); if (idEl) idEl.value = row.dataset.id; inp.value = row.dataset.name; resEl.style.display = 'none'; });
            });
          });
          inp.addEventListener('blur', () => setTimeout(() => { resEl.style.display = 'none'; }, 200));
        });
      });
    };

    const saveFeatTextsFromDOM = () => {
      document.querySelectorAll('#globalModalBody .feat-row').forEach(row => {
        const idx = parseInt(row.dataset.fidx, 10);
        if (formFeatureEntries[idx] === undefined) return;
        formFeatureEntries[idx].text = row.querySelector('.feat-text')?.value.trim() || '';
      });
    };

    Utils.openModal(isEdit ? '던전 편집' : '새 던전 추가', body, async () => {
      const name = document.getElementById('fGateName')?.value.trim();
      if (!name) { Utils.fieldError('fGateName'); return false; }

      let type = document.getElementById('fGateType')?.value || '';
      if (type === '__custom__') { type = document.getElementById('fGateTypeCustom')?.value.trim() || ''; await self._saveCustomType(wid, type); }

      let breakType = document.getElementById('fGateBreakType')?.value || '';
      if (breakType === '__custom__') { breakType = document.getElementById('fGateBreakTypeCustom')?.value.trim() || ''; await self._saveCustomBreakType(wid, breakType); }

      const imgSlots = document.querySelectorAll('#globalModalBody .gate-img-slot');
      const images = [];
      imgSlots.forEach(slot => { const url = slot.querySelector('.gate-img-url')?.value; const caption = slot.querySelector('.gate-img-caption')?.value.trim() || ''; if (url) images.push({ url, caption }); });

      // Collect wave data
      const savedWaves = formWaves.map((w, idx) => {
        const row = document.querySelector(`.wave-row[data-widx="${idx}"]`);
        const checkedEls = row ? [...row.querySelectorAll('.wave-clear-type:checked')] : [];
        const clearTypes2 = checkedEls.length > 0 ? checkedEls.map(el => el.value) : (w.clearConditionTypes || (w.clearConditionType ? [w.clearConditionType] : ['enemies']));
        return {
          hasEvent: row ? (row.querySelector('.wave-event-cb')?.checked || false) : (w.hasEvent || false),
          eventDesc: row ? (row.querySelector('.wave-event-desc')?.value || '') : (w.eventDesc || ''),
          enemies: readChipsFromContainer('waveEnemyChips' + idx, 'monster'),
          traps: readChipsFromContainer('waveTrapChips' + idx, 'trap'),
          clearConditionTypes: clearTypes2,
          explorationLink: clearTypes2.includes('exploration'),
          clearCondition: clearTypes2.includes('custom') ? (row ? (row.querySelector('.wave-clear-cond')?.value || '') : (w.clearCondition || '')) : '',
          clearConditionComment: row ? (row.querySelector('.wave-clear-comment')?.value || '') : (w.clearConditionComment || ''),
          waveNotes: row ? (row.querySelector('.wave-notes')?.value || '') : (w.waveNotes || ''),
        };
      });

      syncBossPhasesFromDOM();
      const savedBossEnemies = readChipsFromContainer('bossEnemyChips', 'monster');
      const savedBossPlace = readPlaceRef('boss');
      const savedDecapTargets = readChipsFromContainer('decapChips', 'monster');

      const exTypeVal = document.querySelector('[name="exType"]:checked')?.value || 'item';
      const savedExRef = exTypeVal === 'item'
        ? { type: 'item', id: document.getElementById('exItemId')?.value || '', name: document.getElementById('exItemSearch')?.value || '' }
        : { type: 'place', id: document.getElementById('exPlaceId')?.value || '', name: document.getElementById('exPlaceSearch')?.value || '' };

      const data = {
        id: g.id || DB.genId(),
        worldId: wid,
        name,
        trueName: document.getElementById('fGateTrueName')?.value.trim() || '',
        grade: document.getElementById('fGateGrade')?.value || '',
        type,
        breakType,
        motif: document.getElementById('fGateMotif')?.value.trim() || '',
        levelLimit: document.getElementById('fGateLevelLimit')?.value.trim() || '',
        maxPlayers: document.getElementById('fGateMaxPlayers')?.value.trim() || '',
        scale: document.getElementById('fGateScale')?.value.trim() || '',
        featureEntries: (() => { saveFeatTextsFromDOM(); return formFeatureEntries.filter(e => e.text.trim() || e.refId); })(),
        internalStructure: document.getElementById('fGateInternalStructure')?.value.trim() || '',
        strategy: document.getElementById('fGateStrategy')?.value.trim() || '',
        clearCondition: document.getElementById('fGateClearCondition')?.value.trim() || '',
        rewards: document.getElementById('fGateRewards')?.value.trim() || '',
        failPenalty: document.getElementById('fGateFailPenalty')?.value.trim() || '',
        hiddenClearCondition: document.getElementById('fGateHiddenClearCondition')?.value.trim() || '',
        hiddenRewards: document.getElementById('fGateHiddenRewards')?.value.trim() || '',
        details: document.getElementById('fGateDetails')?.value.trim() || '',
        authorNotes: document.getElementById('fGateAuthorNotes')?.value.trim() || '',
        images,
        concepts: [...formConcepts],
        waveConfig: formConcepts.has('wave') ? {
          hasEventFixed: document.getElementById('waveGlobalEventFixed')?.checked || false,
          fixedEventDesc: document.getElementById('waveGlobalEventDesc')?.value || '',
          waves: savedWaves,
        } : null,
        explorationConfig: formConcepts.has('exploration') ? {
          targetType: exTypeVal, target: savedExRef,
          clearDesc: document.getElementById('exClearDesc')?.value || '',
        } : null,
        decapitationConfig: formConcepts.has('decapitation') ? {
          targets: savedDecapTargets,
          applyInWaves: document.getElementById('decapApplyInWaves')?.checked || false,
        } : null,
        bossConfig: formConcepts.has('boss') ? {
          place: savedBossPlace, enemies: savedBossEnemies, phases: bossPhases.map(p => ({ ...p })),
        } : null,
        defenseConfig: formConcepts.has('defense') ? {
          location: readPlaceRef('defLoc'),
          targets: [...document.querySelectorAll('#globalModalBody .def-target-chip')].map(el => ({
            type: el.dataset.dtype || 'text', id: el.dataset.did || '', name: el.dataset.dname || '',
          })),
          invaders: readChipsFromContainer('defInvaderChips', 'monster'),
          defenders: readChipsFromContainer('defDefenderChips', 'char'),
          linkWave: document.getElementById('defLinkWave')?.checked || false,
          notes: document.getElementById('defNotes')?.value || '',
        } : null,
        siegeConfig: formConcepts.has('siege') ? {
          location: readPlaceRef('siegeLoc'),
          targets: [...document.querySelectorAll('#globalModalBody .siege-target-chip')].map(el => ({
            type: el.dataset.stype || 'text', id: el.dataset.sid || '', name: el.dataset.sname || '',
          })),
          defenders: readChipsFromContainer('siegeDefenderChips', 'monster'),
          attackers: readChipsFromContainer('siegeAttackerChips', 'char'),
          linkWave: document.getElementById('siegeLinkWave')?.checked || false,
          notes: document.getElementById('siegeNotes')?.value || '',
        } : null,
        speedrunConfig: formConcepts.has('speedrun') ? {
          timeLimit: document.getElementById('srTimeLimit')?.value.trim() || '',
          scope: document.getElementById('srScope')?.value.trim() || '',
          successRewards: document.getElementById('srSuccessRewards')?.value.trim() || '',
          failPenalties: document.getElementById('srFailPenalties')?.value.trim() || '',
          notes: document.getElementById('srNotes')?.value.trim() || '',
        } : null,
        survivalConfig: formConcepts.has('survival') ? {
          duration: document.getElementById('svDuration')?.value.trim() || '',
          monsters: readChipsFromContainer('svMonChips', 'monster'),
          envThreat: document.getElementById('svEnvThreat')?.value.trim() || '',
          statReductions: svStatReductions.map((sr, idx) => ({
            statId:       document.getElementById('svStatId' + idx)?.value || sr.statId || '',
            statName:     document.getElementById('svStatName' + idx)?.value || sr.statName || '',
            amount:       document.getElementById('svStatAmount' + idx)?.value.trim() || sr.amount || '',
            intervalType: document.querySelector(`[name="svStatIval${idx}"]:checked`)?.value || sr.intervalType || 'periodic',
            interval:     document.getElementById('svStatInterval' + idx)?.value.trim() || sr.interval || '',
            desc:         document.getElementById('svStatDesc' + idx)?.value.trim() || sr.desc || '',
          })),
          otherHazards: document.getElementById('svOtherHazards')?.value.trim() || '',
          notes: document.getElementById('svNotes')?.value.trim() || '',
        } : null,
        createdAt: g.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      await DB.put('gates', data);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');
      this._currentId = data.id;
      const all = await DB.getAll('gates', wid);
      const updated = all.find(gg => gg.id === data.id);
      if (updated) this._renderDetail(container, updated, wid);
      else this.init(container);
      return true;
    }, isEdit ? '저장' : '추가');

    setTimeout(() => {
      // Type/breakType custom toggles
      const typeSelect = document.getElementById('fGateType');
      const typeCustom = document.getElementById('fGateTypeCustom');
      typeSelect?.addEventListener('change', () => { typeCustom.style.display = typeSelect.value === '__custom__' ? 'block' : 'none'; });

      const btSelect = document.getElementById('fGateBreakType');
      const btCustom = document.getElementById('fGateBreakTypeCustom');
      btSelect?.addEventListener('change', () => { btCustom.style.display = btSelect.value === '__custom__' ? 'block' : 'none'; });

      // Custom type list toggle
      document.getElementById('btnToggleTypeList')?.addEventListener('click', () => {
        const el = document.getElementById('customTypeList');
        if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
      });
      document.getElementById('btnToggleBreakTypeList')?.addEventListener('click', () => {
        const el = document.getElementById('customBreakTypeList');
        if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
      });

      // Delete custom type
      document.getElementById('customTypeItems')?.addEventListener('click', async e => {
        const btn = e.target.closest('.btn-del-custom-type');
        if (!btn) return;
        self._customTypes = (self._customTypes || []).filter(t => t !== btn.dataset.val);
        await DB.setSetting('gateCustomTypes_' + wid, self._customTypes);
        const allT = [...self.TYPES, ...self._customTypes];
        const typeSelectEl = document.getElementById('fGateType');
        if (typeSelectEl) {
          const cur = typeSelectEl.value;
          typeSelectEl.innerHTML = ['', ...allT, '__custom__'].map(t => t === '__custom__' ? `<option value="__custom__">기타 (직접 입력)...</option>` : `<option value="${t}"${cur === t ? ' selected' : ''}>${t || '선택 안 함'}</option>`).join('');
        }
        const itemsEl = document.getElementById('customTypeItems');
        if (itemsEl) itemsEl.innerHTML = self._customTypes.length === 0 ? '<div style="font-size:11px;color:var(--color-text-dim);">없음</div>' : self._customTypes.map(t => `<div class="custom-type-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);"><span style="font-size:12px;">${Utils.escHtml(t)}</span><button type="button" class="btn-del-custom-type" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button></div>`).join('');
      });

      // Delete custom break type
      document.getElementById('customBreakTypeItems')?.addEventListener('click', async e => {
        const btn = e.target.closest('.btn-del-custom-bt');
        if (!btn) return;
        self._customBreakTypes = (self._customBreakTypes || []).filter(t => t !== btn.dataset.val);
        await DB.setSetting('gateCustomBreakTypes_' + wid, self._customBreakTypes);
        const allBT = [...self.BREAK_TYPES, ...self._customBreakTypes];
        const btSelectEl = document.getElementById('fGateBreakType');
        if (btSelectEl) {
          const cur = btSelectEl.value;
          btSelectEl.innerHTML = ['', ...allBT, '__custom__'].map(t => t === '__custom__' ? `<option value="__custom__">기타 (직접 입력)...</option>` : `<option value="${t}"${cur === t ? ' selected' : ''}>${t || '선택 안 함'}</option>`).join('');
        }
        const itemsEl = document.getElementById('customBreakTypeItems');
        if (itemsEl) itemsEl.innerHTML = self._customBreakTypes.length === 0 ? '<div style="font-size:11px;color:var(--color-text-dim);">없음</div>' : self._customBreakTypes.map(t => `<div class="custom-bt-row" style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;border-radius:4px;margin-bottom:3px;background:var(--color-surface2);"><span style="font-size:12px;">${Utils.escHtml(t)}</span><button type="button" class="btn-del-custom-bt" data-val="${Utils.escHtml(t)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:13px;padding:0 4px;">✕</button></div>`).join('');
      });

      // Delete image slot
      document.getElementById('globalModalBody')?.addEventListener('click', e => {
        const delBtn = e.target.closest('.gate-img-del');
        if (delBtn) document.querySelector(`#globalModalBody .gate-img-slot[data-idx="${delBtn.dataset.idx}"]`)?.remove();
      });

      // Add new image
      document.getElementById('fGateImageAdd')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const url = await Utils.imageToBase64(file);
          const list = document.getElementById('gateImgList');
          if (!list) return;
          const newIdx = Date.now();
          const div = document.createElement('div');
          div.className = 'gate-img-slot';
          div.dataset.idx = newIdx;
          div.style.cssText = 'display:flex;flex-direction:column;gap:4px;background:var(--color-surface3,#1e2030);padding:8px;border-radius:8px;border:1px solid var(--color-border);';
          div.innerHTML = `<div style="display:flex;align-items:center;gap:6px;"><img src="${url}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;" /><div style="flex:1;min-width:0;"><input class="input-field gate-img-caption" data-idx="${newIdx}" value="" placeholder="설명 (선택)" style="width:100%;box-sizing:border-box;font-size:12px;" /></div><button class="btn btn-ghost btn-sm gate-img-del" data-idx="${newIdx}" style="color:var(--color-danger);flex-shrink:0;">✕</button></div><input type="hidden" class="gate-img-url" data-idx="${newIdx}" value="${url}" />`;
          list.appendChild(div);
          e.target.value = '';
        } catch(err) { Utils.toast('이미지 처리 오류', 'error'); }
      });

      // Concept chip toggles
      document.querySelectorAll('.concept-cb').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) formConcepts.add(cb.value); else formConcepts.delete(cb.value);
          const sectionId = 'section' + cb.value.charAt(0).toUpperCase() + cb.value.slice(1);
          const sec = document.getElementById(sectionId);
          if (sec) sec.style.display = cb.checked ? 'block' : 'none';
        });
      });

      // ── Feature entries ──
      const REF_ICONS = { monster: '👾', stat: '📊', skill: '✨', '': '📝' };
      const renderFeatList = () => {
        const el = document.getElementById('featList');
        if (!el) return;
        el.innerHTML = formFeatureEntries.map((e, idx) => `
          <div class="feat-row" data-fidx="${idx}" style="background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:6px;padding:8px 10px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="font-size:12px;color:var(--color-primary);font-weight:700;min-width:18px;">${idx + 1}.</span>
              ${e.refType ? `<span style="font-size:11px;background:rgba(99,102,241,0.18);border:1px solid rgba(99,102,241,0.35);border-radius:4px;padding:1px 6px;">${REF_ICONS[e.refType] || '📝'} ${Utils.escHtml(e.refName)}</span>` : ''}
              <button class="feat-del-btn btn btn-ghost btn-sm" data-fidx="${idx}" style="margin-left:auto;color:var(--color-danger);font-size:10px;padding:1px 6px;">삭제</button>
            </div>
            <textarea class="input-field feat-text" data-fidx="${idx}" rows="2" placeholder="${e.refType ? '효과 설명 (예: 50% 감소, 봉인 등)' : '특징 설명'}"
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(e.text || '')}</textarea>
          </div>`).join('');
        el.querySelectorAll('.feat-del-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            saveFeatTextsFromDOM();
            formFeatureEntries.splice(parseInt(btn.dataset.fidx, 10), 1);
            renderFeatList();
          });
        });
      };
      renderFeatList();
      const featIn = document.getElementById('featSearch');
      const featRs = document.getElementById('featResults');
      if (featIn && featRs) {
        const featAll = [
          ...allMonsters.map(m => ({ id: m.id, name: m.name || '', refType: 'monster', grade: m.grade || '' })),
          ...allStatDefs.map(s => ({ id: s.id, name: s.name || '', refType: 'stat', grade: '' })),
          ...allSkills.map(s => ({ id: s.id, name: s.name || '', refType: 'skill', grade: s.grade || '' })),
        ];
        featIn.addEventListener('input', () => {
          const q = featIn.value.trim();
          if (!q) { featRs.style.display = 'none'; return; }
          const ql = q.toLowerCase();
          const hits = featAll.filter(x => x.name.toLowerCase().includes(ql)).slice(0, 10);
          featRs.innerHTML = hits.map(x =>
            `<div class="feat-result" data-fid="${Utils.escHtml(x.id)}" data-fname="${Utils.escHtml(x.name)}" data-ftype="${x.refType}"
              style="padding:7px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);display:flex;align-items:center;gap:6px;">
              ${REF_ICONS[x.refType] || '📝'} <span>${Utils.escHtml(x.name)}${x.grade ? ` <span style="font-size:11px;color:var(--color-text-muted);">(${Utils.escHtml(x.grade)})</span>` : ''}</span>
            </div>`).join('');
          featRs.style.display = hits.length ? 'block' : 'none';
          featRs.querySelectorAll('.feat-result').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              saveFeatTextsFromDOM();
              formFeatureEntries.push({ id: DB.genId(), refType: row.dataset.ftype, refId: row.dataset.fid, refName: row.dataset.fname, text: '' });
              featIn.value = ''; featRs.style.display = 'none';
              renderFeatList();
            });
          });
        });
        featIn.addEventListener('blur', () => setTimeout(() => { featRs.style.display = 'none'; }, 150));
      }
      document.getElementById('btnAddCustomFeat')?.addEventListener('click', () => {
        saveFeatTextsFromDOM();
        formFeatureEntries.push({ id: DB.genId(), refType: '', refId: '', refName: '', text: '' });
        renderFeatList();
      });

      // Wave global controls
      document.getElementById('waveGlobalEventFixed')?.addEventListener('change', e => {
        const wrap = document.getElementById('waveGlobalEventWrap');
        if (wrap) wrap.style.display = e.target.checked ? 'block' : 'none';
      });

      wireWaveSection();

      document.getElementById('btnAddWave')?.addEventListener('click', () => {
        document.querySelectorAll('#globalModalBody .wave-row').forEach(row => {
          const wi = parseInt(row.dataset.widx, 10);
          if (!formWaves[wi]) return;
          formWaves[wi].hasEvent = row.querySelector('.wave-event-cb')?.checked || false;
          formWaves[wi].eventDesc = row.querySelector('.wave-event-desc')?.value || '';
          const checkedEls = [...row.querySelectorAll('.wave-clear-type:checked')];
          const clearTypes2 = checkedEls.length > 0 ? checkedEls.map(el => el.value) : (formWaves[wi].clearConditionTypes || ['enemies']);
          formWaves[wi].clearConditionTypes = clearTypes2;
          formWaves[wi].explorationLink = clearTypes2.includes('exploration');
          formWaves[wi].clearCondition = clearTypes2.includes('custom') ? (row.querySelector('.wave-clear-cond')?.value || '') : '';
          formWaves[wi].clearConditionComment = row.querySelector('.wave-clear-comment')?.value || '';
          formWaves[wi].waveNotes = row.querySelector('.wave-notes')?.value || '';
          formWaves[wi].enemies = readChipsFromContainer('waveEnemyChips' + wi, 'monster');
          formWaves[wi].traps = readChipsFromContainer('waveTrapChips' + wi, 'trap');
        });
        formWaves.push({ hasEvent: false, eventDesc: '', enemies: [], traps: [], clearConditionTypes: ['enemies'], clearCondition: '', clearConditionComment: '', waveNotes: '', explorationLink: false });
        reRenderWaveList();
      });

      // Exploration section
      const exItemWrap = document.getElementById('exItemWrap');
      const exPlaceWrap = document.getElementById('exPlaceWrap');
      document.querySelectorAll('[name="exType"]').forEach(r => {
        r.addEventListener('change', () => {
          if (exItemWrap) exItemWrap.style.display = r.value === 'item' ? 'block' : 'none';
          if (exPlaceWrap) exPlaceWrap.style.display = r.value === 'place' ? 'block' : 'none';
        });
      });
      wireSearch('exItemSearch', 'exItemResults', allItems, itemRow, (ds) => {
        const idEl = document.getElementById('exItemId');
        const selEl = document.getElementById('exItemSelected');
        const inp = document.getElementById('exItemSearch');
        if (idEl) idEl.value = ds.id;
        if (selEl) { selEl.textContent = '선택됨: ' + ds.name; selEl.style.display = ''; }
        if (inp) inp.value = ds.name;
        exRef.id = ds.id; exRef.name = ds.name;
      });
      wireSearch('exPlaceSearch', 'exPlaceResults', allPlaces, placeRow, (ds) => {
        const idEl = document.getElementById('exPlaceId');
        const selEl = document.getElementById('exPlaceSelected');
        const inp = document.getElementById('exPlaceSearch');
        if (idEl) idEl.value = ds.id;
        if (selEl) { selEl.textContent = '선택됨: ' + ds.name; selEl.style.display = ''; }
        if (inp) inp.value = ds.name;
        exRef.id = ds.id; exRef.name = ds.name;
      });

      // Decapitation section
      const allMonCharsForDecap = [
        ...allMonsters.map(m => ({ ...m, _etype: 'monster' })),
        ...allChars.map(c => ({ ...c, _etype: 'char' })),
      ];
      wireChipDeletes('decapChips');
      wireSearch('decapSearch', 'decapResults', allMonCharsForDecap, entityRow, (ds) => {
        addChipToContainer('decapChips', { id: ds.id, name: ds.name, grade: ds.grade }, ds.etype);
      });

      // Boss section
      wireBossSection();
      document.getElementById('btnAddPhase')?.addEventListener('click', () => {
        syncBossPhasesFromDOM();
        bossPhases.push({ condition: '', desc: '', attacks: [] });
        reRenderPhaseList();
      });

      // ── Defense section ──────────────────────────────────────────────────────
      const allMonCharsAll = [
        ...allMonsters.map(m => ({ ...m, _etype: 'monster' })),
        ...allChars.map(c => ({ ...c, _etype: 'char' })),
      ];

      const renderDefTargets = () => {
        const wrap = document.getElementById('defTargetChips');
        if (!wrap) return;
        wrap.innerHTML = defTargets.map(t =>
          `<span class="def-target-chip" data-dtype="${Utils.escHtml(t.type||'text')}" data-did="${Utils.escHtml(t.id||'')}" data-dname="${Utils.escHtml(t.name||'')}"
            style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:11px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);">
            ${t.type === 'place' ? '📍' : '📦'} ${Utils.escHtml(t.name||'')}
            <button class="def-target-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:10px;padding:0 2px;">✕</button>
          </span>`).join('');
        wrap.querySelectorAll('.def-target-del').forEach((btn, i) => {
          btn.addEventListener('click', () => { defTargets.splice(i, 1); renderDefTargets(); });
        });
      };
      renderDefTargets();

      document.getElementById('btnAddDefTargetText')?.addEventListener('click', () => {
        const inp = document.getElementById('defTargetTextInput');
        const name = inp?.value.trim();
        if (!name) return;
        defTargets.push({ type: 'text', id: '', name });
        renderDefTargets();
        if (inp) inp.value = '';
      });

      wireSearch('defTargetPlaceSearch', 'defTargetPlaceResults', allPlaces, placeRow, (ds) => {
        defTargets.push({ type: 'place', id: ds.id, name: ds.name });
        renderDefTargets();
        const inp = document.getElementById('defTargetPlaceSearch');
        if (inp) inp.value = '';
      });

      wirePlaceRef('defLoc', defLocPlace);
      wireChipDeletes('defInvaderChips');
      wireSearch('defInvaderSearch', 'defInvaderResults', allMonCharsAll, entityRow, (ds) => {
        addChipToContainer('defInvaderChips', { id: ds.id, name: ds.name, grade: ds.grade }, ds._etype || 'monster');
      });
      wireChipDeletes('defDefenderChips');
      wireSearch('defDefenderSearch', 'defDefenderResults', allChars.map(c => ({ ...c, _etype: 'char' })), entityRow, (ds) => {
        addChipToContainer('defDefenderChips', { id: ds.id, name: ds.name, grade: ds.grade }, 'char');
      });

      // ── Siege section ────────────────────────────────────────────────────────
      const renderSiegeTargets = () => {
        const wrap = document.getElementById('siegeTargetChips');
        if (!wrap) return;
        wrap.innerHTML = siegeTargets.map(t =>
          `<span class="siege-target-chip" data-stype="${Utils.escHtml(t.type||'text')}" data-sid="${Utils.escHtml(t.id||'')}" data-sname="${Utils.escHtml(t.name||'')}"
            style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:11px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);">
            ${t.type === 'place' ? '📍' : '🎯'} ${Utils.escHtml(t.name||'')}
            <button class="siege-target-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:10px;padding:0 2px;">✕</button>
          </span>`).join('');
        wrap.querySelectorAll('.siege-target-del').forEach((btn, i) => {
          btn.addEventListener('click', () => { siegeTargets.splice(i, 1); renderSiegeTargets(); });
        });
      };
      renderSiegeTargets();

      document.getElementById('btnAddSiegeTargetText')?.addEventListener('click', () => {
        const inp = document.getElementById('siegeTargetTextInput');
        const name = inp?.value.trim();
        if (!name) return;
        siegeTargets.push({ type: 'text', id: '', name });
        renderSiegeTargets();
        if (inp) inp.value = '';
      });

      wireSearch('siegeTargetPlaceSearch', 'siegeTargetPlaceResults', allPlaces, placeRow, (ds) => {
        siegeTargets.push({ type: 'place', id: ds.id, name: ds.name });
        renderSiegeTargets();
        const inp = document.getElementById('siegeTargetPlaceSearch');
        if (inp) inp.value = '';
      });

      wirePlaceRef('siegeLoc', siegeLocPlace);
      wireChipDeletes('siegeDefenderChips');
      wireSearch('siegeDefenderSearch', 'siegeDefenderResults', allMonCharsAll, entityRow, (ds) => {
        addChipToContainer('siegeDefenderChips', { id: ds.id, name: ds.name, grade: ds.grade }, ds._etype || 'monster');
      });
      wireChipDeletes('siegeAttackerChips');
      wireSearch('siegeAttackerSearch', 'siegeAttackerResults', allChars.map(c => ({ ...c, _etype: 'char' })), entityRow, (ds) => {
        addChipToContainer('siegeAttackerChips', { id: ds.id, name: ds.name, grade: ds.grade }, 'char');
      });

      // ── Survival section ─────────────────────────────────────────────────────
      const svStatRowHtml = (sr, idx) => `
        <div class="sv-stat-row" data-sridx="${idx}" style="background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:8px;padding:8px 10px;position:relative;">
          <button class="sv-stat-del btn btn-ghost btn-sm" data-sridx="${idx}" style="position:absolute;top:6px;right:6px;color:var(--color-danger);font-size:10px;">삭제</button>
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;">
            <span style="font-size:11px;color:var(--color-text-muted);flex-shrink:0;">스텟:</span>
            <div style="position:relative;flex:1;">
              <input class="input-field" id="svStatName${idx}" value="${Utils.escHtml(sr.statName||'')}" placeholder="스텟 검색..." autocomplete="off"
                style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div id="svStatResults${idx}" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;z-index:20;max-height:100px;overflow-y:auto;"></div>
              <input type="hidden" id="svStatId${idx}" value="${Utils.escHtml(sr.statId||'')}" />
            </div>
            <span style="font-size:11px;color:var(--color-text-muted);flex-shrink:0;">감소량:</span>
            <input class="input-field" id="svStatAmount${idx}" value="${Utils.escHtml(sr.amount||'')}" placeholder="예: 10, 5%"
              style="width:72px;font-size:12px;" />
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:4px;">
            <span style="font-size:11px;color:var(--color-text-muted);">주기:</span>
            <label style="display:flex;align-items:center;gap:3px;font-size:12px;cursor:pointer;">
              <input type="radio" name="svStatIval${idx}" value="periodic" ${(sr.intervalType||'periodic')==='periodic'?'checked':''} /> 정기적
            </label>
            <label style="display:flex;align-items:center;gap:3px;font-size:12px;cursor:pointer;">
              <input type="radio" name="svStatIval${idx}" value="irregular" ${sr.intervalType==='irregular'?'checked':''} /> 비정기적
            </label>
            <input class="input-field" id="svStatInterval${idx}" value="${Utils.escHtml(sr.interval||'')}" placeholder="예: 1시간마다, 랜덤"
              style="flex:1;min-width:80px;font-size:12px;" />
          </div>
          <textarea class="input-field" id="svStatDesc${idx}" rows="2" placeholder="추가 설명 (예: 독 중첩 시 배로 증가)"
            style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(sr.desc||'')}</textarea>
        </div>`;

      const renderSvStatList = () => {
        const el = document.getElementById('svStatList');
        if (!el) return;
        el.innerHTML = svStatReductions.map((sr, i) => svStatRowHtml(sr, i)).join('');
        el.querySelectorAll('.sv-stat-del').forEach(btn => {
          btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.sridx, 10);
            svStatReductions.splice(i, 1);
            renderSvStatList();
          });
        });
        svStatReductions.forEach((_, idx) => {
          const nameEl = document.getElementById('svStatName' + idx);
          const resultsEl = document.getElementById('svStatResults' + idx);
          const idEl = document.getElementById('svStatId' + idx);
          if (nameEl && resultsEl && idEl) {
            nameEl.addEventListener('input', () => {
              const q = nameEl.value.trim().toLowerCase();
              if (!q) { resultsEl.style.display = 'none'; return; }
              const hits = allStatDefs.filter(s => (s.name||'').toLowerCase().includes(q)).slice(0, 8);
              resultsEl.innerHTML = hits.map(s =>
                `<div class="sv-stat-result" data-sid="${Utils.escHtml(s.id)}" data-sname="${Utils.escHtml(s.name||'')}"
                  style="padding:6px 10px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--color-border);">📊 ${Utils.escHtml(s.name||'')}</div>`).join('');
              resultsEl.style.display = hits.length ? 'block' : 'none';
              resultsEl.querySelectorAll('.sv-stat-result').forEach(row => {
                row.addEventListener('mousedown', e => {
                  e.preventDefault();
                  idEl.value = row.dataset.sid;
                  nameEl.value = row.dataset.sname;
                  svStatReductions[idx].statId = row.dataset.sid;
                  svStatReductions[idx].statName = row.dataset.sname;
                  resultsEl.style.display = 'none';
                });
              });
            });
            nameEl.addEventListener('blur', () => setTimeout(() => { resultsEl.style.display = 'none'; }, 150));
          }
        });
      };
      renderSvStatList();

      document.getElementById('btnAddSvStat')?.addEventListener('click', () => {
        svStatReductions.push({ statId: '', statName: '', amount: '', intervalType: 'periodic', interval: '', desc: '' });
        renderSvStatList();
      });

      wireChipDeletes('svMonChips');
      wireSearch('svMonSearch', 'svMonResults', allMonCharsAll, entityRow, (ds) => {
        addChipToContainer('svMonChips', { id: ds.id, name: ds.name, grade: ds.grade }, ds._etype || 'monster');
      });

    }, 50);
  },

  // ── PARTIAL COPY ─────────────────────────────────────────────────────────────

  _openPartialCopyModal: function(g) {
    const fields = [
      { key: 'name',               label: '이름',            val: g.name },
      { key: 'grade',              label: '등급',            val: g.grade },
      { key: 'type',               label: '종류',            val: g.type },
      { key: 'breakType',          label: '브레이크 유형',   val: g.breakType },
      { key: 'motif',              label: '모티브',          val: g.motif },
      { key: 'levelLimit',         label: '레벨 제한',       val: g.levelLimit },
      { key: 'maxPlayers',         label: '최대 인원수',     val: g.maxPlayers },
      { key: 'scale',              label: '규모',            val: g.scale },
      { key: 'enemies',            label: '적',              val: g.enemies },
      { key: 'features',           label: '특징',            val: g.features },
      { key: 'internalStructure',  label: '내부 구성',       val: g.internalStructure },
      { key: 'strategy',           label: '공략 방법',       val: g.strategy },
      { key: 'clearCondition',     label: '클리어 조건',     val: g.clearCondition },
      { key: 'rewards',            label: '보상',            val: g.rewards },
      { key: 'failPenalty',        label: '실패시 패널티',   val: g.failPenalty },
      { key: 'hiddenClearCondition', label: '히든 클리어 조건', val: g.hiddenClearCondition },
      { key: 'hiddenRewards',      label: '히든 보상',       val: g.hiddenRewards },
      { key: 'details',            label: '세부사항',        val: g.details },
      { key: 'authorNotes',        label: '작가 메모',       val: g.authorNotes },
    ].filter(f => f.val);

    if (!fields.length) { Utils.toast('복사할 내용이 없습니다', 'error'); return; }

    const body = `
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;gap:8px;margin-bottom:4px;">
          <button id="pCopyAll" class="btn btn-ghost btn-sm" style="font-size:11px;">전체 선택</button>
          <button id="pCopyNone" class="btn btn-ghost btn-sm" style="font-size:11px;">전체 해제</button>
        </div>
        ${fields.map(f => `
          <label style="display:flex;align-items:flex-start;gap:8px;padding:6px 8px;border-radius:6px;background:var(--color-surface2);cursor:pointer;">
            <input type="checkbox" class="pcopy-chk" data-key="${f.key}" checked style="margin-top:2px;flex-shrink:0;" />
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--color-primary);">${f.label}</div>
              <div style="font-size:11px;color:var(--color-text-muted);white-space:pre-wrap;max-height:48px;overflow:hidden;">${Utils.escHtml(String(f.val).substring(0, 80))}${String(f.val).length > 80 ? '...' : ''}</div>
            </div>
          </label>`).join('')}
      </div>`;

    Utils.openModal('텍스트 선택 복사', body, () => {
      const checked = [...document.querySelectorAll('#globalModalBody .pcopy-chk:checked')].map(cb => cb.dataset.key);
      if (!checked.length) { Utils.toast('항목을 선택하세요', 'error'); return false; }
      const selected = fields.filter(f => checked.includes(f.key));
      const lines = [];
      selected.forEach(f => {
        const val = String(f.val);
        lines.push(val.includes('\n') ? `${f.label}:\n${val}` : `${f.label}: ${val}`);
      });
      Utils.copyText(lines.join('\n'));
      Utils.toast('복사됨', 'success');
      return true;
    }, '복사');

    setTimeout(() => {
      document.getElementById('pCopyAll')?.addEventListener('click', () => {
        document.querySelectorAll('#globalModalBody .pcopy-chk').forEach(cb => { cb.checked = true; });
      });
      document.getElementById('pCopyNone')?.addEventListener('click', () => {
        document.querySelectorAll('#globalModalBody .pcopy-chk').forEach(cb => { cb.checked = false; });
      });
    }, 30);
  },

  // ── EXPORT ──────────────────────────────────────────────────────────────────

  _exportText: function(g) {
    const lines = [];
    const add = (label, val) => { if (val) lines.push(`${label}: ${val}`); };
    add('이름', g.name);
    if (g.trueName) lines.push(`진명: ${g.trueName}`);
    add('등급', g.grade);
    add('종류', g.type);
    add('브레이크 유형', g.breakType);
    add('모티브', g.motif);
    add('레벨 제한', g.levelLimit);
    add('최대 인원수', g.maxPlayers);
    add('규모', g.scale);
    if (g.enemies) lines.push(`적:\n${g.enemies}`);
    if (g.features) lines.push(`특징:\n${g.features}`);
    if (g.internalStructure) lines.push(`내부 구성:\n${g.internalStructure}`);
    if (g.strategy) lines.push(`공략 방법:\n${g.strategy}`);
    if (g.clearCondition) lines.push(`클리어 조건:\n${g.clearCondition}`);
    add('보상', g.rewards);
    if (g.failPenalty) lines.push(`실패시 패널티:\n${g.failPenalty}`);
    if (g.hiddenClearCondition) lines.push(`히든 클리어 조건:\n${g.hiddenClearCondition}`);
    add('히든 보상', g.hiddenRewards);
    if (g.details) lines.push(`세부사항:\n${g.details}`);
    if (g.authorNotes) lines.push(`작가 메모:\n${g.authorNotes}`);
    return lines.join('\n');
  },
});
