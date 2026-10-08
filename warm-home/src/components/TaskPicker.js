/**
 * 每日任務卡組 — Warm Home
 * ───────────────────────
 * 顯示今天抽出的 3 個任務（從已擺放的家具而來）。
 *
 * props:
 *   - tasks: [{ placementId, furnitureEmoji, furnitureLabel, title, icon, needsPhoto, ... }]
 *   - completedTemplateIds: Set<string>
 *   - onPick(task)
 *   - onClose()
 */

export function TaskPicker({ tasks, completedTemplateIds, onPick, onClose }) {
  const root = document.createElement('div');
  root.className = 'picker';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');

  const overlay = document.createElement('div');
  overlay.className = 'picker__overlay';
  overlay.addEventListener('click', onClose);

  const panel = document.createElement('div');
  panel.className = 'picker__panel';

  if (tasks.length === 0) {
    panel.innerHTML = `
      <div class="picker__empty">
        <div style="font-size:64px;">🪑</div>
        <h3 class="picker__title">房間還空著</h3>
        <p class="picker__sub">從右下角「+ 加家具」拖一些進來，明天就會有 3 個小任務陪你度過一天。</p>
        <button class="btn btn--primary" data-act="close">知道了</button>
      </div>
    `;
  } else {
    panel.innerHTML = `
      <h3 class="picker__title">今天 3 個小任務</h3>
      <p class="picker__sub">挑一個開始，每個完成都會留一張回憶拍立得</p>
      <div class="picker__list">
        ${tasks.map((t) => {
          const done = completedTemplateIds.has(t.id);
          return `
            <button class="picker__card ${done ? 'is-done' : ''}" data-id="${t.id}" ${done ? 'disabled' : ''}>
              <div class="picker__card-furniture">
                <span class="picker__emoji">${t.furnitureEmoji}</span>
                <span class="picker__furniture-label">${t.furnitureLabel}</span>
              </div>
              <div class="picker__card-body">
                <span class="picker__card-icon">${t.icon}</span>
                <span class="picker__card-title">${t.title}</span>
              </div>
              ${done ? '<div class="picker__card-done">✓ 已完成</div>' : ''}
              ${t.needsPhoto ? '<div class="picker__card-badge">需要拍照</div>' : ''}
            </button>
          `;
        }).join('')}
      </div>
      <div class="picker__actions">
        <button class="btn btn--ghost" data-act="close">稍後</button>
      </div>
    `;
  }

  panel.querySelectorAll('.picker__card').forEach((card) => {
    card.addEventListener('click', () => {
      if (card.disabled) return;
      const task = tasks.find((t) => t.id === card.dataset.id);
      if (task) onPick(task);
    });
  });
  panel.querySelector('[data-act="close"]')?.addEventListener('click', onClose);

  root.appendChild(overlay);
  root.appendChild(panel);
  requestAnimationFrame(() => root.classList.add('is-open'));
  return root;
}