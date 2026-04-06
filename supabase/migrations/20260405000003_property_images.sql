-- Migration: Property images
-- Date: 2026-04-05

-- ─────────────────────────────────────────────────────────────
-- 1. Add cover_image_url to properties
-- ─────────────────────────────────────────────────────────────

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS cover_image_url text;


-- ─────────────────────────────────────────────────────────────
-- 2. property_images table (up to 6 per property)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS property_images (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  account_id    uuid        NOT NULL REFERENCES accounts(id),
  property_id   uuid        NOT NULL REFERENCES properties(id),
  storage_path  text        NOT NULL,
  url           text        NOT NULL,
  is_cover      boolean     NOT NULL DEFAULT false,
  position      integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_images_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS property_images_property_id_idx ON property_images(property_id);


-- ─────────────────────────────────────────────────────────────
-- 3. RLS for property_images
-- ─────────────────────────────────────────────────────────────

ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_images_select_member" ON property_images;
CREATE POLICY "property_images_select_member"
  ON property_images FOR SELECT
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS "property_images_insert_member" ON property_images;
CREATE POLICY "property_images_insert_member"
  ON property_images FOR INSERT
  WITH CHECK (is_account_member(account_id));

DROP POLICY IF EXISTS "property_images_update_member" ON property_images;
CREATE POLICY "property_images_update_member"
  ON property_images FOR UPDATE
  USING (is_account_member(account_id));

DROP POLICY IF EXISTS "property_images_delete_member" ON property_images;
CREATE POLICY "property_images_delete_member"
  ON property_images FOR DELETE
  USING (is_account_member(account_id));
