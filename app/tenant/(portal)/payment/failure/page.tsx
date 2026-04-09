import Link from 'next/link'

/**
 * Página de retorno: pago rechazado o fallido
 * URL: /tenant/payment/failure?payment_id=<uuid>
 *
 * MP redirige aquí cuando el pago fue rechazado.
 * El inquilino puede intentar de nuevo desde el dashboard.
 */
export default function PaymentFailurePage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      {/* Ícono de error */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <svg
          className="h-8 w-8 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          El pago no se completó
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Mercado Pago no pudo procesar el pago.
          <br />
          Podés intentarlo de nuevo o contactar a tu propietario.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/tenant/dashboard"
          className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Volver al portal
        </Link>
      </div>
    </div>
  )
}
