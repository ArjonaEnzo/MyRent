'use server'

import { getCurrentUserWithAccount, requireRole } from '@/lib/supabase/auth'
import { leaseSchema, leaseAdjustmentSchema, type LeaseInput, type LeaseAdjustmentInput } from '@/lib/validations/lease'
import type { Database } from '@/types/database.types'

type LeaseOverview = Database['public']['Views']['leases_overview']['Row']
type LeaseAdjustment = Database['public']['Tables']['lease_adjustments']['Row']
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { logger, logError } from '@/lib/utils/logger'
import { z } from 'zod'
import { validateId } from '@/lib/validations/common'

export async function createLease(formData: LeaseInput) {
  try {
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])
    const validated = leaseSchema.parse(formData)

    const { error } = await supabase.from('leases').insert({
      account_id: accountId,
      property_id: validated.property_id,
      tenant_id: validated.tenant_id,
      start_date: validated.start_date,
      end_date: validated.end_date || null,
      rent_amount: validated.rent_amount,
      currency: validated.currency,
      notes: validated.notes || null,
      status: 'active',
      billing_day: validated.billing_day,
      auto_billing_enabled: validated.auto_billing_enabled,
      adjustment_type: validated.adjustment_type === 'none' ? null : validated.adjustment_type,
      adjustment_frequency_months: validated.adjustment_frequency_months ?? null,
      adjustment_percentage: validated.adjustment_percentage ?? null,
      adjustment_index: validated.adjustment_index ?? null,
      adjustment_fixed_amount: validated.adjustment_fixed_amount ?? null,
    })

    if (error) {
      logger.error('Failed to create lease', { error: error.message })
      return { success: false, error: 'Error al crear el contrato' }
    }

    logger.info('Lease created', { userId: user.id, accountId })
    revalidatePath('/receipts')
    redirect('/receipts/new')
  } catch (error) {
    if (isRedirectError(error)) throw error
    logError(error, { action: 'createLease' })
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos inválidos', errors: error.errors }
    }
    return { success: false, error: 'Error al crear el contrato' }
  }
}

export async function updateLease(id: string, formData: LeaseInput) {
  try {
    const validId = validateId(id)
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])
    const validated = leaseSchema.parse(formData)

    const { error } = await supabase
      .from('leases')
      .update({
        property_id: validated.property_id,
        tenant_id: validated.tenant_id,
        start_date: validated.start_date,
        end_date: validated.end_date || null,
        rent_amount: validated.rent_amount,
        currency: validated.currency,
        notes: validated.notes || null,
        billing_day: validated.billing_day,
        auto_billing_enabled: validated.auto_billing_enabled,
        adjustment_type: validated.adjustment_type === 'none' ? null : validated.adjustment_type,
        adjustment_frequency_months: validated.adjustment_frequency_months ?? null,
        adjustment_percentage: validated.adjustment_percentage ?? null,
        adjustment_index: validated.adjustment_index ?? null,
        adjustment_fixed_amount: validated.adjustment_fixed_amount ?? null,
      })
      .eq('id', validId)
      .eq('account_id', accountId)

    if (error) {
      logger.error('Failed to update lease', { error: error.message })
      return { success: false, error: 'Error al actualizar el contrato' }
    }

    logger.info('Lease updated', { leaseId: validId, userId: user.id })
    revalidatePath('/leases')
    redirect('/leases')
  } catch (error) {
    if (isRedirectError(error)) throw error
    logError(error, { action: 'updateLease' })
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos inválidos', errors: error.errors }
    }
    return { success: false, error: 'Error al actualizar el contrato' }
  }
}

export async function getLeases(options?: {
  page?: number
  limit?: number
  status?: string
}): Promise<{ leases: LeaseOverview[]; total: number }> {
  const { accountId, supabase } = await getCurrentUserWithAccount()

  const page = options?.page ?? 1
  const limit = options?.limit ?? 50
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('leases_overview')
    .select('*', { count: 'exact' })
    .eq('account_id', accountId)

  if (options?.status) {
    query = query.eq('status', options.status as 'draft' | 'active' | 'ended' | 'cancelled')
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    logger.error('Failed to fetch leases', { error: error.message })
    return { leases: [], total: 0 }
  }

  return { leases: data, total: count ?? 0 }
}

export async function reactivateLease(id: string) {
  try {
    const validId = validateId(id)
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    const { error } = await supabase
      .from('leases')
      .update({ status: 'active' as const, end_date: null })
      .eq('id', validId)
      .eq('account_id', accountId)

    if (error) {
      logger.error('Failed to reactivate lease', { error: error.message })
      return { success: false, error: 'Error al reactivar el contrato' }
    }

    revalidatePath('/leases')
    return { success: true }
  } catch (error) {
    logError(error, { action: 'reactivateLease' })
    return { success: false, error: 'Error al reactivar el contrato' }
  }
}

export async function terminateLease(id: string) {
  try {
    const validId = validateId(id)
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    const { error } = await supabase
      .from('leases')
      .update({
        status: 'ended',
        end_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', validId)
      .eq('account_id', accountId)

    if (error) {
      logger.error('Failed to terminate lease', { error: error.message })
      return { success: false, error: 'Error al dar de baja el contrato' }
    }

    logger.info('Lease terminated', { leaseId: validId, userId: user.id })
    revalidatePath('/leases')
    return { success: true }
  } catch (error) {
    logError(error, { action: 'terminateLease' })
    return { success: false, error: 'Error al dar de baja el contrato' }
  }
}

export async function getLease(id: string): Promise<LeaseOverview | null> {
  const validId = validateId(id)
  const { accountId, supabase } = await getCurrentUserWithAccount()

  const { data, error } = await supabase
    .from('leases_overview')
    .select('*')
    .eq('id', validId)
    .eq('account_id', accountId)
    .single()

  if (error) return null
  return data
}

export async function getLeaseWithConfig(id: string) {
  const validId = validateId(id)
  const { accountId, supabase } = await getCurrentUserWithAccount()

  const { data, error } = await supabase
    .from('leases')
    .select('*')
    .eq('id', validId)
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .single()

  if (error) return null
  return data
}

export async function getLeaseAdjustments(leaseId: string): Promise<LeaseAdjustment[]> {
  const validId = validateId(leaseId)
  const { accountId, supabase } = await getCurrentUserWithAccount()

  const { data, error } = await supabase
    .from('lease_adjustments')
    .select('*')
    .eq('lease_id', validId)
    .eq('account_id', accountId)
    .order('effective_date', { ascending: false })

  if (error) {
    logger.error('Failed to fetch lease adjustments', { error: error.message })
    return []
  }
  return data
}

export async function applyAdjustment(formData: LeaseAdjustmentInput) {
  try {
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    const validated = leaseAdjustmentSchema.parse(formData)
    const validLeaseId = validateId(validated.lease_id)

    // Delega a la RPC atómica: INSERT lease_adjustments + UPDATE leases.rent_amount
    // + audit_log en una sola transacción con row-level lock.
    const { error } = await supabase.rpc('apply_lease_adjustment', {
      p_actor_user_id:    user.id,
      p_account_id:       accountId,
      p_lease_id:         validLeaseId,
      p_effective_date:   validated.effective_date,
      p_new_amount:       validated.new_amount,
      p_adjustment_type:  validated.adjustment_type,
      p_adjustment_value: validated.adjustment_value ?? undefined,
      p_notes:            validated.notes ?? undefined,
    })

    if (error) {
      if (error.message.includes('insufficient_privilege')) {
        return { success: false, error: 'No tenés permisos para aplicar ajustes' }
      }
      if (error.message.includes('invalid_state')) {
        return { success: false, error: 'Solo se pueden aplicar ajustes a contratos activos' }
      }
      logger.error('Failed to apply adjustment via RPC', { error: error.message })
      return { success: false, error: 'Error al aplicar el ajuste' }
    }

    logger.info('Adjustment applied', { leaseId: validLeaseId, userId: user.id, newAmount: validated.new_amount })
    revalidatePath('/leases')
    return { success: true }
  } catch (error) {
    logError(error, { action: 'applyAdjustment' })
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos inválidos', errors: error.errors }
    }
    return { success: false, error: 'Error al aplicar el ajuste' }
  }
}
