# backend-contract.md

## MyRent backend contract

This document describes the current backend contract used by the app.

## Core concepts

### Multi-tenant model

Every business entity belongs to an `account_id`.

Membership and permissions are handled by:

- `account_users`
- roles:
  - owner
  - admin
  - assistant
  - accountant
  - viewer

### Business entities

- `properties`
- `tenants`
- `leases`
- `receipts`
- `payments`
- `signature_events`
- `audit_logs`

### Soft delete

These entities use soft delete:

- properties
- tenants
- leases
- receipts
- payments

Soft delete fields:

- `deleted_at`
- `deleted_by`
- `delete_reason`

## Backend rules

### Receipts

- Receipts are immutable snapshots
- Receipts belong to a lease, property, tenant, and account
- Do not hard delete receipts
- Cancelling a receipt should mark it as cancelled / soft deleted
- Do not cancel receipts that already have paid payments

### Payments

- Payments belong to receipts
- Do not register payments on:
  - deleted receipts
  - cancelled receipts
- Payments are audited

### Tenants / Properties

- Archive instead of hard delete
- Do not archive tenants with active leases
- Do not archive properties with active leases

### Signatures

- Signature events are logged in `signature_events`
- Signature workflow is tracked separately from payments
- A receipt can have signature events over time

## RPC functions

### issue_receipt

Purpose:

- Create or return a receipt for a lease and period
- Fill receipt snapshot fields from the current lease/property/tenant data
- Audit receipt creation

Parameters:

- `p_actor_user_id uuid`
- `p_account_id uuid`
- `p_lease_id uuid`
- `p_period text`
- `p_description text default null`

Returns:

- `public.receipts`

### register_payment

Purpose:

- Register a payment for a receipt
- Mark receipt as paid
- Audit payment registration

Parameters:

- `p_actor_user_id uuid`
- `p_account_id uuid`
- `p_receipt_id uuid`
- `p_amount numeric`
- `p_currency text default 'ARS'`
- `p_payment_method text default null`
- `p_reference text default null`
- `p_notes text default null`

Returns:

- `public.payments`

Validation:

- actor must have allowed role
- receipt must exist
- receipt must not be deleted
- receipt must not be cancelled
- amount must be > 0

### append_signature_event

Purpose:

- Append a signature event to a receipt
- Update signature-related status fields when applicable
- Audit signature activity

Parameters:

- `p_actor_user_id uuid`
- `p_account_id uuid`
- `p_receipt_id uuid`
- `p_event_type text`
- `p_signer_email text default null`
- `p_signer_role text default null`
- `p_event_data jsonb default '{}'::jsonb`

Returns:

- `public.signature_events`

Notes:

- current implementation supports idempotent behavior for repeated `signature_requested` in pending state

### cancel_receipt

Purpose:

- Soft-cancel a receipt
- Audit cancellation

Parameters:

- `p_actor_user_id uuid`
- `p_account_id uuid`
- `p_receipt_id uuid`
- `p_reason text default null`

Returns:

- `public.receipts`

Validation:

- actor must have role owner/admin
- receipt must exist
- cannot cancel if paid payments exist

### archive_tenant

Purpose:

- Soft-archive tenant
- Audit archive action

Parameters:

- `p_actor_user_id uuid`
- `p_account_id uuid`
- `p_tenant_id uuid`
- `p_reason text default null`

Returns:

- `public.tenants`

Validation:

- actor must have role owner/admin
- cannot archive tenant with active leases

### archive_property

Purpose:

- Soft-archive property
- Audit archive action

Parameters:

- `p_actor_user_id uuid`
- `p_account_id uuid`
- `p_property_id uuid`
- `p_reason text default null`

Returns:

- `public.properties`

Validation:

- actor must have role owner/admin
- cannot archive property with active leases

## Helper functions

### has_account_role

Purpose:

- Check whether a user belongs to an account with one of the allowed roles

Parameters:

- `p_account_id uuid`
- `p_user_id uuid`
- `p_roles text[]`

Returns:

- boolean

## Main views

### Dashboard / summary

- `account_dashboard_overview`

### Receipts

- `active_receipts_overview`
- `receipt_timeline_overview`

### Payments

- `active_payments_overview`
- optional stricter variant:
  - `active_payments_clean_overview`

### Leases

- `leases_overview`

### Tenants

- `active_tenants_overview`

### Properties

- `active_properties_overview`

### Members

- `account_members_overview`

## Frontend usage rules

Use views for:

- dashboards
- tables
- read-only screens

Use RPC/functions for:

- issue receipt
- register payment
- request / append signature event
- cancel receipt
- archive tenant
- archive property

Avoid:

- direct raw `insert/update/delete` from the client for business-critical flows
