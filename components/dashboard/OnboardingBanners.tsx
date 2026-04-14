'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { FileClock, UserCog, ArrowRight } from 'lucide-react'

interface OnboardingBannersProps {
  draftLeasesCount: number
  tenantsWithoutPortalCount: number
}

export function OnboardingBanners({
  draftLeasesCount,
  tenantsWithoutPortalCount,
}: OnboardingBannersProps) {
  if (draftLeasesCount <= 0 && tenantsWithoutPortalCount <= 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.04 }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {draftLeasesCount > 0 && (
        <Link
          href="/leases?status=draft"
          className="flex items-center justify-between rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] px-5 py-4 transition-colors hover:bg-sky-500/[0.1]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15">
              <FileClock className="h-4.5 w-4.5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">
                {draftLeasesCount} {draftLeasesCount === 1 ? 'contrato sin activar' : 'contratos sin activar'}
              </p>
              <p className="text-xs text-muted-foreground">
                Completá la activación para empezar a facturar
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        </Link>
      )}

      {tenantsWithoutPortalCount > 0 && (
        <Link
          href="/tenants"
          className="flex items-center justify-between rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] px-5 py-4 transition-colors hover:bg-violet-500/[0.1]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15">
              <UserCog className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-700 dark:text-violet-400">
                {tenantsWithoutPortalCount} {tenantsWithoutPortalCount === 1 ? 'inquilino sin portal' : 'inquilinos sin portal'}
              </p>
              <p className="text-xs text-muted-foreground">
                Invitalos para que paguen online y vean recibos
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </Link>
      )}
    </motion.div>
  )
}
