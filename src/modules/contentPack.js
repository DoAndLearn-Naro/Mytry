/**
 * 內容包（Content Pack）管理 — Life Garden
 * ──────────────────────────────────────
 * 啟動時若 DB 內無 active pack，會載入 `DEFAULT_PACK`；
 * 透過 AdminPanel 上傳新 JSON，會 merge 到現有 pack。
 */

import {
  saveContentPack,
  getContentPack,
  putDecoration,
  deleteDecoration,
  getAllDecorations,
} from './db.js';

export const DEFAULT_PACK = {
  version: '0.2.0',
  decorations: [
    {
      id: 'frame-empty',
      label: '空畫框',
      emoji: '🖼️',
      category: 'frame',
      fitsSlots: ['wall.frame-xl'],
      unlockAfter: 0,
      builtin: true,
    },
    {
      id: 'plant-succulent',
      label: '多肉植物',
      emoji: '🌵',
      category: 'plant',
      fitsSlots: ['window.sill'],
      unlockAfter: 0,
      builtin: true,
    },
    {
      id: 'plant-monstera',
      label: '龜背芋',
      emoji: '🪴',
      category: 'plant',
      fitsSlots: ['window.sill'],
      unlockAfter: 2,
      builtin: true,
    },
    {
      id: 'plant-flower',
      label: '開花的盆栽',
      emoji: '🌸',
      category: 'plant',
      fitsSlots: ['window.sill'],
      unlockAfter: 5,
      builtin: true,
    },
    {
      id: 'lamp-classic',
      label: '復古立燈',
      emoji: '🪔',
      category: 'lamp',
      fitsSlots: ['corner.lamp'],
      unlockAfter: 0,
      builtin: true,
    },
    {
      id: 'lamp-modern',
      label: '現代立燈',
      emoji: '💡',
      category: 'lamp',
      fitsSlots: ['corner.lamp'],
      unlockAfter: 3,
      builtin: true,
    },
    {
      id: 'rug-stripe',
      label: '條紋地毯',
      emoji: '🟫',
      category: 'rug',
      fitsSlots: ['floor.rug'],
      unlockAfter: 0,
      builtin: true,
    },
    {
      id: 'rug-flower',
      label: '花紋地毯',
      emoji: '🌺',
      category: 'rug',
      fitsSlots: ['floor.rug'],
      unlockAfter: 4,
      builtin: true,
    },
  ],
};

export async function ensureDefaultPack() {
  const pack = await getContentPack();
  if (pack) return pack;
  await applyPack(DEFAULT_PACK);
  return await getContentPack();
}

export async function applyPack(pack) {
  if (!pack || typeof pack !== 'object') {
    throw new Error('內容包格式不正確');
  }
  if (!Array.isArray(pack.decorations)) {
    throw new Error('內容包缺少 decorations 陣列');
  }
  for (const dec of pack.decorations) {
    if (!dec.id) throw new Error('裝飾缺少 id');
    await putDecoration({
      category: 'misc',
      emoji: '✨',
      fitsSlots: [],
      unlockAfter: 0,
      builtin: false,
      ...dec,
    });
  }
  await saveContentPack({
    version: pack.version || 'custom',
    decorations: pack.decorations,
    slots: pack.slots || [],
    tasks: pack.tasks || [],
  });
}

export async function mergePack(pack) {
  if (!pack || !Array.isArray(pack.decorations)) {
    throw new Error('內容包格式不正確');
  }
  for (const dec of pack.decorations) {
    if (!dec.id) continue;
    await putDecoration({
      category: 'misc',
      emoji: '✨',
      fitsSlots: [],
      unlockAfter: 0,
      builtin: false,
      ...dec,
    });
  }
  const current = (await getContentPack()) || { decorations: [] };
  await saveContentPack({
    version: pack.version || 'merged',
    decorations: mergeArraysById(current.decorations, pack.decorations),
    slots: mergeArraysById(current.slots || [], pack.slots || []),
    tasks: mergeArraysById(current.tasks || [], pack.tasks || []),
  });
}

function mergeArraysById(a = [], b = []) {
  const map = new Map();
  for (const item of a) map.set(item.id, item);
  for (const item of b) map.set(item.id, item);
  return [...map.values()];
}

export async function resetToDefault() {
  const all = await getAllDecorations();
  for (const dec of all) {
    if (!dec.builtin) await deleteDecoration(dec.id);
  }
  for (const dec of DEFAULT_PACK.decorations) {
    await putDecoration(dec);
  }
  await saveContentPack({
    version: DEFAULT_PACK.version,
    decorations: DEFAULT_PACK.decorations,
    slots: [],
    tasks: [],
  });
}

export function isUnlocked(decoration, totalCompleted = 0) {
  return (decoration.unlockAfter || 0) <= totalCompleted;
}