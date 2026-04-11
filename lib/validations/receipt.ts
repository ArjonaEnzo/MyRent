import { z } from 'zod'

export const receiptSchema = z.object({
  lease_id: z
    .string({ required_error: 'El contrato es requerido' })
    .uuid('Contrato inválido'),
  period: z
    .string({ required_error: 'El período es requerido' })
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El período debe tener el formato YYYY-MM'),
  description: z
    .string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
})

export type ReceiptInput = z.infer<typeof receiptSchema>
