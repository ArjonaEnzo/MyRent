'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createReceipt } from '@/lib/actions/receipts'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import type { Database } from '@/types/database.types'
import { formatCurrency } from '@/lib/utils/format'

type LeaseOverview = Database['public']['Views']['leases_overview']['Row']

interface ReceiptFormProps {
  leases: LeaseOverview[]
}

function getCurrentPeriod() {
  const now = new Date()
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return `${months[now.getMonth()]} ${now.getFullYear()}`
}

export function ReceiptForm({ leases }: ReceiptFormProps) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedLeaseId, setSelectedLeaseId] = useState('')

  const selectedLease = leases.find((l) => l.id === selectedLeaseId)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      lease_id: formData.get('lease_id') as string,
      period: formData.get('period') as string,
      description: formData.get('description') as string | undefined,
    }

    const result = await createReceipt(data)

    if (result && !result.success) {
      setError(result.error || 'Error desconocido')
      setLoading(false)
    } else {
      toast.success('Recibo generado correctamente')
    }
  }

  if (leases.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">Necesitas crear un contrato antes de generar recibos.</p>
        <Button asChild>
          <Link href="/leases/new">Crear contrato</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="lease_id">Contrato</Label>
        <select
          id="lease_id"
          name="lease_id"
          required
          value={selectedLeaseId}
          onChange={(e) => setSelectedLeaseId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">Seleccionar contrato</option>
          {leases.map((l) => (
            <option key={l.id ?? ''} value={l.id ?? ''}>
              {l.tenant_name} — {l.property_name} ({formatCurrency(l.rent_amount ?? 0, l.currency ?? 'ARS')})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="period">Período</Label>
        <Input
          id="period"
          name="period"
          type="text"
          required
          defaultValue={getCurrentPeriod()}
          placeholder="Ej: Febrero 2026"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Descripción del cobro <span className="text-muted-foreground text-xs">(opcional)</span>
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Ej: Alquiler mensual + expensas + servicio de limpieza"
          rows={3}
          maxLength={500}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Máximo 500 caracteres. Este texto aparecerá en el PDF y en el email.
        </p>
      </div>

      {selectedLease && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <h4 className="text-sm font-medium mb-3">Vista previa del recibo</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inquilino:</span>
                <span className="font-medium">{selectedLease.tenant_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Propiedad:</span>
                <span className="font-medium">{selectedLease.property_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dirección:</span>
                <span className="font-medium">{selectedLease.property_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto:</span>
                <span className="font-bold text-lg">
                  {formatCurrency(selectedLease.rent_amount ?? 0, selectedLease.currency ?? 'ARS')}
                </span>
              </div>
              {selectedLease.tenant_email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{selectedLease.tenant_email}</span>
                </div>
              )}
              {!selectedLease.tenant_email && (
                <p className="text-xs text-amber-600 mt-2">
                  Este inquilino no tiene email. El recibo no se enviará por correo.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Generando recibo...' : 'Generar recibo'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/receipts">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
