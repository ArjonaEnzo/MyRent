import { z } from 'zod'

/**
 * Schema de validación para actualizar el perfil (nombre)
 */
export const updateProfileSchema = z.object({
  fullName: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre debe tener máximo 100 caracteres')
    .trim(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

/**
 * Schema de validación para actualizar el email
 */
export const updateEmailSchema = z.object({
  email: z
    .string({ required_error: 'El email es requerido' })
    .email('Ingresa un email válido')
    .max(255, 'El email es demasiado largo')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'La contraseña es requerida para confirmar el cambio' })
    .min(1, 'Ingresa tu contraseña actual'),
})

export type UpdateEmailInput = z.infer<typeof updateEmailSchema>

/**
 * Schema de validación para actualizar la contraseña
 */
export const updatePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'La contraseña actual es requerida' })
    .min(1, 'Ingresa tu contraseña actual'),
  newPassword: z
    .string({ required_error: 'La nueva contraseña es requerida' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(72, 'La contraseña debe tener máximo 72 caracteres'),
  confirmNewPassword: z
    .string({ required_error: 'Confirma tu nueva contraseña' })
    .min(1, 'Confirma tu nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmNewPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'La nueva contraseña debe ser diferente a la actual',
  path: ['newPassword'],
})

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
