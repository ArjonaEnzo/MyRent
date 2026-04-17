import type { Metadata } from 'next'
import { getProperty, getPropertyImages } from '@/lib/actions/properties'
import { notFound } from 'next/navigation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const property = await getProperty(id)
  return {
    title: property ? `${property.name} | Propiedades | MyRent` : 'Propiedad no encontrada | MyRent',
    description: property?.address ?? 'Detalle de propiedad en alquiler.',
  }
}
import Link from 'next/link'
import { Building2, Pencil, Calendar, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/PageHeader'
import { DeletePropertyButton } from '@/components/properties/DeletePropertyButton'
import { ReactivatePropertyButton } from '@/components/properties/ReactivatePropertyButton'
import { PropertyImagesManager } from '@/components/properties/PropertyImagesManager'
import { PropertyMap } from '@/components/properties/PropertyMap'

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [property, images] = await Promise.all([
    getProperty(id),
    getPropertyImages(id),
  ])

  if (!property) notFound()

  const isArchived = !!property.deleted_at

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        icon={Building2}
        eyebrow="Propiedad"
        title={property.name}
        description={property.address}
        backHref="/properties"
        backLabel="Volver a propiedades"
        action={
          !isArchived ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/properties/${property.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
          ) : undefined
        }
      />

      {isArchived && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3">
          <Archive className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
            Esta propiedad está archivada y no aparece en los listados activos.
          </p>
          <ReactivatePropertyButton propertyId={property.id} />
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-6">
          <PropertyImagesManager propertyId={property.id} images={images} />

          {property.latitude != null && property.longitude != null && (
            <>
              <Separator />
              <PropertyMap
                latitude={property.latitude}
                longitude={property.longitude}
                address={property.address}
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
              />
            </>
          )}

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha de registro</p>
                <p className="font-medium">
                  {new Date(property.created_at).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Última actualización</p>
                <p className="font-medium">
                  {new Date(property.updated_at).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {!isArchived && (
            <>
              <Separator />
              <DeletePropertyButton propertyId={property.id} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
