import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { WeekChart } from '@/components/WeekChart'
import { heroProfileOf, useAppStore } from '@/hooks/useAppStore'
import { addDays, formatTimeNL, todayISO } from '@/lib/dates'
import { dayTotal, ZONE_COLORS, zoneFor } from '@/lib/gamification'
import { MEAL_EMOJI } from '@/lib/i18n'

/** Sidekick HQ: parent overview, trends, and management entry points. */
export function SidekickDashboard() {
  const navigate = useNavigate()
  const myProfile = useAppStore((s) => s.myProfile)
  const familyProfiles = useAppStore((s) => s.familyProfiles)
  const entries = useAppStore((s) => s.entries)
  const deleteEntry = useAppStore((s) => s.deleteEntry)
  const [range, setRange] = useState<7 | 14 | 30>(14)

  const hero = heroProfileOf({ familyProfiles, myProfile })
  const limit = Number(hero?.daily_protein_limit ?? 8)
  const today = todayISO()

  const todayEntries = useMemo(
    () =>
      entries
        .filter((e) => e.date === today)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [entries, today],
  )
  const total = dayTotal(entries, today)
  const remaining = Math.max(0, limit - total)
  const zone = zoneFor(total, limit)

  const stats = useMemo(() => {
    let under = 0
    let over = 0
    let sum = 0
    let daysWithData = 0
    for (let i = 0; i < range; i++) {
      const d = addDays(today, -i)
      const t = dayTotal(entries, d)
      const has = entries.some((e) => e.date === d)
      if (!has) continue
      daysWithData++
      sum += t
      if (t <= limit) under++
      else over++
    }
    return {
      avg: daysWithData ? Math.round((sum / daysWithData) * 10) / 10 : 0,
      under,
      over,
    }
  }, [entries, range, today, limit])

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Sidekick HQ 🛰️</h1>
          <p className="text-sm text-slate-400">
            Overzicht van {hero?.display_name ?? 'jullie held'}
          </p>
        </div>
        <Link
          to="/settings"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-xl"
          aria-label="Instellingen"
        >
          ⚙️
        </Link>
      </header>

      {/* today overview */}
      <div className="glass-card p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg">Vandaag</h2>
          <span
            className="rounded-full px-3 py-1 font-display text-sm font-bold"
            style={{ background: `${ZONE_COLORS[zone]}22`, color: ZONE_COLORS[zone] }}
          >
            {total.toFixed(1).replace('.', ',')} / {limit.toFixed(1).replace('.', ',')} g
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-300">
          Nog{' '}
          <strong className="text-electric-400">
            {remaining.toFixed(1).replace('.', ',')} g
          </strong>{' '}
          eiwit-budget over vandaag.
        </p>

        {/* meal timeline */}
        <ol className="mt-3 flex flex-col gap-1.5" aria-label="Tijdlijn van vandaag">
          {todayEntries.length === 0 && (
            <li className="text-sm text-slate-400">Nog niets gelogd vandaag.</li>
          )}
          {todayEntries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-sm">
              <span className="w-12 shrink-0 tabular-nums text-slate-400">
                {formatTimeNL(e.created_at)}
              </span>
              <span aria-hidden="true">{MEAL_EMOJI[e.meal_type]}</span>
              <span className="min-w-0 flex-1 truncate">{e.food_name || '—'}</span>
              <span className="font-semibold text-electric-400">
                {Number(e.protein_grams).toFixed(1).replace('.', ',')} g
              </span>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:text-hero-400"
                onClick={() => void deleteEntry(e.id)}
                aria-label={`Verwijder ${e.food_name || 'invoer'}`}
              >
                🗑️
              </button>
            </li>
          ))}
        </ol>

        <button className="btn-hero mt-3 w-full" onClick={() => navigate('/add')}>
          ⚡ Log voor {hero?.display_name ?? 'de held'}
        </button>
      </div>

      {/* trends */}
      <div className="glass-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg">Trend</h2>
          <div className="flex gap-1 rounded-full bg-white/5 p-1" role="tablist">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                role="tab"
                aria-selected={range === d}
                className={`min-h-[36px] rounded-full px-3 font-display text-xs font-semibold ${
                  range === d ? 'bg-electric-500 text-navy-950' : 'text-slate-300'
                }`}
                onClick={() => setRange(d)}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <WeekChart entries={entries} limit={limit} days={range} />
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-hero bg-white/5 p-2">
            <dt className="text-[11px] text-slate-400">gem./dag</dt>
            <dd className="font-display text-lg font-semibold text-electric-400">
              {String(stats.avg).replace('.', ',')} g
            </dd>
          </div>
          <div className="rounded-hero bg-white/5 p-2">
            <dt className="text-[11px] text-slate-400">binnen budget</dt>
            <dd className="font-display text-lg font-semibold text-power-green">
              {stats.under} dgn
            </dd>
          </div>
          <div className="rounded-hero bg-white/5 p-2">
            <dt className="text-[11px] text-slate-400">erboven</dt>
            <dd className="font-display text-lg font-semibold text-power-red">
              {stats.over} dgn
            </dd>
          </div>
        </dl>
      </div>

      {/* management links */}
      <nav className="grid grid-cols-2 gap-3" aria-label="Beheer">
        <Link to="/hq/history" className="glass-card flex min-h-[64px] items-center gap-3 p-4">
          <span className="text-2xl" aria-hidden="true">📜</span>
          <span className="font-display font-semibold">Geschiedenis</span>
        </Link>
        <Link to="/library" className="glass-card flex min-h-[64px] items-center gap-3 p-4">
          <span className="text-2xl" aria-hidden="true">📖</span>
          <span className="font-display font-semibold">Handboek beheren</span>
        </Link>
      </nav>
    </div>
  )
}
