import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface PlanLimits {
  planId: string
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'
  maxProperties: number | null
  maxTenants: number | null
  maxReceiptsPerMonth: number | null
  features: Record<string, boolean>
  currentPeriodEnd: string
}

export interface QuotaUsage {
  properties: number
  tenants: number
  receiptsThisMonth: number
}

export interface QuotaCheckResult {
  allowed: boolean
  reason?: string
  limit?: number
  current?: number
}

/**
 * Devuelve los límites del plan actual de la cuenta.
 * Fail-open: si hay error DB, retorna null y el caller decide.
 */
export async function getAccountPlanLimits(accountId: string): Promise<PlanLimits | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .rpc('get_account_plan_limits', { p_account_id: accountId })
    .maybeSingle()

  if (error || !data) {
    logger.error('getAccountPlanLimits failed', { accountId, error: error?.message })
    return null
  }

  return {
    planId: data.plan_id,
    status: data.status,
    maxProperties: data.max_properties,
    maxTenants: data.max_tenants,
    maxReceiptsPerMonth: data.max_receipts_per_month,
    features: (data.features as Record<string, boolean>) ?? {},
    currentPeriodEnd: data.current_period_end,
  }
}

/**
 * Cuenta uso actual de recursos (sin filtrar soft-deleted).
 */
export async function getAccountUsage(accountId: string): Promise<QuotaUsage> {
  const supabase = createAdminClient()
  const periodStart = new Date()
  periodStart.setUTCDate(1)
  periodStart.setUTCHours(0, 0, 0, 0)

  const [props, tenants, receipts] = await Promise.all([
    supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .is('deleted_at', null),
    supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .is('deleted_at', null),
    supabase
      .from('receipts')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .gte('created_at', periodStart.toISOString())
      .is('deleted_at', null),
  ])

  return {
    properties: props.count ?? 0,
    tenants: tenants.count ?? 0,
    receiptsThisMonth: receipts.count ?? 0,
  }
}

/**
 * Verifica si cuenta puede crear un recurso más.
 * resource: 'property' | 'tenant' | 'receipt'
 */
export async function checkQuota(
  accountId: string,
  resource: 'property' | 'tenant' | 'receipt',
): Promise<QuotaCheckResult> {
  const [plan, usage] = await Promise.all([getAccountPlanLimits(accountId), getAccountUsage(accountId)])

  if (!plan) {
    // Fail-open: si no se puede leer plan, permitir (log warn)
    logger.warn('checkQuota: plan limits unavailable, allowing', { accountId, resource })
    return { allowed: true }
  }

  // Suscripción vencida → bloquear creación
  if (plan.status === 'expired' || plan.status === 'cancelled') {
    return {
      allowed: false,
      reason: 'Tu suscripción está inactiva. Reactivala para seguir creando recursos.',
    }
  }

  const map = {
    property: { limit: plan.maxProperties, current: usage.properties, label: 'propiedades' },
    tenant: { limit: plan.maxTenants, current: usage.tenants, label: 'inquilinos' },
    receipt: { limit: plan.maxReceiptsPerMonth, current: usage.receiptsThisMonth, label: 'recibos este mes' },
  } as const

  const { limit, current, label } = map[resource]

  if (limit === null) return { allowed: true } // ilimitado

  if (current >= limit) {
    return {
      allowed: false,
      reason: `Alcanzaste el límite de ${limit} ${label} de tu plan. Actualizá para crear más.`,
      limit,
      current,
    }
  }

  return { allowed: true, limit, current }
}
