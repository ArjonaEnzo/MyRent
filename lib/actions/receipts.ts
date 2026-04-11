'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserWithAccount, requireRole } from '@/lib/supabase/auth'
import { receiptSchema, type ReceiptInput } from '@/lib/validations/receipt'
import type { Database } from '@/types/database.types'

type Receipt = Database['public']['Tables']['receipts']['Row']
type ReceiptWithTenant = Receipt & { tenants: { full_name: string; email: string | null } | null }
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { logger, logError } from '@/lib/utils/logger'
import { z } from 'zod'
import { renderToBuffer } from '@react-pdf/renderer'
import { ReceiptPDF } from '@/lib/pdf/receipt-template'
import { sendReceiptEmail } from '@/lib/email/receipt-email'
import React from 'react'
import { receiptRateLimit } from '@/lib/utils/rate-limit'
import { validateId } from '@/lib/validations/common'
import { withRetry } from '@/lib/utils/retry'

export async function createReceipt(formData: ReceiptInput) {
  try {
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    await receiptRateLimit.limit(user.id)

    const validated = receiptSchema.parse(formData)
    const adminSupabase = createAdminClient()

    // 1. Crear el recibo via RPC issue_receipt — atómico, idempotente,
    //    snapshot completo (incluye dni_cuit), audit log incluido.
    //    Si ya existe un recibo para (lease_id, period), la RPC lo devuelve.
    const { data: rpcReceipt, error: rpcError } = await supabase.rpc('issue_receipt', {
      p_actor_user_id: user.id,
      p_account_id: accountId,
      p_lease_id: validated.lease_id,
      p_period: validated.period,
      p_description: validated.description || undefined,
    })

    if (rpcError || !rpcReceipt) {
      logger.error('issue_receipt RPC failed', { error: rpcError?.message })
      return { success: false, error: 'Error al crear el recibo' }
    }

    const receipt = rpcReceipt as Receipt
    const receiptId = receipt.id

    // 2. Generar PDF a partir del snapshot ya guardado en DB.
    const now = new Date()
    const dateStr = now.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const pdfElement = React.createElement(ReceiptPDF, {
      recipientName: receipt.snapshot_tenant_name,
      recipientAddress: receipt.snapshot_property_address,
      amount: receipt.snapshot_amount,
      currency: receipt.snapshot_currency,
      period: receipt.period,
      date: dateStr,
      receiptId,
      description: receipt.description ?? null,
    })
    const pdfBuffer = await renderToBuffer(pdfElement as any)

    // 3. Subir PDF a Supabase Storage (con retry por transient errors).
    //    upsert: true porque la RPC es idempotente — re-llamadas regeneran el PDF.
    const fileName = `${accountId}/${receiptId}.pdf`
    let uploadError: Error | null = null
    try {
      await withRetry(async () => {
        const result = await adminSupabase.storage
          .from('receipts')
          .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true })
        if (result.error) throw result.error
      }, { maxRetries: 2, initialDelayMs: 500 })
    } catch (err) {
      uploadError = err instanceof Error ? err : new Error(String(err))
    }

    if (uploadError) {
      logger.error('Failed to upload PDF', { error: uploadError.message })
      // No borramos el recibo: queda en draft, se puede reintentar.
      return { success: false, error: 'Error al subir el PDF' }
    }

    // 4. Signed URL (1 año — H3 pendiente: pasar a on-demand).
    const { data: signedUrlData } = await adminSupabase.storage
      .from('receipts')
      .createSignedUrl(fileName, 60 * 60 * 24 * 365)

    const pdfUrl = signedUrlData?.signedUrl ?? null

    // 5. Promover de draft → generated y guardar pdf info.
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        status: 'generated',
        storage_path: fileName,
        pdf_url: pdfUrl,
        email_sent: false,
      })
      .eq('id', receiptId)
      .eq('account_id', accountId)

    if (updateError) {
      logger.error('Failed to update receipt with PDF info', { error: updateError.message })
      return { success: false, error: 'Error al guardar el recibo' }
    }

    // 6. Enviar email si el inquilino tiene email registrado.
    const { data: tenantContact } = await supabase
      .from('tenants')
      .select('email')
      .eq('id', receipt.tenant_id)
      .single()

    if (tenantContact?.email && pdfUrl) {
      try {
        await withRetry(
          () => sendReceiptEmail({
            to: tenantContact.email!,
            recipientName: receipt.snapshot_tenant_name,
            period: receipt.period,
            amount: receipt.snapshot_amount,
            currency: receipt.snapshot_currency,
            pdfUrl,
            userId: user.id,
            description: receipt.description ?? null,
          }),
          { maxRetries: 2, initialDelayMs: 1000 }
        )

        await supabase
          .from('receipts')
          .update({ email_sent: true })
          .eq('id', receiptId)

        logger.info('Receipt email sent', { receiptId, to: tenantContact.email })
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
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

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
    const safeSearch = options.search.replace(/[,()\\.]/g, ' ').trim()
    if (safeSearch) {
      query = query.or(`snapshot_tenant_name.ilike.%${safeSearch}%,period.ilike.%${safeSearch}%`)
    }
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
