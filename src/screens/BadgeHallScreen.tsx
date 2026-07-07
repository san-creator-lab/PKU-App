import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { heroProfileOf, useAppStore } from '@/hooks/useAppStore'
import { BADGES } from '@/lib/gamification'

/** Trophy room: earned badges shine, locked ones show what to aim for. */
export function BadgeHallScreen() {
  const badges = useAppStore((s) => s.badges)
  const myProfile = useAppStore((s) => s.myProfile)
  const familyProfiles = useAppStore((s) => s.familyProfiles)
  const hero = heroProfileOf({ familyProfiles, myProfile })

  const earned = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of badges) {
      if (b.profile_id === hero?.id) map.set(b.badge_type, b.earned_at)
    }
    return map
  }, [badges, hero])

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <header>
        <h1 className="font-display text-3xl">Badge-hal 🏆</h1>
        <p className="text-sm text-slate-400">
          {earned.size} van {BADGES.length} badges verdiend
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {BADGES.map((badge, i) => {
          const isEarned = earned.has(badge.type)
          return (
            <motion.div
              key={badge.type}
              className={`glass-card flex flex-col items-center gap-1.5 p-4 text-center ${
                isEarned ? 'border-gold-500/50 shadow-glow-gold' : 'opacity-70'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isEarned ? 1 : 0.7, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.5) }}
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full border-2 text-3xl ${
                  isEarned
                    ? 'border-gold-500 bg-gold-500/10'
                    : 'border-white/15 bg-white/5 grayscale'
                }`}
                aria-hidden="true"
              >
                {isEarned ? badge.emoji : '🔒'}
              </div>
              <h3 className={`font-display font-semibold leading-tight ${isEarned ? 'text-gold-400' : 'text-slate-300'}`}>
                {badge.name}
              </h3>
              <p className="text-xs leading-snug text-slate-400">{badge.description}</p>
              {isEarned && (
                <span className="text-[10px] text-slate-500">
                  {new Date(earned.get(badge.type)!).toLocaleDateString('nl-NL')}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
