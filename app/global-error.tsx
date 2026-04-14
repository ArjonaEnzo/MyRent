'use client'

import { useEffect } from 'react'

/**
 * Último nivel de error boundary — captura errores del root layout.
 * Si explota acá, algo grave pasó (provider, theme, etc).
 * Debe renderizar <html> y <body> porque reemplaza el layout root.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app/global-error.tsx]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '28rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Error inesperado
          </h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            La aplicación encontró un problema. Recargá la página para continuar.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: '#999',
                marginBottom: '1rem',
              }}
            >
              ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  )
}
