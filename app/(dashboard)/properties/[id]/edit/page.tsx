import { getProperty } from '@/lib/actions/properties'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <div>
        <Link
          href={`/properties/${property.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al detalle
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar propiedad</CardTitle>
          <p className="text-sm text-muted-foreground">Modifica los datos de {property.name}.</p>
        </CardHeader>
        <CardContent>
          <PropertyForm property={property} />
        </CardContent>
      </Card>
    </div>
  )
}
