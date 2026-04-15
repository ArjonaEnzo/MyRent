'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserWithAccount, requireRole } from '@/lib/supabase/auth'
import {
  receiptSchema,
  receiptLineItemSchema,
  updateLineItemSchema,
  type ReceiptInput,
  type ReceiptLineItemInput,
  type UpdateLineItemInput,
} from '@/lib/validations/receipt'
import type { Database } from '@/types/database.types'

type Receipt = Database['public']['Tables']['receipts']['Row']
type ReceiptLineItem = Database['public']['Tables']['receipt_line_items']['Row']
type ReceiptWithTenant = Receipt & { tenants: { full_name: string; email: string | null } | null }

/** Type-safe receipt query with tenant join */
function asReceiptWithTenant(data: unknown): ReceiptWithTenant {
  return data as ReceiptWithTenant
}

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
import { checkQuota } from '@/lib/subscriptions/plan-limits'

export async function createReceipt(formData: ReceiptInput) {
  try {
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    await receiptRateLimit.limit(user.id)

    const quota = await checkQuota(accountId, 'receipt')
    if (!quota.allowed) {
      return { success: false, error: quota.reason ?? 'Límite de plan alcanzado' }
    }

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
      return { success: false, error: 'El inquilino no tiene email registrado. Agregá uno en el perfil.' }
    }

    // Validar que el recibo tenga PDF generado. Si está en draft, no se puede reenviar.
    if (!receipt.pdf_url) {
      return {
        success: false,
        error: receipt.status === 'draft'
          ? 'Este recibo está en borrador. Finalizalo primero para enviar el email.'
          : 'El recibo no tiene PDF generado. Contactá soporte.',
      }
    }

    try {
      await sendReceiptEmail({
        to: tenant.email,
        recipientName: receipt.snapshot_tenant_name,
        period: receipt.period,
        amount: receipt.snapshot_amount,
        currency: receipt.snapshot_currency,
        pdfUrl: receipt.pdf_url,
        userId: user.id,
      })
    } catch (sendError) {
      logError(sendError, { action: 'resendReceiptEmail.send', receiptId: validId })
      const message = sendError instanceof Error ? sendError.message : String(sendError)

      // Devolver mensajes específicos según tipo de error
      if (message.includes('Límite excedido')) {
        return {
          success: false,
          error: 'Alcanzaste el límite de emails por hora. Esperá unos minutos y probá de nuevo.',
        }
      }
      if (message.includes('domain') || message.includes('not verified')) {
        return {
          success: false,
          error: 'Problema con el dominio de email. Contactá soporte.',
        }
      }
      if (message.includes('Invalid') && message.includes('email')) {
        return {
          success: false,
          error: `Email del inquilino inválido: ${tenant.email}`,
        }
      }
      return {
        success: false,
        error: `No se pudo enviar el email: ${message.substring(0, 140)}`,
      }
    }

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
  const safePage = Math.max(1, Math.floor(page))
  const safeLimit = Math.min(Math.max(1, limit), 100)
  const from = (safePage - 1) * safeLimit
  const to = from + safeLimit - 1

  let query = supabase
    .from('receipts')
    .select('*, tenants(full_name, email)', { count: 'exact' })
    .eq('account_id', accountId)
    .is('deleted_at', null)

  if (options?.search) {
    const safeSearch = options.search.replace(/[,()\\._%;:]/g, ' ').trim()
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

  return { receipts: (data ?? []).map(asReceiptWithTenant), total: count ?? 0 }
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

  return asReceiptWithTenant(data)
}

// ─── Draft Receipt Line Items ────────────────────────────────────────────────

export async function getReceiptWithLineItems(receiptId: string) {
  const validId = validateId(receiptId)
  const { accountId, supabase } = await getCurrentUserWithAccount()

  const { data: receipt, error } = await supabase
    .from('receipts')
    .select('*, tenants(full_name, email)')
    .eq('id', validId)
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .single()

  if (error || !receipt) return null

  const { data: lineItems } = await supabase
    .from('receipt_line_items')
    .select('*')
    .eq('receipt_id', validId)
    .eq('account_id', accountId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return {
    receipt: asReceiptWithTenant(receipt),
    lineItems: (lineItems ?? []) as ReceiptLineItem[],
  }
}

export async function addLineItem(input: ReceiptLineItemInput) {
  try {
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    const validated = receiptLineItemSchema.parse(input)
    const receiptId = validateId(validated.receipt_id)

    // Verify receipt is draft
    const { data: receipt } = await supabase
      .from('receipts')
      .select('status')
      .eq('id', receiptId)
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .single()

    if (!receipt) return { success: false, error: 'Recibo no encontrado' }
    if (receipt.status !== 'draft') return { success: false, error: 'Solo se pueden editar borradores' }

    // Get max sort_order
    const { data: maxRow } = await supabase
      .from('receipt_line_items')
      .select('sort_order')
      .eq('receipt_id', receiptId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxRow?.sort_order ?? -1) + 1

    const { data, error } = await supabase
      .from('receipt_line_items')
      .insert({
        receipt_id: receiptId,
        account_id: accountId,
        label: validated.label,
        amount: validated.amount,
        item_type: validated.item_type,
        sort_order: nextOrder,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to add line item', { error: error.message })
      return { success: false, error: 'Error al agregar concepto' }
    }

    revalidatePath(`/receipts/${receiptId}/edit`)
    return { success: true, data: data as ReceiptLineItem }
  } catch (error) {
    logError(error, { action: 'addLineItem' })
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos inválidos', errors: error.errors }
    }
    return { success: false, error: 'Error al agregar concepto' }
  }
}

export async function updateLineItem(input: UpdateLineItemInput) {
  try {
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    const validated = updateLineItemSchema.parse(input)
    const lineItemId = validateId(validated.id)

    // Fetch line item and verify receipt is draft
    const { data: lineItem } = await supabase
      .from('receipt_line_items')
      .select('receipt_id')
      .eq('id', lineItemId)
      .eq('account_id', accountId)
      .single()

    if (!lineItem) return { success: false, error: 'Concepto no encontrado' }

    const { data: receipt } = await supabase
      .from('receipts')
      .select('status')
      .eq('id', lineItem.receipt_id)
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .single()

    if (!receipt) return { success: false, error: 'Recibo no encontrado' }
    if (receipt.status !== 'draft') return { success: false, error: 'Solo se pueden editar borradores' }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (validated.label !== undefined) updateData.label = validated.label
    if (validated.amount !== undefined) updateData.amount = validated.amount
    if (validated.item_type !== undefined) updateData.item_type = validated.item_type

    const { error } = await supabase
      .from('receipt_line_items')
      .update(updateData)
      .eq('id', lineItemId)
      .eq('account_id', accountId)

    if (error) {
      logger.error('Failed to update line item', { error: error.message })
      return { success: false, error: 'Error al actualizar concepto' }
    }

    revalidatePath(`/receipts/${lineItem.receipt_id}/edit`)
    return { success: true }
  } catch (error) {
    logError(error, { action: 'updateLineItem' })
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Datos inválidos', errors: error.errors }
    }
    return { success: false, error: 'Error al actualizar concepto' }
  }
}

export async function removeLineItem(lineItemId: string) {
  try {
    const validId = validateId(lineItemId)
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])

    // Fetch line item and verify receipt is draft
    const { data: lineItem } = await supabase
      .from('receipt_line_items')
      .select('receipt_id, item_type')
      .eq('id', validId)
      .eq('account_id', accountId)
      .single()

    if (!lineItem) return { success: false, error: 'Concepto no encontrado' }
    if (lineItem.item_type === 'rent') return { success: false, error: 'No se puede eliminar el concepto de alquiler' }

    const { data: receipt } = await supabase
      .from('receipts')
      .select('status')
      .eq('id', lineItem.receipt_id)
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .single()

    if (!receipt) return { success: false, error: 'Recibo no encontrado' }
    if (receipt.status !== 'draft') return { success: false, error: 'Solo se pueden editar borradores' }

    const { error } = await supabase
      .from('receipt_line_items')
      .delete()
      .eq('id', validId)
      .eq('account_id', accountId)

    if (error) {
      logger.error('Failed to remove line item', { error: error.message })
      return { success: false, error: 'Error al eliminar concepto' }
    }

    revalidatePath(`/receipts/${lineItem.receipt_id}/edit`)
    return { success: true }
  } catch (error) {
    logError(error, { action: 'removeLineItem' })
    return { success: false, error: 'Error al eliminar concepto' }
  }
}

export async function finalizeReceipt(receiptId: string) {
  try {
    const validId = validateId(receiptId)
    const { user, accountId, supabase } = await getCurrentUserWithAccount()
    await requireRole(supabase, accountId, user.id, ['owner', 'admin'])
    const adminSupabase = createAdminClient()

    // 1. Call finalize RPC (sums line items, freezes payload, promotes to generated)
    const { data: rpcReceipt, error: rpcError } = await supabase.rpc('finalize_receipt', {
      p_actor_user_id: user.id,
      p_account_id: accountId,
      p_receipt_id: validId,
    })

    if (rpcError || !rpcReceipt) {
      logger.error('finalize_receipt RPC failed', { error: rpcError?.message })
      return { success: false, error: rpcError?.message?.includes('invalid_state')
        ? 'Solo se pueden finalizar borradores'
        : 'Error al finalizar el recibo'
      }
    }

    const receipt = rpcReceipt as Receipt

    // 2. Fetch line items for PDF
    const { data: lineItems } = await supabase
      .from('receipt_line_items')
      .select('label, amount, item_type')
      .eq('receipt_id', validId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    // 3. Generate PDF with line items
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
      receiptId: validId,
      description: receipt.description ?? null,
      lineItems: (lineItems ?? []) as Array<{ label: string; amount: number; item_type: string }>,
    })
    const pdfBuffer = await renderToBuffer(pdfElement as any)

    // 4. Upload PDF
    const fileName = `${accountId}/${validId}.pdf`
    try {
      await withRetry(async () => {
        const result = await adminSupabase.storage
          .from('receipts')
          .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true })
        if (result.error) throw result.error
      }, { maxRetries: 2, initialDelayMs: 500 })
    } catch (err) {
      logger.error('Failed to upload finalized PDF', { error: err instanceof Error ? err.message : String(err) })
      return { success: false, error: 'Error al subir el PDF' }
    }

    // 5. Signed URL
    const { data: signedUrlData } = await adminSupabase.storage
      .from('receipts')
      .createSignedUrl(fileName, 60 * 60 * 24 * 365)

    const pdfUrl = signedUrlData?.signedUrl ?? null

    // 6. Update receipt with PDF info
    await supabase
      .from('receipts')
      .update({
        storage_path: fileName,
        pdf_url: pdfUrl,
        email_sent: false,
      })
      .eq('id', validId)
      .eq('account_id', accountId)

    // 7. Send email to tenant
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
          .eq('id', validId)

        logger.info('Finalized receipt email sent', { receiptId: validId, to: tenantContact.email })
      } catch (emailError) {
        logger.error('Failed to send finalized receipt email', {
          receiptId: validId,
          error: emailError instanceof Error ? emailError.message : 'Unknown',
        })
      }
    }

    logger.info('Receipt finalized', { receiptId: validId, userId: user.id })
    revalidatePath('/receipts')
    revalidatePath(`/receipts/${validId}`)
    return { success: true }
  } catch (error) {
    if (isRedirectError(error)) throw error
    logError(error, { action: 'finalizeReceipt' })
    return { success: false, error: 'Error al finalizar el recibo' }
  }
}
