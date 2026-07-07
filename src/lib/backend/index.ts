import { supabase, supabaseConfigured } from '../supabase'
import { LocalBackend } from './local'
import { SupabaseBackend } from './supabase'
import type { Backend } from './types'

/**
 * The active backend for this build: Supabase when .env keys are present,
 * otherwise the keyless local-first backend (demo/offline mode).
 */
export const backend: Backend =
  supabaseConfigured && supabase ? new SupabaseBackend(supabase) : new LocalBackend()

export * from './types'
