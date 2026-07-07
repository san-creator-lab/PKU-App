import { createWorker, type Worker } from 'tesseract.js'
import { parseNutritionText } from './parseLabel'
import { EMPTY_RESULT, type OcrProvider, type OcrResult } from './types'

/**
 * Default OCR provider: Tesseract.js running fully in the browser. All
 * assets (worker, wasm core, traineddata) are served from our own origin
 * (see scripts/copy-ocr-assets.mjs) — no CDN, no keys, works offline once
 * cached by the service worker.
 */
export class TesseractProvider implements OcrProvider {
  readonly name = 'tesseract'
  private workerPromise: Promise<Worker> | null = null

  private worker(): Promise<Worker> {
    this.workerPromise ??= createWorker('eng', 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract',
      langPath: '/tessdata',
    })
    return this.workerPromise
  }

  async extract(image: Blob): Promise<OcrResult> {
    try {
      const worker = await this.worker()
      const {
        data: { text, confidence },
      } = await worker.recognize(image)
      return parseNutritionText(text, confidence / 100)
    } catch {
      return EMPTY_RESULT
    }
  }
}
