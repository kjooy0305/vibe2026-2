'use strict';
// skills-form.js — form methods for window.Pages.skills
Object.assign(window.Pages.skills, {
  _openForm: function(skill, wid, container) {
    const self = this;
    const isEdit = !!skill;
    const allAttrs  = this._C.attributes;
    const allSeries = this._C.skillSeries;
    const curType   = skill?.type || '패시브';
    let evoFromId   = skill?.evolvedFromId || '';

    const body = `<div style="display:flex;flex-direction:column;gap:12px;">
      <div class="form-group">
        <label class="form-label">스킬 이름 *</label>
        <input class="input-field" id="fSkName" value="${Utils.escHtml(skill?.name||'')}" placeholder="스킬 이름을 입력하세요" style="width:100%;box-sizing:border-box;"/>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="form-group">
          <label class="form-label">등급 (강도: F가 최하 → EX가 최상)</label>
          <select class="select-input" id="fSkGrade" style="width:100%;">
            ${this._C.grades.map(g=>`<option value="${g}" ${(skill?.grade||'F')===g?'selected':''}>${g} 등급</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="exLevelGroup" style="${(skill?.grade||'F')==='EX'?'':'display:none;'}">
          <label class="form-label">EX 레벨 (EX 등급 전용 세부 단계)</label>
          <input type="number" class="input-field" id="fSkExLevel" value="${skill?.exLevel!==undefined?skill.exLevel:''}" placeholder="숫자 입력" style="width:100%;box-sizing:border-box;"/>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">타입 (스킬이 어떻게 발동되는지)</label>
        <div style="display:flex;gap:8px;">
          <button type="button" class="btn btn-sm sk-type-btn" data-t="패시브"
            style="flex:1;background:${curType==='패시브'?'#818cf8':'var(--color-surface2)'};color:${curType==='패시브'?'#000':'var(--color-text-muted)'};">
            패시브 (조건 충족 시 자동 발동)
          </button>
          <button type="button" class="btn btn-sm sk-type-btn" data-t="액티브"
            style="flex:1;background:${curType==='액티브'?'#f472b6':'var(--color-surface2)'};color:${curType==='액티브'?'#000':'var(--color-text-muted)'};">
            액티브 (직접 사용 선택)
          </button>
        </div>
        <input type="hidden" id="fSkType" value="${curType}"/>
      </div>

      <div class="form-group" id="passiveSubGroup" style="${curType==='패시브'?'':'display:none;'}">
        <label class="form-label">패시브 세부 분류 (스킬의 구체적 동작 방식)</label>
        <select class="select-input" id="fSkPassiveSub" style="width:100%;">
          <option value="">-- 세부 분류 없음 --</option>
          <option value="강화-스텟"  ${skill?.passiveSubtype==='강화-스텟' ?'selected':''}>강화-스텟 (캐릭터 수치를 직접 높여줌)</option>
          <option value="강화-스킬"  ${skill?.passiveSubtype==='강화-스킬' ?'selected':''}>강화-스킬 (다른 스킬의 효과를 강화함)</option>
          <option value="자동반사"   ${skill?.passiveSubtype==='자동반사'  ?'selected':''}>자동반사 (조건 충족 시 자동으로 반응함)</option>
          <option value="억제-광역"  ${skill?.passiveSubtype==='억제-광역' ?'selected':''}>억제-광역 (범위 내 적에게 패널티 부여)</option>
          <option value="억제-단일"  ${skill?.passiveSubtype==='억제-단일' ?'selected':''}>억제-단일 (특정 대상에게 패널티 부여)</option>
          <option value="반격"       ${skill?.passiveSubtype==='반격'      ?'selected':''}>반격 (피격 시 자동으로 반격 발동)</option>
        </select>
      </div>

      <div class="form-group" id="activeSubGroup" style="${curType==='액티브'?'':'display:none;'}">
        <label class="form-label">액티브 세부 분류 (스킬의 구체적 동작 방식)</label>
        <select class="select-input" id="fSkActiveSub" style="width:100%;">
          <option value="">-- 세부 분류 없음 --</option>
          <option value="변형"         ${skill?.activeSubtype==='변형'        ?'selected':''}>변형 (신체·물체·공간 형태를 바꿈)</option>
          <option value="일반-공격"    ${skill?.activeSubtype==='일반-공격'   ?'selected':''}>일반-공격 (직접 타격하거나 발사형 공격)</option>
          <option value="일반-방어"    ${skill?.activeSubtype==='일반-방어'   ?'selected':''}>일반-방어 (방어막·회피·피해 경감)</option>
          <option value="일반-서포트"  ${skill?.activeSubtype==='일반-서포트' ?'selected':''}>일반-서포트 (아군 강화·회복·버프 부여)</option>
          <option value="캐스팅-즉발"  ${skill?.activeSubtype==='캐스팅-즉발' ?'selected':''}>캐스팅-즉발 (시전 후 즉시 발동)</option>
          <option value="캐스팅-필요"  ${skill?.activeSubtype==='캐스팅-필요' ?'selected':''}>캐스팅-필요 (일정 시간 집중해야 발동)</option>
        </select>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="form-group">
          <label class="form-label">속성 (원소 속성)</label>
          <select class="select-input" id="fSkAttr" style="width:100%;">
            ${allAttrs.map(a=>`<option value="${a}" ${(skill?.attribute||'없음')===a?'selected':''}>${a}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">계열 (분류 체계)</label>
          <select class="select-input" id="fSkSeries" style="width:100%;">
            ${allSeries.map(s2=>`<option value="${s2}" ${(skill?.series||'없음')===s2?'selected':''}>${s2}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
        <div class="form-group">
          <label class="form-label">세부 유형 (단계·형태)</label>
          <select class="select-input" id="fSkSubType" style="width:100%;">
            <option value="">-- 없음 --</option>
            <option value="상급"  ${skill?.subType==='상급' ?'selected':''}>상급 (기본보다 강화)</option>
            <option value="하급"  ${skill?.subType==='하급' ?'selected':''}>하급 (기본보다 약함)</option>
            <option value="응용"  ${skill?.subType==='응용' ?'selected':''}>응용 (파생 형태)</option>
            <option value="진화"  ${skill?.subType==='진화' ?'selected':''}>진화 (다른 스킬에서 진화)</option>
            <option value="융합"  ${skill?.subType==='융합' ?'selected':''}>융합 (둘 이상 합쳐진 형태)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">소모 마나 (사용 시 소비량)</label>
          <input type="number" class="input-field" id="fSkMana" value="${skill?.manaCost!==undefined?skill.manaCost:0}" style="width:100%;box-sizing:border-box;"/>
        </div>
        <div class="form-group">
          <label class="form-label">쿨타임 (재사용 대기 시간)</label>
          <input class="input-field" id="fSkCooldown" value="${Utils.escHtml(skill?.cooldown||'')}" placeholder="예: 20초, 즉발" style="width:100%;box-sizing:border-box;"/>
        </div>
      </div>

      <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
        <label class="form-label" style="display:block;margin-bottom:6px;">이전 단계 스킬 (이 스킬이 어떤 스킬에서 진화했는지)</label>
        <div id="evoFromChip" style="min-height:24px;margin-bottom:6px;"></div>
        <div style="position:relative;">
          <input class="input-field" id="evoFromSearch" placeholder="이전 단계 스킬 이름으로 검색하여 연결..." style="width:100%;box-sizing:border-box;font-size:12px;"/>
          <div id="evoFromResults" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--color-surface2);border:1px solid var(--color-border);border-radius:8px;z-index:20;max-height:150px;overflow-y:auto;"></div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">효과 (필수)</label>
        <textarea class="textarea-field" id="fSkEffects" rows="4" placeholder="이 스킬이 발동되면 어떤 일이 일어나는지 상세히 입력..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(skill?.effects||'')}</textarea>
      </div>

      <!-- 조건부 효과 -->
      <div class="form-group" style="border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <label class="form-label" style="margin:0;">조건부 효과 <span style="font-size:11px;color:var(--color-text-muted);">(예: 하늘을 날 때 이속 +30%)</span></label>
          <button type="button" id="btnAddCondEff" class="btn btn-ghost btn-sm" style="font-size:11px;">+ 추가</button>
        </div>
        <div id="condEffRows">
          ${(skill?.conditionalEffects||[]).map((ce,i)=>`
            <div class="cond-eff-row" style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin-bottom:6px;align-items:start;">
              <textarea class="textarea-field ce-condition" rows="2" placeholder="조건 (예: 하늘을 날 때)" style="font-size:12px;padding:6px 8px;min-height:unset;word-break:break-word;">${Utils.escHtml(ce.condition||'')}</textarea>
              <textarea class="textarea-field ce-effect" rows="2" placeholder="효과 (예: 이속 +30%)" style="font-size:12px;padding:6px 8px;min-height:unset;word-break:break-word;">${Utils.escHtml(ce.effect||'')}</textarea>
              <button type="button" class="btn-del-cond-eff" style="background:none;border:1px solid var(--color-border);border-radius:4px;cursor:pointer;color:var(--color-danger);font-size:13px;padding:2px 7px;height:36px;">✕</button>
            </div>`).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">소설 내 설명 (독자가 읽는 텍스트)</label>
        <textarea class="textarea-field" id="fSkDesc" rows="3" placeholder="소설 본문에 표시될 스킬 설명..." style="width:100%;box-sizing:border-box;">${Utils.escHtml(skill?.description||'')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">작가 메모 <span style="font-size:11px;color:var(--color-text-dim);">(소설에 미표시)</span></label>
        <textarea class="textarea-field" id="fSkAuthor" rows="2" style="width:100%;box-sizing:border-box;">${Utils.escHtml(skill?.authorNotes||'')}</textarea>
      </div>
    </div>`;

    Utils.openModal(isEdit?'스킬 편집':'새 스킬', body, async () => {
      const name = document.getElementById('fSkName')?.value.trim();
      if (!name) { Utils.fieldError('fSkName'); return false; }
      const grade   = document.getElementById('fSkGrade')?.value || 'F';
      const type    = document.getElementById('fSkType')?.value  || '패시브';
      const exVal   = document.getElementById('fSkExLevel')?.value.trim();
      const item = {
        ...(skill||{}), worldId: wid, name, grade, type,
        passiveSubtype: type==='패시브' ? (document.getElementById('fSkPassiveSub')?.value||'') : '',
        activeSubtype:  type==='액티브' ? (document.getElementById('fSkActiveSub')?.value ||'') : '',
        subType:    document.getElementById('fSkSubType')?.value   ||'',
        attribute:  document.getElementById('fSkAttr')?.value      ||'없음',
        series:     document.getElementById('fSkSeries')?.value    ||'없음',
        manaCost:   Number(document.getElementById('fSkMana')?.value)||0,
        cooldown:   document.getElementById('fSkCooldown')?.value.trim()||'',
        exLevel:    grade==='EX'&&exVal!==''&&exVal!==undefined ? Number(exVal) : undefined,
        evolvedFromId: evoFromId||'',
        effects:    document.getElementById('fSkEffects')?.value.trim()||'',
        conditionalEffects: (() => {
          const rows = [];
          document.querySelectorAll('#globalModalBody .cond-eff-row').forEach(row => {
            const cond = row.querySelector('.ce-condition')?.value.trim();
            const eff  = row.querySelector('.ce-effect')?.value.trim();
            if (cond || eff) rows.push({ condition: cond||'', effect: eff||'' });
          });
          return rows;
        })(),
        description: document.getElementById('fSkDesc')?.value.trim()||'',
        authorNotes: document.getElementById('fSkAuthor')?.value.trim()||'',
        id: skill?.id||DB.genId(),
        createdAt: skill?.createdAt||Date.now(),
        updatedAt: Date.now(),
      };
      await DB.put('skills', item);
      await AppStore.updateStreak();
      await AppStore.recordActivity('skills', !isEdit);
      Utils.toast(isEdit?'저장됨':'추가됨', 'success');
      self._currentId = item.id;
      const all = await DB.getAll('skills', wid);
      const updated = all.find(x => x.id === item.id);
      if (updated) self._renderDetail(container, updated, wid, all);
      return true;
    }, isEdit?'저장':'추가');

    setTimeout(async () => {
      // 조건부 효과 행 추가/삭제
      const makeCondEffRow = () => {
        const div = document.createElement('div');
        div.className = 'cond-eff-row';
        div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin-bottom:6px;align-items:start;';
        div.innerHTML = `
          <textarea class="textarea-field ce-condition" rows="2" placeholder="조건 (예: 하늘을 날 때)" style="font-size:12px;padding:6px 8px;min-height:unset;word-break:break-word;"></textarea>
          <textarea class="textarea-field ce-effect" rows="2" placeholder="효과 (예: 이속 +30%)" style="font-size:12px;padding:6px 8px;min-height:unset;word-break:break-word;"></textarea>
          <button type="button" class="btn-del-cond-eff" style="background:none;border:1px solid var(--color-border);border-radius:4px;cursor:pointer;color:var(--color-danger);font-size:13px;padding:2px 7px;height:36px;">✕</button>`;
        return div;
      };
      document.getElementById('btnAddCondEff')?.addEventListener('click', () => {
        document.getElementById('condEffRows')?.appendChild(makeCondEffRow());
      });
      document.getElementById('condEffRows')?.addEventListener('click', e => {
        if (e.target.closest('.btn-del-cond-eff')) e.target.closest('.cond-eff-row')?.remove();
      });

      // 등급 → EX 레벨 표시
      document.getElementById('fSkGrade')?.addEventListener('change', e => {
        const eg = document.getElementById('exLevelGroup');
        if (eg) eg.style.display = e.target.value==='EX' ? '' : 'none';
      });

      // 타입 토글
      document.querySelectorAll('#globalModalBody .sk-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const t = btn.dataset.t;
          document.getElementById('fSkType').value = t;
          document.querySelectorAll('#globalModalBody .sk-type-btn').forEach(b => {
            const on = b.dataset.t === t;
            b.style.background = on ? (t==='패시브'?'#818cf8':'#f472b6') : 'var(--color-surface2)';
            b.style.color = on ? '#000' : 'var(--color-text-muted)';
          });
          const pg = document.getElementById('passiveSubGroup');
          const ag = document.getElementById('activeSubGroup');
          if (pg) pg.style.display = t==='패시브' ? '' : 'none';
          if (ag) ag.style.display = t==='액티브' ? '' : 'none';
        });
      });

      // 진화 이전 단계 스킬 검색 + 칩
      const allForEvo = (await DB.getAll('skills', wid))
        .filter(x => x.id !== skill?.id)
        .sort((a,b) => (a.name||'').localeCompare(b.name||'','ko'));

      const renderEvoChip = () => {
        const el = document.getElementById('evoFromChip'); if (!el) return;
        if (!evoFromId) { el.innerHTML = ''; return; }
        const linked = allForEvo.find(x => x.id === evoFromId);
        if (!linked) { el.innerHTML = ''; return; }
        el.innerHTML = `<span id="evoChipInner" style="display:inline-flex;align-items:center;gap:4px;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.5);padding:2px 10px;border-radius:12px;font-size:12px;cursor:pointer;" title="클릭하여 제거">
          ${Utils.escHtml(linked.grade||'')} · ${Utils.escHtml(linked.name||'')} ✕</span>`;
        document.getElementById('evoChipInner')?.addEventListener('click', () => { evoFromId=''; renderEvoChip(); });
      };
      renderEvoChip();

      const evoIn = document.getElementById('evoFromSearch');
      const evoRs = document.getElementById('evoFromResults');
      evoIn?.addEventListener('input', () => {
        const q = evoIn.value.trim().toLowerCase();
        if (!q) { evoRs.style.display='none'; return; }
        const hits = allForEvo.filter(x=>(x.name||'').toLowerCase().includes(q)).slice(0,8);
        if (!hits.length) { evoRs.style.display='none'; return; }
        evoRs.style.display='block';
        evoRs.innerHTML = hits.map(x=>`<div class="evo-row" data-sid="${Utils.escHtml(x.id)}" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--color-border);">${Utils.escHtml(x.grade||'')} · ${Utils.escHtml(x.name||'')}</div>`).join('');
        evoRs.querySelectorAll('.evo-row').forEach(row=>{
          row.addEventListener('mousedown', e=>{
            e.preventDefault();
            evoFromId = row.dataset.sid;
            evoIn.value=''; evoRs.style.display='none';
            renderEvoChip();
          });
        });
      });
      evoIn?.addEventListener('blur', ()=>setTimeout(()=>{ evoRs.style.display='none'; },150));
    }, 60);
  },

  _customListPanelHtml: function(key, items, label) {
    const delClass = `btn-del-c${key}`;
    return `<div style="margin-top:8px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:6px;padding:8px;">
      <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">커스텀 ${label} 목록</div>
      ${items.map(v=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--color-border);">
        <span style="font-size:12px;">${Utils.escHtml(v)}</span>
        <button type="button" class="${delClass}" data-val="${Utils.escHtml(v)}" style="background:none;border:none;cursor:pointer;color:var(--color-danger);font-size:12px;padding:0 4px;">✕</button>
      </div>`).join('')}
      <div style="display:flex;gap:6px;margin-top:6px;">
        <input class="input-field" id="new${key==='attr'?'Attr':'Series'}Input" placeholder="새 ${label} 입력" style="flex:1;font-size:12px;"/>
        <button type="button" id="btnAdd${key==='attr'?'Attr':'Series'}" class="btn btn-ghost btn-sm" style="font-size:11px;">추가</button>
      </div>
    </div>`;
  },

  destroy: function() {
    this._currentId = null;
    this._container = null;
  }
});
