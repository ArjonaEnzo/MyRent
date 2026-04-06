import { z } from 'zod'

export const receiptSchema = z.object({
  lease_id: z
    .string({ required_error: 'El contrato es requerido' })
    .uuid('Contrato inválido'),
  period: z
    .string({ required_error: 'El período es requerido' })
    .min(1, 'El período es requerido')
    .max(50, 'El período no puede exceder 50 caracteres'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
})

export type ReceiptInput = z.infer<typeof receiptSchema>
