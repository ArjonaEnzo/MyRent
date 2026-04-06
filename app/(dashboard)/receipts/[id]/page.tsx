import { getReceipt } from '@/lib/actions/receipts'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, User, MapPin, Calendar, Hash, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ResendEmailButton } from '@/components/receipts/ResendEmailButton'
import { SignatureStatus } from '@/components/receipts/SignatureStatus'

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'ARS' ? 0 : 2,
  }).format(amount)
}

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const receipt = await getReceipt(id)

  if (!receipt) {
    notFound()
  }

  const tenant = receipt.tenants as { full_name: string; email: string | null } | null

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
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Recibo - {receipt.period}</CardTitle>
              <p className="mt-1 text-muted-foreground">
                Para {receipt.snapshot_tenant_name}
              </p>
            </div>
            {receipt.pdf_url && (
              <Button asChild>
                <a href={receipt.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6 space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Monto</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(receipt.snapshot_amount, receipt.snapshot_currency)}
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Destinatario</p>
                <p className="font-medium">{receipt.snapshot_tenant_name}</p>
              </div>
            </div>
            {receipt.snapshot_property_address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="font-medium">{receipt.snapshot_property_address}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="font-medium">{receipt.period}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha de emisión</p>
                <p className="font-medium">
                  {new Date(receipt.created_at).toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <Badge variant={receipt.email_sent ? 'default' : 'secondary'}>
                  {receipt.email_sent ? 'Enviado' : 'No enviado'}
                </Badge>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">ID del recibo</p>
                <p className="font-mono text-xs">{receipt.id}</p>
              </div>
            </div>
          </div>

          {tenant?.email && !receipt.email_sent && (
            <>
              <Separator />
              <ResendEmailButton receiptId={receipt.id} />
            </>
          )}
        </CardContent>
      </Card>

      {process.env.HELLOSIGN_API_KEY && (
        <SignatureStatus
          receiptId={receipt.id}
          signatureStatus={receipt.signature_status}
          signatureRequestId={receipt.signature_request_id}
          landlordSignedAt={receipt.landlord_signed_at}
          tenantSignedAt={receipt.tenant_signed_at}
          signedDocumentUrl={
            receipt.signature_status === 'fully_signed' ? receipt.pdf_url : null
          }
        />
      )}
    </div>
  )
}
