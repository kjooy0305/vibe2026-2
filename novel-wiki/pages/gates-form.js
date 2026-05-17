'use strict';
// gates-form.js — _openForm & _exportText for window.Pages.gates
// Loaded after gates.js
Object.assign(window.Pages.gates, {
  _openForm: async function(gate, wid, container) {
    const isEdit = !!gate;
    const g = gate || {};
    const self = this;

    const [allMonsters, allChars, allTraps, allItems, allPlaces, allSkills, allStatDefsRaw, allQuests] = await Promise.all([
      DB.getAll('monsters', wid),
      DB.getAll('characters', wid),
      DB.getAll('traps', wid),
      DB.getAll('items', wid),
      DB.getAll('places', wid),
      DB.getAll('skills', wid),
      DB.getAll('statDefs', wid),
      DB.getAll('quests', wid),
    ]);
    let allStatDefs = allStatDefsRaw;
    if (allStatDefs.length === 0 && window.Pages?.statDefs?.DEFAULT_STATS) {
      for (const s of window.Pages.statDefs.DEFAULT_STATS) {
        const rec = { id: DB.genId(), worldId: wid, name: s.name, shortName: s.shortName || '', category: s.category, description: '', createdAt: Date.now() };
        allStatDefs.push(rec);
        DB.put('statDefs', rec);
      }
    }

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
    let formWaves = (g.waveConfig?.waves || []).map(w => ({ ...w, enemies: [...(w.enemies || [])], traps: [...(w.traps || [])], killTargets: [...(w.killTargets || [])] }));
    let formExplWaves = (g.explorationConfig?.waves || []).map(w => ({ ...w, enemies: [...(w.enemies || [])], traps: [...(w.traps || [])], killTargets: [...(w.killTargets || [])] }));
    let formDecapWaves = (g.decapitationConfig?.waves || []).map(w => ({ ...w, enemies: [...(w.enemies || [])], traps: [...(w.traps || [])], killTargets: [...(w.killTargets || [])] }));
    let formBossWaves = (g.bossConfig?.waves || []).map(w => ({ ...w, enemies: [...(w.enemies || [])], traps: [...(w.traps || [])], killTargets: [...(w.killTargets || [])] }));
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
    // Quest linkage state
    let linkedQuests = [...(g.linkedQuests || [])];

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

    const waveRowHtml = (w, idx, globalEventFixed, ns) => {
      ns = ns || 'wave';
      const enemyChips = (w.enemies || []).map(e => chipHtml(e, e.type || 'monster')).join('');
      const trapChips = (w.traps || []).map(t => chipHtml(t, 'trap')).join('');
      const killChips = (w.killTargets || []).map(e => chipHtml(e, e.type || 'monster')).join('');
      const waveQuestChips = (w.linkedQuests || []).map(q =>
        `<span class="${ns}-quest-chip" data-qid="${Utils.escHtml(q.id)}" data-qname="${Utils.escHtml(q.name||'')}" data-ns="${ns}"
          style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:12px;font-size:11px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);">
          📋 ${Utils.escHtml(q.name||'?')}
          <button class="${ns}-quest-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:10px;padding:0 2px;">✕</button>
        </span>`).join('');
      const clearTypes = w.clearConditionTypes || (w.clearConditionType ? [w.clearConditionType] : ['enemies']);
      const clearCondHtml = [
        ['enemies',     '⚔️ 적 처치'],
        ['exploration', '🔍 탐험'],
        ['decapitation','🗡️ 참수'],
        ['boss',        '👑 보스전'],
        ['custom',      '✏️ 직접 입력'],
      ].map(([val, label]) => {
        const active = clearTypes.includes(val);
        return `<button type="button" class="${ns}-cond-chip" data-widx="${idx}" data-ns="${ns}" data-val="${val}" data-active="${active}"
          style="padding:4px 10px;border-radius:6px;border:1px solid ${active ? 'rgba(96,165,250,0.6)' : 'var(--color-border)'};cursor:pointer;font-size:12px;
            background:${active ? 'rgba(96,165,250,0.25)' : 'var(--color-surface3,#1e2030)'};color:var(--color-text);
            transition:all .15s;">${label}</button>`;
      }).join('');
      const explPlace = w.explorationPlace || {};
      const explItem = w.explorationItem || {};
      return `
      <div class="${ns}-row" data-widx="${idx}" data-ns="${ns}" style="background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:8px;padding:10px;margin-bottom:8px;width:100%;box-sizing:border-box;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <button type="button" class="${ns}-toggle" data-widx="${idx}" data-ns="${ns}" style="background:none;border:none;cursor:pointer;color:#60a5fa;font-size:13px;padding:0 2px;">▼</button>
            <div style="font-weight:700;font-size:13px;color:#60a5fa;">${idx + 1}웨이브</div>
          </div>
          <button class="btn btn-ghost btn-sm ${ns}-del-btn" data-widx="${idx}" data-ns="${ns}" style="color:var(--color-danger);font-size:11px;">삭제</button>
        </div>
        <div class="${ns}-body" id="${ns}Body${idx}" style="display:block;">
          <div class="${ns}-event-row" id="${ns}EventRow${idx}" style="margin-bottom:6px;display:${globalEventFixed ? 'none' : 'block'};">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-bottom:4px;">
              <input type="checkbox" class="${ns}-event-cb" data-widx="${idx}" data-ns="${ns}" ${w.hasEvent ? 'checked' : ''} /> 사건발생
            </label>
            <div id="${ns}EventWrap${idx}" style="display:${w.hasEvent ? 'block' : 'none'};">
              <textarea class="input-field ${ns}-event-desc" data-widx="${idx}" data-ns="${ns}" rows="2" placeholder="사건 설명"
                style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(w.eventDesc || '')}</textarea>
            </div>
          </div>
          <div style="margin-bottom:6px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">적</div>
            <div class="${ns}-enemy-chips" id="${ns}EnemyChips${idx}" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${enemyChips}</div>
            ${entitySearchHtml(ns + 'EnemySearch' + idx, ns + 'EnemyResults' + idx, '몬스터/캐릭터 검색...')}
          </div>
          <div style="margin-bottom:6px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">트랩</div>
            <div class="${ns}-trap-chips" id="${ns}TrapChips${idx}" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${trapChips}</div>
            ${entitySearchHtml(ns + 'TrapSearch' + idx, ns + 'TrapResults' + idx, '트랩 검색...')}
          </div>
          <div style="margin-bottom:6px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:4px;">클리어 조건 (중복 선택)</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${clearCondHtml}</div>
            <div id="${ns}ClearCustomWrap${idx}" style="display:${clearTypes.includes('custom') ? 'block' : 'none'};margin-top:4px;">
              <input class="input-field ${ns}-clear-cond" data-widx="${idx}" data-ns="${ns}" value="${Utils.escHtml(w.clearCondition || '')}" placeholder="직접 입력 조건 내용" style="width:100%;box-sizing:border-box;font-size:12px;" />
            </div>
            <div id="${ns}KillTargetWrap${idx}" style="display:${clearTypes.includes('enemies') ? 'block' : 'none'};margin-top:6px;padding:6px;background:rgba(96,165,250,0.07);border-radius:6px;border:1px solid rgba(96,165,250,0.2);">
              <div style="font-size:11px;color:#60a5fa;font-weight:600;margin-bottom:3px;">처치 목표 몬스터</div>
              <div class="${ns}-kill-chips" id="${ns}KillChips${idx}" style="display:flex;flex-wrap:wrap;gap:2px;min-height:20px;">${killChips}</div>
              ${entitySearchHtml(ns + 'KillSearch' + idx, ns + 'KillResults' + idx, '몬스터 검색...')}
            </div>
            <div id="${ns}ExplWrap${idx}" style="display:${clearTypes.includes('exploration') ? 'block' : 'none'};margin-top:6px;padding:6px;background:rgba(52,211,153,0.07);border-radius:6px;border:1px solid rgba(52,211,153,0.2);">
              <div style="font-size:11px;color:#34d399;font-weight:600;margin-bottom:4px;">탐험 연결</div>
              <div style="margin-bottom:4px;">
                <div style="font-size:10px;color:var(--color-text-muted);margin-bottom:2px;">장소</div>
                <div style="position:relative;">
                  <input class="input-field ${ns}-expl-place-search" data-widx="${idx}" data-ns="${ns}" placeholder="장소 검색..." value="${Utils.escHtml(explPlace.name || '')}" autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
                  <div id="${ns}ExplPlaceResults${idx}" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
                  <input type="hidden" class="${ns}-expl-place-id" data-widx="${idx}" data-ns="${ns}" value="${Utils.escHtml(explPlace.id || '')}" />
                </div>
              </div>
              <div>
                <div style="font-size:10px;color:var(--color-text-muted);margin-bottom:2px;">아이템</div>
                <div style="position:relative;">
                  <input class="input-field ${ns}-expl-item-search" data-widx="${idx}" data-ns="${ns}" placeholder="아이템 검색..." value="${Utils.escHtml(explItem.name || '')}" autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
                  <div id="${ns}ExplItemResults${idx}" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
                  <input type="hidden" class="${ns}-expl-item-id" data-widx="${idx}" data-ns="${ns}" value="${Utils.escHtml(explItem.id || '')}" />
                </div>
              </div>
            </div>
            <textarea class="input-field ${ns}-clear-comment" data-widx="${idx}" data-ns="${ns}" rows="2" placeholder="클리어 조건 코멘트..." style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;margin-top:6px;">${Utils.escHtml(w.clearConditionComment || '')}</textarea>
          </div>
          <div style="margin-bottom:6px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">연관 퀘스트</div>
            <div class="${ns}-quest-chips" id="${ns}QuestChips${idx}" style="display:flex;flex-wrap:wrap;gap:3px;min-height:20px;margin-bottom:4px;">${waveQuestChips}</div>
            <div style="position:relative;">
              <input class="input-field ${ns}-quest-search" data-widx="${idx}" data-ns="${ns}" placeholder="퀘스트 검색..." autocomplete="off"
                style="width:100%;box-sizing:border-box;font-size:12px;" />
              <div class="${ns}-quest-results" id="${ns}QuestResults${idx}" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
            </div>
          </div>
          <div style="margin-bottom:4px;">
            <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">기타 메모</div>
            <textarea class="input-field ${ns}-notes" data-widx="${idx}" data-ns="${ns}" rows="2" placeholder="기타 메모..." style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(w.waveNotes || '')}</textarea>
          </div>
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
      { id: 'wave',        label: '🌊 웨이브' },
      { id: 'exploration', label: '🔍 탐험' },
      { id: 'decapitation',label: '🗡️ 참수' },
      { id: 'boss',        label: '👑 보스전' },
      { id: 'defense',     label: '🛡️ 방어전' },
      { id: 'siege',       label: '⚔️ 공성전' },
      { id: 'speedrun',    label: '🏃 스피드런' },
      { id: 'survival',    label: '⏳ 생존' },
    ].map(c => {
      const active = formConcepts.has(c.id);
      return `<button type="button" class="concept-chip" data-cid="${Utils.escHtml(c.id)}" data-active="${active}"
        style="padding:5px 11px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;transition:all .15s;
          border:1px solid ${active ? 'rgba(99,102,241,0.7)' : 'var(--color-border)'};
          background:${active ? 'rgba(99,102,241,0.25)' : 'var(--color-surface3,#1e2030)'};
          color:${active ? '#a5b4fc' : 'var(--color-text-muted)'};">
        ${c.label}
      </button>`;
    }).join('');

    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;padding-right:4px;overflow-x:hidden;min-width:0;">
        ${tf('fGateName', '이름 *', g.name, '던전 이름')}
        ${tf('fGateTrueName', '진명 (소설 뷰에서 숨김)', g.trueName, '진명')}
        <div class="form-group">
          <label class="form-label" style="font-size:13px;font-weight:600;margin-bottom:4px;display:block;">등급</label>
          <select class="select-input" id="fGateGrade" style="width:100%;">${gradeOptions}</select>
        </div>
        <div class="form-group">
          <div style="margin-bottom:4px;">
            <label class="form-label" style="font-size:13px;font-weight:600;margin:0;">종류</label>
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
          <div style="margin-bottom:4px;">
            <label class="form-label" style="font-size:13px;font-weight:600;margin:0;">브레이크 유형</label>
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
          ${tf('fGateLevelLimit', '입장 제한', g.levelLimit, '예: 레벨 50+, 길드원')}
          ${tf('fGateMaxPlayers', '최대 인원수', g.maxPlayers, '예: 10')}
        </div>
        ${tf('fGateScale', '규모', g.scale, '예: 중규모')}

        <!-- 연관 퀘스트 (상단) -->
        <div style="border:1px solid rgba(16,185,129,0.35);border-radius:8px;padding:10px 12px;">
          <div style="font-size:12px;font-weight:700;color:#10b981;margin-bottom:6px;">📋 연관 퀘스트</div>
          <div id="linkedQuestChips" style="display:flex;flex-wrap:wrap;gap:4px;min-height:24px;margin-bottom:6px;">
            ${linkedQuests.map(q => `<span class="linked-quest-chip" data-qid="${Utils.escHtml(q.id)}" data-qname="${Utils.escHtml(q.name||'')}"
              style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;font-size:12px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);">
              📋 ${Utils.escHtml(q.name||'?')}
              <button class="lq-chip-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:10px;padding:0 2px;">✕</button>
            </span>`).join('')}
          </div>
          <div style="position:relative;">
            <input class="input-field" id="linkedQuestSearch" placeholder="퀘스트 검색..." autocomplete="off"
              style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="linkedQuestResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:30;max-height:140px;overflow-y:auto;"></div>
          </div>
        </div>

        <!-- Concept system -->
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:var(--color-primary);margin-bottom:8px;">컨셉 선택</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">${conceptChipsHtml}</div>
        </div>

        <!-- Wave section -->
        <div id="sectionWave" style="display:${formConcepts.has('wave') ? 'block' : 'none'};border-top:1px solid #60a5fa44;padding-top:10px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="font-size:12px;font-weight:700;color:#60a5fa;">🌊 웨이브 설정</div>
            <button type="button" id="btnCollapseWaveSection" style="background:none;border:1px solid #60a5fa55;border-radius:6px;cursor:pointer;color:#60a5fa;font-size:11px;padding:2px 8px;">접기 ▲</button>
          </div>
          <div style="display:flex;gap:16px;margin-bottom:6px;">
            <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;">
              <input type="checkbox" id="waveGlobalEventFixed" ${g.waveConfig?.hasEventFixed ? 'checked' : ''} /> 전체사건고정
            </label>
          </div>
          <div id="waveGlobalEventWrap" style="display:${g.waveConfig?.hasEventFixed ? 'block' : 'none'};margin-bottom:6px;">
            <textarea class="input-field" id="waveGlobalEventDesc" rows="2" placeholder="전체 사건 설명"
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(g.waveConfig?.fixedEventDesc || '')}</textarea>
          </div>
          <div id="waveSectionCollapsible">
            <div id="waveList">${formWaves.map((w, i) => waveRowHtml(w, i, g.waveConfig?.hasEventFixed || false, 'wave')).join('')}</div>
            <button class="btn btn-ghost btn-sm" id="btnAddWave" style="width:100%;border:1px dashed #60a5fa55;font-size:12px;color:#60a5fa;margin-top:4px;">+ 웨이브 추가</button>
          </div>
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
          <div style="border-top:1px solid rgba(52,211,153,0.3);margin-top:10px;padding-top:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <div style="font-size:11px;font-weight:700;color:#34d399;">🔍 탐험 웨이브</div>
              <button type="button" id="btnCollapseExplWaveSection" style="background:none;border:1px solid rgba(52,211,153,0.4);border-radius:6px;cursor:pointer;color:#34d399;font-size:11px;padding:2px 8px;">접기 ▲</button>
            </div>
            <div id="explWaveSectionCollapsible">
              <div id="explWaveList">${formExplWaves.map((w, i) => waveRowHtml(w, i, false, 'expl')).join('')}</div>
              <button class="btn btn-ghost btn-sm" id="btnAddExplWave" style="width:100%;border:1px dashed rgba(52,211,153,0.4);font-size:12px;color:#34d399;margin-top:4px;">+ 웨이브 추가</button>
            </div>
          </div>
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
          <div style="border-top:1px solid rgba(248,113,113,0.3);margin-top:10px;padding-top:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <div style="font-size:11px;font-weight:700;color:#f87171;">🗡️ 참수 웨이브</div>
              <button type="button" id="btnCollapseDecapWaveSection" style="background:none;border:1px solid rgba(248,113,113,0.4);border-radius:6px;cursor:pointer;color:#f87171;font-size:11px;padding:2px 8px;">접기 ▲</button>
            </div>
            <div id="decapWaveSectionCollapsible">
              <div id="decapWaveList">${formDecapWaves.map((w, i) => waveRowHtml(w, i, false, 'decap')).join('')}</div>
              <button class="btn btn-ghost btn-sm" id="btnAddDecapWave" style="width:100%;border:1px dashed rgba(248,113,113,0.4);font-size:12px;color:#f87171;margin-top:4px;">+ 웨이브 추가</button>
            </div>
          </div>
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
          <div style="border-top:1px solid rgba(192,132,252,0.3);margin-top:10px;padding-top:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <div style="font-size:11px;font-weight:700;color:#c084fc;">👑 보스전 웨이브</div>
              <button type="button" id="btnCollapseBossWaveSection" style="background:none;border:1px solid rgba(192,132,252,0.4);border-radius:6px;cursor:pointer;color:#c084fc;font-size:11px;padding:2px 8px;">접기 ▲</button>
            </div>
            <div id="bossWaveSectionCollapsible">
              <div id="bossWaveList">${formBossWaves.map((w, i) => waveRowHtml(w, i, false, 'boss')).join('')}</div>
              <button class="btn btn-ghost btn-sm" id="btnAddBossWave" style="width:100%;border:1px dashed rgba(192,132,252,0.4);font-size:12px;color:#c084fc;margin-top:4px;">+ 웨이브 추가</button>
            </div>
          </div>
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
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;color:#fbbf24;font-weight:700;margin-bottom:8px;">히든 정보 (작가 전용)</div>
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

    const reRenderWaveList = (ns, waveArr, listId) => {
      ns = ns || 'wave';
      waveArr = waveArr || formWaves;
      listId = listId || 'waveList';
      const wl = document.getElementById(listId);
      if (wl) {
        const gef = (ns === 'wave') ? (document.getElementById('waveGlobalEventFixed')?.checked || false) : false;
        wl.innerHTML = waveArr.map((w, i) => waveRowHtml(w, i, gef, ns)).join('');
        wireWaveSection(ns, waveArr, () => reRenderWaveList(ns, waveArr, listId));
      }
    };

    const collectWaveData = (ns, waveArr) => {
      ns = ns || 'wave';
      waveArr = waveArr || formWaves;
      return waveArr.map((w, idx) => {
        const row = document.querySelector(`.${ns}-row[data-widx="${idx}"][data-ns="${ns}"]`);
        const checkedEls = row ? [...row.querySelectorAll(`.${ns}-cond-chip[data-active="true"]`)] : [];
        const clearTypes2 = checkedEls.length > 0 ? checkedEls.map(el => el.dataset.val) : (w.clearConditionTypes || (w.clearConditionType ? [w.clearConditionType] : ['enemies']));
        const killChipsEl = document.getElementById(ns + 'KillChips' + idx);
        const killTargets = killChipsEl ? Array.from(killChipsEl.querySelectorAll('.entity-chip')).map(chip => ({
          id: chip.dataset.eid, type: chip.dataset.etype || 'monster', name: chip.dataset.ename || '',
          grade: chip.dataset.egrade || '',
          count: parseInt(chip.querySelector('.chip-count')?.value || '1', 10) || 1,
          unit: chip.querySelector('.chip-unit')?.value || '마리',
        })) : (w.killTargets || []);
        const explPlaceId = row ? (row.querySelector(`.${ns}-expl-place-id`)?.value || '') : (w.explorationPlace?.id || '');
        const explPlaceName = row ? (row.querySelector(`.${ns}-expl-place-search`)?.value || '') : (w.explorationPlace?.name || '');
        const explItemId = row ? (row.querySelector(`.${ns}-expl-item-id`)?.value || '') : (w.explorationItem?.id || '');
        const explItemName = row ? (row.querySelector(`.${ns}-expl-item-search`)?.value || '') : (w.explorationItem?.name || '');
        return {
          hasEvent: row ? (row.querySelector(`.${ns}-event-cb`)?.checked || false) : (w.hasEvent || false),
          eventDesc: row ? (row.querySelector(`.${ns}-event-desc`)?.value || '') : (w.eventDesc || ''),
          enemies: readChipsFromContainer(ns + 'EnemyChips' + idx, 'monster'),
          traps: readChipsFromContainer(ns + 'TrapChips' + idx, 'trap'),
          killTargets,
          clearConditionTypes: clearTypes2,
          explorationLink: clearTypes2.includes('exploration'),
          clearCondition: clearTypes2.includes('custom') ? (row ? (row.querySelector(`.${ns}-clear-cond`)?.value || '') : (w.clearCondition || '')) : '',
          clearConditionComment: row ? (row.querySelector(`.${ns}-clear-comment`)?.value || '') : (w.clearConditionComment || ''),
          waveNotes: row ? (row.querySelector(`.${ns}-notes`)?.value || '') : (w.waveNotes || ''),
          linkedQuests: [...(document.getElementById(ns + 'QuestChips' + idx)?.querySelectorAll(`.${ns}-quest-chip`) || [])].map(c => ({ id: c.dataset.qid, name: c.dataset.qname })),
          explorationPlace: clearTypes2.includes('exploration') ? { id: explPlaceId, name: explPlaceName } : null,
          explorationItem: clearTypes2.includes('exploration') ? { id: explItemId, name: explItemName } : null,
        };
      });
    };

    const reRenderPhaseList = () => {
      const pl = document.getElementById('phaseList');
      if (pl) {
        pl.innerHTML = bossPhases.map((p, i) => phaseRowHtml(p, i)).join('');
        wireBossSection();
      }
    };

    const wireWaveSection = (ns, waveArr, reRenderFn) => {
      ns = ns || 'wave';
      waveArr = waveArr || formWaves;
      reRenderFn = reRenderFn || (() => reRenderWaveList('wave', formWaves, 'waveList'));
      const allMonChars = [
        ...allMonsters.map(m => ({ ...m, _etype: 'monster' })),
        ...allChars.map(c => ({ ...c, _etype: 'char' })),
      ];
      const getUsedEnemyIds = () => {
        const ids = new Set();
        waveArr.forEach((_, i) => { document.getElementById(ns + 'EnemyChips' + i)?.querySelectorAll('.entity-chip').forEach(chip => ids.add(chip.dataset.eid)); });
        return ids;
      };
      const getUsedTrapIds = () => {
        const ids = new Set();
        waveArr.forEach((_, i) => { document.getElementById(ns + 'TrapChips' + i)?.querySelectorAll('.entity-chip').forEach(chip => ids.add(chip.dataset.eid)); });
        return ids;
      };
      waveArr.forEach((w, idx) => {
        wireChipDeletes(ns + 'EnemyChips' + idx);
        wireChipDeletes(ns + 'TrapChips' + idx);
        wireChipDeletes(ns + 'KillChips' + idx);
        wireSearch(ns + 'EnemySearch' + idx, ns + 'EnemyResults' + idx,
          () => { const used = getUsedEnemyIds(); return allMonChars.filter(m => !used.has(m.id)); },
          entityRow, (ds) => addChipToContainer(ns + 'EnemyChips' + idx, { id: ds.id, name: ds.name, grade: ds.grade }, ds.etype)
        );
        wireSearch(ns + 'TrapSearch' + idx, ns + 'TrapResults' + idx,
          () => { const used = getUsedTrapIds(); return allTraps.filter(t => !used.has(t.id)); },
          entityRowTrap, (ds) => addChipToContainer(ns + 'TrapChips' + idx, { id: ds.id, name: ds.name, grade: ds.grade }, 'trap')
        );
        wireSearch(ns + 'KillSearch' + idx, ns + 'KillResults' + idx,
          allMonsters.map(m => ({ ...m, _etype: 'monster' })),
          entityRow, (ds) => addChipToContainer(ns + 'KillChips' + idx, { id: ds.id, name: ds.name, grade: ds.grade }, 'monster')
        );
        // Exploration place/item search
        const explPlaceInp = document.getElementById(ns + 'ExplWrap' + idx)?.querySelector(`.${ns}-expl-place-search`);
        const explPlaceRes = document.getElementById(ns + 'ExplPlaceResults' + idx);
        const explPlaceIdEl = document.getElementById(ns + 'ExplWrap' + idx)?.querySelector(`.${ns}-expl-place-id`);
        if (explPlaceInp && explPlaceRes) {
          explPlaceInp.addEventListener('input', () => {
            const q = explPlaceInp.value.trim();
            if (!q) { explPlaceRes.style.display = 'none'; return; }
            const hits = allPlaces.filter(p => Utils.matchesQuery(p.name || '', q)).slice(0, 10);
            explPlaceRes.innerHTML = hits.map(p => placeRow(p)).join('');
            explPlaceRes.style.display = hits.length ? 'block' : 'none';
            explPlaceRes.querySelectorAll('.search-row').forEach(row => {
              row.addEventListener('mousedown', e => { e.preventDefault(); if (explPlaceIdEl) explPlaceIdEl.value = row.dataset.id; explPlaceInp.value = row.dataset.name; explPlaceRes.style.display = 'none'; });
            });
          });
          explPlaceInp.addEventListener('blur', () => setTimeout(() => { explPlaceRes.style.display = 'none'; }, 200));
        }
        const explItemInp = document.getElementById(ns + 'ExplWrap' + idx)?.querySelector(`.${ns}-expl-item-search`);
        const explItemRes = document.getElementById(ns + 'ExplItemResults' + idx);
        const explItemIdEl = document.getElementById(ns + 'ExplWrap' + idx)?.querySelector(`.${ns}-expl-item-id`);
        if (explItemInp && explItemRes) {
          explItemInp.addEventListener('input', () => {
            const q = explItemInp.value.trim();
            if (!q) { explItemRes.style.display = 'none'; return; }
            const hits = allItems.filter(it => Utils.matchesQuery(it.name || '', q)).slice(0, 10);
            explItemRes.innerHTML = hits.map(it => itemRow(it)).join('');
            explItemRes.style.display = hits.length ? 'block' : 'none';
            explItemRes.querySelectorAll('.search-row').forEach(row => {
              row.addEventListener('mousedown', e => { e.preventDefault(); if (explItemIdEl) explItemIdEl.value = row.dataset.id; explItemInp.value = row.dataset.name; explItemRes.style.display = 'none'; });
            });
          });
          explItemInp.addEventListener('blur', () => setTimeout(() => { explItemRes.style.display = 'none'; }, 200));
        }
        // Per-wave collapse toggle
        const toggleBtn = document.querySelector(`.${ns}-toggle[data-widx="${idx}"][data-ns="${ns}"]`);
        const bodyEl = document.getElementById(ns + 'Body' + idx);
        if (toggleBtn && bodyEl) {
          toggleBtn.addEventListener('click', () => {
            const collapsed = bodyEl.style.display === 'none';
            bodyEl.style.display = collapsed ? 'block' : 'none';
            toggleBtn.textContent = collapsed ? '▼' : '▶';
          });
        }
        document.querySelectorAll(`.${ns}-cond-chip[data-widx="${idx}"][data-ns="${ns}"]`).forEach(btn => {
          btn.addEventListener('click', () => {
            const isActive = btn.dataset.active === 'true';
            btn.dataset.active = isActive ? 'false' : 'true';
            btn.style.background = !isActive ? 'rgba(96,165,250,0.25)' : 'var(--color-surface3,#1e2030)';
            btn.style.border = !isActive ? '1px solid rgba(96,165,250,0.6)' : '1px solid var(--color-border)';
            const customWrap = document.getElementById(ns + 'ClearCustomWrap' + idx);
            if (customWrap) {
              const hasCustom = [...document.querySelectorAll(`.${ns}-cond-chip[data-widx="${idx}"][data-ns="${ns}"]`)].some(c => c.dataset.val === 'custom' && c.dataset.active === 'true');
              customWrap.style.display = hasCustom ? 'block' : 'none';
            }
            const killWrap = document.getElementById(ns + 'KillTargetWrap' + idx);
            if (killWrap) {
              const hasEnemies = [...document.querySelectorAll(`.${ns}-cond-chip[data-widx="${idx}"][data-ns="${ns}"]`)].some(c => c.dataset.val === 'enemies' && c.dataset.active === 'true');
              killWrap.style.display = hasEnemies ? 'block' : 'none';
            }
            const explWrap = document.getElementById(ns + 'ExplWrap' + idx);
            if (explWrap) {
              const hasExpl = [...document.querySelectorAll(`.${ns}-cond-chip[data-widx="${idx}"][data-ns="${ns}"]`)].some(c => c.dataset.val === 'exploration' && c.dataset.active === 'true');
              explWrap.style.display = hasExpl ? 'block' : 'none';
            }
          });
        });
        const evCb = document.querySelector(`.${ns}-event-cb[data-widx="${idx}"][data-ns="${ns}"]`);
        const evWrap = document.getElementById(ns + 'EventWrap' + idx);
        if (evCb && evWrap) evCb.addEventListener('change', () => { evWrap.style.display = evCb.checked ? 'block' : 'none'; });
        // Wave quest search
        const wqInp = document.querySelector(`.${ns}-quest-search[data-widx="${idx}"][data-ns="${ns}"]`);
        const wqRes = document.getElementById(ns + 'QuestResults' + idx);
        const wqChips = document.getElementById(ns + 'QuestChips' + idx);
        if (wqInp && wqRes && wqChips) {
          wqInp.addEventListener('input', () => {
            const q = wqInp.value.trim().toLowerCase();
            if (!q) { wqRes.style.display = 'none'; return; }
            const hits = allQuests.filter(qs => (qs.name||'').toLowerCase().includes(q)).slice(0, 8);
            wqRes.innerHTML = hits.map(qs => `<div class="${ns}-quest-result" data-qid="${Utils.escHtml(qs.id)}" data-qname="${Utils.escHtml(qs.name||'')}"
              style="padding:6px 10px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">📋 ${Utils.escHtml(qs.name||'?')}</div>`).join('');
            wqRes.style.display = hits.length ? 'block' : 'none';
            wqRes.querySelectorAll(`.${ns}-quest-result`).forEach(row => {
              row.addEventListener('mousedown', e => {
                e.preventDefault();
                const already = [...wqChips.querySelectorAll(`.${ns}-quest-chip`)].some(c => c.dataset.qid === row.dataset.qid);
                if (!already) {
                  const sp = document.createElement('span');
                  sp.innerHTML = `<span class="${ns}-quest-chip" data-qid="${Utils.escHtml(row.dataset.qid)}" data-qname="${Utils.escHtml(row.dataset.qname)}" data-ns="${ns}"
                    style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:12px;font-size:11px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);">
                    📋 ${Utils.escHtml(row.dataset.qname)}
                    <button class="${ns}-quest-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:10px;padding:0 2px;">✕</button>
                  </span>`;
                  const chip = sp.firstElementChild;
                  chip.querySelector(`.${ns}-quest-del`).addEventListener('click', () => chip.remove());
                  wqChips.appendChild(chip);
                }
                wqInp.value = ''; wqRes.style.display = 'none';
              });
            });
          });
          wqInp.addEventListener('blur', () => setTimeout(() => { wqRes.style.display = 'none'; }, 200));
          wqChips.querySelectorAll(`.${ns}-quest-del`).forEach(btn => btn.addEventListener('click', () => btn.closest(`.${ns}-quest-chip`).remove()));
        }
        const delBtn = document.querySelector(`.${ns}-del-btn[data-widx="${idx}"][data-ns="${ns}"]`);
        if (delBtn) {
          delBtn.addEventListener('click', () => {
            // snapshot current DOM state into waveArr before splice
            document.querySelectorAll(`#globalModalBody .${ns}-row`).forEach(row => {
              const wi = parseInt(row.dataset.widx, 10);
              if (!waveArr[wi]) return;
              waveArr[wi].hasEvent = row.querySelector(`.${ns}-event-cb`)?.checked || false;
              waveArr[wi].eventDesc = row.querySelector(`.${ns}-event-desc`)?.value || '';
              const checkedEls2 = [...row.querySelectorAll(`.${ns}-cond-chip[data-active="true"]`)];
              const ct2 = checkedEls2.length > 0 ? checkedEls2.map(el => el.dataset.val) : (waveArr[wi].clearConditionTypes || ['enemies']);
              waveArr[wi].clearConditionTypes = ct2;
              waveArr[wi].explorationLink = ct2.includes('exploration');
              waveArr[wi].clearCondition = ct2.includes('custom') ? (row.querySelector(`.${ns}-clear-cond`)?.value || '') : '';
              waveArr[wi].clearConditionComment = row.querySelector(`.${ns}-clear-comment`)?.value || '';
              waveArr[wi].waveNotes = row.querySelector(`.${ns}-notes`)?.value || '';
              waveArr[wi].enemies = readChipsFromContainer(ns + 'EnemyChips' + wi, 'monster');
              waveArr[wi].traps = readChipsFromContainer(ns + 'TrapChips' + wi, 'trap');
              waveArr[wi].linkedQuests = [...(document.getElementById(ns + 'QuestChips' + wi)?.querySelectorAll(`.${ns}-quest-chip`) || [])].map(c => ({ id: c.dataset.qid, name: c.dataset.qname }));
            });
            waveArr.splice(idx, 1);
            reRenderFn();
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
      const savedWaves = collectWaveData('wave', formWaves);

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
        details: document.getElementById('fGateDetails')?.value.trim() || '',
        linkedQuests: [...document.querySelectorAll('#globalModalBody .linked-quest-chip')].map(el => ({id: el.dataset.qid, name: el.dataset.qname})),
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
          waves: collectWaveData('expl', formExplWaves),
        } : null,
        decapitationConfig: formConcepts.has('decapitation') ? {
          targets: savedDecapTargets,
          applyInWaves: document.getElementById('decapApplyInWaves')?.checked || false,
          waves: collectWaveData('decap', formDecapWaves),
        } : null,
        bossConfig: formConcepts.has('boss') ? {
          place: savedBossPlace, enemies: savedBossEnemies, phases: bossPhases.map(p => ({ ...p })),
          waves: collectWaveData('boss', formBossWaves),
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
      // 양방향 연동: 퀘스트의 linkedGates 자동 반영
      const allQuestsSync = await DB.getAll('quests', wid);
      const newLinkedQuestIds = new Set((data.linkedQuests || []).map(lq => lq.id));
      for (const quest of allQuestsSync) {
        const wasLinked = (quest.linkedGates || []).some(lg => lg.id === data.id);
        const shouldBeLinked = newLinkedQuestIds.has(quest.id);
        if (wasLinked !== shouldBeLinked) {
          quest.linkedGates = shouldBeLinked
            ? [...(quest.linkedGates || []).filter(lg => lg.id !== data.id), { id: data.id, name: data.name }]
            : (quest.linkedGates || []).filter(lg => lg.id !== data.id);
          await DB.put('quests', quest);
        }
      }
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
      document.querySelectorAll('.concept-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const isActive = btn.dataset.active === 'true';
          btn.dataset.active = isActive ? 'false' : 'true';
          btn.style.background = !isActive ? 'rgba(99,102,241,0.25)' : 'var(--color-surface3,#1e2030)';
          btn.style.border = !isActive ? '1px solid rgba(99,102,241,0.7)' : '1px solid var(--color-border)';
          btn.style.color = !isActive ? '#a5b4fc' : 'var(--color-text-muted)';
          const cid = btn.dataset.cid;
          if (!isActive) formConcepts.add(cid); else formConcepts.delete(cid);
          const sectionId = 'section' + cid.charAt(0).toUpperCase() + cid.slice(1);
          const sec = document.getElementById(sectionId);
          if (sec) sec.style.display = !isActive ? 'block' : 'none';
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
        document.querySelectorAll('#globalModalBody .wave-event-row').forEach(row => {
          row.style.display = e.target.checked ? 'none' : 'block';
        });
      });


      // Wave section collapse button
      const btnCollapseWave = document.getElementById('btnCollapseWaveSection');
      const waveSectionCollapsible = document.getElementById('waveSectionCollapsible');
      if (btnCollapseWave && waveSectionCollapsible) {
        btnCollapseWave.addEventListener('click', () => {
          const collapsed = waveSectionCollapsible.style.display === 'none';
          waveSectionCollapsible.style.display = collapsed ? 'block' : 'none';
          btnCollapseWave.textContent = collapsed ? '접기 ▲' : '펼치기 ▼';
        });
      }

      wireWaveSection('wave', formWaves, () => reRenderWaveList('wave', formWaves, 'waveList'));

      const makeAddWaveHandler = (ns, waveArr, listId) => () => {
        // snapshot DOM state before adding
        document.querySelectorAll(`#globalModalBody .${ns}-row`).forEach(row => {
          const wi = parseInt(row.dataset.widx, 10);
          if (!waveArr[wi]) return;
          waveArr[wi].hasEvent = row.querySelector(`.${ns}-event-cb`)?.checked || false;
          waveArr[wi].eventDesc = row.querySelector(`.${ns}-event-desc`)?.value || '';
          const checkedEls = [...row.querySelectorAll(`.${ns}-cond-chip[data-active="true"]`)];
          const ct2 = checkedEls.length > 0 ? checkedEls.map(el => el.dataset.val) : (waveArr[wi].clearConditionTypes || ['enemies']);
          waveArr[wi].clearConditionTypes = ct2;
          waveArr[wi].explorationLink = ct2.includes('exploration');
          waveArr[wi].clearCondition = ct2.includes('custom') ? (row.querySelector(`.${ns}-clear-cond`)?.value || '') : '';
          waveArr[wi].clearConditionComment = row.querySelector(`.${ns}-clear-comment`)?.value || '';
          waveArr[wi].waveNotes = row.querySelector(`.${ns}-notes`)?.value || '';
          waveArr[wi].enemies = readChipsFromContainer(ns + 'EnemyChips' + wi, 'monster');
          waveArr[wi].traps = readChipsFromContainer(ns + 'TrapChips' + wi, 'trap');
          waveArr[wi].linkedQuests = [...(document.getElementById(ns + 'QuestChips' + wi)?.querySelectorAll(`.${ns}-quest-chip`) || [])].map(c => ({ id: c.dataset.qid, name: c.dataset.qname }));
        });
        waveArr.push({ hasEvent: false, eventDesc: '', enemies: [], traps: [], killTargets: [], clearConditionTypes: ['enemies'], clearCondition: '', clearConditionComment: '', waveNotes: '', explorationLink: false, linkedQuests: [] });
        reRenderWaveList(ns, waveArr, listId);
      };

      document.getElementById('btnAddWave')?.addEventListener('click', makeAddWaveHandler('wave', formWaves, 'waveList'));

      // Expl/Decap/Boss wave sections
      const makeWaveSectionCollapseHandler = (btnId, collapsibleId) => {
        const btn = document.getElementById(btnId);
        const collapsible = document.getElementById(collapsibleId);
        if (btn && collapsible) {
          btn.addEventListener('click', () => {
            const collapsed = collapsible.style.display === 'none';
            collapsible.style.display = collapsed ? 'block' : 'none';
            btn.textContent = collapsed ? '접기 ▲' : '펼치기 ▼';
          });
        }
      };
      makeWaveSectionCollapseHandler('btnCollapseExplWaveSection', 'explWaveSectionCollapsible');
      makeWaveSectionCollapseHandler('btnCollapseDecapWaveSection', 'decapWaveSectionCollapsible');
      makeWaveSectionCollapseHandler('btnCollapseBossWaveSection', 'bossWaveSectionCollapsible');

      wireWaveSection('expl', formExplWaves, () => reRenderWaveList('expl', formExplWaves, 'explWaveList'));
      wireWaveSection('decap', formDecapWaves, () => reRenderWaveList('decap', formDecapWaves, 'decapWaveList'));
      wireWaveSection('boss', formBossWaves, () => reRenderWaveList('boss', formBossWaves, 'bossWaveList'));

      document.getElementById('btnAddExplWave')?.addEventListener('click', makeAddWaveHandler('expl', formExplWaves, 'explWaveList'));
      document.getElementById('btnAddDecapWave')?.addEventListener('click', makeAddWaveHandler('decap', formDecapWaves, 'decapWaveList'));
      document.getElementById('btnAddBossWave')?.addEventListener('click', makeAddWaveHandler('boss', formBossWaves, 'bossWaveList'));

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

      // Quest linkage
      const renderLinkedQuestChips = () => {
        const wrap = document.getElementById('linkedQuestChips');
        if (!wrap) return;
        wrap.innerHTML = linkedQuests.map(q => `<span class="linked-quest-chip" data-qid="${Utils.escHtml(q.id)}" data-qname="${Utils.escHtml(q.name||'')}"
          style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;font-size:12px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);">
          📋 ${Utils.escHtml(q.name||'?')}
          <button class="lq-chip-del" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:10px;padding:0 2px;">✕</button>
        </span>`).join('');
        wrap.querySelectorAll('.lq-chip-del').forEach((btn, i) => {
          btn.addEventListener('click', () => { linkedQuests.splice(i, 1); renderLinkedQuestChips(); });
        });
      };
      renderLinkedQuestChips();
      const lqInput = document.getElementById('linkedQuestSearch');
      const lqResults = document.getElementById('linkedQuestResults');
      if (lqInput && lqResults) {
        lqInput.addEventListener('input', () => {
          const q = lqInput.value.trim().toLowerCase();
          if (!q) { lqResults.style.display = 'none'; return; }
          const hits = allQuests.filter(quest => (quest.name||'').toLowerCase().includes(q)).slice(0, 8);
          lqResults.innerHTML = hits.map(quest => `<div class="lq-result" data-qid="${Utils.escHtml(quest.id)}" data-qname="${Utils.escHtml(quest.name||'')}"
            style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">📋 ${Utils.escHtml(quest.name||'?')}</div>`).join('');
          lqResults.style.display = hits.length ? 'block' : 'none';
          lqResults.querySelectorAll('.lq-result').forEach(row => {
            row.addEventListener('mousedown', e => {
              e.preventDefault();
              if (!linkedQuests.find(q => q.id === row.dataset.qid)) {
                linkedQuests.push({ id: row.dataset.qid, name: row.dataset.qname });
                renderLinkedQuestChips();
              }
              lqInput.value = '';
              lqResults.style.display = 'none';
            });
          });
        });
        lqInput.addEventListener('blur', () => setTimeout(() => { lqResults.style.display = 'none'; }, 150));
      }

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
      { key: 'levelLimit',         label: '입장 제한',       val: g.levelLimit },
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
    add('입장 제한', g.levelLimit);
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
