import { Decoration } from './Decoration.js';

/**
 * Slot 元件 — Life Garden
 * ──────────────────────
 * 單純把 cfg + placement + decoration 組合成 DOM。
 * 視覺上的「彈出」由 CSS perspective + transform 處理。
 */

export const Slot = {
  renderHTML(cfg, placement, decorationMap, isTodayDone) {
    const dec = placement && placement.decorationId
      ? decorationMap[placement.decorationId]
      : null;
    const water = placement?.water || 0;
    return `
      <div class="slot
        ${dec ? 'slot--filled' : 'slot--empty'}
        ${isTodayDone ? 'slot--today-done' : ''}"
        style="--rot:${cfg.rotation}deg;">
        <div class="slot__shadow" aria-hidden="true"></div>
        <div class="slot__surface">
          ${dec
            ? Decoration.render(dec, water)
            : `<div class="slot__placeholder">
                <span class="slot__plus" aria-hidden="true">+</span>
                <span class="slot__hint">${cfg.hint}</span>
              </div>`
          }
        </div>
        ${dec ? `<div class="slot__water-pill" title="水分 ${water}">💧 ${water}</div>` : ''}
      </div>
    `;
  },
};