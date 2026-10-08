/**
 * 多感官反饋模組（聽覺 + 觸覺）
 * ─────────────────────────────
 *  - playTap()      點擊燈泡時的輕柔提示音
 *  - playSuccess()  完成任務時的慶祝音
 *  - buzz(pattern)  觸發 Vibration API，pattern 為陣列（毫秒）
 */

const AUDIO_FILES = {
  tap: new Audio('./sounds/tap.wav'),
  success: new Audio('./sounds/success.wav'),
};

Object.values(AUDIO_FILES).forEach((a) => {
  a.preload = 'auto';
  a.volume = 0.85;
});

let _audioUnlocked = false;

export function unlockAudio() {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  Object.values(AUDIO_FILES).forEach((a) => {
    a.play().then(() => a.pause()).catch(() => {});
  });
}

export function playTap() {
  play('tap');
}

export function playSuccess() {
  play('success');
}

function play(key) {
  const a = AUDIO_FILES[key];
  if (!a) return;
  try {
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  } catch (_) {
    /* ignore */
  }
}

export function buzz(pattern = [60]) {
  if (!('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch (_) {
    /* ignore */
  }
}

export function celebrate() {
  playSuccess();
  buzz([80, 60, 80, 60, 200]);
}