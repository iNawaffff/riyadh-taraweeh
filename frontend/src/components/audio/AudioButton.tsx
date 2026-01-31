import { Play, Pause, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAudioPlayer } from '@/hooks'
import { cn } from '@/lib/utils'

interface AudioButtonProps {
  mosqueId: number
  mosqueName: string
  imamName: string
  audioSrc: string
  className?: string
}

export function AudioButton({ mosqueId, mosqueName, imamName, audioSrc, className }: AudioButtonProps) {
  const { currentTrack, isPlaying, isLoading, error, play } = useAudioPlayer()

  const isCurrentMosque = currentTrack?.mosqueId === mosqueId
  const isCurrentPlaying = isCurrentMosque && isPlaying
  const isCurrentLoading = isCurrentMosque && isLoading
  const hasError = isCurrentMosque && error

  const handleClick = () => {
    play({
      mosqueId,
      mosqueName,
      imamName,
      audioSrc,
    })
  }

  const getIcon = () => {
    if (isCurrentLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />
    }
    if (hasError) {
      return <AlertCircle className="h-4 w-4" />
    }
    if (isCurrentPlaying) {
      return <Pause className="h-4 w-4" />
    }
    return <Play className="h-4 w-4" />
  }

  const getText = () => {
    if (hasError) {
      return 'خطأ'
    }
    if (isCurrentPlaying) {
      return 'إيقاف'
    }
    return 'استماع'
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isCurrentLoading}
      className={cn(
        'h-9 gap-1.5 rounded-full px-3 font-normal',
        'bg-white text-primary shadow-sm',
        'transition-all duration-200',
        'hover:bg-accent-light hover:text-primary-dark',
        'focus:ring-2 focus:ring-accent focus:ring-offset-1',
        isCurrentPlaying && 'bg-accent-light text-primary-dark',
        hasError && 'text-destructive',
        className
      )}
    >
      {getIcon()}
      <span className="button-text">{getText()}</span>
    </Button>
  )
}
