import { z } from 'zod'

/**
 * Schema for manually recording a payment (staff / cash / bank transfer).
 * Used by landlord/admin in the owner dashboard.
 */
export const registerManualPaymentSchema = z.object({
  receipt_id: z.string().uuid('receipt_id debe ser un UUID válido'),
  amount: z.number().positive('El monto debe ser mayor a 0'),
  currency: z.string().min(1).max(3).default('ARS'),
  payment_method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

export type RegisterManualPaymentInput = z.infer<typeof registerManualPaymentSchema>

/**
 * Schema for initiating an online payment checkout session.
 * Used when a tenant (or staff) starts the payment process through a provider.
 */
export const initiateOnlinePaymentSchema = z.object({
  receipt_id: z.string().uuid('receipt_id debe ser un UUID válido'),
  provider: z.enum(['mercadopago', 'stripe', 'bank_transfer']),
})

export type InitiateOnlinePaymentInput = z.infer<typeof initiateOnlinePaymentSchema>

/**
 * Schema for processing an inbound provider webhook event.
 * Used by the webhook route handler (not by client code).
 */
export const processPaymentEventSchema = z.object({
  payment_id: z.string().uuid(),
  account_id: z.string().uuid(),
  provider: z.string().min(1),
  provider_event_id: z.string().min(1),
  event_type: z.string().min(1),
  provider_payment_id: z.string().optional(),
  provider_status: z.string().optional(),
  event_data: z.record(z.unknown()).optional(),
})

export type ProcessPaymentEventInput = z.infer<typeof processPaymentEventSchema>
