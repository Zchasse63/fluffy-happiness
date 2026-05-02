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
      activity_log: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          payload: Json
          studio_id: string
          subject_id: string | null
          subject_type: string | null
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          studio_id: string
          subject_id?: string | null
          subject_type?: string | null
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          studio_id?: string
          subject_id?: string | null
          subject_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_briefings: {
        Row: {
          date: string
          generated_at: string
          id: string
          insights: Json
          model: string | null
          studio_id: string
        }
        Insert: {
          date: string
          generated_at?: string
          id?: string
          insights: Json
          model?: string | null
          studio_id: string
        }
        Update: {
          date?: string
          generated_at?: string
          id?: string
          insights?: Json
          model?: string | null
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_briefings_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          payload: Json
          studio_id: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          payload: Json
          studio_id: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          payload?: Json
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_cache_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          body: string | null
          category: string
          confidence: number
          data: Json
          expires_at: string | null
          generated_at: string
          headline: string
          href: string | null
          id: string
          kicker: string
          rank: string
          status: string
          studio_id: string
          tone: string
        }
        Insert: {
          body?: string | null
          category: string
          confidence?: number
          data?: Json
          expires_at?: string | null
          generated_at?: string
          headline: string
          href?: string | null
          id?: string
          kicker: string
          rank: string
          status?: string
          studio_id: string
          tone: string
        }
        Update: {
          body?: string | null
          category?: string
          confidence?: number
          data?: Json
          expires_at?: string | null
          generated_at?: string
          headline?: string
          href?: string | null
          id?: string
          kicker?: string
          rank?: string
          status?: string
          studio_id?: string
          tone?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_enrollments: {
        Row: {
          completed_at: string | null
          current_step: number
          enrolled_at: string
          exit_reason: string | null
          flow_id: string
          id: string
          member_id: string | null
          state: Json
          status: string
          studio_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: number
          enrolled_at?: string
          exit_reason?: string | null
          flow_id: string
          id?: string
          member_id?: string | null
          state?: Json
          status?: string
          studio_id: string
        }
        Update: {
          completed_at?: string | null
          current_step?: number
          enrolled_at?: string
          exit_reason?: string | null
          flow_id?: string
          id?: string
          member_id?: string | null
          state?: Json
          status?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_enrollments_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_enrollments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_enrollments_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_flows: {
        Row: {
          cooldown_days: number
          created_at: string
          created_by: string | null
          exit_conditions: Json
          id: string
          name: string
          status: string
          steps: Json
          studio_id: string
          trigger: string
          updated_at: string
        }
        Insert: {
          cooldown_days?: number
          created_at?: string
          created_by?: string | null
          exit_conditions?: Json
          id?: string
          name: string
          status?: string
          steps?: Json
          studio_id: string
          trigger: string
          updated_at?: string
        }
        Update: {
          cooldown_days?: number
          created_at?: string
          created_by?: string | null
          exit_conditions?: Json
          id?: string
          name?: string
          status?: string
          steps?: Json
          studio_id?: string
          trigger?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_flows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_flows_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          cancelled_at: string | null
          cancelled_reason: string | null
          checked_in_at: string | null
          class_instance_id: string
          created_at: string
          credit_type_used: string | null
          glofox_id: string | null
          glofox_synced_at: string | null
          glofox_write_status: string
          guest_email: string | null
          guest_name: string | null
          id: string
          member_id: string | null
          source: string
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          checked_in_at?: string | null
          class_instance_id: string
          created_at?: string
          credit_type_used?: string | null
          glofox_id?: string | null
          glofox_synced_at?: string | null
          glofox_write_status?: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          member_id?: string | null
          source?: string
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          checked_in_at?: string | null
          class_instance_id?: string
          created_at?: string
          credit_type_used?: string | null
          glofox_id?: string | null
          glofox_synced_at?: string | null
          glofox_write_status?: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          member_id?: string | null
          source?: string
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_class_instance_id_fkey"
            columns: ["class_instance_id"]
            isOneToOne: false
            referencedRelation: "class_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          created_at: string
          email: string
          id: string
          member_id: string | null
          opened_at: string | null
          resend_message_id: string | null
          sent_at: string | null
          status: string
          studio_id: string
          variant: string | null
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          email: string
          id?: string
          member_id?: string | null
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          studio_id: string
          variant?: string | null
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          email?: string
          id?: string
          member_id?: string | null
          opened_at?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          studio_id?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ab_variants: Json | null
          body_html: string | null
          body_text: string | null
          bounce_count: number
          channel: string
          click_count: number
          conversion_count: number
          created_at: string
          created_by: string | null
          id: string
          name: string
          open_count: number
          recipient_count: number
          scheduled_for: string | null
          segment_id: string | null
          sent_at: string | null
          sent_count: number
          sms_body: string | null
          status: string
          studio_id: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          ab_variants?: Json | null
          body_html?: string | null
          body_text?: string | null
          bounce_count?: number
          channel?: string
          click_count?: number
          conversion_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          open_count?: number
          recipient_count?: number
          scheduled_for?: string | null
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number
          sms_body?: string | null
          status?: string
          studio_id: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          ab_variants?: Json | null
          body_html?: string | null
          body_text?: string | null
          bounce_count?: number
          channel?: string
          click_count?: number
          conversion_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          open_count?: number
          recipient_count?: number
          scheduled_for?: string | null
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number
          sms_body?: string | null
          status?: string
          studio_id?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      class_instances: {
        Row: {
          booked_count: number
          capacity: number
          created_at: string
          ends_at: string
          glofox_id: string | null
          id: string
          is_one_off: boolean
          location_id: string | null
          notes: string | null
          program_id: string | null
          starts_at: string
          status: string
          studio_id: string
          template_id: string | null
          title: string
          trainer_id: string | null
          updated_at: string
          waitlist_count: number
        }
        Insert: {
          booked_count?: number
          capacity?: number
          created_at?: string
          ends_at: string
          glofox_id?: string | null
          id?: string
          is_one_off?: boolean
          location_id?: string | null
          notes?: string | null
          program_id?: string | null
          starts_at: string
          status?: string
          studio_id: string
          template_id?: string | null
          title: string
          trainer_id?: string | null
          updated_at?: string
          waitlist_count?: number
        }
        Update: {
          booked_count?: number
          capacity?: number
          created_at?: string
          ends_at?: string
          glofox_id?: string | null
          id?: string
          is_one_off?: boolean
          location_id?: string | null
          notes?: string | null
          program_id?: string | null
          starts_at?: string
          status?: string
          studio_id?: string
          template_id?: string | null
          title?: string
          trainer_id?: string | null
          updated_at?: string
          waitlist_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_instances_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_instances_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_instances_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "class_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_instances_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      class_templates: {
        Row: {
          capacity: number
          created_at: string
          duration_min: number
          glofox_id: string | null
          id: string
          is_active: boolean
          location_id: string | null
          program_id: string | null
          recurrence_days: number[]
          start_time: string | null
          studio_id: string
          title: string
          trainer_id: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          duration_min?: number
          glofox_id?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          program_id?: string | null
          recurrence_days?: number[]
          start_time?: string | null
          studio_id: string
          title: string
          trainer_id?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          duration_min?: number
          glofox_id?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          program_id?: string | null
          recurrence_days?: number[]
          start_time?: string | null
          studio_id?: string
          title?: string
          trainer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_templates_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_templates_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      content_posts: {
        Row: {
          body: string | null
          channel: string
          clicks: number
          created_at: string
          created_by: string | null
          id: string
          impressions: number
          published_at: string | null
          reactions: number
          saves: number
          studio_id: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          clicks?: number
          created_at?: string
          created_by?: string | null
          id?: string
          impressions?: number
          published_at?: string | null
          reactions?: number
          saves?: number
          studio_id: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          clicks?: number
          created_at?: string
          created_by?: string | null
          id?: string
          impressions?: number
          published_at?: string | null
          reactions?: number
          saves?: number
          studio_id?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      corporate_accounts: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          monthly_fee_cents: number
          name: string
          notes: string | null
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_fee_cents?: number
          name: string
          notes?: string | null
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_fee_cents?: number
          name?: string
          notes?: string | null
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corporate_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corporate_accounts_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          balance_after: number
          booking_id: string | null
          created_at: string
          created_by: string | null
          credit_type: string
          delta: number
          id: string
          member_id: string
          reason: string
          studio_id: string
          transaction_id: string | null
        }
        Insert: {
          balance_after: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_type: string
          delta: number
          id?: string
          member_id: string
          reason: string
          studio_id: string
          transaction_id?: string | null
        }
        Update: {
          balance_after?: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_type?: string
          delta?: number
          id?: string
          member_id?: string
          reason?: string
          studio_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packs: {
        Row: {
          created_at: string
          credits_remaining: number
          credits_total: number
          expires_at: string | null
          glofox_id: string | null
          id: string
          member_id: string
          pack_type: string
          purchased_at: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_remaining: number
          credits_total: number
          expires_at?: string | null
          glofox_id?: string | null
          id?: string
          member_id: string
          pack_type: string
          purchased_at?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_remaining?: number
          credits_total?: number
          expires_at?: string | null
          glofox_id?: string | null
          id?: string
          member_id?: string
          pack_type?: string
          purchased_at?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_packs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_packs_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_maintenance: {
        Row: {
          created_at: string
          id: string
          kind: string
          next_service_at: string | null
          notes: string | null
          performed_at: string
          performed_by: string | null
          resource_id: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          next_service_at?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          resource_id: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          next_service_at?: string | null
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          resource_id?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_maintenance_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_maintenance_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "facility_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_maintenance_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      facility_resources: {
        Row: {
          capacity: number
          category: string
          created_at: string
          id: string
          location_id: string | null
          name: string
          notes: string | null
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          category?: string
          created_at?: string
          id?: string
          location_id?: string | null
          name: string
          notes?: string | null
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          category?: string
          created_at?: string
          id?: string
          location_id?: string | null
          name?: string
          notes?: string | null
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_resources_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facility_resources_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          amount_cents: number
          balance_cents: number
          code: string
          created_at: string
          expires_at: string | null
          id: string
          issued_at: string
          issued_by: string | null
          recipient_email: string | null
          recipient_name: string | null
          redeemed_by_member: string | null
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          balance_cents: number
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_by_member?: string | null
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          balance_cents?: number
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_by_member?: string | null
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_redeemed_by_member_fkey"
            columns: ["redeemed_by_member"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      glofox_sync_conflicts: {
        Row: {
          conflict_type: string
          created_at: string
          entity_type: string
          glofox_data: Json | null
          id: string
          meridian_data: Json | null
          resolution: string | null
          resolved_at: string | null
          studio_id: string
        }
        Insert: {
          conflict_type: string
          created_at?: string
          entity_type: string
          glofox_data?: Json | null
          id?: string
          meridian_data?: Json | null
          resolution?: string | null
          resolved_at?: string | null
          studio_id: string
        }
        Update: {
          conflict_type?: string
          created_at?: string
          entity_type?: string
          glofox_data?: Json | null
          id?: string
          meridian_data?: Json | null
          resolution?: string | null
          resolved_at?: string | null
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "glofox_sync_conflicts_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      glofox_sync_state: {
        Row: {
          entity_type: string
          error_message: string | null
          last_full_sync_at: string | null
          last_synced_at: string | null
          records_synced: number
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          entity_type: string
          error_message?: string | null
          last_full_sync_at?: string | null
          last_synced_at?: string | null
          records_synced?: number
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          entity_type?: string
          error_message?: string | null
          last_full_sync_at?: string | null
          last_synced_at?: string | null
          records_synced?: number
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "glofox_sync_state_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_cache: {
        Row: {
          bucket: string
          computed_at: string
          id: string
          metrics: Json
          period_end: string
          period_start: string
          studio_id: string
        }
        Insert: {
          bucket: string
          computed_at?: string
          id?: string
          metrics: Json
          period_end: string
          period_start: string
          studio_id: string
        }
        Update: {
          bucket?: string
          computed_at?: string
          id?: string
          metrics?: Json
          period_end?: string
          period_start?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_cache_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          campaign_id: string | null
          converted_member_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          glofox_id: string | null
          id: string
          metadata: Json
          notes: string | null
          phone: string | null
          score: number
          source: string | null
          status: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          campaign_id?: string | null
          converted_member_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          glofox_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          phone?: string | null
          score?: number
          source?: string | null
          status?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          campaign_id?: string | null
          converted_member_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          glofox_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          phone?: string | null
          score?: number
          source?: string | null
          status?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_member_id_fkey"
            columns: ["converted_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          glofox_id: string | null
          id: string
          is_active: boolean
          name: string
          postal_code: string | null
          state: string | null
          studio_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          glofox_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          postal_code?: string | null
          state?: string | null
          studio_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          glofox_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          postal_code?: string | null
          state?: string | null
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      member_waivers: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          ip_address: string | null
          member_id: string
          signed_at: string
          signed_signature: string | null
          studio_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          member_id: string
          signed_at?: string
          signed_signature?: string | null
          studio_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          member_id?: string
          signed_at?: string
          signed_signature?: string | null
          studio_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_waivers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_waivers_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_waivers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "waiver_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          cancelled_at: string | null
          corporate_account_id: string | null
          created_at: string
          current_period_end: string | null
          flex_credits: number
          glofox_id: string | null
          glofox_subscription_id: string | null
          glofox_synced_at: string | null
          glofox_write_status: string
          guest_passes_remaining: number
          id: string
          membership_credits: number
          membership_status: string
          membership_tier: string | null
          paused_until: string | null
          pending_change_at: string | null
          pending_plan_id: string | null
          plan_code: string | null
          plan_id: string | null
          plan_price_cents: number | null
          profile_id: string
          strike_count: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          studio_id: string
          updated_at: string
          wallet_balance_cents: number
        }
        Insert: {
          cancelled_at?: string | null
          corporate_account_id?: string | null
          created_at?: string
          current_period_end?: string | null
          flex_credits?: number
          glofox_id?: string | null
          glofox_subscription_id?: string | null
          glofox_synced_at?: string | null
          glofox_write_status?: string
          guest_passes_remaining?: number
          id?: string
          membership_credits?: number
          membership_status?: string
          membership_tier?: string | null
          paused_until?: string | null
          pending_change_at?: string | null
          pending_plan_id?: string | null
          plan_code?: string | null
          plan_id?: string | null
          plan_price_cents?: number | null
          profile_id: string
          strike_count?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          studio_id: string
          updated_at?: string
          wallet_balance_cents?: number
        }
        Update: {
          cancelled_at?: string | null
          corporate_account_id?: string | null
          created_at?: string
          current_period_end?: string | null
          flex_credits?: number
          glofox_id?: string | null
          glofox_subscription_id?: string | null
          glofox_synced_at?: string | null
          glofox_write_status?: string
          guest_passes_remaining?: number
          id?: string
          membership_credits?: number
          membership_status?: string
          membership_tier?: string | null
          paused_until?: string | null
          pending_change_at?: string | null
          pending_plan_id?: string | null
          plan_code?: string | null
          plan_id?: string | null
          plan_price_cents?: number | null
          profile_id?: string
          strike_count?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          studio_id?: string
          updated_at?: string
          wallet_balance_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "members_corporate_account_id_fkey"
            columns: ["corporate_account_id"]
            isOneToOne: false
            referencedRelation: "corporate_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_pending_plan_id_fkey"
            columns: ["pending_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          billing_interval: string
          created_at: string
          credits_per_cycle: number | null
          glofox_id: string | null
          guest_passes: number
          id: string
          is_active: boolean
          is_cross_location: boolean
          is_legacy: boolean
          label: string | null
          location_id: string | null
          metadata: Json
          name: string
          price_cents: number
          sort_order: number
          stripe_price_id: string | null
          studio_id: string
          tier: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          credits_per_cycle?: number | null
          glofox_id?: string | null
          guest_passes?: number
          id?: string
          is_active?: boolean
          is_cross_location?: boolean
          is_legacy?: boolean
          label?: string | null
          location_id?: string | null
          metadata?: Json
          name: string
          price_cents: number
          sort_order?: number
          stripe_price_id?: string | null
          studio_id: string
          tier?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          credits_per_cycle?: number | null
          glofox_id?: string | null
          guest_passes?: number
          id?: string
          is_active?: boolean
          is_cross_location?: boolean
          is_legacy?: boolean
          label?: string | null
          location_id?: string | null
          metadata?: Json
          name?: string
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          studio_id?: string
          tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_plans_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acquisition_campaign_id: string | null
          acquisition_source: string | null
          auth_user_id: string | null
          created_at: string
          email: string | null
          full_name: string
          glofox_id: string | null
          glofox_synced_at: string | null
          id: string
          metadata: Json
          phone: string | null
          roles: string[]
          studio_id: string
          updated_at: string
        }
        Insert: {
          acquisition_campaign_id?: string | null
          acquisition_source?: string | null
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          glofox_id?: string | null
          glofox_synced_at?: string | null
          id?: string
          metadata?: Json
          phone?: string | null
          roles?: string[]
          studio_id: string
          updated_at?: string
        }
        Update: {
          acquisition_campaign_id?: string | null
          acquisition_source?: string | null
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          glofox_id?: string | null
          glofox_synced_at?: string | null
          id?: string
          metadata?: Json
          phone?: string | null
          roles?: string[]
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          glofox_id: string | null
          id: string
          is_active: boolean
          name: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          glofox_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          glofox_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          studio_id: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          studio_id: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          studio_id?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      retail_products: {
        Row: {
          category: string
          cost_cents: number
          created_at: string
          id: string
          inventory: number
          is_active: boolean
          name: string
          price_cents: number
          reorder_threshold: number
          sku: string | null
          studio_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          cost_cents?: number
          created_at?: string
          id?: string
          inventory?: number
          is_active?: boolean
          name: string
          price_cents: number
          reorder_threshold?: number
          sku?: string | null
          studio_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_cents?: number
          created_at?: string
          id?: string
          inventory?: number
          is_active?: boolean
          name?: string
          price_cents?: number
          reorder_threshold?: number
          sku?: string | null
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retail_products_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          studio_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          studio_id: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          studio_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          settings: Json
          slug: string
          tax_rate: number
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          settings?: Json
          slug: string
          tax_rate?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          settings?: Json
          slug?: string
          tax_rate?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      trainers: {
        Row: {
          base_pay_per_class_cents: number
          bio: string | null
          bonus_rate: number | null
          bonus_threshold: number | null
          created_at: string
          glofox_id: string | null
          id: string
          is_active: boolean
          profile_id: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          base_pay_per_class_cents?: number
          bio?: string | null
          bonus_rate?: number | null
          bonus_threshold?: number | null
          created_at?: string
          glofox_id?: string | null
          id?: string
          is_active?: boolean
          profile_id: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          base_pay_per_class_cents?: number
          bio?: string | null
          bonus_rate?: number | null
          bonus_threshold?: number | null
          created_at?: string
          glofox_id?: string | null
          id?: string
          is_active?: boolean
          profile_id?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainers_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          campaign_id: string | null
          class_instance_id: string | null
          created_at: string
          currency: string
          description: string | null
          fee_cents: number
          glofox_id: string | null
          id: string
          member_id: string | null
          metadata: Json
          net_cents: number | null
          occurred_at: string
          promo_code: string | null
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent: string | null
          studio_id: string
          tax_cents: number
          type: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          campaign_id?: string | null
          class_instance_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          fee_cents?: number
          glofox_id?: string | null
          id?: string
          member_id?: string | null
          metadata?: Json
          net_cents?: number | null
          occurred_at?: string
          promo_code?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent?: string | null
          studio_id: string
          tax_cents?: number
          type: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          campaign_id?: string | null
          class_instance_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          fee_cents?: number
          glofox_id?: string | null
          id?: string
          member_id?: string | null
          metadata?: Json
          net_cents?: number | null
          occurred_at?: string
          promo_code?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent?: string | null
          studio_id?: string
          tax_cents?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_class_instance_id_fkey"
            columns: ["class_instance_id"]
            isOneToOne: false
            referencedRelation: "class_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      waiver_templates: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          studio_id: string
          updated_at: string
          version: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          studio_id: string
          updated_at?: string
          version?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          studio_id?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiver_templates_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      people: {
        Row: {
          credit_balance: number | null
          email: string | null
          email_key: string | null
          first_booking_at: string | null
          full_name: string | null
          has_trial_purchase: boolean | null
          is_active_recurring: boolean | null
          is_lead_only: boolean | null
          is_member: boolean | null
          last_purchase_at: string | null
          last_visit_at: string | null
          lead_id: string | null
          member_id: string | null
          membership_status: string | null
          membership_tier: string | null
          phone: string | null
          plan_id: string | null
          plan_price_cents: number | null
          purchases_60d: number | null
          registered_at: string | null
          studio_id: string | null
          total_spend_cents: number | null
          visits_21d: number | null
          visits_30d: number | null
          visits_60d: number | null
        }
        Relationships: []
      }
      segment_assignments: {
        Row: {
          email: string | null
          email_key: string | null
          full_name: string | null
          lead_id: string | null
          member_id: string | null
          phone: string | null
          segment_id: string | null
          studio_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_credit_ledger: {
        Args: {
          p_actor_id?: string
          p_booking_id?: string
          p_credit_type: string
          p_delta: number
          p_member_id: string
          p_reason: string
          p_transaction_id?: string
        }
        Returns: string
      }
      backfill_bookings: { Args: { payload: Json }; Returns: number }
      backfill_events: { Args: { payload: Json }; Returns: number }
      backfill_members: { Args: { payload: Json }; Returns: number }
      backfill_transactions: { Args: { payload: Json }; Returns: number }
      book_class_atomic: {
        Args: {
          p_class_instance_id: string
          p_credit_type?: string
          p_member_id: string
          p_source?: string
          p_studio_id: string
        }
        Returns: string
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max: number
          p_studio_id: string
          p_window_ms: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          retry_after_ms: number
        }[]
      }
      current_studio_id: { Args: never; Returns: string }
      current_user_roles: { Args: never; Returns: string[] }
      is_admin: { Args: never; Returns: boolean }
      link_members_to_plans: {
        Args: { p_studio_id: string }
        Returns: {
          linked_count: number
        }[]
      }
      link_my_profile: {
        Args: never
        Returns: {
          already_linked: boolean
          linked_profile_id: string
        }[]
      }
      segment_counts: {
        Args: { p_studio_id: string }
        Returns: {
          member_count: number
          segment_id: string
          stale_credit_value: number
        }[]
      }
      segment_people: {
        Args: { p_limit?: number; p_segment_id: string; p_studio_id: string }
        Returns: {
          credit_balance: number
          email: string
          full_name: string
          last_purchase_at: string
          last_visit_at: string
          lead_id: string
          member_id: string
          membership_status: string
          membership_tier: string
          phone: string
          total_spend_cents: number
          visits_30d: number
        }[]
      }
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
