import { supabase } from '../supabase'
import { EMPTY_RESULT, type OcrProvider, type OcrResult } from './types'

/**
 * Optional OCR provider: the `ocr-label` Supabase Edge Function, which reads
 * the label with the Anthropic Messages API. Requires a Supabase project
 * with the function deployed and ANTHROPIC_API_KEY set as a secret — see
 * README "Switching the OCR provider". Selected via VITE_OCR_PROVIDER=anthropic.
 */
export class AnthropicEdgeProvider implements OcrProvider {
  readonly name = 'anthropic'

  async extract(image: Blob): Promise<OcrResult> {
    if (!supabase) return EMPTY_RESULT
    try {
      const base64 = await blobToBase64(image)
      const { data, error } = await supabase.functions.invoke('ocr-label', {
        body: { image_base64: base64, media_type: image.type || 'image/jpeg' },
      })
      if (error || !data) return EMPTY_RESULT
      return {
        protein_per_100g: numberOrNull(data.protein_per_100g),
        protein_per_serving: numberOrNull(data.protein_per_serving),
        serving_size: typeof data.serving_size === 'string' ? data.serving_size : null,
        confidence: Math.max(0, Math.min(1, Number(data.confidence) || 0)),
        raw_text: typeof data.raw_text === 'string' ? data.raw_text : '',
      }
    } catch {
      return EMPTY_RESULT
    }
  }
}

function numberOrNull(v: unknown): number | null {
  const n = Number(v)
  return v === null || v === undefined || Number.isNaN(n) ? null : n
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1))
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
