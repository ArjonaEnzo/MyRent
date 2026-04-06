'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
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
  TrendingUp,
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
  value: number
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

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
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
    <div className="space-y-10 max-w-7xl pb-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
      >
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-0.5">
            {greeting()},&nbsp;
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{firstName}</span>
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t.dashboard.title}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full w-fit">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          <span>Resumen actualizado</span>
        </div>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {stats.map((stat) => {
          const Icon = iconMap[stat.icon]
          return (
            <motion.div key={stat.href} variants={itemVariants}>
              <Link href={stat.href} className="group block h-full">
                <Card className="h-full border border-border/60 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
                  <div className={cn('h-1 w-full', stat.accentBg ?? stat.border.replace('border-t-', 'bg-'))} />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                          {stat.label}
                        </p>
                        <p className="mt-2 text-4xl font-bold tabular-nums text-foreground leading-none">
                          {stat.value}
                        </p>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {stat.subtitle}
                        </p>
                      </div>
                      <div
                        className={cn(
                          'rounded-xl p-3 shrink-0 transition-colors duration-200',
                          stat.bg,
                          'group-hover:opacity-90'
                        )}
                      >
                        {Icon ? <Icon className={cn('h-6 w-6', stat.color)} /> : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Quick actions */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.18 }}
        aria-label="Acciones rápidas"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t.dashboard.quickActions.title}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = iconMap[action.icon]
            return (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: 0.22 + index * 0.05 }}
              >
                <Link href={action.href} className="group block">
                  <Card className="border border-border/60 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'rounded-lg p-2.5 shrink-0 transition-colors duration-200',
                              // Use solid bg classes that match the action bg colors
                              action.bg.split(' ')[0]
                            )}
                          >
                            {Icon ? <Icon className={cn('h-5 w-5', action.color)} /> : null}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-tight">
                              {action.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {action.description}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 transition-all duration-200 group-hover:text-muted-foreground group-hover:translate-x-0.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </motion.section>

      {/* Recent activity */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.32 }}
        aria-label="Actividad reciente"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t.dashboard.recentActivity.title}
          </h2>
          {recentReceipts.length > 0 && (
            <Link
              href="/receipts"
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              {t.dashboard.recentActivity.viewAll}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {recentReceipts.length === 0 ? (
          /* Empty state */
          <Card className="border border-dashed border-border/70 shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center gap-3">
              <div className="rounded-2xl bg-muted/70 p-4">
                <FileStack className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Sin actividad reciente</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Cuando generes recibos aparecerán aquí. Comienza creando tu primer recibo.
                </p>
              </div>
              <Link
                href="/receipts/new"
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Generar primer recibo
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-border/60 shadow-sm overflow-hidden">
            <div className="divide-y divide-border/50">
              {recentReceipts.map((receipt, index) => (
                <motion.div
                  key={receipt.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22, delay: 0.36 + index * 0.05 }}
                >
                  <Link
                    href={`/receipts/${receipt.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors group"
                  >
                    {/* Icon */}
                    <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 p-2.5 shrink-0">
                      <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate leading-tight">
                        {receipt.snapshot_tenant_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        Período: {receipt.period}
                      </p>
                    </div>

                    {/* Amount + date */}
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {formatCurrency(receipt.snapshot_amount, receipt.snapshot_currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(receipt.created_at)}
                      </span>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0 transition-all duration-150 group-hover:text-muted-foreground group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </Card>
        )}
      </motion.section>
    </div>
  )
})
