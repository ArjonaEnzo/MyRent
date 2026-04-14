import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Health check real — verifica conectividad con Supabase.
 *
 * Response:
 *   200 + { status: 'ok' }        → todo funciona
 *   503 + { status: 'degraded' }  → DB inaccesible
 *
 * Usá esto desde un monitor externo (UptimeRobot, BetterStack, etc.)
 * para alertas antes que los usuarios se quejen.
 */
export async function GET() {
  const startedAt = Date.now()

  try {
    const supabase = createAdminClient()

    // Query trivial contra tabla que existe siempre. Timeout 3s.
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DB query timeout')), 3000)
    )

    const queryPromise = supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    await Promise.race([queryPromise, timeoutPromise])

    const latencyMs = Date.now() - startedAt

    return NextResponse.json({
      status: 'ok',
      db: 'reachable',
      latencyMs,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const latencyMs = Date.now() - startedAt
    const message = err instanceof Error ? err.message : String(err)

    return NextResponse.json(
      {
        status: 'degraded',
        db: 'unreachable',
        error: message,
        latencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
