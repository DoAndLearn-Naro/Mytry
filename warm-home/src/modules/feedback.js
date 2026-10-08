/**
 * 多感官反饋 — Warm Home
 * ────────────────────
 */

const AUDIO_FILES = {
  tap: new Audio('./sounds/tap.wav'),
  success: new Audio('./sounds/success.wav'),
};
Object.values(AUDIO_FILES).forEach((a) => { a.preload = 'auto'; a.volume = 0.85; });

let _audioUnlocked = false;
export function unlockAudio() {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  Object.values(AUDIO_FILES).forEach((a) => {
    a.play().then(() => a.pause()).catch(() => {});
  });
}

export function playTap() { play('tap'); }
export function playSuccess() { play('success'); }

function play(key) {
  const a = AUDIO_FILES[key];
  if (!a) return;
  try {
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  } catch (_) {}
}

export function buzz(pattern = [60]) {
  if (!('vibrate' in navigator)) return;
  try { navigator.vibrate(pattern); } catch (_) {}
}

export function celebrate() {
  playSuccess();
  buzz([80, 60, 80, 60, 200]);
}