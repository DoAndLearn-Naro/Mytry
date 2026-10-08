import {
  SCENE, GRID, CORNER, rotatedGridSize, cornerCellToXY,
  cornerDepth, cornerPolygons, resolvePlane,
} from '../modules/scene.js';
import { FurnitureItem } from './FurnitureItem.js';

/**
 * 角落式 2.5D 房間 — Warm Home v0.6（等比格線）
 * ─────────────────────────────────────────
 * 左牆 5×2＋右牆 10×2＋地板 10×5，每格等大、共用邊對齊。
 * 一格一格框住、可拖移吸附。
 */

export function RoomScene({
  furnitureCatalog,
  furnitureMap,
  placements,
  selectedPlacementId,
  onSelect,
  onMove,
  onRotate,
  onEventTap,
  onDelete,
  onDragHint,
  draggingPlacementId,
  dropHint = null,
  bubbles = {},
  activeEventPlacementId = null,
}) {
  const root = document.createElement('div');
  root.className = 'room-scene room-scene--corner';

  root.innerHTML = `
    <div class="room-scene__viewport">
      <svg class="corner-svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id="cw-lw" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FAF4EB"/><stop offset="100%" stop-color="#E1D3C1"/>
          </linearGradient>
          <linearGradient id="cw-rw" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FCF9F3"/><stop offset="100%" stop-color="#E9DCCC"/>
          </linearGradient>
          <linearGradient id="cw-fl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#E0CDBC"/><stop offset="100%" stop-color="#CBB29C"/>
          </linearGradient>
          <linearGradient id="cw-corner" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="rgba(62,39,35,0.2)"/><stop offset="100%" stop-color="rgba(62,39,35,0)"/>
          </linearGradient>
        </defs>
        <!-- 3D 模型地基底座 -->
        <polygon points="${cornerPolygons().baseLeft}" fill="#8D6E63" stroke="#5D4037" stroke-width="1"/>
        <polygon points="${cornerPolygons().baseRight}" fill="#6D4C41" stroke="#3E2723" stroke-width="1"/>
        <polygon points="${cornerPolygons().baseFront}" fill="#5D4037"/>
        <!-- 牆 + 地板本體 -->
        <polygon points="${cornerPolygons().leftWall}" fill="url(#cw-lw)" stroke="#D4C4B2" stroke-width="1.5"/>
        <polygon points="${cornerPolygons().rightWall}" fill="url(#cw-rw)" stroke="#D4C4B2" stroke-width="1.5"/>
        <polygon points="${cornerPolygons().floor}" fill="url(#cw-fl)" stroke="#BFA894" stroke-width="1.5"/>
        <!-- 踢腳板 + 頂角線 -->
        <polygon points="${cornerPolygons().skirtLeft}" fill="#8D6E63" opacity="0.85"/>
        <polygon points="${cornerPolygons().skirtRight}" fill="#795548" opacity="0.85"/>
        <polygon points="400,100 256,172 256,177 400,105" fill="#A1887F"/>
        <polygon points="400,100 688,244 688,249 400,105" fill="#8D6E63"/>
        <!-- 角落陰影 -->
        <polygon points="400,100 420,110 420,230 400,220" fill="url(#cw-corner)"/>
        <line x1="400" y1="100" x2="400" y2="220" stroke="#4E342E" stroke-width="2" opacity="0.5"/>
        <g class="corner-cells">${cellsSVG()}</g>
        <g class="corner-drop">${dropSVG(dropHint)}</g>
      </svg>
      <div class="room__furniture-layer"></div>
      <div class="room__hint" aria-hidden="true">拖家具到發光的格子 · 點家具會說話 · 選取後 ↻ 旋轉</div>
    </div>
  `;

  const map = furnitureMap || Object.fromEntries(furnitureCatalog.map((f) => [f.id, f]));
  const layer = root.querySelector('.room__furniture-layer');

  const sorted = [...placements].sort((a, b) => {
    const fa = map[a.furnitureId];
    const fb = map[b.furnitureId];
    const pa = resolvePlane(a, fa);
    const pb = resolvePlane(b, fb);
    const wallA = pa !== 'floor';
    const wallB = pb !== 'floor';
    if (wallA !== wallB) return wallA ? -1 : 1;
    const sa = fa ? rotatedGridSize(fa, a.rotation || 0) : { w: 1, h: 1 };
    const sb = fb ? rotatedGridSize(fb, b.rotation || 0) : { w: 1, h: 1 };
    return cornerDepth(pa, a.gx ?? 0, a.gy ?? 0, sa.w, sa.h)
         - cornerDepth(pb, b.gx ?? 0, b.gy ?? 0, sb.w, sb.h);
  });

  sorted.forEach((p) => {
    const furniture = map[p.furnitureId];
    if (!furniture) return;
    const plane = resolvePlane(p, furniture);
    const size = rotatedGridSize(furniture, p.rotation || 0);
    const depth = plane === 'floor'
      ? 20 + Math.round(cornerDepth('floor', p.gx ?? 0, p.gy ?? 0, size.w, size.h) * 10)
      : 5;
    const el = FurnitureItem({
      placement: p,
      furniture,
      selected: selectedPlacementId === p.id,
      dragging: draggingPlacementId === p.id,
      depth,
      bubble: bubbles[p.id] || null,
      hasEvent: activeEventPlacementId === p.id,
      onSelect: () => onSelect(p.id),
      onMove: (id, patch) => onMove(id, patch),
      onRotate: (id) => onRotate && onRotate(id),
      onDelete: (id) => onDelete && onDelete(id),
      onEventTap: (id) => onEventTap && onEventTap(id),
      onDragHint: (hint) => onDragHint && onDragHint(hint),
    });
    layer.appendChild(el);
  });

  // 精準點選：在 viewport 捕獲點擊，選「框含點擊點且中心最近」的那件，
  // 取代各家具各自搶點擊（盒子大＋重疊時容易選錯）。
  const viewport = root.querySelector('.room-scene__viewport');
  viewport.addEventListener('click', (e) => {
    if (e.target.closest('.event-badge,.mini-toolbar,.tool-btn')) return; // 專屬按鈕自己處理
    const moved = root.querySelector('.furniture[data-moved="1"]');
    if (moved) { moved.dataset.moved = ''; return; } // 剛拖完吞掉這次點擊
    e.stopPropagation();
    const rect = viewport.getBoundingClientRect();
    if (!e.clientX && e.clientX !== 0) { onSelect(null); return; }
    const sx = ((e.clientX - rect.left) / rect.width) * SCENE.width;
    const sy = ((e.clientY - rect.top) / rect.height) * SCENE.height;
    const scale = rect.width / SCENE.width; // px per unit
    let best = null;
    let bestD = Infinity;
    for (const p of placements) {
      const f = map[p.furnitureId];
      if (!f) continue;
      const plane = resolvePlane(p, f);
      const size = rotatedGridSize(f, p.rotation || 0);
      const c = cornerCellToXY(plane, p.gx ?? 0, p.gy ?? 0, size.w, size.h);
      const hw = (f.footprint.w / 2) / scale;
      const hh = (f.footprint.h / 2) / scale;
      const cy = c.y - hh * 0.44; // 對齊 translate(-50%,-72%) 的視覺中心
      if (Math.abs(sx - c.x) > hw || Math.abs(sy - cy) > hh) continue;
      const d = (sx - c.x) ** 2 + (sy - cy) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    if (!best) { onSelect(null); return; } // 點空地取消選取
    if (activeEventPlacementId === best.id) {
      if (onEventTap) onEventTap(best.id);
      return;
    }
    onSelect(best.id);
  }, true);

  return root;
}

/** 一格一格的框：地板 10×5＋左牆 5×2＋右牆 10×2 */
function cellsSVG() {
  const { O, R, L, TOP, V } = CORNER;
  const P = (x, y) => `${Math.round(x)},${Math.round(y)}`;
  let s = '';
  const fg = GRID.floor;
  for (let gy = 0; gy < fg.rows; gy++) {
    for (let gx = 0; gx < fg.cols; gx++) {
      const ax = O.x + (gx / fg.cols) * R.x + (gy / fg.rows) * L.x;
      const ay = O.y + (gx / fg.cols) * R.y + (gy / fg.rows) * L.y;
      const bx = O.x + ((gx + 1) / fg.cols) * R.x + (gy / fg.rows) * L.x;
      const by = O.y + ((gx + 1) / fg.cols) * R.y + (gy / fg.rows) * L.y;
      const cx = O.x + ((gx + 1) / fg.cols) * R.x + ((gy + 1) / fg.rows) * L.x;
      const cy = O.y + ((gx + 1) / fg.cols) * R.y + ((gy + 1) / fg.rows) * L.y;
      const dx = O.x + (gx / fg.cols) * R.x + ((gy + 1) / fg.rows) * L.x;
      const dy = O.y + (gx / fg.cols) * R.y + ((gy + 1) / fg.rows) * L.y;
      s += `<polygon points="${P(ax, ay)} ${P(bx, by)} ${P(cx, cy)} ${P(dx, dy)}" class="cell cell--floor" data-cell="floor:${gx},${gy}"/>`;
    }
  }
  for (const plane of ['leftWall', 'rightWall']) {
    const g = GRID[plane];
    for (let gy = 0; gy < g.rows; gy++) {
      for (let gx = 0; gx < g.cols; gx++) {
        s += `<polygon points="${wallQuad(plane, gx, gy)}" class="cell ${plane === 'leftWall' ? 'cell--left' : 'cell--right'}" data-cell="${plane}:${gx},${gy}"/>`;
      }
    }
  }
  return s;
}

function wallQuad(plane, gx, gy) {
  const { TOP, R, L, V } = CORNER;
  const g = GRID[plane];
  const E = plane === 'leftWall' ? L : R;
  const P = (x, y) => `${Math.round(x)},${Math.round(y)}`;
  const ax = TOP.x + (gx / g.cols) * E.x + (gy / g.rows) * V.x;
  const ay = TOP.y + (gx / g.cols) * E.y + (gy / g.rows) * V.y;
  const bx = TOP.x + ((gx + 1) / g.cols) * E.x + (gy / g.rows) * V.x;
  const by = TOP.y + ((gx + 1) / g.cols) * E.y + (gy / g.rows) * V.y;
  const cx = TOP.x + ((gx + 1) / g.cols) * E.x + ((gy + 1) / g.rows) * V.x;
  const cy = TOP.y + ((gx + 1) / g.cols) * E.y + ((gy + 1) / g.rows) * V.y;
  const dx = TOP.x + (gx / g.cols) * E.x + ((gy + 1) / g.rows) * V.x;
  const dy = TOP.y + (gx / g.cols) * E.y + ((gy + 1) / g.rows) * V.y;
  return `${P(ax, ay)} ${P(bx, by)} ${P(cx, cy)} ${P(dx, dy)}`;
}

/** 拖移中的目標格高亮（綠=可放、紅=被佔） */
function dropSVG(dropHint) {
  if (!dropHint) return '';
  const { plane, gx, gy, gw = 1, gh = 1, ok } = dropHint;
  const pts = [];
  for (let dx = 0; dx < gw; dx++) {
    for (let dy = 0; dy < gh; dy++) {
      pts.push(cornerCellToXY(plane, gx + dx, gy + dy, 1, 1));
    }
  }
  if (!pts.length) return '';
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const cls = ok ? 'drop-ok' : 'drop-bad';
  return `<g class="${cls}"><ellipse cx="${Math.round(cx)}" cy="${Math.round(cy)}" rx="52" ry="22"/><text x="${Math.round(cx)}" y="${Math.round(cy + 5)}">${ok ? '放這裡' : '被佔走了'}</text></g>`;
}

export { SCENE };
