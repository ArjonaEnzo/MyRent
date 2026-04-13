-- Billing notifications tracking table
-- Prevents duplicate notification emails for the same lease/period/type

CREATE TABLE public.billing_notifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id          uuid NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  account_id        uuid NOT NULL REFERENCES public.accounts(id),
  period            text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('landlord_reminder', 'tenant_heads_up', 'draft_generated')),
  recipient_email   text,
  sent_at           timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lease_id, period, notification_type)
);

ALTER TABLE public.billing_notifications ENABLE ROW LEVEL SECURITY;

-- RLS: account isolation
CREATE POLICY "billing_notifications_account_isolation"
  ON public.billing_notifications
  USING (account_id IN (
    SELECT au.account_id FROM public.account_users au WHERE au.user_id = auth.uid()
  ));

-- Index for fast lookup in cron jobs
CREATE INDEX idx_billing_notifications_lookup
  ON public.billing_notifications (lease_id, period, notification_type);
