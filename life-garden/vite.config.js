import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Life Garden — Vite + PWA 設定
 *  base: './'  使最終產出可用於 GitHub Pages 任意子路徑
 *         （例：https://user.github.io/Mytry/）
 */
export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'icons/icon-192.png',
        'icons/icon-512.png',
        'sounds/tap.wav',
        'sounds/success.wav',
      ],
      manifest: {
        name: '每日小花園 Life Garden',
        short_name: '小花園',
        description: '陪伴長者的每日任務小花園，點亮燈泡、拍照打卡、讓植物一起成長。',
        lang: 'zh-TW',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFF8E7',
        theme_color: '#5C8D4A',
        categories: ['health', 'lifestyle', 'education'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,wav}'],
        cleanupOutdatedCaches: true,
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
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ],
});