import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Hero Fuel',
        short_name: 'Hero Fuel',
        description:
          'Jouw dagelijkse heldenmissie: houd je brandstof op peil en power je held op!',
        lang: 'nl',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        theme_color: '#0F1B2D',
        background_color: '#0F1B2D',
        categories: ['health', 'kids', 'lifestyle'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // OCR assets are multi-MB: cached at runtime on first scan instead.
        // Non-Latin font subsets are never used by the NL/EN UI.
        globIgnores: [
          'tesseract/**',
          'tessdata/**',
          '**/*{cyrillic,vietnamese,hebrew,greek}*',
        ],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Tesseract wasm + language data are fetched lazily and cached on
        // first use so the install stays small but the scanner works offline
        // afterwards.
        runtimeCaching: [
          {
            urlPattern: /\/(tesseract|tessdata)\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ocr-assets',
              expiration: { maxEntries: 12 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // long-term-cacheable vendor chunks; keeps route chunks small for
        // fast first paint on older phones
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
