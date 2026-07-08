import { create } from 'zustand'
import { backend } from '@/lib/backend'
import type {
  Badge,
  CustomFood,
  Family,
  FamilyDataEvent,
  Food,
  FoodEntry,
  MealType,
  NewCustomFood,
  NewFoodEntry,
  Profile,
  SessionInfo,
  SignUpInput,
  WeeklyChallenge,
} from '@/lib/backend'
import { addDays, todayISO, weekStartISO } from '@/lib/dates'
import {
  coinsForScore,
  COINS,
  MAX_SHIELDS,
  MAX_TOKENS,
  parseGear,
  randomUnownedItem,
  shopItem,
  streakMultiplier,
  type Gear,
  type GearSlot,
  type ShopItem,
} from '@/lib/economy'
import {
  badgeDef,
  challengeDef,
  challengeForWeek,
  dayTotal,
  levelForXp,
  streakBadgeType,
  XP,
  type BadgeDef,
} from '@/lib/gamification'
import { getLang, setLang, type Lang } from '@/lib/i18n'
import { missionStates } from '@/lib/missions'
import { enqueue, flush, isNetworkError, pendingCount } from '@/lib/outbox'
import { sfx } from '@/lib/sfx'

const ENTRY_WINDOW_DAYS = 60
const MAX_CATCHUP_DAYS = 30

export type BootStatus = 'booting' | 'signedOut' | 'needsFamily' | 'ready'
export type Celebration = 'confetti' | 'levelup' | null

interface AppState {
  bootStatus: BootStatus
  session: SessionInfo | null
  myProfile: Profile | null
  familyProfiles: Profile[]
  family: Family | null
  entries: FoodEntry[]
  foods: Food[]
  customFoods: CustomFood[]
  badges: Badge[]
  challenge: WeeklyChallenge | null
  online: boolean
  outboxPending: number
  lang: Lang
  largeText: boolean

  // ephemeral UI celebration queue
  badgeQueue: BadgeDef[]
  celebration: Celebration
  /** Set right after createFamily() so onboarding can show the code screen. */
  freshFamilyCode: string | null
  clearFreshFamilyCode(): void

  boot(): Promise<void>
  signUp(input: SignUpInput): Promise<void>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  createFamily(): Promise<string>
  joinFamily(code: string): Promise<void>

  addEntry(input: {
    food_name: string
    protein_grams: number
    meal_type: MealType
    source: NewFoodEntry['source']
    photo_url?: string | null
    date?: string
  }): Promise<void>
  updateEntry(id: string, patch: Partial<FoodEntry>): Promise<void>
  deleteEntry(id: string): Promise<void>

  addCustomFood(input: NewCustomFood): Promise<CustomFood>
  updateCustomFood(id: string, patch: Partial<CustomFood>): Promise<void>
  deleteCustomFood(id: string): Promise<void>

  updateProfile(id: string, patch: Partial<Profile>): Promise<void>
  setLanguage(lang: Lang): Promise<void>
  setLargeText(on: boolean): void

  popBadge(): void
  clearCelebration(): void
  refreshOutbox(): Promise<void>
  /** Re-fetch all family data (pull-to-refresh). */
  refresh(): Promise<void>

  // -- hero economy (coins / tokens / gear / missions / arcade) ----------
  claimMission(missionId: string): Promise<void>
  /** Opens the daily bonus chest; null when not available. */
  openChest(): Promise<{ coins: number; item: ShopItem | null } | null>
  buyItem(itemId: string): Promise<boolean>
  equipItem(slot: GearSlot, itemId: string): Promise<void>
  buyShield(): Promise<boolean>
  /** Spends a game token; false when the hero has none. */
  startGame(): Promise<boolean>
  /** Awards coins/XP for a finished run; returns the coins earned. */
  finishGame(score: number): Promise<number>
}

let unsubscribeRealtime: (() => void) | null = null

/** The profile that carries XP/streak/limit: the family hero, else viewer. */
export function heroProfileOf(state: {
  familyProfiles: Profile[]
  myProfile: Profile | null
}): Profile | null {
  return state.familyProfiles.find((p) => p.role === 'hero') ?? state.myProfile
}

export const useAppStore = create<AppState>((set, get) => {
  // ---- internal helpers (closure-scoped, not part of the public state) ----

  async function loadFamilyData(profile: Profile): Promise<void> {
    const familyId = profile.family_id!
    const today = todayISO()
    const [family, familyProfiles, entries, foods, customFoods, badges] =
      await Promise.all([
        backend.getFamily(familyId),
        backend.listFamilyProfiles(),
        backend.listEntries(addDays(today, -ENTRY_WINDOW_DAYS), today),
        backend.listFoods(),
        backend.listCustomFoods(),
        backend.listFamilyBadges(),
      ])
    set({
      family,
      familyProfiles,
      entries,
      foods,
      customFoods,
      badges,
      bootStatus: 'ready',
    })

    unsubscribeRealtime?.()
    unsubscribeRealtime = backend.subscribe(familyId, applyRealtimeEvent)

    await ensureWeeklyChallenge()
    await evaluateStreaks()
  }

  function applyRealtimeEvent(event: FamilyDataEvent) {
    const state = get()
    if (event.table === 'food_entries') {
      const row = event.row
      if (event.type === 'DELETE') {
        set({ entries: state.entries.filter((e) => e.id !== row.id) })
        return
      }
      const withoutDupes = state.entries.filter(
        (e) => e.id !== row.id && (row.client_id === null || e.client_id !== row.client_id),
      )
      set({ entries: [...withoutDupes, row].sort((a, b) => a.created_at.localeCompare(b.created_at)) })
      void checkChallengeCompletion()
    } else if (event.table === 'profiles') {
      const row = event.row
      const familyProfiles = state.familyProfiles.some((p) => p.id === row.id)
        ? state.familyProfiles.map((p) => (p.id === row.id ? row : p))
        : [...state.familyProfiles, row]
      set({
        familyProfiles,
        myProfile: state.myProfile?.id === row.id ? row : state.myProfile,
      })
    } else if (event.table === 'badges') {
      if (event.type !== 'INSERT') return
      const row = event.row
      if (state.badges.some((b) => b.id === row.id)) return
      set({ badges: [...state.badges, row] })
      const hero = heroProfileOf(state)
      if (row.profile_id === hero?.id) {
        set((s) => ({ badgeQueue: [...s.badgeQueue, badgeDef(row.badge_type)] }))
      }
    }
  }

  /**
   * One write for any combination of hero rewards: XP (with level-up
   * detection → +coins, celebration, level badges), coins (tracked in
   * gear.stats for the saver badge), game tokens (capped) and a gear
   * mutation. Everything lands on the hero profile in a single
   * safeUpdateProfile, so offline/outbox and realtime stay simple.
   */
  async function applyHeroDelta(delta: {
    xp?: number
    coins?: number
    tokens?: number
    gear?: (gear: Gear) => Gear
    sound?: () => void
  }): Promise<void> {
    const state = get()
    const hero = heroProfileOf(state)
    if (!hero) return

    const patch: Partial<Profile> = {}
    let leveledTo: number | null = null
    if (delta.xp) {
      const newXp = hero.xp + delta.xp
      const newLevel = levelForXp(newXp)
      patch.xp = newXp
      patch.avatar_level = newLevel
      if (newLevel > levelForXp(hero.xp)) leveledTo = newLevel
    }

    let coins = delta.coins ?? 0
    if (leveledTo) coins += COINS.LEVEL_UP
    if (coins !== 0) patch.coins = Math.max(0, (hero.coins ?? 0) + coins)
    if (delta.tokens) {
      patch.game_tokens = Math.min(
        MAX_TOKENS,
        Math.max(0, (hero.game_tokens ?? 0) + delta.tokens),
      )
    }

    let earnedTotal: number | null = null
    if (delta.gear || coins > 0) {
      let gear = parseGear(hero)
      if (delta.gear) gear = delta.gear(gear)
      if (coins > 0) {
        gear = {
          ...gear,
          stats: { ...gear.stats, coinsEarned: gear.stats.coinsEarned + coins },
        }
        earnedTotal = gear.stats.coinsEarned
      }
      patch.gear = gear as unknown as Profile['gear']
    }

    await safeUpdateProfile(hero.id, patch)
    delta.sound?.()

    if (leveledTo) {
      set({ celebration: 'levelup' })
      sfx.fanfare()
      const levelBadge = [5, 10, 20].includes(leveledTo) ? `level_${leveledTo}` : null
      if (levelBadge) await grantBadge(hero.id, levelBadge)
    }
    if (earnedTotal !== null && earnedTotal >= 500) {
      await grantBadge(hero.id, 'rich_500')
    }
  }


  async function grantBadge(profileId: string, type: string): Promise<void> {
    try {
      const created = await backend.awardBadge(profileId, type)
      if (created) {
        set((s) => ({
          badges: s.badges.some((b) => b.id === created.id) ? s.badges : [...s.badges, created],
          badgeQueue: [...s.badgeQueue, badgeDef(type)],
          celebration: 'confetti',
        }))
      }
    } catch {
      // badge awarding is best-effort; never block the logging flow
    }
  }

  /** Profile update with optimistic local state and offline outbox fallback. */
  async function safeUpdateProfile(id: string, patch: Partial<Profile>): Promise<void> {
    set((s) => ({
      familyProfiles: s.familyProfiles.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      myProfile: s.myProfile?.id === id ? { ...s.myProfile, ...patch } : s.myProfile,
    }))
    try {
      await backend.updateProfile(id, patch)
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueue({ kind: 'updateProfile', id, patch })
        await get().refreshOutbox()
      }
    }
  }

  /**
   * Close out days since the last evaluation: every completed day with
   * entries within the limit extends the streak (+50 XP, milestone badges);
   * a missed/over day consumes a shield if available, else resets. Shields
   * refill to 1 each Monday.
   */
  async function evaluateStreaks(): Promise<void> {
    const state = get()
    const hero = heroProfileOf(state)
    if (!hero) return
    const today = todayISO()
    const yesterday = addDays(today, -1)
    const entries = state.entries
    const firstEntryDate = entries.length
      ? entries.reduce((min, e) => (e.date < min ? e.date : min), entries[0].date)
      : null

    let streak = hero.streak_current
    let best = hero.streak_best
    let shields = hero.streak_shields
    let lastEvaluated = hero.streak_last_date
    let xpEarned = 0
    let coinsEarned = 0
    const milestonesHit: string[] = []

    let cursor = lastEvaluated
      ? addDays(lastEvaluated, 1)
      : (firstEntryDate ?? today)
    if (cursor < addDays(today, -MAX_CATCHUP_DAYS)) {
      // long absence: evaluate only the recent window, streak restarts
      streak = 0
      cursor = addDays(today, -MAX_CATCHUP_DAYS)
    }

    while (cursor <= yesterday) {
      const total = dayTotal(entries, cursor)
      const hasEntries = entries.some((e) => e.date === cursor)
      if (hasEntries && total <= Number(hero.daily_protein_limit)) {
        streak += 1
        best = Math.max(best, streak)
        // streaks multiply the daily XP: ×1.5 from 7 days, ×2 from 30
        xpEarned += Math.round(XP.UNDER_LIMIT_DAY * streakMultiplier(streak))
        coinsEarned += COINS.GREEN_DAY
        const badge = streakBadgeType(streak)
        if (badge) {
          milestonesHit.push(badge)
          xpEarned += XP.STREAK_MILESTONE
          coinsEarned += COINS.STREAK_MILESTONE
        }
      } else if (shields > 0) {
        shields -= 1 // streak survives behind the shield
      } else {
        streak = 0
      }
      lastEvaluated = cursor
      cursor = addDays(cursor, 1)
    }

    // Monday shield refill (1 free shield per week)
    const thisWeek = weekStartISO(today)
    let shieldsRefilledOn = hero.shields_refilled_on
    if (shields < 1 && (shieldsRefilledOn === null || shieldsRefilledOn < thisWeek)) {
      shields = 1
      shieldsRefilledOn = thisWeek
    }

    const changed =
      streak !== hero.streak_current ||
      best !== hero.streak_best ||
      shields !== hero.streak_shields ||
      lastEvaluated !== hero.streak_last_date ||
      shieldsRefilledOn !== hero.shields_refilled_on
    if (changed) {
      const gear = parseGear(hero)
      await safeUpdateProfile(hero.id, {
        streak_current: streak,
        streak_best: best,
        streak_shields: shields,
        streak_last_date: lastEvaluated,
        shields_refilled_on: shieldsRefilledOn,
        xp: hero.xp + xpEarned,
        avatar_level: levelForXp(hero.xp + xpEarned),
        coins: Math.max(0, (hero.coins ?? 0) + coinsEarned),
        gear: {
          ...gear,
          stats: { ...gear.stats, coinsEarned: gear.stats.coinsEarned + coinsEarned },
        } as unknown as Profile['gear'],
      })
      for (const badge of milestonesHit) await grantBadge(hero.id, badge)
      await checkPerfectWeek()
    }
  }

  async function checkPerfectWeek(): Promise<void> {
    const state = get()
    const hero = heroProfileOf(state)
    if (!hero) return
    // last completed week (Mon..Sun before this week's Monday)
    const lastWeekStart = addDays(weekStartISO(), -7)
    const limit = Number(hero.daily_protein_limit)
    for (let i = 0; i < 7; i++) {
      const day = addDays(lastWeekStart, i)
      const has = state.entries.some((e) => e.date === day)
      if (!has || dayTotal(state.entries, day) > limit) return
    }
    await grantBadge(hero.id, 'perfect_week')
  }

  async function checkFruitHero(): Promise<void> {
    const state = get()
    const hero = heroProfileOf(state)
    if (!hero) return
    const fruitWords = ['appel', 'banaan', 'aardbei', 'druif', 'sinaasappel', 'meloen', 'peer', 'kiwi', 'mango', 'bes', 'fruit']
    for (let i = 0; i < 5; i++) {
      const day = addDays(todayISO(), -i)
      const hasFruit = state.entries.some(
        (e) => e.date === day && fruitWords.some((w) => e.food_name.toLowerCase().includes(w)),
      )
      if (!hasFruit) return
    }
    await grantBadge(hero.id, 'fruit_hero')
  }

  async function ensureWeeklyChallenge(): Promise<void> {
    try {
      const ws = weekStartISO()
      const existing =
        (await backend.getWeeklyChallenge(ws)) ??
        (await backend.upsertWeeklyChallenge(ws, challengeForWeek(ws).type))
      set({ challenge: existing })
    } catch {
      // challenge is decorative; never block boot on it
    }
  }

  async function checkChallengeCompletion(): Promise<void> {
    const state = get()
    const challenge = state.challenge
    if (!challenge || challenge.completed) return
    const def = challengeDef(challenge.challenge_type)
    const hero = state.familyProfiles.find((p) => p.role === 'hero') ?? null
    const weekEntries = state.entries.filter((e) => e.date >= challenge.week_start)
    if (def.progress(weekEntries, hero?.id ?? null) >= def.target) {
      try {
        const completed = await backend.completeWeeklyChallenge(challenge.id)
        set({ challenge: completed, celebration: 'confetti' })
        const target = heroProfileOf(state)
        if (target) await grantBadge(target.id, 'challenge_champion')
      } catch {
        // retried on next entry
      }
    }
  }

  async function afterSignIn(): Promise<void> {
    const profile = await backend.getMyProfile()
    if (!profile) {
      set({ bootStatus: 'signedOut', session: null })
      return
    }
    set({ myProfile: profile })
    setLang((profile.language as Lang) ?? 'nl')
    set({ lang: (profile.language as Lang) ?? 'nl' })
    if (!profile.family_id) {
      set({ bootStatus: 'needsFamily' })
      return
    }
    await loadFamilyData(profile)
  }

  // ---- public state ----

  return {
    bootStatus: 'booting',
    session: null,
    myProfile: null,
    familyProfiles: [],
    family: null,
    entries: [],
    foods: [],
    customFoods: [],
    badges: [],
    challenge: null,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    outboxPending: 0,
    lang: getLang(),
    largeText: false,
    badgeQueue: [],
    celebration: null,
    freshFamilyCode: null,

    clearFreshFamilyCode() {
      set({ freshFamilyCode: null })
    },

    async boot() {
      const largeText = localStorage.getItem('hero-fuel-large-text') === '1'
      document.documentElement.classList.toggle('text-lg-mode', largeText)
      set({ largeText })

      window.addEventListener('online', () => {
        set({ online: true })
        void flush(backend).then(() => get().refreshOutbox())
      })
      window.addEventListener('offline', () => set({ online: false }))

      await get().refreshOutbox()
      if (navigator.onLine) await flush(backend)

      try {
        const session = await backend.getSession()
        if (!session) {
          set({ bootStatus: 'signedOut' })
          return
        }
        set({ session })
        await afterSignIn()
      } catch {
        set({ bootStatus: 'signedOut' })
      }
    },

    async signUp(input) {
      const session = await backend.signUp(input)
      set({ session })
      await afterSignIn()
    },

    async signIn(email, password) {
      const session = await backend.signIn(email, password)
      set({ session })
      await afterSignIn()
    },

    async signOut() {
      unsubscribeRealtime?.()
      unsubscribeRealtime = null
      await backend.signOut()
      set({
        bootStatus: 'signedOut',
        session: null,
        myProfile: null,
        familyProfiles: [],
        family: null,
        entries: [],
        badges: [],
        challenge: null,
        badgeQueue: [],
      })
    },

    async createFamily() {
      const { familyCode } = await backend.createFamily()
      set({ freshFamilyCode: familyCode })
      const profile = await backend.getMyProfile()
      if (profile) {
        set({ myProfile: profile })
        await loadFamilyData(profile)
      }
      return familyCode
    },

    async joinFamily(code) {
      await backend.joinFamily(code)
      const profile = await backend.getMyProfile()
      if (profile) {
        set({ myProfile: profile })
        await loadFamilyData(profile)
      }
    },

    async addEntry(input) {
      const state = get()
      const me = state.myProfile
      if (!me?.family_id) throw new Error('no_family')
      const date = input.date ?? todayISO()
      const clientId = crypto.randomUUID()
      const nowIso = new Date().toISOString()

      const optimistic: FoodEntry = {
        id: clientId,
        family_id: me.family_id,
        logged_by: me.id,
        food_name: input.food_name,
        protein_grams: input.protein_grams,
        meal_type: input.meal_type,
        source: input.source,
        photo_url: input.photo_url ?? null,
        date,
        client_id: clientId,
        created_at: nowIso,
        updated_at: nowIso,
      }
      const isFirstEntry = state.entries.length === 0
      set({ entries: [...state.entries, optimistic] })

      const payload: NewFoodEntry = {
        client_id: clientId,
        food_name: input.food_name,
        protein_grams: input.protein_grams,
        meal_type: input.meal_type,
        source: input.source,
        photo_url: input.photo_url ?? null,
        date,
      }

      try {
        const saved = await backend.addEntry(payload)
        set((s) => ({
          entries: s.entries.map((e) => (e.client_id === clientId ? saved : e)),
        }))
      } catch (err) {
        if (isNetworkError(err)) {
          await enqueue({ kind: 'addEntry', payload })
          await get().refreshOutbox()
        } else {
          set((s) => ({ entries: s.entries.filter((e) => e.client_id !== clientId) }))
          throw err
        }
      }

      // -- gamification side effects (hero-centric) --
      const hero = heroProfileOf(get())
      // every logged meal powers the hero AND charges the arcade: +1 token
      await applyHeroDelta({
        xp: input.source === 'scan' ? XP.LOG_MEAL + XP.SCAN_LABEL : XP.LOG_MEAL,
        tokens: 1,
        sound: sfx.whoosh,
      })
      if (hero) {
        if (isFirstEntry) await grantBadge(hero.id, 'first_mission')
        if (me.role === 'sidekick' && hero.id !== me.id) {
          await grantBadge(hero.id, 'sidekick_helper')
        }
        if (input.source === 'scan') {
          const scans = get().entries.filter((e) => e.source === 'scan').length
          if (scans >= 10) await grantBadge(hero.id, 'scanner_pro')
        }
      }
      await checkFruitHero()
      await checkChallengeCompletion()
    },

    async updateEntry(id, patch) {
      set((s) => ({
        entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }))
      try {
        await backend.updateEntry(id, patch)
      } catch (err) {
        if (isNetworkError(err)) {
          await enqueue({ kind: 'updateEntry', id, patch })
          await get().refreshOutbox()
        } else throw err
      }
    },

    async deleteEntry(id) {
      set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }))
      try {
        await backend.deleteEntry(id)
      } catch (err) {
        if (isNetworkError(err)) {
          await enqueue({ kind: 'deleteEntry', id })
          await get().refreshOutbox()
        } else throw err
      }
    },

    async addCustomFood(input) {
      const food = await backend.addCustomFood(input)
      set((s) => ({ customFoods: [...s.customFoods, food].sort((a, b) => a.name.localeCompare(b.name)) }))
      return food
    },

    async updateCustomFood(id, patch) {
      const updated = await backend.updateCustomFood(id, patch)
      set((s) => ({ customFoods: s.customFoods.map((f) => (f.id === id ? updated : f)) }))
    },

    async deleteCustomFood(id) {
      await backend.deleteCustomFood(id)
      set((s) => ({ customFoods: s.customFoods.filter((f) => f.id !== id) }))
    },

    async updateProfile(id, patch) {
      await safeUpdateProfile(id, patch)
    },

    async setLanguage(lang) {
      setLang(lang)
      set({ lang })
      const me = get().myProfile
      if (me) await safeUpdateProfile(me.id, { language: lang })
    },

    setLargeText(on) {
      localStorage.setItem('hero-fuel-large-text', on ? '1' : '0')
      document.documentElement.classList.toggle('text-lg-mode', on)
      set({ largeText: on })
    },

    popBadge() {
      set((s) => ({ badgeQueue: s.badgeQueue.slice(1) }))
    },

    clearCelebration() {
      set({ celebration: null })
    },

    async refreshOutbox() {
      set({ outboxPending: await pendingCount() })
    },

    async refresh() {
      const profile = await backend.getMyProfile()
      if (profile?.family_id) {
        set({ myProfile: profile })
        await loadFamilyData(profile)
      }
    },

    // -- hero economy -------------------------------------------------------

    async claimMission(missionId) {
      const state = get()
      const hero = heroProfileOf(state)
      if (!hero) return
      const gear = parseGear(hero)
      const today = todayISO()
      const states = missionStates(today, {
        entries: state.entries.filter((e) => e.date === today),
        heroId: hero.id,
        gear,
      })
      const mission = states.find((m) => m.id === missionId)
      if (!mission || !mission.completed || mission.claimed) return
      await applyHeroDelta({
        xp: 10,
        coins: COINS.MISSION,
        gear: (g) => ({
          ...g,
          daily: { ...g.daily, claimed: [...g.daily.claimed, missionId] },
        }),
        sound: sfx.claim,
      })
    },

    async openChest() {
      const state = get()
      const hero = heroProfileOf(state)
      if (!hero) return null
      const gear = parseGear(hero)
      const today = todayISO()
      const states = missionStates(today, {
        entries: state.entries.filter((e) => e.date === today),
        heroId: hero.id,
        gear,
      })
      if (gear.daily.chestOpened || !states.every((m) => m.claimed)) return null

      const item = Math.random() < 0.25 ? randomUnownedItem(gear, Math.random()) : null
      const coins = COINS.CHEST + (item ? 0 : COINS.CHEST_DUPLICATE_BONUS)
      const newAllDailies = gear.stats.allDailiesCount + 1

      await applyHeroDelta({
        coins,
        gear: (g) => ({
          ...g,
          owned: item ? [...g.owned, item.id] : g.owned,
          daily: { ...g.daily, chestOpened: true },
          stats: { ...g.stats, allDailiesCount: newAllDailies },
        }),
        sound: sfx.chest,
      })
      set({ celebration: 'confetti' })
      if (newAllDailies >= 5) await grantBadge(hero.id, 'missions_5')
      return { coins, item }
    },

    async buyItem(itemId) {
      const state = get()
      const hero = heroProfileOf(state)
      const item = shopItem(itemId)
      if (!hero || !item || item.free) return false
      const gear = parseGear(hero)
      if (gear.owned.includes(itemId) || (hero.coins ?? 0) < item.price) return false
      await applyHeroDelta({
        coins: -item.price,
        gear: (g) => ({
          ...g,
          owned: [...g.owned, itemId],
          equipped: { ...g.equipped, [item.slot]: itemId },
        }),
        sound: sfx.coin,
      })
      await grantBadge(hero.id, 'shopper')
      return true
    },

    async equipItem(slot, itemId) {
      await applyHeroDelta({
        gear: (g) => ({ ...g, equipped: { ...g.equipped, [slot]: itemId } }),
        sound: sfx.pop,
      })
    },

    async buyShield() {
      const state = get()
      const hero = heroProfileOf(state)
      if (!hero) return false
      if ((hero.coins ?? 0) < COINS.SHIELD_PRICE || hero.streak_shields >= MAX_SHIELDS) {
        return false
      }
      await safeUpdateProfile(hero.id, {
        coins: (hero.coins ?? 0) - COINS.SHIELD_PRICE,
        streak_shields: hero.streak_shields + 1,
      })
      sfx.claim()
      return true
    },

    async startGame() {
      const state = get()
      const hero = heroProfileOf(state)
      if (!hero || (hero.game_tokens ?? 0) < 1) return false
      await applyHeroDelta({
        tokens: -1,
        gear: (g) => ({
          ...g,
          daily: { ...g.daily, gamesPlayed: g.daily.gamesPlayed + 1 },
        }),
        sound: sfx.pop,
      })
      await grantBadge(hero.id, 'gamer_first')
      return true
    },

    async finishGame(score) {
      const state = get()
      const hero = heroProfileOf(state)
      if (!hero) return 0
      const coins = coinsForScore(score)
      await applyHeroDelta({
        xp: 10,
        coins,
        gear: (g) => ({
          ...g,
          stats: { ...g.stats, hiscore: Math.max(g.stats.hiscore, score) },
        }),
        sound: sfx.coin,
      })
      if (score >= 100) await grantBadge(hero.id, 'gamer_100')
      if (score >= 250) await grantBadge(hero.id, 'gamer_250')
      return coins
    },
  }
})
