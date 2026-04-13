import { Resend } from 'resend'
import {
  escapeHtml,
  escapeHtmlAttr,
  formatCurrency,
  formatPeriodText,
  emailLayout,
} from './email-utils'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendLandlordReminderParams {
  to: string
  landlordName: string
  tenantName: string
  propertyName: string
  period: string
  amount: number
  currency: string
  billingDay: number
  daysUntilBilling: number
  dashboardUrl: string
}

/**
 * Envía un recordatorio al propietario N días antes del cobro.
 * Le avisa que se va a generar un borrador y que puede agregar cargos extra.
 */
export async function sendLandlordReminderEmail({
  to,
  landlordName,
  tenantName,
  propertyName,
  period,
  amount,
  currency,
  billingDay,
  daysUntilBilling,
  dashboardUrl,
}: SendLandlordReminderParams) {
  const periodText = formatPeriodText(period)

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Recordatorio: Recibo de ${escapeHtml(tenantName)} se genera en ${daysUntilBilling} días`,
    html: emailLayout(`
      <h1 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
        📋 Próximo Recibo
      </h1>
      <p>Hola <strong>${escapeHtml(landlordName)}</strong>,</p>
      <p>
        Te avisamos que en <strong>${daysUntilBilling} días</strong> (día ${billingDay}) se va a generar
        automáticamente el recibo de alquiler para:
      </p>
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Inquilino</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${escapeHtml(tenantName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Propiedad</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${escapeHtml(propertyName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Período</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">${escapeHtml(periodText)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Monto base</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #1e40af;">${formatCurrency(amount, currency)}</td>
          </tr>
        </table>
      </div>
      <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>💡 ¿Necesitás agregar expensas, agua, ABL u otros cargos?</strong><br>
          Una vez generado el borrador, podés editarlo y agregar conceptos antes de enviarlo al inquilino.
        </p>
      </div>
      <p>
        <a href="${escapeHtmlAttr(dashboardUrl)}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Ir al panel de recibos
        </a>
      </p>
    `),
  })

  if (error) {
    throw new Error(`Error al enviar recordatorio al propietario: ${error.message}`)
  }

  return { success: true }
}
