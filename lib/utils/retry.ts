import { logger } from './logger'

interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffFactor?: number
  onRetry?: (attempt: number, error: Error) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
  onRetry: () => {},
}

/**
 * Ejecuta una función con retry automático y exponential backoff
 * 
 * @example
 * const data = await withRetry(
 *   async () => await fetch('/api/data'),
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * )
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Si es el último intento, lanzar el error
      if (attempt === config.maxRetries - 1) {
        break
      }

      // Calcular delay con exponential backoff
      const delay = Math.min(
        config.initialDelayMs * Math.pow(config.backoffFactor, attempt),
        config.maxDelayMs
      )

      logger.warn(`Retry attempt ${attempt + 1}/${config.maxRetries}`, {
        error: lastError.message,
        delayMs: delay,
      })

      config.onRetry(attempt + 1, lastError)

      // Esperar antes del próximo intento
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

/**
 * Versión especializada para requests HTTP
 */
export async function withHttpRetry<T>(
  fn: () => Promise<Response>,
  parser: (response: Response) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(async () => {
    const response = await fn()

    // No reintentar errores 4xx (client errors)
    if (response.status >= 400 && response.status < 500) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return parser(response)
  }, options)
}
