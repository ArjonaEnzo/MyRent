'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createProperty, updateProperty } from '@/lib/actions/properties'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormField } from '@/components/shared/FormField'
import { useFormValidation } from '@/lib/hooks/use-form-validation'
import { propertySchema } from '@/lib/validations/property'
import type { Database } from '@/types/database.types'

type Property = Database['public']['Tables']['properties']['Row']

interface PropertyFormProps {
  property?: Property
}

export function PropertyForm({ property }: PropertyFormProps) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { fieldErrors, validateAll, clearFieldError } = useFormValidation(propertySchema)
  const isEditing = !!property

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
    }

    const validated = validateAll(data)
    if (!validated) return

    setLoading(true)
    const result = isEditing
      ? await updateProperty(property.id, validated)
      : await createProperty(validated)

    if (result && !result.success) {
      setError(result.error || 'Error desconocido')
      setLoading(false)
    } else {
      toast.success(isEditing ? 'Propiedad actualizada' : 'Propiedad creada')
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
        label="Nombre de la propiedad"
        name="name"
        type="text"
        required
        defaultValue={property?.name}
        placeholder="Ej: Departamento Centro"
        error={fieldErrors.name}
        onFocus={() => clearFieldError('name')}
      />

      <FormField
        label="Dirección"
        name="address"
        type="text"
        required
        defaultValue={property?.address}
        placeholder="Ej: Av. Corrientes 1234, CABA"
        error={fieldErrors.address}
        onFocus={() => clearFieldError('address')}
      />

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? (isEditing ? 'Guardando...' : 'Creando...')
            : (isEditing ? 'Guardar cambios' : 'Crear propiedad')}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/properties">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
