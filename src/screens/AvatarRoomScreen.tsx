import { motion } from 'framer-motion'
import { HeroAvatar } from '@/components/HeroAvatar'
import { heroProfileOf, useAppStore } from '@/hooks/useAppStore'
import { todayISO } from '@/lib/dates'
import {
  AVATAR_STAGES,
  avatarStageForLevel,
  dayTotal,
  levelForXp,
  xpProgressInLevel,
  zoneFor,
} from '@/lib/gamification'

/** Avatar room: your hero up close, XP bar, and the gear roadmap. */
export function AvatarRoomScreen() {
  const myProfile = useAppStore((s) => s.myProfile)
  const familyProfiles = useAppStore((s) => s.familyProfiles)
  const entries = useAppStore((s) => s.entries)
  const hero = heroProfileOf({ familyProfiles, myProfile })

  if (!hero) return null
  const level = levelForXp(hero.xp)
  const { current, needed } = xpProgressInLevel(hero.xp)
  const stage = avatarStageForLevel(level)
  const total = dayTotal(entries, todayISO())
  const state = entries.some((e) => e.date === todayISO())
    ? zoneFor(total, Number(hero.daily_protein_limit))
    : 'charging'

  return (
    <div className="flex flex-col gap-5 p-4 pt-6">
      <header className="text-center">
        <h1 className="font-display text-3xl">{hero.display_name} 🦸</h1>
        <p className="text-sm text-slate-400">
          Level {level} · {stage.label}
        </p>
      </header>

      <div className="flex justify-center">
        <HeroAvatar state={state} level={level} size={210} />
      </div>

      {/* XP bar */}
      <div className="glass-card p-4">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="font-display font-semibold text-electric-400">
            Level {level}
          </span>
          <span className="text-sm text-slate-400">
            {current}/{needed} XP naar level {level + 1}
          </span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-electric-500 to-gold-500"
            initial={{ width: 0 }}
            animate={{ width: `${(current / needed) * 100}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 16 }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Verdien XP: +10 per missie, +15 per scan, +50 per dag binnen budget.
        </p>
      </div>

      {/* gear roadmap */}
      <section aria-label="Uitrusting">
        <h2 className="mb-2 font-display text-xl">Jouw uitrusting</h2>
        <div className="flex flex-col gap-2">
          {AVATAR_STAGES.map((s) => {
            const unlocked = level >= s.level
            return (
              <div
                key={s.key}
                className={`glass-card flex items-center gap-3 px-4 py-3 ${
                  unlocked ? 'border-electric-500/40' : 'opacity-60'
                }`}
              >
                <span className="text-2xl" aria-hidden="true">
                  {unlocked ? '✅' : '🔒'}
                </span>
                <span className="flex-1 font-display font-medium">{s.label}</span>
                <span className={`font-display text-sm font-semibold ${unlocked ? 'text-electric-400' : 'text-slate-400'}`}>
                  Level {s.level}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
