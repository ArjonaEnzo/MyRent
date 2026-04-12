-- ============================================================================
-- Auto-billing: draft receipts, line items, and cron-based generation
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. New columns on leases
-- ---------------------------------------------------------------------------
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS billing_day smallint NOT NULL DEFAULT 1
    CHECK (billing_day BETWEEN 1 AND 28),
  ADD COLUMN IF NOT EXISTS auto_billing_enabled boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2. New table: receipt_line_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipt_line_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id  uuid NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  account_id  uuid NOT NULL REFERENCES public.accounts(id),
  label       text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
  amount      numeric NOT NULL,
  item_type   text NOT NULL DEFAULT 'extra'
    CHECK (item_type IN ('rent', 'expensas', 'extra', 'discount', 'tax')),
  sort_order  smallint NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.receipt_line_items ENABLE ROW LEVEL SECURITY;

-- Staff can manage line items for their account
CREATE POLICY "account_isolation" ON public.receipt_line_items
  USING (
    account_id IN (
      SELECT au.account_id FROM public.account_users au WHERE au.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_receipt_line_items_receipt
  ON public.receipt_line_items (receipt_id);

-- ---------------------------------------------------------------------------
-- 3. New flag on receipts
-- ---------------------------------------------------------------------------
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 4. Performance index for cron query
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leases_auto_billing
  ON public.leases (billing_day, status)
  WHERE auto_billing_enabled = true AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 5. RPC: generate_draft_receipt (called by cron, SECURITY DEFINER)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_draft_receipt(
  p_lease_id uuid,
  p_period   text
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
    AND l.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: lease % not found', p_lease_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_lease.status <> 'active' THEN
    RAISE EXCEPTION 'invalid_state: can only generate receipts for active leases'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Idempotency: return existing receipt if already exists for this period
  SELECT * INTO v_receipt
  FROM   public.receipts
  WHERE  lease_id   = p_lease_id
    AND  period     = p_period
    AND  deleted_at IS NULL
  LIMIT  1;

  IF FOUND THEN
    RETURN v_receipt;
  END IF;

  -- Create draft receipt with snapshot
  INSERT INTO public.receipts (
    account_id, lease_id, property_id, tenant_id, period,
    status, auto_generated,
    snapshot_tenant_name, snapshot_tenant_dni_cuit,
    snapshot_property_address, snapshot_amount, snapshot_currency
  ) VALUES (
    v_lease.account_id, p_lease_id, v_lease.property_id, v_lease.tenant_id, p_period,
    'draft', true,
    v_lease.tenant_name, v_lease.tenant_dni_cuit,
    v_lease.property_address, v_lease.rent_amount, v_lease.currency
  )
  RETURNING * INTO v_receipt;

  -- Create the base rent line item
  INSERT INTO public.receipt_line_items (
    receipt_id, account_id, label, amount, item_type, sort_order
  ) VALUES (
    v_receipt.id, v_lease.account_id,
    'Alquiler ' || p_period, v_lease.rent_amount, 'rent', 0
  );

  -- Audit log (system actor — NULL means auto-generated by cron)
  INSERT INTO public.audit_logs (
    account_id, actor_user_id, entity_type, entity_id, action, metadata
  ) VALUES (
    v_lease.account_id,
    NULL,
    'receipt',
    v_receipt.id,
    'draft_auto_generated',
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

COMMENT ON FUNCTION public.generate_draft_receipt IS
  'Auto-generates a draft receipt for a lease period. Idempotent. Called by cron.';

-- ---------------------------------------------------------------------------
-- 6. RPC: finalize_receipt (called by landlord to approve draft)
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
  'Finalizes a draft receipt: sums line items, freezes payload, promotes to generated status.';

-- ---------------------------------------------------------------------------
-- 7. Update leases_overview to include billing columns
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.leases_overview;
CREATE VIEW public.leases_overview AS
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
  l.billing_day,
  l.auto_billing_enabled,
  l.adjustment_type,
  l.adjustment_frequency_months,
  l.adjustment_percentage,
  l.adjustment_index,
  l.adjustment_fixed_amount,
  l.created_at,
  l.updated_at,
  p.name    AS property_name,
  p.address AS property_address,
  t.full_name AS tenant_name,
  t.email     AS tenant_email,
  t.phone     AS tenant_phone
FROM public.leases l
LEFT JOIN public.properties p ON p.id = l.property_id
LEFT JOIN public.tenants    t ON t.id = l.tenant_id
WHERE l.deleted_at IS NULL;
