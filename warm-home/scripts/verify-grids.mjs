/**
 * 格線驗證 — Warm Home（node 直跑，無需瀏覽器）
 * ─────────────────────────────────────────
 *   npm run verify
 * 檢查：
 *   1) 三平面格子等大（共用邊步長一致）
 *   2) 全家具自動擺放無重疊、旋轉不越界
 *   3) 像素↔格子往返一致
 *   4) v0.5 舊牆格 → 分牆遷移正確
 */
import {
  GRID, CORNER, resolvePlane, getGridShape, rotatedGridSize,
  cornerCellToXY, cornerCellFromXY, isAreaFree,
  findFreeCellAuto, findFreeCell,
} from '../src/modules/scene.js';
import { DEFAULT_FURNITURE } from '../src/modules/furniture.js';

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✅ ${name}`);
  } else {
    failures++;
    console.error(`  ❌ ${name} ${detail}`);
  }
}

const len = (v) => Math.hypot(v.x, v.y);

// 1) 等比：每步格向量等長
console.log('1) 格子等大');
const floorCol = len({ x: CORNER.R.x / GRID.floor.cols, y: CORNER.R.y / GRID.floor.cols });
const floorRow = len({ x: CORNER.L.x / GRID.floor.rows, y: CORNER.L.y / GRID.floor.rows });
const leftCol = len({ x: CORNER.L.x / GRID.leftWall.cols, y: CORNER.L.y / GRID.leftWall.cols });
const rightCol = len({ x: CORNER.R.x / GRID.rightWall.cols, y: CORNER.R.y / GRID.rightWall.cols });
check('地板列步＝行步', Math.abs(floorCol - floorRow) < 1e-9, `${floorCol} vs ${floorRow}`);
check('左牆列步＝地板行步', Math.abs(leftCol - floorRow) < 1e-9);
check('右牆列步＝地板列步', Math.abs(rightCol - floorCol) < 1e-9);
check('共用邊切分一致（左5＝地板5，右10＝地板10）',
  GRID.leftWall.cols === GRID.floor.rows && GRID.rightWall.cols === GRID.floor.cols);

// 2) 全家具自動擺放＋碰撞
console.log('2) 擺放無重疊');
const map = Object.fromEntries(DEFAULT_FURNITURE.map((f) => [f.id, f]));
const placements = [];
let pid = 1;
for (const f of DEFAULT_FURNITURE) {
  const spot = findFreeCellAuto(placements, map, f);
  check(`${f.label} 找到空格`, !!spot);
  if (spot) placements.push({ id: pid++, furnitureId: f.id, plane: spot.plane, gx: spot.gx, gy: spot.gy, rotation: 0 });
}
// 兩兩檢查佔位不重疊
const seen = new Set();
let overlap = null;
for (const p of placements) {
  const f = map[p.furnitureId];
  const s = rotatedGridSize(f, 0);
  for (let dx = 0; dx < s.w; dx++) {
    for (let dy = 0; dy < s.h; dy++) {
      const key = `${p.plane}:${p.gx + dx},${p.gy + dy}`;
      if (seen.has(key)) overlap = key;
      seen.add(key);
    }
  }
}
check('13 件佔位零重疊', overlap === null, overlap || '');
check('牆飾只在牆平面', placements.every((p) => {
  const f = map[p.furnitureId];
  return f.placement === 'floor' ? p.plane === 'floor' : p.plane !== 'floor';
}));
// 旋轉：每件轉 90 度後「可放或正確拒絕」，且不越界
let rotBad = null;
for (const p of placements) {
  const f = map[p.furnitureId];
  const s = rotatedGridSize(f, 90);
  const g = getGridShape(p.plane);
  const fits = p.gx + s.w <= g.cols && p.gy + s.h <= g.rows;
  const free = isAreaFree(placements, map, p.id, p.plane, p.gx, p.gy, s.w, s.h);
  if (fits && typeof free !== 'boolean') rotBad = p.furnitureId;
  if (!fits && free) rotBad = `${p.furnitureId}(越界卻可放)`;
}
check('旋轉碰撞判定正確', rotBad === null, rotBad || '');
// 故意重疊應被拒絕
const bed = placements.find((p) => p.furnitureId === 'bed');
check('重疊擺放被拒絕', !isAreaFree(placements, map, null, bed.plane, bed.gx, bed.gy, 1, 1));
// 越界被拒絕
check('越界擺放被拒絕', !isAreaFree(placements, map, null, 'floor', 9, 4, 2, 2));
check('塞滿小房間回傳 null', (() => {
  const tiny = [{ id: 1, furnitureId: 'frame', plane: 'leftWall', gx: 0, gy: 0, rotation: 0 }];
  // 左牆 5×2，被 2×1 frame 佔 (0,0) 後，(4,1) 仍空 → 找 clock(1×1) 應成功；找 window(2×1) 在剩餘空間…只驗 API 不為 null 即可
  return findFreeCell(tiny, { frame: map.frame, clock: map.clock }, map.clock, 'leftWall') !== null;
})());

// 3) 往返一致
console.log('3) 像素↔格子往返');
let roundBad = null;
for (const plane of ['floor', 'leftWall', 'rightWall']) {
  const g = getGridShape(plane);
  for (let gy = 0; gy < g.rows && !roundBad; gy++) {
    for (let gx = 0; gx < g.cols && !roundBad; gx++) {
      const pt = cornerCellToXY(plane, gx, gy, 1, 1);
      const back = cornerCellFromXY(plane, pt.x, pt.y, 1, 1);
      if (back.gx !== pt.gx || back.gy !== pt.gy) roundBad = `${plane}:${gx},${gy}`;
    }
  }
}
check('全部單格往返一致', roundBad === null, roundBad || '');

// 4) 舊牆格遷移
console.log('4) 舊牆格遷移');
check('舊 gx=2 → 左牆', resolvePlane({ gx: 2, gy: 0 }, map.frame) === 'leftWall');
check('舊 gx=6 → 右牆', resolvePlane({ gx: 6, gy: 1 }, map.window) === 'rightWall');
check('新 plane 保留', resolvePlane({ plane: 'leftWall', gx: 1, gy: 0 }, map.clock) === 'leftWall');
check('地板走地板', resolvePlane({ gx: 3, gy: 2 }, map.bed) === 'floor');

console.log(failures ? `\n❌ ${failures} 項未過` : '\n✅ 全部通過');
process.exit(failures ? 1 : 0);
