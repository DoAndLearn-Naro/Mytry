/**
 * 每日任務系統 — Life Garden (Phase 2)
 * ───────────────────────────────────
 * 任務分為兩類來源：
 *   - 內建 4 個（與 4 個插槽綁定）
 *   - 自訂任務（由內容包提供，可選擇性啟用）
 *
 * 每日抽題策略：
 *   1) 預設從 4 個插槽綁定的任務中，根據日期 hash 抽 1 個
 *   2) 內容包可附加更多任務
 */

export const BUILTIN_TASKS = [
  {
    id: 'photo-sky',
    type: 'life',
    icon: '☁️',
    title: '拍一張今天的天空',
    prompt: '走到窗邊，抬頭看看天空，幫它拍張照。',
    needsPhoto: true,
    water: 2,
    slotId: 'wall.frame-xl',
    rewardHint: '照片會自動放進牆上的大畫框 ✨',
  },
  {
    id: 'photo-plant',
    type: 'life',
    icon: '🌿',
    title: '去看看窗台的小植物',
    prompt: '去窗台看看你的植物，幫它拍張照。',
    needsPhoto: true,
    water: 2,
    slotId: 'window.sill',
    rewardHint: '植物會因為你的照顧長出新葉子',
  },
  {
    id: 'walk-around',
    type: 'movement',
    icon: '🚶',
    title: '在家裡走一圈',
    prompt: '慢慢繞家裡走 5 分鐘，再回來。',
    needsPhoto: false,
    water: 1,
    slotId: 'floor.rug',
    rewardHint: '地毯上會多一朵小花 🌼',
  },
  {
    id: 'stretch-arms',
    type: 'movement',
    icon: '🙆',
    title: '伸展手臂 1 分鐘',
    prompt: '把手舉高，慢慢往左右伸展各 10 秒。',
    needsPhoto: false,
    water: 1,
    slotId: 'corner.lamp',
    rewardHint: '立燈會變得更溫暖、更亮',
  },
];

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function pickDailyTask(date = new Date(), extraTasks = []) {
  const all = [...BUILTIN_TASKS, ...extraTasks];
  const key = todayKey(date);
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  const idx = seed % all.length;
  return all[idx];
}

export function findTaskTemplate(id, extraTasks = []) {
  return [...BUILTIN_TASKS, ...extraTasks].find((t) => t.id === id) || null;
}

export function getBuiltInTasksBySlot(slotId) {
  return BUILTIN_TASKS.filter((t) => t.slotId === slotId);
}

export function taskBySlot(slotId, extraTasks = []) {
  return findTaskTemplate(
    [...BUILTIN_TASKS, ...extraTasks].find((t) => t.slotId === slotId)?.id,
    extraTasks
  );
}