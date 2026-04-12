import Link from 'next/link'

/**
 * Página de retorno: pago pendiente
 * URL: /tenant/payment/pending?payment_id=<uuid>
 *
 * MP redirige aquí para pagos en efectivo (Rapipago, PagoFácil) u
 * otros medios que requieren acreditación diferida.
 *
 * El estado se actualiza vía webhook cuando la acreditación ocurre
 * (puede tardar minutos u horas dependiendo del medio de pago).
 */
export default function PaymentPendingPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      {/* Ícono de reloj */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <svg
          className="h-8 w-8 text-amber-600 dark:text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Pago en proceso
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu pago está siendo procesado por Mercado Pago.
          <br />
          Si elegiste un medio de pago en efectivo, abonalo antes de que expire.
          <br />
          El recibo se actualizará automáticamente cuando se confirme la acreditación.
        </p>
      </div>

      <Link
        href="/tenant/dashboard"
        className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Volver a mi portal
      </Link>
    </div>
  )
}
