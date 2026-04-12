'use client'

import { Card } from '@/components/ui/card'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OccupancyCardProps {
  totalProperties: number
  occupiedProperties: number
}

export function OccupancyCard({ totalProperties, occupiedProperties }: OccupancyCardProps) {
  const vacantCount = totalProperties - occupiedProperties
  const occupancyRate = totalProperties > 0
    ? Math.round((occupiedProperties / totalProperties) * 100)
    : 0

  return (
    <Card className="border border-border shadow-sm p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Ocupación
      </h3>

      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              fill="none"
              stroke={occupancyRate === 100 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.7)'}
              strokeWidth="3"
              strokeDasharray={`${occupancyRate} ${100 - occupancyRate}`}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-foreground">{occupancyRate}%</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm text-foreground">
              <span className="font-semibold">{occupiedProperties}</span> ocupadas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className={cn(
              'h-3.5 w-3.5',
              vacantCount > 0 ? 'text-amber-500' : 'text-muted-foreground',
            )} />
            <span className={cn(
              'text-sm',
              vacantCount > 0 ? 'text-foreground' : 'text-muted-foreground',
            )}>
              <span className="font-semibold">{vacantCount}</span> vacantes
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {totalProperties} propiedades totales
          </p>
        </div>
      </div>
    </Card>
  )
}
