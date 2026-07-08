import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'

// Single-file demo build ("preview link" artifact): the whole app —
// JS, CSS, fonts — inlined into one HTML document. No service worker and
// no Supabase keys, so it runs on the keyless LocalBackend. The scanner's
// OCR worker assets can't ship in one file; the scanner then gracefully
// offers manual entry.
//   npx vite build --config vite.artifact.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'virtual:pwa-register': fileURLToPath(
        new URL('./scripts/pwa-register-stub.ts', import.meta.url),
      ),
    },
  },
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-artifact',
    chunkSizeWarningLimit: 4000,
    assetsInlineLimit: 100 * 1024 * 1024,
  },
})
