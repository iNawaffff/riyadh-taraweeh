import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Heart, Share2, ArrowRight, MapPin, Landmark, SlidersHorizontal, Map } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MosqueGrid } from '@/components/mosque'
import { PageLoader } from '@/components/PageLoader'
import { useAuth } from '@/hooks/use-auth'
import { useFavorites, useMosques } from '@/hooks'
import { toast } from 'sonner'
import { LoginDialog } from '@/components/auth'

type SortOption = 'recent' | 'name'

export function FavoritesPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { favorites } = useFavorites()
  const { data: allMosques, isLoading: mosquesLoading } = useMosques()
  const [loginOpen, setLoginOpen] = useState(false)
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('recent')

  // Base favorites list (preserving order from context = recently added last)
  const favMosques = useMemo(() => {
    if (!allMosques) return []
    // Map by favorites order so index = recency (last = most recent)
    return favorites
      .map(id => allMosques.find(m => m.id === id))
      .filter(Boolean) as typeof allMosques
  }, [allMosques, favorites])

  // Unique areas from favorites
  const areas = useMemo(() => {
    const set = new Set(favMosques.map(m => m.area).filter(Boolean))
    return Array.from(set).sort()
  }, [favMosques])

  // Unique locations from favorites (filtered by area if active)
  const favLocations = useMemo(() => {
    const base = areaFilter !== 'all' ? favMosques.filter(m => m.area === areaFilter) : favMosques
    const set = new Set(base.map(m => m.location).filter(Boolean))
    return Array.from(set).sort()
  }, [favMosques, areaFilter])

  // Filtered + sorted
  const displayedMosques = useMemo(() => {
    let list = favMosques

    if (areaFilter !== 'all') {
      list = list.filter(m => m.area === areaFilter)
    }

    if (locationFilter !== 'all') {
      list = list.filter(m => m.location === locationFilter)
    }

    if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    } else {
      // "recent" = reverse favorites order (most recently added first)
      list = [...list].reverse()
    }

    return list
  }, [favMosques, areaFilter, locationFilter, sortBy])

  // Stats
  const stats = useMemo(() => {
    const uniqueAreas = new Set(favMosques.map(m => m.area).filter(Boolean)).size
    const uniqueLocations = new Set(favMosques.map(m => m.location).filter(Boolean)).size
    const withAudio = favMosques.filter(m => m.audio_sample).length
    return { total: favMosques.length, areas: uniqueAreas, locations: uniqueLocations, withAudio }
  }, [favMosques])

  const handleShare = async () => {
    if (!user) return
    const url = `${window.location.origin}/u/${user.username}`

    // Use Web Share API on mobile if available, fall back to clipboard
    if (navigator.share) {
      try {
        await navigator.share({ title: 'مفضلاتي - أئمة التراويح', url })
        return
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      toast.success('تم نسخ رابط الملف الشخصي')
    } catch {
      // Fallback for insecure context / older browsers
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      toast.success('تم نسخ رابط الملف الشخصي')
    }
  }

  const hasActiveFilter = areaFilter !== 'all' || locationFilter !== 'all'

  if (authLoading) return <PageLoader />

  // Unauthenticated state
  if (!isAuthenticated) {
    return (
      <>
        <Helmet><title>المفضلة - أئمة التراويح</title></Helmet>
        <div className="container flex flex-col items-center gap-6 py-24 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light">
            <Heart className="h-10 w-10 text-primary/40" />
          </div>
          <div className="space-y-2">
            <p className="text-xl font-bold text-foreground">سجل دخولك لحفظ مفضلاتك</p>
            <p className="text-sm text-muted-foreground">احفظ المساجد المفضلة وتابعها بسهولة</p>
          </div>
          <Button onClick={() => setLoginOpen(true)} className="h-12 px-8 text-base">
            تسجيل الدخول
          </Button>
        </div>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    )
  }

  return (
    <>
      <Helmet><title>المفضلة - أئمة التراويح</title></Helmet>
      <div className="container py-6">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold">المفضلة</h2>
            {stats.total > 0 && (
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <Link to="/map">
                    <Map className="h-4 w-4" />
                    خريطة
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
                  <Share2 className="h-4 w-4" />
                  مشاركة
                </Button>
              </div>
            )}
          </div>

          {/* Spotify-style inline stats */}
          {stats.total > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {stats.total} {stats.total === 1 ? 'مسجد' : 'مساجد'}
              <span className="mx-1.5">·</span>
              {stats.areas} {stats.areas === 1 ? 'منطقة' : 'مناطق'}
              <span className="mx-1.5">·</span>
              {stats.locations} {stats.locations === 1 ? 'حي' : 'أحياء'}
              {stats.withAudio > 0 && (
                <>
                  <span className="mx-1.5">·</span>
                  {stats.withAudio} بتلاوة صوتية
                </>
              )}
            </p>
          )}
        </div>

        {/* Filter bar */}
        {stats.total > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {/* Area filter */}
            {areas.length > 1 && (
              <Select value={areaFilter} onValueChange={v => { setAreaFilter(v); setLocationFilter('all') }}>
                <SelectTrigger className="h-9 w-auto min-w-[140px] gap-1.5 bg-white text-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="جميع المناطق" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المناطق</SelectItem>
                  {areas.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {favLocations.length > 1 && (
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="h-9 w-auto min-w-[140px] gap-1.5 bg-white text-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="جميع الأحياء" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأحياء</SelectItem>
                  {favLocations.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Sort */}
            <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-9 w-auto min-w-[140px] gap-1.5 bg-white text-sm">
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">الأحدث</SelectItem>
                <SelectItem value="name">الاسم</SelectItem>
              </SelectContent>
            </Select>

            {/* Active filter indicator */}
            {hasActiveFilter && (
              <button
                onClick={() => { setAreaFilter('all'); setLocationFilter('all') }}
                className="text-xs text-primary hover:underline"
              >
                إزالة الفلتر
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {mosquesLoading ? (
          <MosqueGrid mosques={[]} isLoading={true} />
        ) : displayedMosques.length > 0 ? (
          <>
            {hasActiveFilter && (
              <p className="mb-4 text-sm text-muted-foreground">
                عرض {displayedMosques.length} من {stats.total}
              </p>
            )}
            <MosqueGrid mosques={displayedMosques} />
          </>
        ) : stats.total > 0 && hasActiveFilter ? (
          /* Filter returned no results but user has favorites */
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <MapPin className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground">لا توجد مساجد في هذا الحي</p>
            <button
              onClick={() => { setAreaFilter('all'); setLocationFilter('all') }}
              className="text-sm text-primary hover:underline"
            >
              عرض الكل
            </button>
          </div>
        ) : (
          /* True empty state — no favorites at all */
          <div className="flex flex-col items-center gap-5 py-20 text-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-light">
                <Landmark className="h-10 w-10 text-primary/30" />
              </div>
              <div className="absolute -bottom-1 -start-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                <Heart className="h-4 w-4 text-red-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-lg font-medium text-foreground">لم تضف أي مسجد بعد</p>
              <p className="text-sm text-muted-foreground">اضغط على القلب في أي مسجد لإضافته هنا</p>
            </div>
            <Button asChild variant="default" className="mt-2 gap-2">
              <Link to="/">
                <ArrowRight className="h-4 w-4" />
                تصفح المساجد
              </Link>
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
