-- =============================================================================
-- Migration: Tenant auth access + Online payment foundation
-- Date: 2026-04-08
-- =============================================================================
-- Goals:
--   1. Link tenant records to auth users for self-service portal access
--   2. Extend payments table for async online payment provider flows
--   3. Add payment_events table for idempotent webhook processing
--   4. Add RLS policies so tenants can read their own data (SELECT only)
--   5. Add helper RPCs: is_tenant_user(), get_tenant_id_for_user()
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 1 — TENANT AUTH LINKAGE
-- Adds auth_user_id to tenants for self-service portal access.
-- Nullable: tenant record exists before auth user is created (invite flow).
-- UNIQUE NULLS NOT DISTINCT: one auth user ↔ one active tenant record (MVP).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS auth_user_id uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ensures one auth user can only be linked to one tenant record system-wide.
-- Default PostgreSQL behavior: NULLs are distinct in UNIQUE indexes,
-- so multiple NULL values (tenants without a portal account) are allowed.
-- Only non-NULL auth_user_id values are subject to the uniqueness constraint.
CREATE UNIQUE INDEX IF NOT EXISTS tenants_auth_user_id_udx
  ON public.tenants (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Fast lookup: resolve which tenant record belongs to the current auth user.
CREATE INDEX IF NOT EXISTS idx_tenants_auth_user_id
  ON public.tenants (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

COMMENT ON COLUMN public.tenants.auth_user_id IS
  'Links this tenant business record to a Supabase Auth user for portal access. '
  'NULL until the tenant creates their account via invite.';


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 2 — HELPER: is_tenant_user()
-- Returns true if the current auth.uid() is linked to any active tenant record.
-- SECURITY DEFINER to read tenants without exposing the table to the caller.
-- Used in RLS policies across leases, receipts, payments.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_tenant_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.tenants
    WHERE  auth_user_id = auth.uid()
      AND  deleted_at   IS NULL
  )
$$;

COMMENT ON FUNCTION public.is_tenant_user IS
  'Returns true if the calling auth user is linked to an active tenant record. '
  'SECURITY DEFINER — safe for use in RLS policies.';


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 3 — HELPER: get_tenant_id_for_user()
-- Returns the tenant.id for the current auth.uid().
-- Returns NULL if the user is not linked to any tenant (i.e., they are staff).
-- Used in Server Actions for tenant-scoped queries.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_tenant_id_for_user()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id
  FROM   public.tenants
  WHERE  auth_user_id = auth.uid()
    AND  deleted_at   IS NULL
  LIMIT  1
$$;

COMMENT ON FUNCTION public.get_tenant_id_for_user IS
  'Returns the tenant_id for the current auth user, or NULL if not a tenant. '
  'SECURITY DEFINER — safe for use in RLS policies and Server Actions.';


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 4 — RLS POLICIES: TENANT SELF-ACCESS (SELECT ONLY)
-- Tenants can read their own data. They cannot INSERT, UPDATE, or DELETE
-- any records — all mutations remain staff-only via enforce_account_role().
-- Naming: "{table}: tenant reads own {entity}"
-- ─────────────────────────────────────────────────────────────────────────────

-- 4a. tenants — a tenant can read their own tenant record
CREATE POLICY "tenants: tenant reads own record"
  ON public.tenants
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- 4b. leases — a tenant can read leases where they are the named tenant
CREATE POLICY "leases: tenant reads own leases"
  ON public.leases
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM   public.tenants t
      WHERE  t.id           = leases.tenant_id
        AND  t.auth_user_id = auth.uid()
        AND  t.deleted_at   IS NULL
    )
  );

-- 4c. receipts — a tenant can read receipts where they are the named tenant
CREATE POLICY "receipts: tenant reads own receipts"
  ON public.receipts
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM   public.tenants t
      WHERE  t.id           = receipts.tenant_id
        AND  t.auth_user_id = auth.uid()
        AND  t.deleted_at   IS NULL
    )
  );

-- 4d. payments — a tenant can read payments linked to their receipts
CREATE POLICY "payments: tenant reads own payments"
  ON public.payments
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM   public.receipts r
      JOIN   public.tenants  t ON t.id = r.tenant_id
      WHERE  r.id           = payments.receipt_id
        AND  t.auth_user_id = auth.uid()
        AND  t.deleted_at   IS NULL
        AND  r.deleted_at   IS NULL
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 5 — EXTEND payments TABLE FOR ONLINE PROVIDER FLOWS
-- All new columns are nullable and additive — zero impact on existing data.
-- The existing status values (pending, paid, failed, cancelled) are preserved.
-- 'processing' is added for the async confirmation window.
-- 'refunded' is added for provider refund events.
-- ─────────────────────────────────────────────────────────────────────────────

-- Which payment provider handled this payment (e.g., 'mercadopago', 'manual')
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'manual';

-- Provider's own payment or preference ID — used for idempotency checks
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider_payment_id text;

-- Raw status string from provider before mapping to our canonical status
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider_status text;

-- The checkout URL to redirect the tenant to complete payment
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS checkout_url text;

-- Our reference ID sent to the provider (Mercado Pago: external_reference)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS external_reference text;

-- Auth user who initiated this payment (tenant or staff; NULL for webhooks)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS initiated_by_user_id uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- Provider-specific response data (raw API response, webhook metadata, etc.)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Widen the status check to include async-provider states.
-- The old constraint was an anonymous inline CHECK; drop by convention name.
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded'));

-- Idempotency index: one (provider, provider_payment_id) pair per active payment.
-- Partial: soft-deleted rows are excluded so a refunded/cancelled payment
-- does not block a new attempt with the same provider ID.
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_id_udx
  ON public.payments (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL
    AND deleted_at IS NULL;

-- Reconciliation lookup: find payment by external_reference (what we sent to provider)
CREATE INDEX IF NOT EXISTS idx_payments_external_reference
  ON public.payments (external_reference)
  WHERE external_reference IS NOT NULL;

-- Lookup: all payments for a tenant (join path: payments → receipts → tenants)
-- Already covered by existing idx_payments_receipt_id from previous migration.

COMMENT ON COLUMN public.payments.provider IS
  'Payment provider identifier. ''manual'' for cash/bank-transfer recorded by staff.';
COMMENT ON COLUMN public.payments.provider_payment_id IS
  'Provider-assigned payment ID. Used with provider column as idempotency key.';
COMMENT ON COLUMN public.payments.external_reference IS
  'Our reference ID sent to the provider. Mercado Pago: external_reference field.';
COMMENT ON COLUMN public.payments.checkout_url IS
  'URL to redirect tenant to for payment completion (provider checkout page).';
COMMENT ON COLUMN public.payments.metadata IS
  'Raw provider API response and webhook data. JSONB for provider-specific fields.';


-- ─────────────────────────────────────────────────────────────────────────────
-- SECTION 6 — payment_events TABLE
-- Immutable event log for all payment provider webhook callbacks.
-- Core idempotency: UNIQUE(provider, provider_event_id) prevents double-processing
-- of the same webhook event even if the provider sends it more than once.
-- Mirrors the pattern of signature_events for HelloSign webhooks.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_events (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_id        uuid        NOT NULL,
  payment_id        uuid        NOT NULL,
  -- Provider identification
  provider          text        NOT NULL, -- e.g. 'mercadopago'
  provider_event_id text        NOT NULL, -- Provider's unique event ID (idempotency key)
  event_type        text        NOT NULL, -- e.g. 'payment.approved', 'payment.rejected'
  -- Raw payload from the provider webhook
  event_data        jsonb,
  -- Set when the event has been processed and the system state was updated
  processed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payment_events_pkey
    PRIMARY KEY (id),
  CONSTRAINT payment_events_account_id_fkey
    FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT payment_events_payment_id_fkey
    FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE
);

-- Core idempotency constraint: same event from the same provider is never
-- stored (or processed) twice. ON CONFLICT DO NOTHING handles duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS payment_events_idempotency_udx
  ON public.payment_events (provider, provider_event_id);

-- Fast lookup: all events for a given payment (dashboard / audit trail)
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id
  ON public.payment_events (payment_id);

-- Queue index: find events that arrived but haven't been processed yet
CREATE INDEX IF NOT EXISTS idx_payment_events_unprocessed
  ON public.payment_events (created_at)
  WHERE processed_at IS NULL;

-- Account-scoped lookup for audit/admin views
CREATE INDEX IF NOT EXISTS idx_payment_events_account_id
  ON public.payment_events (account_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Staff can read all payment events for their account
CREATE POLICY "payment_events: staff reads own account events"
  ON public.payment_events
  FOR SELECT
  USING (
    public.has_account_role(
      account_id,
      auth.uid(),
      ARRAY['owner', 'admin', 'accountant', 'assistant', 'viewer']
    )
  );

-- Service role (webhook handler) writes events — no user-level INSERT policy needed.
-- The webhook route uses createAdminClient() which bypasses RLS entirely.

COMMENT ON TABLE public.payment_events IS
  'Immutable event log for payment provider webhooks. '
  'UNIQUE(provider, provider_event_id) guarantees idempotent processing.';
COMMENT ON COLUMN public.payment_events.provider_event_id IS
  'Provider-assigned unique event ID. Used with provider as the idempotency key.';
COMMENT ON COLUMN public.payment_events.processed_at IS
  'Set when this event was processed and system state (payment status, receipt status) was updated. '
  'NULL means the event arrived but processing has not completed.';
