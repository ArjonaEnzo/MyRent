import { z } from 'zod'

export const tenantSchema = z.object({
  full_name: z
    .string({ required_error: 'El nombre es requerido' })
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  email: z
    .string({ required_error: 'El email es requerido' })
    .min(1, 'El email es requerido')
    .email('Ingresa un email válido'),
  phone: z
    .string()
    .max(30, 'El teléfono no puede exceder 30 caracteres')
    .optional()
    .or(z.literal('')),
  dni_cuit: z
    .string()
    .max(20, 'El DNI/CUIT no puede exceder 20 caracteres')
    .optional()
    .or(z.literal('')),
})

export type TenantInput = z.infer<typeof tenantSchema>
