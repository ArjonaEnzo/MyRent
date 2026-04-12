'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { CalendarClock, TrendingUp, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LeaseAlert {
  id: string
  propertyName: string
  tenantName: string
  type: 'expiring' | 'adjustment'
  date: string       // ISO date
  detail?: string    // e.g. "Aumento: 10%" or "Vence en 15 días"
}

interface OperationalAlertsProps {
  alerts: LeaseAlert[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })
}

function daysUntil(iso: string) {
  const diff = Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )
  return diff
}

export function OperationalAlerts({ alerts }: OperationalAlertsProps) {
  if (alerts.length === 0) return null

  return (
    <Card className="border border-border shadow-sm p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Alertas operativas
      </h3>

      <div className="space-y-1">
        {alerts.map((alert) => {
          const days = daysUntil(alert.date)
          const isExpiring = alert.type === 'expiring'
          const isUrgent = isExpiring && days <= 15

          return (
            <Link
              key={`${alert.type}-${alert.id}`}
              href={`/leases`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors group"
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  isExpiring
                    ? isUrgent
                      ? 'bg-destructive/10'
                      : 'bg-amber-500/10'
                    : 'bg-sky-500/10',
                )}
              >
                {isExpiring ? (
                  <CalendarClock
                    className={cn(
                      'h-4 w-4',
                      isUrgent
                        ? 'text-destructive'
                        : 'text-amber-600 dark:text-amber-400',
                    )}
                  />
                ) : (
                  <TrendingUp className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate leading-tight">
                  {alert.propertyName}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {alert.tenantName} · {alert.detail || formatDate(alert.date)}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    isExpiring
                      ? isUrgent
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
                  )}
                >
                  {isExpiring
                    ? days <= 0
                      ? 'Vencido'
                      : `${days}d`
                    : formatDate(alert.date)}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
