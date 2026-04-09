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
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
    .refine((d) => !isNaN(Date.parse(d)), 'La fecha de inicio no es válida'),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
    .refine((d) => !isNaN(Date.parse(d)), 'La fecha de fin no es válida')
    .optional()
    .or(z.literal('')),
  rent_amount: z
    .number({ required_error: 'El monto es requerido' })
    .positive('El monto debe ser mayor a 0')
    .max(999_999_999, 'El monto ingresado es demasiado alto'),
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
  // Validar que end_date sea posterior a start_date
  if (data.end_date && data.end_date !== '' && data.start_date) {
    if (new Date(data.end_date) <= new Date(data.start_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de fin debe ser posterior a la fecha de inicio',
        path: ['end_date'],
      })
    }
  }

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
  effective_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
    .refine((d) => !isNaN(Date.parse(d)), 'La fecha no es válida'),
  new_amount: z.number().positive('El nuevo monto debe ser mayor a 0'),
  adjustment_type: z.enum(['percentage', 'index', 'fixed_amount', 'manual']),
  adjustment_value: z.number().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export type LeaseAdjustmentInput = z.infer<typeof leaseAdjustmentSchema>
