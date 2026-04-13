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

  // ─── Adjustment type validations ─────────────────────────────────────────────

  it('rechaza adjustment_type percentage sin adjustment_percentage', () => {
    const result = leaseSchema.safeParse({
      ...validLease,
      adjustment_type: 'percentage',
      adjustment_frequency_months: 3,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path).flat()
      expect(paths).toContain('adjustment_percentage')
    }
  })

  it('rechaza adjustment_type index sin adjustment_index', () => {
    const result = leaseSchema.safeParse({
      ...validLease,
      adjustment_type: 'index',
      adjustment_frequency_months: 6,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path).flat()
      expect(paths).toContain('adjustment_index')
    }
  })

  it('rechaza adjustment_type fixed_amount sin adjustment_fixed_amount', () => {
    const result = leaseSchema.safeParse({
      ...validLease,
      adjustment_type: 'fixed_amount',
      adjustment_frequency_months: 12,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path).flat()
      expect(paths).toContain('adjustment_fixed_amount')
    }
  })

  it('acepta adjustment_type percentage con todos los campos requeridos', () => {
    const result = leaseSchema.safeParse({
      ...validLease,
      adjustment_type: 'percentage',
      adjustment_frequency_months: 3,
      adjustment_percentage: 10,
    })
    expect(result.success).toBe(true)
  })

  // ─── billing_day boundaries ──────────────────────────────────────────────────

  it('rechaza billing_day 0 (inválido)', () => {
    const result = leaseSchema.safeParse({ ...validLease, billing_day: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path).flat()
      expect(paths).toContain('billing_day')
    }
  })

  it('acepta billing_day 1 (mínimo válido)', () => {
    const result = leaseSchema.safeParse({ ...validLease, billing_day: 1 })
    expect(result.success).toBe(true)
  })

  it('acepta billing_day 28 (máximo válido)', () => {
    const result = leaseSchema.safeParse({ ...validLease, billing_day: 28 })
    expect(result.success).toBe(true)
  })

  it('rechaza billing_day 29 (inválido)', () => {
    const result = leaseSchema.safeParse({ ...validLease, billing_day: 29 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path).flat()
      expect(paths).toContain('billing_day')
    }
  })

  // ─── end_date vs start_date ──────────────────────────────────────────────────

  it('rechaza end_date anterior a start_date', () => {
    const result = leaseSchema.safeParse({
      ...validLease,
      start_date: '2026-06-01',
      end_date: '2026-01-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path).flat()
      expect(paths).toContain('end_date')
    }
  })

  it('rechaza end_date igual a start_date', () => {
    const result = leaseSchema.safeParse({
      ...validLease,
      start_date: '2026-06-01',
      end_date: '2026-06-01',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path).flat()
      expect(paths).toContain('end_date')
    }
  })

  // ─── adjustment_type requires adjustment_frequency_months ────────────────────

  it('rechaza adjustment_type != none sin adjustment_frequency_months', () => {
    const result = leaseSchema.safeParse({
      ...validLease,
      adjustment_type: 'percentage',
      adjustment_percentage: 10,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path).flat()
      expect(paths).toContain('adjustment_frequency_months')
    }
  })
})
