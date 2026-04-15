import { redirect } from 'next/navigation'
import { getCurrentUserWithAccount } from '@/lib/supabase/auth'
import { getAccountPlanLimits, getAccountUsage } from '@/lib/subscriptions/plan-limits'
import { createAdminClient } from '@/lib/supabase/server'
import { BillingContent } from '@/components/billing/BillingContent'

export const metadata = {
  title: 'Plan y facturación - MyRent',
  description: 'Gestioná tu plan SaaS y uso actual',
}

export const revalidate = 60

export default async function BillingPage() {
  let accountId: string
  try {
    ;({ accountId } = await getCurrentUserWithAccount())
  } catch {
    redirect('/login')
  }

  const admin = createAdminClient()

  const [plan, usage, plansResult] = await Promise.all([
    getAccountPlanLimits(accountId),
    getAccountUsage(accountId),
    admin.from('subscription_plans').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
  ])

  const plans = plansResult.data ?? []

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <BillingContent
          currentPlan={plan}
          usage={usage}
          availablePlans={plans.map((p) => ({
            id: p.id,
            name: p.name,
            priceArs: Number(p.price_ars),
            maxProperties: p.max_properties,
            maxTenants: p.max_tenants,
            maxReceiptsPerMonth: p.max_receipts_per_month,
            features: (p.features as Record<string, boolean>) ?? {},
          }))}
        />
      </div>
    </div>
  )
}
