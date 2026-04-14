import type { Metadata } from 'next'
import { getCurrentTenant } from '@/lib/supabase/tenant-auth'
import { PayReceiptButton } from '@/components/tenant/PayReceiptButton'
import { ExpandableList } from '@/components/tenant/ExpandableList'
import { env } from '@/lib/env'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import {
  MapPin,
  CalendarDays,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  LayoutDashboard,
  DollarSign,
  Receipt,
  TrendingUp,
  Bell,
} from 'lucide-react'
import type { Database } from '@/types/database.types'
import { formatPeriod, formatDate } from '@/lib/utils/format'
import {
  computeNextBillingDate,
  computeNextAdjustmentDate,
  formatBillingDayMonth,
  daysUntilBillingDay,
  computeLeaseProgress,
} from '@/lib/utils/lease-billing'
import { DownloadYearReceiptsButton } from '@/components/tenant/DownloadYearReceiptsButton'

export const metadata: Metadata = {
  title: 'Mi Dashboard | MyRent',
  description: 'Panel del inquilino con contratos, recibos y pagos.',
}

// Cache 30s — tenant needs near-real-time payment status visibility.
// Webhook MP revalidates tenant paths on payment confirmed.
export const revalidate = 30

type LeaseOverview = Database['public']['Views']['leases_overview']['Row']
type ReceiptRow = Database['public']['Tables']['receipts']['Row']

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

type StatusConfig = {
  label: string
  color: string
  bg: string
  icon: React.ElementType
}

const STATUS_MAP: Record<string, StatusConfig> = {
  draft:             { label: 'Borrador',  color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: Clock },
  generated:         { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Clock },
  sent:              { label: 'Enviado',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  icon: Clock },
  signature_pending: { label: 'En firma',  color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: Clock },
  signed:            { label: 'Firmado',   color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: CheckCircle2 },
  paid:              { label: 'Pagado',    color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle2 },
  cancelled:         { label: 'Cancelado', color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: XCircle },
  failed:            { label: 'Fallido',   color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: XCircle },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? {
    label: status,
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.1)',
    icon: Clock,
  }
  const Icon = cfg.icon
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

export default async function TenantDashboardPage() {
  const { tenantId, accountId, supabase } = await getCurrentTenant()
  const mpEnabled = Boolean(env.MERCADOPAGO_ACCESS_TOKEN)

  const { data: leases } = await supabase
    .from('leases_overview')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })

  const { data: receipts } = await supabase
    .from('receipts')
    .select('id, period, status, snapshot_amount, snapshot_currency, pdf_url, created_at')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  // Filtrar borradores: el inquilino solo ve recibos finalizados (no drafts)
  const pendingReceipts = (receipts ?? []).filter(
    (r) => !['draft', 'paid', 'cancelled'].includes(r.status)
  )
  const paidReceipts = (receipts ?? []).filter((r) => r.status === 'paid')
  const signaturePending = (receipts ?? []).filter((r) => r.status === 'signature_pending')
  const currentYear = new Date().getFullYear()
  const hasPaidThisYear = paidReceipts.some((r) => r.period.startsWith(`${currentYear}-`))

  const totalPending = pendingReceipts.reduce((sum, r) => sum + (r.snapshot_amount ?? 0), 0)
  const pendingCurrency = pendingReceipts[0]?.snapshot_currency ?? 'ARS'

  return (
    <div className="space-y-8">
      <PageHeader
        icon={LayoutDashboard}
        eyebrow="Portal"
        title="Mi dashboard"
        description="Resumen de tus contratos y pagos"
      />

      {signaturePending.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">
              {signaturePending.length === 1
                ? 'Tenés un documento pendiente de firma'
                : `Tenés ${signaturePending.length} documentos pendientes de firma`}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Revisá el recibo en la sección de pendientes y completá la firma digital.
            </p>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total pendiente"
          value={`${pendingCurrency} ${formatAmount(totalPending)}`}
          icon={<DollarSign aria-hidden />}
          tone="amber"
        />
        <StatCard
          label="Recibos pendientes"
          value={String(pendingReceipts.length)}
          icon={<Receipt aria-hidden />}
          tone="sky"
        />
        <StatCard
          label="Contratos activos"
          value={String(leases?.length ?? 0)}
          icon={<MapPin aria-hidden />}
          tone="primary"
        />
      </div>

      {/* Active leases */}
      <section>
        <SectionHeader icon={MapPin} title="Contratos activos" />

        {!leases?.length ? (
          <EmptyState
            icon={MapPin}
            title="Sin contratos activos"
            description="No tenés contratos activos."
          />
        ) : (
          <div className="space-y-3">
            {(leases as LeaseOverview[]).map((lease) => (
              <div
                key={lease.id}
                className="rounded-2xl border border-border/60 bg-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {lease.property_name ?? 'Propiedad'}
                    </p>
                    {lease.property_address && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {lease.property_address}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-bold tabular-nums text-foreground">
                      {formatAmount(lease.rent_amount ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lease.currency ?? 'ARS'}/mes
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>
                      Desde {formatDate(lease.start_date as string)}
                      {lease.end_date
                        ? ` · Hasta ${formatDate(lease.end_date as string)}`
                        : ' · Sin fecha de fin'}
                    </span>
                  </div>

                  {/* Contract progress */}
                  {(() => {
                    const progress = computeLeaseProgress(
                      lease.start_date as string,
                      lease.end_date,
                    )
                    if (!progress) return null
                    return (
                      <div className="mt-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Mes {progress.monthsElapsed} de {progress.totalMonths}
                          </span>
                          <span className="tabular-nums">{progress.percent}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })()}

                  {/* Next billing date with countdown */}
                  {lease.billing_day && lease.auto_billing_enabled && (() => {
                    const days = daysUntilBillingDay(lease.billing_day)
                    const tone =
                      days <= 5
                        ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                        : days <= 15
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'bg-primary/10 text-primary'
                    return (
                      <div
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${tone}`}
                      >
                        <Bell className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Próximo cobro: {formatBillingDayMonth(computeNextBillingDate(lease.billing_day))}
                          {' · '}
                          {days === 0
                            ? 'hoy'
                            : days === 1
                              ? 'mañana'
                              : `en ${days} días`}
                        </span>
                      </div>
                    )
                  })()}

                  {/* Upcoming adjustment alert */}
                  {lease.adjustment_type && lease.adjustment_frequency_months && lease.start_date && (() => {
                    const nextAdj = computeNextAdjustmentDate(
                      lease.start_date,
                      lease.adjustment_frequency_months,
                    )
                    if (!nextAdj) return null
                    const daysUntil = Math.ceil((nextAdj.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    if (daysUntil > 60 || daysUntil < 0) return null
                    return (
                      <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-400">
                        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Ajuste de alquiler el {formatBillingDayMonth(nextAdj)}
                          {lease.adjustment_type === 'percentage' && lease.adjustment_percentage
                            ? ` (+${lease.adjustment_percentage}%)`
                            : lease.adjustment_type === 'index' && lease.adjustment_index
                              ? ` (${lease.adjustment_index})`
                              : ''}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending receipts */}
      <section>
        <SectionHeader
          icon={FileText}
          title="Recibos pendientes"
          badge={pendingReceipts.length > 0 ? pendingReceipts.length : undefined}
        />

        {!pendingReceipts.length ? (
          <EmptyState
            icon={CheckCircle2}
            title="Todo al día"
            description="No tenés recibos pendientes."
          />
        ) : (
          <div className="space-y-3">
            {(pendingReceipts as ReceiptRow[]).map((receipt) => (
              <div
                key={receipt.id}
                className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold capitalize text-foreground">
                      {formatPeriod(receipt.period)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StatusBadge status={receipt.status} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-bold tabular-nums text-foreground">
                      {formatAmount(receipt.snapshot_amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {receipt.snapshot_currency}
                    </p>
                  </div>
                </div>

                {(receipt.pdf_url || mpEnabled) && (
                  <div className="mt-4 flex items-center gap-3 border-t border-amber-500/10 pt-4">
                    {receipt.pdf_url && (
                      <a
                        href={receipt.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground"
                      >
                        <FileText className="h-3 w-3" />
                        Ver PDF
                      </a>
                    )}
                    {mpEnabled && (
                      <PayReceiptButton
                        receiptId={receipt.id}
                        amount={receipt.snapshot_amount}
                        currency={receipt.snapshot_currency}
                        period={receipt.period}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payment history */}
      {paidReceipts.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Historial de pagos
              </h2>
            </div>
            {hasPaidThisYear && <DownloadYearReceiptsButton year={currentYear} />}
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <ExpandableList
              initialCount={6}
              showMoreLabel="Ver todo el historial"
              showLessLabel="Ver menos"
              items={(paidReceipts as ReceiptRow[]).map((receipt) => (
                <PaidReceiptRow key={receipt.id} receipt={receipt} />
              ))}
            />
          </div>
        </section>
      )}
    </div>
  )
}

function PaidReceiptRow({ receipt }: { receipt: ReceiptRow }) {
  return (
    <div className="flex items-center justify-between border-t border-border/40 first:border-t-0 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/[0.12]">
          <CheckCircle2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium capitalize text-foreground">
            {formatPeriod(receipt.period)}
          </p>
          <p className="text-xs text-muted-foreground">
            Pagado
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {receipt.snapshot_currency} {formatAmount(receipt.snapshot_amount)}
        </span>
        {receipt.pdf_url && (
          <a
            href={receipt.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-opacity hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: React.ElementType
  title: string
  badge?: number
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {badge !== undefined && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-black">
          {badge}
        </span>
      )}
    </div>
  )
}
