import { supabaseConfigured } from '../supabase'
import { AnthropicEdgeProvider } from './anthropic'
import { TesseractProvider } from './tesseract'
import type { OcrProvider } from './types'

/** Active provider: keyless Tesseract unless explicitly switched via env. */
export const ocrProvider: OcrProvider =
  import.meta.env.VITE_OCR_PROVIDER === 'anthropic' && supabaseConfigured
    ? new AnthropicEdgeProvider()
    : new TesseractProvider()

export * from './types'
