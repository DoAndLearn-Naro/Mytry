import { SCENE } from '../modules/scene.js';
import { FurnitureItem } from './FurnitureItem.js';

/**
 * 3/4 透視房間場景 — Warm Home
 * ──────────────────────────
 * 固定視角，無 camera 控制。
 *   - 牆面：固定直立，佔上方 30%
 *   - 地板：CSS perspective 傾斜向前
 *   - 家具：依 placement 決定在牆或地板，3D 旋轉對齊透視
 *
 * props:
 *   - furnitureCatalog
 *   - placements: 已擺放的家具實例
 *   - selectedPlacementId
 *   - onSelect(placementId)
 *   - onMove(placementId, x, y)
 *   - draggingPlacementId (回饋用)
 */

export function RoomScene({
  furnitureCatalog,
  placements,
  selectedPlacementId,
  onSelect,
  onMove,
  draggingPlacementId,
}) {
  const root = document.createElement('div');
  root.className = 'room-scene';

  root.innerHTML = `
    <div class="room-scene__viewport">
      <div class="room__sky" aria-hidden="true"></div>
      <div class="room__wall-back" aria-hidden="true">
        <div class="room__window" aria-hidden="true"></div>
      </div>
      <div class="room__floor" aria-hidden="true">
        <div class="room__rug" aria-hidden="true"></div>
      </div>
      <div class="room__furniture-layer"></div>
    </div>
  `;

  const layer = root.querySelector('.room__furniture-layer');
  for (const p of placements) {
    const furniture = furnitureCatalog.find((f) => f.id === p.furnitureId);
    if (!furniture) continue;
    const el = FurnitureItem({
      placement: p,
      furniture,
      selected: selectedPlacementId === p.id,
      dragging: draggingPlacementId === p.id,
      onSelect: () => onSelect(p.id),
      onMove: (x, y) => onMove(p.id, x, y),
    });
    layer.appendChild(el);
  }

  return root;
}