/**
 * 任務彈窗 — Life Garden
 * ──────────────────────
 * props:
 *   - task: 任務模板
 *   - completed: 已完成的任務模板 id
 *   - onTakePhoto(): 觸發相機
 *   - onComplete(): 直接完成（無拍照任務）
 *   - onClose(): 關閉
 */

export function TaskModal({ task, completed, onTakePhoto, onComplete, onClose }) {
  const root = document.createElement('div');
  root.className = 'modal';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'task-title');

  const overlay = document.createElement('div');
  overlay.className = 'modal__overlay';
  overlay.addEventListener('click', onClose);

  const isDone = completed === task.id;

  root.innerHTML = `
    <button class="modal__close" type="button" aria-label="關閉">✕</button>
    <div class="modal__icon" aria-hidden="true">${task.icon}</div>
    <h2 id="task-title" class="modal__title">${task.title}</h2>
    <p class="modal__prompt">${task.prompt}</p>
    <div class="modal__actions">
      ${
        task.needsPhoto
          ? `<button class="btn btn--primary" data-act="photo">📸 拍照打卡</button>`
          : `<button class="btn btn--primary" data-act="complete">✅ 我完成了</button>`
      }
      <button class="btn btn--ghost" data-act="later">等一下</button>
    </div>
    ${isDone ? '<p class="modal__badge">今日此任務已完成 ✓</p>' : ''}
  `;

  root.prepend(overlay);

  root.querySelector('.modal__close').addEventListener('click', onClose);
  root.querySelector('[data-act="later"]').addEventListener('click', onClose);

  const photoBtn = root.querySelector('[data-act="photo"]');
  if (photoBtn) photoBtn.addEventListener('click', () => onTakePhoto && onTakePhoto());

  const completeBtn = root.querySelector('[data-act="complete"]');
  if (completeBtn)
    completeBtn.addEventListener('click', () => onComplete && onComplete());

  return root;
}