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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      baseline_cache: {
        Row: {
          baseline_phase: string | null
          computed_at: string | null
          consecutive_streak: number | null
          hrv_10d_mean_ln: number | null
          hrv_60d_mean_ln: number | null
          hrv_60d_std_ln: number | null
          hrv_7d_mean_ln: number | null
          sleep_30d_mean: number | null
          sleep_30d_std: number | null
          total_entries: number | null
          user_id: string
        }
        Insert: {
          baseline_phase?: string | null
          computed_at?: string | null
          consecutive_streak?: number | null
          hrv_10d_mean_ln?: number | null
          hrv_60d_mean_ln?: number | null
          hrv_60d_std_ln?: number | null
          hrv_7d_mean_ln?: number | null
          sleep_30d_mean?: number | null
          sleep_30d_std?: number | null
          total_entries?: number | null
          user_id: string
        }
        Update: {
          baseline_phase?: string | null
          computed_at?: string | null
          consecutive_streak?: number | null
          hrv_10d_mean_ln?: number | null
          hrv_60d_mean_ln?: number | null
          hrv_60d_std_ln?: number | null
          hrv_7d_mean_ln?: number | null
          sleep_30d_mean?: number | null
          sleep_30d_std?: number | null
          total_entries?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "baseline_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_tags: {
        Row: {
          checkin_id: string
          tag_id: string
        }
        Insert: {
          checkin_id: string
          tag_id: string
        }
        Update: {
          checkin_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_tags_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          baseline_phase: string | null
          created_at: string | null
          entry_date: string
          feeling: number | null
          hrv_rmssd: number | null
          hrv_score: number | null
          hrv_weight_applied: number | null
          id: string
          is_backdated: boolean | null
          lowest_factor: string | null
          notes: string | null
          recovery_score: number | null
          sentiment_label: string | null
          sentiment_score: number | null
          sleep_hours: number | null
          sleep_score: number | null
          soreness: number | null
          soreness_score: number | null
          source_hrv: string | null
          source_sleep: string | null
          sport: string | null
          trained_yesterday: boolean | null
          training_duration_min: number | null
          training_intensity: number | null
          training_recommendation: string | null
          updated_at: string | null
          user_id: string | null
          wellbeing_score: number | null
        }
        Insert: {
          baseline_phase?: string | null
          created_at?: string | null
          entry_date: string
          feeling?: number | null
          hrv_rmssd?: number | null
          hrv_score?: number | null
          hrv_weight_applied?: number | null
          id?: string
          is_backdated?: boolean | null
          lowest_factor?: string | null
          notes?: string | null
          recovery_score?: number | null
          sentiment_label?: string | null
          sentiment_score?: number | null
          sleep_hours?: number | null
          sleep_score?: number | null
          soreness?: number | null
          soreness_score?: number | null
          source_hrv?: string | null
          source_sleep?: string | null
          sport?: string | null
          trained_yesterday?: boolean | null
          training_duration_min?: number | null
          training_intensity?: number | null
          training_recommendation?: string | null
          updated_at?: string | null
          user_id?: string | null
          wellbeing_score?: number | null
        }
        Update: {
          baseline_phase?: string | null
          created_at?: string | null
          entry_date?: string
          feeling?: number | null
          hrv_rmssd?: number | null
          hrv_score?: number | null
          hrv_weight_applied?: number | null
          id?: string
          is_backdated?: boolean | null
          lowest_factor?: string | null
          notes?: string | null
          recovery_score?: number | null
          sentiment_label?: string | null
          sentiment_score?: number | null
          sleep_hours?: number | null
          sleep_score?: number | null
          soreness?: number | null
          soreness_score?: number | null
          source_hrv?: string | null
          source_sleep?: string | null
          sport?: string | null
          trained_yesterday?: boolean | null
          training_duration_min?: number | null
          training_intensity?: number | null
          training_recommendation?: string | null
          updated_at?: string | null
          user_id?: string | null
          wellbeing_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          longest_streak: number | null
          sport_type: string | null
          streak_count: number | null
          timezone: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          longest_streak?: number | null
          sport_type?: string | null
          streak_count?: number | null
          timezone?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          longest_streak?: number | null
          sport_type?: string | null
          streak_count?: number | null
          timezone?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_preset: boolean | null
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_preset?: boolean | null
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_preset?: boolean | null
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
