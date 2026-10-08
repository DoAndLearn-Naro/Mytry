/**
 * 場景座標系統 — Warm Home v0.6（等比格線版）
 * ───────────────────────────────────────
 * 視角固定（角落房，不旋轉）。邏輯畫布 800×600。
 *
 * 三個獨立平面（格子等寬，沿共用邊 1:1 對齊）：
 *   floor     地板 10 cols × 5 rows（菱形）
 *   leftWall  左牆  5 cols × 2 rows
 *   rightWall 右牆 10 cols × 2 rows
 * 右牆邊是左牆邊的 2 倍長，所以右牆格數也是 2 倍 → 每格物理等大。
 *
 * 擺放記錄：{ furnitureId, plane, gx, gy, x, y, rotation, water }
 *   plane 缺失的舊資料由 resolvePlane() 回填（migrations v4 之後不會再缺）。
 */

export const SCENE = { width: 800, height: 600 };

/**
 * 顯示裁切 VIEW（10:15 直式滿版）
 * ─────────────────────────────
 * 容器 aspect 10/15，SVG viewBox 與 HTML 百分比定位共用同一套裁切座標，
 * 避免 letterbox 錯位（v0.6.5 之前容器 3:4、畫布 800×600，家具全飄移）。
 * 範圍含高家具頂部空間（後排床頂約 y=-110）。
 */
export const VIEW = { x: 246, y: -150, w: 460, h: 690 };

/** 畫布座標 → 容器百分比（FurnitureItem 定位用） */
export function viewPct(x, y) {
  return {
    left: ((x - VIEW.x) / VIEW.w) * 100,
    top: ((y - VIEW.y) / VIEW.h) * 100,
  };
}

/** 容器像素 → 畫布座標（拖移換算用） */
export function viewXY(rect, clientX, clientY, offsetX = 0, offsetY = 0) {
  return {
    x: ((clientX - offsetX - rect.left) / rect.width) * VIEW.w + VIEW.x,
    y: ((clientY - offsetY - rect.top) / rect.height) * VIEW.h + VIEW.y,
  };
}

export const GRID = {
  floor: { cols: 10, rows: 5 },
  leftWall: { cols: 5, rows: 2 },
  rightWall: { cols: 10, rows: 2 },
};

export const PLANES = ['floor', 'leftWall', 'rightWall'];

export function isWallPlane(plane) {
  return plane === 'leftWall' || plane === 'rightWall';
}

/** 擺放記錄 → 平面（舊資料回填：wall 類預設右牆） */
export function resolvePlane(record, furniture) {
  if (record && (record.plane === 'floor' || record.plane === 'leftWall' || record.plane === 'rightWall')) {
    return record.plane;
  }
  if (furniture && furniture.placement === 'floor') return 'floor';
  if (record && typeof record.gx === 'number' && (!furniture || furniture.placement !== 'floor')) {
    // v0.5 以前的統一牆格（0-3 左、4-7 右）
    return record.gx < 4 ? 'leftWall' : 'rightWall';
  }
  return 'rightWall';
}

export function getGridShape(plane) {
  return GRID[plane] || GRID.floor;
}

/** 考慮旋轉後的格子佔位（90/270 寬高互換） */
export function rotatedGridSize(furniture, rotation = 0) {
  const base = furniture.gridSize || { w: 1, h: 1 };
  const r = ((rotation % 360) + 360) % 360;
  if (r === 90 || r === 270) return { w: base.h, h: base.w };
  return { w: base.w, h: base.h };
}

/* ============================================================
 * 角落透視（與桌面 try.html 同座標）
 *   O   = (400,220) 後方角（兩牆與地板交會）
 *   R   = (288,144) 地板右緣（10 格）
 *   L   = (-144,72) 地板左緣（5 格）
 *   V   = (0,120)   牆高（2 格）
 *   TOP = (400,100) 上方角
 * 每步格向量：R/10 = (28.8,14.4)，L/5 = (-28.8,14.4) —— 等長，
 * 左右牆列向量與地板共用邊向量完全相同 → 比例一致。
 * ============================================================ */

export const CORNER = {
  O: { x: 400, y: 220 },
  R: { x: 288, y: 144 },
  L: { x: -144, y: 72 },
  V: { x: 0, y: 120 },
  TOP: { x: 400, y: 100 },
};

export function floorCellCenter(gx, gy, gw = 1, gh = 1) {
  const { O, R, L } = CORNER;
  const fx = (gx + gw / 2) / GRID.floor.cols;
  const fy = (gy + gh / 2) / GRID.floor.rows;
  return {
    x: Math.round(O.x + fx * R.x + fy * L.x),
    y: Math.round(O.y + fx * R.y + fy * L.y),
  };
}

function singleWallCellCenter(plane, gx, gy) {
  const { TOP, R, L, V } = CORNER;
  const g = getGridShape(plane);
  const cx = Math.max(0, Math.min(g.cols - 1, gx));
  const cy = Math.max(0, Math.min(g.rows - 1, gy));
  const E = plane === 'leftWall' ? L : R;
  const cols = plane === 'leftWall' ? GRID.leftWall.cols : GRID.rightWall.cols;
  const fx = (cx + 0.5) / cols;
  const fy = (cy + 0.5) / g.rows;
  return {
    x: Math.round(TOP.x + fx * E.x + fy * V.x),
    y: Math.round(TOP.y + fx * E.y + fy * V.y),
  };
}

export function wallCellCenter(plane, gx, gy, gw = 1, gh = 1) {
  const pts = [];
  for (let dx = 0; dx < gw; dx++) {
    for (let dy = 0; dy < gh; dy++) {
      pts.push(singleWallCellCenter(plane, gx + dx, gy + dy));
    }
  }
  const x = Math.round(pts.reduce((s, p) => s + p.x, 0) / pts.length);
  const y = Math.round(pts.reduce((s, p) => s + p.y, 0) / pts.length);
  return { x, y };
}

/** 格子 → 角落像素（顯示用） */
export function cornerCellToXY(plane, gx, gy, gw = 1, gh = 1) {
  const g = getGridShape(plane);
  const cx = Math.max(0, Math.min(g.cols - gw, gx));
  const cy = Math.max(0, Math.min(g.rows - gh, gy));
  const pt = plane === 'floor'
    ? floorCellCenter(cx, cy, gw, gh)
    : wallCellCenter(plane, cx, cy, gw, gh);
  return { x: pt.x, y: pt.y, gx: cx, gy: cy };
}

/** 像素 → 最近的格子（拖移吸附用） */
export function cornerCellFromXY(plane, x, y, gw = 1, gh = 1) {
  const g = getGridShape(plane);
  let best = { gx: 0, gy: 0, d: Infinity };
  for (let gy = 0; gy <= g.rows - gh; gy++) {
    for (let gx = 0; gx <= g.cols - gw; gx++) {
      const pt = plane === 'floor'
        ? floorCellCenter(gx, gy, gw, gh)
        : wallCellCenter(plane, gx, gy, gw, gh);
      const d = (pt.x - x) ** 2 + (pt.y - y) ** 2;
      if (d < best.d) best = { gx, gy, d };
    }
  }
  return { gx: best.gx, gy: best.gy };
}

/** 角落深度（z 排序用：越前面越大） */
export function cornerDepth(plane, gx, gy, gw = 1, gh = 1) {
  if (plane !== 'floor') return -100 + gy * 2 + gx * 0.1;
  const g = GRID.floor;
  return ((gx + gw / 2) / g.cols) + (((gy + gh / 2) / g.rows) * 2);
}

/** 角落房多邊形（SVG 用，與桌面 try.html 同座標） */
export function cornerPolygons() {
  return {
    leftWall: '400,220 256,292 256,172 400,100',
    rightWall: '400,220 688,364 688,244 400,100',
    floor: '400,220 688,364 544,436 256,292',
    baseLeft: '256,292 400,364 400,382 256,310',
    baseRight: '400,364 688,220 688,238 400,382',
    baseFront: '256,292 400,364 544,292 544,310 400,382 256,310',
    skirtLeft: '400,220 256,292 256,284 400,212',
    skirtRight: '400,220 688,364 688,356 400,212',
  };
}

/* ============================================================
 * 碰撞（以 plane + 格子為鍵，不同牆/地板互不干擾）
 * ============================================================ */

function placementPlaneOf(p, furnitureMap) {
  const f = furnitureMap[p.furnitureId];
  return resolvePlane(p, f);
}

function occupiedCellsOf(p, furnitureMap) {
  const f = furnitureMap[p.furnitureId];
  const plane = placementPlaneOf(p, furnitureMap);
  const size = f ? rotatedGridSize(f, p.rotation || 0) : { w: 1, h: 1 };
  const gx = p.gx ?? 0;
  const gy = p.gy ?? 0;
  const cells = [];
  for (let dx = 0; dx < size.w; dx++) {
    for (let dy = 0; dy < size.h; dy++) {
      cells.push(`${plane}:${gx + dx},${gy + dy}`);
    }
  }
  return cells;
}

/** 某塊格子是否空閒（忽略自己；平面不同視為不重疊） */
export function isAreaFree(placements, furnitureMap, ignoreId, plane, gx, gy, gw, gh) {
  const g = getGridShape(plane);
  if (gx < 0 || gy < 0 || gx + gw > g.cols || gy + gh > g.rows) return false;
  const taken = new Set();
  for (const p of placements) {
    if (p.id === ignoreId) continue;
    if (placementPlaneOf(p, furnitureMap) !== plane) continue;
    for (const key of occupiedCellsOf(p, furnitureMap)) taken.add(key);
  }
  for (let dx = 0; dx < gw; dx++) {
    for (let dy = 0; dy < gh; dy++) {
      if (taken.has(`${plane}:${gx + dx},${gy + dy}`)) return false;
    }
  }
  return true;
}

function centerOut(maxIndex) {
  const out = [];
  const mid = Math.floor(maxIndex / 2);
  out.push(mid);
  for (let d = 1; d <= maxIndex; d++) {
    if (mid + d <= maxIndex) out.push(mid + d);
    if (mid - d >= 0) out.push(mid - d);
    if (out.length > maxIndex) break;
  }
  return out.slice(0, maxIndex + 1);
}

/** 在指定平面找第一個放得下的空格 */
export function findFreeCell(placements, furnitureMap, furniture, plane) {
  const pl = plane || (furniture.placement === 'floor' ? 'floor' : 'rightWall');
  const g = getGridShape(pl);
  const { w, h } = rotatedGridSize(furniture, 0);
  if (w > g.cols || h > g.rows) return null;
  const rows = [];
  if (pl === 'floor') {
    for (let y = g.rows - h; y >= 0; y--) rows.push(y);
  } else {
    for (let y = 0; y <= g.rows - h; y++) rows.push(y);
  }
  const colOrder = centerOut(g.cols - w);
  for (const gy of rows) {
    for (const gx of colOrder) {
      if (isAreaFree(placements, furnitureMap, null, pl, gx, gy, w, h)) {
        return { plane: pl, gx, gy };
      }
    }
  }
  return null;
}

function occupancyRatio(placements, furnitureMap, plane) {
  const g = getGridShape(plane);
  let used = 0;
  for (const p of placements) {
    if (placementPlaneOf(p, furnitureMap) !== plane) continue;
    const f = furnitureMap[p.furnitureId];
    const size = f ? rotatedGridSize(f, p.rotation || 0) : { w: 1, h: 1 };
    used += size.w * size.h;
  }
  return used / (g.cols * g.rows);
}

/** 自動選平面：地板直走；牆飾挑比較空的那面牆 */
export function findFreeCellAuto(placements, furnitureMap, furniture) {
  if (furniture.placement === 'floor') {
    return findFreeCell(placements, furnitureMap, furniture, 'floor');
  }
  const order = occupancyRatio(placements, furnitureMap, 'rightWall') <= occupancyRatio(placements, furnitureMap, 'leftWall')
    ? ['rightWall', 'leftWall']
    : ['leftWall', 'rightWall'];
  for (const pl of order) {
    const spot = findFreeCell(placements, furnitureMap, furniture, pl);
    if (spot) return spot;
  }
  return null;
}

/** 隨機空格（含像素中心，方便一次寫入） */
export function randomGridPosition(placements, furnitureMap, furniture, plane) {
  const pl = plane || (furniture.placement === 'floor' ? 'floor' : 'rightWall');
  const free = findFreeCell(placements, furnitureMap, furniture, pl);
  const g = getGridShape(pl);
  const { w, h } = rotatedGridSize(furniture, 0);
  let gx, gy;
  if (free) {
    ({ gx, gy } = free);
  } else {
    gx = Math.floor(Math.random() * Math.max(1, g.cols - w + 1));
    gy = Math.floor(Math.random() * Math.max(1, g.rows - h + 1));
  }
  const pt = cornerCellToXY(pl, gx, gy, w, h);
  return { plane: pl, gx: pt.gx, gy: pt.gy, x: pt.x, y: pt.y, rotation: 0 };
}

export function randomGridPositionAuto(placements, furnitureMap, furniture) {
  const spot = findFreeCellAuto(placements, furnitureMap, furniture);
  if (spot) {
    const { w, h } = rotatedGridSize(furniture, 0);
    const pt = cornerCellToXY(spot.plane, spot.gx, spot.gy, w, h);
    return { plane: spot.plane, gx: pt.gx, gy: pt.gy, x: pt.x, y: pt.y, rotation: 0 };
  }
  return randomGridPosition(placements, furnitureMap, furniture);
}

/** 無格舊資料 → 最近格（保留 plane） */
export function migrateToGrid(p, furnitureMap) {
  const f = furnitureMap[p.furnitureId];
  const plane = resolvePlane(p, f);
  if (p.gx != null && p.gy != null) return { ...p, plane };
  if (!f) return { ...p, plane, gx: 0, gy: 0 };
  const { w, h } = rotatedGridSize(f, p.rotation || 0);
  const cell = cornerCellFromXY(plane, p.x ?? 400, p.y ?? 300, w, h);
  return { ...p, plane, gx: cell.gx, gy: cell.gy };
}
