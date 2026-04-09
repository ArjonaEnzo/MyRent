import { getCurrentTenant } from '@/lib/supabase/tenant-auth'
import { PayReceiptButton } from '@/components/tenant/PayReceiptButton'
import { env } from '@/lib/env'
import {
  MapPin,
  CalendarDays,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
} from 'lucide-react'
import type { Database } from '@/types/database.types'
import { formatCurrency, formatPeriod, formatDate } from '@/lib/utils/format'

type LeaseOverview = Database['public']['Views']['leases_overview']['Row']
type ReceiptRow = Database['public']['Tables']['receipts']['Row']

// Formatea solo el número (sin símbolo de moneda) — la UI muestra el símbolo por separado
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

// ── Page ───────────────────────────────────────────────────────────────────

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
    .limit(12)

  const pendingReceipts = (receipts ?? []).filter(
    (r) => !['paid', 'cancelled'].includes(r.status)
  )
  const paidReceipts = (receipts ?? []).filter((r) => r.status === 'paid')

  const totalPending = pendingReceipts.reduce((sum, r) => sum + (r.snapshot_amount ?? 0), 0)
  const pendingCurrency = pendingReceipts[0]?.snapshot_currency ?? 'ARS'

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 text-slate-200">

      {/* ── Summary hero ── */}
      {pendingReceipts.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 to-emerald-600/[0.08] p-6">
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.15)_0%,transparent_70%)]" />
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/70">
            Total pendiente
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-medium text-emerald-400/60">
              {pendingCurrency}
            </span>
            <span className="text-4xl font-bold tabular-nums tracking-tight text-white">
              {formatAmount(totalPending)}
            </span>
          </div>
          <p className="mt-1 text-xs text-white/35">
            {pendingReceipts.length === 1
              ? '1 recibo sin pagar'
              : `${pendingReceipts.length} recibos sin pagar`}
          </p>
        </div>
      )}

      {/* ── Active leases ── */}
      <section>
        <SectionHeader icon={MapPin} title="Contratos activos" />

        {!leases?.length ? (
          <EmptyState message="No tenés contratos activos." />
        ) : (
          <div className="space-y-3">
            {(leases as LeaseOverview[]).map((lease) => (
              <div
                key={lease.id}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {lease.property_name ?? 'Propiedad'}
                    </p>
                    {lease.property_address && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-white/40">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {lease.property_address}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-bold tabular-nums text-white">
                      {formatAmount(lease.rent_amount ?? 0)}
                    </p>
                    <p className="text-xs text-white/35">
                      {lease.currency ?? 'ARS'}/mes
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs text-white/35">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>
                    Desde {formatDate(lease.start_date as string)}
                    {lease.end_date
                      ? ` · Hasta ${formatDate(lease.end_date as string)}`
                      : ' · Sin fecha de fin'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Pending receipts ── */}
      <section>
        <SectionHeader
          icon={FileText}
          title="Recibos pendientes"
          badge={pendingReceipts.length > 0 ? pendingReceipts.length : undefined}
        />

        {!pendingReceipts.length ? (
          <EmptyState message="Todo al día. No tenés recibos pendientes." check />
        ) : (
          <div className="space-y-3">
            {(pendingReceipts as ReceiptRow[]).map((receipt) => (
              <div
                key={receipt.id}
                className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold capitalize text-white">
                      {formatPeriod(receipt.period)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StatusBadge status={receipt.status} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-bold tabular-nums text-white">
                      {formatAmount(receipt.snapshot_amount)}
                    </p>
                    <p className="text-xs text-white/35">
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
                        className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/60 transition-all hover:opacity-80"
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

      {/* ── Payment history ── */}
      {paidReceipts.length > 0 && (
        <section>
          <SectionHeader icon={CheckCircle2} title="Historial de pagos" />
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025]">
            {(paidReceipts as ReceiptRow[]).map((receipt) => (
              <div
                key={receipt.id}
                className="flex items-center justify-between border-t border-white/[0.05] px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/[0.12]">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize text-white">
                      {formatPeriod(receipt.period)}
                    </p>
                    <p className="text-xs text-white/35">
                      Pagado
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-white">
                    {receipt.snapshot_currency} {formatAmount(receipt.snapshot_amount)}
                  </span>
                  {receipt.pdf_url && (
                    <a
                      href={receipt.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/25 transition-opacity hover:opacity-70"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

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
      <Icon className="h-4 w-4 text-white/30" />
      <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
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

function EmptyState({ message, check }: { message: string; check?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-5 py-4">
      {check && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
      <p className="text-sm text-white/35">{message}</p>
    </div>
  )
}
