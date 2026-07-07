// Verifies the Hero Scanner end-to-end with the keyless Tesseract provider:
// happy path (synthetic Dutch nutrition label → detected values → log) and
// the low-confidence fallback (noise image → manual entry panel).
// Usage: node scripts/verify-scanner.mjs [baseUrl]
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173'
const results = []
const ok = (name, pass, extra = '') => {
  results.push(pass)
  console.log(`${pass ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`)
}

const LABEL_HTML = `<!doctype html><html><body style="margin:0;background:#fff">
<div style="font-family: Arial, sans-serif; color:#111; padding:28px; width:560px">
  <h2 style="margin:0 0 10px">Voedingswaarde</h2>
  <table style="border-collapse:collapse; font-size:26px; width:100%">
    <tr style="border-bottom:2px solid #111">
      <th style="text-align:left; padding:8px 4px">Per</th>
      <th style="text-align:right; padding:8px 4px">100 g</th>
      <th style="text-align:right; padding:8px 4px">per portie (30 g)</th>
    </tr>
    <tr><td style="padding:8px 4px">Energie</td><td style="text-align:right">1046 kJ</td><td style="text-align:right">314 kJ</td></tr>
    <tr><td style="padding:8px 4px">Vetten</td><td style="text-align:right">1,2 g</td><td style="text-align:right">0,4 g</td></tr>
    <tr><td style="padding:8px 4px">Koolhydraten</td><td style="text-align:right">82 g</td><td style="text-align:right">24,6 g</td></tr>
    <tr style="background:#eee"><td style="padding:8px 4px"><b>Eiwitten</b></td><td style="text-align:right"><b>7,0 g</b></td><td style="text-align:right"><b>2,1 g</b></td></tr>
    <tr><td style="padding:8px 4px">Zout</td><td style="text-align:right">0,10 g</td><td style="text-align:right">0,03 g</td></tr>
  </table>
</div></body></html>`

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })

/** Dismiss any queued badge-unlock modals. */
async function dismissModals(page) {
  for (let i = 0; i < 5; i++) {
    const btn = page.getByRole('button', { name: /te gek/i })
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
      await page.waitForTimeout(400)
    } else break
  }
}

// --- generate test images ----------------------------------------------------
const gen = await ctx.newPage()
await gen.setContent(LABEL_HTML)
const labelPng = await gen.locator('div').first().screenshot()
await gen.setContent(
  '<body style="margin:0"><canvas id="c" width="600" height="400"></canvas><script>const x=document.getElementById("c").getContext("2d");x.fillStyle="#888";x.fillRect(0,0,600,400);for(let i=0;i<4000;i++){x.fillStyle=`rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255})`;x.fillRect(Math.random()*600,Math.random()*400,3,3)}</script></body>',
)
const noisePng = await gen.locator('canvas').screenshot()
await gen.close()

// --- sign up a fresh family ---------------------------------------------------
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(base, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /start missie/i }).click()
await page.getByRole('button', { name: /nieuw team starten/i }).click()
await page.locator('#su-name').fill('ScanTester')
await page.locator('#su-email').fill(`scan${Date.now()}@test.nl`)
await page.locator('#su-pass').fill('scangeheim1')
await page.getByRole('button', { name: /account maken/i }).click()
await page.waitForSelector('text=/teamcode/i', { timeout: 15000 })
await page.getByRole('button', { name: /naar jullie basis/i }).click()
await page.waitForSelector('text=/missies van vandaag/i')

// --- happy path ---------------------------------------------------------------
await page.getByRole('button', { name: /brandstof loggen/i }).click()
await page.getByRole('tab', { name: /scannen/i }).click()
await page.waitForSelector('text=/heldenscanner/i', { timeout: 10000 })
await page.screenshot({ path: 'test-results/20-scanner-hud.png' })

await page.setInputFiles('input[type=file]', {
  name: 'label.png',
  mimeType: 'image/png',
  buffer: labelPng,
})
await page.waitForSelector('text=/gevonden!/i', { timeout: 90000 })
ok('OCR detected the label', true)
const gramsValue = await page.locator('#sc-grams').inputValue()
ok('per-serving value extracted (2,1)', gramsValue === '2,1', `got "${gramsValue}"`)
const servingShown = await page.getByText(/30 g/).first().isVisible().catch(() => false)
ok('serving size shown (30 g)', servingShown)
await page.screenshot({ path: 'test-results/21-scanner-confirm.png' })

await page.getByRole('button', { name: /loggen!/i }).click()
await page.waitForSelector('text=/missies van vandaag/i', { timeout: 15000 })
await dismissModals(page)
const scanned = await page.getByText(/gescand/i).first().isVisible().catch(() => false)
ok('scanned entry on dashboard', scanned)
await page.screenshot({ path: 'test-results/22-scan-logged.png' })

// --- low-confidence fallback ---------------------------------------------------
await page.getByRole('button', { name: /brandstof loggen/i }).click()
await page.getByRole('tab', { name: /scannen/i }).click()
await page.waitForSelector('text=/heldenscanner/i')
await page.setInputFiles('input[type=file]', {
  name: 'noise.png',
  mimeType: 'image/png',
  buffer: noisePng,
})
await page.waitForSelector('text=/scanner heeft hulp nodig/i', { timeout: 90000 })
ok('low-confidence → manual fallback shown', true)
await page.screenshot({ path: 'test-results/23-scanner-fallback.png' })
await page.locator('#sc-grams').fill('1,5')
await page.getByRole('button', { name: /loggen!/i }).click()
await page.waitForSelector('text=/missies van vandaag/i', { timeout: 15000 })
await dismissModals(page)
ok('fallback manual entry logged', true)

ok('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
await browser.close()
const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} scanner checks passed`)
process.exit(failed ? 1 : 0)
