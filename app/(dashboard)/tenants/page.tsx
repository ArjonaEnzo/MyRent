import Link from 'next/link'
import { Suspense } from 'react'
import { Users, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { getTenants, getArchivedTenants } from '@/lib/actions/tenants'
import { TenantsGridClient } from '@/components/tenants/TenantsGridClient'

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; tab?: string }>
}

export default async function TenantsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.q || ''
  const tab = params.tab ?? 'active'
  const showArchived = tab === 'archived'

  const [{ tenants, total }, archived] = await Promise.all([
    getTenants({ page, limit: 50, search: search || undefined }),
    getArchivedTenants(),
  ])

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Inquilinos"
        description={showArchived
          ? `${archived.length} ${archived.length === 1 ? 'inquilino archivado' : 'inquilinos archivados'}`
          : `${total} ${total === 1 ? 'inquilino activo' : 'inquilinos activos'}`
        }
        action={
          !showArchived ? (
            <Button asChild>
              <Link href="/tenants/new">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo inquilino
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex gap-2 text-sm">
        <Link
          href="/tenants"
          className={`px-3 py-1.5 rounded-md transition-colors ${!showArchived ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Activos
        </Link>
        <Link
          href="/tenants?tab=archived"
          className={`px-3 py-1.5 rounded-md transition-colors ${showArchived ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Archivados {archived.length > 0 ? `(${archived.length})` : ''}
        </Link>
      </div>

      <Suspense fallback={<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-40 rounded-xl"/>)}</div>}>
        {showArchived ? (
          archived.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin inquilinos archivados"
              description="Los inquilinos archivados aparecerán aquí."
            />
          ) : (
            <TenantsGridClient
              key="archived"
              tenants={archived}
              total={archived.length}
              currentPage={1}
              limit={archived.length}
              isArchived
            />
          )
        ) : total === 0 && !search ? (
          <EmptyState
            icon={Users}
            title="Sin inquilinos"
            description="Comienza agregando tu primer inquilino."
            action={
              <Button asChild>
                <Link href="/tenants/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar inquilino
                </Link>
              </Button>
            }
          />
        ) : (
          <TenantsGridClient
            key="active"
            tenants={tenants}
            total={total}
            currentPage={page}
            limit={50}
          />
        )}
      </Suspense>
    </div>
  )
}
