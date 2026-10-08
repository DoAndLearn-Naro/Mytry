import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5174,
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
        name: '暖窩 Warm Home',
        short_name: '暖窩',
        description: '在 3/4 視角的房間裡擺放家具，迎接每日的溫暖任務。',
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
      },
      devOptions: { enabled: false, type: 'module' },
    }),
  ],
});