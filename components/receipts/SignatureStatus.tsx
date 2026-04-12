'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileSignature,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink
} from 'lucide-react'
import { sendReceiptForSignature } from '@/lib/actions/signatures'
import { toast } from 'sonner'

interface SignatureStatusProps {
  receiptId: string
  signatureStatus: string | null
  signatureRequestId: string | null
  landlordSignedAt: string | null
  tenantSignedAt: string | null
  signedDocumentUrl: string | null
}

export function SignatureStatus({
  receiptId,
  signatureStatus,
  signatureRequestId,
  landlordSignedAt,
  tenantSignedAt,
  signedDocumentUrl,
}: SignatureStatusProps) {
  const [loading, setLoading] = useState(false)

  const handleSendForSignature = async () => {
    setLoading(true)
    const result = await sendReceiptForSignature(receiptId)
    setLoading(false)

    if (result.success) {
      toast.success('Solicitud de firma creada')
      // Abrir URL de firma en nueva pestaña
      if (result.signingUrl) {
        window.open(result.signingUrl, '_blank')
      }
    } else {
      toast.error(result.error || 'Error al enviar para firma')
    }
  }

  // Estado: No iniciado
  if (!signatureRequestId) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">Firma Digital</h3>
              <p className="text-sm text-muted-foreground">
                Envía este recibo para firma digital del inquilino
              </p>
            </div>
          </div>
          <Button onClick={handleSendForSignature} disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar para Firma'}
          </Button>
        </div>
      </div>
    )
  }

  // Determinar badge según estado
  const getStatusBadge = () => {
    switch (signatureStatus) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendiente de firma del propietario
          </Badge>
        )
      case 'landlord_signed':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendiente de firma del inquilino
          </Badge>
        )
      case 'fully_signed':
        return (
          <Badge variant="default" className="gap-1 bg-primary">
            <CheckCircle2 className="h-3 w-3" />
            Firmado por ambas partes
          </Badge>
        )
      case 'declined':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rechazado
          </Badge>
        )
      case 'expired':
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Expirado
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-medium">Estado de Firma Digital</h3>
            <p className="text-sm text-muted-foreground">
              Proceso de firma en curso
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Timeline de firmas */}
      <div className="space-y-3 border-l-2 border-muted pl-4 ml-2">
        {/* Firma del propietario */}
        <div className="flex items-start gap-3">
          {landlordSignedAt ? (
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
          ) : (
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
          )}
          <div>
            <p className="font-medium">Propietario</p>
            {landlordSignedAt ? (
              <p className="text-sm text-muted-foreground">
                Firmado el {new Date(landlordSignedAt).toLocaleDateString('es-AR')}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Pendiente de firma</p>
            )}
          </div>
        </div>

        {/* Firma del inquilino */}
        <div className="flex items-start gap-3">
          {tenantSignedAt ? (
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
          ) : (
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
          )}
          <div>
            <p className="font-medium">Inquilino</p>
            {tenantSignedAt ? (
              <p className="text-sm text-muted-foreground">
                Firmado el {new Date(tenantSignedAt).toLocaleDateString('es-AR')}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Pendiente de firma</p>
            )}
          </div>
        </div>
      </div>

      {/* Documento firmado final */}
      {signatureStatus === 'fully_signed' && signedDocumentUrl && (
        <div className="pt-2 border-t">
          <Button asChild variant="outline" className="w-full">
            <a href={signedDocumentUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Descargar Documento Firmado
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
