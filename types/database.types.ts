// ─── Tipos de dominio ────────────────────────────────────────────────────────

export type AccountRole = 'owner' | 'admin' | 'assistant' | 'accountant' | 'viewer'
export type LeaseStatus = 'draft' | 'active' | 'ended' | 'cancelled'
export type LeaseAdjustmentType = 'percentage' | 'index' | 'fixed_amount' | 'manual'
export type LeaseAdjustmentIndex = 'ICL' | 'IPC' | 'CER' | 'CVS' | 'UVA'
export type ReceiptStatus = 'draft' | 'generated' | 'sent' | 'signature_pending' | 'signed' | 'paid' | 'cancelled' | 'failed'
/** 'processing' = async provider confirmation window; 'refunded' = provider-initiated refund */
export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded'
export type PaymentProvider = 'manual' | 'mercadopago' | 'stripe' | 'bank_transfer'
export type SignatureStatus = 'pending' | 'landlord_signed' | 'fully_signed' | 'declined' | 'expired'

export type PropertyImage = {
  id: string
  account_id: string
  property_id: string
  storage_path: string
  url: string
  is_cover: boolean
  position: number
  created_at: string
}

// ─── Database ────────────────────────────────────────────────────────────────

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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_users: {
        Row: {
          account_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "account_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          account_id: string
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          account_id: string
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          account_id?: string
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "audit_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_adjustments: {
        Row: {
          account_id: string
          adjustment_type: string
          adjustment_value: number | null
          created_at: string
          effective_date: string
          id: string
          lease_id: string
          new_amount: number
          notes: string | null
          previous_amount: number
        }
        Insert: {
          account_id: string
          adjustment_type: string
          adjustment_value?: number | null
          created_at?: string
          effective_date: string
          id?: string
          lease_id: string
          new_amount: number
          notes?: string | null
          previous_amount: number
        }
        Update: {
          account_id?: string
          adjustment_type?: string
          adjustment_value?: number | null
          created_at?: string
          effective_date?: string
          id?: string
          lease_id?: string
          new_amount?: number
          notes?: string | null
          previous_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "lease_adjustments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "lease_adjustments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_adjustments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_adjustments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          account_id: string
          adjustment_fixed_amount: number | null
          adjustment_frequency_months: number | null
          adjustment_index: string | null
          adjustment_percentage: number | null
          adjustment_type: string | null
          created_at: string
          currency: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          end_date: string | null
          id: string
          notes: string | null
          property_id: string
          rent_amount: number
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          adjustment_fixed_amount?: number | null
          adjustment_frequency_months?: number | null
          adjustment_index?: string | null
          adjustment_percentage?: number | null
          adjustment_type?: string | null
          created_at?: string
          currency?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          property_id: string
          rent_amount: number
          start_date: string
          status: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          adjustment_fixed_amount?: number | null
          adjustment_frequency_months?: number | null
          adjustment_index?: string | null
          adjustment_percentage?: number | null
          adjustment_type?: string | null
          created_at?: string
          currency?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          property_id?: string
          rent_amount?: number
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "leases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "active_properties_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "active_tenants_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          account_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          payment_id: string
          processed_at: string | null
          provider: string
          provider_event_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          payment_id: string
          processed_at?: string | null
          provider: string
          provider_event_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          payment_id?: string
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "payment_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "active_payments_clean_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "active_payments_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_id: string
          amount: number
          /** URL to redirect tenant to for payment completion */
          checkout_url: string | null
          created_at: string
          currency: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          /** Our reference ID sent to the provider (e.g., Mercado Pago external_reference) */
          external_reference: string | null
          id: string
          /** Auth user who initiated this payment (tenant or staff) */
          initiated_by_user_id: string | null
          /** Provider-specific response data */
          metadata: Json | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          /** Payment provider identifier ('manual', 'mercadopago', etc.) */
          provider: string
          /** Provider-assigned payment ID — used with provider as idempotency key */
          provider_payment_id: string | null
          /** Raw status from provider before mapping to canonical status */
          provider_status: string | null
          receipt_id: string
          reference: string | null
          status: string
        }
        Insert: {
          account_id: string
          amount: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          external_reference?: string | null
          id?: string
          initiated_by_user_id?: string | null
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_status?: string | null
          receipt_id: string
          reference?: string | null
          status: string
        }
        Update: {
          account_id?: string
          amount?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          external_reference?: string | null
          id?: string
          initiated_by_user_id?: string | null
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_status?: string | null
          receipt_id?: string
          reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "active_receipts_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          account_id: string
          address: string
          cover_image_url: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          address: string
          cover_image_url?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          address?: string
          cover_image_url?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "properties_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_cover: boolean
          position: number
          property_id: string
          storage_path: string
          url: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_cover?: boolean
          position?: number
          property_id: string
          storage_path: string
          url: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_cover?: boolean
          position?: number
          property_id?: string
          storage_path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "property_images_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "active_properties_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          account_id: string
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          email_sent: boolean
          id: string
          landlord_signed_at: string | null
          lease_id: string
          pdf_url: string | null
          period: string
          property_id: string
          signature_provider: string | null
          signature_request_id: string | null
          signature_status: string | null
          snapshot_amount: number
          snapshot_currency: string
          snapshot_payload: Json | null
          snapshot_property_address: string
          snapshot_tenant_dni_cuit: string | null
          snapshot_tenant_name: string
          status: string
          storage_path: string | null
          tenant_id: string
          tenant_signed_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          email_sent?: boolean
          id?: string
          landlord_signed_at?: string | null
          lease_id: string
          pdf_url?: string | null
          period: string
          property_id: string
          signature_provider?: string | null
          signature_request_id?: string | null
          signature_status?: string | null
          snapshot_amount: number
          snapshot_currency: string
          snapshot_payload?: Json | null
          snapshot_property_address: string
          snapshot_tenant_dni_cuit?: string | null
          snapshot_tenant_name: string
          status: string
          storage_path?: string | null
          tenant_id: string
          tenant_signed_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          email_sent?: boolean
          id?: string
          landlord_signed_at?: string | null
          lease_id?: string
          pdf_url?: string | null
          period?: string
          property_id?: string
          signature_provider?: string | null
          signature_request_id?: string | null
          signature_status?: string | null
          snapshot_amount?: number
          snapshot_currency?: string
          snapshot_payload?: Json | null
          snapshot_property_address?: string
          snapshot_tenant_dni_cuit?: string | null
          snapshot_tenant_name?: string
          status?: string
          storage_path?: string | null
          tenant_id?: string
          tenant_signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "receipts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "active_properties_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "active_tenants_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_events: {
        Row: {
          account_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          receipt_id: string
          signer_email: string | null
          signer_role: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          receipt_id: string
          signer_email?: string | null
          signer_role?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          receipt_id?: string
          signer_email?: string | null
          signer_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "signature_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_events_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "active_receipts_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_events_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_events_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          account_id: string
          /** Links this tenant record to a Supabase Auth user for portal access. NULL until tenant accepts invite. UNIQUE on non-NULL values. */
          auth_user_id: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          dni_cuit: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          auth_user_id?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dni_cuit?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          auth_user_id?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dni_cuit?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "tenants_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_dashboard_overview: {
        Row: {
          account_id: string | null
          account_name: string | null
          active_leases_count: number | null
          active_properties_count: number | null
          active_receipts_count: number | null
          active_tenants_count: number | null
          total_paid_amount: number | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          active_leases_count?: never
          active_properties_count?: never
          active_receipts_count?: never
          active_tenants_count?: never
          total_paid_amount?: never
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          active_leases_count?: never
          active_properties_count?: never
          active_receipts_count?: never
          active_tenants_count?: never
          total_paid_amount?: never
        }
        Relationships: []
      }
      account_members_overview: {
        Row: {
          account_id: string | null
          account_user_id: string | null
          created_at: string | null
          full_name: string | null
          role: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "account_users_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      active_payments_clean_overview: {
        Row: {
          account_id: string | null
          amount: number | null
          created_at: string | null
          currency: string | null
          id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          period: string | null
          receipt_id: string | null
          receipt_status: string | null
          reference: string | null
          signature_status: string | null
          snapshot_property_address: string | null
          snapshot_tenant_name: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "active_receipts_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      active_payments_overview: {
        Row: {
          account_id: string | null
          amount: number | null
          created_at: string | null
          currency: string | null
          id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          period: string | null
          receipt_id: string | null
          receipt_status: string | null
          reference: string | null
          signature_status: string | null
          snapshot_property_address: string | null
          snapshot_tenant_name: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "active_receipts_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      active_properties_overview: {
        Row: {
          account_id: string | null
          address: string | null
          created_at: string | null
          id: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          address?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          address?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "properties_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      active_receipts_overview: {
        Row: {
          account_id: string | null
          created_at: string | null
          description: string | null
          email_sent: boolean | null
          id: string | null
          lease_id: string | null
          lease_status: string | null
          period: string | null
          property_address: string | null
          property_id: string | null
          property_name: string | null
          signature_status: string | null
          snapshot_amount: number | null
          snapshot_currency: string | null
          snapshot_property_address: string | null
          snapshot_tenant_name: string | null
          status: string | null
          tenant_id: string | null
          tenant_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "receipts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "active_properties_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "active_tenants_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      active_tenants_overview: {
        Row: {
          account_id: string | null
          created_at: string | null
          dni_cuit: string | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          dni_cuit?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          dni_cuit?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "tenants_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      leases_overview: {
        Row: {
          account_id: string | null
          created_at: string | null
          currency: string | null
          end_date: string | null
          id: string | null
          notes: string | null
          property_address: string | null
          property_id: string | null
          property_name: string | null
          rent_amount: number | null
          start_date: string | null
          status: string | null
          tenant_email: string | null
          tenant_id: string | null
          tenant_name: string | null
          tenant_phone: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "leases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "active_properties_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "active_tenants_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments_overview: {
        Row: {
          account_id: string | null
          amount: number | null
          created_at: string | null
          currency: string | null
          id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          period: string | null
          receipt_id: string | null
          receipt_status: string | null
          reference: string | null
          snapshot_property_address: string | null
          snapshot_tenant_name: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "active_receipts_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_timeline_overview: {
        Row: {
          account_id: string | null
          event_at: string | null
          event_data: Json | null
          event_kind: string | null
          receipt_id: string | null
        }
        Relationships: []
      }
      receipts_overview: {
        Row: {
          account_id: string | null
          created_at: string | null
          email_sent: boolean | null
          id: string | null
          lease_id: string | null
          period: string | null
          property_address: string | null
          property_id: string | null
          property_name: string | null
          signature_status: string | null
          snapshot_amount: number | null
          snapshot_currency: string | null
          snapshot_property_address: string | null
          snapshot_tenant_name: string | null
          status: string | null
          tenant_id: string | null
          tenant_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "account_dashboard_overview"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "receipts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "active_properties_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "active_tenants_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      append_signature_event: {
        Args: {
          p_account_id: string
          p_actor_user_id: string
          p_event_data?: Json
          p_event_type: string
          p_receipt_id: string
          p_signer_email?: string
          p_signer_role?: string
        }
        Returns: {
          account_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          receipt_id: string
          signer_email: string | null
          signer_role: string | null
        }
        SetofOptions: {
          from: "*"
          to: "signature_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_lease_adjustment: {
        Args: {
          p_account_id: string
          p_actor_user_id: string
          p_adjustment_type: string
          p_adjustment_value?: number
          p_effective_date: string
          p_lease_id: string
          p_new_amount: number
          p_notes?: string
        }
        Returns: {
          account_id: string
          adjustment_type: string
          adjustment_value: number | null
          created_at: string
          effective_date: string
          id: string
          lease_id: string
          new_amount: number
          notes: string | null
          previous_amount: number
        }
        SetofOptions: {
          from: "*"
          to: "lease_adjustments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_property: {
        Args: {
          p_account_id: string
          p_actor_user_id: string
          p_property_id: string
          p_reason?: string
        }
        Returns: {
          account_id: string
          address: string
          cover_image_url: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "properties"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_tenant: {
        Args: {
          p_account_id: string
          p_actor_user_id: string
          p_reason?: string
          p_tenant_id: string
        }
        Returns: {
          account_id: string
          auth_user_id: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          dni_cuit: string | null
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tenants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_receipt: {
        Args: {
          p_account_id: string
          p_actor_user_id: string
          p_reason?: string
          p_receipt_id: string
        }
        Returns: {
          account_id: string
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          email_sent: boolean
          id: string
          landlord_signed_at: string | null
          lease_id: string
          pdf_url: string | null
          period: string
          property_id: string
          signature_provider: string | null
          signature_request_id: string | null
          signature_status: string | null
          snapshot_amount: number
          snapshot_currency: string
          snapshot_payload: Json | null
          snapshot_property_address: string
          snapshot_tenant_dni_cuit: string | null
          snapshot_tenant_name: string
          status: string
          storage_path: string | null
          tenant_id: string
          tenant_signed_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "receipts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      enforce_account_role: {
        Args: { p_account_id: string; p_roles: string[]; p_user_id: string }
        Returns: undefined
      }
      get_tenant_id_for_user: { Args: never; Returns: string }
      has_account_role: {
        Args: { p_account_id: string; p_roles: string[]; p_user_id: string }
        Returns: boolean
      }
      is_account_member: {
        Args: { target_account_id: string }
        Returns: boolean
      }
      is_tenant_user: { Args: never; Returns: boolean }
      issue_receipt:
        | {
            Args: {
              p_account_id: string
              p_description?: string
              p_lease_id: string
              p_period: string
            }
            Returns: {
              account_id: string
              created_at: string
              delete_reason: string | null
              deleted_at: string | null
              deleted_by: string | null
              description: string | null
              email_sent: boolean
              id: string
              landlord_signed_at: string | null
              lease_id: string
              pdf_url: string | null
              period: string
              property_id: string
              signature_provider: string | null
              signature_request_id: string | null
              signature_status: string | null
              snapshot_amount: number
              snapshot_currency: string
              snapshot_payload: Json | null
              snapshot_property_address: string
              snapshot_tenant_dni_cuit: string | null
              snapshot_tenant_name: string
              status: string
              storage_path: string | null
              tenant_id: string
              tenant_signed_at: string | null
            }
            SetofOptions: {
              from: "*"
              to: "receipts"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_account_id: string
              p_actor_user_id: string
              p_description?: string
              p_lease_id: string
              p_period: string
            }
            Returns: {
              account_id: string
              created_at: string
              delete_reason: string | null
              deleted_at: string | null
              deleted_by: string | null
              description: string | null
              email_sent: boolean
              id: string
              landlord_signed_at: string | null
              lease_id: string
              pdf_url: string | null
              period: string
              property_id: string
              signature_provider: string | null
              signature_request_id: string | null
              signature_status: string | null
              snapshot_amount: number
              snapshot_currency: string
              snapshot_payload: Json | null
              snapshot_property_address: string
              snapshot_tenant_dni_cuit: string | null
              snapshot_tenant_name: string
              status: string
              storage_path: string | null
              tenant_id: string
              tenant_signed_at: string | null
            }
            SetofOptions: {
              from: "*"
              to: "receipts"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      register_payment: {
        Args: {
          p_account_id: string
          p_actor_user_id: string
          p_amount: number
          p_currency?: string
          p_notes?: string
          p_payment_method?: string
          p_receipt_id: string
          p_reference?: string
        }
        Returns: {
          account_id: string
          amount: number
          checkout_url: string | null
          created_at: string
          currency: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          external_reference: string | null
          id: string
          initiated_by_user_id: string | null
          metadata: Json | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          provider: string
          provider_payment_id: string | null
          provider_status: string | null
          receipt_id: string
          reference: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
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
