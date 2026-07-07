import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/** Bottom sheet with a drag-friendly grab bar; the app's modal workhorse. */
export function Sheet({ open, onClose, title, children }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-navy-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="safe-bottom fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-card border-t border-white/10 bg-navy-800 p-5"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />
            {title && <h2 className="mb-4 font-display text-2xl">{title}</h2>}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
