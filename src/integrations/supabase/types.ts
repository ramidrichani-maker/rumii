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
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_design_variants: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          design_id: string
          height: number | null
          id: string
          job_id: string | null
          media_url: string | null
          mime_type: string | null
          palette: string | null
          property_id: string | null
          storage_path: string | null
          style: string | null
          width: number | null
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          design_id: string
          height?: number | null
          id?: string
          job_id?: string | null
          media_url?: string | null
          mime_type?: string | null
          palette?: string | null
          property_id?: string | null
          storage_path?: string | null
          style?: string | null
          width?: number | null
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          design_id?: string
          height?: number | null
          id?: string
          job_id?: string | null
          media_url?: string | null
          mime_type?: string | null
          palette?: string | null
          property_id?: string | null
          storage_path?: string | null
          style?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_design_variants_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "ai_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_design_variants_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "property_ai_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_designs: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          key: string
          metadata: Json | null
          name: string
          palettes: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          key: string
          metadata?: Json | null
          name: string
          palettes?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          key?: string
          metadata?: Json | null
          name?: string
          palettes?: string[] | null
          updated_at?: string | null
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
          {
            foreignKeyName: "broker_agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
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
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_requests: {
        Row: {
          admin_notes: string | null
          agency_id: string | null
          created_at: string
          id: string
          property_id: string
          requested_by: string
          requested_days: number
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          agency_id?: string | null
          created_at?: string
          id?: string
          property_id: string
          requested_by: string
          requested_days?: number
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          agency_id?: string | null
          created_at?: string
          id?: string
          property_id?: string
          requested_by?: string
          requested_days?: number
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
          {
            foreignKeyName: "featured_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          recipient_user_id: string
          related_property_id: string | null
          related_viewing_id: string | null
          sender_user_id: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_user_id: string
          related_property_id?: string | null
          related_viewing_id?: string | null
          sender_user_id: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_user_id?: string
          related_property_id?: string | null
          related_viewing_id?: string | null
          sender_user_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_related_property_id_fkey"
            columns: ["related_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_related_property_id_fkey"
            columns: ["related_property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_related_viewing_id_fkey"
            columns: ["related_viewing_id"]
            isOneToOne: false
            referencedRelation: "property_viewings"
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
      platform_reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          review_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
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
          apartments_count: number | null
          bathrooms: number
          bedrooms: number
          city: string
          created_at: string
          description: string | null
          featured_section: string | null
          floor_plan_url: string | null
          floor_plan_urls: string[]
          floors: number | null
          id: string
          images: string[] | null
          last_renovated: number | null
          latitude: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude: number | null
          municipality: string | null
          parent_property_id: string | null
          price: number | null
          price_negotiable: boolean | null
          property_code: number
          property_type: Database["public"]["Enums"]["property_type"]
          rental_price: number | null
          square_meters: number
          status: Database["public"]["Enums"]["property_status"]
          unfurnished: boolean
          updated_at: string
          user_id: string
          year_built: number | null
        }
        Insert: {
          address: string
          agency_id?: string | null
          amenities?: string[] | null
          apartments_count?: number | null
          bathrooms: number
          bedrooms: number
          city: string
          created_at?: string
          description?: string | null
          featured_section?: string | null
          floor_plan_url?: string | null
          floor_plan_urls?: string[]
          floors?: number | null
          id?: string
          images?: string[] | null
          last_renovated?: number | null
          latitude?: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          municipality?: string | null
          parent_property_id?: string | null
          price?: number | null
          price_negotiable?: boolean | null
          property_code?: number
          property_type: Database["public"]["Enums"]["property_type"]
          rental_price?: number | null
          square_meters: number
          status?: Database["public"]["Enums"]["property_status"]
          unfurnished?: boolean
          updated_at?: string
          user_id: string
          year_built?: number | null
        }
        Update: {
          address?: string
          agency_id?: string | null
          amenities?: string[] | null
          apartments_count?: number | null
          bathrooms?: number
          bedrooms?: number
          city?: string
          created_at?: string
          description?: string | null
          featured_section?: string | null
          floor_plan_url?: string | null
          floor_plan_urls?: string[]
          floors?: number | null
          id?: string
          images?: string[] | null
          last_renovated?: number | null
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          municipality?: string | null
          parent_property_id?: string | null
          price?: number | null
          price_negotiable?: boolean | null
          property_code?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          rental_price?: number | null
          square_meters?: number
          status?: Database["public"]["Enums"]["property_status"]
          unfurnished?: boolean
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
          {
            foreignKeyName: "properties_parent_property_id_fkey"
            columns: ["parent_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_parent_property_id_fkey"
            columns: ["parent_property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
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
          {
            foreignKeyName: "property_agents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      property_ai_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          original_media_url: string
          palette: string
          property_id: string
          replicate_output_urls: string[] | null
          replicate_run_id: string | null
          requestor_user_id: string | null
          status: string
          style: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          original_media_url: string
          palette: string
          property_id: string
          replicate_output_urls?: string[] | null
          replicate_run_id?: string | null
          requestor_user_id?: string | null
          status?: string
          style: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          original_media_url?: string
          palette?: string
          property_id?: string
          replicate_output_urls?: string[] | null
          replicate_run_id?: string | null
          requestor_user_id?: string | null
          status?: string
          style?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_ai_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_ai_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      property_enquiries: {
        Row: {
          agency_id: string | null
          agent_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          phone_number: string
          property_id: string
          sender_user_id: string | null
          wants_viewing: boolean
        }
        Insert: {
          agency_id?: string | null
          agent_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone_number: string
          property_id: string
          sender_user_id?: string | null
          wants_viewing?: boolean
        }
        Update: {
          agency_id?: string | null
          agent_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone_number?: string
          property_id?: string
          sender_user_id?: string | null
          wants_viewing?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "property_enquiries_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_enquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_enquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
      property_generated_images: {
        Row: {
          approved: boolean
          created_at: string
          created_by: string | null
          height: number | null
          id: string
          job_id: string | null
          media_url: string | null
          mime_type: string | null
          palette: string | null
          property_id: string
          room_type: string | null
          storage_path: string
          style: string | null
          width: number | null
        }
        Insert: {
          approved?: boolean
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          job_id?: string | null
          media_url?: string | null
          mime_type?: string | null
          palette?: string | null
          property_id: string
          room_type?: string | null
          storage_path: string
          style?: string | null
          width?: number | null
        }
        Update: {
          approved?: boolean
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          job_id?: string | null
          media_url?: string | null
          mime_type?: string | null
          palette?: string | null
          property_id?: string
          room_type?: string | null
          storage_path?: string
          style?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_generated_images_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "property_ai_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_generated_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_generated_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
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
          {
            foreignKeyName: "property_media_pending_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
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
            foreignKeyName: "property_viewings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
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
      saved_search_areas: {
        Row: {
          coordinates: Json
          created_at: string
          id: string
          name: string
          page: string
          user_id: string
        }
        Insert: {
          coordinates: Json
          created_at?: string
          id?: string
          name?: string
          page?: string
          user_id: string
        }
        Update: {
          coordinates?: Json
          created_at?: string
          id?: string
          name?: string
          page?: string
          user_id?: string
        }
        Relationships: []
      }
      service_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          agent_id: string | null
          created_at: string
          ended_at: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          ended_at?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ratings: {
        Row: {
          agent_id: string
          conversation_id: string
          created_at: string
          id: string
          rating: number
          rating_reasons: string[] | null
          review_text: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          conversation_id: string
          created_at?: string
          id?: string
          rating: number
          rating_reasons?: string[] | null
          review_text?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          rating?: number
          rating_reasons?: string[] | null
          review_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ratings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
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
      valuation_requests: {
        Row: {
          additional_notes: string | null
          admin_notes: string | null
          assigned_agent_id: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          created_at: string
          email: string
          full_name: string
          id: string
          municipality: string | null
          phone_number: string
          preferred_date: string
          preferred_time: string
          property_address: string
          property_type: string
          square_meters: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_notes?: string | null
          admin_notes?: string | null
          assigned_agent_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          municipality?: string | null
          phone_number: string
          preferred_date: string
          preferred_time: string
          property_address: string
          property_type: string
          square_meters?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_notes?: string | null
          admin_notes?: string | null
          assigned_agent_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          municipality?: string | null
          phone_number?: string
          preferred_date?: string
          preferred_time?: string
          property_address?: string
          property_type?: string
          square_meters?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      properties_public: {
        Row: {
          address: string | null
          agency_id: string | null
          amenities: string[] | null
          apartments_count: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string | null
          description: string | null
          featured_section: string | null
          floor_plan_url: string | null
          floor_plan_urls: string[] | null
          floors: number | null
          id: string | null
          images: string[] | null
          last_renovated: number | null
          latitude: number | null
          listing_type: Database["public"]["Enums"]["listing_type"] | null
          longitude: number | null
          municipality: string | null
          parent_property_id: string | null
          price: number | null
          price_negotiable: boolean | null
          property_code: number | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          rental_price: number | null
          square_meters: number | null
          status: Database["public"]["Enums"]["property_status"] | null
          unfurnished: boolean | null
          updated_at: string | null
          user_id: string | null
          year_built: number | null
        }
        Insert: {
          address?: string | null
          agency_id?: string | null
          amenities?: string[] | null
          apartments_count?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          featured_section?: string | null
          floor_plan_url?: string | null
          floor_plan_urls?: string[] | null
          floors?: number | null
          id?: string | null
          images?: string[] | null
          last_renovated?: number | null
          latitude?: never
          listing_type?: Database["public"]["Enums"]["listing_type"] | null
          longitude?: never
          municipality?: string | null
          parent_property_id?: string | null
          price?: number | null
          price_negotiable?: boolean | null
          property_code?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          rental_price?: number | null
          square_meters?: number | null
          status?: Database["public"]["Enums"]["property_status"] | null
          unfurnished?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          year_built?: number | null
        }
        Update: {
          address?: string | null
          agency_id?: string | null
          amenities?: string[] | null
          apartments_count?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          featured_section?: string | null
          floor_plan_url?: string | null
          floor_plan_urls?: string[] | null
          floors?: number | null
          id?: string | null
          images?: string[] | null
          last_renovated?: number | null
          latitude?: never
          listing_type?: Database["public"]["Enums"]["listing_type"] | null
          longitude?: never
          municipality?: string | null
          parent_property_id?: string | null
          price?: number | null
          price_negotiable?: boolean | null
          property_code?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          rental_price?: number | null
          square_meters?: number | null
          status?: Database["public"]["Enums"]["property_status"] | null
          unfurnished?: boolean | null
          updated_at?: string | null
          user_id?: string | null
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
          {
            foreignKeyName: "properties_parent_property_id_fkey"
            columns: ["parent_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_parent_property_id_fkey"
            columns: ["parent_property_id"]
            isOneToOne: false
            referencedRelation: "properties_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aggregate_stacked_unit_parent: {
        Args: { _parent_id: string }
        Returns: undefined
      }
      approve_property_media: { Args: { media_id: string }; Returns: boolean }
      cleanup_old_support_conversations: { Args: never; Returns: number }
      delete_user_account: {
        Args: { _admin_id: string; _user_id: string }
        Returns: boolean
      }
      end_user_session: { Args: { _user_id: string }; Returns: boolean }
      get_admin_user_ids: { Args: never; Returns: string[] }
      get_agent_by_email: {
        Args: { _email: string }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      get_my_agency_id: { Args: never; Returns: string }
      get_new_users_analytics: {
        Args: { days_back?: number; period_type?: string }
        Returns: {
          count: number
          period: string
        }[]
      }
      get_property_coords: {
        Args: { _property_id: string }
        Returns: {
          latitude: number
          longitude: number
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
      get_user_role:
        | { Args: never; Returns: string }
        | {
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
      is_agency_manager: { Args: { _user_id: string }; Returns: boolean }
      is_assigned_agent: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      jitter_coord: {
        Args: { _axis: string; _base: number; _seed: string }
        Returns: number
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
      listing_type: "rent" | "sale" | "both"
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
        | "beach house"
        | "chalet"
        | "triplex"
        | "commercial"
        | "farm house"
        | "building"
        | "venue"
        | "rooftop"
        | "land"
        | "stacked_unit"
      user_role:
        | "user"
        | "agent"
        | "admin"
        | "agency_manager"
        | "customer_support"
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
      listing_type: ["rent", "sale", "both"],
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
        "beach house",
        "chalet",
        "triplex",
        "commercial",
        "farm house",
        "building",
        "venue",
        "rooftop",
        "land",
        "stacked_unit",
      ],
      user_role: [
        "user",
        "agent",
        "admin",
        "agency_manager",
        "customer_support",
      ],
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
