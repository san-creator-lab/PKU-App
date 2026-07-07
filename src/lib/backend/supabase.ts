import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'
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

export class SupabaseBackend implements Backend {
  readonly kind = 'supabase' as const

  constructor(private client: SupabaseClient<Database>) {}

  private async userId(): Promise<string> {
    const { data, error } = await this.client.auth.getSession()
    if (error || !data.session) throw new Error('not_authenticated')
    return data.session.user.id
  }

  // -- auth ---------------------------------------------------------------

  async getSession(): Promise<SessionInfo | null> {
    const { data } = await this.client.auth.getSession()
    if (!data.session) return null
    return { userId: data.session.user.id, email: data.session.user.email ?? null }
  }

  async signUp(input: SignUpInput): Promise<SessionInfo> {
    const { data, error } = await this.client.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          display_name: input.displayName,
          role: input.role,
          language: input.language ?? 'nl',
        },
      },
    })
    if (error) throw error
    if (!data.session || !data.user) {
      // Email confirmations are disabled in config.toml; a missing session
      // here means the hosted project still has them enabled.
      throw new Error('email_confirmation_required')
    }
    return { userId: data.user.id, email: data.user.email ?? null }
  }

  async signIn(email: string, password: string): Promise<SessionInfo> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return { userId: data.user.id, email: data.user.email ?? null }
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut()
  }

  // -- family -------------------------------------------------------------

  async createFamily(): Promise<{ familyId: string; familyCode: string }> {
    const { data, error } = await this.client.rpc('create_family')
    if (error) throw error
    const result = data as { family_id: string; family_code: string }
    return { familyId: result.family_id, familyCode: result.family_code }
  }

  async joinFamily(code: string): Promise<string> {
    const { data, error } = await this.client.rpc('join_family', { code })
    if (error) throw error
    return data
  }

  async getFamily(familyId: string): Promise<Family | null> {
    const { data, error } = await this.client
      .from('families')
      .select()
      .eq('id', familyId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  // -- profiles -----------------------------------------------------------

  async getMyProfile(): Promise<Profile | null> {
    const uid = await this.userId()
    const { data, error } = await this.client
      .from('profiles')
      .select()
      .eq('id', uid)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async listFamilyProfiles(): Promise<Profile[]> {
    const { data, error } = await this.client.from('profiles').select()
    if (error) throw error
    return data
  }

  async updateProfile(id: string, patch: Partial<Profile>): Promise<Profile> {
    const { data, error } = await this.client
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  // -- food entries ---------------------------------------------------------

  async listEntries(fromDate: string, toDate: string): Promise<FoodEntry[]> {
    const { data, error } = await this.client
      .from('food_entries')
      .select()
      .gte('date', fromDate)
      .lte('date', toDate)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data
  }

  async addEntry(input: NewFoodEntry): Promise<FoodEntry> {
    const uid = await this.userId()
    const profile = await this.getMyProfile()
    if (!profile?.family_id) throw new Error('no_family')
    const { data, error } = await this.client
      .from('food_entries')
      .upsert(
        {
          ...input,
          family_id: profile.family_id,
          logged_by: uid,
        },
        // client_id makes offline-outbox retries idempotent
        { onConflict: 'client_id' },
      )
      .select()
      .single()
    if (error) throw error
    return data
  }

  async updateEntry(id: string, patch: Partial<FoodEntry>): Promise<FoodEntry> {
    const { data, error } = await this.client
      .from('food_entries')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async deleteEntry(id: string): Promise<void> {
    const { error } = await this.client.from('food_entries').delete().eq('id', id)
    if (error) throw error
  }

  // -- food library ---------------------------------------------------------

  async listFoods(): Promise<Food[]> {
    const { data, error } = await this.client.from('foods').select().order('name')
    if (error) throw error
    return data
  }

  async listCustomFoods(): Promise<CustomFood[]> {
    const { data, error } = await this.client
      .from('custom_foods')
      .select()
      .order('name')
    if (error) throw error
    return data
  }

  async addCustomFood(input: NewCustomFood): Promise<CustomFood> {
    const profile = await this.getMyProfile()
    if (!profile?.family_id) throw new Error('no_family')
    const { data, error } = await this.client
      .from('custom_foods')
      .insert({ ...input, family_id: profile.family_id })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async updateCustomFood(id: string, patch: Partial<CustomFood>): Promise<CustomFood> {
    const { data, error } = await this.client
      .from('custom_foods')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async deleteCustomFood(id: string): Promise<void> {
    const { error } = await this.client.from('custom_foods').delete().eq('id', id)
    if (error) throw error
  }

  // -- gamification ---------------------------------------------------------

  async listFamilyBadges(): Promise<Badge[]> {
    const { data, error } = await this.client.from('badges').select()
    if (error) throw error
    return data
  }

  async awardBadge(profileId: string, badgeType: string): Promise<Badge | null> {
    const { data, error } = await this.client
      .from('badges')
      .upsert(
        { profile_id: profileId, badge_type: badgeType },
        { onConflict: 'profile_id,badge_type', ignoreDuplicates: true },
      )
      .select()
      .maybeSingle()
    if (error) throw error
    return data // null when it already existed
  }

  async getWeeklyChallenge(weekStart: string): Promise<WeeklyChallenge | null> {
    const { data, error } = await this.client
      .from('weekly_challenges')
      .select()
      .eq('week_start', weekStart)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async upsertWeeklyChallenge(
    weekStart: string,
    challengeType: string,
  ): Promise<WeeklyChallenge> {
    const profile = await this.getMyProfile()
    if (!profile?.family_id) throw new Error('no_family')
    const { data, error } = await this.client
      .from('weekly_challenges')
      .upsert(
        {
          family_id: profile.family_id,
          week_start: weekStart,
          challenge_type: challengeType,
        },
        { onConflict: 'family_id,week_start', ignoreDuplicates: true },
      )
      .select()
      .maybeSingle()
    if (error) throw error
    if (data) return data
    const existing = await this.getWeeklyChallenge(weekStart)
    if (!existing) throw new Error('challenge_upsert_failed')
    return existing
  }

  async completeWeeklyChallenge(id: string): Promise<WeeklyChallenge> {
    const { data, error } = await this.client
      .from('weekly_challenges')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  // -- realtime -------------------------------------------------------------

  subscribe(familyId: string, onEvent: (e: FamilyDataEvent) => void): Unsubscribe {
    const channel = this.client
      .channel(`family:${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_entries',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          onEvent({
            table: 'food_entries',
            type: payload.eventType as FamilyDataEvent['type'],
            row: (payload.eventType === 'DELETE'
              ? payload.old
              : payload.new) as FoodEntry,
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          onEvent({
            table: 'profiles',
            type: payload.eventType as FamilyDataEvent['type'],
            row: (payload.eventType === 'DELETE'
              ? payload.old
              : payload.new) as Profile,
          })
        },
      )
      .on(
        'postgres_changes',
        // badges has no family_id column; RLS-filtered rows arrive for the
        // family members visible to this user.
        { event: '*', schema: 'public', table: 'badges' },
        (payload) => {
          onEvent({
            table: 'badges',
            type: payload.eventType as FamilyDataEvent['type'],
            row: (payload.eventType === 'DELETE'
              ? payload.old
              : payload.new) as Badge,
          })
        },
      )
      .subscribe()

    return () => {
      void this.client.removeChannel(channel)
    }
  }

  // -- storage --------------------------------------------------------------

  async uploadLabelPhoto(familyId: string, blob: Blob): Promise<string | null> {
    const path = `${familyId}/${crypto.randomUUID()}.jpg`
    const { error } = await this.client.storage
      .from('label-photos')
      .upload(path, blob, { contentType: 'image/jpeg' })
    if (error) return null
    const { data } = await this.client.storage
      .from('label-photos')
      .createSignedUrl(path, 60 * 60 * 24 * 365)
    return data?.signedUrl ?? null
  }
}
