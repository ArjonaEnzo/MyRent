import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TenantForm } from '@/components/tenants/TenantForm'

export default async function NewTenantPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/tenants"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a inquilinos
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo inquilino</CardTitle>
          <p className="text-sm text-muted-foreground">Registra un nuevo inquilino.</p>
        </CardHeader>
        <CardContent>
          <TenantForm />
        </CardContent>
      </Card>
    </div>
  )
}
