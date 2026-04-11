'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createTenant, updateTenant } from '@/lib/actions/tenants'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Database } from '@/types/database.types'

type Tenant = Database['public']['Tables']['tenants']['Row']

interface TenantFormProps {
  tenant?: Tenant
}

export function TenantForm({ tenant }: TenantFormProps) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isEditing = !!tenant

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      dni_cuit: formData.get('dni_cuit') as string,
    }

    const result = isEditing
      ? await updateTenant(tenant.id, data)
      : await createTenant(data)

    if (result && !result.success) {
      setError(result.error || 'Error desconocido')
      setLoading(false)
    } else {
      toast.success(isEditing ? 'Inquilino actualizado' : 'Inquilino creado')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          required
          defaultValue={tenant?.full_name}
          placeholder="Ej: Juan Pérez"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={tenant?.email || ''}
            placeholder="juan@email.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono (opcional)</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={tenant?.phone || ''}
            placeholder="+54 11 1234-5678"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dni_cuit">DNI/CUIT (opcional)</Label>
        <Input
          id="dni_cuit"
          name="dni_cuit"
          type="text"
          defaultValue={tenant?.dni_cuit || ''}
          placeholder="20-12345678-9"
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? (isEditing ? 'Guardando...' : 'Creando...')
            : (isEditing ? 'Guardar cambios' : 'Crear inquilino')}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/tenants">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
