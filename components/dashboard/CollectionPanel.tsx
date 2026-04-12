'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface CollectionPanelProps {
  totalReceipts: number
  paidReceipts: number
  totalExpected: number
  totalCollected: number
  currency: string
}

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

export function CollectionPanel({
  totalReceipts,
  paidReceipts,
  totalExpected,
  totalCollected,
  currency,
}: CollectionPanelProps) {
  const collectionRate = totalReceipts > 0 ? Math.round((paidReceipts / totalReceipts) * 100) : 0
  const pendingAmount = totalExpected - totalCollected

  return (
    <Card className="border border-border shadow-sm p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Cobranza del mes
      </h3>

      {/* Collection rate ring */}
      <div className="flex items-center gap-5">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeDasharray={`${collectionRate} ${100 - collectionRate}`}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-foreground">{collectionRate}%</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">Cobrado</p>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(totalCollected, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pendiente</p>
            <p className={cn(
              'text-sm font-semibold',
              pendingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
            )}>
              {formatCurrency(pendingAmount, currency)}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {paidReceipts} de {totalReceipts} recibos cobrados
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${collectionRate}%` }}
          />
        </div>
      </div>
    </Card>
  )
}
