import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useFavorites } from '@/hooks'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  mosqueId: number
  mosqueName?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-11 w-11',   // 44px minimum touch target
  md: 'h-11 w-11',   // 44px minimum touch target
  lg: 'h-12 w-12',   // 48px
}

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

export function FavoriteButton({
  mosqueId,
  mosqueName,
  className,
  size = 'md',
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites()

  const isFav = isFavorite(mosqueId)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent navigation if inside a link
    e.stopPropagation()

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
  )
}
