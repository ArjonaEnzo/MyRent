import { env } from '@/lib/env'

/**
 * Cliente para HelloSign (Dropbox Sign)
 * Docs: https://developers.hellosign.com/
 */

export interface SignatureRequest {
  signatureRequestId: string
  signingUrl: string
  detailsUrl: string
}

export interface CreateSignatureRequestParams {
  receiptId: string
  pdfUrl: string
  landlordEmail: string
  landlordName: string
  tenantEmail: string
  tenantName: string
  subject: string
  message: string
}

/**
 * Crea una solicitud de firma en HelloSign
 * Requiere que ambos (landlord y tenant) firmen en orden
 */
export async function createSignatureRequest(
  params: CreateSignatureRequestParams
): Promise<SignatureRequest> {
  const {
    receiptId,
    pdfUrl,
    landlordEmail,
    landlordName,
    tenantEmail,
    tenantName,
    subject,
    message,
  } = params

  const formData = new FormData()

  // Configuración básica
  formData.append('test_mode', process.env.NODE_ENV !== 'production' ? '1' : '0')
  formData.append('title', subject)
  formData.append('subject', subject)
  formData.append('message', message)

  // PDF del recibo (HelloSign lo descargará desde esta URL)
  formData.append('file_url[0]', pdfUrl)

  // Firmante 1: Propietario (firma primero)
  formData.append('signers[0][email_address]', landlordEmail)
  formData.append('signers[0][name]', landlordName)
  formData.append('signers[0][order]', '0') // Firma primero

  // Firmante 2: Inquilino (firma después)
  formData.append('signers[1][email_address]', tenantEmail)
  formData.append('signers[1][name]', tenantName)
  formData.append('signers[1][order]', '1') // Firma segundo

  // Metadata personalizada (para identificar el recibo en webhooks)
  formData.append('metadata[receipt_id]', receiptId)
  formData.append('metadata[app]', 'myrent')

  // Cliente recibe copia final
  formData.append('client_id', env.HELLOSIGN_CLIENT_ID || '')

  const response = await fetch('https://api.hellosign.com/v3/signature_request/send', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(env.HELLOSIGN_API_KEY + ':').toString('base64')}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`HelloSign API error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()

  return {
    signatureRequestId: data.signature_request.signature_request_id,
    signingUrl: data.signature_request.signing_url,
    detailsUrl: data.signature_request.details_url,
  }
}

/**
 * Obtiene el estado actual de una solicitud de firma
 */
export async function getSignatureRequest(signatureRequestId: string) {
  const response = await fetch(
    `https://api.hellosign.com/v3/signature_request/${signatureRequestId}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(env.HELLOSIGN_API_KEY + ':').toString('base64')}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to get signature request')
  }

  return response.json()
}

/**
 * Descarga el PDF final firmado
 */
export async function downloadSignedDocument(signatureRequestId: string): Promise<Buffer> {
  const response = await fetch(
    `https://api.hellosign.com/v3/signature_request/files/${signatureRequestId}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(env.HELLOSIGN_API_KEY + ':').toString('base64')}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to download signed document')
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Cancela una solicitud de firma
 */
export async function cancelSignatureRequest(signatureRequestId: string) {
  const response = await fetch(
    `https://api.hellosign.com/v3/signature_request/cancel/${signatureRequestId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(env.HELLOSIGN_API_KEY + ':').toString('base64')}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to cancel signature request')
  }

  return response.json()
}
