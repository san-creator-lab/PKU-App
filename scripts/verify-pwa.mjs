// Verifies the PWA against the production build (vite preview):
// manifest completeness, service worker control, offline app-shell serving,
// and offline-created entries surviving reload + reconnect.
// Usage: node scripts/verify-pwa.mjs [baseUrl]
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:4173'
const results = []
const ok = (name, pass, extra = '') => {
  results.push(pass)
  console.log(`${pass ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`)
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()

// --- manifest -----------------------------------------------------------------
await page.goto(base, { waitUntil: 'networkidle' })
const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
ok('manifest linked', Boolean(manifestHref), manifestHref ?? '')
const manifest = await page.evaluate(async (href) => {
  const res = await fetch(href)
  return res.json()
}, manifestHref)
ok(
  'manifest complete (name/icons/display/theme)',
  manifest.name === 'Hero Fuel' &&
    manifest.display === 'standalone' &&
    manifest.theme_color === '#0F1B2D' &&
    manifest.icons?.length >= 3 &&
    manifest.icons.some((i) => i.purpose === 'maskable'),
  `${manifest.icons?.length} icons`,
)
const iconOk = await page.evaluate(async () => {
  const res = await fetch('/pwa-512x512.png')
  return res.ok && (res.headers.get('content-type') ?? '').includes('image')
})
ok('icon assets served', iconOk)

// --- service worker ------------------------------------------------------------
const swState = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready
  return reg.active?.state ?? 'none'
})
ok('service worker active', swState === 'activated', swState)

// --- sign up (online) -----------------------------------------------------------
await page.getByRole('button', { name: /start missie/i }).click()
await page.getByRole('button', { name: /nieuw team starten/i }).click()
await page.locator('#su-name').fill('Offline Tester')
await page.locator('#su-email').fill(`pwa${Date.now()}@test.nl`)
await page.locator('#su-pass').fill('pwageheim1')
await page.getByRole('button', { name: /account maken/i }).click()
await page.waitForSelector('text=/teamcode/i', { timeout: 15000 })
await page.getByRole('button', { name: /naar jullie basis/i }).click()
await page.waitForSelector('text=/missies van vandaag/i')
// ensure SW has the page controlled before going offline
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('text=/missies van vandaag/i')

// --- offline: app shell + logging ------------------------------------------------
await ctx.setOffline(true)
await page.reload({ waitUntil: 'domcontentloaded' })
const shellOffline = await page
  .waitForSelector('text=/missies van vandaag/i', { timeout: 15000 })
  .then(() => true)
  .catch(() => false)
ok('app shell loads while offline (SW cache)', shellOffline)
const banner = await page.getByText(/offline — alles wordt bewaard/i).isVisible()
ok('offline banner shown', banner)

await page.getByRole('button', { name: /brandstof loggen/i }).click()
await page.getByRole('tab', { name: /zelf invullen/i }).click()
await page.locator('#m-grams').fill('1,3')
await page.locator('#m-name').fill('Offline snack')
await page.getByRole('button', { name: /loggen!/i }).click()
await page.waitForSelector('text=Offline snack', { timeout: 10000 })
ok('entry logged while offline', true)
for (let i = 0; i < 4; i++) {
  const btn = page.getByRole('button', { name: /te gek/i })
  if (await btn.isVisible().catch(() => false)) {
    await btn.click({ force: true })
    await page.waitForTimeout(400)
  } else break
}
await page.screenshot({ path: 'test-results/40-offline-logged.png' })

// survive an offline reload
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForSelector('text=Offline snack', { timeout: 15000 })
ok('offline entry survives offline reload', true)

// --- reconnect --------------------------------------------------------------------
await ctx.setOffline(false)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('text=Offline snack', { timeout: 15000 })
const bannerGone = !(await page
  .getByText(/offline — alles wordt bewaard/i)
  .isVisible()
  .catch(() => false))
ok('entry present after reconnect, banner gone', bannerGone)

// cross-tab visibility after reconnect (realtime path still alive)
const page2 = await ctx.newPage()
await page2.goto(base, { waitUntil: 'networkidle' })
await page2.waitForSelector('text=Offline snack', { timeout: 15000 })
ok('reconnected data visible in second tab', true)

await browser.close()
const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} PWA checks passed`)
process.exit(failed ? 1 : 0)
