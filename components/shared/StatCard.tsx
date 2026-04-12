'use client'

import Link from 'next/link'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { NumberTicker } from '@/components/ui/number-ticker'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: number | string
  subtitle?: string
  icon: React.ReactNode
  href?: string
  tone?: 'primary' | 'emerald' | 'sky' | 'violet' | 'amber' | 'rose'
  trend?: { direction: 'up' | 'down'; value: string }
  prefix?: string
  suffix?: string
  className?: string
}

const toneStyles: Record<
  NonNullable<StatCardProps['tone']>,
  { bg: string; fg: string; ring: string; glow: string }
> = {
  primary: {
    bg: 'bg-primary/10',
    fg: 'text-primary',
    ring: 'ring-primary/20',
    glow: 'bg-primary/20',
  },
  emerald: {
    bg: 'bg-primary/10',
    fg: 'text-primary',
    ring: 'ring-primary/20',
    glow: 'bg-primary/15',
  },
  sky: {
    bg: 'bg-sky-500/10',
    fg: 'text-sky-600 dark:text-sky-400',
    ring: 'ring-sky-500/20',
    glow: 'bg-sky-500/15',
  },
  violet: {
    bg: 'bg-violet-500/10',
    fg: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-500/20',
    glow: 'bg-violet-500/15',
  },
  amber: {
    bg: 'bg-primary/10',
    fg: 'text-primary',
    ring: 'ring-primary/20',
    glow: 'bg-primary/15',
  },
  rose: {
    bg: 'bg-destructive/10',
    fg: 'text-destructive',
    ring: 'ring-destructive/20',
    glow: 'bg-destructive/15',
  },
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  href,
  tone = 'primary',
  trend,
  prefix,
  suffix,
  className,
}: StatCardProps) {
  const styles = toneStyles[tone]
  const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/[^\d.-]/g, ''))
  const isNumeric = Number.isFinite(numericValue)

  const content = (
    <div
      className={cn(
        'group relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200',
        href && 'hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100',
          styles.glow,
        )}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-3xl font-extrabold tabular-nums text-foreground leading-none">
            {isNumeric ? (
              <NumberTicker value={numericValue} prefix={prefix} suffix={suffix} />
            ) : (
              <>{prefix}{value}{suffix}</>
            )}
          </p>
          {subtitle && (
            <p className="mt-2 text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
          {trend && (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                trend.direction === 'up'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {trend.direction === 'up' ? (
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              ) : (
                <ArrowDownRight className="h-3 w-3" aria-hidden />
              )}
              {trend.value}
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-transform group-hover:scale-105 [&>svg]:h-5 [&>svg]:w-5',
            styles.bg,
            styles.ring,
            styles.fg,
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`${label}: ${value}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 rounded-2xl"
      >
        {content}
      </Link>
    )
  }

  return content
}
