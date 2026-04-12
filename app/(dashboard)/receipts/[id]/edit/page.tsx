import { getReceiptWithLineItems } from '@/lib/actions/receipts'
import { DraftReceiptEditor } from '@/components/receipts/DraftReceiptEditor'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { FileText, AlertCircle } from 'lucide-react'
import { notFound } from 'next/navigation'

interface EditReceiptPageProps {
  params: Promise<{ id: string }>
}

export default async function EditReceiptPage({ params }: EditReceiptPageProps) {
  const { id } = await params
  const data = await getReceiptWithLineItems(id)

  if (!data) notFound()

  const { receipt, lineItems } = data

  if (receipt.status !== 'draft') {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={FileText}
          title="Editar recibo"
          backHref={`/receipts/${id}`}
        />
        <EmptyState
          icon={AlertCircle}
          title="No se puede editar"
          description="Solo se pueden editar recibos en estado borrador."
        />
      </div>
    )
  }

  const tenant = receipt.tenants as unknown as { full_name: string; email: string | null } | null

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        eyebrow="Borrador"
        title="Editar recibo"
        description="Agregá expensas, extras o descuentos antes de enviar al inquilino"
        backHref="/receipts"
      />

      <DraftReceiptEditor
        receipt={receipt}
        lineItems={lineItems}
        tenantName={tenant?.full_name ?? receipt.snapshot_tenant_name}
        tenantEmail={tenant?.email ?? null}
      />
    </div>
  )
}
