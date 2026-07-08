import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { HeroAvatar } from '@/components/HeroAvatar'
import { StreakCalendar } from '@/components/StreakCalendar'
import { heroProfileOf, useAppStore } from '@/hooks/useAppStore'
import { parseGear } from '@/lib/economy'
import { todayISO } from '@/lib/dates'
import {
  AVATAR_STAGES,
  avatarStageForLevel,
  dayTotal,
  levelForXp,
  xpProgressInLevel,
  zoneFor,
} from '@/lib/gamification'

/** Hero hub: your hero up close, XP, arcade, shop, streak and gear roadmap. */
export function AvatarRoomScreen() {
  const myProfile = useAppStore((s) => s.myProfile)
  const familyProfiles = useAppStore((s) => s.familyProfiles)
  const entries = useAppStore((s) => s.entries)
  const hero = heroProfileOf({ familyProfiles, myProfile })

  if (!hero) return null
  const gear = parseGear(hero)
  const level = levelForXp(hero.xp)
  const { current, needed } = xpProgressInLevel(hero.xp)
  const stage = avatarStageForLevel(level)
  const total = dayTotal(entries, todayISO())
  const state = entries.some((e) => e.date === todayISO())
    ? zoneFor(total, Number(hero.daily_protein_limit))
    : 'charging'

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">{hero.display_name} 🦸</h1>
          <p className="text-sm text-slate-400">
            Level {level} · {stage.label}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-gold-500/15 px-3 py-1 font-display text-sm font-bold text-gold-400">
            🪙 {hero.coins ?? 0}
          </span>
          <span className="rounded-full bg-electric-500/15 px-3 py-1 font-display text-sm font-bold text-electric-400">
            ⚡ {hero.game_tokens ?? 0} tokens
          </span>
        </div>
      </header>

      <div className="flex justify-center">
        <HeroAvatar state={state} level={level} size={200} gear={gear.equipped} />
      </div>

      {/* XP bar */}
      <div className="glass-card p-4">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="font-display font-semibold text-electric-400">
            Level {level}
          </span>
          <span className="text-sm text-slate-400">
            {current}/{needed} XP naar level {level + 1}
          </span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-electric-500 to-gold-500"
            initial={{ width: 0 }}
            animate={{ width: `${(current / needed) * 100}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 16 }}
          />
        </div>
      </div>

      {/* arcade + shop */}
      <nav className="grid grid-cols-2 gap-3" aria-label="Arcade en winkel">
        <Link
          to="/game"
          className="glass-card relative flex min-h-[104px] flex-col justify-between overflow-hidden border-electric-500/40 p-4"
        >
          <motion.span
            className="absolute -right-3 -top-3 text-6xl opacity-20"
            animate={{ rotate: [0, 10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            aria-hidden="true"
          >
            🕹️
          </motion.span>
          <span className="font-display text-xl font-bold text-electric-400">
            Fuel Rush
          </span>
          <span className="text-xs text-slate-300">
            {(hero.game_tokens ?? 0) > 0
              ? `Je hebt ${hero.game_tokens} ⚡tokens — vlieg!`
              : 'Log brandstof voor tokens'}
          </span>
          <span className="text-xs text-slate-500">
            Record: {gear.stats.hiscore} punten
          </span>
        </Link>
        <Link
          to="/shop"
          className="glass-card relative flex min-h-[104px] flex-col justify-between overflow-hidden border-gold-500/40 p-4"
        >
          <motion.span
            className="absolute -right-3 -top-3 text-6xl opacity-20"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            aria-hidden="true"
          >
            🛍️
          </motion.span>
          <span className="font-display text-xl font-bold text-gold-400">Winkel</span>
          <span className="text-xs text-slate-300">
            Pakken, capes, helmen, vrienden…
          </span>
          <span className="text-xs text-slate-500">Saldo: 🪙 {hero.coins ?? 0}</span>
        </Link>
      </nav>

      <StreakCalendar
        entries={entries}
        limit={Number(hero.daily_protein_limit)}
        streak={hero.streak_current}
      />

      {/* gear roadmap */}
      <section aria-label="Uitrusting">
        <h2 className="mb-2 font-display text-xl">Level-uitrusting</h2>
        <div className="flex flex-col gap-2">
          {AVATAR_STAGES.map((s) => {
            const unlocked = level >= s.level
            return (
              <div
                key={s.key}
                className={`glass-card flex items-center gap-3 px-4 py-3 ${
                  unlocked ? 'border-electric-500/40' : 'opacity-60'
                }`}
              >
                <span className="text-2xl" aria-hidden="true">
                  {unlocked ? '✅' : '🔒'}
                </span>
                <span className="flex-1 font-display font-medium">{s.label}</span>
                <span className={`font-display text-sm font-semibold ${unlocked ? 'text-electric-400' : 'text-slate-400'}`}>
                  Level {s.level}
                </span>
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          XP: +10 per missie, +15 per scan, +50 per groene dag (×{'{'}1,5–2{'}'} met streak-bonus!)
        </p>
      </section>
    </div>
  )
}
