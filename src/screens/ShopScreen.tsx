import { motion } from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HeroAvatar } from '@/components/HeroAvatar'
import { heroProfileOf, useAppStore } from '@/hooks/useAppStore'
import {
  COINS,
  MAX_SHIELDS,
  parseGear,
  SHOP_ITEMS,
  SLOT_LABELS,
  type GearSlot,
} from '@/lib/economy'
import { todayISO } from '@/lib/dates'
import { dayTotal, zoneFor } from '@/lib/gamification'

const SLOT_ORDER: GearSlot[] = ['suit', 'helmet', 'cape', 'pet', 'aura']

/** Hero shop: spend coins on gear (live preview on your own hero) + shields. */
export function ShopScreen() {
  const myProfile = useAppStore((s) => s.myProfile)
  const familyProfiles = useAppStore((s) => s.familyProfiles)
  const entries = useAppStore((s) => s.entries)
  const buyItem = useAppStore((s) => s.buyItem)
  const equipItem = useAppStore((s) => s.equipItem)
  const buyShield = useAppStore((s) => s.buyShield)
  const [confirmItem, setConfirmItem] = useState<string | null>(null)

  const hero = heroProfileOf({ familyProfiles, myProfile })
  if (!hero) return null
  const gear = parseGear(hero)
  const coins = hero.coins ?? 0
  const today = todayISO()
  const state = entries.some((e) => e.date === today)
    ? zoneFor(dayTotal(entries, today), Number(hero.daily_protein_limit))
    : 'charging'

  async function handleBuy(itemId: string) {
    if (confirmItem !== itemId) {
      setConfirmItem(itemId)
      return
    }
    setConfirmItem(null)
    await buyItem(itemId)
  }

  return (
    <div className="flex flex-col gap-4 p-4 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/avatar" className="text-2xl" aria-label="Terug">←</Link>
          <h1 className="font-display text-3xl">Heldenwinkel 🛍️</h1>
        </div>
        <span className="rounded-full bg-gold-500/15 px-3 py-1.5 font-display font-bold text-gold-400">
          🪙 {coins}
        </span>
      </header>

      {/* live preview */}
      <div className="flex justify-center">
        <HeroAvatar state={state} level={hero.avatar_level} size={140} gear={gear.equipped} />
      </div>
      <p className="-mt-2 text-center text-xs text-slate-400">
        Alles wat je koopt zie je meteen op je held!
      </p>

      {/* extra shield */}
      <div className="glass-card flex items-center gap-3 p-4">
        <span className="text-3xl" aria-hidden="true">🛡️</span>
        <div className="min-w-0 flex-1">
          <div className="font-display font-semibold">Extra streak-schild</div>
          <div className="text-xs text-slate-400">
            Beschermt je streak bij een gemiste dag (max {MAX_SHIELDS})
          </div>
        </div>
        {hero.streak_shields >= MAX_SHIELDS ? (
          <span className="text-xs font-semibold text-power-green">MAX ✓</span>
        ) : (
          <button
            className="btn-gold min-h-[44px] px-3 py-1 text-sm"
            disabled={coins < COINS.SHIELD_PRICE}
            onClick={() => void buyShield()}
          >
            🪙 {COINS.SHIELD_PRICE}
          </button>
        )}
      </div>

      {SLOT_ORDER.map((slot) => (
        <section key={slot} aria-label={SLOT_LABELS[slot]}>
          <h2 className="mb-2 font-display text-lg">{SLOT_LABELS[slot]}</h2>
          <div className="grid grid-cols-2 gap-2">
            {SHOP_ITEMS.filter((item) => item.slot === slot).map((item) => {
              const owned = item.free || gear.owned.includes(item.id)
              const equipped =
                gear.equipped[slot] === item.id ||
                (!gear.equipped[slot] && item.free)
              const affordable = coins >= item.price
              return (
                <motion.div
                  key={item.id}
                  className={`glass-card flex flex-col gap-1 p-3 ${
                    equipped ? 'border-electric-500/70 shadow-glow-soft' : ''
                  }`}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl" aria-hidden="true">{item.emoji}</span>
                    {equipped && (
                      <span className="rounded-full bg-electric-500/20 px-2 py-0.5 text-[10px] font-bold text-electric-300">
                        AAN
                      </span>
                    )}
                  </div>
                  <div className="font-display text-sm font-semibold leading-tight">
                    {item.name}
                  </div>
                  <div className="min-h-[2rem] text-[11px] leading-snug text-slate-400">
                    {item.description}
                  </div>
                  {owned ? (
                    equipped ? (
                      <span className="mt-1 text-center text-xs font-semibold text-slate-500">
                        Uitgerust ✓
                      </span>
                    ) : (
                      <button
                        className="btn-ghost mt-1 min-h-[40px] py-1 text-sm"
                        onClick={() => void equipItem(slot, item.id)}
                      >
                        Draag dit
                      </button>
                    )
                  ) : (
                    <button
                      className={`mt-1 min-h-[40px] rounded-hero py-1 font-display text-sm font-bold transition ${
                        affordable
                          ? confirmItem === item.id
                            ? 'bg-power-green text-navy-950'
                            : 'bg-gold-500 text-navy-950'
                          : 'bg-white/10 text-slate-500'
                      }`}
                      disabled={!affordable}
                      onClick={() => void handleBuy(item.id)}
                    >
                      {confirmItem === item.id ? 'Zeker weten?' : `Koop · 🪙 ${item.price}`}
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        </section>
      ))}

      <p className="text-center text-xs text-slate-500">
        Munten verdien je met dagmissies, groene dagen, streaks en Fuel Rush.
        Geen echt geld — alleen echte heldenmoed. 💪
      </p>
    </div>
  )
}
