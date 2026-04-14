'use server'

import JSZip from 'jszip'
import { getCurrentTenant } from '@/lib/supabase/tenant-auth'
import { logger } from '@/lib/utils/logger'

type Result =
  | { success: true; base64: string; filename: string; count: number }
  | { success: false; error: string }

/**
 * Descarga todos los recibos pagados de un año en un zip.
 * Usado por el inquilino para declaración impositiva anual.
 */
export async function downloadYearReceiptsZip(year: number): Promise<Result> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { success: false, error: 'Año inválido.' }
  }

  try {
    const { tenantId, accountId, supabase } = await getCurrentTenant()

    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('id, period, pdf_url, status')
      .eq('tenant_id', tenantId)
      .eq('account_id', accountId)
      .eq('status', 'paid')
      .gte('period', `${year}-01`)
      .lte('period', `${year}-12`)
      .is('deleted_at', null)
      .order('period', { ascending: true })

    if (error) {
      logger.error('year zip query failed', { error: error.message })
      return { success: false, error: 'No se pudieron cargar los recibos.' }
    }

    const withPdf = (receipts ?? []).filter((r) => r.pdf_url)
    if (withPdf.length === 0) {
      return { success: false, error: `No hay recibos pagados en ${year}.` }
    }

    const zip = new JSZip()
    const results = await Promise.allSettled(
      withPdf.map(async (r) => {
        const res = await fetch(r.pdf_url as string)
        if (!res.ok) throw new Error(`fetch ${r.id} failed`)
        const buf = await res.arrayBuffer()
        zip.file(`recibo-${r.period}.pdf`, buf)
      }),
    )

    const successCount = results.filter((x) => x.status === 'fulfilled').length
    if (successCount === 0) {
      return { success: false, error: 'No se pudo descargar ningún PDF.' }
    }

    const blob = await zip.generateAsync({ type: 'nodebuffer' })
    return {
      success: true,
      base64: blob.toString('base64'),
      filename: `recibos-${year}.zip`,
      count: successCount,
    }
  } catch (err) {
    logger.error('year zip failed', { error: err instanceof Error ? err.message : String(err) })
    return { success: false, error: 'Error al generar el archivo.' }
  }
}
