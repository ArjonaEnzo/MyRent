'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/card'

export interface MonthlyRevenueData {
  month: string       // "2026-04"
  label: string       // "Abr"
  collected: number   // monto cobrado
  pending: number     // monto pendiente
  currency: string
}

interface MonthlyRevenueChartProps {
  data: MonthlyRevenueData[]
  currency: string
}

const formatAmount = (value: number, currency: string) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(value)

function CustomTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
  currency: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name === 'collected' ? 'Cobrado' : 'Pendiente'}:{' '}
          <span className="font-medium text-foreground">
            {formatAmount(entry.value, currency)}
          </span>
        </p>
      ))}
    </div>
  )
}

export function MonthlyRevenueChart({ data, currency }: MonthlyRevenueChartProps) {
  const hasData = data.some((d) => d.collected > 0 || d.pending > 0)

  return (
    <Card className="border border-border shadow-sm p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ingresos mensuales
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Últimos 6 meses</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-[11px] text-muted-foreground">Cobrado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            <span className="text-[11px] text-muted-foreground">Pendiente</span>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Sin datos de ingresos aún</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} barGap={2}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => formatAmount(v, currency)}
              width={60}
            />
            <Tooltip
              content={<CustomTooltip currency={currency} />}
              cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
            />
            <Bar
              dataKey="collected"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="pending"
              fill="hsl(var(--muted-foreground) / 0.25)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
