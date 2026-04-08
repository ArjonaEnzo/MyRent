'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { terminateLease, reactivateLease } from '@/lib/actions/leases'
import { ArchiveRestore, Pencil, XCircle } from 'lucide-react'
import Link from 'next/link'

interface LeaseActionsProps {
  leaseId: string
  tenantName: string | null
  status: string
}

export function LeaseActions({ leaseId, tenantName, status }: LeaseActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleTerminate() {
    setLoading(true)
    const result = await terminateLease(leaseId)
    setLoading(false)
    if (result.success) router.refresh()
  }

  async function handleReactivate() {
    setLoading(true)
    const result = await reactivateLease(leaseId)
    setLoading(false)
    if (result.success) router.refresh()
  }

  if (status !== 'active') {
    return (
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={handleReactivate} disabled={loading} title="Reactivar contrato">
          <ArchiveRestore className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/leases/${leaseId}/edit`}>
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
            <XCircle className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja este contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              El contrato de <strong>{tenantName}</strong> pasará al estado &ldquo;Finalizado&rdquo;.
              No se eliminarán los recibos existentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerminate}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Procesando...' : 'Dar de baja'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
