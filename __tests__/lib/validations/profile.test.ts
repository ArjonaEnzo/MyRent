import { describe, it, expect } from 'vitest'
import {
  updateProfileSchema,
  updateEmailSchema,
  updatePasswordSchema,
} from '@/lib/validations/profile'

describe('updateProfileSchema', () => {
  it('acepta un nombre válido', () => {
    const result = updateProfileSchema.safeParse({ fullName: 'Juan Pérez' })
    expect(result.success).toBe(true)
  })

  it('rechaza un nombre vacío', () => {
    const result = updateProfileSchema.safeParse({ fullName: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('fullName')
  })

  it('rechaza un nombre de 1 caracter (mínimo 2)', () => {
    const result = updateProfileSchema.safeParse({ fullName: 'A' })
    expect(result.success).toBe(false)
  })

  it('acepta un nombre de 2 caracteres (mínimo)', () => {
    const result = updateProfileSchema.safeParse({ fullName: 'AB' })
    expect(result.success).toBe(true)
  })

  it('rechaza un nombre mayor a 100 caracteres', () => {
    const result = updateProfileSchema.safeParse({ fullName: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('acepta un nombre de exactamente 100 caracteres', () => {
    const result = updateProfileSchema.safeParse({ fullName: 'a'.repeat(100) })
    expect(result.success).toBe(true)
  })

  it('aplica trim al nombre', () => {
    const result = updateProfileSchema.safeParse({ fullName: '  Juan Pérez  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fullName).toBe('Juan Pérez')
    }
  })
})

describe('updateEmailSchema', () => {
  it('acepta email y password válidos', () => {
    const result = updateEmailSchema.safeParse({
      email: 'nuevo@example.com',
      password: 'mipassword',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza email inválido', () => {
    const result = updateEmailSchema.safeParse({
      email: 'no-es-email',
      password: 'mipassword',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })

  it('rechaza password vacío', () => {
    const result = updateEmailSchema.safeParse({
      email: 'nuevo@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('password')
  })

  it('convierte email a lowercase', () => {
    const result = updateEmailSchema.safeParse({
      email: 'USER@Example.COM',
      password: 'mipassword',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('user@example.com')
    }
  })

  it('rechaza email mayor a 255 caracteres', () => {
    const longEmail = 'a'.repeat(250) + '@b.com'
    const result = updateEmailSchema.safeParse({
      email: longEmail,
      password: 'mipassword',
    })
    expect(result.success).toBe(false)
  })
})

describe('updatePasswordSchema', () => {
  const validPassword = {
    currentPassword: 'oldpass123',
    newPassword: 'newpass456',
    confirmNewPassword: 'newpass456',
  }

  it('acepta datos válidos', () => {
    const result = updatePasswordSchema.safeParse(validPassword)
    expect(result.success).toBe(true)
  })

  it('rechaza cuando passwords no coinciden', () => {
    const result = updatePasswordSchema.safeParse({
      ...validPassword,
      confirmNewPassword: 'diferente789',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path).flat()
      expect(paths).toContain('confirmNewPassword')
    }
  })

  it('rechaza nueva password menor a 6 caracteres', () => {
    const result = updatePasswordSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: '12345',
      confirmNewPassword: '12345',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path).flat()
      expect(paths).toContain('newPassword')
    }
  })

  it('rechaza nueva password mayor a 72 caracteres', () => {
    const longPass = 'a'.repeat(73)
    const result = updatePasswordSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: longPass,
      confirmNewPassword: longPass,
    })
    expect(result.success).toBe(false)
  })

  it('rechaza si la nueva password es igual a la actual', () => {
    const result = updatePasswordSchema.safeParse({
      currentPassword: 'samepassword',
      newPassword: 'samepassword',
      confirmNewPassword: 'samepassword',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path).flat()
      expect(paths).toContain('newPassword')
    }
  })

  it('rechaza currentPassword vacío', () => {
    const result = updatePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'newpass456',
      confirmNewPassword: 'newpass456',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza confirmNewPassword vacío', () => {
    const result = updatePasswordSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmNewPassword: '',
    })
    expect(result.success).toBe(false)
  })
})
