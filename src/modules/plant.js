/**
 * 植物/裝飾 階段計算 — Life Garden (Phase 2)
 * ────────────────────────────────────────
 * 在 Phase 2，植物不再只有一株，而是各插槽獨立計算。
 * 此檔提供共用工具：根據「澆水次數 water」回傳階段資訊。
 *
 * 每個類別（plant / lamp / rug / frame）有自己的階段表。
 */

export const PLANT_STAGES = [
  { min: 0, emoji: '🌱', label: '剛種下' },
  { min: 2, emoji: '🌿', label: '冒出小葉' },
  { min: 5, emoji: '🪴', label: '長得茂盛' },
  { min: 9, emoji: '🌸', label: '開出花來' },
];

export const LAMP_STAGES = [
  { min: 0, glow: 0.3, label: '暗暗的' },
  { min: 2, glow: 0.55, label: '微微亮' },
  { min: 5, glow: 0.8, label: '溫暖的光' },
  { min: 9, glow: 1.0, label: '明亮的燈火' },
];

export const RUG_STAGES = [
  { min: 0, flowers: 0, label: '乾乾淨淨' },
  { min: 2, flowers: 2, label: '有 2 朵花' },
  { min: 5, flowers: 4, label: '有 4 朵花' },
  { min: 9, flowers: 6, label: '花團錦簇' },
];

export const FRAME_STAGES = [
  { min: 0, label: '空畫框', photos: 0 },
  { min: 1, label: '有 1 張照片', photos: 1 },
  { min: 3, label: '有 3 張照片', photos: 3 },
  { min: 6, label: '回憶滿滿', photos: 6 },
];

export function stageFor(stages, waterValue) {
  let current = stages[0];
  for (const s of stages) if (waterValue >= s.min) current = s;
  return current;
}

export function nextStageInfo(stages, waterValue) {
  const sorted = [...stages].sort((a, b) => a.min - b.min);
  for (const s of sorted) {
    if (waterValue < s.min) return { ...s, remaining: s.min - waterValue };
  }
  return null;
}