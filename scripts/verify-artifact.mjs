// Smoke test for the single-file demo fragment (wrapped like the Artifact
// host does): boot → signup → dashboard → log a meal → meter updates.
// Usage: node scripts/verify-artifact.mjs <url>
import { chromium } from 'playwright'

const url = process.argv[2] ?? 'http://localhost:8899/wrapped.html'
const results = []
const ok = (name, pass, extra = '') => {
  results.push(pass)
  console.log(`${pass ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`)
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(url, { waitUntil: 'networkidle' })
const splashButton = page.getByRole('button', { name: /start missie/i })
await splashButton.waitFor({ timeout: 15000 })
ok('demo boots (splash)', true)

await splashButton.click()
await page.getByRole('button', { name: /nieuw team starten/i }).click()
await page.locator('#su-name').fill('Demo')
await page.locator('#su-email').fill(`demo${Date.now()}@test.nl`)
await page.locator('#su-pass').fill('demogeheim1')
await page.getByRole('button', { name: /account maken/i }).click()
await page.waitForSelector('text=/teamcode/i', { timeout: 15000 })
ok('signup + family code', true)
await page.getByRole('button', { name: /naar jullie basis/i }).click()
await page.waitForSelector('text=/missies van vandaag/i', { timeout: 15000 })
ok('dashboard renders', true)

await page.getByRole('button', { name: /brandstof loggen/i }).click()
await page.getByRole('tab', { name: /zelf invullen/i }).click()
await page.locator('#m-grams').fill('2,0')
await page.getByRole('button', { name: /loggen!/i }).click()
await page.waitForSelector('text=2,0', { timeout: 10000 })
ok('meal logged, meter shows 2,0', true)
await page.screenshot({ path: 'test-results/50-artifact-demo.png' })

ok('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
await browser.close()
const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} artifact checks passed`)
process.exit(failed ? 1 : 0)
