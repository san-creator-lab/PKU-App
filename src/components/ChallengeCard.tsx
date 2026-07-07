import { motion } from 'framer-motion'
import { useAppStore } from '@/hooks/useAppStore'
import { challengeDef } from '@/lib/gamification'

/** Weekly challenge with live progress bar. */
export function ChallengeCard() {
  const challenge = useAppStore((s) => s.challenge)
  const entries = useAppStore((s) => s.entries)
  const familyProfiles = useAppStore((s) => s.familyProfiles)

  if (!challenge) return null
  const def = challengeDef(challenge.challenge_type)
  const hero = familyProfiles.find((p) => p.role === 'hero') ?? null
  const weekEntries = entries.filter((e) => e.date >= challenge.week_start)
  const progress = Math.min(def.progress(weekEntries, hero?.id ?? null), def.target)
  const done = challenge.completed

  return (
    <div
      className={`glass-card p-4 ${done ? 'border-gold-500/50 shadow-glow-gold' : ''}`}
      aria-label={`Weekuitdaging: ${def.name}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">
          {done ? '🏆' : def.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate font-display text-lg">{def.name}</h3>
            <span className="shrink-0 font-display text-sm font-semibold text-electric-400">
              {done ? 'Gehaald!' : `${progress}/${def.target}`}
            </span>
          </div>
          <p className="truncate text-xs text-slate-400">{def.description}</p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className={`h-full rounded-full ${done ? 'bg-gold-500' : 'bg-electric-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${(progress / def.target) * 100}%` }}
              transition={{ type: 'spring', stiffness: 60, damping: 15 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
