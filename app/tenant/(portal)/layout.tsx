import { redirect } from 'next/navigation'
import { getCurrentTenantOrNull } from '@/lib/supabase/tenant-auth'
import { Home } from 'lucide-react'
import { LogoutButton } from '@/components/tenant/LogoutButton'

export default async function TenantPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getCurrentTenantOrNull()

  if (!session) {
    redirect('/tenant/login')
  }

  return (
    <div className="min-h-screen" style={{ background: '#080E1A' }}>

      {/* ── Top bar ── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'rgba(8, 14, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              <Home className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold tracking-tight text-white">
                My<span style={{ color: '#10b981' }}>Rent</span>
              </span>
              <span
                className="hidden text-xs sm:block"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                / Inquilino
              </span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <span
              className="hidden text-xs sm:block"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              {session.user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="mx-auto max-w-3xl px-5 py-10">
        {children}
      </main>

    </div>
  )
}
