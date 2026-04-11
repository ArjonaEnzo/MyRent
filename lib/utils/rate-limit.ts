import { RateLimitError } from './errors'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from './logger'

/**
 * Postgres-backed rate limiter (reemplaza el limiter en memoria).
 *
 * Por qué Postgres y no Redis/Upstash:
 *   - No agrega dependencias nuevas ni infra externa.
 *   - Estado compartido entre todas las instancias serverless.
 *   - El RPC `check_rate_limit` hace INSERT…ON CONFLICT atómico, sin race.
 *
 * Failure mode: si la DB está caída cuando consultamos, abrimos el puerto
 * (fail-open) en vez de bloquear todo el sistema. Loggeamos para que se
 * note. La alternativa sería fail-closed pero rompería el dashboard ante
 * un blip transitorio.
 */
class PostgresRateLimiter {
  constructor(
    private readonly bucket: string,
    private readonly maxRequests: number,
    private readonly windowSeconds: number,
  ) {}

  async limit(key: string): Promise<void> {
    try {
      const supabase = createAdminClient()
      // RPC name not yet in generated types — cast until types are regenerated.
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: boolean | null; error: { message: string } | null }>
      )('check_rate_limit', {
        p_bucket: this.bucket,
        p_key: key,
        p_max: this.maxRequests,
        p_window_seconds: this.windowSeconds,
      })

      if (error) {
        // Fail-open: la DB respondió pero la RPC tiró error.
        // Probable migración no aplicada — loggear y dejar pasar.
        logger.warn('check_rate_limit RPC error — fail-open', {
          bucket: this.bucket,
          error: error.message,
        })
        return
      }

      if (data === false) {
        throw new RateLimitError(
          `Límite excedido. Intenta de nuevo en unos segundos.`,
        )
      }
    } catch (err) {
      if (err instanceof RateLimitError) throw err
      // Cualquier otra excepción → fail-open
      logger.warn('Rate limit check failed — fail-open', {
        bucket: this.bucket,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

// 10 recibos por minuto por usuario
export const receiptRateLimit = new PostgresRateLimiter('receipt', 10, 60)

// 5 registros de propiedades por minuto por usuario
export const propertyRateLimit = new PostgresRateLimiter('property', 5, 60)

// 20 emails por hora por usuario
export const emailRateLimit = new PostgresRateLimiter('email', 20, 60 * 60)
