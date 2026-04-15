'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import type { PlanLimits, QuotaUsage } from '@/lib/subscriptions/plan-limits'

interface AvailablePlan {
  id: string
  name: string
  priceArs: number
  maxProperties: number | null
  maxTenants: number | null
  maxReceiptsPerMonth: number | null
  features: Record<string, boolean>
}

interface Props {
  currentPlan: PlanLimits | null
  usage: QuotaUsage
  availablePlans: AvailablePlan[]
}

const FEATURE_LABELS: Record<string, string> = {
  digital_signatures: 'Firmas digitales',
  online_payments: 'Pagos online (MP)',
  email_support: 'Soporte por email',
  priority_support: 'Soporte prioritario',
}

function formatLimit(n: number | null) {
  return n === null ? 'Ilimitado' : n.toString()
}

function formatPrice(ars: number) {
  if (ars === 0) return 'Gratis'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(ars) + '/mes'
}

function UsageBar({ current, max, label }: { current: number; max: number | null; label: string }) {
  const pct = max === null ? 0 : Math.min(100, (current / max) * 100)
  const near = max !== null && pct >= 80
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={near ? 'text-destructive font-medium' : ''}>
          {current} / {formatLimit(max)}
        </span>
      </div>
      {max !== null && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${near ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function BillingContent({ currentPlan, usage, availablePlans }: Props) {
  const currentPlanId = currentPlan?.planId ?? 'free'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Plan y facturación</h1>
        <p className="text-muted-foreground mt-1">Gestioná tu suscripción y consultá tu uso actual.</p>
      </div>

      {/* Plan actual + uso */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tu plan actual</CardTitle>
            <Badge variant={currentPlan?.status === 'active' ? 'default' : 'secondary'}>
              {currentPlan?.status ?? 'free'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold capitalize">{currentPlanId}</span>
          </div>

          <div className="space-y-3 pt-2">
            <UsageBar current={usage.properties} max={currentPlan?.maxProperties ?? null} label="Propiedades" />
            <UsageBar current={usage.tenants} max={currentPlan?.maxTenants ?? null} label="Inquilinos" />
            <UsageBar
              current={usage.receiptsThisMonth}
              max={currentPlan?.maxReceiptsPerMonth ?? null}
              label="Recibos este mes"
            />
          </div>
        </CardContent>
      </Card>

      {/* Planes disponibles */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Planes disponibles</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {availablePlans.map((plan) => {
            const isCurrent = plan.id === currentPlanId
            return (
              <Card key={plan.id} className={isCurrent ? 'border-primary ring-2 ring-primary/20' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {isCurrent && <Badge>Actual</Badge>}
                  </CardTitle>
                  <p className="text-2xl font-bold">{formatPrice(plan.priceArs)}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                      {formatLimit(plan.maxProperties)} propiedades
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                      {formatLimit(plan.maxTenants)} inquilinos
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                      {formatLimit(plan.maxReceiptsPerMonth)} recibos/mes
                    </li>
                    {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                      <li key={key} className="flex items-center gap-2">
                        {plan.features[key] ? (
                          <Check className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className={plan.features[key] ? '' : 'text-muted-foreground'}>{label}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-4" variant={isCurrent ? 'outline' : 'default'} disabled={isCurrent}>
                    {isCurrent ? 'Plan activo' : plan.priceArs === 0 ? 'Seleccionar' : 'Próximamente'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Los pagos de alquileres de tus inquilinos van directo a tu cuenta Mercado Pago (conectá en{' '}
          <a href="/account" className="underline">
            Mi cuenta
          </a>
          ). MyRent no intermedia en esos cobros.
        </p>
      </div>
    </div>
  )
}
