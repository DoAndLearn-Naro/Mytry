/**
 * IndexedDB — Warm Home (v3)
 * ─────────────────────────
 * Stores:
 *   furniture      預設家具型錄（含 gridSize / chatter）
 *   placements     已擺放的家具實例（gx,gy 格子 / x,y 角落像素 / rotation / water）
 *   warehouse      家具倉庫（收回暫存，等取出再擺）
 *   tasks          每日任務紀錄
 *   photos         任務照片 Blob
 *   polaroids      拍立得卡片
 *   interactions   隨機互動紀錄
 *   moods          心情日記
 *   contentPack    上傳的內容包
 *   meta           安裝時間 / schemaVersion / 是否已 onboarding
 */

const DB_NAME = 'warm-home-db';
const DB_VERSION = 3;

const STORES = {
  FURNITURE: 'furniture',
  PLACEMENTS: 'placements',
  WAREHOUSE: 'warehouse',
  TASKS: 'tasks',
  PHOTOS: 'photos',
  POLAROIDS: 'polaroids',
  INTERACTIONS: 'interactions',
  MOODS: 'moods',
  CONTENT_PACK: 'contentPack',
  META: 'meta',
};

let _dbPromise = null;

export function getDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const ensure = (name, opts, build) => {
        let store;
        if (db.objectStoreNames.contains(name)) {
          store = event.target.transaction.objectStore(name);
        } else {
          store = db.createObjectStore(name, opts);
        }
        if (build) build(store);
        return store;
      };
      ensure(STORES.FURNITURE, { keyPath: 'id' }, (s) => {
        try { s.createIndex('byCategory', 'category'); } catch (_) {}
      });
      ensure(STORES.PLACEMENTS, { keyPath: 'id', autoIncrement: true }, (s) => {
        try { s.createIndex('byFurnitureId', 'furnitureId'); } catch (_) {}
      });
      ensure(STORES.WAREHOUSE, { keyPath: 'id', autoIncrement: true }, (s) => {
        try { s.createIndex('byFurnitureId', 'furnitureId'); } catch (_) {}
        try { s.createIndex('byStoredAt', 'storedAt'); } catch (_) {}
      });
      ensure(STORES.TASKS, { keyPath: 'id', autoIncrement: true }, (s) => {
        try { s.createIndex('byDate', 'date'); } catch (_) {}
        try { s.createIndex('byPlacementId', 'placementId'); } catch (_) {}
      });
      ensure(STORES.PHOTOS, { keyPath: 'id', autoIncrement: true }, (s) => {
        try { s.createIndex('byTaskId', 'taskId'); } catch (_) {}
        try { s.createIndex('byPlacementId', 'placementId'); } catch (_) {}
      });
      ensure(STORES.POLAROIDS, { keyPath: 'id', autoIncrement: true }, (s) => {
        try { s.createIndex('byPlacementId', 'placementId'); } catch (_) {}
        try { s.createIndex('byCreatedAt', 'createdAt'); } catch (_) {}
      });
      ensure(STORES.INTERACTIONS, { keyPath: 'id', autoIncrement: true }, (s) => {
        try { s.createIndex('byCreatedAt', 'createdAt'); } catch (_) {}
        try { s.createIndex('byPlacementId', 'placementId'); } catch (_) {}
      });
      ensure(STORES.MOODS, { keyPath: 'id', autoIncrement: true }, (s) => {
        try { s.createIndex('byDate', 'date'); } catch (_) {}
        try { s.createIndex('byCreatedAt', 'createdAt'); } catch (_) {}
      });
      ensure(STORES.CONTENT_PACK, { keyPath: 'key' }, null);
      ensure(STORES.META, { keyPath: 'key' }, null);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(storeNames, mode, work) {
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  return getDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(names, mode);
        const stores = names.map((n) => t.objectStore(n));
        let result;
        Promise.resolve(work(...stores)).then((r) => { result = r; });
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

/* ============ Furniture catalog ============ */
export async function putFurniture(item) {
  return tx(STORES.FURNITURE, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.put(item);
      req.onsuccess = () => res(item);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getAllFurniture() {
  return tx(STORES.FURNITURE, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getFurniture(id) {
  return tx(STORES.FURNITURE, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.get(id);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function deleteFurniture(id) {
  return tx(STORES.FURNITURE, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.delete(id);
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    });
  });
}

/* ============ Placements (placed furniture) ============ */
export async function addPlacement(record) {
  return tx(STORES.PLACEMENTS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.add(record);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getAllPlacements() {
  return tx(STORES.PLACEMENTS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function updatePlacement(id, patch) {
  return tx(STORES.PLACEMENTS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const cur = getReq.result || {};
        const merged = { ...cur, ...patch, id };
        const putReq = store.put(merged);
        putReq.onsuccess = () => res(merged);
        putReq.onerror = () => rej(putReq.error);
      };
      getReq.onerror = () => rej(getReq.error);
    });
  });
}
export async function deletePlacement(id) {
  return tx(STORES.PLACEMENTS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.delete(id);
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    });
  });
}

/* ============ Tasks ============ */
export async function saveTask(record) {
  return tx(STORES.TASKS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.add(record);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getTasksByDate(dateKey) {
  return tx(STORES.TASKS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const idx = store.index('byDate');
      const req = idx.getAll(dateKey);
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getRecentTasks(limit = 30) {
  return tx(STORES.TASKS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => b.completedAt - a.completedAt);
        res(sorted.slice(0, limit));
      };
      req.onerror = () => rej(req.error);
    });
  });
}

/* ============ Photos ============ */
export async function putPhoto(record) {
  return tx(STORES.PHOTOS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.add(record);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getPhotosByPlacement(placementId) {
  return tx(STORES.PHOTOS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const idx = store.index('byPlacementId');
      const req = idx.getAll(placementId);
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  });
}

/* ============ Polaroids (memory wall cards) ============ */
export async function addPolaroid(record) {
  return tx(STORES.POLAROIDS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.add(record);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getAllPolaroids() {
  return tx(STORES.POLAROIDS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => b.createdAt - a.createdAt);
        res(sorted);
      };
      req.onerror = () => rej(req.error);
    });
  });
}

/* ============ Content Pack ============ */
export async function saveContentPack(pack) {
  return tx(STORES.CONTENT_PACK, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const rec = { key: 'active', ...pack, savedAt: Date.now() };
      const req = store.put(rec);
      req.onsuccess = () => res(rec);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getContentPack() {
  return tx(STORES.CONTENT_PACK, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.get('active');
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  });
}

/* ============ Meta ============ */
export async function setMeta(key, value) {
  return tx(STORES.META, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.put({ key, value });
      req.onsuccess = () => res(value);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getMeta(key) {
  return tx(STORES.META, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.get(key);
      req.onsuccess = () => res(req.result ? req.result.value : null);
      req.onerror = () => rej(req.error);
    });
  });
}

/* ============ Warehouse（家具倉庫：收回暫存） ============ */
export async function stashToWarehouse(record) {
  return tx(STORES.WAREHOUSE, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.add({ storedAt: Date.now(), water: 0, rotation: 0, ...record });
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getWarehouse() {
  return tx(STORES.WAREHOUSE, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => b.storedAt - a.storedAt);
        res(sorted);
      };
      req.onerror = () => rej(req.error);
    });
  });
}
export async function takeFromWarehouse(id) {
  return tx(STORES.WAREHOUSE, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const cur = getReq.result;
        if (!cur) {
          res(null);
          return;
        }
        const delReq = store.delete(id);
        delReq.onsuccess = () => res(cur);
        delReq.onerror = () => rej(delReq.error);
      };
      getReq.onerror = () => rej(getReq.error);
    });
  });
}

/* ============ Interactions（隨機互動紀錄） ============ */
export async function logInteraction(record) {
  return tx(STORES.INTERACTIONS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.add({ createdAt: Date.now(), ...record });
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getRecentInteractions(limit = 50) {
  return tx(STORES.INTERACTIONS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => b.createdAt - a.createdAt);
        res(sorted.slice(0, limit));
      };
      req.onerror = () => rej(req.error);
    });
  });
}

/* ============ Moods（心情日記） ============ */
export async function saveMood(record) {
  return tx(STORES.MOODS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.add({ createdAt: Date.now(), ...record });
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getAllMoods(limit = 100) {
  return tx(STORES.MOODS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => b.createdAt - a.createdAt);
        res(sorted.slice(0, limit));
      };
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getMoodsByDate(dateKey) {
  return tx(STORES.MOODS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      try {
        const idx = store.index('byDate');
        const req = idx.getAll(dateKey);
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      } catch (_) {
        const req = store.getAll();
        req.onsuccess = () => res((req.result || []).filter((m) => m.date === dateKey));
        req.onerror = () => rej(req.error);
      }
    });
  });
}