import { createClient } from '@/lib/supabase/server'
import { UnauthorizedError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import type { User } from '@supabase/supabase-js'
import type { ServerClient } from './server'

/**
 * Represents a resolved tenant portal session.
 *
 * Analogous to the {user, accountId, supabase} tuple returned by
 * getCurrentUserWithAccount() for staff users, but scoped to the tenant model.
 *
 * - user       → the Supabase Auth user (the tenant's login)
 * - tenantId   → the tenants.id record linked to this auth user
 * - accountId  → the account that owns this tenant record (landlord's account)
 * - supabase   → the user-scoped client (RLS applies — only their own data visible)
 */
export type TenantSession = {
  user: User
  tenantId: string
  accountId: string
  supabase: ServerClient
}

/**
 * Resolves the current auth user as a tenant portal user.
 *
 * Differs from getCurrentUserWithAccount() in that:
 *   - It looks up tenants.auth_user_id = user.id instead of account_users.user_id
 *   - It throws UnauthorizedError if the user is not linked to any active tenant
 *   - Staff users (who are not in tenants.auth_user_id) will be rejected here
 *
 * Use this in all tenant-scoped Server Actions and pages under app/(tenant)/.
 *
 * @throws UnauthorizedError if not authenticated or not a tenant user
 */
export async function getCurrentTenant(): Promise<TenantSession> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new UnauthorizedError('Debes iniciar sesión para acceder al portal del inquilino')
  }

  // The user-scoped client can see tenants.auth_user_id via the new RLS policy
  // "tenants: tenant reads own record" which allows auth_user_id = auth.uid().
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, account_id')
    .eq('auth_user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (tenantError) {
    logger.error('Error resolving tenant session', { userId: user.id, error: tenantError.message })
    throw new UnauthorizedError('Error al verificar tu acceso. Intenta cerrar sesión e iniciar de nuevo.')
  }

  if (!tenant) {
    logger.warn('Auth user has no linked tenant record', { userId: user.id })
    throw new UnauthorizedError(
      'Tu cuenta no está asociada a ningún inquilino. '
      + 'Contactá a tu propietario para obtener acceso al portal.'
    )
  }

  return {
    user,
    tenantId: tenant.id,
    accountId: tenant.account_id,
    supabase,
  }
}

/**
 * Returns the current tenant session or null — non-throwing variant.
 * Use in pages that need to gracefully handle both tenant and non-tenant users.
 */
export async function getCurrentTenantOrNull(): Promise<TenantSession | null> {
  try {
    return await getCurrentTenant()
  } catch {
    return null
  }
}

/**
 * Returns true if the current auth user is linked to an active tenant record.
 * Uses the DB function get_tenant_id_for_user() via RPC.
 * Prefer getCurrentTenant() in Server Actions (it returns the full session).
 * Use this in middleware or layout checks where only a boolean is needed.
 */
export async function isTenantUser(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('is_tenant_user')
    if (error) return false
    return data === true
  } catch {
    return false
  }
}
