'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { reactivateTenant } from '@/lib/actions/tenants'
import { Button } from '@/components/ui/button'
import { ArchiveRestore } from 'lucide-react'

export function ReactivateTenantButton({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle() {
    setLoading(true)
    const result = await reactivateTenant(tenantId)
    setLoading(false)
    if (result.success) {
      router.push('/tenants')
      router.refresh()
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={loading}>
      <ArchiveRestore className="mr-2 h-4 w-4" />
      {loading ? 'Reactivando...' : 'Reactivar inquilino'}
    </Button>
  )
}
