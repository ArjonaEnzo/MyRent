import { describe, it, expect } from 'vitest'
import { loginSchema, signupSchema } from '@/lib/validations/auth'

describe('loginSchema', () => {
  it('acepta email y password válidos', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza email inválido', () => {
    const result = loginSchema.safeParse({ email: 'no-email', password: 'pass123' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })

  it('rechaza password vacío', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('password')
  })
})

describe('signupSchema', () => {
  it('acepta datos válidos', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza cuando passwords no coinciden', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'diferente456',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza password corto', () => {
    const result = signupSchema.safeParse({
      email: 'user@example.com',
      password: '123',
      confirmPassword: '123',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('password')
  })
})
