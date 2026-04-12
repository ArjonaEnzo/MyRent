import { Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { PropertyForm } from '@/components/properties/PropertyForm'

export default function NewPropertyPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        icon={Building2}
        eyebrow="Nueva"
        title="Nueva propiedad"
        description="Ingresa los datos de tu propiedad."
        backHref="/properties"
        backLabel="Volver a propiedades"
      />

      <Card>
        <CardContent className="pt-6">
          <PropertyForm />
        </CardContent>
      </Card>
    </div>
  )
}
