'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-4 mx-auto w-fit">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Algo salió mal</h2>
          <p className="text-muted-foreground">
            Ocurrió un error inesperado. Por favor, intenta nuevamente.
          </p>
          <Button onClick={reset}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
