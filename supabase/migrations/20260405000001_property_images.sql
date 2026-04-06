-- ============================================================
-- Migración: Imágenes de propiedades
-- Fecha: 2026-04-05
--
-- Agrega:
--   1. Columna cover_image_url en properties
--   2. Tabla property_images con RLS
--   3. Storage bucket policy para property-images
-- ============================================================

-- ─── 1. cover_image_url en properties ────────────────────────
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT NULL;

-- ─── 2. Tabla property_images ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.property_images (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  property_id  UUID        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  storage_path TEXT        NOT NULL,
  url          TEXT        NOT NULL,
  is_cover     BOOLEAN     NOT NULL DEFAULT false,
  position     INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_images_property_id
  ON public.property_images (property_id, position);

-- ─── 3. RLS ──────────────────────────────────────────────────
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;

-- Members of the account can view images
CREATE POLICY "Account members can view property_images"
  ON public.property_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.account_users
      WHERE account_users.account_id = property_images.account_id
        AND account_users.user_id = auth.uid()
    )
  );

-- Owner/admin can insert images
CREATE POLICY "Account members can insert property_images"
  ON public.property_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.account_users
      WHERE account_users.account_id = property_images.account_id
        AND account_users.user_id = auth.uid()
        AND account_users.role IN ('owner', 'admin', 'assistant')
    )
  );

-- Owner/admin can update images (e.g. is_cover, position)
CREATE POLICY "Account members can update property_images"
  ON public.property_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.account_users
      WHERE account_users.account_id = property_images.account_id
        AND account_users.user_id = auth.uid()
        AND account_users.role IN ('owner', 'admin', 'assistant')
    )
  );

-- Owner/admin can delete images
CREATE POLICY "Account members can delete property_images"
  ON public.property_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.account_users
      WHERE account_users.account_id = property_images.account_id
        AND account_users.user_id = auth.uid()
        AND account_users.role IN ('owner', 'admin', 'assistant')
    )
  );

-- ─── 4. Storage bucket ───────────────────────────────────────
-- Crear el bucket property-images (ejecutar manualmente si el CLI no lo hace):
--
--   En Supabase Dashboard → Storage → New bucket
--   Name: property-images
--   Public: NO (privado)
--   File size limit: 5 MB
--   Allowed MIME types: image/jpeg, image/png, image/webp
--
-- Las políticas de storage se manejan desde el Dashboard o con el CLI.
-- El código usa createAdminClient() para upload/delete (service role bypasses storage RLS).
