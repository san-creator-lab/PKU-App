import type { FoodEntry } from '@/lib/backend'
import { addDays, todayISO } from '@/lib/dates'
import { dayTotal } from '@/lib/gamification'
import { streakMultiplier } from '@/lib/economy'

interface Props {
  entries: FoodEntry[]
  limit: number
  streak: number
}

/** Last 14 days at a glance: flames for green days, moons for tough ones. */
export function StreakCalendar({ entries, limit, streak }: Props) {
  const today = todayISO()
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, -(13 - i))
    const has = entries.some((e) => e.date === date)
    const total = dayTotal(entries, date)
    const isToday = date === today
    let icon = '·'
    let label = 'geen data'
    if (has && total <= limit) {
      icon = '🔥'
      label = 'binnen budget'
    } else if (has) {
      icon = '🌙'
      label = 'zware dag'
    }
    if (isToday) {
      icon = has ? '⚡' : '…'
      label = 'vandaag'
    }
    return { date, icon, label, isToday }
  })

  const mult = streakMultiplier(streak)

  return (
    <div className="glass-card p-4" aria-label="Streak-kalender">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-lg">Jouw streak 🔥</h2>
        {mult > 1 ? (
          <span className="rounded-full bg-gold-500/15 px-2 py-0.5 font-display text-xs font-bold text-gold-400">
            XP ×{mult} bonus actief!
          </span>
        ) : (
          <span className="text-xs text-slate-400">7 dagen = XP ×1,5</span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <div
            key={d.date}
            className={`flex h-10 items-center justify-center rounded-lg text-lg ${
              d.isToday ? 'border border-electric-500/60 bg-electric-500/10' : 'bg-white/5'
            }`}
            title={`${d.date}: ${d.label}`}
            aria-label={`${d.date}: ${d.label}`}
          >
            <span aria-hidden="true">{d.icon}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        🔥 = dag binnen budget · 🌙 = zware dag (schild vangt &apos;m op) · ⚡ = vandaag
      </p>
    </div>
  )
}
