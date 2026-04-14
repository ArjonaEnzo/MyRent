import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Recibos | MyRent',
  description: 'Listado y gestión de recibos de alquiler.',
}

// Cache 60s — billing data, more aggressive than other lists.
export const revalidate = 60
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { getReceipts } from '@/lib/actions/receipts'
import { ReceiptsTableClient } from '@/components/receipts/ReceiptsTableClient'

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function ReceiptsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const search = params.q || ''

  const { receipts, total } = await getReceipts({
    page,
    limit: 50,
    search: search || undefined
  })

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        icon={FileText}
        eyebrow="Facturación"
        title="Recibos"
        description={`${total} ${total === 1 ? 'recibo generado' : 'recibos generados'}`}
        action={
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{total}</Badge>
            <Button asChild>
              <Link href="/receipts/new">
                <Plus className="mr-2 h-4 w-4" />
                Generar recibo
              </Link>
            </Button>
          </div>
        }
      />

      {total === 0 && !search ? (
        <EmptyState
          icon={FileText}
          title="Sin recibos"
          description="Genera tu primer recibo de alquiler."
          action={
            <Button asChild>
              <Link href="/receipts/new">
                <Plus className="mr-2 h-4 w-4" />
                Generar recibo
              </Link>
            </Button>
          }
        />
      ) : (
        <ReceiptsTableClient
          receipts={receipts}
          total={total}
          currentPage={page}
          limit={50}
        />
      )}
    </div>
  )
}
