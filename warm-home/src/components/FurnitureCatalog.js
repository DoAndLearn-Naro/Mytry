/**
 * 家具抽屜 — Warm Home
 * ────────────────────
 * 從底部滑出的家具清單，分類顯示：
 *   - 地板型（床、沙發、書桌、植物…）
 *   - 牆面型（畫框、時鐘、窗戶…）
 *
 * props:
 *   - furnitureCatalog: 所有家具
 *   - onPick(furnitureId): 點選家具
 *   - onClose()
 */

export function FurnitureCatalog({ furnitureCatalog, onPick, onClose }) {
  const root = document.createElement('div');
  root.className = 'catalog';

  const overlay = document.createElement('div');
  overlay.className = 'catalog__overlay';
  overlay.addEventListener('click', onClose);

  const panel = document.createElement('div');
  panel.className = 'catalog__panel';

  const floor = furnitureCatalog.filter((f) => f.placement === 'floor');
  const wall = furnitureCatalog.filter((f) => f.placement === 'wall');

  panel.innerHTML = `
    <div class="catalog__handle" aria-hidden="true"></div>
    <h3 class="catalog__title">拖一件家具進去</h3>
    <p class="catalog__sub">點一下就會放到房間裡，之後可以再移動</p>

    <details class="catalog__group" open>
      <summary>🪑 地板家具（${floor.length}）</summary>
      <div class="catalog__grid">
        ${floor.map((f) => itemHTML(f)).join('')}
      </div>
    </details>

    <details class="catalog__group">
      <summary>🖼️ 牆面家具（${wall.length}）</summary>
      <div class="catalog__grid">
        ${wall.map((f) => itemHTML(f)).join('')}
      </div>
    </details>

    <div class="catalog__actions">
      <button class="btn btn--ghost" data-act="close">關閉</button>
    </div>
  `;

  panel.querySelectorAll('.catalog__item').forEach((btn) => {
    btn.addEventListener('click', () => {
      onPick(btn.dataset.id);
    });
  });
  panel.querySelector('[data-act="close"]').addEventListener('click', onClose);

  root.appendChild(overlay);
  root.appendChild(panel);
  requestAnimationFrame(() => root.classList.add('is-open'));
  return root;
}

function itemHTML(f) {
  return `
    <button class="catalog__item" data-id="${f.id}" type="button">
      <span class="catalog__emoji" aria-hidden="true">${f.emoji}</span>
      <span class="catalog__label">${f.label}</span>
    </button>
  `;
}