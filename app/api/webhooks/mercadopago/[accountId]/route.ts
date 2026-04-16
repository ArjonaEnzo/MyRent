import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import {
  verifyWebhookSignature,
  getPaymentDetails,
  mapMPStatus,
} from '@/lib/payments/mercadopago-client'
import { processProviderPaymentEvent } from '@/lib/actions/payments'
import { getMPAccessTokenForAccount } from '@/lib/payments/mp-token-manager'
import { uuidSchema } from '@/lib/validations/common'

/**
 * Per-account webhook de Mercado Pago — POST /api/webhooks/mercadopago/[accountId]
 *
 * Identical to the global webhook handler, but scoped to a specific account.
 * The accountId in the URL is used to look up the per-account MP OAuth token
 * for fetching payment details from the MP API.
 *
 * This route is registered as the notification_url when the preference is created
 * with a per-account token (see createCheckoutPreference with accountId).
 *
 * The webhook signature is verified with the global MERCADOPAGO_WEBHOOK_SECRET
 * because MP signs all webhooks with the app-level secret, not per-account.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
): Promise<NextResponse> {
  const { accountId } = await params

  // ── 0. Validate accountId format ────────────────────────────────────────────
  const parseResult = uuidSchema.safeParse(accountId)
  if (!parseResult.success) {
    logger.error('MP webhook per-account: accountId no es un UUID válido', { accountId })
    return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 })
  }

  // ── 1. Leer headers de firma ────────────────────────────────────────────────
  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')

  // ── 2. Leer body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    logger.error('MP webhook per-account: body no es JSON válido', { accountId })
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const dataId =
    (body?.data as Record<string, unknown>)?.id?.toString() ??
    request.nextUrl.searchParams.get('data.id') ??
    ''

  const eventType = (body?.type as string) ?? ''
  const action = (body?.action as string) ?? ''

  logger.info('MP webhook per-account recibido', { accountId, eventType, action, dataId })

  // ── 3. Verificar firma HMAC (global secret — MP signs with app-level secret) ─
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('MP webhook per-account: MERCADOPAGO_WEBHOOK_SECRET no configurado en producción — rechazando', { accountId })
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 401 })
    }
    logger.warn('MP webhook per-account: MERCADOPAGO_WEBHOOK_SECRET no configurado — saltando verificación (solo desarrollo)', { accountId })
  } else if (!xSignature || !xRequestId) {
    logger.error('MP webhook per-account: headers x-signature o x-request-id ausentes', { accountId })
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 })
  } else {
    const isValid = verifyWebhookSignature({
      xSignature,
      xRequestId,
      dataId,
      secret,
    })

    if (!isValid) {
      logger.error('MP webhook per-account: firma HMAC inválida', { accountId, xRequestId })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  // ── 4. Solo procesar eventos de tipo "payment" ──────────────────────────────
  if (eventType !== 'payment') {
    logger.info('MP webhook per-account: evento ignorado (no es payment)', { accountId, eventType, action })
    return new NextResponse('OK', { status: 200 })
  }

  if (!dataId) {
    logger.error('MP webhook per-account: data.id ausente en evento payment', { accountId })
    return NextResponse.json({ error: 'Missing data.id' }, { status: 400 })
  }

  // ── 5. Lookup per-account MP token for API calls ────────────────────────────
  const mpToken = await getMPAccessTokenForAccount(accountId)

  // ── 6. Obtener detalles del pago desde la API de MP ─────────────────────────
  let mpPayment
  try {
    mpPayment = await getPaymentDetails(dataId, mpToken?.accessToken)
  } catch (err) {
    logger.error('MP webhook per-account: error al obtener detalles del pago', {
      accountId,
      mpPaymentId: dataId,
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: 'Failed to fetch payment details' },
      { status: 500, headers: { 'Retry-After': '60' } }
    )
  }

  logger.info('MP pago obtenido (per-account)', {
    accountId,
    mpPaymentId: mpPayment.id,
    status: mpPayment.status,
    externalReference: mpPayment.external_reference,
  })

  // ── 7. Reconciliar con nuestro registro usando external_reference ────────────
  const externalRef = mpPayment.external_reference

  if (!externalRef) {
    logger.warn('MP webhook per-account: pago sin external_reference', {
      accountId,
      mpPaymentId: mpPayment.id,
    })
    return new NextResponse('OK', { status: 200 })
  }

  const adminSupabase = createAdminClient()

  const { data: ourPayment, error: lookupError } = await adminSupabase
    .from('payments')
    .select('id, account_id, receipt_id, status')
    .eq('id', externalRef)
    .eq('provider', 'mercadopago')
    .maybeSingle()

  if (lookupError || !ourPayment) {
    logger.error('MP webhook per-account: no se encontró el pago por external_reference', {
      accountId,
      externalRef,
      mpPaymentId: mpPayment.id,
      error: lookupError?.message,
    })
    return new NextResponse('OK', { status: 200 })
  }

  // Verify the payment belongs to the account in the URL
  if (ourPayment.account_id !== accountId) {
    logger.error('MP webhook per-account: account_id mismatch', {
      urlAccountId: accountId,
      paymentAccountId: ourPayment.account_id,
      mpPaymentId: mpPayment.id,
    })
    return new NextResponse('OK', { status: 200 })
  }

  // ── 8. Procesar el evento de forma idempotente ──────────────────────────────
  const canonicalStatus = mapMPStatus(mpPayment.status)

  const result = await processProviderPaymentEvent({
    payment_id: ourPayment.id,
    account_id: ourPayment.account_id,
    provider: 'mercadopago',
    provider_event_id: `${mpPayment.id}:${action}`,
    event_type: action,
    provider_payment_id: mpPayment.id.toString(),
    provider_status: mpPayment.status,
    event_data: mpPayment as unknown as Record<string, unknown>,
  })

  if (!result.success) {
    logger.error('MP webhook per-account: error al procesar evento', {
      accountId,
      error: result.error,
      paymentId: ourPayment.id,
      mpPaymentId: mpPayment.id,
    })
    return NextResponse.json(
      { error: 'Processing failed' },
      { status: 500, headers: { 'Retry-After': '60' } }
    )
  }

  if (result.duplicate) {
    logger.info('MP webhook per-account: evento duplicado ignorado', { accountId, mpPaymentId: mpPayment.id, action })
  } else {
    logger.info('MP webhook per-account procesado exitosamente', {
      accountId,
      paymentId: ourPayment.id,
      mpPaymentId: mpPayment.id,
      canonicalStatus,
      action,
    })

    revalidatePath('/tenant/dashboard')
    revalidatePath('/receipts')
    revalidatePath(`/receipts/${ourPayment.receipt_id}`)
    revalidatePath('/dashboard')
  }

  // ── 9. Respuesta requerida por MP ───────────────────────────────────────────
  return new NextResponse('OK', { status: 200 })
}

/**
 * Mercado Pago puede enviar un GET al endpoint para validar que existe.
 */
export async function GET(): Promise<NextResponse> {
  return new NextResponse('OK', { status: 200 })
}
