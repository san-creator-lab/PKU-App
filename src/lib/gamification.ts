import type { FoodEntry, Profile } from './backend/types'

// -- XP -----------------------------------------------------------------

export const XP = {
  LOG_MEAL: 10,
  SCAN_LABEL: 15,
  UNDER_LIMIT_DAY: 50,
  STREAK_MILESTONE: 100,
} as const

/** 100 XP per level; level 1 at 0 XP. */
export function levelForXp(xp: number): number {
  return Math.floor(xp / 100) + 1
}

export function xpForLevel(level: number): number {
  return (level - 1) * 100
}

export function xpProgressInLevel(xp: number): { current: number; needed: number } {
  return { current: xp % 100, needed: 100 }
}

/** Avatar gear unlocked at each level tier (visual evolution). */
export const AVATAR_STAGES = [
  { level: 1, key: 'basis', label: 'Basis-held' },
  { level: 5, key: 'cape', label: 'Cape' },
  { level: 10, key: 'masker', label: 'Masker-upgrade' },
  { level: 15, key: 'schild', label: 'Schild' },
  { level: 20, key: 'pantser', label: 'Power-pantser' },
  { level: 25, key: 'goud', label: 'Gouden glans' },
  { level: 30, key: 'kosmisch', label: 'Kosmische aura' },
] as const

export type AvatarStageKey = (typeof AVATAR_STAGES)[number]['key']

export function avatarStageForLevel(level: number) {
  return [...AVATAR_STAGES].reverse().find((s) => level >= s.level) ?? AVATAR_STAGES[0]
}

// -- Power zones ----------------------------------------------------------

export type PowerZone = 'green' | 'yellow' | 'red' | 'over'

/** Zones scale with the configured limit (8g default: green <6, yellow 6-7, red 7-8). */
export function zoneFor(total: number, limit: number): PowerZone {
  if (total > limit) return 'over'
  if (total >= limit * 0.875) return 'red'
  if (total >= limit * 0.75) return 'yellow'
  return 'green'
}

export const ZONE_COLORS: Record<PowerZone, string> = {
  green: '#2EE66B',
  yellow: '#FFC93C',
  red: '#FF5D5D',
  over: '#8B94A8',
}

// -- Streaks ----------------------------------------------------------------

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const

// -- Badges -------------------------------------------------------------------

export interface BadgeDef {
  type: string
  emoji: string
  name: string
  description: string
}

export const BADGES: BadgeDef[] = [
  {
    type: 'first_mission',
    emoji: '🥇',
    name: 'Eerste missie',
    description: 'Log je allereerste maaltijd',
  },
  {
    type: 'streak_3',
    emoji: '✨',
    name: 'Goede start',
    description: '3 dagen op rij binnen je brandstof-budget',
  },
  {
    type: 'on_fire',
    emoji: '🔥',
    name: 'On fire',
    description: '7 dagen streak — niet te stoppen!',
  },
  {
    type: 'streak_14',
    emoji: '⚡',
    name: 'Supergeleider',
    description: '14 dagen streak',
  },
  {
    type: 'streak_30',
    emoji: '🌙',
    name: 'Maanmissie',
    description: '30 dagen streak',
  },
  {
    type: 'streak_60',
    emoji: '🚀',
    name: 'Raketheld',
    description: '60 dagen streak',
  },
  {
    type: 'century_hero',
    emoji: '💪',
    name: 'Eeuwheld',
    description: '100 dagen streak — legendarisch!',
  },
  {
    type: 'scanner_pro',
    emoji: '📸',
    name: 'Scanner-pro',
    description: 'Scan 10 etiketten met je heldenscanner',
  },
  {
    type: 'perfect_week',
    emoji: '🌟',
    name: 'Perfecte week',
    description: 'Een hele week (ma t/m zo) binnen je budget',
  },
  {
    type: 'sidekick_helper',
    emoji: '🦸',
    name: 'Sidekick-hulp',
    description: 'Een sidekick logde een maaltijd voor jou',
  },
  {
    type: 'fruit_hero',
    emoji: '🍎',
    name: 'Fruitheld',
    description: 'Log 5 dagen op rij fruit',
  },
  {
    type: 'challenge_champion',
    emoji: '🏆',
    name: 'Uitdagingskampioen',
    description: 'Voltooi je eerste weekuitdaging',
  },
  {
    type: 'level_5',
    emoji: '🦸‍♂️',
    name: 'Cape verdiend',
    description: 'Bereik level 5 en ontgrendel je cape',
  },
  {
    type: 'level_10',
    emoji: '🎭',
    name: 'Meester-masker',
    description: 'Bereik level 10 voor je masker-upgrade',
  },
  {
    type: 'level_20',
    emoji: '🛡️',
    name: 'Volledig pantser',
    description: 'Bereik level 20: power-pantser compleet',
  },
  {
    type: 'gamer_first',
    emoji: '🎮',
    name: 'Eerste vlucht',
    description: 'Speel je eerste potje Fuel Rush',
  },
  {
    type: 'gamer_100',
    emoji: '🕹️',
    name: 'Sky-held',
    description: 'Haal 100 punten in Fuel Rush',
  },
  {
    type: 'gamer_250',
    emoji: '👾',
    name: 'Arcade-legende',
    description: 'Haal 250 punten in Fuel Rush',
  },
  {
    type: 'shopper',
    emoji: '🛍️',
    name: 'Eerste upgrade',
    description: 'Koop je eerste item in de heldenwinkel',
  },
  {
    type: 'missions_5',
    emoji: '🎯',
    name: 'Missie-machine',
    description: 'Voltooi 5 keer alle dagmissies',
  },
  {
    type: 'rich_500',
    emoji: '🪙',
    name: 'Spaarheld',
    description: 'Verdien in totaal 500 munten',
  },
]

export function badgeDef(type: string): BadgeDef {
  return (
    BADGES.find((b) => b.type === type) ?? {
      type,
      emoji: '🎖️',
      name: type,
      description: '',
    }
  )
}

export function streakBadgeType(streak: number): string | null {
  switch (streak) {
    case 3:
      return 'streak_3'
    case 7:
      return 'on_fire'
    case 14:
      return 'streak_14'
    case 30:
      return 'streak_30'
    case 60:
      return 'streak_60'
    case 100:
      return 'century_hero'
    default:
      return null
  }
}

// -- Weekly challenges -----------------------------------------------------

export interface ChallengeDef {
  type: string
  emoji: string
  name: string
  description: string
  target: number
  /** Progress from this week's entries (heroId = the hero profile id). */
  progress: (entries: FoodEntry[], heroId: string | null) => number
}

const FRUIT_WORDS = [
  'appel',
  'banaan',
  'aardbei',
  'druif',
  'sinaasappel',
  'watermeloen',
  'peer',
  'kiwi',
  'mango',
  'bes',
  'fruit',
  'meloen',
]

export const CHALLENGES: ChallengeDef[] = [
  {
    type: 'self_logger',
    emoji: '🦸',
    name: 'Zelf loggen',
    description: 'Log deze week 10 maaltijden helemaal zelf (zonder sidekick-hulp)',
    target: 10,
    progress: (entries, heroId) =>
      entries.filter((e) => heroId !== null && e.logged_by === heroId).length,
  },
  {
    type: 'new_foods',
    emoji: '🥗',
    name: 'Nieuwe smaken',
    description: 'Probeer deze week 3 verschillende nieuwe dingen',
    target: 3,
    progress: (entries) =>
      new Set(entries.map((e) => e.food_name.toLowerCase()).filter(Boolean)).size >= 3
        ? 3
        : new Set(entries.map((e) => e.food_name.toLowerCase()).filter(Boolean)).size,
  },
  {
    type: 'fruit_week',
    emoji: '🍎',
    name: 'Fruitweek',
    description: 'Log op 4 verschillende dagen fruit',
    target: 4,
    progress: (entries) =>
      new Set(
        entries
          .filter((e) =>
            FRUIT_WORDS.some((w) => e.food_name.toLowerCase().includes(w)),
          )
          .map((e) => e.date),
      ).size,
  },
  {
    type: 'scanner_week',
    emoji: '📸',
    name: 'Scanner-week',
    description: 'Gebruik je heldenscanner 5 keer deze week',
    target: 5,
    progress: (entries) => entries.filter((e) => e.source === 'scan').length,
  },
]

/** Deterministic challenge for a week — every device picks the same one. */
export function challengeForWeek(weekStartIso: string): ChallengeDef {
  let hash = 0
  for (const ch of weekStartIso) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return CHALLENGES[Math.abs(hash) % CHALLENGES.length]
}

export function challengeDef(type: string): ChallengeDef {
  return CHALLENGES.find((c) => c.type === type) ?? CHALLENGES[0]
}

// -- Daily totals -------------------------------------------------------------

export function dayTotal(entries: FoodEntry[], date: string): number {
  return entries
    .filter((e) => e.date === date)
    .reduce((sum, e) => sum + Number(e.protein_grams), 0)
}

export function isHero(profile: Profile | null): boolean {
  return profile?.role === 'hero'
}
