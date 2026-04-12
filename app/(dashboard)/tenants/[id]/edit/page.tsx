import { getTenant } from '@/lib/actions/tenants'
import { notFound } from 'next/navigation'
import { Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { TenantForm } from '@/components/tenants/TenantForm'

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tenant = await getTenant(id)

  if (!tenant) {
    notFound()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        icon={Users}
        eyebrow="Editar"
        title="Editar inquilino"
        description={`Modifica los datos de ${tenant.full_name}.`}
        backHref={`/tenants/${tenant.id}`}
        backLabel="Volver al detalle"
      />

      <Card>
        <CardContent className="pt-6">
          <TenantForm tenant={tenant} />
        </CardContent>
      </Card>
    </div>
  )
}
