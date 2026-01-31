import { useState } from 'react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useFavorites } from '@/hooks'
import { LoginDialog } from '@/components/auth'
import { cn } from '@/lib/utils'

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

export function FavoriteButton({
  mosqueId,
  mosqueName,
  className,
  size = 'md',
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, requiresAuth } = useFavorites()
  const [showLogin, setShowLogin] = useState(false)

  const isFav = isFavorite(mosqueId)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation if inside a link
    e.stopPropagation()

    if (requiresAuth) {
      localStorage.setItem('pendingFavorite', String(mosqueId))
      setShowLogin(true)
      return
    }

    const wasAdded = !isFav
    toggleFavorite(mosqueId)

    // Show toast notification
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
          'flex items-center justify-center rounded-full',
          'transition-all duration-300',
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
        <Heart
          className={cn(
            iconSizes[size],
            'transition-transform duration-300',
            isFav && 'fill-current scale-110'
          )}
        />
      </button>

      <LoginDialog open={showLogin} onOpenChange={setShowLogin} />
    </>
  )
}
