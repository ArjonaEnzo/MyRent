-- Subscription billing layer (platform ↔ landlord)
-- Plataforma cobra fee mensual por uso del SaaS.
-- Ingresos de alquileres NO pasan por la plataforma (ver account_payment_providers / OAuth MP).

-- ═══════════════════════════════════════════════════════════════════
-- 1. Planes de suscripción
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id text PRIMARY KEY,                          -- 'free', 'starter', 'pro'
  name text NOT NULL,
  price_ars numeric(12, 2) NOT NULL DEFAULT 0,
  price_usd numeric(12, 2),
  max_properties integer,                       -- NULL = ilimitado
  max_tenants integer,                          -- NULL = ilimitado
  max_receipts_per_month integer,               -- NULL = ilimitado
  features jsonb NOT NULL DEFAULT '{}'::jsonb,  -- flags: digital_signatures, online_payments, etc.
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscription_plans IS 'Catálogo de planes SaaS que ofrece la plataforma a propietarios.';

-- Seed inicial
INSERT INTO public.subscription_plans (id, name, price_ars, max_properties, max_tenants, max_receipts_per_month, features, sort_order)
VALUES
  ('free',     'Free',     0,      2,    2,    10,   '{"digital_signatures": false, "online_payments": true, "email_support": false}'::jsonb, 0),
  ('starter',  'Starter',  8000,   5,    10,   50,   '{"digital_signatures": false, "online_payments": true, "email_support": true}'::jsonb,  1),
  ('pro',      'Pro',      20000,  25,   NULL, NULL, '{"digital_signatures": true,  "online_payments": true, "email_support": true}'::jsonb,  2),
  ('enterprise', 'Enterprise', 50000, NULL, NULL, NULL, '{"digital_signatures": true, "online_payments": true, "email_support": true, "priority_support": true}'::jsonb, 3)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Suscripciones por cuenta
-- ═══════════════════════════════════════════════════════════════════
CREATE TYPE public.subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'expired'
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.subscription_plans(id),
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  trial_ends_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  provider text,                                -- 'mercadopago' | 'stripe' | NULL (plan free)
  provider_subscription_id text,
  provider_customer_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_account_unique UNIQUE (account_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON public.subscriptions (current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_id ON public.subscriptions (provider, provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;

COMMENT ON TABLE public.subscriptions IS 'Suscripción SaaS activa por cuenta. Una suscripción por cuenta (UNIQUE).';

-- ═══════════════════════════════════════════════════════════════════
-- 3. Eventos webhook de facturación (idempotencia)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_events_provider_event_unique UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription ON public.subscription_events (subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_account ON public.subscription_events (account_id);

COMMENT ON TABLE public.subscription_events IS 'Log inmutable de eventos de webhook subs (idempotencia vía UNIQUE provider+event_id).';

-- ═══════════════════════════════════════════════════════════════════
-- 4. OAuth tokens MP por cuenta (flujo alquileres, separado)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.account_payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  provider text NOT NULL,                        -- 'mercadopago'
  access_token text NOT NULL,
  refresh_token text,
  public_key text,
  provider_user_id text,                         -- mp_user_id
  scope text,
  expires_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now(),
  disconnected_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT account_payment_providers_unique UNIQUE (account_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_app_providers_account ON public.account_payment_providers (account_id);

COMMENT ON TABLE public.account_payment_providers IS 'OAuth tokens MP/Stripe del propietario para recibir pagos de alquileres directo a su cuenta (flujo inquilino→propietario, plataforma no intermedia).';

-- ═══════════════════════════════════════════════════════════════════
-- 5. Trigger updated_at
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER trg_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- 6. Auto-provisionar suscripción Free al crear account
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.provision_free_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.subscriptions (account_id, plan_id, status, current_period_start, current_period_end, trial_ends_at)
  VALUES (
    NEW.id,
    'free',
    'active',
    now(),
    now() + interval '100 years',  -- free plan nunca expira
    NULL
  )
  ON CONFLICT (account_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounts_free_subscription ON public.accounts;
CREATE TRIGGER trg_accounts_free_subscription
  AFTER INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.provision_free_subscription();

-- Backfill: cuentas existentes sin suscripción → free
INSERT INTO public.subscriptions (account_id, plan_id, status, current_period_start, current_period_end)
SELECT a.id, 'free', 'active', now(), now() + interval '100 years'
FROM public.accounts a
LEFT JOIN public.subscriptions s ON s.account_id = a.id
WHERE s.id IS NULL
ON CONFLICT (account_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 7. Helper: cuota del plan para una cuenta
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_account_plan_limits(p_account_id uuid)
RETURNS TABLE (
  plan_id text,
  status public.subscription_status,
  max_properties integer,
  max_tenants integer,
  max_receipts_per_month integer,
  features jsonb,
  current_period_end timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id,
    s.status,
    p.max_properties,
    p.max_tenants,
    p.max_receipts_per_month,
    p.features,
    s.current_period_end
  FROM public.subscriptions s
  JOIN public.subscription_plans p ON p.id = s.plan_id
  WHERE s.account_id = p_account_id
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_account_plan_limits(uuid) IS 'Retorna límites y estado del plan actual de la cuenta. Usar desde server actions para gating.';

-- ═══════════════════════════════════════════════════════════════════
-- 8. RLS
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_payment_providers ENABLE ROW LEVEL SECURITY;

-- Planes: todos pueden leer (catálogo público en UI /billing)
DROP POLICY IF EXISTS "plans_read_all" ON public.subscription_plans;
CREATE POLICY "plans_read_all" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- Suscripciones: solo miembros de la cuenta
DROP POLICY IF EXISTS "subs_read_account_members" ON public.subscriptions;
CREATE POLICY "subs_read_account_members" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.account_users au
      WHERE au.account_id = subscriptions.account_id AND au.user_id = auth.uid()
    )
  );

-- Updates: solo owner/admin
DROP POLICY IF EXISTS "subs_update_owner_admin" ON public.subscriptions;
CREATE POLICY "subs_update_owner_admin" ON public.subscriptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.account_users au
      WHERE au.account_id = subscriptions.account_id
        AND au.user_id = auth.uid()
        AND au.role IN ('owner', 'admin')
    )
  );

-- Events: solo miembros leen (audit trail)
DROP POLICY IF EXISTS "sub_events_read_account" ON public.subscription_events;
CREATE POLICY "sub_events_read_account" ON public.subscription_events
  FOR SELECT USING (
    account_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.account_users au
      WHERE au.account_id = subscription_events.account_id AND au.user_id = auth.uid()
    )
  );

-- Payment providers: solo owner/admin ven tokens (secretos)
DROP POLICY IF EXISTS "app_providers_read_owner_admin" ON public.account_payment_providers;
CREATE POLICY "app_providers_read_owner_admin" ON public.account_payment_providers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.account_users au
      WHERE au.account_id = account_payment_providers.account_id
        AND au.user_id = auth.uid()
        AND au.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "app_providers_write_owner_admin" ON public.account_payment_providers;
CREATE POLICY "app_providers_write_owner_admin" ON public.account_payment_providers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.account_users au
      WHERE au.account_id = account_payment_providers.account_id
        AND au.user_id = auth.uid()
        AND au.role IN ('owner', 'admin')
    )
  );

GRANT SELECT ON public.subscription_plans TO authenticated, anon;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.subscription_events TO authenticated;
GRANT SELECT ON public.account_payment_providers TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_plan_limits(uuid) TO authenticated;
