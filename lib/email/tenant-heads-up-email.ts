import { Resend } from 'resend'
import {
  escapeHtml,
  escapeHtmlAttr,
  formatCurrency,
  formatPeriodText,
  emailLayout,
} from './email-utils'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendTenantHeadsUpParams {
  to: string
  tenantName: string
  propertyName: string
  period: string
  amount: number
  currency: string
  billingDay: number
  daysUntilBilling: number
  portalUrl: string
}

/**
 * Envía un aviso al inquilino N días antes del cobro.
 * Le informa que se va a generar su recibo pronto.
 */
export async function sendTenantHeadsUpEmail({
  to,
  tenantName,
  propertyName,
  period,
  amount,
  currency,
  billingDay,
  daysUntilBilling,
  portalUrl,
}: SendTenantHeadsUpParams) {
  const periodText = formatPeriodText(period)

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Aviso: Tu recibo de ${escapeHtml(periodText)} se genera en ${daysUntilBilling} días`,
    html: emailLayout(`
      <h1 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
        🔔 Próximo Recibo de Alquiler
      </h1>
      <p>Hola <strong>${escapeHtml(tenantName)}</strong>,</p>
      <p>
        Te avisamos que el día <strong>${billingDay}</strong> se va a generar tu recibo de alquiler
        correspondiente a <strong>${escapeHtml(periodText)}</strong>.
      </p>
      <div style="background: #eff6ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
        <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px;">MONTO ESTIMADO</p>
        <p style="color: #1e40af; font-size: 28px; font-weight: bold; margin: 0;">
          ${formatCurrency(amount, currency)}
        </p>
        <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 12px;">
          ${escapeHtml(propertyName)}
        </p>
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        Una vez generado, vas a poder ver el detalle y pagarlo desde tu portal de inquilino.
      </p>
      <p>
        <a href="${escapeHtmlAttr(portalUrl)}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Ir a mi portal
        </a>
      </p>
    `),
  })

  if (error) {
    throw new Error(`Error al enviar aviso al inquilino: ${error.message}`)
  }

  return { success: true }
}
