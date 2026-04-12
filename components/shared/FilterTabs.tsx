import Link from 'next/link'

import { cn } from '@/lib/utils'

export interface FilterTab {
  label: string
  href: string
  active: boolean
  count?: number
}

interface FilterTabsProps {
  tabs: FilterTab[]
  className?: string
  'aria-label'?: string
}

export function FilterTabs({ tabs, className, ...props }: FilterTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={props['aria-label'] ?? 'Filtros'}
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border border-border/60 bg-muted/50 p-1 backdrop-blur-sm',
        className,
      )}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          role="tab"
          aria-selected={tab.active}
          className={cn(
            'relative inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            tab.active
              ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
          {typeof tab.count === 'number' && tab.count > 0 && (
            <span
              className={cn(
                'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
                tab.active
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted-foreground/15 text-muted-foreground',
              )}
            >
              {tab.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}
