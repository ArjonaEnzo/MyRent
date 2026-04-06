import { getTenant } from '@/lib/actions/tenants'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Calendar, Mail, IdCard, Phone, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { DeleteTenantButton } from '@/components/tenants/DeleteTenantButton'
import { ReactivateTenantButton } from '@/components/tenants/ReactivateTenantButton'

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tenant = await getTenant(id)

  if (!tenant) {
    notFound()
  }

  const isArchived = !!tenant.deleted_at

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/tenants"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a inquilinos
        </Link>
      </div>

      {isArchived && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3">
          <Archive className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
            Este inquilino está archivado y no aparece en los listados activos.
          </p>
          <ReactivateTenantButton tenantId={tenant.id} />
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{tenant.full_name}</CardTitle>
              {tenant.email && (
                <p className="mt-1 text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {tenant.email}
                </p>
              )}
            </div>
            {!isArchived && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/tenants/${tenant.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tenant.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{tenant.phone}</p>
                </div>
              </div>
            )}
            {tenant.dni_cuit && (
              <div className="flex items-start gap-3">
                <IdCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">DNI/CUIT</p>
                  <p className="font-medium">{tenant.dni_cuit}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha de registro</p>
                <p className="font-medium">
                  {new Date(tenant.created_at).toLocaleDateString('es-AR', {
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
              <DeleteTenantButton tenantId={tenant.id} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
