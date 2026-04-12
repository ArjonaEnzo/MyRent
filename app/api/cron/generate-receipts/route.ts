import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { logger } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Vercel Cron — runs daily at 08:00 UTC (05:00 ART).
 * Generates draft receipts for active leases with auto_billing_enabled
 * where billing_day matches today's day (in Argentina timezone).
 */
export async function GET(request: Request) {
  // Verify cron secret (Vercel sends it as Authorization: Bearer <CRON_SECRET>)
  if (env.CRON_SECRET) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()

  // Get today's day in Argentina timezone
  const now = new Date()
  const argDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const todayDay = argDate.getDate()
  const period = `${argDate.getFullYear()}-${String(argDate.getMonth() + 1).padStart(2, '0')}`

  // Find active leases with auto-billing enabled and matching billing day
  const { data: leases, error: queryError } = await supabase
    .from('leases')
    .select('id, account_id, tenant_id, rent_amount, currency')
    .eq('status', 'active')
    .eq('auto_billing_enabled', true)
    .eq('billing_day', todayDay)
    .is('deleted_at', null)

  if (queryError) {
    logger.error('Cron: failed to query leases', { error: queryError.message })
    return NextResponse.json({ error: 'Failed to query leases' }, { status: 500 })
  }

  if (!leases?.length) {
    logger.info('Cron: no leases to bill today', { day: todayDay, period })
    return NextResponse.json({ generated: 0, skipped: 0, errors: [] })
  }

  let generated = 0
  let skipped = 0
  const errors: Array<{ leaseId: string; error: string }> = []

  for (const lease of leases) {
    try {
      // Check if receipt already exists for this period (idempotency at app level)
      const { data: existing } = await supabase
        .from('receipts')
        .select('id')
        .eq('lease_id', lease.id)
        .eq('period', period)
        .is('deleted_at', null)
        .limit(1)
        .single()

      if (existing) {
        skipped++
        continue
      }

      // Generate draft receipt via RPC
      const { error: rpcError } = await supabase.rpc('generate_draft_receipt', {
        p_lease_id: lease.id,
        p_period: period,
      })

      if (rpcError) {
        logger.error('Cron: generate_draft_receipt failed', {
          leaseId: lease.id,
          error: rpcError.message,
        })
        errors.push({ leaseId: lease.id, error: rpcError.message })
        continue
      }

      generated++
      logger.info('Cron: draft receipt generated', {
        leaseId: lease.id,
        period,
        amount: lease.rent_amount,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error('Cron: unexpected error for lease', { leaseId: lease.id, error: message })
      errors.push({ leaseId: lease.id, error: message })
    }
  }

  logger.info('Cron: generate-receipts completed', { generated, skipped, errorCount: errors.length })

  return NextResponse.json({ generated, skipped, errors })
}
