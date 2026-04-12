import type { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden border-dashed border-border/70 bg-gradient-to-br from-muted/30 via-card to-muted/20 shadow-none',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06),transparent_70%)]"
      />
      <CardContent className="relative flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-5">
          <div
            aria-hidden
            className="absolute inset-0 -m-2 rounded-full bg-primary/10 blur-md"
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-card text-primary ring-1 ring-primary/20 shadow-sm">
            <Icon className="h-7 w-7" aria-hidden />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-muted-foreground mt-1.5 max-w-sm text-sm leading-relaxed">
          {description}
        </p>
        {action && <div className="mt-6">{action}</div>}
      </CardContent>
    </Card>
  )
}
