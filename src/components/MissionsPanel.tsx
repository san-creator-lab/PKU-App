import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { heroProfileOf, useAppStore } from '@/hooks/useAppStore'
import { parseGear, type ShopItem } from '@/lib/economy'
import { todayISO } from '@/lib/dates'
import { allMissionsClaimed, missionStates } from '@/lib/missions'

/**
 * Daily missions: three per day with tap-to-claim rewards; claiming all
 * three unlocks the bonus chest. The panel is the dashboard's daily loop.
 */
export function MissionsPanel() {
  const entries = useAppStore((s) => s.entries)
  const myProfile = useAppStore((s) => s.myProfile)
  const familyProfiles = useAppStore((s) => s.familyProfiles)
  const claimMission = useAppStore((s) => s.claimMission)
  const openChest = useAppStore((s) => s.openChest)

  const [chestResult, setChestResult] = useState<{
    coins: number
    item: ShopItem | null
  } | null>(null)
  const [chestBusy, setChestBusy] = useState(false)

  const hero = heroProfileOf({ familyProfiles, myProfile })
  const gear = parseGear(hero)
  const today = todayISO()

  // cheap to derive every render: three defs over today's handful of entries
  const missions = missionStates(today, {
    entries: entries.filter((e) => e.date === today),
    heroId: hero?.id ?? null,
    gear,
  })

  const allClaimed = allMissionsClaimed(missions)
  const chestAvailable = allClaimed && !gear.daily.chestOpened

  async function handleChest() {
    setChestBusy(true)
    try {
      const result = await openChest()
      if (result) setChestResult(result)
    } finally {
      setChestBusy(false)
    }
  }

  return (
    <section className="glass-card p-4" aria-label="Dagmissies">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg">Dagmissies 🎯</h2>
        <span className="text-xs text-slate-400">
          {missions.filter((m) => m.claimed).length}/{missions.length} geclaimd
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {missions.map((mission) => (
          <li
            key={mission.id}
            className={`flex min-h-[52px] items-center gap-3 rounded-hero border px-3 py-2 ${
              mission.claimed
                ? 'border-power-green/40 bg-power-green/10'
                : mission.completed
                  ? 'border-gold-500/60 bg-gold-500/10'
                  : 'border-white/10 bg-white/5'
            }`}
          >
            <span className="text-2xl" aria-hidden="true">
              {mission.claimed ? '✅' : mission.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm font-semibold">
                {mission.title}
              </div>
              <div className="truncate text-xs text-slate-400">{mission.description}</div>
              {mission.target > 1 && !mission.claimed && (
                <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-electric-500 transition-all"
                    style={{ width: `${(mission.current / mission.target) * 100}%` }}
                  />
                </div>
              )}
            </div>
            {mission.claimed ? (
              <span className="text-xs font-semibold text-power-green">+15 🪙</span>
            ) : mission.completed ? (
              <motion.button
                className="min-h-[40px] animate-pulse-glow rounded-hero bg-gold-500 px-3 font-display text-sm font-bold text-navy-950"
                whileTap={{ scale: 0.92 }}
                onClick={() => void claimMission(mission.id)}
              >
                CLAIM 🪙
              </motion.button>
            ) : (
              <span className="text-xs tabular-nums text-slate-500">
                {mission.current}/{mission.target}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* bonus chest */}
      <AnimatePresence>
        {chestAvailable && (
          <motion.button
            className="mt-3 flex min-h-[56px] w-full items-center justify-center gap-3 rounded-hero border-2 border-gold-500 bg-gold-500/15 font-display text-lg font-bold text-gold-400 shadow-glow-gold"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => void handleChest()}
            disabled={chestBusy}
          >
            <motion.span
              className="text-3xl"
              animate={{ rotate: [-6, 6, -6], y: [0, -2, 0] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              aria-hidden="true"
            >
              🎁
            </motion.span>
            Open je bonuskist!
          </motion.button>
        )}
      </AnimatePresence>
      {allClaimed && gear.daily.chestOpened && !chestResult && (
        <p className="mt-3 text-center text-sm text-power-green">
          Alle missies gehaald — kist geopend! Morgen weer nieuwe. 🌟
        </p>
      )}

      {/* chest reveal modal */}
      <AnimatePresence>
        {chestResult && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-navy-950/85 p-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Bonuskist"
          >
            <motion.div
              className="w-full max-w-sm rounded-card border-2 border-gold-500/70 bg-navy-800 p-8 text-center shadow-glow-gold"
              initial={{ scale: 0.6, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            >
              <motion.div
                className="text-7xl"
                initial={{ rotate: -8, scale: 0.7 }}
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 0.7 }}
                aria-hidden="true"
              >
                🎁
              </motion.div>
              <h2 className="mt-2 font-display text-3xl text-gold-500">Bonuskist!</h2>
              <motion.p
                className="mt-3 font-display text-2xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                🪙 +{chestResult.coins} munten
              </motion.p>
              {chestResult.item && (
                <motion.div
                  className="mt-3 rounded-hero border border-electric-500/50 bg-electric-500/10 p-3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 260, damping: 18 }}
                >
                  <div className="text-3xl" aria-hidden="true">{chestResult.item.emoji}</div>
                  <div className="font-display font-semibold text-electric-300">
                    Verrassing: {chestResult.item.name}!
                  </div>
                  <div className="text-xs text-slate-400">
                    Toegevoegd aan je uitrusting
                  </div>
                </motion.div>
              )}
              <button className="btn-gold mt-5 w-full" onClick={() => setChestResult(null)} autoFocus>
                Yes! 🎉
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
