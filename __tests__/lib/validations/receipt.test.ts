import { describe, it, expect } from 'vitest'
import { receiptSchema } from '@/lib/validations/receipt'

const validReceipt = {
  lease_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  period: '2026-04',
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
      period: '2026-03',
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

  it('rechaza período con formato libre (texto)', () => {
    const result = receiptSchema.safeParse({ ...validReceipt, period: 'Abril 2026' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('period')
  })

  it('rechaza mes inválido en period', () => {
    const result = receiptSchema.safeParse({ ...validReceipt, period: '2026-13' })
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

// ─── receiptLineItemSchema ──────────────────────────────────────────────────

import { receiptLineItemSchema, updateLineItemSchema } from '@/lib/validations/receipt'

const validLineItem = {
  receipt_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  label: 'Alquiler mensual',
  amount: 150000,
  item_type: 'rent' as const,
}

describe('receiptLineItemSchema', () => {
  it('acepta un line item válido', () => {
    const result = receiptLineItemSchema.safeParse(validLineItem)
    expect(result.success).toBe(true)
  })

  it('rechaza monto cero', () => {
    const result = receiptLineItemSchema.safeParse({ ...validLineItem, amount: 0 })
    expect(result.success).toBe(false)
  })

  it('acepta monto negativo (para descuentos)', () => {
    const result = receiptLineItemSchema.safeParse({
      ...validLineItem,
      amount: -5000,
      item_type: 'discount',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza label vacío', () => {
    const result = receiptLineItemSchema.safeParse({ ...validLineItem, label: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('label')
  })

  it('rechaza label faltante', () => {
    const { label: _, ...withoutLabel } = validLineItem
    const result = receiptLineItemSchema.safeParse(withoutLabel)
    expect(result.success).toBe(false)
  })

  it('rechaza label mayor a 200 caracteres', () => {
    const result = receiptLineItemSchema.safeParse({
      ...validLineItem,
      label: 'a'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('rechaza item_type inválido', () => {
    const result = receiptLineItemSchema.safeParse({
      ...validLineItem,
      item_type: 'invalid_type',
    })
    expect(result.success).toBe(false)
  })

  it('acepta todos los item_type válidos', () => {
    const types = ['rent', 'expensas', 'extra', 'discount', 'tax'] as const
    for (const item_type of types) {
      const result = receiptLineItemSchema.safeParse({ ...validLineItem, item_type })
      expect(result.success).toBe(true)
    }
  })

  it('rechaza receipt_id inválido', () => {
    const result = receiptLineItemSchema.safeParse({
      ...validLineItem,
      receipt_id: 'no-es-uuid',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('receipt_id')
  })
})

describe('updateLineItemSchema', () => {
  const validUpdate = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    label: 'Expensas',
    amount: 25000,
    item_type: 'expensas' as const,
  }

  it('acepta una actualización válida', () => {
    const result = updateLineItemSchema.safeParse(validUpdate)
    expect(result.success).toBe(true)
  })

  it('acepta actualización parcial (solo label)', () => {
    const result = updateLineItemSchema.safeParse({
      id: validUpdate.id,
      label: 'Nuevo label',
    })
    expect(result.success).toBe(true)
  })

  it('acepta actualización parcial (solo amount)', () => {
    const result = updateLineItemSchema.safeParse({
      id: validUpdate.id,
      amount: 30000,
    })
    expect(result.success).toBe(true)
  })

  it('requiere id válido', () => {
    const result = updateLineItemSchema.safeParse({
      id: 'no-es-uuid',
      label: 'Test',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('id')
  })

  it('no requiere receipt_id (omitido del schema)', () => {
    const result = updateLineItemSchema.safeParse({
      id: validUpdate.id,
    })
    expect(result.success).toBe(true)
  })
})
