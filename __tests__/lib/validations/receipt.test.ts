import { describe, it, expect } from 'vitest'
import { receiptSchema } from '@/lib/validations/receipt'

const validReceipt = {
  lease_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  period: 'Abril 2026',
  description: 'Alquiler mensual',
}

describe('receiptSchema', () => {
  it('acepta datos válidos completos', () => {
    const result = receiptSchema.safeParse(validReceipt)
    expect(result.success).toBe(true)
  })

  it('acepta datos mínimos (sin description)', () => {
    const result = receiptSchema.safeParse({
      lease_id: validReceipt.lease_id,
      period: 'Marzo 2026',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza lease_id inválido (no UUID)', () => {
    const result = receiptSchema.safeParse({ ...validReceipt, lease_id: 'no-es-uuid' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('lease_id')
  })

  it('rechaza período vacío', () => {
    const result = receiptSchema.safeParse({ ...validReceipt, period: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('period')
  })

  it('rechaza descripción mayor a 500 caracteres', () => {
    const result = receiptSchema.safeParse({
      ...validReceipt,
      description: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('description')
  })

  it('acepta descripción exactamente de 500 caracteres', () => {
    const result = receiptSchema.safeParse({
      ...validReceipt,
      description: 'a'.repeat(500),
    })
    expect(result.success).toBe(true)
  })

  it('rechaza campos faltantes', () => {
    const result = receiptSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('no tiene campo tenant_id (reemplazado por lease_id)', () => {
    const schema = receiptSchema.shape
    expect('tenant_id' in schema).toBe(false)
    expect('lease_id' in schema).toBe(true)
  })
})
