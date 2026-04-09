'use client'

import { logout } from '@/lib/actions/auth'
import { LogOut } from 'lucide-react'
import { useTransition } from 'react'

export function LogoutButton() {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await logout() })}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
      style={{
        color: 'rgba(255,255,255,0.45)',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <LogOut className="h-3 w-3" />
      <span className="hidden sm:block">Salir</span>
    </button>
  )
}
