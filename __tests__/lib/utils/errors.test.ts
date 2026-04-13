import { describe, it, expect } from 'vitest'
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  RateLimitError,
  ConflictError,
  DatabaseError,
  InternalServerError,
} from '@/lib/utils/errors'

describe('AppError', () => {
  it('tiene las propiedades correctas', () => {
    const error = new AppError('algo falló', 'CUSTOM_ERROR', 500, true)
    expect(error.message).toBe('algo falló')
    expect(error.code).toBe('CUSTOM_ERROR')
    expect(error.statusCode).toBe(500)
    expect(error.isOperational).toBe(true)
    expect(error.name).toBe('AppError')
  })

  it('es instancia de Error', () => {
    const error = new AppError('test', 'TEST', 500)
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AppError)
  })

  it('tiene stack trace', () => {
    const error = new AppError('test', 'TEST', 500)
    expect(error.stack).toBeDefined()
  })

  it('usa defaults correctos (statusCode=500, isOperational=true)', () => {
    const error = new AppError('test', 'TEST')
    expect(error.statusCode).toBe(500)
    expect(error.isOperational).toBe(true)
  })
})

describe('NotFoundError', () => {
  it('tiene status 404 y código NOT_FOUND', () => {
    const error = new NotFoundError('Propiedad')
    expect(error.statusCode).toBe(404)
    expect(error.code).toBe('NOT_FOUND')
    expect(error.name).toBe('NotFoundError')
    expect(error.message).toBe('Propiedad no encontrado')
    expect(error.isOperational).toBe(true)
  })

  it('es instancia de AppError', () => {
    const error = new NotFoundError('Inquilino')
    expect(error).toBeInstanceOf(AppError)
  })
})

describe('UnauthorizedError', () => {
  it('tiene status 401 y código UNAUTHORIZED', () => {
    const error = new UnauthorizedError()
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.name).toBe('UnauthorizedError')
    expect(error.message).toBe('No autorizado')
    expect(error.isOperational).toBe(true)
  })

  it('acepta mensaje personalizado', () => {
    const error = new UnauthorizedError('Sesión expirada')
    expect(error.message).toBe('Sesión expirada')
  })
})

describe('ForbiddenError', () => {
  it('tiene status 403 y código FORBIDDEN', () => {
    const error = new ForbiddenError()
    expect(error.statusCode).toBe(403)
    expect(error.code).toBe('FORBIDDEN')
    expect(error.name).toBe('ForbiddenError')
    expect(error.message).toBe('Acceso denegado')
    expect(error.isOperational).toBe(true)
  })

  it('acepta mensaje personalizado', () => {
    const error = new ForbiddenError('Sin permisos de admin')
    expect(error.message).toBe('Sin permisos de admin')
  })
})

describe('ValidationError', () => {
  it('tiene status 400 y código VALIDATION_ERROR', () => {
    const error = new ValidationError('Datos inválidos')
    expect(error.statusCode).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.name).toBe('ValidationError')
    expect(error.isOperational).toBe(true)
  })

  it('acepta errors opcionales', () => {
    const zodErrors = [{ path: ['email'], message: 'Email inválido' }]
    const error = new ValidationError('Validación falló', zodErrors)
    expect(error.errors).toEqual(zodErrors)
  })

  it('errors es undefined si no se pasa', () => {
    const error = new ValidationError('Error')
    expect(error.errors).toBeUndefined()
  })
})

describe('RateLimitError', () => {
  it('tiene status 429 y código RATE_LIMIT_EXCEEDED', () => {
    const error = new RateLimitError()
    expect(error.statusCode).toBe(429)
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
    expect(error.name).toBe('RateLimitError')
    expect(error.isOperational).toBe(true)
  })

  it('tiene mensaje default', () => {
    const error = new RateLimitError()
    expect(error.message).toBe('Demasiadas solicitudes. Intenta de nuevo más tarde.')
  })

  it('acepta mensaje personalizado', () => {
    const error = new RateLimitError('Límite de recibos excedido')
    expect(error.message).toBe('Límite de recibos excedido')
  })
})

describe('ConflictError', () => {
  it('tiene status 409 y código CONFLICT', () => {
    const error = new ConflictError('Ya existe un recibo para este período')
    expect(error.statusCode).toBe(409)
    expect(error.code).toBe('CONFLICT')
    expect(error.name).toBe('ConflictError')
    expect(error.message).toBe('Ya existe un recibo para este período')
    expect(error.isOperational).toBe(true)
  })
})

describe('DatabaseError', () => {
  it('tiene status 500, código DATABASE_ERROR y isOperational false', () => {
    const error = new DatabaseError('Error de conexión')
    expect(error.statusCode).toBe(500)
    expect(error.code).toBe('DATABASE_ERROR')
    expect(error.name).toBe('DatabaseError')
    expect(error.isOperational).toBe(false)
  })

  it('acepta detalle opcional', () => {
    const error = new DatabaseError('Timeout', 'connection timeout after 5000ms')
    expect(error.detail).toBe('connection timeout after 5000ms')
  })
})

describe('InternalServerError', () => {
  it('tiene status 500, código INTERNAL_SERVER_ERROR y isOperational false', () => {
    const error = new InternalServerError()
    expect(error.statusCode).toBe(500)
    expect(error.code).toBe('INTERNAL_SERVER_ERROR')
    expect(error.name).toBe('InternalServerError')
    expect(error.message).toBe('Error interno del servidor')
    expect(error.isOperational).toBe(false)
  })

  it('acepta mensaje personalizado', () => {
    const error = new InternalServerError('Fallo inesperado')
    expect(error.message).toBe('Fallo inesperado')
  })
})
