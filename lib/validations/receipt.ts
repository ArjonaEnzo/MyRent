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

export const LINE_ITEM_TYPES = ['rent', 'expensas', 'extra', 'discount', 'tax'] as const

export const receiptLineItemSchema = z.object({
  receipt_id: z
    .string({ required_error: 'El recibo es requerido' })
    .uuid('Recibo inválido'),
  label: z
    .string({ required_error: 'La descripción es requerida' })
    .min(1, 'La descripción no puede estar vacía')
    .max(200, 'La descripción no puede exceder 200 caracteres'),
  amount: z
    .number({ required_error: 'El monto es requerido' })
    .refine((v) => v !== 0, 'El monto no puede ser cero'),
  item_type: z.enum(LINE_ITEM_TYPES, {
    errorMap: () => ({ message: 'Tipo de concepto inválido' }),
  }),
})

export type ReceiptLineItemInput = z.infer<typeof receiptLineItemSchema>

export const updateLineItemSchema = receiptLineItemSchema.omit({ receipt_id: true }).partial().extend({
  id: z.string().uuid('ID inválido'),
})

export type UpdateLineItemInput = z.infer<typeof updateLineItemSchema>
