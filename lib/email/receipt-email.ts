import { Resend } from 'resend'
import { emailRateLimit } from '@/lib/utils/rate-limit'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendReceiptEmailParams {
  to: string
  recipientName: string
  period: string
  amount: number
  currency: string
  pdfUrl: string
  userId: string // Para rate limiting
  description?: string | null
}

/**
 * Escapa caracteres HTML para prevenir inyección
 * Usado en contenido HTML (no atributos)
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

/**
 * Escapa caracteres para atributos HTML
 * Más estricto que escapeHtml - para uso en href, src, etc.
 */
function escapeHtmlAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

function formatCurrency(amount: number, currency: string) {
  if (currency === 'ARS') {
    return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
  }
  return `US$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export async function sendReceiptEmail({
  to,
  recipientName,
  period,
  amount,
  currency,
  pdfUrl,
  userId,
  description,
}: SendReceiptEmailParams) {
  // Rate limiting: prevenir spam de emails
  await emailRateLimit.limit(userId)

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Recibo de alquiler - ${escapeHtml(period)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
          Recibo de Alquiler
        </h1>
        <p>Hola <strong>${escapeHtml(recipientName)}</strong>,</p>
        <p>Te enviamos tu recibo de alquiler correspondiente al período <strong>${escapeHtml(period)}</strong>.</p>
        ${description ? `
        <div style="background: #f9fafb; padding: 15px; border-left: 3px solid #2563eb; margin: 15px 0;">
          <p style="margin: 0; font-size: 14px; color: #374151;">
            <strong>Concepto:</strong> ${escapeHtml(description)}
          </p>
        </div>
        ` : ''}
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px;">MONTO</p>
          <p style="color: #1e40af; font-size: 28px; font-weight: bold; margin: 0;">
            ${formatCurrency(amount, currency)}
          </p>
        </div>
        <p>
          <a href="${escapeHtmlAttr(pdfUrl)}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Descargar PDF
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px;">
          Este recibo fue generado automáticamente por MyRent.
        </p>
      </div>
    `,
  })

  if (error) {
    throw new Error(`Error al enviar email: ${error.message}`)
  }

  return { success: true }
}
