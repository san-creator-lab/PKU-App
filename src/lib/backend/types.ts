import type { Enums, Tables } from '../database.types'

export type Profile = Tables<'profiles'>
export type Family = Tables<'families'>
export type FoodEntry = Tables<'food_entries'>
export type CustomFood = Tables<'custom_foods'>
export type Food = Tables<'foods'>
export type Badge = Tables<'badges'>
export type WeeklyChallenge = Tables<'weekly_challenges'>

export type UserRole = Enums<'user_role'>
export type MealType = Enums<'meal_type'>
export type EntrySource = Enums<'entry_source'>

export interface SessionInfo {
  userId: string
  email: string | null
}

export interface SignUpInput {
  email: string
  password: string
  displayName: string
  role: UserRole
  language?: string
}

export interface NewFoodEntry {
  /** Client-generated idempotency key; lets the offline outbox retry safely. */
  client_id: string
  food_name: string
  protein_grams: number
  meal_type: MealType
  source: EntrySource
  photo_url?: string | null
  date: string
}

export interface NewCustomFood {
  name: string
  protein_per_100g: number
  protein_per_serving: number
  serving_description: string
  category: string
  emoji?: string | null
  is_favorite?: boolean
}

export type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE'

export type FamilyDataEvent =
  | { table: 'food_entries'; type: ChangeType; row: FoodEntry }
  | { table: 'profiles'; type: ChangeType; row: Profile }
  | { table: 'badges'; type: ChangeType; row: Badge }

export type Unsubscribe = () => void

/**
 * Everything the UI needs from a data backend. Two implementations:
 * SupabaseBackend (production: Auth + Postgres + Realtime, selected when
 * VITE_SUPABASE_* env keys exist) and LocalBackend (keyless local-first:
 * IndexedDB + BroadcastChannel, so the whole app runs on one device with
 * zero external services). Screens never import a concrete backend.
 */
export interface Backend {
  readonly kind: 'supabase' | 'local'

  // -- auth ---------------------------------------------------------------
  getSession(): Promise<SessionInfo | null>
  signUp(input: SignUpInput): Promise<SessionInfo>
  signIn(email: string, password: string): Promise<SessionInfo>
  signOut(): Promise<void>

  // -- family -------------------------------------------------------------
  createFamily(): Promise<{ familyId: string; familyCode: string }>
  joinFamily(code: string): Promise<string>
  getFamily(familyId: string): Promise<Family | null>

  // -- profiles -----------------------------------------------------------
  getMyProfile(): Promise<Profile | null>
  listFamilyProfiles(): Promise<Profile[]>
  updateProfile(id: string, patch: Partial<Profile>): Promise<Profile>

  // -- food entries -------------------------------------------------------
  listEntries(fromDate: string, toDate: string): Promise<FoodEntry[]>
  addEntry(input: NewFoodEntry): Promise<FoodEntry>
  updateEntry(id: string, patch: Partial<FoodEntry>): Promise<FoodEntry>
  deleteEntry(id: string): Promise<void>

  // -- food library ---------------------------------------------------------
  listFoods(): Promise<Food[]>
  listCustomFoods(): Promise<CustomFood[]>
  addCustomFood(input: NewCustomFood): Promise<CustomFood>
  updateCustomFood(id: string, patch: Partial<CustomFood>): Promise<CustomFood>
  deleteCustomFood(id: string): Promise<void>

  // -- gamification ---------------------------------------------------------
  listFamilyBadges(): Promise<Badge[]>
  /** Idempotent: returns null when the badge was already earned. */
  awardBadge(profileId: string, badgeType: string): Promise<Badge | null>
  getWeeklyChallenge(weekStart: string): Promise<WeeklyChallenge | null>
  upsertWeeklyChallenge(
    weekStart: string,
    challengeType: string,
  ): Promise<WeeklyChallenge>
  completeWeeklyChallenge(id: string): Promise<WeeklyChallenge>

  // -- realtime -------------------------------------------------------------
  /** Live changes for the family's data; fires for other devices' writes. */
  subscribe(familyId: string, onEvent: (e: FamilyDataEvent) => void): Unsubscribe

  // -- storage --------------------------------------------------------------
  /** Stores a label photo, returns a URL/data-URL for food_entries.photo_url. */
  uploadLabelPhoto(familyId: string, blob: Blob): Promise<string | null>
}
