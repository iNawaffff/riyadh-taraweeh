import { useState, useRef } from 'react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useFavorites } from '@/hooks'
import { LoginDialog } from '@/components/auth'
import { cn } from '@/lib/utils'
import { trackFavorite } from '@/lib/analytics'

interface FavoriteButtonProps {
  mosqueId: number
  mosqueName?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-12 w-12',
}

const iconSizes = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

const ringSizes = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
}

export function FavoriteButton({
  mosqueId,
  mosqueName,
  className,
  size = 'md',
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, requiresAuth } = useFavorites()
  const [showLogin, setShowLogin] = useState(false)
  const [animating, setAnimating] = useState(false)
  const animationTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const isFav = isFavorite(mosqueId)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (requiresAuth) {
      localStorage.setItem('pendingFavorite', String(mosqueId))
      setShowLogin(true)
      return
    }

    const wasAdded = !isFav

    // Trigger pop animation
    if (animationTimer.current) clearTimeout(animationTimer.current)
    setAnimating(true)
    animationTimer.current = setTimeout(() => setAnimating(false), 500)

    toggleFavorite(mosqueId)
    trackFavorite(wasAdded ? 'add' : 'remove', mosqueId, mosqueName ?? '')

    if (wasAdded) {
      toast.success(mosqueName ? `تمت الإضافة للمفضلة: ${mosqueName}` : 'تمت الإضافة للمفضلة', {
        duration: 2000,
      })
    } else {
      toast.success(mosqueName ? `تمت الإزالة من المفضلة: ${mosqueName}` : 'تمت الإزالة من المفضلة', {
        duration: 2000,
      })
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          'relative flex items-center justify-center rounded-full',
          'transition-colors duration-200',
          'hover:scale-110 active:scale-95',
          isFav
            ? 'bg-red-50 text-red-500 hover:bg-red-100'
            : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-red-400',
          sizeClasses[size],
          className
        )}
        aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
      >
        {/* Ring burst on toggle */}
        {animating && (
          <span
            className={cn(
              'absolute rounded-full border-2 heart-ring',
              isFav ? 'border-red-400' : 'border-gray-300',
              ringSizes[size]
            )}
          />
        )}

        <Heart
          className={cn(
            iconSizes[size],
            'transition-colors duration-200',
            animating && 'heart-pop',
            isFav && 'fill-current'
          )}
        />
      </button>

      <LoginDialog open={showLogin} onOpenChange={setShowLogin} />
    </>
  )
}
