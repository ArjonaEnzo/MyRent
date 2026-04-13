# MyRent - SaaS de Gestión de Alquileres

Plataforma multi-tenant para que propietarios administren sus propiedades, inquilinos y contratos, y generen recibos de alquiler en PDF con envío automático por email.

## Stack

- **Next.js 15** — App Router, Server Actions, React 19
- **Supabase** — PostgreSQL, Auth, Storage, Row Level Security
- **Tailwind CSS + Shadcn UI** — HSL variable theming, dark/light mode
- **@react-pdf/renderer** — PDF generation
- **Resend** — Transactional email delivery
- **Mercado Pago Checkout Pro** — Online tenant payments (optional)
- **HelloSign / Dropbox Sign** — Digital signatures (optional)
- **Vitest + React Testing Library** — Unit & component tests
- **TypeScript strict mode**, **Zod** validation
- **framer-motion** — Page & UI animations

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

See `.env.example` for all required and optional variables.

### 3. Apply database migrations

In Supabase SQL Editor, run **in order**:

1. `supabase/migrations/20260404000002_views_functions_provisioning.sql`
   — Creates all tables, RLS policies, views, RPCs, and the `handle_new_user()` trigger.

### 4. Start development server

```bash
pnpm dev
```

## Commands

```bash
pnpm dev          # Dev server (localhost:3000)
pnpm build        # Production build
pnpm lint         # ESLint
pnpm test         # Vitest
pnpm type-check   # tsc --noEmit
```

## Business Rules

- **Immutable receipts** — Tenant and property data is snapshotted at receipt creation. Historical records never change.
- **Lease-centric model** — Receipts require an active lease. Amount and parties are read from the lease, not re-entered.
- **Soft delete** — Properties, tenants, leases, and receipts are archived (not hard-deleted). Active leases block archiving a property or tenant.
- **Currency** — ARS and USD supported.
- **Rate limiting** — 10 receipts/min, 5 properties/min, 20 emails/hour (in-memory; use Redis for multi-instance).

## Tenant Portal

Tenants get their own login at `/tenant/login` and a read-only dashboard where they can:

- View their active lease and payment history
- Pay rent online via Mercado Pago Checkout Pro
- Get redirected to `/tenant/(portal)/payment/{success,failure,pending}` after checkout

Tenant auth is separate from staff auth — see `lib/supabase/tenant-auth.ts`.

## Online Payments (Mercado Pago)

Tenants can pay receipts via Mercado Pago Checkout Pro:

1. Tenant clicks "Pagar" → `initiateOnlinePayment()` creates a checkout preference
2. Tenant is redirected to Mercado Pago's hosted checkout
3. After payment, MP sends a webhook to `/api/webhooks/mercadopago`
4. Webhook verifies HMAC-SHA256 signature, reconciles via `external_reference`, and updates receipt status

Set `MERCADOPAGO_ACCESS_TOKEN` and `MERCADOPAGO_WEBHOOK_SECRET` in env vars. Use `TEST-` prefixed credentials for sandbox.

## Automated Billing (Vercel Cron)

`/api/cron/daily-billing` runs daily at 08:00 UTC (05:00 ART):

1. Sends pre-billing email to tenants (7 days before billing day)
2. Sends reminder email to landlords (5 days before)
3. Generates draft receipts for leases with `auto_billing_enabled = true`

Protected by `CRON_SECRET` env var. Configure schedule in `vercel.json`.

## Security

- Row Level Security on all tables, scoped by `account_id` via `account_users`
- `SUPABASE_SERVICE_ROLE_KEY` only used server-side for Storage operations
- Zod validation on all inputs
- Webhook HMAC-SHA256 verification (HelloSign + Mercado Pago)
- Idempotent webhook processing via `payment_events` / `signature_events` tables

## Deployment (Vercel)

1. Push to GitHub — Vercel auto-deploys from `main`
2. Set all env vars from `.env.example` in the Vercel dashboard
3. Apply DB migration: `supabase/migrations/20260404000002_views_functions_provisioning.sql`
4. Enable Supabase Storage bucket `receipts` (private, RLS on)
5. Configure webhook URLs in external services:
   - Mercado Pago: `https://yourdomain.com/api/webhooks/mercadopago`
   - HelloSign: `https://yourdomain.com/api/webhooks/hellosign`

## Documentation

- [Architecture](ARCHITECTURE.md) — Structure, decisions, flows
- [Database schema](docs/db-schema.sql) — Current table definitions
- [Backend contract](docs/backend-contract.md) — API surface and conventions
- [Digital signatures setup](docs/DIGITAL_SIGNATURES_SETUP.md) — HelloSign integration guide
