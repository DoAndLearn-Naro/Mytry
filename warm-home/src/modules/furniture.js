/**
 * 家具型錄 — Warm Home
 * ────────────────────
 * 每件家具 = 一個可以拖到房間裡的物件。
 * 每件家具自帶 1-3 個任務模板，完成任務 = 家具「溫暖化」（water++）
 *
 * 座標系統：房間為 800×600 的邏輯畫布（實際 CSS 縮放）
 *   - floor 型：x ∈ [50, 750], y ∈ [350, 580]（地板平面）
 *   - wall  型：x ∈ [60, 740], y ∈ [60, 220]（牆面區域）
 */

export const DEFAULT_FURNITURE = [
  /* ============ 地板型家具 ============ */
  {
    id: 'bed',
    label: '床',
    emoji: '🛏️',
    category: 'bedroom',
    placement: 'floor',
    footprint: { w: 180, h: 110 },
    tasks: [
      { id: 'bed-morning', icon: '🌅', title: '起床拍窗外', prompt: '起床後走到窗邊，拍一張窗外的照片。', needsPhoto: true, water: 1 },
      { id: 'bed-stretch', icon: '🙆', title: '睡前伸展 1 分鐘', prompt: '在床上慢慢伸展手腳各 10 秒。', needsPhoto: false, water: 1 },
    ],
  },
  {
    id: 'sofa',
    label: '沙發',
    emoji: '🛋️',
    category: 'living',
    placement: 'floor',
    footprint: { w: 170, h: 90 },
    tasks: [
      { id: 'sofa-sit', icon: '🪟', title: '坐在沙發看窗外 5 分鐘', prompt: '坐到沙發上，慢慢看看窗外。', needsPhoto: false, water: 1 },
      { id: 'sofa-photo', icon: '📸', title: '拍沙發旁邊的角落', prompt: '從沙發位置拍一張你最喜歡的角落。', needsPhoto: true, water: 1 },
    ],
  },
  {
    id: 'desk',
    label: '書桌',
    emoji: '🪑',
    category: 'work',
    placement: 'floor',
    footprint: { w: 150, h: 90 },
    tasks: [
      { id: 'desk-tidy', icon: '🧹', title: '整理桌面拍一張', prompt: '把桌面整理好，拍一張整齊的照片。', needsPhoto: true, water: 2 },
      { id: 'desk-write', icon: '✏️', title: '寫下今天的心情', prompt: '在紙上寫一句話（或口述一兩句）今天的心情。', needsPhoto: false, water: 1 },
    ],
  },
  {
    id: 'plant',
    label: '植物',
    emoji: '🪴',
    category: 'nature',
    placement: 'floor',
    footprint: { w: 80, h: 90 },
    tasks: [
      { id: 'plant-water', icon: '💧', title: '幫植物澆水拍一張', prompt: '幫植物澆點水，拍一張它的照片。', needsPhoto: true, water: 2 },
      { id: 'plant-name', icon: '🏷️', title: '幫植物取名字', prompt: '在心裡（或說出來）幫它取個名字。', needsPhoto: false, water: 1 },
    ],
  },
  {
    id: 'lamp',
    label: '立燈',
    emoji: '🪔',
    category: 'light',
    placement: 'floor',
    footprint: { w: 70, h: 110 },
    tasks: [
      { id: 'lamp-turn-on', icon: '💡', title: '開燈看書 5 分鐘', prompt: '打開立燈，找本書翻 5 分鐘。', needsPhoto: false, water: 1 },
      { id: 'lamp-mood', icon: '🌙', title: '睡前關燈深呼吸', prompt: '睡前關燈，慢慢深呼吸 3 次。', needsPhoto: false, water: 1 },
    ],
  },
  {
    id: 'chair',
    label: '椅子',
    emoji: '🪑',
    category: 'living',
    placement: 'floor',
    footprint: { w: 80, h: 80 },
    tasks: [
      { id: 'chair-twist', icon: '🔄', title: '坐著轉身活動 1 分鐘', prompt: '坐在椅子上，慢慢轉身往左右看。', needsPhoto: false, water: 1 },
    ],
  },
  {
    id: 'cup',
    label: '杯子',
    emoji: '☕',
    category: 'kitchen',
    placement: 'floor',
    footprint: { w: 60, h: 60 },
    tasks: [
      { id: 'cup-drink', icon: '🥤', title: '喝一杯溫水', prompt: '幫自己倒杯水，慢慢喝完。', needsPhoto: false, water: 1 },
      { id: 'cup-photo', icon: '📸', title: '拍今天喝的第一杯飲品', prompt: '拍下你今天喝的第一杯飲品。', needsPhoto: true, water: 1 },
    ],
  },

  /* ============ 牆面型家具 ============ */
  {
    id: 'frame',
    label: '畫框',
    emoji: '🖼️',
    category: 'wall',
    placement: 'wall',
    footprint: { w: 110, h: 130 },
    tasks: [
      { id: 'frame-choose', icon: '🖼️', title: '挑今天拍的照片掛上去', prompt: '從今天拍的照片挑一張掛到畫框裡。', needsPhoto: true, water: 2 },
    ],
  },
  {
    id: 'clock',
    label: '時鐘',
    emoji: '🕐',
    category: 'wall',
    placement: 'wall',
    footprint: { w: 80, h: 80 },
    tasks: [
      { id: 'clock-now', icon: '🕐', title: '說說現在的時間', prompt: '看看時鐘，說出現在是幾點。', needsPhoto: false, water: 1 },
    ],
  },
  {
    id: 'window',
    label: '窗戶',
    emoji: '🪟',
    category: 'wall',
    placement: 'wall',
    footprint: { w: 140, h: 130 },
    tasks: [
      { id: 'window-sky', icon: '☁️', title: '拍一張窗外天空', prompt: '從窗戶拍一張天空的照片。', needsPhoto: true, water: 2 },
      { id: 'window-tree', icon: '🌳', title: '看看窗外有幾棵樹', prompt: '從窗戶數數看得到幾棵樹。', needsPhoto: false, water: 1 },
    ],
  },
];

export function getFurnitureItem(id, catalog = []) {
  return catalog.find((f) => f.id === id) || DEFAULT_FURNITURE.find((f) => f.id === id) || null;
}