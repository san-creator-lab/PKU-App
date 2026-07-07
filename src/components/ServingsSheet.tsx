import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/hooks/useAppStore'
import type { EntrySource, MealType } from '@/lib/backend'
import { MEAL_EMOJI, MEAL_LABELS, t } from '@/lib/i18n'
import { defaultMealType } from '@/lib/meals'
import { Sheet } from './Sheet'

export interface SelectableFood {
  name: string
  protein_per_serving: number
  protein_per_100g: number
  serving_description: string
  emoji: string | null
  source: EntrySource
}

const QUANTITIES = [0.5, 1, 1.5, 2, 3]

function qtyLabel(q: number): string {
  if (q === 0.5) return '½'
  if (q === 1.5) return '1½'
  return String(q)
}

/** Confirm-portion sheet: pick quantity + mission, then log. Two taps total. */
export function ServingsSheet({
  food,
  onClose,
}: {
  food: SelectableFood | null
  onClose: () => void
}) {
  const addEntry = useAppStore((s) => s.addEntry)
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const [mealType, setMealType] = useState<MealType>(defaultMealType())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (food) {
      setQty(1)
      setMealType(defaultMealType())
    }
  }, [food])

  const grams = food ? Math.round(food.protein_per_serving * qty * 10) / 10 : 0

  async function log() {
    if (!food) return
    setBusy(true)
    try {
      await addEntry({
        food_name: qty === 1 ? food.name : `${food.name} ×${qty}`.replace('.', ','),
        protein_grams: grams,
        meal_type: mealType,
        source: food.source,
      })
      onClose()
      navigate('/')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={food !== null} onClose={onClose} title={food ? `${food.emoji ?? '🍽️'} ${food.name}` : ''}>
      {food && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-400">
            {food.serving_description || t('add.perServing')} ·{' '}
            {food.protein_per_serving.toFixed(1).replace('.', ',')} g {t('add.perServing')} ·{' '}
            {food.protein_per_100g.toFixed(1).replace('.', ',')} g {t('add.per100')}
          </p>

          <div role="radiogroup" aria-label={t('add.servings')} className="flex gap-2">
            {QUANTITIES.map((q) => (
              <button
                key={q}
                role="radio"
                aria-checked={qty === q}
                className={`min-h-[52px] flex-1 rounded-hero border-2 font-display text-lg font-semibold transition ${
                  qty === q
                    ? 'border-electric-500 bg-electric-500/15 text-electric-400'
                    : 'border-white/15 bg-white/5 text-slate-300'
                }`}
                onClick={() => setQty(q)}
              >
                {qtyLabel(q)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('add.mealType')}>
            {(Object.keys(MEAL_LABELS) as MealType[]).map((mt) => (
              <button
                key={mt}
                role="radio"
                aria-checked={mealType === mt}
                className={`flex min-h-[64px] flex-col items-center justify-center rounded-hero border-2 p-1 transition ${
                  mealType === mt
                    ? 'border-gold-500 bg-gold-500/15'
                    : 'border-white/15 bg-white/5'
                }`}
                onClick={() => setMealType(mt)}
              >
                <span className="text-xl" aria-hidden="true">{MEAL_EMOJI[mt]}</span>
                <span className="text-[10px] font-semibold leading-tight text-slate-300">
                  {t(MEAL_LABELS[mt])}
                </span>
              </button>
            ))}
          </div>

          <button className="btn-hero" disabled={busy} onClick={() => void log()}>
            {busy
              ? t('common.loading')
              : `+${grams.toFixed(1).replace('.', ',')} g — ${t('add.log')}`}
          </button>
        </div>
      )}
    </Sheet>
  )
}
