export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      battle_records: {
        Row: {
          battle_date: string
          battle_id: string
          coins_earned: number
          created_at: string
          exp_earned: number
          id: string
          opponent_name: string
          result: string
          user_id: string
        }
        Insert: {
          battle_date: string
          battle_id: string
          coins_earned?: number
          created_at?: string
          exp_earned?: number
          id?: string
          opponent_name: string
          result: string
          user_id: string
        }
        Update: {
          battle_date?: string
          battle_id?: string
          coins_earned?: number
          created_at?: string
          exp_earned?: number
          id?: string
          opponent_name?: string
          result?: string
          user_id?: string
        }
        Relationships: []
      }
      catch_quests: {
        Row: {
          active_quests: Json
          completed_count: number
          created_at: string
          failed_count: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_quests?: Json
          completed_count?: number
          created_at?: string
          failed_count?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_quests?: Json
          completed_count?: number
          created_at?: string
          failed_count?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          coins: number
          created_at: string
          encountered_species_ids: number[]
          id: string
          seen_species_ids: number[]
          starter_chosen: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          coins?: number
          created_at?: string
          encountered_species_ids?: number[]
          id?: string
          seen_species_ids?: number[]
          starter_chosen?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          coins?: number
          created_at?: string
          encountered_species_ids?: number[]
          id?: string
          seen_species_ids?: number[]
          starter_chosen?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string
          id: string
          items: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legendary_state: {
        Row: {
          caught: number[]
          created_at: string
          encounters: number
          id: string
          last_encounter_date: string | null
          updated_at: string
          user_id: string
          weekly_goal_streak_count: number
        }
        Insert: {
          caught?: number[]
          created_at?: string
          encounters?: number
          id?: string
          last_encounter_date?: string | null
          updated_at?: string
          user_id: string
          weekly_goal_streak_count?: number
        }
        Update: {
          caught?: number[]
          created_at?: string
          encounters?: number
          id?: string
          last_encounter_date?: string | null
          updated_at?: string
          user_id?: string
          weekly_goal_streak_count?: number
        }
        Relationships: []
      }
      owned_pokemon: {
        Row: {
          acquired_date: string
          acquired_method: string
          created_at: string
          friendship: number
          id: string
          is_in_party: boolean
          level: number
          nickname: string | null
          species_id: number
          uid: string
          user_id: string
        }
        Insert: {
          acquired_date?: string
          acquired_method?: string
          created_at?: string
          friendship?: number
          id?: string
          is_in_party?: boolean
          level?: number
          nickname?: string | null
          species_id: number
          uid: string
          user_id: string
        }
        Update: {
          acquired_date?: string
          acquired_method?: string
          created_at?: string
          friendship?: number
          id?: string
          is_in_party?: boolean
          level?: number
          nickname?: string | null
          species_id?: number
          uid?: string
          user_id?: string
        }
        Relationships: []
      }
      pets: {
        Row: {
          created_at: string
          exp: number
          food_count: number
          happiness: number
          hp: number
          id: string
          last_hp_decay: string | null
          level: number
          max_hp: number
          name: string
          stage: string
          total_food_collected: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exp?: number
          food_count?: number
          happiness?: number
          hp?: number
          id?: string
          last_hp_decay?: string | null
          level?: number
          max_hp?: number
          name?: string
          stage?: string
          total_food_collected?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exp?: number
          food_count?: number
          happiness?: number
          hp?: number
          id?: string
          last_hp_decay?: string | null
          level?: number
          max_hp?: number
          name?: string
          stage?: string
          total_food_collected?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pokemon_eggs: {
        Row: {
          created_at: string
          distance_required: number
          distance_walked: number
          egg_id: string
          hatched: boolean
          hatched_species_id: number | null
          id: string
          rarity: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distance_required?: number
          distance_walked?: number
          egg_id: string
          hatched?: boolean
          hatched_species_id?: number | null
          id?: string
          rarity?: string
          user_id: string
        }
        Update: {
          created_at?: string
          distance_required?: number
          distance_walked?: number
          egg_id?: string
          hatched?: boolean
          hatched_species_id?: number | null
          id?: string
          rarity?: string
          user_id?: string
        }
        Relationships: []
      }
      pokemon_health: {
        Row: {
          created_at: string
          id: string
          injuries: Json
          last_heal_all_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          injuries?: Json
          last_heal_all_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          injuries?: Json
          last_heal_all_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          consecutive_login_days: number
          created_at: string
          dark_mode: boolean
          id: string
          last_completed_date: string | null
          last_login_date: string | null
          name: string
          notifications_enabled: boolean
          off_work_time: string
          streak: number
          updated_at: string
        }
        Insert: {
          consecutive_login_days?: number
          created_at?: string
          dark_mode?: boolean
          id: string
          last_completed_date?: string | null
          last_login_date?: string | null
          name?: string
          notifications_enabled?: boolean
          off_work_time?: string
          streak?: number
          updated_at?: string
        }
        Update: {
          consecutive_login_days?: number
          created_at?: string
          dark_mode?: boolean
          id?: string
          last_completed_date?: string | null
          last_login_date?: string | null
          name?: string
          notifications_enabled?: boolean
          off_work_time?: string
          streak?: number
          updated_at?: string
        }
        Relationships: []
      }
      running_sessions: {
        Row: {
          calories_burned: number
          created_at: string
          distance_km: number
          duration_seconds: number
          end_time: string
          id: string
          pace_min_per_km: number
          reward_granted: boolean
          route: Json
          session_date: string
          session_id: string
          start_time: string
          user_id: string
        }
        Insert: {
          calories_burned?: number
          created_at?: string
          distance_km?: number
          duration_seconds?: number
          end_time: string
          id?: string
          pace_min_per_km?: number
          reward_granted?: boolean
          route?: Json
          session_date: string
          session_id: string
          start_time: string
          user_id: string
        }
        Update: {
          calories_burned?: number
          created_at?: string
          distance_km?: number
          duration_seconds?: number
          end_time?: string
          id?: string
          pace_min_per_km?: number
          reward_granted?: boolean
          route?: Json
          session_date?: string
          session_id?: string
          start_time?: string
          user_id?: string
        }
        Relationships: []
      }
      running_stats: {
        Row: {
          best_pace_min_per_km: number | null
          challenges: Json
          created_at: string
          current_streak: number
          goals: Json
          id: string
          longest_run_km: number
          total_distance_km: number
          total_duration_seconds: number
          total_sessions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_pace_min_per_km?: number | null
          challenges?: Json
          created_at?: string
          current_streak?: number
          goals?: Json
          id?: string
          longest_run_km?: number
          total_distance_km?: number
          total_duration_seconds?: number
          total_sessions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_pace_min_per_km?: number | null
          challenges?: Json
          created_at?: string
          current_streak?: number
          goals?: Json
          id?: string
          longest_run_km?: number
          total_distance_km?: number
          total_duration_seconds?: number
          total_sessions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
