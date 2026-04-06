# Documentación de Arquitectura - MyRent

## Project Structure

```
myrent/
├── app/
│   ├── (auth)/              # Public routes: login, signup
│   ├── (dashboard)/         # Protected routes: dashboard, properties, tenants, leases, receipts
│   ├── api/webhooks/        # Webhook handlers (HelloSign)
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client
│   │   ├── server.ts        # Server Components/Actions client + createAdminClient()
│   │   ├── middleware.ts    # Middleware session refresh
│   │   └── auth.ts          # getCurrentUserWithAccount() — resolves user + account_id
│   ├── actions/             # Server Actions (auth, properties, tenants, leases, receipts, signatures, profile)
│   ├── validations/         # Zod schemas mirroring each entity
│   ├── pdf/                 # @react-pdf/renderer receipt template
│   ├── email/               # Resend email sending
│   ├── signatures/          # HelloSign client
│   └── utils/
│       ├── errors.ts        # AppError hierarchy with HTTP status codes
│       ├── logger.ts        # Structured logger
│       ├── retry.ts         # Exponential backoff retry
│       └── rate-limit.ts    # In-memory rate limiter
├── components/
│   ├── ui/                  # Shadcn UI components
│   ├── dashboard/           # Layout: Header, Sidebar, MobileSidebar
│   ├── properties/          # PropertyForm, PropertiesGridClient, DeletePropertyButton
│   ├── tenants/             # TenantForm, TenantsGridClient, DeleteTenantButton
│   ├── leases/              # LeaseForm
│   ├── receipts/            # ReceiptForm, ReceiptsTableClient, ResendEmailButton, SignatureStatus
│   ├── account/             # AccountContent
│   ├── shared/              # EmptyState, PageHeader
│   └── providers/           # ThemeProvider, LanguageProvider
├── types/
│   └── database.types.ts    # Manually maintained Supabase types
├── supabase/migrations/     # SQL migration files
├── docs/                    # db-schema.sql, backend-contract.md, DIGITAL_SIGNATURES_SETUP.md
└── __tests__/               # Vitest unit tests
```

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Never expose to client
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@tudominio.com
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional (digital signatures)
HELLOSIGN_API_KEY=...
HELLOSIGN_CLIENT_ID=...
```

## Architectural Decisions

### 1. Multi-tenant with accounts + RLS
Each user belongs to an `account_users` row that links them to an `accounts` row. All business tables use `account_id` (not `auth.uid()` directly). `getCurrentUserWithAccount()` resolves both in one call. RLS policies join through `account_users` using a `has_account_role()` SECURITY DEFINER helper so they remain stable across query plans.

**Why not `owner_id = auth.uid()`**: Supports multiple team members per account (roles: owner, admin, assistant, accountant, viewer) without code changes.

### 2. Server Actions vs API Routes
Server Actions for all mutations. API Routes only for external webhooks (HelloSign) where the caller can't use cookies.

### 3. Snapshot Receipts
When a receipt is created, tenant and property data is copied into `snapshot_*` columns. Receipts are immutable records of what was true at emission time. If tenant details change, historical receipts are unaffected — legally required.

### 4. Lease-centric receipt model
Receipts require a `lease_id`. Amount, currency, tenant, and property are read from `leases_overview` at creation time, not re-entered. This enforces that receipts always correspond to a real rental agreement.

### 5. Soft Delete
Properties, tenants, leases, and receipts use soft delete (`deleted_at`, `deleted_by`, `delete_reason`). Hard deletes are blocked via `archive_property` and `archive_tenant` RPCs that enforce business rules (e.g., cannot archive a property with active leases).

### 6. Rate Limiting in Memory
In-memory rate limiter for MVP (10 receipts/min, 5 properties/min, 20 emails/hour). Resets on server restart. Switch to Redis (Upstash) before multi-instance deployment.

### 7. Error Handling with Custom Classes
`AppError` hierarchy (`UnauthorizedError`, `NotFoundError`, `ValidationError`, etc.) with HTTP status codes. Enables consistent error logging and future Sentry integration.

## Receipt Generation Flow

```
createReceipt() Server Action
  → Validate input (Zod) + rate limit check
  → Fetch lease from leases_overview (validates account_id ownership)
  → Generate PDF (@react-pdf/renderer)
  → Upload PDF to Supabase Storage (admin client, bypasses RLS)
  → Insert receipt row in DB (user-scoped client, RLS enforced)
  → If DB insert fails: delete orphaned PDF from Storage
  → Send email via Resend (non-blocking; if fails, email_sent stays false)
  → redirect() to receipt detail page
```

## Digital Signatures Flow (Optional)

Enabled when `HELLOSIGN_API_KEY` is set. See `docs/DIGITAL_SIGNATURES_SETUP.md` for setup.

```
sendReceiptForSignature() → HelloSign API → signature_request_id stored on receipt
Webhook (POST /api/webhooks/hellosign) → HMAC-SHA256 verification → update receipt status
signature_request_all_signed → download signed PDF → overwrite pdf_url in DB
All events logged in signature_events table
```

## Deployment (Vercel)

Vercel auto-detects pnpm from `pnpm-lock.yaml`.

**Checklist before first deploy:**
- Apply `supabase/migrations/20260404000002_views_functions_provisioning.sql` — creates all views, RPCs, RLS policies, and the `handle_new_user()` provisioning trigger
- Set all required env vars in Vercel dashboard
- Configure HelloSign webhook URL if using digital signatures
- Enable Supabase Storage bucket `receipts` (private, RLS on)
