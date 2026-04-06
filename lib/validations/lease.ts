import { z } from 'zod'

export const leaseSchema = z.object({
  property_id: z
    .string({ required_error: 'La propiedad es requerida' })
    .uuid('Propiedad inválida'),
  tenant_id: z
    .string({ required_error: 'El inquilino es requerido' })
    .uuid('Inquilino inválido'),
  start_date: z
    .string({ required_error: 'La fecha de inicio es requerida' })
    .min(1, 'La fecha de inicio es requerida'),
  end_date: z
    .string()
    .optional()
    .or(z.literal('')),
  rent_amount: z
    .number({ required_error: 'El monto es requerido' })
    .positive('El monto debe ser mayor a 0'),
  currency: z.enum(['ARS', 'USD'], {
    required_error: 'La moneda es requerida',
  }),
  notes: z
    .string()
    .max(1000, 'Las notas no pueden exceder 1000 caracteres')
    .optional(),
  // Configuración de ajustes
  adjustment_type: z
    .enum(['none', 'percentage', 'index', 'fixed_amount'])
    .default('none'),
  adjustment_frequency_months: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  adjustment_percentage: z
    .number()
    .positive('El porcentaje debe ser mayor a 0')
    .max(1000)
    .optional()
    .nullable(),
  adjustment_index: z
    .enum(['ICL', 'IPC', 'CER', 'CVS', 'UVA'])
    .optional()
    .nullable(),
  adjustment_fixed_amount: z
    .number()
    .positive('El monto debe ser mayor a 0')
    .optional()
    .nullable(),
}).superRefine((data, ctx) => {
  if (data.adjustment_type === 'none') return

  if (!data.adjustment_frequency_months) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La frecuencia de ajuste es requerida',
      path: ['adjustment_frequency_months'],
    })
  }

  if (data.adjustment_type === 'percentage' && !data.adjustment_percentage) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El porcentaje es requerido',
      path: ['adjustment_percentage'],
    })
  }

  if (data.adjustment_type === 'index' && !data.adjustment_index) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El índice es requerido',
      path: ['adjustment_index'],
    })
  }

  if (data.adjustment_type === 'fixed_amount' && !data.adjustment_fixed_amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El monto de aumento es requerido',
      path: ['adjustment_fixed_amount'],
    })
  }
})

export type LeaseInput = z.infer<typeof leaseSchema>

export const leaseAdjustmentSchema = z.object({
  lease_id: z.string().uuid(),
  effective_date: z.string().min(1, 'La fecha es requerida'),
  new_amount: z.number().positive('El nuevo monto debe ser mayor a 0'),
  adjustment_type: z.enum(['percentage', 'index', 'fixed_amount', 'manual']),
  adjustment_value: z.number().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export type LeaseAdjustmentInput = z.infer<typeof leaseAdjustmentSchema>
