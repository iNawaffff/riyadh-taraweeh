import { SearchX, AlertTriangle } from 'lucide-react'
import { MosqueCard } from './MosqueCard'
import { MosqueCardSkeleton } from './MosqueCardSkeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Mosque } from '@/types'

interface MosqueGridProps {
  mosques: Mosque[]
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  onReset?: () => void
  isProximitySorted?: boolean
}

export function MosqueGrid({
  mosques,
  isLoading = false,
  isError = false,
  isEmpty = false,
  onReset,
  isProximitySorted = false,
}: MosqueGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <MosqueCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <EmptyState
        type="error"
        message="حدث خطأ أثناء تحميل البيانات"
        subtitle="الرجاء المحاولة لاحقاً"
        onReset={onReset}
      />
    )
  }

  // Empty state
  if (isEmpty || mosques.length === 0) {
    return (
      <EmptyState
        type="empty"
        message="لم يتم العثور على مساجد مطابقة للبحث"
        subtitle="جرّب تعديل كلمات البحث أو تغيير المنطقة"
        onReset={onReset}
        buttonText="إعادة ضبط البحث"
      />
    )
  }

  // Mosques grid
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-5 md:grid-cols-2',
        isProximitySorted && 'proximity-sorted'
      )}
    >
      {mosques.map((mosque) => (
        <MosqueCard key={mosque.id} mosque={mosque} />
      ))}
    </div>
  )
}

// Empty/Error state component
interface EmptyStateProps {
  type: 'empty' | 'error'
  message: string
  subtitle?: string
  onReset?: () => void
  buttonText?: string
}

function EmptyState({
  type,
  message,
  subtitle,
  onReset,
  buttonText = 'إعادة المحاولة',
}: EmptyStateProps) {
  const Icon = type === 'error' ? AlertTriangle : SearchX

  return (
    <div className="rounded-xl bg-white p-16 text-center shadow-card">
      <div className="mb-5 flex justify-center">
        <div className={cn(
          'flex h-16 w-16 items-center justify-center rounded-full',
          type === 'error' ? 'bg-destructive/10' : 'bg-primary-light'
        )}>
          <Icon className={cn(
            'h-8 w-8',
            type === 'error' ? 'text-destructive' : 'text-primary'
          )} />
        </div>
      </div>

      <p className="mb-2 text-lg font-medium text-primary">{message}</p>
      {subtitle && (
        <p className="mb-5 text-sm text-muted-foreground">{subtitle}</p>
      )}

      {onReset && (
        <Button
          variant="ghost"
          onClick={onReset}
          className="text-primary hover:bg-primary-light"
        >
          {buttonText}
        </Button>
      )}
    </div>
  )
}
