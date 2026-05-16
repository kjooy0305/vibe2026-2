'use strict';
const DB = (function() {
  const DB_NAME = 'NovelWikiDB';
  const DB_VERSION = 12;
  const STORES = ['worlds','characters','skills','achievements','organizations','constellations','gates','monsters','towers','items','jobs','events','worldRules','templates','folders','settings','streak','countries','companies','keywordFolders','keywords','statDefs','traps','places','gods','races','quests','editHistory'];

  let db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const d = e.target.result;
        STORES.forEach(name => {
          if (!d.objectStoreNames.contains(name)) {
            const store = d.createObjectStore(name, { keyPath: 'id' });
            if (['characters','skills','achievements','organizations','constellations','gates','monsters','towers','items','jobs','events','worldRules','folders','countries','companies','keywordFolders','keywords','statDefs','traps','places','gods','races','quests'].includes(name)) {
              store.createIndex('worldId', 'worldId', { unique: false });
            }
            // editHistory: no worldId index
          }
        });
      };
      req.onsuccess = e => { db = e.target.result; resolve(db); };
      req.onerror = e => reject(e.target.error);
    });
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function tx(storeName, mode = 'readonly') {
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  function getAll(storeName, worldId) {
    return open().then(() => new Promise((resolve, reject) => {
      let req;
      if (worldId) {
        const store = tx(storeName);
        const idx = store.index('worldId');
        req = idx.getAll(worldId);
      } else {
        req = tx(storeName).getAll();
      }
      req.onsuccess = e => resolve(e.target.result || []);
      req.onerror = e => reject(e.target.error);
    }));
  }

  function get(storeName, id) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = tx(storeName).get(id);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    }));
  }

  function put(storeName, data) {
    const HISTORY_STORES = ['characters','skills','items','monsters','organizations','gates','towers','countries','companies','places','races','gods','quests','constellations','events','worldRules','traps','jobs','statDefs','keywords','achievements'];
    return open().then(() => {
      if (HISTORY_STORES.includes(storeName) && data.id) {
        try {
          const oldReq = db.transaction(storeName,'readonly').objectStore(storeName).get(data.id);
          oldReq.onsuccess = () => {
            const old = oldReq.result;
            if (!old) return;
            getSetting('historyLimit').then(lim => {
              const maxE = (typeof lim === 'number' && lim > 0) ? lim : 50;
              const histEntry = { id: genId(), storeName, itemId: old.id, itemName: old.name || old.id, timestamp: Date.now(), snapshot: JSON.parse(JSON.stringify(old)) };
              const hTx = db.transaction('editHistory','readwrite');
              hTx.objectStore('editHistory').put(histEntry);
              const allR = db.transaction('editHistory','readonly').objectStore('editHistory').getAll();
              allR.onsuccess = () => {
                const all = allR.result || [];
                if (all.length > maxE) {
                  const toDelete = [...all].sort((a,b) => a.timestamp - b.timestamp).slice(0, all.length - maxE);
                  const dTx = db.transaction('editHistory','readwrite');
                  toDelete.forEach(e => dTx.objectStore('editHistory').delete(e.id));
                }
              };
            });
          };
        } catch(e) {}
      }
      return new Promise((resolve, reject) => {
        if (!data.id) data.id = genId();
        data.updatedAt = Date.now();
        if (!data.createdAt) data.createdAt = Date.now();
        const store = tx(storeName, 'readwrite');
        const req = store.put(data);
        req.onsuccess = () => resolve(data);
        req.onerror = e => reject(e.target.error);
      });
    });
  }

  function del(storeName, id) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = tx(storeName, 'readwrite').delete(id);
      req.onsuccess = () => resolve();
      req.onerror = e => reject(e.target.error);
    }));
  }

  function getSetting(key, defaultVal) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = tx('settings').get(key);
      req.onsuccess = e => resolve(e.target.result ? e.target.result.value : defaultVal);
      req.onerror = e => reject(e.target.error);
    }));
  }

  function setSetting(key, value) {
    return open().then(() => new Promise((resolve, reject) => {
      const req = tx('settings', 'readwrite').put({ id: key, value });
      req.onsuccess = () => resolve();
      req.onerror = e => reject(e.target.error);
    }));
  }

  function exportAll() {
    return open().then(() => {
      const promises = STORES.map(name => getAll(name).then(data => ({ name, data })));
      return Promise.all(promises).then(results => {
        const out = {};
        results.forEach(r => out[r.name] = r.data);
        return out;
      });
    });
  }

  function importAll(data) {
    return open().then(() => {
      const promises = Object.entries(data).map(([name, items]) => {
        if (!STORES.includes(name)) return Promise.resolve();
        return new Promise((resolve, reject) => {
          const store = tx(name, 'readwrite');
          const req = store.clear();
          req.onsuccess = () => {
            if (!items || !items.length) return resolve();
            let done = 0;
            items.forEach(item => {
              const r = store.put(item);
              r.onsuccess = () => { if (++done === items.length) resolve(); };
              r.onerror = e => reject(e.target.error);
            });
          };
          req.onerror = e => reject(e.target.error);
        });
      });
      return Promise.all(promises);
    });
  }

  return { open, genId, getAll, get, put, del, getSetting, setSetting, exportAll, importAll };
})();
window.DB = DB;
