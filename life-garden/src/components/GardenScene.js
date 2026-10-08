import { DEFAULT_LAYOUT } from '../modules/layout.js';
import { Slot } from './Slot.js';
import { Lightbulb } from './Lightbulb.js';

/**
 * 2.5D 場景 — Life Garden
 * ──────────────────────
 *  - 牆面（背景）→ 窗戶（中景）→ 地板（中景）→ 漂浮層（前景）
 *  - 每個 Slot 都有自己的 (x, y, z, rotation, depth)
 *  - 輕量級視差：背景層根據 deviceOrientation 微偏移（須使用者允許）
 *
 * props:
 *   - placements: { [slotId]: { decorationId, water } }
 *   - decorationMap: { [decorationId]: decoration }
 *   - completedSlotId: 今日完成任務對應的插槽 id
 *   - onSlotTap(slotId)
 *   - onLightbulbClick()
 */

export function GardenScene({
  placements = {},
  decorationMap = {},
  completedSlotId = null,
  onSlotTap,
  onLightbulbClick,
}) {
  const scene = DEFAULT_LAYOUT.scene;
  const root = document.createElement('section');
  root.className = 'scene';
  root.setAttribute('aria-label', '我的小花園');

  root.innerHTML = `
    <div class="scene__viewport">
      <div class="scene__layer scene__layer--sky"     style="--sky-from:${scene.sky.from};--sky-to:${scene.sky.to};"></div>
      <div class="scene__layer scene__layer--wall"    style="--wall:${scene.wall};"></div>
      <div class="scene__layer scene__layer--window"  style="--trim:${scene.windowTrim};"></div>
      <div class="scene__layer scene__layer--floor"   style="--floor:${scene.floor};"></div>
      <div class="scene__layer scene__layer--props">
        ${DEFAULT_LAYOUT.slots.map((cfg) => `
          <div class="slot-anchor" data-slot="${cfg.id}"
               style="left:${cfg.x}%;top:${cfg.y}%;width:${cfg.width}px;height:${cfg.height}px;">
            ${Slot.renderHTML(cfg, placements[cfg.id], decorationMap, completedSlotId === cfg.id)}
          </div>
        `).join('')}
      </div>
      <div class="scene__layer scene__layer--float">
        <div class="scene__lightbulb-host"></div>
      </div>
    </div>
    <div class="scene__floor-shadow" aria-hidden="true"></div>
  `;

  const bulbHost = root.querySelector('.scene__lightbulb-host');
  bulbHost.appendChild(
    Lightbulb({
      status: completedSlotId ? 'completed' : 'available',
      onClick: onLightbulbClick,
    })
  );

  root.querySelectorAll('.slot-anchor').forEach((anchor) => {
    const slotId = anchor.dataset.slot;
    anchor.addEventListener('click', (e) => {
      e.stopPropagation();
      onSlotTap && onSlotTap(slotId);
    });
    attachSlotWiggle(anchor);
  });

  attachTiltParallax(root);
  return root;
}

function attachSlotWiggle(anchor) {
  let pressTimer = null;
  anchor.addEventListener('touchstart', () => {
    pressTimer = setTimeout(() => {
      anchor.classList.add('is-shake');
      if ('vibrate' in navigator) navigator.vibrate(20);
    }, 380);
  });
  ['touchend', 'touchmove', 'touchcancel'].forEach((evt) =>
    anchor.addEventListener(evt, () => {
      clearTimeout(pressTimer);
      setTimeout(() => anchor.classList.remove('is-shake'), 600);
    })
  );
}

function attachTiltParallax(root) {
  if (typeof DeviceOrientationEvent === 'undefined') return;
  const handler = (event) => {
    const gamma = event.gamma || 0;
    const beta = event.beta || 0;
    const tx = Math.max(-6, Math.min(6, gamma * 0.4));
    const ty = Math.max(-6, Math.min(6, (beta - 30) * 0.3));
    root.style.setProperty('--tilt-x', `${tx}deg`);
    root.style.setProperty('--tilt-y', `${ty}deg`);
  };
  const tryAttach = () => {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then((state) => {
          if (state === 'granted') window.addEventListener('deviceorientation', handler);
        })
        .catch(() => {});
    } else {
      window.addEventListener('deviceorientation', handler);
    }
  };
  root.addEventListener('click', tryAttach, { once: true });
}