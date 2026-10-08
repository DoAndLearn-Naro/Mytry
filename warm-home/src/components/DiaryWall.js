import { moodEmoji, moodLabel } from './MoodModal.js';

/**
 * IG 式暖窩日記 — Warm Home v0.2
 * ────────────────────────────
 * 一個介面回顧全部紀錄：
 *   照片（九宮格）| 任務歷史 | 心情 | 成就 + 分享
 *
 * props:
 *   - polaroids: [{ photoUrl, caption, furnitureEmoji, createdAt }]
 *   - tasks: 最近任務紀錄
 *   - moods: 心情紀錄
 *   - interactions: 互動紀錄
 *   - stats: { streakDays, totalTasks, furnitureCount, interactionCount }
 *   - onClose(), onShareText()
 */

export function DiaryWall({ polaroids, tasks, moods, interactions, stats, onClose, onShareText }) {
  const root = document.createElement('div');
  root.className = 'memory diary';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');

  const overlay = document.createElement('div');
  overlay.className = 'memory__overlay';
  overlay.addEventListener('click', onClose);

  const panel = document.createElement('div');
  panel.className = 'memory__panel diary__panel';
  panel.innerHTML = `
    <button class="memory__close" aria-label="關閉">✕</button>
    <h3 class="memory__title">📖 我的暖窩日記</h3>
    <p class="memory__sub">${stats.totalTasks} 個任務 · ${polaroids.length} 張照片 · 連續 ${stats.streakDays} 天</p>
    <div class="diary__tabs" role="tablist">
      <button class="diary__tab is-active" data-tab="photos" type="button">📸 照片</button>
      <button class="diary__tab" data-tab="tasks" type="button">📋 任務</button>
      <button class="diary__tab" data-tab="moods" type="button">💛 心情</button>
      <button class="diary__tab" data-tab="prize" type="button">🏅 成就</button>
    </div>
    <div class="diary__body"></div>
    <div class="diary__foot">
      <button class="btn btn--ghost" data-act="share" type="button">📤 分享給家人</button>
    </div>
  `;

  const body = panel.querySelector('.diary__body');
  const tabs = [...panel.querySelectorAll('.diary__tab')];

  function renderTab(name) {
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
    if (name === 'photos') body.innerHTML = photosHTML(polaroids);
    if (name === 'tasks') body.innerHTML = tasksHTML(tasks);
    if (name === 'moods') body.innerHTML = moodsHTML(moods);
    if (name === 'prize') body.innerHTML = prizeHTML(stats, polaroids, interactions);
    bindPhotoViewer(body);
  }

  tabs.forEach((t) => t.addEventListener('click', () => renderTab(t.dataset.tab)));
  panel.querySelector('[data-act="share"]').addEventListener('click', () => onShareText && onShareText());

  root.appendChild(overlay);
  root.appendChild(panel);
  requestAnimationFrame(() => root.classList.add('is-open'));
  renderTab('photos');
  return root;
}

function photosHTML(polaroids) {
  if (!polaroids.length) return `<p class="memory__empty">還沒有照片。完成需要拍照的任務就會出現在這裡 📸</p>`;
  return `
    <div class="diary__grid">
      ${polaroids.map((p, i) => `
        <button class="diary__photo" data-idx="${i}" type="button" title="${escapeHtml(p.caption || '')}">
          <img src="${p.photoUrl}" alt="回憶照片" loading="lazy" />
          <span class="diary__photo-cap">${p.furnitureEmoji || '📸'}</span>
        </button>
      `).join('')}
    </div>
    <div class="diary__viewer" hidden></div>
  `;
}

function tasksHTML(tasks) {
  if (!tasks.length) return `<p class="memory__empty">還沒有任務紀錄。去完成今日任務吧！📋</p>`;
  return `
    <div class="diary__list">
      ${tasks.slice(0, 30).map((t) => `
        <div class="diary__row">
          <span class="diary__row-date">${formatDate(t.completedAt || t.createdAt)}</span>
          <span class="diary__row-body">${escapeHtml(t.templateId || '')} ${t.withPhoto ? '📸' : '✓'}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function moodsHTML(moods) {
  if (!moods.length) return `<p class="memory__empty">還沒有心情紀錄。完成任務時選一個心情吧 💛</p>`;
  return `
    <div class="diary__list">
      ${moods.slice(0, 30).map((m) => `
        <div class="diary__row">
          <span class="diary__row-date">${formatDate(m.createdAt)}</span>
          <span class="diary__row-body">${moodEmoji(m.mood)} ${moodLabel(m.mood)}${m.note ? ` · ${escapeHtml(m.note)}` : ''}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function prizeHTML(stats, polaroids, interactions) {
  const badges = [];
  if (stats.totalTasks >= 1) badges.push(['🌱', '第一次完成任務']);
  if (stats.totalTasks >= 10) badges.push(['🌷', '完成 10 個任務']);
  if (stats.streakDays >= 3) badges.push(['🔥', `連續 ${stats.streakDays} 天`]);
  if ((stats.furnitureCount || 0) >= 5) badges.push(['🪑', `收集 ${stats.furnitureCount} 件家具`]);
  if ((polaroids || []).length >= 5) badges.push(['📸', `拍了 ${(polaroids || []).length} 張照片`]);
  if ((interactions || []).length >= 10) badges.push(['💬', `互動 ${(interactions || []).length} 次`]);
  if (!badges.length) badges.push(['🌱', '完成第一個任務來解鎖']);
  return `
    <div class="diary__badges">
      ${badges.map(([e, t]) => `<div class="diary__badge"><span class="diary__badge-e">${e}</span><span>${t}</span></div>`).join('')}
    </div>
    <p class="memory__sub" style="margin-top:12px;">任務 ${stats.totalTasks} · 家具 ${stats.furnitureCount} · 互動 ${stats.interactionCount}</p>
  `;
}

function bindPhotoViewer(body) {
  const viewer = body.querySelector('.diary__viewer');
  if (!viewer) return;
  body.querySelectorAll('.diary__photo').forEach((btn) => {
    btn.addEventListener('click', () => {
      const img = btn.querySelector('img');
      viewer.hidden = false;
      viewer.innerHTML = `<img src="${img.src}" alt="放大照片" /><p class="memory__sub">點照片關閉</p>`;
      viewer.onclick = () => { viewer.hidden = true; viewer.innerHTML = ''; };
    });
  });
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
