import { describe, it, expect } from 'vitest'
import { propertySchema } from '@/lib/validations/property'

describe('propertySchema', () => {
  it('acepta datos válidos', () => {
    const result = propertySchema.safeParse({
      name: 'Departamento Centro',
      address: 'Av. Corrientes 1234, CABA',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza nombre vacío', () => {
    const result = propertySchema.safeParse({ name: '', address: 'Dirección' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('name')
  })

  it('rechaza dirección vacía', () => {
    const result = propertySchema.safeParse({ name: 'Depto', address: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('address')
  })

  it('rechaza nombre mayor a 100 caracteres', () => {
    const result = propertySchema.safeParse({
      name: 'a'.repeat(101),
      address: 'Dirección válida',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza dirección mayor a 200 caracteres', () => {
    const result = propertySchema.safeParse({
      name: 'Depto',
      address: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('rechaza campos faltantes', () => {
    const result = propertySchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
