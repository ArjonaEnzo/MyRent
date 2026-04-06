-- docs/db-schema.sql
-- Current MyRent schema reference
-- Context only; review migrations before applying anywhere.

CREATE TABLE public.account_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text, 'accountant'::text, 'viewer'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT account_users_pkey PRIMARY KEY (id),
  CONSTRAINT account_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT account_users_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id)
);

CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  actor_user_id uuid,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.leases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  property_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date,
  rent_amount numeric NOT NULL CHECK (rent_amount > 0::numeric),
  currency text NOT NULL DEFAULT 'ARS'::text,
  status text NOT NULL CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'ended'::text, 'cancelled'::text])),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  delete_reason text,
  CONSTRAINT leases_pkey PRIMARY KEY (id),
  CONSTRAINT leases_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT leases_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT leases_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT leases_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id)
);

CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  receipt_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  currency text NOT NULL DEFAULT 'ARS'::text,
  payment_method text,
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'cancelled'::text])),
  paid_at timestamp with time zone,
  reference text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  delete_reason text,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT payments_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id),
  CONSTRAINT payments_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  delete_reason text,
  CONSTRAINT properties_pkey PRIMARY KEY (id),
  CONSTRAINT properties_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT properties_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id)
);

CREATE TABLE public.receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  lease_id uuid NOT NULL,
  property_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  period text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['draft'::text, 'generated'::text, 'sent'::text, 'signature_pending'::text, 'signed'::text, 'paid'::text, 'cancelled'::text, 'failed'::text])),
  snapshot_tenant_name text NOT NULL,
  snapshot_tenant_dni_cuit text,
  snapshot_property_address text NOT NULL,
  snapshot_amount numeric NOT NULL CHECK (snapshot_amount > 0::numeric),
  snapshot_currency text NOT NULL,
  snapshot_payload jsonb,
  storage_path text,
  pdf_url text,
  email_sent boolean NOT NULL DEFAULT false,
  signature_provider text,
  signature_request_id text,
  signature_status text,
  landlord_signed_at timestamp with time zone,
  tenant_signed_at timestamp with time zone,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  delete_reason text,
  CONSTRAINT receipts_pkey PRIMARY KEY (id),
  CONSTRAINT receipts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT receipts_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id),
  CONSTRAINT receipts_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT receipts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id),
  CONSTRAINT receipts_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id)
);

CREATE TABLE public.signature_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  receipt_id uuid NOT NULL,
  event_type text NOT NULL,
  signer_email text,
  signer_role text,
  event_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT signature_events_pkey PRIMARY KEY (id),
  CONSTRAINT signature_events_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT signature_events_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.receipts(id)
);

CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  dni_cuit text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  deleted_by uuid,
  delete_reason text,
  CONSTRAINT tenants_pkey PRIMARY KEY (id),
  CONSTRAINT tenants_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT tenants_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id)
);