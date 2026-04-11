'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, ArrowRight, AlertCircle } from 'lucide-react'

type Status = 'verifying' | 'ready' | 'submitting' | 'error'

export default function SetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status>('verifying')
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    async function verify() {
      try {
        const code = searchParams.get('code')
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
          setStatus('ready')
          return
        }

        if (typeof window !== 'undefined' && window.location.hash) {
          const hash = new URLSearchParams(window.location.hash.slice(1))
          const accessToken = hash.get('access_token')
          const refreshToken = hash.get('refresh_token')
          if (accessToken && refreshToken) {
            const { error: setError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (setError) throw setError
            window.history.replaceState(null, '', window.location.pathname)
            setStatus('ready')
            return
          }
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setStatus('ready')
          return
        }

        setError('Link de invitación inválido o vencido. Pedile al propietario que reenvíe la invitación.')
        setStatus('error')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al procesar la invitación')
        setStatus('error')
      }
    }

    verify()
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setStatus('submitting')

    const form = e.currentTarget
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setStatus('ready')
      return
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      setStatus('ready')
      return
    }

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setStatus('ready')
      return
    }

    router.push('/tenant/dashboard')
    router.refresh()
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: '#080E1A' }}
    >
      <div
        className="pointer-events-none fixed left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)' }}
      />

      <div className="relative w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            <Home className="h-6 w-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Definí tu contraseña
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Creá una contraseña segura para acceder al portal
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {status === 'verifying' && (
            <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Verificando invitación...
            </p>
          )}

          {status === 'error' && (
            <div
              className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#fca5a5',
              }}
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {(status === 'ready' || status === 'submitting') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#fca5a5',
                  }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Contraseña (mínimo 8 caracteres)
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:opacity-30 outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    caretColor: '#10b981',
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm" className="block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Confirmar contraseña
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:opacity-30 outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    caretColor: '#10b981',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                style={{
                  background: status === 'submitting'
                    ? 'rgba(16,185,129,0.5)'
                    : 'linear-gradient(135deg, #10b981, #059669)',
                }}
              >
                {status === 'submitting' ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    Guardar y entrar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
