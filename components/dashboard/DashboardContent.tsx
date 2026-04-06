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
    <div className="space-y-6 max-w-7xl pb-8">
      {/* Page header — compact, utility-focused, not marketing */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
            {t.dashboard.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {greeting()},{' '}
            <span className="font-medium text-foreground">{firstName}</span>
          </p>
        </div>
        {/* Pill badge — high-contrast border so it reads in light mode */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full w-fit shrink-0">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Actualizado</span>
        </div>
      </motion.div>

      {/* Stat cards — 1 col on mobile, 2 on sm, 3 on lg */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {stats.map((stat) => {
          const Icon = iconMap[stat.icon]
          return (
            <motion.div key={stat.href} variants={itemVariants}>
              <Link href={stat.href} className="group block h-full" aria-label={`${stat.label}: ${stat.value}`}>
                <Card className="h-full border border-border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
                  {/* Accent bar */}
                  <div className={cn('h-[3px] w-full', stat.accentBg)} />
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      {/* Icon box — left-aligned on mobile for better density */}
                      <div
                        className={cn(
                          'rounded-lg p-2.5 shrink-0 transition-opacity duration-200 group-hover:opacity-80',
                          stat.bg
                        )}
                      >
                        {Icon ? <Icon className={cn('h-5 w-5', stat.color)} aria-hidden /> : null}
                      </div>
                      {/* Numbers on the right for scan-ability */}
                      <div className="flex-1 text-right min-w-0">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-3xl font-bold tabular-nums text-foreground leading-none">
                          {stat.value}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground truncate">
                          {stat.subtitle}
                        </p>
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
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.16 }}
        aria-label="Acciones rápidas"
      >
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t.dashboard.quickActions.title}
        </h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => {
            const Icon = iconMap[action.icon]
            return (
              <motion.div
                key={action.href}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: 0.20 + index * 0.05 }}
              >
                <Link href={action.href} className="group block">
                  <Card className="border border-border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer">
                    <CardContent className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'rounded-lg p-2 shrink-0',
                            action.bg.split(' ')[0]
                          )}
                        >
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
                        {/* Arrow always visible at adequate contrast, brighter on hover */}
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-all duration-200 group-hover:text-foreground group-hover:translate-x-0.5"
                          aria-hidden
                        />
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
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.30 }}
        aria-label="Actividad reciente"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t.dashboard.recentActivity.title}
          </h2>
          {recentReceipts.length > 0 && (
            <Link
              href="/receipts"
              className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline-offset-2 hover:underline transition-colors"
            >
              {t.dashboard.recentActivity.viewAll}
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          )}
        </div>

        {recentReceipts.length === 0 ? (
          /* Empty state */
          <Card className="border border-dashed border-border shadow-none bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="rounded-2xl bg-muted p-4">
                <FileStack className="h-7 w-7 text-muted-foreground" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Sin actividad reciente</p>
                <p className="text-xs text-muted-foreground max-w-[260px]">
                  Cuando generes recibos aparecerán aquí.
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
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.34 + index * 0.045 }}
                >
                  <Link
                    href={`/receipts/${receipt.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
                  >
                    {/* Icon */}
                    <div className="rounded-lg bg-violet-100 dark:bg-violet-900/30 p-2 shrink-0">
                      <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" aria-hidden />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate leading-tight">
                        {receipt.snapshot_tenant_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {receipt.period}
                      </p>
                    </div>

                    {/* Amount + date */}
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {formatCurrency(receipt.snapshot_amount, receipt.snapshot_currency)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatRelativeDate(receipt.created_at)}
                      </span>
                    </div>

                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground/50 shrink-0 transition-all duration-150 group-hover:text-foreground group-hover:translate-x-0.5"
                      aria-hidden
                    />
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
