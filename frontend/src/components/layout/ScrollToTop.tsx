import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAudioPlayer } from '@/hooks'
import { cn } from '@/lib/utils'

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)
  const { currentTrack } = useAudioPlayer()
  const isPlayerVisible = !!currentTrack

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 400px
      setIsVisible(window.scrollY > 400)
    }

    window.addEventListener('scroll', toggleVisibility, { passive: true })

    return () => {
      window.removeEventListener('scroll', toggleVisibility)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={scrollToTop}
          className={cn(
            'fixed start-4 z-40',
            'flex h-12 w-12 items-center justify-center',
            'rounded-full bg-primary text-white shadow-lg',
            'transition-all duration-300',
            'hover:bg-primary-dark hover:scale-110',
            'active:scale-95',
            isPlayerVisible ? 'bottom-28' : 'bottom-20',
            isVisible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-16 opacity-0 pointer-events-none'
          )}
          aria-label="العودة للأعلى"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>العودة للأعلى</p>
      </TooltipContent>
    </Tooltip>
  )
}
