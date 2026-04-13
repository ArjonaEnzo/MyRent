import { describe, it, expect } from 'vitest'
import { validateId, validateIds } from '@/lib/validations/common'

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'

describe('validateId', () => {
  it('acepta un UUID válido', () => {
    expect(validateId(VALID_UUID)).toBe(VALID_UUID)
  })

  it('rechaza un UUID inválido', () => {
    expect(() => validateId('no-es-uuid')).toThrow()
  })

  it('rechaza un string vacío', () => {
    expect(() => validateId('')).toThrow()
  })

  it('rechaza un valor no-string', () => {
    expect(() => validateId(123 as unknown as string)).toThrow()
  })

  it('rechaza un string con SQL injection', () => {
    expect(() => validateId("'; DROP TABLE users;--")).toThrow()
  })

  it('rechaza un UUID con espacios extra', () => {
    expect(() => validateId(` ${VALID_UUID} `)).toThrow()
  })
})

describe('validateIds', () => {
  it('acepta un array de UUIDs válidos', () => {
    const result = validateIds([VALID_UUID, VALID_UUID_2])
    expect(result).toEqual([VALID_UUID, VALID_UUID_2])
  })

  it('rechaza un array con un UUID inválido', () => {
    expect(() => validateIds([VALID_UUID, 'no-es-uuid'])).toThrow()
  })

  it('acepta un array vacío', () => {
    const result = validateIds([])
    expect(result).toEqual([])
  })

  it('rechaza cuando no es un array', () => {
    expect(() => validateIds('not-an-array' as unknown as string[])).toThrow()
  })
})
