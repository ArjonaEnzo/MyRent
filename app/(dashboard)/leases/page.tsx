import { getLeases } from '@/lib/actions/leases'
import { Button } from '@/components/ui/button'
import { LeaseActions } from '@/components/leases/LeaseActions'
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contratos</h1>
          <p className="text-muted-foreground mt-1">
            Administrá los contratos entre propiedades e inquilinos.
          </p>
        </div>
        <Button asChild>
          <Link href="/leases/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo contrato
          </Link>
        </Button>
      </div>

      <div className="flex gap-2 text-sm">
        <Link
          href="/leases"
          className={`px-3 py-1.5 rounded-md transition-colors ${filterStatus === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Activos
        </Link>
        <Link
          href="/leases?status=ended"
          className={`px-3 py-1.5 rounded-md transition-colors ${filterStatus === 'ended' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Finalizados
        </Link>
      </div>

      {leases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ScrollText className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">
            {filterStatus === 'ended' ? 'No hay contratos finalizados' : 'No hay contratos activos'}
          </h2>
          {filterStatus === 'active' && (
            <>
              <p className="text-muted-foreground mt-1 mb-4">
                Creá un contrato para vincular una propiedad con un inquilino.
              </p>
              <Button asChild>
                <Link href="/leases/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo contrato
                </Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Inquilino</th>
                <th className="px-4 py-3 text-left font-medium">Propiedad</th>
                <th className="px-4 py-3 text-left font-medium">Monto</th>
                <th className="px-4 py-3 text-left font-medium">Inicio</th>
                <th className="px-4 py-3 text-left font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {leases.map((lease) => (
                <tr key={lease.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{lease.tenant_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lease.property_name}</td>
                  <td className="px-4 py-3">
                    {lease.currency} {Number(lease.rent_amount).toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(lease.start_date!).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      lease.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {lease.status === 'active' ? 'Activo' : lease.status === 'ended' ? 'Finalizado' : 'Cancelado'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(lease.status === 'active' || lease.status === 'ended') && (
                      <LeaseActions leaseId={lease.id} tenantName={lease.tenant_name} status={lease.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
