/**
 * 發光燈泡元件 — Life Garden
 * ──────────────────────────
 * props:
 *   - status: 'available' | 'completed' | 'locked'
 *   - onClick(): void
 */

export function Lightbulb({ status = 'available', onClick }) {
  const wrap = document.createElement('button');
  wrap.className = `lightbulb lightbulb--${status}`;
  wrap.type = 'button';
  wrap.setAttribute('aria-label', '今日任務燈泡');
  wrap.innerHTML = `
    <span class="lightbulb__bulb" aria-hidden="true">💡</span>
    <span class="lightbulb__halo" aria-hidden="true"></span>
    <span class="lightbulb__caption">${status === 'completed' ? '今日已完成' : '今日任務'}</span>
  `;
  wrap.addEventListener('click', () => {
    if (status !== 'available') return;
    onClick && onClick();
  });
  return wrap;
}