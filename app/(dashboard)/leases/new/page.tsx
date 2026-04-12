import { getProperties } from '@/lib/actions/properties'
import { getTenants } from '@/lib/actions/tenants'
import { LeaseForm } from '@/components/leases/LeaseForm'
import { ScrollText } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'

export default async function NewLeasePage() {
  const [{ properties }, { tenants }] = await Promise.all([
    getProperties({ limit: 200 }),
    getTenants({ limit: 200 }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ScrollText}
        eyebrow="Nuevo"
        title="Nuevo contrato"
        description="Asocia una propiedad con un inquilino y define las condiciones del alquiler."
        backHref="/leases"
        backLabel="Volver a contratos"
      />

      {properties.length === 0 ? (
        <p className="text-muted-foreground">
          Primero debes{' '}
          <Link href="/properties/new" className="underline text-foreground">
            crear una propiedad
          </Link>{' '}
          antes de poder crear un contrato.
        </p>
      ) : tenants.length === 0 ? (
        <p className="text-muted-foreground">
          Primero debes{' '}
          <Link href="/tenants/new" className="underline text-foreground">
            agregar un inquilino
          </Link>{' '}
          antes de poder crear un contrato.
        </p>
      ) : (
        <LeaseForm properties={properties} tenants={tenants} />
      )}
    </div>
  )
}
