import { useMemo, useState, type FormEvent } from 'react'
import { ServingsSheet, type SelectableFood } from '@/components/ServingsSheet'
import { Sheet } from '@/components/Sheet'
import { useAppStore } from '@/hooks/useAppStore'
import type { CustomFood } from '@/lib/backend'
import { t } from '@/lib/i18n'

const CATEGORIES = [
  'Fruit',
  'Groente',
  'Dranken',
  'Snacks',
  'Maaltijden',
  'Brood',
  'Zuivelvervangers',
  'PKU-producten',
]

interface Row {
  key: string
  name: string
  protein_per_100g: number
  protein_per_serving: number
  serving_description: string
  category: string
  emoji: string | null
  custom: CustomFood | null
  isFavorite: boolean
}

export function LibraryScreen() {
  const foods = useAppStore((s) => s.foods)
  const customFoods = useAppStore((s) => s.customFoods)
  const addCustomFood = useAppStore((s) => s.addCustomFood)
  const updateCustomFood = useAppStore((s) => s.updateCustomFood)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('Alles')
  const [selected, setSelected] = useState<SelectableFood | null>(null)
  const [editing, setEditing] = useState<CustomFood | 'new' | null>(null)

  const rows = useMemo<Row[]>(() => {
    const customRows: Row[] = customFoods.map((f) => ({
      key: `c-${f.id}`,
      name: f.name,
      protein_per_100g: Number(f.protein_per_100g),
      protein_per_serving: Number(f.protein_per_serving),
      serving_description: f.serving_description,
      category: f.category,
      emoji: f.emoji ?? '⭐',
      custom: f,
      isFavorite: f.is_favorite,
    }))
    const customNames = new Set(customFoods.map((f) => f.name.toLowerCase()))
    const seedRows: Row[] = foods
      .filter((f) => !customNames.has(f.name.toLowerCase()))
      .map((f) => ({
        key: `s-${f.id}`,
        name: f.name,
        protein_per_100g: Number(f.protein_per_100g),
        protein_per_serving: Number(f.protein_per_serving),
        serving_description: f.serving_description,
        category: f.category,
        emoji: f.emoji,
        custom: null,
        isFavorite: false,
      }))
    return [...customRows, ...seedRows].sort((a, b) => a.name.localeCompare(b.name, 'nl'))
  }, [foods, customFoods])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false
      if (filter === 'Alles') return true
      if (filter === '⭐') return r.isFavorite
      if (filter === 'Eigen') return r.custom !== null
      return r.category === filter
    })
  }, [rows, query, filter])

  /** Star toggle: customs flip is_favorite; seed foods get cloned into
   *  custom_foods first so the family can also edit the values later. */
  async function toggleFavorite(row: Row) {
    if (row.custom) {
      await updateCustomFood(row.custom.id, { is_favorite: !row.custom.is_favorite })
    } else {
      await addCustomFood({
        name: row.name,
        protein_per_100g: row.protein_per_100g,
        protein_per_serving: row.protein_per_serving,
        serving_description: row.serving_description,
        category: row.category,
        emoji: row.emoji,
        is_favorite: true,
      })
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">{t('lib.title')} 📖</h1>
        <button
          className="btn-gold min-h-[44px] px-4 py-2 text-sm"
          onClick={() => setEditing('new')}
        >
          + {t('lib.custom')}
        </button>
      </div>

      <input
        className="input-hero"
        type="search"
        placeholder={t('lib.search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t('lib.search')}
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">
        {['Alles', '⭐', 'Eigen', ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={filter === cat}
            className={`min-h-[40px] shrink-0 rounded-full border px-4 font-display text-sm font-semibold transition ${
              filter === cat
                ? 'border-electric-500 bg-electric-500/20 text-electric-300'
                : 'border-white/15 bg-white/5 text-slate-300'
            }`}
            onClick={() => setFilter(cat)}
          >
            {cat === '⭐' ? `⭐ ${t('lib.favorites')}` : cat}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {visible.map((row) => (
          <li key={row.key} className="glass-card flex min-h-[60px] items-center gap-2 px-3 py-2">
            <button
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              onClick={() =>
                setSelected({
                  name: row.name,
                  protein_per_serving: row.protein_per_serving,
                  protein_per_100g: row.protein_per_100g,
                  serving_description: row.serving_description,
                  emoji: row.emoji,
                  source: row.isFavorite ? 'favorite' : 'library',
                })
              }
            >
              <span className="text-2xl" aria-hidden="true">{row.emoji ?? '🍽️'}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display font-medium">{row.name}</span>
                <span className="block text-xs text-slate-400">
                  {row.serving_description} · {row.protein_per_100g.toFixed(1).replace('.', ',')} g /100g
                </span>
              </span>
              <span className="shrink-0 font-display font-semibold text-electric-400">
                {row.protein_per_serving.toFixed(1).replace('.', ',')} g
              </span>
            </button>
            <button
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition active:scale-90"
              onClick={() => void toggleFavorite(row)}
              aria-label={row.isFavorite ? 'Verwijder uit powerfoods' : 'Voeg toe aan powerfoods'}
              aria-pressed={row.isFavorite}
            >
              {row.isFavorite ? '⭐' : '☆'}
            </button>
            {row.custom && (
              <button
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg text-slate-400 transition active:scale-90"
                onClick={() => setEditing(row.custom)}
                aria-label={`${t('common.edit')}: ${row.name}`}
              >
                ✏️
              </button>
            )}
          </li>
        ))}
        {visible.length === 0 && (
          <li className="glass-card p-4 text-center text-slate-400">
            Niks gevonden in het handboek.
          </li>
        )}
      </ul>

      <p className="text-center text-xs text-slate-500">{t('settings.disclaimer')}</p>

      <ServingsSheet food={selected} onClose={() => setSelected(null)} />
      <CustomFoodSheet editing={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

// -------------------------------------------------------- custom food form --

function CustomFoodSheet({
  editing,
  onClose,
}: {
  editing: CustomFood | 'new' | null
  onClose: () => void
}) {
  const addCustomFood = useAppStore((s) => s.addCustomFood)
  const updateCustomFood = useAppStore((s) => s.updateCustomFood)
  const deleteCustomFood = useAppStore((s) => s.deleteCustomFood)
  const existing = editing !== 'new' ? editing : null

  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const parse = (key: string) =>
      Math.max(0, Number(String(data.get(key) ?? '0').replace(',', '.')) || 0)
    const payload = {
      name: String(data.get('name') ?? '').trim(),
      protein_per_100g: parse('per100'),
      protein_per_serving: parse('perServing'),
      serving_description: String(data.get('serving') ?? '').trim(),
      category: String(data.get('category') ?? 'Snacks'),
      emoji: String(data.get('emoji') ?? '').trim() || null,
    }
    if (!payload.name) return
    setBusy(true)
    try {
      if (existing) await updateCustomFood(existing.id, payload)
      else await addCustomFood(payload)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={editing !== null}
      onClose={onClose}
      title={existing ? `${t('common.edit')}: ${existing.name}` : t('lib.addCustom')}
    >
      <form key={existing?.id ?? 'new'} className="flex flex-col gap-3" onSubmit={submit}>
        <div className="flex gap-2">
          <div className="w-20">
            <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="cf-emoji">
              Emoji
            </label>
            <input id="cf-emoji" name="emoji" className="input-hero text-center"
              defaultValue={existing?.emoji ?? ''} placeholder="🍪" maxLength={4} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="cf-name">
              Naam
            </label>
            <input id="cf-name" name="name" className="input-hero" required
              defaultValue={existing?.name ?? ''} placeholder="Bijv. eiwitarme muffin" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="cf-100">
              Eiwit per 100 g
            </label>
            <input id="cf-100" name="per100" className="input-hero" inputMode="decimal"
              defaultValue={existing ? String(existing.protein_per_100g) : ''} placeholder="0,5" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="cf-serv">
              Eiwit per portie
            </label>
            <input id="cf-serv" name="perServing" className="input-hero" inputMode="decimal"
              defaultValue={existing ? String(existing.protein_per_serving) : ''} placeholder="0,3" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="cf-desc">
            Portie-omschrijving
          </label>
          <input id="cf-desc" name="serving" className="input-hero"
            defaultValue={existing?.serving_description ?? ''} placeholder="1 muffin (45 g)" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="cf-cat">
            Categorie
          </label>
          <select id="cf-cat" name="category" className="input-hero"
            defaultValue={existing?.category ?? 'Snacks'}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button className="btn-hero" disabled={busy}>
          {busy ? t('common.loading') : t('common.save')}
        </button>
        {existing && (
          <button
            type="button"
            className="btn-ghost text-hero-400"
            onClick={() => {
              void deleteCustomFood(existing.id).then(onClose)
            }}
          >
            {t('common.delete')}
          </button>
        )}
      </form>
    </Sheet>
  )
}
