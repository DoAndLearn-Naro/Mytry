/**
 * 場景座標系統 — Warm Home v0.2（格線版）
 * ─────────────────────────────
 * 邏輯畫布 800 × 600（視角固定、不旋轉）。
 *   牆面區域：x ∈ [80, 720], y ∈ [80, 220]   → 切成 8 cols × 2 rows
 *   地板區域：x ∈ [60, 740], y ∈ [360, 580]  → 切成 8 cols × 4 rows
 *
 * 新版擺放用格子 (gx, gy) + 佔位 (gw, gh) + 旋轉 (0/90/180/270)：
 *   - 拖放自動吸附格心、防重疊、越界彈回
 *   - z-index 用 gy 排序，越下面越前面 → 2.5D 前後遮擋
 * 舊資料只有 x/y，會自動遷移到最近的空格子。
 */

export const SCENE = {
  width: 800,
  height: 600,
  wall: { x0: 80, x1: 720, y0: 80, y1: 220 },
  floor: { x0: 60, x1: 740, y0: 360, y1: 580 },
};

export const GRID = {
  floor: { cols: 8, rows: 4 },
  wall: { cols: 8, rows: 2 },
};

export function getPlacementZone(placement) {
  return placement === 'wall' ? SCENE.wall : SCENE.floor;
}

export function getGridShape(placement) {
  return placement === 'wall' ? GRID.wall : GRID.floor;
}

export function clampToZone(value, axis, placement) {
  const z = getPlacementZone(placement);
  const min = axis === 'x' ? z.x0 : z.y0;
  const max = axis === 'x' ? z.x1 : z.y1;
  return Math.max(min, Math.min(max, value));
}

/** 每格像素大小 */
export function cellSize(placement) {
  const z = getPlacementZone(placement);
  const g = getGridShape(placement);
  return {
    cw: (z.x1 - z.x0) / g.cols,
    ch: (z.y1 - z.y0) / g.rows,
  };
}

/** 考慮旋轉後的格子佔位（90/270 寬高互換） */
export function rotatedGridSize(furniture, rotation = 0) {
  const base = furniture.gridSize || { w: 1, h: 1 };
  const r = ((rotation % 360) + 360) % 360;
  if (r === 90 || r === 270) return { w: base.h, h: base.w };
  return { w: base.w, h: base.h };
}

/** 格子 → 中心像素座標 */
export function cellToXY(placement, gx, gy, gw = 1, gh = 1) {
  const z = getPlacementZone(placement);
  const { cw, ch } = cellSize(placement);
  const cx = Math.max(0, Math.min(getGridShape(placement).cols - gw, gx));
  const cy = Math.max(0, Math.min(getGridShape(placement).rows - gh, gy));
  return {
    x: Math.round(z.x0 + (cx + gw / 2) * cw),
    y: Math.round(z.y0 + (cy + gh / 2) * ch),
    gx: cx,
    gy: cy,
  };
}

/** 像素 → 格子（左上角格） */
export function xyToCell(placement, x, y, gw = 1, gh = 1) {
  const z = getPlacementZone(placement);
  const g = getGridShape(placement);
  const { cw, ch } = cellSize(placement);
  let gx = Math.floor((x - z.x0) / cw - gw / 2 + 0.5);
  let gy = Math.floor((y - z.y0) / ch - gh / 2 + 0.5);
  gx = Math.max(0, Math.min(g.cols - gw, gx));
  gy = Math.max(0, Math.min(g.rows - gh, gy));
  return { gx, gy };
}

function occupiedCellsOf(p, furnitureMap) {
  const f = furnitureMap[p.furnitureId];
  const placement = f ? f.placement : 'floor';
  const rot = p.rotation || 0;
  const size = f ? rotatedGridSize(f, rot) : { w: 1, h: 1 };
  const gx = p.gx ?? 0;
  const gy = p.gy ?? 0;
  const cells = [];
  for (let dx = 0; dx < size.w; dx++) {
    for (let dy = 0; dy < size.h; dy++) {
      cells.push(`${placement}:${gx + dx},${gy + dy}`);
    }
  }
  return cells;
}

/** 檢查某塊格子是否空閒（忽略自己） */
export function isAreaFree(placements, furnitureMap, ignoreId, placement, gx, gy, gw, gh) {
  const g = getGridShape(placement);
  if (gx < 0 || gy < 0 || gx + gw > g.cols || gy + gh > g.rows) return false;
  const taken = new Set();
  for (const p of placements) {
    if (p.id === ignoreId) continue;
    const f = furnitureMap[p.furnitureId];
    if (!f) continue;
    if (f.placement !== placement) continue;
    for (const key of occupiedCellsOf(p, furnitureMap)) taken.add(key);
  }
  for (let dx = 0; dx < gw; dx++) {
    for (let dy = 0; dy < gh; dy++) {
      if (taken.has(`${placement}:${gx + dx},${gy + dy}`)) return false;
    }
  }
  return true;
}

/** 找第一個放得下的空格（由下往上，讓大件優先靠前） */
export function findFreeCell(placements, furnitureMap, furniture) {
  const placement = furniture.placement;
  const g = getGridShape(placement);
  const { w, h } = rotatedGridSize(furniture, 0);
  // 地板：從最下面一行往上找，畫面比較自然；牆面：由上往下
  const rows = [];
  if (placement === 'floor') {
    for (let y = g.rows - h; y >= 0; y--) rows.push(y);
  } else {
    for (let y = 0; y <= g.rows - h; y++) rows.push(y);
  }
  // 中央優先（視覺平衡）
  const colOrder = centerOut(g.cols - w);
  for (const gy of rows) {
    for (const gx of colOrder) {
      if (isAreaFree(placements, furnitureMap, null, placement, gx, gy, w, h)) {
        return { gx, gy };
      }
    }
  }
  return null;
}

function centerOut(maxIndex) {
  // e.g. maxIndex=7 → [3,4,2,5,1,6,0,7]
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

/** 舊 x/y 遷移到格子（找最近的空格） */
export function migrateToGrid(p, furnitureMap) {
  if (p.gx != null && p.gy != null) return p;
  const f = furnitureMap[p.furnitureId];
  if (!f) return { ...p, gx: 0, gy: 0 };
  const { w, h } = rotatedGridSize(f, p.rotation || 0);
  const cell = xyToCell(f.placement, p.x ?? 400, p.y ?? 450, w, h);
  return { ...p, gx: cell.gx, gy: cell.gy };
}

export function randomPosition(placement) {
  const z = getPlacementZone(placement);
  return {
    x: Math.round(z.x0 + Math.random() * (z.x1 - z.x0)),
    y: Math.round(z.y0 + Math.random() * (z.y1 - z.y0)),
    rotation: 0,
  };
}

/** 新版：隨機空格（含像素中心，方便一次寫入） */
export function randomGridPosition(placements, furnitureMap, furniture) {
  const free = findFreeCell(placements, furnitureMap, furniture);
  const g = getGridShape(furniture.placement);
  const { w, h } = rotatedGridSize(furniture, 0);
  let gx, gy;
  if (free) {
    ({ gx, gy } = free);
  } else {
    gx = Math.floor(Math.random() * Math.max(1, g.cols - w + 1));
    gy = Math.floor(Math.random() * Math.max(1, g.rows - h + 1));
  }
  const pt = cornerCellToXY(furniture.placement, gx, gy, w, h);
  return { ...pt, rotation: 0 };
}

/* ============================================================
 * 角落透視（try.html 視角）— 與上面格線邏輯共用 gx/gy
 * ──────────────────────────────────────────────────────────
 * 畫布仍是 800×600：
 *   O   = (400,200) 後方角（兩牆與地板交會）
 *   R   = (288,144) 地板右緣（8 格寬）
 *   L   = (-144,72) 地板左緣（4 格深）
 *   V   = (0,104)   牆高
 *   TOP = (400,96)  上方角
 * 地板 8×4，牆面 8×2（0-3 左牆、4-7 右牆），DB 不用改。
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
  const fx = (gx + gw / 2) / 8;
  const fy = (gy + gh / 2) / 4;
  return {
    x: Math.round(O.x + fx * R.x + fy * L.x),
    y: Math.round(O.y + fx * R.y + fy * L.y),
  };
}

export function wallCellCenter(gx, gy, gw = 1, gh = 1) {
  // 牆格可能橫跨左右牆（gw>1），取佔位中心：平均每格中心
  const pts = [];
  for (let dx = 0; dx < gw; dx++) {
    for (let dy = 0; dy < gh; dy++) {
      pts.push(singleWallCellCenter(gx + dx, gy + dy));
    }
  }
  const x = Math.round(pts.reduce((s, p) => s + p.x, 0) / pts.length);
  const y = Math.round(pts.reduce((s, p) => s + p.y, 0) / pts.length);
  return { x, y };
}

function singleWallCellCenter(gx, gy) {
  const { TOP, R, L, V } = CORNER;
  const cx = Math.max(0, Math.min(7, gx));
  const cy = Math.max(0, Math.min(1, gy));
  if (cx < 4) {
    // 左牆：TOP + (lx+0.5)/4*L + (cy+0.5)/2*V
    const fx = (cx + 0.5) / 4;
    const fy = (cy + 0.5) / 2;
    return {
      x: Math.round(TOP.x + fx * L.x + fy * V.x),
      y: Math.round(TOP.y + fx * L.y + fy * V.y),
    };
  }
  // 右牆：TOP + (rx+0.5)/4*R + (cy+0.5)/2*V
  const rx = cx - 4;
  const fx = (rx + 0.5) / 4;
  const fy = (cy + 0.5) / 2;
  return {
    x: Math.round(TOP.x + fx * R.x + fy * V.x),
    y: Math.round(TOP.y + fx * R.y + fy * V.y),
  };
}

/** 格子 → 角落像素（顯示用，取代舊 cellToXY） */
export function cornerCellToXY(placement, gx, gy, gw = 1, gh = 1) {
  const g = getGridShape(placement);
  const cx = Math.max(0, Math.min(g.cols - gw, gx));
  const cy = Math.max(0, Math.min(g.rows - gh, gy));
  const pt = placement === 'wall'
    ? wallCellCenter(cx, cy, gw, gh)
    : floorCellCenter(cx, cy, gw, gh);
  return { x: pt.x, y: pt.y, gx: cx, gy: cy };
}

/** 像素 → 最近的格子（拖移吸附用，暴力找最近中心） */
export function cornerCellFromXY(placement, x, y, gw = 1, gh = 1) {
  const g = getGridShape(placement);
  let best = { gx: 0, gy: 0, d: Infinity };
  for (let gy = 0; gy <= g.rows - gh; gy++) {
    for (let gx = 0; gx <= g.cols - gw; gx++) {
      const pt = placement === 'wall'
        ? wallCellCenter(gx, gy, gw, gh)
        : floorCellCenter(gx, gy, gw, gh);
      const d = (pt.x - x) ** 2 + (pt.y - y) ** 2;
      if (d < best.d) best = { gx, gy, d };
    }
  }
  return { gx: best.gx, gy: best.gy };
}

/** 角落深度（z 排序用：越前面越大） */
export function cornerDepth(placement, gx, gy, gw = 1, gh = 1) {
  if (placement === 'wall') return -100 + gy * 2 + gx * 0.1;
  return (gx + gw / 2) / 8 + ((gy + gh / 2) / 4) * 2;
}

/** 產生 SVG 格線（地板 8×4 雙向、雙牆各 4×2） */
export function cornerGridLines() {
  const { O, R, L, TOP, V } = CORNER;
  const add = (x1, y1, x2, y2) => ({ x1: Math.round(x1), y1: Math.round(y1), x2: Math.round(x2), y2: Math.round(y2) });
  const floor = [];
  for (let j = 0; j <= 4; j++) {
    const f = j / 4;
    floor.push(add(O.x + f * L.x, O.y + f * L.y, O.x + R.x + f * L.x, O.y + R.y + f * L.y));
  }
  for (let i = 0; i <= 8; i++) {
    const f = i / 8;
    floor.push(add(O.x + f * R.x, O.y + f * R.y, O.x + f * R.x + L.x, O.y + f * R.y + L.y));
  }
  const leftWall = [];
  for (let i = 0; i <= 4; i++) {
    const f = i / 4;
    leftWall.push(add(TOP.x + f * L.x, TOP.y + f * L.y, TOP.x + f * L.x + V.x, TOP.y + f * L.y + V.y));
  }
  for (let j = 0; j <= 2; j++) {
    const f = j / 2;
    leftWall.push(add(TOP.x + f * V.x, TOP.y + f * V.y, TOP.x + L.x + f * V.x, TOP.y + L.y + f * V.y));
  }
  const rightWall = [];
  for (let i = 0; i <= 4; i++) {
    const f = i / 4;
    rightWall.push(add(TOP.x + f * R.x, TOP.y + f * R.y, TOP.x + f * R.x + V.x, TOP.y + f * R.y + V.y));
  }
  for (let j = 0; j <= 2; j++) {
    const f = j / 2;
    rightWall.push(add(TOP.x + f * V.x, TOP.y + f * V.y, TOP.x + R.x + f * V.x, TOP.y + R.y + f * V.y));
  }
  return { floor, leftWall, rightWall };
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
