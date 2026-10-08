/**
 * IndexedDB — Warm Home (v1)
 * ─────────────────────────
 * Stores:
 *   furniture      預設家具型錄
 *   placements     已擺放的家具實例（位置 / 旋轉 / 水滴）
 *   tasks          每日任務紀錄
 *   photos         任務照片 Blob
 *   polaroids      拍立得卡片（貼在家具旁的回憶）
 *   contentPack    上傳的內容包
 *   meta           安裝時間 / 是否已 onboarding
 */

const DB_NAME = 'warm-home-db';
const DB_VERSION = 1;

const STORES = {
  FURNITURE: 'furniture',
  PLACEMENTS: 'placements',
  TASKS: 'tasks',
  PHOTOS: 'photos',
  POLAROIDS: 'polaroids',
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
      const f = db.createObjectStore(STORES.FURNITURE, { keyPath: 'id' });
      f.createIndex('byCategory', 'category');

      const p = db.createObjectStore(STORES.PLACEMENTS, { keyPath: 'id', autoIncrement: true });
      p.createIndex('byFurnitureId', 'furnitureId');

      const t = db.createObjectStore(STORES.TASKS, { keyPath: 'id', autoIncrement: true });
      t.createIndex('byDate', 'date');
      t.createIndex('byPlacementId', 'placementId');

      const ph = db.createObjectStore(STORES.PHOTOS, { keyPath: 'id', autoIncrement: true });
      ph.createIndex('byTaskId', 'taskId');
      ph.createIndex('byPlacementId', 'placementId');

      const po = db.createObjectStore(STORES.POLAROIDS, { keyPath: 'id', autoIncrement: true });
      po.createIndex('byPlacementId', 'placementId');
      po.createIndex('byCreatedAt', 'createdAt');

      db.createObjectStore(STORES.CONTENT_PACK, { keyPath: 'key' });
      db.createObjectStore(STORES.META, { keyPath: 'key' });
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