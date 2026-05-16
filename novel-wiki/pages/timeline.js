'use strict';
window.Pages = window.Pages || {};
window.Pages.timeline = {
  init: async function(container) {
    const wid = AppStore.getCurrentWorldId();
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

    let events = await DB.getAll('events', wid);
    const cycles = [...new Set(events.map(e => e.regressionCycle ?? 1))].sort((a, b) => a - b);
    let selectedCycle = cycles[0] ?? 1;
    let compareMode = false;

    const self = this;

    const render = () => {
      const filtered = compareMode
        ? events
        : events.filter(e => (e.regressionCycle ?? 1) === selectedCycle);
      const sorted = [...filtered].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      container.innerHTML = `
      <div class="page active">
        <div class="page-header">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <h2 class="page-title" style="margin:0;">타임라인</h2>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-ghost btn-sm" id="btnCompare">${compareMode ? '단일 뷰' : '비교 뷰'}</button>
              <button class="btn btn-primary btn-sm" id="btnAddEventTL">+ 추가</button>
            </div>
          </div>
          ${!compareMode ? `
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;overflow-x:auto;padding-bottom:4px;">
            ${cycles.length === 0
              ? '<span style="font-size:12px;color:var(--color-text-muted);">회차 데이터 없음</span>'
              : cycles.map(c => `<button class="filter-chip${c === selectedCycle ? ' active' : ''}" data-cycle="${c}">${c}회차</button>`).join('')}
          </div>` : ''}
        </div>

        ${sorted.length === 0
          ? `<div class="empty-state" style="padding:48px;text-align:center;">
               <div style="font-size:48px;margin-bottom:12px;">📅</div>
               <div style="font-weight:700;font-size:16px;margin-bottom:4px;">사건이 없습니다</div>
               <div style="font-size:13px;color:var(--color-text-muted);">사건 그래프에서 사건을 추가하면 여기에 표시됩니다</div>
             </div>`
          : compareMode
            ? self._renderCompare(events, cycles)
            : self._renderTimeline(sorted)}
      </div>`;

      document.getElementById('btnCompare')?.addEventListener('click', () => {
        compareMode = !compareMode;
        render();
      });

      document.getElementById('btnAddEventTL')?.addEventListener('click', () => {
        Pages.eventGraph._openForm(null, wid, 200 + Math.random()*80, 200 + Math.random()*80, async () => {
          events = await DB.getAll('events', wid);
          render();
        });
      });

      container.querySelectorAll('.filter-chip[data-cycle]').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedCycle = Number(btn.dataset.cycle);
          render();
        });
      });

      container.querySelectorAll('.timeline-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.id;
          const ev = events.find(e => e.id === id);
          if (ev) self._showDetail(ev, events, wid, async () => { events = await DB.getAll('events', wid); render(); });
        });
      });
    };

    render();
  },

  _renderTimeline: function(events) {
    return `
    <div class="timeline-track" style="position:relative;padding:16px 0;">
      <div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:var(--color-border);transform:translateX(-50%);"></div>
      ${events.map((ev, i) => {
        const col = ev.color || '#3b82f6';
        const isLeft = i % 2 === 0;
        return `
        <div style="display:flex;align-items:flex-start;margin-bottom:24px;position:relative;${isLeft ? 'flex-direction:row;' : 'flex-direction:row-reverse;'}">
          <!-- Spacer -->
          <div style="flex:1;padding:0 20px;${isLeft ? 'padding-right:32px;' : 'padding-left:32px;'}">
            <div class="timeline-card" data-id="${Utils.escHtml(ev.id)}" style="background:var(--color-surface2);border-radius:10px;padding:14px 16px;border-left:3px solid ${col};cursor:pointer;transition:box-shadow 0.15s;">
              <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:4px;">${Utils.escHtml(ev.date || '날짜 미정')} · ${ev.regressionCycle ?? 1}회차</div>
              <div style="font-weight:700;margin-bottom:4px;font-size:14px;">${Utils.escHtml(ev.name)}</div>
              ${ev.description ? `<div style="font-size:12px;color:var(--color-text-dim);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${Utils.escHtml(ev.description)}</div>` : ''}
              ${(ev.involvedCharacters || []).length ? `
                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;">
                  ${(ev.involvedCharacters || []).map(c => `<span class="badge" style="cursor:pointer;" onclick="event.stopPropagation();AppRouter.navigate('characters',{highlightId:'${Utils.escHtml(c.id)}'})">👤 ${Utils.escHtml(c.name)}</span>`).join('')}
                </div>` : ''}
            </div>
          </div>
          <!-- Dot -->
          <div style="position:absolute;left:50%;top:14px;width:14px;height:14px;border-radius:50%;background:${col};border:2px solid var(--color-bg);transform:translateX(-50%);z-index:1;flex-shrink:0;"></div>
        </div>`;
      }).join('')}
    </div>`;
  },

  _renderCompare: function(events, cycles) {
    if (!cycles.length) {
      return `<div class="empty-state" style="padding:48px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">📊</div>
        <div style="font-weight:700;font-size:16px;">회차 데이터 없음</div>
      </div>`;
    }
    return `
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
      <div style="display:grid;grid-template-columns:${cycles.map(() => 'minmax(180px,1fr)').join(' ')};gap:12px;min-width:${cycles.length * 190}px;">
        ${cycles.map(c => {
          const cycleEvents = events
            .filter(e => (e.regressionCycle ?? 1) === c)
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
          return `
          <div>
            <div style="text-align:center;font-weight:700;padding:8px 12px;background:var(--color-surface2);border-radius:8px;margin-bottom:10px;font-size:13px;">${c}회차</div>
            ${cycleEvents.length === 0
              ? `<div style="text-align:center;padding:16px;font-size:12px;color:var(--color-text-muted);">사건 없음</div>`
              : cycleEvents.map(ev => `
                <div class="timeline-card" data-id="${Utils.escHtml(ev.id)}" style="margin-bottom:8px;padding:10px 12px;background:var(--color-surface2);border-radius:8px;cursor:pointer;border-left:3px solid ${ev.color || '#3b82f6'};">
                  <div style="font-size:10px;color:var(--color-text-muted);margin-bottom:2px;">${Utils.escHtml(ev.date || '날짜 미정')}</div>
                  <div style="font-weight:600;font-size:13px;">${Utils.escHtml(ev.name)}</div>
                  ${(ev.involvedCharacters || []).length ? `<div style="font-size:10px;color:var(--color-text-dim);margin-top:4px;">👤 ${ev.involvedCharacters.map(c => Utils.escHtml(c.name)).join(', ')}</div>` : ''}
                </div>`).join('')}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  },

  _showDetail: function(ev, allEvents, wid, afterEdit) {
    const charLinks = (ev.involvedCharacters || []).map(c =>
      `<button class="btn btn-ghost btn-sm" onclick="AppRouter.navigate('characters',{highlightId:'${Utils.escHtml(c.id)}'});Utils.closeModal();">👤 ${Utils.escHtml(c.name)}</button>`
    ).join('');

    const outLinks = (ev.outcomes || []).map(o => {
      const t = allEvents.find(e => e.id === o.targetId);
      return `<div style="font-size:13px;color:var(--color-text-muted);padding:4px 0;">→ ${t ? Utils.escHtml(t.name) : '?'}${o.label ? ` <span style="color:var(--color-text-dim);">· ${Utils.escHtml(o.label)}</span>` : ''}</div>`;
    }).join('');

    Utils.openModal(ev.name, `
      <div>
        <div style="color:var(--color-text-muted);font-size:12px;margin-bottom:12px;">${ev.regressionCycle ?? 1}회차 · ${Utils.escHtml(ev.date || '날짜 미정')}</div>
        ${ev.description ? `<div style="white-space:pre-wrap;font-size:14px;line-height:1.7;margin-bottom:14px;">${Utils.nl2br(ev.description)}</div>` : ''}
        ${charLinks ? `
          <div style="margin-bottom:12px;">
            <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;font-weight:600;">관련 인물</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">${charLinks}</div>
          </div>` : ''}
        ${outLinks ? `
          <div style="margin-bottom:12px;">
            <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;font-weight:600;">인과관계</div>
            ${outLinks}
          </div>` : ''}
        <div style="padding-top:12px;border-top:1px solid var(--color-border);">
          <button class="btn btn-ghost btn-sm" id="btnEditEventTL" style="font-size:12px;">✏️ 편집</button>
        </div>
      </div>
    `);
    setTimeout(() => {
      document.getElementById('btnEditEventTL')?.addEventListener('click', () => {
        Utils.closeModal();
        Pages.eventGraph._openForm(ev, wid, ev.x ?? 200, ev.y ?? 200, afterEdit);
      });
    }, 30);
  },

  destroy: function() {}
};
