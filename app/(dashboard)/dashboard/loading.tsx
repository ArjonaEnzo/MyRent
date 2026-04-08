import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="max-w-7xl space-y-5 pb-8">

      {/* Workspace header */}
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* Metrics row — flat cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
          >
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        ))}
      </div>

      {/* Main content: activity (2/3) + actions (1/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Recent activity */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-7 w-7 rounded-md shrink-0" />
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

        {/* Quick actions */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-7 w-7 rounded-md shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}
