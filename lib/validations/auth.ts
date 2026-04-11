import { z } from 'zod'

/**
 * Schema de validación para registro de usuario
 */
export const signupSchema = z.object({
  email: z
    .string({ required_error: 'El email es requerido' })
    .email('Ingresa un email válido'),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z
    .string({ required_error: 'Confirma tu contraseña' })
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

export type SignupInput = z.infer<typeof signupSchema>

/**
 * Schema de validación para login
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'El email es requerido' })
    .email('Ingresa un email válido'),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(1, 'La contraseña es requerida'),
})

export type LoginInput = z.infer<typeof loginSchema>
