import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { Heart, Share2, MapPin, SlidersHorizontal, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { MosqueGrid } from '@/components/mosque'
import { fetchPublicProfile } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { PublicProfile } from '@/types'

type SortOption = 'name' | 'area'

export function PublicFavoritesPage() {
  const { username } = useParams<{ username: string }>()
  const { data: profile, isLoading, error } = useQuery<PublicProfile>({
    queryKey: ['profile', username],
    queryFn: () => fetchPublicProfile(username!),
    enabled: !!username,
  })

  const [areaFilter, setAreaFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name')

  const mosques = profile?.mosques ?? []

  // Unique areas from favorites
  const areas = useMemo(() => {
    const set = new Set(mosques.map(m => m.area).filter(Boolean))
    return Array.from(set).sort()
  }, [mosques])

  // Unique locations (filtered by area if active)
  const locations = useMemo(() => {
    const base = areaFilter !== 'all' ? mosques.filter(m => m.area === areaFilter) : mosques
    const set = new Set(base.map(m => m.location).filter(Boolean))
    return Array.from(set).sort()
  }, [mosques, areaFilter])

  // Filtered + sorted
  const displayedMosques = useMemo(() => {
    let list = [...mosques]

    if (areaFilter !== 'all') {
      list = list.filter(m => m.area === areaFilter)
    }
    if (locationFilter !== 'all') {
      list = list.filter(m => m.location === locationFilter)
    }

    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    } else if (sortBy === 'area') {
      list.sort((a, b) => (a.area || '').localeCompare(b.area || '', 'ar'))
    }

    return list
  }, [mosques, areaFilter, locationFilter, sortBy])

  // Stats
  const stats = useMemo(() => {
    const uniqueAreas = new Set(mosques.map(m => m.area).filter(Boolean)).size
    const uniqueLocations = new Set(mosques.map(m => m.location).filter(Boolean)).size
    const withAudio = mosques.filter(m => m.audio_sample).length
    return { total: mosques.length, areas: uniqueAreas, locations: uniqueLocations, withAudio }
  }, [mosques])

  const handleShare = async () => {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title: `مفضلات ${profile?.display_name || profile?.username} - أئمة التراويح`,
          url,
        })
        return
      } catch {
        // User cancelled — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      toast.success('تم نسخ الرابط')
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      toast.success('تم نسخ الرابط')
    }
  }

  const hasActiveFilter = areaFilter !== 'all' || locationFilter !== 'all'
  const ownerName = profile?.display_name || profile?.username || ''

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <div className="container py-6">
        {/* Owner strip skeleton */}
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
        {/* Stats skeleton */}
        <Skeleton className="mb-6 h-4 w-56 rounded" />
        {/* Grid skeleton */}
        <MosqueGrid mosques={[]} isLoading={true} />
      </div>
    )
  }

  // --- Error / not found ---
  if (error || !profile) {
    return (
      <>
        <Helmet><title>المستخدم غير موجود - أئمة التراويح</title></Helmet>
        <div className="container flex flex-col items-center gap-5 py-24 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-light">
            <Heart className="h-10 w-10 text-primary/30" />
          </div>
          <p className="text-lg font-medium text-foreground">المستخدم غير موجود</p>
          <p className="text-sm text-muted-foreground">تأكد من صحة الرابط</p>
          <Button asChild className="mt-2 gap-2 rounded-full">
            <Link to="/">
              <ArrowRight className="h-4 w-4" />
              تصفح المساجد
            </Link>
          </Button>
        </div>
      </>
    )
  }

  // --- Empty favorites ---
  if (mosques.length === 0) {
    return (
      <>
        <Helmet>
          <title>مفضلات {ownerName} - أئمة التراويح</title>
        </Helmet>
        <div className="container flex flex-col items-center gap-5 py-24 text-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-light">
              <Heart className="h-10 w-10 text-primary/25" />
            </div>
            {profile.avatar_url && (
              <img
                src={profile.avatar_url}
                alt=""
                className="absolute -bottom-1 -start-1 h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <p className="text-lg font-medium text-foreground">
              {ownerName} لم يضف مساجد بعد
            </p>
            <p className="text-sm text-muted-foreground">لا توجد مساجد في المفضلة حالياً</p>
          </div>
          <Button asChild className="mt-2 gap-2 rounded-full">
            <Link to="/">
              <ArrowRight className="h-4 w-4" />
              تصفح المساجد
            </Link>
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>مفضلات {ownerName} - أئمة التراويح</title>
        <meta name="description" content={`قائمة المساجد المفضلة لـ ${ownerName} - ${stats.total} مساجد في ${stats.areas} مناطق`} />
      </Helmet>

      <div className="container py-6">
        {/* ── Owner strip ── */}
        <div className="hero-fade-in mb-5 flex items-center justify-between gap-3">
          <Link
            to={`/u/${username}`}
            className="group flex items-center gap-3 rounded-full transition-colors"
          >
            {/* Avatar */}
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-10 w-10 rounded-full border-2 border-primary/10 object-cover shadow-sm transition-shadow group-hover:shadow-md"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/10 bg-primary-light text-sm font-bold text-primary shadow-sm">
                {ownerName[0]}
              </div>
            )}
            {/* Name + label */}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {ownerName}
              </p>
              <p className="text-xs text-muted-foreground">المفضلة</p>
            </div>
          </Link>

          {/* Share */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-1.5 rounded-full"
          >
            <Share2 className="h-3.5 w-3.5" />
            مشاركة
          </Button>
        </div>

        {/* ── Thin gold accent line ── */}
        <div className="hero-fade-in animation-delay-150 mb-5 h-px bg-gradient-to-l from-transparent via-accent/40 to-transparent" />

        {/* ── Page header ── */}
        <div className="hero-fade-in animation-delay-150 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Heart className="h-5 w-5 text-destructive/70" />
              المفضلة
            </h1>
          </div>

          {/* Spotify-style inline stats */}
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
        </div>

        {/* ── Filter bar ── */}
        <div
          className={cn(
            'slide-in-right mb-6 flex flex-wrap items-center gap-3',
          )}
          style={{ animationDelay: '80ms' }}
        >
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

          {/* Location filter */}
          {locations.length > 1 && (
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="h-9 w-auto min-w-[140px] gap-1.5 bg-white text-sm">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="جميع الأحياء" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأحياء</SelectItem>
                {locations.map(loc => (
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
              <SelectItem value="name">الاسم</SelectItem>
              <SelectItem value="area">المنطقة</SelectItem>
            </SelectContent>
          </Select>

          {/* Active filter clear */}
          {hasActiveFilter && (
            <button
              onClick={() => { setAreaFilter('all'); setLocationFilter('all') }}
              className="text-xs text-primary hover:underline"
            >
              إزالة الفلتر
            </button>
          )}
        </div>

        {/* ── Content ── */}
        {displayedMosques.length > 0 ? (
          <>
            {hasActiveFilter && (
              <p className="mb-4 text-sm text-muted-foreground">
                عرض {displayedMosques.length} من {stats.total}
              </p>
            )}
            <MosqueGrid mosques={displayedMosques} />
          </>
        ) : hasActiveFilter ? (
          /* Filter returned no results */
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
        ) : null}

        {/* ── Browse CTA ── */}
        <div
          className="slide-in-right mt-10 flex flex-col items-center gap-3 text-center"
          style={{ animationDelay: '200ms' }}
        >
          <div className="flex items-center gap-4" aria-hidden>
            <div className="h-px w-12 bg-gradient-to-l from-accent/40 to-transparent" />
            <div className="flex gap-1">
              <div className="h-1 w-1 rounded-full bg-accent/40" />
              <div className="h-1 w-1 rounded-full bg-accent/60" />
              <div className="h-1 w-1 rounded-full bg-accent/40" />
            </div>
            <div className="h-px w-12 bg-gradient-to-r from-accent/40 to-transparent" />
          </div>
          <p className="text-sm text-muted-foreground">اكتشف المزيد من المساجد</p>
          <Button asChild variant="outline" className="gap-2 rounded-full">
            <Link to="/">
              <ArrowRight className="h-4 w-4" />
              تصفح المساجد
            </Link>
          </Button>
        </div>
      </div>
    </>
  )
}
