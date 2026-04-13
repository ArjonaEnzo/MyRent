'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createTenant, updateTenant } from '@/lib/actions/tenants'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormField } from '@/components/shared/FormField'
import { useFormValidation } from '@/lib/hooks/use-form-validation'
import { tenantSchema } from '@/lib/validations/tenant'
import type { Database } from '@/types/database.types'

type Tenant = Database['public']['Tables']['tenants']['Row']

interface TenantFormProps {
  tenant?: Tenant
}

export function TenantForm({ tenant }: TenantFormProps) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { fieldErrors, validateAll, clearFieldError } = useFormValidation(tenantSchema)
  const isEditing = !!tenant

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const data = {
      full_name: formData.get('full_name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      dni_cuit: formData.get('dni_cuit') as string,
    }

    const validated = validateAll(data)
    if (!validated) return

    setLoading(true)
    const result = isEditing
      ? await updateTenant(tenant.id, validated)
      : await createTenant(validated)

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

      <FormField
        label="Nombre completo"
        name="full_name"
        type="text"
        required
        defaultValue={tenant?.full_name}
        placeholder="Ej: Juan Pérez"
        error={fieldErrors.full_name}
        onFocus={() => clearFieldError('full_name')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Email"
          name="email"
          type="email"
          required
          defaultValue={tenant?.email || ''}
          placeholder="juan@email.com"
          error={fieldErrors.email}
          onFocus={() => clearFieldError('email')}
        />

        <FormField
          label="Teléfono (opcional)"
          name="phone"
          type="tel"
          defaultValue={tenant?.phone || ''}
          placeholder="+54 11 1234-5678"
          error={fieldErrors.phone}
          onFocus={() => clearFieldError('phone')}
        />
      </div>

      <FormField
        label="DNI/CUIT (opcional)"
        name="dni_cuit"
        type="text"
        defaultValue={tenant?.dni_cuit || ''}
        placeholder="20-12345678-9"
        error={fieldErrors.dni_cuit}
        onFocus={() => clearFieldError('dni_cuit')}
      />

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
