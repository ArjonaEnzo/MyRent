'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { FileStack, ArrowRight } from 'lucide-react'

interface DraftReceiptsBannerProps {
  draftReceiptsCount: number
}

export function DraftReceiptsBanner({ draftReceiptsCount }: DraftReceiptsBannerProps) {
  if (draftReceiptsCount <= 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.03 }}
    >
      <Link
        href="/receipts?status=draft"
        className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-5 py-4 transition-colors hover:bg-amber-500/[0.1]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15">
            <FileStack className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {draftReceiptsCount} {draftReceiptsCount === 1 ? 'borrador pendiente' : 'borradores pendientes'}
            </p>
            <p className="text-xs text-muted-foreground">
              Recibos auto-generados listos para revisión
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </Link>
    </motion.div>
  )
}
