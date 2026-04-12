'use client'

import { useState } from 'react'
import { tenantLogin } from '@/lib/actions/auth'
import { Home, ArrowRight, AlertCircle } from 'lucide-react'

export default function TenantLoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const result = await tenantLogin({
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      password: (form.elements.namedItem('password') as HTMLInputElement).value,
    })

    if (result && !result.success) {
      setError(result.error ?? 'Error desconocido')
      setLoading(false)
    }
  }

  return (
    <div className="dark flex min-h-screen items-center justify-center px-4 bg-[#080E1A]">
      {/* Background glow */}
      <div className="pointer-events-none fixed left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.07)_0%,transparent_70%)]" />

      <div className="relative w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <Home className="h-6 w-6 text-primary-foreground" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Portal del Inquilino
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Accedé a tus contratos, recibos y pagos
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card/30 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-muted-foreground"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="tu@email.com"
                className="w-full rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-primary/40 caret-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-muted-foreground"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all focus:border-primary/40 caret-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <>
                  Ingresar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60">
          ¿Sos propietario?{' '}
          <a
            href="/login"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Accedé aquí
          </a>
        </p>

      </div>
    </div>
  )
}
