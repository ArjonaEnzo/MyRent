'use client'

import { useState } from 'react'
import { inviteTenant } from '@/lib/actions/tenants'
import { useRouter } from 'next/navigation'
import { Mail, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface InviteTenantButtonProps {
  tenantId: string
  hasAccess: boolean
  hasEmail: boolean
}

export function InviteTenantButton({ tenantId, hasAccess, hasEmail }: InviteTenantButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (hasAccess) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        Acceso al portal activo
      </div>
    )
  }

  async function handleInvite() {
    setLoading(true)
    const result = await inviteTenant(tenantId)
    if (result.success) {
      toast.success('Invitación enviada. El inquilino recibirá un email para definir su contraseña.')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Error al invitar')
    }
    setLoading(false)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInvite}
      disabled={loading || !hasEmail}
      title={!hasEmail ? 'El inquilino no tiene email registrado' : undefined}
    >
      <Mail className="mr-2 h-4 w-4" />
      {loading ? 'Enviando invitación...' : 'Invitar al portal'}
    </Button>
  )
}
