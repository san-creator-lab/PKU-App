// Converts the single-file build (dist-artifact/index.html) into a body
// fragment for the claude.ai Artifact host, which supplies its own
// <!doctype>/<head>/<body> skeleton: we keep <title>, inline styles, the
// root node and the inline module scripts.
// Usage: node scripts/make-artifact-fragment.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const html = readFileSync(path.join(root, 'dist-artifact/index.html'), 'utf8')

const title = html.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? '<title>Hero Fuel</title>'
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/gi)].map((m) => m[0])
const scripts = [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map((m) => m[0])

if (styles.length === 0 || scripts.length === 0) {
  console.error('Could not find inline styles/scripts — is this a singlefile build?')
  process.exit(1)
}

const fragment = [
  title,
  ...styles,
  '<div id="root"></div>',
  ...scripts,
].join('\n')

const out = path.join(root, 'dist-artifact/hero-fuel-demo.html')
writeFileSync(out, fragment)
console.log(
  `Wrote ${out} (${(fragment.length / 1024).toFixed(0)} KiB, ${styles.length} style / ${scripts.length} script blocks)`,
)
