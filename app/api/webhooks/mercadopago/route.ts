import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import {
  verifyWebhookSignature,
  getPaymentDetails,
  mapMPStatus,
} from '@/lib/payments/mercadopago-client'
import { processProviderPaymentEvent } from '@/lib/actions/payments'

/**
 * Webhook de Mercado Pago — POST /api/webhooks/mercadopago
 *
 * Documentación oficial:
 *   https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 *
 * ─── Flujo de verificación ──────────────────────────────────────────────────
 *
 * MP envía cada notificación con dos headers de seguridad:
 *   x-signature  → "ts=TIMESTAMP,v1=HMAC-SHA256"
 *   x-request-id → ID único del request
 *
 * El template a firmar es exactamente:
 *   "id:{data.id};request-id:{x-request-id};ts:{ts};"
 *
 * donde {data.id} viene del query param o del body.
 *
 * ─── Flujo de procesamiento ─────────────────────────────────────────────────
 *
 * 1. Verificar firma HMAC-SHA256
 * 2. Ignorar eventos que no sean de tipo "payment" (no son de nuestro interés)
 * 3. Obtener el MP payment ID de body.data.id
 * 4. GET /v1/payments/:id → detalles completos del pago
 * 5. Usar external_reference (= nuestro payments.id) para reconciliar
 * 6. Buscar nuestro pago por external_reference
 * 7. Llamar a processProviderPaymentEvent() → actualiza payment + receipt (idempotente)
 * 8. Responder 200 "OK" (MP requiere exactamente este texto o un 200/201)
 *
 * ─── Idempotencia ────────────────────────────────────────────────────────────
 *
 * MP puede reenviar el mismo webhook si no recibe una respuesta 200 en 22 segundos.
 * La idempotencia está garantizada por UNIQUE(provider, provider_event_id) en payment_events.
 *
 * ─── Configuración requerida ────────────────────────────────────────────────
 *
 * En el panel de MP (Tus integraciones → Webhooks):
 *   URL: https://tu-dominio.com/api/webhooks/mercadopago
 *   Eventos a suscribir: Pagos (payment)
 *
 * Variables de entorno:
 *   MERCADOPAGO_ACCESS_TOKEN   → credencial de la API
 *   MERCADOPAGO_WEBHOOK_SECRET → clave secreta del webhook (generada por MP)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Leer headers de firma ────────────────────────────────────────────────
  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')

  // ── 2. Leer body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    logger.error('MP webhook: body no es JSON válido')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // El data.id puede venir del body O del query param (según configuración de MP)
  const dataId =
    (body?.data as Record<string, unknown>)?.id?.toString() ??
    request.nextUrl.searchParams.get('data.id') ??
    ''

  const eventType = (body?.type as string) ?? ''
  const action = (body?.action as string) ?? ''

  logger.info('MP webhook recibido', { eventType, action, dataId })

  // ── 3. Verificar firma HMAC ─────────────────────────────────────────────────
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // En producción es obligatorio. Sin secret no podemos verificar autenticidad.
      logger.error('MP webhook: MERCADOPAGO_WEBHOOK_SECRET no configurado en producción — rechazando')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 401 })
    }
    // En desarrollo, permitir sin verificación (MP no puede firmar requests locales).
    logger.warn('MP webhook: MERCADOPAGO_WEBHOOK_SECRET no configurado — saltando verificación (solo desarrollo)')
  } else if (!xSignature || !xRequestId) {
    logger.error('MP webhook: headers x-signature o x-request-id ausentes')
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 })
  } else {
    const isValid = verifyWebhookSignature({
      xSignature,
      xRequestId,
      dataId,
      secret,
    })

    if (!isValid) {
      logger.error('MP webhook: firma HMAC inválida', { xRequestId })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  // ── 4. Solo procesar eventos de tipo "payment" ──────────────────────────────
  // Otros tipos: merchant_order, plan, subscription, etc. → ignorar con 200
  if (eventType !== 'payment') {
    logger.info('MP webhook: evento ignorado (no es payment)', { eventType, action })
    return new NextResponse('OK', { status: 200 })
  }

  if (!dataId) {
    logger.error('MP webhook: data.id ausente en evento payment')
    return NextResponse.json({ error: 'Missing data.id' }, { status: 400 })
  }

  // ── 5. Obtener detalles del pago desde la API de MP ─────────────────────────
  // El webhook solo trae el ID del pago. La doc oficial dice que siempre
  // hay que hacer un GET /v1/payments/:id para obtener el estado actual.
  let mpPayment
  try {
    mpPayment = await getPaymentDetails(dataId)
  } catch (err) {
    logger.error('MP webhook: error al obtener detalles del pago', {
      mpPaymentId: dataId,
      error: err instanceof Error ? err.message : String(err),
    })
    // Devolver 500 para que MP reintente con backoff exponencial
    return NextResponse.json(
      { error: 'Failed to fetch payment details' },
      { status: 500, headers: { 'Retry-After': '60' } }
    )
  }

  logger.info('MP pago obtenido', {
    mpPaymentId: mpPayment.id,
    status: mpPayment.status,
    externalReference: mpPayment.external_reference,
  })

  // ── 6. Reconciliar con nuestro registro usando external_reference ────────────
  // external_reference = nuestro payments.id (UUID) — configurado al crear la preferencia
  const externalRef = mpPayment.external_reference

  if (!externalRef) {
    logger.warn('MP webhook: pago sin external_reference — probablemente no es de esta app', {
      mpPaymentId: mpPayment.id,
    })
    // Responder 200 para que MP no reintente (no es un error nuestro)
    return new NextResponse('OK', { status: 200 })
  }

  const adminSupabase = createAdminClient()

  const { data: ourPayment, error: lookupError } = await adminSupabase
    .from('payments')
    .select('id, account_id, receipt_id, status')
    .eq('id', externalRef)           // external_reference == payments.id
    .eq('provider', 'mercadopago')
    .maybeSingle()

  if (lookupError || !ourPayment) {
    logger.error('MP webhook: no se encontró el pago por external_reference', {
      externalRef,
      mpPaymentId: mpPayment.id,
      error: lookupError?.message,
    })
    // 200 para que MP no reintente — puede ser un pago de otro entorno (sandbox vs prod)
    return new NextResponse('OK', { status: 200 })
  }

  // ── 7. Procesar el evento de forma idempotente ──────────────────────────────
  const canonicalStatus = mapMPStatus(mpPayment.status)

  const result = await processProviderPaymentEvent({
    payment_id: ourPayment.id,
    account_id: ourPayment.account_id,
    provider: 'mercadopago',
    // Usamos el MP payment ID como event ID para la idempotencia.
    // El mismo pago puede llegar varias veces (payment.created, payment.updated).
    // Para distinguirlos usamos "mpId:action" — así un approved no ignora un created.
    provider_event_id: `${mpPayment.id}:${action}`,
    event_type: action,                    // ej. "payment.created", "payment.updated"
    provider_payment_id: mpPayment.id.toString(),
    provider_status: mpPayment.status,     // ej. "approved", "rejected"
    event_data: mpPayment as unknown as Record<string, unknown>,
  })

  if (!result.success) {
    logger.error('MP webhook: error al procesar evento', {
      error: result.error,
      paymentId: ourPayment.id,
      mpPaymentId: mpPayment.id,
    })
    // 500 → MP reintentará con backoff exponencial
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500, headers: { 'Retry-After': '60' } }
    )
  }

  if (result.duplicate) {
    logger.info('MP webhook: evento duplicado ignorado', { mpPaymentId: mpPayment.id, action })
  } else {
    logger.info('MP webhook procesado exitosamente', {
      paymentId: ourPayment.id,
      mpPaymentId: mpPayment.id,
      canonicalStatus,
      action,
    })
  }

  // ── 8. Respuesta requerida por MP ───────────────────────────────────────────
  // La doc oficial dice que el endpoint debe responder exactamente "OK"
  // con status 200 o 201 para confirmar la recepción.
  return new NextResponse('OK', { status: 200 })
}

/**
 * Mercado Pago puede enviar un GET al endpoint para validar que existe.
 * Respondemos 200 para confirmar.
 */
export async function GET(): Promise<NextResponse> {
  return new NextResponse('OK', { status: 200 })
}
