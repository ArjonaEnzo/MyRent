import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getCurrentUserWithAccount } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DraftReceiptsBanner } from '@/components/dashboard/DraftReceiptsBanner'
import { OverdueBanner, type OverdueTenant } from '@/components/dashboard/OverdueBanner'
import { OnboardingBanners } from '@/components/dashboard/OnboardingBanners'
import { StatsRow, type Stat } from '@/components/dashboard/StatsRow'
import { AnalyticsSection } from '@/components/dashboard/AnalyticsSection'
import { OccupancyAlertsSection } from '@/components/dashboard/OccupancyAlertsSection'
import { ActivitySection, type RecentReceipt, type QuickAction } from '@/components/dashboard/ActivitySection'
import type { MonthlyRevenueData } from '@/components/dashboard/MonthlyRevenueChart'
import type { LeaseAlert } from '@/components/dashboard/OperationalAlerts'
import {
  StatsSkeleton,
  RevenueChartSkeleton,
  OccupancyAlertsSkeleton,
  ActivitySkeleton,
} from '@/components/dashboard/skeletons'

export const metadata: Metadata = {
  title: 'Dashboard | MyRent',
  description: 'Panel principal con resumen de propiedades, inquilinos y recibos.',
}

// Cache 60s — mutations call revalidatePath() to bust early when data changes.
export const revalidate = 60

// ── Shared date helpers ────────────────────────────────────────────────

function getDashboardDates() {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousPeriod = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`

  const periods: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const in60Days = new Date(now)
  in60Days.setDate(in60Days.getDate() + 60)
  const in60DaysStr = in60Days.toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  return { now, monthStart, currentPeriod, previousPeriod, periods, in60DaysStr, todayStr }
}

const quickActions: QuickAction[] = [
  {
    label: 'Nueva propiedad',
    description: 'Agrega una propiedad',
    href: '/properties/new',
    icon: 'Plus',
    color: 'text-primary',
    bg: 'bg-primary/5 group-hover:bg-primary/10',
  },
  {
    label: 'Nuevo inquilino',
    description: 'Registra un inquilino',
    href: '/tenants/new',
    icon: 'UserPlus',
    color: 'text-muted-foreground',
    bg: 'bg-muted group-hover:bg-muted/80',
  },
  {
    label: 'Generar recibo',
    description: 'Crear recibo de pago',
    href: '/receipts/new',
    icon: 'Receipt',
    color: 'text-primary',
    bg: 'bg-primary/5 group-hover:bg-primary/10',
  },
  {
    label: 'Ver reportes',
    description: 'Historial de recibos',
    href: '/receipts',
    icon: 'BarChart3',
    color: 'text-orange-600',
    bg: 'bg-orange-50 group-hover:bg-orange-100',
  },
]

// ── Async section: Stats + Draft banner ────────────────────────────────

async function StatsSection({ accountId }: { accountId: string }) {
  const supabase = await createClient()
  const { monthStart } = getDashboardDates()

  const [propertiesRes, tenantsRes, receiptsMonthRes, draftReceiptsRes] = await Promise.all([
    supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .is('deleted_at', null),
    supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .is('deleted_at', null),
    supabase
      .from('receipts')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .gte('created_at', monthStart),
    supabase
      .from('receipts')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('status', 'draft')
      .eq('auto_generated', true)
      .is('deleted_at', null),
  ])

  const propertiesCount = propertiesRes.count ?? 0
  const tenantsCount = tenantsRes.count ?? 0
  const receiptsThisMonth = receiptsMonthRes.count ?? 0
  const draftReceiptsCount = draftReceiptsRes.count ?? 0

  const stats: Stat[] = [
    {
      label: 'Propiedades',
      value: propertiesCount,
      subtitle: 'Total registradas',
      icon: 'Building2',
      href: '/properties',
      color: 'text-primary',
      bg: 'bg-primary/5',
      border: 'border-t-primary',
      accentBg: 'bg-primary',
    },
    {
      label: 'Inquilinos',
      value: tenantsCount,
      subtitle: 'Activos',
      icon: 'Users',
      href: '/tenants',
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      border: 'border-t-primary',
      accentBg: 'bg-muted0',
    },
    {
      label: 'Recibos este mes',
      value: receiptsThisMonth,
      subtitle: 'Generados',
      icon: 'FileText',
      href: '/receipts',
      color: 'text-primary',
      bg: 'bg-primary/5',
      border: 'border-t-primary/60',
      accentBg: 'bg-primary/50',
    },
  ]

  return (
    <>
      <DraftReceiptsBanner draftReceiptsCount={draftReceiptsCount} />
      <StatsRow stats={stats} />
    </>
  )
}

// ── Async section: Overdue + Onboarding banners ────────────────────────

async function AlertsSection({ accountId }: { accountId: string }) {
  const supabase = await createClient()
  const { currentPeriod } = getDashboardDates()

  const [overdueRes, draftLeasesRes, tenantsWithoutPortalRes] = await Promise.all([
    supabase
      .from('receipts')
      .select('tenant_id, snapshot_tenant_name, snapshot_amount, snapshot_currency')
      .eq('account_id', accountId)
      .in('status', ['generated', 'sent', 'signature_pending', 'signed'])
      .lt('period', currentPeriod)
      .is('deleted_at', null),
    supabase
      .from('leases')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('status', 'draft')
      .is('deleted_at', null),
    supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .is('auth_user_id', null)
      .is('deleted_at', null),
  ])

  const overdueReceipts = (overdueRes.data ?? []) as {
    tenant_id: string
    snapshot_tenant_name: string
    snapshot_amount: number
    snapshot_currency: string
  }[]

  const byTenant = new Map<string, OverdueTenant>()
  let totalAmount = 0
  let topCurrency = 'ARS'
  for (const r of overdueReceipts) {
    totalAmount += Number(r.snapshot_amount)
    topCurrency = r.snapshot_currency
    const existing = byTenant.get(r.tenant_id)
    if (existing) {
      existing.count += 1
      existing.total += Number(r.snapshot_amount)
    } else {
      byTenant.set(r.tenant_id, {
        tenantId: r.tenant_id,
        tenantName: r.snapshot_tenant_name || 'Sin nombre',
        count: 1,
        total: Number(r.snapshot_amount),
        currency: r.snapshot_currency,
      })
    }
  }
  const topTenants = [...byTenant.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  return (
    <>
      <OverdueBanner
        totalAmount={totalAmount}
        currency={topCurrency}
        count={overdueReceipts.length}
        topTenants={topTenants}
      />
      <OnboardingBanners
        draftLeasesCount={draftLeasesRes.count ?? 0}
        tenantsWithoutPortalCount={tenantsWithoutPortalRes.count ?? 0}
      />
    </>
  )
}

// ── Async section: Revenue chart + Collection panel ────────────────────

async function RevenueSection({ accountId }: { accountId: string }) {
  const supabase = await createClient()
  const { currentPeriod, periods } = getDashboardDates()

  const { previousPeriod } = getDashboardDates()

  const [receiptsLast6Res, paidThisMonthRes, totalThisMonthRes, paidPrevMonthRes] = await Promise.all([
    supabase
      .from('receipts')
      .select('period, snapshot_amount, snapshot_currency, status')
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .in('period', periods),
    supabase
      .from('receipts')
      .select('snapshot_amount, snapshot_currency')
      .eq('account_id', accountId)
      .eq('status', 'paid')
      .eq('period', currentPeriod)
      .is('deleted_at', null),
    supabase
      .from('receipts')
      .select('snapshot_amount, snapshot_currency, status')
      .eq('account_id', accountId)
      .eq('period', currentPeriod)
      .is('deleted_at', null)
      .not('status', 'in', '(cancelled)'),
    supabase
      .from('receipts')
      .select('snapshot_amount')
      .eq('account_id', accountId)
      .eq('status', 'paid')
      .eq('period', previousPeriod)
      .is('deleted_at', null),
  ])

  const receiptsLast6 = (receiptsLast6Res.data ?? []) as {
    period: string
    snapshot_amount: number
    snapshot_currency: string
    status: string
  }[]

  const monthLabels: Record<number, string> = {
    1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
    7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic',
  }

  const revenueData: MonthlyRevenueData[] = periods.map((period) => {
    const monthNum = parseInt(period.split('-')[1], 10)
    const monthReceipts = receiptsLast6.filter((r) => r.period === period)
    const collected = monthReceipts
      .filter((r) => r.status === 'paid')
      .reduce((sum, r) => sum + Number(r.snapshot_amount), 0)
    const pending = monthReceipts
      .filter((r) => r.status !== 'paid' && r.status !== 'cancelled')
      .reduce((sum, r) => sum + Number(r.snapshot_amount), 0)

    return {
      month: period,
      label: monthLabels[monthNum] || period,
      collected,
      pending,
      currency: 'ARS',
    }
  })

  const paidThisMonth = (paidThisMonthRes.data ?? []) as { snapshot_amount: number; snapshot_currency: string }[]
  const allThisMonth = (totalThisMonthRes.data ?? []) as { snapshot_amount: number; snapshot_currency: string; status: string }[]

  const totalCollected = paidThisMonth.reduce((s, r) => s + Number(r.snapshot_amount), 0)
  const totalExpected = allThisMonth.reduce((s, r) => s + Number(r.snapshot_amount), 0)
  const totalReceiptsMonth = allThisMonth.length
  const paidReceiptsMonth = paidThisMonth.length

  const previousCollected = ((paidPrevMonthRes.data ?? []) as { snapshot_amount: number }[])
    .reduce((s, r) => s + Number(r.snapshot_amount), 0)

  return (
    <AnalyticsSection
      revenueData={revenueData}
      revenueCurrency="ARS"
      collectionRate={{
        totalReceipts: totalReceiptsMonth,
        paidReceipts: paidReceiptsMonth,
        totalExpected,
        totalCollected,
        currency: 'ARS',
        previousCollected,
      }}
    />
  )
}

// ── Async section: Occupancy + Alerts ──────────────────────────────────

async function OccupancySection({ accountId }: { accountId: string }) {
  const supabase = await createClient()
  const { now, in60DaysStr, todayStr } = getDashboardDates()

  const [occupiedPropsRes, totalPropsRes, expiringLeasesRes, adjustmentLeasesRes] =
    await Promise.all([
      supabase
        .from('leases')
        .select('property_id')
        .eq('account_id', accountId)
        .eq('status', 'active')
        .is('deleted_at', null),
      supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .is('deleted_at', null),
      supabase
        .from('leases_overview')
        .select('id, property_name, tenant_name, end_date')
        .eq('account_id', accountId)
        .eq('status', 'active')
        .lte('end_date', in60DaysStr)
        .gte('end_date', todayStr)
        .order('end_date', { ascending: true })
        .limit(5),
      supabase
        .from('leases_overview')
        .select(
          'id, property_name, tenant_name, adjustment_type, adjustment_frequency_months, adjustment_percentage, start_date',
        )
        .eq('account_id', accountId)
        .eq('status', 'active')
        .not('adjustment_type', 'is', null)
        .limit(5),
    ])

  const occupiedPropertyIds = new Set(
    ((occupiedPropsRes.data ?? []) as { property_id: string }[]).map((l) => l.property_id),
  )
  const totalProperties = totalPropsRes.count ?? 0
  const occupiedProperties = Math.min(occupiedPropertyIds.size, totalProperties)

  // Build alerts
  const alerts: LeaseAlert[] = []

  const expiringLeases = (expiringLeasesRes.data ?? []) as {
    id: string
    property_name: string
    tenant_name: string
    end_date: string
  }[]
  for (const lease of expiringLeases) {
    const daysLeft = Math.ceil(
      (new Date(lease.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )
    alerts.push({
      id: lease.id,
      propertyName: lease.property_name || 'Sin propiedad',
      tenantName: lease.tenant_name || 'Sin inquilino',
      type: 'expiring',
      date: lease.end_date,
      detail: daysLeft <= 0 ? 'Vencido' : `Vence en ${daysLeft} días`,
    })
  }

  const adjustmentLeases = (adjustmentLeasesRes.data ?? []) as {
    id: string
    property_name: string
    tenant_name: string
    adjustment_type: string
    adjustment_frequency_months: number
    adjustment_percentage: number | null
    start_date: string
  }[]
  for (const lease of adjustmentLeases) {
    if (!lease.adjustment_frequency_months) continue
    const detail = lease.adjustment_percentage
      ? `Aumento: ${lease.adjustment_percentage}%`
      : `Ajuste: ${lease.adjustment_type}`

    const start = new Date(lease.start_date)
    const monthsSinceStart =
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    const nextAdjustmentMonths =
      Math.ceil(monthsSinceStart / lease.adjustment_frequency_months) *
      lease.adjustment_frequency_months
    const nextDate = new Date(start)
    nextDate.setMonth(nextDate.getMonth() + nextAdjustmentMonths)

    const daysUntilAdj = Math.ceil(
      (nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (daysUntilAdj > 0 && daysUntilAdj <= 60) {
      alerts.push({
        id: lease.id,
        propertyName: lease.property_name || 'Sin propiedad',
        tenantName: lease.tenant_name || 'Sin inquilino',
        type: 'adjustment',
        date: nextDate.toISOString().split('T')[0],
        detail,
      })
    }
  }

  alerts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <OccupancyAlertsSection
      occupancy={{ totalProperties, occupiedProperties }}
      alerts={alerts}
    />
  )
}

// ── Async section: Recent activity + Quick actions ─────────────────────

async function RecentActivitySection({ accountId }: { accountId: string }) {
  const supabase = await createClient()

  const recentReceiptsRes = await supabase
    .from('receipts')
    .select('id, period, snapshot_tenant_name, snapshot_amount, snapshot_currency, created_at')
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  const recentReceipts: RecentReceipt[] = ((recentReceiptsRes.data ?? []) as any[]).map((r) => ({
    id: r.id,
    period: r.period,
    snapshot_tenant_name: r.snapshot_tenant_name,
    snapshot_amount: r.snapshot_amount,
    snapshot_currency: r.snapshot_currency,
    email_sent: false,
    created_at: r.created_at,
  }))

  return <ActivitySection recentReceipts={recentReceipts} quickActions={quickActions} />
}

// ── Main page ──────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { user, accountId } = await getCurrentUserWithAccount()

  return (
    <div className="max-w-7xl space-y-5 pb-8">
      <DashboardHeader userEmail={user.email || 'Usuario'} />

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection accountId={accountId} />
      </Suspense>

      <Suspense fallback={null}>
        <AlertsSection accountId={accountId} />
      </Suspense>

      <Suspense fallback={<RevenueChartSkeleton />}>
        <RevenueSection accountId={accountId} />
      </Suspense>

      <Suspense fallback={<OccupancyAlertsSkeleton />}>
        <OccupancySection accountId={accountId} />
      </Suspense>

      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivitySection accountId={accountId} />
      </Suspense>
    </div>
  )
}
