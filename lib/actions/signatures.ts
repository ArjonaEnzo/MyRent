'use server'

import { getCurrentUserWithAccount, requireRole } from '@/lib/supabase/auth'
import { createSignatureRequest } from '@/lib/signatures/hellosign-client'
import { logger, logError } from '@/lib/utils/logger'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { revalidatePath } from 'next/cache'
import { validateId } from '@/lib/validations/common'

/**
 * Envía un recibo para firma digital.
 * El propietario firma primero (order 0), luego el inquilino (order 1).
 *
 * Requires: HELLOSIGN_API_KEY and HELLOSIGN_CLIENT_ID env vars.
 */
export async function sendReceiptForSignature(receiptId: string) {
  try {
    const validId = validateId(receiptId)
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    // 1. Obtener datos del recibo con email del inquilino live
    const { data: receipt, error } = await supabase
      .from('receipts')
      .select('*, tenants(full_name, email)')
      .eq('id', validId)
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .single()

    if (error || !receipt) {
      return { success: false, error: 'Recibo no encontrado' }
    }

    const tenant = receipt.tenants as unknown as { full_name: string; email: string | null } | null

    if (!tenant?.email) {
      return { success: false, error: 'El inquilino debe tener un email para enviar a firma' }
    }

    // 2. Verificar que no esté ya en proceso de firma
    if (receipt.signature_request_id) {
      return { success: false, error: 'Este recibo ya fue enviado para firma' }
    }

    if (!receipt.pdf_url) {
      return { success: false, error: 'El recibo no tiene PDF generado' }
    }

    // 3. Crear solicitud en HelloSign
    const signatureRequest = await createSignatureRequest({
      receiptId: receipt.id,
      pdfUrl: receipt.pdf_url,
      landlordEmail: user.email || '',
      landlordName: 'Propietario',
      tenantEmail: tenant.email,
      tenantName: receipt.snapshot_tenant_name,
      subject: `Recibo de Alquiler - ${receipt.period}`,
      message: `Por favor, firme este recibo de alquiler correspondiente al período ${receipt.period}.`,
    })

    // 4. Actualizar recibo con ID de solicitud y estado
    await supabase
      .from('receipts')
      .update({
        signature_request_id: signatureRequest.signatureRequestId,
        signature_status: 'pending',
      })
      .eq('id', validId)

    // 5. Registrar evento inicial en audit trail
    await supabase.from('signature_events').insert({
      account_id: accountId,
      receipt_id: validId,
      event_type: 'created',
      signer_email: user.email ?? null,
      signer_role: 'landlord',
      event_data: {
        signature_request_id: signatureRequest.signatureRequestId,
        details_url: signatureRequest.detailsUrl,
      },
    })

    logger.info('Signature request created', {
      receiptId: validId,
      signatureRequestId: signatureRequest.signatureRequestId,
    })

    revalidatePath('/receipts')
    revalidatePath(`/receipts/${validId}`)

    return {
      success: true,
      signingUrl: signatureRequest.signingUrl,
      signatureRequestId: signatureRequest.signatureRequestId,
    }
  } catch (error) {
    if (isRedirectError(error)) throw error
    logError(error, { action: 'sendReceiptForSignature' })
    return {
      success: false,
      error: 'Error al crear la solicitud de firma. Verifica que HelloSign esté configurado correctamente.',
    }
  }
}

/**
 * Obtiene el historial de eventos de firma de un recibo.
 */
export async function getSignatureEvents(receiptId: string) {
  try {
    const validId = validateId(receiptId)
    const { accountId, supabase } = await getCurrentUserWithAccount()

    const { data, error } = await supabase
      .from('signature_events')
      .select('*')
      .eq('receipt_id', validId)
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch signature events', { error: error.message })
      return []
    }

    return data
  } catch (error) {
    logError(error, { action: 'getSignatureEvents' })
    return []
  }
}
