/**
 * Utilidades de formato para la aplicación (locale es-AR).
 * Centraliza la lógica de formateo que estaba duplicada en múltiples componentes.
 */

/**
 * Formatea un monto con símbolo de moneda en locale es-AR.
 * ARS: sin decimales ($ 1.500), USD: con 2 decimales (US$ 1.500,00).
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'ARS' ? 0 : 2,
  }).format(amount)
}

/**
 * Formatea un período YYYY-MM como "enero 2026".
 */
export function formatPeriod(period: string): string {
  const [year, month] = period.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

/**
 * Formatea una fecha ISO como "1 ene 2026".
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
