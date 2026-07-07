// Verifies Sidekick HQ: overview, chart with multi-day data, history,
// settings (limit stepper + CSV export), and the gamification day-close
// (streak evaluation over seeded historical days).
// Usage: node scripts/verify-hq.mjs [baseUrl]
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173'
const results = []
const ok = (name, pass, extra = '') => {
  results.push(pass)
  console.log(`${pass ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`)
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

// --- sidekick signup -----------------------------------------------------
await page.goto(base, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /start missie/i }).click()
await page.getByRole('button', { name: /nieuw team starten/i }).click()
await page.locator('#su-name').fill('Papa Jan')
await page.locator('#su-email').fill(`hq${Date.now()}@test.nl`)
await page.locator('#su-pass').fill('hqgeheim1')
await page.getByRole('button', { name: /account maken/i }).click()
await page.waitForSelector('text=/teamcode/i', { timeout: 15000 })
await page.getByRole('button', { name: /naar jullie basis/i }).click()
await page.waitForSelector('text=/missies van vandaag/i')

// --- seed 8 days of history through the store (dev hook) -------------------
await page.evaluate(async () => {
  const store = window.__appStore.getState()
  const iso = (offset) => {
    const d = new Date()
    d.setDate(d.getDate() - offset)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const plan = [
    [7, 5.5], [6, 7.2], [5, 9.4] /* over */, [4, 4.1], [3, 6.8], [2, 7.9], [1, 3.2],
  ]
  for (const [offset, grams] of plan) {
    await store.addEntry({
      food_name: `Dagtotaal test −${offset}d`,
      protein_grams: grams,
      meal_type: 'dinner',
      source: 'manual',
      date: iso(offset),
    })
  }
  await store.addEntry({
    food_name: 'Appel vandaag',
    protein_grams: 0.5,
    meal_type: 'snack',
    source: 'library',
  })
})
// let gamification effects settle, then re-evaluate streaks via reload
await page.waitForTimeout(800)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('text=/missies van vandaag/i')
for (let i = 0; i < 6; i++) {
  const btn = page.getByRole('button', { name: /te gek/i })
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
    await page.waitForTimeout(300)
  } else break
}

// streak: days -7..-1 → under,under,OVER(shield),under,under,under,under = 6
const streakBox = page.locator('text=/dagen streak/i').locator('..')
const streakText = await streakBox.textContent()
const streakMatch = /(\d+)/.exec(streakText ?? '')
ok('streak evaluated over seeded days (6, shield used)',
  streakMatch?.[1] === '6', `streak=${streakMatch?.[1]}`)

// --- HQ overview -----------------------------------------------------------
await page.getByRole('link', { name: /hq/i }).click()
await page.waitForSelector('text=/sidekick hq/i', { timeout: 15000 })
ok('HQ renders', true)
const remaining = await page.getByText(/eiwit-budget over/i).isVisible()
ok('remaining budget shown', remaining)
await page.waitForSelector('svg .recharts-bar', { timeout: 10000 }).catch(() => {})
const bars = await page.locator('.recharts-bar rect, svg rect[rx="4"]').count()
ok('trend chart has day bars', bars >= 7, `${bars} bars`)
await page.screenshot({ path: 'test-results/30-hq.png' })

// --- history ----------------------------------------------------------------
await page.getByRole('link', { name: /geschiedenis/i }).click()
await page.waitForSelector('text=/geschiedenis/i')
await page.waitForTimeout(600)
const groups = await page.locator('section h2').count()
ok('history groups by date', groups >= 5, `${groups} day groups`)
await page.getByLabel(/zoek in de geschiedenis/i).fill('−3d')
await page.waitForTimeout(300)
const filtered = await page.locator('section h2').count()
ok('history search filters', filtered === 1, `${filtered} groups after search`)
await page.screenshot({ path: 'test-results/31-history.png' })

// --- settings ------------------------------------------------------------------
await page.getByRole('link', { name: /terug/i }).click()
await page.getByRole('link', { name: /instellingen/i }).click()
await page.waitForSelector('text=/teamcode voor nieuwe apparaten/i')
ok('settings shows family code', true)

const limitBefore = await page.locator('output').first().textContent()
await page.getByRole('button', { name: /budget verhogen/i }).click()
await page.waitForTimeout(400)
const limitAfter = await page.locator('output').first().textContent()
ok('sidekick can adjust limit', limitBefore !== limitAfter,
  `${limitBefore} → ${limitAfter}`)

const download = page.waitForEvent('download', { timeout: 10000 })
await page.getByRole('button', { name: /exporteer csv/i }).click()
const dl = await download
const path = await dl.path()
ok('CSV export downloads', Boolean(path), dl.suggestedFilename())
await page.screenshot({ path: 'test-results/32-settings.png' })

ok('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
await browser.close()
const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} HQ checks passed`)
process.exit(failed ? 1 : 0)
