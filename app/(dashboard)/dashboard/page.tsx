import { getCurrentUserWithAccount } from '@/lib/supabase/auth'
import { DashboardContent } from '@/components/dashboard/DashboardContent'

export default async function DashboardPage() {
  const { user, accountId, supabase } = await getCurrentUserWithAccount()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [propertiesRes, tenantsRes, receiptsMonthRes, recentReceiptsRes] = await Promise.all([
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
      .select('id, period, snapshot_tenant_name, snapshot_amount, snapshot_currency, created_at')
      .eq('account_id', accountId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const propertiesCount = propertiesRes.count ?? 0
  const tenantsCount = tenantsRes.count ?? 0
  const receiptsThisMonth = receiptsMonthRes.count ?? 0
  const recentReceipts = ((recentReceiptsRes.data ?? []) as any[]).map((r) => ({
    id: r.id,
    period: r.period,
    snapshot_tenant_name: r.snapshot_tenant_name,
    snapshot_amount: r.snapshot_amount,
    snapshot_currency: r.snapshot_currency,
    email_sent: false,
    created_at: r.created_at,
  }))

  const stats = [
    {
      label: 'Propiedades',
      value: propertiesCount,
      subtitle: 'Total registradas',
      icon: 'Building2',
      href: '/properties',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-t-emerald-500',
    },
    {
      label: 'Inquilinos',
      value: tenantsCount,
      subtitle: 'Activos',
      icon: 'Users',
      href: '/tenants',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-t-blue-500',
    },
    {
      label: 'Recibos este mes',
      value: receiptsThisMonth,
      subtitle: 'Generados',
      icon: 'FileText',
      href: '/receipts',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-t-purple-500',
    },
  ]

  const quickActions = [
    {
      label: 'Nueva propiedad',
      description: 'Agrega una propiedad',
      href: '/properties/new',
      icon: 'Plus',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 group-hover:bg-emerald-100',
    },
    {
      label: 'Nuevo inquilino',
      description: 'Registra un inquilino',
      href: '/tenants/new',
      icon: 'UserPlus',
      color: 'text-blue-600',
      bg: 'bg-blue-50 group-hover:bg-blue-100',
    },
    {
      label: 'Generar recibo',
      description: 'Crear recibo de pago',
      href: '/receipts/new',
      icon: 'Receipt',
      color: 'text-purple-600',
      bg: 'bg-purple-50 group-hover:bg-purple-100',
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

  return (
    <DashboardContent
      userEmail={user.email || 'Usuario'}
      stats={stats}
      quickActions={quickActions}
      recentReceipts={recentReceipts}
    />
  )
}
