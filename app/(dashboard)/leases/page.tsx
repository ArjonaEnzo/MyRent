import { getLeases } from '@/lib/actions/leases'
import { Button } from '@/components/ui/button'
import { LeaseActions } from '@/components/leases/LeaseActions'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { FilterTabs } from '@/components/shared/FilterTabs'
import Link from 'next/link'
import { Plus, ScrollText } from 'lucide-react'

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const filterStatus = status ?? 'active'
  const { leases } = await getLeases({ status: filterStatus })

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        icon={ScrollText}
        eyebrow="Gestión"
        title="Contratos"
        description="Administrá los contratos entre propiedades e inquilinos."
        action={
          <Button asChild>
            <Link href="/leases/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo contrato
            </Link>
          </Button>
        }
      />

      <FilterTabs
        aria-label="Estado de contratos"
        tabs={[
          { label: 'Activos', href: '/leases', active: filterStatus === 'active' },
          { label: 'Finalizados', href: '/leases?status=ended', active: filterStatus === 'ended' },
        ]}
      />

      {leases.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={filterStatus === 'ended' ? 'No hay contratos finalizados' : 'No hay contratos activos'}
          description={
            filterStatus === 'active'
              ? 'Creá un contrato para vincular una propiedad con un inquilino.'
              : 'Los contratos finalizados aparecerán aquí.'
          }
          action={
            filterStatus === 'active' ? (
              <Button asChild>
                <Link href="/leases/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo contrato
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inquilino</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Propiedad</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Monto</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inicio</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {leases.map((lease) => (
                  <tr key={lease.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{lease.tenant_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lease.property_name}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {lease.currency} {Number(lease.rent_amount).toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {new Date(lease.start_date!).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${
                          lease.status === 'active'
                            ? 'bg-primary/10 text-primary ring-primary/20'
                            : 'bg-muted text-muted-foreground ring-border/60'
                        }`}
                      >
                        {lease.status === 'active' ? 'Activo' : lease.status === 'ended' ? 'Finalizado' : 'Cancelado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(lease.status === 'active' || lease.status === 'ended') && (
                        <LeaseActions leaseId={lease.id!} tenantName={lease.tenant_name} status={lease.status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
