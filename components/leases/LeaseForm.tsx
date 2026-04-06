'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createLease, updateLease } from '@/lib/actions/leases'
import type { Database } from '@/types/database.types'

type Property = Pick<Database['public']['Tables']['properties']['Row'], 'id' | 'name' | 'address'>
type Tenant = Pick<Database['public']['Tables']['tenants']['Row'], 'id' | 'full_name'>

interface LeaseFormProps {
  properties: Property[]
  tenants: Tenant[]
  lease?: {
    id: string
    property_id: string
    tenant_id: string
    start_date: string
    end_date: string | null
    rent_amount: number
    currency: string
    notes: string | null
    adjustment_type?: string | null
    adjustment_frequency_months?: number | null
    adjustment_percentage?: number | null
    adjustment_index?: string | null
    adjustment_fixed_amount?: number | null
  }
}

const ADJUSTMENT_LABELS: Record<string, string> = {
  none: 'Sin ajuste',
  percentage: 'Porcentaje fijo',
  index: 'Índice (ICL, IPC, etc.)',
  fixed_amount: 'Monto fijo de aumento',
}

const INDEX_OPTIONS = ['ICL', 'IPC', 'CER', 'CVS', 'UVA']

export function LeaseForm({ properties, tenants, lease }: LeaseFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [adjustmentType, setAdjustmentType] = useState<string>(
    lease?.adjustment_type ?? 'none'
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const data = new FormData(form)

    const adjType = data.get('adjustment_type') as string
    const adjFreq = data.get('adjustment_frequency_months')
    const adjPct = data.get('adjustment_percentage')
    const adjFixed = data.get('adjustment_fixed_amount')

    const formData = {
      property_id: data.get('property_id') as string,
      tenant_id: data.get('tenant_id') as string,
      start_date: data.get('start_date') as string,
      end_date: (data.get('end_date') as string) || undefined,
      rent_amount: Number(data.get('rent_amount')),
      currency: data.get('currency') as 'ARS' | 'USD',
      notes: (data.get('notes') as string) || undefined,
      adjustment_type: adjType as 'none' | 'percentage' | 'index' | 'fixed_amount',
      adjustment_frequency_months: adjFreq ? Number(adjFreq) : undefined,
      adjustment_percentage: adjPct ? Number(adjPct) : undefined,
      adjustment_index: (data.get('adjustment_index') as 'ICL' | 'IPC' | 'CER' | 'CVS' | 'UVA' | null) || undefined,
      adjustment_fixed_amount: adjFixed ? Number(adjFixed) : undefined,
    }

    const result = lease
      ? await updateLease(lease.id, formData)
      : await createLease(formData)

    setLoading(false)

    if (result && !result.success) {
      setError(result.error ?? 'Error al guardar el contrato')
    }
  }

  const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Propiedad */}
      <div className="space-y-2">
        <Label htmlFor="property_id">Propiedad</Label>
        <select id="property_id" name="property_id" defaultValue={lease?.property_id ?? ''} required className={selectClass}>
          <option value="" disabled>Seleccionar propiedad...</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name} — {p.address}</option>
          ))}
        </select>
      </div>

      {/* Inquilino */}
      <div className="space-y-2">
        <Label htmlFor="tenant_id">Inquilino</Label>
        <select id="tenant_id" name="tenant_id" defaultValue={lease?.tenant_id ?? ''} required className={selectClass}>
          <option value="" disabled>Seleccionar inquilino...</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </select>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Fecha de inicio</Label>
          <Input id="start_date" name="start_date" type="date" defaultValue={lease?.start_date} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Fecha de fin (opcional)</Label>
          <Input id="end_date" name="end_date" type="date" defaultValue={lease?.end_date ?? ''} />
        </div>
      </div>

      {/* Monto y moneda */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rent_amount">Monto de alquiler</Label>
          <Input id="rent_amount" name="rent_amount" type="number" min={1} step={1} defaultValue={lease?.rent_amount} placeholder="ej. 150000" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Moneda</Label>
          <select id="currency" name="currency" defaultValue={lease?.currency ?? 'ARS'} required className={selectClass}>
            <option value="ARS">ARS — Pesos</option>
            <option value="USD">USD — Dólares</option>
          </select>
        </div>
      </div>

      {/* ── Sección de ajustes ── */}
      <div className="space-y-4 rounded-lg border border-dashed p-4">
        <div>
          <p className="text-sm font-medium">Ajuste periódico</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configurá cómo y cuándo sube el alquiler a lo largo del contrato.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adjustment_type">Tipo de ajuste</Label>
          <select
            id="adjustment_type"
            name="adjustment_type"
            defaultValue={lease?.adjustment_type ?? 'none'}
            onChange={(e) => setAdjustmentType(e.target.value)}
            className={selectClass}
          >
            {Object.entries(ADJUSTMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {adjustmentType !== 'none' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="adjustment_frequency_months">Frecuencia (cada cuántos meses)</Label>
              <select
                id="adjustment_frequency_months"
                name="adjustment_frequency_months"
                defaultValue={lease?.adjustment_frequency_months ?? ''}
                required
                className={selectClass}
              >
                <option value="" disabled>Seleccionar...</option>
                {[1, 2, 3, 4, 6, 8, 12].map((m) => (
                  <option key={m} value={m}>Cada {m} {m === 1 ? 'mes' : 'meses'}</option>
                ))}
              </select>
            </div>

            {adjustmentType === 'percentage' && (
              <div className="space-y-2">
                <Label htmlFor="adjustment_percentage">Porcentaje de aumento (%)</Label>
                <Input
                  id="adjustment_percentage"
                  name="adjustment_percentage"
                  type="number"
                  min={0.01}
                  step={0.01}
                  defaultValue={lease?.adjustment_percentage ?? ''}
                  placeholder="ej. 4"
                  required
                />
                <p className="text-xs text-muted-foreground">Ej: 4 = 4% cada período</p>
              </div>
            )}

            {adjustmentType === 'index' && (
              <div className="space-y-2">
                <Label htmlFor="adjustment_index">Índice de referencia</Label>
                <select
                  id="adjustment_index"
                  name="adjustment_index"
                  defaultValue={lease?.adjustment_index ?? ''}
                  required
                  className={selectClass}
                >
                  <option value="" disabled>Seleccionar índice...</option>
                  {INDEX_OPTIONS.map((idx) => (
                    <option key={idx} value={idx}>{idx}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  El valor del índice se carga manualmente al aplicar cada aumento.
                </p>
              </div>
            )}

            {adjustmentType === 'fixed_amount' && (
              <div className="space-y-2">
                <Label htmlFor="adjustment_fixed_amount">Monto de aumento</Label>
                <Input
                  id="adjustment_fixed_amount"
                  name="adjustment_fixed_amount"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={lease?.adjustment_fixed_amount ?? ''}
                  placeholder="ej. 10000"
                  required
                />
                <p className="text-xs text-muted-foreground">Monto fijo que se suma al alquiler en cada período.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea id="notes" name="notes" rows={3} maxLength={1000} defaultValue={lease?.notes ?? ''} placeholder="ej. Incluye cochera, expensas a cargo del inquilino..." />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : lease ? 'Actualizar contrato' : 'Crear contrato'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
