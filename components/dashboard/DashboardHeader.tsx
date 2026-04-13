'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Plus, Receipt } from 'lucide-react'
import { useLanguage } from '@/components/providers/language-provider'

interface DashboardHeaderProps {
  userEmail: string
}

export function DashboardHeader({ userEmail }: DashboardHeaderProps) {
  const { t } = useLanguage()

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const firstName = userEmail.split('@')[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-xs text-muted-foreground">
          {greeting()},{' '}
          <span className="font-medium text-foreground">{firstName}</span>
        </p>
        <h1 className="text-base font-semibold tracking-tight text-foreground leading-snug">
          {t.dashboard.title}
        </h1>
      </div>

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
          className="h-8 text-xs gap-1.5"
        >
          <Link href="/receipts/new">
            <Receipt className="h-3.5 w-3.5" aria-hidden />
            Nuevo recibo
          </Link>
        </Button>
      </div>
    </motion.div>
  )
}
