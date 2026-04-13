import type { Metadata } from 'next'
import { getReceipt } from '@/lib/actions/receipts'
import { notFound } from 'next/navigation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const receipt = await getReceipt(id)
  return {
    title: receipt ? `Recibo ${receipt.period} | Recibos | MyRent` : 'Recibo no encontrado | MyRent',
    description: receipt ? `Detalle del recibo del período ${receipt.period}.` : 'Detalle de recibo de alquiler.',
  }
}
import Link from 'next/link'
import { FileText, Download, User, MapPin, Calendar, Hash, Mail, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
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
  const isHelloSignConfigured = !!process.env.HELLOSIGN_API_KEY
  const { id } = await params
  const receipt = await getReceipt(id)

  if (!receipt) {
    notFound()
  }

  const tenant = receipt.tenants as { full_name: string; email: string | null } | null

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        icon={FileText}
        eyebrow="Recibo"
        title={`Recibo - ${receipt.period}`}
        description={`Para ${receipt.snapshot_tenant_name}`}
        backHref="/receipts"
        backLabel="Volver a recibos"
        action={
          receipt.pdf_url ? (
            <Button asChild>
              <a href={receipt.pdf_url} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </a>
            </Button>
          ) : undefined
        }
      />

      {receipt.status === 'draft' && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Borrador pendiente de revisión
            </p>
            <p className="text-xs text-muted-foreground">
              {receipt.auto_generated
                ? 'Generado automáticamente. Revisá los conceptos antes de enviar.'
                : 'Este recibo está en borrador.'}
            </p>
          </div>
          <Button asChild size="sm" className="gap-1.5">
            <Link href={`/receipts/${receipt.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Editar borrador
            </Link>
          </Button>
        </div>
      )}

      <Card>
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

      {isHelloSignConfigured && (
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
