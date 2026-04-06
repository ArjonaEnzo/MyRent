-- ============================================================
-- Migración: Agregar soporte para firmas digitales
-- Fecha: 2026-04-04
--
-- Agrega los campos necesarios en `receipts` y crea la tabla
-- `signature_events` para el flujo de firma con HelloSign.
--
-- Después de aplicar esta migración, regenerar tipos con:
--   npx supabase gen types typescript --project-id "PROJECT_REF" > types/database.types.ts
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. Columnas de firma en la tabla `receipts`
-- ─────────────────────────────────────────────

ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS signature_request_id   TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS signature_status        TEXT         DEFAULT NULL
    CHECK (signature_status IN ('pending', 'landlord_signed', 'fully_signed', 'declined', 'expired')),
  ADD COLUMN IF NOT EXISTS landlord_signed_at      TIMESTAMPTZ  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tenant_signed_at        TIMESTAMPTZ  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS signed_document_url     TEXT         DEFAULT NULL;

-- Índice para buscar por signature_request_id (usado en webhooks)
CREATE INDEX IF NOT EXISTS idx_receipts_signature_request_id
  ON receipts (signature_request_id)
  WHERE signature_request_id IS NOT NULL;

-- ─────────────────────────────────────────────
-- 2. Tabla `signature_events` (audit trail)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signature_events (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id   UUID        NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  event_type   TEXT        NOT NULL,  -- 'created', 'viewed', 'signed', 'completed', 'declined'
  signer_email TEXT        NOT NULL,
  signer_role  TEXT        NOT NULL CHECK (signer_role IN ('landlord', 'tenant', 'system')),
  event_data   JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consultar eventos por recibo
CREATE INDEX IF NOT EXISTS idx_signature_events_receipt_id
  ON signature_events (receipt_id, created_at DESC);

-- ─────────────────────────────────────────────
-- 3. RLS en `signature_events`
-- ─────────────────────────────────────────────

ALTER TABLE signature_events ENABLE ROW LEVEL SECURITY;

-- Solo puede leer eventos de sus propios recibos
CREATE POLICY "Users can view their own signature events"
  ON signature_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM receipts
      WHERE receipts.id = signature_events.receipt_id
        AND receipts.owner_id = auth.uid()
    )
  );

-- Solo el service role puede insertar (desde webhooks y server actions)
-- Los inserts se hacen con createAdminClient() que usa service_role key
CREATE POLICY "Service role can insert signature events"
  ON signature_events FOR INSERT
  WITH CHECK (true);
