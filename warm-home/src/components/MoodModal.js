/**
 * 心情選擇 — Warm Home v0.2
 * 完成任務時多一步：選今天的心情（三顆大按鈕，長者好按）
 */

const MOODS = [
  { id: 'happy', emoji: '😊', label: '開心' },
  { id: 'ok', emoji: '😐', label: '普通' },
  { id: 'sad', emoji: '😟', label: '有點累' },
];

export function MoodModal({ onPick, onSkip }) {
  const root = document.createElement('div');
  root.className = 'task-modal';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');

  root.innerHTML = `
    <div class="task-modal__furniture">💛</div>
    <h2 class="task-modal__title">今天心情怎麼樣？</h2>
    <p class="task-modal__prompt">選一個，會記到日記裡</p>
    <div class="mood__row">
      ${MOODS.map((m) => `
        <button class="mood__btn" data-mood="${m.id}" type="button">
          <span class="mood__emoji">${m.emoji}</span>
          <span class="mood__label">${m.label}</span>
        </button>
      `).join('')}
    </div>
    <div class="task-modal__actions" style="margin-top:14px;">
      <button class="btn btn--ghost" data-act="skip" type="button">跳過</button>
    </div>
  `;

  root.querySelectorAll('.mood__btn').forEach((btn) => {
    btn.addEventListener('click', () => onPick && onPick(btn.dataset.mood));
  });
  root.querySelector('[data-act="skip"]').addEventListener('click', () => onSkip && onSkip());
  return root;
}

export function moodEmoji(id) {
  const m = MOODS.find((x) => x.id === id);
  return m ? m.emoji : '😊';
}

export function moodLabel(id) {
  const m = MOODS.find((x) => x.id === id);
  return m ? m.label : '';
}
