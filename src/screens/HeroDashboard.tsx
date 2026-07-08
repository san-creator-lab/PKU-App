import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChallengeCard } from '@/components/ChallengeCard'
import { HeroAvatar, type AvatarState } from '@/components/HeroAvatar'
import { MealCard } from '@/components/MealCard'
import { MissionsPanel } from '@/components/MissionsPanel'
import { PowerMeter } from '@/components/PowerMeter'
import { SpeechBubble } from '@/components/SpeechBubble'
import { StreakFlame } from '@/components/StreakFlame'
import { heroProfileOf, useAppStore } from '@/hooks/useAppStore'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { todayISO } from '@/lib/dates'
import { parseGear } from '@/lib/economy'
import { dayTotal, zoneFor } from '@/lib/gamification'
import { t } from '@/lib/i18n'

const STATE_MESSAGES: Record<AvatarState, string> = {
  charging: 'Tijd om op te laden! Wat is je eerste missie vandaag?',
  green: 'Je bent supersterk vandaag! 💪',
  yellow: 'Slim opletten, held — schild omhoog! 🛡️',
  red: 'Bijna vol! Kies je volgende missie zorgvuldig.',
  over: 'Elke held heeft zware dagen. Morgen is een nieuwe missie! 💪',
}

export function HeroDashboard() {
  const navigate = useNavigate()
  const myProfile = useAppStore((s) => s.myProfile)
  const familyProfiles = useAppStore((s) => s.familyProfiles)
  const entries = useAppStore((s) => s.entries)
  const refresh = useAppStore((s) => s.refresh)
  const { pull, refreshing } = usePullToRefresh(refresh)

  const hero = heroProfileOf({ familyProfiles, myProfile })
  const today = todayISO()
  const todayEntries = useMemo(
    () =>
      entries
        .filter((e) => e.date === today)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [entries, today],
  )

  const limit = Number(hero?.daily_protein_limit ?? 8)
  const total = dayTotal(entries, today)
  const state: AvatarState =
    todayEntries.length === 0 ? 'charging' : zoneFor(total, limit)

  return (
    <div
      className="flex flex-col gap-5 p-4 pt-6"
      style={{ transform: pull ? `translateY(${pull}px)` : undefined }}
    >
      {/* pull-to-refresh recharge indicator */}
      {(pull > 0 || refreshing) && (
        <div
          className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center"
          aria-live="polite"
        >
          <motion.span
            className="text-3xl"
            animate={refreshing ? { rotate: 360 } : { rotate: pull * 3 }}
            transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
          >
            ⚡
          </motion.span>
          {refreshing && (
            <span className="ml-2 self-center font-display text-sm text-electric-400">
              Opladen…
            </span>
          )}
        </div>
      )}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">
            Hoi {hero?.display_name ?? 'held'}! <span aria-hidden="true">👋</span>
          </h1>
          <div className="mt-0.5 flex items-center gap-2 text-sm font-semibold">
            <span className="text-gold-400">🪙 {hero?.coins ?? 0}</span>
            <span className="text-electric-400">⚡ {hero?.game_tokens ?? 0}</span>
          </div>
        </div>
        <StreakFlame
          streak={hero?.streak_current ?? 0}
          shields={hero?.streak_shields ?? 0}
        />
      </header>

      <div className="flex flex-col items-center">
        <div className="flex w-full items-start justify-center gap-1">
          <HeroAvatar
            state={state}
            level={hero?.avatar_level ?? 1}
            size={150}
            gear={parseGear(hero).equipped}
          />
          <div className="mt-4">
            <SpeechBubble>{STATE_MESSAGES[state]}</SpeechBubble>
          </div>
        </div>
        <div className="-mt-4">
          <PowerMeter total={total} limit={limit} size={270} />
        </div>
      </div>

      <MissionsPanel />

      <ChallengeCard />

      <section aria-label={t('dash.todayMeals')}>
        <h2 className="mb-2 font-display text-xl">{t('dash.todayMeals')}</h2>
        {todayEntries.length === 0 ? (
          <div className="glass-card p-5 text-center text-slate-300">
            {t('dash.noMeals')}
          </div>
        ) : (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {todayEntries.map((entry) => (
              <MealCard key={entry.id} entry={entry} profiles={familyProfiles} />
            ))}
          </div>
        )}
      </section>

      {/* Quick add FAB */}
      <motion.button
        className="fixed bottom-24 right-5 z-30 flex h-16 w-16 animate-pulse-glow items-center justify-center rounded-full bg-gold-500 text-3xl"
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/add')}
        aria-label={t('dash.addFuel')}
      >
        ⚡
      </motion.button>
    </div>
  )
}
