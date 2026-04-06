-- Migration: Lease adjustment configuration + history
-- Date: 2026-04-05
--
-- Adds adjustment config columns to leases and creates lease_adjustments table
-- for tracking the full history of rent increases.

-- ─────────────────────────────────────────────────────────────
-- 1. Add adjustment config to leases
-- ─────────────────────────────────────────────────────────────

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS adjustment_type        text CHECK (adjustment_type IN ('none', 'percentage', 'index', 'fixed_amount')),
  ADD COLUMN IF NOT EXISTS adjustment_frequency_months integer CHECK (adjustment_frequency_months > 0),
  ADD COLUMN IF NOT EXISTS adjustment_percentage   numeric CHECK (adjustment_percentage > 0),
  ADD COLUMN IF NOT EXISTS adjustment_index        text CHECK (adjustment_index IN ('ICL', 'IPC', 'CER', 'CVS', 'UVA')),
  ADD COLUMN IF NOT EXISTS adjustment_fixed_amount numeric CHECK (adjustment_fixed_amount > 0);


-- ─────────────────────────────────────────────────────────────
-- 2. lease_adjustments: historial de aumentos aplicados
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lease_adjustments (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_id        uuid        NOT NULL REFERENCES accounts(id),
  lease_id          uuid        NOT NULL REFERENCES leases(id),
  effective_date    date        NOT NULL,
  previous_amount   numeric     NOT NULL CHECK (previous_amount > 0),
  new_amount        numeric     NOT NULL CHECK (new_amount > 0),
  adjustment_type   text        NOT NULL CHECK (adjustment_type IN ('percentage', 'index', 'fixed_amount', 'manual')),
  adjustment_value  numeric,    -- el % aplicado, valor del índice, o monto incrementado
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lease_adjustments_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS lease_adjustments_lease_id_idx ON lease_adjustments(lease_id);
CREATE INDEX IF NOT EXISTS lease_adjustments_effective_date_idx ON lease_adjustments(lease_id, effective_date DESC);


-- ─────────────────────────────────────────────────────────────
-- 3. RLS for lease_adjustments
-- ─────────────────────────────────────────────────────────────

ALTER TABLE lease_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lease_adjustments_select_member"
  ON lease_adjustments FOR SELECT
  USING (is_account_member(account_id));

CREATE POLICY "lease_adjustments_insert_member"
  ON lease_adjustments FOR INSERT
  WITH CHECK (is_account_member(account_id));

CREATE POLICY "lease_adjustments_delete_member"
  ON lease_adjustments FOR DELETE
  USING (is_account_member(account_id));
