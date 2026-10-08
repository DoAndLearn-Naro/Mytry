/**
 * 裝飾渲染器 — Life Garden
 * ──────────────────────
 * 根據 `category` 選擇渲染方式：
 *   - frame   畫框：emoji / image + 內容（預留照片）
 *   - plant   植物：emoji + 水分階段
 *   - lamp    立燈：emoji + 亮度（依水分）
 *   - rug     地毯：依水分顯示裝飾花朵
 */

export const Decoration = {
  render(dec, water = 0) {
    const cat = dec.category || 'misc';
    if (cat === 'frame')   return frameHTML(dec, water);
    if (cat === 'plant')   return plantHTML(dec, water);
    if (cat === 'lamp')    return lampHTML(dec, water);
    if (cat === 'rug')     return rugHTML(dec, water);
    return miscHTML(dec, water);
  },
};

function frameHTML(dec, water) {
  const filled = filledBadge(water);
  return `
    <div class="deco deco--frame">
      <div class="deco__emoji" aria-hidden="true">${dec.emoji || '🖼️'}</div>
      <div class="deco__label">${dec.label}</div>
      ${filled}
    </div>
  `;
}

function plantHTML(dec, water) {
  const stage = plantStageFor(water);
  return `
    <div class="deco deco--plant" style="--pot:#8B5A3C;">
      <div class="deco__emoji deco__emoji--xl" aria-hidden="true">${stage.emoji}</div>
      <div class="deco__pot" aria-hidden="true"></div>
      <div class="deco__label">${dec.label}</div>
      <div class="deco__stage">${stage.label}</div>
    </div>
  `;
}

function lampHTML(dec, water) {
  const glow = Math.min(1, 0.3 + water * 0.15);
  return `
    <div class="deco deco--lamp" style="--glow:${glow};">
      <div class="deco__lamp-shade" aria-hidden="true"></div>
      <div class="deco__lamp-pole" aria-hidden="true"></div>
      <div class="deco__lamp-base" aria-hidden="true"></div>
      <div class="deco__label">${dec.label}</div>
      <div class="deco__halo" aria-hidden="true"></div>
    </div>
  `;
}

function rugHTML(dec, water) {
  const flowers = Math.min(6, water);
  return `
    <div class="deco deco--rug">
      <div class="deco__rug-base" aria-hidden="true"></div>
      <div class="deco__rug-flowers" aria-hidden="true">
        ${'🌼'.repeat(Math.max(0, flowers))}
      </div>
    </div>
  `;
}

function miscHTML(dec) {
  return `<div class="deco"><div class="deco__emoji">${dec.emoji || '✨'}</div><div class="deco__label">${dec.label}</div></div>`;
}

function filledBadge(water) {
  if (water <= 0) return '<div class="deco__filled-empty">空空的畫框</div>';
  if (water < 3)  return '<div class="deco__filled-few">有 ' + water + ' 張回憶照片</div>';
  return '<div class="deco__filled-full">滿滿的回憶照片</div>';
}

const PLANT_STAGES = [
  { min: 0, emoji: '🌱', label: '剛種下' },
  { min: 2, emoji: '🌿', label: '冒出小葉' },
  { min: 5, emoji: '🪴', label: '長得茂盛' },
  { min: 9, emoji: '🌸', label: '開出花來' },
];

function plantStageFor(water) {
  let cur = PLANT_STAGES[0];
  for (const s of PLANT_STAGES) if (water >= s.min) cur = s;
  return cur;
}