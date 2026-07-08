import type { FoodEntry } from './backend/types'
import type { Gear } from './economy'

/**
 * Daily missions: three per day, deterministic per date so every family
 * device shows the same set. Completion is a pure function of today's
 * entries (+ the games counter in the gear bag), so nothing extra needs to
 * be stored; only claims are persisted (gear.daily.claimed).
 */

export interface MissionContext {
  entries: FoodEntry[] // today's entries
  heroId: string | null
  gear: Gear
}

export interface MissionDef {
  id: string
  emoji: string
  title: string
  description: string
  /** progress 0..target derived from today's state */
  progress: (ctx: MissionContext) => number
  target: number
}

const FRUIT_VEG = [
  'appel', 'banaan', 'aardbei', 'druif', 'sinaasappel', 'meloen', 'peer',
  'kiwi', 'mango', 'bes', 'fruit', 'komkommer', 'tomaat', 'wortel', 'paprika',
  'sla', 'broccoli', 'bloemkool', 'boon', 'courgette', 'champignon', 'groente',
]

export const MISSION_POOL: MissionDef[] = [
  {
    id: 'log3',
    emoji: '⚡',
    title: 'Drievoudige missie',
    description: 'Log vandaag 3 keer brandstof',
    target: 3,
    progress: ({ entries }) => entries.length,
  },
  {
    id: 'morning',
    emoji: '☀️',
    title: 'Ochtendkracht',
    description: 'Log vandaag een ochtendmissie (ontbijt)',
    target: 1,
    progress: ({ entries }) =>
      entries.some((e) => e.meal_type === 'breakfast') ? 1 : 0,
  },
  {
    id: 'fruitveg',
    emoji: '🍎',
    title: 'Natuurkracht',
    description: 'Log vandaag fruit of groente',
    target: 1,
    progress: ({ entries }) =>
      entries.some((e) => FRUIT_VEG.some((w) => e.food_name.toLowerCase().includes(w)))
        ? 1
        : 0,
  },
  {
    id: 'scan',
    emoji: '📸',
    title: 'Scanner-missie',
    description: 'Gebruik de heldenscanner',
    target: 1,
    progress: ({ entries }) => (entries.some((e) => e.source === 'scan') ? 1 : 0),
  },
  {
    id: 'handboek',
    emoji: '📖',
    title: 'Handboek-held',
    description: 'Kies iets uit het heldenhandboek',
    target: 1,
    progress: ({ entries }) =>
      entries.some((e) => e.source === 'library' || e.source === 'favorite') ? 1 : 0,
  },
  {
    id: 'zelf2',
    emoji: '🦸',
    title: 'Solo-vlucht',
    description: 'Log 2 keer helemaal zelf',
    target: 2,
    progress: ({ entries, heroId }) =>
      heroId ? entries.filter((e) => e.logged_by === heroId).length : 0,
  },
  {
    id: 'game1',
    emoji: '🎮',
    title: 'Arcade-training',
    description: 'Speel een potje Fuel Rush',
    target: 1,
    progress: ({ gear }) => Math.min(1, gear.daily.gamesPlayed),
  },
]

/** The 3 missions for a date — same on every device. */
export function missionsForDate(dateIso: string): MissionDef[] {
  let seed = 0
  for (const ch of dateIso) seed = (seed * 33 + ch.charCodeAt(0)) | 0
  const pool = [...MISSION_POOL]
  const picked: MissionDef[] = []
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    picked.push(pool.splice(seed % pool.length, 1)[0])
  }
  return picked
}

export interface MissionState extends MissionDef {
  current: number
  completed: boolean
  claimed: boolean
}

export function missionStates(dateIso: string, ctx: MissionContext): MissionState[] {
  return missionsForDate(dateIso).map((def) => {
    const current = Math.min(def.target, def.progress(ctx))
    return {
      ...def,
      current,
      completed: current >= def.target,
      claimed: ctx.gear.daily.claimed.includes(def.id),
    }
  })
}

export function allMissionsClaimed(states: MissionState[]): boolean {
  return states.length > 0 && states.every((m) => m.claimed)
}
