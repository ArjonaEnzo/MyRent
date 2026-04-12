'use client'

import { useState, useTransition } from 'react'
import { initiateOnlinePayment } from '@/lib/actions/payments'

interface PayReceiptButtonProps {
  receiptId: string
  amount: number
  currency: string
  period: string
}

/**
 * Botón de pago online para el portal del inquilino.
 *
 * Al hacer clic:
 *   1. Llama a initiateOnlinePayment() (Server Action)
 *   2. Recibe la checkout_url de Mercado Pago
 *   3. Redirige al inquilino al checkout de MP
 *
 * El Server Action es idempotente: si ya existe un pago pendiente
 * para este recibo, devuelve el mismo checkout_url existente.
 */
export function PayReceiptButton({
  receiptId,
  amount,
  currency,
  period,
}: PayReceiptButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handlePay() {
    setError(null)
    startTransition(async () => {
      const result = await initiateOnlinePayment(receiptId)

      if (!result.success) {
        setError(result.error)
        return
      }

      // Redirigir al checkout de Mercado Pago
      window.location.href = result.checkoutUrl
    })
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handlePay}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Iniciando pago…
          </>
        ) : (
          <>
            {/* Ícono de Mercado Pago (simplificado) */}
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-11h2v6h-2zm0-3h2v2h-2z" />
            </svg>
            Pagar con Mercado Pago
          </>
        )}
      </button>

      {error && (
        <p className="text-center text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {currency} {amount.toLocaleString('es-AR')} · Período {period}
      </p>
    </div>
  )
}
