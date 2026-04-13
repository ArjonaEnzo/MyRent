'use client'

import { motion } from 'framer-motion'
import { Building2, Users, FileText, Plus, UserPlus, Receipt, BarChart3 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'

const iconToTone: Record<string, 'primary' | 'emerald' | 'sky' | 'violet' | 'amber' | 'rose'> = {
  Building2: 'primary',
  Users: 'sky',
  FileText: 'primary',
  Receipt: 'primary',
  BarChart3: 'amber',
}

const iconMap: Record<string, LucideIcon> = {
  Building2,
  Users,
  FileText,
  Plus,
  UserPlus,
  Receipt,
  BarChart3,
}

export interface Stat {
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

interface StatsRowProps {
  stats: Stat[]
}

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
    >
      {stats.map((stat) => {
        const Icon = iconMap[stat.icon] ?? Building2
        return (
          <StatCard
            key={stat.href}
            label={stat.label}
            value={stat.value}
            subtitle={stat.subtitle}
            icon={<Icon aria-hidden />}
            href={stat.href}
            tone={iconToTone[stat.icon] ?? 'primary'}
          />
        )
      })}
    </motion.div>
  )
}
