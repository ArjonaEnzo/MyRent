-- =============================================================================
-- Test tenant setup for test@test.com
-- Auth user: f964c1df-e387-463c-95d0-9e3f23064063
-- Account:   ca02809b-8234-4115-a50a-c79cc53bdd9f (MyRent Principal)
-- Property:  c98a4892-daa1-4c71-9dc0-0838ccac955c (Casa 1)
-- =============================================================================

-- Fixed UUIDs for easy reference / idempotent re-runs
DO $$
DECLARE
  v_account_id  uuid := 'ca02809b-8234-4115-a50a-c79cc53bdd9f';
  v_property_id uuid := 'c98a4892-daa1-4c71-9dc0-0838ccac955c';
  v_auth_uid    uuid := 'f964c1df-e387-463c-95d0-9e3f23064063';
  v_tenant_id   uuid := 'aa000001-0000-0000-0000-000000000001';
  v_lease_id    uuid := 'aa000002-0000-0000-0000-000000000002';
  v_receipt_id  uuid := 'aa000003-0000-0000-0000-000000000003';
BEGIN

  -- ── 1. TENANT ──────────────────────────────────────────────────────────────
  INSERT INTO public.tenants (id, account_id, full_name, email, auth_user_id)
  VALUES (
    v_tenant_id,
    v_account_id,
    'Test Inquilino',
    'test@test.com',
    v_auth_uid
  )
  ON CONFLICT (id) DO UPDATE
    SET auth_user_id = EXCLUDED.auth_user_id;

  RAISE NOTICE 'tenant_id: %', v_tenant_id;

  -- ── 2. LEASE ───────────────────────────────────────────────────────────────
  INSERT INTO public.leases (
    id, account_id, property_id, tenant_id,
    start_date, rent_amount, currency, status
  )
  VALUES (
    v_lease_id,
    v_account_id,
    v_property_id,
    v_tenant_id,
    '2026-01-01',
    150000,
    'ARS',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'lease_id: %', v_lease_id;

  -- ── 3. RECEIPT ─────────────────────────────────────────────────────────────
  INSERT INTO public.receipts (
    id, account_id, lease_id, property_id, tenant_id,
    period, status,
    snapshot_tenant_name,
    snapshot_property_address,
    snapshot_amount, snapshot_currency,
    email_sent
  )
  VALUES (
    v_receipt_id,
    v_account_id,
    v_lease_id,
    v_property_id,
    v_tenant_id,
    '2026-03',
    'generated',
    'Test Inquilino',
    'Av. Corriente',
    150000,
    'ARS',
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'receipt_id: %', v_receipt_id;

  RAISE NOTICE 'Setup completo para test@test.com';

END $$;

-- Verificación final
SELECT
  t.id            AS tenant_id,
  t.full_name,
  t.email,
  t.auth_user_id,
  l.id            AS lease_id,
  l.status        AS lease_status,
  l.rent_amount,
  r.id            AS receipt_id,
  r.period,
  r.status        AS receipt_status
FROM public.tenants t
LEFT JOIN public.leases  l ON l.tenant_id = t.id AND l.deleted_at IS NULL
LEFT JOIN public.receipts r ON r.tenant_id = t.id AND r.deleted_at IS NULL
WHERE t.id = 'aa000001-0000-0000-0000-000000000001';
