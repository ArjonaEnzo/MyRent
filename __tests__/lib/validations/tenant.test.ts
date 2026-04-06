import { describe, it, expect } from 'vitest'
import { tenantSchema } from '@/lib/validations/tenant'

const validTenant = {
  full_name: 'Juan Pérez',
  email: 'juan@example.com',
  phone: '+54 11 1234-5678',
  dni_cuit: '20-12345678-9',
}

describe('tenantSchema', () => {
  it('acepta datos válidos completos', () => {
    const result = tenantSchema.safeParse(validTenant)
    expect(result.success).toBe(true)
  })

  it('acepta datos mínimos (solo nombre)', () => {
    const result = tenantSchema.safeParse({ full_name: 'Ana García' })
    expect(result.success).toBe(true)
  })

  it('rechaza nombre vacío', () => {
    const result = tenantSchema.safeParse({ ...validTenant, full_name: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('full_name')
  })

  it('rechaza nombre mayor a 100 caracteres', () => {
    const result = tenantSchema.safeParse({ ...validTenant, full_name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('full_name')
  })

  it('rechaza email con formato inválido', () => {
    const result = tenantSchema.safeParse({ ...validTenant, email: 'no-es-email' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })

  it('acepta email vacío (campo opcional)', () => {
    const result = tenantSchema.safeParse({ ...validTenant, email: '' })
    expect(result.success).toBe(true)
  })

  it('acepta phone vacío (campo opcional)', () => {
    const result = tenantSchema.safeParse({ ...validTenant, phone: '' })
    expect(result.success).toBe(true)
  })

  it('rechaza teléfono mayor a 30 caracteres', () => {
    const result = tenantSchema.safeParse({ ...validTenant, phone: '1'.repeat(31) })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('phone')
  })

  it('rechaza DNI/CUIT mayor a 20 caracteres', () => {
    const result = tenantSchema.safeParse({ ...validTenant, dni_cuit: '1'.repeat(21) })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('dni_cuit')
  })

  it('tiene campo phone en el schema', () => {
    const schema = tenantSchema.shape
    expect('phone' in schema).toBe(true)
  })

  it('no tiene campo property_id ni current_rent_amount ni currency', () => {
    const schema = tenantSchema.shape
    expect('property_id' in schema).toBe(false)
    expect('current_rent_amount' in schema).toBe(false)
    expect('currency' in schema).toBe(false)
  })
})
