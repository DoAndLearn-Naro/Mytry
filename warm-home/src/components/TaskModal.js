/**
 * 任務彈窗 — Warm Home
 * ───────────────────
 * 顯示任務說明，呼叫相機拍照後完成。
 *
 * props:
 *   - task
 *   - furniture
 *   - onTakePhoto()
 *   - onComplete()
 *   - onClose()
 */

export function TaskModal({ task, furniture, onTakePhoto, onComplete, onClose }) {
  const root = document.createElement('div');
  root.className = 'task-modal';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');

  const overlay = document.createElement('div');
  overlay.className = 'task-modal__overlay';
  overlay.addEventListener('click', onClose);

  root.innerHTML = `
    <button class="task-modal__close" type="button" aria-label="關閉">✕</button>
    <div class="task-modal__furniture">${task.furnitureEmoji}</div>
    <h2 class="task-modal__title">${task.title}</h2>
    <p class="task-modal__prompt">${task.prompt}</p>
    <p class="task-modal__meta">來自 <strong>${furniture ? furniture.label : task.furnitureLabel}</strong></p>
    <div class="task-modal__actions">
      ${
        task.needsPhoto
          ? `<button class="btn btn--primary" data-act="photo">📸 拍照打卡</button>`
          : `<button class="btn btn--primary" data-act="complete">✅ 我完成了</button>`
      }
      <button class="btn btn--ghost" data-act="later">等一下</button>
    </div>
  `;

  root.prepend(overlay);
  root.querySelector('.task-modal__close').addEventListener('click', onClose);
  root.querySelector('[data-act="later"]').addEventListener('click', onClose);

  const photoBtn = root.querySelector('[data-act="photo"]');
  if (photoBtn) photoBtn.addEventListener('click', () => onTakePhoto && onTakePhoto());

  const completeBtn = root.querySelector('[data-act="complete"]');
  if (completeBtn) completeBtn.addEventListener('click', () => onComplete && onComplete());

  return root;
}