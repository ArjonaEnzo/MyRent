# MyRent - SaaS de Gestión de Alquileres

Plataforma multi-tenant para que propietarios administren sus propiedades, inquilinos y contratos, y generen recibos de alquiler en PDF con envío automático por email.

## Stack

- **Next.js 15** — App Router, Server Actions, React 19
- **Supabase** — PostgreSQL, Auth, Storage, Row Level Security
- **Tailwind CSS + Shadcn UI**
- **@react-pdf/renderer** — PDF generation
- **Resend** — Email delivery
- **HelloSign / Dropbox Sign** — Digital signatures (optional)
- **Vitest** — Unit tests
- **TypeScript strict mode**, **Zod** validation

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

## Security

- Row Level Security on all tables, scoped by `account_id` via `account_users`
- `SUPABASE_SERVICE_ROLE_KEY` only used server-side for Storage operations
- Zod validation on all inputs
- HelloSign webhooks verified with HMAC-SHA256

## Documentation

- [Architecture](ARCHITECTURE.md) — Structure, decisions, flows
- [Database schema](docs/db-schema.sql) — Current table definitions
- [Backend contract](docs/backend-contract.md) — API surface and conventions
- [Digital signatures setup](docs/DIGITAL_SIGNATURES_SETUP.md) — HelloSign integration guide
