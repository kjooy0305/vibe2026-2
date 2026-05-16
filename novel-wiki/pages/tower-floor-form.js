'use strict';
// tower-floor-form.js — _openFloorForm & _openSubFloorForm for window.Pages.tower
// Loaded after tower.js
Object.assign(window.Pages.tower, {
  _openFloorForm: async function(floor, tower, wid, container, world) {
    const isEdit = !!floor;
    const f = floor || {};
    let newImage = f.image || null;

    const existingFloors = tower.floors || [];
    const defaultFloorNum = !isEdit
      ? (existingFloors.length > 0 ? Math.max(...existingFloors.map(ff => ff.floorNum || 0)) + 1 : 1)
      : undefined;

    // Load all required data
    const [allMonsters, allChars, allTraps, allItems, allPlaces, allSkills, allStatDefsRaw] = await Promise.all([
      DB.getAll('monsters', wid),
      DB.getAll('characters', wid),
      DB.getAll('traps', wid),
      DB.getAll('items', wid),
      DB.getAll('places', wid),
      DB.getAll('skills', wid),
      DB.getAll('statDefs', wid),
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
      if (Array.isArray(f.featureEntries)) {
        return f.featureEntries.map(e => ({...e}));
      }
      const old = f.features || '';
      if (typeof old === 'string' && old.trim()) {
        return old.split('\n').filter(l => l.trim()).map(l => ({
          id: DB.genId(), refType: '', refId: '', refName: '', text: l.trim(),
        }));
      }
      return [];
    })();

    // State
    let formConcepts = new Set(f.concepts || []);
    let formWaves = (f.waveConfig?.waves || []).map(w => ({
      ...w,
      enemies: [...(w.enemies || [])],
      traps: [...(w.traps || [])],
    }));
    let bossPhases = (f.bossConfig?.phases || []).map(p => ({
      ...p,
      attacks: [...(p.attacks || [])],
    }));
    let bossEnemies = [...(f.bossConfig?.enemies || [])];
    let decapTargets = [...(f.decapitationConfig?.targets || [])];
    let exRef = { ...(f.explorationConfig?.target || { id: '', name: '' }) };

    // Place ref helpers
    const mkPlaceRef = (src) => ({ type: src?.type || 'text', id: src?.id || '', name: src?.name || '', desc: src?.desc || '' });
    let waveGlobalFixedPlace = mkPlaceRef(f.waveConfig?.fixedPlace);
    let bossPlace = mkPlaceRef(f.bossConfig?.place);

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
      const icon = type === 'char' ? '👤' : type === 'trap' ? '⚠️' : type === 'item' ? '📦' : '👾';
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
      const locationFixed = w.locationFixed || 'move';
      const wavePlace = mkPlaceRef(w.place);
      const enemyChips = (w.enemies || []).map(e => chipHtml(e, e.type || 'monster')).join('');
      const trapChips = (w.traps || []).map(t => chipHtml(t, 'trap')).join('');
      const clearTypes = w.clearConditionTypes || (w.clearConditionType ? [w.clearConditionType] : ['enemies']);
      const radioStyle = 'display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;';
      const clearCondHtml = [
        ['enemies', '적 처치 완료'],
        ['exploration', '탐험 클리어'],
        ['decapitation', '참수 클리어'],
        ['boss', '보스전 클리어'],
        ['custom', '직접 입력'],
      ].map(([val, label]) =>
        `<label style="${radioStyle}"><input type="checkbox" class="wave-clear-type" value="${val}" data-widx="${idx}" ${clearTypes.includes(val) ? 'checked' : ''} /> ${label}</label>`
      ).join('');
      return `
      <div class="wave-row" data-widx="${idx}" style="background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:8px;padding:10px;margin-bottom:8px;width:100%;box-sizing:border-box;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-weight:700;font-size:13px;color:#60a5fa;">${idx + 1}웨이브</div>
          <button class="btn btn-ghost btn-sm wave-del-btn" data-widx="${idx}" style="color:var(--color-danger);font-size:11px;">삭제</button>
        </div>
        <div class="wave-location-wrap" style="margin-bottom:6px;">
          <div style="font-size:11px;color:var(--color-text-muted);font-weight:600;margin-bottom:3px;">이동 유형</div>
          <div style="display:flex;gap:10px;">
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
              <input type="radio" name="waveLoc${idx}" class="wave-loc-radio" value="fixed" ${locationFixed === 'fixed' ? 'checked' : ''} data-widx="${idx}" /> 장소고정
            </label>
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
              <input type="radio" name="waveLoc${idx}" class="wave-loc-radio" value="move" ${locationFixed === 'move' ? 'checked' : ''} data-widx="${idx}" /> 이동
            </label>
            <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
              <input type="radio" name="waveLoc${idx}" class="wave-loc-radio" value="puzzle" ${locationFixed === 'puzzle' ? 'checked' : ''} data-widx="${idx}" /> 퍼즐
            </label>
          </div>
          <div class="wave-place-ref-wrap" id="wavePlaceRef${idx}" style="margin-top:4px;display:${locationFixed === 'fixed' ? 'block' : 'none'};">
            ${placeRefHtml('waveP' + idx, wavePlace)}
          </div>
        </div>
        <div style="margin-bottom:6px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-bottom:4px;">
            <input type="checkbox" class="wave-event-cb" data-widx="${idx}" ${w.hasEvent ? 'checked' : ''} /> 사건발생
          </label>
          <div class="wave-event-wrap" id="waveEventWrap${idx}" style="display:${w.hasEvent ? 'block' : 'none'};">
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
          <input class="input-field atk-name" data-pidx="${pidx}" data-aidx="${aidx}" value="${Utils.escHtml(atk.name || '')}" placeholder="공격 이름"
            style="width:100%;box-sizing:border-box;font-size:12px;margin-bottom:4px;" />
          <div style="position:relative;margin-bottom:4px;">
            <input class="input-field atk-skill-search" data-pidx="${pidx}" data-aidx="${aidx}" placeholder="스킬 검색..." value="${Utils.escHtml(atk.skillName || '')}"
              autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div class="atk-skill-results" data-pidx="${pidx}" data-aidx="${aidx}" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
            <input type="hidden" class="atk-skill-id" data-pidx="${pidx}" data-aidx="${aidx}" value="${Utils.escHtml(atk.skillId || '')}" />
          </div>
          <textarea class="input-field atk-desc" data-pidx="${pidx}" data-aidx="${aidx}" rows="2" placeholder="공격 설명"
            style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(atk.desc || '')}</textarea>
        </div>`).join('');
      return `
      <div class="phase-row" data-pidx="${pidx}" style="background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:8px;padding:10px;margin-bottom:8px;width:100%;box-sizing:border-box;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="font-weight:700;font-size:13px;color:#c084fc;">페이즈 ${pidx + 1}</div>
          <button class="btn btn-ghost btn-sm phase-del-btn" data-pidx="${pidx}" style="color:var(--color-danger);font-size:11px;">삭제</button>
        </div>
        <input class="input-field phase-cond" data-pidx="${pidx}" value="${Utils.escHtml(p.condition || '')}" placeholder="HP% 조건 (예: HP 50% 이하)"
          style="width:100%;box-sizing:border-box;font-size:12px;margin-bottom:4px;" />
        <textarea class="input-field phase-desc" data-pidx="${pidx}" rows="2" placeholder="페이즈 설명"
          style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;margin-bottom:6px;">${Utils.escHtml(p.desc || '')}</textarea>
        <div class="phase-attacks" id="phaseAttacks${pidx}">${attacksHtml}</div>
        <button class="btn btn-ghost btn-sm atk-add-btn" data-pidx="${pidx}" style="font-size:11px;border:1px dashed var(--color-border);width:100%;">+ 공격 추가</button>
      </div>`;
    };

    const imgHtml = newImage
      ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
           <img src="${newImage}" style="max-width:100px;max-height:80px;border-radius:8px;object-fit:cover;" />
           <button type="button" id="btnDeleteFloorImg" class="btn btn-ghost btn-sm"
             style="color:var(--color-danger);font-size:11px;">🗑 사진 삭제</button>
         </div>`
      : '';

    const CONCEPT_DEFS = [
      { id: 'wave', label: '웨이브(wave)', disabled: false },
      { id: 'exploration', label: '탐험(exploration)', disabled: false },
      { id: 'decapitation', label: '참수작전(decapitation)', disabled: false },
      { id: 'boss', label: '보스전(boss)', disabled: false },
      { id: 'defense', label: '방어전', disabled: true },
      { id: 'siege', label: '공성전', disabled: true },
      { id: 'speedrun', label: '스피드런', disabled: true },
      { id: 'survival', label: '생존', disabled: true },
    ];

    const conceptChipsHtml = CONCEPT_DEFS.map(c => {
      const checked = formConcepts.has(c.id) && !c.disabled;
      if (c.disabled) {
        return `<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-surface3,#1e2030);cursor:not-allowed;opacity:0.45;font-size:12px;">
          <input type="checkbox" disabled />
          ${c.label} <span style="font-size:10px;color:var(--color-text-dim);">(준비 중)</span>
        </label>`;
      }
      return `<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;border:1px solid var(--color-border);background:var(--color-surface3,#1e2030);cursor:pointer;font-size:12px;" class="concept-chip-label">
        <input type="checkbox" class="concept-cb" value="${c.id}" ${checked ? 'checked' : ''} />
        ${c.label}
      </label>`;
    }).join('');

    const exType = f.explorationConfig?.targetType || 'item';
    const exItemRef = f.explorationConfig?.target?.type === 'item' || !f.explorationConfig ? (f.explorationConfig?.target || {}) : {};
    const exPlaceRef = mkPlaceRef(f.explorationConfig?.target?.type === 'place' ? f.explorationConfig.target : null);

    const body = `
      <div style="display:flex;flex-direction:column;gap:10px;padding-right:4px;overflow-x:hidden;min-width:0;">

        <!-- Basic info -->
        <div class="form-group">
          <label class="form-label">층 번호 *</label>
          <input class="input-field" id="fFloorNum" type="number"
            value="${f.floorNum !== undefined ? f.floorNum : (defaultFloorNum !== undefined ? defaultFloorNum : '')}" placeholder="예: 1, 50, 100"
            style="width:100%;box-sizing:border-box;" ${isEdit ? 'readonly' : ''} />
          ${isEdit ? '<div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">층 번호는 수정할 수 없습니다</div>' : '<div id="fFloorNumHint" style="font-size:11px;color:var(--color-text-dim);margin-top:2px;"></div>'}
        </div>
        <!-- 통합 층 -->
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
            <input type="checkbox" id="fIsComposite" ${f.isComposite ? 'checked' : ''} />
            통합 층 (여러 층이 하나로 묶인 구간)
          </label>
          <div id="fCompositeWrap" style="display:${f.isComposite ? 'block' : 'none'};margin-top:8px;">
            <input class="input-field" id="fCompositeRange" value="${Utils.escHtml(f.compositeRange || '')}"
              placeholder="층 범위 (예: 45~60층)" style="width:100%;box-sizing:border-box;margin-bottom:4px;" />
            <div style="font-size:11px;color:var(--color-text-muted);">통합 층은 여러 층이 하나의 공간/퀘스트 그룹으로 묶인 층입니다</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">테마</label>
          <input class="input-field" id="fFloorTheme" value="${Utils.escHtml(f.theme || '')}"
            placeholder="예: 슬라임 사냥터, 마의 삼림" style="width:100%;box-sizing:border-box;" />
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
        <div class="form-group">
          <label class="form-label">퀘스트</label>
          <textarea class="input-field" id="fFloorQuests" rows="2" placeholder="퀘스트 조건"
            style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;">${Utils.escHtml(f.quests || '')}</textarea>
        </div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer;">
            <input type="checkbox" id="fFloorHidden" ${f.hidden ? 'checked' : ''} />
            히든 층
          </label>
        </div>
        <div class="form-group">
          <label class="form-label">이미지</label>
          <div id="floorImgPreview">${imgHtml}</div>
          <input type="file" id="floorImageFile" accept="image/*" style="font-size:13px;" />
        </div>

        <!-- Concept chips -->
        <div style="border-top:1px solid var(--color-border);padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:var(--color-primary);margin-bottom:8px;">컨셉 선택</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;" id="conceptChipArea">
            ${conceptChipsHtml}
          </div>
        </div>

        <!-- Wave section -->
        <div id="sectionWave" style="display:${formConcepts.has('wave') ? 'block' : 'none'};border-top:1px solid #60a5fa44;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#60a5fa;margin-bottom:8px;">🌊 웨이브 설정</div>
          <div style="display:flex;gap:16px;margin-bottom:6px;">
            <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;">
              <input type="checkbox" id="waveGlobalLocFixed" ${f.waveConfig?.locationFixed ? 'checked' : ''} /> 전체위치고정
            </label>
            <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;">
              <input type="checkbox" id="waveGlobalEventFixed" ${f.waveConfig?.hasEventFixed ? 'checked' : ''} /> 전체사건고정
            </label>
          </div>
          <div id="waveGlobalLocWrap" style="display:${f.waveConfig?.locationFixed ? 'block' : 'none'};margin-bottom:6px;padding:8px;background:var(--color-surface3,#1e2030);border-radius:6px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">전체 위치 지정</div>
            ${placeRefHtml('globalWave', waveGlobalFixedPlace)}
          </div>
          <div id="waveGlobalEventWrap" style="display:${f.waveConfig?.hasEventFixed ? 'block' : 'none'};margin-bottom:6px;">
            <textarea class="input-field" id="waveGlobalEventDesc" rows="2" placeholder="전체 사건 설명"
              style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(f.waveConfig?.fixedEventDesc || '')}</textarea>
          </div>
          <div id="waveList">${formWaves.map((w, i) => waveRowHtml(w, i)).join('')}</div>
          <button class="btn btn-ghost btn-sm" id="btnAddWave" style="width:100%;border:1px dashed #60a5fa55;font-size:12px;color:#60a5fa;margin-top:4px;">+ 웨이브 추가</button>
        </div>

        <!-- Exploration section -->
        <div id="sectionExploration" style="display:${formConcepts.has('exploration') ? 'block' : 'none'};border-top:1px solid #34d39944;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#34d399;margin-bottom:8px;">🔍 탐험 설정</div>
          <div style="margin-bottom:6px;">
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">클리어 유형</div>
            <div style="display:flex;gap:12px;">
              <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
                <input type="radio" name="exType" id="exTypeItem" value="item" ${exType === 'item' ? 'checked' : ''} /> 아이템찾기
              </label>
              <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;">
                <input type="radio" name="exType" id="exTypePlace" value="place" ${exType === 'place' ? 'checked' : ''} /> 장소·상황해결
              </label>
            </div>
          </div>
          <div id="exItemWrap" style="display:${exType === 'item' ? 'block' : 'none'};margin-bottom:6px;position:relative;">
            <input class="input-field" id="exItemSearch" placeholder="아이템 검색..." value="${Utils.escHtml(exItemRef.name || '')}"
              autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="exItemResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
            <input type="hidden" id="exItemId" value="${Utils.escHtml(exItemRef.id || '')}" />
            ${exItemRef.name ? `<div id="exItemSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;">선택됨: ${Utils.escHtml(exItemRef.name)}</div>` : '<div id="exItemSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;display:none;"></div>'}
          </div>
          <div id="exPlaceWrap" style="display:${exType === 'place' ? 'block' : 'none'};margin-bottom:6px;position:relative;">
            <input class="input-field" id="exPlaceSearch" placeholder="장소 검색..." value="${Utils.escHtml(exPlaceRef.name || '')}"
              autocomplete="off" style="width:100%;box-sizing:border-box;font-size:12px;" />
            <div id="exPlaceResults" style="display:none;position:absolute;z-index:300;width:100%;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:6px;max-height:120px;overflow-y:auto;top:100%;left:0;"></div>
            <input type="hidden" id="exPlaceId" value="${Utils.escHtml(exPlaceRef.id || '')}" />
            ${exPlaceRef.name ? `<div id="exPlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;">선택됨: ${Utils.escHtml(exPlaceRef.name)}</div>` : '<div id="exPlaceSelected" style="font-size:11px;color:var(--color-primary);margin-top:2px;display:none;"></div>'}
          </div>
          <textarea class="input-field" id="exClearDesc" rows="2" placeholder="클리어 설명"
            style="width:100%;box-sizing:border-box;font-size:12px;resize:vertical;">${Utils.escHtml(f.explorationConfig?.clearDesc || '')}</textarea>
        </div>

        <!-- Decapitation section -->
        <div id="sectionDecapitation" style="display:${formConcepts.has('decapitation') ? 'block' : 'none'};border-top:1px solid #f8717144;padding-top:10px;">
          <div style="font-size:12px;font-weight:700;color:#f87171;margin-bottom:8px;">⚔️ 참수작전 설정</div>
          <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">제거 대상</div>
          <div id="decapChips" style="display:flex;flex-wrap:wrap;gap:2px;min-height:24px;">${decapTargets.map(t => chipHtml(t, t.type || 'monster')).join('')}</div>
          ${entitySearchHtml('decapSearch', 'decapResults', '몬스터/캐릭터 검색...')}
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;margin-top:8px;">
            <input type="checkbox" id="decapApplyInWaves" ${f.decapitationConfig?.applyInWaves ? 'checked' : ''} /> 웨이브에서적용
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

      </div>`;

    // ── wireSearch helper (runs after modal renders) ──
    // data can be an array or a function () => array for dynamic filtering
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
          row.addEventListener('mousedown', e => {
            e.preventDefault();
            onSelect(row.dataset);
            inp.value = '';
            res.style.display = 'none';
          });
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
      const existing = c.querySelectorAll('.entity-chip');
      for (const chip of existing) {
        if (chip.dataset.eid === ent.id) return; // already added
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
      c.querySelectorAll('.chip-del').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('.entity-chip').remove());
      });
    };

    const wirePlaceRef = (prefix, refObj) => {
      const textDiv = document.getElementById(prefix + 'PlaceTextDiv');
      const refDiv = document.getElementById(prefix + 'PlaceRefDiv');
      const radios = document.querySelectorAll(`[name="${prefix}PlaceType"]`);
      radios.forEach(r => {
        r.addEventListener('change', () => {
          if (r.value === 'text') {
            if (textDiv) textDiv.style.display = 'block';
            if (refDiv) refDiv.style.display = 'none';
          } else {
            if (textDiv) textDiv.style.display = 'none';
            if (refDiv) refDiv.style.display = 'block';
          }
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
      const radios = document.querySelectorAll(`[name="${prefix}PlaceType"]`);
      let type = 'text';
      radios.forEach(r => { if (r.checked) type = r.value; });
      if (type === 'ref') {
        return {
          type: 'ref',
          id: document.getElementById(prefix + 'PlaceId')?.value || '',
          name: document.getElementById(prefix + 'PlaceSearch')?.value || '',
          desc: '',
        };
      }
      return { type: 'text', id: '', name: '', desc: document.getElementById(prefix + 'PlaceText')?.value || '' };
    };

    const syncBossPhasesFromDOM = () => {
      document.querySelectorAll('#globalModalBody .phase-row').forEach(row => {
        const pidx = parseInt(row.dataset.pidx, 10);
        if (!bossPhases[pidx]) return;
        bossPhases[pidx].condition = row.querySelector('.phase-cond')?.value || '';
        bossPhases[pidx].desc = row.querySelector('.phase-desc')?.value || '';
        const attackRows = row.querySelectorAll('.atk-row');
        const attacks = [];
        attackRows.forEach(ar => {
          const aidx = parseInt(ar.dataset.aidx, 10);
          attacks.push({
            name: ar.querySelector('.atk-name')?.value || '',
            skillId: ar.querySelector('.atk-skill-id')?.value || '',
            skillName: ar.querySelector('.atk-skill-search')?.value || '',
            desc: ar.querySelector('.atk-desc')?.value || '',
          });
        });
        bossPhases[pidx].attacks = attacks;
      });
    };

    const applyGlobalLocFixed = (isFixed) => {
      document.querySelectorAll('#globalModalBody .wave-loc-radio[value="fixed"]').forEach(radio => {
        const label = radio.closest('label');
        if (label) label.style.display = isFixed ? 'none' : '';
        if (isFixed && radio.checked) {
          const moveRadio = document.querySelector(`input[name="${radio.name}"][value="move"]`);
          if (moveRadio) moveRadio.checked = true;
          const placeRef = document.getElementById('wavePlaceRef' + radio.dataset.widx);
          if (placeRef) placeRef.style.display = 'none';
        }
      });
    };

    const reRenderWaveList = () => {
      const wl = document.getElementById('waveList');
      if (wl) {
        wl.innerHTML = formWaves.map((w, i) => waveRowHtml(w, i)).join('');
        wireWaveSection();
        applyGlobalLocFixed(document.getElementById('waveGlobalLocFixed')?.checked || false);
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

      // Returns entity IDs already used across ALL wave enemy/trap containers
      const getUsedEnemyIds = () => {
        const ids = new Set();
        formWaves.forEach((_, i) => {
          document.getElementById('waveEnemyChips' + i)
            ?.querySelectorAll('.entity-chip')
            .forEach(chip => ids.add(chip.dataset.eid));
        });
        return ids;
      };
      const getUsedTrapIds = () => {
        const ids = new Set();
        formWaves.forEach((_, i) => {
          document.getElementById('waveTrapChips' + i)
            ?.querySelectorAll('.entity-chip')
            .forEach(chip => ids.add(chip.dataset.eid));
        });
        return ids;
      };

      // Wire per-wave enemy/trap search
      formWaves.forEach((w, idx) => {
        wireChipDeletes('waveEnemyChips' + idx);
        wireChipDeletes('waveTrapChips' + idx);
        wireSearch('waveEnemySearch' + idx, 'waveEnemyResults' + idx,
          () => {
            const used = getUsedEnemyIds();
            return allMonChars.filter(m => !used.has(m.id));
          },
          entityRow, (ds) => {
            addChipToContainer('waveEnemyChips' + idx, { id: ds.id, name: ds.name, grade: ds.grade }, ds.etype);
          }
        );
        wireSearch('waveTrapSearch' + idx, 'waveTrapResults' + idx,
          () => {
            const used = getUsedTrapIds();
            return allTraps.filter(t => !used.has(t.id));
          },
          entityRowTrap, (ds) => {
            addChipToContainer('waveTrapChips' + idx, { id: ds.id, name: ds.name, grade: ds.grade }, 'trap');
          }
        );
        // Location radio toggle
        const locRadios = document.querySelectorAll(`.wave-loc-radio[data-widx="${idx}"]`);
        locRadios.forEach(r => {
          r.addEventListener('change', () => {
            const placeWrap = document.getElementById('wavePlaceRef' + idx);
            if (placeWrap) placeWrap.style.display = r.value === 'fixed' ? 'block' : 'none';
          });
        });
        wirePlaceRef('waveP' + idx, w.place ? mkPlaceRef(w.place) : { type: 'text', id: '', name: '', desc: '' });
        // Clear condition checkbox toggle
        document.querySelectorAll(`.wave-clear-type[data-widx="${idx}"]`).forEach(cb => {
          cb.addEventListener('change', () => {
            const customWrap = document.getElementById('waveClearCustomWrap' + idx);
            if (customWrap) {
              const hasCustom = [...document.querySelectorAll(`.wave-clear-type[data-widx="${idx}"]`)].some(c => c.value === 'custom' && c.checked);
              customWrap.style.display = hasCustom ? 'block' : 'none';
            }
          });
        });
        // Event checkbox
        const evCb = document.querySelector(`.wave-event-cb[data-widx="${idx}"]`);
        const evWrap = document.getElementById('waveEventWrap' + idx);
        if (evCb && evWrap) {
          evCb.addEventListener('change', () => {
            evWrap.style.display = evCb.checked ? 'block' : 'none';
          });
        }
        // Delete wave
        const delBtn = document.querySelector(`.wave-del-btn[data-widx="${idx}"]`);
        if (delBtn) {
          delBtn.addEventListener('click', () => {
            // Save current state from DOM before removing
            document.querySelectorAll('#globalModalBody .wave-row').forEach(row => {
              const wi = parseInt(row.dataset.widx, 10);
              if (!formWaves[wi]) return;
              const locRadioEl = row.querySelector('.wave-loc-radio:checked');
              formWaves[wi].locationFixed = locRadioEl ? locRadioEl.value : 'move';
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

      // Phase controls
      bossPhases.forEach((p, pidx) => {
        const delBtn = document.querySelector(`.phase-del-btn[data-pidx="${pidx}"]`);
        if (delBtn) {
          delBtn.addEventListener('click', () => {
            syncBossPhasesFromDOM();
            bossPhases.splice(pidx, 1);
            reRenderPhaseList();
          });
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
        // Attack deletes
        document.querySelectorAll(`.atk-del-btn[data-pidx="${pidx}"]`).forEach(btn => {
          btn.addEventListener('click', () => {
            syncBossPhasesFromDOM();
            const aidx = parseInt(btn.dataset.aidx, 10);
            bossPhases[pidx].attacks.splice(aidx, 1);
            reRenderPhaseList();
          });
        });
        // Skill search for each attack
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
              row.addEventListener('mousedown', e => {
                e.preventDefault();
                if (idEl) idEl.value = row.dataset.id;
                inp.value = row.dataset.name;
                resEl.style.display = 'none';
              });
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

    // ── Save callback ──
    Utils.openModal(isEdit ? `${f.floorNum}층 편집` : '새 층 추가', body, async () => {
      const numVal = document.getElementById('fFloorNum')?.value;
      if (numVal === '' || numVal === null || numVal === undefined) {
        Utils.fieldError('fFloorNum'); return false;
      }
      const floorNum = parseInt(numVal, 10);
      if (isNaN(floorNum)) { Utils.fieldError('fFloorNum'); return false; }
      if (!isEdit) {
        const exists = (tower.floors || []).some(ff => ff.floorNum === floorNum);
        if (exists) { Utils.toast(`${floorNum}층이 이미 존재합니다`, 'error'); return false; }
      }

      const imgFile = document.getElementById('floorImageFile')?.files?.[0];
      if (imgFile) newImage = await Utils.imageToBase64(imgFile);

      // Collect wave data from DOM
      const savedWaves = formWaves.map((w, idx) => {
        const row = document.querySelector(`.wave-row[data-widx="${idx}"]`);
        const locRadioEl = row ? row.querySelector('.wave-loc-radio:checked') : null;
        const locType = locRadioEl ? locRadioEl.value : (w.locationFixed || 'move');
        const checkedEls = row ? [...row.querySelectorAll('.wave-clear-type:checked')] : [];
        const clearTypes2 = checkedEls.length > 0 ? checkedEls.map(el => el.value) : (w.clearConditionTypes || (w.clearConditionType ? [w.clearConditionType] : ['enemies']));
        return {
          locationFixed: locType,
          place: locType === 'fixed' ? readPlaceRef('waveP' + idx) : null,
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

      // Collect decap targets
      const savedDecapTargets = readChipsFromContainer('decapChips', 'monster');

      // Collect boss data
      syncBossPhasesFromDOM();
      const savedBossEnemies = readChipsFromContainer('bossEnemyChips', 'monster');
      const savedBossPlace = readPlaceRef('boss');
      const savedPhases = bossPhases.map(p => ({ ...p }));

      // Exploration
      const exTypeVal = document.querySelector('[name="exType"]:checked')?.value || 'item';
      let savedExRef;
      if (exTypeVal === 'item') {
        savedExRef = { type: 'item', id: document.getElementById('exItemId')?.value || '', name: document.getElementById('exItemSearch')?.value || '' };
      } else {
        savedExRef = { type: 'place', id: document.getElementById('exPlaceId')?.value || '', name: document.getElementById('exPlaceSearch')?.value || '' };
      }

      saveFeatTextsFromDOM();
      const isComposite = document.getElementById('fIsComposite')?.checked || false;
      const floorData = {
        floorNum,
        isComposite,
        compositeRange: isComposite ? (document.getElementById('fCompositeRange')?.value.trim() || '') : '',
        theme:    document.getElementById('fFloorTheme')?.value.trim()    || '',
        featureEntries: formFeatureEntries.filter(e => e.text.trim() || e.refId),
        quests:   document.getElementById('fFloorQuests')?.value.trim()   || '',
        hidden:   document.getElementById('fFloorHidden')?.checked        || false,
        image:    newImage,
        subFloors: f.subFloors || [],
        concepts: [...formConcepts],
        waveConfig: formConcepts.has('wave') ? {
          locationFixed: document.getElementById('waveGlobalLocFixed')?.checked || false,
          hasEventFixed: document.getElementById('waveGlobalEventFixed')?.checked || false,
          fixedPlace: readPlaceRef('globalWave'),
          fixedEventDesc: document.getElementById('waveGlobalEventDesc')?.value || '',
          waves: savedWaves,
        } : null,
        explorationConfig: formConcepts.has('exploration') ? {
          targetType: exTypeVal,
          target: savedExRef,
          clearDesc: document.getElementById('exClearDesc')?.value || '',
        } : null,
        decapitationConfig: formConcepts.has('decapitation') ? {
          targets: savedDecapTargets,
          applyInWaves: document.getElementById('decapApplyInWaves')?.checked || false,
        } : null,
        bossConfig: formConcepts.has('boss') ? {
          place: savedBossPlace,
          enemies: savedBossEnemies,
          phases: savedPhases,
        } : null,
      };

      const floors = (tower.floors || []).filter(ff => ff.floorNum !== floorNum);
      floors.push(floorData);
      tower.floors = floors.sort((a, b) => a.floorNum - b.floorNum);

      await DB.put('towers', tower);
      Utils.toast(isEdit ? '저장됨' : '추가됨', 'success');

      this._bundleStart = floorNum === 0 ? 0 : (Math.floor((floorNum - 1) / this.BUNDLE_SIZE) * this.BUNDLE_SIZE + 1);
      this._expandedFloor = floorNum;

      const all = await DB.getAll('towers', wid);
      const t = all.find(x => x.id === tower.id);
      if (t) this._renderTower(container, t, wid, world);
      return true;
    }, isEdit ? '저장' : '추가');

    // ── Wire all interactions after modal renders ──
    setTimeout(() => {
      // 통합 층 checkbox toggle
      document.getElementById('fIsComposite')?.addEventListener('change', e => {
        const wrap = document.getElementById('fCompositeWrap');
        if (wrap) wrap.style.display = e.target.checked ? 'block' : 'none';
      });

      // Duplicate floor number detection
      const floorNumInput = document.getElementById('fFloorNum');
      if (floorNumInput && !isEdit) {
        floorNumInput.addEventListener('input', () => {
          const val = parseInt(floorNumInput.value, 10);
          const isDup = !isNaN(val) && existingFloors.some(ff => ff.floorNum === val);
          floorNumInput.style.borderColor = isDup ? 'var(--color-danger)' : '';
          const hint = document.getElementById('fFloorNumHint');
          if (hint) hint.textContent = isDup ? `${val}층이 이미 존재합니다` : '';
          if (hint) hint.style.color = isDup ? 'var(--color-danger)' : 'var(--color-text-dim)';
        });
      }

      // Image upload preview
      document.getElementById('floorImageFile')?.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        newImage = await Utils.imageToBase64(file);
        const prev = document.getElementById('floorImgPreview');
        if (prev) prev.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <img src="${newImage}" style="max-width:100px;max-height:80px;border-radius:8px;object-fit:cover;" />
            <button type="button" id="btnDeleteFloorImg" class="btn btn-ghost btn-sm"
              style="color:var(--color-danger);font-size:11px;">🗑 사진 삭제</button>
          </div>`;
        document.getElementById('btnDeleteFloorImg')?.addEventListener('click', () => {
          newImage = null;
          const p = document.getElementById('floorImgPreview');
          if (p) p.innerHTML = '';
        });
      });
      document.getElementById('btnDeleteFloorImg')?.addEventListener('click', () => {
        newImage = null;
        const prev = document.getElementById('floorImgPreview');
        if (prev) prev.innerHTML = '';
      });

      // ── Feature entries ──
      const REF_ICONS_F = { monster: '👾', stat: '📊', skill: '✨', '': '📝' };
      const renderFeatList = () => {
        const el = document.getElementById('featList');
        if (!el) return;
        el.innerHTML = formFeatureEntries.map((e, idx) => `
          <div class="feat-row" data-fidx="${idx}" style="background:var(--color-surface3,#1e2030);border:1px solid var(--color-border);border-radius:6px;padding:8px 10px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="font-size:12px;color:var(--color-primary);font-weight:700;min-width:18px;">${idx + 1}.</span>
              ${e.refType ? `<span style="font-size:11px;background:rgba(99,102,241,0.18);border:1px solid rgba(99,102,241,0.35);border-radius:4px;padding:1px 6px;">${REF_ICONS_F[e.refType] || '📝'} ${Utils.escHtml(e.refName)}</span>` : ''}
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
              ${REF_ICONS_F[x.refType] || '📝'} <span>${Utils.escHtml(x.name)}${x.grade ? ` <span style="font-size:11px;color:var(--color-text-muted);">(${Utils.escHtml(x.grade)})</span>` : ''}</span>
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

      // Concept chip toggles
      document.querySelectorAll('.concept-cb').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) formConcepts.add(cb.value);
          else formConcepts.delete(cb.value);
          const sectionId = 'section' + cb.value.charAt(0).toUpperCase() + cb.value.slice(1);
          const sec = document.getElementById(sectionId);
          if (sec) sec.style.display = cb.checked ? 'block' : 'none';
        });
      });

      // Wave section global controls
      document.getElementById('waveGlobalLocFixed')?.addEventListener('change', e => {
        const wrap = document.getElementById('waveGlobalLocWrap');
        if (wrap) wrap.style.display = e.target.checked ? 'block' : 'none';
        applyGlobalLocFixed(e.target.checked);
      });
      document.getElementById('waveGlobalEventFixed')?.addEventListener('change', e => {
        const wrap = document.getElementById('waveGlobalEventWrap');
        if (wrap) wrap.style.display = e.target.checked ? 'block' : 'none';
      });

      // Wire global place ref
      wirePlaceRef('globalWave', waveGlobalFixedPlace);

      // Wire wave list
      wireWaveSection();
      applyGlobalLocFixed(document.getElementById('waveGlobalLocFixed')?.checked || false);

      // Add wave button
      document.getElementById('btnAddWave')?.addEventListener('click', () => {
        // Save current wave DOM state
        document.querySelectorAll('#globalModalBody .wave-row').forEach(row => {
          const wi = parseInt(row.dataset.widx, 10);
          if (!formWaves[wi]) return;
          const locRadioEl = row.querySelector('.wave-loc-radio:checked');
          formWaves[wi].locationFixed = locRadioEl ? locRadioEl.value : 'move';
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
        formWaves.push({ locationFixed: 'move', hasEvent: false, eventDesc: '', enemies: [], traps: [], clearConditionTypes: ['enemies'], clearCondition: '', clearConditionComment: '', waveNotes: '', explorationLink: false });
        reRenderWaveList();
      });

      // Wire exploration section
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

      // Wire decapitation section
      const allMonChars = [
        ...allMonsters.map(m => ({ ...m, _etype: 'monster' })),
        ...allChars.map(c => ({ ...c, _etype: 'char' })),
      ];
      wireChipDeletes('decapChips');
      wireSearch('decapSearch', 'decapResults', allMonChars, entityRow, (ds) => {
        addChipToContainer('decapChips', { id: ds.id, name: ds.name, grade: ds.grade }, ds.etype);
      });

      // Wire boss section
      wireBossSection();
      document.getElementById('btnAddPhase')?.addEventListener('click', () => {
        syncBossPhasesFromDOM();
        bossPhases.push({ condition: '', desc: '', attacks: [] });
        reRenderPhaseList();
      });

    }, 50);
  },

  // ── SUB-FLOOR FORM (same fields as main floor) ──────────────
});
