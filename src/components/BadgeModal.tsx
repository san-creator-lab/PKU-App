import { AnimatePresence, motion } from 'framer-motion'
import type { BadgeDef } from '@/lib/gamification'

interface Props {
  badge: BadgeDef | null
  onClose: () => void
}

/** Full-screen badge unlock: POW! burst, spinning badge, confetti fired by shell. */
export function BadgeModal({ badge, onClose }: Props) {
  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-navy-950/80 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Nieuwe badge: ${badge.name}`}
        >
          <motion.div
            className="relative w-full max-w-sm rounded-card border-2 border-gold-500/60 bg-navy-800 p-8 text-center shadow-glow-gold"
            initial={{ scale: 0.5, y: 60 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            {/* POW! star burst */}
            <motion.div
              className="absolute -top-9 left-1/2 -translate-x-1/2"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: -8 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 400, damping: 18 }}
            >
              <svg width="110" height="72" viewBox="0 0 110 72" aria-hidden="true">
                <polygon
                  points="55,0 64,16 82,6 78,24 100,22 88,36 110,44 88,50 96,68 76,60 72,72 55,58 38,72 34,60 14,68 22,50 0,44 22,36 10,22 32,24 28,6 46,16"
                  fill="#FFD700"
                  stroke="#0F1B2D"
                  strokeWidth="2.5"
                />
                <text x="55" y="44" textAnchor="middle" fontFamily="Fredoka, sans-serif"
                  fontWeight="700" fontSize="24" fill="#FF3B3B">POW!</text>
              </svg>
            </motion.div>

            <motion.div
              className="mx-auto mb-4 mt-4 flex h-28 w-28 items-center justify-center rounded-full border-4 border-gold-500 bg-navy-900 text-6xl shadow-glow-gold"
              initial={{ rotate: -540, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 17 }}
            >
              <span aria-hidden="true">{badge.emoji}</span>
            </motion.div>

            <div className="font-display text-sm uppercase tracking-widest text-electric-400">
              Nieuwe badge!
            </div>
            <h2 className="mt-1 font-display text-3xl text-gold-500">{badge.name}</h2>
            <p className="mt-2 text-slate-300">{badge.description}</p>

            <button className="btn-gold mt-6 w-full" onClick={onClose} autoFocus>
              Te gek! 🎉
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
