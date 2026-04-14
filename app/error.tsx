'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Error boundary para rutas dentro de (auth), (dashboard), tenant/(portal).
 * Captura errores no manejados en Server Components o en el render del árbol,
 * evitando que la app muestre pantalla blanca.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log al console (Vercel Log Drains lo capta en prod).
    // TODO: integrar Sentry cuando escale.
    console.error('[app/error.tsx]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold">Algo salió mal</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Tuvimos un problema cargando esta sección. Podés reintentar o volver al
        inicio. Si el problema persiste, contactanos.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">
          ID: {error.digest}
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={reset} variant="default">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <Home className="mr-2 h-4 w-4" />
            Ir al inicio
          </Link>
        </Button>
      </div>
    </div>
  )
}
