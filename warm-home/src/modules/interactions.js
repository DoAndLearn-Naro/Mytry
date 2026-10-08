/**
 * 隨機互動 — Warm Home v0.2
 * ───────────────────────
 * A. 點擊隨機：點家具 → 隨機一句話 / 小動畫 / 偶爾推薦小任務
 * B. 放置型隨機事件：閒置一段時間 → 隨機一件家具冒泡
 *    （植物口渴、貓跑來、夕陽、整點報時…），點泡泡可完成 + water++
 */

export const CLICK_CHANCE = {
  chatter: 0.6,   // 純問候
  hint: 0.25,     // 推薦該家具的一個任務
  bounce: 0.15,   // 只彈跳發光
};

const FALLBACK_CHATTER = [
  '今天過得好嗎？😊',
  '看到你真開心！',
  '慢慢來，沒關係',
];

const EVENT_POOL = {
  plant: [
    { icon: '💧', text: '植物有點口渴了，點我澆水！', water: 1 },
    { icon: '🌤️', text: '植物想曬曬太陽', water: 1 },
  ],
  sofa: [
    { icon: '🐱', text: '有隻貓跑來沙發睡覺了！', water: 1 },
    { icon: '☕', text: '坐下來喝杯水吧', water: 1 },
  ],
  'rocking-chair': [
    { icon: '🍃', text: '微風吹來，搖椅輕輕晃', water: 1 },
  ],
  'tea-table': [
    { icon: '🍵', text: '茶泡好了，快來喝一口！', water: 1 },
  ],
  bed: [
    { icon: '💤', text: '該午休一下了嗎？', water: 1 },
  ],
  clock: [
    { icon: '🕐', text: '整點報時！看看現在幾點', water: 1 },
  ],
  window: [
    { icon: '🌇', text: '窗外有夕陽，快看看！', water: 1 },
    { icon: '🐦', text: '窗外有鳥叫喔', water: 1 },
  ],
  cup: [
    { icon: '💧', text: '記得喝口溫水', water: 1 },
  ],
  lamp: [
    { icon: '💡', text: '天暗了，把燈打開吧', water: 1 },
  ],
  frame: [
    { icon: '🖼️', text: '回憶在發光，點開日記看看吧', water: 1 },
  ],
  'spring-couplet': [
    { icon: '🧧', text: '福氣到！今天也會順順的', water: 1 },
  ],
};

const GLOBAL_EVENTS = [
  { icon: '🍃', text: '微風吹進房間，好舒服' },
  { icon: '☀️', text: '陽光灑進來了' },
  { icon: '📮', text: '好像有信來了，去門口看看？' },
];

export function pick(arr) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getChatterFor(furniture) {
  const pool = (furniture && furniture.chatter && furniture.chatter.length)
    ? furniture.chatter
    : FALLBACK_CHATTER;
  return pick(pool);
}

/** 點擊家具 → 隨機互動結果 */
export function rollClickInteraction(furniture) {
  const r = Math.random();
  if (r < CLICK_CHANCE.bounce) {
    return { kind: 'bounce', text: null, animation: 'bounce' };
  }
  if (r < CLICK_CHANCE.bounce + CLICK_CHANCE.hint && furniture?.tasks?.length) {
    const t = pick(furniture.tasks);
    return { kind: 'hint', text: `要不要「${t.title}」？去今日任務找我喔 💡`, taskId: t.id, animation: 'bounce' };
  }
  return { kind: 'chatter', text: getChatterFor(furniture), animation: 'bounce' };
}

/** 閒置事件 → 挑一件已擺家具 + 事件文案 */
export function rollIdleEvent(placements, furnitureMap) {
  if (!placements.length) return null;
  const p = pick(placements);
  if (!p) return null;
  const f = furnitureMap[p.furnitureId];
  if (!f) return null;
  const pool = EVENT_POOL[f.id] || EVENT_POOL[p.furnitureId];
  let evt = pool ? pick(pool) : null;
  if (!evt) {
    const g = pick(GLOBAL_EVENTS);
    evt = { icon: g.icon, text: g.text, water: 1 };
  }
  return {
    placementId: p.id,
    furnitureId: f.id,
    furnitureLabel: f.label,
    furnitureEmoji: f.emoji,
    icon: evt.icon,
    text: evt.text,
    water: evt.water ?? 1,
    createdAt: Date.now(),
  };
}

/** 事件冷卻：預設 90 秒內不重複跳 */
export function isCoolingDown(lastEventAt, cooldownMs = 90 * 1000) {
  if (!lastEventAt) return false;
  return Date.now() - lastEventAt < cooldownMs;
}
