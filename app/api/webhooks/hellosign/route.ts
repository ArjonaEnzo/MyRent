import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { downloadSignedDocument } from '@/lib/signatures/hellosign-client'
import { logger } from '@/lib/utils/logger'
import crypto from 'crypto'

/**
 * Verifica la firma HMAC del evento HelloSign.
 *
 * HelloSign calcula: HMAC-SHA256(api_key, event_time + event_type)
 * Documentación: https://developers.hellosign.com/api/reference/operation/eventCallbackHelper/
 *
 * IMPORTANTE: La verificación es OBLIGATORIA. Si falta el hash, se rechaza.
 */
function verifyHelloSignSignature(
  apiKey: string,
  eventTime: string,
  eventType: string,
  receivedHash: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', apiKey)
    .update(eventTime + eventType)
    .digest('hex')

  // Comparación segura para evitar timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(receivedHash, 'hex'),
    )
  } catch {
    return false
  }
}

/**
 * Webhook de HelloSign / Dropbox Sign
 * Recibe eventos cuando un documento es firmado
 *
 * Eventos procesados:
 * - signature_request_viewed: Alguien vio el documento
 * - signature_request_signed: Alguien firmó
 * - signature_request_all_signed: Todos firmaron (documento completo)
 * - signature_request_declined: Alguien rechazó
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const apiKey = process.env.HELLOSIGN_API_KEY
    const eventHash = body.event?.event_hash as string | undefined
    const eventTime = body.event?.event_time as string | undefined
    const eventType = body.event?.event_type as string | undefined

    // 1. Verificación HMAC — OBLIGATORIA, no opcional
    if (!apiKey) {
      logger.error('HelloSign webhook: HELLOSIGN_API_KEY not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    if (!eventHash || !eventTime || !eventType) {
      logger.error('HelloSign webhook: Missing event fields', { eventHash: !!eventHash, eventTime: !!eventTime, eventType: !!eventType })
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    if (!verifyHelloSignSignature(apiKey, eventTime, eventType, eventHash)) {
      logger.error('HelloSign webhook: Invalid HMAC signature', { eventType })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 2. Extraer datos del payload
    const signatureRequest = body.signature_request
    const metadata = signatureRequest?.metadata || {}
    const receiptId = metadata.receipt_id as string | undefined

    if (!receiptId) {
      logger.error('HelloSign webhook: No receipt_id in metadata', { eventType })
      return NextResponse.json({ error: 'No receipt_id' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 3. Obtener account_id del recibo (necesario para audit trail)
    const { data: receipt } = await supabase
      .from('receipts')
      .select('account_id')
      .eq('id', receiptId)
      .single()

    if (!receipt) {
      logger.error('HelloSign webhook: Receipt not found', { receiptId, eventType })
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    const accountId = receipt.account_id

    // 4. Procesar según tipo de evento
    switch (eventType) {
      case 'signature_request_sent':
        logger.info('Signature request sent', { receiptId })
        break

      case 'signature_request_viewed':
        await handleViewed(supabase, receiptId, accountId, signatureRequest)
        break

      case 'signature_request_signed':
        await handleSigned(supabase, receiptId, accountId, signatureRequest)
        break

      case 'signature_request_all_signed':
        await handleAllSigned(supabase, receiptId, accountId, signatureRequest)
        break

      case 'signature_request_declined':
        await handleDeclined(supabase, receiptId, accountId, signatureRequest)
        break

      default:
        logger.info('Unhandled HelloSign event', { eventType, receiptId })
    }

    // HelloSign espera exactamente este texto en la respuesta
    return NextResponse.json({ message: 'Hello API Event Received' })
  } catch (error) {
    logger.error('HelloSign webhook error', { error })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function handleViewed(
  supabase: ReturnType<typeof createAdminClient>,
  receiptId: string,
  accountId: string,
  signatureRequest: any,
) {
  const { signatures } = signatureRequest

  for (const signature of signatures) {
    if (signature.status_code === 'viewed') {
      await supabase.from('signature_events').insert({
        account_id: accountId,
        receipt_id: receiptId,
        event_type: 'viewed',
        signer_email: signature.signer_email_address,
        signer_role: signature.order === 0 ? 'landlord' : 'tenant',
        event_data: { signature_id: signature.signature_id },
      })
    }
  }

  logger.info('Document viewed', { receiptId })
}

async function handleSigned(
  supabase: ReturnType<typeof createAdminClient>,
  receiptId: string,
  accountId: string,
  signatureRequest: any,
) {
  const { signatures } = signatureRequest

  const landlordSignature = signatures.find((s: any) => s.order === 0)
  const tenantSignature = signatures.find((s: any) => s.order === 1)

  let newStatus: string = 'pending'
  const updatePayload: Record<string, string | null> = { signature_status: newStatus }

  if (landlordSignature?.status_code === 'signed') {
    newStatus = 'landlord_signed'
    updatePayload.signature_status = newStatus
    updatePayload.landlord_signed_at = new Date().toISOString()
  }

  if (tenantSignature?.status_code === 'signed') {
    updatePayload.tenant_signed_at = new Date().toISOString()
  }

  await supabase.from('receipts').update(updatePayload).eq('id', receiptId)

  // Log one event per signature that is marked 'signed' in this callback
  const signedSigners = signatures.filter((s: any) => s.status_code === 'signed')
  for (const signer of signedSigners) {
    await supabase.from('signature_events').insert({
      account_id: accountId,
      receipt_id: receiptId,
      event_type: 'signed',
      signer_email: signer.signer_email_address,
      signer_role: signer.order === 0 ? 'landlord' : 'tenant',
      event_data: { signature_id: signer.signature_id },
    })
  }

  logger.info('Document signed', { receiptId, status: newStatus })
}

async function handleAllSigned(
  supabase: ReturnType<typeof createAdminClient>,
  receiptId: string,
  accountId: string,
  signatureRequest: any,
) {
  const signatureRequestId = signatureRequest.signature_request_id

  const signedPdfBuffer = await downloadSignedDocument(signatureRequestId)

  const signedFileName = `${accountId}/${receiptId}_signed.pdf`
  await supabase.storage
    .from('receipts')
    .upload(signedFileName, signedPdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  const { data: urlData } = await supabase.storage
    .from('receipts')
    .createSignedUrl(signedFileName, 60 * 60 * 24 * 365)

  await supabase
    .from('receipts')
    .update({
      signature_status: 'fully_signed',
      tenant_signed_at: new Date().toISOString(),
      storage_path: signedFileName,
      pdf_url: urlData?.signedUrl ?? null,
    })
    .eq('id', receiptId)

  await supabase.from('signature_events').insert({
    account_id: accountId,
    receipt_id: receiptId,
    event_type: 'completed',
    signer_email: 'system',
    signer_role: 'system',
    event_data: {
      signature_request_id: signatureRequestId,
      signed_document_url: urlData?.signedUrl,
    },
  })

  logger.info('All signatures complete', { receiptId })
}

async function handleDeclined(
  supabase: ReturnType<typeof createAdminClient>,
  receiptId: string,
  accountId: string,
  signatureRequest: any,
) {
  await supabase
    .from('receipts')
    .update({ signature_status: 'declined' })
    .eq('id', receiptId)

  await supabase.from('signature_events').insert({
    account_id: accountId,
    receipt_id: receiptId,
    event_type: 'declined',
    signer_email: null,
    signer_role: null,
    event_data: { signature_request_id: signatureRequest.signature_request_id },
  })

  logger.info('Signature declined', { receiptId })
}
