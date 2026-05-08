'use strict';
window.Pages = window.Pages || {};
window.Pages.settings = {
  _container: null,

  APP_VERSION: 'v1.0',

  THEMATIC_QUESTIONS: [
    '회귀자의 먼치킨 능력이 어떤 고통을 가지고 행동한것인지 모르는 사람이 많음. 그래서 그 과정을 써보고 싶음.',
    '탄생과 죽음을 더 생각해보게 함.',
    '과연 선이 선할까?',
    '죽음에 의해 닳고 닳은 사람은 어떻게 될까?',
    '기나긴 삶은 아주 정신이 튼튼한 사람조차 미치게 만들 수 있을까?',
    '빛과 어둠. 과연 뭐가 먼저일까? / 빛이 있기에 어둠이 정의되었다. / 어둠 사이에서 빛이 생기며 어둠과 빛이 생겨났다.',
    '과연 가장 큰 재능은 노력일까?',
    '인과에는 앞뒤가 없다. 그것은 이미 일어난 선택이다.',
    '끝을 모르는 자는 없다. 그것을 무시할 뿐이다.',
    '잘못된 희생은 피해를 야기한다.',
  ],

  init: async function(container, options) {
    options = options || {};
    this._container = container;

    const state = AppStore.getState();
    const streak = state.streak || { count: 0 };
    const currentWorld = state.currentWorld;
    const searchScope = await DB.getSetting('searchScope', 'world');

    this._renderPage(container, { streak, currentWorld, searchScope });
  },

  _renderPage: function(container, { streak, currentWorld, searchScope }) {
    const self = this;
    const worldName = currentWorld ? currentWorld.name : '(없음)';

    container.innerHTML = `
    <div class="page active">
      <div class="page-header">
        <h2 class="page-title">설정</h2>
        <p style="margin-top:4px;font-size:12px;color:var(--color-text-muted);">앱 환경설정 및 데이터 관리</p>
      </div>

      <!-- 1. 앱 정보 -->
      <div style="background:var(--color-surface2);border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid var(--color-border);">
        <div style="font-weight:700;font-size:11px;color:var(--color-text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.8px;">앱 정보</div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--color-border);">
          <span style="font-size:13px;">버전</span>
          <span style="font-size:13px;color:var(--color-text-muted);">${Utils.escHtml(this.APP_VERSION)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--color-border);">
          <span style="font-size:13px;">현재 세계</span>
          <span style="font-size:13px;color:var(--color-text-muted);">${Utils.escHtml(worldName)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;">
          <span style="font-size:13px;">연속 작성 스트릭</span>
          <span style="font-size:13px;color:#f97316;font-weight:700;">🔥 ${streak.count || 0}일</span>
        </div>
      </div>

      <!-- 2. 검색 범위 -->
      <div style="background:var(--color-surface2);border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid var(--color-border);">
        <div style="font-weight:700;font-size:11px;color:var(--color-text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.8px;">검색 범위</div>
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <button class="scope-btn" data-scope="world"
            style="flex:1;padding:9px 12px;border-radius:8px;border:1px solid ${searchScope === 'world' ? 'var(--color-primary)' : 'var(--color-border)'};cursor:pointer;font-size:13px;font-weight:${searchScope === 'world' ? '700' : '400'};background:${searchScope === 'world' ? 'var(--color-primary)' : 'var(--color-surface2)'};color:${searchScope === 'world' ? '#000' : 'var(--color-text)'};transition:all 0.15s;">
            현재 세계만
          </button>
          <button class="scope-btn" data-scope="all"
            style="flex:1;padding:9px 12px;border-radius:8px;border:1px solid ${searchScope === 'all' ? 'var(--color-primary)' : 'var(--color-border)'};cursor:pointer;font-size:13px;font-weight:${searchScope === 'all' ? '700' : '400'};background:${searchScope === 'all' ? 'var(--color-primary)' : 'var(--color-surface2)'};color:${searchScope === 'all' ? '#000' : 'var(--color-text)'};transition:all 0.15s;">
            전체 세계
          </button>
        </div>
        <div style="font-size:11px;color:var(--color-text-dim);">검색 결과에 포함할 세계의 범위입니다. 현재: <strong>${searchScope === 'all' ? '전체 세계' : '현재 세계만'}</strong></div>
      </div>

      <!-- 3. 데이터 관리 -->
      <div style="background:var(--color-surface2);border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid var(--color-border);">
        <div style="font-weight:700;font-size:11px;color:var(--color-text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.8px;">데이터 관리</div>

        <!-- Export -->
        <button id="btnExportData"
          style="width:100%;display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-bg);cursor:pointer;color:var(--color-text);font-size:13px;margin-bottom:8px;text-align:left;">
          <span style="font-size:16px;">📤</span>
          <div>
            <div style="font-weight:600;">내보내기 (Export)</div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-top:1px;">모든 데이터를 JSON 파일로 백업합니다</div>
          </div>
        </button>

        <!-- Import -->
        <button id="btnImportData"
          style="width:100%;display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-bg);cursor:pointer;color:var(--color-text);font-size:13px;margin-bottom:8px;text-align:left;">
          <span style="font-size:16px;">📥</span>
          <div>
            <div style="font-weight:600;">가져오기 (Import)</div>
            <div style="font-size:11px;color:var(--color-text-muted);margin-top:1px;">JSON 백업 파일을 불러와 기존 데이터를 교체합니다</div>
          </div>
        </button>
        <input type="file" id="importFileInput" accept=".json" style="display:none;" />

        <!-- Reset -->
        <button id="btnResetAll"
          style="width:100%;display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.06);cursor:pointer;color:var(--color-danger);font-size:13px;text-align:left;">
          <span style="font-size:16px;">🗑️</span>
          <div>
            <div style="font-weight:600;">초기화 (Reset)</div>
            <div style="font-size:11px;color:rgba(239,68,68,0.7);margin-top:1px;">모든 데이터를 영구 삭제합니다. 되돌릴 수 없습니다.</div>
          </div>
        </button>
      </div>

      <!-- 4. 알림 -->
      <div style="background:var(--color-surface2);border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid var(--color-border);">
        <div style="font-weight:700;font-size:11px;color:var(--color-text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:0.8px;">알림</div>
        <div style="font-size:13px;color:var(--color-text-muted);line-height:1.6;">
          웹 푸시 알림은 서비스 워커를 통해 지원됩니다.<br>
          오프라인 상태이거나 브라우저 설정에 따라 알림이 제한될 수 있습니다.<br>
          <span style="font-size:11px;color:var(--color-text-dim);">현재 알림 지원: ${('Notification' in window && 'serviceWorker' in navigator) ? '가능' : '불가 (브라우저 미지원)'}</span>
        </div>
      </div>

      <!-- 5. 소설 주제 질문들 -->
      <div style="background:var(--color-surface2);border-radius:12px;padding:16px;margin-bottom:14px;border:1px solid var(--color-border);border-left:3px solid var(--color-primary);">
        <div style="font-weight:700;font-size:13px;color:var(--color-primary);margin-bottom:12px;">소설 주제 질문들</div>
        <ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:9px;">
          ${this.THEMATIC_QUESTIONS.map((q, i) => `
            <li style="font-size:12px;line-height:1.65;color:var(--color-text-muted);">
              ${Utils.escHtml(q)}
            </li>`).join('')}
        </ol>
      </div>

      <!-- 6. 앱 소개 -->
      <div style="background:var(--color-surface2);border-radius:12px;padding:16px;margin-bottom:24px;border:1px solid var(--color-border);">
        <div style="font-weight:700;font-size:11px;color:var(--color-text-muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.8px;">앱 소개</div>
        <p style="font-size:13px;color:var(--color-text-muted);line-height:1.7;margin:0;">
          소설 창작 위키 ${Utils.escHtml(this.APP_VERSION)} — 오프라인 우선 PWA<br>
          IndexedDB 기반 로컬 저장. 인터넷 없이도 완전히 동작합니다.<br>
          캐릭터, 스킬, 아이템, 게이트, 업적, 성좌 등 다양한 세계관 요소를 관리하세요.
        </p>
      </div>
    </div>`;

    // Search scope buttons
    container.querySelectorAll('.scope-btn[data-scope]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const scope = btn.dataset.scope;
        await DB.setSetting('searchScope', scope);
        AppStore.setState({ searchScope: scope });
        Utils.toast(scope === 'all' ? '전체 세계 검색으로 변경됨' : '현재 세계만 검색으로 변경됨', 'success');
        // Re-render with new scope
        const state = AppStore.getState();
        self._renderPage(container, {
          streak: state.streak || { count: 0 },
          currentWorld: state.currentWorld,
          searchScope: scope,
        });
      });
    });

    // Export
    document.getElementById('btnExportData')?.addEventListener('click', async () => {
      try {
        const data = await DB.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const d = new Date();
        a.download = `novel-wiki-backup-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Utils.toast('내보내기 완료', 'success');
      } catch (err) {
        Utils.toast('내보내기 오류: ' + err.message, 'error');
      }
    });

    // Import — click hidden file input
    document.getElementById('btnImportData')?.addEventListener('click', () => {
      document.getElementById('importFileInput')?.click();
    });

    document.getElementById('importFileInput')?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = ''; // Reset so same file can be picked again

      Utils.confirm(
        '데이터 가져오기',
        `"${file.name}" 파일을 불러옵니다. 기존의 모든 데이터가 교체됩니다. 계속하시겠습니까?`,
        async () => {
          try {
            const text = await file.text();
            let data;
            try {
              data = JSON.parse(text);
            } catch (_) {
              Utils.toast('JSON 파싱 오류: 올바른 백업 파일인지 확인하세요', 'error');
              return;
            }
            await DB.importAll(data);
            Utils.toast('가져오기 완료! 앱을 다시 시작합니다.', 'success');
            setTimeout(() => window.location.reload(), 1800);
          } catch (err) {
            Utils.toast('가져오기 오류: ' + err.message, 'error');
          }
        },
        '가져오기'
      );
    });

    // Reset all
    document.getElementById('btnResetAll')?.addEventListener('click', () => {
      Utils.confirm(
        '전체 초기화',
        '모든 세계, 캐릭터, 스킬, 아이템, 업적 등 저장된 모든 데이터가 영구 삭제됩니다. 백업 후 진행하세요. 계속하시겠습니까?',
        async () => {
          try {
            const emptyData = {
              worlds: [], characters: [], skills: [], achievements: [],
              organizations: [], constellations: [], gates: [], monsters: [],
              towers: [], items: [], jobs: [], events: [], worldRules: [],
              templates: [], folders: [], settings: [], streak: [],
            };
            await DB.importAll(emptyData);
            Utils.toast('초기화 완료. 앱을 다시 시작합니다.', 'info');
            setTimeout(() => window.location.reload(), 1800);
          } catch (err) {
            Utils.toast('초기화 오류: ' + err.message, 'error');
          }
        },
        '초기화'
      );
    });
  },

  destroy: function() {
    this._container = null;
  }
};
