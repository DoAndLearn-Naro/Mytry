/**
 * 內容包管理 — Warm Home
 * ────────────────────
 * 內容包 = JSON，內含新家具（id, label, emoji, tasks[]）。
 * 透過 AdminPanel 拖放上傳，自動寫入 furniture store。
 */

import {
  putFurniture,
  getAllFurniture,
  deleteFurniture,
  getContentPack,
  saveContentPack,
} from './db.js';
import { DEFAULT_FURNITURE } from './furniture.js';

export async function ensureDefaultFurniture() {
  const all = await getAllFurniture();
  if (all.length) return all;
  for (const f of DEFAULT_FURNITURE) {
    await putFurniture({ ...f, builtin: true });
  }
  return getAllFurniture();
}

export async function applyPack(pack) {
  if (!pack || !Array.isArray(pack.furniture)) {
    throw new Error('內容包缺少 furniture 陣列');
  }
  for (const f of pack.furniture) {
    if (!f.id) continue;
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