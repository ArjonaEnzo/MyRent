import { z } from 'zod'

/**
 * Schema de validación para UUIDs
 * Usado para validar IDs de Supabase antes de queries
 */
export const uuidSchema = z.string().uuid('ID inválido')

/**
 * Valida que un string sea un UUID válido
 * @throws ZodError si el ID no es un UUID válido
 */
export function validateId(id: string): string {
  return uuidSchema.parse(id)
}

/**
 * Valida múltiples IDs
 * @throws ZodError si algún ID no es un UUID válido
 */
export function validateIds(ids: string[]): string[] {
  return z.array(uuidSchema).parse(ids)
}
