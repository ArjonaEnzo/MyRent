import { getTenant } from '@/lib/actions/tenants'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <div>
        <Link
          href={`/tenants/${tenant.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al detalle
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar inquilino</CardTitle>
          <p className="text-sm text-muted-foreground">Modifica los datos de {tenant.full_name}.</p>
        </CardHeader>
        <CardContent>
          <TenantForm tenant={tenant} />
        </CardContent>
      </Card>
    </div>
  )
}
