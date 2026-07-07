import { motion } from 'framer-motion'
import { useEffect } from 'react'

/** Golden flash + sparkle when the hero levels up (paired with confetti). */
export function LevelUpOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 2000)
    return () => clearTimeout(id)
  }, [onDone])

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[85] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      aria-live="polite"
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(255,215,0,0.28), transparent 60%)',
        }}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1.4, opacity: [0, 1, 0] }}
        transition={{ duration: 1.6 }}
      />
      <motion.div
        className="relative text-center"
        initial={{ scale: 0.4, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <div className="font-display text-5xl font-bold text-gold-500 drop-shadow-[0_0_18px_rgba(255,215,0,0.8)]">
          LEVEL UP!
        </div>
        <div className="mt-1 font-display text-xl text-electric-300">
          Nieuwe kracht ontgrendeld ⬆️
        </div>
        {['-left-8 -top-6', '-right-10 top-2', 'left-6 -bottom-8', 'right-2 -top-10'].map(
          (pos, i) => (
            <motion.span
              key={pos}
              className={`absolute ${pos} text-3xl`}
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: [0, 1.3, 0.9], rotate: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.7 }}
              aria-hidden="true"
            >
              ✨
            </motion.span>
          ),
        )}
      </motion.div>
    </motion.div>
  )
}
