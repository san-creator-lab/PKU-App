import { motion } from 'framer-motion'
import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ServingsSheet, type SelectableFood } from '@/components/ServingsSheet'
import { defaultMealType } from '@/lib/meals'
import { useAppStore } from '@/hooks/useAppStore'
import type { MealType } from '@/lib/backend'
import { MEAL_EMOJI, MEAL_LABELS, t } from '@/lib/i18n'

type Tab = 'scan' | 'search' | 'manual'

export function AddFoodScreen() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'search'
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <h1 className="font-display text-3xl">{t('add.title')} ⚡</h1>

      <div className="grid grid-cols-3 gap-1 rounded-hero bg-navy-800 p-1" role="tablist">
        {(
          [
            ['scan', `📸 ${t('add.scan')}`],
            ['search', `🔎 ${t('add.search')}`],
            ['manual', `⌨️ ${t('add.manual')}`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`min-h-[48px] rounded-hero font-display text-sm font-semibold transition ${
              tab === key ? 'bg-electric-500 text-navy-950' : 'text-slate-300'
            }`}
            onClick={() =>
              key === 'scan' ? navigate('/scan') : setParams({ tab: key })
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'search' ? <SearchTab /> : <ManualTab />}
    </div>
  )
}

// ---------------------------------------------------------------- search --

function SearchTab() {
  const foods = useAppStore((s) => s.foods)
  const customFoods = useAppStore((s) => s.customFoods)
  const entries = useAppStore((s) => s.entries)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<SelectableFood | null>(null)

  const favorites = useMemo(
    () => customFoods.filter((f) => f.is_favorite),
    [customFoods],
  )

  const recents = useMemo(() => {
    const seen = new Set<string>()
    const result: SelectableFood[] = []
    for (const e of [...entries].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
      const key = e.food_name.toLowerCase()
      if (!e.food_name || seen.has(key)) continue
      seen.add(key)
      result.push({
        name: e.food_name,
        protein_per_serving: Number(e.protein_grams),
        protein_per_100g: 0,
        serving_description: 'zoals vorige keer',
        emoji: '🕐',
        source: 'library',
      })
      if (result.length >= 6) break
    }
    return result
  }, [entries])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all: SelectableFood[] = [
      ...customFoods.map((f) => ({
        name: f.name,
        protein_per_serving: Number(f.protein_per_serving),
        protein_per_100g: Number(f.protein_per_100g),
        serving_description: f.serving_description,
        emoji: f.emoji ?? '⭐',
        source: 'library' as const,
      })),
      ...foods.map((f) => ({
        name: f.name,
        protein_per_serving: Number(f.protein_per_serving),
        protein_per_100g: Number(f.protein_per_100g),
        serving_description: f.serving_description,
        emoji: f.emoji,
        source: 'library' as const,
      })),
    ]
    if (!q) return all.slice(0, 30)
    return all.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 30)
  }, [foods, customFoods, query])

  return (
    <div className="flex flex-col gap-3">
      <input
        className="input-hero"
        type="search"
        placeholder={t('lib.search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t('lib.search')}
        autoFocus
      />

      {!query && (favorites.length > 0 || recents.length > 0) && (
        <div className="flex flex-col gap-2">
          {favorites.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-gold-400">
                ⭐ {t('lib.favorites')}
              </h3>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {favorites.map((f) => (
                  <button
                    key={f.id}
                    className="glass-card min-h-[48px] shrink-0 px-3 py-2 text-left"
                    onClick={() =>
                      setSelected({
                        name: f.name,
                        protein_per_serving: Number(f.protein_per_serving),
                        protein_per_100g: Number(f.protein_per_100g),
                        serving_description: f.serving_description,
                        emoji: f.emoji ?? '⭐',
                        source: 'favorite',
                      })
                    }
                  >
                    <span aria-hidden="true">{f.emoji ?? '⭐'}</span>{' '}
                    <span className="font-display text-sm">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {recents.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-electric-400">
                🕐 {t('lib.recent')}
              </h3>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {recents.map((f) => (
                  <button
                    key={f.name}
                    className="glass-card min-h-[48px] shrink-0 px-3 py-2 text-left"
                    onClick={() => setSelected(f)}
                  >
                    <span className="font-display text-sm">{f.name}</span>{' '}
                    <span className="text-xs text-slate-400">
                      {f.protein_per_serving.toFixed(1).replace('.', ',')} g
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {results.map((f, i) => (
          <motion.li
            key={`${f.name}-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.3) }}
          >
            <button
              className="glass-card flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left"
              onClick={() => setSelected(f)}
            >
              <span className="text-2xl" aria-hidden="true">{f.emoji ?? '🍽️'}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display font-medium">{f.name}</span>
                <span className="block text-xs text-slate-400">{f.serving_description}</span>
              </span>
              <span className="font-display font-semibold text-electric-400">
                {f.protein_per_serving.toFixed(1).replace('.', ',')} g
              </span>
            </button>
          </motion.li>
        ))}
        {results.length === 0 && (
          <li className="glass-card p-4 text-center text-slate-400">
            Niks gevonden. Probeer de tab &quot;{t('add.manual')}&quot;!
          </li>
        )}
      </ul>

      <ServingsSheet food={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

// ---------------------------------------------------------------- manual --

function ManualTab() {
  const addEntry = useAppStore((s) => s.addEntry)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [grams, setGrams] = useState('')
  const [mealType, setMealType] = useState<MealType>(defaultMealType())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = Number(grams.replace(',', '.'))
  const valid = grams !== '' && !Number.isNaN(parsed) && parsed >= 0 && parsed <= 99

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    setError(null)
    try {
      await addEntry({
        food_name: name.trim(),
        protein_grams: Math.round(parsed * 10) / 10,
        meal_type: mealType,
        source: 'manual',
      })
      navigate('/')
    } catch {
      setError('Loggen lukte niet. Probeer het nog eens!')
      setBusy(false)
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-300" htmlFor="m-grams">
          {t('add.grams')}
        </label>
        <div className="glass-card flex items-center justify-center gap-2 p-4 shadow-glow-soft">
          <input
            id="m-grams"
            className="w-40 bg-transparent text-center font-display text-6xl font-bold text-electric-400 placeholder:text-navy-600 focus:outline-none"
            inputMode="decimal"
            placeholder="0,0"
            value={grams}
            onChange={(e) => setGrams(e.target.value.replace(/[^0-9.,]/g, ''))}
            aria-describedby="m-grams-hint"
            autoFocus
          />
          <span className="font-display text-2xl text-slate-400">g</span>
        </div>
        <p id="m-grams-hint" className="mt-1 text-center text-xs text-slate-400">
          Power-level: hoeveel brandstof zit erin?
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-300" htmlFor="m-name">
          {t('add.foodName')} <span className="text-slate-500">(mag leeg)</span>
        </label>
        <input
          id="m-name"
          className="input-hero"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bijv. rijstwafel met jam"
          maxLength={80}
        />
      </div>

      <div>
        <span className="mb-1 block text-sm font-semibold text-slate-300">
          {t('add.mealType')}
        </span>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t('add.mealType')}>
          {(Object.keys(MEAL_LABELS) as MealType[]).map((mt) => (
            <button
              key={mt}
              type="button"
              role="radio"
              aria-checked={mealType === mt}
              className={`flex min-h-[72px] flex-col items-center justify-center rounded-hero border-2 p-1 transition ${
                mealType === mt
                  ? 'border-gold-500 bg-gold-500/15'
                  : 'border-white/15 bg-white/5'
              }`}
              onClick={() => setMealType(mt)}
            >
              <span className="text-2xl" aria-hidden="true">{MEAL_EMOJI[mt]}</span>
              <span className="text-[10px] font-semibold leading-tight text-slate-300">
                {t(MEAL_LABELS[mt])}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-hero-400" role="alert">{error}</p>}

      <button className="btn-hero text-xl" disabled={!valid || busy}>
        {busy ? t('common.loading') : t('add.log')}
      </button>
    </form>
  )
}
