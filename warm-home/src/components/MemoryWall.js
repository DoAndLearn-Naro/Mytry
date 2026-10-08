/**
 * 拍立得回憶牆 — Warm Home
 * ────────────────────────
 * 顯示所有完成的任務照片（拍立得風格卡片陣列）。
 *
 * props:
 *   - polaroids: [{ id, photoUrl, caption, furnitureEmoji, createdAt }]
 *   - onClose()
 */

export function MemoryWall({ polaroids, onClose }) {
  const root = document.createElement('div');
  root.className = 'memory';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');

  const overlay = document.createElement('div');
  overlay.addEventListener('click', onClose);
  overlay.className = 'memory__overlay';

  const panel = document.createElement('div');
  panel.className = 'memory__panel';
  panel.innerHTML = `
    <button class="memory__close" aria-label="關閉">✕</button>
    <h3 class="memory__title">回憶拍立得牆</h3>
    <p class="memory__sub">${polaroids.length} 張 · 每張都是完成任務留下的</p>
    ${
      polaroids.length
        ? `<div class="memory__grid">
            ${polaroids.map((p, i) => `
              <div class="polaroid" style="--rot:${(i % 2 === 0 ? -1 : 1) * (1 + (i % 3))}deg;">
                <div class="polaroid__photo"><img src="${p.photoUrl}" alt="回憶" /></div>
                <div class="polaroid__caption">${p.furnitureEmoji} ${p.caption || ''}</div>
                <div class="polaroid__date">${formatDate(p.createdAt)}</div>
              </div>
            `).join('')}
          </div>`
        : `<p class="memory__empty">還沒有拍立得。完成第一個任務就會出現在這裡 📸</p>`
    }
  `;

  panel.querySelector('.memory__close').addEventListener('click', onClose);
  root.appendChild(overlay);
  root.appendChild(panel);
  requestAnimationFrame(() => root.classList.add('is-open'));
  return root;
}

function formatDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}