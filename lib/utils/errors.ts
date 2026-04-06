/**
 * Error base de la aplicación
 * Todos los errores custom deben extender de esta clase
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = 'AppError'
    
    // Mantener el stack trace correcto
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Error 404 - Recurso no encontrado
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} no encontrado`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

/**
 * Error 401 - No autenticado
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'No autorizado') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Error 403 - Sin permisos
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Acceso denegado') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

/**
 * Error 400 - Datos de entrada inválidos
 */
export class ValidationError extends AppError {
  // errors can be ZodIssue[] or Record<string, string[]> depending on call site
  constructor(message: string, public errors?: unknown) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'ValidationError'
  }
}

/**
 * Error 409 - Conflicto (ej: duplicado)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
    this.name = 'ConflictError'
  }
}

/**
 * Error 429 - Rate limit excedido
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Demasiadas solicitudes. Intenta de nuevo más tarde.') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429)
    this.name = 'RateLimitError'
  }
}

/**
 * Error 500 - Error de base de datos
 */
export class DatabaseError extends AppError {
  constructor(message: string, public detail?: string) {
    super(message, 'DATABASE_ERROR', 500, false)
    this.name = 'DatabaseError'
  }
}

/**
 * Error 500 - Error interno del servidor
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Error interno del servidor') {
    super(message, 'INTERNAL_SERVER_ERROR', 500, false)
    this.name = 'InternalServerError'
  }
}
