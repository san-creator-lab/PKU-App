// Database types for the Hero Fuel schema (supabase/migrations).
// Written in the exact shape `supabase gen types typescript` emits.
// Regenerate against a running project with:
//   npx supabase gen types typescript --local > src/lib/database.types.ts
//   (or --linked for a hosted project)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      badges: {
        Row: {
          badge_type: string
          earned_at: string
          id: string
          profile_id: string
        }
        Insert: {
          badge_type: string
          earned_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          badge_type?: string
          earned_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'badges_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      custom_foods: {
        Row: {
          category: string
          created_at: string
          emoji: string | null
          family_id: string
          id: string
          is_favorite: boolean
          name: string
          protein_per_100g: number
          protein_per_serving: number
          serving_description: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          emoji?: string | null
          family_id: string
          id?: string
          is_favorite?: boolean
          name: string
          protein_per_100g: number
          protein_per_serving: number
          serving_description?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          emoji?: string | null
          family_id?: string
          id?: string
          is_favorite?: boolean
          name?: string
          protein_per_100g?: number
          protein_per_serving?: number
          serving_description?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'custom_foods_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          family_code: string
          id: string
        }
        Insert: {
          created_at?: string
          family_code: string
          id?: string
        }
        Update: {
          created_at?: string
          family_code?: string
          id?: string
        }
        Relationships: []
      }
      food_entries: {
        Row: {
          client_id: string | null
          created_at: string
          date: string
          family_id: string
          food_name: string
          id: string
          logged_by: string
          meal_type: Database['public']['Enums']['meal_type']
          photo_url: string | null
          protein_grams: number
          source: Database['public']['Enums']['entry_source']
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          date?: string
          family_id: string
          food_name?: string
          id?: string
          logged_by: string
          meal_type: Database['public']['Enums']['meal_type']
          photo_url?: string | null
          protein_grams: number
          source?: Database['public']['Enums']['entry_source']
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          date?: string
          family_id?: string
          food_name?: string
          id?: string
          logged_by?: string
          meal_type?: Database['public']['Enums']['meal_type']
          photo_url?: string | null
          protein_grams?: number
          source?: Database['public']['Enums']['entry_source']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'food_entries_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'food_entries_logged_by_fkey'
            columns: ['logged_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      foods: {
        Row: {
          category: string
          emoji: string | null
          id: string
          name: string
          protein_per_100g: number
          protein_per_serving: number
          serving_description: string
        }
        Insert: {
          category: string
          emoji?: string | null
          id?: string
          name: string
          protein_per_100g: number
          protein_per_serving: number
          serving_description?: string
        }
        Update: {
          category?: string
          emoji?: string | null
          id?: string
          name?: string
          protein_per_100g?: number
          protein_per_serving?: number
          serving_description?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_level: number
          coins: number
          created_at: string
          daily_protein_limit: number
          display_name: string
          family_id: string | null
          game_tokens: number
          gear: Json
          id: string
          language: string
          role: Database['public']['Enums']['user_role']
          shields_refilled_on: string | null
          streak_best: number
          streak_current: number
          streak_last_date: string | null
          streak_shields: number
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_level?: number
          coins?: number
          created_at?: string
          daily_protein_limit?: number
          display_name?: string
          family_id?: string | null
          game_tokens?: number
          gear?: Json
          id: string
          language?: string
          role?: Database['public']['Enums']['user_role']
          shields_refilled_on?: string | null
          streak_best?: number
          streak_current?: number
          streak_last_date?: string | null
          streak_shields?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_level?: number
          coins?: number
          created_at?: string
          daily_protein_limit?: number
          display_name?: string
          family_id?: string | null
          game_tokens?: number
          gear?: Json
          id?: string
          language?: string
          role?: Database['public']['Enums']['user_role']
          shields_refilled_on?: string | null
          streak_best?: number
          streak_current?: number
          streak_last_date?: string | null
          streak_shields?: number
          updated_at?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
        ]
      }
      weekly_challenges: {
        Row: {
          challenge_type: string
          completed: boolean
          completed_at: string | null
          family_id: string
          id: string
          week_start: string
        }
        Insert: {
          challenge_type: string
          completed?: boolean
          completed_at?: string | null
          family_id: string
          id?: string
          week_start: string
        }
        Update: {
          challenge_type?: string
          completed?: boolean
          completed_at?: string | null
          family_id?: string
          id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: 'weekly_challenges_family_id_fkey'
            columns: ['family_id']
            isOneToOne: false
            referencedRelation: 'families'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_family: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      current_family_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Enums']['user_role']
      }
      join_family: {
        Args: { code: string }
        Returns: string
      }
    }
    Enums: {
      entry_source: 'manual' | 'scan' | 'library' | 'favorite'
      meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
      user_role: 'hero' | 'sidekick'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']

export type Enums<T extends keyof PublicSchema['Enums']> =
  PublicSchema['Enums'][T]
