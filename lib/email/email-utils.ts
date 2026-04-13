/**
 * Utilidades compartidas para templates de email.
 */

/**
 * Escapa caracteres HTML para prevenir inyección.
 * Usado en contenido HTML (no atributos).
 */
export function escapeHtml(text: string): string {
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
 * Escapa caracteres para atributos HTML.
 * Más estricto que escapeHtml — para uso en href, src, etc.
 */
export function escapeHtmlAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Formatea un monto con el símbolo de moneda.
 */
export function formatCurrency(amount: number, currency: string): string {
  if (currency === 'ARS') {
    return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
  }
  return `US$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

/**
 * Formatea un período YYYY-MM a texto legible en español.
 * Ej: "2026-05" → "Mayo 2026"
 */
export function formatPeriodText(period: string): string {
  const [year, month] = period.split('-')
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return `${months[parseInt(month, 10) - 1]} ${year}`
}

/**
 * Layout base de email HTML con estilos MyRent.
 */
export function emailLayout(content: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${content}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #9ca3af; font-size: 12px;">
        Este email fue generado automáticamente por MyRent.
      </p>
    </div>
  `
}
