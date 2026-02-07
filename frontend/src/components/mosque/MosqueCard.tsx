import { memo } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Youtube, MapPin, Play, Pause, Loader2, ChevronLeft, UserPlus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DistanceBadge } from './DistanceBadge'
import { FavoriteButton } from './FavoriteButton'
import { ShareButton } from './ShareButton'
import { MosqueIcon } from '@/components/icons'
import { useAudioPlayer } from '@/hooks'
import { cn } from '@/lib/utils'
import type { Mosque } from '@/types'

interface MosqueCardProps {
  mosque: Mosque
  className?: string
}

export const MosqueCard = memo(function MosqueCard({ mosque, className }: MosqueCardProps) {
  const {
    id,
    name,
    location,
    imam,
    audio_sample,
    youtube_link,
    map_link,
    distance,
  } = mosque

  const hasDistance = typeof distance === 'number'
  const { currentTrack, isPlaying, isLoading, play } = useAudioPlayer()
  const isCurrentMosque = currentTrack?.mosqueId === id
  const isCurrentPlaying = isCurrentMosque && isPlaying
  const isCurrentLoading = isCurrentMosque && isLoading

  const handleAudioPlay = () => {
    if (audio_sample) {
      play({
        mosqueId: id,
        mosqueName: name,
        imamName: imam ?? 'غير محدد',
        audioSrc: audio_sample,
      })
    }
  }

  return (
    <Card
      className={cn(
        'mosque-card group relative cursor-pointer overflow-hidden border border-transparent shadow-card',
        'transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-card-hover hover:border-accent/30',
        'animate-fade-in-up',
        hasDistance && 'border-s-[3px] border-accent',
        isCurrentPlaying && 'border-accent/50 shadow-[0_0_20px_rgba(196,160,82,0.12)]',
        className
      )}
    >
      <CardContent className="p-4 md:p-6">
        {/* Action buttons row — z-10 to sit above stretched link */}
        <div className="relative z-10 mb-4 flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <FavoriteButton mosqueId={id} mosqueName={name} size="sm" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>إضافة للمفضلة</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <ShareButton
                  mosqueId={id}
                  mosqueName={name}
                  imamName={imam ?? 'غير محدد'}
                  size="sm"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>مشاركة</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Header: Mosque name + Distance badge */}
        <div className="mb-3 md:mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg md:text-xl font-bold text-primary">
            {/* Mosque icon — styled like MakkahSchedulePage Moon icon */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <MosqueIcon className="h-4.5 w-4.5" />
            </div>
            {/* Stretched link — ::after covers entire card for full-card tappability */}
            <Link
              to={`/mosque/${id}`}
              className="transition-colors hover:text-primary-dark after:absolute after:inset-0 after:content-['']"
            >
              {name}
            </Link>
            <ChevronLeft className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:-translate-x-1" aria-hidden="true" />
          </h2>

          {hasDistance && <DistanceBadge distance={distance} />}
        </div>

        {/* Imam row — tappable play area when audio available — z-10 above stretched link */}
        <div className="relative z-10 mb-3">
          {audio_sample ? (
            <button
              onClick={handleAudioPlay}
              disabled={isCurrentLoading}
              className={cn(
                'group/play relative flex w-full items-center gap-3 overflow-hidden rounded-xl p-3 text-start',
                'transition-all duration-300',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1',
                'active:scale-[0.98]',
                isCurrentPlaying
                  ? 'border border-accent/30 bg-gradient-to-l from-accent/[0.08] via-accent/[0.03] to-primary/[0.04] shadow-[0_2px_12px_rgba(196,160,82,0.12)]'
                  : 'border border-primary/15 bg-gradient-to-l from-primary/[0.04] to-primary/[0.02] shadow-sm hover:border-accent/25 hover:shadow-md hover:from-primary/[0.06] hover:to-accent/[0.02]'
              )}
            >
              {/* Idle shimmer overlay — draws eye, GPU-only */}
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
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300',
                  isCurrentPlaying
                    ? 'bg-accent text-white shadow-[0_2px_12px_rgba(196,160,82,0.35)]'
                    : 'bg-primary text-white shadow-[0_2px_8px_rgba(13,75,51,0.2)] play-breath group-hover/play:shadow-[0_2px_12px_rgba(13,75,51,0.3)]'
                )}
              >
                {isCurrentLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isCurrentPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 translate-x-[1px]" />
                )}
              </div>

              {/* Imam name + status */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {imam ?? 'غير محدد'}
                </p>
                <p className={cn(
                  'mt-0.5 text-[11px] transition-colors duration-200',
                  isCurrentPlaying ? 'text-accent font-semibold' : 'text-muted-foreground'
                )}>
                  {isCurrentPlaying ? 'جارٍ التشغيل...' : 'اضغط للاستماع'}
                </p>
              </div>

              {/* Soundbars — GPU-composited with transform, no layout reflow */}
              <div className={cn(
                'flex items-end gap-[3px] h-5 w-4 shrink-0 transition-opacity duration-300',
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

              {/* YouTube button — inside the row, stops propagation */}
              {youtube_link && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={youtube_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        'bg-youtube text-white shadow-sm',
                        'transition-all duration-200',
                        'hover:-translate-y-0.5 hover:bg-youtube-dark'
                      )}
                      aria-label="شاهد على يوتيوب"
                    >
                      <Youtube className="h-4 w-4" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>شاهد على يوتيوب</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </button>
          ) : imam ? (
            /* Has imam but no audio */
            <div className="flex w-full items-center gap-3 rounded-xl border border-primary/10 bg-primary-light/30 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/[0.06]">
                <Play className="h-3.5 w-3.5 text-primary/25" />
              </div>
              <p className="flex-1 text-sm font-medium text-foreground/70">{imam}</p>
              {youtube_link && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={youtube_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        'bg-youtube text-white shadow-sm',
                        'transition-all duration-200',
                        'hover:-translate-y-0.5 hover:bg-youtube-dark'
                      )}
                      aria-label="شاهد على يوتيوب"
                    >
                      <Youtube className="h-4 w-4" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>شاهد على يوتيوب</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          ) : (
            /* No imam assigned */
            <Link
              to="/request"
              className={cn(
                'group/cta flex w-full items-center gap-3 rounded-xl border border-dashed border-primary/20 p-3',
                'bg-gradient-to-l from-accent/[0.04] to-primary/[0.02]',
                'transition-all duration-300',
                'hover:border-accent/40 hover:from-accent/[0.08] hover:to-primary/[0.04] hover:shadow-sm'
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/20 bg-primary/[0.04] transition-colors duration-300 group-hover/cta:border-accent/30 group-hover/cta:bg-accent/10">
                <UserPlus className="h-4 w-4 text-primary/40 transition-colors duration-300 group-hover/cta:text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground/50">لم يُحدد الإمام</p>
                <p className="mt-0.5 text-[11px] text-accent/70 opacity-0 transition-opacity duration-300 group-hover/cta:opacity-100">
                  ساعدنا بالتحديث
                </p>
              </div>
            </Link>
          )}
        </div>

        {/* Location row — z-10 above stretched link */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/10 bg-primary-light/50 p-2.5 md:p-3">
          <div className="flex items-center gap-2 text-foreground">
            <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
            <p className="break-words">حي {location}</p>
          </div>

          {map_link && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className={cn(
                    'h-9 gap-1.5 rounded-full border-border bg-white px-3',
                    'text-primary-dark shadow-sm',
                    'transition-all duration-200',
                    'hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-md'
                  )}
                >
                  <a
                    href={map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="button-text">فتح في قوقل ماب</span>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>فتح الموقع في خرائط قوقل</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
