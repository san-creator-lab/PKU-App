import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '@/hooks/useAppStore'
import { backend, type FoodEntry } from '@/lib/backend'
import { addDays, formatDateNL, formatTimeNL, todayISO } from '@/lib/dates'
import { MEAL_EMOJI, t } from '@/lib/i18n'

/** Full chronological meal history with date filter + search. */
export function HistoryScreen() {
  const familyProfiles = useAppStore((s) => s.familyProfiles)
  const deleteEntry = useAppStore((s) => s.deleteEntry)
  const storeEntries = useAppStore((s) => s.entries)

  const [from, setFrom] = useState(addDays(todayISO(), -14))
  const [to, setTo] = useState(todayISO())
  const [search, setSearch] = useState('')
  const [fetched, setFetched] = useState<FoodEntry[] | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch the requested range directly from the backend so parents can go
  // beyond the store's rolling 60-day window.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    backend
      .listEntries(from, to)
      .then((rows) => {
        if (!cancelled) setFetched(rows)
      })
      .catch(() => {
        if (!cancelled) setFetched(null) // fall back to store window
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [from, to, storeEntries.length])

  const entries = fetched ?? storeEntries.filter((e) => e.date >= from && e.date <= to)

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = entries.filter(
      (e) => !q || e.food_name.toLowerCase().includes(q),
    )
    const byDate = new Map<string, FoodEntry[]>()
    for (const e of filtered) {
      const list = byDate.get(e.date) ?? []
      list.push(e)
      byDate.set(e.date, list)
    }
    return [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, list]) => ({
        date,
        list: list.sort((a, b) => b.created_at.localeCompare(a.created_at)),
        total: list.reduce((s, e) => s + Number(e.protein_grams), 0),
      }))
  }, [entries, search])

  const nameOf = (id: string) =>
    familyProfiles.find((p) => p.id === id)?.display_name ?? '?'

  return (
    <div className="flex flex-col gap-3 p-4 pt-6">
      <header className="flex items-center gap-3">
        <Link to="/hq" className="text-2xl" aria-label={t('common.back')}>←</Link>
        <h1 className="font-display text-3xl">Geschiedenis 📜</h1>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="h-from">
            Vanaf
          </label>
          <input id="h-from" type="date" className="input-hero" value={from}
            max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="h-to">
            Tot en met
          </label>
          <input id="h-to" type="date" className="input-hero" value={to}
            min={from} max={todayISO()} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <input
        className="input-hero"
        type="search"
        placeholder="Zoek in de geschiedenis…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Zoek in de geschiedenis"
      />

      {loading && <p className="text-center text-sm text-slate-400">{t('common.loading')}</p>}

      {grouped.map(({ date, list, total }) => (
        <section key={date} aria-label={formatDateNL(date)}>
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="font-display text-lg capitalize">{formatDateNL(date)}</h2>
            <span className="text-sm font-semibold text-electric-400">
              {total.toFixed(1).replace('.', ',')} g
            </span>
          </div>
          <ul className="glass-card divide-y divide-white/5">
            {list.map((e) => (
              <li key={e.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="w-11 shrink-0 tabular-nums text-slate-400">
                  {formatTimeNL(e.created_at)}
                </span>
                <span aria-hidden="true">{MEAL_EMOJI[e.meal_type]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{e.food_name || '—'}</span>
                  <span className="text-[11px] text-slate-500">
                    {e.source === 'scan' ? '📸 gescand · ' : ''}door {nameOf(e.logged_by)}
                  </span>
                </span>
                <span className="font-semibold text-electric-400">
                  {Number(e.protein_grams).toFixed(1).replace('.', ',')} g
                </span>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:text-hero-400"
                  onClick={() => void deleteEntry(e.id)}
                  aria-label={`Verwijder ${e.food_name || 'invoer'} van ${date}`}
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!loading && grouped.length === 0 && (
        <p className="glass-card p-6 text-center text-slate-400">
          Geen invoer gevonden in deze periode.
        </p>
      )}
    </div>
  )
}
