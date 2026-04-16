import { getCurrentUser } from '@/lib/supabase/auth'
import { getProfile } from '@/lib/actions/profile'
import { getMPStatus } from '@/lib/actions/mp-oauth'
import { env } from '@/lib/env'
import { AccountContent } from '@/components/account/AccountContent'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Mi cuenta - MyRent',
  description: 'Administra tu perfil y configuración de cuenta',
}

export default async function AccountPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const [profileResult, mpStatus] = await Promise.all([
    getProfile(),
    getMPStatus(),
  ])

  if (!profileResult.success || !profileResult.data) {
    redirect('/dashboard')
  }

  const mpOAuthEnabled = !!env.MERCADOPAGO_APP_ID && !!env.MERCADOPAGO_CLIENT_SECRET

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <AccountContent
          profile={{
            fullName: profileResult.data.full_name || '',
            email: profileResult.data.email,
            avatarUrl: profileResult.data.avatar_url ?? null,
          }}
          mpStatus={mpStatus}
          mpOAuthEnabled={mpOAuthEnabled}
        />
      </div>
    </div>
  )
}
