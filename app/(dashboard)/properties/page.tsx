import Link from 'next/link'
import { Suspense } from 'react'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { getProperties, getArchivedProperties } from '@/lib/actions/properties'
import { PropertiesGridClient } from '@/components/properties/PropertiesGridClient'

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; tab?: string }>
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.q || ''
  const tab = params.tab ?? 'active'
  const showArchived = tab === 'archived'

  const [{ properties, total }, archived] = await Promise.all([
    getProperties({ page, limit: 50, search: search || undefined }),
    getArchivedProperties(),
  ])

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Propiedades"
        description={showArchived
          ? `${archived.length} ${archived.length === 1 ? 'propiedad archivada' : 'propiedades archivadas'}`
          : `${total} ${total === 1 ? 'propiedad registrada' : 'propiedades registradas'}`
        }
        action={
          !showArchived ? (
            <Button asChild>
              <Link href="/properties/new">
                <Plus className="mr-2 h-4 w-4" />
                Nueva propiedad
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex gap-2 text-sm">
        <Link
          href="/properties"
          className={`px-3 py-1.5 rounded-md transition-colors ${!showArchived ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Activas
        </Link>
        <Link
          href="/properties?tab=archived"
          className={`px-3 py-1.5 rounded-md transition-colors ${showArchived ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Archivadas {archived.length > 0 ? `(${archived.length})` : ''}
        </Link>
      </div>

      <Suspense fallback={<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-56 rounded-xl"/>)}</div>}>
        {showArchived ? (
          archived.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Sin propiedades archivadas"
              description="Las propiedades archivadas aparecerán aquí."
            />
          ) : (
            <PropertiesGridClient
              key="archived"
              properties={archived}
              total={archived.length}
              currentPage={1}
              limit={archived.length}
              isArchived
            />
          )
        ) : total === 0 && !search ? (
          <EmptyState
            icon={Building2}
            title="Sin propiedades"
            description="Comienza agregando tu primera propiedad."
            action={
              <Button asChild>
                <Link href="/properties/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar propiedad
                </Link>
              </Button>
            }
          />
        ) : (
          <PropertiesGridClient
            key="active"
            properties={properties}
            total={total}
            currentPage={page}
            limit={50}
          />
        )}
      </Suspense>
    </div>
  )
}
