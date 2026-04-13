-- =============================================================================
-- Migration: Schema hardening — indexes, constraints, triggers, safety checks
-- Date: 2026-04-13
-- =============================================================================
-- Goals:
--   1. Fix receipts unique index (lease-based instead of tenant-based)
--   2. Prevent multiple active leases on the same property
--   3. Add missing performance indexes
--   4. Add CHECK constraints for enum-like columns
--   5. Add date range validation on leases
--   6. Prevent removal/demotion of the last account owner
--   7. Stale rate_limits cleanup function
--   8. Amount validation in finalize_receipt()
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. FIX RECEIPTS UNIQUE INDEX (CRITICAL)
-- Replace tenant-based uniqueness with lease-based uniqueness.
-- This fixes a bug where lease renewals for the same tenant would conflict
-- because the old index enforced (tenant_id, period) uniqueness — a tenant
-- with two successive leases on the same property (or different properties)
-- could not have a receipt for the same period on each lease.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS receipts_tenant_period_udx;

CREATE UNIQUE INDEX receipts_lease_period_udx
  ON public.receipts (lease_id, period)
  WHERE deleted_at IS NULL;


-- ---------------------------------------------------------------------------
-- 2. UNIQUE INDEX: ONE ACTIVE LEASE PER PROPERTY
-- Prevent multiple active leases on the same property at the same time.
-- Only enforced for status = 'active' and non-deleted rows.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS leases_active_property_udx
  ON public.leases (property_id)
  WHERE status = 'active' AND deleted_at IS NULL;


-- ---------------------------------------------------------------------------
-- 3. MISSING PERFORMANCE INDEXES
-- ---------------------------------------------------------------------------

-- Compound index for receipt idempotency checks in RPCs
-- (generate_draft_receipt and issue_receipt both query lease_id + period)
CREATE INDEX IF NOT EXISTS idx_receipts_lease_period
  ON public.receipts (lease_id, period)
  WHERE deleted_at IS NULL;

-- Compound index for active lease lookups by property
CREATE INDEX IF NOT EXISTS idx_leases_property_status
  ON public.leases (property_id, status)
  WHERE deleted_at IS NULL;

-- Index for receipt status filtering (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_receipts_account_status
  ON public.receipts (account_id, status)
  WHERE deleted_at IS NULL;


-- ---------------------------------------------------------------------------
-- 4. CHECK CONSTRAINTS FOR ENUM-LIKE COLUMNS
-- Wrapped in DO blocks so the migration is idempotent — if a constraint
-- already exists, the duplicate_object exception is caught and ignored.
-- ---------------------------------------------------------------------------

-- 4a. leases.currency must be ARS or USD
DO $$ BEGIN
  ALTER TABLE public.leases ADD CONSTRAINT leases_currency_check
    CHECK (currency IN ('ARS', 'USD'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4b. payments.currency must be ARS or USD
DO $$ BEGIN
  ALTER TABLE public.payments ADD CONSTRAINT payments_currency_check
    CHECK (currency IN ('ARS', 'USD'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4c. leases.adjustment_type enum
DO $$ BEGIN
  ALTER TABLE public.leases ADD CONSTRAINT leases_adjustment_type_check
    CHECK (adjustment_type IS NULL OR adjustment_type IN ('percentage', 'index', 'fixed_amount', 'manual'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4d. leases.adjustment_index enum
DO $$ BEGIN
  ALTER TABLE public.leases ADD CONSTRAINT leases_adjustment_index_check
    CHECK (adjustment_index IS NULL OR adjustment_index IN ('ICL', 'IPC', 'CER', 'CVS', 'UVA'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4e. receipts.signature_status enum
DO $$ BEGIN
  ALTER TABLE public.receipts ADD CONSTRAINT receipts_signature_status_check
    CHECK (signature_status IS NULL OR signature_status IN ('pending', 'landlord_signed', 'fully_signed', 'declined', 'expired'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4f. payments.provider enum
DO $$ BEGIN
  ALTER TABLE public.payments ADD CONSTRAINT payments_provider_check
    CHECK (provider IN ('manual', 'mercadopago'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ---------------------------------------------------------------------------
-- 5. DATE RANGE VALIDATION ON LEASES
-- end_date must be on or after start_date (if set).
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.leases ADD CONSTRAINT leases_date_range_check
    CHECK (end_date IS NULL OR end_date >= start_date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ---------------------------------------------------------------------------
-- 6. PREVENT REMOVAL / DEMOTION OF THE LAST ACCOUNT OWNER
-- Two triggers on account_users:
--   a) BEFORE DELETE — block deleting the last owner
--   b) BEFORE UPDATE — block changing the last owner's role to non-owner
-- ---------------------------------------------------------------------------

-- 6a. Trigger function: prevent deleting the last owner
CREATE OR REPLACE FUNCTION public.prevent_last_owner_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.account_users
      WHERE account_id = OLD.account_id
        AND role = 'owner'
        AND id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'Cannot remove the last owner of an account'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

-- Drop and recreate trigger to ensure idempotency
DROP TRIGGER IF EXISTS trg_prevent_last_owner_removal ON public.account_users;

CREATE TRIGGER trg_prevent_last_owner_removal
  BEFORE DELETE ON public.account_users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_owner_removal();

-- 6b. Trigger function: prevent changing the last owner's role
CREATE OR REPLACE FUNCTION public.prevent_last_owner_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'owner' AND NEW.role <> 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.account_users
      WHERE account_id = OLD.account_id
        AND role = 'owner'
        AND id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'Cannot change role of the last owner'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_owner_role_change ON public.account_users;

CREATE TRIGGER trg_prevent_last_owner_role_change
  BEFORE UPDATE ON public.account_users
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.prevent_last_owner_role_change();


-- ---------------------------------------------------------------------------
-- 7. STALE RATE_LIMITS CLEANUP FUNCTION
-- More aggressive cleanup (1 hour instead of 1 day from the original).
-- Can be called from Vercel cron, Supabase scheduled functions, or pg_cron.
-- NOTE: The original cleanup_rate_limits() from migration
-- 20260411140000_rate_limits_and_hellosign_events.sql uses a 1-day window.
-- This companion function uses a 1-hour window for tighter cleanup when
-- invoked more frequently.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_stale_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '1 hour';
$$;

COMMENT ON FUNCTION public.cleanup_stale_rate_limits IS
  'Deletes rate_limit rows older than 1 hour. '
  'Call from Vercel cron or Supabase scheduled function for regular cleanup.';


-- ---------------------------------------------------------------------------
-- 8. ADD AMOUNT VALIDATION TO finalize_receipt()
-- The existing function allows finalizing a receipt with a zero or negative
-- total (e.g., if all line items are discounts). This guard prevents that.
-- Full function replacement (CREATE OR REPLACE) to add the check.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_receipt(
  p_actor_user_id uuid,
  p_account_id    uuid,
  p_receipt_id    uuid
)
RETURNS public.receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt    public.receipts;
  v_total      numeric;
  v_line_items jsonb;
BEGIN
  -- Lock the receipt row
  SELECT * INTO v_receipt
  FROM   public.receipts
  WHERE  id         = p_receipt_id
    AND  account_id = p_account_id
    AND  deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: receipt % not found', p_receipt_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_receipt.status <> 'draft' THEN
    RAISE EXCEPTION 'invalid_state: can only finalize draft receipts (current: %)', v_receipt.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Sum line items
  SELECT COALESCE(SUM(amount), 0)
  INTO   v_total
  FROM   public.receipt_line_items
  WHERE  receipt_id = p_receipt_id;

  -- NEW: Validate total amount is positive before finalizing
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: receipt total must be greater than zero (got %)', v_total
      USING ERRCODE = 'check_violation';
  END IF;

  -- Freeze line items into snapshot_payload
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'label',     rli.label,
      'amount',    rli.amount,
      'item_type', rli.item_type
    ) ORDER BY rli.sort_order, rli.created_at
  ), '[]'::jsonb)
  INTO v_line_items
  FROM public.receipt_line_items rli
  WHERE rli.receipt_id = p_receipt_id;

  -- Update receipt: set total, freeze payload, promote to generated
  UPDATE public.receipts
  SET    snapshot_amount  = v_total,
         snapshot_payload = v_line_items,
         status           = 'generated'
  WHERE  id = p_receipt_id
  RETURNING * INTO v_receipt;

  -- Audit log
  INSERT INTO public.audit_logs (
    account_id, actor_user_id, entity_type, entity_id, action, metadata
  ) VALUES (
    p_account_id,
    p_actor_user_id,
    'receipt',
    p_receipt_id,
    'receipt_finalized',
    jsonb_build_object(
      'total_amount', v_total,
      'line_items',   v_line_items
    )
  );

  RETURN v_receipt;
END;
$$;

COMMENT ON FUNCTION public.finalize_receipt IS
  'Finalizes a draft receipt: sums line items, validates total > 0, freezes payload, promotes to generated status.';
