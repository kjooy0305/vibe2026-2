'use strict';
window.Pages = window.Pages || {};

// ── Global Reminder Engine ──────────────────────────────────────────────────
// Persists across page navigations as a global singleton.
window.ReminderEngine = window.ReminderEngine || (function() {
  let _timers = [];
  let _initialized = false;

  function _fmtTime(h, m) {
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function _parseTime(str) {
    const [h, m] = (str || '00:00').split(':').map(Number);
    return { h: h || 0, m: m || 0 };
  }

  function _now() {
    const d = new Date();
    return { h: d.getHours(), m: d.getMinutes() };
  }

  function _toMinutes(h, m) { return h * 60 + m; }

  function _fireNotification(reminder) {
    if (!reminder.enabled) return;
    const msg = reminder.message || '알림';
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('소설 창작위키', {
              body: msg,
              icon: './icons/icon-192.png',
              badge: './icons/icon-192.png',
              tag: 'reminder-' + reminder.id,
              renotify: true,
              vibrate: [200, 100, 200],
            });
          });
        } else {
          new Notification('소설 창작위키', { body: msg, icon: './icons/icon-192.png' });
        }
      } catch(e) {
        // Fallback: in-app toast
      }
    }
    // Always show in-app toast as well
    if (window.Utils && Utils.toast) {
      Utils.toast('🔔 ' + msg, 'info', 4000);
    }
  }

  async function _loadReminders() {
    try {
      return (await DB.getSetting('reminders', [])) || [];
    } catch(e) { return []; }
  }

  function _clearTimers() {
    _timers.forEach(t => clearInterval(t));
    _timers = [];
  }

  async function start() {
    _clearTimers();
    const reminders = await _loadReminders();

    reminders.forEach(reminder => {
      if (!reminder.enabled) return;

      const intervalMs = (parseInt(reminder.interval) || 60) * 60000;
      const start = _parseTime(reminder.startTime);
      const end = _parseTime(reminder.endTime);
      const startMin = _toMinutes(start.h, start.m);
      const endMin = _toMinutes(end.h, end.m);

      const t = setInterval(() => {
        const n = _now();
        const nowMin = _toMinutes(n.h, n.m);
        if (nowMin >= startMin && nowMin < endMin) {
          _fireNotification(reminder);
        }
      }, intervalMs);

      _timers.push(t);
    });
  }

  async function requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return await Notification.requestPermission();
  }

  async function save(reminders) {
    await DB.setSetting('reminders', reminders);
    start();
  }

  async function init() {
    if (_initialized) return;
    _initialized = true;
    await start();
  }

  return { init, start, save, requestPermission, _loadReminders, _fireNotification };
})();

// ── Reminders Page ──────────────────────────────────────────────────────────
window.Pages.reminders = {
  _container: null,

  init: async function(container) {
    this._container = container;
    await ReminderEngine.init();
    const reminders = await ReminderEngine._loadReminders();
    this._render(container, reminders);
  },

  _render: function(container, reminders) {
    const self = this;
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const permColor = perm === 'granted' ? 'var(--color-success)' : perm === 'denied' ? 'var(--color-danger)' : 'var(--color-warning)';
    const permLabel = perm === 'granted' ? '✅ 알림 허용됨' : perm === 'denied' ? '🚫 알림 차단됨 (브라우저 설정에서 허용 필요)' : '⚠️ 알림 권한 필요';

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h2 class="page-title">리마인더</h2>
          <button class="btn btn-primary btn-sm" id="btnAddReminder">+ 알림 추가</button>
        </div>
        <p class="page-desc" style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">
          지정한 시간대에 반복 알림을 보내드립니다.
        </p>
      </div>

      <div style="background:var(--color-surface2);border-radius:10px;padding:12px 16px;margin-bottom:16px;border:1px solid var(--color-border);display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--color-text-muted);margin-bottom:2px;">알림 권한 상태</div>
          <div style="font-size:13px;color:${permColor};">${permLabel}</div>
        </div>
        ${perm !== 'granted' && perm !== 'denied'
          ? `<button class="btn btn-primary btn-sm" id="btnReqPerm">권한 요청</button>`
          : perm === 'denied'
          ? `<div style="font-size:11px;color:var(--color-text-dim);text-align:right;">브라우저 주소창 🔒<br>에서 직접 허용하세요</div>`
          : ''}
      </div>

      ${reminders.length === 0
        ? `<div class="empty-state" style="padding:48px;text-align:center;">
             <div style="font-size:48px;margin-bottom:12px;">🔔</div>
             <div style="font-weight:700;font-size:16px;margin-bottom:4px;">등록된 알림이 없습니다</div>
             <div style="font-size:13px;color:var(--color-text-muted);">+ 버튼으로 반복 알림을 추가하세요</div>
             <div style="font-size:12px;color:var(--color-text-dim);margin-top:8px;">예: 오전 10시~오후 3시, 20분마다 "공부하기"</div>
           </div>`
        : `<div style="display:flex;flex-direction:column;gap:10px;" id="reminderList">
             ${reminders.map((r, i) => this._renderCard(r, i)).join('')}
           </div>`}

      <div style="height:32px;"></div>
    </div>`;

    container.querySelector('#btnReqPerm')?.addEventListener('click', async () => {
      const result = await ReminderEngine.requestPermission();
      if (result === 'granted') {
        Utils.toast('알림 권한이 허용되었습니다! 🎉');
        const updated = await ReminderEngine._loadReminders();
        self._render(container, updated);
      } else {
        Utils.toast('알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.');
      }
    });

    container.querySelector('#btnAddReminder')?.addEventListener('click', async () => {
      if (Notification.permission !== 'granted') {
        const result = await ReminderEngine.requestPermission();
        if (result !== 'granted') {
          Utils.toast('알림 권한이 필요합니다. 먼저 권한을 허용해주세요.');
          return;
        }
      }
      const current = await ReminderEngine._loadReminders();
      self._openForm(container, null, current);
    });

    container.querySelectorAll('.btn-toggle-reminder').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        const current = await ReminderEngine._loadReminders();
        if (current[idx]) {
          current[idx].enabled = !current[idx].enabled;
          await ReminderEngine.save(current);
          self._render(container, current);
          Utils.toast(current[idx].enabled ? '알림이 활성화되었습니다.' : '알림이 비활성화되었습니다.');
        }
      });
    });

    container.querySelectorAll('.btn-edit-reminder').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        const current = await ReminderEngine._loadReminders();
        self._openForm(container, idx, current);
      });
    });

    container.querySelectorAll('.btn-del-reminder').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        const current = await ReminderEngine._loadReminders();
        const name = current[idx]?.message || '알림';
        Utils.confirm(`"${name}" 알림을 삭제하시겠습니까?`, '이 작업은 되돌릴 수 없습니다.', async () => {
          current.splice(idx, 1);
          await ReminderEngine.save(current);
          Utils.toast('삭제되었습니다.');
          self._render(container, current);
        });
      });
    });

    container.querySelectorAll('.btn-test-reminder').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        const current = await ReminderEngine._loadReminders();
        if (current[idx]) {
          ReminderEngine._fireNotification(current[idx]);
        }
      });
    });
  },

  _renderCard: function(r, i) {
    const intervalLabel = r.interval >= 60
      ? Math.floor(r.interval / 60) + '시간' + (r.interval % 60 ? ' ' + (r.interval % 60) + '분' : '')
      : r.interval + '분';

    return `
      <div style="background:var(--color-surface2);border-radius:12px;padding:14px 16px;border:1px solid ${r.enabled ? 'var(--color-primary)' : 'var(--color-border)'};">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <div style="font-size:24px;padding-top:2px;">🔔</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:15px;color:var(--color-text);margin-bottom:4px;">"${Utils.escHtml(r.message || '알림')}"</div>
            <div style="font-size:12px;color:var(--color-text-muted);">
              🕐 ${Utils.escHtml(r.startTime || '00:00')} ~ ${Utils.escHtml(r.endTime || '23:59')}
              &nbsp;·&nbsp; ⏱ ${Utils.escHtml(String(intervalLabel))}마다
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <button class="btn btn-ghost btn-sm btn-test-reminder" data-idx="${i}" title="테스트 발송" style="padding:4px 8px;font-size:11px;">테스트</button>
            <button class="btn btn-ghost btn-sm btn-edit-reminder" data-idx="${i}" style="padding:4px 8px;font-size:11px;">편집</button>
            <button class="btn btn-ghost btn-sm btn-del-reminder" data-idx="${i}" style="padding:4px 8px;font-size:11px;color:var(--color-danger);">삭제</button>
          </div>
        </div>
        <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
          <button class="btn btn-sm btn-toggle-reminder ${r.enabled ? 'btn-primary' : 'btn-ghost'}" data-idx="${i}"
            style="font-size:12px;padding:5px 14px;border-radius:20px;">
            ${r.enabled ? '● 활성' : '○ 비활성'}
          </button>
          ${r.days && r.days.length
            ? `<div style="font-size:11px;color:var(--color-text-muted);">${r.days.join(' ')}</div>`
            : `<div style="font-size:11px;color:var(--color-text-muted);">매일</div>`}
        </div>
      </div>`;
  },

  _openForm: function(container, editIdx, reminders) {
    const self = this;
    const r = editIdx !== null ? reminders[editIdx] : null;
    const DAY_LABELS = ['일','월','화','수','목','금','토'];

    const selectedDays = r?.days || [];

    const body = `
      <div style="padding:4px 0 12px;">
        <div style="margin-bottom:14px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">알림 메시지 *</label>
          <input class="form-input" id="fMessage" value="${Utils.escHtml(r?.message||'')}"
            placeholder="예: 공부하기, 이거 작성해, 물 마시기..." style="font-size:15px;"/>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">시작 시각</label>
            <input class="form-input" id="fStart" type="time" value="${Utils.escHtml(r?.startTime||'10:00')}"/>
          </div>
          <div>
            <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">종료 시각</label>
            <input class="form-input" id="fEnd" type="time" value="${Utils.escHtml(r?.endTime||'15:00')}"/>
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:4px;">반복 간격 (분)</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;" id="intervalBtns">
            ${[10,15,20,30,60,90,120].map(v =>
              `<button type="button" class="btn btn-sm interval-opt ${(r?.interval||20)===v?'btn-primary':'btn-ghost'}"
                data-val="${v}" style="padding:5px 12px;font-size:12px;border-radius:20px;">
                ${v >= 60 ? (v/60 + '시간') : v + '분'}
               </button>`).join('')}
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px;">
            <span style="font-size:12px;color:var(--color-text-muted);">직접 입력:</span>
            <input class="form-input" id="fInterval" type="number" min="1" max="1440"
              value="${r?.interval||20}" style="width:80px;"/>
            <span style="font-size:12px;color:var(--color-text-muted);">분</span>
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <label style="font-size:12px;color:var(--color-text-muted);display:block;margin-bottom:6px;">요일 선택 (비워두면 매일)</label>
          <div style="display:flex;gap:6px;" id="dayBtns">
            ${DAY_LABELS.map(d =>
              `<button type="button" class="btn btn-sm day-opt ${selectedDays.includes(d)?'btn-primary':'btn-ghost'}"
                data-day="${d}" style="padding:5px 0;min-width:36px;font-size:13px;font-weight:700;border-radius:50%;">${d}</button>`
            ).join('')}
          </div>
        </div>

        <div style="background:rgba(99,102,241,0.08);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--color-text-muted);">
          💡 앱이 열려 있는 동안 알림이 발송됩니다. PWA로 설치 시 홈화면 아이콘으로 실행하면 더 안정적입니다.
        </div>
      </div>`;

    Utils.openModal(r ? '알림 편집' : '알림 추가', body, async () => {
      const message = document.getElementById('fMessage')?.value.trim();
      if (!message) { Utils.toast('알림 메시지를 입력하세요.'); return false; }

      const startTime = document.getElementById('fStart')?.value || '10:00';
      const endTime = document.getElementById('fEnd')?.value || '15:00';
      const interval = parseInt(document.getElementById('fInterval')?.value) || 20;

      if (startTime >= endTime) { Utils.toast('종료 시각이 시작 시각보다 커야 합니다.'); return false; }
      if (interval < 1) { Utils.toast('간격은 1분 이상이어야 합니다.'); return false; }

      const days = Array.from(document.querySelectorAll('.day-opt.btn-primary')).map(b => b.dataset.day);

      const payload = {
        id: r?.id || ('rem_' + Date.now()),
        message,
        startTime,
        endTime,
        interval,
        days,
        enabled: r?.enabled !== false,
      };

      const updated = [...reminders];
      if (editIdx !== null) updated[editIdx] = payload;
      else updated.push(payload);

      await ReminderEngine.save(updated);
      Utils.toast(r ? '알림이 수정되었습니다.' : '알림이 추가되었습니다.');
      self._render(container, updated);
    });

    // Interval buttons
    setTimeout(() => {
      document.querySelectorAll('.interval-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.interval-opt').forEach(b => b.classList.replace('btn-primary', 'btn-ghost'));
          btn.classList.replace('btn-ghost', 'btn-primary');
          const input = document.getElementById('fInterval');
          if (input) input.value = btn.dataset.val;
        });
      });
      document.getElementById('fInterval')?.addEventListener('input', (e) => {
        const v = parseInt(e.target.value);
        document.querySelectorAll('.interval-opt').forEach(b => {
          b.classList.remove('btn-primary');
          b.classList.add('btn-ghost');
          if (parseInt(b.dataset.val) === v) {
            b.classList.remove('btn-ghost');
            b.classList.add('btn-primary');
          }
        });
      });
      document.querySelectorAll('.day-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.classList.toggle('btn-primary');
          btn.classList.toggle('btn-ghost');
        });
      });
    }, 50);
  },

  destroy: function() {},
};
