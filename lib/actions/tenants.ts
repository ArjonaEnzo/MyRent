'use server'

import { getCurrentUserWithAccount, requireRole } from '@/lib/supabase/auth'
import { tenantSchema, type TenantInput } from '@/lib/validations/tenant'
import type { Database } from '@/types/database.types'

type Tenant = Database['public']['Tables']['tenants']['Row']
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect'
import { logger, logError } from '@/lib/utils/logger'
import { z } from 'zod'
import { propertyRateLimit } from '@/lib/utils/rate-limit'
import { validateId } from '@/lib/validations/common'

export async function createTenant(formData: TenantInput) {
  try {
    const { user, accountId, supabase } = await getCurrentUserWithAccount()

    await propertyRateLimit.limit(user.id)

    const validated = tenantSchema.parse(formData)

    const { error } = await supabase.from('tenants').insert({
      account_id: accountId,
      full_name: validated.full_name,
      email: validated.email || null,
      phone: validated.phone || null,
      dni_cuit: validated.dni_cuit || null,
    })

    if (error) {
      logger.error('Failed to create tenant', { error: error.message })
      return { success: false, error: 'Error al crear el inquilino' }
    }

    logger.info('Tenant created', { userId: user.id, accountId })
    revalidatePath('/tenants')
    redirect('/tenants')
  } catch (error) {
    if (isRedirectError(error)) throw error

    logError(error, { action: 'createTenant' })

    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos inválidos', errors: error.errors }
    }

    return { success: false, error: 'Error al crear el inquilino' }
  }
}

export async function updateTenant(id: string, formData: TenantInput) {
  try {
    const validId = validateId(id)

    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])
    const validated = tenantSchema.parse(formData)

    const { error } = await supabase
      .from('tenants')
      .update({
        full_name: validated.full_name,
        email: validated.email || null,
        phone: validated.phone || null,
        dni_cuit: validated.dni_cuit || null,
      })
      .eq('id', validId)
      .eq('account_id', accountId)

    if (error) {
      logger.error('Failed to update tenant', { error: error.message })
      return { success: false, error: 'Error al actualizar el inquilino' }
    }

    logger.info('Tenant updated', { tenantId: validId, userId: user.id })
    revalidatePath('/tenants')
    redirect('/tenants')
  } catch (error) {
    if (isRedirectError(error)) throw error

    logError(error, { action: 'updateTenant' })

    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos inválidos', errors: error.errors }
    }

    return { success: false, error: 'Error al actualizar el inquilino' }
  }
}

export async function deleteTenant(id: string) {
  try {
    const validId = validateId(id)

    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    // Verificar que no tenga contratos activos
    const { count } = await supabase
      .from('leases')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', validId)
      .eq('account_id', accountId)
      .eq('status', 'active')

    if (count && count > 0) {
      return {
        success: false,
        error: 'No puedes archivar un inquilino que tiene contratos activos',
      }
    }

    const { error } = await supabase.rpc('archive_tenant', {
      p_actor_user_id: user.id,
      p_account_id: accountId,
      p_tenant_id: validId,
    })

    if (error) {
      logger.error('Failed to archive tenant', { error: error.message })
      return { success: false, error: 'Error al eliminar el inquilino' }
    }

    logger.info('Tenant archived', { tenantId: validId, userId: user.id })
    revalidatePath('/tenants')
    return { success: true }
  } catch (error) {
    logError(error, { action: 'deleteTenant' })
    return { success: false, error: 'Error al eliminar el inquilino' }
  }
}

export async function getTenants(options?: {
  page?: number
  limit?: number
  search?: string
}): Promise<{ tenants: Tenant[]; total: number }> {
  const { accountId, supabase } = await getCurrentUserWithAccount()

  const page = options?.page ?? 1
  const limit = options?.limit ?? 50
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('tenants')
    .select('*', { count: 'exact' })
    .eq('account_id', accountId)
    .is('deleted_at', null)

  if (options?.search) {
    query = query.or(`full_name.ilike.%${options.search}%,email.ilike.%${options.search}%`)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    logger.error('Failed to fetch tenants', { error: error.message })
    return { tenants: [], total: 0 }
  }

  return { tenants: data, total: count ?? 0 }
}

export async function getTenant(id: string): Promise<Tenant | null> {
  const validId = validateId(id)

  const { accountId, supabase } = await getCurrentUserWithAccount()

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', validId)
    .eq('account_id', accountId)
    .single()

  if (error) {
    return null
  }

  return data
}

export async function getArchivedTenants(): Promise<Tenant[]> {
  const { accountId, supabase } = await getCurrentUserWithAccount()

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('account_id', accountId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })

  if (error) {
    logger.error('Failed to fetch archived tenants', { error: error.message })
    return []
  }
  return data
}

export async function reactivateTenant(id: string) {
  try {
    const validId = validateId(id)
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    const { error } = await supabase
      .from('tenants')
      .update({ deleted_at: null, deleted_by: null, delete_reason: null })
      .eq('id', validId)
      .eq('account_id', accountId)

    if (error) {
      logger.error('Failed to reactivate tenant', { error: error.message })
      return { success: false, error: 'Error al reactivar el inquilino' }
    }

    revalidatePath('/tenants')
    return { success: true }
  } catch (error) {
    logError(error, { action: 'reactivateTenant' })
    return { success: false, error: 'Error al reactivar el inquilino' }
  }
}
