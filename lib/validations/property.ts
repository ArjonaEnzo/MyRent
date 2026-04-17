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
  // Structured fields (optional — filled by Google Places autocomplete)
  street_name: z.string().max(200).optional().nullable(),
  street_number: z.string().max(30).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  postal_code: z.string().max(20).optional().nullable(),
  country: z.string().max(2).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  google_place_id: z.string().max(255).optional().nullable(),
})

export type PropertyInput = z.infer<typeof propertySchema>
