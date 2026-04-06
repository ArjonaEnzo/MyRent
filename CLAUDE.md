# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyRent is a multi-tenant SaaS for rental property management. Landlords manage properties, tenants, and generate immutable rent receipts (PDF + email). Written in Spanish (es-AR locale).

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

## Architecture

### Route Groups
- `app/(auth)/` — Public routes: login, signup. Middleware redirects authenticated users to `/dashboard`.
- `app/(dashboard)/` — Protected routes: dashboard, properties, tenants, receipts (CRUD pages). Middleware redirects unauthenticated users to `/login`.
- `app/api/` — Webhooks and public endpoints. Contains `/api/webhooks/hellosign` for HelloSign digital signature callbacks.

### Data Flow Pattern
Pages (Server Components) call server actions directly. Mutations use Server Actions in `lib/actions/`, which:
1. Validate input with Zod schemas from `lib/validations/`
2. Authenticate via `getCurrentUser()` from `lib/supabase/auth.ts`
3. Query Supabase (RLS enforces `owner_id = auth.uid()` automatically)
4. Call `revalidatePath()` after mutations

### Key Layers
- **`lib/supabase/`** — Three client factories: `client.ts` (browser), `server.ts` (Server Components/Actions with `createClient()` and `createAdminClient()` for service-role operations), `middleware.ts` (session refresh).
- **`lib/actions/`** — Server Actions for auth, properties, tenants, receipts, signatures, profile. All marked `'use server'`.
- **`lib/validations/`** — Zod schemas mirroring each entity (auth, property, tenant, receipt, profile, common).
- **`lib/utils/`** — Custom error classes (`AppError` hierarchy with status codes), logger, in-memory rate limiter, retry with exponential backoff.
- **`lib/utils.ts`** — Shadcn `cn()` utility (clsx + tailwind-merge).
- **`lib/i18n/translations.ts`** — Spanish/English UI string translations; used via `language-provider` context.
- **`lib/pdf/receipt-template.tsx`** — React PDF component for receipt generation.
- **`lib/email/receipt-email.ts`** — Sends receipt email via Resend with PDF download link.
- **`lib/signatures/hellosign-client.ts`** — HelloSign (Dropbox Sign) client for digital signatures.
- **`lib/env.ts`** — Zod-validated environment variables.
- **`components/`** — Organized by domain: `ui/` (Shadcn), `dashboard/`, `properties/`, `tenants/`, `receipts/`, `account/`, `providers/`, `shared/`.
- **`types/database.types.ts`** — Auto-generated Supabase types. Regenerate with: `npx supabase gen types typescript --project-id "PROJECT_REF" > types/database.types.ts`
- **`supabase/migrations/`** — SQL migration files for database schema changes.
- **`docs/`** — `backend-contract.md` and `db-schema.sql` for reference.

## Database Schema

Active tables (reflected in `types/database.types.ts`):

| Table | Key columns |
|---|---|
| `profiles` | `id` (= auth uid), `full_name` |
| `properties` | `id`, `owner_id`, `name`, `address` |
| `tenants` | `id`, `owner_id`, `property_id`, `full_name`, `email`, `dni_cuit`, `current_rent_amount`, `currency` |
| `receipts` | `id`, `owner_id`, `tenant_id`, `period` (YYYY-MM), snapshot fields, `pdf_url`, `email_sent`, `description` |
| `signature_events` | audit trail for HelloSign webhook events (not yet in generated types) |

RLS enforces `owner_id = auth.uid()` on all business tables. All Supabase queries from server actions use the user-scoped client; admin client (`createAdminClient`) is used only for Storage operations that need to bypass RLS.

## Receipt Generation Flow
`createReceipt()` action: validate input → rate-limit check → fetch tenant (snapshot data) → generate PDF → upload to Supabase Storage → save receipt to DB → send email. If DB insert fails, uploaded PDF is cleaned up.

## Digital Signatures Flow (Optional)
Digital signatures via HelloSign (Dropbox Sign):
1. After receipt creation, `requestSignature()` action creates a signature request with landlord (order 0) and tenant (order 1) as signers.
2. Webhook handler (`app/api/webhooks/hellosign/route.ts`) processes events:
   - `signature_request_signed` → updates receipt status (`landlord_signed` → `fully_signed`)
   - `signature_request_all_signed` → downloads signed PDF, uploads to Storage, updates `signed_document_url`
   - `signature_request_declined` → marks receipt as declined
3. All events are logged in `signature_events` table for audit trail.

## Business Rules
- Receipts are **immutable snapshots** — tenant data is copied at creation time.
- Currency support: ARS and USD.
- Properties cannot be deleted if they have tenants; tenants cannot be deleted if they have receipts.
- One receipt per tenant per period (DB unique constraint on `tenant_id + period`).
- Rate limiting: 10 receipts/min, 5 properties/min, 20 emails/hour (in-memory; switch to Redis for production).
- Signature statuses: `pending` → `landlord_signed` → `fully_signed` (or `declined`).

## Path Alias

`@/*` maps to project root (e.g., `@/lib/actions/properties`).

## Environment Variables

Required in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`.

Optional (for digital signatures): `HELLOSIGN_API_KEY`, `HELLOSIGN_CLIENT_ID`.
