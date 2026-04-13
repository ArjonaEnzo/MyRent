/**
 * Mercado Pago — cliente oficial y helpers de integración
 *
 * Docs de referencia:
 *   Checkout Pro:  https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integrate-checkout-pro
 *   Webhooks:      https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 *   Pagos (GET):   https://www.mercadopago.com.ar/developers/es/reference/payments/_payments_id/get
 *
 * Flujo:
 *   1. createCheckoutPreference()   → devuelve init_point para redirigir al inquilino
 *   2. POST /api/webhooks/mercadopago → verifyWebhookSignature() + getPaymentDetails()
 *   3. getPaymentDetails()          → estado definitivo del pago
 */

import { MercadoPagoConfig, Payment } from 'mercadopago'
import { createHmac, timingSafeEqual } from 'crypto'
import { env } from '@/lib/env'

/** Ventana máxima de antigüedad aceptada para el timestamp del webhook (replay protection).
 *  MP retries with exponential backoff (up to ~48h), so we allow a generous window
 *  to avoid rejecting legitimate retries while still protecting against replay attacks. */
const MP_WEBHOOK_MAX_SKEW_MS = 60 * 60 * 1000

// ─── Client factory ───────────────────────────────────────────────────────────

/**
 * Crea y devuelve el cliente autenticado de Mercado Pago.
 * Lanza un error descriptivo si el access token no está configurado,
 * para facilitar el diagnóstico en entornos sin la integración activa.
 */
function getMPClient(): MercadoPagoConfig {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error(
      'MERCADOPAGO_ACCESS_TOKEN no configurado. ' +
      'Agregá la variable de entorno para habilitar pagos online.'
    )
  }
  return new MercadoPagoConfig({
    accessToken: env.MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 10_000 },
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type MPPreferenceResult = {
  preferenceId: string
  /** URL de producción para redirigir al inquilino */
  initPoint: string
  /** URL de sandbox para testing */
  sandboxInitPoint: string
}

/**
 * Subconjunto tipado de los campos de pago que usamos.
 * El SDK devuelve un objeto más grande; acá capturamos solo lo relevante.
 */
export type MPPaymentDetails = {
  id: number
  status: string
  status_detail: string
  external_reference: string | null | undefined
  transaction_amount: number
  currency_id: string
  payment_method_id: string | null | undefined
  payment_type_id: string | null | undefined
  date_approved: string | null | undefined
  date_created: string | null | undefined
  payer: {
    email: string | null | undefined
    first_name: string | null | undefined
    last_name: string | null | undefined
  } | null | undefined
}

// ─── Preference (Checkout Pro) ────────────────────────────────────────────────

export type CreatePreferenceInput = {
  /** Nuestro ID interno del pago (payments.id), usado como external_reference */
  paymentId: string
  /** Descripción que aparece en el checkout, ej. "Alquiler Enero 2026" */
  title: string
  /** Monto del recibo */
  amount: number
  /** Moneda, ej. "ARS" */
  currency: string
  /** Email del inquilino para pre-llenar el formulario de MP */
  payerEmail?: string
  /** Nombre del inquilino */
  payerName?: string
}

/**
 * Crea una preferencia de pago en Mercado Pago (Checkout Pro).
 *
 * El campo `external_reference` se setea con nuestro `payments.id` UUID,
 * que es lo que MP nos devuelve en el webhook para reconciliar el pago.
 *
 * Los back_urls redirigen al inquilino de vuelta a nuestra app
 * después de completar o cancelar el pago.
 *
 * La `notification_url` apunta a nuestro webhook handler, que recibe
 * el evento de Mercado Pago y actualiza el estado del pago en la DB.
 */
export async function createCheckoutPreference(
  input: CreatePreferenceInput
): Promise<MPPreferenceResult> {
  if (!env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado.')
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(appUrl)

  // Build the request body matching MP Checkout Pro API
  // Using direct fetch instead of SDK for better serverless compatibility
  const body: Record<string, unknown> = {
    items: [
      {
        id: input.paymentId,
        title: input.title,
        quantity: 1,
        unit_price: input.amount,
        currency_id: input.currency,
      },
    ],
    external_reference: input.paymentId,
    statement_descriptor: 'MYRENT',
  }

  if (input.payerEmail) {
    body.payer = {
      email: input.payerEmail,
      ...(input.payerName ? { name: input.payerName } : {}),
    }
  }

  if (!isLocalhost) {
    body.back_urls = {
      success: `${appUrl}/tenant/payment/success?payment_id=${input.paymentId}`,
      failure: `${appUrl}/tenant/payment/failure?payment_id=${input.paymentId}`,
      pending: `${appUrl}/tenant/payment/pending?payment_id=${input.paymentId}`,
    }
    body.auto_return = 'approved'
    body.notification_url = `${appUrl}/api/webhooks/mercadopago`
  }

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'no body')
    throw new Error(
      `MP API error ${response.status}: ${errorText}`
    )
  }

  const result = await response.json()

  if (!result.id || !result.init_point) {
    throw new Error('Mercado Pago no devolvió un init_point válido')
  }

  return {
    preferenceId: result.id,
    initPoint: result.init_point,
    sandboxInitPoint: result.sandbox_init_point ?? result.init_point,
  }
}

// ─── Payment details (GET /v1/payments/:id) ────────────────────────────────────

/**
 * Obtiene los detalles completos de un pago usando el ID de MP.
 *
 * Se llama después de recibir un webhook para obtener el estado
 * definitivo del pago y el external_reference para reconciliar.
 *
 * Según la doc oficial, siempre hay que hacer esta llamada adicional
 * porque el webhook solo trae el ID del pago, no su estado completo.
 */
export async function getPaymentDetails(mpPaymentId: string): Promise<MPPaymentDetails> {
  const client = getMPClient()
  const paymentClient = new Payment(client)

  const result = await paymentClient.get({ id: mpPaymentId })

  if (!result || result.id === undefined) {
    throw new Error(`No se encontró el pago MP con ID ${mpPaymentId}`)
  }

  return {
    id: result.id,
    status: result.status ?? 'unknown',
    status_detail: result.status_detail ?? '',
    external_reference: result.external_reference,
    transaction_amount: result.transaction_amount ?? 0,
    currency_id: result.currency_id ?? 'ARS',
    payment_method_id: result.payment_method_id,
    payment_type_id: result.payment_type_id,
    date_approved: result.date_approved,
    date_created: result.date_created,
    payer: result.payer
      ? {
          email: result.payer.email,
          first_name: result.payer.first_name,
          last_name: result.payer.last_name,
        }
      : null,
  }
}

// ─── Webhook signature validation ─────────────────────────────────────────────

/**
 * Verifica la firma HMAC-SHA256 del webhook de Mercado Pago.
 *
 * Según la doc oficial:
 *   Header x-signature → "ts=TIMESTAMP,v1=HASH"
 *   Header x-request-id → ID único del request
 *   Query param data.id → ID del recurso notificado
 *
 *   Template para firmar:
 *     "id:{data.id};request-id:{x-request-id};ts:{ts};"
 *
 *   El secret es la "clave secreta" generada en
 *   Tus integraciones → Webhooks → configuración del endpoint.
 *
 * @returns true si la firma es válida, false si no.
 */
export function verifyWebhookSignature(params: {
  xSignature: string
  xRequestId: string
  dataId: string
  secret: string
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = params

  // Parsear "ts=TIMESTAMP,v1=HASH"
  let ts: string | null = null
  let receivedHash: string | null = null

  for (const part of xSignature.split(',')) {
    const [key, value] = part.split('=', 2)
    if (key?.trim() === 'ts') ts = value?.trim() ?? null
    if (key?.trim() === 'v1') receivedHash = value?.trim() ?? null
  }

  if (!ts || !receivedHash) {
    return false
  }

  // Freshness: rechazar webhooks con ts fuera de la ventana (±5 min).
  // Protección contra replay con firmas capturadas. MP manda ts en ms.
  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum)) return false
  const skew = Math.abs(Date.now() - tsNum)
  if (skew > MP_WEBHOOK_MAX_SKEW_MS) {
    return false
  }

  // Construir el template exacto que MP firma
  const signedTemplate = `id:${dataId};request-id:${xRequestId};ts:${ts};`

  // Calcular HMAC-SHA256
  const calculatedHash = createHmac('sha256', secret)
    .update(signedTemplate)
    .digest('hex')

  // Comparación segura contra timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(calculatedHash, 'hex'),
      Buffer.from(receivedHash, 'hex')
    )
  } catch {
    // Si los buffers tienen distinto largo (hash inválido), retornar false
    return false
  }
}

// ─── Status mapping ───────────────────────────────────────────────────────────

/**
 * Mapea el status de Mercado Pago a nuestro PaymentStatus canónico.
 *
 * Referencia de estados MP:
 *   https://www.mercadopago.com.ar/developers/es/reference/payments/_payments_id/get
 *
 *   approved       → Pago aprobado (acreditar)
 *   authorized     → Autorizado pero no capturado (tarjetas con captura diferida)
 *   in_process     → En proceso de revisión (antifraude u otros)
 *   in_mediation   → En disputa iniciada por el pagador
 *   pending        → Pendiente (pago en efectivo, transferencia, etc.)
 *   rejected       → Rechazado por MP, banco o pagador
 *   cancelled      → Cancelado por expiración o por el vendedor
 *   refunded       → Reembolsado total
 *   charged_back   → Contracargo (chargeback)
 */
export function mapMPStatus(
  mpStatus: string
): 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded' {
  const map: Record<string, 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded'> = {
    approved: 'paid',
    authorized: 'processing',
    in_process: 'processing',
    in_mediation: 'processing',
    pending: 'processing',
    rejected: 'failed',
    cancelled: 'cancelled',
    refunded: 'refunded',
    charged_back: 'refunded',
  }
  return map[mpStatus] ?? 'processing'
}
