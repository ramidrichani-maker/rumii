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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      broker_agreements: {
        Row: {
          agreed_at: string
          agreement_text: string
          created_at: string
          email: string
          full_name: string
          id: string
          ip_address: string | null
          property_id: string | null
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          agreed_at?: string
          agreement_text: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          ip_address?: string | null
          property_id?: string | null
          terms_version?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          agreed_at?: string
          agreement_text?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          ip_address?: string | null
          property_id?: string | null
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_requests: {
        Row: {
          admin_notes: string | null
          agency_id: string
          created_at: string
          id: string
          property_id: string
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          agency_id: string
          created_at?: string
          id?: string
          property_id: string
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          agency_id?: string
          created_at?: string
          id?: string
          property_id?: string
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_requests_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      photography_requests: {
        Row: {
          admin_notes: string | null
          assigned_agent_id: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          created_at: string
          email: string
          full_name: string
          full_service_listing: boolean
          id: string
          municipality: string | null
          phone_number: string
          preferred_date: string | null
          preferred_time: string | null
          property_address: string
          property_size_sqm: number | null
          property_type: string
          special_requirements: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_agent_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          created_at?: string
          email: string
          full_name: string
          full_service_listing?: boolean
          id?: string
          municipality?: string | null
          phone_number: string
          preferred_date?: string | null
          preferred_time?: string | null
          property_address: string
          property_size_sqm?: number | null
          property_type: string
          special_requirements?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          assigned_agent_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          created_at?: string
          email?: string
          full_name?: string
          full_service_listing?: boolean
          id?: string
          municipality?: string | null
          phone_number?: string
          preferred_date?: string | null
          preferred_time?: string | null
          property_address?: string
          property_size_sqm?: number | null
          property_type?: string
          special_requirements?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agency_id: string | null
          created_at: string
          full_name: string
          id: string
          phone_number: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone_number: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone_number?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          agency_id: string | null
          amenities: string[] | null
          bathrooms: number
          bedrooms: number
          city: string
          created_at: string
          featured_section: string | null
          id: string
          images: string[] | null
          last_renovated: number | null
          latitude: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude: number | null
          municipality: string | null
          price: number | null
          price_negotiable: boolean | null
          property_code: number
          property_type: Database["public"]["Enums"]["property_type"]
          square_meters: number
          status: Database["public"]["Enums"]["property_status"]
          updated_at: string
          user_id: string
          year_built: number | null
        }
        Insert: {
          address: string
          agency_id?: string | null
          amenities?: string[] | null
          bathrooms: number
          bedrooms: number
          city: string
          created_at?: string
          featured_section?: string | null
          id?: string
          images?: string[] | null
          last_renovated?: number | null
          latitude?: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          municipality?: string | null
          price?: number | null
          price_negotiable?: boolean | null
          property_code?: number
          property_type: Database["public"]["Enums"]["property_type"]
          square_meters: number
          status?: Database["public"]["Enums"]["property_status"]
          updated_at?: string
          user_id: string
          year_built?: number | null
        }
        Update: {
          address?: string
          agency_id?: string | null
          amenities?: string[] | null
          bathrooms?: number
          bedrooms?: number
          city?: string
          created_at?: string
          featured_section?: string | null
          id?: string
          images?: string[] | null
          last_renovated?: number | null
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          municipality?: string | null
          price?: number | null
          price_negotiable?: boolean | null
          property_code?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          square_meters?: number
          status?: Database["public"]["Enums"]["property_status"]
          updated_at?: string
          user_id?: string
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      property_agents: {
        Row: {
          agent_id: string
          assigned_at: string
          id: string
          property_id: string
        }
        Insert: {
          agent_id: string
          assigned_at?: string
          id?: string
          property_id: string
        }
        Update: {
          agent_id?: string
          assigned_at?: string
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "property_agents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media_pending: {
        Row: {
          created_at: string | null
          id: string
          media_type: string
          media_url: string
          property_id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_type: string
          media_url: string
          property_id: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          media_type?: string
          media_url?: string
          property_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_media_pending_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_viewings: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          notes: string | null
          property_id: string
          status: Database["public"]["Enums"]["viewing_status"]
          updated_at: string
          user_id: string
          viewing_date: string
          viewing_time: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["viewing_status"]
          updated_at?: string
          user_id: string
          viewing_date: string
          viewing_time: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["viewing_status"]
          updated_at?: string
          user_id?: string
          viewing_date?: string
          viewing_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_viewings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "property_viewings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_viewings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          id: string
          ip_address: string | null
          session_end: string | null
          session_start: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          session_end?: string | null
          session_start?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_property_media: { Args: { media_id: string }; Returns: boolean }
      delete_user_account: {
        Args: { _admin_id: string; _user_id: string }
        Returns: boolean
      }
      end_user_session: { Args: { _user_id: string }; Returns: boolean }
      get_new_users_analytics: {
        Args: { days_back?: number; period_type?: string }
        Returns: {
          count: number
          period: string
        }[]
      }
      get_session_analytics: {
        Args: { days_back?: number; period_type?: string }
        Returns: {
          avg_duration_minutes: number
          period: string
          session_count: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      start_user_session: {
        Args: { _ip_address?: string; _user_agent?: string; _user_id: string }
        Returns: string
      }
      update_user_role: {
        Args: {
          _admin_id: string
          _new_role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      listing_type: "rent" | "sale"
      property_status: "pending" | "approved" | "rejected"
      property_type:
        | "apartment"
        | "house"
        | "studio"
        | "villa"
        | "penthouse"
        | "townhouse"
        | "duplex"
        | "loft"
      user_role: "user" | "agent" | "admin" | "agency_manager"
      viewing_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "successful"
        | "interested"
        | "uninterested"
        | "closed"
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
    Enums: {
      listing_type: ["rent", "sale"],
      property_status: ["pending", "approved", "rejected"],
      property_type: [
        "apartment",
        "house",
        "studio",
        "villa",
        "penthouse",
        "townhouse",
        "duplex",
        "loft",
      ],
      user_role: ["user", "agent", "admin", "agency_manager"],
      viewing_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "successful",
        "interested",
        "uninterested",
        "closed",
      ],
    },
  },
} as const
