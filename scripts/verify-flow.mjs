// End-to-end verification of the core flows at a 390px viewport.
// Drives: onboarding → create family → manual log → library log →
// second tab join-by-code → realtime cross-tab sync timing.
// Usage: node scripts/verify-flow.mjs [baseUrl] [shotDir]
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173'
const shotDir = process.argv[3] ?? 'test-results'
const results = []

function ok(name, pass, extra = '') {
  results.push({ name, pass, extra })
  console.log(`${pass ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`)
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'nl-NL',
})
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

// ---- onboarding: splash → new team ----------------------------------------
await page.goto(base, { waitUntil: 'networkidle' })
await page.screenshot({ path: `${shotDir}/01-splash.png` })
ok('splash renders', await page.getByText('Hero Fuel').first().isVisible())

await page.getByRole('button', { name: /start missie/i }).click()
await page.getByRole('button', { name: /nieuw team starten/i }).click()
await page.locator('#su-name').fill('Sanne')
await page.locator('#su-email').fill('sanne@test.nl')
await page.locator('#su-pass').fill('supergeheim1')
await page.screenshot({ path: `${shotDir}/02-signup.png` })
await page.getByRole('button', { name: /account maken/i }).click()

await page.waitForSelector('text=/teamcode/i', { timeout: 15000 })
const codeText = await page
  .locator('div', { hasText: /^\d{6}$/ })
  .last()
  .textContent()
const familyCode = (codeText ?? '').trim()
ok('family code shown after signup', /^\d{6}$/.test(familyCode), familyCode)
await page.screenshot({ path: `${shotDir}/03-family-code.png` })

await page.getByRole('button', { name: /naar jullie basis/i }).click()
await page.waitForSelector('text=/missies van vandaag/i', { timeout: 15000 })
ok('hero dashboard reached', true)
await page.screenshot({ path: `${shotDir}/04-dashboard-charging.png` })

// ---- manual log -------------------------------------------------------------
await page.getByRole('button', { name: /brandstof loggen/i }).click()
await page.getByRole('tab', { name: /zelf invullen/i }).click()
await page.locator('#m-grams').fill('2,1')
await page.locator('#m-name').fill('Rijstwafel met jam')
await page.screenshot({ path: `${shotDir}/05-manual-entry.png` })
await page.getByRole('button', { name: /loggen!/i }).click()
await page.waitForSelector('text=Rijstwafel met jam', { timeout: 10000 })
ok('manual entry appears on dashboard', true)
const meterValue = await page.locator('text=2,1').first().isVisible()
ok('power meter shows 2,1', meterValue)

// badge modal (first mission) should have appeared → dismiss any
const badgeButton = page.getByRole('button', { name: /te gek/i })
if (await badgeButton.isVisible().catch(() => false)) {
  await page.screenshot({ path: `${shotDir}/06-badge-modal.png` })
  ok('first-mission badge modal shown', true)
  await badgeButton.click()
} else {
  ok('first-mission badge modal shown', false, 'no modal')
}

// ---- library log ------------------------------------------------------------
await page.getByRole('link', { name: /handboek/i }).click()
await page.waitForSelector('text=/heldenhandboek/i')
await page.getByLabel(/zoek eten/i).fill('appel')
await page.screenshot({ path: `${shotDir}/07-library-search.png` })
await page.getByRole('button', { name: /Appel/ }).first().click()
await page.waitForSelector('text=/per portie/i')
await page.screenshot({ path: `${shotDir}/08-servings-sheet.png` })
await page.getByRole('button', { name: /loggen!/i }).click()
await page.waitForSelector('text=/missies van vandaag/i', { timeout: 10000 })
ok('library entry logged, back on dashboard', true)
await page.screenshot({ path: `${shotDir}/09-dashboard-2-entries.png` })

// ---- second device: hero joins via family code (fresh context = fresh device;
// LocalBackend realtime is BroadcastChannel-scoped, so same context, new page) --
const heroPage = await ctx.newPage()
heroPage.on('pageerror', (e) => errors.push(`hero: ${e.message}`))
await heroPage.goto(base, { waitUntil: 'networkidle' })
// this page shares localStorage → already signed in; sign out to simulate fresh
await heroPage.evaluate(() => localStorage.removeItem('hero-fuel-local-session'))
await heroPage.reload({ waitUntil: 'networkidle' })
await heroPage.getByRole('button', { name: /start missie/i }).click()
await heroPage.getByRole('button', { name: /join met teamcode/i }).click()
await heroPage.getByRole('radio', { name: /held/i }).click()
await heroPage.locator('#j-code').fill(familyCode)
await heroPage.locator('#j-name').fill('Max')
await heroPage.locator('#j-email').fill('max@test.nl')
await heroPage.locator('#j-pass').fill('maxgeheim1')
await heroPage.screenshot({ path: `${shotDir}/10-join-form.png` })
await heroPage.getByRole('button', { name: /join!/i }).click()
await heroPage.waitForSelector('text=/missies van vandaag/i', { timeout: 15000 })
ok('hero joined family via 6-digit code', true)
const heroSeesEntries = await heroPage.getByText('Rijstwafel met jam').isVisible()
ok('hero sees family entries after join', heroSeesEntries)
await heroPage.screenshot({ path: `${shotDir}/11-hero-dashboard-joined.png` })

// ---- realtime: parent logs, hero page updates live --------------------------
// parent tab is still signed in as Sanne? No — same browser context shares the
// local session, which is now Max. For the LocalBackend demo both tabs share
// the device; realtime = BroadcastChannel. Log on page (now Max's session too)
// and watch heroPage update WITHOUT reload.
await page.reload({ waitUntil: 'networkidle' }) // pick up Max session state
await page.getByRole('button', { name: /brandstof loggen/i }).click()
await page.getByRole('tab', { name: /zelf invullen/i }).click()
await page.locator('#m-grams').fill('1,0')
await page.locator('#m-name').fill('Realtime banaan')
const before = Date.now() // timing starts at submit, per the DoD (~1s budget)
await page.getByRole('button', { name: /loggen!/i }).click()
await heroPage.waitForSelector('text=Realtime banaan', { timeout: 5000 })
const elapsed = Date.now() - before
ok('realtime: entry live in second session', elapsed < 1500, `${elapsed}ms after submit`)
await heroPage.screenshot({ path: `${shotDir}/12-realtime-synced.png` })

// ---- console errors ----------------------------------------------------------
ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))

await browser.close()
const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
