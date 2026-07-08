import type { Profile } from './backend/types'
import { todayISO } from './dates'

/**
 * Hero economy: coins (spendable), game tokens (arcade plays, earned by
 * logging fuel) and avatar gear (owned + equipped cosmetics). Persisted on
 * the hero profile — coins/game_tokens as columns, the rest in the `gear`
 * jsonb bag — so it syncs across devices through the existing profile
 * realtime channel.
 */

// -- coin rules -------------------------------------------------------------

export const COINS = {
  MISSION: 15,
  CHEST: 30,
  CHEST_DUPLICATE_BONUS: 20,
  GREEN_DAY: 15,
  STREAK_MILESTONE: 50,
  LEVEL_UP: 25,
  GAME_MAX: 25,
  SHIELD_PRICE: 150,
} as const

export const MAX_TOKENS = 5
export const MAX_SHIELDS = 2

/** Coins for a Fuel Rush run: 1 per 10 points, capped. */
export function coinsForScore(score: number): number {
  return Math.max(1, Math.min(COINS.GAME_MAX, Math.floor(score / 10)))
}

/** XP multiplier from the streak: heroes on a roll level faster. */
export function streakMultiplier(streak: number): number {
  if (streak >= 30) return 2
  if (streak >= 7) return 1.5
  return 1
}

// -- gear bag ---------------------------------------------------------------

export type GearSlot = 'suit' | 'helmet' | 'cape' | 'pet' | 'aura'

export interface GearDaily {
  date: string
  claimed: string[]
  chestOpened: boolean
  gamesPlayed: number
}

export interface GearStats {
  coinsEarned: number
  allDailiesCount: number
  hiscore: number
}

export interface Gear {
  owned: string[]
  equipped: Partial<Record<GearSlot, string>>
  daily: GearDaily
  stats: GearStats
}

const EMPTY_DAILY = (date: string): GearDaily => ({
  date,
  claimed: [],
  chestOpened: false,
  gamesPlayed: 0,
})

/** Read the jsonb gear bag with defaults; daily resets on a new day. */
export function parseGear(profile: Profile | null): Gear {
  const raw = (profile?.gear ?? {}) as Partial<Gear>
  const today = todayISO()
  const daily =
    raw.daily && raw.daily.date === today ? raw.daily : EMPTY_DAILY(today)
  return {
    owned: Array.isArray(raw.owned) ? raw.owned : [],
    equipped: raw.equipped ?? {},
    daily: {
      date: daily.date,
      claimed: Array.isArray(daily.claimed) ? daily.claimed : [],
      chestOpened: Boolean(daily.chestOpened),
      gamesPlayed: Number(daily.gamesPlayed) || 0,
    },
    stats: {
      coinsEarned: Number(raw.stats?.coinsEarned) || 0,
      allDailiesCount: Number(raw.stats?.allDailiesCount) || 0,
      hiscore: Number(raw.stats?.hiscore) || 0,
    },
  }
}

// -- shop catalog -------------------------------------------------------------

export interface ShopItem {
  id: string
  slot: GearSlot
  name: string
  description: string
  emoji: string
  price: number
  /** Free items are owned by everyone (defaults). */
  free?: boolean
}

export const SHOP_ITEMS: ShopItem[] = [
  // suits (suit color of the avatar)
  { id: 'suit_classic', slot: 'suit', name: 'Klassiek pak', description: 'Het originele elektrisch-blauwe heldenpak.', emoji: '🦸', price: 0, free: true },
  { id: 'suit_rood', slot: 'suit', name: 'Vuurpak', description: 'Roodgloeiend — voor helden met een warm hart.', emoji: '🔥', price: 120 },
  { id: 'suit_groen', slot: 'suit', name: 'Jungle-pak', description: 'Groen als de jungle, snel als een panter.', emoji: '🐊', price: 120 },
  { id: 'suit_zwart', slot: 'suit', name: 'Stealth-pak', description: 'Nachtzwart. Niemand ziet je aankomen.', emoji: '🥷', price: 150 },
  // helmets / masks
  { id: 'helm_klassiek', slot: 'helmet', name: 'Klassiek masker', description: 'Het vertrouwde heldenmasker.', emoji: '🎭', price: 0, free: true },
  { id: 'helm_vizier', slot: 'helmet', name: 'Cyber-vizier', description: 'Een lichtgevend vizier met ingebouwde scanner.', emoji: '🕶️', price: 100 },
  { id: 'helm_ninja', slot: 'helmet', name: 'Ninja-band', description: 'Voor stille missies in de nacht.', emoji: '🥋', price: 140 },
  { id: 'helm_ruimte', slot: 'helmet', name: 'Ruimtehelm', description: 'Klaar voor missies buiten de dampkring.', emoji: '🚀', price: 200 },
  // capes
  { id: 'cape_geel', slot: 'cape', name: 'Gouden cape', description: 'De klassieker (vanaf level 5).', emoji: '🌟', price: 0, free: true },
  { id: 'cape_rood', slot: 'cape', name: 'Rode cape', description: 'Wappert extra stoer in de wind.', emoji: '🎈', price: 80 },
  { id: 'cape_sterren', slot: 'cape', name: 'Sterrencape', description: 'Een stukje sterrenhemel op je rug.', emoji: '✨', price: 180 },
  // pets
  { id: 'pet_robo', slot: 'pet', name: 'Robo-pup', description: 'Trouwe robothond die altijd meevliegt.', emoji: '🤖', price: 250 },
  { id: 'pet_draak', slot: 'pet', name: 'Mini-draak', description: 'Klein draakje, grote vlammen.', emoji: '🐉', price: 300 },
  { id: 'pet_uil', slot: 'pet', name: 'Nachtuil', description: 'Wijze uil die over je waakt.', emoji: '🦉', price: 220 },
  // auras
  { id: 'aura_geen', slot: 'aura', name: 'Geen aura', description: 'Lekker rustig.', emoji: '⚪', price: 0, free: true },
  { id: 'aura_bliksem', slot: 'aura', name: 'Bliksem-aura', description: 'Knetterende energie om je heen.', emoji: '⚡', price: 160 },
  { id: 'aura_vuur', slot: 'aura', name: 'Vuur-aura', description: 'Een gloeiende ring van heldenvuur.', emoji: '🔥', price: 200 },
]

export function shopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id)
}

export function ownsItem(gear: Gear, id: string): boolean {
  const item = shopItem(id)
  return Boolean(item && (item.free || gear.owned.includes(id)))
}

/** Random buyable item the hero doesn't own yet (chest surprise). */
export function randomUnownedItem(gear: Gear, roll: number): ShopItem | null {
  const candidates = SHOP_ITEMS.filter((i) => !i.free && !gear.owned.includes(i.id))
  if (candidates.length === 0) return null
  return candidates[Math.floor(roll * candidates.length) % candidates.length]
}

export const SLOT_LABELS: Record<GearSlot, string> = {
  suit: 'Pakken',
  helmet: 'Helmen & maskers',
  cape: 'Capes',
  pet: 'Vrienden',
  aura: "Aura's",
}
