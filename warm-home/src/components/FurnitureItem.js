import { SCENE, clampToZone } from '../modules/scene.js';

/**
 * 單件家具 — Warm Home
 * ──────────────────
 * props:
 *   - placement: { id, furnitureId, x, y, rotation, water }
 *   - furniture: 型錄項目
 *   - selected, dragging
 *   - onSelect()
 *   - onMove(x, y)
 */

export function FurnitureItem({ placement, furniture, selected, dragging, onSelect, onMove }) {
  const el = document.createElement('div');
  const waterLevel = Math.min(1, (placement.water || 0) / 6);
  el.className = `furniture furniture--${furniture.placement}
                   ${selected ? 'is-selected' : ''}
                   ${dragging ? 'is-dragging' : ''}
                   ${waterLevel > 0.5 ? 'is-warm' : ''}`;
  el.style.left = `${(placement.x / SCENE.width) * 100}%`;
  el.style.top  = `${(placement.y / SCENE.height) * 100}%`;
  el.style.width  = `${furniture.footprint.w}px`;
  el.style.height = `${furniture.footprint.h}px`;
  el.style.transform = `translate(-50%, -50%) rotate(${placement.rotation || 0}deg)`;

  el.innerHTML = `
    <div class="furniture__shadow" aria-hidden="true"></div>
    <div class="furniture__body">
      <div class="furniture__emoji">${furniture.emoji}</div>
      <div class="furniture__label">${furniture.label}</div>
    </div>
    <div class="furniture__warmth" style="--warm:${waterLevel};" aria-hidden="true"></div>
  `;

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onSelect();
  });

  attachDrag(el, furniture, (newX, newY) => onMove(newX, newY));

  return el;
}

function attachDrag(el, furniture, onMove) {
  let dragState = null;

  const start = (clientX, clientY) => {
    const rect = el.getBoundingClientRect();
    dragState = {
      offsetX: clientX - rect.left - rect.width / 2,
      offsetY: clientY - rect.top - rect.height / 2,
      moved: false,
    };
  };

  const move = (clientX, clientY) => {
    if (!dragState) return;
    dragState.moved = true;
    const scene = el.closest('.room-scene__viewport');
    if (!scene) return;
    const sRect = scene.getBoundingClientRect();
    const px = ((clientX - dragState.offsetX - sRect.left) / sRect.width)  * SCENE.width;
    const py = ((clientY - dragState.offsetY - sRect.top)  / sRect.height) * SCENE.height;
    const cx = clampToZone(px, 'x', furniture.placement);
    const cy = clampToZone(py, 'y', furniture.placement);
    el.style.left = `${(cx / SCENE.width)  * 100}%`;
    el.style.top  = `${(cy / SCENE.height) * 100}%`;
    dragState.lastX = cx;
    dragState.lastY = cy;
  };

  const end = () => {
    if (dragState && dragState.moved) {
      onMove(Math.round(dragState.lastX), Math.round(dragState.lastY));
    }
    dragState = null;
    el.classList.remove('is-dragging');
  };

  el.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    start(t.clientX, t.clientY);
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (!dragState) return;
    el.classList.add('is-dragging');
    const t = e.touches[0];
    move(t.clientX, t.clientY);
  }, { passive: true });
  el.addEventListener('touchend', end);
  el.addEventListener('touchcancel', end);

  el.addEventListener('mousedown', (e) => { start(e.clientX, e.clientY); });
  window.addEventListener('mousemove', (e) => {
    if (!dragState) return;
    el.classList.add('is-dragging');
    move(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', end);
}