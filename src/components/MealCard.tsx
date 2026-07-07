import { motion } from 'framer-motion'
import type { FoodEntry, Profile } from '@/lib/backend'
import { formatTimeNL } from '@/lib/dates'
import { MEAL_EMOJI, MEAL_LABELS, t } from '@/lib/i18n'

interface Props {
  entry: FoodEntry
  profiles: Profile[]
  onClick?: () => void
}

/** Comic-panel meal card for the horizontal timeline. */
export function MealCard({ entry, profiles, onClick }: Props) {
  const logger = profiles.find((p) => p.id === entry.logged_by)
  const bySidekick = logger?.role === 'sidekick'

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="glass-card relative w-40 shrink-0 snap-start border-2 border-white/15 p-3 text-left"
      initial={{ opacity: 0, y: 40, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      whileTap={{ scale: 0.96 }}
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl" aria-hidden="true">
          {MEAL_EMOJI[entry.meal_type]}
        </span>
        <span className="rounded-full bg-electric-500/15 px-2 py-0.5 font-display text-sm font-semibold text-electric-400">
          +{Number(entry.protein_grams).toFixed(1).replace('.', ',')}
        </span>
      </div>
      <div className="mt-2 line-clamp-2 min-h-[2.5rem] font-display font-medium leading-tight">
        {entry.food_name || t(MEAL_LABELS[entry.meal_type])}
      </div>
      <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
        <span>{formatTimeNL(entry.created_at)}</span>
        {entry.source === 'scan' && <span aria-label="gescand">📸</span>}
        {bySidekick && (
          <span className="ml-auto rounded-full bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-gold-400">
            🦸 {logger?.display_name}
          </span>
        )}
      </div>
    </motion.button>
  )
}
