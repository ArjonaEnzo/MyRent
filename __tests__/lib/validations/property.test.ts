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

  it('acepta campos estructurados opcionales', () => {
    const result = propertySchema.safeParse({
      name: 'Depto',
      address: 'Av. Corrientes 1234, CABA',
      street_name: 'Av. Corrientes',
      street_number: '1234',
      city: 'Ciudad Autónoma de Buenos Aires',
      province: 'Ciudad Autónoma de Buenos Aires',
      postal_code: 'C1043',
      country: 'AR',
      latitude: -34.6037,
      longitude: -58.3816,
      google_place_id: 'ChIJxxxxx',
    })
    expect(result.success).toBe(true)
  })

  it('acepta null en campos estructurados', () => {
    const result = propertySchema.safeParse({
      name: 'Depto',
      address: 'Dirección',
      street_name: null,
      latitude: null,
      longitude: null,
    })
    expect(result.success).toBe(true)
  })

  it('rechaza latitud fuera de rango', () => {
    const result = propertySchema.safeParse({
      name: 'Depto',
      address: 'Dirección',
      latitude: 91,
    })
    expect(result.success).toBe(false)
  })

  it('rechaza longitud fuera de rango', () => {
    const result = propertySchema.safeParse({
      name: 'Depto',
      address: 'Dirección',
      longitude: -181,
    })
    expect(result.success).toBe(false)
  })
})
