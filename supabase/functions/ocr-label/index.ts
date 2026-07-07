// Supabase Edge Function: ocr-label
//
// Extracts protein values from a photo of a nutrition label
// (voedingswaardentabel) using the Anthropic Messages API.
//
// Ships deploy-ready but is NOT the default OCR provider — the app uses the
// keyless client-side Tesseract provider unless VITE_OCR_PROVIDER=anthropic.
// To activate (see README "Switching the OCR provider"):
//   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   npx supabase functions deploy ocr-label
//
// Request  (POST, authenticated with the user's JWT — verify_jwt is on):
//   { "image_base64": "<base64 JPEG/PNG/WebP>", "media_type": "image/jpeg" }
// Response:
//   { protein_per_100g, protein_per_serving, serving_size, confidence, raw_text }

import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0'

const MODEL = 'claude-sonnet-4-6'
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    protein_per_100g: {
      type: ['number', 'null'],
      description: 'Protein in grams per 100 g / 100 ml, null if not shown',
    },
    protein_per_serving: {
      type: ['number', 'null'],
      description: 'Protein in grams per serving/portion, null if not shown',
    },
    serving_size: {
      type: ['string', 'null'],
      description: 'Serving size as printed, e.g. "30 g" or "250 ml", null if not shown',
    },
    confidence: {
      type: 'number',
      description: 'Extraction confidence between 0 and 1',
    },
    raw_text: {
      type: 'string',
      description: 'Verbatim text of the protein row(s) as printed on the label',
    },
  },
  required: [
    'protein_per_100g',
    'protein_per_serving',
    'serving_size',
    'confidence',
    'raw_text',
  ],
  additionalProperties: false,
} as const

const PROMPT = `You are reading a photo of a food nutrition label, most likely Dutch (look for "Eiwitten" — also accept "Eiwit", "Proteïne", "Protein", "Eiweiß", "Protéines").

Extract ONLY the protein values:
- protein_per_100g: grams of protein per 100 g or 100 ml
- protein_per_serving: grams of protein per serving/portion if a per-portion column exists
- serving_size: the serving size as printed (e.g. "30 g", "250 ml")
- confidence: 0-1, how certain you are the numbers are read correctly (lower it for blur, glare, cropped rows or ambiguous decimals — Dutch labels use a decimal comma: "2,1" means 2.1)
- raw_text: the protein row(s) verbatim

If the image is not a nutrition label or protein is unreadable, return null values with confidence 0.`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return json({ error: 'missing_anthropic_api_key' }, 500)
  }

  let image_base64: string
  let media_type: string
  try {
    const body = await req.json()
    image_base64 = body.image_base64
    media_type = body.media_type ?? 'image/jpeg'
    if (typeof image_base64 !== 'string' || image_base64.length === 0) {
      throw new Error('image_base64 required')
    }
  } catch {
    return json({ error: 'invalid_request' }, 400)
  }

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(media_type)) {
    return json({ error: 'unsupported_media_type' }, 400)
  }
  // base64 is ~4/3 of the byte size
  if (image_base64.length > (MAX_IMAGE_BYTES * 4) / 3) {
    return json({ error: 'image_too_large' }, 413)
  }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: {
        format: {
          type: 'json_schema',
          schema: EXTRACTION_SCHEMA,
        },
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: media_type as 'image/jpeg' | 'image/png' | 'image/webp',
                data: image_base64,
              },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    })

    if (response.stop_reason === 'refusal') {
      return json({ error: 'model_refused' }, 422)
    }

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return json({ error: 'empty_response' }, 502)
    }

    // output_config.format guarantees schema-valid JSON
    const result = JSON.parse(textBlock.text)
    return json(result, 200)
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return json({ error: 'rate_limited' }, 429)
    }
    if (err instanceof Anthropic.APIError) {
      return json({ error: 'anthropic_api_error', status: err.status }, 502)
    }
    return json({ error: 'internal_error' }, 500)
  }
})

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
