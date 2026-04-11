# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyRent is a multi-tenant SaaS for rental property management. Landlords manage properties, tenants, leases, and generate immutable rent receipts (PDF + email). Written in Spanish (es-AR locale).

## Commands

```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Production build
pnpm lint         # ESLint (next lint)
pnpm test         # Run tests (vitest)
pnpm test:ui      # Run tests with UI
pnpm type-check   # TypeScript strict check (tsc --noEmit)
```

Run a single test file: `pnpm vitest run __tests__/lib/validations/auth.test.ts`

## Tech Stack

- **Next.js 15** (App Router, Server Actions, React 19)
- **Supabase** (PostgreSQL, Auth, Storage, Row Level Security)
- **Tailwind CSS + Shadcn UI** (HSL CSS variable theming, `tailwindcss-animate`)
- **Vitest + React Testing Library** (jsdom environment, `@` alias resolved, setup at `__tests__/setup.ts`)
- **@react-pdf/renderer** for PDF generation, **Resend** for email
- **Zod** for validation, **TypeScript strict mode**
- **framer-motion** for animations, **@dnd-kit** for drag-and-drop (image reordering)
- **sonner** for toast notifications, **next-themes** for dark/light mode, **lucide-react** for icons

## Architecture

### Route Groups

- `app/(auth)/` — Public routes: login, signup. Middleware redirects authenticated users to `/dashboard`.
- `app/(dashboard)/` — Protected routes: dashboard, properties, tenants, leases, receipts (CRUD pages). Middleware redirects unauthenticated users to `/login`.
- `app/tenant/` — Tenant portal: `login/`, `(portal)/dashboard/`, `(portal)/payment/{success,failure,pending}/`. Middleware redirects unauthenticated tenants to `/tenant/login`. Tenants are linked to auth users via `tenants.auth_user_id`.
- `app/api/webhooks/` — External webhook handlers: `hellosign/route.ts` (digital signatures), `mercadopago/route.ts` (payment callbacks).

> **Two auth contexts**: Staff users authenticate via `getCurrentUserWithAccount()` from `lib/supabase/auth.ts`. Tenant portal users authenticate via `getCurrentTenant()` from `lib/supabase/tenant-auth.ts` — returns `{ user, tenantId, accountId, supabase }`. Staff logins and tenant logins share the same Supabase Auth instance but are separated by RLS policies. Never mix the two contexts in the same action.

### Data Flow Pattern

Pages (Server Components) call server actions directly. Mutations use Server Actions in `lib/actions/`, which:

1. Validate input with Zod schemas from `lib/validations/`
2. Authenticate via `getCurrentUserWithAccount()` from `lib/supabase/auth.ts` — returns `{ user, accountId, supabase }`
3. Authorize via `requireRole(supabase, accountId, user.id, ['owner', 'admin'])` for write operations
4. Validate any incoming IDs with `validateId(id)` from `lib/validations/common` before DB queries
5. Query Supabase using `account_id` (RLS enforces `account_id` automatically)
6. Call `revalidatePath()` after mutations

> Use `getCurrentUserWithClient()` only for simple read-only actions where role checking is not needed. Use `getCurrentUser()` only when you don't need the Supabase client at all. Use `getCurrentUserOrNull()` when auth is optional.

**Critical: Server Actions that call `redirect()`** must guard with `isRedirectError`:

```ts
import { isRedirectError } from 'next/dist/client/components/redirect'
// ...
} catch (error) {
  if (isRedirectError(error)) throw error  // must rethrow, not treat as failure
  // handle real errors
}
```

**Complex/atomic DB operations** use RPC functions instead of direct table mutations:

- `apply_lease_adjustment` — atomically updates `lease_adjustments` + `leases.rent_amount` with row lock
- `archive_property` — soft-delete with audit log in one transaction
- `has_account_role` — role verification (called by `requireRole`)
- `register_payment` — atomically creates a payment record, updates receipt to `paid`, and writes an audit log entry
- `is_tenant_user` — returns `true` if `auth.uid()` is linked to an active tenant record (used in RLS policies)
- `get_tenant_id_for_user` — returns `tenants.id` for the current auth user, or `NULL` if not a tenant

**Storage operations** require `createAdminClient()` (service-role) to bypass RLS. Images are stored in the `property-images` bucket at path `{accountId}/{propertyId}/{uuid}.{ext}` with 5-year signed URLs. Max 6 images per property. User avatars are stored in the public `avatars` bucket at path `{userId}/{filename}` (2 MB limit, jpeg/png/webp).

### Key Layers

- **`lib/supabase/`** — Three client factories: `client.ts` (browser), `server.ts` (Server Components/Actions with `createClient()` and `createAdminClient()` for service-role operations), `middleware.ts` (session refresh). Also `tenant-auth.ts` — `getCurrentTenant()` / `getCurrentTenantOrNull()` for tenant portal actions.
- **`lib/actions/`** — Server Actions for auth, properties, tenants, leases, receipts, signatures, profile, and payments. All marked `'use server'`.
- **`lib/payments/`** — `mercadopago-client.ts`: wraps the Mercado Pago Checkout Pro API (create preference, get payment details, verify webhook HMAC, map MP status).
- **`lib/validations/`** — Zod schemas mirroring each entity (auth, property, tenant, lease, receipt, profile, common).
- **`lib/utils/`** — Custom error classes (`AppError` hierarchy with status codes), logger, in-memory rate limiter, retry with exponential backoff.
- **`lib/utils.ts`** — Shadcn `cn()` utility (clsx + tailwind-merge).
- **`lib/i18n/translations.ts`** — Spanish/English UI string translations; used via `language-provider` context.
- **`lib/pdf/receipt-template.tsx`** — React PDF component for receipt generation.
- **`lib/email/receipt-email.ts`** — Sends receipt email via Resend with PDF download link.
- **`lib/signatures/hellosign-client.ts`** — HelloSign (Dropbox Sign) client for digital signatures.
- **`lib/env.ts`** — Zod-validated environment variables.
- **`components/`** — Organized by domain: `ui/` (Shadcn), `dashboard/`, `properties/`, `tenants/`, `leases/`, `receipts/`, `account/`, `tenant/` (portal), `providers/`, `shared/`.
- **`types/database.types.ts`** — Auto-generated Supabase types + hand-written domain types at the top (`AccountRole`, `LeaseStatus`, `ReceiptStatus`, etc.). Regenerate DB types with: `npx supabase gen types typescript --project-id "PROJECT_REF" > types/database.types.ts`
- **`supabase/migrations/`** — SQL migration files for database schema changes.
- **`docs/`** — `backend-contract.md` and `db-schema.sql` for reference. `DIGITAL_SIGNATURES_SETUP.md` for HelloSign configuration steps.

## Multi-Account Model

The app is organized around **accounts** (not individual users). Every user belongs to an account via `account_users`, with a role. RLS policies use `account_id`, not `auth.uid()` directly.

- `accounts` — the organizational unit (one per landlord/company)
- `account_users` — join table: `account_id`, `user_id`, `role` (`owner | admin | assistant | accountant | viewer`)
- All business tables (`properties`, `tenants`, `leases`, `receipts`, `payments`) have `account_id` FK, not `owner_id`
- `getCurrentUserWithAccount()` resolves `accountId` and auto-provisions an account for users who predate the trigger
- `requireRole()` calls the `has_account_role` DB RPC to verify the user's role before mutations

## Database Schema

Active tables (reflected in `types/database.types.ts`):

| Table               | Key columns                                                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts`          | `id`, `name`                                                                                                                                                                             |
| `account_users`     | `account_id`, `user_id`, `role`                                                                                                                                                          |
| `profiles`          | `id` (= auth uid), `full_name`, `avatar_url`                                                                                                                                             |
| `properties`        | `id`, `account_id`, `name`, `address`, `cover_image_url`, soft-delete fields                                                                                                             |
| `property_images`   | `id`, `account_id`, `property_id`, `storage_path`, `url`, `is_cover`, `position`                                                                                                         |
| `tenants`           | `id`, `account_id`, `property_id`, `full_name`, `email`, `dni_cuit`, `auth_user_id` (nullable, links to Supabase Auth for portal access), soft-delete fields                             |
| `leases`            | `id`, `account_id`, `property_id`, `tenant_id`, `status`, `rent_amount`, `currency`, `start_date`, `end_date`, adjustment config fields, soft-delete fields                              |
| `lease_adjustments` | `id`, `account_id`, `lease_id`, `adjustment_type`, `previous_amount`, `new_amount`, `effective_date`                                                                                     |
| `receipts`          | `id`, `account_id`, `lease_id`, `tenant_id`, `property_id`, `period` (YYYY-MM), `status`, snapshot fields, `pdf_url`, `storage_path`, `email_sent`, signature fields, soft-delete fields |
| `payments`          | `id`, `account_id`, `receipt_id`, `amount`, `currency`, `status`, `paid_at`, `provider` (`manual`/`mercadopago`), `provider_payment_id`, `provider_status`, `checkout_url`, `external_reference`, `metadata`, soft-delete fields |
| `payment_events`    | `id`, `account_id`, `payment_id`, `provider`, `provider_event_id` (idempotency key), `event_type`, `event_data`, `processed_at`                                                          |
| `audit_logs`        | `id`, `account_id`, `entity_type`, `entity_id`, `action`, `actor_user_id`, `metadata`                                                                                                    |
| `signature_events`  | audit trail for HelloSign webhook events                                                                                                                                                 |

Soft deletes use `deleted_at` / `deleted_by` / `delete_reason` columns — filter with `.is('deleted_at', null)` or use the `*_overview` DB views which already filter soft-deleted rows. Prefer views for reads; use raw tables when you need soft-delete fields explicitly.

Available views: `leases_overview`, `receipts_overview`, `active_receipts_overview`, `active_properties_overview`, `active_tenants_overview`, `payments_overview`, `active_payments_overview`, `active_payments_clean_overview`, `account_dashboard_overview`, `account_members_overview`, `receipt_timeline_overview`.

## Key Domain Types (top of `types/database.types.ts`)

```ts
AccountRole = "owner" | "admin" | "assistant" | "accountant" | "viewer";
LeaseStatus = "draft" | "active" | "ended" | "cancelled";
LeaseAdjustmentType = "percentage" | "index" | "fixed_amount" | "manual";
LeaseAdjustmentIndex = "ICL" | "IPC" | "CER" | "CVS" | "UVA";
ReceiptStatus =
  "draft" |
  "generated" |
  "sent" |
  "signature_pending" |
  "signed" |
  "paid" |
  "cancelled" |
  "failed";
PaymentStatus = "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded";
SignatureStatus =
  "pending" | "landlord_signed" | "fully_signed" | "declined" | "expired";
```

## Receipt Generation Flow

`createReceipt()` action: validate input → rate-limit check → fetch lease+tenant (snapshot data) → generate PDF → upload to Supabase Storage → save receipt to DB → send email. If DB insert fails, uploaded PDF is cleaned up. Receipts now require a `lease_id` FK.

## Online Payment Flow (Mercado Pago, Optional)

Tenant-initiated payments via Mercado Pago Checkout Pro:

1. Tenant calls `initiateOnlinePayment(receiptId)` from `lib/actions/payments.ts` (uses `getCurrentTenant()` for auth).
2. Action checks for an existing `pending`/`processing` payment with a `checkout_url` and reuses it (idempotent).
3. Otherwise: creates a `payments` row with `status='pending'`, then calls `createCheckoutPreference()` from `lib/payments/mercadopago-client.ts` with `external_reference = payments.id`.
4. Saves `checkout_url` (sandbox: `sandbox_init_point`, production: `init_point` — auto-detected from token prefix `TEST-`) and redirects tenant.
5. On return, tenant lands at `/tenant/payment/{success,failure,pending}`.
6. MP sends a webhook to `POST /api/webhooks/mercadopago`. The handler:
   - Verifies HMAC-SHA256 signature (`x-signature` / `x-request-id` headers). Required in production; skipped in dev.
   - Fetches full payment details from MP API (`GET /v1/payments/:id`).
   - Reconciles via `external_reference` → our `payments.id`.
   - Calls `processProviderPaymentEvent()` — idempotent via `UNIQUE(provider, provider_event_id)` on `payment_events`.
   - Maps MP status (`approved→paid`, `rejected→failed`, `refunded→refunded`, etc.) and updates `payments` + `receipts`.

Staff can also record offline payments (cash/transfer) via `registerManualPayment()`, which calls the `register_payment` DB RPC atomically.

## Digital Signatures Flow (Optional)

Digital signatures via HelloSign (Dropbox Sign):

1. After receipt creation, `requestSignature()` action creates a signature request with landlord (order 0) and tenant (order 1) as signers.
2. Webhook handler (`app/api/webhooks/hellosign/route.ts`) processes events:
   - `signature_request_signed` → updates receipt status (`landlord_signed` → `fully_signed`)
   - `signature_request_all_signed` → downloads signed PDF, uploads to Storage, updates `signed_document_url`
   - `signature_request_declined` → marks receipt as declined
3. All events are logged in `signature_events` table for audit trail.

## Business Rules

- Receipts are **immutable snapshots** — tenant/property data is copied at creation time into `snapshot_*` fields.
- Currency support: ARS and USD.
- Properties cannot be archived if they have active leases; tenants cannot be archived if they have receipts.
- One receipt per tenant per period (DB unique constraint on `tenant_id + period`).
- Rate limiting: 10 receipts/min, 5 properties/min, 20 emails/hour (in-memory; switch to Redis for production).
- Leases support automatic rent adjustments by percentage, index (ICL/IPC/CER/CVS/UVA), fixed amount, or manual — stored in `adjustment_*` columns.

## Path Alias

`@/*` maps to project root (e.g., `@/lib/actions/properties`).

## Environment Variables

Required in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`.

Optional (for digital signatures): `HELLOSIGN_API_KEY`, `HELLOSIGN_CLIENT_ID`.

Optional (for online tenant payments): `MERCADOPAGO_ACCESS_TOKEN` (use `TEST-…` prefix for sandbox), `MERCADOPAGO_WEBHOOK_SECRET` (required in production for HMAC verification).
