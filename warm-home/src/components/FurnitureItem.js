import { SCENE, rotatedGridSize, cornerCellToXY, cornerCellFromXY } from '../modules/scene.js';

/**
 * 單件家具 — Warm Home v0.4（貼牆貼地 3D 版，對齊桌面 try.html）
 * ──────────────────────────────────────────────────────────
 * 地板：徑向地面陰影 + drop-shadow，坐進格子裡。
 * 牆面：skewY(∓26.57deg) scaleX(.866) 貼合牆面 + 接觸陰影 + 掛釘 + 立體木框。
 * 牆左右：gx<4 左牆，否則右牆。
 */

export function FurnitureItem({
  placement, furniture, selected, dragging, depth,
  bubble, hasEvent, onSelect, onMove, onRotate, onDelete, onEventTap, onDragHint,
}) {
  const el = document.createElement('div');
  const waterLevel = Math.min(1, (placement.water || 0) / 6);
  const rot = placement.rotation || 0;
  const size = rotatedGridSize(furniture, rot);
  const pt = cornerCellToXY(furniture.placement, placement.gx ?? 0, placement.gy ?? 0, size.w, size.h);
  const isWall = furniture.placement === 'wall';
  const wallSide = (placement.gx ?? 0) < 4 ? 'left' : 'right';

  el.className = `furniture furniture--${furniture.placement}`
    + (isWall ? ` wall-item-${wallSide}` : '')
    + ` ${selected ? 'is-selected' : ''}`
    + ` ${dragging ? 'is-dragging' : ''}`
    + ` ${waterLevel > 0.5 ? 'is-warm' : ''}`
    + ` ${hasEvent ? 'has-event' : ''}`;
  el.style.left = `${(pt.x / SCENE.width) * 100}%`;
  el.style.top = `${(pt.y / SCENE.height) * 100}%`;
  // 牆飾依框體縮放，地板依 footprint
  if (!isWall) {
    el.style.width = `${furniture.footprint.w}px`;
    el.style.height = `${furniture.footprint.h}px`;
  } else {
    el.style.width = `${Math.max(96, furniture.footprint.w * 0.72)}px`;
  }
  el.style.zIndex = String(selected ? 999 : (depth ?? 10));
  el.dataset.pid = placement.id;

  if (!isWall) {
    el.innerHTML = `
      <div class="floor-shadow" aria-hidden="true"></div>
      <div class="furniture__body">
        <div class="furniture__emoji">${furniture.emoji}</div>
        <div class="furniture__label">${furniture.label}</div>
      </div>
      <div class="furniture__warmth" style="--warm:${waterLevel};" aria-hidden="true"></div>
      ${bubble && bubble.text ? `<div class="speech-bubble" role="status">${bubble.icon ? `${bubble.icon} ` : ''}${escapeHtml(bubble.text)}</div>` : ''}
      ${hasEvent ? `<button class="event-badge" type="button" aria-label="有新事件">❗</button>` : ''}
      ${selected ? `
        <div class="mini-toolbar" role="toolbar">
          <button class="tool-btn" type="button" data-act="rot" title="旋轉" aria-label="旋轉">↻</button>
          <button class="tool-btn tool-btn--danger" type="button" data-act="del" title="收回倉庫" aria-label="收回倉庫">🗑️</button>
        </div>` : ''}
    `;
  } else {
    el.innerHTML = `
      <div class="wall-contact-shadow" aria-hidden="true"></div>
      <div class="wall-nail" aria-hidden="true"></div>
      <div class="wall-3d-frame">
        <div class="furniture__emoji">${furniture.emoji}</div>
        <div class="furniture__label">${furniture.label}</div>
      </div>
      <div class="furniture__warmth" style="--warm:${waterLevel};" aria-hidden="true"></div>
      ${bubble && bubble.text ? `<div class="speech-bubble" role="status">${bubble.icon ? `${bubble.icon} ` : ''}${escapeHtml(bubble.text)}</div>` : ''}
      ${hasEvent ? `<button class="event-badge" type="button" aria-label="有新事件">❗</button>` : ''}
      ${selected ? `
        <div class="mini-toolbar" role="toolbar">
          <button class="tool-btn tool-btn--danger" type="button" data-act="del" title="收回倉庫" aria-label="收回倉庫">🗑️</button>
        </div>` : ''}
    `;
  }

  el.addEventListener('click', (e) => {
    if (el.dataset.moved === '1') {
      el.dataset.moved = '';
      return;
    }
    e.stopPropagation();
    if (hasEvent && onEventTap) {
      onEventTap(placement.id);
      return;
    }
    onSelect && onSelect(placement.id);
  });

  const badge = el.querySelector('.event-badge');
  if (badge) badge.addEventListener('click', (e) => {
    e.stopPropagation();
    onEventTap && onEventTap(placement.id);
  });

  const rotBtn = el.querySelector('[data-act="rot"]');
  if (rotBtn) rotBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onRotate && onRotate(placement.id);
  });
  const delBtn = el.querySelector('[data-act="del"]');
  if (delBtn) delBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onDelete && onDelete(placement.id);
  });

  attachCornerDrag(el, furniture, size, placement, { onMove, onDragHint });
  return el;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function toSceneXY(el, clientX, clientY, offsetX, offsetY) {
  const scene = el.closest('.room-scene__viewport');
  if (!scene) return null;
  const sRect = scene.getBoundingClientRect();
  return {
    x: ((clientX - offsetX - sRect.left) / sRect.width) * SCENE.width,
    y: ((clientY - offsetY - sRect.top) / sRect.height) * SCENE.height,
  };
}

function attachCornerDrag(el, furniture, size, placement, { onMove, onDragHint }) {
  let dragState = null;

  const start = (clientX, clientY) => {
    const rect = el.getBoundingClientRect();
    dragState = {
      offsetX: clientX - rect.left - rect.width / 2,
      offsetY: clientY - rect.top - rect.height / 2,
      moved: false,
      last: null,
    };
    el.dataset.moved = '';
  };

  const move = (clientX, clientY) => {
    if (!dragState) return;
    dragState.moved = true;
    el.dataset.moved = '1';
    const pt = toSceneXY(el, clientX, clientY, dragState.offsetX, dragState.offsetY);
    if (!pt) return;
    el.style.left = `${(pt.x / SCENE.width) * 100}%`;
    el.style.top = `${(pt.y / SCENE.height) * 100}%`;
    el.classList.add('is-dragging');
    const cell = cornerCellFromXY(furniture.placement, pt.x, pt.y, size.w, size.h);
    const center = cornerCellToXY(furniture.placement, cell.gx, cell.gy, size.w, size.h);
    dragState.last = { ...cell, x: center.x, y: center.y };
    if (onDragHint) onDragHint({ placement: furniture.placement, gx: cell.gx, gy: cell.gy, gw: size.w, gh: size.h });
  };

  const end = () => {
    if (onDragHint) onDragHint(null);
    if (dragState && dragState.moved && dragState.last) {
      onMove(placement.id, { gx: dragState.last.gx, gy: dragState.last.gy, x: dragState.last.x, y: dragState.last.y });
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
    const t = e.touches[0];
    move(t.clientX, t.clientY);
  }, { passive: true });
  el.addEventListener('touchend', end);
  el.addEventListener('touchcancel', end);

  el.addEventListener('mousedown', (e) => { start(e.clientX, e.clientY); });
  window.addEventListener('mousemove', (e) => {
    if (!dragState) return;
    move(e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', end);
}
