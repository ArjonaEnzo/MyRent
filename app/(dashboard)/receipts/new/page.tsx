import { FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { ReceiptForm } from '@/components/receipts/ReceiptForm'
import { getLeases } from '@/lib/actions/leases'

export default async function NewReceiptPage() {
  const { leases } = await getLeases({ status: 'active' })

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        icon={FileText}
        eyebrow="Nuevo"
        title="Generar recibo"
        description="Selecciona un contrato y el período para generar el recibo."
        backHref="/receipts"
        backLabel="Volver a recibos"
      />

      <Card>
        <CardContent className="pt-6">
          <ReceiptForm leases={leases} />
        </CardContent>
      </Card>
    </div>
  )
}
