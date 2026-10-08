/**
 * 教學提示 — Warm Home
 * ────────────────────────
 * 第一次進入時顯示，引導長者：
 *   1) 右下「+ 加家具」打開抽屜
 *   2) 點家具進場景
 *   3) 長按 / 拖曳可移動位置
 *   4) 完成每日任務
 */

export function OnboardingHint({ onDismiss }) {
  const root = document.createElement('div');
  root.className = 'onboard';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');

  const overlay = document.createElement('div');
  overlay.className = 'onboard__overlay';

  const card = document.createElement('div');
  card.className = 'onboard__card';
  card.innerHTML = `
    <div class="onboard__hero">🏠</div>
    <h2 class="onboard__title">歡迎來到暖窩</h2>
    <p class="onboard__sub">這裡是你自己的房間，擺什麼、放哪裡都由你決定。</p>
    <ol class="onboard__steps">
      <li>點下方「<strong>+ 加家具</strong>」打開倉庫抽屜</li>
      <li>點一件家具 → 它會自己進到房間格子</li>
      <li>拖移換格子、↻ 旋轉、🗑️ 收回倉庫</li>
      <li>每天會從你擺的家具裡挑出 <strong>3 個小任務</strong></li>
      <li>每完成一個 → 一張拍立得貼到 📖 日記</li>
      <li>用瀏覽器「<strong>加入主畫面</strong>」，以後沒網路也能開，資料都存在手機裡</li>
    </ol>
    <button class="btn btn--primary" data-act="ok">開始佈置</button>
  `;

  card.querySelector('[data-act="ok"]').addEventListener('click', onDismiss);
  overlay.addEventListener('click', onDismiss);

  root.appendChild(overlay);
  root.appendChild(card);
  requestAnimationFrame(() => root.classList.add('is-open'));
  return root;
}