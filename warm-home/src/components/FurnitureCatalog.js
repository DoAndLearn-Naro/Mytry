/**
 * 家具抽屜（含倉庫） — Warm Home v0.5
 * ────────────────────────────────
 * 3D 手繪小圖＋名牌，不再用 emoji 選家具。
 */

import { furnitureArt } from '../modules/furnitureArt.js';
import { isUnlocked } from '../modules/levels.js';

export function FurnitureCatalog({ furnitureCatalog, furnitureMap, warehouse = [], playerLevel = 1, onPick, onTakeOut, onClose }) {
  const root = document.createElement('div');
  root.className = 'catalog';

  const overlay = document.createElement('div');
  overlay.className = 'catalog__overlay';
  overlay.addEventListener('click', onClose);

  const panel = document.createElement('div');
  panel.className = 'catalog__panel';

  const floor = furnitureCatalog.filter((f) => f.placement === 'floor');
  const wall = furnitureCatalog.filter((f) => f.placement === 'wall');
  const map = furnitureMap || Object.fromEntries(furnitureCatalog.map((f) => [f.id, f]));

  panel.innerHTML = `
    <div class="catalog__handle" aria-hidden="true"></div>
    <h3 class="catalog__title">家具倉庫＋型錄</h3>
    <p class="catalog__sub">收回的家具會進倉庫，不會不見；點一下放回房間</p>

    <details class="catalog__group" open>
      <summary>📦 倉庫暫存（${warehouse.length}）</summary>
      <div class="catalog__grid">
        ${warehouse.length ? warehouse.map((w) => {
          const f = map[w.furnitureId];
          if (!f) return '';
          return `
            <button class="catalog__item catalog__item--stored" data-wid="${w.id}" type="button">
              <span class="catalog__art" aria-hidden="true">${furnitureArt(f.id)}</span>
              <span class="catalog__label">${f.label}</span>
              <span class="catalog__label" style="opacity:0.6;font-weight:400;">取出擺放</span>
            </button>
          `;
        }).join('') : '<p class="catalog__sub" style="padding:4px 8px;">倉庫空空的。收回家具會暫存在這裡。</p>'}
      </div>
    </details>

    <details class="catalog__group" open>
      <summary>🪑 地板家具（${floor.length}）</summary>
      <div class="catalog__grid">
        ${floor.map((f) => itemHTML(f, playerLevel)).join('')}
      </div>
    </details>

    <details class="catalog__group">
      <summary>🖼️ 牆面家具（${wall.length}）</summary>
      <div class="catalog__grid">
        ${wall.map((f) => itemHTML(f, playerLevel)).join('')}
      </div>
    </details>

    <div class="catalog__actions">
      <button class="btn btn--ghost" data-act="close">關閉</button>
    </div>
  `;

  panel.querySelectorAll('.catalog__item[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      onPick(btn.dataset.id);
    });
  });
  panel.querySelectorAll('.catalog__item[data-wid]').forEach((btn) => {
    btn.addEventListener('click', () => {
      onTakeOut && onTakeOut(Number(btn.dataset.wid));
    });
  });
  panel.querySelector('[data-act="close"]').addEventListener('click', onClose);

  root.appendChild(overlay);
  root.appendChild(panel);
  requestAnimationFrame(() => root.classList.add('is-open'));
  return root;
}

function itemHTML(f, playerLevel = 1) {
  const gs = f.gridSize ? `${f.gridSize.w}×${f.gridSize.h}格` : '';
  const locked = !isUnlocked(f, playerLevel);
  return `
    <button class="catalog__item ${locked ? 'is-locked' : ''}" data-id="${f.id}" type="button">
      <span class="catalog__art" aria-hidden="true">${furnitureArt(f.id)}</span>
      <span class="catalog__label">${locked ? `🔒Lv${f.unlockLevel}` : f.label}</span>
      ${gs && !locked ? `<span class="catalog__label" style="opacity:0.6;font-weight:400;">${gs}</span>` : ''}
    </button>
  `;
}
