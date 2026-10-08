/**
 * 場景佈局配置 — Life Garden (Phase 2)
 * ────────────────────────────────────
 * 4 個插槽的固定版面（溫馨陽台、正面傾斜視角）：
 *   1) wall.frame-xl    牆面大畫框（z=0）
 *   2) window.sill      窗台小盆栽（z=1）
 *   3) corner.lamp      角落立燈（z=1）
 *   4) floor.rug        地板地毯（z=3）
 */

export const SCENE_PRESET = 'balcony-warm';

export const DEFAULT_LAYOUT = {
  scene: {
    name: '溫馨陽台',
    sky: { from: '#CDE8FF', to: '#FFE9C7' },
    wall: '#F3E2C2',
    floor: '#C8A672',
    windowTrim: '#A8754B',
  },
  slots: [
    {
      id: 'wall.frame-xl',
      label: '牆上大畫框',
      x: 50, y: 26,
      z: 0,
      rotation: -1.5,
      width: 220, height: 160,
      boundTask: 'photo-sky',
      fits: ['frame', 'photo'],
      hint: '拍天空、貼回憶照片',
    },
    {
      id: 'window.sill',
      label: '窗台小盆栽',
      x: 50, y: 58,
      z: 1,
      rotation: 0,
      width: 180, height: 160,
      boundTask: 'photo-plant',
      fits: ['plant', 'object'],
      hint: '幫植物澆水、拍它成長',
    },
    {
      id: 'corner.lamp',
      label: '角落立燈',
      x: 84, y: 56,
      z: 1,
      rotation: 1.5,
      width: 130, height: 220,
      boundTask: 'stretch-arms',
      fits: ['lamp', 'object'],
      hint: '做伸展運動讓燈更亮',
    },
    {
      id: 'floor.rug',
      label: '地板地毯',
      x: 50, y: 82,
      z: 3,
      rotation: 0,
      width: 300, height: 90,
      boundTask: 'walk-around',
      fits: ['rug', 'object'],
      hint: '散步後地毯多一條花紋',
    },
  ],
};

export function getSlotConfig(slotId) {
  return DEFAULT_LAYOUT.slots.find((s) => s.id === slotId) || null;
}

export function getAllSlots() {
  return DEFAULT_LAYOUT.slots;
}

export function getSlotsForTask(taskId) {
  return DEFAULT_LAYOUT.slots.find((s) => s.boundTask === taskId) || null;
}