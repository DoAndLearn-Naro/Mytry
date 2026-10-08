/**
 * 等級＋經驗＋解鎖 — Warm Home v0.7（框架版）
 * ───────────────────────────────────────
 * 做任務/選心情/點事件 → 賺 XP → 升級 → 房間變大格＋解鎖新家具。
 * 數字都是草案（XP_RULES / LEVELS），之後調平衡只改這裡。
 *
 * 資料全放 meta（xp 累計、roomLevel），不動 DB schema。
 */

import { getMeta, setMeta } from './db.js';

/** 經驗草案（之後調平衡只改數字） */
export const XP_RULES = {
  TASK_DONE: 10,   // 完成一個任務
  PHOTO_BONUS: 5,  // 需要拍照的任務額外
  MOOD: 2,         // 選心情
  EVENT: 3,        // 點事件泡泡完成
  // TODO: 防刷（每日上限、點擊不給分等）之後再設計
};

/** 等級草案：xp ＝升到該級所需累計 */
export const LEVELS = [
  { level: 1, name: '小暖窩', xp: 0 },
  { level: 2, name: '大客廳', xp: 100 },
  { level: 3, name: '大宅', xp: 250 },
];

export const MAX_LEVEL = LEVELS[LEVELS.length - 1].level;

export function levelForXp(xp) {
  let cur = LEVELS[0];
  for (const lv of LEVELS) {
    if (xp >= lv.xp) cur = lv;
  }
  return cur;
}

export function nextLevelInfo(xp) {
  const cur = levelForXp(xp);
  const idx = LEVELS.findIndex((l) => l.level === cur.level);
  const next = LEVELS[idx + 1] || null;
  return { cur, next };
}

/** 家具是否已解鎖（unlockLevel 缺失視為 Lv1） */
export function isUnlocked(furniture, playerLevel) {
  return (furniture.unlockLevel || 1) <= playerLevel;
}

export async function getXp() {
  return (await getMeta('xp')) ?? 0;
}

export async function getRoomLevel() {
  return (await getMeta('roomLevel')) ?? 1;
}

/**
 * 加經驗，回傳 { xp, leveledUp, newLevel }。
 * 房間格線切換與搬家由 App 層處理（需要 placements＋render）。
 */
export async function addXp(amount) {
  const before = await getXp();
  const after = before + amount;
  await setMeta('xp', after);
  const beforeLv = levelForXp(before).level;
  const afterLv = levelForXp(after).level;
  if (afterLv > beforeLv) {
    await setMeta('roomLevel', afterLv);
    return { xp: after, leveledUp: true, newLevel: afterLv };
  }
  return { xp: after, leveledUp: false, newLevel: afterLv };
}
