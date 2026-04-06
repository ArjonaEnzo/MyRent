'use client'

import { useState } from 'react'
import { resendReceiptEmail } from '@/lib/actions/receipts'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ResendEmailButton({ receiptId }: { receiptId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleResend() {
    setLoading(true)

    const result = await resendReceiptEmail(receiptId)

    if (result.success) {
      toast.success('Email enviado correctamente')
    } else {
      toast.error(result.error || 'Error al enviar')
    }

    setLoading(false)
  }

  return (
    <Button variant="outline" onClick={handleResend} disabled={loading}>
      <Mail className="mr-2 h-4 w-4" />
      {loading ? 'Enviando...' : 'Reenviar email'}
    </Button>
  )
}
