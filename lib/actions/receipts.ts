'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserWithAccount } from '@/lib/supabase/auth'
import { receiptSchema, type ReceiptInput } from '@/lib/validations/receipt'
import type { Database } from '@/types/database.types'

type Receipt = Database['public']['Tables']['receipts']['Row']
type ReceiptWithTenant = Receipt & { tenants: { full_name: string; email: string | null } | null }
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect'
import { logger, logError } from '@/lib/utils/logger'
import { z } from 'zod'
import { renderToBuffer } from '@react-pdf/renderer'
import { ReceiptPDF } from '@/lib/pdf/receipt-template'
import { sendReceiptEmail } from '@/lib/email/receipt-email'
import React from 'react'
import { receiptRateLimit } from '@/lib/utils/rate-limit'
import { validateId } from '@/lib/validations/common'
import { withRetry } from '@/lib/utils/retry'
import { getLease } from '@/lib/actions/leases'

export async function createReceipt(formData: ReceiptInput) {
  try {
    const { user, accountId, supabase } = await getCurrentUserWithAccount()

    await receiptRateLimit.limit(user.id)

    const validated = receiptSchema.parse(formData)
    const adminSupabase = createAdminClient()

    // Obtener datos del contrato (incluye tenant, property, monto)
    const lease = await getLease(validated.lease_id)

    if (!lease) {
      return { success: false, error: 'Contrato no encontrado' }
    }

    // Obtener el DNI/CUIT del inquilino para el snapshot
    const { data: tenantData } = lease.tenant_id
      ? await supabase
          .from('tenants')
          .select('dni_cuit')
          .eq('id', lease.tenant_id)
          .single()
      : { data: null }

    const receiptId = crypto.randomUUID()
    const now = new Date()
    const dateStr = now.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Generar PDF
    const pdfElement = React.createElement(ReceiptPDF, {
      recipientName: lease.tenant_name ?? '',
      recipientAddress: lease.property_address ?? '',
      amount: lease.rent_amount ?? 0,
      currency: lease.currency ?? 'ARS',
      period: validated.period,
      date: dateStr,
      receiptId,
      description: validated.description || null,
    })
    const pdfBuffer = await renderToBuffer(pdfElement as any)

    // Subir PDF a Supabase Storage (con retry por transient errors)
    const fileName = `${accountId}/${receiptId}.pdf`
    let uploadError: Error | null = null
    try {
      await withRetry(async () => {
        const result = await adminSupabase.storage
          .from('receipts')
          .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: false })
        if (result.error) throw result.error
      }, { maxRetries: 2, initialDelayMs: 500 })
    } catch (err) {
      uploadError = err instanceof Error ? err : new Error(String(err))
    }

    if (uploadError) {
      logger.error('Failed to upload PDF', { error: uploadError.message })
      return { success: false, error: 'Error al subir el PDF' }
    }

    // Obtener URL firmada (válida por 1 año)
    const { data: signedUrlData } = await adminSupabase.storage
      .from('receipts')
      .createSignedUrl(fileName, 60 * 60 * 24 * 365)

    const pdfUrl = signedUrlData?.signedUrl ?? null

    // Guardar recibo en DB
    const { error: insertError } = await supabase.from('receipts').insert({
      id: receiptId,
      account_id: accountId,
      lease_id: validated.lease_id,
      property_id: lease.property_id!,
      tenant_id: lease.tenant_id!,
      period: validated.period,
      status: 'generated',
      snapshot_tenant_name: lease.tenant_name ?? '',
      snapshot_tenant_dni_cuit: tenantData?.dni_cuit ?? null,
      snapshot_property_address: lease.property_address ?? '',
      snapshot_amount: lease.rent_amount ?? 0,
      snapshot_currency: lease.currency ?? 'ARS',
      storage_path: fileName,
      pdf_url: pdfUrl ?? null,
      email_sent: false,
      description: validated.description || null,
    })

    if (insertError) {
      logger.error('Failed to save receipt', { error: insertError.message })

      // Cleanup: eliminar PDF huérfano del Storage
      try {
        await adminSupabase.storage.from('receipts').remove([fileName])
        logger.info('Cleaned up orphaned PDF', { fileName })
      } catch (cleanupError) {
        logger.error('Failed to cleanup orphaned PDF', {
          fileName,
          error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
        })
      }

      return { success: false, error: 'Error al guardar el recibo' }
    }

    // Enviar email si el inquilino tiene email y el PDF se generó correctamente
    if (lease.tenant_email && pdfUrl) {
      try {
        await withRetry(
          () => sendReceiptEmail({
            to: lease.tenant_email!,
            recipientName: lease.tenant_name ?? '',
            period: validated.period,
            amount: lease.rent_amount ?? 0,
            currency: lease.currency ?? 'ARS',
            pdfUrl,
            userId: user.id,
            description: validated.description || null,
          }),
          { maxRetries: 2, initialDelayMs: 1000 }
        )

        await supabase
          .from('receipts')
          .update({ email_sent: true })
          .eq('id', receiptId)

        logger.info('Receipt email sent', { receiptId, to: lease.tenant_email })
      } catch (emailError) {
        logger.error('Failed to send receipt email', {
          receiptId,
          error: emailError instanceof Error ? emailError.message : 'Unknown',
        })
        // No falla la operación, solo marca como no enviado
      }
    }

    logger.info('Receipt created', { receiptId, userId: user.id })
    revalidatePath('/receipts')
    redirect(`/receipts/${receiptId}`)
  } catch (error) {
    if (isRedirectError(error)) throw error

    logError(error, { action: 'createReceipt' })

    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos inválidos', errors: error.errors }
    }

    return { success: false, error: 'Error al generar el recibo' }
  }
}

export async function resendReceiptEmail(receiptId: string) {
  try {
    const validId = validateId(receiptId)

    const { user, accountId, supabase } = await getCurrentUserWithAccount()

    const { data: receipt, error } = await supabase
      .from('receipts')
      .select('*, tenants(email, full_name)')
      .eq('id', validId)
      .eq('account_id', accountId)
      .single()

    if (error || !receipt) {
      return { success: false, error: 'Recibo no encontrado' }
    }

    const tenant = receipt.tenants as unknown as { email: string | null; full_name: string } | null

    if (!tenant?.email) {
      return { success: false, error: 'El inquilino no tiene email registrado' }
    }

    await sendReceiptEmail({
      to: tenant.email,
      recipientName: receipt.snapshot_tenant_name,
      period: receipt.period,
      amount: receipt.snapshot_amount,
      currency: receipt.snapshot_currency,
      pdfUrl: receipt.pdf_url ?? '',
      userId: user.id,
    })

    await supabase
      .from('receipts')
      .update({ email_sent: true })
      .eq('id', validId)

    logger.info('Receipt email resent', { receiptId: validId })
    revalidatePath(`/receipts/${validId}`)
    return { success: true }
  } catch (error) {
    logError(error, { action: 'resendReceiptEmail' })
    return { success: false, error: 'Error al reenviar el email' }
  }
}

export async function getReceipts(options?: {
  page?: number
  limit?: number
  search?: string
}): Promise<{ receipts: ReceiptWithTenant[]; total: number }> {
  const { accountId, supabase } = await getCurrentUserWithAccount()

  const page = options?.page ?? 1
  const limit = options?.limit ?? 50
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('receipts')
    .select('*, tenants(full_name, email)', { count: 'exact' })
    .eq('account_id', accountId)
    .is('deleted_at', null)

  if (options?.search) {
    query = query.or(`snapshot_tenant_name.ilike.%${options.search}%,period.ilike.%${options.search}%`)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    logger.error('Failed to fetch receipts', { error: error.message })
    return { receipts: [], total: 0 }
  }

  return { receipts: data as unknown as ReceiptWithTenant[], total: count ?? 0 }
}

export async function getReceipt(id: string): Promise<ReceiptWithTenant | null> {
  const validId = validateId(id)

  const { accountId, supabase } = await getCurrentUserWithAccount()

  const { data, error } = await supabase
    .from('receipts')
    .select('*, tenants(full_name, email)')
    .eq('id', validId)
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .single()

  if (error) {
    return null
  }

  return data as unknown as ReceiptWithTenant
}
