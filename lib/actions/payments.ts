'use server'

import { getCurrentUserWithAccount } from '@/lib/supabase/auth'
import { getCurrentTenant } from '@/lib/supabase/tenant-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { logger, logError } from '@/lib/utils/logger'
import { validateId } from '@/lib/validations/common'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database, Json } from '@/types/database.types'
import {
  createCheckoutPreference,
} from '@/lib/payments/mercadopago-client'
import { env } from '@/lib/env'

// ─── Types ────────────────────────────────────────────────────────────────────

type Payment = Database['public']['Tables']['payments']['Row']
type PaymentEvent = Database['public']['Tables']['payment_events']['Row']

// ─── Validation schemas ───────────────────────────────────────────────────────

/**
 * Schema for manually recording a payment (staff / cash / bank transfer).
 * Used by landlord/admin in the owner dashboard.
 */
const registerManualPaymentSchema = z.object({
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
const initiateOnlinePaymentSchema = z.object({
  receipt_id: z.string().uuid('receipt_id debe ser un UUID válido'),
  provider: z.enum(['mercadopago', 'stripe', 'bank_transfer']),
})

export type InitiateOnlinePaymentInput = z.infer<typeof initiateOnlinePaymentSchema>

/**
 * Schema for processing an inbound provider webhook event.
 * Used by the webhook route handler (not by client code).
 */
const processPaymentEventSchema = z.object({
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

// ─── Owner / Staff actions ─────────────────────────────────────────────────────

/**
 * Manually registers a completed offline payment (cash, bank transfer, etc.)
 * for a given receipt. Staff-only action.
 *
 * Uses the register_payment() RPC function defined in the DB, which:
 * - Creates the payment record
 * - Updates the receipt status to 'paid'
 * - Writes an audit_log entry
 * — all in a single atomic transaction.
 */
export async function registerManualPayment(formData: RegisterManualPaymentInput) {
  try {
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    const validated = registerManualPaymentSchema.parse(formData)
    const receiptId = validateId(validated.receipt_id)

    const { error } = await supabase.rpc('register_payment', {
      p_actor_user_id: user.id,
      p_account_id: accountId,
      p_receipt_id: receiptId,
      p_amount: validated.amount,
      p_currency: validated.currency,
      p_payment_method: validated.payment_method ?? undefined,
      p_reference: validated.reference ?? undefined,
      p_notes: validated.notes ?? undefined,
    })

    if (error) {
      logger.error('register_payment RPC failed', { error: error.message, receiptId })
      return { success: false, error: 'Error al registrar el pago' }
    }

    logger.info('Manual payment registered', { receiptId, userId: user.id, amount: validated.amount })
    revalidatePath(`/receipts/${receiptId}`)
    revalidatePath('/receipts')
    return { success: true }
  } catch (error) {
    logError(error, { action: 'registerManualPayment' })
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos inválidos', errors: error.errors }
    }
    return { success: false, error: 'Error al registrar el pago' }
  }
}

/**
 * Returns all payments for a given receipt (staff view — full detail).
 * Scoped to the current user's account via RLS.
 */
export async function getPaymentsForReceipt(receiptId: string): Promise<Payment[]> {
  try {
    const validId = validateId(receiptId)
    const { accountId, supabase } = await getCurrentUserWithAccount()

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('receipt_id', validId)
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch payments for receipt', { error: error.message, receiptId: validId })
      return []
    }

    return data
  } catch (error) {
    logError(error, { action: 'getPaymentsForReceipt' })
    return []
  }
}

/**
 * Returns all payment events for a given payment (staff / audit trail).
 * Scoped to the current user's account via RLS.
 */
export async function getPaymentEvents(paymentId: string): Promise<PaymentEvent[]> {
  try {
    const validId = validateId(paymentId)
    const { accountId, supabase } = await getCurrentUserWithAccount()

    const { data, error } = await supabase
      .from('payment_events')
      .select('*')
      .eq('payment_id', validId)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch payment events', { error: error.message, paymentId: validId })
      return []
    }

    return data
  } catch (error) {
    logError(error, { action: 'getPaymentEvents' })
    return []
  }
}

// ─── Tenant-facing actions ─────────────────────────────────────────────────────

/**
 * Inicia un pago online via Mercado Pago Checkout Pro para un recibo específico.
 *
 * Flujo completo:
 *   1. Verifica que el inquilino autenticado sea el dueño del recibo (via RLS)
 *   2. Controla que el recibo no esté ya pagado o cancelado
 *   3. Si ya existe un pago pendiente con checkout_url → lo reutiliza (idempotente)
 *   4. Crea un registro en payments con status='pending'
 *   5. Llama a la API de MP para crear una preferencia de Checkout Pro
 *   6. Guarda el init_point y preference_id en el registro de payment
 *   7. Devuelve la checkout_url para redirigir al inquilino
 *
 * El external_reference enviado a MP es nuestro payments.id (UUID),
 * que MP devuelve en el webhook para reconciliar el pago.
 *
 * Compatibilidad:
 *   - Las credenciales del tab "Prueba" del panel MP devuelven un init_point
 *     que ya apunta al checkout sandbox automáticamente. Siempre usamos init_point.
 */
export async function initiateOnlinePayment(receiptId: string): Promise<
  { success: true; checkoutUrl: string } | { success: false; error: string }
> {
  try {
    if (!env.MERCADOPAGO_ACCESS_TOKEN) {
      return { success: false, error: 'Los pagos online no están habilitados en este momento.' }
    }

    const validReceiptId = validateId(receiptId)
    const { tenantId, user, supabase } = await getCurrentTenant()

    // 1. Obtener el recibo — RLS garantiza que pertenece a este inquilino
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('id, status, snapshot_amount, snapshot_currency, snapshot_tenant_name, period, account_id')
      .eq('id', validReceiptId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (receiptError || !receipt) {
      return { success: false, error: 'Recibo no encontrado.' }
    }

    if (['paid', 'cancelled'].includes(receipt.status)) {
      return {
        success: false,
        error: receipt.status === 'paid'
          ? 'Este recibo ya fue pagado.'
          : 'Este recibo fue cancelado.',
      }
    }

    // 2. Idempotencia: reusar pago pendiente existente si tiene checkout_url
    const adminSupabase = createAdminClient()

    const { data: existingPayment } = await adminSupabase
      .from('payments')
      .select('id, checkout_url, status')
      .eq('receipt_id', validReceiptId)
      .eq('provider', 'mercadopago')
      .in('status', ['pending', 'processing'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingPayment?.checkout_url) {
      logger.info('Reusing existing MP checkout', {
        paymentId: existingPayment.id,
        receiptId: validReceiptId,
      })
      return { success: true, checkoutUrl: existingPayment.checkout_url }
    }

    // 3. Crear registro de payment previo a la llamada a MP
    //    Necesitamos el ID antes de crear la preferencia (es el external_reference)
    const newPaymentId = crypto.randomUUID()

    const { error: insertError } = await adminSupabase
      .from('payments')
      .insert({
        id: newPaymentId,
        account_id: receipt.account_id,
        receipt_id: validReceiptId,
        amount: receipt.snapshot_amount,
        currency: receipt.snapshot_currency,
        status: 'pending',
        provider: 'mercadopago',
        external_reference: newPaymentId,
        initiated_by_user_id: user.id,
      })

    if (insertError) {
      logger.error('Failed to insert payment record', { error: insertError.message })
      return { success: false, error: 'Error al iniciar el pago. Intentá de nuevo.' }
    }

    // 4. Crear preferencia en Mercado Pago
    let preference
    try {
      preference = await createCheckoutPreference({
        paymentId: newPaymentId,
        title: `Alquiler ${receipt.period} — ${receipt.snapshot_tenant_name}`,
        amount: receipt.snapshot_amount,
        currency: receipt.snapshot_currency,
        payerEmail: user.email ?? undefined,
      })
    } catch (mpError) {
      // Rollback: marcar el pago como fallido si MP rechaza la solicitud
      await adminSupabase
        .from('payments')
        .update({ status: 'failed', provider_status: 'preference_creation_failed' })
        .eq('id', newPaymentId)

      logger.error('MP preference creation failed', {
        error: mpError instanceof Error ? mpError.message : String(mpError),
        paymentId: newPaymentId,
      })
      return { success: false, error: 'No se pudo iniciar el pago con Mercado Pago. Intentá de nuevo.' }
    }

    // 5. Usar init_point — MP lo routea al checkout correcto (sandbox/prod)
    //    según el tipo de credencial configurada.
    const checkoutUrl = preference.initPoint

    // 6. Guardar la checkout_url y el ID de preferencia en el registro
    await adminSupabase
      .from('payments')
      .update({
        checkout_url: checkoutUrl,
        provider_payment_id: preference.preferenceId,
        metadata: { preference_id: preference.preferenceId } as unknown as Json,
      })
      .eq('id', newPaymentId)

    logger.info('MP checkout preference created', {
      paymentId: newPaymentId,
      preferenceId: preference.preferenceId,
      receiptId: validReceiptId,
    })

    revalidatePath('/tenant/dashboard')
    return { success: true, checkoutUrl }
  } catch (error) {
    logError(error, { action: 'initiateOnlinePayment' })
    return { success: false, error: 'Error inesperado al iniciar el pago.' }
  }
}

/**
 * Returns all payments for the authenticated tenant (portal view).
 * Scoped via RLS: tenant can only see payments for their own receipts.
 *
 * Ordered by most recent first. Returns simplified fields suitable for
 * the tenant dashboard — no internal reconciliation metadata exposed.
 */
export async function getTenantPayments(): Promise<Payment[]> {
  try {
    const { supabase } = await getCurrentTenant()

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch tenant payments', { error: error.message })
      return []
    }

    return data
  } catch (error) {
    logError(error, { action: 'getTenantPayments' })
    return []
  }
}

/**
 * Returns all payments for a specific receipt, from the tenant's perspective.
 * The tenant must own the receipt (enforced by RLS on the payments table).
 */
export async function getTenantPaymentsForReceipt(receiptId: string): Promise<Payment[]> {
  try {
    const validId = validateId(receiptId)
    const { supabase } = await getCurrentTenant()

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('receipt_id', validId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch tenant payments for receipt', { error: error.message })
      return []
    }

    return data
  } catch (error) {
    logError(error, { action: 'getTenantPaymentsForReceipt' })
    return []
  }
}

// ─── Webhook processing (service-role, called from API route) ─────────────────

/**
 * Records a provider webhook event and processes it idempotently.
 *
 * This is NOT a user-facing Server Action — it is called by the webhook
 * route handler (e.g. app/api/webhooks/mercadopago/route.ts) which uses
 * createAdminClient() (service role), bypassing RLS entirely.
 *
 * Idempotency: UNIQUE(provider, provider_event_id) on payment_events
 * means duplicate webhooks from the provider are safely ignored via
 * ON CONFLICT DO NOTHING.
 *
 * Status mapping from Mercado Pago:
 *   'approved'  → 'paid'
 *   'in_process'→ 'processing'
 *   'pending'   → 'processing'
 *   'rejected'  → 'failed'
 *   'cancelled' → 'cancelled'
 *   'refunded'  → 'refunded'
 */
export async function processProviderPaymentEvent(input: ProcessPaymentEventInput) {
  try {
    const validated = processPaymentEventSchema.parse(input)
    const adminSupabase = createAdminClient()

    // 1. Atomically claim this event via INSERT.
    // UNIQUE(provider, provider_event_id) guarantees only one concurrent
    // processor wins. A 23505 (unique_violation) means another worker
    // already claimed it — short-circuit as duplicate without re-running
    // the payment/receipt update logic (prevents double-write race).
    const { error: insertError } = await adminSupabase
      .from('payment_events')
      .insert({
        account_id: validated.account_id,
        payment_id: validated.payment_id,
        provider: validated.provider,
        provider_event_id: validated.provider_event_id,
        event_type: validated.event_type,
        event_data: (validated.event_data ?? null) as Json | null,
      })

    if (insertError) {
      if ((insertError as { code?: string }).code === '23505') {
        logger.info('Duplicate payment event ignored (already claimed)', {
          provider: validated.provider,
          providerEventId: validated.provider_event_id,
        })
        return { success: true, duplicate: true }
      }
      logger.error('Failed to insert payment_event', {
        error: insertError.message,
        paymentId: validated.payment_id,
        providerEventId: validated.provider_event_id,
      })
      return { success: false, error: 'Failed to record event' }
    }

    // 2. Map provider status to our canonical PaymentStatus
    const canonicalStatus = mapProviderStatus(validated.provider_status)

    // 3. Update the payment record with the latest provider data
    const paymentUpdate: Record<string, unknown> = {
      provider_status: validated.provider_status ?? null,
    }

    if (validated.provider_payment_id) {
      paymentUpdate.provider_payment_id = validated.provider_payment_id
    }

    if (canonicalStatus) {
      paymentUpdate.status = canonicalStatus

      if (canonicalStatus === 'paid') {
        paymentUpdate.paid_at = new Date().toISOString()
      }
    }

    const { error: paymentError } = await adminSupabase
      .from('payments')
      .update(paymentUpdate)
      .eq('id', validated.payment_id)
      .eq('account_id', validated.account_id)

    if (paymentError) {
      logger.error('Failed to update payment from webhook', {
        error: paymentError.message,
        paymentId: validated.payment_id,
      })
      return { success: false, error: 'Failed to update payment status' }
    }

    // 4. If payment is now 'paid', update the linked receipt status
    if (canonicalStatus === 'paid') {
      const { data: payment } = await adminSupabase
        .from('payments')
        .select('receipt_id')
        .eq('id', validated.payment_id)
        .single()

      if (payment?.receipt_id) {
        const { error: receiptError } = await adminSupabase
          .from('receipts')
          .update({ status: 'paid' })
          .eq('id', payment.receipt_id)
          .neq('status', 'paid')   // Only update if not already paid (idempotent)

        if (receiptError) {
          logger.error('Failed to update receipt to paid', {
            error: receiptError.message,
            receiptId: payment.receipt_id,
          })
          // Non-fatal: payment is recorded, receipt update is best-effort
        } else {
          logger.info('Receipt marked as paid via webhook', { receiptId: payment.receipt_id })
        }
      }
    }

    // 5. Mark event as processed
    await adminSupabase
      .from('payment_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('payment_id', validated.payment_id)
      .eq('provider_event_id', validated.provider_event_id)

    logger.info('Payment event processed', {
      paymentId: validated.payment_id,
      eventType: validated.event_type,
      canonicalStatus,
    })

    return { success: true, duplicate: false, canonicalStatus }
  } catch (error) {
    logError(error, { action: 'processProviderPaymentEvent' })
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid event data', errors: error.errors }
    }
    return { success: false, error: 'Unexpected error processing payment event' }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps a provider-specific raw status string to our canonical PaymentStatus.
 * Currently aligned with Mercado Pago status values.
 *
 * Returns null if the status should not trigger a status change
 * (e.g. unknown or informational events).
 */
function mapProviderStatus(
  providerStatus: string | undefined
): 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded' | null {
  if (!providerStatus) return null

  const mapping: Record<string, 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded'> = {
    // Mercado Pago
    approved: 'paid',
    authorized: 'processing',
    in_process: 'processing',
    in_mediation: 'processing',
    pending: 'processing',
    rejected: 'failed',
    cancelled: 'cancelled',
    refunded: 'refunded',
    charged_back: 'refunded',
    // Stripe (future-proofing)
    succeeded: 'paid',
    processing: 'processing',
    requires_payment_method: 'failed',
  }

  return mapping[providerStatus] ?? null
}
