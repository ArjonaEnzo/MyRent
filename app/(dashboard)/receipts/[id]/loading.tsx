import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

export default function ReceiptDetailLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      <Skeleton className="h-5 w-36" />
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6 space-y-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <Skeleton className="h-4 w-16 mx-auto" />
              <Skeleton className="h-9 w-36 mx-auto mt-2" />
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-36" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
