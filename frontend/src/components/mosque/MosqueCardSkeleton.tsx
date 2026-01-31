import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function MosqueCardSkeleton() {
  return (
    <Card className="overflow-hidden border-0 shadow-card">
      <CardContent className="p-6">
        {/* Action buttons row */}
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>

        {/* Header skeleton */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-40" />
          </div>
        </div>

        {/* Imam row skeleton */}
        <div className="mb-3 flex items-center justify-between rounded-lg bg-primary-light/50 p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>

        {/* Location row skeleton */}
        <div className="flex items-center justify-between rounded-lg bg-primary-light/50 p-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-36" />
          </div>
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}
