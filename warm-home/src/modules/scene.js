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
export const VIEW = { x: 244, y: -170, w: 460, h: 690 };

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
  leftWall: { cols: 5, rows: 3 },
  rightWall: { cols: 10, rows: 3 },
};

/**
 * 等級房間（房間變大＝格子變密，畫布不動、不捲動）
 * ─────────────────────────────────────────────
 * Lv1 小暖窩 → Lv2 大客廳 → Lv3 大宅，永遠保持 1:2 等比。
 * GRID 隨 setRoomLevel() 切換（讀取端零改動）；verify 可逐級檢查。
 */
export const LEVEL_GRIDS = {
  1: { floor: { cols: 10, rows: 5 }, leftWall: { cols: 5, rows: 3 }, rightWall: { cols: 10, rows: 3 } },
  2: { floor: { cols: 14, rows: 7 }, leftWall: { cols: 7, rows: 4 }, rightWall: { cols: 14, rows: 4 } },
  3: { floor: { cols: 20, rows: 10 }, leftWall: { cols: 10, rows: 5 }, rightWall: { cols: 20, rows: 5 } },
};

let ACTIVE_LEVEL = 1;
export function setRoomLevel(level) {
  const g = LEVEL_GRIDS[level] || LEVEL_GRIDS[1];
  ACTIVE_LEVEL = LEVEL_GRIDS[level] ? level : 1;
  GRID.floor = { ...g.floor };
  GRID.leftWall = { ...g.leftWall };
  GRID.rightWall = { ...g.rightWall };
  return ACTIVE_LEVEL;
}
export function getRoomLevel() {
  return ACTIVE_LEVEL;
}
export function snapshotGrids() {
  return {
    floor: { ...GRID.floor },
    leftWall: { ...GRID.leftWall },
    rightWall: { ...GRID.rightWall },
  };
}

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
 * 角落透視（直式畫布 v0.7：牆加高填滿 10:15）
 *   O   = (400,220) 後方角（兩牆與地板交會）
 *   R   = (288,144) 地板右緣（10 格）
 *   L   = (-144,72) 地板左緣（5 格）
 *   V   = (0,380)   牆高（3 格，每格約 127）
 *   TOP = (400,-160) 上方角
 * 每步格向量：R/10、L/5、左牆列 L/5、右牆列 R/10 —— 全部等長。
 * ============================================================ */

export const CORNER = {
  O: { x: 400, y: 220 },
  R: { x: 288, y: 144 },
  L: { x: -144, y: 72 },
  V: { x: 0, y: 380 },
  TOP: { x: 400, y: -160 },
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

/** 角落房多邊形（全部由 CORNER 算出，改 TOP/V 自動跟著變） */
export function cornerPolygons() {
  const { O, R, L, TOP } = CORNER;
  const P = (x, y) => `${Math.round(x)},${Math.round(y)}`;
  // 注意：全部用 [x, y] 陣列點（O/TOP 是 {x,y} 物件，不可直接放進陣列解構）
  const o = [O.x, O.y];
  const t = [TOP.x, TOP.y];
  const leftWall = [o, [o[0] + L.x, o[1] + L.y], [t[0] + L.x, t[1] + L.y], t];
  const rightWall = [o, [o[0] + R.x, o[1] + R.y], [t[0] + R.x, t[1] + R.y], t];
  const leftTop0 = t, leftTop1 = [t[0] + L.x, t[1] + L.y];
  const rightTop1 = [t[0] + R.x, t[1] + R.y];
  return {
    leftWall: leftWall.map(([x, y]) => P(x, y)).join(' '),
    rightWall: rightWall.map(([x, y]) => P(x, y)).join(' '),
    floor: [o, [o[0] + R.x, o[1] + R.y], [o[0] + R.x + L.x, o[1] + R.y + L.y], [o[0] + L.x, o[1] + L.y]].map(([x, y]) => P(x, y)).join(' '),
    baseLeft: '256,292 400,364 400,382 256,310',
    baseRight: '400,364 688,220 688,238 400,382',
    baseFront: '256,292 400,364 544,292 544,310 400,382 256,310',
    skirtLeft: '400,220 256,292 256,284 400,212',
    skirtRight: '400,220 688,364 688,356 400,212',
    trimLeft: [leftTop0, leftTop1, [leftTop1[0], leftTop1[1] + 5], [leftTop0[0], leftTop0[1] + 5]].map(([x, y]) => P(x, y)).join(' '),
    trimRight: [t, rightTop1, [rightTop1[0], rightTop1[1] + 5], [t[0], t[1] + 5]].map(([x, y]) => P(x, y)).join(' '),
    cornerLine: { x1: TOP.x, y1: TOP.y, x2: O.x, y2: O.y },
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
  // 由下往上找：地板靠近前排、牆飾靠近視線高度，看起來自然
  for (let y = g.rows - h; y >= 0; y--) rows.push(y);
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

/**
 * 跨級搬家（升級房間時用）：舊格 → 新格等比映射＋夾取＋碰撞排解。
 * 純函式（不碰 DB），回傳 [{ id, plane, gx, gy }]，由呼叫端寫入。
 */
export function migratePlacementsToGrids(placements, furnitureMap, oldShapes) {
  const out = [];
  // 先算目標（用目前 GRID＝新等級）
  const targets = placements.map((p) => {
    const f = furnitureMap[p.furnitureId];
    if (!f) return null;
    const plane = resolvePlane(p, f);
    const size = rotatedGridSize(f, p.rotation || 0);
    const old = oldShapes[plane] || oldShapes.floor;
    const now = getGridShape(plane);
    let gx = Math.round((p.gx ?? 0) * (now.cols / old.cols));
    let gy = Math.round((p.gy ?? 0) * (now.rows / old.rows));
    gx = Math.max(0, Math.min(now.cols - size.w, gx));
    gy = Math.max(0, Math.min(now.rows - size.h, gy));
    return { p, f, plane, size, gx, gy };
  }).filter(Boolean);
  // 依序卡位，撞到就近找空格（比較基準一律用新格座標）
  for (const t of targets) {
    let { gx, gy } = t;
    const view = targets
      .filter((o) => o.p.id !== t.p.id)
      .map((o) => {
        const done = out.find((d) => d.id === o.p.id);
        return done
          ? { id: o.p.id, furnitureId: o.p.furnitureId, plane: done.plane, gx: done.gx, gy: done.gy, rotation: o.p.rotation || 0 }
          : { id: o.p.id, furnitureId: o.p.furnitureId, plane: o.plane, gx: o.gx, gy: o.gy, rotation: o.p.rotation || 0 };
      });
    if (!isAreaFree(view, furnitureMap, t.p.id, t.plane, gx, gy, t.size.w, t.size.h)) {
      const free = findFreeCell(view, furnitureMap, t.f, t.plane)
        || (t.plane !== 'floor' ? findFreeCell(view, furnitureMap, t.f, t.plane === 'leftWall' ? 'rightWall' : 'leftWall') : null);
      if (free) {
        t.plane = free.plane;
        gx = free.gx;
        gy = free.gy;
      }
    }
    const pt = cornerCellToXY(t.plane, gx, gy, t.size.w, t.size.h);
    out.push({ id: t.p.id, furnitureId: t.p.furnitureId, plane: t.plane, gx: pt.gx, gy: pt.gy, x: pt.x, y: pt.y, rotation: t.p.rotation || 0 });
  }
  return out;
}
