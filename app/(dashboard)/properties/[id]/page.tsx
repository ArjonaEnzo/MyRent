import { getProperty, getPropertyImages } from '@/lib/actions/properties'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, MapPin, Calendar, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DeletePropertyButton } from '@/components/properties/DeletePropertyButton'
import { ReactivatePropertyButton } from '@/components/properties/ReactivatePropertyButton'
import { PropertyImagesManager } from '@/components/properties/PropertyImagesManager'

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
      <div>
        <Link
          href="/properties"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a propiedades
        </Link>
      </div>

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
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{property.name}</CardTitle>
              <p className="mt-2 text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {property.address}
              </p>
            </div>
            {!isArchived && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/properties/${property.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6 space-y-6">
          <PropertyImagesManager propertyId={property.id} images={images} />

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
