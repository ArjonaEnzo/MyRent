import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { TenantForm } from '@/components/tenants/TenantForm'

export default async function NewTenantPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        icon={Users}
        eyebrow="Nuevo"
        title="Nuevo inquilino"
        description="Registra un nuevo inquilino."
        backHref="/tenants"
        backLabel="Volver a inquilinos"
      />

      <Card>
        <CardContent className="pt-6">
          <TenantForm />
        </CardContent>
      </Card>
    </div>
  )
}
