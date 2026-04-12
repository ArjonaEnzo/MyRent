-- =============================================================================
-- Migration: Base schema for MyRent
-- Date: 2026-04-08
-- Description: Creates all foundational tables, functions, triggers, RLS
--   policies, views, and indexes. This migration runs FIRST before all others.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLES (in FK-dependency order)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. accounts
CREATE TABLE IF NOT EXISTS public.accounts (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id)
);

-- 1b. profiles (references auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid        NOT NULL,
  full_name  text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey    PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 1c. account_users (join table: accounts <-> auth.users)
CREATE TABLE IF NOT EXISTS public.account_users (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid        NOT NULL,
  user_id    uuid        NOT NULL,
  role       text        NOT NULL CHECK (role IN ('owner', 'admin', 'assistant', 'accountant', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_users_pkey            PRIMARY KEY (id),
  CONSTRAINT account_users_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT account_users_user_id_fkey    FOREIGN KEY (user_id)    REFERENCES auth.users(id),
  CONSTRAINT account_users_account_user_uq UNIQUE (account_id, user_id)
);

-- 1d. properties
CREATE TABLE IF NOT EXISTS public.properties (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_id      uuid        NOT NULL,
  name            text        NOT NULL,
  address         text        NOT NULL,
  cover_image_url text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  deleted_by      uuid,
  delete_reason   text,
  CONSTRAINT properties_pkey            PRIMARY KEY (id),
  CONSTRAINT properties_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT properties_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id)
);

-- 1e. property_images
CREATE TABLE IF NOT EXISTS public.property_images (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_id   uuid        NOT NULL,
  property_id  uuid        NOT NULL,
  storage_path text        NOT NULL,
  url          text        NOT NULL,
  is_cover     boolean     NOT NULL DEFAULT false,
  position     integer     NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_images_pkey            PRIMARY KEY (id),
  CONSTRAINT property_images_account_id_fkey  FOREIGN KEY (account_id)  REFERENCES public.accounts(id),
  CONSTRAINT property_images_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

-- 1f. tenants (auth_user_id added by tenant_payments_foundation migration)
CREATE TABLE IF NOT EXISTS public.tenants (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_id    uuid        NOT NULL,
  full_name     text        NOT NULL,
  email         text,
  phone         text,
  dni_cuit      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  deleted_by    uuid,
  delete_reason text,
  CONSTRAINT tenants_pkey            PRIMARY KEY (id),
  CONSTRAINT tenants_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT tenants_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id)
);

-- 1g. leases
-- NOTE: billing_day, auto_billing_enabled are added by 20260412000000_auto_billing.sql
-- NOTE: adjustment_* columns are included here as they are used by backend_improvements RPC
CREATE TABLE IF NOT EXISTS public.leases (
  id                          uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_id                  uuid        NOT NULL,
  property_id                 uuid        NOT NULL,
  tenant_id                   uuid        NOT NULL,
  start_date                  date        NOT NULL,
  end_date                    date,
  rent_amount                 numeric     NOT NULL CHECK (rent_amount > 0),
  currency                    text        NOT NULL DEFAULT 'ARS',
  status                      text        NOT NULL CHECK (status IN ('draft', 'active', 'ended', 'cancelled')),
  notes                       text,
  adjustment_type             text,
  adjustment_frequency_months integer,
  adjustment_percentage       numeric,
  adjustment_index            text,
  adjustment_fixed_amount     numeric,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  deleted_at                  timestamptz,
  deleted_by                  uuid,
  delete_reason               text,
  CONSTRAINT leases_pkey            PRIMARY KEY (id),
  CONSTRAINT leases_account_id_fkey  FOREIGN KEY (account_id)  REFERENCES public.accounts(id),
  CONSTRAINT leases_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT leases_tenant_id_fkey   FOREIGN KEY (tenant_id)   REFERENCES public.tenants(id),
  CONSTRAINT leases_deleted_by_fkey  FOREIGN KEY (deleted_by)  REFERENCES auth.users(id)
);

-- 1h. lease_adjustments
CREATE TABLE IF NOT EXISTS public.lease_adjustments (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_id       uuid        NOT NULL,
  lease_id         uuid        NOT NULL,
  effective_date   date        NOT NULL,
  previous_amount  numeric     NOT NULL,
  new_amount       numeric     NOT NULL,
  adjustment_type  text        NOT NULL,
  adjustment_value numeric,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lease_adjustments_pkey            PRIMARY KEY (id),
  CONSTRAINT lease_adjustments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT lease_adjustments_lease_id_fkey   FOREIGN KEY (lease_id)   REFERENCES public.leases(id)
);

-- 1i. receipts
-- NOTE: auto_generated column is added by 20260412000000_auto_billing.sql
CREATE TABLE IF NOT EXISTS public.receipts (
  id                        uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_id                uuid        NOT NULL,
  lease_id                  uuid        NOT NULL,
  property_id               uuid        NOT NULL,
  tenant_id                 uuid        NOT NULL,
  period                    text        NOT NULL,
  status                    text        NOT NULL CHECK (status IN ('draft', 'generated', 'sent', 'signature_pending', 'signed', 'paid', 'cancelled', 'failed')),
  snapshot_tenant_name      text        NOT NULL,
  snapshot_tenant_dni_cuit  text,
  snapshot_property_address text        NOT NULL,
  snapshot_amount           numeric     NOT NULL CHECK (snapshot_amount > 0),
  snapshot_currency         text        NOT NULL,
  snapshot_payload          jsonb,
  storage_path              text,
  pdf_url                   text,
  email_sent                boolean     NOT NULL DEFAULT false,
  description               text,
  -- signature fields
  signature_provider        text,
  signature_request_id      text,
  signature_status          text,
  landlord_signed_at        timestamptz,
  tenant_signed_at          timestamptz,
  -- timestamps & soft delete
  created_at                timestamptz NOT NULL DEFAULT now(),
  deleted_at                timestamptz,
  deleted_by                uuid,
  delete_reason             text,
  CONSTRAINT receipts_pkey            PRIMARY KEY (id),
  CONSTRAINT receipts_account_id_fkey  FOREIGN KEY (account_id)  REFERENCES public.accounts(id),
  CONSTRAINT receipts_lease_id_fkey    FOREIGN KEY (lease_id)    REFERENCES public.leases(id),
  CONSTRAINT receipts_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT receipts_tenant_id_fkey   FOREIGN KEY (tenant_id)   REFERENCES public.tenants(id),
  CONSTRAINT receipts_deleted_by_fkey  FOREIGN KEY (deleted_by)  REFERENCES auth.users(id)
);

-- Unique: one receipt per tenant per period (among active records)
CREATE UNIQUE INDEX IF NOT EXISTS receipts_tenant_period_udx
  ON public.receipts (tenant_id, period)
  WHERE deleted_at IS NULL;

-- 1j. payments
-- NOTE: provider columns are added by 20260408120000_tenant_payments_foundation.sql
-- This base table has the original columns; the later migration ALTERs it.
CREATE TABLE IF NOT EXISTS public.payments (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_id     uuid        NOT NULL,
  receipt_id     uuid        NOT NULL,
  amount         numeric     NOT NULL CHECK (amount > 0),
  currency       text        NOT NULL DEFAULT 'ARS',
  payment_method text,
  status         text        NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  paid_at        timestamptz,
  reference      text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz,
  deleted_by     uuid,
  delete_reason  text,
  CONSTRAINT payments_pkey            PRIMARY KEY (id),
  CONSTRAINT payments_account_id_fkey  FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT payments_receipt_id_fkey  FOREIGN KEY (receipt_id) REFERENCES public.receipts(id),
  CONSTRAINT payments_deleted_by_fkey  FOREIGN KEY (deleted_by) REFERENCES auth.users(id)
);

-- 1k. signature_events
CREATE TABLE IF NOT EXISTS public.signature_events (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_id   uuid        NOT NULL,
  receipt_id   uuid        NOT NULL,
  event_type   text        NOT NULL,
  signer_email text,
  signer_role  text,
  event_data   jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signature_events_pkey            PRIMARY KEY (id),
  CONSTRAINT signature_events_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT signature_events_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id)
);

-- 1l. audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id             uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_id     uuid        NOT NULL,
  actor_user_id  uuid,
  entity_type    text        NOT NULL,
  entity_id      uuid,
  action         text        NOT NULL,
  metadata       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey               PRIMARY KEY (id),
  CONSTRAINT audit_logs_account_id_fkey    FOREIGN KEY (account_id)    REFERENCES public.accounts(id),
  CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id)
);

-- NOTE: payment_events table is created by 20260408120000_tenant_payments_foundation.sql
-- NOTE: hellosign_events table is created by 20260411140000_rate_limits_and_hellosign_events.sql
-- NOTE: rate_limits table is created by 20260411140000_rate_limits_and_hellosign_events.sql
-- NOTE: receipt_line_items table is created by 20260412000000_auto_billing.sql


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- 2a. set_updated_at() — generic trigger function for updated_at columns
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2b. has_account_role() — checks if user holds one of the specified roles
CREATE OR REPLACE FUNCTION public.has_account_role(
  p_account_id uuid,
  p_user_id    uuid,
  p_roles      text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM   public.account_users
    WHERE  account_id = p_account_id
      AND  user_id    = p_user_id
      AND  role       = ANY(p_roles)
  );
END;
$$;

COMMENT ON FUNCTION public.has_account_role IS
  'Returns true if user holds one of the specified roles on the account.';

-- 2c. is_account_member() — checks if current auth.uid() is a member of account
CREATE OR REPLACE FUNCTION public.is_account_member(target_account_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM   public.account_users
    WHERE  account_id = target_account_id
      AND  user_id    = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION public.is_account_member IS
  'Returns true if current auth user is a member of the specified account.';

-- 2d. handle_new_user() — trigger function for auto-provisioning on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id uuid;
  v_full_name  text;
BEGIN
  -- Extract full_name from raw_user_meta_data if available
  v_full_name := NEW.raw_user_meta_data ->> 'full_name';

  -- Create profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, v_full_name)
  ON CONFLICT (id) DO NOTHING;

  -- Auto-provision account + account_users entry
  INSERT INTO public.accounts (name)
  VALUES (COALESCE(v_full_name, 'Mi cuenta'))
  RETURNING id INTO v_account_id;

  INSERT INTO public.account_users (account_id, user_id, role)
  VALUES (v_account_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS
  'Trigger function: auto-creates profile, account, and account_users entry for new auth users.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BUSINESS RPC FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- 3a. archive_property()
CREATE OR REPLACE FUNCTION public.archive_property(
  p_actor_user_id uuid,
  p_account_id    uuid,
  p_property_id   uuid,
  p_reason        text DEFAULT NULL
)
RETURNS public.properties
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property public.properties;
  v_active_leases integer;
BEGIN
  -- Check role
  IF NOT public.has_account_role(p_account_id, p_actor_user_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'insufficient_privilege: user % does not have required role on account %',
      p_actor_user_id, p_account_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Verify property exists
  SELECT * INTO v_property
  FROM   public.properties
  WHERE  id         = p_property_id
    AND  account_id = p_account_id
    AND  deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: property % not found', p_property_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Check for active leases
  SELECT count(*) INTO v_active_leases
  FROM   public.leases
  WHERE  property_id = p_property_id
    AND  account_id  = p_account_id
    AND  status      = 'active'
    AND  deleted_at  IS NULL;

  IF v_active_leases > 0 THEN
    RAISE EXCEPTION 'invalid_state: cannot archive property with active leases'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Soft delete
  UPDATE public.properties
  SET    deleted_at    = now(),
         deleted_by    = p_actor_user_id,
         delete_reason = p_reason
  WHERE  id = p_property_id
  RETURNING * INTO v_property;

  -- Audit
  INSERT INTO public.audit_logs (
    account_id, actor_user_id, entity_type, entity_id, action, metadata
  ) VALUES (
    p_account_id,
    p_actor_user_id,
    'property',
    p_property_id,
    'property_archived',
    jsonb_build_object('reason', p_reason, 'property_name', v_property.name)
  );

  RETURN v_property;
END;
$$;

COMMENT ON FUNCTION public.archive_property IS
  'Soft-archives a property if no active leases exist. Enforces owner/admin role.';

-- 3b. archive_tenant()
CREATE OR REPLACE FUNCTION public.archive_tenant(
  p_actor_user_id uuid,
  p_account_id    uuid,
  p_tenant_id     uuid,
  p_reason        text DEFAULT NULL
)
RETURNS public.tenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant public.tenants;
  v_active_leases integer;
BEGIN
  -- Check role
  IF NOT public.has_account_role(p_account_id, p_actor_user_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'insufficient_privilege: user % does not have required role on account %',
      p_actor_user_id, p_account_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Verify tenant exists
  SELECT * INTO v_tenant
  FROM   public.tenants
  WHERE  id         = p_tenant_id
    AND  account_id = p_account_id
    AND  deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: tenant % not found', p_tenant_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Check for active leases
  SELECT count(*) INTO v_active_leases
  FROM   public.leases
  WHERE  tenant_id  = p_tenant_id
    AND  account_id = p_account_id
    AND  status     = 'active'
    AND  deleted_at IS NULL;

  IF v_active_leases > 0 THEN
    RAISE EXCEPTION 'invalid_state: cannot archive tenant with active leases'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Soft delete
  UPDATE public.tenants
  SET    deleted_at    = now(),
         deleted_by    = p_actor_user_id,
         delete_reason = p_reason
  WHERE  id = p_tenant_id
  RETURNING * INTO v_tenant;

  -- Audit
  INSERT INTO public.audit_logs (
    account_id, actor_user_id, entity_type, entity_id, action, metadata
  ) VALUES (
    p_account_id,
    p_actor_user_id,
    'tenant',
    p_tenant_id,
    'tenant_archived',
    jsonb_build_object('reason', p_reason, 'tenant_name', v_tenant.full_name)
  );

  RETURN v_tenant;
END;
$$;

COMMENT ON FUNCTION public.archive_tenant IS
  'Soft-archives a tenant if no active leases exist. Enforces owner/admin role.';

-- 3c. cancel_receipt()
CREATE OR REPLACE FUNCTION public.cancel_receipt(
  p_actor_user_id uuid,
  p_account_id    uuid,
  p_receipt_id    uuid,
  p_reason        text DEFAULT NULL
)
RETURNS public.receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt public.receipts;
  v_paid_payments integer;
BEGIN
  -- Check role
  IF NOT public.has_account_role(p_account_id, p_actor_user_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'insufficient_privilege: user % does not have required role on account %',
      p_actor_user_id, p_account_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Verify receipt exists
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

  -- Cannot cancel if paid payments exist
  SELECT count(*) INTO v_paid_payments
  FROM   public.payments
  WHERE  receipt_id = p_receipt_id
    AND  status     = 'paid'
    AND  deleted_at IS NULL;

  IF v_paid_payments > 0 THEN
    RAISE EXCEPTION 'invalid_state: cannot cancel receipt with paid payments'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Soft cancel
  UPDATE public.receipts
  SET    status        = 'cancelled',
         deleted_at    = now(),
         deleted_by    = p_actor_user_id,
         delete_reason = p_reason
  WHERE  id = p_receipt_id
  RETURNING * INTO v_receipt;

  -- Audit
  INSERT INTO public.audit_logs (
    account_id, actor_user_id, entity_type, entity_id, action, metadata
  ) VALUES (
    p_account_id,
    p_actor_user_id,
    'receipt',
    p_receipt_id,
    'receipt_cancelled',
    jsonb_build_object('reason', p_reason)
  );

  RETURN v_receipt;
END;
$$;

COMMENT ON FUNCTION public.cancel_receipt IS
  'Soft-cancels a receipt. Cannot cancel if paid payments exist. Enforces owner/admin role.';

-- 3d. prevent_receipt_mutation() — trigger function
CREATE OR REPLACE FUNCTION public.prevent_receipt_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow status-only changes on non-draft receipts
  IF OLD.status NOT IN ('draft') THEN
    -- Only allow changes to: status, deleted_at, deleted_by, delete_reason,
    -- pdf_url, storage_path, email_sent, signature_* fields
    IF (
      NEW.snapshot_tenant_name      IS DISTINCT FROM OLD.snapshot_tenant_name OR
      NEW.snapshot_tenant_dni_cuit  IS DISTINCT FROM OLD.snapshot_tenant_dni_cuit OR
      NEW.snapshot_property_address IS DISTINCT FROM OLD.snapshot_property_address OR
      NEW.snapshot_amount           IS DISTINCT FROM OLD.snapshot_amount OR
      NEW.snapshot_currency         IS DISTINCT FROM OLD.snapshot_currency OR
      NEW.period                    IS DISTINCT FROM OLD.period OR
      NEW.lease_id                  IS DISTINCT FROM OLD.lease_id OR
      NEW.property_id              IS DISTINCT FROM OLD.property_id OR
      NEW.tenant_id                IS DISTINCT FROM OLD.tenant_id
    ) THEN
      RAISE EXCEPTION 'immutable_receipt: cannot modify snapshot fields on non-draft receipts'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_receipt_mutation IS
  'Trigger function: prevents modification of snapshot fields on non-draft receipts.';

-- 3e. register_payment()
CREATE OR REPLACE FUNCTION public.register_payment(
  p_actor_user_id  uuid,
  p_account_id     uuid,
  p_receipt_id     uuid,
  p_amount         numeric,
  p_currency       text    DEFAULT 'ARS',
  p_payment_method text    DEFAULT NULL,
  p_reference      text    DEFAULT NULL,
  p_notes          text    DEFAULT NULL
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt public.receipts;
  v_payment public.payments;
BEGIN
  -- Check role
  IF NOT public.has_account_role(p_account_id, p_actor_user_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'insufficient_privilege: user % does not have required role on account %',
      p_actor_user_id, p_account_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Verify receipt exists and is not deleted/cancelled
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

  IF v_receipt.status = 'cancelled' THEN
    RAISE EXCEPTION 'invalid_state: cannot register payment on cancelled receipt'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_input: amount must be greater than 0'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Insert payment
  INSERT INTO public.payments (
    account_id, receipt_id, amount, currency, payment_method,
    status, paid_at, reference, notes
  ) VALUES (
    p_account_id, p_receipt_id, p_amount, p_currency, p_payment_method,
    'paid', now(), p_reference, p_notes
  )
  RETURNING * INTO v_payment;

  -- Mark receipt as paid
  UPDATE public.receipts
  SET    status = 'paid'
  WHERE  id = p_receipt_id;

  -- Audit
  INSERT INTO public.audit_logs (
    account_id, actor_user_id, entity_type, entity_id, action, metadata
  ) VALUES (
    p_account_id,
    p_actor_user_id,
    'payment',
    v_payment.id,
    'payment_registered',
    jsonb_build_object(
      'receipt_id',     p_receipt_id,
      'amount',         p_amount,
      'currency',       p_currency,
      'payment_method', p_payment_method
    )
  );

  RETURN v_payment;
END;
$$;

COMMENT ON FUNCTION public.register_payment IS
  'Atomically registers a manual payment, marks receipt as paid, and writes audit log.';

-- 3f. append_signature_event()
CREATE OR REPLACE FUNCTION public.append_signature_event(
  p_actor_user_id uuid,
  p_account_id    uuid,
  p_receipt_id    uuid,
  p_event_type    text,
  p_signer_email  text  DEFAULT NULL,
  p_signer_role   text  DEFAULT NULL,
  p_event_data    jsonb DEFAULT '{}'::jsonb
)
RETURNS public.signature_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt public.receipts;
  v_event   public.signature_events;
BEGIN
  -- Verify receipt exists
  SELECT * INTO v_receipt
  FROM   public.receipts
  WHERE  id         = p_receipt_id
    AND  account_id = p_account_id
    AND  deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: receipt % not found', p_receipt_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Insert signature event
  INSERT INTO public.signature_events (
    account_id, receipt_id, event_type, signer_email, signer_role, event_data
  ) VALUES (
    p_account_id, p_receipt_id, p_event_type, p_signer_email, p_signer_role, p_event_data
  )
  RETURNING * INTO v_event;

  -- Update receipt signature status based on event type
  IF p_event_type = 'signature_requested' AND v_receipt.signature_status IS NULL THEN
    UPDATE public.receipts
    SET    signature_status = 'pending',
           status           = 'signature_pending'
    WHERE  id = p_receipt_id;
  ELSIF p_event_type = 'signature_request_signed' AND p_signer_role = 'landlord' THEN
    UPDATE public.receipts
    SET    signature_status   = 'landlord_signed',
           landlord_signed_at = now()
    WHERE  id = p_receipt_id;
  ELSIF p_event_type = 'signature_request_all_signed' THEN
    UPDATE public.receipts
    SET    signature_status = 'fully_signed',
           tenant_signed_at = now(),
           status           = 'signed'
    WHERE  id = p_receipt_id;
  ELSIF p_event_type = 'signature_request_declined' THEN
    UPDATE public.receipts
    SET    signature_status = 'declined'
    WHERE  id = p_receipt_id;
  END IF;

  -- Audit
  INSERT INTO public.audit_logs (
    account_id, actor_user_id, entity_type, entity_id, action, metadata
  ) VALUES (
    p_account_id,
    p_actor_user_id,
    'receipt',
    p_receipt_id,
    'signature_event',
    jsonb_build_object(
      'event_type',   p_event_type,
      'signer_email', p_signer_email,
      'signer_role',  p_signer_role
    )
  );

  RETURN v_event;
END;
$$;

COMMENT ON FUNCTION public.append_signature_event IS
  'Appends a signature event and updates receipt signature status. Idempotent for signature_requested in pending state.';

-- 3g. issue_receipt() — base version (will be replaced by backend_improvements migration)
CREATE OR REPLACE FUNCTION public.issue_receipt(
  p_actor_user_id uuid,
  p_account_id    uuid,
  p_lease_id      uuid,
  p_period        text,
  p_description   text DEFAULT NULL
)
RETURNS public.receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease   RECORD;
  v_receipt public.receipts;
BEGIN
  -- Resolve lease + tenant + property data
  SELECT
    l.id              AS lease_id,
    l.account_id,
    l.property_id,
    l.tenant_id,
    l.rent_amount,
    l.currency,
    l.status,
    t.full_name       AS tenant_name,
    t.dni_cuit        AS tenant_dni_cuit,
    p.address         AS property_address
  INTO v_lease
  FROM  public.leases     l
  JOIN  public.tenants    t ON t.id = l.tenant_id    AND t.deleted_at IS NULL
  JOIN  public.properties p ON p.id = l.property_id  AND p.deleted_at IS NULL
  WHERE l.id         = p_lease_id
    AND l.account_id = p_account_id
    AND l.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: lease % not found', p_lease_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_lease.status <> 'active' THEN
    RAISE EXCEPTION 'invalid_state: can only issue receipts for active leases'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Idempotency
  SELECT * INTO v_receipt
  FROM   public.receipts
  WHERE  lease_id   = p_lease_id
    AND  period     = p_period
    AND  deleted_at IS NULL
  LIMIT  1;

  IF FOUND THEN
    RETURN v_receipt;
  END IF;

  -- Create receipt with snapshot
  INSERT INTO public.receipts (
    account_id, lease_id, property_id, tenant_id,
    period, status,
    snapshot_tenant_name, snapshot_tenant_dni_cuit,
    snapshot_property_address, snapshot_amount, snapshot_currency,
    description
  ) VALUES (
    p_account_id, p_lease_id, v_lease.property_id, v_lease.tenant_id,
    p_period, 'draft',
    v_lease.tenant_name, v_lease.tenant_dni_cuit,
    v_lease.property_address, v_lease.rent_amount, v_lease.currency,
    p_description
  )
  RETURNING * INTO v_receipt;

  -- Audit
  INSERT INTO public.audit_logs (
    account_id, actor_user_id, entity_type, entity_id, action, metadata
  ) VALUES (
    p_account_id,
    p_actor_user_id,
    'receipt',
    v_receipt.id,
    'receipt_issued',
    jsonb_build_object(
      'lease_id', p_lease_id,
      'period',   p_period,
      'amount',   v_lease.rent_amount,
      'currency', v_lease.currency
    )
  );

  RETURN v_receipt;
END;
$$;

COMMENT ON FUNCTION public.issue_receipt IS
  'Creates a receipt snapshot for a lease period. Idempotent — returns existing receipt if already issued.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- 4a. Auth trigger: auto-provision on new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4b. updated_at triggers
CREATE OR REPLACE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_leases_updated_at
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4c. Prevent receipt snapshot mutation
CREATE OR REPLACE TRIGGER prevent_receipt_snapshot_mutation
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_receipt_mutation();


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;

-- ── accounts ────────────────────────────────────────────────────────────────
CREATE POLICY "accounts: members can read own account"
  ON public.accounts
  FOR SELECT
  USING (public.is_account_member(id));

CREATE POLICY "accounts: owners can update own account"
  ON public.accounts
  FOR UPDATE
  USING (public.has_account_role(id, auth.uid(), ARRAY['owner']));

-- ── profiles ────────────────────────────────────────────────────────────────
CREATE POLICY "profiles: users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles: users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow account members to read other members' profiles (for member lists)
CREATE POLICY "profiles: account members can read team profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.account_users au1
      JOIN public.account_users au2 ON au1.account_id = au2.account_id
      WHERE au1.user_id = auth.uid()
        AND au2.user_id = profiles.id
    )
  );

-- ── account_users ───────────────────────────────────────────────────────────
CREATE POLICY "account_users: members can read own account members"
  ON public.account_users
  FOR SELECT
  USING (public.is_account_member(account_id));

CREATE POLICY "account_users: owners can manage members"
  ON public.account_users
  FOR ALL
  USING (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin']));

-- ── properties ──────────────────────────────────────────────────────────────
CREATE POLICY "properties: members can read"
  ON public.properties
  FOR SELECT
  USING (public.is_account_member(account_id));

CREATE POLICY "properties: authorized roles can insert"
  ON public.properties
  FOR INSERT
  WITH CHECK (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin', 'assistant']));

CREATE POLICY "properties: authorized roles can update"
  ON public.properties
  FOR UPDATE
  USING (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin', 'assistant']));

CREATE POLICY "properties: authorized roles can delete"
  ON public.properties
  FOR DELETE
  USING (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin']));

-- ── property_images ─────────────────────────────────────────────────────────
CREATE POLICY "property_images: members can read"
  ON public.property_images
  FOR SELECT
  USING (public.is_account_member(account_id));

CREATE POLICY "property_images: authorized roles can insert"
  ON public.property_images
  FOR INSERT
  WITH CHECK (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin', 'assistant']));

CREATE POLICY "property_images: authorized roles can update"
  ON public.property_images
  FOR UPDATE
  USING (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin', 'assistant']));

CREATE POLICY "property_images: authorized roles can delete"
  ON public.property_images
  FOR DELETE
  USING (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin', 'assistant']));

-- ── tenants ─────────────────────────────────────────────────────────────────
CREATE POLICY "tenants: members can read"
  ON public.tenants
  FOR SELECT
  USING (public.is_account_member(account_id));

CREATE POLICY "tenants: authorized roles can insert"
  ON public.tenants
  FOR INSERT
  WITH CHECK (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin', 'assistant']));

CREATE POLICY "tenants: authorized roles can update"
  ON public.tenants
  FOR UPDATE
  USING (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin', 'assistant']));

CREATE POLICY "tenants: authorized roles can delete"
  ON public.tenants
  FOR DELETE
  USING (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin']));

-- ── leases ──────────────────────────────────────────────────────────────────
CREATE POLICY "leases: members can read"
  ON public.leases
  FOR SELECT
  USING (public.is_account_member(account_id));

CREATE POLICY "leases: authorized roles can insert"
  ON public.leases
  FOR INSERT
  WITH CHECK (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin', 'assistant']));

CREATE POLICY "leases: authorized roles can update"
  ON public.leases
  FOR UPDATE
  USING (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin', 'assistant']));

CREATE POLICY "leases: authorized roles can delete"
  ON public.leases
  FOR DELETE
  USING (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin']));

-- ── lease_adjustments ───────────────────────────────────────────────────────
CREATE POLICY "lease_adjustments: members can read"
  ON public.lease_adjustments
  FOR SELECT
  USING (public.is_account_member(account_id));

CREATE POLICY "lease_adjustments: authorized roles can insert"
  ON public.lease_adjustments
  FOR INSERT
  WITH CHECK (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin']));

-- ── receipts ────────────────────────────────────────────────────────────────
CREATE POLICY "receipts: members can read"
  ON public.receipts
  FOR SELECT
  USING (public.is_account_member(account_id));

CREATE POLICY "receipts: authorized roles can insert"
  ON public.receipts
  FOR INSERT
  WITH CHECK (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin', 'assistant']));

CREATE POLICY "receipts: authorized roles can update"
  ON public.receipts
  FOR UPDATE
  USING (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin', 'assistant']));

CREATE POLICY "receipts: authorized roles can delete"
  ON public.receipts
  FOR DELETE
  USING (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin']));

-- ── payments ────────────────────────────────────────────────────────────────
CREATE POLICY "payments: members can read"
  ON public.payments
  FOR SELECT
  USING (public.is_account_member(account_id));

CREATE POLICY "payments: authorized roles can insert"
  ON public.payments
  FOR INSERT
  WITH CHECK (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin']));

CREATE POLICY "payments: authorized roles can update"
  ON public.payments
  FOR UPDATE
  USING (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin']));

-- ── signature_events ────────────────────────────────────────────────────────
CREATE POLICY "signature_events: members can read"
  ON public.signature_events
  FOR SELECT
  USING (public.is_account_member(account_id));

CREATE POLICY "signature_events: authorized roles can insert"
  ON public.signature_events
  FOR INSERT
  WITH CHECK (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin']));

-- ── audit_logs ──────────────────────────────────────────────────────────────
CREATE POLICY "audit_logs: members can read"
  ON public.audit_logs
  FOR SELECT
  USING (public.is_account_member(account_id));

CREATE POLICY "audit_logs: authorized roles can insert"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (public.has_account_role(account_id, auth.uid(), ARRAY['owner', 'admin', 'assistant']));


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- account_users lookups
CREATE INDEX IF NOT EXISTS idx_account_users_user_id
  ON public.account_users (user_id);

CREATE INDEX IF NOT EXISTS idx_account_users_account_id
  ON public.account_users (account_id);

-- property_images by property
CREATE INDEX IF NOT EXISTS idx_property_images_property_id
  ON public.property_images (property_id);

-- leases by property and tenant
CREATE INDEX IF NOT EXISTS idx_leases_property_id
  ON public.leases (property_id);

CREATE INDEX IF NOT EXISTS idx_leases_tenant_id
  ON public.leases (tenant_id);

-- receipts by lease and tenant
CREATE INDEX IF NOT EXISTS idx_receipts_lease_id
  ON public.receipts (lease_id);

CREATE INDEX IF NOT EXISTS idx_receipts_tenant_id
  ON public.receipts (tenant_id);

CREATE INDEX IF NOT EXISTS idx_receipts_property_id
  ON public.receipts (property_id);

-- payments by receipt
CREATE INDEX IF NOT EXISTS idx_payments_receipt_id_base
  ON public.payments (receipt_id);

-- audit_logs by account and entity
CREATE INDEX IF NOT EXISTS idx_audit_logs_account_id
  ON public.audit_logs (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id);

-- signature_events by receipt
CREATE INDEX IF NOT EXISTS idx_signature_events_receipt_id
  ON public.signature_events (receipt_id);

-- lease_adjustments by lease
CREATE INDEX IF NOT EXISTS idx_lease_adjustments_lease_id
  ON public.lease_adjustments (lease_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

-- 7a. active_properties_overview
CREATE OR REPLACE VIEW public.active_properties_overview AS
SELECT
  p.id,
  p.account_id,
  p.name,
  p.address,
  p.created_at,
  p.updated_at
FROM public.properties p
WHERE p.deleted_at IS NULL;

-- 7b. active_tenants_overview
CREATE OR REPLACE VIEW public.active_tenants_overview AS
SELECT
  t.id,
  t.account_id,
  t.full_name,
  t.email,
  t.phone,
  t.dni_cuit,
  t.created_at,
  t.updated_at
FROM public.tenants t
WHERE t.deleted_at IS NULL;

-- 7c. leases_overview (NOTE: billing_day and auto_billing_enabled are added by auto_billing migration)
CREATE OR REPLACE VIEW public.leases_overview AS
SELECT
  l.id,
  l.account_id,
  l.property_id,
  l.tenant_id,
  l.status,
  l.rent_amount,
  l.currency,
  l.start_date,
  l.end_date,
  l.notes,
  l.adjustment_type,
  l.adjustment_frequency_months,
  l.adjustment_percentage,
  l.adjustment_index,
  l.adjustment_fixed_amount,
  l.created_at,
  l.updated_at,
  p.name      AS property_name,
  p.address   AS property_address,
  t.full_name AS tenant_name,
  t.email     AS tenant_email,
  t.phone     AS tenant_phone
FROM public.leases l
LEFT JOIN public.properties p ON p.id = l.property_id
LEFT JOIN public.tenants    t ON t.id = l.tenant_id
WHERE l.deleted_at IS NULL;

-- 7d. receipts_overview
CREATE OR REPLACE VIEW public.receipts_overview AS
SELECT
  r.id,
  r.account_id,
  r.lease_id,
  r.property_id,
  r.tenant_id,
  r.period,
  r.status,
  r.snapshot_amount,
  r.snapshot_currency,
  r.snapshot_tenant_name,
  r.snapshot_property_address,
  r.signature_status,
  r.email_sent,
  r.created_at,
  p.name      AS property_name,
  p.address   AS property_address,
  t.full_name AS tenant_name
FROM public.receipts r
LEFT JOIN public.properties p ON p.id = r.property_id
LEFT JOIN public.tenants    t ON t.id = r.tenant_id
WHERE r.deleted_at IS NULL;

-- 7e. active_receipts_overview
CREATE OR REPLACE VIEW public.active_receipts_overview AS
SELECT
  r.id,
  r.account_id,
  r.lease_id,
  r.property_id,
  r.tenant_id,
  r.period,
  r.status,
  r.snapshot_amount,
  r.snapshot_currency,
  r.snapshot_tenant_name,
  r.snapshot_property_address,
  r.signature_status,
  r.email_sent,
  r.description,
  r.created_at,
  p.name      AS property_name,
  p.address   AS property_address,
  t.full_name AS tenant_name,
  l.status    AS lease_status
FROM public.receipts r
LEFT JOIN public.properties p ON p.id = r.property_id
LEFT JOIN public.tenants    t ON t.id = r.tenant_id
LEFT JOIN public.leases     l ON l.id = r.lease_id
WHERE r.deleted_at IS NULL
  AND r.status <> 'cancelled';

-- 7f. payments_overview
CREATE OR REPLACE VIEW public.payments_overview AS
SELECT
  pay.id,
  pay.account_id,
  pay.receipt_id,
  pay.amount,
  pay.currency,
  pay.payment_method,
  pay.status,
  pay.paid_at,
  pay.reference,
  pay.notes,
  pay.created_at,
  r.period,
  r.status              AS receipt_status,
  r.snapshot_tenant_name,
  r.snapshot_property_address
FROM public.payments pay
LEFT JOIN public.receipts r ON r.id = pay.receipt_id
WHERE pay.deleted_at IS NULL;

-- 7g. active_payments_overview
CREATE OR REPLACE VIEW public.active_payments_overview AS
SELECT
  pay.id,
  pay.account_id,
  pay.receipt_id,
  pay.amount,
  pay.currency,
  pay.payment_method,
  pay.status,
  pay.paid_at,
  pay.reference,
  pay.notes,
  pay.created_at,
  r.period,
  r.status              AS receipt_status,
  r.signature_status,
  r.snapshot_tenant_name,
  r.snapshot_property_address
FROM public.payments pay
LEFT JOIN public.receipts r ON r.id = pay.receipt_id
WHERE pay.deleted_at IS NULL
  AND pay.status NOT IN ('cancelled', 'failed');

-- 7h. active_payments_clean_overview (excludes cancelled/failed and deleted receipts)
CREATE OR REPLACE VIEW public.active_payments_clean_overview AS
SELECT
  pay.id,
  pay.account_id,
  pay.receipt_id,
  pay.amount,
  pay.currency,
  pay.payment_method,
  pay.status,
  pay.paid_at,
  pay.reference,
  pay.notes,
  pay.created_at,
  r.period,
  r.status              AS receipt_status,
  r.signature_status,
  r.snapshot_tenant_name,
  r.snapshot_property_address
FROM public.payments pay
JOIN public.receipts r ON r.id = pay.receipt_id AND r.deleted_at IS NULL
WHERE pay.deleted_at IS NULL
  AND pay.status NOT IN ('cancelled', 'failed');

-- 7i. account_dashboard_overview
CREATE OR REPLACE VIEW public.account_dashboard_overview AS
SELECT
  a.id   AS account_id,
  a.name AS account_name,
  (SELECT count(*) FROM public.properties p WHERE p.account_id = a.id AND p.deleted_at IS NULL)  AS active_properties_count,
  (SELECT count(*) FROM public.tenants    t WHERE t.account_id = a.id AND t.deleted_at IS NULL)  AS active_tenants_count,
  (SELECT count(*) FROM public.leases     l WHERE l.account_id = a.id AND l.status = 'active' AND l.deleted_at IS NULL) AS active_leases_count,
  (SELECT count(*) FROM public.receipts   r WHERE r.account_id = a.id AND r.status NOT IN ('cancelled', 'failed') AND r.deleted_at IS NULL) AS active_receipts_count,
  (SELECT COALESCE(sum(pay.amount), 0) FROM public.payments pay WHERE pay.account_id = a.id AND pay.status = 'paid' AND pay.deleted_at IS NULL) AS total_paid_amount
FROM public.accounts a;

-- 7j. account_members_overview
CREATE OR REPLACE VIEW public.account_members_overview AS
SELECT
  au.id      AS account_user_id,
  au.account_id,
  au.user_id,
  au.role,
  au.created_at,
  pr.full_name
FROM public.account_users au
LEFT JOIN public.profiles pr ON pr.id = au.user_id;

-- 7k. receipt_timeline_overview
CREATE OR REPLACE VIEW public.receipt_timeline_overview AS
SELECT
  r.id AS receipt_id,
  r.account_id,
  'receipt_created'::text AS event_kind,
  r.created_at AS event_at,
  jsonb_build_object('status', r.status, 'amount', r.snapshot_amount) AS event_data
FROM public.receipts r
WHERE r.deleted_at IS NULL
UNION ALL
SELECT
  se.receipt_id,
  se.account_id,
  se.event_type AS event_kind,
  se.created_at AS event_at,
  se.event_data
FROM public.signature_events se
UNION ALL
SELECT
  r.id AS receipt_id,
  pay.account_id,
  'payment_' || pay.status AS event_kind,
  COALESCE(pay.paid_at, pay.created_at) AS event_at,
  jsonb_build_object('amount', pay.amount, 'payment_method', pay.payment_method) AS event_data
FROM public.payments pay
JOIN public.receipts r ON r.id = pay.receipt_id
WHERE pay.deleted_at IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────────────────────

-- Property images bucket (private, signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Receipts bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES (
  'receipts',
  'receipts',
  false
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for property-images
CREATE POLICY "property-images: authenticated users can read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "property-images: account members can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "property-images: account members can update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "property-images: account members can delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

-- Storage RLS policies for receipts
CREATE POLICY "receipts-storage: authenticated users can read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "receipts-storage: authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "receipts-storage: authenticated users can update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "receipts-storage: authenticated users can delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');
