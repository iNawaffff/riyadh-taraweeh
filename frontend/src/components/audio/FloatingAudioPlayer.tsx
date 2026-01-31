import { useCallback } from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { Play, Pause, X, Loader2, Volume2 } from 'lucide-react'
import { useAudioPlayer } from '@/hooks'
import { cn } from '@/lib/utils'

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function FloatingAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    progress,
    duration,
    currentTime,
    pause,
    resume,
    stop,
    seek,
  } = useAudioPlayer()

  // Handle slider value change (smooth seeking)
  const handleValueChange = useCallback(
    (value: number[]) => {
      seek(value[0])
    },
    [seek]
  )

  // Don't render if no track is loaded
  if (!currentTrack) return null

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-gradient-to-t from-primary-dark/95 to-primary/95 backdrop-blur-md',
        'border-t border-white/10 shadow-lg',
        'transform transition-transform duration-300 ease-out',
        'animate-in slide-in-from-bottom-full'
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Progress slider using Radix UI - smooth and accessible */}
      <SliderPrimitive.Root
        className="group/slider relative flex w-full touch-none select-none items-center h-6 cursor-pointer px-2"
        value={[progress]}
        onValueChange={handleValueChange}
        max={100}
        step={0.1}
        dir="ltr"
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/20">
          <SliderPrimitive.Range className="absolute h-full bg-accent" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            'block h-5 w-5 rounded-full bg-white shadow-lg border-2 border-accent',
            'transition-all cursor-grab active:cursor-grabbing',
            'opacity-0 group-hover/slider:opacity-100 focus-visible:opacity-100 active:opacity-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary',
            'hover:scale-110 active:scale-125'
          )}
        />
      </SliderPrimitive.Root>

      {/* Player content */}
      <div className="container flex items-center gap-4 py-3">
        {/* Play/Pause button */}
        <button
          onClick={isPlaying ? pause : resume}
          disabled={isLoading}
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            'bg-white text-primary shadow-md',
            'transition-all duration-200',
            'hover:scale-105 hover:bg-accent-light',
            'disabled:opacity-50'
          )}
          aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 translate-x-0.5" />
          )}
        </button>

        {/* Track info */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 shrink-0 text-accent" />
            <span className="truncate font-medium text-white">
              {currentTrack.mosqueName}
            </span>
          </div>
          <span className="truncate text-sm text-white/70">
            {currentTrack.imamName}
          </span>
        </div>

        {/* Time display - visible on all screens */}
        <div className="text-xs text-white/70 sm:text-sm" dir="ltr">
          <span>{formatTime(currentTime)}</span>
          <span className="mx-1">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Close button */}
        <button
          onClick={stop}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            'text-white/70 transition-all duration-200',
            'hover:bg-white/10 hover:text-white'
          )}
          aria-label="إغلاق المشغل"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
