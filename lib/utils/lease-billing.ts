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
 * Calcula qué billing_day corresponde a N días en el futuro (zona Argentina).
 * Devuelve el día del mes y el período YYYY-MM correspondiente.
 * Útil para cron jobs que necesitan notificar antes del día de cobro.
 *
 * Ejemplo: si hoy es 26/04 y daysAhead=5, devuelve { day: 1, period: "2026-05" }
 */
export function getUpcomingBillingTarget(daysAhead: number, from?: Date): { day: number; period: string } {
  const ref = from ?? new Date()
  const argDate = new Date(ref.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const target = new Date(argDate)
  target.setDate(target.getDate() + daysAhead)
  return {
    day: target.getDate(),
    period: `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`,
  }
}

/**
 * Calcula cuántos días faltan desde hoy hasta un día de cobro dado.
 * Si el día ya pasó este mes, calcula hacia el mes siguiente.
 */
export function daysUntilBillingDay(billingDay: number, from?: Date): number {
  const ref = from ?? new Date()
  const next = computeNextBillingDate(billingDay, ref)
  const diffMs = next.getTime() - ref.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
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
