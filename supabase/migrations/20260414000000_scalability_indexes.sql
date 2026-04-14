-- Scalability indexes: close gaps found in DB audit.
-- Target: keep sub-100ms query times up to 10k rows per account.

-- 1. lease_adjustments — historial de ajustes por lease
-- Sin esto, el detalle de contrato hace full scan al mostrar ajustes.
CREATE INDEX IF NOT EXISTS idx_lease_adjustments_lease_id
  ON public.lease_adjustments (lease_id);

-- 2. property_images — galería de imágenes por propiedad
-- RLS filtra por account_id; listados filtran por property_id.
CREATE INDEX IF NOT EXISTS idx_property_images_account_property
  ON public.property_images (account_id, property_id);

-- 3. signature_events — timeline de firmas por recibo
-- RLS checkea (account_id, receipt_id); sin index hace scan.
CREATE INDEX IF NOT EXISTS idx_signature_events_account_receipt
  ON public.signature_events (account_id, receipt_id);

-- 4. receipts — acceso por (id, tenant_id) desde RLS del portal tenant
-- La policy "payments: tenant reads own payments" hace JOIN sobre esto.
CREATE INDEX IF NOT EXISTS idx_receipts_id_tenant_active
  ON public.receipts (id, tenant_id)
  WHERE deleted_at IS NULL;
