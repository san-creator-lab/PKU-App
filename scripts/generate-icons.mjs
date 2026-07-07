// Generates the PWA PNG icons from an inline SVG (same bolt-in-shield mark
// as public/favicon.svg) using the preinstalled Playwright Chromium — no
// external image tools or downloads. Outputs are checked into public/.
// Usage: npm run icons
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
mkdirSync(path.join(root, 'public'), { recursive: true })

// maskable icons need the mark inside the 80% safe zone on a solid bg
const svg = (size, { maskable = false } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1F3350"/>
      <stop offset="1" stop-color="#0F1B2D"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFE14D"/>
      <stop offset="1" stop-color="#FFD700"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#bg)"/>
  <g transform="translate(32 32) scale(${maskable ? 0.72 : 0.92}) translate(-32 -32)">
    <path d="M32 4 L56 11 V29 C56 44 46 55 32 59 C18 55 8 44 8 29 V11 Z"
      fill="#16263D" stroke="#00D4FF" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M36 13 L20 36 H30 L27 51 L45 26 H34 Z"
      fill="url(#bolt)" stroke="#0F1B2D" stroke-width="1.5" stroke-linejoin="round"/>
  </g>
</svg>`

const targets = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'pwa-maskable-512x512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180 },
]

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage()
for (const target of targets) {
  await page.setViewportSize({ width: target.size, height: target.size })
  await page.setContent(
    `<body style="margin:0">${svg(target.size, { maskable: target.maskable })}</body>`,
  )
  await page.locator('svg').screenshot({
    path: path.join(root, 'public', target.file),
    omitBackground: false,
  })
  console.log(`✓ public/${target.file}`)
}
await browser.close()
