// Quick screenshot helper: node shot.mjs <url> <outfile> [waitMs]
import { chromium } from 'playwright'

const [url, out, waitMs = '1200'] = process.argv.slice(2)
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(Number(waitMs))
await page.screenshot({ path: out, fullPage: false })
await browser.close()
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'))
} else {
  console.log('no console/page errors')
}
