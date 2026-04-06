'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Users, FileText, Plus, UserPlus, Receipt, BarChart3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'
import { memo } from 'react'

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

  return (
    <div className="space-y-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          {t.dashboard.title}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t.dashboard.welcome}, <span className="font-semibold text-emerald-600 dark:text-emerald-400">{userEmail}</span>
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.href}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ y: -4, transition: { duration: 0.15 } }}
          >
            <Link href={stat.href}>
              <Card className={`border-t-4 ${stat.border} hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-900 dark:to-slate-800/30`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.label}</p>
                      <motion.p
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                        className="mt-2 text-4xl font-bold dark:text-slate-100"
                      >
                        {stat.value}
                      </motion.p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{stat.subtitle}</p>
                    </div>
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                      className={`rounded-2xl p-4 ${stat.bg} dark:opacity-90 shadow-lg`}
                    >
                      {(() => {
                        const Icon = iconMap[stat.icon]
                        return Icon ? <Icon className={`h-8 w-8 ${stat.color}`} /> : null
                      })()}
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">{t.dashboard.quickActions.title}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.25 + index * 0.05 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href={action.href}>
                <Card className="hover:shadow-md transition-all duration-300 group cursor-pointer border-slate-200/60 dark:border-slate-700/60 dark:bg-slate-900/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                        className={`rounded-xl p-3 ${action.bg} transition-colors shadow-sm`}
                      >
                        {(() => {
                          const Icon = iconMap[action.icon]
                          return Icon ? <Icon className={`h-6 w-6 ${action.color}`} /> : null
                        })()}
                      </motion.div>
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{action.label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{action.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {recentReceipts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{t.dashboard.recentActivity.title}</h2>
            <Link href="/receipts" className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline font-medium transition-colors">
              {t.dashboard.recentActivity.viewAll}
            </Link>
          </div>
          <Card className="shadow-md border-slate-200/60 dark:border-slate-700/60 dark:bg-slate-900/50">
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentReceipts.map((receipt, index) => (
                  <motion.div
                    key={receipt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.45 + index * 0.05 }}
                    whileHover={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', transition: { duration: 0.15 } }}
                  >
                    <Link
                      href={`/receipts/${receipt.id}`}
                      className="flex items-center justify-between p-4 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/30 p-2.5 shadow-sm">
                          <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{receipt.snapshot_tenant_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{receipt.period}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(receipt.snapshot_amount, receipt.snapshot_currency)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(receipt.created_at).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
})
