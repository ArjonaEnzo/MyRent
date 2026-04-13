import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Propiedades | MyRent',
  description: 'Listado y gestión de propiedades en alquiler.',
}
import { Suspense } from 'react'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { FilterTabs } from '@/components/shared/FilterTabs'
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
        icon={Building2}
        eyebrow="Portfolio"
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

      <FilterTabs
        aria-label="Estado de propiedades"
        tabs={[
          { label: 'Activas', href: '/properties', active: !showArchived },
          { label: 'Archivadas', href: '/properties?tab=archived', active: showArchived, count: archived.length },
        ]}
      />

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
