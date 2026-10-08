/**
 * 拍照面板 — Life Garden
 * ──────────────────────
 * props:
 *   - previewUrl: 拍照後的 objectURL
 *   - onRetake(): 重新拍
 *   - onConfirm(): 確認上傳
 */

export function PhotoCapture({ previewUrl, onRetake, onConfirm }) {
  const wrap = document.createElement('div');
  wrap.className = 'photo-capture';
  wrap.innerHTML = `
    <div class="photo-capture__preview">
      ${previewUrl ? `<img src="${previewUrl}" alt="剛剛拍的照片" />` : '<span class="photo-capture__placeholder">還沒有照片</span>'}
    </div>
    <div class="photo-capture__actions">
      <button class="btn btn--ghost" data-act="retake" type="button">🔄 再拍一次</button>
      <button class="btn btn--primary" data-act="confirm" type="button" ${previewUrl ? '' : 'disabled'}>✓ 確認完成</button>
    </div>
  `;
  wrap.querySelector('[data-act="retake"]').addEventListener('click', () => onRetake && onRetake());
  wrap.querySelector('[data-act="confirm"]').addEventListener('click', () => onConfirm && onConfirm());
  return wrap;
}