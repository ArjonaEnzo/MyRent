import { getProperties } from '@/lib/actions/properties'
import { getTenants } from '@/lib/actions/tenants'
import { LeaseForm } from '@/components/leases/LeaseForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewLeasePage() {
  const [{ properties }, { tenants }] = await Promise.all([
    getProperties({ limit: 200 }),
    getTenants({ limit: 200 }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/receipts/new"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Nuevo contrato</h1>
        <p className="text-muted-foreground mt-1">
          Asocia una propiedad con un inquilino y define las condiciones del alquiler.
        </p>
      </div>

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
