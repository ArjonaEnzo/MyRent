'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createProperty, updateProperty } from '@/lib/actions/properties'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Database } from '@/types/database.types'

type Property = Database['public']['Tables']['properties']['Row']

interface PropertyFormProps {
  property?: Property
}

export function PropertyForm({ property }: PropertyFormProps) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isEditing = !!property

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
    }

    const result = isEditing
      ? await updateProperty(property.id, data)
      : await createProperty(data)

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

      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la propiedad</Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={property?.name}
          placeholder="Ej: Departamento Centro"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          name="address"
          type="text"
          required
          defaultValue={property?.address}
          placeholder="Ej: Av. Corrientes 1234, CABA"
        />
      </div>

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
