import { motion } from 'framer-motion'
import { t } from '@/lib/i18n'

interface Props {
  streak: number
  shields: number
}

/** Streak counter with flame + shield indicator. */
export function StreakFlame({ streak, shields }: Props) {
  return (
    <div className="glass-card flex items-center gap-3 px-4 py-2.5">
      <motion.span
        className="text-2xl"
        animate={streak > 0 ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 1.4, repeat: Infinity }}
        aria-hidden="true"
      >
        {streak > 0 ? '🔥' : '🕯️'}
      </motion.span>
      <div>
        <div className="font-display text-xl font-semibold leading-none text-gold-400">
          {streak}
        </div>
        <div className="text-xs text-slate-400">{t('dash.streak')}</div>
      </div>
      <div
        className="ml-2 flex items-center gap-1 rounded-full bg-electric-500/10 px-2 py-1"
        title={`${shields} ${t('dash.shield')}`}
      >
        <span aria-hidden="true">🛡️</span>
        <span className="font-display text-sm font-semibold text-electric-400">
          {shields}
        </span>
      </div>
    </div>
  )
}
