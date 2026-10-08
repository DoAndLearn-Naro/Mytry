import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * 暖窩 Warm Home — Vite + PWA 設定（GitHub Pages 子路徑專用）
 * ─────────────────────────────────────────────────────────
 *  base/start_url/scope 全用 './'：
 *    https://<user>.github.io/<repo>/warm-home/ 下 SW 與 manifest 作用域正確，
 *    安裝到主畫面後離線也能從本地快取啟動（資料本來就全放 IndexedDB）。
 */
export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5174,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // SW 註冊只走 src/main.js 手動 register('./sw.js')，避免與自動注入重複註冊
      injectRegister: false,
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'sounds/tap.wav',
        'sounds/success.wav',
      ],
      manifest: {
        name: '暖窩 Warm Home',
        short_name: '暖窩',
        description: '角落式 3D 小房間：拖家具到格子裡，每日小任務＋暖窩日記，離線也能用。',
        lang: 'zh-TW',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F7EFE0',
        theme_color: '#A47148',
        categories: ['health', 'lifestyle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,wav}'],
        cleanupOutdatedCaches: true,
        // 從主畫面離線啟動（navigation request）時回退到 index.html，否則白畫面
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\/sounds\/.*\.(wav|mp3)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sound-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'image-cache' },
          },
        ],
      },
      devOptions: { enabled: false, type: 'module' },
    }),
  ],
});