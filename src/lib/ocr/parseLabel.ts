import type { OcrResult } from './types'

/**
 * Turns raw nutrition-label OCR text into protein values. Dutch labels:
 *
 *   Voedingswaarde        per 100 g   per portie (30 g)
 *   Eiwitten              7,0 g       2,1 g
 *
 * Tesseract makes systematic mistakes on labels: a glued unit reads as a
 * digit ("7,0 g" → "7,09"), and decimal commas drop ("2,1 g" → "21g").
 * Because the two columns are mathematically linked (per-serving =
 * per-100g × serving/100) we generate candidate interpretations per token
 * and pick the pair that is consistent with the serving size.
 */

const PROTEIN_ROW = /(eiwit(?:ten)?|prote[iïy]n[ea]?s?|eiweiß|prot[ée]ines?)/i
const TOKEN = /\d[\d.,]*(?:\s?[g9¢])?/gi
const SERVING_SIZE =
  /per\s*portie\s*(?:\(|\bvan\b)?\s*(\d+(?:[.,]\d+)?)\s*(g|gram|ml)\b/i

/** Protein per 100 g plausibly sits in 0..50 g; per serving in 0..30 g. */
const MAX_PER_100 = 50
const MAX_PER_SERVING = 30

function toNum(s: string): number {
  return Number(s.replace(',', '.'))
}

/**
 * All plausible readings of one OCR token, most literal first.
 * "7,09" → [7.09, 7.0]   (trailing 9 was a glued 'g')
 * "21"   → [21, 2.1]     (comma may have dropped)
 * "2,1"  → [2.1]
 */
export function interpretations(raw: string, max: number): number[] {
  const t = raw.replace(/[\s¢]/g, '').replace(/g$/i, '')
  const out: number[] = []
  const add = (n: number, preferred = false) => {
    if (!Number.isFinite(n) || n < 0 || n > max || out.includes(n)) return
    if (preferred) out.unshift(n)
    else out.push(n)
  }

  add(toNum(t))
  // trailing '9' as a misread glued 'g' ("7,09" → 7,0 / "1,29" → 1,2). Dutch
  // labels print one decimal, so a two-decimal ...9 reading is almost always
  // the glued unit — prefer the stripped value.
  if (/[.,]\d9$/.test(t)) add(toNum(t.slice(0, -1)), true)
  else if (/\d9$/.test(t)) add(toNum(t.slice(0, -1)))
  // dropped decimal comma ("21" → 2,1 / "70" → 7,0), incl. after 9-strip
  if (/^\d{2,3}$/.test(t)) add(toNum(`${t.slice(0, -1)}.${t.slice(-1)}`))
  if (/^\d{2,3}9$/.test(t)) {
    const s = t.slice(0, -1)
    add(toNum(`${s.slice(0, -1)}.${s.slice(-1)}`))
  }
  return out
}

export function parseNutritionText(rawText: string, baseConfidence: number): OcrResult {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  let servingGrams: number | null = null
  let servingSize: string | null = null
  const servingMatch = rawText.match(SERVING_SIZE)
  if (servingMatch) {
    servingGrams = toNum(servingMatch[1])
    servingSize = `${servingMatch[1]} ${servingMatch[2]}`
  }

  let protein100: number | null = null
  let proteinServing: number | null = null
  let matchedConsistently = false
  let foundRow = false

  for (let i = 0; i < lines.length; i++) {
    if (!PROTEIN_ROW.test(lines[i])) continue
    let tail = lines[i].replace(PROTEIN_ROW, ' ')
    let tokens = tail.match(TOKEN) ?? []
    if (tokens.length === 0 && lines[i + 1]) {
      tail = lines[i + 1]
      tokens = tail.match(TOKEN) ?? []
    }
    const [tok0, tok1] = [...tokens]
    if (!tok0) continue
    foundRow = true

    const first = interpretations(tok0, MAX_PER_100)
    const second = tok1 ? interpretations(tok1, MAX_PER_SERVING) : []

    if (servingGrams !== null && servingGrams > 0 && servingGrams < 100) {
      // pick the (per100, perServing) pair most consistent with the serving
      let best: { a: number; b: number; err: number } | null = null
      for (const a of first) {
        const expected = (a * servingGrams) / 100
        for (const b of second) {
          const err = expected > 0 ? Math.abs(b - expected) / Math.max(expected, 0.1) : b
          if (!best || err < best.err) best = { a, b, err }
        }
        if (second.length === 0 && (!best || 0.5 < best.err)) {
          // no second column read — derive it from per-100g
          best = { a, b: Math.round(expected * 10) / 10, err: 0.4 }
        }
      }
      if (best && best.err <= 0.25) {
        protein100 = best.a
        proteinServing = best.b
        matchedConsistently = true
      } else if (best) {
        protein100 = best.a
        proteinServing = best.b
      }
    } else {
      protein100 = first[0] ?? null
      proteinServing = second[0] ?? null
    }
    break
  }

  let confidence = 0
  if (foundRow && (protein100 !== null || proteinServing !== null)) {
    confidence = Math.max(0.1, Math.min(1, baseConfidence))
    if (matchedConsistently) confidence = Math.max(confidence, 0.75)
    else if (proteinServing === null) confidence *= 0.85
    else confidence *= 0.7 // two columns read but not verifiable
  }

  return {
    protein_per_100g: protein100,
    protein_per_serving: proteinServing,
    serving_size: servingSize,
    confidence,
    raw_text: rawText.slice(0, 2000),
  }
}
