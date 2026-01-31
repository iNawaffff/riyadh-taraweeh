import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FavoritesFilterButtonProps {
  onClick: () => void
  isActive?: boolean
  count: number
  disabled?: boolean
}

export function FavoritesFilterButton({
  onClick,
  isActive = false,
  count,
  disabled = false,
}: FavoritesFilterButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled || count === 0}
      className={cn(
        'h-10 min-w-36 gap-2 rounded-full border border-primary/30 px-5 font-medium transition-all duration-200',
        'hover:bg-primary/5 hover:border-primary/50',
        'active:scale-[0.97]',
        isActive && 'border-primary bg-primary text-white hover:bg-primary-dark hover:border-primary-dark hover:text-white',
        count === 0 && 'opacity-50'
      )}
    >
      <Heart className={cn('h-4 w-4', isActive && 'fill-current')} />
      <span>
        المفضلة
        {count > 0 && (
          <span className={cn(
            'ms-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none',
            isActive ? 'bg-white/20' : 'bg-primary/10 text-primary'
          )}>
            {count}
          </span>
        )}
      </span>
    </Button>
  )
}
