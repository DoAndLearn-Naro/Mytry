import './styles/main.css';
import { mountApp } from './App.js';

const host = document.getElementById('app');
mountApp(host).catch((err) => {
  console.error('[Life Garden] 啟動失敗', err);
  host.innerHTML = `
    <div style="padding:24px;font-size:22px;color:#b5466a;">
      小花園目前無法啟動，請重新整理試試。<br/>
      <small style="font-size:14px;color:#666;">${(err && err.message) || err}</small>
    </div>
  `;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('[SW] 註冊失敗', err);
      });
    }
  });
}