'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { changeTenantPassword } from '@/lib/actions/auth'

export default function TenantSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    const form = e.currentTarget
    const currentPassword = (form.elements.namedItem('currentPassword') as HTMLInputElement).value
    const newPassword = (form.elements.namedItem('newPassword') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value

    if (newPassword !== confirm) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    const result = await changeTenantPassword({ currentPassword, newPassword })

    if (result.success) {
      setSuccess(true)
      form.reset()
    } else {
      setError(result.error ?? 'Error desconocido')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <Link
        href="/tenant/dashboard"
        className="inline-flex items-center gap-1 text-sm text-white/50 transition hover:text-white/80"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al portal
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="mt-1 text-sm text-white/40">Actualizá tu contraseña de acceso al portal.</p>
      </div>

      <div
        className="rounded-2xl p-6"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="mb-5 flex items-center gap-2 text-sm font-medium text-white">
          <Lock className="h-4 w-4 text-primary" />
          Cambiar contraseña
        </div>

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

          {success && (
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
              style={{
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                color: '#6ee7b7',
              }}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Contraseña actualizada correctamente
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="currentPassword" className="block text-xs font-medium text-white/50">
              Contraseña actual
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                caretColor: '#10b981',
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="block text-xs font-medium text-white/50">
              Nueva contraseña (mínimo 8 caracteres)
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                caretColor: '#10b981',
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm" className="block text-xs font-medium text-white/50">
              Confirmar nueva contraseña
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                caretColor: '#10b981',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{
              background: loading
                ? 'rgba(16,185,129,0.5)'
                : 'linear-gradient(135deg, #10b981, #059669)',
            }}
          >
            {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
