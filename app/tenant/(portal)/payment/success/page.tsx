import Link from 'next/link'

/**
 * Página de retorno: pago aprobado
 * URL: /tenant/payment/success?payment_id=<uuid>
 *
 * MP redirige aquí cuando el pago fue aprobado (si auto_return='approved').
 * El estado definitivo del pago se confirma vía webhook, no por esta URL.
 *
 * Nota: no mostramos el recibo como "pagado" aquí todavía.
 * El webhook puede tardar unos segundos en llegar y actualizar la DB.
 * Redirigimos al dashboard que ya mostrará el estado actualizado.
 */
export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      {/* Ícono de éxito */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <svg
          className="h-8 w-8 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          ¡Pago procesado!
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Tu pago fue aprobado por Mercado Pago.
          <br />
          En unos segundos verás el recibo actualizado en tu portal.
        </p>
      </div>

      <Link
        href="/tenant/dashboard"
        className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        Volver a mi portal
      </Link>
    </div>
  )
}
