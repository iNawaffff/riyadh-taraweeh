import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MosqueMap } from '@/components/mosque/MosqueMap'
import { Skeleton } from '@/components/ui/skeleton'
import { useMosques, useGeolocation } from '@/hooks'

export function MapPage() {
  const { data: mosques, isLoading } = useMosques()
  const { position, error: geoError, isLoading: isGeoLoading, requestPosition } = useGeolocation()

  if (isLoading) return (
    <>
      <Helmet><title>خريطة المساجد - أئمة التراويح</title></Helmet>
      <div className="relative flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 shadow-sm">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        <div className="flex-1 bg-muted" />
      </div>
    </>
  )

  return (
    <>
      <Helmet><title>خريطة المساجد - أئمة التراويح</title></Helmet>
      <div className="relative flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Header bar */}
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 shadow-sm">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Link to="/">
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-sm font-bold">خريطة المساجد</h1>
          <span className="text-xs text-muted-foreground">
            {mosques?.length ?? 0} مسجد
          </span>
        </div>

        {/* Geolocation error */}
        {geoError && (
          <div className="bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
            {geoError.message}
          </div>
        )}

        {/* Map */}
        <div className="flex-1">
          <MosqueMap
            mosques={mosques ?? []}
            userPosition={position}
            onLocateMe={requestPosition}
            isLocating={isGeoLoading}
          />
        </div>
      </div>
    </>
  )
}
