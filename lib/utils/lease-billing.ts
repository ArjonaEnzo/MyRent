/**
 * Utilidades para facturación automática y cálculo de fechas de contratos.
 */

/**
 * Calcula la próxima fecha de cobro a partir del día de facturación.
 * Si el día ya pasó este mes, devuelve el mes siguiente.
 */
export function computeNextBillingDate(billingDay: number, from?: Date): Date {
  const ref = from ?? new Date()
  const year = ref.getFullYear()
  const month = ref.getMonth()
  const today = ref.getDate()

  if (today < billingDay) {
    // This month
    return new Date(year, month, billingDay)
  }
  // Next month
  return new Date(year, month + 1, billingDay)
}

/**
 * Calcula la próxima fecha de ajuste basándose en la fecha de inicio del contrato
 * y la frecuencia en meses.
 */
export function computeNextAdjustmentDate(
  startDate: string,
  frequencyMonths: number,
  lastAdjustmentDate?: string | null,
): Date | null {
  if (!frequencyMonths || frequencyMonths <= 0) return null

  const base = lastAdjustmentDate ? new Date(lastAdjustmentDate) : new Date(startDate)
  const next = new Date(base)
  next.setMonth(next.getMonth() + frequencyMonths)

  return next
}

/**
 * Formatea una fecha de cobro como "1 de mayo de 2026".
 */
export function formatBillingDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Formatea solo día y mes para mostrar próximo cobro: "1 de mayo".
 */
export function formatBillingDayMonth(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
  })
}
