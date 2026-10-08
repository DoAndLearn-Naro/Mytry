/**
 * 版本遷移 — Warm Home
 * ──────────────────
 * 未來更新流程（固定寫法，後期照抄）：
 *   1) db.js 的 DB_VERSION +1，並在 onupgradeneeded 用 ensure() 建新 store
 *   2) 下面 MIGRATIONS 加一筆 { version, note, migrate }，只做資料轉換
 *   3) APP_VERSION 同步改 package.json / 此檔，開 App 自動跑 runMigrations()
 *
 * 版本史：
 *   v1: 初版（furniture/placements/tasks/photos/polaroids）
 *   v2: + interactions/moods，家具回填 gridSize/chatter
 *   v3: + warehouse，角落座標 O.y 200→220 / V 104→120，重算 x/y
 *   v4: 等比格線（地板 8×4→10×5、統一牆 8×2→左 5×2＋右 10×2），
 *       placements 加 plane，舊座標等比映射＋碰撞排解
 *   v5: （未來範例）+ rooms 多房間：見 migrateV5 註解
 */

export const APP_VERSION = '0.5.0';
export const SCHEMA_VERSION = 4;

import { getMeta, setMeta, getAllPlacements, updatePlacement, getAllFurniture, putFurniture } from './db.js';
import { DEFAULT_FURNITURE } from './furniture.js';
import { rotatedGridSize, cornerCellToXY, isAreaFree, findFreeCell, getGridShape } from './scene.js';

const MIGRATIONS = [
  {
    version: 2,
    note: 'v2：家具回填由 contentPack.ensureDefaultFurniture 處理，此處僅記錄版本',
    migrate: async () => {},
  },
  {
    version: 3,
    note: 'v3：角落座標更新，重算所有 placements 的 x/y；warehouse 空初始化由 DB 升級自動建表',
    migrate: async (ctx) => {
      const placements = await getAllPlacements();
      const map = ctx?.furnitureMap || {};
      for (const p of placements) {
        const f = map[p.furnitureId];
        if (!f) continue;
        const size = rotatedGridSize(f, p.rotation || 0);
        const pt = cornerCellToXY(f.placement, p.gx ?? 0, p.gy ?? 0, size.w, size.h);
        if (pt.x !== p.x || pt.y !== p.y) {
          await updatePlacement(p.id, { x: pt.x, y: pt.y });
        }
      }
    },
  },
  {
    version: 4,
    note: 'v4：等比格線遷移。地板 gx×10/8、gy×5/4；舊統一牆格 0-3→左牆（gx×5/4）、4-7→右牆（gx×10/4），gy 不變；碰撞就近找空格',
    migrate: async (ctx) => {
      // 先刷新內建型錄的格尺寸/顯示尺寸（舊機 DB 還留著 v0.5 的舊值）
      for (const f of DEFAULT_FURNITURE) {
        await putFurniture({ ...f, builtin: true });
      }
      const catalog = await getAllFurniture();
      const map = {};
      for (const f of catalog) map[f.id] = f;
      if (ctx) ctx.furnitureMap = map;
      let placements = await getAllPlacements();
      for (const p of placements) {
        const f = map[p.furnitureId];
        if (!f) continue;
        const size = rotatedGridSize(f, p.rotation || 0);
        let plane, gx, gy;
        if (f.placement === 'floor' && !p.plane) {
          plane = 'floor';
          gx = Math.round((p.gx ?? 0) * 1.25);
          gy = Math.round((p.gy ?? 0) * 1.25);
        } else if (!p.plane) {
          // v0.5 統一牆格 → 分牆
          if ((p.gx ?? 0) < 4) {
            plane = 'leftWall';
            gx = Math.round((p.gx ?? 0) * 1.25);
          } else {
            plane = 'rightWall';
            gx = Math.round(((p.gx ?? 0) - 4) * 2.5);
          }
          gy = p.gy ?? 0;
        } else {
          plane = p.plane;
          gx = p.gx ?? 0;
          gy = p.gy ?? 0;
        }
        const g = getGridShape(plane);
        gx = Math.max(0, Math.min(g.cols - size.w, gx));
        gy = Math.max(0, Math.min(g.rows - size.h, gy));
        placements = await getAllPlacements();
        if (!isAreaFree(placements, map, p.id, plane, gx, gy, size.w, size.h)) {
          const free = findFreeCell(placements, map, f, plane)
            || (plane !== 'floor' ? findFreeCell(placements, map, f, plane === 'leftWall' ? 'rightWall' : 'leftWall') : null);
          if (free) {
            plane = free.plane;
            gx = free.gx;
            gy = free.gy;
          }
        }
        const pt = cornerCellToXY(plane, gx, gy, size.w, size.h);
        await updatePlacement(p.id, { plane, gx: pt.gx, gy: pt.gy, x: pt.x, y: pt.y });
      }
    },
  },
  // {
  //   version: 5,
  //   note: 'v5：placements 加 roomId，預設 room-1；warehouse 同步加 roomId',
  //   migrate: async () => {
  //     const placements = await getAllPlacements();
  //     for (const p of placements) {
  //       if (p.roomId == null) await updatePlacement(p.id, { roomId: 'room-1' });
  //     }
  //   },
  // },
];

export async function runMigrations(ctx) {
  let cur = await getMeta('schemaVersion');
  if (cur == null) {
    // 舊機無版本號：有 placements 即視為 v2（v1 無 interactions/moods 概念但資料相容）
    const hasData = (await getAllPlacements()).length > 0;
    cur = hasData ? 2 : SCHEMA_VERSION;
    if (!hasData) {
      await setMeta('schemaVersion', SCHEMA_VERSION);
      await setMeta('appVersion', APP_VERSION);
      return { migrated: [], from: cur };
    }
  }
  const done = [];
  for (const m of MIGRATIONS) {
    if (m.version > cur && m.version <= SCHEMA_VERSION) {
      await m.migrate(ctx);
      done.push(m.version);
      cur = m.version;
    }
  }
  await setMeta('schemaVersion', SCHEMA_VERSION);
  await setMeta('appVersion', APP_VERSION);
  return { migrated: done, from: cur };
}

export function migrationNotes() {
  return MIGRATIONS.map((m) => `v${m.version}: ${m.note}`);
}
