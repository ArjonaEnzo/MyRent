import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { logger } from '@/lib/utils/logger'
import { getUpcomingBillingTarget } from '@/lib/utils/lease-billing'
import { sendLandlordReminderEmail } from '@/lib/email/landlord-reminder-email'
import { sendTenantHeadsUpEmail } from '@/lib/email/tenant-heads-up-email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Días de anticipación para cada notificación */
const TENANT_NOTIFY_DAYS = 7
const LANDLORD_NOTIFY_DAYS = 5

/**
 * Helpers para billing_notifications — control de idempotencia de notificaciones.
 */
async function hasNotification(
  supabase: ReturnType<typeof createAdminClient>,
  leaseId: string,
  period: string,
  type: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('billing_notifications')
    .select('id')
    .eq('lease_id', leaseId)
    .eq('period', period)
    .eq('notification_type', type)
    .limit(1)
    .maybeSingle()
  return !!data
}

async function insertNotification(
  supabase: ReturnType<typeof createAdminClient>,
  row: { lease_id: string; account_id: string; period: string; notification_type: string; recipient_email: string },
): Promise<void> {
  await supabase.from('billing_notifications').insert(row)
}

/**
 * Vercel Cron — corre diariamente a las 08:00 UTC (05:00 ART).
 *
 * Ejecuta 3 tareas en secuencia:
 * 1. Notifica inquilinos (7 días antes del cobro)
 * 2. Notifica propietarios (5 días antes del cobro)
 * 3. Genera borradores de recibos (día de cobro)
 */
export async function GET(request: Request) {
  // Verificar CRON_SECRET — fail-closed: si no está configurado, rechazar siempre
  const cronSecret = env.CRON_SECRET
  if (!cronSecret) {
    logger.error('Cron: CRON_SECRET is not configured — rejecting request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const expected = Buffer.from(cronSecret, 'utf-8')
  const provided = Buffer.from(token, 'utf-8')

  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const appUrl = env.NEXT_PUBLIC_APP_URL

  // Fecha actual en zona Argentina
  const now = new Date()
  const argDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const todayDay = argDate.getDate()
  const currentPeriod = `${argDate.getFullYear()}-${String(argDate.getMonth() + 1).padStart(2, '0')}`

  const results = {
    tenantNotifications: { sent: 0, skipped: 0, errors: [] as string[] },
    landlordNotifications: { sent: 0, skipped: 0, errors: [] as string[] },
    receiptsGenerated: { generated: 0, skipped: 0, errors: [] as Array<{ leaseId: string; error: string }> },
  }

  // ─── 1. Notificar inquilinos (7 días antes) ────────────────────────
  try {
    const tenantTarget = getUpcomingBillingTarget(TENANT_NOTIFY_DAYS, now)
    await notifyTenants(supabase, tenantTarget, TENANT_NOTIFY_DAYS, appUrl, results.tenantNotifications)
  } catch (err) {
    logger.error('Cron: tenant notification phase failed', { error: String(err) })
    results.tenantNotifications.errors.push(String(err))
  }

  // ─── 2. Notificar propietarios (5 días antes) ──────────────────────
  try {
    const landlordTarget = getUpcomingBillingTarget(LANDLORD_NOTIFY_DAYS, now)
    await notifyLandlords(supabase, landlordTarget, LANDLORD_NOTIFY_DAYS, appUrl, results.landlordNotifications)
  } catch (err) {
    logger.error('Cron: landlord notification phase failed', { error: String(err) })
    results.landlordNotifications.errors.push(String(err))
  }

  // ─── 3. Generar borradores (día de cobro) ──────────────────────────
  try {
    await generateDraftReceipts(supabase, todayDay, currentPeriod, results.receiptsGenerated)
  } catch (err) {
    logger.error('Cron: receipt generation phase failed', { error: String(err) })
    results.receiptsGenerated.errors.push({ leaseId: 'N/A', error: String(err) })
  }

  logger.info('Cron: daily-billing completed', results)
  return NextResponse.json(results)
}

// ═══════════════════════════════════════════════════════════════════════
// Funciones internas
// ═══════════════════════════════════════════════════════════════════════

interface NotifyResult {
  sent: number
  skipped: number
  errors: string[]
}

interface ReceiptResult {
  generated: number
  skipped: number
  errors: Array<{ leaseId: string; error: string }>
}

/**
 * Envía avisos a inquilinos cuyos contratos tienen billing_day en N días.
 */
async function notifyTenants(
  supabase: ReturnType<typeof createAdminClient>,
  target: { day: number; period: string },
  daysAhead: number,
  appUrl: string,
  result: NotifyResult,
) {
  const { data: leases, error } = await supabase
    .from('leases')
    .select(`
      id, account_id, tenant_id, rent_amount, currency, billing_day,
      tenants!inner ( id, full_name, email ),
      properties!inner ( id, name )
    `)
    .eq('status', 'active')
    .eq('auto_billing_enabled', true)
    .eq('billing_day', target.day)
    .is('deleted_at', null)

  if (error) {
    logger.error('Cron: failed to query leases for tenant notifications', { error: error.message })
    result.errors.push(error.message)
    return
  }

  if (!leases?.length) return

  for (const lease of leases) {
    try {
      const tenant = lease.tenants as unknown as { id: string; full_name: string; email: string }
      const property = lease.properties as unknown as { id: string; name: string }

      if (!tenant?.email) {
        result.skipped++
        continue
      }

      // Check si ya se envió
      const alreadySent = await hasNotification(supabase, lease.id, target.period, 'tenant_heads_up')

      if (alreadySent) {
        result.skipped++
        continue
      }

      await sendTenantHeadsUpEmail({
        to: tenant.email,
        tenantName: tenant.full_name,
        propertyName: property.name,
        period: target.period,
        amount: lease.rent_amount ?? 0,
        currency: lease.currency ?? 'ARS',
        billingDay: lease.billing_day ?? 1,
        daysUntilBilling: daysAhead,
        portalUrl: `${appUrl}/tenant/dashboard`,
      })

      // Registrar notificación enviada
      await insertNotification(supabase, {
        lease_id: lease.id,
        account_id: lease.account_id!,
        period: target.period,
        notification_type: 'tenant_heads_up',
        recipient_email: tenant.email,
      })

      result.sent++
      logger.info('Cron: tenant heads-up sent', {
        tenantEmail: tenant.email,
        period: target.period,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('Cron: failed to notify tenant', { leaseId: lease.id, error: msg })
      result.errors.push(msg)
    }
  }
}

/**
 * Envía recordatorios a propietarios cuyos contratos tienen billing_day en N días.
 */
async function notifyLandlords(
  supabase: ReturnType<typeof createAdminClient>,
  target: { day: number; period: string },
  daysAhead: number,
  appUrl: string,
  result: NotifyResult,
) {
  const { data: leases, error } = await supabase
    .from('leases')
    .select(`
      id, account_id, tenant_id, rent_amount, currency, billing_day,
      tenants!inner ( id, full_name ),
      properties!inner ( id, name )
    `)
    .eq('status', 'active')
    .eq('auto_billing_enabled', true)
    .eq('billing_day', target.day)
    .is('deleted_at', null)

  if (error) {
    logger.error('Cron: failed to query leases for landlord notifications', { error: error.message })
    result.errors.push(error.message)
    return
  }

  if (!leases?.length) return

  // Cache de emails de propietarios por account_id (para evitar queries repetidas)
  const ownerEmailCache = new Map<string, { email: string; name: string } | null>()

  for (const lease of leases) {
    try {
      const tenant = lease.tenants as unknown as { id: string; full_name: string }
      const property = lease.properties as unknown as { id: string; name: string }
      const accountId = lease.account_id!

      // Check si ya se envió
      const alreadySent = await hasNotification(supabase, lease.id, target.period, 'landlord_reminder')

      if (alreadySent) {
        result.skipped++
        continue
      }

      // Resolver email del propietario (owner de la cuenta)
      if (!ownerEmailCache.has(accountId)) {
        const ownerInfo = await resolveAccountOwnerEmail(supabase, accountId)
        ownerEmailCache.set(accountId, ownerInfo)
      }

      const owner = ownerEmailCache.get(accountId)
      if (!owner?.email) {
        result.skipped++
        continue
      }

      await sendLandlordReminderEmail({
        to: owner.email,
        landlordName: owner.name,
        tenantName: tenant.full_name,
        propertyName: property.name,
        period: target.period,
        amount: lease.rent_amount ?? 0,
        currency: lease.currency ?? 'ARS',
        billingDay: lease.billing_day ?? 1,
        daysUntilBilling: daysAhead,
        dashboardUrl: `${appUrl}/dashboard/receipts`,
      })

      // Registrar notificación enviada
      await insertNotification(supabase, {
        lease_id: lease.id,
        account_id: accountId,
        period: target.period,
        notification_type: 'landlord_reminder',
        recipient_email: owner.email,
      })

      result.sent++
      logger.info('Cron: landlord reminder sent', {
        ownerEmail: owner.email,
        tenantName: tenant.full_name,
        period: target.period,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('Cron: failed to notify landlord', { leaseId: lease.id, error: msg })
      result.errors.push(msg)
    }
  }
}

/**
 * Genera borradores de recibos para contratos cuyo billing_day es hoy.
 * (Misma lógica del anterior generate-receipts cron)
 */
async function generateDraftReceipts(
  supabase: ReturnType<typeof createAdminClient>,
  todayDay: number,
  period: string,
  result: ReceiptResult,
) {
  const { data: leases, error: queryError } = await supabase
    .from('leases')
    .select('id, account_id, tenant_id, rent_amount, currency')
    .eq('status', 'active')
    .eq('auto_billing_enabled', true)
    .eq('billing_day', todayDay)
    .is('deleted_at', null)

  if (queryError) {
    logger.error('Cron: failed to query leases for receipt generation', { error: queryError.message })
    result.errors.push({ leaseId: 'N/A', error: queryError.message })
    return
  }

  if (!leases?.length) {
    logger.info('Cron: no leases to bill today', { day: todayDay, period })
    return
  }

  for (const lease of leases) {
    try {
      // Idempotencia: verificar si ya existe recibo para este período
      const { data: existing } = await supabase
        .from('receipts')
        .select('id')
        .eq('lease_id', lease.id)
        .eq('period', period)
        .is('deleted_at', null)
        .limit(1)
        .single()

      if (existing) {
        result.skipped++
        continue
      }

      // Generar borrador vía RPC
      const { error: rpcError } = await supabase.rpc('generate_draft_receipt', {
        p_lease_id: lease.id,
        p_period: period,
      })

      if (rpcError) {
        logger.error('Cron: generate_draft_receipt failed', {
          leaseId: lease.id,
          error: rpcError.message,
        })
        result.errors.push({ leaseId: lease.id, error: rpcError.message })
        continue
      }

      result.generated++
      logger.info('Cron: draft receipt generated', {
        leaseId: lease.id,
        period,
        amount: lease.rent_amount,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error('Cron: unexpected error for lease', { leaseId: lease.id, error: message })
      result.errors.push({ leaseId: lease.id, error: message })
    }
  }
}

/**
 * Resuelve el email del propietario (owner) de una cuenta.
 * Busca en account_users con role='owner', luego obtiene el email de Supabase Auth.
 */
async function resolveAccountOwnerEmail(
  supabase: ReturnType<typeof createAdminClient>,
  accountId: string,
): Promise<{ email: string; name: string } | null> {
  // Buscar el owner de la cuenta
  const { data: accountUser } = await supabase
    .from('account_users')
    .select('user_id')
    .eq('account_id', accountId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (!accountUser?.user_id) return null

  // Obtener email del usuario de Supabase Auth
  const { data: authUser } = await supabase.auth.admin.getUserById(accountUser.user_id)
  if (!authUser?.user?.email) return null

  // Obtener nombre del perfil
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', accountUser.user_id)
    .maybeSingle()

  return {
    email: authUser.user.email,
    name: profile?.full_name ?? 'Propietario',
  }
}
