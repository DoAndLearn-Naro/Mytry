/**
 * 任務產生器 — Warm Home
 * ──────────────────────
 * 每日從「已擺放的家具」中抽 3 個任務（每個家具 1 個）。
 * 用日期 hash 確保同日穩定。
 */

export function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hashDate(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * 給定已擺放的家具 + 日期 → 產出今日 3 個任務。
 * 每個任務 = { placementId, furnitureId, taskTemplateId, ...template }
 */
export function pickDailyTasks(placements, furnitureCatalog, date = new Date(), count = 3) {
  if (!placements.length) return [];
  const key = todayKey(date);
  const seed = hashDate(key);
  const pool = [];
  for (const p of placements) {
    const f = furnitureCatalog.find((it) => it.id === p.furnitureId);
    if (!f || !f.tasks || !f.tasks.length) continue;
    for (const t of f.tasks) {
      pool.push({
        placementId: p.id,
        furnitureId: f.id,
        furnitureLabel: f.label,
        furnitureEmoji: f.emoji,
        ...t,
      });
    }
  }
  if (!pool.length) return [];
  const out = [];
  const usedPlacements = new Set();
  let i = 0;
  while (out.length < count && i < pool.length * 4) {
    const pickIdx = (seed + i * 17 + out.length * 53) % pool.length;
    const item = pool[pickIdx];
    if (!usedPlacements.has(item.placementId)) {
      out.push(item);
      usedPlacements.add(item.placementId);
    }
    i++;
  }
  return out;
}

/**
 * 已完成的模板 ID（避免重複發同樣的）
 */
export async function getCompletedTemplateIds(dateKey) {
  const { getTasksByDate } = await import('./db.js');
  const list = await getTasksByDate(dateKey);
  return new Set(list.filter((t) => t.completed).map((t) => t.templateId));
}