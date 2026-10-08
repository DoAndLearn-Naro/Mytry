import { mergePack, resetToDefault } from '../modules/contentPack.js';

/**
 * 隱藏管理員面板 — Life Garden
 * ──────────────────────────
 * 觸發：在主畫面標題「每日小花園」連點 5 次。
 * 功能：
 *   1) 拖放 / 選擇 .json 內容包 → merge
 *   2) 預覽目前 active pack 的版本、裝飾數
 *   3) 重置回預設內容包
 *
 * props:
 *   - currentPackVersion
 *   - decorationCount
 *   - onClose()
 *   - onUpdated()
 */

export function AdminPanel({ currentPackVersion, decorationCount, onClose, onUpdated }) {
  const root = document.createElement('div');
  root.className = 'admin';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', '管理員面板');

  const overlay = document.createElement('div');
  overlay.className = 'admin__overlay';
  overlay.addEventListener('click', onClose);

  const panel = document.createElement('div');
  panel.className = 'admin__panel';
  panel.innerHTML = `
    <h3 class="admin__title">🔧 管理員面板</h3>
    <p class="admin__sub">上傳新的「內容包」JSON，新增裝飾或調整任務。</p>

    <div class="admin__current">
      <div><strong>目前版本：</strong> <code>${currentPackVersion || '—'}</code></div>
      <div><strong>裝飾數量：</strong> ${decorationCount}</div>
    </div>

    <label class="admin__drop" id="dropzone">
      <input type="file" accept="application/json,.json" id="file-input" hidden />
      <div class="admin__drop-icon">📥</div>
      <div class="admin__drop-text">拖放 .json 檔到此，或點擊選擇</div>
      <div class="admin__drop-hint">會與現有內容合併（同名裝飾 ID 覆蓋）</div>
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
      await mergePack(json);
      log.textContent = `✅ 已合併 ${file.name}（${json.decorations?.length || 0} 個裝飾）`;
      onUpdated && onUpdated();
    } catch (err) {
      log.textContent = `❌ 解析失敗：${err.message}`;
    }
  }

  panel.querySelector('[data-act="reset"]').addEventListener('click', async () => {
    if (!confirm('確定要重置回預設內容包？自訂裝飾會被清除。')) return;
    await resetToDefault();
    log.textContent = '已重置為預設內容包';
    onUpdated && onUpdated();
  });

  panel.querySelector('[data-act="close"]').addEventListener('click', onClose);

  root.appendChild(overlay);
  root.appendChild(panel);
  requestAnimationFrame(() => root.classList.add('is-open'));
  return root;
}