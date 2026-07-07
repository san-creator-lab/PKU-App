// Copies Tesseract worker/core/language assets from node_modules into
// public/ so OCR runs fully offline with zero CDN calls (the default
// tesseract.js behavior of fetching from jsdelivr is disabled by pointing
// workerPath/corePath/langPath at these local copies).
// Runs automatically via the predev/prebuild npm hooks.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const pub = (...p) => path.join(root, 'public', ...p)
const nm = (...p) => path.join(root, 'node_modules', ...p)

mkdirSync(pub('tesseract'), { recursive: true })
mkdirSync(pub('tessdata'), { recursive: true })

// worker
copyFileSync(nm('tesseract.js/dist/worker.min.js'), pub('tesseract', 'worker.min.js'))

// core variants (the worker picks simd/lstm based on device support)
const coreDir = nm('tesseract.js-core')
for (const f of readdirSync(coreDir)) {
  if (f.endsWith('.wasm.js') || f.endsWith('.wasm')) {
    copyFileSync(path.join(coreDir, f), pub('tesseract', f))
  }
}

// English traineddata (digits + Latin script cover Dutch labels fine)
const eng = nm('@tesseract.js-data/eng/4.0.0/eng.traineddata.gz')
if (existsSync(eng)) {
  copyFileSync(eng, pub('tessdata', 'eng.traineddata.gz'))
} else {
  console.error('Missing @tesseract.js-data/eng — run npm install')
  process.exit(1)
}

console.log('OCR assets copied to public/tesseract + public/tessdata')
