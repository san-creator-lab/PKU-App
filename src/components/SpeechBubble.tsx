import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

/** Comic-style speech bubble for hero feedback messages. */
export function SpeechBubble({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="relative max-w-[260px] rounded-2xl border-2 border-white/20 bg-white px-4 py-2.5 font-display font-medium text-navy-900"
      initial={{ opacity: 0, scale: 0.6, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
    >
      {children}
      <svg
        className="absolute -bottom-3 left-8"
        width="22"
        height="14"
        viewBox="0 0 22 14"
        aria-hidden="true"
      >
        <path d="M2 0 L20 0 L8 14 Z" fill="white" />
      </svg>
    </motion.div>
  )
}
