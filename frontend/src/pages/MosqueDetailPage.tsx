import { useState, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMosque, useAudioPlayer, useAuth } from '@/hooks'
import { ErrorReportModal } from '@/components/mosque/ErrorReportModal'

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
  ExternalLink,
  Play,
  Pause,
  Youtube,
  AlertCircle,
  ArrowRight,
  Loader2,
  Home,
  Music,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function MosqueDetailPage() {
  const { id } = useParams<{ id: string }>()
  const mosqueId = parseInt(id ?? '0', 10)

  const { data: mosque, isLoading, isError } = useMosque(mosqueId)
  const { currentTrack, isPlaying, isLoading: isAudioLoading, play } = useAudioPlayer()

  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
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
    ? `مسجد ${name} هو أحد المساجد المميزة في منطقة ${area} بالرياض، يقود صلاة التراويح فيه ${imam} خلال رمضان ١٤٤٦. يتميز المسجد بموقعه المناسب وسهولة الوصول إليه للمصلين الراغبين بالاستماع لتلاوة متميزة.`
    : `مسجد ${name} هو أحد المساجد المميزة في منطقة ${area} بمدينة الرياض، يُقام فيه صلاة التراويح والقيام خلال شهر رمضان المبارك. يعتبر من الوجهات المفضلة للمصلين خلال ليالي الشهر الفضيل.`

  return (
    <>
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark py-10 text-white">
        <div className="islamic-pattern-large absolute inset-0" />
        <div className="container relative">
          <h1 className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
            <Home className="h-7 w-7 text-accent-light" aria-hidden="true" />
            {name}
          </h1>
          {imam && (
            <p className="mt-2 text-lg text-white/80">
              <User className="me-1.5 inline h-4 w-4" />
              {imam}
            </p>
          )}
          <span className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-sm backdrop-blur-sm">
            {area}
          </span>
        </div>
      </div>

      <div className="container py-6">
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
            {/* Description */}
            <div className="mb-6 rounded-lg border-e-[3px] border-accent bg-primary-light p-5 leading-relaxed">
              <p className="text-justify text-foreground">{description}</p>
            </div>

            {/* Mosque Information Section */}
            <section className="mb-6">
              <h2 className="mb-4 border-b-2 border-accent pb-2 text-lg font-bold text-primary">
                معلومات المسجد
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Location */}
                <div className="flex flex-col rounded-lg border border-primary/10 bg-primary-light/50 p-4">
                  <span className="mb-1 flex items-center gap-2 font-bold text-primary">
                    <MapPin className="h-4 w-4" />
                    الموقع:
                  </span>
                  <span className="break-words">حي {location}</span>
                </div>

                {/* Area */}
                <div className="flex flex-col rounded-lg border border-primary/10 bg-primary-light/50 p-4">
                  <span className="mb-1 flex items-center gap-2 font-bold text-primary">
                    <Compass className="h-4 w-4" />
                    المنطقة:
                  </span>
                  <span>{area}</span>
                </div>

                {/* Imam */}
                {imam && (
                  <div className="flex flex-col rounded-lg border border-primary/10 bg-primary-light/50 p-4 md:col-span-2">
                    <span className="mb-1 flex items-center gap-2 font-bold text-primary">
                      <User className="h-4 w-4" />
                      إمام التراويح:
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span>{imam}</span>
                      {isAuthenticated && (
                        <button
                          onClick={() => setIsTransferOpen(true)}
                          className="flex items-center gap-1 rounded-full border border-primary/20 px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary hover:text-white"
                        >
                          <RefreshCw className="h-3 w-3" />
                          تغيّر؟
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Audio Section - dedicated card */}
              {audio_sample && (
                <div className="mt-4 overflow-hidden rounded-lg border border-accent/20 bg-gradient-to-l from-accent/5 to-primary-light/50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                        <Music className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-bold text-primary">استمع للتلاوة</p>
                        {imam && <p className="text-sm text-muted-foreground">{imam}</p>}
                      </div>
                    </div>
                    <Button
                      onClick={handleAudioClick}
                      disabled={isCurrentLoading}
                      className={cn(
                        'gap-2 rounded-full px-6',
                        isCurrentPlaying
                          ? 'bg-primary-dark text-white'
                          : 'bg-primary text-white hover:bg-primary-dark'
                      )}
                    >
                      {isCurrentLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : isCurrentPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                      {isCurrentPlaying ? 'إيقاف' : 'تشغيل'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 flex flex-wrap justify-center gap-3 md:justify-start">
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

            {/* Back Link */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
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
          </CardContent>
        </Card>
      </div>

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
