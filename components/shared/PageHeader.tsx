import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  icon?: LucideIcon
  action?: React.ReactNode
  backHref?: string
  backLabel?: string
  className?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  action,
  backHref,
  backLabel = 'Volver',
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {backLabel}
        </Link>
      )}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/40 p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            {Icon && (
              <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 text-primary">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {eyebrow}
                </p>
              )}
              <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
                {title}
              </h1>
              {description && (
                <p className="text-muted-foreground mt-1 text-sm">{description}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
    </div>
  )
}
