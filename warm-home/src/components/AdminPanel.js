import { applyPack, resetToDefault } from '../modules/contentPack.js';
import { getContentPack } from '../modules/db.js';

/**
 * 隱藏管理員面板 — Warm Home
 * ────────────────────────
 * 觸發：主畫面標題「暖窩」連點 5 次。
 * 功能：拖放 content-pack.json → 自動合併進家具型錄。
 */

export function AdminPanel({ currentPackVersion, furnitureCount, onClose, onUpdated }) {
  const root = document.createElement('div');
  root.className = 'admin';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');

  const overlay = document.createElement('div');
  overlay.className = 'admin__overlay';
  overlay.addEventListener('click', onClose);

  const panel = document.createElement('div');
  panel.className = 'admin__panel';
  panel.innerHTML = `
    <h3 class="admin__title">🔧 管理員面板</h3>
    <p class="admin__sub">拖放新的「內容包」JSON，新增家具或任務。</p>

    <div class="admin__current">
      <div><strong>目前版本：</strong> <code>${currentPackVersion || '—'}</code></div>
      <div><strong>家具數量：</strong> ${furnitureCount}</div>
    </div>

    <label class="admin__drop" id="dropzone">
      <input type="file" accept="application/json,.json" id="file-input" hidden />
      <div class="admin__drop-icon">📥</div>
      <div class="admin__drop-text">拖放 .json 檔到此，或點擊選擇</div>
      <div class="admin__drop-hint">會與現有內容合併（同名家具 ID 覆蓋）</div>
    </label>

    <pre class="admin__log" id="log" aria-live="polite">就緒</pre>

    <div class="admin__actions">
      <button class="btn btn--ghost" data-act="reset">重置為預設</button>
      <button class="btn btn--primary" data-act="close">關閉</button>
    </div>
  `;

  const dropzone = panel.querySelector('#dropzone');
  const fileInput = panel.querySelector('#file-input');
  const log = panel.querySelector('#log');

  dropzone.addEventListener('click', () => fileInput.click());
  ['dragenter', 'dragover'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('is-hot');
    })
  );
  ['dragleave', 'drop'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-hot');
    })
  );
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.[0]) handleFile(fileInput.files[0]);
  });

  async function handleFile(file) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await applyPack(json);
      log.textContent = `✅ 已合併 ${file.name}（${json.furniture?.length || 0} 個家具）`;
      onUpdated && onUpdated();
    } catch (err) {
      log.textContent = `❌ 解析失敗：${err.message}`;
    }
  }

  panel.querySelector('[data-act="reset"]').addEventListener('click', async () => {
    if (!confirm('確定要重置回預設家具？自訂家具會被清除。')) return;
    await resetToDefault();
    log.textContent = '已重置為預設家具';
    onUpdated && onUpdated();
  });

  panel.querySelector('[data-act="close"]').addEventListener('click', onClose);

  root.appendChild(overlay);
  root.appendChild(panel);
  requestAnimationFrame(() => root.classList.add('is-open'));
  return root;
}