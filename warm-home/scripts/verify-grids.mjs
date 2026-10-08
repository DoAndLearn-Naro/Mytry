/**
 * 格線＋等級驗證 — Warm Home（node 直跑，無需瀏覽器）
 * ───────────────────────────────────────────────
 *   npm run verify
 * 每個等級檢查：
 *   1) 三平面格子等大（共用邊步長一致）
 *   2) 全家具自動擺放無重疊、旋轉不越界
 *   3) 像素↔格子往返一致
 * 外加：舊牆格遷移、升級搬家無重疊、等級/XP/解鎖邏輯
 */
import {
  GRID, CORNER, LEVEL_GRIDS, setRoomLevel, getRoomLevel,
  resolvePlane, getGridShape, rotatedGridSize,
  cornerCellToXY, cornerCellFromXY, isAreaFree,
  findFreeCellAuto, findFreeCell, migratePlacementsToGrids,
} from '../src/modules/scene.js';
import { DEFAULT_FURNITURE } from '../src/modules/furniture.js';
import { levelForXp, isUnlocked, LEVELS } from '../src/modules/levels.js';

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
const map = Object.fromEntries(DEFAULT_FURNITURE.map((f) => [f.id, f]));

for (const lv of [1, 2, 3]) {
  setRoomLevel(lv);
  console.log(`—— Lv${lv}（地板 ${GRID.floor.cols}×${GRID.floor.rows}）`);
  check('getRoomLevel 一致', getRoomLevel() === lv);

  // 1) 等比
  const floorCol = len({ x: CORNER.R.x / GRID.floor.cols, y: CORNER.R.y / GRID.floor.cols });
  const floorRow = len({ x: CORNER.L.x / GRID.floor.rows, y: CORNER.L.y / GRID.floor.rows });
  const leftCol = len({ x: CORNER.L.x / GRID.leftWall.cols, y: CORNER.L.y / GRID.leftWall.cols });
  const rightCol = len({ x: CORNER.R.x / GRID.rightWall.cols, y: CORNER.R.y / GRID.rightWall.cols });
  check('地板列步＝行步', Math.abs(floorCol - floorRow) < 1e-9, `${floorCol} vs ${floorRow}`);
  check('左牆列步＝地板行步', Math.abs(leftCol - floorRow) < 1e-9);
  check('右牆列步＝地板列步', Math.abs(rightCol - floorCol) < 1e-9);
  check('共用邊切分一致', GRID.leftWall.cols === GRID.floor.rows && GRID.rightWall.cols === GRID.floor.cols);
  if (lv === 1) check('牆高 3 列（直式畫布）', GRID.leftWall.rows === 3 && GRID.rightWall.rows === 3);

  // 2) 全家具自動擺放＋碰撞
  const placements = [];
  let pid = 1;
  for (const f of DEFAULT_FURNITURE) {
    const spot = findFreeCellAuto(placements, map, f);
    check(`${f.label} 找到空格`, !!spot);
    if (spot) placements.push({ id: pid++, furnitureId: f.id, plane: spot.plane, gx: spot.gx, gy: spot.gy, rotation: 0 });
  }
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
  const bed = placements.find((p) => p.furnitureId === 'bed');
  check('重疊擺放被拒絕', !isAreaFree(placements, map, null, bed.plane, bed.gx, bed.gy, 1, 1));
  check('越界擺放被拒絕', !isAreaFree(placements, map, null, 'floor', GRID.floor.cols - 1, GRID.floor.rows - 1, 2, 2));

  // 3) 往返一致（抽樣：四角＋中央，避免 Lv3 全量太慢）
  const probe = (plane) => {
    const g = getGridShape(plane);
    return [[0, 0], [g.cols - 1, 0], [0, g.rows - 1], [g.cols - 1, g.rows - 1], [Math.floor(g.cols / 2), Math.floor(g.rows / 2)]];
  };
  let roundBad = null;
  for (const plane of ['floor', 'leftWall', 'rightWall']) {
    for (const [gx, gy] of probe(plane)) {
      const pt = cornerCellToXY(plane, gx, gy, 1, 1);
      const back = cornerCellFromXY(plane, pt.x, pt.y, 1, 1);
      if (back.gx !== pt.gx || back.gy !== pt.gy) roundBad = `${plane}:${gx},${gy}`;
    }
  }
  check('抽樣往返一致', roundBad === null, roundBad || '');

  // 升級搬家：Lv1 擺滿 → 搬到本級，零重疊
  if (lv > 1) {
    setRoomLevel(1);
    const tiny = [];
    let tpid = 1;
    for (const f of DEFAULT_FURNITURE) {
      const spot = findFreeCellAuto(tiny, map, f);
      if (spot) tiny.push({ id: tpid++, furnitureId: f.id, plane: spot.plane, gx: spot.gx, gy: spot.gy, rotation: 0 });
    }
    setRoomLevel(lv);
    const moved = migratePlacementsToGrids(tiny, map, LEVEL_GRIDS[1]);
    const seen2 = new Set();
    let overlap2 = null;
    for (const m of moved) {
      const f = map[m.furnitureId];
      const s = rotatedGridSize(f, m.rotation || 0);
      const g = getGridShape(m.plane);
      if (m.gx + s.w > g.cols || m.gy + s.h > g.rows) overlap2 = `${m.furnitureId} 越界`;
      for (let dx = 0; dx < s.w && !overlap2; dx++) {
        for (let dy = 0; dy < s.h; dy++) {
          const key = `${m.plane}:${m.gx + dx},${m.gy + dy}`;
          if (seen2.has(key)) { overlap2 = key; break; }
          seen2.add(key);
        }
      }
    }
    check(`Lv1→Lv${lv} 搬家零重疊`, overlap2 === null, overlap2 || '');
  }
}
setRoomLevel(1);

// 4) 舊牆格遷移＋等級邏輯
console.log('—— 遷移與等級');
check('舊 gx=2 → 左牆', resolvePlane({ gx: 2, gy: 0 }, map.frame) === 'leftWall');
check('舊 gx=6 → 右牆', resolvePlane({ gx: 6, gy: 1 }, map.window) === 'rightWall');
check('新 plane 保留', resolvePlane({ plane: 'leftWall', gx: 1, gy: 0 }, map.clock) === 'leftWall');
check('地板走地板', resolvePlane({ gx: 3, gy: 2 }, map.bed) === 'floor');
check('0XP 是 Lv1', levelForXp(0).level === 1);
check('100XP 升 Lv2', levelForXp(100).level === 2);
check('250XP 升 Lv3', levelForXp(250).level === 3);
check('茶几 Lv1 上鎖、Lv2 解鎖', !isUnlocked(map['tea-table'], 1) && isUnlocked(map['tea-table'], 2));
check('床永遠解鎖', isUnlocked(map.bed, 1));
check('等級表三級', LEVELS.length === 3);

console.log(failures ? `\n❌ ${failures} 項未過` : '\n✅ 全部通過');
process.exit(failures ? 1 : 0);
