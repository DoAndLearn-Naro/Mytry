/**
 * 相機拍照模組 — Life Garden
 * ──────────────────────────
 * 採用最單純的 `<input type="file" accept="image/*" capture="environment">`
 * 對長者裝置（多為 Android 內建相機 App）相容性最高；Phase 2 再升級 WebRTC。
 */

export function createFileInput({ onPick }) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.setAttribute('capture', 'environment');
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  input.style.top = '0';
  input.setAttribute('aria-hidden', 'true');

  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const blob = await compressImage(file, 1280, 0.82);
      onPick(blob);
    } catch (err) {
      console.error('[camera] compress error', err);
      onPick(file);
    } finally {
      input.value = '';
    }
  });

  document.body.appendChild(input);
  return input;
}

export function triggerCapture(inputEl) {
  inputEl.click();
}

function compressImage(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = fitInside(img.width, img.height, maxSide);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fitInside(w, h, maxSide) {
  if (w <= maxSide && h <= maxSide) return { width: w, height: h };
  const ratio = maxSide / Math.max(w, h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

export function blobToObjectURL(blob) {
  return URL.createObjectURL(blob);
}