import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReceiptForm } from '@/components/receipts/ReceiptForm'
import { getLeases } from '@/lib/actions/leases'

export default async function NewReceiptPage() {
  const { leases } = await getLeases({ status: 'active' })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/receipts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a recibos
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generar recibo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Selecciona un contrato y el período para generar el recibo.
          </p>
        </CardHeader>
        <CardContent>
          <ReceiptForm leases={leases} />
        </CardContent>
      </Card>
    </div>
  )
}
