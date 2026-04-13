import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Skeleton for the revenue chart (2/3) + collection panel (1/3) row */
export function RevenueChartSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Revenue chart placeholder */}
      <div className="lg:col-span-2">
        <Card className="border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-[220px] w-full rounded-lg" />
        </Card>
      </div>
      {/* Collection panel placeholder */}
      <div>
        <Card className="border border-border shadow-sm p-5 space-y-4 h-full">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </Card>
      </div>
    </div>
  )
}

/** Skeleton for the occupancy card (1/3) + alerts (2/3) row */
export function OccupancyAlertsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Occupancy card placeholder */}
      <div>
        <Card className="border border-border shadow-sm p-5 space-y-4 h-full">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-3 w-20" />
        </Card>
      </div>
      {/* Alerts placeholder */}
      <div className="lg:col-span-2">
        <Card className="border border-border shadow-sm p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

/** Skeleton for the recent activity (2/3) + quick actions (1/3) row */
export function ActivitySkeleton() {
  return (
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
  )
}

/** Skeleton for the stats metrics row */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
          </div>
        </div>
      ))}
    </div>
  )
}
