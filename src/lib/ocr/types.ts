/**
 * OCR abstraction for the Hero Scanner. The default provider (Tesseract)
 * runs fully client-side with bundled language data — zero keys, works
 * offline. The Anthropic provider calls the `ocr-label` Supabase Edge
 * Function (deploy + secret required; see README "Switching the OCR
 * provider"). Below CONFIDENCE_THRESHOLD the UI falls back to manual entry.
 */

export interface OcrResult {
  protein_per_100g: number | null
  protein_per_serving: number | null
  serving_size: string | null
  /** 0..1 — how sure the provider is about the extracted numbers. */
  confidence: number
  raw_text: string
}

export interface OcrProvider {
  readonly name: string
  /** Extracts protein values from a photo of a nutrition label. */
  extract(image: Blob): Promise<OcrResult>
}

export const CONFIDENCE_THRESHOLD = 0.55

export const EMPTY_RESULT: OcrResult = {
  protein_per_100g: null,
  protein_per_serving: null,
  serving_size: null,
  confidence: 0,
  raw_text: '',
}
