/**
 * 內容包管理 — Warm Home v0.2
 * ─────────────────────────
 * 內容包 = JSON，格式：
 * { version, furniture: [{ id, label, emoji, category, placement,
 *   footprint, gridSize, tasks[], chatter[] }] }
 * 透過 AdminPanel 拖放上傳，自動寫入 furniture store。
 */

import {
  putFurniture,
  getAllFurniture,
  deleteFurniture,
  saveContentPack,
} from './db.js';
import { DEFAULT_FURNITURE, normalizeFurniture } from './furniture.js';

export async function ensureDefaultFurniture() {
  const all = await getAllFurniture();
  const byId = new Map(all.map((f) => [f.id, f]));
  for (const f of DEFAULT_FURNITURE) {
    const cur = byId.get(f.id);
    if (!cur) {
      await putFurniture({ ...f, builtin: true });
    } else if (cur.builtin !== false) {
      // 內建款以程式碼為準：footprint/gridSize/tasks/chatter 跟著版本走，
      // 否則舊機的框永遠是舊尺寸（v0.6.1 高度卡住事件）。
      // 自訂款（builtin:false，管理員 JSON 上傳的）絕對不覆蓋。
      await putFurniture({ ...f, builtin: true });
    } else if (!cur.gridSize || !cur.chatter) {
      await putFurniture({ ...cur, gridSize: cur.gridSize || f.gridSize, chatter: cur.chatter || f.chatter, footprint: cur.footprint || f.footprint });
    }
  }
  return getAllFurniture();
}

export async function applyPack(pack) {
  if (!pack || !Array.isArray(pack.furniture)) {
    throw new Error('內容包缺少 furniture 陣列');
  }
  for (const raw of pack.furniture) {
    const f = normalizeFurniture(raw);
    if (!f) continue;
    await putFurniture({ ...f, builtin: false });
  }
  await saveContentPack({
    version: pack.version || 'custom',
    furniture: pack.furniture,
  });
}

export async function resetToDefault() {
  const all = await getAllFurniture();
  for (const f of all) {
    if (!f.builtin) await deleteFurniture(f.id);
  }
  for (const f of DEFAULT_FURNITURE) {
    await putFurniture({ ...f, builtin: true });
  }
  await saveContentPack({ version: 'reset', furniture: [] });
}
