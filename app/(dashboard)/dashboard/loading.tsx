import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-7xl pb-8">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-40" />
      </div>

      {/* Stat cards — matches 1/sm:2/lg:3 grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border border-border shadow-sm overflow-hidden">
            <div className="h-[3px] w-full bg-muted" />
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                <div className="flex-1 flex flex-col items-end gap-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <Skeleton className="h-3 w-28 mb-3" />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border border-border shadow-sm">
              <CardContent className="p-3.5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <Skeleton className="h-3 w-28 mb-3" />
        <Card className="border border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-10" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
