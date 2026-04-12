import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentTenantOrNull } from '@/lib/supabase/tenant-auth'
import { Home, Settings } from 'lucide-react'
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
    <div className="dark min-h-screen bg-[#080E1A]">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[rgba(8,14,26,0.85)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Home className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold tracking-tight text-white">
                My<span className="text-primary">Rent</span>
              </span>
              <span className="hidden text-xs text-white/30 sm:block">
                / Inquilino
              </span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/40 sm:block">
              {session.user.email}
            </span>
            <Link
              href="/tenant/settings"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/[0.05] hover:text-white"
              title="Configuración"
            >
              <Settings className="h-4 w-4" />
            </Link>
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
