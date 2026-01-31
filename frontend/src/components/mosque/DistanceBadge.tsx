import { Footprints, Bike, Car } from 'lucide-react'
import { formatDistance, getDistanceCategory } from '@/lib/arabic-utils'
import { cn } from '@/lib/utils'
import type { DistanceCategory } from '@/types'

interface DistanceBadgeProps {
  distance: number // in kilometers
  className?: string
}

const categoryConfig: Record<DistanceCategory, {
  icon: typeof Footprints
  bgClass: string
}> = {
  walking: {
    icon: Footprints,
    bgClass: 'bg-gradient-to-br from-green-50 to-accent-light',
  },
  bicycle: {
    icon: Bike,
    bgClass: 'bg-gradient-to-br from-blue-50 to-accent-light',
  },
  car: {
    icon: Car,
    bgClass: 'bg-gradient-to-br from-amber-50 to-accent-light',
  },
}

export function DistanceBadge({ distance, className }: DistanceBadgeProps) {
  const category = getDistanceCategory(distance)
  const { icon: Icon, bgClass } = categoryConfig[category]
  const formattedDistance = formatDistance(distance)

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium',
        'border-e-[3px] border-accent text-primary-dark shadow-sm',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
        bgClass,
        className
      )}
    >
      <Icon className="h-4 w-4 text-primary" />
      <span>{formattedDistance}</span>
    </div>
  )
}
