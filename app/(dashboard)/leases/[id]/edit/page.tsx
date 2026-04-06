import { getLeaseWithConfig } from '@/lib/actions/leases'
import { getProperties } from '@/lib/actions/properties'
import { getTenants } from '@/lib/actions/tenants'
import { LeaseForm } from '@/components/leases/LeaseForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function EditLeasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [lease, { properties }, { tenants }] = await Promise.all([
    getLeaseWithConfig(id),
    getProperties({ limit: 200 }),
    getTenants({ limit: 200 }),
  ])

  if (!lease) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/leases"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a contratos
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Editar contrato</h1>
      </div>

      <LeaseForm
        properties={properties}
        tenants={tenants}
        lease={{
          id: lease.id,
          property_id: lease.property_id,
          tenant_id: lease.tenant_id,
          start_date: lease.start_date,
          end_date: lease.end_date,
          rent_amount: lease.rent_amount,
          currency: lease.currency,
          notes: lease.notes,
          adjustment_type: lease.adjustment_type,
          adjustment_frequency_months: lease.adjustment_frequency_months,
          adjustment_percentage: lease.adjustment_percentage,
          adjustment_index: lease.adjustment_index,
          adjustment_fixed_amount: lease.adjustment_fixed_amount,
        }}
      />
    </div>
  )
}
