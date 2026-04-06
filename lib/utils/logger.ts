type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  [key: string]: any
}

/**
 * Logger simple para desarrollo
 * TODO: En producción, integrar con Sentry, Datadog, etc.
 */
class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` | ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context))
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context))
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatMessage('error', message, context))
    
    // TODO: Enviar a servicio de monitoreo (Sentry, Datadog, etc.)
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(new Error(message), { extra: context })
    // }
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, context))
    }
  }
}

export const logger = new Logger()

/**
 * Helper para loggear errores en Server Actions
 */
export function logError(error: unknown, context?: LogContext): void {
  if (error instanceof Error) {
    logger.error(error.message, {
      ...context,
      stack: error.stack,
      name: error.name,
    })
  } else {
    logger.error('Unknown error', { ...context, error })
  }
}
