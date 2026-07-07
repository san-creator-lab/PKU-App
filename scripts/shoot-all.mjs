// Captures every screen at 390px with seeded data for design review/QA.
// Usage: node scripts/shoot-all.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173'
const out = process.argv[3] ?? 'test-results/screens'

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()

async function dismiss() {
  for (let i = 0; i < 6; i++) {
    const btn = page.getByRole('button', { name: /te gek/i })
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true })
      await page.waitForTimeout(350)
    } else break
  }
}

async function shot(name, ms = 1600) {
  await page.waitForTimeout(ms)
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log(`📸 ${name}`)
}

await page.goto(base, { waitUntil: 'networkidle' })
await shot('01-splash', 1800)

// hero signup + family
await page.getByRole('button', { name: /start missie/i }).click()
await shot('02-choice', 700)
await page.getByRole('button', { name: /nieuw team starten/i }).click()
await page.locator('#su-name').fill('Mama Kim')
await page.locator('#su-email').fill(`design${Date.now()}@test.nl`)
await page.locator('#su-pass').fill('designgeheim1')
await page.getByRole('button', { name: /account maken/i }).click()
await page.waitForSelector('text=/teamcode/i', { timeout: 15000 })
await shot('03-family-code', 900)
await page.getByRole('button', { name: /naar jullie basis/i }).click()
await page.waitForSelector('text=/missies van vandaag/i')

// seed history + today entries via dev hook
await page.evaluate(async () => {
  const store = window.__appStore.getState()
  const iso = (offset) => {
    const d = new Date()
    d.setDate(d.getDate() - offset)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  for (const [offset, grams] of [[6, 5.5], [5, 7.2], [4, 6.1], [3, 4.4], [2, 6.9], [1, 5.8]]) {
    await store.addEntry({
      food_name: ['Eiwitarm brood', 'Friet', 'Appelmoes', 'Rijstwafel', 'Pasta (eiwitarm)', 'Banaan'][offset - 1],
      protein_grams: grams,
      meal_type: 'dinner',
      source: 'manual',
      date: iso(offset),
    })
  }
  await store.addEntry({ food_name: 'Eiwitarm brood met jam', protein_grams: 0.4, meal_type: 'breakfast', source: 'library' })
  await store.addEntry({ food_name: 'Appel', protein_grams: 0.5, meal_type: 'snack', source: 'library' })
  await store.addEntry({ food_name: 'Gescand: eiwitarme koek', protein_grams: 0.3, meal_type: 'snack', source: 'scan' })
  await store.addEntry({ food_name: 'Friet klein bakje', protein_grams: 3.3, meal_type: 'dinner', source: 'library' })
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('text=/missies van vandaag/i')
await dismiss()
await shot('04-hero-dashboard')

await page.getByRole('button', { name: /brandstof loggen/i }).click()
await page.getByRole('tab', { name: /zelf invullen/i }).click()
await page.locator('#m-grams').fill('1,2')
await shot('05-add-manual', 800)
await page.getByRole('tab', { name: /zoeken/i }).click()
await page.getByLabel(/zoek eten/i).fill('brood')
await shot('06-add-search', 800)

await page.getByRole('link', { name: /handboek/i }).click()
await page.waitForSelector('text=/heldenhandboek/i')
await shot('07-library', 900)

await page.getByRole('link', { name: /badges/i }).click()
await page.waitForSelector('text=/badge-hal/i')
await shot('08-badges', 1100)

await page.getByRole('link', { name: /hq/i }).click()
await page.waitForSelector('text=/sidekick hq/i')
await shot('09-hq', 1400)

await page.getByRole('link', { name: /geschiedenis/i }).click()
await page.waitForSelector('h1:has-text("Geschiedenis")')
await shot('10-history', 1000)

await page.goto(`${base}/#/settings`, { waitUntil: 'networkidle' })
await page.waitForSelector('text=/teamcode voor nieuwe apparaten/i')
await shot('11-settings', 900)

await page.goto(`${base}/#/scan`, { waitUntil: 'networkidle' })
await page.waitForSelector('text=/heldenscanner/i')
await shot('12-scanner', 1200)

// hero role view: join as hero in same context, then avatar room
await page.goto(`${base}/#/`, { waitUntil: 'networkidle' })
const code = await page.evaluate(() => window.__appStore.getState().family?.family_code)
await page.evaluate(() => localStorage.removeItem('hero-fuel-local-session'))
await page.reload({ waitUntil: 'networkidle' })
await page.getByRole('button', { name: /start missie/i }).click()
await page.getByRole('button', { name: /join met teamcode/i }).click()
await page.getByRole('radio', { name: /held/i }).click()
await page.locator('#j-code').fill(code)
await page.locator('#j-name').fill('Super-Sem')
await page.locator('#j-email').fill(`sem${Date.now()}@test.nl`)
await page.locator('#j-pass').fill('semgeheim1')
await shot('13-join-hero', 500)
await page.getByRole('button', { name: /join!/i }).click()
await page.waitForSelector('text=/missies van vandaag/i', { timeout: 15000 })
await dismiss()
await shot('14-hero-view-dashboard')

await page.getByRole('link', { name: /^held$/i }).click()
await page.waitForSelector('text=/jouw uitrusting/i')
await shot('15-avatar-room', 1200)

await browser.close()
console.log('done')
