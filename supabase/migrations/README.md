# Supabase Migrations

Apply migrations in chronological order using the Supabase SQL Editor or CLI.

## Active migrations

### `20260404000002_views_functions_provisioning.sql`

The main migration. Applies the full current schema:

- RLS enabled on all 10 tables with `account_id`-scoped policies
- `has_account_role()` SECURITY DEFINER helper
- Views: `leases_overview`, `receipt_timeline_overview`, `account_dashboard_overview`, `active_properties_overview`, `active_tenants_overview`, `active_receipts_overview`, `active_payments_overview`, `account_members_overview`
- RPCs: `archive_property`, `archive_tenant`, `issue_receipt`, `cancel_receipt`, `append_signature_event`, `register_payment`
- `handle_new_user()` trigger on `auth.users` INSERT — auto-provisions `accounts`, `account_users`, `profiles` for every new signup

**This migration must be applied before the app can serve any authenticated request.**

## How to apply

**Dashboard (development):**
1. Supabase Dashboard → SQL Editor → New query
2. Paste the migration file contents
3. Run

**CLI (production):**
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### `20260405000001_property_images.sql`

Adds property photo management:

- `cover_image_url TEXT` column on `properties`
- `property_images` table (id, account_id, property_id, storage_path, url, is_cover, position)
- RLS policies on `property_images` (members can SELECT; owner/admin/assistant can INSERT/UPDATE/DELETE)

Also requires creating a private Storage bucket named **`property-images`** manually in the Supabase Dashboard (Storage → New bucket, set private, 5 MB limit, allow jpeg/png/webp).

**Apply after `000002`.**

## Archive

`archive/20260404000001_add_signature_fields.sql` — Early draft that adds signature columns to receipts. Superseded by `000002`. Do not apply.
