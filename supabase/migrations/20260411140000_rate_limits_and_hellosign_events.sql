-- =============================================================================
-- Migration: rate_limits + hellosign_events (cierra C5 y H4 del audit)
-- Date: 2026-04-11
-- =============================================================================
--
-- C5. Rate limiter persistente respaldado por Postgres.
--   El limiter en memoria de lib/utils/rate-limit.ts no funciona en serverless
--   (cada invocación arranca con un Map vacío). Esta tabla + RPC dan límites
--   atómicos que sí sobreviven entre instancias.
--
-- H4. Idempotencia del webhook de HelloSign.
--   Hasta ahora cada redelivery insertaba un signature_event nuevo y, peor,
--   re-bajaba el PDF firmado en handleAllSigned. Con UNIQUE(event_hash) y un
--   INSERT-claim al inicio del handler, los duplicados se cortan en seco.
-- =============================================================================

-- ─── C5: rate_limits ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket       text        NOT NULL,
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        int         NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket, key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON public.rate_limits (window_start);

COMMENT ON TABLE public.rate_limits IS
  'Rate limit counters bucketed por (bucket, key, window_start). Reemplaza el limiter en memoria.';

-- Sin RLS: solo se accede vía RPC con SECURITY DEFINER.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies → nadie puede hacer SELECT/INSERT directo desde clients.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket         text,
  p_key            text,
  p_max            int,
  p_window_seconds int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_count        int;
BEGIN
  -- Bucket por ventana fija (epoch / window_seconds)
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.rate_limits (bucket, key, window_start, count)
  VALUES (p_bucket, p_key, v_window_start, 1)
  ON CONFLICT (bucket, key, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

COMMENT ON FUNCTION public.check_rate_limit IS
  'Atomic rate-limit check. Returns true si la request está dentro del límite, false si lo excedió.';

-- Cleanup periódico (opcional — invocar desde un cron job o pg_cron).
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits
  WHERE  window_start < now() - interval '1 day';
$$;

-- ─── H4: hellosign_events ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hellosign_events (
  event_hash  text        PRIMARY KEY,
  event_type  text        NOT NULL,
  receipt_id  uuid        REFERENCES public.receipts(id) ON DELETE SET NULL,
  account_id  uuid        REFERENCES public.accounts(id) ON DELETE CASCADE,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload     jsonb
);

CREATE INDEX IF NOT EXISTS idx_hellosign_events_receipt
  ON public.hellosign_events (receipt_id);

COMMENT ON TABLE public.hellosign_events IS
  'Idempotency log para webhooks de HelloSign. event_hash viene del header del evento.';

ALTER TABLE public.hellosign_events ENABLE ROW LEVEL SECURITY;
-- Sin policies — solo el service-role lo escribe desde el webhook handler.
