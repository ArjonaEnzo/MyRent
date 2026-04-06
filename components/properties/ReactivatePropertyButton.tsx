'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { reactivateProperty } from '@/lib/actions/properties'
import { Button } from '@/components/ui/button'
import { ArchiveRestore } from 'lucide-react'

export function ReactivatePropertyButton({ propertyId }: { propertyId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle() {
    setLoading(true)
    const result = await reactivateProperty(propertyId)
    setLoading(false)
    if (result.success) {
      router.push('/properties')
      router.refresh()
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={loading}>
      <ArchiveRestore className="mr-2 h-4 w-4" />
      {loading ? 'Reactivando...' : 'Reactivar propiedad'}
    </Button>
  )
}
