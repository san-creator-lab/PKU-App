// Verifies gamification 2.0: daily missions (complete → claim → coins),
// the bonus chest, game tokens from logging, the Fuel Rush arcade screen,
// a real (short) game run via the store, and the hero shop buy/equip flow.
// Usage: node scripts/verify-game.mjs [baseUrl]
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

async function dismissModals() {
  for (let i = 0; i < 14; i++) {
    const btn = page.getByRole('button', { name: /te gek/i })
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true })
      await page.waitForTimeout(550)
      continue
    }
    // a queued modal may still be animating in — check once more
    await page.waitForTimeout(450)
    if (!(await btn.isVisible().catch(() => false))) break
  }
}

// --- signup ------------------------------------------------------------------
await page.goto(base, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /start missie/i }).click()
await page.getByRole('button', { name: /nieuw team starten/i }).click()
await page.locator('#su-name').fill('GameTester')
await page.locator('#su-email').fill(`game${Date.now()}@test.nl`)
await page.locator('#su-pass').fill('gamegeheim1')
await page.getByRole('button', { name: /account maken/i }).click()
await page.waitForSelector('text=/teamcode/i', { timeout: 15000 })
await page.getByRole('button', { name: /naar jullie basis/i }).click()
await page.waitForSelector('text=/dagmissies/i', { timeout: 15000 })
ok('missions panel on dashboard', true)
ok('wallet chips visible', await page.getByText(/🪙 0/).first().isVisible())

// --- satisfy today's 3 missions through the store dev hook --------------------
const missionIds = await page.evaluate(async () => {
  const store = window.__appStore.getState()
  const { missionsForDate } = await import('/src/lib/missions.ts')
  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const missions = missionsForDate(iso)
  for (const m of missions) {
    if (m.id === 'log3' || m.id === 'zelf2') {
      await store.addEntry({ food_name: 'Rijstwafel', protein_grams: 0.6, meal_type: 'snack', source: 'manual' })
      await store.addEntry({ food_name: 'Waterijsje', protein_grams: 0, meal_type: 'snack', source: 'manual' })
      await store.addEntry({ food_name: 'Limonade', protein_grams: 0, meal_type: 'snack', source: 'manual' })
    } else if (m.id === 'morning') {
      await store.addEntry({ food_name: 'Eiwitarm brood', protein_grams: 0.2, meal_type: 'breakfast', source: 'manual' })
    } else if (m.id === 'fruitveg') {
      await store.addEntry({ food_name: 'Appel', protein_grams: 0.5, meal_type: 'snack', source: 'library' })
    } else if (m.id === 'scan') {
      await store.addEntry({ food_name: 'Gescand etiket', protein_grams: 0.3, meal_type: 'snack', source: 'scan' })
    } else if (m.id === 'handboek') {
      await store.addEntry({ food_name: 'Komkommer', protein_grams: 0.5, meal_type: 'snack', source: 'library' })
    } else if (m.id === 'game1') {
      await store.startGame()
      await store.finishGame(42)
    }
  }
  return missions.map((m) => m.id)
})
await dismissModals()
ok('missions satisfied via store', missionIds.length === 3, missionIds.join(', '))

// --- claim all three -----------------------------------------------------------
for (let i = 0; i < 3; i++) {
  await dismissModals()
  const claim = page.getByRole('button', { name: /claim/i }).first()
  await claim.waitFor({ timeout: 10000 })
  await claim.click()
  await page.waitForTimeout(700)
}
await dismissModals()
const claimedAll = await page.getByText(/3\/3 geclaimd/i).isVisible()
ok('all three missions claimed', claimedAll)

// --- chest -----------------------------------------------------------------------
const chestBtn = page.getByRole('button', { name: /open je bonuskist/i })
await chestBtn.waitFor({ timeout: 10000 })
await page.screenshot({ path: 'test-results/60-missions-chest.png' })
await chestBtn.click({ force: true })
await page.waitForSelector('text=/bonuskist!/i', { timeout: 10000 })
await page.screenshot({ path: 'test-results/61-chest-open.png' })
ok('bonus chest opens with reward', await page.getByText(/\+\d+ munten/).isVisible())
await page.getByRole('button', { name: /yes!/i }).click({ force: true })
await dismissModals()

const coinsText = await page.locator('header').getByText(/🪙/).first().textContent()
const coins = Number(/(\d+)/.exec(coinsText ?? '')?.[1] ?? 0)
ok('coins accumulated (missions + chest)', coins >= 65, `🪙 ${coins}`)

// --- arcade ------------------------------------------------------------------------
// (tester is a sidekick: the Held tab is hero-only, so navigate directly)
await page.goto(`${base}/#/avatar`, { waitUntil: 'networkidle' })
await page.waitForSelector('text=/fuel rush/i', { timeout: 10000 })
await page.screenshot({ path: 'test-results/62-hero-hub.png' })
ok('hero hub shows arcade + shop + streak calendar',
  (await page.getByText(/winkel/i).first().isVisible()) &&
  (await page.getByText(/jouw streak/i).isVisible()))

await page.getByRole('link', { name: /fuel rush/i }).click()
await page.waitForSelector('text=/FUEL RUSH/', { timeout: 10000 })
const startBtn = page.getByRole('button', { name: /start!/i })
ok('game intro with token cost', await startBtn.isVisible())
await startBtn.click()
await page.waitForTimeout(2500) // canvas run
const playing = !(await page.getByText(/FUEL RUSH/).isVisible().catch(() => false))
ok('game runs (intro gone, canvas active)', playing)
await page.screenshot({ path: 'test-results/63-game-playing.png' })
// finish the run early via the store to keep the suite fast
const gameCoins = await page.evaluate(() => window.__appStore.getState().finishGame(180))
ok('finishGame awards coins', gameCoins >= 15, `+${gameCoins}`)
await page.goto(`${base}/#/avatar`, { waitUntil: 'networkidle' })
await dismissModals()

// --- shop: buy + equip ----------------------------------------------------------
await page.getByRole('link', { name: /winkel/i }).click()
await page.waitForSelector('text=/heldenwinkel/i', { timeout: 10000 })
await page.screenshot({ path: 'test-results/64-shop.png' })
const buyBtn = page.getByRole('button', { name: /koop · 🪙 80/i }).first()
await buyBtn.click({ force: true })
await page.getByRole('button', { name: /zeker weten/i }).first().click({ force: true })
await page.waitForTimeout(700)
await dismissModals()
const equipped = await page.getByText(/uitgerust ✓|AAN/i).first().isVisible()
ok('item bought and equipped', equipped)
await page.screenshot({ path: 'test-results/65-shop-bought.png' })

// tokens after: started 3, game1-mission may have spent 1, arcade spent 1, logs added +1 each (cap 5)
const tokensText = await page.evaluate(() => {
  const s = window.__appStore.getState()
  const hero = s.familyProfiles.find((p) => p.role === 'hero') ?? s.myProfile
  return hero?.game_tokens
})
ok('token economy sane (0..5)', tokensText >= 0 && tokensText <= 5, `⚡ ${tokensText}`)

ok('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
await browser.close()
const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} gamification checks passed`)
process.exit(failed ? 1 : 0)
