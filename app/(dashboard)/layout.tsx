import { getCurrentUser } from '@/lib/supabase/auth'
import { getProfile } from '@/lib/actions/profile'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const email = user.email || 'Usuario'
  const profileResult = await getProfile()
  const avatarUrl = profileResult.success ? (profileResult.data?.avatar_url ?? null) : null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar userEmail={email} avatarUrl={avatarUrl} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={email} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
