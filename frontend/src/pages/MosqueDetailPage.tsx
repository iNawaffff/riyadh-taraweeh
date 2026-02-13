import { useState, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMosque, useAudioPlayer, useAuth } from '@/hooks'
import { ErrorReportModal } from '@/components/mosque/ErrorReportModal'
import { FavoriteButton } from '@/components/mosque/FavoriteButton'
import { LoginDialog } from '@/components/auth'
import { MosqueStructuredData, BreadcrumbStructuredData } from '@/components/seo'

const TransferDialog = lazy(() => import('@/components/mosque/TransferDialog').then(m => ({ default: m.TransferDialog })))
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  MapPin,
  Compass,
  User,
  UserPlus,
  ExternalLink,
  Play,
  Pause,
  Youtube,
  AlertCircle,
  ArrowRight,
  Loader2,
  Home,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function MosqueDetailPage() {
  const { id } = useParams<{ id: string }>()
  const mosqueId = parseInt(id ?? '0', 10)

  const { data: mosque, isLoading, isError } = useMosque(mosqueId)
  const { currentTrack, isPlaying, isLoading: isAudioLoading, play } = useAudioPlayer()

  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isDescExpanded, setIsDescExpanded] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const { isAuthenticated } = useAuth()

  const isCurrentPlaying = currentTrack?.mosqueId === mosqueId && isPlaying
  const isCurrentLoading = currentTrack?.mosqueId === mosqueId && isAudioLoading

  const handleAudioClick = () => {
    if (mosque?.audio_sample) {
      play({
        mosqueId,
        mosqueName: mosque.name,
        imamName: mosque.imam ?? 'غير محدد',
        audioSrc: mosque.audio_sample,
      })
    }
  }

  // Loading state
  if (isLoading) {
    return <MosqueDetailSkeleton />
  }

  // Error state
  if (isError || !mosque) {
    return (
      <div className="container py-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
        <h2 className="mb-2 text-xl font-bold text-destructive">
          حدث خطأ أثناء تحميل بيانات المسجد
        </h2>
        <p className="mb-6 text-muted-foreground">
          الرجاء المحاولة لاحقاً أو العودة للقائمة الرئيسية
        </p>
        <Button asChild>
          <Link to="/">
            <ArrowRight className="me-2 h-4 w-4" />
            العودة للرئيسية
          </Link>
        </Button>
      </div>
    )
  }

  const { name, location, area, map_link, latitude, longitude, imam, audio_sample, youtube_link } = mosque

  // Generate SEO description
  const description = imam
    ? `مسجد ${name} هو أحد المساجد المميزة في منطقة ${area} بالرياض، يقود صلاة التراويح فيه ${imam} خلال رمضان ١٤٤٧. يتميز المسجد بموقعه المناسب وسهولة الوصول إليه للمصلين الراغبين بالاستماع لتلاوة متميزة.`
    : `مسجد ${name} هو أحد المساجد المميزة في منطقة ${area} بمدينة الرياض، يُقام فيه صلاة التراويح والقيام خلال شهر رمضان المبارك. يعتبر من الوجهات المفضلة للمصلين خلال ليالي الشهر الفضيل.`

  return (
    <>
      <MosqueStructuredData mosque={mosque} />
      <BreadcrumbStructuredData items={[
        { name: 'الرئيسية', url: '/' },
        { name: name, url: `/mosque/${mosqueId}` },
      ]} />

      {/* Page Header - Compact sticky on mobile */}
      <header className="sticky top-[52px] z-30 md:static">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark py-4 text-white md:py-10">
          <div className="islamic-pattern-large absolute inset-0" />
          <div className="container relative">
            <div className="flex items-center justify-between gap-3 md:block">
              <div className="min-w-0 flex-1">
                <h1 className="flex items-center gap-2 text-lg font-bold md:gap-3 md:text-2xl lg:text-3xl">
                  <Home className="hidden h-7 w-7 shrink-0 text-accent-light md:block" aria-hidden="true" />
                  <span className="truncate">{name}</span>
                </h1>
                {imam ? (
                  <p className="mt-1 truncate text-sm text-white/80 md:mt-2 md:text-lg">
                    <User className="me-1.5 inline h-3.5 w-3.5 md:h-4 md:w-4" />
                    {imam}
                  </p>
                ) : (
                  <p className="mt-1 truncate text-sm text-white/50 md:mt-2 md:text-lg">
                    <User className="me-1.5 inline h-3.5 w-3.5 md:h-4 md:w-4" />
                    لم يُحدد الإمام
                  </p>
                )}
              </div>

              {/* Quick actions - mobile only */}
              <div className="flex shrink-0 gap-2 md:hidden">
                <FavoriteButton mosqueId={mosqueId} mosqueName={name} size="sm" />
              </div>
            </div>

            <span className="mt-2 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-xs backdrop-blur-sm md:mt-3 md:px-3 md:py-1 md:text-sm">
              {area}
            </span>
          </div>
        </div>
      </header>

      <div className="container py-4 md:py-6">
        {/* Breadcrumb */}
        <nav className="mb-4" aria-label="مسار التنقل">
          <ol className="flex flex-wrap items-center gap-2 text-sm">
            <li>
              <Link
                to="/"
                className="text-primary transition-colors hover:text-accent hover:underline"
              >
                الرئيسية
              </Link>
            </li>
            <li className="text-muted-foreground">&gt;</li>
            <li className="text-muted-foreground">{name}</li>
          </ol>
        </nav>

        <Card className="border-0 shadow-card">
          <CardContent className="p-6">
            {/* Description - Collapsible on mobile */}
            <div className="mb-6 rounded-lg border-e-[3px] border-accent bg-primary-light p-4 leading-relaxed md:p-5">
              <p className={cn(
                'text-justify text-sm text-foreground md:text-base',
                !isDescExpanded && 'line-clamp-2 md:line-clamp-none'
              )}>
                {description}
              </p>
              <button
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="mt-2 flex items-center gap-1 text-xs text-primary md:hidden"
              >
                {isDescExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    عرض أقل
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    عرض المزيد...
                  </>
                )}
              </button>
            </div>

            {/* Mosque Information Section */}
            <section className="mb-6">
              <h2 className="mb-4 border-b-2 border-accent pb-2 text-lg font-bold text-primary">
                معلومات المسجد
              </h2>

              <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
                {/* Location - Horizontal on mobile */}
                <div className="flex items-center gap-3 rounded-lg border border-primary/10 bg-primary-light/50 p-3 md:flex-col md:items-start md:p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 md:hidden">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="mb-1 hidden items-center gap-2 font-bold text-primary md:flex">
                      <MapPin className="h-4 w-4" />
                      الحي:
                    </span>
                    <span className="text-xs font-medium text-muted-foreground md:hidden">الحي</span>
                    <span className="block break-words text-sm md:text-base">حي {location}</span>
                  </div>
                </div>

                {/* Area - Horizontal on mobile */}
                <div className="flex items-center gap-3 rounded-lg border border-primary/10 bg-primary-light/50 p-3 md:flex-col md:items-start md:p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 md:hidden">
                    <Compass className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="mb-1 hidden items-center gap-2 font-bold text-primary md:flex">
                      <Compass className="h-4 w-4" />
                      المنطقة:
                    </span>
                    <span className="text-xs font-medium text-muted-foreground md:hidden">المنطقة</span>
                    <span className="block text-sm md:text-base">{area}</span>
                  </div>
                </div>

                {/* Imam - Horizontal on mobile */}
                {imam ? (
                  <div className="flex items-center gap-3 rounded-lg border border-primary/10 bg-primary-light/50 p-3 md:col-span-2 md:flex-col md:items-start md:p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 md:hidden">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 md:w-full">
                      <span className="mb-1 hidden items-center gap-2 font-bold text-primary md:flex">
                        <User className="h-4 w-4" />
                        إمام التراويح:
                      </span>
                      <span className="text-xs font-medium text-muted-foreground md:hidden">إمام التراويح</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm md:text-base">{imam}</span>
                        <button
                          onClick={() => {
                            if (isAuthenticated) {
                              setIsTransferOpen(true)
                            } else {
                              setShowLoginDialog(true)
                            }
                          }}
                          className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-primary/20 px-2.5 text-xs text-primary transition-colors hover:bg-primary hover:text-white md:h-auto md:py-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          تغيّر؟
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* No imam — polished empty state with contribute CTA */
                  <div className="group relative overflow-hidden rounded-lg border border-dashed border-primary/20 bg-gradient-to-l from-accent/[0.04] to-primary/[0.02] p-3 md:col-span-2 md:p-4">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/20 bg-primary/[0.04] md:h-12 md:w-12">
                        <UserPlus className="h-4 w-4 text-primary/30 md:h-5 md:w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="mb-1 hidden items-center gap-2 font-bold text-primary/60 md:flex">
                          <User className="h-4 w-4" />
                          إمام التراويح:
                        </span>
                        <span className="text-xs font-medium text-muted-foreground md:hidden">إمام التراويح</span>
                        <p className="text-sm text-foreground/50 md:text-base">لم يُحدد الإمام بعد</p>
                      </div>
                      <Link
                        to="/request"
                        className={cn(
                          'flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 text-xs font-medium text-accent-foreground/70',
                          'transition-all duration-200',
                          'hover:bg-accent/20 hover:text-accent-foreground hover:shadow-sm',
                          'md:h-auto md:py-1.5 md:px-4'
                        )}
                      >
                        <UserPlus className="h-3 w-3" />
                        أضف الإمام
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Audio Section - Tappable play area */}
              {audio_sample && (
                <button
                  onClick={handleAudioClick}
                  disabled={isCurrentLoading}
                  className={cn(
                    'group/play relative mt-4 flex w-full items-center gap-4 overflow-hidden rounded-xl p-4 md:p-5 text-start',
                    'transition-all duration-300',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2',
                    'active:scale-[0.98]',
                    isCurrentPlaying
                      ? 'border border-accent/30 bg-gradient-to-l from-accent/[0.08] via-accent/[0.03] to-primary/[0.04] shadow-[0_2px_16px_rgba(196,160,82,0.14)]'
                      : 'border border-primary/15 bg-gradient-to-l from-primary/[0.04] to-primary/[0.02] shadow-sm hover:border-accent/25 hover:shadow-md hover:from-primary/[0.06] hover:to-accent/[0.02]'
                  )}
                >
                  {/* Idle shimmer overlay */}
                  {!isCurrentPlaying && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 transition-opacity duration-500 group-hover/play:opacity-100" aria-hidden>
                      <div
                        className="absolute inset-0 w-1/2"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(196,160,82,0.06), transparent)',
                          animation: 'audioRowShimmer 2.5s ease-in-out infinite',
                        }}
                      />
                    </div>
                  )}

                  {/* Play/Pause circle */}
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-300',
                      isCurrentPlaying
                        ? 'bg-accent text-white shadow-[0_2px_16px_rgba(196,160,82,0.35)]'
                        : 'bg-primary text-white shadow-[0_2px_8px_rgba(13,75,51,0.2)] play-breath group-hover/play:shadow-[0_2px_14px_rgba(13,75,51,0.3)]'
                    )}
                  >
                    {isCurrentLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isCurrentPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 translate-x-[1px]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-primary">استمع للتلاوة</p>
                    <p className={cn(
                      'mt-0.5 truncate text-sm transition-colors duration-200',
                      isCurrentPlaying ? 'text-accent font-semibold' : 'text-muted-foreground'
                    )}>
                      {isCurrentPlaying ? 'جارٍ التشغيل...' : (imam ?? 'غير محدد') + ' · اضغط للاستماع'}
                    </p>
                  </div>

                  {/* Soundbars — GPU-composited with transform, no layout reflow */}
                  <div className={cn(
                    'flex items-end gap-[3px] h-6 w-5 shrink-0 transition-opacity duration-300',
                    isCurrentPlaying ? 'opacity-100' : 'opacity-0'
                  )} aria-hidden>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-[4px] w-[3px] origin-bottom rounded-full bg-accent will-change-transform"
                        style={{
                          animation: isCurrentPlaying
                            ? `soundbar 0.8s ease-in-out ${i * 0.15}s infinite alternate`
                            : 'none',
                        }}
                      />
                    ))}
                  </div>
                </button>
              )}

              {/* Desktop: Action Buttons inline */}
              <div className="mt-5 hidden flex-wrap justify-start gap-3 md:flex">
                {map_link && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        asChild
                        className="gap-2 rounded-full border-primary bg-primary-light text-primary hover:bg-primary hover:text-white"
                      >
                        <a href={map_link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          الاتجاهات في خرائط Google
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>فتح الموقع في خرائط قوقل</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {youtube_link && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        className="gap-2 rounded-full bg-youtube text-white hover:bg-youtube-dark"
                      >
                        <a href={youtube_link} target="_blank" rel="noopener noreferrer">
                          <Youtube className="h-4 w-4" />
                          مشاهدة على YouTube
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>شاهد على يوتيوب</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </section>

            {/* Map Section */}
            {latitude && longitude && (
              <section className="mb-6">
                <h2 className="mb-4 border-b-2 border-accent pb-2 text-lg font-bold text-primary">
                  الموقع على الخريطة
                </h2>
                <div className="relative aspect-video overflow-hidden rounded-xl border border-border shadow-card">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`خريطة ${name}`}
                    src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
                    className="absolute inset-0"
                  />
                </div>
              </section>
            )}

            {/* Back Link & Report - Desktop only here */}
            <div className="mt-8 hidden flex-wrap items-center justify-center gap-4 md:flex">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full bg-primary-light px-5 py-2.5 font-medium text-primary transition-all hover:bg-primary hover:text-white"
              >
                <ArrowRight className="h-4 w-4" />
                العودة إلى قائمة المساجد
              </Link>

              <button
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                ابلاغ عن خطأ
              </button>
            </div>

            {/* Mobile: Report error link */}
            <div className="mt-6 flex justify-center md:hidden">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                ابلاغ عن خطأ
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Mobile bottom spacer for sticky action bar */}
        <div className="h-20 md:hidden" />
      </div>

      {/* Mobile: Fixed bottom action bar */}
      {(map_link || youtube_link || !imam) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 pb-safe backdrop-blur-md md:hidden">
          <div className="container flex gap-3">
            {map_link && (
              <Button variant="outline" asChild className="h-12 flex-1 gap-2 rounded-xl border-primary text-primary">
                <a href={map_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  الاتجاهات
                </a>
              </Button>
            )}
            {youtube_link && (
              <Button asChild className="h-12 flex-1 gap-2 rounded-xl bg-youtube text-white hover:bg-youtube-dark">
                <a href={youtube_link} target="_blank" rel="noopener noreferrer">
                  <Youtube className="h-4 w-4" />
                  يوتيوب
                </a>
              </Button>
            )}
            {!imam && (
              <Button asChild className="h-12 flex-1 gap-2 rounded-xl">
                <Link to="/request">
                  <UserPlus className="h-4 w-4" />
                  أضف الإمام
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Transfer Dialog */}
      {isAuthenticated && isTransferOpen && (
        <Suspense fallback={null}>
          <TransferDialog
            open={isTransferOpen}
            onOpenChange={setIsTransferOpen}
            mosqueId={mosqueId}
            mosqueName={name}
          />
        </Suspense>
      )}

      {/* Error Report Modal */}
      <ErrorReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        mosqueId={mosqueId}
        mosqueName={name}
      />

      {/* Login Dialog for transfer button */}
      <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
    </>
  )
}

// Loading skeleton component
function MosqueDetailSkeleton() {
  return (
    <>
      <div className="bg-gradient-to-br from-primary to-primary-dark py-10">
        <div className="container">
          <Skeleton className="h-9 w-64 bg-white/20" />
        </div>
      </div>
      <div className="container py-6">
        <Card className="border-0 shadow-card">
          <CardContent className="p-6">
            <Skeleton className="mb-6 h-32 w-full" />
            <Skeleton className="mb-4 h-6 w-32" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20 md:col-span-2" />
            </div>
            <div className="mt-5 flex gap-3">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
