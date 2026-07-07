import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

/**
 * Typed Supabase client. `null` when no keys are configured — the app then
 * runs on the keyless LocalBackend (see src/lib/backend/). Sessions persist
 * in localStorage so the hero's device never has to re-log.
 */
export const supabase: SupabaseClient<Database> | null = supabaseConfigured
  ? createClient<Database>(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null
