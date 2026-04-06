-- ============================================================
-- Migration: Full schema — views, RPC functions, provisioning
-- Date: 2026-04-04
--
-- This migration creates:
--   1. All views required by the frontend
--   2. RPC functions called by the app (archive_property, archive_tenant,
--      issue_receipt, cancel_receipt, append_signature_event,
--      register_payment, has_account_role)
--   3. Automatic account provisioning trigger for new signups
--   4. RLS policies for all business tables
--
-- Apply after the base tables from db-schema.sql exist.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 0. Enable RLS on all business tables
-- ─────────────────────────────────────────────────────────────

ALTER TABLE accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants             ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases              ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────
-- 1. Helper: has_account_role
--    Used inside other RLS policies and RPC functions.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION has_account_role(
  p_account_id uuid,
  p_user_id    uuid,
  p_roles      text[]
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM account_users
    WHERE account_id = p_account_id
      AND user_id    = p_user_id
      AND role       = ANY(p_roles)
  );
$$;


-- ─────────────────────────────────────────────────────────────
-- 2. RLS Policies
-- ─────────────────────────────────────────────────────────────

-- accounts: members can see their own account
CREATE POLICY "Account members can view account"
  ON accounts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM account_users WHERE account_id = accounts.id AND user_id = auth.uid())
  );

-- account_users: members can view membership list
CREATE POLICY "Account members can view account_users"
  ON account_users FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM account_users au WHERE au.account_id = account_users.account_id AND au.user_id = auth.uid())
  );

-- profiles: users can view/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- properties: account members can read; owner/admin can write
CREATE POLICY "Account members can view properties"
  ON properties FOR SELECT
  USING (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant','accountant','viewer']));

CREATE POLICY "Owner/admin can insert properties"
  ON properties FOR INSERT
  WITH CHECK (has_account_role(account_id, auth.uid(), ARRAY['owner','admin']));

CREATE POLICY "Owner/admin can update properties"
  ON properties FOR UPDATE
  USING (has_account_role(account_id, auth.uid(), ARRAY['owner','admin']));

-- tenants
CREATE POLICY "Account members can view tenants"
  ON tenants FOR SELECT
  USING (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant','accountant','viewer']));

CREATE POLICY "Owner/admin can insert tenants"
  ON tenants FOR INSERT
  WITH CHECK (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant']));

CREATE POLICY "Owner/admin can update tenants"
  ON tenants FOR UPDATE
  USING (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant']));

-- leases
CREATE POLICY "Account members can view leases"
  ON leases FOR SELECT
  USING (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant','accountant','viewer']));

CREATE POLICY "Owner/admin can insert leases"
  ON leases FOR INSERT
  WITH CHECK (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant']));

CREATE POLICY "Owner/admin can update leases"
  ON leases FOR UPDATE
  USING (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant']));

-- receipts
CREATE POLICY "Account members can view receipts"
  ON receipts FOR SELECT
  USING (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant','accountant','viewer']));

CREATE POLICY "Owner/admin can insert receipts"
  ON receipts FOR INSERT
  WITH CHECK (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant']));

CREATE POLICY "Owner/admin can update receipts"
  ON receipts FOR UPDATE
  USING (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant']));

-- payments
CREATE POLICY "Account members can view payments"
  ON payments FOR SELECT
  USING (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant','accountant','viewer']));

CREATE POLICY "Owner/admin can insert payments"
  ON payments FOR INSERT
  WITH CHECK (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant']));

-- signature_events: service role inserts (from webhooks); members read
CREATE POLICY "Account members can view signature_events"
  ON signature_events FOR SELECT
  USING (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant','accountant','viewer']));

CREATE POLICY "Members can insert signature_events"
  ON signature_events FOR INSERT
  WITH CHECK (has_account_role(account_id, auth.uid(), ARRAY['owner','admin','assistant']));

-- audit_logs: read-only for owner/admin
CREATE POLICY "Owner/admin can view audit_logs"
  ON audit_logs FOR SELECT
  USING (has_account_role(account_id, auth.uid(), ARRAY['owner','admin']));


-- ─────────────────────────────────────────────────────────────
-- 3. Views
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW active_properties_overview AS
SELECT
  id,
  account_id,
  name,
  address,
  created_at,
  updated_at
FROM properties
WHERE deleted_at IS NULL;


CREATE OR REPLACE VIEW active_tenants_overview AS
SELECT
  id,
  account_id,
  full_name,
  email,
  phone,
  dni_cuit,
  created_at,
  updated_at
FROM tenants
WHERE deleted_at IS NULL;


CREATE OR REPLACE VIEW leases_overview AS
SELECT
  l.id,
  l.account_id,
  l.property_id,
  l.tenant_id,
  p.name        AS property_name,
  p.address     AS property_address,
  t.full_name   AS tenant_name,
  t.email       AS tenant_email,
  l.start_date,
  l.end_date,
  l.rent_amount,
  l.currency,
  l.status,
  l.notes,
  l.created_at,
  l.updated_at
FROM leases l
JOIN properties p ON p.id = l.property_id
JOIN tenants    t ON t.id = l.tenant_id
WHERE l.deleted_at IS NULL;


CREATE OR REPLACE VIEW active_receipts_overview AS
SELECT
  r.id,
  r.account_id,
  r.lease_id,
  r.property_id,
  r.tenant_id,
  r.period,
  r.status,
  r.snapshot_tenant_name,
  r.snapshot_property_address,
  r.snapshot_amount,
  r.snapshot_currency,
  r.pdf_url,
  r.email_sent,
  r.signature_status,
  r.description,
  r.created_at,
  t.email AS tenant_email
FROM receipts r
JOIN tenants  t ON t.id = r.tenant_id
WHERE r.deleted_at IS NULL;


CREATE OR REPLACE VIEW receipt_timeline_overview AS
SELECT
  id,
  account_id,
  period,
  status,
  snapshot_tenant_name,
  snapshot_amount,
  snapshot_currency,
  created_at,
  lease_id,
  tenant_id,
  property_id
FROM receipts
WHERE deleted_at IS NULL;


CREATE OR REPLACE VIEW account_dashboard_overview AS
SELECT
  a.id                                                                      AS account_id,
  COUNT(DISTINCT CASE WHEN p.deleted_at IS NULL THEN p.id END)              AS total_properties,
  COUNT(DISTINCT CASE WHEN t.deleted_at IS NULL THEN t.id END)              AS total_tenants,
  COUNT(DISTINCT CASE WHEN l.deleted_at IS NULL AND l.status = 'active'
                       THEN l.id END)                                        AS total_active_leases,
  COUNT(DISTINCT CASE WHEN r.deleted_at IS NULL
                        AND r.created_at >= date_trunc('month', now())
                       THEN r.id END)                                        AS receipts_this_month,
  COUNT(DISTINCT CASE WHEN r.deleted_at IS NULL THEN r.id END)              AS total_receipts
FROM accounts a
LEFT JOIN properties p ON p.account_id = a.id
LEFT JOIN tenants    t ON t.account_id = a.id
LEFT JOIN leases     l ON l.account_id = a.id
LEFT JOIN receipts   r ON r.account_id = a.id
GROUP BY a.id;


CREATE OR REPLACE VIEW active_payments_overview AS
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
  r.period               AS receipt_period,
  r.snapshot_tenant_name AS tenant_name
FROM payments pay
JOIN receipts r ON r.id = pay.receipt_id
WHERE pay.deleted_at IS NULL;


CREATE OR REPLACE VIEW account_members_overview AS
SELECT
  au.id,
  au.account_id,
  au.user_id,
  au.role,
  pr.full_name,
  u.email,
  au.created_at
FROM account_users au
JOIN auth.users  u  ON u.id  = au.user_id
LEFT JOIN profiles pr ON pr.id = au.user_id;


-- ─────────────────────────────────────────────────────────────
-- 4. RPC Functions
-- ─────────────────────────────────────────────────────────────

-- ── archive_property ────────────────────────────────────────

CREATE OR REPLACE FUNCTION archive_property(
  p_actor_user_id uuid,
  p_account_id    uuid,
  p_property_id   uuid,
  p_reason        text DEFAULT NULL
) RETURNS public.properties
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result public.properties;
BEGIN
  -- Role check: owner or admin only
  IF NOT has_account_role(p_account_id, p_actor_user_id, ARRAY['owner','admin']) THEN
    RAISE EXCEPTION 'Insufficient permissions to archive a property';
  END IF;

  -- Block: active leases
  IF EXISTS (
    SELECT 1 FROM leases
    WHERE property_id = p_property_id
      AND account_id  = p_account_id
      AND status      = 'active'
      AND deleted_at  IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot archive a property with active leases';
  END IF;

  UPDATE properties
  SET
    deleted_at    = now(),
    deleted_by    = p_actor_user_id,
    delete_reason = p_reason,
    updated_at    = now()
  WHERE id         = p_property_id
    AND account_id = p_account_id
    AND deleted_at IS NULL
  RETURNING * INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found or already archived';
  END IF;

  INSERT INTO audit_logs (account_id, actor_user_id, entity_type, entity_id, action, metadata)
  VALUES (p_account_id, p_actor_user_id, 'property', p_property_id, 'archive',
          jsonb_build_object('reason', p_reason));

  RETURN result;
END;
$$;


-- ── archive_tenant ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION archive_tenant(
  p_actor_user_id uuid,
  p_account_id    uuid,
  p_tenant_id     uuid,
  p_reason        text DEFAULT NULL
) RETURNS public.tenants
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result public.tenants;
BEGIN
  IF NOT has_account_role(p_account_id, p_actor_user_id, ARRAY['owner','admin']) THEN
    RAISE EXCEPTION 'Insufficient permissions to archive a tenant';
  END IF;

  IF EXISTS (
    SELECT 1 FROM leases
    WHERE tenant_id = p_tenant_id
      AND account_id = p_account_id
      AND status     = 'active'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot archive a tenant with active leases';
  END IF;

  UPDATE tenants
  SET
    deleted_at    = now(),
    deleted_by    = p_actor_user_id,
    delete_reason = p_reason,
    updated_at    = now()
  WHERE id         = p_tenant_id
    AND account_id = p_account_id
    AND deleted_at IS NULL
  RETURNING * INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant not found or already archived';
  END IF;

  INSERT INTO audit_logs (account_id, actor_user_id, entity_type, entity_id, action, metadata)
  VALUES (p_account_id, p_actor_user_id, 'tenant', p_tenant_id, 'archive',
          jsonb_build_object('reason', p_reason));

  RETURN result;
END;
$$;


-- ── issue_receipt ────────────────────────────────────────────
-- NOTE: The Next.js app handles PDF generation and Storage upload BEFORE
-- calling the DB. This RPC only handles the DB insert + audit.
-- The app does a direct insert instead of calling this RPC because
-- PDF generation must happen in the Node.js process first.
-- This RPC is included here for completeness and future use.

CREATE OR REPLACE FUNCTION issue_receipt(
  p_actor_user_id uuid,
  p_account_id    uuid,
  p_lease_id      uuid,
  p_period        text,
  p_description   text DEFAULT NULL
) RETURNS public.receipts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lease_row  leases_overview%ROWTYPE;
  result     public.receipts;
BEGIN
  IF NOT has_account_role(p_account_id, p_actor_user_id, ARRAY['owner','admin','assistant']) THEN
    RAISE EXCEPTION 'Insufficient permissions to issue a receipt';
  END IF;

  SELECT * INTO lease_row FROM leases_overview
  WHERE id = p_lease_id AND account_id = p_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lease not found';
  END IF;

  IF lease_row.status <> 'active' THEN
    RAISE EXCEPTION 'Cannot issue a receipt for a non-active lease';
  END IF;

  INSERT INTO receipts (
    account_id, lease_id, property_id, tenant_id, period,
    snapshot_tenant_name, snapshot_property_address,
    snapshot_amount, snapshot_currency,
    description
  ) VALUES (
    p_account_id, p_lease_id, lease_row.property_id, lease_row.tenant_id, p_period,
    lease_row.tenant_name, lease_row.property_address,
    lease_row.rent_amount, lease_row.currency,
    p_description
  )
  RETURNING * INTO result;

  INSERT INTO audit_logs (account_id, actor_user_id, entity_type, entity_id, action, metadata)
  VALUES (p_account_id, p_actor_user_id, 'receipt', result.id, 'issue',
          jsonb_build_object('period', p_period, 'lease_id', p_lease_id));

  RETURN result;
END;
$$;


-- ── cancel_receipt ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION cancel_receipt(
  p_actor_user_id uuid,
  p_account_id    uuid,
  p_receipt_id    uuid,
  p_reason        text DEFAULT NULL
) RETURNS public.receipts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result public.receipts;
BEGIN
  IF NOT has_account_role(p_account_id, p_actor_user_id, ARRAY['owner','admin']) THEN
    RAISE EXCEPTION 'Insufficient permissions to cancel a receipt';
  END IF;

  -- Block if paid payments exist
  IF EXISTS (
    SELECT 1 FROM payments
    WHERE receipt_id = p_receipt_id
      AND status     = 'paid'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot cancel a receipt with paid payments';
  END IF;

  UPDATE receipts
  SET
    status        = 'cancelled',
    deleted_at    = now(),
    deleted_by    = p_actor_user_id,
    delete_reason = p_reason
  WHERE id         = p_receipt_id
    AND account_id = p_account_id
    AND deleted_at IS NULL
  RETURNING * INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receipt not found or already cancelled';
  END IF;

  INSERT INTO audit_logs (account_id, actor_user_id, entity_type, entity_id, action, metadata)
  VALUES (p_account_id, p_actor_user_id, 'receipt', p_receipt_id, 'cancel',
          jsonb_build_object('reason', p_reason));

  RETURN result;
END;
$$;


-- ── append_signature_event ───────────────────────────────────

CREATE OR REPLACE FUNCTION append_signature_event(
  p_actor_user_id uuid,
  p_account_id    uuid,
  p_receipt_id    uuid,
  p_event_type    text,
  p_signer_email  text    DEFAULT NULL,
  p_signer_role   text    DEFAULT NULL,
  p_event_data    jsonb   DEFAULT '{}'::jsonb
) RETURNS public.signature_events
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result public.signature_events;
BEGIN
  INSERT INTO signature_events (account_id, receipt_id, event_type, signer_email, signer_role, event_data)
  VALUES (p_account_id, p_receipt_id, p_event_type, p_signer_email, p_signer_role, p_event_data)
  RETURNING * INTO result;

  -- Update receipt signature fields based on event type
  IF p_event_type = 'signed' AND p_signer_role = 'landlord' THEN
    UPDATE receipts SET signature_status = 'landlord_signed', landlord_signed_at = now()
    WHERE id = p_receipt_id AND account_id = p_account_id;
  ELSIF p_event_type = 'completed' THEN
    UPDATE receipts SET signature_status = 'fully_signed', tenant_signed_at = now()
    WHERE id = p_receipt_id AND account_id = p_account_id;
  ELSIF p_event_type = 'declined' THEN
    UPDATE receipts SET signature_status = 'declined'
    WHERE id = p_receipt_id AND account_id = p_account_id;
  END IF;

  RETURN result;
END;
$$;


-- ── register_payment ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION register_payment(
  p_actor_user_id  uuid,
  p_account_id     uuid,
  p_receipt_id     uuid,
  p_amount         numeric,
  p_currency       text    DEFAULT 'ARS',
  p_payment_method text    DEFAULT NULL,
  p_reference      text    DEFAULT NULL,
  p_notes          text    DEFAULT NULL
) RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  receipt_row public.receipts;
  result      public.payments;
BEGIN
  IF NOT has_account_role(p_account_id, p_actor_user_id, ARRAY['owner','admin','assistant']) THEN
    RAISE EXCEPTION 'Insufficient permissions to register a payment';
  END IF;

  SELECT * INTO receipt_row FROM receipts
  WHERE id = p_receipt_id AND account_id = p_account_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Receipt not found';
  END IF;

  IF receipt_row.status IN ('cancelled', 'failed') THEN
    RAISE EXCEPTION 'Cannot register payment on a cancelled or failed receipt';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than 0';
  END IF;

  INSERT INTO payments (account_id, receipt_id, amount, currency, payment_method, status, paid_at, reference, notes)
  VALUES (p_account_id, p_receipt_id, p_amount, p_currency, p_payment_method, 'paid', now(), p_reference, p_notes)
  RETURNING * INTO result;

  UPDATE receipts SET status = 'paid' WHERE id = p_receipt_id;

  INSERT INTO audit_logs (account_id, actor_user_id, entity_type, entity_id, action, metadata)
  VALUES (p_account_id, p_actor_user_id, 'payment', result.id, 'register',
          jsonb_build_object('amount', p_amount, 'currency', p_currency, 'receipt_id', p_receipt_id));

  RETURN result;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- 5. Account provisioning trigger
--    Runs automatically when a new user signs up via Supabase Auth.
--    Creates: accounts row, account_users row (role=owner), profiles row.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_id uuid;
  account_name   text;
BEGIN
  -- Derive a display name from metadata or email
  account_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Create the account
  INSERT INTO public.accounts (name)
  VALUES (account_name)
  RETURNING id INTO new_account_id;

  -- Link the user as owner
  INSERT INTO public.account_users (account_id, user_id, role)
  VALUES (new_account_id, NEW.id, 'owner');

  -- Create profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop first to allow idempotent re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- 6. Grant SELECT on views to authenticated role
-- ─────────────────────────────────────────────────────────────

GRANT SELECT ON active_properties_overview    TO authenticated;
GRANT SELECT ON active_tenants_overview       TO authenticated;
GRANT SELECT ON leases_overview               TO authenticated;
GRANT SELECT ON active_receipts_overview      TO authenticated;
GRANT SELECT ON receipt_timeline_overview     TO authenticated;
GRANT SELECT ON account_dashboard_overview    TO authenticated;
GRANT SELECT ON active_payments_overview      TO authenticated;
GRANT SELECT ON account_members_overview      TO authenticated;
