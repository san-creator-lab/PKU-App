import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { seedFoods } from '../data/seedFoods'
import type {
  Backend,
  Badge,
  CustomFood,
  Family,
  FamilyDataEvent,
  Food,
  FoodEntry,
  NewCustomFood,
  NewFoodEntry,
  Profile,
  SessionInfo,
  SignUpInput,
  Unsubscribe,
  WeeklyChallenge,
} from './types'

interface LocalUser {
  id: string
  email: string
  passwordHash: string
  salt: string
}

interface LocalDB extends DBSchema {
  users: { key: string; value: LocalUser; indexes: { 'by-email': string } }
  profiles: { key: string; value: Profile; indexes: { 'by-family': string } }
  families: { key: string; value: Family; indexes: { 'by-code': string } }
  entries: { key: string; value: FoodEntry; indexes: { 'by-family': string; 'by-client': string } }
  custom_foods: { key: string; value: CustomFood; indexes: { 'by-family': string } }
  badges: { key: string; value: Badge; indexes: { 'by-profile': string } }
  challenges: { key: string; value: WeeklyChallenge; indexes: { 'by-family': string } }
}

const SESSION_KEY = 'hero-fuel-local-session'
const CHANNEL = 'hero-fuel-realtime'

const now = () => new Date().toISOString()

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Keyless local-first backend: IndexedDB for storage, BroadcastChannel for
 * "realtime" between tabs/PWA-windows of the same device. Runs the entire
 * app with zero external services; swaps for SupabaseBackend the moment
 * .env keys exist. Data model mirrors the Postgres schema 1:1.
 */
export class LocalBackend implements Backend {
  readonly kind = 'local' as const

  private dbPromise: Promise<IDBPDatabase<LocalDB>>
  private channel: BroadcastChannel | null

  constructor() {
    this.dbPromise = openDB<LocalDB>('hero-fuel-local', 1, {
      upgrade(db) {
        const users = db.createObjectStore('users', { keyPath: 'id' })
        users.createIndex('by-email', 'email', { unique: true })
        const profiles = db.createObjectStore('profiles', { keyPath: 'id' })
        profiles.createIndex('by-family', 'family_id')
        const families = db.createObjectStore('families', { keyPath: 'id' })
        families.createIndex('by-code', 'family_code', { unique: true })
        const entries = db.createObjectStore('entries', { keyPath: 'id' })
        entries.createIndex('by-family', 'family_id')
        entries.createIndex('by-client', 'client_id')
        const customFoods = db.createObjectStore('custom_foods', { keyPath: 'id' })
        customFoods.createIndex('by-family', 'family_id')
        const badges = db.createObjectStore('badges', { keyPath: 'id' })
        badges.createIndex('by-profile', 'profile_id')
        const challenges = db.createObjectStore('challenges', { keyPath: 'id' })
        challenges.createIndex('by-family', 'family_id')
      },
    })
    this.channel =
      typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null
  }

  private db() {
    return this.dbPromise
  }

  private emit(familyId: string | null, event: FamilyDataEvent) {
    this.channel?.postMessage({ familyId, event })
  }

  private currentUserId(): string {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) throw new Error('not_authenticated')
    return (JSON.parse(raw) as SessionInfo).userId
  }

  private async requireProfile(): Promise<Profile> {
    const db = await this.db()
    const profile = await db.get('profiles', this.currentUserId())
    if (!profile) throw new Error('profile_missing')
    return profile
  }

  private async requireFamilyId(): Promise<string> {
    const profile = await this.requireProfile()
    if (!profile.family_id) throw new Error('no_family')
    return profile.family_id
  }

  // -- auth ---------------------------------------------------------------

  async getSession(): Promise<SessionInfo | null> {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as SessionInfo) : null
  }

  async signUp(input: SignUpInput): Promise<SessionInfo> {
    const db = await this.db()
    const email = input.email.trim().toLowerCase()
    if (await db.getFromIndex('users', 'by-email', email)) {
      throw new Error('email_in_use')
    }
    const id = crypto.randomUUID()
    const salt = crypto.randomUUID()
    await db.put('users', {
      id,
      email,
      salt,
      passwordHash: await hashPassword(input.password, salt),
    })
    const profile: Profile = {
      id,
      family_id: null,
      display_name: input.displayName || 'Held',
      role: input.role,
      avatar_level: 1,
      xp: 0,
      daily_protein_limit: 8.0,
      streak_current: 0,
      streak_best: 0,
      streak_shields: 1,
      streak_last_date: null,
      shields_refilled_on: null,
      language: input.language ?? 'nl',
      created_at: now(),
      updated_at: now(),
    }
    await db.put('profiles', profile)
    const session: SessionInfo = { userId: id, email }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
  }

  async signIn(email: string, password: string): Promise<SessionInfo> {
    const db = await this.db()
    const user = await db.getFromIndex('users', 'by-email', email.trim().toLowerCase())
    if (!user) throw new Error('invalid_credentials')
    const hash = await hashPassword(password, user.salt)
    if (hash !== user.passwordHash) throw new Error('invalid_credentials')
    const session: SessionInfo = { userId: user.id, email: user.email }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(SESSION_KEY)
  }

  // -- family -------------------------------------------------------------

  async createFamily(): Promise<{ familyId: string; familyCode: string }> {
    const db = await this.db()
    const profile = await this.requireProfile()
    if (profile.family_id) throw new Error('already_in_family')
    let code: string
    do {
      code = String(Math.floor(Math.random() * 900000) + 100000)
    } while (await db.getFromIndex('families', 'by-code', code))
    const family: Family = {
      id: crypto.randomUUID(),
      family_code: code,
      created_at: now(),
    }
    await db.put('families', family)
    const updated = { ...profile, family_id: family.id, updated_at: now() }
    await db.put('profiles', updated)
    this.emit(family.id, { table: 'profiles', type: 'UPDATE', row: updated })
    return { familyId: family.id, familyCode: code }
  }

  async joinFamily(code: string): Promise<string> {
    const db = await this.db()
    const family = await db.getFromIndex('families', 'by-code', code.trim())
    if (!family) throw new Error('invalid_family_code')
    const profile = await this.requireProfile()
    if (profile.family_id) throw new Error('already_in_family')
    const updated = { ...profile, family_id: family.id, updated_at: now() }
    await db.put('profiles', updated)
    this.emit(family.id, { table: 'profiles', type: 'UPDATE', row: updated })
    return family.id
  }

  async getFamily(familyId: string): Promise<Family | null> {
    const db = await this.db()
    return (await db.get('families', familyId)) ?? null
  }

  // -- profiles -----------------------------------------------------------

  async getMyProfile(): Promise<Profile | null> {
    try {
      const db = await this.db()
      return (await db.get('profiles', this.currentUserId())) ?? null
    } catch {
      return null
    }
  }

  async listFamilyProfiles(): Promise<Profile[]> {
    const db = await this.db()
    const me = await this.requireProfile()
    if (!me.family_id) return [me]
    return db.getAllFromIndex('profiles', 'by-family', me.family_id)
  }

  async updateProfile(id: string, patch: Partial<Profile>): Promise<Profile> {
    const db = await this.db()
    const existing = await db.get('profiles', id)
    if (!existing) throw new Error('profile_missing')
    const updated = { ...existing, ...patch, id, updated_at: now() }
    await db.put('profiles', updated)
    this.emit(updated.family_id, { table: 'profiles', type: 'UPDATE', row: updated })
    return updated
  }

  // -- food entries ---------------------------------------------------------

  async listEntries(fromDate: string, toDate: string): Promise<FoodEntry[]> {
    const db = await this.db()
    const familyId = await this.requireFamilyId()
    const all = await db.getAllFromIndex('entries', 'by-family', familyId)
    return all
      .filter((e) => e.date >= fromDate && e.date <= toDate)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  async addEntry(input: NewFoodEntry): Promise<FoodEntry> {
    const db = await this.db()
    const familyId = await this.requireFamilyId()
    // idempotent on client_id (offline outbox retries)
    const existing = await db.getFromIndex('entries', 'by-client', input.client_id)
    if (existing) return existing
    const entry: FoodEntry = {
      id: crypto.randomUUID(),
      family_id: familyId,
      logged_by: this.currentUserId(),
      food_name: input.food_name,
      protein_grams: input.protein_grams,
      meal_type: input.meal_type,
      source: input.source,
      photo_url: input.photo_url ?? null,
      date: input.date,
      client_id: input.client_id,
      created_at: now(),
      updated_at: now(),
    }
    await db.put('entries', entry)
    this.emit(familyId, { table: 'food_entries', type: 'INSERT', row: entry })
    return entry
  }

  async updateEntry(id: string, patch: Partial<FoodEntry>): Promise<FoodEntry> {
    const db = await this.db()
    const existing = await db.get('entries', id)
    if (!existing) throw new Error('entry_missing')
    const updated = { ...existing, ...patch, id, updated_at: now() }
    await db.put('entries', updated)
    this.emit(updated.family_id, { table: 'food_entries', type: 'UPDATE', row: updated })
    return updated
  }

  async deleteEntry(id: string): Promise<void> {
    const db = await this.db()
    const existing = await db.get('entries', id)
    if (!existing) return
    await db.delete('entries', id)
    this.emit(existing.family_id, {
      table: 'food_entries',
      type: 'DELETE',
      row: existing,
    })
  }

  // -- food library ---------------------------------------------------------

  async listFoods(): Promise<Food[]> {
    return seedFoods.map((f, i) => ({
      id: `seed-${i}`,
      name: f.name,
      protein_per_100g: f.protein_per_100g,
      protein_per_serving: f.protein_per_serving,
      serving_description: f.serving_description,
      category: f.category,
      emoji: f.emoji,
    }))
  }

  async listCustomFoods(): Promise<CustomFood[]> {
    const db = await this.db()
    const familyId = await this.requireFamilyId()
    const all = await db.getAllFromIndex('custom_foods', 'by-family', familyId)
    return all.sort((a, b) => a.name.localeCompare(b.name))
  }

  async addCustomFood(input: NewCustomFood): Promise<CustomFood> {
    const db = await this.db()
    const familyId = await this.requireFamilyId()
    const food: CustomFood = {
      id: crypto.randomUUID(),
      family_id: familyId,
      name: input.name,
      protein_per_100g: input.protein_per_100g,
      protein_per_serving: input.protein_per_serving,
      serving_description: input.serving_description,
      category: input.category,
      emoji: input.emoji ?? null,
      is_favorite: input.is_favorite ?? false,
      created_at: now(),
      updated_at: now(),
    }
    await db.put('custom_foods', food)
    return food
  }

  async updateCustomFood(id: string, patch: Partial<CustomFood>): Promise<CustomFood> {
    const db = await this.db()
    const existing = await db.get('custom_foods', id)
    if (!existing) throw new Error('custom_food_missing')
    const updated = { ...existing, ...patch, id, updated_at: now() }
    await db.put('custom_foods', updated)
    return updated
  }

  async deleteCustomFood(id: string): Promise<void> {
    const db = await this.db()
    await db.delete('custom_foods', id)
  }

  // -- gamification ---------------------------------------------------------

  async listFamilyBadges(): Promise<Badge[]> {
    const db = await this.db()
    const profiles = await this.listFamilyProfiles()
    const result: Badge[] = []
    for (const p of profiles) {
      result.push(...(await db.getAllFromIndex('badges', 'by-profile', p.id)))
    }
    return result
  }

  async awardBadge(profileId: string, badgeType: string): Promise<Badge | null> {
    const db = await this.db()
    const existing = await db.getAllFromIndex('badges', 'by-profile', profileId)
    if (existing.some((b) => b.badge_type === badgeType)) return null
    const badge: Badge = {
      id: crypto.randomUUID(),
      profile_id: profileId,
      badge_type: badgeType,
      earned_at: now(),
    }
    await db.put('badges', badge)
    const profile = await db.get('profiles', profileId)
    this.emit(profile?.family_id ?? null, {
      table: 'badges',
      type: 'INSERT',
      row: badge,
    })
    return badge
  }

  async getWeeklyChallenge(weekStart: string): Promise<WeeklyChallenge | null> {
    const db = await this.db()
    const familyId = await this.requireFamilyId()
    const all = await db.getAllFromIndex('challenges', 'by-family', familyId)
    return all.find((c) => c.week_start === weekStart) ?? null
  }

  async upsertWeeklyChallenge(
    weekStart: string,
    challengeType: string,
  ): Promise<WeeklyChallenge> {
    const existing = await this.getWeeklyChallenge(weekStart)
    if (existing) return existing
    const db = await this.db()
    const familyId = await this.requireFamilyId()
    const challenge: WeeklyChallenge = {
      id: crypto.randomUUID(),
      family_id: familyId,
      challenge_type: challengeType,
      week_start: weekStart,
      completed: false,
      completed_at: null,
    }
    await db.put('challenges', challenge)
    return challenge
  }

  async completeWeeklyChallenge(id: string): Promise<WeeklyChallenge> {
    const db = await this.db()
    const existing = await db.get('challenges', id)
    if (!existing) throw new Error('challenge_missing')
    const updated = { ...existing, completed: true, completed_at: now() }
    await db.put('challenges', updated)
    return updated
  }

  // -- realtime -------------------------------------------------------------

  subscribe(familyId: string, onEvent: (e: FamilyDataEvent) => void): Unsubscribe {
    if (!this.channel) return () => {}
    const listener = (msg: MessageEvent) => {
      const { familyId: eventFamily, event } = msg.data as {
        familyId: string | null
        event: FamilyDataEvent
      }
      if (eventFamily === familyId) onEvent(event)
    }
    // A dedicated receive channel: a BroadcastChannel never receives its own
    // posts, so reusing the send channel would miss same-instance emits from
    // a second store in this tab. Separate channel keeps semantics simple.
    const rx = new BroadcastChannel(CHANNEL)
    rx.addEventListener('message', listener)
    return () => {
      rx.removeEventListener('message', listener)
      rx.close()
    }
  }

  // -- storage --------------------------------------------------------------

  async uploadLabelPhoto(_familyId: string, blob: Blob): Promise<string | null> {
    // Local mode: inline the (already downscaled) photo as a data URL.
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  }
}
