import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="rounded-full bg-muted p-4 mx-auto w-fit">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Página no encontrada</h2>
          <p className="text-muted-foreground">
            La página que buscas no existe o fue movida.
          </p>
          <Button asChild>
            <Link href="/dashboard">Volver al dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
