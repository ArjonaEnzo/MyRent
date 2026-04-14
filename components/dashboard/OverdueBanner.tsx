'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertOctagon, ArrowRight } from 'lucide-react'

export interface OverdueTenant {
  tenantId: string
  tenantName: string
  count: number
  total: number
  currency: string
}

interface OverdueBannerProps {
  totalAmount: number
  currency: string
  count: number
  topTenants: OverdueTenant[]
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function OverdueBanner({ totalAmount, currency, count, topTenants }: OverdueBannerProps) {
  if (count <= 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
      className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
            <AlertOctagon className="h-4.5 w-4.5 text-red-600 dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Morosidad acumulada: {formatAmount(totalAmount, currency)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {count} {count === 1 ? 'recibo atrasado' : 'recibos atrasados'} de períodos anteriores
            </p>
          </div>
        </div>
        <Link
          href="/receipts?status=pending"
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
        >
          Ver todos <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {topTenants.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-red-500/10 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Inquilinos con más atraso
          </p>
          {topTenants.map((t) => (
            <div
              key={t.tenantId}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="truncate text-foreground">{t.tenantName}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {t.count} {t.count === 1 ? 'recibo' : 'recibos'} ·{' '}
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {formatAmount(t.total, t.currency)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
