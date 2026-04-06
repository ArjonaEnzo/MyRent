import { createClient, createAdminClient } from '@/lib/supabase/server'
import { UnauthorizedError } from '@/lib/utils/errors'
import { logger } from '@/lib/utils/logger'
import type { User } from '@supabase/supabase-js'
import type { ServerClient } from './server'

/**
 * Obtiene el usuario autenticado actual
 * Lanza UnauthorizedError si no está autenticado
 *
 * Usar en Server Actions y Route Handlers
 */
export async function getCurrentUser(): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new UnauthorizedError('Debes iniciar sesión para realizar esta acción')
  }

  return user
}

/**
 * Obtiene el usuario autenticado y el cliente Supabase
 * Optimización: evita crear el cliente dos veces
 *
 * @returns {user, supabase}
 */
export async function getCurrentUserWithClient(): Promise<{ user: User; supabase: ServerClient }> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new UnauthorizedError('Debes iniciar sesión para realizar esta acción')
  }

  return { user, supabase }
}

/**
 * Obtiene usuario + account_id + cliente Supabase en una sola llamada.
 * Todos los actions del modelo multi-cuenta deben usar esto en vez de
 * getCurrentUserWithClient() para obtener el account_id correcto.
 *
 * Si el usuario no tiene una cuenta asociada (trigger no ejecutado aún o
 * usuario creado antes del trigger), la provisiona automáticamente usando
 * el service-role client y continúa sin interrumpir la sesión.
 */
export async function getCurrentUserWithAccount(): Promise<{
  user: User
  accountId: string
  supabase: ServerClient
}> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new UnauthorizedError('Debes iniciar sesión para realizar esta acción')
  }

  // Use the admin client for this lookup to bypass RLS.
  // The user-scoped client can return null if the migration hasn't been applied yet
  // (no policies defined), which would cause a new account to be created on every request.
  const adminSupabase = createAdminClient()

  const { data: accountUser } = await adminSupabase
    .from('account_users')
    .select('account_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (accountUser) {
    return { user, accountId: accountUser.account_id, supabase }
  }

  // No account_users row found — provision one now.
  // This covers: existing users created before the trigger was deployed,
  // and any case where the handle_new_user() trigger silently failed.
  logger.warn('No account found for authenticated user — provisioning now', { userId: user.id })
  const accountName = user.email?.split('@')[0] ?? user.id

  const { data: newAccount, error: accountError } = await adminSupabase
    .from('accounts')
    .insert({ name: accountName })
    .select('id')
    .single()

  if (accountError || !newAccount) {
    logger.error('Failed to auto-provision account', { userId: user.id, error: accountError?.message })
    throw new UnauthorizedError('No se pudo configurar tu cuenta. Intenta cerrar sesión e iniciar de nuevo.')
  }

  const { error: auError } = await adminSupabase.from('account_users').insert({
    account_id: newAccount.id,
    user_id: user.id,
    role: 'owner',
  })

  if (auError) {
    logger.error('Failed to auto-provision account_users', { userId: user.id, error: auError.message })
    throw new UnauthorizedError('No se pudo configurar tu cuenta. Intenta cerrar sesión e iniciar de nuevo.')
  }

  await adminSupabase
    .from('profiles')
    .upsert({ id: user.id, full_name: accountName }, { onConflict: 'id', ignoreDuplicates: true })

  logger.info('Account auto-provisioned for existing user', { userId: user.id, accountId: newAccount.id })

  return { user, accountId: newAccount.id, supabase }
}

/**
 * Versión que retorna null en lugar de lanzar error
 * Útil para casos donde el usuario puede o no estar autenticado
 */
export async function getCurrentUserOrNull(): Promise<User | null> {
  try {
    return await getCurrentUser()
  } catch {
    return null
  }
}
