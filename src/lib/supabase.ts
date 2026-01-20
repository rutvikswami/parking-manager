import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - using placeholder values')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      parking_locations: {
        Row: {
          id: string
          name: string
          address: string
          lat: number
          lng: number
          owner_user_id: string
          total_zones: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          lat: number
          lng: number
          owner_user_id: string
          total_zones?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          lat?: number
          lng?: number
          owner_user_id?: string
          total_zones?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      parking_zones: {
        Row: {
          id: string
          location_id: string
          name: string
          zone_number: number
          lat: number
          lng: number
          total_slots: number
          available_slots: number
          is_full: boolean
          status: 'available' | 'full' | 'maintenance'
          cost_per_hour: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location_id: string
          name: string
          zone_number: number
          lat: number
          lng: number
          total_slots: number
          available_slots?: number
          is_full?: boolean
          status?: 'available' | 'full' | 'maintenance'
          cost_per_hour?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          location_id?: string
          name?: string
          zone_number?: number
          lat?: number
          lng?: number
          total_slots?: number
          available_slots?: number
          is_full?: boolean
          status?: 'available' | 'full' | 'maintenance'
          cost_per_hour?: number
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          user_role: 'user' | 'location_owner' | 'super_admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          user_role?: 'user' | 'location_owner' | 'super_admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          user_role?: 'user' | 'location_owner' | 'super_admin'
          created_at?: string
          updated_at?: string
        }
      }
      owner_applications: {
        Row: {
          id: string
          user_id: string
          contact_person: string
          phone: string
          email: string
          justification: string
          status: 'pending' | 'approved' | 'rejected'
          reviewed_by: string | null
          reviewed_at: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          contact_person: string
          phone: string
          email: string
          justification: string
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          contact_person?: string
          phone?: string
          email?: string
          justification?: string
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_by?: string | null
          reviewed_at?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      process_owner_application: {
        Args: { p_application_id: string; p_approve: boolean; p_admin_notes?: string }
        Returns: boolean
      }
      update_zone_status: {
        Args: { zone_id: string; new_available_slots: number }
        Returns: boolean
      }
    }
  }
}
