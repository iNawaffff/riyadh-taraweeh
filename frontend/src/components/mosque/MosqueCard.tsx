import { Link } from 'react-router-dom'
import { ExternalLink, Youtube, MapPin, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AudioButton } from '@/components/audio/AudioButton'
import { DistanceBadge } from './DistanceBadge'
import { FavoriteButton } from './FavoriteButton'
import { ShareButton } from './ShareButton'
import { cn } from '@/lib/utils'
import type { Mosque } from '@/types'

interface MosqueCardProps {
  mosque: Mosque
  className?: string
}

export function MosqueCard({ mosque, className }: MosqueCardProps) {
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

  return (
    <Card
      className={cn(
        'mosque-card group relative overflow-hidden border border-transparent shadow-card',
        'transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-card-hover hover:border-accent/30',
        'animate-fade-in-up',
        hasDistance && 'border-s-[3px] border-accent',
        className
      )}
    >
      <CardContent className="p-4 md:p-6">
        {/* Action buttons row */}
        <div className="mb-4 flex items-center justify-between">
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
            {/* Mosque icon */}
            <img
              src="/static/images/mosque-icon.svg"
              alt=""
              className="h-6 w-6"
              aria-hidden="true"
            />
            <Link
              to={`/mosque/${id}`}
              className="transition-colors hover:text-primary-dark"
            >
              {name}
            </Link>
          </h2>

          {hasDistance && <DistanceBadge distance={distance} />}
        </div>

        {/* Imam info row */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/10 bg-primary-light/50 p-2.5 md:p-3">
          <div className="flex items-center gap-2 text-foreground">
            <User className="h-5 w-5 text-primary" aria-hidden="true" />
            <p>{imam ?? 'غير محدد'}</p>
          </div>

          {/* Audio & YouTube buttons */}
          <div className="flex items-center gap-2">
            {audio_sample && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <AudioButton
                      mosqueId={id}
                      mosqueName={name}
                      imamName={imam ?? 'غير محدد'}
                      audioSrc={audio_sample}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>استمع للتلاوة</p>
                </TooltipContent>
              </Tooltip>
            )}

            {youtube_link && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={youtube_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full',
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
        </div>

        {/* Location row */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/10 bg-primary-light/50 p-2.5 md:p-3">
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
}
