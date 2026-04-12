-- =============================================================================
-- Migration: Backend improvements — RBAC, atomic adjustments, performance
-- Date: 2026-04-07
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A3. Helper enforce_account_role()
-- Centraliza el control de acceso en la DB.
-- Lanza EXCEPTION si el usuario no tiene el rol requerido.
-- SECURITY DEFINER: ejecuta con los permisos del dueño de la función (postgres),
-- no del llamador. Permite leer account_users sin exponer la tabla.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_account_role(
  p_account_id uuid,
  p_user_id    uuid,
  p_roles      text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_account_role(p_account_id, p_user_id, p_roles) THEN
    RAISE EXCEPTION 'insufficient_privilege: user % does not have required role on account %',
      p_user_id, p_account_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.enforce_account_role IS
  'Raises insufficient_privilege if user does not hold one of the required roles on the account.';

-- ---------------------------------------------------------------------------
-- A1. RPC apply_lease_adjustment()
-- Reemplaza el flujo no-atómico en leases.ts:applyAdjustment().
-- INSERT lease_adjustments + UPDATE leases.rent_amount + audit_log en una
-- sola transacción con row-level lock para evitar race conditions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_lease_adjustment(
  p_actor_user_id   uuid,
  p_account_id      uuid,
  p_lease_id        uuid,
  p_effective_date  date,
  p_new_amount      numeric,
  p_adjustment_type text,
  p_adjustment_value numeric DEFAULT NULL,
  p_notes           text     DEFAULT NULL
)
RETURNS public.lease_adjustments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease      RECORD;
  v_adjustment public.lease_adjustments;
BEGIN
  -- RBAC: solo owner/admin pueden aplicar ajustes
  PERFORM public.enforce_account_role(
    p_account_id, p_actor_user_id, ARRAY['owner', 'admin']
  );

  -- Obtener y bloquear el contrato (FOR UPDATE previene race conditions)
  SELECT id, rent_amount, status
  INTO   v_lease
  FROM   public.leases
  WHERE  id          = p_lease_id
    AND  account_id  = p_account_id
    AND  deleted_at  IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: lease % not found', p_lease_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_lease.status <> 'active' THEN
    RAISE EXCEPTION 'invalid_state: adjustments can only be applied to active leases'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_new_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_input: new_amount must be greater than 0'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Registrar en historial (atómico con el UPDATE de abajo)
  INSERT INTO public.lease_adjustments (
    account_id,
    lease_id,
    effective_date,
    previous_amount,
    new_amount,
    adjustment_type,
    adjustment_value,
    notes
  ) VALUES (
    p_account_id,
    p_lease_id,
    p_effective_date,
    v_lease.rent_amount,
    p_new_amount,
    p_adjustment_type,
    p_adjustment_value,
    p_notes
  )
  RETURNING * INTO v_adjustment;

  -- Actualizar monto del contrato en la misma transacción
  UPDATE public.leases
  SET    rent_amount = p_new_amount,
         updated_at  = now()
  WHERE  id         = p_lease_id
    AND  account_id = p_account_id;

  -- Auditoría
  INSERT INTO public.audit_logs (
    account_id, actor_user_id, entity_type, entity_id, action, metadata
  ) VALUES (
    p_account_id,
    p_actor_user_id,
    'lease',
    p_lease_id,
    'adjustment_applied',
    jsonb_build_object(
      'previous_amount',  v_lease.rent_amount,
      'new_amount',       p_new_amount,
      'adjustment_type',  p_adjustment_type,
      'effective_date',   p_effective_date
    )
  );

  RETURN v_adjustment;
END;
$$;

COMMENT ON FUNCTION public.apply_lease_adjustment IS
  'Atomically records a lease adjustment and updates rent_amount. Enforces owner/admin role.';

-- ---------------------------------------------------------------------------
-- A2. Fix issue_receipt() — incluye snapshot_tenant_dni_cuit
-- La función anterior siempre dejaba dni_cuit en NULL.
-- Esta versión hace JOIN con tenants para copiar el campo al snapshot.
-- También es idempotente: si ya existe un recibo para ese lease+period,
-- lo devuelve sin crear duplicado.
-- DROP explícito porque hay múltiples overloads y CREATE OR REPLACE es ambiguo.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.issue_receipt(uuid, uuid, uuid, text, text);

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
  -- Resolver datos del contrato con tenant y propiedad
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

  -- Idempotencia: si ya existe un recibo para este período, devolverlo
  SELECT * INTO v_receipt
  FROM   public.receipts
  WHERE  lease_id   = p_lease_id
    AND  period     = p_period
    AND  deleted_at IS NULL
  LIMIT  1;

  IF FOUND THEN
    RETURN v_receipt;
  END IF;

  -- Crear el recibo con snapshot completo (incluye dni_cuit)
  INSERT INTO public.receipts (
    account_id,
    lease_id,
    property_id,
    tenant_id,
    period,
    status,
    snapshot_tenant_name,
    snapshot_tenant_dni_cuit,
    snapshot_property_address,
    snapshot_amount,
    snapshot_currency,
    description
  ) VALUES (
    p_account_id,
    p_lease_id,
    v_lease.property_id,
    v_lease.tenant_id,
    p_period,
    'draft',
    v_lease.tenant_name,
    v_lease.tenant_dni_cuit,
    v_lease.property_address,
    v_lease.rent_amount,
    v_lease.currency,
    p_description
  )
  RETURNING * INTO v_receipt;

  -- Auditoría
  INSERT INTO public.audit_logs (
    account_id, actor_user_id, entity_type, entity_id, action, metadata
  ) VALUES (
    p_account_id,
    p_actor_user_id,
    'receipt',
    v_receipt.id,
    'receipt_issued',
    jsonb_build_object(
      'lease_id',   p_lease_id,
      'period',     p_period,
      'amount',     v_lease.rent_amount,
      'currency',   v_lease.currency
    )
  );

  RETURN v_receipt;
END;
$$;

COMMENT ON FUNCTION public.issue_receipt IS
  'Creates a receipt snapshot for a lease period. Idempotent — returns existing receipt if already issued.';

-- ---------------------------------------------------------------------------
-- A4. Índices de performance
-- La exploración reveló seq scans altos en tenants (335) y properties (434).
-- Los índices simples existentes no cubren el patrón WHERE account_id = X AND deleted_at IS NULL.
-- ---------------------------------------------------------------------------

-- Propiedades activas por cuenta (patrón más común en listados)
CREATE INDEX IF NOT EXISTS idx_properties_account_deleted
  ON public.properties (account_id, deleted_at);

-- Inquilinos activos por cuenta
CREATE INDEX IF NOT EXISTS idx_tenants_account_deleted
  ON public.tenants (account_id, deleted_at);

-- Contratos por cuenta + estado + soft-delete (usado en leases_overview y validaciones)
CREATE INDEX IF NOT EXISTS idx_leases_account_status_deleted
  ON public.leases (account_id, status, deleted_at);

-- Recibos por cuenta + período (para buscar duplicados y filtros de período)
CREATE INDEX IF NOT EXISTS idx_receipts_account_period_deleted
  ON public.receipts (account_id, period, deleted_at);

-- Pagos por receipt (JOIN más frecuente desde receipts)
CREATE INDEX IF NOT EXISTS idx_payments_receipt_id
  ON public.payments (receipt_id)
  WHERE deleted_at IS NULL;
