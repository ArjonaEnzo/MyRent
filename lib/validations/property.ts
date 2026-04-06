import { z } from 'zod'

export const propertySchema = z.object({
  name: z
    .string({ required_error: 'El nombre es requerido' })
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  address: z
    .string({ required_error: 'La dirección es requerida' })
    .min(1, 'La dirección es requerida')
    .max(200, 'La dirección no puede exceder 200 caracteres'),
})

export type PropertyInput = z.infer<typeof propertySchema>
