/**
 * 家具型錄 — Warm Home v0.2（模組化）
 * ────────────────────────────────
 * 每件家具 = 可拖到房間格子裡的物件，格式（後期加新款照抄即可）：
 * {
 *   id, label, emoji, category, placement: 'floor'|'wall',
 *   footprint: { w, h },      // 格子單位（畫布座標，跟著房間等比縮放，全螢幕一致）
 *   gridSize: { w, h },       // 格子佔位（Lv1: 地板 10×5 / 左牆 5×3 / 右牆 10×3）
 *   unlockLevel: 1,           // 幾等解鎖（缺失視為 Lv1）
 *   tasks: [{ id, icon, title, prompt, needsPhoto, water }],
 *   chatter: ['點我時隨機說的話', ...],   // 點擊隨機互動用
 * }
 *
 * 後期擴充（臥室/廚房/客廳/飾品組）只需：
 *   管理員 JSON → { version, furniture: [ ...同格式 ] } → 自動寫入 DB。
 */

export const DEFAULT_FURNITURE = [
  /* ============ 地板型家具 ============ */
  {
    id: 'bed',
    label: '床',
    emoji: '🛏️',
    category: 'bedroom',
    placement: 'floor',
    footprint: { w: 157, h: 143 },
    gridSize: { w: 4, h: 3 },
    tasks: [
      { id: 'bed-morning', icon: '🌅', title: '起床拍窗外', prompt: '起床後走到窗邊，拍一張窗外的照片。', needsPhoto: true, water: 1 },
      { id: 'bed-stretch', icon: '🙆', title: '睡前伸展 1 分鐘', prompt: '在床上慢慢伸展手腳各 10 秒。', needsPhoto: false, water: 1 },
    ],
    chatter: ['好好休息，精神才會好 💤', '被子有蓋好嗎？別著涼了', '睡前伸展一下更好睡'],
  },
  {
    id: 'sofa',
    label: '沙發',
    emoji: '🛋️',
    category: 'living',
    placement: 'floor',
    footprint: { w: 90, h: 110 },
    gridSize: { w: 3, h: 1 },
    tasks: [
      { id: 'sofa-sit', icon: '🪟', title: '坐在沙發看窗外 5 分鐘', prompt: '坐到沙發上，慢慢看看窗外。', needsPhoto: false, water: 1 },
      { id: 'sofa-photo', icon: '📸', title: '拍沙發旁邊的角落', prompt: '從沙發位置拍一張你最喜歡的角落。', needsPhoto: true, water: 1 },
    ],
    chatter: ['坐下來歇一會兒吧 ☕', '沙發軟軟的，很舒服呢', '看看窗外，放鬆眼睛'],
  },
  {
    id: 'desk',
    label: '書桌',
    emoji: '🪑',
    category: 'work',
    placement: 'floor',
    footprint: { w: 90, h: 103 },
    gridSize: { w: 3, h: 1 },
    tasks: [
      { id: 'desk-tidy', icon: '🧹', title: '整理桌面拍一張', prompt: '把桌面整理好，拍一張整齊的照片。', needsPhoto: true, water: 2 },
      { id: 'desk-write', icon: '✏️', title: '寫下今天的心情', prompt: '在紙上寫一句話（或口述一兩句）今天的心情。', needsPhoto: false, water: 1 },
    ],
    chatter: ['桌子整齊，心情也整齊 ✨', '寫幾個字，動動腦', '喝口水再繼續'],
  },
  {
    id: 'plant',
    label: '植物',
    emoji: '🪴',
    category: 'nature',
    placement: 'floor',
    footprint: { w: 45, h: 73 },
    gridSize: { w: 1, h: 1 },
    tasks: [
      { id: 'plant-water', icon: '💧', title: '幫植物澆水拍一張', prompt: '幫植物澆點水，拍一張它的照片。', needsPhoto: true, water: 2 },
      { id: 'plant-name', icon: '🏷️', title: '幫植物取名字', prompt: '在心裡（或說出來）幫它取個名字。', needsPhoto: false, water: 1 },
    ],
    chatter: ['我有點口渴了 💧', '今天有曬到太陽嗎？🌤️', '摸摸葉子，很有精神！'],
  },
  {
    id: 'lamp',
    label: '立燈',
    emoji: '🪔',
    category: 'light',
    placement: 'floor',
    footprint: { w: 45, h: 82 },
    gridSize: { w: 1, h: 1 },
    tasks: [
      { id: 'lamp-turn-on', icon: '💡', title: '開燈看書 5 分鐘', prompt: '打開立燈，找本書翻 5 分鐘。', needsPhoto: false, water: 1 },
      { id: 'lamp-mood', icon: '🌙', title: '睡前關燈深呼吸', prompt: '睡前關燈，慢慢深呼吸 3 次。', needsPhoto: false, water: 1 },
    ],
    chatter: ['燈亮了，房間暖暖的 💡', '光線剛剛好，適合看書', '晚上早點休息喔 🌙'],
  },
  {
    id: 'chair',
    label: '椅子',
    emoji: '🪑',
    category: 'living',
    placement: 'floor',
    footprint: { w: 45, h: 78 },
    gridSize: { w: 1, h: 1 },
    tasks: [
      { id: 'chair-twist', icon: '🔄', title: '坐著轉身活動 1 分鐘', prompt: '坐在椅子上，慢慢轉身往左右看。', needsPhoto: false, water: 1 },
    ],
    chatter: ['坐挺挺，對腰比較好', '轉轉肩膀，放鬆一下 🔄'],
  },
  {
    id: 'cup',
    label: '杯子',
    emoji: '☕',
    category: 'kitchen',
    placement: 'floor',
    footprint: { w: 45, h: 87 },
    gridSize: { w: 1, h: 1 },
    tasks: [
      { id: 'cup-drink', icon: '🥤', title: '喝一杯溫水', prompt: '幫自己倒杯水，慢慢喝完。', needsPhoto: false, water: 1 },
      { id: 'cup-photo', icon: '📸', title: '拍今天喝的第一杯飲品', prompt: '拍下你今天喝的第一杯飲品。', needsPhoto: true, water: 1 },
    ],
    chatter: ['記得喝水，一天要喝幾杯喔 💧', '溫溫的茶最好喝了 🍵'],
  },
  /* ---- v0.2 示範新款（後期格式驗證用） ---- */
  {
    id: 'rocking-chair',
    label: '搖椅',
    emoji: '🪑',
    category: 'living',
    placement: 'floor',
    footprint: { w: 45, h: 82 },
    gridSize: { w: 1, h: 1 },
    unlockLevel: 2,
    tasks: [
      { id: 'rock-relax', icon: '🍃', title: '搖椅上深呼吸 5 次', prompt: '坐在搖椅上輕輕搖，慢慢深呼吸 5 次。', needsPhoto: false, water: 1 },
      { id: 'rock-photo', icon: '📸', title: '拍搖椅旁的光影', prompt: '拍一張搖椅旁灑進來的光。', needsPhoto: true, water: 1 },
    ],
    chatter: ['搖啊搖，心情鬆鬆的 🍃', '阿嬤以前也愛坐搖椅呢', '慢慢搖，別急'],
  },
  {
    id: 'tea-table',
    label: '茶几',
    emoji: '🍵',
    category: 'living',
    placement: 'floor',
    footprint: { w: 90, h: 83 },
    gridSize: { w: 3, h: 1 },
    unlockLevel: 2,
    tasks: [
      { id: 'tea-drink', icon: '🍵', title: '泡一壺茶慢慢喝', prompt: '泡一壺茶，和家人或自己慢慢喝。', needsPhoto: false, water: 1 },
      { id: 'tea-photo', icon: '📸', title: '拍今天的茶具', prompt: '把茶具擺好，拍一張照片。', needsPhoto: true, water: 1 },
    ],
    chatter: ['茶香香，人暖暖 🍵', '有客人來就可以泡茶了', '茶杯要拿穩喔'],
  },

  /* ============ 牆面型家具 ============ */
  {
    id: 'frame',
    label: '畫框',
    emoji: '🖼️',
    category: 'wall',
    placement: 'wall',
    footprint: { w: 67, h: 51 },
    gridSize: { w: 2, h: 1 },
    tasks: [
      { id: 'frame-choose', icon: '🖼️', title: '挑今天拍的照片掛上去', prompt: '從今天拍的照片挑一張掛到畫框裡。', needsPhoto: true, water: 2 },
    ],
    chatter: ['這張照片真好看 🖼️', '回憶掛在牆上，天天看得到'],
  },
  {
    id: 'clock',
    label: '時鐘',
    emoji: '🕐',
    category: 'wall',
    placement: 'wall',
    footprint: { w: 45, h: 45 },
    gridSize: { w: 1, h: 1 },
    tasks: [
      { id: 'clock-now', icon: '🕐', title: '說說現在的時間', prompt: '看看時鐘，說出現在是幾點。', needsPhoto: false, water: 1 },
    ],
    chatter: ['現在幾點了呢？🕐', '滴答滴答，時間過得真快', '記得按時吃藥喔'],
  },
  {
    id: 'window',
    label: '窗戶',
    emoji: '🪟',
    category: 'wall',
    placement: 'wall',
    footprint: { w: 67, h: 48 },
    gridSize: { w: 2, h: 1 },
    tasks: [
      { id: 'window-sky', icon: '☁️', title: '拍一張窗外天空', prompt: '從窗戶拍一張天空的照片。', needsPhoto: true, water: 2 },
      { id: 'window-tree', icon: '🌳', title: '看看窗外有幾棵樹', prompt: '從窗戶數數看得到幾棵樹。', needsPhoto: false, water: 1 },
    ],
    chatter: ['今天天氣好好 ☀️', '窗外有鳥叫嗎？🐦', '開窗通風，空氣真好'],
  },
  {
    id: 'spring-couplet',
    label: '春聯',
    emoji: '🧧',
    category: 'wall',
    placement: 'wall',
    footprint: { w: 45, h: 56 },
    gridSize: { w: 1, h: 1 },
    tasks: [
      { id: 'couplet-read', icon: '🧧', title: '念一次春聯', prompt: '大聲念一次春聯上的吉祥話。', needsPhoto: false, water: 1 },
    ],
    chatter: ['福到家門口 🧧', '平安健康最重要', '過年要到了，真熱鬧'],
  },
];

export function getFurnitureItem(id, catalog = []) {
  return catalog.find((f) => f.id === id) || DEFAULT_FURNITURE.find((f) => f.id === id) || null;
}

/** 後期內容包格式檢查（給 AdminPanel / contentPack 用） */
export function normalizeFurniture(raw) {
  if (!raw || !raw.id || !raw.label) return null;
  return {
    id: String(raw.id),
    label: String(raw.label),
    emoji: raw.emoji || '🪑',
    category: raw.category || 'living',
    placement: raw.placement === 'wall' ? 'wall' : 'floor',
    footprint: raw.footprint || { w: 100, h: 100 },
    gridSize: raw.gridSize || { w: 1, h: 1 },
    unlockLevel: raw.unlockLevel || 1,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    chatter: Array.isArray(raw.chatter) ? raw.chatter : [],
    builtin: false,
  };
}
