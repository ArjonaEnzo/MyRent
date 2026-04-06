import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="rounded-full bg-muted p-6 mx-auto w-fit">
          <FileQuestion className="h-12 w-12 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-4xl font-bold">404</h1>
          <h2 className="text-xl font-semibold mt-2">Página no encontrada</h2>
          <p className="text-muted-foreground mt-2">
            La página que buscas no existe o fue movida.
          </p>
        </div>
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
