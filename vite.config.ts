import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const BASE_PATH = '/iplgaming/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      devOptions: {
        enabled: true,
        suppressWarnings: true,
      },
      includeAssets: ['vite.svg', 'icons/pwa-192x192.png', 'icons/pwa-512x512.png'],
      manifest: {
        name: 'IPL Gaming',
        short_name: 'IPL Gaming',
        description: 'IPL questions game built as a Progressive Web App',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        icons: [
          {
            src: `${BASE_PATH}icons/pwa-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `${BASE_PATH}icons/pwa-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
})
