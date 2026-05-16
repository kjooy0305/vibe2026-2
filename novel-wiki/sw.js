/**
 * Service Worker for 소설 창작 위키
 * Cache-first strategy for full offline support
 */

const CACHE_VERSION = 'novel-wiki-v68';
const CACHE_NAME = CACHE_VERSION;

// All app assets to pre-cache on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './css/mobile.css',
  './css/novel-view.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/db.js',
  './js/utils.js',
  './js/constants.js',
  './js/search.js',
  './pages/home.js',
  './pages/world.js',
  './pages/characters.js',
  './pages/characters-form.js',
  './pages/organizations.js',
  './pages/organizations-form.js',
  './pages/skills.js',
  './pages/skills-form.js',
  './pages/achievements.js',
  './pages/constellations.js',
  './pages/constellations-form.js',
  './pages/gates.js',
  './pages/gates-form.js',
  './pages/monsters.js',
  './pages/monsters-form.js',
  './pages/tower.js',
  './pages/tower-floor-form.js',
  './pages/tower-subfloor-form.js',
  './pages/timeline.js',
  './pages/event-graph.js',
  './pages/family-tree.js',
  './pages/world-rules.js',
  './pages/items.js',
  './pages/items-form.js',
  './pages/jobs.js',
  './pages/jobs-form.js',
  './pages/templates.js',
  './pages/status-viewer.js',
  './pages/novel-view.js',
  './pages/settings.js',
  './pages/countries.js',
  './pages/countries-form.js',
  './pages/companies.js',
  './pages/reminders.js',
  './pages/keywords.js',
  './pages/stat-defs.js',
  './pages/traps.js',
  './pages/places.js',
  './pages/places-form.js',
  './pages/gods.js',
  './pages/races.js',
  './pages/quests.js',
  './pages/shortcuts.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/badge.png'
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching app assets...');
        // Cache individually so one 404 doesn't break everything
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[SW] Failed to cache ${url}:`, err.message);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activate complete, claiming clients');
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients to reload so new assets take effect immediately
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (CDN fonts etc.)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    // Network-first for external, fallback to nothing
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response('', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // Network-first for HTML navigation so updates are always reflected
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first strategy for same-origin assets
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update cache in background
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
              return networkResponse;
            })
            .catch(() => null);

          void fetchPromise;
          return cachedResponse;
        }

        // Not in cache — try network
        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            // Store in cache for future
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
            return networkResponse;
          })
          .catch(() => {
            // Network failed and not in cache
            // Return index.html for navigation requests (SPA fallback)
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response(
              JSON.stringify({ error: 'Offline and not cached' }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
      })
  );
});

// ─── Message handler ──────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
