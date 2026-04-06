/**
 * Tipos de la base de datos MyRent
 *
 * Generados a partir de docs/db-schema.sql (schema actual).
 * Para regenerar desde Supabase:
 *   npx supabase gen types typescript --project-id "PROJECT_REF" > types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Tipos de dominio ────────────────────────────────────────────────────────

export type AccountRole = 'owner' | 'admin' | 'assistant' | 'accountant' | 'viewer'
export type LeaseStatus = 'draft' | 'active' | 'ended' | 'cancelled'
export type LeaseAdjustmentType = 'percentage' | 'index' | 'fixed_amount' | 'manual'
export type LeaseAdjustmentIndex = 'ICL' | 'IPC' | 'CER' | 'CVS' | 'UVA'
export type ReceiptStatus = 'draft' | 'generated' | 'sent' | 'signature_pending' | 'signed' | 'paid' | 'cancelled' | 'failed'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled'
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

export type Database = {
  public: {
    Tables: {

      accounts: {
        Row: { id: string; name: string; created_at: string }
        Insert: { id?: string; name: string; created_at?: string }
        Update: { id?: string; name?: string }
        Relationships: []
      }

      account_users: {
        Row: { id: string; account_id: string; user_id: string; role: AccountRole; created_at: string }
        Insert: { id?: string; account_id: string; user_id: string; role: AccountRole; created_at?: string }
        Update: { role?: AccountRole }
        Relationships: []
      }

      profiles: {
        Row: { id: string; full_name: string | null; created_at: string; updated_at: string }
        Insert: { id: string; full_name?: string | null; created_at?: string; updated_at?: string }
        Update: { full_name?: string | null; updated_at?: string }
        Relationships: []
      }

      properties: {
        Row: {
          id: string
          account_id: string
          name: string
          address: string
          cover_image_url: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          deleted_by: string | null
          delete_reason: string | null
        }
        Insert: {
          id?: string
          account_id: string
          name: string
          address: string
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delete_reason?: string | null
        }
        Update: {
          name?: string
          address?: string
          cover_image_url?: string | null
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delete_reason?: string | null
        }
        Relationships: []
      }

      property_images: {
        Row: PropertyImage
        Insert: {
          id?: string
          account_id: string
          property_id: string
          storage_path: string
          url: string
          is_cover?: boolean
          position?: number
          created_at?: string
        }
        Update: {
          url?: string
          is_cover?: boolean
          position?: number
        }
        Relationships: []
      }

      tenants: {
        Row: {
          id: string
          account_id: string
          full_name: string
          email: string | null
          phone: string | null
          dni_cuit: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          deleted_by: string | null
          delete_reason: string | null
        }
        Insert: {
          id?: string
          account_id: string
          full_name: string
          email?: string | null
          phone?: string | null
          dni_cuit?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delete_reason?: string | null
        }
        Update: {
          full_name?: string
          email?: string | null
          phone?: string | null
          dni_cuit?: string | null
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delete_reason?: string | null
        }
        Relationships: []
      }

      lease_adjustments: {
        Row: {
          id: string
          account_id: string
          lease_id: string
          effective_date: string
          previous_amount: number
          new_amount: number
          adjustment_type: LeaseAdjustmentType
          adjustment_value: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          lease_id: string
          effective_date: string
          previous_amount: number
          new_amount: number
          adjustment_type: LeaseAdjustmentType
          adjustment_value?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          effective_date?: string
          new_amount?: number
          adjustment_value?: number | null
          notes?: string | null
        }
        Relationships: []
      }

      leases: {
        Row: {
          id: string
          account_id: string
          property_id: string
          tenant_id: string
          start_date: string
          end_date: string | null
          rent_amount: number
          currency: string
          status: LeaseStatus
          notes: string | null
          adjustment_type: 'none' | 'percentage' | 'index' | 'fixed_amount' | null
          adjustment_frequency_months: number | null
          adjustment_percentage: number | null
          adjustment_index: LeaseAdjustmentIndex | null
          adjustment_fixed_amount: number | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          deleted_by: string | null
          delete_reason: string | null
        }
        Insert: {
          id?: string
          account_id: string
          property_id: string
          tenant_id: string
          start_date: string
          end_date?: string | null
          rent_amount: number
          currency?: string
          status?: LeaseStatus
          notes?: string | null
          adjustment_type?: 'none' | 'percentage' | 'index' | 'fixed_amount' | null
          adjustment_frequency_months?: number | null
          adjustment_percentage?: number | null
          adjustment_index?: LeaseAdjustmentIndex | null
          adjustment_fixed_amount?: number | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delete_reason?: string | null
        }
        Update: {
          property_id?: string
          tenant_id?: string
          start_date?: string
          end_date?: string | null
          rent_amount?: number
          currency?: string
          status?: LeaseStatus
          notes?: string | null
          adjustment_type?: 'none' | 'percentage' | 'index' | 'fixed_amount' | null
          adjustment_frequency_months?: number | null
          adjustment_percentage?: number | null
          adjustment_index?: LeaseAdjustmentIndex | null
          adjustment_fixed_amount?: number | null
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delete_reason?: string | null
        }
        Relationships: []
      }

      receipts: {
        Row: {
          id: string
          account_id: string
          lease_id: string
          property_id: string
          tenant_id: string
          period: string
          status: ReceiptStatus
          snapshot_tenant_name: string
          snapshot_tenant_dni_cuit: string | null
          snapshot_property_address: string
          snapshot_amount: number
          snapshot_currency: string
          snapshot_payload: Json | null
          storage_path: string | null
          pdf_url: string | null
          email_sent: boolean
          signature_provider: string | null
          signature_request_id: string | null
          signature_status: string | null
          landlord_signed_at: string | null
          tenant_signed_at: string | null
          description: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          delete_reason: string | null
        }
        Insert: {
          id?: string
          account_id: string
          lease_id: string
          property_id: string
          tenant_id: string
          period: string
          status?: ReceiptStatus
          snapshot_tenant_name: string
          snapshot_tenant_dni_cuit?: string | null
          snapshot_property_address: string
          snapshot_amount: number
          snapshot_currency: string
          snapshot_payload?: Json | null
          storage_path?: string | null
          pdf_url?: string | null
          email_sent?: boolean
          signature_provider?: string | null
          signature_request_id?: string | null
          signature_status?: string | null
          landlord_signed_at?: string | null
          tenant_signed_at?: string | null
          description?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delete_reason?: string | null
        }
        Update: {
          status?: ReceiptStatus
          pdf_url?: string | null
          email_sent?: boolean
          signature_provider?: string | null
          signature_request_id?: string | null
          signature_status?: string | null
          landlord_signed_at?: string | null
          tenant_signed_at?: string | null
          description?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delete_reason?: string | null
        }
        Relationships: []
      }

      payments: {
        Row: {
          id: string
          account_id: string
          receipt_id: string
          amount: number
          currency: string
          payment_method: string | null
          status: PaymentStatus
          paid_at: string | null
          reference: string | null
          notes: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          delete_reason: string | null
        }
        Insert: {
          id?: string
          account_id: string
          receipt_id: string
          amount: number
          currency?: string
          payment_method?: string | null
          status: PaymentStatus
          paid_at?: string | null
          reference?: string | null
          notes?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delete_reason?: string | null
        }
        Update: {
          amount?: number
          currency?: string
          payment_method?: string | null
          status?: PaymentStatus
          paid_at?: string | null
          reference?: string | null
          notes?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          delete_reason?: string | null
        }
        Relationships: []
      }

      signature_events: {
        Row: {
          id: string
          account_id: string
          receipt_id: string
          event_type: string
          signer_email: string | null
          signer_role: string | null
          event_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          receipt_id: string
          event_type: string
          signer_email?: string | null
          signer_role?: string | null
          event_data?: Json | null
          created_at?: string
        }
        Update: {
          event_type?: string
          signer_email?: string | null
          signer_role?: string | null
          event_data?: Json | null
        }
        Relationships: []
      }

      audit_logs: {
        Row: {
          id: string
          account_id: string
          actor_user_id: string | null
          entity_type: string
          entity_id: string | null
          action: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          actor_user_id?: string | null
          entity_type: string
          entity_id?: string | null
          action: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          metadata?: Json | null
        }
        Relationships: []
      }
    }

    Views: {
      leases_overview: {
        Row: {
          id: string
          account_id: string
          property_id: string
          tenant_id: string
          property_name: string | null
          property_address: string | null
          tenant_name: string | null
          tenant_email: string | null
          start_date: string | null
          end_date: string | null
          rent_amount: number
          currency: string
          status: LeaseStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Relationships: []
      }

      active_receipts_overview: {
        Row: {
          id: string
          account_id: string
          lease_id: string
          property_id: string
          tenant_id: string
          period: string
          status: ReceiptStatus
          snapshot_tenant_name: string
          snapshot_property_address: string
          snapshot_amount: number
          snapshot_currency: string
          pdf_url: string | null
          email_sent: boolean
          signature_status: string | null
          description: string | null
          created_at: string
          tenant_email: string | null
        }
        Relationships: []
      }

      receipt_timeline_overview: {
        Row: {
          id: string
          account_id: string
          period: string
          status: ReceiptStatus
          snapshot_tenant_name: string
          snapshot_amount: number
          snapshot_currency: string
          created_at: string
          lease_id: string
          tenant_id: string
          property_id: string
        }
        Relationships: []
      }

      account_dashboard_overview: {
        Row: {
          account_id: string
          total_properties: number
          total_tenants: number
          total_active_leases: number
          receipts_this_month: number
          total_receipts: number
        }
        Relationships: []
      }

      active_payments_overview: {
        Row: {
          id: string
          account_id: string
          receipt_id: string
          amount: number
          currency: string
          payment_method: string | null
          status: PaymentStatus
          paid_at: string | null
          reference: string | null
          notes: string | null
          created_at: string
          receipt_period: string
          tenant_name: string
        }
        Relationships: []
      }

      account_members_overview: {
        Row: {
          id: string
          account_id: string
          user_id: string
          role: AccountRole
          full_name: string | null
          email: string
          created_at: string
        }
        Relationships: []
      }
    }

    Functions: {
      has_account_role: {
        Args: { p_account_id: string; p_user_id: string; p_roles: string[] }
        Returns: boolean
      }
      is_account_member: {
        Args: { p_account_id: string }
        Returns: boolean
      }
      archive_property: {
        Args: { p_actor_user_id: string; p_account_id: string; p_property_id: string; p_reason?: string | null }
        Returns: { id: string; account_id: string; name: string; address: string; cover_image_url: string | null; created_at: string; updated_at: string; deleted_at: string | null; deleted_by: string | null; delete_reason: string | null }
      }
      archive_tenant: {
        Args: { p_actor_user_id: string; p_account_id: string; p_tenant_id: string; p_reason?: string | null }
        Returns: { id: string; account_id: string; full_name: string; email: string | null; phone: string | null; dni_cuit: string | null; created_at: string; updated_at: string; deleted_at: string | null; deleted_by: string | null; delete_reason: string | null }
      }
      cancel_receipt: {
        Args: { p_actor_user_id: string; p_account_id: string; p_receipt_id: string; p_reason?: string | null }
        Returns: unknown
      }
      register_payment: {
        Args: { p_actor_user_id: string; p_account_id: string; p_receipt_id: string; p_amount: number; p_currency?: string; p_payment_method?: string | null; p_reference?: string | null; p_notes?: string | null }
        Returns: unknown
      }
      append_signature_event: {
        Args: { p_actor_user_id: string; p_account_id: string; p_receipt_id: string; p_event_type: string; p_signer_email?: string | null; p_signer_role?: string | null; p_event_data?: Json }
        Returns: unknown
      }
      issue_receipt: {
        Args: { p_actor_user_id: string; p_account_id: string; p_lease_id: string; p_period: string; p_description?: string | null }
        Returns: unknown
      }
    }

    Enums: {}
    CompositeTypes: {}
  }
}
