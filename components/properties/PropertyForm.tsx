'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createProperty, updateProperty } from '@/lib/actions/properties'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormField } from '@/components/shared/FormField'
import {
  AddressAutocomplete,
  type AddressParts,
} from '@/components/shared/AddressAutocomplete'
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

  // Structured address parts. Start from existing row (on edit) or empty.
  const [addressParts, setAddressParts] = useState<AddressParts>({
    formatted_address: property?.address ?? '',
    street_name: property?.street_name ?? undefined,
    street_number: property?.street_number ?? undefined,
    city: property?.city ?? undefined,
    province: property?.province ?? undefined,
    postal_code: property?.postal_code ?? undefined,
    country: property?.country ?? undefined,
    latitude: property?.latitude ?? undefined,
    longitude: property?.longitude ?? undefined,
    google_place_id: property?.google_place_id ?? undefined,
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      street_name: addressParts.street_name ?? null,
      street_number: addressParts.street_number ?? null,
      city: addressParts.city ?? null,
      province: addressParts.province ?? null,
      postal_code: addressParts.postal_code ?? null,
      country: addressParts.country ?? null,
      latitude: addressParts.latitude ?? null,
      longitude: addressParts.longitude ?? null,
      google_place_id: addressParts.google_place_id ?? null,
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
        autoComplete="off"
      />

      <AddressAutocomplete
        label="Dirección"
        name="address"
        required
        defaultValue={property?.address}
        placeholder="Ej: Av. Corrientes 1234, CABA"
        error={fieldErrors.address}
        onFocus={() => clearFieldError('address')}
        onAddressSelect={(parts) => setAddressParts(parts)}
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
