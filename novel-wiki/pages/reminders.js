'use strict';
window.Pages = window.Pages || {};

// ── Personality message sets ────────────────────────────────────────────────
const WRITING_PERSONALITIES = {
  editor: {
    label: '냉정한 편집장',
    emoji: '📋',
    gentle: [
      '오늘 분량이 아직 없습니다. 마감은 기다려주지 않아요.',
      '지금 몇 자 쓰셨나요? 숫자가 보이지 않는군요.',
      '오늘 작성 기록이 비어있습니다. 계획대로 진행하고 있나요?',
      '좋은 작가는 매일 씁니다. 오늘 아직 시작하지 않으셨군요.',
      '오늘 분량을 채워야 할 시간입니다.',
      '작업물이 없습니다. 언제 시작하실 건가요?',
      '독자들은 기다리고 있습니다. 오늘 아직 글을 쓰지 않으셨네요.',
      '오늘의 할당량이 아직 비어있습니다.',
      '작가로서의 하루가 아직 시작되지 않았군요.',
      '원고를 기다리고 있습니다. 언제 주실 건가요?',
    ],
    urgent: [
      '마감 시각이 다가옵니다. 아직도 아무것도 없군요.',
      '오늘이 거의 끝나갑니다. 이대로 빈 페이지로 마감하실 건가요?',
      '심각한 상황입니다. 오늘 분량이 전혀 없습니다.',
      '이 상태라면 마감을 맞출 수 없습니다. 지금 당장 시작하세요.',
      '더 이상 여유 시간이 없습니다. 오늘은 반드시 써야 합니다.',
      '이제 몇 시간밖에 남지 않았습니다. 지금 시작해야 합니다.',
      '이건 방치가 아니라 포기입니다. 다시 생각해보세요.',
      '자정이 될 때까지 단 한 줄이라도 써야 합니다.',
      '연속 기록이 끊어지기 직전입니다. 지금 바로 쓰세요.',
      '편집장으로서 마지막 경고입니다. 지금 작업하세요.',
    ],
    missed: [
      '어제 왜 쓰지 않으셨나요? 이유를 듣고 싶군요.',
      '어제 기록이 없습니다. 이런 날이 쌓이면 습관이 무너집니다.',
      '어제를 낭비하셨군요. 오늘은 그런 일이 없도록 하세요.',
      '연속 기록이 끊어졌습니다. 다시 시작해야 합니다.',
      '어제의 공백을 오늘로 메울 수는 없습니다. 오늘은 반드시 쓰세요.',
    ],
  },
  warm: {
    label: '따뜻한 응원자',
    emoji: '💖',
    gentle: [
      '오늘도 글을 쓸 시간이에요! 잠깐이라도 괜찮아요 😊',
      '당신의 이야기가 기다리고 있어요. 오늘 조금만 써봐요!',
      '아직 오늘 글을 쓰지 않으셨네요. 지금 시작해도 늦지 않았어요!',
      '단 한 문장이라도 좋아요. 오늘 글을 써봐요 💖',
      '당신의 창작 세계가 그리워하고 있어요. 오늘 방문해줘요!',
      '오늘 하루가 가기 전에 이야기 속으로 들어가봐요 ✨',
      '힘든 날에도 글 한 줄이 큰 위안이 될 수 있어요. 도전해봐요!',
      '오늘의 글쓰기가 기다리고 있어요. 조금만 써봐요 🌟',
      '당신의 이야기는 소중해요. 오늘도 한 걸음 나아가봐요!',
      '지금이 딱 좋은 글쓰기 시간이에요! 시작해봐요 💪',
    ],
    urgent: [
      '오늘이 거의 끝나가요! 아직 글을 쓸 수 있어요. 조금만요! 😢',
      '지금이라도 괜찮아요! 단 한 줄이라도 쓰면 오늘 성공이에요 💪',
      '오늘 하루 아깝지 않으세요? 지금 바로 시작해봐요!',
      '자정이 되기 전에 글을 써요! 당신을 응원해요 🌙',
      '포기하지 마세요! 아직 시간이 있어요. 같이 해봐요! 💖',
      '오늘이 가기 전에 꼭 한 번 시도해봐요. 당신을 믿어요! ✨',
      '힘내세요! 지금 써도 늦지 않았어요. 파이팅! 🔥',
      '오늘의 마지막 기회예요. 단 5분이라도 써봐요 ⏰',
      '포기하면 내일이 더 힘들어요. 지금 딱 한 줄만요! 🙏',
      '당신은 할 수 있어요! 지금 바로 앱을 열어봐요 💕',
    ],
    missed: [
      '어제 힘드셨나요? 괜찮아요. 오늘 다시 시작해봐요 💖',
      '어제는 쉬셨군요. 그래도 괜찮아요. 오늘은 꼭 써봐요! ✨',
      '가끔 쉬어가는 날도 있어요. 오늘부터 다시 시작해요 😊',
      '어제 일이 있으셨나요? 오늘은 저와 함께 글을 써봐요! 💪',
      '새로운 오늘이 왔어요. 어제를 잊고 다시 시작해봐요 🌅',
    ],
  },
  tsundere: {
    label: '츤데레 라이벌',
    emoji: '😤',
    gentle: [
      '어, 아직 안 쓴 거야? 뭐, 늦은 건 아니니까 빨리 써.',
      '별로 걱정하는 게 아닌데... 그냥 오늘 쓸 생각 있어?',
      '흥, 오늘도 안 쓰면 내가 앞서가는 거 알지?',
      '뭐야, 아직 시작도 안 한 거야? ...좀 더 분발해.',
      '나는 벌써 오늘 분량 다 썼거든? 너도 빨리 해.',
      '오늘 글 안 쓴 것 같던데... 뭐, 상관없지만 말이야.',
      '경쟁자가 쉬고 있으면 내가 편하긴 한데... 그래도 써.',
      '아직 안 썼구나. 뭐, 도와주려는 게 아니야. 그냥 알려주는 거야.',
      '오늘 쓸 거야, 말 거야? 어서 결정해.',
      '...이거 알림 보내기 싫었는데. 그냥 얼른 써.',
    ],
    urgent: [
      '야, 지금이 몇 시야?! 아직도 안 썼어?!',
      '이제 진짜 얼마 안 남았어. 뭐하고 있어?!',
      '...이건 정말 걱정되는 게 아니야. 그냥 빨리 써!',
      '왜 이렇게 늦게까지 안 쓰는 거야! 얼른 시작해!',
      '오늘 연속 기록 깨면 내가 더 앞서갈 거야! 빨리!',
      '진짜야, 지금 당장 써! 아, 걱정되는 게 절대 아니거든?!',
      '이제 시간 없어. 한 줄이라도 빨리 써. 알겠어?',
      '바보야, 지금 자정이 얼마나 남았는지 알아?! 써!',
      '...제발. 그냥 써줘. 이게 그렇게 어려워?',
      '마지막이야! 지금 안 쓰면 진짜 실망할 거야!',
    ],
    missed: [
      '어제 왜 안 썼어? 뭐, 뭐 있었던 거야...? 오늘은 꼭 써.',
      '어제 쉬었구나. ...뭐, 이유가 있겠지. 오늘은 해.',
      '연속 기록 끊어졌잖아. 내 덕분에 알았지? 오늘 다시 시작해.',
      '어제 일 때문이었어? ...그래, 알았어. 오늘은 써.',
      '며칠 쉬었구나. 나는 계속 썼는데... 빨리 따라와.',
    ],
  },
  friend: {
    label: '유쾌한 친구',
    emoji: '🎉',
    gentle: [
      '야야야~ 오늘 아직 안 썼잖아! ㅋㅋ 빨리 써봐!',
      '이봐이봐~ 글쓰기 시간이야! 우리 같이 화이팅하자고!',
      '오늘도 재밌는 장면 쓸 거잖아~ 얼른 시작해봐! ✨',
      '글쓰기 고수님~ 아직 안 쓰셨나요? ㅋㅋ 지금 시작해요!',
      '오늘 이야기 어디까지 쓸 거야?? 빨리 시작하자!',
      '세계관이 너를 기다리고 있어! 들어가볼 준비됐어?',
      '뭐해뭐해~ 아직 글 안 쓴 거 알고 있다고! ㅎㅎ',
      '오늘도 파이팅! 한 문장만 써봐. 그럼 멈출 수 없을 걸?',
      '아직 안 쓴 거지? 나도 알아~ ㅋ 같이 해볼까?',
      '작가님~ 오늘 분량이 비어있어요! 채워봐요! 🎊',
    ],
    urgent: [
      '야야 지금 몇 시야?! 아직도 안 썼어?! ㅋㅋ 빨리!!',
      '오늘이 거의 끝나가고 있다고요!! 얼른 써봐요! 🏃💨',
      '자정 전에 단 한 줄이라도! 가능해! 해볼 수 있어!! 🔥',
      'OMG 아직도 안 썼어?! 지금 당장 앱 열어!! ㅋㅋ',
      '시간이 없어!! 얼른얼른! 파이팅파이팅!! 🎊',
      '연속 기록 날아가기 직전이야!! 빨리 구해줘!! 🚨',
      '막차 타자!! 지금이라도 써봐! 할 수 있잖아!!!',
      '뭐해뭐해뭐해!! 지금 자정 얼마 남았는지 알아?! 빨리!!',
      '이건 진지한 알림이야. 진짜로. 제발 좀 써줘 ㅠㅠ',
      '마지막 찬스!!! 지금 쓰면 영웅이고 안 쓰면... ㅋ 빨리해!!',
    ],
    missed: [
      '어제 왜 안 썼어?? 궁금하다궁금해 ㅋㅋ 오늘은 꼭 해!',
      '어제 쉬었구나~ 뭐 힘든 거 있어? 오늘은 같이 해봐!',
      '연속 기록 날아갔다~~ ㅠㅠ 오늘부터 다시 시작해!!',
      '어제는 뭐했어?? ㅎㅎ 오늘은 꼭 글 써야 해! 같이!',
      '리셋이야 리셋!! 오늘부터 새로운 연속 기록 도전!! 🎯',
    ],
  },
  mentor: {
    label: '엄격한 스승',
    emoji: '🎓',
    gentle: [
      '아직 오늘의 수련을 시작하지 않았군. 서두르게.',
      '매일의 글쓰기는 수련이다. 오늘 분량을 채워야 할 때다.',
      '좋은 작가는 영감을 기다리지 않는다. 앉아서 쓰는 것이다.',
      '오늘 아직 글을 쓰지 않았군. 지금 당장 시작하게.',
      '규칙적인 글쓰기만이 실력을 키운다. 오늘도 예외는 없다.',
      '시간은 기다려주지 않는다. 오늘 수련을 시작하게.',
      '아직 한 글자도 쓰지 않았군. 이것은 작가로서 부끄러운 일이다.',
      '오늘의 목표를 달성하려면 지금 시작해야 한다.',
      '글쓰기를 미루는 것은 꿈을 미루는 것이다. 당장 시작하게.',
      '내일의 성장은 오늘의 수련에서 나온다. 지금 써라.',
    ],
    urgent: [
      '오늘이 얼마 남지 않았다. 이 시간을 허비할 셈인가?',
      '심각한 상황이다. 자정이 오기 전에 반드시 써야 한다.',
      '이 게으름을 방치하면 작가로서의 성장은 없다. 지금 시작하게.',
      '최후의 경고다. 오늘을 아무 결실 없이 보낼 텐가?',
      '지금 당장 펜을 들지 않으면 오늘은 사라진다. 시작하게.',
      '이 알림이 울리는 이유를 알고 있겠지. 당장 써라.',
      '한 줄이라도 좋다. 오늘이 지나가기 전에 무언가를 남겨라.',
      '포기는 용납되지 않는다. 지금 즉시 시작하게.',
      '오늘 연속 기록이 끊기면 다시 쌓는 데 더 많은 시간이 필요하다.',
      '마지막 기회다. 지금이 아니면 오늘은 영원히 지나간다.',
    ],
    missed: [
      '어제 수련을 하지 않았군. 이유가 있는가? 오늘은 반드시 해야 한다.',
      '어제의 공백은 어제의 것이다. 오늘은 빠짐없이 수련하게.',
      '연속 기록이 끊어졌다. 이것을 교훈으로 삼게. 오늘부터 다시 시작한다.',
      '어제를 잃었다고 오늘까지 잃을 필요는 없다. 지금 시작하게.',
      '스승으로서 말한다: 어제는 실수였다. 오늘은 그 실수를 만회하게.',
    ],
  },
};

// ── Global Reminder Engine ──────────────────────────────────────────────────
window.ReminderEngine = window.ReminderEngine || (function() {
  let _timers = [];
  let _writeTimer = null;
  let _initialized = false;
  let _ws = {
    lastGentleMs: 0,
    lastUrgentMs: 0,
    missedFiredDate: null,
    gentleIdx: 0,
    urgentIdx: 0,
    missedIdx: 0,
  };

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
              badge: './icons/badge.png',
              tag: 'reminder-' + reminder.id,
              renotify: true,
              vibrate: [200, 100, 200],
            });
          });
        } else {
          new Notification('소설 창작위키', { body: msg, icon: './icons/icon-192.png' });
        }
      } catch(e) {}
    }
    if (window.Utils && Utils.toast) {
      Utils.toast('🔔 ' + msg, 'info', 4000);
    }
  }

  function _fireWritingMsg(msg) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('소설 창작위키', {
              body: msg,
              icon: './icons/icon-192.png',
              badge: './icons/badge.png',
              tag: 'writing-reminder',
              renotify: true,
              vibrate: [200, 100, 200],
            });
          });
        } else {
          new Notification('소설 창작위키', { body: msg, icon: './icons/icon-192.png' });
        }
      } catch(e) {}
    }
    if (window.Utils && Utils.toast) {
      Utils.toast('📝 ' + msg, 'info', 5000);
    }
  }

  async function _loadReminders() {
    try {
      return (await DB.getSetting('reminders', [])) || [];
    } catch(e) { return []; }
  }

  async function _getWriteSettings() {
    return await DB.getSetting('writingReminderSettings', {
      enabled: false,
      personality: 'warm',
      gentleStart: '18:00',
      urgentStart: '21:00',
      interval: 60,
    });
  }

  async function _checkWritingReminder() {
    const settings = await _getWriteSettings();
    if (!settings.enabled) return;

    const nowMs = Date.now();
    const d = new Date();
    const nowMin = _toMinutes(d.getHours(), d.getMinutes());
    const todayIso = d.toISOString().slice(0, 10);

    // Missed-day check (once per calendar day)
    if (_ws.missedFiredDate !== todayIso) {
      _ws.missedFiredDate = todayIso; // mark as checked regardless
      const yesterday = new Date(d);
      yesterday.setDate(yesterday.getDate() - 1);
      const yIso = yesterday.toISOString().slice(0, 10);
      try {
        const sd = await DB.get('streak', 'main');
        if (sd && sd.history && sd.history.length > 0) {
          const yHist = sd.history.find(h => h.d === yIso);
          // Only fire if they were active yesterday but didn't clear quest
          if (yHist && yHist.c !== 1) {
            const msgs = WRITING_PERSONALITIES[settings.personality]?.missed || [];
            if (msgs.length > 0) {
              const msg = msgs[_ws.missedIdx % msgs.length];
              _ws.missedIdx++;
              _fireWritingMsg(msg);
              return;
            }
          }
        }
      } catch(e) {}
    }

    // Check today's quest status
    try {
      const today = new Date().toDateString();
      const ta = await DB.getSetting('todayActivity', null);
      if (ta && ta.date === today && ta.questDone) return;
    } catch(e) {}

    const gS = _parseTime(settings.gentleStart);
    const uS = _parseTime(settings.urgentStart);
    const gentleMin = _toMinutes(gS.h, gS.m);
    const urgentMin = _toMinutes(uS.h, uS.m);
    const intervalMs = (settings.interval || 60) * 60000;
    const pers = WRITING_PERSONALITIES[settings.personality] || WRITING_PERSONALITIES.warm;

    if (nowMin >= urgentMin) {
      if (nowMs - _ws.lastUrgentMs >= intervalMs) {
        _ws.lastUrgentMs = nowMs;
        const msgs = pers.urgent;
        const msg = msgs[_ws.urgentIdx % msgs.length];
        _ws.urgentIdx++;
        _fireWritingMsg(msg);
      }
    } else if (nowMin >= gentleMin) {
      if (nowMs - _ws.lastGentleMs >= intervalMs) {
        _ws.lastGentleMs = nowMs;
        const msgs = pers.gentle;
        const msg = msgs[_ws.gentleIdx % msgs.length];
        _ws.gentleIdx++;
        _fireWritingMsg(msg);
      }
    }
  }

  function _clearTimers() {
    _timers.forEach(t => clearInterval(t));
    _timers = [];
    if (_writeTimer) { clearInterval(_writeTimer); _writeTimer = null; }
  }

  async function start() {
    _clearTimers();
    const reminders = await _loadReminders();

    reminders.forEach(reminder => {
      if (!reminder.enabled) return;
      const intervalMs = (parseInt(reminder.interval) || 60) * 60000;
      const startP = _parseTime(reminder.startTime);
      const endP = _parseTime(reminder.endTime);
      const startMin = _toMinutes(startP.h, startP.m);
      const endMin = _toMinutes(endP.h, endP.m);

      const t = setInterval(() => {
        const n = _now();
        const nowMin = _toMinutes(n.h, n.m);
        if (nowMin >= startMin && nowMin < endMin) {
          _fireNotification(reminder);
        }
      }, intervalMs);
      _timers.push(t);
    });

    // Writing reminder timer — check every minute, fire based on rate-limit
    const writeSettings = await _getWriteSettings();
    if (writeSettings.enabled) {
      await _checkWritingReminder(); // Immediate check
      const wIntervalMs = (writeSettings.interval || 60) * 60000;
      _writeTimer = setInterval(_checkWritingReminder, wIntervalMs);
    }
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

  async function saveWriteSettings(settings) {
    await DB.setSetting('writingReminderSettings', settings);
    // Reset rate-limit state so new settings take effect immediately
    _ws.lastGentleMs = 0;
    _ws.lastUrgentMs = 0;
    start();
  }

  async function init() {
    if (_initialized) return;
    _initialized = true;
    await start();
  }

  return {
    init, start, save, saveWriteSettings, requestPermission,
    _loadReminders, _getWriteSettings, _fireNotification, _fireWritingMsg,
    WRITING_PERSONALITIES,
  };
})();

// ── Reminders Page ──────────────────────────────────────────────────────────
window.Pages.reminders = {
  _container: null,

  init: async function(container) {
    this._container = container;
    await ReminderEngine.init();
    const reminders = await ReminderEngine._loadReminders();
    const writeSettings = await ReminderEngine._getWriteSettings();
    this._render(container, reminders, writeSettings);
  },

  _render: function(container, reminders, writeSettings) {
    const self = this;
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const permColor = perm === 'granted' ? 'var(--color-success)' : perm === 'denied' ? 'var(--color-danger)' : 'var(--color-warning)';
    const permLabel = perm === 'granted' ? '✅ 알림 허용됨' : perm === 'denied' ? '🚫 차단됨 (브라우저 설정에서 허용 필요)' : '⚠️ 알림 권한 필요';
    const ws = writeSettings || { enabled: false, personality: 'warm', gentleStart: '18:00', urgentStart: '21:00', interval: 60 };
    const pers = WRITING_PERSONALITIES;

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <h2 class="page-title">리마인더</h2>
        <p class="page-desc" style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">
          알림 설정 및 작성 독려 메시지를 관리합니다.
        </p>
      </div>

      <!-- 알림 권한 -->
      <div style="background:var(--color-surface2);border-radius:10px;padding:10px 14px;margin-bottom:14px;border:1px solid var(--color-border);display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:13px;color:${permColor};">${permLabel}</div>
        ${perm !== 'granted' && perm !== 'denied'
          ? `<button class="btn btn-primary btn-sm" id="btnReqPerm">권한 요청</button>`
          : perm === 'denied'
          ? `<div style="font-size:11px;color:var(--color-text-dim);text-align:right;">주소창 🔒 에서<br>직접 허용하세요</div>`
          : ''}
      </div>

      <!-- 작성 독려 알림 -->
      <div style="background:var(--color-surface2);border-radius:14px;padding:16px;border:2px solid ${ws.enabled ? 'var(--color-primary)' : 'var(--color-border)'};margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div>
            <div style="font-size:15px;font-weight:700;">📝 작성 독려 알림</div>
            <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">미션 미완료 시 글쓰기를 독려하는 알림</div>
          </div>
          <button class="btn btn-sm ${ws.enabled ? 'btn-primary' : 'btn-ghost'}" id="btnWriteToggle"
            style="border-radius:20px;padding:6px 16px;font-size:13px;font-weight:700;">
            ${ws.enabled ? '● ON' : '○ OFF'}
          </button>
        </div>

        <!-- 성향 선택 -->
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:6px;font-weight:600;">알림 성향</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;" id="persSelect">
            ${Object.entries(pers).map(([key, p]) => `
              <button class="btn btn-sm pers-btn ${ws.personality === key ? 'btn-primary' : 'btn-ghost'}"
                data-pers="${key}" style="border-radius:20px;padding:5px 12px;font-size:12px;">
                ${p.emoji} ${p.label}
              </button>`).join('')}
          </div>
        </div>

        <!-- 시간/간격 설정 -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
          <div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:3px;">독려 시작</div>
            <input class="form-input" id="wGentleStart" type="time" value="${ws.gentleStart || '18:00'}"
              style="font-size:13px;padding:6px 8px;"/>
          </div>
          <div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:3px;">강한 독려 시작</div>
            <input class="form-input" id="wUrgentStart" type="time" value="${ws.urgentStart || '21:00'}"
              style="font-size:13px;padding:6px 8px;"/>
          </div>
          <div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:3px;">알림 간격</div>
            <select class="form-input" id="wInterval" style="font-size:13px;padding:6px 8px;">
              ${[30,60,90,120].map(v => `<option value="${v}" ${(ws.interval||60)==v?'selected':''}>${v>=60?Math.floor(v/60)+'시간'+(v%60?v%60+'분':''):v+'분'}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- 미리보기 -->
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm" id="btnPreviewGentle" style="font-size:12px;flex:1;">
            💬 독려 미리보기
          </button>
          <button class="btn btn-ghost btn-sm" id="btnPreviewUrgent" style="font-size:12px;flex:1;">
            🚨 경고 미리보기
          </button>
          <button class="btn btn-primary btn-sm" id="btnWriteSave" style="font-size:12px;flex:1;">
            저장
          </button>
        </div>
      </div>

      <!-- 커스텀 알림 -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-size:14px;font-weight:700;">🔔 커스텀 알림</div>
        <button class="btn btn-primary btn-sm" id="btnAddReminder">+ 추가</button>
      </div>

      ${reminders.length === 0
        ? `<div style="text-align:center;padding:32px;color:var(--color-text-muted);font-size:13px;">
             등록된 커스텀 알림이 없습니다<br>
             <span style="font-size:11px;color:var(--color-text-dim);">예: 오전 10시~오후 3시, 20분마다 알림</span>
           </div>`
        : `<div style="display:flex;flex-direction:column;gap:10px;" id="reminderList">
             ${reminders.map((r, i) => this._renderCard(r, i)).join('')}
           </div>`}

      <div style="height:32px;"></div>
    </div>`;

    // 권한 요청
    container.querySelector('#btnReqPerm')?.addEventListener('click', async () => {
      const result = await ReminderEngine.requestPermission();
      const updated = await ReminderEngine._loadReminders();
      const ws2 = await ReminderEngine._getWriteSettings();
      Utils.toast(result === 'granted' ? '알림 권한이 허용되었습니다! 🎉' : '알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.');
      self._render(container, updated, ws2);
    });

    // 작성 독려 ON/OFF
    container.querySelector('#btnWriteToggle')?.addEventListener('click', async () => {
      const cur = await ReminderEngine._getWriteSettings();
      cur.enabled = !cur.enabled;
      await ReminderEngine.saveWriteSettings(cur);
      const updated = await ReminderEngine._loadReminders();
      Utils.toast(cur.enabled ? '작성 독려 알림을 켰습니다.' : '작성 독려 알림을 껐습니다.');
      self._render(container, updated, cur);
    });

    // 성향 선택
    container.querySelectorAll('.pers-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.pers-btn').forEach(b => {
          b.classList.replace('btn-primary', 'btn-ghost');
        });
        btn.classList.replace('btn-ghost', 'btn-primary');
      });
    });

    // 저장
    container.querySelector('#btnWriteSave')?.addEventListener('click', async () => {
      const persBtn = container.querySelector('.pers-btn.btn-primary');
      const personality = persBtn?.dataset.pers || 'warm';
      const gentleStart = container.querySelector('#wGentleStart')?.value || '18:00';
      const urgentStart = container.querySelector('#wUrgentStart')?.value || '21:00';
      const interval = parseInt(container.querySelector('#wInterval')?.value) || 60;
      if (gentleStart >= urgentStart) {
        Utils.toast('강한 독려 시각이 독려 시작 시각보다 늦어야 합니다.', 'warning', 3000);
        return;
      }
      const newSettings = { enabled: ws.enabled, personality, gentleStart, urgentStart, interval };
      await ReminderEngine.saveWriteSettings(newSettings);
      Utils.toast('작성 독려 알림 설정이 저장되었습니다.');
      const updated = await ReminderEngine._loadReminders();
      self._render(container, updated, newSettings);
    });

    // 미리보기 버튼
    container.querySelector('#btnPreviewGentle')?.addEventListener('click', () => {
      const persBtn = container.querySelector('.pers-btn.btn-primary');
      const key = persBtn?.dataset.pers || 'warm';
      const msgs = WRITING_PERSONALITIES[key]?.gentle || [];
      if (msgs.length) {
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        ReminderEngine._fireWritingMsg(msg);
      }
    });

    container.querySelector('#btnPreviewUrgent')?.addEventListener('click', () => {
      const persBtn = container.querySelector('.pers-btn.btn-primary');
      const key = persBtn?.dataset.pers || 'warm';
      const msgs = WRITING_PERSONALITIES[key]?.urgent || [];
      if (msgs.length) {
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        ReminderEngine._fireWritingMsg(msg);
      }
    });

    // 커스텀 알림 추가
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
          const ws2 = await ReminderEngine._getWriteSettings();
          self._render(container, current, ws2);
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
          const ws2 = await ReminderEngine._getWriteSettings();
          self._render(container, current, ws2);
        });
      });
    });

    container.querySelectorAll('.btn-test-reminder').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        const current = await ReminderEngine._loadReminders();
        if (current[idx]) ReminderEngine._fireNotification(current[idx]);
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
          <div style="font-size:22px;padding-top:2px;">🔔</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:14px;color:var(--color-text);margin-bottom:3px;">"${Utils.escHtml(r.message || '알림')}"</div>
            <div style="font-size:12px;color:var(--color-text-muted);">
              🕐 ${Utils.escHtml(r.startTime || '00:00')} ~ ${Utils.escHtml(r.endTime || '23:59')}
              &nbsp;·&nbsp; ⏱ ${Utils.escHtml(String(intervalLabel))}마다
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <button class="btn btn-ghost btn-sm btn-test-reminder" data-idx="${i}" title="테스트" style="padding:4px 8px;font-size:11px;">테스트</button>
            <button class="btn btn-ghost btn-sm btn-edit-reminder" data-idx="${i}" style="padding:4px 8px;font-size:11px;">편집</button>
            <button class="btn btn-ghost btn-sm btn-del-reminder" data-idx="${i}" style="padding:4px 8px;font-size:11px;color:var(--color-danger);">삭제</button>
          </div>
        </div>
        <div style="margin-top:10px;display:flex;align-items:center;gap:8px;">
          <button class="btn btn-sm btn-toggle-reminder ${r.enabled ? 'btn-primary' : 'btn-ghost'}" data-idx="${i}"
            style="font-size:12px;padding:5px 14px;border-radius:20px;">
            ${r.enabled ? '● 활성' : '○ 비활성'}
          </button>
          <div style="font-size:11px;color:var(--color-text-muted);">${r.days && r.days.length ? r.days.join(' ') : '매일'}</div>
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
            placeholder="예: 물 마시기, 스트레칭하기..." style="font-size:15px;"/>
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
                ${v >= 60 ? Math.floor(v/60) + '시간' + (v%60?v%60+'분':'') : v + '분'}
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
      </div>`;

    Utils.openModal(r ? '알림 편집' : '알림 추가', body, async () => {
      const message = document.getElementById('fMessage')?.value.trim();
      if (!message) { Utils.fieldError('fMessage'); return false; }
      const startTime = document.getElementById('fStart')?.value || '10:00';
      const endTime = document.getElementById('fEnd')?.value || '15:00';
      const interval = parseInt(document.getElementById('fInterval')?.value) || 20;
      if (startTime >= endTime) { Utils.fieldError('fStart', 'fEnd'); return false; }
      if (interval < 1) { Utils.fieldError('fInterval'); return false; }
      const days = Array.from(document.querySelectorAll('.day-opt.btn-primary')).map(b => b.dataset.day);
      const payload = {
        id: r?.id || ('rem_' + Date.now()),
        message, startTime, endTime, interval, days,
        enabled: r?.enabled !== false,
      };
      const updated = [...reminders];
      if (editIdx !== null) updated[editIdx] = payload;
      else updated.push(payload);
      await ReminderEngine.save(updated);
      Utils.toast(r ? '알림이 수정되었습니다.' : '알림이 추가되었습니다.');
      const ws2 = await ReminderEngine._getWriteSettings();
      self._render(container, updated, ws2);
    });

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
