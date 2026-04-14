import { Resend } from 'resend'
import { escapeHtml, emailLayout } from './email-utils'

const resend = new Resend(process.env.RESEND_API_KEY)

interface AdminAlertParams {
  subject: string
  heading: string
  body: string
  details?: Record<string, unknown>
}

/**
 * Envía una alerta al email admin (usa RESEND_FROM_EMAIL como destino).
 *
 * Uso: fallas del cron, webhooks repetidamente fallados, errores críticos.
 * Fail-silent: si Resend está caído también, solo loggeamos — no queremos
 * que una falla de alerta crashee el proceso que ya estaba en problemas.
 */
export async function sendAdminAlertEmail(params: AdminAlertParams): Promise<void> {
  const to = process.env.RESEND_FROM_EMAIL
  if (!to) {
    console.warn('[admin-alert] RESEND_FROM_EMAIL no configurado — skip')
    return
  }

  const detailsHtml = params.details
    ? `<pre style="background:#f5f5f5;padding:12px;border-radius:6px;font-size:12px;overflow-x:auto;">${escapeHtml(
        JSON.stringify(params.details, null, 2),
      )}</pre>`
    : ''

  const html = emailLayout(`
    <h2 style="color:#b91c1c;">⚠️ ${escapeHtml(params.heading)}</h2>
    <p>${escapeHtml(params.body)}</p>
    ${detailsHtml}
    <p style="color:#666;font-size:12px;margin-top:24px;">
      Timestamp: ${new Date().toISOString()}
    </p>
  `)

  try {
    await resend.emails.send({
      from: to,
      to,
      subject: `[MyRent Alert] ${params.subject}`,
      html,
    })
  } catch (err) {
    console.error('[admin-alert] Failed to send alert email', {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
