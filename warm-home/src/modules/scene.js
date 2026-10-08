/**
 * 場景座標系統 — Warm Home
 * ────────────────────────
 * 邏輯畫布 800 × 600。
 *   牆面區域：x ∈ [80, 720], y ∈ [80, 220]   (back wall)
 *   地板區域：x ∈ [60, 740], y ∈ [360, 580]   (tilted floor)
 *
 * 視角：固定 3/4 俯視，地板透視透過 CSS `transform: perspective + rotateX`
 * 牆面與地板交界處用 CSS clip-path 與傾斜完成。
 */

export const SCENE = {
  width: 800,
  height: 600,
  wall: { x0: 80, x1: 720, y0: 80, y1: 220 },
  floor: { x0: 60, x1: 740, y0: 360, y1: 580 },
};

export function getPlacementZone(placement) {
  return placement === 'wall' ? SCENE.wall : SCENE.floor;
}

export function clampToZone(value, axis, placement) {
  const z = getPlacementZone(placement);
  const min = axis === 'x' ? z.x0 : z.y0;
  const max = axis === 'x' ? z.x1 : z.y1;
  return Math.max(min, Math.min(max, value));
}

export function randomPosition(placement) {
  const z = getPlacementZone(placement);
  return {
    x: Math.round(z.x0 + Math.random() * (z.x1 - z.x0)),
    y: Math.round(z.y0 + Math.random() * (z.y1 - z.y0)),
    rotation: 0,
  };
}