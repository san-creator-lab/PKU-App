import { AnimatePresence, motion } from 'framer-motion'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAlerts } from '@/hooks/useAlerts'
import { useAppStore } from '@/hooks/useAppStore'
import { t } from '@/lib/i18n'
import { BadgeModal } from './BadgeModal'
import { Confetti } from './Confetti'
import { LevelUpOverlay } from './LevelUpOverlay'

interface Tab {
  to: string
  icon: string
  labelKey: Parameters<typeof t>[0]
}

const HERO_TABS: Tab[] = [
  { to: '/', icon: '🏠', labelKey: 'nav.home' },
  { to: '/add', icon: '⚡', labelKey: 'nav.add' },
  { to: '/library', icon: '📖', labelKey: 'nav.library' },
  { to: '/badges', icon: '🏆', labelKey: 'nav.badges' },
  { to: '/avatar', icon: '🦸', labelKey: 'nav.avatar' },
]

const SIDEKICK_TABS: Tab[] = [
  { to: '/', icon: '🏠', labelKey: 'nav.home' },
  { to: '/add', icon: '⚡', labelKey: 'nav.add' },
  { to: '/library', icon: '📖', labelKey: 'nav.library' },
  { to: '/badges', icon: '🏆', labelKey: 'nav.badges' },
  { to: '/hq', icon: '🛰️', labelKey: 'nav.hq' },
]

export function AppShell() {
  const role = useAppStore((s) => s.myProfile?.role)
  const online = useAppStore((s) => s.online)
  const outboxPending = useAppStore((s) => s.outboxPending)
  const badgeQueue = useAppStore((s) => s.badgeQueue)
  const popBadge = useAppStore((s) => s.popBadge)
  const celebration = useAppStore((s) => s.celebration)
  const clearCelebration = useAppStore((s) => s.clearCelebration)
  const location = useLocation()
  useAlerts()

  const tabs = role === 'sidekick' ? SIDEKICK_TABS : HERO_TABS

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <AnimatePresence>
        {(!online || outboxPending > 0) && (
          <motion.div
            initial={{ y: -40 }}
            animate={{ y: 0 }}
            exit={{ y: -40 }}
            className="sticky top-0 z-30 bg-gold-500/95 px-4 py-1.5 text-center font-display text-sm font-semibold text-navy-950"
            role="status"
          >
            {!online
              ? `📡 ${t('common.offline')}`
              : `⏳ ${outboxPending} ${t('common.pending')}`}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-navy-950/95 backdrop-blur-lg"
        aria-label="Hoofdnavigatie"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex min-h-[52px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-hero px-2 transition ${
                  isActive ? 'text-electric-400' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.span
                    className="text-2xl"
                    animate={isActive ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                    aria-hidden="true"
                  >
                    {tab.icon}
                  </motion.span>
                  <span className="font-display text-[11px] font-semibold">
                    {t(tab.labelKey)}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* celebration overlays */}
      {celebration && <Confetti onDone={clearCelebration} />}
      {celebration === 'levelup' && <LevelUpOverlay onDone={clearCelebration} />}
      <BadgeModal badge={badgeQueue[0] ?? null} onClose={popBadge} />
    </div>
  )
}
