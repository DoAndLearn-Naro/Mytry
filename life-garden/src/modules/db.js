/**
 * IndexedDB Wrapper — Life Garden (Phase 2)
 * -----------------------------------------------------------
 * Stores
 *     photos          : { id, taskId, templateId, blob, date, createdAt }
 *     tasks           : { id, templateId, date, completed, withPhoto, slotId?, completedAt }
 *     plant           : { id: 'water', value }
 *     meta            : { key, value }
 *     placements      : { id (= slotId), decorationId, water, history: [...] }
 *     decorations     : { id, label, emoji, image, fitsSlots, unlockAfter }
 *     contentPack     : { key: 'active', version, decorations[], slots[], tasks[] }
 */

const DB_NAME = 'life-garden-db';
const DB_VERSION = 2;

const STORES = {
  PHOTOS: 'photos',
  TASKS: 'tasks',
  PLANT: 'plant',
  META: 'meta',
  PLACEMENTS: 'placements',
  DECORATIONS: 'decorations',
  CONTENT_PACK: 'contentPack',
};

let _dbPromise = null;

export function getDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        const photoStore = db.createObjectStore(STORES.PHOTOS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        photoStore.createIndex('byDate', 'date');
        photoStore.createIndex('byTaskId', 'taskId');

        const taskStore = db.createObjectStore(STORES.TASKS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        taskStore.createIndex('byDate', 'date');
        taskStore.createIndex('byTemplateId', 'templateId');

        db.createObjectStore(STORES.PLANT, { keyPath: 'id' });
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORES.PLACEMENTS)) {
          db.createObjectStore(STORES.PLACEMENTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.DECORATIONS)) {
          const decStore = db.createObjectStore(STORES.DECORATIONS, { keyPath: 'id' });
          decStore.createIndex('fitsSlots', 'fitsSlots', { multiEntry: true });
        }
        if (!db.objectStoreNames.contains(STORES.CONTENT_PACK)) {
          db.createObjectStore(STORES.CONTENT_PACK, { keyPath: 'key' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function runTx(storeNames, mode, work) {
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  return getDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(names, mode);
        const stores = names.map((n) => tx.objectStore(n));
        let result;
        Promise.resolve(work(...stores)).then((r) => {
          result = r;
        });
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

/* ============ Photos ============ */
export async function putPhoto(record) {
  return runTx(STORES.PHOTOS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.add(record);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function listPhotos() {
  return runTx(STORES.PHOTOS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getLatestPhotoForTask(templateId) {
  return runTx(STORES.PHOTOS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const idx = store.index('byTaskId');
      const req = idx.getAll(templateId);
      req.onsuccess = () => {
        const list = (req.result || []).sort((a, b) => b.createdAt - a.createdAt);
        res(list[0] || null);
      };
      req.onerror = () => rej(req.error);
    });
  });
}

/* ============ Tasks ============ */
export async function saveTaskRecord(record) {
  return runTx(STORES.TASKS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.add(record);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getTasksByDate(dateKey) {
  return runTx(STORES.TASKS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const idx = store.index('byDate');
      const req = idx.getAll(dateKey);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}

/* ============ Plant (legacy single-plant state) ============ */
export async function getPlantState() {
  return runTx(STORES.PLANT, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.get('water');
      req.onsuccess = () => {
        if (req.result) {
          res(req.result);
        } else {
          const seed = { id: 'water', value: 0 };
          const add = store.add(seed);
          add.onsuccess = () => res(seed);
          add.onerror = () => rej(add.error);
        }
      };
      req.onerror = () => rej(req.error);
    });
  });
}
export async function addWater(n = 1) {
  return runTx(STORES.PLANT, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.get('water');
      req.onsuccess = () => {
        const cur = req.result || { id: 'water', value: 0 };
        cur.value = Math.max(0, (cur.value || 0) + n);
        const put = store.put(cur);
        put.onsuccess = () => res(cur);
        put.onerror = () => rej(put.error);
      };
      req.onerror = () => rej(req.error);
    });
  });
}

/* ============ Meta ============ */
export async function setMeta(key, value) {
  return runTx(STORES.META, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.put({ key, value });
      req.onsuccess = () => res(value);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getMeta(key) {
  return runTx(STORES.META, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.get(key);
      req.onsuccess = () => res(req.result ? req.result.value : null);
      req.onerror = () => rej(req.error);
    });
  });
}

/* ============ Placements (slot -> decoration mapping) ============ */
export async function getAllPlacements() {
  return runTx(STORES.PLACEMENTS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getPlacement(slotId) {
  return runTx(STORES.PLACEMENTS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.get(slotId);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function setPlacement(slotId, decorationId) {
  return runTx(STORES.PLACEMENTS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const getReq = store.get(slotId);
      getReq.onsuccess = () => {
        const cur = getReq.result || {
          id: slotId,
          water: 0,
          history: [],
        };
        cur.decorationId = decorationId;
        const putReq = store.put(cur);
        putReq.onsuccess = () => res(cur);
        putReq.onerror = () => rej(putReq.error);
      };
      getReq.onerror = () => rej(getReq.error);
    });
  });
}
export async function clearPlacement(slotId) {
  return runTx(STORES.PLACEMENTS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.delete(slotId);
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function addPlacementWater(slotId, n = 1) {
  return runTx(STORES.PLACEMENTS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const getReq = store.get(slotId);
      getReq.onsuccess = () => {
        const cur = getReq.result || {
          id: slotId,
          decorationId: null,
          water: 0,
          history: [],
        };
        cur.water = Math.max(0, (cur.water || 0) + n);
        cur.history = cur.history || [];
        cur.history.push({ at: Date.now(), delta: n });
        const putReq = store.put(cur);
        putReq.onsuccess = () => res(cur);
        putReq.onerror = () => rej(putReq.error);
      };
      getReq.onerror = () => rej(getReq.error);
    });
  });
}

/* ============ Decorations (catalog) ============ */
export async function putDecoration(decoration) {
  return runTx(STORES.DECORATIONS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.put(decoration);
      req.onsuccess = () => res(decoration);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getAllDecorations() {
  return runTx(STORES.DECORATIONS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getDecoration(id) {
  return runTx(STORES.DECORATIONS, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.get(id);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function deleteDecoration(id) {
  return runTx(STORES.DECORATIONS, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const req = store.delete(id);
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    });
  });
}

/* ============ Content Pack ============ */
export async function saveContentPack(pack) {
  return runTx(STORES.CONTENT_PACK, 'readwrite', (store) => {
    return new Promise((res, rej) => {
      const record = { key: 'active', ...pack, savedAt: Date.now() };
      const req = store.put(record);
      req.onsuccess = () => res(record);
      req.onerror = () => rej(req.error);
    });
  });
}
export async function getContentPack() {
  return runTx(STORES.CONTENT_PACK, 'readonly', (store) => {
    return new Promise((res, rej) => {
      const req = store.get('active');
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  });
}