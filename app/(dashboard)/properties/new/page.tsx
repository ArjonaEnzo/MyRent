import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PropertyForm } from '@/components/properties/PropertyForm'

export default function NewPropertyPage() {
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

      <Card>
        <CardHeader>
          <CardTitle>Nueva propiedad</CardTitle>
          <p className="text-sm text-muted-foreground">Ingresa los datos de tu propiedad.</p>
        </CardHeader>
        <CardContent>
          <PropertyForm />
        </CardContent>
      </Card>
    </div>
  )
}
