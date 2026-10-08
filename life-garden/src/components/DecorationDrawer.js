/**
 * 裝飾抽屜 — Life Garden
 * ──────────────────────
 * 從場景中點選空插槽 → 抽屜從底部滑出
 * 顯示所有「已解鎖」且 `fitsSlots` 包含此 slot 的裝飾
 *
 * props:
 *   - slotId
 *   - decorations: 全部裝飾
 *   - unlockedIds: 已解鎖的裝飾 id 集合
 *   - currentDecorationId: 目前插槽上的裝飾（高亮）
 *   - totalCompleted: 已完成任務總數
 *   - onPick(decorationId) -> void
 *   - onClear() -> void
 *   - onClose() -> void
 */

export function DecorationDrawer({
  slotId,
  decorations,
  unlockedIds,
  currentDecorationId,
  totalCompleted,
  onPick,
  onClear,
  onClose,
}) {
  const root = document.createElement('div');
  root.className = 'drawer';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', '選擇裝飾');

  const overlay = document.createElement('div');
  overlay.className = 'drawer__overlay';
  overlay.addEventListener('click', onClose);

  const panel = document.createElement('div');
  panel.className = 'drawer__panel';
  panel.innerHTML = `
    <div class="drawer__handle" aria-hidden="true"></div>
    <h3 class="drawer__title">挑一個裝飾放進去</h3>
    <p class="drawer__sub">已完成任務：<strong>${totalCompleted}</strong> 次 · 解鎖越多能放的越多</p>
    <div class="drawer__grid">
      ${decorations
        .map((d) => {
          const fits = fitsSlot(d, slotId);
          const unlocked = unlockedIds.has(d.id);
          const usable = fits && unlocked;
          const active = currentDecorationId === d.id;
          return `
            <button class="drawer__item ${active ? 'is-active' : ''} ${usable ? '' : 'is-locked'}"
                    data-id="${d.id}" ${usable || active ? '' : 'disabled'}>
              <span class="drawer__emoji" aria-hidden="true">${d.emoji || '✨'}</span>
              <span class="drawer__name">${d.label}</span>
              <span class="drawer__status">
                ${active ? '已選' : usable ? '可放' : fits ? `再完成 ${(d.unlockAfter || 0) - totalCompleted} 次` : '不合'}
              </span>
            </button>
          `;
        })
        .join('')}
    </div>
    <div class="drawer__actions">
      ${currentDecorationId ? `<button class="btn btn--ghost" data-act="clear">🗑️ 收回</button>` : ''}
      <button class="btn btn--primary" data-act="close">完成</button>
    </div>
  `;

  panel.querySelectorAll('.drawer__item').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      onPick && onPick(btn.dataset.id);
    });
  });

  const clearBtn = panel.querySelector('[data-act="clear"]');
  if (clearBtn) clearBtn.addEventListener('click', onClear);
  panel.querySelector('[data-act="close"]').addEventListener('click', onClose);

  root.appendChild(overlay);
  root.appendChild(panel);
  requestAnimationFrame(() => root.classList.add('is-open'));

  return root;
}

function fitsSlot(dec, slotId) {
  return Array.isArray(dec.fitsSlots) && dec.fitsSlots.includes(slotId);
}