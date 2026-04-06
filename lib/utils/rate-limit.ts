import { RateLimitError } from './errors'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

/**
 * Rate Limiter simple en memoria
 * 
 * ⚠️ LIMITACIONES:
 * - No funciona en entornos multi-instancia (serverless)
 * - Se resetea al reiniciar el servidor
 * - Para producción, usar Redis (Upstash, Vercel KV, etc.)
 * 
 * Para una solución distribuida, ver:
 * https://github.com/upstash/ratelimit
 */
class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config

    // Limpiar entradas expiradas cada 60 segundos
    setInterval(() => this.cleanup(), 60000)
  }

  /**
   * Verifica si una key está dentro del límite
   * @returns true si está permitido, false si excedió el límite
   */
  async check(key: string): Promise<{ success: boolean; remaining: number; resetAt: number }> {
    const now = Date.now()
    const entry = this.store.get(key)

    // Si no existe o expiró, crear nueva entrada
    if (!entry || now > entry.resetAt) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + this.config.windowMs,
      }
      this.store.set(key, newEntry)

      return {
        success: true,
        remaining: this.config.maxRequests - 1,
        resetAt: newEntry.resetAt,
      }
    }

    // Si excedió el límite
    if (entry.count >= this.config.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetAt: entry.resetAt,
      }
    }

    // Incrementar contador
    entry.count++
    this.store.set(key, entry)

    return {
      success: true,
      remaining: this.config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    }
  }

  /**
   * Verifica el límite y lanza error si se excedió
   */
  async limit(key: string): Promise<void> {
    const result = await this.check(key)

    if (!result.success) {
      const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000)
      throw new RateLimitError(`Límite excedido. Intenta de nuevo en ${resetIn} segundos.`)
    }
  }

  /**
   * Limpia entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Resetea el límite para una key específica
   */
  async reset(key: string): Promise<void> {
    this.store.delete(key)
  }
}

/**
 * Rate limiters para diferentes operaciones
 */

// 10 recibos por minuto por usuario
export const receiptRateLimit = new InMemoryRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minuto
})

// 5 registros de propiedades por minuto por usuario
export const propertyRateLimit = new InMemoryRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000,
})

// 20 emails por hora por usuario
export const emailRateLimit = new InMemoryRateLimiter({
  maxRequests: 20,
  windowMs: 60 * 60 * 1000, // 1 hora
})

/**
 * Para usar en Server Actions:
 * 
 * @example
 * export async function generateReceipt(data: ReceiptInput) {
 *   const { user } = await getUser()
 *   await receiptRateLimit.limit(user.id)
 *   
 *   // ... resto de la lógica
 * }
 */
