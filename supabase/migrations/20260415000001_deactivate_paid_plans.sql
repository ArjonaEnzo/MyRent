-- Desactivar planes pagos hasta implementar checkout de suscripción.
-- Solo Free queda visible en /billing.
UPDATE public.subscription_plans
SET is_active = false
WHERE id IN ('starter', 'pro', 'enterprise');
