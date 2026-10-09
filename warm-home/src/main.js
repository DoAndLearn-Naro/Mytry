import './styles/main.css';
import { mountApp } from './App.js';

const host = document.getElementById('app');
mountApp(host).catch((err) => {
  console.error('[Warm Home] 啟動失敗', err);
  host.innerHTML = `
    <div style="padding:24px;font-size:22px;color:#b5466a;">
      暖窩目前無法啟動，請重新整理試試。<br/>
      <small style="font-size:14px;color:#666;">${(err && err.message) || err}</small>
    </div>
  `;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
      // 新版 SW 接管就自動重整一次：F5 跟強制刷新看到同一版，
      // 長輩也不會卡在舊版。首次安裝不重整（避免迴圈）。
      let firstInstall = !navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (firstInstall) {
          firstInstall = false;
          return;
        }
        window.location.reload();
      });
    }
  });
}