'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Users,
  FileText,
  Plus,
  UserPlus,
  Receipt,
  BarChart3,
  ArrowRight,
  FileStack,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'
import { memo } from 'react'
import { cn } from '@/lib/utils'

const iconMap: Record<string, LucideIcon> = {
  Building2,
  Users,
  FileText,
  Plus,
  UserPlus,
  Receipt,
  BarChart3,
}

interface Stat {
  label: string
  value: number | string
  subtitle: string
  icon: string
  href: string
  color: string
  bg: string
  border: string
  accentBg?: string
}

interface QuickAction {
  label: string
  description: string
  href: string
  icon: string
  color: string
  bg: string
}

interface RecentReceipt {
  id: string
  period: string
  snapshot_tenant_name: string
  snapshot_amount: number
  snapshot_currency: string
  email_sent: boolean
  created_at: string
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'ARS' ? 0 : 2,
  }).format(amount)
}

const formatRelativeDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

interface DashboardContentProps {
  userEmail: string
  stats: Stat[]
  quickActions: QuickAction[]
  recentReceipts: RecentReceipt[]
}

export const DashboardContent = memo(function DashboardContent({
  userEmail,
  stats,
  quickActions,
  recentReceipts,
}: DashboardContentProps) {
  const { t } = useLanguage()

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const firstName = userEmail.split('@')[0]

  return (
    <div className="max-w-7xl space-y-5 pb-8">

      {/* ── Workspace header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        {/* Left: greeting + context */}
        <div>
          <p className="text-xs text-muted-foreground">
            {greeting()},{' '}
            <span className="font-medium text-foreground">{firstName}</span>
          </p>
          <h1 className="text-base font-semibold tracking-tight text-foreground leading-snug">
            {t.dashboard.title}
          </h1>
        </div>

        {/* Right: primary CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5">
            <Link href="/properties/new">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Nueva propiedad
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-emerald-500"
          >
            <Link href="/receipts/new">
              <Receipt className="h-3.5 w-3.5" aria-hidden />
              Nuevo recibo
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* ── Metrics row ──────────────────────────────────────────────── */}
      {/* Horizontally scrollable on mobile; 3-up on sm+ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
      >
        {stats.map((stat) => {
          const Icon = iconMap[stat.icon]
          return (
            <Link
              key={stat.href}
              href={stat.href}
              className="group block"
              aria-label={`${stat.label}: ${stat.value}`}
            >
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm transition-all duration-150 hover:shadow-md hover:-translate-y-px">
                {/* Icon */}
                <div className={cn('rounded-md p-2 shrink-0', stat.bg)}>
                  {Icon ? <Icon className={cn('h-4 w-4', stat.color)} aria-hidden /> : null}
                </div>
                {/* Value + label */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">
                    {stat.label}
                  </p>
                  <p className="text-xl font-bold tabular-nums text-foreground leading-none mt-0.5">
                    {stat.value}
                  </p>
                </div>
                {/* Subtitle on the far right — hidden on very small screens */}
                <p className="hidden md:block text-xs text-muted-foreground shrink-0">
                  {stat.subtitle}
                </p>
              </div>
            </Link>
          )
        })}
      </motion.div>

      {/* ── Main content: activity (2/3) + actions (1/3) ─────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        {/* Recent activity — takes 2/3 on desktop */}
        <section
          className="lg:col-span-2 flex flex-col gap-2"
          aria-label="Actividad reciente"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t.dashboard.recentActivity.title}
            </h2>
            {recentReceipts.length > 0 && (
              <Link
                href="/receipts"
                className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-2 transition-colors"
              >
                {t.dashboard.recentActivity.viewAll}
                <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            )}
          </div>

          {recentReceipts.length === 0 ? (
            <Card className="border border-dashed border-border bg-transparent shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="rounded-xl bg-muted p-3">
                  <FileStack className="h-6 w-6 text-muted-foreground" aria-hidden />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Sin actividad reciente</p>
                  <p className="text-xs text-muted-foreground max-w-[240px]">
                    Los recibos generados aparecerán aquí.
                  </p>
                </div>
                <Link
                  href="/receipts/new"
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Generar primer recibo
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border shadow-sm overflow-hidden">
              <div className="divide-y divide-border">
                {recentReceipts.map((receipt, index) => (
                  <motion.div
                    key={receipt.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18, delay: 0.12 + index * 0.04 }}
                  >
                    <Link
                      href={`/receipts/${receipt.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
                    >
                      {/* Icon */}
                      <div className="rounded-md bg-violet-100 dark:bg-violet-900/30 p-2 shrink-0">
                        <FileText className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" aria-hidden />
                      </div>

                      {/* Tenant + period */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate leading-tight">
                          {receipt.snapshot_tenant_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {receipt.period}
                        </p>
                      </div>

                      {/* Amount + relative date */}
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {formatCurrency(receipt.snapshot_amount, receipt.snapshot_currency)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatRelativeDate(receipt.created_at)}
                        </span>
                      </div>

                      <ArrowRight
                        className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-all duration-150 group-hover:text-foreground group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </Card>
          )}
        </section>

        {/* Quick actions — takes 1/3 on desktop */}
        <section className="flex flex-col gap-2" aria-label="Acciones rápidas">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t.dashboard.quickActions.title}
          </h2>
          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {quickActions.map((action) => {
                const Icon = iconMap[action.icon]
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className={cn('rounded-md p-2 shrink-0', action.bg.split(' ')[0])}>
                      {Icon ? <Icon className={cn('h-4 w-4', action.color)} aria-hidden /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">
                        {action.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight
                      className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-all duration-150 group-hover:text-foreground group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                )
              })}
            </div>
          </Card>
        </section>
      </motion.div>

    </div>
  )
})
