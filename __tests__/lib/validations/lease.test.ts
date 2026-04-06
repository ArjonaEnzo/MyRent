import { describe, it, expect } from 'vitest'
import { leaseSchema } from '@/lib/validations/lease'

const validLease = {
  property_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  tenant_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  start_date: '2026-01-01',
  rent_amount: 150000,
  currency: 'ARS' as const,
}

describe('leaseSchema', () => {
  it('acepta datos válidos mínimos', () => {
    const result = leaseSchema.safeParse(validLease)
    expect(result.success).toBe(true)
  })

  it('acepta datos completos con end_date y notes', () => {
    const result = leaseSchema.safeParse({
      ...validLease,
      end_date: '2026-12-31',
      notes: 'Incluye cochera',
    })
    expect(result.success).toBe(true)
  })

  it('acepta end_date vacío (sin fecha de fin)', () => {
    const result = leaseSchema.safeParse({ ...validLease, end_date: '' })
    expect(result.success).toBe(true)
  })

  it('rechaza property_id inválido (no UUID)', () => {
    const result = leaseSchema.safeParse({ ...validLease, property_id: 'no-es-uuid' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('property_id')
  })

  it('rechaza tenant_id inválido (no UUID)', () => {
    const result = leaseSchema.safeParse({ ...validLease, tenant_id: 'no-es-uuid' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('tenant_id')
  })

  it('rechaza start_date vacío', () => {
    const result = leaseSchema.safeParse({ ...validLease, start_date: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('start_date')
  })

  it('rechaza monto negativo', () => {
    const result = leaseSchema.safeParse({ ...validLease, rent_amount: -1 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('rent_amount')
  })

  it('rechaza monto cero', () => {
    const result = leaseSchema.safeParse({ ...validLease, rent_amount: 0 })
    expect(result.success).toBe(false)
  })

  it('acepta moneda USD', () => {
    const result = leaseSchema.safeParse({ ...validLease, currency: 'USD' })
    expect(result.success).toBe(true)
  })

  it('rechaza moneda inválida', () => {
    const result = leaseSchema.safeParse({ ...validLease, currency: 'EUR' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('currency')
  })

  it('rechaza notas mayor a 1000 caracteres', () => {
    const result = leaseSchema.safeParse({ ...validLease, notes: 'a'.repeat(1001) })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('notes')
  })
})
