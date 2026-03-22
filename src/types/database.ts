// src/types/database.ts
// Tipos TypeScript que espelham o schema do Supabase

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          avatar_url: string | null
          timezone: string
          google_access_token: string | null
          google_refresh_token: string | null
          google_token_expiry: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: 'work' | 'personal' | 'gym' | 'study' | 'urgent'
          priority: 'high' | 'medium' | 'low'
          status: 'todo' | 'doing' | 'done'
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
      }
      events: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: string
          event_date: string
          start_time: string | null
          end_time: string | null
          recurrence: string
          gcal_event_id: string | null
          gcal_calendar_id: string | null
          source: 'local' | 'gcal'
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      habits: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          color: string
          sort_order: number
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['habits']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['habits']['Insert']>
      }
      habit_logs: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          log_date: string
          completed: boolean
        }
        Insert: Omit<Database['public']['Tables']['habit_logs']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['habit_logs']['Insert']>
      }
      exercises: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          muscle_group: string | null
          day_of_week: number
          sets: number
          reps: number
          weight_kg: number
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['exercises']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['exercises']['Insert']>
      }
      workout_sets: {
        Row: {
          id: string
          exercise_id: string
          user_id: string
          workout_date: string
          set_number: number
          reps_done: number | null
          weight_done: number | null
          completed: boolean
        }
        Insert: Omit<Database['public']['Tables']['workout_sets']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['workout_sets']['Insert']>
      }
      personal_records: {
        Row: {
          id: string
          user_id: string
          exercise_name: string
          weight_kg: number
          reps: number | null
          recorded_at: string
        }
        Insert: Omit<Database['public']['Tables']['personal_records']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['personal_records']['Insert']>
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          client: string | null
          description: string | null
          color: string
          tags: string[]
          progress: number
          status: 'active' | 'paused' | 'done' | 'archived'
          deadline: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string | null
          tag: string
          pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['notes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['notes']['Insert']>
      }
      health_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          water_ml: number
          water_goal: number
          sleep_hours: number | null
          steps: number
          mood: string | null
          mood_label: string | null
          energy: number | null
          stress: number | null
          motivation: number | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['health_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['health_logs']['Insert']>
      }
      focus_sessions: {
        Row: {
          id: string
          user_id: string
          task_id: string | null
          task_label: string | null
          mode: 'focus' | 'short' | 'long'
          duration_min: number
          completed: boolean
          started_at: string
          ended_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['focus_sessions']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['focus_sessions']['Insert']>
      }
    }
  }
}

// Tipos derivados para uso nos componentes
export type Task         = Database['public']['Tables']['tasks']['Row']
export type Event        = Database['public']['Tables']['events']['Row']
export type Habit        = Database['public']['Tables']['habits']['Row']
export type HabitLog     = Database['public']['Tables']['habit_logs']['Row']
export type Exercise     = Database['public']['Tables']['exercises']['Row']
export type WorkoutSet   = Database['public']['Tables']['workout_sets']['Row']
export type Project      = Database['public']['Tables']['projects']['Row']
export type Note         = Database['public']['Tables']['notes']['Row']
export type HealthLog    = Database['public']['Tables']['health_logs']['Row']
export type FocusSession = Database['public']['Tables']['focus_sessions']['Row']
export type Profile      = Database['public']['Tables']['profiles']['Row']
