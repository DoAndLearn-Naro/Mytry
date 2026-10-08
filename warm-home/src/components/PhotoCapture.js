/**
 * 拍照預覽面板 — Warm Home
 * ────────────────────────
 * 拍照後顯示預覽，提供「再拍一次」與「確認完成」。
 */

export function PhotoCapture({ previewUrl, onRetake, onConfirm }) {
  const wrap = document.createElement('div');
  wrap.className = 'photo-capture';
  wrap.innerHTML = `
    <div class="photo-capture__preview">
      ${previewUrl ? `<img src="${previewUrl}" alt="剛拍的照片" />` : '<span class="photo-capture__placeholder">還沒照片</span>'}
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