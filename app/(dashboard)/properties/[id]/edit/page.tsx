import { getProperty } from '@/lib/actions/properties'
import { notFound } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { PropertyForm } from '@/components/properties/PropertyForm'

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const property = await getProperty(id)

  if (!property) {
    notFound()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        icon={Building2}
        eyebrow="Editar"
        title="Editar propiedad"
        description={`Modifica los datos de ${property.name}.`}
        backHref={`/properties/${property.id}`}
        backLabel="Volver al detalle"
      />

      <Card>
        <CardContent className="pt-6">
          <PropertyForm property={property} />
        </CardContent>
      </Card>
    </div>
  )
}
